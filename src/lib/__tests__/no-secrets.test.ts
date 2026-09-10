/**
 * Deze test bewaakt een afspraak, geen functie: er staan geen wachtwoorden,
 * sleutels of tokens in deze database.
 *
 * De accountregistratie legt vast WELKE systemen een klant heeft en waar het
 * wachtwoord te vinden is, maar nooit het wachtwoord zelf. Zodra iemand hier
 * alsnog zo'n kolom aan toevoegt, faalt deze test en is het een bewuste
 * beslissing in plaats van een sluipende.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { db, client } from '../../db'

/** Woorden die op een bewaard geheim wijzen. */
const VERDACHT = [
  'password',
  'passwd',
  'wachtwoord',
  'secret',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'private_key',
  'credential',
]

/** Kolommen die wel mogen: die verwijzen naar een geheim, of bevatten er geen. */
const TOEGESTAAN = new Set([
  // Verwijzing naar het item in de wachtwoordmanager, geen inhoud.
  'accounts.vault_reference',
  // De hash van een eenmalige inloglink. Onomkeerbaar en kortlevend.
  'login_tokens.token_hash',
])

test('geen enkele kolom in de database ziet eruit als een bewaard geheim', async () => {
  const rows = await db.execute<{ table_name: string; column_name: string }>(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, column_name
  `)

  const verdacht: string[] = []
  for (const row of rows) {
    const volledig = `${row.table_name}.${row.column_name}`
    if (TOEGESTAAN.has(volledig)) continue
    const naam = row.column_name.toLowerCase()
    if (VERDACHT.some((woord) => naam.includes(woord))) verdacht.push(volledig)
  }

  assert.deepEqual(
    verdacht,
    [],
    `Deze kolommen lijken een geheim te bewaren: ${verdacht.join(', ')}.\n` +
      'Wachtwoorden van klantsystemen horen in een wachtwoordmanager, niet hier. ' +
      'Bewaar in accounts alleen een verwijzing (vault_reference).',
  )

  await client.end()
})

test('het schema bevat geen wachtwoordvelden in de broncode', () => {
  // Ook een veld dat nog niet gemigreerd is mag er niet in sluipen.
  const schema = readFileSync(join(process.cwd(), 'src/db/schema.ts'), 'utf8')

  // Commentaar eruit: daar staat juist uitgelegd waarom er geen wachtwoorden
  // zijn, en die uitleg moet blijven mogen.
  const code = schema.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  // Alleen kolomdefinities bekijken: text('naam'), integer('naam'), enzovoort.
  const kolommen = [...code.matchAll(/\b(?:text|integer|boolean|uuid|timestamp)\('([^']+)'/g)]
    .map((m) => m[1]!.toLowerCase())

  const verdacht = kolommen.filter(
    (naam) =>
      !TOEGESTAAN.has(`accounts.${naam}`) &&
      !TOEGESTAAN.has(`login_tokens.${naam}`) &&
      VERDACHT.some((woord) => naam.includes(woord)),
  )

  assert.deepEqual(
    verdacht,
    [],
    `Er staat een wachtwoord- of sleutelveld in het schema: ${verdacht.join(', ')}. ` +
      'Bewaar in accounts alleen een verwijzing naar de wachtwoordmanager.',
  )
})

test('de accountregistratie heeft de velden die het wel hoort te hebben', () => {
  // De keerzijde van de vorige test: zonder deze velden is het register
  // nutteloos en gaat iemand het wachtwoord alsnog in een notitieveld zetten.
  const schema = readFileSync(join(process.cwd(), 'src/db/schema.ts'), 'utf8')
  const accountsBlok = schema.slice(
    schema.indexOf("export const accounts = pgTable("),
    schema.indexOf("/* ------------------------------- Partners"),
  )

  for (const veld of ['vault_reference', 'has_mfa', 'login_hint', 'owner']) {
    assert.ok(
      accountsBlok.includes(veld),
      `accounts hoort een kolom ${veld} te hebben, zodat het register bruikbaar is`,
    )
  }
})
