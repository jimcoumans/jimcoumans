/**
 * Databasetoegang met expliciete context.
 *
 * Elke query loopt binnen een transactie die eerst de rol en de context zet:
 *   withActor(actor, fn)  -> SET LOCAL ROLE jc_app + jc.user_id (+ staff_session)
 *   withSystem(fn)        -> SET LOCAL ROLE jc_system (BYPASSRLS)
 *
 * withSystem is uitsluitend voor smalle systeemhandelingen (inloggen,
 * aanmelden, uitnodiging claimen, publieke instellingen) en voor
 * toestandswissels die eerst onder withActor op eigendom zijn gecontroleerd.
 * Zie docs/ARCHITECTUUR.md.
 */
import postgres from 'postgres'
import type { Actor } from './actor'

export type Tx = postgres.TransactionSql<Record<string, unknown>>

const g = globalThis as unknown as { __jcSql?: postgres.Sql }

function makeClient(): postgres.Sql {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL ontbreekt. Zie .env.example.')
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
    // DATE blijft een 'YYYY-MM-DD'-string: geen tijdzoneverschuiving.
    types: {
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
    onnotice: () => {},
  })
}

export function sqlClient(): postgres.Sql {
  if (!g.__jcSql) g.__jcSql = makeClient()
  return g.__jcSql
}

export async function closeDb(): Promise<void> {
  if (g.__jcSql) {
    await g.__jcSql.end({ timeout: 5 })
    g.__jcSql = undefined
  }
}

export async function withActor<T>(actor: Actor, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const sql = sqlClient()
  return (await sql.begin(async (tx) => {
    await tx`select set_config('role', 'jc_app', true)`
    await tx`select set_config('jc.user_id', ${actor.userId ?? ''}, true),
                    set_config('jc.staff_session', ${actor.staffVerified ? 'on' : 'off'}, true)`
    return fn(tx as unknown as Tx)
  })) as T
}

export async function withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const sql = sqlClient()
  return (await sql.begin(async (tx) => {
    await tx`select set_config('role', 'jc_system', true)`
    await tx`select set_config('jc.user_id', '', true), set_config('jc.staff_session', 'off', true)`
    return fn(tx as unknown as Tx)
  })) as T
}

/** Postgres-fout uit een guard-trigger (raise ... errcode P0001) herkennen. */
export function dbErrorCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    const e = err as { code?: string; message?: string; constraint_name?: string }
    if (e.code === 'P0001' && e.message) return e.message.split(':')[0] ?? e.message
    if (e.code === '23505') return `unique_violation:${e.constraint_name ?? ''}`
    if (e.code === '23514') return `check_violation:${e.constraint_name ?? ''}`
    if (e.code === '42501') return 'permission_denied'
    return e.code ?? null
  }
  return null
}
