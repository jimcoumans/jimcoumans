/**
 * Maakt van alle migraties één SQL-bestand dat je in de SQL-editor van
 * Supabase (of van elke andere Postgres) kunt plakken.
 *
 * Waarom: het opzetten of bijwerken van een database vraagt anders om een
 * terminal, Node en een checkout van de repo. Dat is een drempel op precies
 * het moment dat je alleen maar wilt beginnen.
 *
 * Het bestand is met opzet HERHAALBAAR. Elke migratie zit in een blok dat
 * eerst kijkt of hij al gedraaid is, en zo ja zichzelf overslaat. Dat moest,
 * want zonder die controle moet je precies weten waar je database staat
 * voordat je op Run drukt — en als je het mis hebt breekt het bestand af met
 * een melding als `type "activity_kind" already exists`, halverwege, met de
 * ene helft toegepast en de andere niet.
 *
 * Dat "al gedraaid" komt uit dezelfde boekhoudtabel die Drizzle gebruikt.
 * Zo weten `npm run db:migrate` en dit bestand hetzelfde, en draait een
 * migratie nooit twee keer.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8'))

/*
 * Met --vanaf=<tag> schrijft dit script een bijwerkbestand in plaats van het
 * complete: alleen de migraties vanaf die tag. Dat scheelt plakwerk als de
 * database al draait. Te ver terug beginnen kan geen kwaad meer — wat er al
 * staat wordt overgeslagen.
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
--  De wijzigingen vanaf ${vanaf}. Plak dit in de SQL-editor van Supabase en
--  druk op Run.
--
--  Je mag dit bestand zo vaak draaien als je wilt. Elke migratie kijkt eerst
--  of hij al gedraaid is en slaat zichzelf dan over. Je hoeft dus niet te
--  weten waar je database precies staat.
-- ============================================================================

`
  : `-- ============================================================================
--  James Robinson Wallet — alle tabellen in één keer
--
--  Plak dit in de SQL-editor van Supabase en druk op Run. Daarna staan alle
--  tabellen, indexen en controleregels klaar.
--
--  Je mag dit bestand zo vaak draaien als je wilt: wat er al staat wordt
--  overgeslagen.
--
--  Dit bestand wordt gemaakt door \`npm run db:bundel\` uit de migraties in
--  ./drizzle. Bewerk het niet met de hand: de volgende keer wordt het
--  overschreven en is je wijziging weg terwijl de database hem nog wel heeft.
--  Een nieuwe migratie erbij? Draai het script opnieuw.
-- ============================================================================

`

const delen = [kop]

/*
 * De boekhouding moet er staan voordat de eerste migratie ernaar kijkt.
 * Dit is precies de tabel die Drizzle zelf aanmaakt.
 */
delen.push(
  '-- ---------------------------------------------------------------------------\n' +
    '-- Boekhouding: welke migraties zijn er gedraaid\n' +
    '-- ---------------------------------------------------------------------------\n\n' +
    'CREATE SCHEMA IF NOT EXISTS "drizzle";\n\n' +
    'CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (\n' +
    '  id SERIAL PRIMARY KEY,\n' +
    '  hash text NOT NULL,\n' +
    '  created_at bigint\n' +
    ');\n\n',
)

for (const entry of entries) {
  const inhoud = readFileSync(`drizzle/${entry.tag}.sql`, 'utf8')

  // De hash moet over het ONGEWIJZIGDE bestand gaan, precies zoals Drizzle
  // hem berekent. Anders klopt de boekhouding niet en draait een migratie
  // later alsnog een tweede keer.
  const hash = createHash('sha256').update(inhoud).digest('hex')

  // De breekpunten zijn er voor de migratietool; in een SQL-editor mogen de
  // statements gewoon achter elkaar.
  const sql = inhoud.split('--> statement-breakpoint').join('\n').trim()

  /*
   * Een eigen dollarteken-label per migratie. Migratie 0007 gebruikt zelf al
   * `$$` voor een blok; met hetzelfde label eromheen zou Postgres het eerste
   * binnenste `$$` aanzien voor het einde van het buitenste blok.
   */
  const label = `$jr_${entry.tag}$`

  // De migratie en zijn boekhoudregel staan bewust IN hetzelfde blok. Een
  // migratie die slaagt maar niet wordt opgeschreven, draait de volgende keer
  // opnieuw; een regel die wordt opgeschreven zonder dat de migratie slaagde,
  // is nog erger.
  delen.push(
    '-- ---------------------------------------------------------------------------\n' +
      `-- ${entry.tag}\n` +
      '-- ---------------------------------------------------------------------------\n\n' +
      `DO ${label}\n` +
      'BEGIN\n' +
      `  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '${hash}') THEN\n` +
      `    RAISE NOTICE 'Overgeslagen: ${entry.tag} stond er al.';\n` +
      '  ELSE\n' +
      indenteer(sql) +
      '\n\n' +
      '    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")\n' +
      `    VALUES ('${hash}', ${entry.when});\n` +
      `    RAISE NOTICE 'Toegepast: ${entry.tag}.';\n` +
      '  END IF;\n' +
      `END ${label};\n\n`,
  )
}

/** Vier spaties inspringen zodat het blok leesbaar blijft. */
function indenteer(sql) {
  return sql
    .split('\n')
    .map((regel) => (regel.trim() === '' ? '' : `    ${regel}`))
    .join('\n')
}

const doel = vanaf ? 'drizzle/supabase-update.sql' : 'drizzle/supabase-setup.sql'
writeFileSync(doel, delen.join(''))
console.log(`${doel} geschreven: ${entries.length} migraties.`)
