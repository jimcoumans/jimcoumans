import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { connectionOptionsFor } from './connection-options'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL ontbreekt. Zie .env.example.')
}

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
