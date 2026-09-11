/**
 * Bewaakt dat elke regel die de database afdwingt ook een uitleg heeft die
 * een mens begrijpt.
 *
 * Zonder deze test gebeurt telkens hetzelfde: er komt een constraint bij, en
 * wie hem raakt krijgt "Er ging iets mis" in plaats van te horen wát er mis
 * is. De test leest de constraints uit de draaiende database, zodat hij
 * vanzelf meegroeit met het schema.
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { sql } from 'drizzle-orm'
import { db, client } from '../../db'
import { describeDbError, PG_CHECK_VIOLATION, PG_UNIQUE_VIOLATION } from '../db-errors'

after(async () => { await client.end() })

/**
 * Constraints waar geen eigen melding voor nodig is.
 *
 * Foreign keys vallen onder de algemene melding over gekoppelde gegevens, en
 * primary keys raakt een gebruiker nooit: die waarden komen van de database
 * zelf.
 */
const GEEN_EIGEN_MELDING = (naam: string) =>
  naam.endsWith('_fk') || naam.endsWith('_pkey') || naam.startsWith('drizzle')

/** Bootst na hoe een fout van de driver eruitziet. */
function nepFout(constraint: string, code: string) {
  return new Error('Failed query', {
    cause: { code, constraint_name: constraint, severity: 'ERROR' },
  })
}

test('elke check-constraint heeft een leesbare foutmelding', async () => {
  const rows = await db.execute<{ conname: string }>(sql`
    SELECT conname FROM pg_constraint
    WHERE contype = 'c' AND connamespace = 'public'::regnamespace
    ORDER BY conname
  `)

  const zonder = rows
    .map((r) => r.conname)
    .filter((naam) => !GEEN_EIGEN_MELDING(naam))
    .filter((naam) => describeDbError(nepFout(naam, PG_CHECK_VIOLATION)) === null)

  assert.deepEqual(
    zonder,
    [],
    `Deze regels hebben geen uitleg in describeDbError: ${zonder.join(', ')}.\n` +
      'Voeg per constraint een zin toe die vertelt wat er mis is en wat de gebruiker moet doen.',
  )
})

test('elke unieke index heeft een leesbare foutmelding', async () => {
  const rows = await db.execute<{ indexname: string }>(sql`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexdef LIKE 'CREATE UNIQUE%'
    ORDER BY indexname
  `)

  const zonder = rows
    .map((r) => r.indexname)
    .filter((naam) => !GEEN_EIGEN_MELDING(naam))
    .filter((naam) => describeDbError(nepFout(naam, PG_UNIQUE_VIOLATION)) === null)

  assert.deepEqual(
    zonder,
    [],
    `Deze unieke regels hebben geen uitleg in describeDbError: ${zonder.join(', ')}.`,
  )
})

test('een onbekende fout wordt niet verbloemd', () => {
  // Geeft describeDbError null, dan gooit de aanroeper de fout door in
  // plaats van er een geruststellende tekst van te maken.
  assert.equal(describeDbError(nepFout('iets_onbekends', PG_CHECK_VIOLATION)), null)
  assert.equal(describeDbError(new Error('gewone fout')), null)
})

test('een schending van een foreign key krijgt de algemene uitleg', () => {
  const melding = describeDbError(nepFout('wat_dan_ook_fk', '23503'))
  assert.ok(melding?.includes('gekoppelde gegevens'))
})
