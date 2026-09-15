/**
 * Tests voor het portfoliobord.
 *
 * Het bord is een WEERGAVE op organization_owners, geen eigen toewijzing.
 * Dat is de belangrijkste eigenschap om te bewaken: wat je op het bord ziet
 * moet hetzelfde zijn als wat er op de klantkaart staat. Zodra dat uit
 * elkaar loopt gelooft niemand meer welke van de twee klopt.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import {
  organizations,
  users,
  subscriptions,
  wallets,
  organizationOwners,
  quotes,
  quoteLines,
} from '../../db/schema'
import { getPortfolioBord, setMarketingManager, setMonthlyTarget, PortfolioError } from '../portfolio'
import { addOwner, listOwners, makePrimaryOwner } from '../crm-owners'

const suffix = Date.now()
let thiessenId: string
let hardyId: string
let zonderAboId: string
let annaId: string
let bramId: string

/** Maakt een klant met een lopend abonnement van dit bedrag. */
async function klantMetAbonnement(naam: string, maandCents: number | null): Promise<string> {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `pf-${naam}-${suffix}`, name: `${naam} ${suffix}`, status: 'client' })
    .returning()

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: org!.id, name: 'Marketing' })
    .returning()

  if (maandCents !== null) {
    await db.insert(subscriptions).values({
      organizationId: org!.id,
      walletId: wallet!.id,
      name: 'Marketingpartnership',
      amountExclVatCents: maandCents,
      status: 'active',
      billingDay: 2,
      startedOn: new Date('2026-01-02T12:00:00Z'),
    })
  }

  return org!.id
}

before(async () => {
  thiessenId = await klantMetAbonnement('Thiessen', 850_000)
  hardyId = await klantMetAbonnement('Hardy', 250_000)
  zonderAboId = await klantMetAbonnement('Zonderabo', null)

  const gemaakt = await db
    .insert(users)
    .values([
      { email: `anna-${suffix}@test.nl`, name: `Anna ${suffix}`, role: 'staff' },
      { email: `bram-${suffix}@test.nl`, name: `Bram ${suffix}`, role: 'staff' },
    ])
    .returning()
  annaId = gemaakt[0]!.id
  bramId = gemaakt[1]!.id
})

after(async () => {
  const orgIds = [thiessenId, hardyId, zonderAboId]
  await db.delete(subscriptions).where(inArray(subscriptions.organizationId, orgIds))
  await db.delete(organizationOwners).where(inArray(organizationOwners.organizationId, orgIds))
  await db.delete(wallets).where(inArray(wallets.organizationId, orgIds))
  await db.delete(organizations).where(inArray(organizations.id, orgIds))
  await db.delete(users).where(inArray(users.id, [annaId, bramId]))
  await client.end()
})

/** De kolom van deze manager op het huidige bord. */
async function kolomVan(userId: string) {
  const bord = await getPortfolioBord()
  return bord.kolommen.find((k) => k.userId === userId)
}

test('zonder marketing managers zijn er geen kolommen', async () => {
  const bord = await getPortfolioBord()
  assert.equal(bord.kolommen.some((k) => k.userId === annaId), false)
})

test('een klant zonder aanspreekpartner staat bij niet-toegewezen', async () => {
  const bord = await getPortfolioBord()
  const namen = bord.nietToegewezen.map((k) => k.organizationId)
  assert.ok(namen.includes(thiessenId), 'Thiessen hoort nog nergens bij')
})

test('een maanddoel zonder portfolio wordt geweigerd', async () => {
  // Een doel zonder klanten om het aan af te meten zegt niets.
  await assert.rejects(
    () => setMonthlyTarget(annaId, 2_000_000),
    (f: Error) => f instanceof PortfolioError && /marketing manager/.test(f.message),
  )
})

test('een marketing manager krijgt een eigen kolom', async () => {
  await setMarketingManager(annaId, true)
  await setMonthlyTarget(annaId, 2_000_000)

  const kolom = await kolomVan(annaId)
  assert.ok(kolom, 'Anna heeft een kolom')
  assert.equal(kolom!.targetCents, 2_000_000)
  assert.equal(kolom!.klanten.length, 0)
  assert.equal(kolom!.bezettingPercentage, 0)
})

test('twee klanten bij één manager tellen op tot de som van hun abonnementen', async () => {
  // Dit is Jims voorbeeld: 8.500 plus 2.500 wordt 11.000.
  await addOwner({ organizationId: thiessenId, userId: annaId })
  await addOwner({ organizationId: hardyId, userId: annaId })

  const kolom = await kolomVan(annaId)
  assert.equal(kolom!.totaalCents, 1_100_000)
  assert.equal(kolom!.klanten.length, 2)
  assert.equal(kolom!.bezettingPercentage, 55, '11.000 van 20.000')
  assert.equal(kolom!.ruimteCents, 900_000)
})

test('de grootste klant staat bovenaan in een kolom', async () => {
  const kolom = await kolomVan(annaId)
  assert.equal(kolom!.klanten[0]!.organizationId, thiessenId)
})

test('een klant overzetten haalt hem bij de ander weg', async () => {
  await setMarketingManager(bramId, true)
  await setMonthlyTarget(bramId, 500_000)

  // Zo werkt het slepen: de nieuwe manager wordt eerste aanspreekpartner.
  await addOwner({ organizationId: hardyId, userId: bramId, isPrimary: true })

  const anna = await kolomVan(annaId)
  const bram = await kolomVan(bramId)

  assert.equal(anna!.totaalCents, 850_000, 'alleen Thiessen nog')
  assert.equal(bram!.totaalCents, 250_000)
  assert.equal(bram!.klanten.length, 1)
})

test('het bord toont hetzelfde als de klantkaart', async () => {
  // De kern: het bord heeft geen eigen toewijzing.
  const owners = await listOwners(hardyId)
  const primair = owners.find((o) => o.isPrimary)!

  const bord = await getPortfolioBord()
  const kolomMetHardy = bord.kolommen.find((k) =>
    k.klanten.some((klant) => klant.organizationId === hardyId),
  )!

  assert.equal(kolomMetHardy.userId, primair.userId)
})

test('boven het doel wordt de ruimte negatief', async () => {
  // Bram heeft een doel van 5.000 en draagt 2.500; Thiessen erbij is te veel.
  await addOwner({ organizationId: thiessenId, userId: bramId, isPrimary: true })

  const bram = await kolomVan(bramId)
  assert.equal(bram!.totaalCents, 1_100_000)
  assert.equal(bram!.bezettingPercentage, 220)
  assert.equal(bram!.ruimteCents, -600_000, 'zes mille eroverheen')
})

test('een klant zonder abonnement telt als nul maar verdwijnt niet', async () => {
  // Anders zie je niet dat er iemand op zit zonder dat het iets oplevert.
  await addOwner({ organizationId: zonderAboId, userId: annaId, isPrimary: true })

  const anna = await kolomVan(annaId)
  const klant = anna!.klanten.find((k) => k.organizationId === zonderAboId)!

  assert.ok(klant, 'staat wel op het bord')
  assert.equal(klant.maandwaardeCents, 0)
  assert.equal(klant.abonnementen, 0)
})

test('een gepauzeerd abonnement telt niet mee', async () => {
  // Wat niet loopt, kost nu geen tijd.
  await db
    .update(subscriptions)
    .set({ status: 'paused' })
    .where(eq(subscriptions.organizationId, thiessenId))

  const bram = await kolomVan(bramId)
  assert.equal(bram!.totaalCents, 250_000, 'alleen Hardy telt nog')

  await db
    .update(subscriptions)
    .set({ status: 'active' })
    .where(eq(subscriptions.organizationId, thiessenId))
})

test('klanten van een oud-manager verdwijnen niet stilletjes', async () => {
  // Zet Bram uit als manager; zijn klanten moeten zichtbaar blijven als
  // iets dat verdeeld moet worden, niet uit beeld raken.
  await setMarketingManager(bramId, false)

  const bord = await getPortfolioBord()
  assert.equal(bord.kolommen.some((k) => k.userId === bramId), false, 'geen kolom meer')

  const nietToegewezen = bord.nietToegewezen.map((k) => k.organizationId)
  assert.ok(nietToegewezen.includes(thiessenId), 'zijn klanten vragen om een nieuwe manager')
  assert.ok(nietToegewezen.includes(hardyId))
})

test('een manager uitzetten wist ook zijn maanddoel', async () => {
  const [bram] = await db.select().from(users).where(eq(users.id, bramId))
  assert.equal(bram!.monthlyTargetCents, null)
})

/* --- Klanten zonder abonnement ------------------------------------------- */

test('een klant op projectbasis telt mee via zijn geaccepteerde offertes', async () => {
  // Waarom dit er is: lang niet elke klant heeft een abonnement. Telde het
  // bord die als nul, dan lijkt een marketing manager met vijf projectklanten
  // leeg te lopen terwijl hij het net zo druk heeft.
  const [org] = await db
    .insert(organizations)
    .values({ slug: `pf-project-${suffix}`, name: `Projectklant ${suffix}`, status: 'client' })
    .returning()

  const [offerte] = await db
    .insert(quotes)
    .values({
      organizationId: org!.id,
      number: `OF-${suffix}`,
      title: 'Merkpositionering',
      status: 'accepted',
      issuedOn: new Date(),
    })
    .returning()

  // 12.000 over een jaar is 1.000 per maand.
  await db.insert(quoteLines).values({
    quoteId: offerte!.id,
    kind: 'service',
    description: 'Strategietraject',
    quantityHundredths: 100,
    unitPriceCents: 1_200_000,
    sortOrder: 1,
  })

  const bord = await getPortfolioBord()
  const klant = bord.nietToegewezen.find((k) => k.organizationId === org!.id)

  assert.ok(klant, 'de projectklant staat op het bord')
  assert.equal(klant!.abonnementen, 0, 'hij heeft geen abonnement')
  assert.equal(klant!.abonnementCents, 0)
  assert.equal(klant!.projectCents, 100_000, 'een jaaromzet van 12.000 is 1.000 per maand')
  assert.equal(klant!.maandwaardeCents, 100_000, 'en dat is zijn maandwaarde')

  await db.delete(quoteLines).where(eq(quoteLines.quoteId, offerte!.id))
  await db.delete(quotes).where(eq(quotes.id, offerte!.id))
  await db.delete(organizations).where(eq(organizations.id, org!.id))
})

test('een offerte die nog niet geaccepteerd is telt niet mee', async () => {
  // Een verstuurde offerte is een hoop, geen waarde.
  const [org] = await db
    .insert(organizations)
    .values({ slug: `pf-hoop-${suffix}`, name: `Hoopvol ${suffix}`, status: 'client' })
    .returning()

  const [offerte] = await db
    .insert(quotes)
    .values({
      organizationId: org!.id,
      number: `OF-hoop-${suffix}`,
      title: 'Misschien',
      status: 'sent',
      issuedOn: new Date(),
    })
    .returning()

  await db.insert(quoteLines).values({
    quoteId: offerte!.id,
    kind: 'service',
    description: 'Strategietraject',
    quantityHundredths: 100,
    unitPriceCents: 1_200_000,
    sortOrder: 1,
  })

  const bord = await getPortfolioBord()
  const klant = bord.nietToegewezen.find((k) => k.organizationId === org!.id)

  assert.ok(klant)
  assert.equal(klant!.maandwaardeCents, 0, 'pas bij akkoord telt het mee')

  await db.delete(quoteLines).where(eq(quoteLines.quoteId, offerte!.id))
  await db.delete(quotes).where(eq(quotes.id, offerte!.id))
  await db.delete(organizations).where(eq(organizations.id, org!.id))
})
