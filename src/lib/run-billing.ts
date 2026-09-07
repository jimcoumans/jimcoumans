/**
 * De abonnementsrun vanaf de opdrachtregel.
 *
 * Proefronde (verandert niets):
 *   npm run billing
 *
 * Echt factureren:
 *   npm run billing -- --apply
 *
 * Op een andere peildatum, bijvoorbeeld om een gemiste maand te controleren:
 *   npm run billing -- --datum=2026-03-02
 */
import { client } from '../db'
import { runBilling, vatSamenBilling } from './billing'
import { periodLabel } from './billing-periods'
import { formatCents } from './money'

function arg(naam: string): string | undefined {
  const prefix = `--${naam}=`
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const apply = process.argv.includes('--apply')
  const datumArg = arg('datum')

  let today = new Date()
  if (datumArg) {
    const parsed = new Date(datumArg)
    if (Number.isNaN(parsed.getTime())) {
      console.error(`Ongeldige datum: ${datumArg}. Gebruik JJJJ-MM-DD.`)
      process.exitCode = 1
      return
    }
    today = parsed
  }

  console.log(apply ? 'Modus: ECHT FACTUREREN' : 'Modus: proefronde (er verandert niets)')
  console.log(`Peildatum: ${today.toLocaleDateString('nl-NL')}`)
  console.log('')

  const rapport = await runBilling({ apply, today })

  for (const regel of rapport.regels) {
    const teken =
      regel.soort === 'gefactureerd'
        ? '+'
        : regel.soort === 'fout'
          ? '!'
          : regel.soort === 'te_oud'
            ? '?'
            : '-'
    console.log(
      `  ${teken} ${regel.organizationName} — ${regel.subscriptionName}, ` +
        `${periodLabel(regel.period)}: ${regel.toelichting}`,
    )
  }

  if (rapport.regels.length > 0) console.log('')
  console.log(vatSamenBilling(rapport))

  if (!apply && rapport.gefactureerd > 0) {
    console.log('')
    console.log(
      `Dit zou ${formatCents(rapport.bedragCents)} aan budget bijschrijven. ` +
        'Voeg --apply toe om het echt te doen.',
    )
  }

  if (rapport.fouten > 0) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error('Run mislukt:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => client.end())
