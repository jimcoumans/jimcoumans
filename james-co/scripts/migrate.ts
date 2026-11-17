/**
 * Voert db/migrations/*.sql uit als eigenaar (DATABASE_ADMIN_URL) en zorgt dat
 * de inlogrol uit DATABASE_URL lid is van jc_app.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

export async function migrate(adminUrl: string, appUrl?: string, log = true): Promise<void> {
  const sql = postgres(adminUrl, { max: 1, onnotice: () => {} })
  try {
    await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`
    const dir = join(process.cwd(), 'db/migrations')
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
    const done = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name))
    for (const f of files) {
      if (done.has(f)) continue
      const body = readFileSync(join(dir, f), 'utf8')
      await sql.begin(async (tx) => {
        await tx.unsafe(body)
        await tx`insert into schema_migrations (name) values (${f})`
      })
      if (log) console.log(`migratie uitgevoerd: ${f}`)
    }
    if (appUrl) {
      const u = new URL(appUrl)
      const admin = new URL(adminUrl)
      const user = decodeURIComponent(u.username)
      if (user && user !== decodeURIComponent(admin.username)) {
        const exists = await sql`select 1 from pg_roles where rolname = ${user}`
        if (exists.length === 0) {
          await sql.unsafe(`create role "${user.replace(/"/g, '')}" login nobypassrls password '${decodeURIComponent(u.password).replace(/'/g, "''")}'`)
          if (log) console.log(`inlogrol aangemaakt: ${user}`)
        }
        await sql.unsafe(`grant jc_app to "${user.replace(/"/g, '')}"`)
      }
    }
  } finally {
    await sql.end()
  }
}

const isMain = process.argv[1]?.endsWith('migrate.ts')
if (isMain) {
  const adminUrl = process.env.DATABASE_ADMIN_URL
  if (!adminUrl) {
    console.error('DATABASE_ADMIN_URL ontbreekt (eigenaar van het schema, alleen voor migraties).')
    process.exit(1)
  }
  migrate(adminUrl, process.env.DATABASE_URL).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
