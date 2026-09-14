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

const kop = `-- ============================================================================
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

for (const entry of journal.entries) {
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
    'INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES\n' +
    // Let op de volgorde: de komma hoort VOOR het commentaar. Staat hij
    // erachter, dan valt hij binnen het commentaar en is het statement stuk.
    gedraaid
      .map((m, i) => {
        const scheiding = i === gedraaid.length - 1 ? ';' : ','
        return `  ('${m.hash}', ${m.when})${scheiding}  -- ${m.tag}`
      })
      .join('\n') +
    '\n',
)

const doel = 'drizzle/supabase-setup.sql'
writeFileSync(doel, delen.join(''))
console.log(`${doel} geschreven: ${journal.entries.length} migraties.`)
