/**
 * Het gebundelde SQL-bestand moet je twee keer kunnen draaien.
 *
 * Deze test bestaat omdat het mis is gegaan. Het bijwerkbestand ging ervan
 * uit dat je precies wist waar je database stond; wie het mis had kreeg
 * halverwege `type "activity_kind" already exists` te zien, met de ene helft
 * toegepast en de andere niet. Dat is de slechtst denkbare uitkomst: geen
 * duidelijke fout, geen werkende database.
 *
 * Er wordt hier op een aparte database gewerkt, niet op de database van de
 * andere tests. Deze test maakt tabellen aan en gooit ze weg.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import postgres from 'postgres'
import { readConnectionString } from '../connection-options'

const naam = `jr_bundel_${Date.now()}`
let beheer: postgres.Sql
let proef: postgres.Sql | null = null

/** De URL van de andere tests, maar dan naar een andere database. */
function urlVoor(database: string): string {
  const url = new URL(readConnectionString(process.env.DATABASE_URL))
  url.pathname = `/${database}`
  return url.toString()
}

before(async () => {
  const basis = new URL(readConnectionString(process.env.DATABASE_URL))
  basis.pathname = '/postgres'
  beheer = postgres(basis.toString(), { max: 1 })

  // Een database aanmaken mag niet overal. Kan het niet, dan slaan de tests
  // hieronder zichzelf over in plaats van rood te worden om iets wat niet
  // over de code gaat.
  try {
    await beheer.unsafe(`CREATE DATABASE "${naam}"`)
    proef = postgres(urlVoor(naam), { max: 1 })
  } catch {
    proef = null
  }
})

after(async () => {
  if (proef) {
    await proef.end()
    await beheer.unsafe(`DROP DATABASE IF EXISTS "${naam}"`)
  }
  await beheer.end()
})

/** Draait een bestand en geeft terug wat er is toegepast en overgeslagen. */
async function draai(pad: string) {
  const sql = await import('node:fs/promises').then((fs) => fs.readFile(pad, 'utf8'))
  const toegepast: string[] = []
  const overgeslagen: string[] = []

  const verbinding = postgres(urlVoor(naam), {
    max: 1,
    onnotice: (n) => {
      const m = /^(Toegepast|Overgeslagen): (\S+?)[.\s]/.exec(n.message ?? '')
      if (!m) return
      ;(m[1] === 'Toegepast' ? toegepast : overgeslagen).push(m[2]!)
    },
  })

  try {
    await verbinding.unsafe(sql)
  } finally {
    await verbinding.end()
  }

  return { toegepast, overgeslagen }
}

test('het bundelscript draait zonder fouten', () => {
  execFileSync('node', ['scripts/bundel-migraties.mjs'], { stdio: 'pipe' })
  execFileSync('node', ['scripts/bundel-migraties.mjs', '--vanaf=0007_rls'], { stdio: 'pipe' })
})

test('een verse database krijgt alles, een tweede keer draaien verandert niets', async (t) => {
  if (!proef) return t.skip('geen rechten om een testdatabase te maken')

  const eerste = await draai('drizzle/supabase-setup.sql')
  assert.ok(eerste.toegepast.length > 0, 'op een lege database wordt er wat toegepast')
  assert.equal(eerste.overgeslagen.length, 0, 'er valt nog niets over te slaan')

  const tweede = await draai('drizzle/supabase-setup.sql')
  assert.equal(tweede.toegepast.length, 0, 'de tweede keer wordt er niets meer toegepast')
  assert.deepEqual(
    tweede.overgeslagen,
    eerste.toegepast,
    'precies wat de eerste keer is toegepast wordt de tweede keer overgeslagen',
  )
})

test('het bijwerkbestand herkent wat er al staat', async (t) => {
  if (!proef) return t.skip('geen rechten om een testdatabase te maken')

  // De database staat na de vorige test al helemaal bij. Het bijwerkbestand
  // hoort dan niets meer te doen, ook al bevat het oudere migraties.
  const { toegepast, overgeslagen } = await draai('drizzle/supabase-update.sql')

  assert.equal(toegepast.length, 0, 'niets opnieuw toepassen')
  assert.ok(overgeslagen.includes('0007_rls'), 'de oudere migraties worden herkend')
})

test('de boekhouding heeft geen dubbele regels', async (t) => {
  if (!proef) return t.skip('geen rechten om een testdatabase te maken')

  const dubbel = await proef`
    SELECT hash, COUNT(*) AS aantal
    FROM drizzle.__drizzle_migrations
    GROUP BY hash
    HAVING COUNT(*) > 1
  `
  assert.equal(dubbel.length, 0, 'elke migratie staat er precies één keer in')
})
