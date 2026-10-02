import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { connectionOptionsFor, readConnectionString } from './connection-options'

// Nakijken voordat postgres-js het doet: die gooit bij een kapotte string een
// kale "Invalid URL" met de waarde gemaskeerd, en dan weet je nog niets.
const connectionString = readConnectionString(process.env.DATABASE_URL)

/**
 * In development wordt deze module bij elke hot reload opnieuw geladen.
 * Zonder deze cache loopt de verbindingspool vol.
 */
const globalForDb = globalThis as unknown as {
  jrWalletClient?: ReturnType<typeof postgres>
  jrWalletQueries?: number
}

/* -------------------------------------------------------------------------
   Waarschuwing aan mijn toekomstige zelf.

   Dit bestand raakt ELKE pagina tegelijk. Er is hier vier keer iets
   gewijzigd om een storing te repareren die niet hier zat maar in de
   pagina's: het partneroverzicht deed twee queries per partner, wat bij
   drieenveertig partners zesentachtig netwerkrondes opleverde en de functie
   over zijn tijdslimiet duwde. Elke wijziging hier heeft de site opnieuw
   platgelegd zonder het echte probleem te raken.

   De instellingen hieronder zijn de instellingen waarmee het werkte. Wijzig
   ze niet op een vermoeden. Is een pagina traag, tel dan eerst hoeveel
   queries hij doet met npm run tel:queries — daar zit het bijna altijd.
   ------------------------------------------------------------------------- */

/** Voor npm run tel:queries. Werkt alleen lokaal; zie de debug-optie. */
export function nulQueryTeller(): void {
  globalForDb.jrWalletQueries = 0
}

export function queryTeller(): number {
  return globalForDb.jrWalletQueries ?? 0
}

const opties = connectionOptionsFor(connectionString, {
  DATABASE_PREPARE: process.env.DATABASE_PREPARE,
})

const client =
  globalForDb.jrWalletClient ??
  postgres(connectionString, {
    max: 10,
    // Serverless: verbindingen niet eeuwig openhouden.
    idle_timeout: 20,
    connect_timeout: 10,
    // Zie connection-options.ts: een pooler in transactiemodus (Supabase)
    // kan geen prepared statements aan.
    prepare: opties.prepare,
    /* De querieteller staat ALLEEN lokaal aan.

       Een debug-functie meegeven zet in postgres-js de debugmodus aan, en dat
       hoort niet in productie. In productie is dit object hierdoor identiek
       aan de versie waarmee de site goed werkte. */
    ...(process.env.NODE_ENV === 'production'
      ? {}
      : {
          debug: () => {
            globalForDb.jrWalletQueries = (globalForDb.jrWalletQueries ?? 0) + 1
          },
        }),
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.jrWalletClient = client
}

export const db = drizzle(client, { schema })
export { client }
export * from './schema'
