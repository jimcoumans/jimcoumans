/**
 * Gooit alle tabellen weg en bouwt ze opnieuw op met voorbeelddata.
 * Alleen voor lokaal ontwikkelen; weigert te draaien in productie.
 *
 * Gebruik: npm run db:reset
 */
import { execSync } from 'node:child_process'
import { sql } from 'drizzle-orm'
import { db, client } from './index'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:reset is niet bedoeld voor productie.')
  }

  const url = process.env.DATABASE_URL ?? ''
  // Een productiedatabase van Neon of Supabase per ongeluk leeggooien is
  // het soort fout dat je maar een keer maakt.
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    throw new Error(
      `db:reset werkt alleen op een lokale database. DATABASE_URL wijst nu naar iets anders.`,
    )
  }

  console.log('Alle tabellen weggooien...')
  await db.execute(sql`DROP SCHEMA public CASCADE`)
  await db.execute(sql`CREATE SCHEMA public`)
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`)
  await client.end()

  console.log('Migraties uitvoeren...')
  execSync('npm run --silent db:migrate', { stdio: 'inherit' })

  console.log('Voorbeelddata invullen...')
  execSync('npm run --silent db:seed', { stdio: 'inherit' })

  console.log('\nKlaar. Een inloglink maak je met: npm run login:link -- <e-mailadres>')
}

main().catch((err) => {
  console.error('Reset mislukt:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
