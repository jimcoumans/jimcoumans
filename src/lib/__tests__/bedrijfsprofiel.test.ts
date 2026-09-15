/**
 * Tests voor het bedrijfsprofiel en de filters.
 *
 * Het belangrijkste dat hier vastligt: een filter moet doen wat het belooft.
 * Een filter dat te veel toont is vervelend, maar een filter dat stilletjes
 * iets weglaat is gevaarlijk — dan denk je dat je alle klanten van een
 * marketing manager ziet terwijl er twee ontbreken.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import {
  organizations,
  users,
  organizationOwners,
  organizationLocations,
  competitors,
  organizationGoals,
} from '../../db/schema'
import {
  updateOrganizationDetails,
  filterKlantIds,
  getFilterKeuzes,
  addVestiging,
  listVestigingen,
  addConcurrent,
  concurrentenOverzicht,
  addDoel,
  listDoelen,
  zetDoelBehaald,
  CrmError,
} from '../crm'
import { bedrijfsjubileum } from '../bedrijf-labels'
import { addOwner } from '../crm-owners'
import { assertViolatesConstraint } from './helpers'

const suffix = Date.now()
let horecaId: string
let bouwId: string
let managerId: string

before(async () => {
  const gemaakt = await db
    .insert(organizations)
    .values([
      { slug: `bp-horeca-${suffix}`, name: `Hotel ${suffix}`, status: 'client' },
      { slug: `bp-bouw-${suffix}`, name: `Bouwbedrijf ${suffix}`, status: 'prospect' },
    ])
    .returning()
  horecaId = gemaakt[0]!.id
  bouwId = gemaakt[1]!.id

  const [manager] = await db
    .insert(users)
    .values({ email: `bp-${suffix}@test.nl`, name: `Manager ${suffix}`, role: 'staff' })
    .returning()
  managerId = manager!.id

  await updateOrganizationDetails(horecaId, {
    industry: `Horeca ${suffix}`,
    region: `Zuid-Limburg ${suffix}`,
    relationHealth: 'uitstekend',
    legalForm: 'bv',
    employeeCount: 42,
    annualRevenueCents: 3_500_000_00,
    coreActivity: 'Hotel en restaurant',
    foundedOn: new Date('1999-06-01T12:00:00Z'),
  })

  await updateOrganizationDetails(bouwId, {
    industry: `Bouw ${suffix}`,
    region: `Midden-Limburg ${suffix}`,
    relationHealth: 'zorgelijk',
  })

  await addOwner({ organizationId: horecaId, userId: managerId, role: 'Marketing manager' })
})

after(async () => {
  const ids = [horecaId, bouwId]
  await db.delete(organizationGoals).where(inArray(organizationGoals.organizationId, ids))
  await db.delete(competitors).where(inArray(competitors.organizationId, ids))
  await db.delete(organizationLocations).where(inArray(organizationLocations.organizationId, ids))
  await db.delete(organizationOwners).where(inArray(organizationOwners.organizationId, ids))
  await db.delete(organizations).where(inArray(organizations.id, ids))
  await db.delete(users).where(inArray(users.id, [managerId]))
  await client.end()
})

/* --- Het profiel --------------------------------------------------------- */

test('de profielvelden worden bewaard', async () => {
  const [org] = await db.select().from(organizations).where(inArray(organizations.id, [horecaId]))
  assert.equal(org!.legalForm, 'bv')
  assert.equal(org!.employeeCount, 42)
  assert.equal(org!.annualRevenueCents, 350_000_000, 'drie en een half miljoen in centen')
  assert.equal(org!.relationHealth, 'uitstekend')
})

test('een jaaromzet boven de 21 miljoen past er nog in', async () => {
  // Centen passen boven 21 miljoen euro niet meer in een gewone integer. Dat
  // is precies het soort grens waar je pas tegenaan loopt als het misgaat.
  await updateOrganizationDetails(horecaId, { annualRevenueCents: 50_000_000_00 })
  const [org] = await db.select().from(organizations).where(inArray(organizations.id, [horecaId]))
  assert.equal(org!.annualRevenueCents, 5_000_000_000)

  await updateOrganizationDetails(horecaId, { annualRevenueCents: 350_000_000 })
})

test('een negatief aantal medewerkers wordt geweigerd', async () => {
  await assertViolatesConstraint(
    () =>
      db
        .insert(organizations)
        .values({ slug: `bp-fout-${suffix}`, name: 'Fout', employeeCount: -1 }),
    'organization_employee_count_valid',
  )
})

test('het jubileum telt vanaf vijf jaar en in vijftallen', () => {
  assert.deepEqual(bedrijfsjubileum(new Date('2000-01-01'), new Date('2025-06-01')), {
    jaren: 25,
    isRond: true,
  })
  assert.deepEqual(bedrijfsjubileum(new Date('2000-01-01'), new Date('2026-06-01')), {
    jaren: 26,
    isRond: false,
  })
  assert.equal(bedrijfsjubileum(null), null)
  assert.equal(bedrijfsjubileum(new Date('2026-01-01'), new Date('2026-06-01')), null)
})

/* --- Filters ------------------------------------------------------------- */

test('zonder filter komt er geen selectie terug', async () => {
  // null betekent "alles", en dat scheelt een query die toch niets weglaat.
  assert.equal(await filterKlantIds({}), null)
  assert.equal(await filterKlantIds({ zoek: '   ' }), null)
})

test('filteren op branche levert precies die klanten', async () => {
  const ids = await filterKlantIds({ branche: `Horeca ${suffix}` })
  assert.ok(ids)
  assert.deepEqual(ids, [horecaId])
})

test('filteren op regio en gezondheid werkt samen', async () => {
  const beide = await filterKlantIds({
    regio: `Zuid-Limburg ${suffix}`,
    gezondheid: 'uitstekend',
  })
  assert.deepEqual(beide, [horecaId])

  // Dezelfde regio met een gezondheid die er niet bij hoort: geen treffers.
  const geen = await filterKlantIds({
    regio: `Zuid-Limburg ${suffix}`,
    gezondheid: 'zorgelijk',
  })
  assert.deepEqual(geen, [])
})

test('filteren op marketing manager kijkt naar de eerste aanspreekpartner', async () => {
  const ids = await filterKlantIds({ manager: managerId })
  assert.deepEqual(ids, [horecaId])
})

test('zoeken kijkt ook in plaats, KvK en kernactiviteit', async () => {
  const opActiviteit = await filterKlantIds({ zoek: 'restaurant' })
  assert.ok(opActiviteit!.includes(horecaId), 'gevonden op kernactiviteit')

  const opNaam = await filterKlantIds({ zoek: `Bouwbedrijf ${suffix}` })
  assert.deepEqual(opNaam, [bouwId])
})

test('de keuzelijsten tonen alleen waarden die echt voorkomen', async () => {
  const keuzes = await getFilterKeuzes()
  assert.ok(keuzes.branches.includes(`Horeca ${suffix}`))
  assert.ok(keuzes.regios.includes(`Midden-Limburg ${suffix}`))
  assert.ok(keuzes.managers.some((m) => m.id === managerId))
})

/* --- Vestigingen, concurrenten en doelen --------------------------------- */

test('een vestiging zonder naam wordt geweigerd', async () => {
  await assert.rejects(
    () =>
      addVestiging({
        organizationId: horecaId,
        name: '  ',
        addressLine: null,
        postalCode: null,
        city: null,
        phone: null,
        notes: null,
      }),
    (f: Error) => f instanceof CrmError,
  )
})

test('vestigingen komen terug bij hun klant', async () => {
  await addVestiging({
    organizationId: horecaId,
    name: 'Vestiging Maastricht',
    addressLine: 'Vrijthof 1',
    postalCode: '6211 LD',
    city: 'Maastricht',
    phone: null,
    notes: null,
  })

  const lijst = await listVestigingen(horecaId)
  assert.equal(lijst.length, 1)
  assert.equal(lijst[0]!.city, 'Maastricht')

  assert.equal((await listVestigingen(bouwId)).length, 0, 'niet bij de andere klant')
})

test('dezelfde concurrent bij twee klanten wordt geteld als patroon', async () => {
  // Als dezelfde partij vaker in de weg zit is dat geen toeval.
  const naam = `Grote Concurrent ${suffix}`
  await addConcurrent({
    organizationId: horecaId,
    name: naam,
    website: null,
    notes: 'zit overal',
    createdByUserId: null,
  })
  await addConcurrent({
    organizationId: bouwId,
    name: naam,
    website: null,
    notes: null,
    createdByUserId: null,
  })

  const overzicht = await concurrentenOverzicht()
  const rij = overzicht.find((c) => c.naam === naam)
  assert.ok(rij)
  assert.equal(rij!.aantal, 2)
  assert.match(rij!.klanten, /Hotel/)
  assert.match(rij!.klanten, /Bouwbedrijf/)
})

test('doelen staan open tot je ze afvinkt', async () => {
  await addDoel({
    organizationId: horecaId,
    title: 'Meer directe boekingen',
    notes: null,
    targetOn: new Date('2026-12-31T12:00:00Z'),
    createdByUserId: null,
  })

  let doelen = await listDoelen(horecaId)
  assert.equal(doelen.length, 1)
  assert.equal(doelen[0]!.achievedOn, null)

  await zetDoelBehaald(doelen[0]!.id, true)
  doelen = await listDoelen(horecaId)
  assert.ok(doelen[0]!.achievedOn, 'nu behaald')

  await zetDoelBehaald(doelen[0]!.id, false)
  doelen = await listDoelen(horecaId)
  assert.equal(doelen[0]!.achievedOn, null, 'en weer terug te draaien')
})

/* --- Moneybird-velden ---------------------------------------------------- */

test('twee klanten met hetzelfde klantnummer kan niet', async () => {
  // Hier hangt de ClickUp-automatisering aan. Een dubbel nummer zou die
  // stilletjes naar de verkeerde klant laten wijzen, en dat merk je pas als
  // er uren op het verkeerde project staan.
  await updateOrganizationDetails(horecaId, { customerNumber: `MB-${suffix}` })

  await assertViolatesConstraint(
    () => updateOrganizationDetails(bouwId, { customerNumber: `MB-${suffix}` }),
    'organizations_customer_number_idx',
  )
})

test('twee klanten zonder klantnummer mag wel', async () => {
  // Een unieke index telt NULL niet als waarde; zonder dat zou je maar één
  // klant zonder nummer kunnen hebben, en dan kun je niet beginnen.
  await updateOrganizationDetails(bouwId, { customerNumber: null })

  const [derde] = await db
    .insert(organizations)
    .values({ slug: `bp-derde-${suffix}`, name: `Derde ${suffix}` })
    .returning()

  const [org] = await db.select().from(organizations).where(inArray(organizations.id, [derde!.id]))
  assert.equal(org!.customerNumber, null)

  await db.delete(organizations).where(inArray(organizations.id, [derde!.id]))
})

test('de boekhoudvelden worden bewaard', async () => {
  await updateOrganizationDetails(horecaId, {
    klantType: 'bedrijf',
    verzendmethode: 'peppol',
    projectNumber: 'P-2026-01',
    invoiceAttn: 'Crediteuren',
    invoiceEmail: 'crediteuren@hotel.nl',
  })

  const [org] = await db.select().from(organizations).where(inArray(organizations.id, [horecaId]))
  assert.equal(org!.klantType, 'bedrijf')
  assert.equal(org!.verzendmethode, 'peppol')
  assert.equal(org!.projectNumber, 'P-2026-01')
  assert.equal(org!.invoiceAttn, 'Crediteuren')
  assert.equal(org!.invoiceEmail, 'crediteuren@hotel.nl')
})
