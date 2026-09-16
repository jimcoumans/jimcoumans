import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { connectionOptionsFor, readConnectionString } from './connection-options'

// Nakijken voordat postgres-js het doet: die gooit bij een kapotte string een
// kale "Invalid URL" met de waarde gemaskeerd, en dan weet je nog niets.
const connectionString = readConnectionString(process.env.DATABASE_URL)

/**
 * Eén verbindingspool per proces, ook in productie.
 *
 * In development wordt deze module bij elke hot reload opnieuw geladen; zonder
 * cache loopt de pool dan vol. In productie speelt hetzelfde, maar erger. Elke
 * serverless functie die opstart laadt deze module opnieuw, en er draaien er
 * bij drukte tientallen tegelijk. Zonder cache opent elk van die instanties
 * zijn eigen verbindingen, en die tellen allemaal mee bij de database.
 */
const globalForDb = globalThis as unknown as {
  jrWalletClient?: ReturnType<typeof postgres>
}

const opties = connectionOptionsFor(connectionString, {
  DATABASE_PREPARE: process.env.DATABASE_PREPARE,
})

/**
 * Hoeveel verbindingen deze instantie tegelijk open mag hebben.
 *
 * Bewust laag. De rekensom die hier telt is niet "hoeveel heeft één pagina
 * nodig" maar "hoeveel instanties draaien er tegelijk, maal dit getal". Een
 * dashboard dat zestien queries naast elkaar afvuurt voelt met tien
 * verbindingen sneller aan, maar bij twintig gelijktijdige functies zijn dat
 * tweehonderd verbindingen — en dan is de limiet van de pooler allang
 * bereikt. Wat er daarna gebeurt is geen nette foutmelding: de verbinding
 * blijft wachten tot er eentje vrijkomt, de functie loopt in zijn tijdslimiet
 * en de bezoeker krijgt een 502.
 *
 * Met drie verbindingen wachten die zestien queries kort op elkaar. Dat kost
 * milliseconden. Een 502 kost de hele pagina.
 */
const MAX_VERBINDINGEN = 3

const client =
  globalForDb.jrWalletClient ??
  postgres(connectionString, {
    max: MAX_VERBINDINGEN,
    // Serverless: verbindingen niet eeuwig openhouden.
    idle_timeout: 20,
    connect_timeout: 10,
    // Een verbinding die uren blijft hangen achter een pooler is een
    // verbinding die niemand meer opruimt. Na een uur opnieuw opbouwen.
    max_lifetime: 60 * 60,
    // Zie connection-options.ts: een pooler in transactiemodus (Supabase)
    // kan geen prepared statements aan.
    prepare: opties.prepare,
  })

globalForDb.jrWalletClient = client

export const db = drizzle(client, { schema })
export { client }
export * from './schema'
