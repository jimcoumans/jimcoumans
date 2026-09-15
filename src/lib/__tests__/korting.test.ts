/**
 * Tests voor korting op een abonnement.
 *
 * De afspraak met de klant is: hij krijgt een budget aan diensten en betaalt
 * daar minder voor. Twee getallen die uit elkaar moeten blijven lopen op
 * precies de goede manier — de wallet krijgt het hele budget, de factuur het
 * bedrag na korting.
 *
 * Die twee verwisselen is de duurste fout die dit systeem kan maken: dan
 * factureer je te veel of geef je te veel budget weg, elke maand opnieuw,
 * zonder dat iemand het merkt. Vandaar dat ze hier allebei apart worden
 * nagerekend, tot op de btw.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray, and } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, wallets, subscriptions, invoices, ledgerEntries } from '../../db/schema'
import { runBilling, getMonthlyRecurringCents, getMonthlyBudgetCents, getKlantAandelen } from '../billing'
import { getWalletBalance } from '../ledger'
import { invoiceCents, discountPercentage, vatCents } from '../billing-periods'
import { assertViolatesConstraint } from './helpers'

const suffix = Date.now()
let limbourgId: string
let limbourgWalletId: string
let limbourgAboId: string
let vollePrijsId: string

/** Het voorbeeld van Jim: 1600 aan budget, 1120 op de factuur. */
const BUDGET = 160_000
const KORTING = 48_000
const TE_FACTUREREN = 112_000

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `korting-${suffix}`, name: `Limbourg & Partners ${suffix}` })
    .returning()
  limbourgId = org!.id

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: limbourgId, name: 'Marketing' })
    .returning()
  limbourgWalletId = wallet!.id

  const [abo] = await db
    .insert(subscriptions)
    .values({
      organizationId: limbourgId,
      walletId: limbourgWalletId,
      name: 'Marketingpartnership',
      amountExclVatCents: BUDGET,
      discountCents: KORTING,
      billingDay: 2,
      startedOn: new Date(2026, 0, 1),
      createdAt: new Date(2026, 0, 1),
    })
    .returning()
  limbourgAboId = abo!.id

  // Een tweede klant zonder korting, om te zien dat er voor hem niets
  // verandert en om de aandelen te kunnen narekenen.
  const [org2] = await db
    .insert(organizations)
    .values({ slug: `vollprijs-${suffix}`, name: `Volle Prijs BV ${suffix}` })
    .returning()
  vollePrijsId = org2!.id

  const [wallet2] = await db
    .insert(wallets)
    .values({ organizationId: vollePrijsId, name: 'Marketing' })
    .returning()

  await db.insert(subscriptions).values({
    organizationId: vollePrijsId,
    walletId: wallet2!.id,
    name: 'Marketingpartnership',
    amountExclVatCents: 240_000,
    billingDay: 2,
    startedOn: new Date(2026, 0, 1),
    createdAt: new Date(2026, 0, 1),
  })
})

after(async () => {
  const orgIds = [limbourgId, vollePrijsId]
  const walletRijen = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(inArray(wallets.organizationId, orgIds))
  const walletIds = walletRijen.map((w) => w.id)

  if (walletIds.length > 0) {
    await db.delete(ledgerEntries).where(inArray(ledgerEntries.walletId, walletIds))
  }
  await db.delete(invoices).where(inArray(invoices.organizationId, orgIds))
  await db.delete(subscriptions).where(inArray(subscriptions.organizationId, orgIds))
  await db.delete(wallets).where(inArray(wallets.organizationId, orgIds))
  await db.delete(organizations).where(inArray(organizations.id, orgIds))
  await client.end()
})

/* --- Het rekenwerk, los van de database ---------------------------------- */

test('het factuurbedrag is het budget min de korting', () => {
  assert.equal(invoiceCents(BUDGET, KORTING), TE_FACTUREREN)
  assert.equal(invoiceCents(BUDGET, 0), BUDGET, 'zonder korting verandert er niets')
})

test('de korting wordt als percentage getoond maar niet mee gerekend', () => {
  assert.equal(discountPercentage(BUDGET, KORTING), 30)
  assert.equal(discountPercentage(BUDGET, 0), null, 'geen korting, niets te tonen')
})

/* --- Wat de database niet toestaat --------------------------------------- */

test('een korting die het budget opeet wordt geweigerd', async () => {
  // Zou een factuur van nul of minder opleveren. Dat is geen factuur.
  await assertViolatesConstraint(
    () =>
      db.insert(subscriptions).values({
        organizationId: limbourgId,
        walletId: limbourgWalletId,
        name: 'Gratis',
        amountExclVatCents: 100_000,
        discountCents: 100_000,
        billingDay: 2,
        startedOn: new Date(2026, 0, 1),
      }),
    'subscription_discount_below_amount',
  )
})

test('een negatieve korting wordt geweigerd', async () => {
  // Anders is een typefout een stille prijsverhoging.
  await assertViolatesConstraint(
    () =>
      db.insert(subscriptions).values({
        organizationId: limbourgId,
        walletId: limbourgWalletId,
        name: 'Omgekeerd',
        amountExclVatCents: 100_000,
        discountCents: -1000,
        billingDay: 2,
        startedOn: new Date(2026, 0, 1),
      }),
    'subscription_discount_not_negative',
  )
})

/* --- De facturatie zelf --------------------------------------------------- */

test('de wallet krijgt het budget en de factuur het bedrag na korting', async () => {
  await runBilling({ apply: true, today: new Date(2026, 0, 5) })

  const [factuur] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.subscriptionId, limbourgAboId), eq(invoices.period, '2026-01')))

  assert.ok(factuur, 'er is gefactureerd')
  assert.equal(factuur!.amountExclVatCents, TE_FACTUREREN, 'de klant betaalt 1.120')
  assert.equal(
    factuur!.vatCents,
    vatCents(TE_FACTUREREN, 21),
    'btw hoort over het bedrag dat betaald wordt, niet over het budget',
  )

  const saldo = await getWalletBalance(limbourgWalletId)
  assert.equal(saldo.balanceCents, BUDGET, 'in de wallet staat het hele budget van 1.600')
})

test('de bijschrijving vertelt dat er korting op zit', async () => {
  const [boeking] = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.walletId, limbourgWalletId))

  assert.ok(boeking)
  assert.equal(boeking!.amountCents, BUDGET)
  assert.match(
    boeking!.detail ?? '',
    /korting/,
    'wie later naar deze regel kijkt moet zien waarom factuur en budget verschillen',
  )
})

test('een klant zonder korting merkt er niets van', async () => {
  const [factuur] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.organizationId, vollePrijsId), eq(invoices.period, '2026-01')))

  assert.ok(factuur)
  assert.equal(factuur!.amountExclVatCents, 240_000, 'factuur is gewoon het bedrag')
})

/* --- Wat de cijfers ervan vinden ------------------------------------------ */

test('omzet telt na korting, budget telt het geheel', async () => {
  const [omzet, budget] = await Promise.all([
    getMonthlyRecurringCents(),
    getMonthlyBudgetCents(),
  ])

  // Er staan meer abonnementen in de testdatabase, dus we kijken naar het
  // verschil tussen de twee in plaats van naar absolute bedragen.
  assert.equal(
    budget.budgetCents - omzet,
    budget.kortingCents,
    'het verschil tussen budget en omzet is precies de korting',
  )
  assert.ok(budget.kortingCents >= KORTING, 'de korting van Limbourg telt mee')
})

test('het aandeel per klant gaat over omzet, niet over budget', async () => {
  const { klanten, totaalOmzetCents } = await getKlantAandelen()

  const limbourg = klanten.find((k) => k.organizationSlug === `korting-${suffix}`)
  assert.ok(limbourg, 'Limbourg staat in de verdeling')
  assert.equal(limbourg!.omzetCents, TE_FACTUREREN, 'zijn omzet is wat hij betaalt')
  assert.equal(limbourg!.budgetCents, BUDGET, 'zijn budget staat er apart bij')
  assert.equal(limbourg!.kortingCents, KORTING)

  // Het percentage moet bij dit totaal horen, anders telt de kolom niet op.
  assert.equal(
    limbourg!.aandeelProcent,
    Math.round((TE_FACTUREREN / totaalOmzetCents) * 1000) / 10,
  )
})

test('de verdeling staat op volgorde van grootte', async () => {
  const { klanten } = await getKlantAandelen()
  const bedragen = klanten.map((k) => k.omzetCents)
  const gesorteerd = [...bedragen].sort((a, b) => b - a)
  assert.deepEqual(bedragen, gesorteerd, 'de grootste klant staat bovenaan')
})
