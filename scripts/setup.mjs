#!/usr/bin/env node
/**
 * Zet het project in een keer klaar om lokaal te draaien.
 *
 * - maakt .env.local aan met een veilig gegenereerd AUTH_SECRET
 * - wacht tot de database bereikbaar is
 * - voert de migraties uit
 * - vult voorbeelddata
 * - print een inloglink
 *
 * Bedoeld om zonder voorkennis te kunnen starten: npm run setup
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { execFileSync, execSync } from 'node:child_process'

const ENV_PAD = '.env.local'
const STANDAARD_DB = 'postgresql://jr:jrwallet@localhost:5433/jrwallet'

function log(bericht) {
  console.log(bericht)
}

function stap(nummer, bericht) {
  console.log(`\n[${nummer}/5] ${bericht}`)
}

/* ------------------------------ 1. .env.local --------------------------- */

stap(1, 'Instellingen klaarzetten')

let env = ''
if (existsSync(ENV_PAD)) {
  env = readFileSync(ENV_PAD, 'utf8')
  log(`  ${ENV_PAD} bestaat al; ontbrekende regels worden aangevuld.`)
} else {
  log(`  ${ENV_PAD} aanmaken.`)
}

/** Zet een waarde als die er nog niet staat. Bestaande waarden blijven. */
function zorgVoor(sleutel, waarde, uitleg) {
  const regex = new RegExp(`^${sleutel}=`, 'm')
  if (regex.test(env)) return false
  env += `${env.endsWith('\n') || env === '' ? '' : '\n'}${uitleg ? `# ${uitleg}\n` : ''}${sleutel}="${waarde}"\n`
  return true
}

const toegevoegd = []
if (zorgVoor('DATABASE_URL', STANDAARD_DB, 'Postgres uit docker-compose.yml')) {
  toegevoegd.push('DATABASE_URL')
}
if (
  zorgVoor(
    'AUTH_SECRET',
    randomBytes(32).toString('base64'),
    'Ondertekent de sessiecookie. Nooit delen.',
  )
) {
  toegevoegd.push('AUTH_SECRET')
}
if (zorgVoor('APP_URL', 'http://localhost:3000', 'Basis-URL in de inloglinks')) {
  toegevoegd.push('APP_URL')
}
if (
  zorgVoor(
    'ADMIN_EMAILS',
    'jim@jamesrobinson.nl',
    'Deze adressen krijgen beheerrechten',
  )
) {
  toegevoegd.push('ADMIN_EMAILS')
}
if (
  zorgVoor(
    'CRON_SECRET',
    randomBytes(32).toString('hex'),
    'Beveiligt de dagelijkse abonnementsrun',
  )
) {
  toegevoegd.push('CRON_SECRET')
}

writeFileSync(ENV_PAD, env)
log(
  toegevoegd.length > 0
    ? `  Toegevoegd: ${toegevoegd.join(', ')}`
    : '  Alles stond er al.',
)

const databaseUrl = /^DATABASE_URL="?([^"\n]+)"?/m.exec(env)?.[1] ?? STANDAARD_DB

/* ------------------------------ 2. database ----------------------------- */

stap(2, 'Wachten tot de database bereikbaar is')

function databaseBereikbaar() {
  try {
    execFileSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `import postgres from 'postgres'
         const sql = postgres(process.env.DB_URL, { max: 1, connect_timeout: 3 })
         await sql\`select 1\`
         await sql.end()`,
      ],
      { env: { ...process.env, DB_URL: databaseUrl }, stdio: 'pipe' },
    )
    return true
  } catch {
    return false
  }
}

let bereikbaar = databaseBereikbaar()

if (!bereikbaar) {
  log('  Nog niet bereikbaar. Proberen docker compose te starten...')
  try {
    execSync('docker compose up -d', { stdio: 'inherit' })
  } catch {
    log('  Kon docker compose niet starten.')
  }

  // Tot ongeveer een minuut wachten; een eerste start duurt even.
  for (let poging = 0; poging < 30 && !bereikbaar; poging++) {
    bereikbaar = databaseBereikbaar()
    if (!bereikbaar) execSync('node -e "setTimeout(()=>{},2000)"')
  }
}

if (!bereikbaar) {
  console.error(`
  De database op ${databaseUrl} is niet bereikbaar.

  Start Postgres met:      docker compose up -d
  Of zet in ${ENV_PAD} een DATABASE_URL naar je eigen Postgres
  (bijvoorbeeld een gratis database bij Neon of Supabase).
`)
  process.exit(1)
}
log('  Database is bereikbaar.')

/* ------------------------------ 3. migraties ---------------------------- */

stap(3, 'Tabellen aanmaken')
execSync('npm run --silent db:migrate', { stdio: 'inherit' })

/* ---------------------------- 4. voorbeelddata -------------------------- */

stap(4, 'Voorbeelddata invullen')
execSync('npm run --silent db:seed', { stdio: 'inherit' })

/* ------------------------------ 5. inloglink ---------------------------- */

stap(5, 'Inloglinks klaarzetten')

function inloglink(email) {
  try {
    return execFileSync('npm', ['run', '--silent', 'login:link', '--', email], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
      .split('\n')
      .pop()
  } catch {
    return null
  }
}

const adminEmail =
  /^ADMIN_EMAILS="?([^",\n]+)/m.exec(env)?.[1]?.trim() ?? 'jim@jamesrobinson.nl'

const beheerLink = inloglink(adminEmail)
const klantLink = inloglink('demo-klant@voorbeeld.nl')

console.log(`
Klaar. Start de app met:

  npm run dev

Open dan een van deze links om in te loggen (zonder wachtwoord):

  Als beheerder (${adminEmail}):
  ${beheerLink ?? 'npm run login:link -- ' + adminEmail}

  Als klant (Hotel Voncken):
  ${klantLink ?? 'npm run login:link -- demo-klant@voorbeeld.nl'}

Een nieuwe link maak je altijd met:
  npm run login:link -- <e-mailadres>

Een link is 15 minuten geldig en werkt een keer.
`)
