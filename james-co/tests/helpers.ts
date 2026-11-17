import postgres from 'postgres'
import { migrate } from '../scripts/migrate'
import { withSystem, closeDb } from '../src/lib/db-core'
import { memberActor, staffActor, type Actor } from '../src/lib/actor'

export async function resetDb(): Promise<void> {
  const admin = process.env.DATABASE_ADMIN_URL!
  if (!/_test\b|_test$|jamesco_test/.test(admin)) throw new Error('Tests draaien alleen tegen een testdatabase (naam met _test).')
  const sql = postgres(admin, { max: 1, onnotice: () => {} })
  await sql.unsafe('drop schema public cascade; create schema public; grant usage on schema public to public;')
  await sql.end()
  await migrate(admin, process.env.DATABASE_URL, false)
}

export async function makeProfile(email: string, name: string): Promise<string> {
  const [p] = await withSystem((tx) => tx<{ id: string }[]>`
    insert into profiles (email, full_name, display_name, email_verified_at) values (${email}, ${name}, ${name.split(' ')[0]!}, now()) returning id`)
  return p!.id
}

export async function makeStaff(email: string, role: 'admin' | 'concierge'): Promise<Actor> {
  const id = await makeProfile(email, role === 'admin' ? 'Admin Test' : 'Concierge Test')
  await withSystem((tx) => tx`insert into staff_roles (user_id, role) values (${id}, ${role})`)
  return staffActor(id, role)
}

export async function makeActiveMember(email: string, name: string): Promise<Actor> {
  const id = await makeProfile(email, name)
  await withSystem((tx) => tx`insert into memberships (user_id, status, starts_on, activated_at, is_complimentary) values (${id}, 'active', current_date, now(), true)`)
  return memberActor(id)
}

export async function done(): Promise<void> {
  await closeDb()
}

export const uuid = () => crypto.randomUUID()

/** Alleen voor testopzet die bewust langs alle waarborgen moet (bijv. tijd terugzetten). */
export async function asOwner(fn: (sql: postgres.Sql) => Promise<void>): Promise<void> {
  const sql = postgres(process.env.DATABASE_ADMIN_URL!, { max: 1, onnotice: () => {} })
  try { await fn(sql) } finally { await sql.end() }
}
