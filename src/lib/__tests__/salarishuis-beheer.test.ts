/**
 * Tests voor het beheren van het salarishuis in het portaal.
 *
 * Een nieuwe versie bij een indexatie, corrigeren zolang er geen contracten
 * op staan, en de controles die de database niet kent: het wettelijk minimum
 * aan vakantiegeld en vakantie-uren, en de onderste trede tegen het
 * minimumloon.
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { salaryHouses, salaryScales, generatedContracts, candidates } from '../../db/schema'
import {
  controleerHuis,
  maakHuis,
  corrigeerHuis,
  wisHuis,
  contractenOpHuis,
  getHuis,
  berekenBeloning,
  SalarishuisError,
  type HuisInvoer,
} from '../salarishuis'

const gemaakt: string[] = []
const kandidaten: string[] = []

after(async () => {
  if (kandidaten.length > 0) {
    await db.delete(generatedContracts).where(inArray(generatedContracts.candidateId, kandidaten))
    await db.delete(candidates).where(inArray(candidates.id, kandidaten))
  }
  if (gemaakt.length > 0) await db.delete(salaryHouses).where(inArray(salaryHouses.id, gemaakt))
  await client.end()
})

/** Het huis van 2026 uit de sheet, op een datum ver in de toekomst. */
function huis2026(overschrijf: Partial<HuisInvoer> = {}): HuisInvoer {
  return {
    effectiveFrom: new Date(Date.UTC(2099, 0, 1)),
    baseCents: 257_800,
    stepIncreaseBp: 150,
    pensionAllowanceBp: 1000,
    holidayAllowanceBp: 800,
    fulltimeHoursWeekQuarters: 4000,
    holidayHoursFulltime: 200,
    minimumHourlyCents: 1471,
    note: 'test',
    schalen: [
      { name: 'Junior', multiplierBp: 10000, steps: 15 },
      { name: 'Medior', multiplierBp: 11500, steps: 20 },
      { name: 'Senior', multiplierBp: 12500, steps: 30 },
    ],
    ...overschrijf,
  }
}

const weigert = (i: HuisInvoer, patroon: RegExp) =>
  assert.throws(() => controleerHuis(i), (e: unknown) => e instanceof SalarishuisError && patroon.test(e.message))

test('het huis uit de sheet komt door de controle', () => {
  controleerHuis(huis2026())
})

test('vakantiegeld onder 8% wordt geweigerd', () => weigert(huis2026({ holidayAllowanceBp: 700 }), /minimaal 8%/))

test('minder vakantie-uren dan vier keer de werkweek wordt geweigerd', () => weigert(huis2026({ holidayHoursFulltime: 150 }), /160 uur/))

test('een onderste trede onder het minimumloon wordt geweigerd', () =>
  weigert(huis2026({ baseCents: 230_000 }), /onder het minimumloon/))

test('twee schalen met dezelfde naam worden geweigerd', () =>
  weigert(huis2026({ schalen: [{ name: 'Junior', multiplierBp: 10000, steps: 15 }, { name: 'junior', multiplierBp: 11500, steps: 20 }] }), /twee keer/))

test('een nieuwe versie geldt vanaf haar eigen datum, en de oude daarvoor', async () => {
  const geindexeerd = huis2026({ baseCents: 265_534, note: 'Indexatie +3%' })
  const nieuw = await maakHuis(geindexeerd, null)
  gemaakt.push(nieuw.id)

  const ervoor = await getHuis(new Date(Date.UTC(2098, 11, 31)))
  const erna = await getHuis(new Date(Date.UTC(2099, 0, 2)))
  assert.notEqual(ervoor!.huis.id, nieuw.id)
  assert.equal(erna!.huis.id, nieuw.id)
  assert.equal(berekenBeloning(erna!, 'Junior', 1, 4000).fulltimeCents, 265_534)

  // Op dezelfde datum kan er geen tweede bij.
  await assert.rejects(maakHuis(geindexeerd, null), (e: unknown) => e instanceof SalarishuisError && /ingangsdatum/.test(e.message))
})

test('corrigeren kan zolang er geen contract op staat, daarna niet meer', async () => {
  const h = await maakHuis(huis2026({ effectiveFrom: new Date(Date.UTC(2101, 0, 1)) }), null)
  gemaakt.push(h.id)

  await corrigeerHuis(h.id, huis2026({ effectiveFrom: new Date(Date.UTC(2101, 0, 1)), stepIncreaseBp: 175 }))
  const [bij] = await db.select().from(salaryHouses).where(eq(salaryHouses.id, h.id))
  assert.equal(bij!.stepIncreaseBp, 175)
  const schalen = await db.select().from(salaryScales).where(eq(salaryScales.houseId, h.id))
  assert.equal(schalen.length, 3)

  const [k] = await db.insert(candidates).values({ name: 'Huis Testkandidaat' }).returning()
  kandidaten.push(k!.id)
  await db.insert(generatedContracts).values({
    candidateId: k!.id,
    employeeName: 'Huis Testkandidaat',
    jobTitle: 'Test',
    contractType: 'onbepaalde_tijd',
    startedOn: new Date(Date.UTC(2101, 2, 1)),
    hoursWeekQuarters: 4000,
    salaryScaleName: 'Junior',
    salaryStep: 1,
    grossMonthlyCents: 257_800,
    body: 'test',
  })
  assert.equal(await contractenOpHuis(h.id), 1)

  await assert.rejects(corrigeerHuis(h.id, huis2026({ effectiveFrom: new Date(Date.UTC(2101, 0, 1)) })), /nieuwe versie/)
  await assert.rejects(wisHuis(h.id), /historie/)
})

test('een huis zonder contracten kan weg', async () => {
  const h = await maakHuis(huis2026({ effectiveFrom: new Date(Date.UTC(2103, 0, 1)) }), null)
  await wisHuis(h.id)
  const [weg] = await db.select().from(salaryHouses).where(eq(salaryHouses.id, h.id))
  assert.equal(weg, undefined)
})
