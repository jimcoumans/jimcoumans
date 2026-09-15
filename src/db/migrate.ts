/**
 * Voert de migraties in ./drizzle uit.
 *
 * Draait lokaal na elke db:generate, en op Netlify als eerste stap van de
 * bouw. Dat laatste is met opzet: als de migraties niet lukken, wordt er niet
 * gebouwd en gaat er niets live. Dan blijft de vorige versie draaien, met de
 * database die daarbij hoort — een werkende oude site is altijd beter dan een
 * nieuwe die kolommen zoekt die er niet zijn.
 *
 * Voor die tijd ging de code live en bleef de database achter, en dan valt
 * het halve systeem om tot iemand met de hand SQL draait. Dat is vier keer
 * gebeurd.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { readConnectionString, connectionOptionsFor } from './connection-options'

async function main() {
  /*
   * MIGRATE_DATABASE_URL heeft voorrang als hij bestaat. Sommige databases
   * willen DDL liever over een directe verbinding dan via een pooler. Staat
   * hij er niet, dan gebruiken we gewoon DATABASE_URL — dat werkt bij
   * Supabase prima, en een extra variabele die niemand nodig heeft is een
   * extra ding dat verkeerd ingevuld kan worden.
   */
  const ruw = process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL
  const url = readConnectionString(ruw)
  const opties = connectionOptionsFor(url, { DATABASE_PREPARE: process.env.DATABASE_PREPARE })

  const client = postgres(url, { max: 1, prepare: opties.prepare })
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' })
    console.log('Migraties uitgevoerd.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('\nMigratie mislukt. Er wordt niets gebouwd en niets live gezet:')
  console.error(err)
  console.error(
    '\nDe vorige versie blijft draaien. Los dit op en start de deploy opnieuw.',
  )
  process.exit(1)
})
