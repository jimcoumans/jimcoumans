import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { ClickUpClient } from '@/lib/clickup/client'
import { leesMoneybirdFacturen } from '@/lib/moneybird/facturen'
import { berekenRetainerWallet } from './bereken'

type WalletInstellingen = Pick<typeof organizations.$inferSelect, 'id' | 'walletFacturenVanaf' | 'walletClickupListId'>
type Facturen = ReturnType<typeof leesMoneybirdFacturen>

export type RetainerWallet =
  | ({ ok: true } & ReturnType<typeof berekenRetainerWallet>)
  | { ok: false; bron: 'Moneybird' | 'ClickUp' | null }

export async function leesRetainerWallet(
  klant: WalletInstellingen,
  facturen?: Facturen,
): Promise<RetainerWallet | null> {
  const { id, walletFacturenVanaf: vanaf, walletClickupListId: listId } = klant
  if (!vanaf || !listId) return null

  const [moneybird, clickup] = await Promise.allSettled([
    facturen ?? leesMoneybirdFacturen(id),
    Promise.resolve().then(() =>
      new ClickUpClient(process.env.CLICKUP_API_TOKEN ?? '').listRetainerTaken(listId, AbortSignal.timeout(9000)),
    ),
  ])

  if (moneybird.status === 'rejected' || !moneybird.value?.ok) return { ok: false, bron: 'Moneybird' }
  if (clickup.status === 'rejected') {
    console.error('[retainer-wallet] ClickUp-taken ophalen mislukt', clickup.reason instanceof Error ? clickup.reason.name : '')
    return { ok: false, bron: 'ClickUp' }
  }

  try {
    return { ok: true, ...berekenRetainerWallet(moneybird.value.facturen, clickup.value, vanaf) }
  } catch (error) {
    console.error('[retainer-wallet] saldo berekenen mislukt', error instanceof Error ? error.name : '')
    return { ok: false, bron: null }
  }
}

export async function leesPortaalRetainerWallet(organizationId: string) {
  const [klant] = await db.select({
    id: organizations.id,
    walletFacturenVanaf: organizations.walletFacturenVanaf,
    walletClickupListId: organizations.walletClickupListId,
  }).from(organizations).where(eq(organizations.id, organizationId))
  return klant ? leesRetainerWallet(klant) : null
}
