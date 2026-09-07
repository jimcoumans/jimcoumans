/**
 * Tests voor de abonnementsrun tegen een echte Postgres.
 *
 * De belangrijkste vraag: kan een maand twee keer gefactureerd worden.
 * Het antwoord moet nee zijn, ook als de run dubbel of gelijktijdig draait.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray, and } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, wallets, subscriptions, invoices, ledgerEntries } from '../../db/schema'
import { runBilling, listSubscriptions, getMonthlyRecurringCents } from '../billing'
import { getWalletBalance, reverseEntry } from '../ledger'
import { assertViolatesConstraint } from './helpers'

const suffix = Date.now()
let orgId: string
let walletId: string
let aboId: string
let gepauzeerdId: string

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `abo-${suffix}`, name: `Abonnement BV ${suffix}` })
    .returning()
  orgId = org!.id

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: orgId, name: 'Marketing abonnement' })
    .returning()
  walletId = wallet!.id

  const [abo] = await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      walletId,
      name: 'Marketing abonnement',
      amountExclVatCents: 250_000, // 2.500 per maand
      billingDay: 2,
      startedOn: new Date(2026, 0, 1),
      // Expliciet meegeven: de run factureert niets van voor de maand
      // waarin het abonnement is aangemaakt. Deze tests gaan over een
      // abonnement dat sinds januari bestaat.
      createdAt: new Date(2026, 0, 1),
    })
    .returning()
  aboId = abo!.id

  const [pauze] = await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      walletId,
      name: 'Gepauzeerd abonnement',
      amountExclVatCents: 50_000,
      status: 'paused',
      startedOn: new Date(2026, 0, 1),
      createdAt: new Date(2026, 0, 1),
    })
    .returning()
  gepauzeerdId = pauze!.id
})

after(async () => {
  await db.delete(ledgerEntries).where(eq(ledgerEntries.walletId, walletId))
  await db.delete(invoices).where(eq(invoices.organizationId, orgId))
  await db.delete(subscriptions).where(eq(subscriptions.organizationId, orgId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await client.end()
})

test('een proefronde verandert niets', async () => {
  const rapport = await runBilling({
    today: new Date(2026, 0, 5),
    onlySubscriptionId: aboId,
  })

  assert.equal(rapport.apply, false)
  assert.equal(rapport.gefactureerd, 1, 'januari zou gefactureerd worden')
  assert.equal(rapport.bedragCents, 250_000)

  const balance = await getWalletBalance(walletId)
  assert.equal(balance.balanceCents, 0, 'er mag nog geen budget zijn')

  const facturen = await db.select().from(invoices).where(eq(invoices.subscriptionId, aboId))
  assert.equal(facturen.length, 0, 'en nog geen factuur')
})

test('met apply wordt de maand gefactureerd en het budget bijgeschreven', async () => {
  const rapport = await runBilling({
    today: new Date(2026, 0, 5),
    apply: true,
    onlySubscriptionId: aboId,
  })

  assert.equal(rapport.gefactureerd, 1)
  assert.equal(rapport.fouten, 0)

  const balance = await getWalletBalance(walletId)
  assert.equal(balance.balanceCents, 250_000, 'het maandbedrag staat in de wallet')

  const [factuur] = await db.select().from(invoices).where(eq(invoices.subscriptionId, aboId))
  assert.equal(factuur!.period, '2026-01')
  assert.equal(factuur!.amountExclVatCents, 250_000)
  assert.equal(factuur!.vatCents, 52_500, '21 procent btw')
  assert.equal(factuur!.number, 'ABO-2026-01')
  assert.equal(factuur!.issuedOn.getDate(), 2, 'gefactureerd op de tweede')
})

test('de run twee keer draaien factureert niet dubbel', async () => {
  // Dit is de kern: een cron die per ongeluk twee keer afgaat, een
  // handmatige run bovenop de automatische, een herstart halverwege.
  const voor = await getWalletBalance(walletId)

  const tweede = await runBilling({
    today: new Date(2026, 0, 5),
    apply: true,
    onlySubscriptionId: aboId,
  })

  assert.equal(tweede.gefactureerd, 0, 'er valt niets meer te factureren')
  assert.equal(tweede.bestondAl, 1)

  const na = await getWalletBalance(walletId)
  assert.equal(na.balanceCents, voor.balanceCents, 'het saldo verandert niet')

  const facturen = await db.select().from(invoices).where(eq(invoices.subscriptionId, aboId))
  assert.equal(facturen.length, 1, 'en er is nog steeds een factuur')
})

test('de database weigert een tweede factuur voor dezelfde periode', async () => {
  // Ook als iemand de run omzeilt en met de hand insert.
  await assertViolatesConstraint(
    () =>
      db.insert(invoices).values({
        organizationId: orgId,
        subscriptionId: aboId,
        period: '2026-01',
        number: `HANDMATIG-${suffix}`,
        amountExclVatCents: 250_000,
        issuedOn: new Date(2026, 0, 2),
      }),
    'invoices_subscription_period_idx',
  )
})

test('een gepauzeerd abonnement wordt niet gefactureerd', async () => {
  const rapport = await runBilling({
    today: new Date(2026, 5, 10),
    apply: true,
    onlySubscriptionId: gepauzeerdId,
  })

  assert.equal(rapport.bekekenAbonnementen, 0, 'gepauzeerd komt niet in de selectie')
  assert.equal(rapport.gefactureerd, 0)

  const facturen = await db
    .select()
    .from(invoices)
    .where(eq(invoices.subscriptionId, gepauzeerdId))
  assert.equal(facturen.length, 0)
})

test('de volgende maand wordt de volgende maand gefactureerd', async () => {
  const rapport = await runBilling({
    today: new Date(2026, 1, 2),
    apply: true,
    onlySubscriptionId: aboId,
  })

  assert.equal(rapport.gefactureerd, 1, 'februari erbij')
  assert.equal(rapport.bestondAl, 1, 'januari was al gedaan')

  const balance = await getWalletBalance(walletId)
  assert.equal(balance.balanceCents, 500_000, 'twee maanden budget')
})

test('een gemiste maand wordt ingehaald in een latere run', async () => {
  // De run heeft maart en april niet gedraaid. In mei hoort hij beide
  // alsnog te factureren.
  const rapport = await runBilling({
    today: new Date(2026, 4, 3),
    apply: true,
    onlySubscriptionId: aboId,
  })

  assert.equal(rapport.gefactureerd, 3, 'maart, april en mei')

  const periodes = (
    await db
      .select({ period: invoices.period })
      .from(invoices)
      .where(eq(invoices.subscriptionId, aboId))
  )
    .map((r) => r.period)
    .sort()

  assert.deepEqual(periodes, ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'])

  const balance = await getWalletBalance(walletId)
  assert.equal(balance.balanceCents, 5 * 250_000)
})

test('op de eerste van de maand wordt die maand nog niet gefactureerd', async () => {
  const voor = await getWalletBalance(walletId)

  const rapport = await runBilling({
    today: new Date(2026, 5, 1), // 1 juni, facturatiedag is de 2e
    apply: true,
    onlySubscriptionId: aboId,
  })

  assert.equal(rapport.gefactureerd, 0)
  const na = await getWalletBalance(walletId)
  assert.equal(na.balanceCents, voor.balanceCents)
})

test('een bedragswijziging geldt vanaf de volgende factuur', async () => {
  // Het bedrag op bestaande facturen en boekingen verandert niet mee.
  await db
    .update(subscriptions)
    .set({ amountExclVatCents: 300_000 })
    .where(eq(subscriptions.id, aboId))

  await runBilling({ today: new Date(2026, 5, 2), apply: true, onlySubscriptionId: aboId })

  const facturen = await db
    .select()
    .from(invoices)
    .where(eq(invoices.subscriptionId, aboId))

  const januari = facturen.find((f) => f.period === '2026-01')!
  const juni = facturen.find((f) => f.period === '2026-06')!

  assert.equal(januari.amountExclVatCents, 250_000, 'januari houdt het oude bedrag')
  assert.equal(juni.amountExclVatCents, 300_000, 'juni het nieuwe')
})

test('een abonnement stopzetten stopt het factureren', async () => {
  await db
    .update(subscriptions)
    .set({ status: 'ended', endsOn: new Date(2026, 5, 30) })
    .where(eq(subscriptions.id, aboId))

  const rapport = await runBilling({ today: new Date(2026, 6, 5), apply: true })
  const eigen = rapport.regels.filter((r) => r.subscriptionId === aboId)

  assert.deepEqual(eigen, [], 'geen enkele regel voor een gestopt abonnement')

  await db.update(subscriptions).set({ status: 'active', endsOn: null }).where(eq(subscriptions.id, aboId))
})

test('twee abonnementen bij dezelfde klant krijgen elk hun eigen factuurnummer', async () => {
  const [tweede] = await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      walletId,
      name: 'Tweede abonnement',
      amountExclVatCents: 75_000,
      billingDay: 2,
      startedOn: new Date(2026, 6, 1),
      createdAt: new Date(2026, 6, 1),
    })
    .returning()

  await runBilling({ today: new Date(2026, 6, 2), apply: true })

  const juli = await db
    .select({ number: invoices.number, subscriptionId: invoices.subscriptionId })
    .from(invoices)
    .where(and(eq(invoices.organizationId, orgId), eq(invoices.period, '2026-07')))

  const eigen = juli.filter(
    (f) => f.subscriptionId === aboId || f.subscriptionId === tweede!.id,
  )
  assert.equal(eigen.length, 2, 'beide abonnementen zijn gefactureerd')

  const nummers = [...new Set(eigen.map((f) => f.number))].sort()
  assert.equal(nummers.length, 2, `met verschillende nummers, kreeg ${nummers.join(', ')}`)
  assert.ok(
    nummers.every((n) => n.startsWith('ABO-2026-07')),
    `beide nummers horen bij juli te beginnen, kreeg ${nummers.join(', ')}`,
  )
})

test('een creditnota op een abonnementsfactuur haalt het budget er weer af', async () => {
  const [factuur] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.subscriptionId, aboId), eq(invoices.period, '2026-01')))

  const [boeking] = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.invoiceId, factuur!.id))

  const voor = await getWalletBalance(walletId)
  await reverseEntry(boeking!.id, { reason: 'Creditnota januari' })
  const na = await getWalletBalance(walletId)

  assert.equal(na.balanceCents, voor.balanceCents - 250_000)
  assert.equal(na.toppedUpCents, voor.toppedUpCents - 250_000)

  // Een correctie maakt de periode NIET opnieuw factureerbaar: de factuur
  // bestaat nog. Dat is met opzet, want anders zou de volgende run het
  // gecrediteerde bedrag er zo weer bij zetten.
  const rapport = await runBilling({
    today: new Date(2026, 6, 5),
    apply: true,
    onlySubscriptionId: aboId,
  })
  assert.ok(
    !rapport.regels.some((r) => r.period === '2026-01' && r.soort === 'gefactureerd'),
    'januari wordt niet opnieuw gefactureerd',
  )
})

test('het overzicht toont de eerstvolgende factuurdatum', async () => {
  const lijst = await listSubscriptions({ organizationId: orgId })
  const actief = lijst.find((s) => s.subscription.id === aboId)!

  assert.ok(actief.nextBillingOn instanceof Date)
  assert.equal(actief.nextBillingOn!.getDate(), 2)
  assert.ok(actief.billedPeriods > 0)
  assert.equal(actief.walletName, 'Marketing abonnement')

  const gepauzeerd = lijst.find((s) => s.subscription.id === gepauzeerdId)!
  assert.equal(gepauzeerd.nextBillingOn, null, 'gepauzeerd heeft geen volgende datum')
})

test('de maandelijkse terugkerende omzet telt alleen actieve abonnementen', async () => {
  const totaal = await getMonthlyRecurringCents()

  const actieve = await db
    .select({ bedrag: subscriptions.amountExclVatCents })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))

  assert.equal(
    totaal,
    actieve.reduce((acc, r) => acc + r.bedrag, 0),
  )
})

test('een abonnement dat vandaag is aangemaakt haalt geen oude maanden in', async () => {
  // De valstrik uit de praktijk: je voert een abonnement in met een
  // startdatum van maanden terug. Zonder grens zou de eerste run alle
  // tussenliggende maanden factureren en het budget in een keer volstorten.
  const [nieuw] = await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      walletId,
      name: 'Vandaag ingevoerd, oude startdatum',
      amountExclVatCents: 100_000,
      billingDay: 2,
      startedOn: new Date(2026, 0, 1),
      // createdAt niet meegeven: dat wordt nu.
    })
    .returning()

  const voor = await getWalletBalance(walletId)

  const rapport = await runBilling({
    apply: true,
    onlySubscriptionId: nieuw!.id,
  })

  const overgeslagen = rapport.regels.filter((r) => r.soort === 'voor_aanmaak')
  assert.ok(overgeslagen.length > 0, 'de oude maanden horen gemeld te worden')
  assert.ok(
    overgeslagen.every((r) => r.toelichting.includes('niet gefactureerd')),
    'met een uitleg waarom niet',
  )

  const na = await getWalletBalance(walletId)
  const bijgeschreven = na.balanceCents - voor.balanceCents
  assert.ok(
    bijgeschreven <= 100_000,
    `hoogstens een maand budget erbij, kreeg ${bijgeschreven}`,
  )
})

test('de database weigert een abonnement met een onmogelijke facturatiedag', async () => {
  // Dag 31 bestaat niet elke maand; daarom is 28 het maximum.
  await assertViolatesConstraint(
    () =>
      db.insert(subscriptions).values({
        organizationId: orgId,
        walletId,
        name: 'Dag 31',
        amountExclVatCents: 10_000,
        billingDay: 31,
        startedOn: new Date(2026, 0, 1),
      }),
    'subscription_billing_day_valid',
  )
})

test('de database weigert een abonnement van nul euro', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(subscriptions).values({
        organizationId: orgId,
        walletId,
        name: 'Gratis',
        amountExclVatCents: 0,
        startedOn: new Date(2026, 0, 1),
      }),
    'subscription_amount_positive',
  )
})

test('de database weigert een einddatum voor de startdatum', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(subscriptions).values({
        organizationId: orgId,
        walletId,
        name: 'Omgekeerd',
        amountExclVatCents: 10_000,
        startedOn: new Date(2026, 5, 1),
        endsOn: new Date(2026, 0, 1),
      }),
    'subscription_ends_after_start',
  )
})

test('de database weigert een periode zonder abonnement', async () => {
  // Zou buiten de unieke index vallen en dus dubbel kunnen.
  await assertViolatesConstraint(
    () =>
      db.insert(invoices).values({
        organizationId: orgId,
        period: '2026-09',
        number: `LOS-${suffix}`,
        amountExclVatCents: 10_000,
        issuedOn: new Date(2026, 8, 2),
      }),
    'subscription_needs_period',
  )
})

test('de database weigert een onzinnige periode-notatie', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(invoices).values({
        organizationId: orgId,
        subscriptionId: aboId,
        period: 'maart 2026',
        number: `FOUT-${suffix}`,
        amountExclVatCents: 10_000,
        issuedOn: new Date(2026, 2, 2),
      }),
    'period_format',
  )
})

test('een wallet met een abonnement kan niet verwijderd worden', async () => {
  // Een verse wallet zonder boekingen, zodat het echt het abonnement is dat
  // beschermt en niet de boekingen-koppeling die er ook op staat.
  const [verse] = await db
    .insert(wallets)
    .values({ organizationId: orgId, name: 'Verse wallet' })
    .returning()

  await db.insert(subscriptions).values({
    organizationId: orgId,
    walletId: verse!.id,
    name: 'Hangt aan de verse wallet',
    amountExclVatCents: 10_000,
    startedOn: new Date(2027, 0, 1),
  })

  await assertViolatesConstraint(
    () => db.delete(wallets).where(eq(wallets.id, verse!.id)),
    'subscriptions_wallet_id_wallets_id_fk',
  )
})

test('een abonnement met facturen kan niet verwijderd worden', async () => {
  // Dit ging eerder mis: met ON DELETE SET NULL bleef de periode achter
  // zonder abonnement. Dan viel de factuur buiten de unieke index en kon
  // dezelfde maand opnieuw gefactureerd worden. Een abonnement dat stopt
  // zet je op 'ended'; verwijderen hoort niet.
  await assertViolatesConstraint(
    () => db.delete(subscriptions).where(eq(subscriptions.id, aboId)),
    'invoices_subscription_id_subscriptions_id_fk',
  )

  // En de factuur houdt zijn koppeling en periode.
  const [factuur] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.subscriptionId, aboId), eq(invoices.period, '2026-02')))
  assert.equal(factuur!.subscriptionId, aboId)
  assert.equal(factuur!.period, '2026-02')
})

test('een abonnement zonder facturen kan wel verwijderd worden', async () => {
  // Een verkeerd aangemaakt abonnement waar nog niets op staat, mag weg.
  const [nieuw] = await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      walletId,
      name: 'Per ongeluk aangemaakt',
      amountExclVatCents: 10_000,
      startedOn: new Date(2030, 0, 1),
    })
    .returning()

  await db.delete(subscriptions).where(eq(subscriptions.id, nieuw!.id))

  const [weg] = await db.select().from(subscriptions).where(eq(subscriptions.id, nieuw!.id))
  assert.equal(weg, undefined)
})

test('een wallet met boekingen kan ook niet verwijderd worden', async () => {
  // De tweede bescherming: de boekingen zelf.
  await assertViolatesConstraint(
    () => db.delete(wallets).where(eq(wallets.id, walletId)),
    'ledger_entries_wallet_id_wallets_id_fk',
  )
})
