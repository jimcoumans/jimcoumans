/**
 * ClickUp-sync vanaf de opdrachtregel.
 *
 * Proefronde (verandert niets):
 *   npm run sync:clickup -- --org=hotel-voncken --lists=901512499356
 *
 * Echt boeken:
 *   npm run sync:clickup -- --org=hotel-voncken --lists=901512499356 --apply
 */
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations } from '../../db/schema'
import { syncClickUp, vatSamen } from './sync'
import { formatCents } from '../money'

function arg(naam: string): string | undefined {
  const prefix = `--${naam}=`
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const apply = process.argv.includes('--apply')
  const orgSlug = arg('org')
  const lists = (arg('lists') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const subscriptionList = arg('abonnementen') ?? process.env.CLICKUP_LIST_ABONNEMENTEN

  if (lists.length === 0 && !subscriptionList) {
    console.error('Geef minstens --lists=<lijst-id> of --abonnementen=<lijst-id> op.')
    console.error('')
    console.error('Voorbeeld:')
    console.error('  npm run sync:clickup -- --org=hotel-voncken --lists=901512499356')
    process.exitCode = 1
    return
  }

  let onlyOrganizationId: string | undefined
  if (orgSlug) {
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1)

    if (!org) {
      console.error(`Onbekende klant: ${orgSlug}`)
      process.exitCode = 1
      return
    }
    onlyOrganizationId = org.id
    console.log(`Klant: ${org.name}`)
  }

  console.log(apply ? 'Modus: ECHT BOEKEN' : 'Modus: proefronde (er verandert niets)')
  console.log('')

  const rapport = await syncClickUp({
    apply,
    taskListIds: lists,
    subscriptionListId: subscriptionList,
    onlyOrganizationId,
  })

  for (const regel of rapport.regels) {
    const teken =
      regel.soort === 'geboekt' ? '+' : regel.soort === 'fout' ? '!' : regel.soort === 'geen_wallet' ? '?' : '-'
    console.log(`  ${teken} ${regel.taakNaam} — ${regel.toelichting}`)
  }

  if (rapport.regels.length > 0) console.log('')
  console.log(vatSamen(rapport))

  if (!apply && rapport.geboekt > 0) {
    console.log('')
    console.log(
      `Dit zou ${formatCents(rapport.bedragGeboektCents)} afboeken. ` +
        'Voeg --apply toe om het echt te doen.',
    )
  }

  if (rapport.fouten > 0) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error('Sync mislukt:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => client.end())
