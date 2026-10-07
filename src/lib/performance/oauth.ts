import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { asc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyticsConnections, googleConnections, type GoogleConnection } from '@/db/schema'
import { metGeheugen, vergeet } from '@/lib/cache'
import { KoppelingFout } from './google'

/* -------------------------------------------------------------------------
   Google-accounts van James Robinson verbinden (info@, marketing@, ...).

   Een beheerder klikt één keer op "Verbinden" en logt in bij Google. Het
   portaal krijgt dan een blijvende sleutel (refresh token) waarmee het
   meekijkt in alles waar dat adres bij kan. Die sleutel staat versleuteld
   in de database; zonder TOKEN_SLEUTEL uit Netlify is hij onbruikbaar.
   ------------------------------------------------------------------------- */

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  // Alvast voor Google Ads, zodat niemand later opnieuw hoeft te verbinden.
  'https://www.googleapis.com/auth/adwords',
]

/* ------------------------------ Instellingen ----------------------------- */

export function oauthInstellingen(env: Record<string, string | undefined> = process.env) {
  const ontbreekt = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'TOKEN_SLEUTEL'].filter((n) => !env[n]?.trim())
  if (env.TOKEN_SLEUTEL && env.TOKEN_SLEUTEL.trim().length < 32) ontbreekt.push('TOKEN_SLEUTEL (minstens 32 tekens)')
  return { klaar: ontbreekt.length === 0, ontbreekt, clientId: env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? '', clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? '' }
}

/**
 * Het adres waar Google na het inloggen naar terugstuurt. Moet letterlijk zo
 * in Google Cloud staan; APP_URL wint, zodat het niet afhangt van via welk
 * adres iemand het portaal opende.
 */
export function terugUrl(origin: string, env: Record<string, string | undefined> = process.env): string {
  const basis = (env.APP_URL?.trim() || origin).replace(/\/+$/, '')
  return `${basis}/api/google/terug`
}

/* ------------------------------ Versleutelen ----------------------------- */

function sleutel(geheim = process.env.TOKEN_SLEUTEL): Buffer {
  if (!geheim || geheim.trim().length < 32) throw new KoppelingFout('TOKEN_SLEUTEL ontbreekt of is te kort (minstens 32 tekens) in Netlify.')
  return createHash('sha256').update(geheim.trim()).digest()
}

/** AES-256-GCM: versie, iv, tag en inhoud, punt-gescheiden in base64url. */
export function versleutel(tekst: string, geheim?: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', sleutel(geheim), iv)
  const inhoud = Buffer.concat([c.update(tekst, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), inhoud.toString('base64url')].join('.')
}

export function ontsleutel(versleuteld: string, geheim?: string): string {
  const [versie, iv, tag, inhoud] = versleuteld.split('.')
  if (versie !== 'v1' || !iv || !tag || !inhoud) throw new KoppelingFout('Opgeslagen sleutel is onleesbaar. Verbind het account opnieuw.')
  const d = createDecipheriv('aes-256-gcm', sleutel(geheim), Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  try {
    return Buffer.concat([d.update(Buffer.from(inhoud, 'base64url')), d.final()]).toString('utf8')
  } catch {
    throw new KoppelingFout('De opgeslagen sleutel past niet bij TOKEN_SLEUTEL. Is die gewijzigd? Verbind het account dan opnieuw.')
  }
}

/* ------------------------------ Inloggen --------------------------------- */

export function autorisatieUrl(redirectUri: string, state: string, clientId = oauthInstellingen().clientId): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    // Altijd vragen: alleen dan geeft Google een blijvende sleutel mee.
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

async function tokenAanvraag(body: Record<string, string>): Promise<Record<string, unknown>> {
  const antwoord = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15000),
  })
  const json = (await antwoord.json().catch(() => ({}))) as Record<string, unknown>
  if (!antwoord.ok) {
    if (json.error === 'invalid_grant') throw new KoppelingFout('De verbinding is verlopen of ingetrokken. Verbind dit Google-account opnieuw.')
    throw new KoppelingFout(`Google weigerde het inloggen: ${String(json.error_description ?? json.error ?? antwoord.status)}`)
  }
  return json
}

/** Het e-mailadres uit het id-token dat Google direct (over TLS) teruggeeft. */
export function emailUitIdToken(idToken: string): string | null {
  try {
    const inhoud = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8')) as { email?: string; email_verified?: boolean }
    return inhoud.email && inhoud.email_verified !== false ? inhoud.email.toLowerCase() : null
  } catch {
    return null
  }
}

/** Code uit de terugkeer van Google omzetten en het account bewaren. */
export async function rondVerbindenAf(code: string, redirectUri: string, userId: string): Promise<string> {
  const inst = oauthInstellingen()
  if (!inst.klaar) throw new KoppelingFout(`Nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  const json = await tokenAanvraag({ code, client_id: inst.clientId, client_secret: inst.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
  const refresh = typeof json.refresh_token === 'string' ? json.refresh_token : null
  const email = typeof json.id_token === 'string' ? emailUitIdToken(json.id_token) : null
  if (!refresh) throw new KoppelingFout('Google gaf geen blijvende toegang mee. Probeer opnieuw en geef alle gevraagde toestemmingen.')
  if (!email) throw new KoppelingFout('Google gaf geen e-mailadres mee. Probeer het opnieuw.')
  const waarden = { refreshTokenEnc: versleutel(refresh), scopes: String(json.scope ?? ''), lastError: null, lastErrorAt: null, updatedAt: new Date() }
  await db
    .insert(googleConnections)
    .values({ email, createdByUserId: userId, ...waarden })
    .onConflictDoUpdate({ target: googleConnections.email, set: waarden })
  toegang.clear()
  vergeet('google:')
  return email
}

/* ------------------------------ Toegang ---------------------------------- */

const toegang = new Map<string, { token: string; tot: number }>()

/** Een geldig toegangstoken voor dit account; vernieuwt het zelf. */
export async function toegangstoken(v: GoogleConnection): Promise<string> {
  const bewaard = toegang.get(v.id)
  if (bewaard && bewaard.tot > Date.now() + 60000) return bewaard.token
  const inst = oauthInstellingen()
  if (!inst.klaar) throw new KoppelingFout(`Nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  try {
    const json = await tokenAanvraag({
      client_id: inst.clientId,
      client_secret: inst.clientSecret,
      refresh_token: ontsleutel(v.refreshTokenEnc),
      grant_type: 'refresh_token',
    })
    const token = String(json.access_token)
    toegang.set(v.id, { token, tot: Date.now() + Number(json.expires_in ?? 3600) * 1000 })
    if (v.lastError) await db.update(googleConnections).set({ lastError: null, lastErrorAt: null }).where(eq(googleConnections.id, v.id))
    return token
  } catch (e) {
    const melding = e instanceof KoppelingFout ? e.message : `Vernieuwen mislukt: ${(e as Error).message}`
    await db.update(googleConnections).set({ lastError: melding, lastErrorAt: new Date() }).where(eq(googleConnections.id, v.id))
    throw new KoppelingFout(`${v.email}: ${melding}`)
  }
}

export async function listVerbindingen(): Promise<GoogleConnection[]> {
  return db.select().from(googleConnections).orderBy(asc(googleConnections.email))
}

/** Per verbinding: op hoeveel klantkoppelingen hij draait. */
export async function gebruikPerVerbinding(): Promise<Map<string, number>> {
  const rijen = await db
    .select({ id: analyticsConnections.googleConnectionId, n: sql<number>`count(*)::int` })
    .from(analyticsConnections)
    .where(isNotNull(analyticsConnections.googleConnectionId))
    .groupBy(analyticsConnections.googleConnectionId)
  return new Map(rijen.map((r) => [r.id!, r.n]))
}

export async function getVerbinding(id: string): Promise<GoogleConnection | null> {
  const [v] = await db.select().from(googleConnections).where(eq(googleConnections.id, id))
  return v ?? null
}

/**
 * Een account loskoppelen. De klanten die erop draaiden zetten we stil met
 * een duidelijke melding; anders vallen ze stilletjes terug op het
 * serviceaccount en krijg je een fout die nergens op slaat.
 */
export async function verwijderVerbinding(id: string) {
  const v = await getVerbinding(id)
  if (!v) return
  await db.transaction(async (tx) => {
    await tx
      .update(analyticsConnections)
      .set({ active: false, lastError: `Het Google-account ${v.email} is losgekoppeld. Kies de property opnieuw.`, lastErrorAt: new Date() })
      .where(eq(analyticsConnections.googleConnectionId, id))
    await tx.delete(googleConnections).where(eq(googleConnections.id, id))
  })
  toegang.delete(id)
  vergeet('google:')
}

/* ------------------------------ Wat er te kiezen is ---------------------- */

export type Keuze = {
  verbindingId: string
  email: string
  source: 'ga4' | 'search_console'
  externalId: string
  naam: string
  /** Waaronder hij valt: het GA4-account, of het soort property in Search Console. */
  groep: string
}

type Samenvattingen = { accountSummaries?: { displayName?: string; propertySummaries?: { property: string; displayName?: string }[] }[]; nextPageToken?: string }

export function leesGa4Lijst(json: Samenvattingen): Omit<Keuze, 'verbindingId' | 'email'>[] {
  return (json.accountSummaries ?? []).flatMap((a) =>
    (a.propertySummaries ?? []).map((p) => ({
      source: 'ga4' as const,
      externalId: p.property.replace(/^properties\//, ''),
      naam: p.displayName ?? p.property,
      groep: a.displayName ?? 'GA4',
    })),
  )
}

type Sites = { siteEntry?: { siteUrl: string; permissionLevel?: string }[] }

export function leesSiteLijst(json: Sites): Omit<Keuze, 'verbindingId' | 'email'>[] {
  return (json.siteEntry ?? [])
    .filter((s) => s.permissionLevel !== 'siteUnverifiedUser')
    .map((s) => ({
      source: 'search_console' as const,
      externalId: s.siteUrl,
      naam: s.siteUrl.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
      groep: s.siteUrl.startsWith('sc-domain:') ? 'Domein' : 'Website',
    }))
}

async function haal(url: string, token: string, wat: string): Promise<unknown> {
  const antwoord = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) })
  const json = (await antwoord.json().catch(() => ({}))) as { error?: { message?: string } }
  if (!antwoord.ok) throw new KoppelingFout(`${wat}: ${json.error?.message ?? `fout ${antwoord.status}`}`)
  return json
}

async function keuzesVan(v: GoogleConnection): Promise<{ keuzes: Keuze[]; fouten: string[] }> {
  const fouten: string[] = []
  const keuzes: Keuze[] = []
  let token: string
  try {
    token = await toegangstoken(v)
  } catch (e) {
    return { keuzes, fouten: [(e as Error).message] }
  }
  try {
    let pagina: string | undefined
    do {
      const json = (await haal(
        `https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200${pagina ? `&pageToken=${pagina}` : ''}`,
        token,
        'GA4-properties ophalen',
      )) as Samenvattingen
      keuzes.push(...leesGa4Lijst(json).map((k) => ({ ...k, verbindingId: v.id, email: v.email })))
      pagina = json.nextPageToken
    } while (pagina)
  } catch (e) {
    fouten.push(`${v.email}: ${(e as Error).message}`)
  }
  try {
    const json = (await haal('https://searchconsole.googleapis.com/webmasters/v3/sites', token, 'Search Console-sites ophalen')) as Sites
    keuzes.push(...leesSiteLijst(json).map((k) => ({ ...k, verbindingId: v.id, email: v.email })))
  } catch (e) {
    fouten.push(`${v.email}: ${(e as Error).message}`)
  }
  return { keuzes, fouten }
}

/**
 * Alles wat via de verbonden Google-accounts te kiezen is. Tien minuten
 * onthouden: de lijst verandert zelden, en ophalen kost seconden.
 */
export async function alleKeuzes(): Promise<{ keuzes: Keuze[]; fouten: string[] }> {
  return metGeheugen(
    'google:keuzes',
    async () => {
      const verbindingen = await listVerbindingen()
      const per = await Promise.all(verbindingen.map(keuzesVan))
      // Zit een property onder twee adressen, dan één keer tonen.
      const gezien = new Set<string>()
      const keuzes = per
        .flatMap((p) => p.keuzes)
        .filter((k) => {
          const s = `${k.source}|${k.externalId}`
          if (gezien.has(s)) return false
          gezien.add(s)
          return true
        })
      return { keuzes, fouten: per.flatMap((p) => p.fouten) }
    },
    10 * 60_000,
  )
}

export function vergeetKeuzes() {
  vergeet('google:')
}

/* ------------------------------ Voorstellen ------------------------------ */

const STOPWOORDEN = new Set(['bv', 'b.v.', 'vof', 'de', 'het', 'van', 'en', 'demo', 'www', 'nl', 'com', 'ga4', 'website', 'site'])

function woorden(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/https?:\/\/|sc-domain:|www\./g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWOORDEN.has(w))
}

/** Hoe goed een keuze bij de klant past: domein telt het zwaarst, dan woorden uit de naam. */
export function score(k: Pick<Keuze, 'naam' | 'groep' | 'externalId'>, klant: { name: string; website: string | null }): number {
  const domein = (klant.website ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
  const tekst = `${k.naam} ${k.groep} ${k.externalId}`.toLowerCase()
  let punten = 0
  if (domein && tekst.includes(domein)) punten += 10
  const klantWoorden = new Set(woorden(klant.name))
  for (const w of new Set(woorden(tekst))) if (klantWoorden.has(w)) punten += 3
  return punten
}
