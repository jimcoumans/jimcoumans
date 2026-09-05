/** Voert de migraties in ./drizzle uit. Draai dit na elke db:generate. */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL ontbreekt. Zie .env.example.')

  const client = postgres(url, { max: 1 })
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' })
    console.log('Migraties uitgevoerd.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Migratie mislukt:', err)
  process.exit(1)
})
