/**
 * Tests voor de financiele overzichten. De belangrijkste vraag: staat er
 * geen omzet in de cijfers die is teruggedraaid, en klopt de marge met de
 * kostprijs zoals die bij het boeken gold.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, users, wallets, ledgerEntries, services } from '../../db/schema'
import { addServiceEntry, reverseEntry } from '../ledger'
import { createInvoiceWithTopup } from '../invoices'
import {
  getOverallFigures,
  getFiguresByOrganization,
  getFiguresByEmployee,
  getFiguresByService,
} from '../reports'

const suffix = Date.now()
let orgA: string
let orgB: string
let walletA: string
let walletB: string
let dienstId: string
let duurDienstId: string
let annaId: string
let bramId: string

before(async () => {
  const [a] = await db
    .insert(organizations)
    .values({ slug: `rap-a-${suffix}`, name: `Rapport Klant A ${suffix}` })
    .returning()
  orgA = a!.id
  const [b] = await db
    .insert(organizations)
    .values({ slug: `rap-b-${suffix}`, name: `Rapport Klant B ${suffix}` })
    .returning()
  orgB = b!.id

  const [wa] = await db.insert(wallets).values({ organizationId: orgA, name: 'W' }).returning()
  walletA = wa!.id
  const [wb] = await db.insert(wallets).values({ organizationId: orgB, name: 'W' }).returning()
  walletB = wb!.id

  const [anna] = await db
    .insert(users)
    .values({ email: `anna-${suffix}@jamesrobinson.nl`, name: 'Anna', role: 'staff' })
    .returning()
  annaId = anna!.id
  const [bram] = await db
    .insert(users)
    .values({ email: `bram-${suffix}@jamesrobinson.nl`, name: 'Bram', role: 'staff' })
    .returning()
  bramId = bram!.id

  // Dienst met kostprijs: 100 euro verkoop, 35 euro kosten, dus 65 marge.
  const [d] = await db
    .insert(services)
    .values({
      name: `Social media post ${suffix}`,
      category: 'Social Management',
      unit: 'piece',
      unitPriceCents: 10_000,
      costPriceCents: 3_500,
    })
    .returning()
  dienstId = d!.id

  // Dienst zonder kostprijs: marge onbekend.
  const [dd] = await db
    .insert(services)
    .values({ name: `Strategiesessie ${suffix}`, unit: 'hour', unitPriceCents: 15_000 })
    .returning()
  duurDienstId = dd!.id
})

after(async () => {
  await db.delete(ledgerEntries).where(inArray(ledgerEntries.walletId, [walletA, walletB]))
  await db.delete(services).where(inArray(services.id, [dienstId, duurDienstId]))
  await db.delete(users).where(inArray(users.id, [annaId, bramId]))
  await db.delete(organizations).where(inArray(organizations.id, [orgA, orgB]))
  await client.end()
})

test('opzet: facturen en boekingen aanmaken', async () => {
  await createInvoiceWithTopup({
    organizationId: orgA,
    walletId: walletA,
    number: `${suffix}-A1`,
    amountExclVatCents: 200_000, // 2.000
  })
  await createInvoiceWithTopup({
    organizationId: orgB,
    walletId: walletB,
    number: `${suffix}-B1`,
    amountExclVatCents: 100_000, // 1.000
  })

  // Anna levert 5 posts voor klant A: 500 euro omzet, 175 kosten.
  await addServiceEntry({
    walletId: walletA,
    serviceId: dienstId,
    quantityHundredths: 500,
    deliveredByUserId: annaId,
  })

  // Bram levert 2 posts voor klant A: 200 omzet, 70 kosten.
  await addServiceEntry({
    walletId: walletA,
    serviceId: dienstId,
    quantityHundredths: 200,
    deliveredByUserId: bramId,
  })

  // Bram levert 3 posts voor klant B: 300 omzet, 105 kosten.
  await addServiceEntry({
    walletId: walletB,
    serviceId: dienstId,
    quantityHundredths: 300,
    deliveredByUserId: bramId,
  })

  // Anna levert 2 uur strategie voor klant B: 300 omzet, kosten onbekend.
  await addServiceEntry({
    walletId: walletB,
    serviceId: duurDienstId,
    quantityHundredths: 200,
    deliveredByUserId: annaId,
  })

  assert.ok(true)
})

test('omzet per klant klopt', async () => {
  const perKlant = await getFiguresByOrganization()
  const a = perKlant.find((k) => k.organizationId === orgA)!
  const b = perKlant.find((k) => k.organizationId === orgB)!

  assert.equal(a.revenueCents, 70_000, 'klant A: 5 + 2 posts van 100 euro')
  assert.equal(b.revenueCents, 60_000, 'klant B: 3 posts van 100 plus 2 uur van 150')

  assert.equal(a.toppedUpCents, 200_000)
  assert.equal(a.balanceCents, 200_000 - 70_000, 'saldo is budget minus omzet')
  assert.equal(b.balanceCents, 100_000 - 60_000)
})

test('marge per klant gebruikt de kostprijs van de boeking', async () => {
  const perKlant = await getFiguresByOrganization()
  const a = perKlant.find((k) => k.organizationId === orgA)!

  // 7 posts * 35 euro kostprijs = 245 euro kosten
  assert.equal(a.costCents, 24_500)
  assert.equal(a.marginCents, 70_000 - 24_500)
})

test('een dienst zonder kostprijs levert geen kosten op, geen nul-marge-illusie', async () => {
  const perDienst = await getFiguresByService()
  const strategie = perDienst.find((d) => d.serviceId === duurDienstId)!

  assert.equal(strategie.revenueCents, 30_000, '2 uur van 150 euro')
  assert.equal(strategie.costCents, 0, 'geen kostprijs bekend')
  // De marge is hier dus gelijk aan de omzet. Dat is te lezen als
  // "kostprijs niet ingevuld", niet als "100 procent marge".
  assert.equal(strategie.marginCents, 30_000)
})

test('omzet per medewerker gaat op wie leverde, niet wie invoerde', async () => {
  const perMedewerker = await getFiguresByEmployee()
  const anna = perMedewerker.find((m) => m.userId === annaId)!
  const bram = perMedewerker.find((m) => m.userId === bramId)!

  assert.equal(anna.revenueCents, 50_000 + 30_000, 'Anna: 5 posts plus 2 uur strategie')
  assert.equal(bram.revenueCents, 20_000 + 30_000, 'Bram: 2 posts bij A, 3 bij B')

  assert.equal(anna.clientCount, 2, 'Anna leverde voor beide klanten')
  assert.equal(bram.clientCount, 2)

  assert.equal(anna.name, 'Anna')
})

test('de kerncijfers tellen op tot de som van de klanten', async () => {
  const overall = await getOverallFigures()
  const perKlant = await getFiguresByOrganization()

  const somOmzet = perKlant.reduce((acc, k) => acc + k.revenueCents, 0)
  const somBudget = perKlant.reduce((acc, k) => acc + k.balanceCents, 0)

  assert.equal(overall.revenueCents, somOmzet)
  assert.equal(overall.openBudgetCents, somBudget)
})

test('een teruggedraaide boeking verdwijnt uit de omzet, de marge en per medewerker', async () => {
  // Dit is de belangrijkste test van dit bestand: teruggedraaid werk mag
  // nergens in de cijfers blijven staan.
  const voorKlant = (await getFiguresByOrganization()).find((k) => k.organizationId === orgA)!
  const voorAnna = (await getFiguresByEmployee()).find((m) => m.userId === annaId)!
  const voorOverall = await getOverallFigures()

  const fout = await addServiceEntry({
    walletId: walletA,
    serviceId: dienstId,
    quantityHundredths: 400, // 4 posts, 400 euro
    deliveredByUserId: annaId,
  })

  const tussenKlant = (await getFiguresByOrganization()).find((k) => k.organizationId === orgA)!
  assert.equal(tussenKlant.revenueCents, voorKlant.revenueCents + 40_000)

  await reverseEntry(fout.id, { reason: 'Dubbel geboekt' })

  const naKlant = (await getFiguresByOrganization()).find((k) => k.organizationId === orgA)!
  const naAnna = (await getFiguresByEmployee()).find((m) => m.userId === annaId)!
  const naOverall = await getOverallFigures()

  assert.equal(naKlant.revenueCents, voorKlant.revenueCents, 'omzet per klant terug')
  assert.equal(naKlant.costCents, voorKlant.costCents, 'kosten per klant terug')
  assert.equal(naKlant.marginCents, voorKlant.marginCents, 'marge per klant terug')
  assert.equal(naAnna.revenueCents, voorAnna.revenueCents, 'omzet van Anna terug')
  assert.equal(naAnna.costCents, voorAnna.costCents, 'kosten van Anna terug')
  assert.equal(naOverall.revenueCents, voorOverall.revenueCents, 'totale omzet terug')
  assert.equal(naOverall.marginCents, voorOverall.marginCents, 'totale marge terug')
})

test('een teruggedraaide factuur verdwijnt uit bijgeschreven budget', async () => {
  const voor = await getOverallFigures()

  const { entry } = await createInvoiceWithTopup({
    organizationId: orgA,
    walletId: walletA,
    number: `${suffix}-credit`,
    amountExclVatCents: 50_000,
  })

  const tussen = await getOverallFigures()
  assert.equal(tussen.toppedUpCents, voor.toppedUpCents + 50_000)

  await reverseEntry(entry.id, { reason: 'Creditnota' })

  const na = await getOverallFigures()
  assert.equal(na.toppedUpCents, voor.toppedUpCents, 'bijgeschreven budget terug')
  assert.equal(na.revenueCents, voor.revenueCents, 'en het is geen omzet geworden')
})

test('een periodefilter beperkt de omzet tot die periode', async () => {
  // Een boeking ver in het verleden hoort buiten een recent filter te vallen.
  await addServiceEntry({
    walletId: walletA,
    serviceId: dienstId,
    quantityHundredths: 100,
    deliveredByUserId: annaId,
    bookedOn: new Date('2020-03-15'),
  })

  const alles = await getOverallFigures()
  const alleen2020 = await getOverallFigures({
    from: new Date('2020-01-01'),
    to: new Date('2020-12-31'),
  })

  assert.equal(alleen2020.revenueCents, 10_000, 'alleen de boeking uit 2020')
  assert.ok(alles.revenueCents > alleen2020.revenueCents)

  // Het openstaande budget is een stand van nu en negeert het filter.
  assert.equal(alleen2020.openBudgetCents, alles.openBudgetCents)
})

test('per dienst worden aantallen bij elkaar opgeteld', async () => {
  const perDienst = await getFiguresByService()
  const post = perDienst.find((d) => d.serviceId === dienstId)!

  assert.ok(post.quantityHundredths > 0)
  assert.ok(post.bookingCount >= 3)
  assert.equal(post.category, 'Social Management')
})
