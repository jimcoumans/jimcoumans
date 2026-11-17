/**
 * End-to-end: aanmelden -> aanbod -> betaling -> activatie -> verzoek ->
 * voorstel -> akkoord -> bevestiging met bewijs, plus kernfoutpaden.
 * Vereist: demo-database met seed (npm run db:seed:demo) en een draaiende app
 * met APP_ENV=demo zonder e-mailprovider (mail gaat naar .dev-mailbox/).
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'
import postgres from 'postgres'
import { totpAt, currentStep } from '../src/lib/auth/totp'

const MAILBOX = '.dev-mailbox/mail.jsonl'
const stamp = Date.now()
const candidateEmail = `kandidaat.${stamp}@example.com`
const candidateName = `E2E Kandidaat ${stamp} (fictief)`

async function latestLink(to: string, after: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    if (existsSync(MAILBOX)) {
      const mails = readFileSync(MAILBOX, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as { to: string; text: string; at: string })
      const m = mails.reverse().find((x) => x.to === to && new Date(x.at).getTime() >= after)
      const link = m?.text.match(/https?:\/\/\S+\/login\/verify\?token=[A-Za-z0-9_-]+/)?.[0]
      if (link) return new URL(link).pathname + new URL(link).search
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`geen mail voor ${to}`)
}

async function secretFromDb(email: string): Promise<string> {
  const env = readFileSync('.env.local', 'utf8')
  const url = process.env.DATABASE_ADMIN_URL ?? env.match(/^DATABASE_ADMIN_URL=(.*)$/m)?.[1]?.replace(/^"|"$/g, '')
  const sql = postgres(url!, { max: 1 })
  try {
    const [r] = await sql<{ secret: string }[]>`select m.secret_base32 as secret from staff_mfa m join profiles p on p.id = m.user_id where p.email = ${email}`
    return r!.secret
  } finally { await sql.end() }
}

/** Testopzet: rate limits van eerdere runs wissen (de limieten zelf worden in tests/flows getest). */
async function resetRateLimits(): Promise<void> {
  const env = readFileSync('.env.local', 'utf8')
  const url = process.env.DATABASE_ADMIN_URL ?? env.match(/^DATABASE_ADMIN_URL=(.*)$/m)?.[1]?.replace(/^"|"$/g, '')
  const sql = postgres(url!, { max: 1, onnotice: () => {} })
  try { await sql`delete from rate_limits` } finally { await sql.end() }
}

test.beforeAll(resetRateLimits)

async function login(page: Page, email: string) {
  const t = Date.now() - 1000
  await page.goto('/login')
  await page.getByLabel('E-mailadres').fill(email)
  await page.getByRole('button', { name: 'Stuur inloglink' }).click()
  await expect(page.getByRole('status')).toContainText('Als dit adres bij ons bekend is')
  await page.goto(await latestLink(email, t))
  await page.getByRole('button', { name: 'Doorgaan' }).click()
}

async function staffLogin(page: Page, email: string) {
  await login(page, email)
  await page.waitForURL(/\/ops\/mfa/)
  await page.getByRole('heading', { name: 'Tweestapsverificatie' }).waitFor()
  const setup = page.getByRole('button', { name: 'Instellen' })
  if (await setup.count()) {
    await setup.click()
    await page.getByTestId('totp-secret').waitFor()
  }
  // Eerste keer: de sleutel staat op het scherm. Bij een herhaalde run is hij al
  // ingesteld en tonen we hem bewust niet meer; dan leest de test hem uit de testdatabase.
  const shown = page.getByTestId('totp-secret')
  const secret = (await shown.count()) ? (await shown.textContent())!.trim() : await secretFromDb(email)
  // Een code werkt één keer (hergebruik van dezelfde stap wordt geweigerd). Lukt het
  // niet, dan wachten we op de volgende stap van 30 seconden.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (Date.now() % 30_000 > 26_000) await page.waitForTimeout(5_000)
    await page.getByLabel('Code van 6 cijfers').fill(totpAt(secret, currentStep()))
    await page.getByRole('button', { name: 'Bevestigen' }).click()
    const ok = await page.waitForURL(/\/ops$/, { timeout: 5_000 }).then(() => true).catch(() => false)
    if (ok) return
    await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 500)
  }
  await page.waitForURL(/\/ops$/)
}

test('volledige keten met kernfoutpaden', async ({ browser }) => {
  const staffCtx: BrowserContext = await browser.newContext()
  const memberCtx: BrowserContext = await browser.newContext()
  const staff = await staffCtx.newPage()
  const member = await memberCtx.newPage()

  // Anoniem: portaal en cockpit zijn dicht.
  await member.goto('/app')
  await expect(member).toHaveURL(/\/login/)
  await member.goto('/ops')
  await expect(member).toHaveURL(/\/login/)

  // 1. Kennismaking aanvragen
  let t = Date.now() - 1000
  await member.goto('/apply')
  await member.getByLabel('Naam *').fill(candidateName)
  await member.getByLabel('E-mailadres *').fill(candidateEmail)
  await member.getByLabel('Wat zou u het liefst uit handen geven? *').fill('Zakelijke diners en af en toe een weekend weg.')
  await member.getByRole('checkbox').check()
  await member.getByRole('button', { name: 'Kennismaking aanvragen' }).click()
  await expect(member.getByRole('heading', { name: 'Dank u. Kijk in uw inbox.' })).toBeVisible()

  // 2. E-mail bevestigen -> onboarding, geen toegang tot portaal of cockpit
  await member.goto(await latestLink(candidateEmail, t))
  await member.getByRole('button', { name: 'Doorgaan' }).click()
  await member.waitForURL(/\/onboarding/)
  await expect(member.getByText('Wat gebeurt er nu?')).toBeVisible()
  await member.goto('/app')
  await expect(member).toHaveURL(/\/onboarding/)
  await member.goto('/ops')
  await expect(member).toHaveURL(/\/app|\/onboarding/)

  // 3. Admin logt in met MFA en doet een aanbod
  await staffLogin(staff, 'admin@example.com')
  await staff.goto('/ops/members')
  await staff.getByRole('link', { name: candidateName }).click()
  staff.once('dialog', (d) => d.accept())
  await staff.getByRole('button', { name: /Aanbod uitgeven/ }).click()
  await expect(staff.getByText('Aanbod uitgegeven')).toBeVisible()

  // 4. Kandidaat accepteert exact deze versie
  await member.goto('/onboarding')
  await expect(member.getByText('Voorstel lidmaatschap · versie 1')).toBeVisible()
  await member.getByLabel(/Ik accepteer dit aanbod/).check()
  await member.getByRole('button', { name: 'Aanbod accepteren' }).click()
  await expect(member.getByText(/U ontvangt de factuur voor het lidmaatschap/)).toBeVisible()

  // 5. Admin: activeren zonder betaling faalt; factuur + betaling + activatie
  await staff.goto('/ops/billing')
  const row = staff.locator('li', { hasText: candidateName }).first()
  staff.once('dialog', (d) => d.accept())
  await row.getByRole('button', { name: 'Lidmaatschap activeren' }).click()
  await expect(row.getByRole('alert')).toContainText('Er is nog geen ontvangen betaling geregistreerd')
  await row.getByRole('button', { name: 'Factuurrecord maken' }).click()
  await expect(staff.getByText('Factuurrecord aangemaakt.')).toBeVisible()
  await staff.reload()
  const bill = staff.locator('li', { hasText: `${candidateName} · Lidmaatschap` }).last()
  await bill.getByText('Ontvangst, restitutie of correctie registreren').click()
  await bill.getByLabel('Bedrag').fill('495,00')
  await bill.getByLabel('Referentie', { exact: true }).fill(`BANK-${stamp}`)
  await bill.getByRole('button', { name: 'Registreren' }).click()
  await expect(bill.getByText('Ontvangen', { exact: true })).toBeVisible()
  const pendingRow = staff.locator('li', { hasText: `${candidateName} · geaccepteerd` }).first()
  staff.once('dialog', (d) => d.accept())
  await pendingRow.getByRole('button', { name: 'Lidmaatschap activeren' }).click()
  await expect(staff.getByText(`Lidmaatschap geactiveerd: ${candidateName}`)).toBeVisible()
  await expect(staff.locator('li', { hasText: `${candidateName} · geaccepteerd` })).toHaveCount(0)

  // 6. Lid maakt een verzoek (dubbelklik maakt geen tweede)
  await member.goto('/app')
  await expect(member.getByText('Wat mogen we als eerste voor u regelen?')).toBeVisible()
  await member.goto('/app/requests/new')
  await member.getByLabel('Uw wens').fill(`E2E ${stamp}: vrijdag een bijzonder diner voor twee, rond €350 samen.`)
  await member.getByRole('button', { name: 'Verzoek versturen' }).dblclick()
  await member.waitForURL(/\/app\/requests\/[0-9a-f-]+\?nieuw=1/)
  const requestUrl = member.url().split('?')[0]!
  const requestId = requestUrl.split('/').pop()!
  await expect(member.getByText('Uw verzoek is opgeslagen')).toBeVisible()
  await member.goto('/app/requests')
  await expect(member.locator('a', { hasText: `E2E ${stamp}: vrijdag een bijzonder diner` })).toHaveCount(1)

  // Ander lid zijn dossier: niet zichtbaar
  await staff.goto('/ops?q=VOORBEELD')
  const annaHref = await staff.locator('a', { hasText: 'VOORBEELD' }).first().getAttribute('href')
  const annaId = annaHref!.split('/').pop()!
  const res = await member.goto(`/app/requests/${annaId}`)
  expect(res?.status()).toBe(404)
  await expect(member.getByText('Niet gevonden')).toBeVisible()
  await expect(member.getByText('VOORBEELD')).toHaveCount(0)

  // 7. Staff behandelt: eigenaar, voorstel met optie, uitgeven
  await staff.goto(`/ops/requests/${requestId}`)
  await expect(staff.getByText(`E2E ${stamp}: vrijdag een bijzonder diner voor twee`)).toBeVisible()
  await staff.getByRole('button', { name: 'Toewijzen' }).click()
  await expect(staff.getByText('Eigenaar bijgewerkt.')).toBeVisible()
  await staff.getByRole('button', { name: 'Voorstel maken' }).click()
  await expect(staff.getByText('Concept · versie 1')).toBeVisible()
  await staff.getByLabel('Titel van de optie').fill("Chef's table (fictief)")
  await staff.getByLabel('Naam leverancier').first().fill('Restaurant De Proefkeuken (fictief)')
  await staff.getByLabel('Bedrag').first().fill('320')
  await staff.getByLabel('Annuleringsvoorwaarden').fill('Kosteloos annuleren tot 24 uur vooraf.')
  await staff.getByRole('button', { name: 'Optie opslaan' }).click()
  await expect(staff.getByText("1. Chef's table (fictief)")).toBeVisible()
  staff.once('dialog', (d) => d.accept())
  await staff.getByRole('button', { name: 'Uitgeven aan lid' }).click()
  await expect(staff.getByText('Uitgegeven · wacht op lid')).toBeVisible()

  // 8. Lid geeft akkoord op exact één optie
  await member.goto(requestUrl)
  await expect(member.getByRole('heading', { name: 'Voorstel · versie 1' })).toBeVisible()
  await member.getByRole('button', { name: 'Kies deze optie' }).click()
  // Zonder vinkje: browservalidatie houdt het tegen, er komt geen akkoord.
  await expect(member.getByText('Uw akkoord is vastgelegd')).toHaveCount(0)
  await member.getByLabel(/Ik ga akkoord met een totaalbedrag van/).check()
  await member.getByRole('button', { name: 'Kies deze optie' }).click()
  await expect(member.getByText('Uw akkoord is vastgelegd')).toBeVisible()

  // 9. Staff: onderdeel toevoegen, bevestigen zonder bewijs faalt, met bewijs lukt
  await staff.goto(`/ops/requests/${requestId}`)
  await staff.getByText('Onderdeel toevoegen').click()
  await staff.getByLabel('Onderdeel', { exact: true }).fill('Diner')
  await staff.getByLabel('Naam leverancier').last().fill('Restaurant De Proefkeuken (fictief)')
  await staff.getByRole('button', { name: 'Toevoegen', exact: true }).click()
  await expect(staff.getByText('Onderdeel toegevoegd.')).toBeVisible()
  await staff.getByText('Bevestigen met leveranciersbewijs').click()
  await staff.getByRole('button', { name: 'Bevestiging vastleggen' }).click()
  await expect(staff.getByRole('alert').first()).toContainText('Bevestiging vereist leveranciernaam, bron, controletijd en een referentie of bevestigingsnotitie.')
  await staff.getByLabel('Referentie', { exact: true }).fill(`RES-${stamp}`)
  await staff.getByLabel('Praktische gegevens').fill('Tafel op naam Kandidaat, 20:00 (fictief)')
  await staff.getByRole('button', { name: 'Bevestiging vastleggen' }).click()
  await expect(staff.getByText('Alles bevestigd', { exact: true })).toBeVisible()

  // 10. Lid ziet de bevestiging
  await member.goto(requestUrl)
  await expect(member.getByText('Alles bevestigd', { exact: true })).toBeVisible()
  await expect(member.getByText(`Referentie: RES-${stamp}`)).toBeVisible()
  await expect(member.getByText('Tafel op naam Kandidaat, 20:00 (fictief)')).toBeVisible()

  // 11. Lid ziet geen interne zaken; uitloggen sluit de cockpit
  await expect(member.getByText('Audittrail')).toHaveCount(0)
  await staff.goto('/ops')
  await staff.getByRole('button', { name: 'Uitloggen' }).first().click()
  await staff.waitForURL(/\/login/)
  await staff.goto('/ops')
  await expect(staff).toHaveURL(/\/login/)

  await staffCtx.close()
  await memberCtx.close()
})
