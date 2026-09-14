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
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.jrWalletClient = client
}

export const db = drizzle(client, { schema })
export { client }
export * from './schema'
