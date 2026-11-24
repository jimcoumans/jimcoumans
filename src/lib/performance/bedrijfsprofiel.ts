import { KoppelingFout } from './google'

/* -------------------------------------------------------------------------
   Google Bedrijfsprofiel: het blok van de klant op Google Maps en in de
   zoekresultaten. Hoe vaak is het gezien, en wat deden mensen: naar de
   website, bellen, route opvragen, een bericht sturen, reserveren.

   Gaat via een verbonden Google-account van James Robinson dat eigenaar of
   beheerder is van het profiel, met het recht business.manage. Google
   geeft de Business Profile API's pas quotum na een aanvraag per
   Cloud-project; staat het quotum nog op 0, dan komt dat als fout terug
   en staat hier wat er te doen is.
   ------------------------------------------------------------------------- */

export const BEDRIJFSPROFIEL_SCOPE = 'https://www.googleapis.com/auth/business.manage'

/** Heeft deze verbinding bij het verbinden het recht voor Bedrijfsprofiel meegekregen? */
export function heeftBedrijfsprofielRecht(scopes: string): boolean {
  return scopes.split(/\s+/).includes(BEDRIJFSPROFIEL_SCOPE)
}

export const OPNIEUW_VERBINDEN = 'Dit Google-account is verbonden zonder het recht voor Bedrijfsprofiel. Verbind het opnieuw onder Beheer → Koppelingen; daarna staan de profielen in de lijst.'

/** "locations/123", "123" of een Maps-adres? Alleen het locatienummer werkt. */
export function bedrijfsprofielLocatieId(invoer: string): string {
  const n = invoer.trim().replace(/^locations\//, '')
  if (!/^\d{5,25}$/.test(n)) throw new KoppelingFout('Het locatienummer van het Bedrijfsprofiel is een getal. Kies het profiel liever uit de lijst.')
  return n
}

/* ------------------------------ Profielen -------------------------------- */

export type Locatie = { id: string; naam: string; plaats: string; website: string }

type AccountsAntwoord = { accounts?: { name?: string; accountName?: string; type?: string }[]; nextPageToken?: string }
type LocatiesAntwoord = {
  locations?: { name?: string; title?: string; websiteUri?: string; storefrontAddress?: { locality?: string; addressLines?: string[] } }[]
  nextPageToken?: string
}

export const LOCATIE_VELDEN = 'name,title,websiteUri,storefrontAddress'

export function accountsUrl(pageToken?: string): string {
  const p = new URLSearchParams({ pageSize: '20' })
  if (pageToken) p.set('pageToken', pageToken)
  return `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?${p}`
}

export function locatiesUrl(account: string, pageToken?: string): string {
  const p = new URLSearchParams({ readMask: LOCATIE_VELDEN, pageSize: '100' })
  if (pageToken) p.set('pageToken', pageToken)
  return `https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations?${p}`
}

export function leesLocaties(json: LocatiesAntwoord): Locatie[] {
  const uit: Locatie[] = []
  for (const l of json.locations ?? []) {
    const id = l.name?.replace(/^locations\//, '') ?? ''
    if (!/^\d+$/.test(id)) continue
    uit.push({
      id,
      naam: l.title?.trim() || `Locatie ${id}`,
      plaats: [l.storefrontAddress?.addressLines?.[0], l.storefrontAddress?.locality].filter(Boolean).join(', '),
      website: l.websiteUri?.trim() ?? '',
    })
  }
  return uit
}

async function haalJson(url: string, token: string, wat: string): Promise<unknown> {
  const stop = new AbortController()
  const t = setTimeout(() => stop.abort(), 15000)
  try {
    const antwoord = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: stop.signal })
    const tekst = await antwoord.text()
    let json: unknown = null
    try {
      json = JSON.parse(tekst)
    } catch {
      /* geen JSON */
    }
    if (!antwoord.ok) {
      console.error(`[bedrijfsprofiel] ${antwoord.status} bij ${wat}: ${tekst.slice(0, 300)}`)
      throw leesBedrijfsprofielFout(antwoord.status, json, wat)
    }
    return json ?? {}
  } catch (e) {
    if (e instanceof KoppelingFout) throw e
    if ((e as Error).name === 'AbortError') throw new KoppelingFout(`${wat} reageerde niet binnen 15 seconden.`)
    throw new KoppelingFout(`${wat} niet bereikbaar: ${(e as Error).message}`)
  } finally {
    clearTimeout(t)
  }
}

/** Alle profielen waar dit Google-account bij kan: per account de locaties, alle pagina's. */
export async function haalLocaties(toegang: string): Promise<Locatie[]> {
  const accounts: string[] = []
  let pagina: string | undefined
  for (let n = 0; n < 20; n++) {
    const json = (await haalJson(accountsUrl(pagina), toegang, 'Bedrijfsprofiel-accounts ophalen')) as AccountsAntwoord
    accounts.push(...(json.accounts ?? []).map((a) => a.name ?? '').filter((n) => /^accounts\/\d+$/.test(n)))
    pagina = json.nextPageToken
    if (!pagina) break
  }
  const alles: Locatie[] = []
  const gezien = new Set<string>()
  for (const account of accounts) {
    let p: string | undefined
    for (let n = 0; n < 50; n++) {
      const json = (await haalJson(locatiesUrl(account, p), toegang, 'Bedrijfsprofielen ophalen')) as LocatiesAntwoord
      for (const l of leesLocaties(json)) {
        if (gezien.has(l.id)) continue
        gezien.add(l.id)
        alles.push(l)
      }
      p = json.nextPageToken
      if (!p) break
    }
  }
  return alles.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
}

/* ------------------------------ Cijfers ---------------------------------- */

/** Eén dag van één profiel. Wat Google voor die dag niet gaf, blijft weg. */
export type BedrijfsprofielCijfers = {
  day: string
  impressionsMaps?: number
  impressionsSearch?: number
  websiteClicks?: number
  callClicks?: number
  directionRequests?: number
  messagingClicks?: number
  bookings?: number
}

/* Welke maten we vragen en in welk veld ze terechtkomen; Maps en zoeken tellen desktop en mobiel samen. */
const MATEN: Record<string, keyof Omit<BedrijfsprofielCijfers, 'day'>> = {
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: 'impressionsMaps',
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: 'impressionsMaps',
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: 'impressionsSearch',
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: 'impressionsSearch',
  WEBSITE_CLICKS: 'websiteClicks',
  CALL_CLICKS: 'callClicks',
  BUSINESS_DIRECTION_REQUESTS: 'directionRequests',
  MESSAGING_CLICKS: 'messagingClicks',
  BUSINESS_BOOKINGS: 'bookings',
}

export function cijfersUrl(locatieId: string, van: string, tot: string): string {
  const p = new URLSearchParams()
  for (const m of Object.keys(MATEN)) p.append('dailyMetrics', m)
  const datum = (naam: string, d: string) => {
    const [j, m, dag] = d.split('-')
    p.set(`dailyRange.${naam}.year`, String(Number(j)))
    p.set(`dailyRange.${naam}.month`, String(Number(m)))
    p.set(`dailyRange.${naam}.day`, String(Number(dag)))
  }
  datum('start_date', van)
  datum('end_date', tot)
  return `https://businessprofileperformance.googleapis.com/v1/locations/${locatieId}:fetchMultiDailyMetricsTimeSeries?${p}`
}

type Datum = { year?: number; month?: number; day?: number }
export type CijfersAntwoord = {
  multiDailyMetricTimeSeries?: {
    dailyMetricTimeSeries?: { dailyMetric?: string; timeSeries?: { datedValues?: { date?: Datum; value?: string | number }[] } }[]
  }[]
}

const twee = (n: number) => String(n).padStart(2, '0')

/** Het antwoord van Google als één regel per dag, met Maps en zoeken opgeteld over desktop en mobiel. */
export function leesBedrijfsprofiel(json: CijfersAntwoord): BedrijfsprofielCijfers[] {
  const per = new Map<string, BedrijfsprofielCijfers>()
  for (const groep of json.multiDailyMetricTimeSeries ?? []) {
    for (const reeks of groep.dailyMetricTimeSeries ?? []) {
      const veld = reeks.dailyMetric ? MATEN[reeks.dailyMetric] : undefined
      if (!veld) continue
      for (const dv of reeks.timeSeries?.datedValues ?? []) {
        const d = dv.date
        if (!d?.year || !d.month || !d.day) continue
        const day = `${d.year}-${twee(d.month)}-${twee(d.day)}`
        const r = per.get(day) ?? { day }
        // Een dag zonder waarde is bij Google een dag met nul; ontbreekt value, dan telt hij als 0.
        r[veld] = (r[veld] ?? 0) + Math.round(Number(dv.value ?? 0))
        per.set(day, r)
      }
    }
  }
  return [...per.values()].sort((a, b) => a.day.localeCompare(b.day))
}

/** Google geeft de cijfers van een dag pas een paar dagen later; de laatste dagen vragen we niet. */
export const VERTRAGING_DAGEN = 3

export async function haalBedrijfsprofiel(locatie: string, van: string, tot: string, toegang: string | undefined, vandaag = new Date()): Promise<BedrijfsprofielCijfers[]> {
  if (!toegang) throw new KoppelingFout('Google Bedrijfsprofiel gaat via een verbonden Google-account. Kies het profiel uit de lijst.')
  const id = bedrijfsprofielLocatieId(locatie)
  const grens = new Date(vandaag.getTime() - VERTRAGING_DAGEN * 86400000).toISOString().slice(0, 10)
  const totGrens = tot < grens ? tot : grens
  if (van > totGrens) return []
  return leesBedrijfsprofiel((await haalJson(cijfersUrl(id, van, totGrens), toegang, 'Google Bedrijfsprofiel')) as CijfersAntwoord)
}

/* ------------------------------ Fouten ----------------------------------- */

type GoogleFout = { error?: { message?: string; status?: string } }

export function leesBedrijfsprofielFout(status: number, body: unknown, wat: string): KoppelingFout {
  const fout = (body as GoogleFout | null)?.error
  const melding = fout?.message ?? `fout ${status}`
  if (status === 429 || /quota/i.test(melding)) {
    return new KoppelingFout(
      `${wat}: Google geeft dit Cloud-project nog geen quotum voor de Business Profile API's (staat op 0 tot Google de aanvraag goedkeurt; vraag Basic API Access aan via het GBP API-contactformulier). (${melding})`,
    )
  }
  if (status === 403 && /insufficient|scope|permission/i.test(melding)) {
    return new KoppelingFout(`${wat}: geen toegang. ${OPNIEUW_VERBINDEN} Is het account geen eigenaar of beheerder van dit profiel, laat de klant het dan uitnodigen. (${melding})`)
  }
  if (status === 401) return new KoppelingFout(`${wat}: de verbinding met Google is verlopen. Verbind het Google-account opnieuw.`)
  if (status === 404) return new KoppelingFout(`${wat}: profiel niet gevonden. Klopt het locatienummer, en kan dit Google-account er nog bij? (${melding})`)
  return new KoppelingFout(`${wat} gaf fout ${status}: ${melding}`)
}
