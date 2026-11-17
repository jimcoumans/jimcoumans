/**
 * Demo-gegevens. Draait ALLEEN met APP_ENV=demo (of development) en NOOIT in
 * productie. Alles is herkenbaar fictief: namen met "(fictief)", e-mail op
 * example.com, leveranciers en events met is_demo = true.
 */
import postgres from 'postgres'

const env = process.env.APP_ENV
if (env !== 'demo' && env !== 'development') {
  console.error(`Demo-seed geweigerd: APP_ENV=${env ?? '(leeg)'}. Alleen toegestaan bij APP_ENV=demo of development.`)
  process.exit(1)
}
const url = process.env.DATABASE_ADMIN_URL
if (!url) { console.error('DATABASE_ADMIN_URL ontbreekt.'); process.exit(1) }
const sql = postgres(url, { max: 1, onnotice: () => {} })

async function profile(email: string, name: string) {
  const [p] = await sql<{ id: string }[]>`
    insert into profiles (email, full_name, display_name, email_verified_at, region) values (${email}, ${name}, ${name.split(' ')[0]!}, now(), 'Zuid-Limburg')
    on conflict (email) do update set full_name = excluded.full_name returning id`
  return p!.id
}

async function main(): Promise<void> {
try {
  const admin = await profile('admin@example.com', 'Demo Admin (fictief)')
  const concierge = await profile('concierge@example.com', 'Demo Concierge (fictief)')
  await sql`insert into staff_roles (user_id, role) values (${admin}, 'admin'), (${concierge}, 'concierge') on conflict (user_id) do nothing`

  const members: string[] = []
  for (const [email, name] of [['anna@example.com', 'Anna de Voorbeeld (fictief)'], ['bas@example.com', 'Bas Proefpersoon (fictief)']] as const) {
    const id = await profile(email, name)
    members.push(id)
    const [m] = await sql`select 1 from memberships where user_id = ${id}`
    if (!m) await sql`insert into memberships (user_id, status, starts_on, activated_at, activated_by, is_complimentary, accepted_terms_version)
                      values (${id}, 'active', current_date, now(), ${admin}, true, 'concept-2026-11')`
  }

  const [existing] = await sql`select 1 from suppliers where is_demo limit 1`
  if (!existing) {
    await sql`insert into suppliers (name, category, region, contact_name, phone, reachability, booking_method, verification_status, is_demo) values
      ('Restaurant De Proefkeuken (fictief)', 'dining', 'Maastricht', 'Demo Contact', '+31 00 000 0000', 'Di–za vanaf 11:00', 'Telefonisch', 'unverified', true),
      ('Hotel Voorbeeldhof (fictief)', 'stays', 'Heuvelland', 'Demo Receptie', '+31 00 000 0001', '24/7 receptie', 'E-mail', 'unverified', true),
      ('Chauffeursdienst Testrit (fictief)', 'transport', 'Euregio', 'Demo Planner', '+31 00 000 0002', 'Werkdagen 8–20', 'Telefonisch', 'unverified', true)`
  }

  const [req] = await sql`select 1 from requests where member_id = ${members[0]!} limit 1`
  if (!req) {
    await sql`insert into requests (member_id, category, brief, desired_date, party_size, budget_minor, budget_basis, idempotency_key, created_by, next_action, next_action_due_at)
      values (${members[0]!}, 'dining', 'VOORBEELD: vrijdag een bijzonder diner voor twee, binnen een uur van Maastricht. Rond €350 samen.', current_date + 10, 2, 35000, 'total', 'demo-1', ${members[0]!}, 'Intake beoordelen en eigenaar toewijzen', now() + interval '4 hours')`
  }

  const [ev] = await sql`select 1 from society_events where is_demo limit 1`
  if (!ev) {
    const [e] = await sql<{ id: string }[]>`insert into society_events (title, summary, location, starts_at, capacity, price_minor, price_note, status, public_teaser, is_demo, created_by)
      values ('Voorbeeld: private dinner (fictief)', 'Een fictieve ervaring om de flow te tonen.', 'Maastricht', now() + interval '21 days', 8, 9500, 'per persoon, excl. dranken', 'open', true, true, ${concierge}) returning id`
    for (const m of members) await sql`insert into society_invitations (event_id, member_id, invited_by) values (${e!.id}, ${m}, ${concierge}) on conflict do nothing`
  }
  console.log('Demo-seed klaar. Log in via /login met admin@example.com, concierge@example.com, anna@example.com of bas@example.com; de links staan in .dev-mailbox/mail.jsonl.')
} finally {
  await sql.end()
}
}

main().catch((e) => { console.error(e); process.exit(1) })
