/**
 * Tests voor het overzetten van beginsaldo's.
 *
 * De valkuil hier is dubbel boeken. Je vult in wat het saldo moet zijn, en
 * er wordt het VERSCHIL geboekt. Wie twee keer op opslaan drukt — omdat het
 * scherm traag lijkt, of omdat hij niet zeker weet of het gelukt is — mag
 * daar geen dubbel saldo aan overhouden.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, wallets, ledgerEntries } from '../../db/schema'
import { listWalletsMetSaldo, zetBeginsaldos, BeginsaldoError } from '../beginsaldo'
import { getWalletBalance } from '../ledger'

const suffix = Date.now()
let plusId: string
let minId: string
let orgIds: string[] = []

async function klantMetWallet(naam: string): Promise<string> {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `bs-${naam}-${suffix}`, name: `${naam} ${suffix}`, status: 'client' })
    .returning()
  orgIds.push(org!.id)

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: org!.id, name: 'Marketing' })
    .returning()
  return wallet!.id
}

before(async () => {
  plusId = await klantMetWallet('Plus')
  minId = await klantMetWallet('Min')
})

after(async () => {
  const walletRijen = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(inArray(wallets.organizationId, orgIds))
  const walletIds = walletRijen.map((w) => w.id)
  if (walletIds.length > 0) {
    await db.delete(ledgerEntries).where(inArray(ledgerEntries.walletId, walletIds))
  }
  await db.delete(wallets).where(inArray(wallets.organizationId, orgIds))
  await db.delete(organizations).where(inArray(organizations.id, orgIds))
  await client.end()
})

test('een verse wallet staat op nul en heeft geen boekingen', async () => {
  const alle = await listWalletsMetSaldo()
  const plus = alle.find((w) => w.walletId === plusId)

  assert.ok(plus, 'de wallet staat in de lijst')
  assert.equal(plus!.saldoCents, 0)
  assert.equal(plus!.boekingen, 0, 'nul boekingen is iets anders dan een saldo van nul')
})

test('een saldo in de plus wordt bijgeschreven', async () => {
  const resultaat = await zetBeginsaldos([{ walletId: plusId, doelCents: 125_000 }])

  assert.equal(resultaat.geboekt, 1)
  const saldo = await getWalletBalance(plusId)
  assert.equal(saldo.balanceCents, 125_000)
})

test('een saldo in de min kan ook, en dat is geen foutmelding', async () => {
  // Een klant die eroverheen is gegaan staat in de min. Dat is een normale
  // stand van zaken, geen invoerfout.
  await zetBeginsaldos([{ walletId: minId, doelCents: -34_050 }])

  const saldo = await getWalletBalance(minId)
  assert.equal(saldo.balanceCents, -34_050)
})

test('twee keer hetzelfde opslaan verdubbelt niets', async () => {
  const eerste = await zetBeginsaldos([{ walletId: plusId, doelCents: 125_000 }])

  assert.equal(eerste.geboekt, 0, 'het verschil is nul, dus er wordt niets geboekt')
  assert.equal(eerste.ongewijzigd, 1)

  const saldo = await getWalletBalance(plusId)
  assert.equal(saldo.balanceCents, 125_000, 'het saldo staat er nog precies zo')
})

test('bijstellen boekt alleen het verschil', async () => {
  await zetBeginsaldos([{ walletId: plusId, doelCents: 150_000 }])

  const saldo = await getWalletBalance(plusId)
  assert.equal(saldo.balanceCents, 150_000)

  // Er horen nu twee boekingen te staan: de eerste van 1.250 en een
  // bijstelling van 250 — niet een tweede van 1.500.
  const regels = await db
    .select()
    .from(ledgerEntries)
    .where(inArray(ledgerEntries.walletId, [plusId]))

  assert.equal(regels.length, 2)
  assert.deepEqual(
    regels.map((r) => r.amountCents).sort((a, b) => a - b),
    [25_000, 125_000],
  )
})

test('naar beneden bijstellen schrijft af', async () => {
  await zetBeginsaldos([{ walletId: plusId, doelCents: 100_000 }])

  const saldo = await getWalletBalance(plusId)
  assert.equal(saldo.balanceCents, 100_000)
})

test('een onbekende wallet wordt geweigerd', async () => {
  await assert.rejects(
    () =>
      zetBeginsaldos([
        { walletId: '00000000-0000-0000-0000-000000000000', doelCents: 1000 },
      ]),
    (f: Error) => f instanceof BeginsaldoError,
  )
})

test('de boeking vertelt de klant waar het saldo vandaan komt', async () => {
  const regels = await db
    .select()
    .from(ledgerEntries)
    .where(inArray(ledgerEntries.walletId, [minId]))

  assert.equal(regels.length, 1)
  assert.match(regels[0]!.description, /saldo/i)
  assert.equal(regels[0]!.source, 'manual', 'dit is met de hand gezet, niet gefactureerd')
})
