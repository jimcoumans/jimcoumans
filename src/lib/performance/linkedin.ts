import { KoppelingFout, type Dagcijfers } from './google'
import { parseAmountToCents } from '@/lib/money'

/* -------------------------------------------------------------------------
   LinkedIn Ads (Campaign Manager), via een verbonden LinkedIn-account van
   James Robinson.

   LinkedIn kent geen blijvend token zoals Meta: een beheerder logt één keer
   in (OAuth), het portaal krijgt een toegangstoken van zestig dagen en een
   vernieuwtoken van een jaar. Dit bestand bevat alles wat zonder database
   kan: de inlog-URL's, de API-aanroepen en het lezen van de antwoorden. Het
   bewaren en vernieuwen van tokens staat in linkedin-verbinding.ts.
   ------------------------------------------------------------------------- */

/** Elke aanroep moet een versie meesturen (jaar en maand); een versie blijft minstens een jaar werken. */
export const API_VERSIE = '202611'

/** Alleen lezen: advertentieaccounts en rapportages. */
export const LINKEDIN_SCOPES = ['r_ads', 'r_ads_reporting']

/* ------------------------------ Instellingen ----------------------------- */

export function linkedinInstellingen(env: Record<string, string | undefined> = process.env) {
  const ontbreekt = ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'TOKEN_SLEUTEL'].filter((n) => !env[n]?.trim())
  if (env.TOKEN_SLEUTEL && env.TOKEN_SLEUTEL.trim().length < 32) ontbreekt.push('TOKEN_SLEUTEL (minstens 32 tekens)')
  return { klaar: ontbreekt.length === 0, ontbreekt, clientId: env.LINKEDIN_CLIENT_ID?.trim() ?? '', clientSecret: env.LINKEDIN_CLIENT_SECRET?.trim() ?? '' }
}

/** Moet letterlijk zo bij de app in het LinkedIn Developer Portal staan (Authorized redirect URLs). */
export function linkedinTerugUrl(origin: string, env: Record<string, string | undefined> = process.env): string {
  const basis = (env.APP_URL?.trim() || origin).replace(/\/+$/, '')
  return `${basis}/api/linkedin/terug`
}

/* ------------------------------ Inloggen --------------------------------- */

export function linkedinAutorisatieUrl(redirectUri: string, state: string, clientId: string): string {
  const p = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, state, scope: LINKEDIN_SCOPES.join(' ') })
  return `https://www.linkedin.com/oauth/v2/authorization?${p}`
}

export type LinkedinTokens = { accessToken: string; accessTokenExpiresAt: Date; refreshToken: string; refreshTokenExpiresAt: Date; scopes: string }

/** Het antwoord van LinkedIn op een code of een vernieuwtoken omzetten naar wat we bewaren. */
export function leesTokens(json: Record<string, unknown>, nu = new Date(), vorige?: { refreshToken: string; refreshTokenExpiresAt: Date }): LinkedinTokens {
  const accessToken = typeof json.access_token === 'string' ? json.access_token : ''
  if (!accessToken) throw new KoppelingFout('LinkedIn gaf geen toegangstoken terug. Probeer opnieuw.')
  const expires = Number(json.expires_in ?? 60 * 86400)
  const accessTokenExpiresAt = new Date(nu.getTime() + expires * 1000)
  // Bij vernieuwen stuurt LinkedIn het vernieuwtoken meestal opnieuw mee, met de resterende looptijd.
  // Komt er helemaal geen vernieuwtoken (dat vereist een goedgekeurde app), dan werkt de verbinding
  // zestig dagen en vraagt het portaal daarna om opnieuw te verbinden.
  const refreshToken = typeof json.refresh_token === 'string' && json.refresh_token ? json.refresh_token : (vorige?.refreshToken ?? '')
  const refreshExpires = json.refresh_token_expires_in != null ? Number(json.refresh_token_expires_in) : null
  return {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt: !refreshToken
      ? accessTokenExpiresAt
      : refreshExpires != null
        ? new Date(nu.getTime() + refreshExpires * 1000)
        : (vorige?.refreshTokenExpiresAt ?? new Date(nu.getTime() + 365 * 86400000)),
    scopes: typeof json.scope === 'string' ? json.scope : LINKEDIN_SCOPES.join(' '),
  }
}

/** Nog een week geldig? Dan vernieuwen we alvast; LinkedIn mag een token ook eerder intrekken. */
export function tokenNogGoed(verlooptOp: Date, nu = new Date(), marge = 7 * 86400000): boolean {
  return verlooptOp.getTime() - nu.getTime() > marge
}

export async function tokenAanvraag(body: Record<string, string>): Promise<Record<string, unknown>> {
  const antwoord = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15000),
  })
  const json = (await antwoord.json().catch(() => ({}))) as Record<string, unknown>
  if (!antwoord.ok) {
    const uitleg = String(json.error_description ?? json.error ?? antwoord.status)
    if (/invalid|expired|revoked/i.test(uitleg)) throw new KoppelingFout('De LinkedIn-verbinding is verlopen of ingetrokken. Verbind het LinkedIn-account opnieuw onder Beheer → Koppelingen.')
    throw new KoppelingFout(`LinkedIn weigerde het inloggen: ${uitleg}`)
  }
  return json
}

/* ------------------------------ Aanroepen -------------------------------- */

type LinkedinFoutBody = { message?: string; code?: string; serviceErrorCode?: number; status?: number }

/** Fouten waarbij een ander verbonden LinkedIn-account misschien wel toegang heeft. */
export class LinkedinToegangFout extends KoppelingFout {}

export function leesLinkedinFout(status: number, body: unknown): KoppelingFout {
  const f = (body ?? {}) as LinkedinFoutBody
  const melding = f.message ?? `fout ${status}`
  if (status === 401) return new LinkedinToegangFout('LinkedIn accepteert het token niet meer. Verbind het LinkedIn-account opnieuw onder Beheer → Koppelingen.')
  if (status === 403) return new LinkedinToegangFout(`LinkedIn: geen toegang tot dit advertentieaccount. Heeft het verbonden LinkedIn-account een rol (minstens Viewer) op dit account? (${melding})`)
  if (status === 404) return new KoppelingFout(`LinkedIn kent dit advertentieaccount niet. Klopt het account-ID? (${melding})`)
  if (status === 429) return new KoppelingFout('LinkedIn vindt dat we te veel vragen; de volgende ronde gaat het verder.')
  if (status === 426 || /version/i.test(melding)) return new KoppelingFout(`LinkedIn accepteert API-versie ${API_VERSIE} niet meer: ${melding}`)
  return new KoppelingFout(`LinkedIn gaf fout ${status}: ${melding}`)
}

export async function linkedinGet(pad: string, toegang: string): Promise<unknown> {
  const stop = new AbortController()
  const t = setTimeout(() => stop.abort(), 15000)
  try {
    const antwoord = await fetch(`https://api.linkedin.com/rest/${pad}`, {
      headers: { Authorization: `Bearer ${toegang}`, 'Linkedin-Version': API_VERSIE, 'X-Restli-Protocol-Version': '2.0.0' },
      signal: stop.signal,
    })
    const tekst = await antwoord.text()
    let json: unknown = null
    try {
      json = JSON.parse(tekst)
    } catch {
      /* geen JSON */
    }
    if (!antwoord.ok) {
      console.error(`[linkedin] ${antwoord.status} voor ${pad.slice(0, 120)}: ${tekst.slice(0, 2000)}`)
      throw leesLinkedinFout(antwoord.status, json ?? { message: tekst.slice(0, 200) })
    }
    return json ?? {}
  } catch (e) {
    if (e instanceof KoppelingFout) throw e
    if ((e as Error).name === 'AbortError') throw new KoppelingFout('LinkedIn reageerde niet binnen 15 seconden.')
    throw new KoppelingFout(`LinkedIn niet bereikbaar: ${(e as Error).message}`)
  } finally {
    clearTimeout(t)
  }
}

/* ------------------------------ Wie is dit ------------------------------- */

type GebruikerRij = { user?: string; role?: string; account?: string }

/** Het lid achter het token, met op hoeveel advertentieaccounts het een rol heeft. */
export async function haalLinkedinGebruiker(toegang: string): Promise<{ memberUrn: string; accounts: number }> {
  const json = (await linkedinGet('adAccountUsers?q=authenticatedUser', toegang)) as { elements?: GebruikerRij[] }
  const rijen = json.elements ?? []
  const memberUrn = rijen.find((r) => r.user)?.user
  if (!memberUrn) throw new KoppelingFout('LinkedIn gaf niet terug wie er inlogde. Heeft dit LinkedIn-account een rol in Campaign Manager?')
  return { memberUrn, accounts: new Set(rijen.map((r) => r.account).filter(Boolean)).size }
}

/* ------------------------------ Advertentieaccounts ---------------------- */

export type LinkedinAccount = { id: string; naam: string; munt: string }

type AccountRij = { id?: number | string; name?: string; currency?: string; status?: string; test?: boolean }
export type LinkedinAccountsAntwoord = { elements?: AccountRij[]; metadata?: { nextPageToken?: string } }

export function accountsPad(pageToken?: string): string {
  const p = new URLSearchParams({ q: 'search', pageSize: '1000' })
  if (pageToken) p.set('pageToken', pageToken)
  // Rest.li-syntax voor het filter; URLSearchParams zou de haakjes en dubbele punten stukmaken.
  return `adAccounts?${p}&search=(status:(values:List(ACTIVE)))`
}

export function leesLinkedinAccounts(json: LinkedinAccountsAntwoord): LinkedinAccount[] {
  const uit: LinkedinAccount[] = []
  for (const r of json.elements ?? []) {
    if (r.id == null || r.test) continue
    if (r.status && r.status !== 'ACTIVE') continue
    const id = String(r.id)
    uit.push({ id, naam: r.name?.trim() || id, munt: r.currency ?? 'USD' })
  }
  return uit
}

/** Alle actieve advertentieaccounts waar dit LinkedIn-account bij kan. */
export async function haalLinkedinAccounts(toegang: string): Promise<LinkedinAccount[]> {
  const alles: LinkedinAccount[] = []
  const gezien = new Set<string>()
  let token: string | undefined
  for (let n = 0; n < 20; n++) {
    const json = (await linkedinGet(accountsPad(token), toegang)) as LinkedinAccountsAntwoord
    for (const a of leesLinkedinAccounts(json)) {
      if (gezien.has(a.id)) continue
      gezien.add(a.id)
      alles.push(a)
    }
    token = json.metadata?.nextPageToken
    if (!token) break
  }
  return alles.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
}

/* ------------------------------ Dagcijfers ------------------------------- */

export function linkedinAccountId(invoer: string): string {
  const n = invoer.trim().replace(/^urn:li:sponsoredAccount:/, '')
  if (!/^\d{5,25}$/.test(n)) throw new KoppelingFout('Een LinkedIn-advertentieaccount is een getal, zoals 512345678.')
  return n
}

const datumDeel = (d: string) => {
  const [y, m, dag] = d.split('-').map(Number)
  return `(year:${y},month:${m},day:${dag})`
}

/** Per dag de totalen van één account: impressies, klikken, kosten en conversies op de website. */
export function analyticsPad(accountId: string, van: string, tot: string): string {
  const urn = encodeURIComponent(`urn:li:sponsoredAccount:${accountId}`)
  return (
    `adAnalytics?q=analytics&pivot=ACCOUNT&timeGranularity=DAILY` +
    `&dateRange=(start:${datumDeel(van)},end:${datumDeel(tot)})` +
    `&accounts=List(${urn})` +
    `&fields=dateRange,impressions,clicks,costInLocalCurrency,externalWebsiteConversions`
  )
}

type AnalyticsRij = {
  dateRange?: { start?: { year?: number; month?: number; day?: number } }
  impressions?: number | string
  clicks?: number | string
  costInLocalCurrency?: string | number
  externalWebsiteConversions?: number | string
}
export type LinkedinAnalyticsAntwoord = { elements?: AnalyticsRij[] }

/** LinkedIn geeft de kosten als tekst in de munt van het account ("12.34"); wij rekenen in centen, zonder float. */
export function kostenNaarCenten(kosten: string | number | undefined | null): number {
  if (kosten == null || kosten === '') return 0
  const centen = parseAmountToCents(String(kosten))
  if (centen === null) throw new KoppelingFout(`LinkedIn gaf een onleesbaar bedrag terug: ${String(kosten)}`)
  return centen
}

export function leesLinkedin(json: LinkedinAnalyticsAntwoord): Dagcijfers[] {
  const per = new Map<string, Dagcijfers>()
  for (const r of json.elements ?? []) {
    const s = r.dateRange?.start
    if (!s?.year || !s.month || !s.day) continue
    const day = `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`
    const oud = per.get(day) ?? { day, bron: 'linkedin' as const, impressions: 0, clicks: 0, conversions: 0, costCents: 0 }
    oud.impressions = (oud.impressions ?? 0) + Math.round(Number(r.impressions ?? 0))
    oud.clicks = (oud.clicks ?? 0) + Math.round(Number(r.clicks ?? 0))
    oud.conversions = (oud.conversions ?? 0) + Math.round(Number(r.externalWebsiteConversions ?? 0))
    oud.costCents = (oud.costCents ?? 0) + kostenNaarCenten(r.costInLocalCurrency)
    per.set(day, oud)
  }
  return [...per.values()].sort((a, b) => a.day.localeCompare(b.day))
}

export function controleerMunt(account: { currency?: string }) {
  if (account.currency && account.currency !== 'EUR') {
    throw new KoppelingFout(`Dit advertentieaccount rekent in ${account.currency}; het portaal toont euro's. Koppel een account in euro's.`)
  }
}

/** Dagcijfers van één advertentieaccount, met het token van een verbonden LinkedIn-account. */
export async function haalLinkedin(accountId: string, van: string, tot: string, toegang: string): Promise<Dagcijfers[]> {
  const id = linkedinAccountId(accountId)
  // Eerst het account zelf: dat zegt de munt, en meteen of we erbij mogen.
  controleerMunt((await linkedinGet(`adAccounts/${id}`, toegang)) as { currency?: string })
  return leesLinkedin((await linkedinGet(analyticsPad(id, van, tot), toegang)) as LinkedinAnalyticsAntwoord)
}
