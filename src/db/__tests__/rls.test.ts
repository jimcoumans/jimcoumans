/**
 * Deze test bewaakt een deur die je niet ziet.
 *
 * Supabase zet standaard een REST-API voor je tabellen open die bereikbaar
 * is met de `anon`-key. Die key is in hun model publiek — hij hoort in
 * browsercode te kunnen staan. Zonder Row Level Security kan iedereen die
 * hem heeft het hele klantenbestand uitlezen.
 *
 * De app zelf merkt van RLS niets: die praat als eigenaar van de tabellen en
 * gaat er daarom langs. Precies daarom is dit iets wat je vergeet. Een nieuwe
 * tabel zonder RLS werkt namelijk gewoon — hij staat alleen open.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sql } from 'drizzle-orm'
import { db, client } from '../index'

test.after(async () => {
  await client.end()
})

test('elke tabel heeft Row Level Security aan staan', async () => {
  const rijen = await db.execute<{ tablename: string; rowsecurity: boolean }>(sql`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)

  const tabellen = [...rijen]
  assert.ok(tabellen.length >= 15, `slechts ${tabellen.length} tabellen gevonden; draaiden de migraties?`)

  const open = tabellen.filter((t) => !t.rowsecurity).map((t) => t.tablename)

  assert.deepEqual(
    open,
    [],
    'Deze tabellen staan open voor de anon-key van Supabase:\n' +
      open.map((t) => `  - ${t}`).join('\n') +
      '\n\nZet RLS aan in een migratie:\n' +
      open.map((t) => `  ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`).join('\n'),
  )
})

test('er staan geen policies die alsnog toegang geven', async () => {
  // Zonder policy mag een rol die niet de eigenaar is helemaal niets, en dat
  // is de bedoeling. Komt hier ooit een policy, dan hoort dat een bewuste
  // keuze te zijn en geen bijvangst van een tool die "even iets regelt".
  const rijen = await db.execute<{ tablename: string; policyname: string }>(sql`
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  `)

  const policies = [...rijen].map((p) => `${p.tablename}.${p.policyname}`)

  assert.deepEqual(
    policies,
    [],
    'Er zijn policies toegevoegd:\n' +
      policies.map((p) => `  - ${p}`).join('\n') +
      '\n\nDat opent de REST-API van Supabase voor de rollen die de policy noemt. ' +
      'Is dat de bedoeling, pas dan deze test aan zodat de keuze zichtbaar blijft.',
  )
})
