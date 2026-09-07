/**
 * Tests voor het boeken van geleverde diensten.
 * Het scenario van de opdracht: een product "Social media post" van 100
 * euro dat op een klant wordt geboekt en van het budget afgaat.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, users, wallets, ledgerEntries, services } from '../../db/schema'
import { addEntry, addServiceEntry, getWalletBalance, getWalletEntries, LedgerError } from '../ledger'
import { assertViolatesConstraint } from './helpers'

const suffix = Date.now()
let orgId: string
let walletId: string
let socialPostId: string
let uurwerkId: string
let medewerkerId: string

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `dienst-${suffix}`, name: 'Dienstboeking BV' })
    .returning()
  orgId = org!.id

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: orgId, name: 'Marketing abonnement' })
    .returning()
  walletId = wallet!.id

  const [medewerker] = await db
    .insert(users)
    .values({ email: `mw-${suffix}@jamesrobinson.nl`, name: 'Test Medewerker', role: 'staff' })
    .returning()
  medewerkerId = medewerker!.id

  const [post] = await db
    .insert(services)
    .values({
      code: `SOC-POST-${suffix}`,
      name: 'Social media post',
      category: 'Social Management',
      department: 'Marketing',
      unit: 'piece',
      unitPriceCents: 10_000, // 100,00
      costPriceCents: 3_500,
    })
    .returning()
  socialPostId = post!.id

  const [uur] = await db
    .insert(services)
    .values({
      name: 'Webontwikkeling',
      category: 'Web',
      unit: 'hour',
      unitPriceCents: 8_500, // 85,00
    })
    .returning()
  uurwerkId = uur!.id

  // Startbudget van 1000 euro, zoals bij een factuur.
  await addEntry({
    walletId,
    kind: 'topup',
    amountCents: 100_000,
    description: 'Factuur 2026-001',
  })
})

after(async () => {
  await db.delete(ledgerEntries).where(eq(ledgerEntries.walletId, walletId))
  await db.delete(services).where(eq(services.id, socialPostId))
  await db.delete(services).where(eq(services.id, uurwerkId))
  await db.delete(users).where(eq(users.id, medewerkerId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await client.end()
})

test('een dienst boeken schrijft het bedrag van het budget af', async () => {
  const voor = await getWalletBalance(walletId)

  const entry = await addServiceEntry({
    walletId,
    serviceId: socialPostId,
    quantityHundredths: 100, // 1 stuk
  })

  assert.equal(entry.amountCents, -10_000, '1 post van 100 euro is 100 euro eraf')
  assert.equal(entry.description, 'Social media post')
  assert.equal(entry.category, 'Social Management')

  const na = await getWalletBalance(walletId)
  assert.equal(na.balanceCents, voor.balanceCents - 10_000)
})

test('meerdere stuks worden met het tarief doorgerekend', async () => {
  const entry = await addServiceEntry({
    walletId,
    serviceId: socialPostId,
    quantityHundredths: 1_200, // 12 stuks
  })

  assert.equal(entry.amountCents, -120_000, '12 posts van 100 euro is 1.200 euro')
  assert.equal(entry.quantityHundredths, 1_200)
  assert.equal(entry.unitPriceCents, 10_000)
})

test('gebroken aantallen werken bij uurdiensten', async () => {
  const entry = await addServiceEntry({
    walletId,
    serviceId: uurwerkId,
    quantityHundredths: 150, // 1,5 uur
  })

  assert.equal(entry.amountCents, -12_750, '1,5 uur van 85 euro is 127,50')
})

test('het tarief van de boeking blijft staan als de dienst duurder wordt', async () => {
  // Dit is de kern van de afspraak: een prijswijziging mag nooit een
  // bestaand saldo of een oude boeking veranderen.
  const entry = await addServiceEntry({
    walletId,
    serviceId: socialPostId,
    quantityHundredths: 100,
  })
  const saldoNaBoeking = await getWalletBalance(walletId)

  await db
    .update(services)
    .set({ unitPriceCents: 12_000 }) // van 100 naar 120 euro
    .where(eq(services.id, socialPostId))

  const [opnieuw] = await db.select().from(ledgerEntries).where(eq(ledgerEntries.id, entry.id))
  assert.equal(opnieuw!.unitPriceCents, 10_000, 'de boeking houdt het oude tarief')
  assert.equal(opnieuw!.amountCents, -10_000, 'en dus ook het oude bedrag')

  const saldoNu = await getWalletBalance(walletId)
  assert.equal(saldoNu.balanceCents, saldoNaBoeking.balanceCents, 'het saldo verandert niet')

  // Een nieuwe boeking gebruikt wel het nieuwe tarief.
  const nieuw = await addServiceEntry({
    walletId,
    serviceId: socialPostId,
    quantityHundredths: 100,
  })
  assert.equal(nieuw.amountCents, -12_000, 'nieuwe boeking rekent met 120 euro')

  // Tarief terugzetten voor de volgende tests.
  await db
    .update(services)
    .set({ unitPriceCents: 10_000 })
    .where(eq(services.id, socialPostId))
})

test('een afwijkend tarief kan meegegeven worden', async () => {
  const entry = await addServiceEntry({
    walletId,
    serviceId: socialPostId,
    quantityHundredths: 200, // 2 stuks
    unitPriceCentsOverride: 7_500, // korting: 75 in plaats van 100
  })

  assert.equal(entry.amountCents, -15_000, '2 stuks van 75 euro is 150 euro')
  assert.equal(entry.unitPriceCents, 7_500, 'het afwijkende tarief staat op de boeking')
})

test('de omschrijving kan afwijken van de dienstnaam', async () => {
  const entry = await addServiceEntry({
    walletId,
    serviceId: socialPostId,
    quantityHundredths: 100,
    description: 'Social post kerstactie',
    detail: 'Inclusief eigen fotografie',
  })

  assert.equal(entry.description, 'Social post kerstactie')
  assert.equal(entry.detail, 'Inclusief eigen fotografie')
  assert.equal(entry.serviceId, socialPostId, 'de dienst blijft gekoppeld')
})

test('wie de dienst leverde wordt vastgelegd', async () => {
  const entry = await addServiceEntry({
    walletId,
    serviceId: socialPostId,
    quantityHundredths: 100,
    deliveredByUserId: medewerkerId,
  })

  assert.equal(entry.deliveredByUserId, medewerkerId)

  // En komt terug in het overzicht, met naam.
  const entries = await getWalletEntries(walletId, { limit: 100 })
  const gevonden = entries.find((e) => e.id === entry.id)
  assert.equal(gevonden!.deliveredByName, 'Test Medewerker')
  assert.equal(gevonden!.serviceName, 'Social media post')
  assert.equal(gevonden!.serviceUnit, 'piece')
})

test('een onbekende dienst wordt geweigerd', async () => {
  await assert.rejects(
    () =>
      addServiceEntry({
        walletId,
        serviceId: '00000000-0000-0000-0000-000000000000',
        quantityHundredths: 100,
      }),
    LedgerError,
  )
})

test('een aantal van nul of negatief wordt geweigerd', async () => {
  await assert.rejects(
    () => addServiceEntry({ walletId, serviceId: socialPostId, quantityHundredths: 0 }),
    LedgerError,
  )
  await assert.rejects(
    () => addServiceEntry({ walletId, serviceId: socialPostId, quantityHundredths: -100 }),
    LedgerError,
  )
})

test('de database weigert een dienst op een boeking zonder aantal of tarief', async () => {
  // Zonder aantal en tarief is het bedrag niet na te rekenen, ook niet als
  // iemand addServiceEntry omzeilt.
  await assertViolatesConstraint(
    () =>
      db.insert(ledgerEntries).values({
        walletId,
        kind: 'spend',
        amountCents: -5_000,
        description: 'Dienst zonder onderbouwing',
        bookedOn: new Date(),
        serviceId: socialPostId,
      }),
    'service_needs_quantity_and_price',
  )
})

test('de database weigert een aantal van nul', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(ledgerEntries).values({
        walletId,
        kind: 'spend',
        amountCents: -5_000,
        description: 'Nul stuks',
        bookedOn: new Date(),
        serviceId: socialPostId,
        quantityHundredths: 0,
        unitPriceCents: 5_000,
      }),
    'quantity_positive',
  )
})

test('een dienst die geboekt is kan niet verwijderd worden', async () => {
  // De prijslijst mag opgeschoond worden, maar niet ten koste van de
  // leesbaarheid van oude boekingen.
  await assertViolatesConstraint(
    () => db.delete(services).where(eq(services.id, socialPostId)),
    'ledger_entries_service_id_services_id_fk',
  )
})

test('de database weigert een dienst met een tarief van nul', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(services).values({ name: 'Gratis dienst', unitPriceCents: 0 }),
    'service_price_positive',
  )
})

test('het bedrag komt van de server, niet van de aanroeper', async () => {
  // addServiceEntry heeft geen parameter voor het bedrag: dat wordt altijd
  // berekend uit aantal maal tarief. Deze test legt dat vast.
  const entry = await addServiceEntry({
    walletId,
    serviceId: uurwerkId,
    quantityHundredths: 275, // 2,75 uur
  })
  assert.equal(entry.amountCents, -23_375, '2,75 uur van 85 euro is 233,75')
})
