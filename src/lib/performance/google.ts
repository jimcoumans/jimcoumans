import { createSign } from 'node:crypto'
import { bronVoorGa4, type Bron } from './bronnen'

/* -------------------------------------------------------------------------
   GA4 en Search Console, via één serviceaccount.

   James Robinson voegt het e-mailadres van het serviceaccount bij elke klant
   toe als lezer (GA4) en als gebruiker (Search Console). Geen wachtwoorden
   per klant, geen inlogscherm: het portaal tekent zelf een token met de
   sleutel uit GOOGLE_SERVICE_ACCOUNT_JSON (in de instellingen van Netlify).
   ------------------------------------------------------------------------- */

export class KoppelingFout extends Error {}

type Sleutel = { client_email: string; private_key: string }

/** De sleutel uit de omgeving. Mag de JSON zelf zijn of base64 daarvan. */
export function leesSleutel(ruw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON): Sleutel {
  if (!ruw?.trim()) throw new KoppelingFout('Het serviceaccount is nog niet ingesteld: GOOGLE_SERVICE_ACCOUNT_JSON ontbreekt in Netlify.')
  let tekst = ruw.trim()
  if (!tekst.startsWith('{')) tekst = Buffer.from(tekst, 'base64').toString('utf8')
  try {
    const json = JSON.parse(tekst) as Partial<Sleutel>
    if (!json.client_email || !json.private_key) throw new Error()
    return { client_email: json.client_email, private_key: json.private_key }
  } catch {
    throw new KoppelingFout('GOOGLE_SERVICE_ACCOUNT_JSON is geen geldige sleutel. Plak het hele JSON-bestand van het serviceaccount.')
  }
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

/** Een ondertekende aanvraag voor een toegangstoken (JWT-bearer, RS256). */
export function maakAssertion(sleutel: Sleutel, scopes: string[], nu = Math.floor(Date.now() / 1000)): string {
  const kop = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const inhoud = b64url(
    JSON.stringify({ iss: sleutel.client_email, scope: scopes.join(' '), aud: 'https://oauth2.googleapis.com/token', iat: nu, exp: nu + 3600 }),
  )
  const teken = createSign('RSA-SHA256').update(`${kop}.${inhoud}`).sign(sleutel.private_key)
  return `${kop}.${inhoud}.${b64url(teken)}`
}

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly']
let bewaard: { token: string; tot: number } | null = null

async function haalJson(url: string, init: RequestInit, wat: string): Promise<unknown> {
  const stop = new AbortController()
  const t = setTimeout(() => stop.abort(), 15000)
  try {
    const antwoord = await fetch(url, { ...init, signal: stop.signal })
    const tekst = await antwoord.text()
    let json: unknown = null
    try {
      json = JSON.parse(tekst)
    } catch {
      /* geen JSON */
    }
    if (!antwoord.ok) {
      const melding = (json as { error?: { message?: string } } | null)?.error?.message ?? tekst.slice(0, 200)
      if (antwoord.status === 403) throw new KoppelingFout(`${wat}: geen toegang. Heeft het gekoppelde account (of het serviceaccount) toegang tot deze klant? (${melding})`)
      if (antwoord.status === 404) throw new KoppelingFout(`${wat}: niet gevonden. Klopt het nummer of adres? (${melding})`)
      throw new KoppelingFout(`${wat} gaf fout ${antwoord.status}: ${melding}`)
    }
    return json
  } catch (e) {
    if (e instanceof KoppelingFout) throw e
    if ((e as Error).name === 'AbortError') throw new KoppelingFout(`${wat} reageerde niet binnen 15 seconden.`)
    throw new KoppelingFout(`${wat} niet bereikbaar: ${(e as Error).message}`)
  } finally {
    clearTimeout(t)
  }
}

async function token(): Promise<string> {
  if (bewaard && bewaard.tot > Date.now() + 60000) return bewaard.token
  const assertion = maakAssertion(leesSleutel(), SCOPES)
  const json = (await haalJson(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    },
    'Inloggen bij Google',
  )) as { access_token: string; expires_in: number }
  bewaard = { token: json.access_token, tot: Date.now() + json.expires_in * 1000 }
  return json.access_token
}

export type Dagcijfers = { day: string; bron: Bron; impressions?: number; clicks?: number; sessions?: number; conversions?: number; costCents?: number }

/* ------------------------------ GA4 -------------------------------------- */

/** "properties/123456", "123456" of "G-..."? Alleen het nummer werkt bij de Data API. */
export function ga4PropertyId(invoer: string): string {
  const n = invoer.trim().replace(/^properties\//, '')
  if (!/^\d{6,12}$/.test(n)) {
    throw new KoppelingFout(
      /^G-/i.test(n)
        ? 'Dat is een meet-ID (G-...). Nodig is het property-ID: een getal van 9 cijfers, te vinden in GA4 onder Beheer → Property-details.'
        : 'Een GA4-property-ID is een getal, zoals 412345678.',
    )
  }
  return n
}

type Ga4Antwoord = { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] }

/** Het GA4-antwoord als dagcijfers per bron. Dimensies: datum, bron, medium, kanaal. */
export function leesGa4(json: Ga4Antwoord): Dagcijfers[] {
  const per = new Map<string, Dagcijfers>()
  for (const r of json.rows ?? []) {
    const [datum, source, medium, channel] = r.dimensionValues.map((d) => d.value)
    if (!datum || !/^\d{8}$/.test(datum)) continue
    const day = `${datum.slice(0, 4)}-${datum.slice(4, 6)}-${datum.slice(6, 8)}`
    const bron = bronVoorGa4({ source: source ?? '', medium: medium ?? '', channel: channel ?? '' })
    const sleutel = `${day}|${bron}`
    const oud = per.get(sleutel) ?? { day, bron, sessions: 0, conversions: 0 }
    oud.sessions = (oud.sessions ?? 0) + Math.round(Number(r.metricValues[0]?.value ?? 0))
    oud.conversions = (oud.conversions ?? 0) + Math.round(Number(r.metricValues[1]?.value ?? 0))
    per.set(sleutel, oud)
  }
  return [...per.values()]
}

/** Zonder token gaat het via het serviceaccount; met token via een verbonden Google-account. */
export async function haalGa4(property: string, van: string, tot: string, toegang?: string): Promise<Dagcijfers[]> {
  const id = ga4PropertyId(property)
  const bearer = toegang ?? (await token())
  const vraag = (conversie: string) => ({
    dateRanges: [{ startDate: van, endDate: tot }],
    dimensions: [{ name: 'date' }, { name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: conversie }],
    limit: 100000,
  })
  const doe = async (conversie: string) =>
    leesGa4(
      (await haalJson(
        `https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`,
        { method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, body: JSON.stringify(vraag(conversie)) },
        'Google Analytics',
      )) as Ga4Antwoord,
    )
  try {
    // "Key events" heette tot 2024 "conversions"; oudere properties kennen soms alleen de oude naam.
    return await doe('keyEvents')
  } catch (e) {
    if (e instanceof KoppelingFout && /keyEvents/.test(e.message)) return doe('conversions')
    throw e
  }
}

/* ------------------------------ Search Console --------------------------- */

/** "https://www.thiessen.nl/" of "sc-domain:thiessen.nl", precies zoals in Search Console. */
export function searchConsoleSite(invoer: string): string {
  const s = invoer.trim()
  if (/^sc-domain:[a-z0-9.-]+$/i.test(s)) return s.toLowerCase()
  if (/^https?:\/\/[^\s]+$/i.test(s)) return s.endsWith('/') ? s : `${s}/`
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)) return `sc-domain:${s.toLowerCase()}`
  throw new KoppelingFout('Vul de site in zoals in Search Console: https://www.klant.nl/ of klant.nl voor een domein.')
}

type ScAntwoord = { rows?: { keys: string[]; clicks: number; impressions: number }[] }

export function leesSearchConsole(json: ScAntwoord): Dagcijfers[] {
  return (json.rows ?? [])
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.keys[0] ?? ''))
    .map((r) => ({ day: r.keys[0]!, bron: 'organisch_zoeken' as const, impressions: Math.round(r.impressions), clicks: Math.round(r.clicks) }))
}

export async function haalSearchConsole(site: string, van: string, tot: string, toegang?: string): Promise<Dagcijfers[]> {
  const s = searchConsoleSite(site)
  const bearer = toegang ?? (await token())
  return leesSearchConsole(
    (await haalJson(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(s)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: van, endDate: tot, dimensions: ['date'], rowLimit: 25000, dataState: 'all' }),
      },
      'Search Console',
    )) as ScAntwoord,
  )
}

/** Het e-mailadres van het serviceaccount, om bij klanten als lezer toe te voegen. */
export function serviceaccountAdres(): string | null {
  try {
    return leesSleutel().client_email
  } catch {
    return null
  }
}
