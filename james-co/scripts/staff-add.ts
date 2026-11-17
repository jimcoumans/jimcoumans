/**
 * Eerste medewerker(s) aanmaken. Server-side provisioning: er is geen
 * zelfregistratie voor staff en geen master-wachtwoord.
 *   npm run staff:add -- jij@example.com "Volledige Naam" admin
 */
import postgres from 'postgres'

const [emailArg, nameArg, role = 'concierge'] = process.argv.slice(2)
if (!emailArg || !nameArg || !['admin', 'concierge'].includes(role)) {
  console.error('Gebruik: npm run staff:add -- <email> "<naam>" <admin|concierge>')
  process.exit(1)
}
const email: string = emailArg ?? ''
const name: string = nameArg ?? ''
const url = process.env.DATABASE_ADMIN_URL
if (!url) { console.error('DATABASE_ADMIN_URL ontbreekt.'); process.exit(1) }
const sql = postgres(url, { max: 1, onnotice: () => {} })
async function main(): Promise<void> {
try {
  const [p] = await sql<{ id: string }[]>`
    insert into profiles (email, full_name, display_name) values (${email.toLowerCase()}, ${name}, ${name.split(' ')[0]!})
    on conflict (email) do update set full_name = excluded.full_name returning id`
  await sql`insert into staff_roles (user_id, role) values (${p!.id}, ${role}) on conflict (user_id) do update set role = excluded.role, active = true, updated_at = now()`.execute()
  await sql`insert into audit_events (actor_type, action, entity_type, entity_id, after) values ('system', 'staff.provision', 'profile', ${p!.id}, ${sql.json({ role })})`
  console.log(`Medewerker ${email} (${role}) staat klaar. Log in via /login; bij de eerste login stelt u tweestapsverificatie in.`)
} finally {
  await sql.end()
}
}

main().catch((e) => { console.error(e); process.exit(1) })
