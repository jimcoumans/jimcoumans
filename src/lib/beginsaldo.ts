import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, wallets, ledgerEntries } from '@/db/schema'
import { addEntry } from './ledger'

/* -------------------------------------------------------------------------
   Beginsaldo's overzetten.

   Het saldo van een wallet is de som van de grootboekregels. Er bestaat geen
   kolom met "het saldo" — dat is met opzet zo, want een kolom en een som
   lopen vroeg of laat uiteen en dan weet niemand welke klopt.

   Daardoor is een nieuwe klant altijd nul, ook als hij in werkelijkheid al
   maanden budget heeft opgebouwd of juist heeft overschreden. Dat moet één
   keer rechtgetrokken worden.

   Dit scherm boekt dat verschil. Je vult in wat het saldo MOET zijn, niet
   wat er bij moet: dat is hoe je erover denkt als je in ClickUp kijkt. Het
   verschil wordt als correctie geboekt, met een omschrijving die de klant
   ook kan lezen.
   ------------------------------------------------------------------------- */

export class BeginsaldoError extends Error {}

export type WalletRegel = {
  walletId: string
  walletNaam: string
  organizationId: string
  klantNaam: string
  slug: string
  /** Het saldo nu, uit de grootboekregels. */
  saldoCents: number
  /** Aantal boekingen; nul betekent dat er nog nooit iets is gebeurd. */
  boekingen: number
}

/** Alle wallets met hun huidige saldo, om in één scherm bij te werken. */
export async function listWalletsMetSaldo(): Promise<WalletRegel[]> {
  const rijen = await db
    .select({
      walletId: wallets.id,
      walletNaam: wallets.name,
      organizationId: organizations.id,
      klantNaam: organizations.name,
      slug: organizations.slug,
      saldo: sql<string>`COALESCE((
        SELECT SUM(${ledgerEntries.amountCents})
        FROM ${ledgerEntries}
        WHERE ${ledgerEntries.walletId} = ${wallets.id}
      ), 0)`,
      boekingen: sql<string>`(
        SELECT COUNT(*)
        FROM ${ledgerEntries}
        WHERE ${ledgerEntries.walletId} = ${wallets.id}
      )`,
    })
    .from(wallets)
    .innerJoin(organizations, eq(organizations.id, wallets.organizationId))
    .where(eq(wallets.status, 'active'))
    .orderBy(asc(organizations.name), asc(wallets.name))

  return rijen.map((r) => ({
    walletId: r.walletId,
    walletNaam: r.walletNaam,
    organizationId: r.organizationId,
    klantNaam: r.klantNaam,
    slug: r.slug,
    saldoCents: Number(r.saldo),
    boekingen: Number(r.boekingen),
  }))
}

export type SaldoDoel = {
  walletId: string
  /** Wat het saldo moet worden, in centen. Mag negatief zijn. */
  doelCents: number
}

export type BeginsaldoResultaat = {
  geboekt: number
  ongewijzigd: number
  regels: { klantNaam: string; verschilCents: number }[]
}

/**
 * Trekt saldo's recht naar wat ze moeten zijn.
 *
 * Boekt per wallet het VERSCHIL, niet het doelbedrag. Draai je dit twee keer
 * met hetzelfde doel, dan gebeurt er de tweede keer niets — het verschil is
 * dan nul. Dat scheelt een dubbel saldo als je per ongeluk twee keer opslaat.
 */
export async function zetBeginsaldos(
  doelen: SaldoDoel[],
  opties: { omschrijving?: string; createdByUserId?: string | null; bookedOn?: Date } = {},
): Promise<BeginsaldoResultaat> {
  const omschrijving = (opties.omschrijving ?? '').trim() || 'Beginsaldo overgenomen'

  const huidige = await listWalletsMetSaldo()
  const perWallet = new Map(huidige.map((w) => [w.walletId, w]))

  const resultaat: BeginsaldoResultaat = { geboekt: 0, ongewijzigd: 0, regels: [] }

  for (const doel of doelen) {
    const wallet = perWallet.get(doel.walletId)
    if (!wallet) throw new BeginsaldoError('Onbekende wallet in de lijst.')

    const verschil = doel.doelCents - wallet.saldoCents
    if (verschil === 0) {
      resultaat.ongewijzigd++
      continue
    }

    await addEntry({
      walletId: doel.walletId,
      // Een correctie in beide richtingen: bijschrijven als er budget bij
      // moet, afschrijven als de klant eroverheen zat.
      kind: verschil > 0 ? 'topup' : 'spend',
      amountCents: Math.abs(verschil),
      description: omschrijving,
      detail: `Saldo bijgesteld naar ${(doel.doelCents / 100).toFixed(2)}`,
      bookedOn: opties.bookedOn ?? new Date(),
      source: 'manual',
      createdByUserId: opties.createdByUserId ?? null,
    })

    resultaat.geboekt++
    resultaat.regels.push({ klantNaam: wallet.klantNaam, verschilCents: verschil })
  }

  return resultaat
}
