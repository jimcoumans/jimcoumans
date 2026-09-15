/**
 * Maakt van alle migraties één SQL-bestand dat je in de SQL-editor van
 * Supabase (of van elke andere Postgres) kunt plakken.
 *
 * Waarom: het opzetten van een verse database vraagt anders om een terminal,
 * Node en een checkout van de repo. Dat is een drempel op precies het moment
 * dat je alleen maar wilt beginnen.
 *
 * Het bestand bevat onderaan ook de regels die Drizzle bijhoudt over welke
 * migraties al gedraaid zijn. Zonder die regels zou een latere
 * `npm run db:migrate` alles opnieuw willen uitvoeren en stuklopen op
 * tabellen die er al zijn.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'))

/*
 * Met --vanaf=<tag> schrijft dit script een bijwerkbestand in plaats van het
 * complete: alleen de migraties vanaf die tag. Dat heb je nodig als de
 * database al draait en er alleen iets bij moet.
 */
const vanafArg = process.argv.find((a) => a.startsWith('--vanaf='))
const vanaf = vanafArg ? vanafArg.slice('--vanaf='.length) : null

let entries = journal.entries
if (vanaf) {
  const index = entries.findIndex((e) => e.tag === vanaf)
  if (index === -1) {
    console.error(`Onbekende migratie: ${vanaf}. Bekend zijn:`)
    for (const e of entries) console.error(`  ${e.tag}`)
    process.exit(1)
  }
  entries = entries.slice(index)
}

const kop = vanaf
  ? `-- ============================================================================
--  James Robinson Wallet — database bijwerken
--
--  Alleen de wijzigingen vanaf ${vanaf}. Plak dit in de SQL-editor van
--  Supabase en druk op Run. Draai het ÉÉN keer: tabellen aanmaken die er al
--  zijn geeft een foutmelding.
--
--  De regels onderaan die bijhouden welke migraties gedraaid zijn, worden
--  alleen toegevoegd als ze er nog niet staan. Die kun je dus wel vaker
--  uitvoeren zonder dubbele regels te krijgen.
-- ============================================================================

`
  : `-- ============================================================================
--  James Robinson Wallet — alle tabellen in één keer
--
--  Plak dit in de SQL-editor van Supabase en druk op Run. Daarna staan alle
--  tabellen, indexen en controleregels klaar.
--
--  Dit bestand wordt gemaakt door \`npm run db:bundel\` uit de migraties in
--  ./drizzle. Bewerk het niet met de hand: de volgende keer wordt het
--  overschreven en is je wijziging weg terwijl de database hem nog wel heeft.
--  Een nieuwe migratie erbij? Draai het script opnieuw.
-- ============================================================================

`

const delen = [kop]
const gedraaid = []

for (const entry of entries) {
  const inhoud = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8')

  // De hash moet over het ONGEWIJZIGDE bestand gaan, precies zoals Drizzle
  // hem berekent. Anders klopt de boekhouding niet en draait een migratie
  // later alsnog een tweede keer.
  gedraaid.push({
    hash: createHash('sha256').update(inhoud).digest('hex'),
    when: entry.when,
    tag: entry.tag,
  })

  delen.push(
    '-- ---------------------------------------------------------------------------\n' +
      `-- ${entry.tag}\n` +
      '-- ---------------------------------------------------------------------------\n\n' +
      // De breekpunten zijn er voor de migratietool; in een SQL-editor mogen
      // de statements gewoon achter elkaar.
      inhoud.split('--> statement-breakpoint').join('\n') +
      '\n\n',
  )
}

delen.push(
  '-- ---------------------------------------------------------------------------\n' +
    '-- Welke migraties hiermee gedraaid zijn\n' +
    '-- ---------------------------------------------------------------------------\n\n' +
    'CREATE SCHEMA IF NOT EXISTS "drizzle";\n\n' +
    'CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (\n' +
    '  id SERIAL PRIMARY KEY,\n' +
    '  hash text NOT NULL,\n' +
    '  created_at bigint\n' +
    ');\n\n' +
    // Alleen invoegen wat er nog niet staat, zodat dit bestand geen dubbele
    // regels maakt als je het per ongeluk twee keer draait.
    gedraaid
      .map(
        (m) =>
          `-- ${m.tag}\n` +
          'INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")\n' +
          `SELECT '${m.hash}', ${m.when}\n` +
          'WHERE NOT EXISTS (\n' +
          `  SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '${m.hash}'\n` +
          ');\n',
      )
      .join('\n'),
)

const doel = vanaf ? 'drizzle/supabase-update.sql' : 'drizzle/supabase-setup.sql'
writeFileSync(doel, delen.join(''))
console.log(`${doel} geschreven: ${entries.length} migraties.`)
