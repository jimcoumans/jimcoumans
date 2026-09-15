/**
 * Tests voor wat het team kost.
 *
 * De fout die dit bestand moet voorkomen: brutoloon aanzien voor kosten. Daar
 * komt vakantiegeld bij en daar komen werkgeverslasten overheen. Wie met
 * bruto rekent ziet ongeveer driekwart van zijn grootste kostenpost en denkt
 * dat hij ruimer zit dan hij zit.
 *
 * En de andere kant: een management fee is een factuur van een eigen BV. Daar
 * zit geen vakantiegeld en geen werkgeverslast op. Die als salaris invoeren
 * maakt hem een derde te duur.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { users, salaryRecords } from '../../db/schema'
import { maandlast, uurkostprijsCents, getPersoneelskosten } from '../kosten'
import { assertViolatesConstraint } from './helpers'

const suffix = Date.now()
let werknemerId: string
let eigenaarId: string
let zonderId: string

before(async () => {
  const gemaakt = await db
    .insert(users)
    .values([
      {
        email: `k-werknemer-${suffix}@test.nl`,
        name: `Werknemer ${suffix}`,
        role: 'staff',
        department: 'Marketing',
        contractHoursPerWeekQuarters: 3200,
      },
      {
        email: `k-eigenaar-${suffix}@test.nl`,
        name: `Eigenaar ${suffix}`,
        role: 'admin',
        department: 'Directie',
        contractHoursPerWeekQuarters: 4000,
      },
      { email: `k-zonder-${suffix}@test.nl`, name: `Zonder ${suffix}`, role: 'staff' },
    ])
    .returning()
  werknemerId = gemaakt[0]!.id
  eigenaarId = gemaakt[1]!.id
  zonderId = gemaakt[2]!.id
})

after(async () => {
  const ids = [werknemerId, eigenaarId, zonderId]
  await db.delete(salaryRecords).where(inArray(salaryRecords.userId, ids))
  await db.delete(users).where(inArray(users.id, ids))
  await client.end()
})

/* --- Het rekenwerk ------------------------------------------------------- */

test('een salaris kost meer dan het brutobedrag', () => {
  const last = maandlast({
    grossMonthlyCents: 300_000,
    holidayAllowancePercent: 8,
    employerCostPercent: 28,
    soort: 'loondienst',
  })

  assert.equal(last.brutoCents, 300_000)
  assert.equal(last.vakantiegeldCents, 24_000, '8 procent van 3.000')
  // Werkgeverslasten gaan over bruto plus vakantiegeld: 28% van 3.240.
  assert.equal(last.werkgeverslastenCents, 90_720)
  assert.equal(last.totaalCents, 414_720)

  assert.ok(
    last.totaalCents > last.brutoCents * 1.35,
    'het verschil met bruto is groot genoeg om je begroting te breken',
  )
})

test('een management fee is meteen de last', () => {
  const last = maandlast({
    grossMonthlyCents: 750_000,
    holidayAllowancePercent: 0,
    employerCostPercent: 0,
    soort: 'management_fee',
  })

  assert.equal(last.totaalCents, 750_000)
  assert.equal(last.vakantiegeldCents, 0)
  assert.equal(last.werkgeverslastenCents, 0)
})

test('een fee blijft een fee, ook als er per ongeluk percentages bij staan', () => {
  // De database weigert dit al, maar het rekenwerk moet er ook niet in
  // meegaan: één plek waar het misgaat is er een te veel.
  const last = maandlast({
    grossMonthlyCents: 750_000,
    holidayAllowancePercent: 8,
    employerCostPercent: 28,
    soort: 'management_fee',
  })
  assert.equal(last.totaalCents, 750_000)
})

test('zonder werkgeverslasten en vakantiegeld is de last het brutobedrag', () => {
  const last = maandlast({
    grossMonthlyCents: 300_000,
    holidayAllowancePercent: 0,
    employerCostPercent: 0,
    soort: 'loondienst',
  })
  assert.equal(last.totaalCents, 300_000)
})

test('de uurkostprijs rekent met 4,33 weken per maand', () => {
  // 32 uur per week is 138,56 uur per maand; 4.147,20 daardoor is 29,93.
  const cents = uurkostprijsCents(414_720, 3200)
  assert.equal(cents, 2993)

  assert.equal(uurkostprijsCents(414_720, null), null, 'zonder uren geen kostprijs')
  assert.equal(uurkostprijsCents(414_720, 0), null)
})

/* --- Wat de database niet toestaat --------------------------------------- */

test('een management fee met werkgeverslasten wordt geweigerd', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(salaryRecords).values({
        userId: eigenaarId,
        soort: 'management_fee',
        grossMonthlyCents: 750_000,
        employerCostPercent: 28,
        holidayAllowancePercent: 0,
        effectiveFrom: new Date('2024-01-01T12:00:00Z'),
      }),
    'fee_has_no_employer_cost',
  )
})

test('onmogelijke werkgeverslasten worden geweigerd', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(salaryRecords).values({
        userId: werknemerId,
        grossMonthlyCents: 300_000,
        employerCostPercent: 500,
        effectiveFrom: new Date('2024-02-01T12:00:00Z'),
      }),
    'salary_employer_cost_valid',
  )
})

/* --- Het overzicht ------------------------------------------------------- */

test('het overzicht telt loondienst en fee apart', async () => {
  await db.insert(salaryRecords).values([
    {
      userId: werknemerId,
      soort: 'loondienst',
      grossMonthlyCents: 300_000,
      holidayAllowancePercent: 8,
      employerCostPercent: 28,
      effectiveFrom: new Date('2024-01-01T12:00:00Z'),
    },
    {
      userId: eigenaarId,
      soort: 'management_fee',
      grossMonthlyCents: 750_000,
      holidayAllowancePercent: 0,
      employerCostPercent: 0,
      effectiveFrom: new Date('2024-01-01T12:00:00Z'),
    },
  ])

  const kosten = await getPersoneelskosten(new Date('2026-01-01T12:00:00Z'))

  const onze = kosten.regels.filter(
    (r) => r.userId === werknemerId || r.userId === eigenaarId,
  )
  assert.equal(onze.length, 2)

  const werknemer = onze.find((r) => r.userId === werknemerId)!
  const eigenaar = onze.find((r) => r.userId === eigenaarId)!

  assert.equal(werknemer.last.totaalCents, 414_720)
  assert.equal(eigenaar.last.totaalCents, 750_000)
  assert.equal(eigenaar.soort, 'management_fee')
})

test('wie geen beloning heeft wordt apart gemeld, niet als nul geteld', async () => {
  // Stil op nul zetten is het gevaarlijkst: dan lijkt je kostenpost lager dan
  // hij is en merk je het pas als het geld op is.
  const kosten = await getPersoneelskosten(new Date('2026-01-01T12:00:00Z'))

  assert.ok(
    kosten.zonderBeloning.some((z) => z.userId === zonderId),
    'de collega zonder beloning staat in de lijst die je nog moet invullen',
  )
  assert.equal(
    kosten.regels.some((r) => r.userId === zonderId),
    false,
    'en telt niet mee als kostenpost van nul',
  )
})

test('het totaal is de som van de regels', async () => {
  const kosten = await getPersoneelskosten(new Date('2026-01-01T12:00:00Z'))
  assert.equal(
    kosten.totaalCents,
    kosten.regels.reduce((t, r) => t + r.last.totaalCents, 0),
  )
  assert.equal(kosten.loondienstCents + kosten.managementFeeCents, kosten.totaalCents)
})

test('een verhoging die nog moet ingaan telt nog niet mee in de kosten', async () => {
  await db.insert(salaryRecords).values({
    userId: werknemerId,
    soort: 'loondienst',
    grossMonthlyCents: 400_000,
    holidayAllowancePercent: 8,
    employerCostPercent: 28,
    effectiveFrom: new Date('2027-01-01T12:00:00Z'),
  })

  const nu = await getPersoneelskosten(new Date('2026-06-01T12:00:00Z'))
  const werknemer = nu.regels.find((r) => r.userId === werknemerId)!
  assert.equal(werknemer.last.brutoCents, 300_000, 'nog het oude bedrag')

  const later = await getPersoneelskosten(new Date('2027-06-01T12:00:00Z'))
  const straks = later.regels.find((r) => r.userId === werknemerId)!
  assert.equal(straks.last.brutoCents, 400_000)
})

test('kosten worden per afdeling opgeteld', async () => {
  const kosten = await getPersoneelskosten(new Date('2026-01-01T12:00:00Z'))
  const directie = kosten.perAfdeling.find((a) => a.afdeling === 'Directie')
  assert.ok(directie, 'Directie staat erbij')
  assert.ok(directie!.cents >= 750_000)
})
