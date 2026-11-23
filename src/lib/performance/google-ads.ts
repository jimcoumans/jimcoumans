import { KoppelingFout, type Dagcijfers } from './google'

/* -------------------------------------------------------------------------
   Google Ads, via het MCC-account van James Robinson.

   De cijfers komen uit de Google Ads API (REST, searchStream). Inloggen gaat
   met hetzelfde verbonden Google-account als GA4 en Search Console: de scope
   voor Google Ads zit al in de verbinding. Daarnaast wil Google twee dingen
   weten die niet per klant verschillen en daarom in Netlify staan:

   - GOOGLE_ADS_DEVELOPER_TOKEN: de sleutel van ons MCC voor de API
     (Google Ads → MCC → Beheer → API Center).
   - GOOGLE_ADS_LOGIN_CUSTOMER_ID: het nummer van het MCC zelf, zonder
     streepjes. Google wil weten via welk beheerdersaccount we een klant
     bekijken.

   Het klantaccount komt uit de koppeling (external_id, met streepjes zoals
   Google het toont); die moet onder het MCC hangen.
   ------------------------------------------------------------------------- */

/** Versies gaan ongeveer een jaar mee; zie developers.google.com/google-ads/api/docs/sunset-dates. */
const API_VERSIE = 'v26'

/* ------------------------------ Instellingen ----------------------------- */

export function googleAdsInstellingen(env: Record<string, string | undefined> = process.env) {
  const ontbreekt = ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_LOGIN_CUSTOMER_ID'].filter((n) => !env[n]?.trim())
  const mcc = (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? '').replace(/-/g, '').trim()
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim() && !/^\d{10}$/.test(mcc)) ontbreekt.push('GOOGLE_ADS_LOGIN_CUSTOMER_ID (10 cijfers, zonder streepjes)')
  return { klaar: ontbreekt.length === 0, ontbreekt, developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() ?? '', loginCustomerId: mcc }
}

/** "123-456-7890" of "1234567890": de API wil alleen de cijfers. */
export function googleAdsKlantId(invoer: string): string {
  const cijfers = invoer.trim().replace(/-/g, '')
  if (!/^\d{10}$/.test(cijfers)) throw new KoppelingFout('Een Google Ads-klant-ID heeft 10 cijfers, zoals 123-456-7890.')
  return cijfers
}

/* ------------------------------ Omrekenen -------------------------------- */

/**
 * Google rekent in micro's (een miljoenste euro); wij in hele centen. Via
 * BigInt, zonder tussenstap door een float: 1 cent is 10.000 micro's, en
 * een halve cent rondt naar boven.
 */
export function microsNaarCenten(micros: string | number | undefined | null): number {
  if (micros == null || micros === '') return 0
  const tekst = String(micros).trim()
  if (!/^-?\d+$/.test(tekst)) throw new KoppelingFout(`Google Ads gaf een onleesbaar bedrag terug: ${tekst}`)
  const m = BigInt(tekst)
  const negatief = m < 0n
  const abs = negatief ? -m : m
  const centen = (abs + 5000n) / 10000n
  return Number(negatief ? -centen : centen)
}

/** Eén regel uit searchStream: een dag met de totalen van het hele account. */
type AdsRij = {
  segments?: { date?: string }
  metrics?: { impressions?: string | number; clicks?: string | number; conversions?: string | number; costMicros?: string | number }
  customer?: { currencyCode?: string }
}

/** searchStream geeft een lijst van batches, elk met zijn eigen results. */
export type GoogleAdsAntwoord = { results?: AdsRij[] }[] | { results?: AdsRij[] }

/**
 * Het antwoord van Google als dagcijfers voor de bron google_ads. Per dag
 * opgeteld, voor het geval er toch meer regels per dag komen. Conversies
 * zoals Google ze telt bewaren we wel, maar het dashboard rekent met de
 * conversies uit GA4 (zie resultaten/bereken.ts).
 */
export function leesGoogleAds(json: GoogleAdsAntwoord): Dagcijfers[] {
  const batches = Array.isArray(json) ? json : [json]
  const per = new Map<string, Dagcijfers>()
  for (const batch of batches) {
    for (const r of batch.results ?? []) {
      const day = r.segments?.date
      if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
      const oud = per.get(day) ?? { day, bron: 'google_ads' as const, impressions: 0, clicks: 0, conversions: 0, costCents: 0 }
      oud.impressions = (oud.impressions ?? 0) + Math.round(Number(r.metrics?.impressions ?? 0))
      oud.clicks = (oud.clicks ?? 0) + Math.round(Number(r.metrics?.clicks ?? 0))
      oud.conversions = (oud.conversions ?? 0) + Math.round(Number(r.metrics?.conversions ?? 0))
      oud.costCents = (oud.costCents ?? 0) + microsNaarCenten(r.metrics?.costMicros)
      per.set(day, oud)
    }
  }
  return [...per.values()].sort((a, b) => a.day.localeCompare(b.day))
}

/** De munteenheid van het account; het portaal toont euro's, dus iets anders is een fout. */
export function controleerMunt(json: GoogleAdsAntwoord) {
  const batches = Array.isArray(json) ? json : [json]
  const munt = batches.flatMap((b) => b.results ?? []).find((r) => r.customer?.currencyCode)?.customer?.currencyCode
  if (munt && munt !== 'EUR') throw new KoppelingFout(`Dit Google Ads-account rekent in ${munt}; het portaal toont euro's. Koppel een account in euro's.`)
}

/* ------------------------------ Fouten ----------------------------------- */

/** Google weigerde de toegang; met een ander verbonden Google-account lukt het misschien wel. */
export class GoogleAdsToegangFout extends KoppelingFout {}

type AdsFout = {
  error?: {
    code?: number
    message?: string
    status?: string
    details?: { errors?: { errorCode?: Record<string, string>; message?: string }[] }[]
  }
}

/**
 * De foutcodes van Google in gewone taal. De belangrijkste: een developer
 * token op Test-niveau mag alleen testaccounts lezen, en dat staat nergens
 * in beeld behalve in deze fout.
 */
export function leesGoogleAdsFout(status: number, body: unknown): KoppelingFout {
  const fout = (Array.isArray(body) ? body[0] : body) as AdsFout | null
  const geneste = (fout?.error?.details ?? []).flatMap((d) => d.errors ?? [])
  const codes = geneste.flatMap((e) => Object.values(e.errorCode ?? {}))
  // "The caller does not have permission" is een omhulsel; wat er echt
  // aan de hand is, staat in de geneste fouten. Die horen in de melding.
  const melding = [fout?.error?.message ?? `fout ${status}`, ...codes, ...geneste.map((e) => e.message).filter(Boolean)]
    .filter((s, i, a) => s && a.indexOf(s) === i)
    .join(' · ')
  const heeft = (code: string) => codes.includes(code)

  // Sinds september 2026 hangt het toegangsniveau aan het Cloud-project van de
  // OAuth-client, niet meer aan de developer token. Beide varianten vangen we.
  if (heeft('CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION') || heeft('ACTION_NOT_PERMITTED'))
    return new KoppelingFout(
      'Het Google Cloud-project van de OAuth-client (GOOGLE_OAUTH_CLIENT_ID) heeft voor de Google Ads API nog Test-toegang; Google laat dan alleen testaccounts lezen. Vraag in de Cloud Console onder Google Ads API → Overview een hoger niveau aan, of gebruik een OAuth-client uit het project dat al Basic heeft.',
    )
  if (heeft('DEVELOPER_TOKEN_NOT_APPROVED'))
    return new KoppelingFout(
      'De developer token van het MCC staat nog op Test-niveau; Google laat dan alleen testaccounts lezen. Vraag Basic-toegang aan in Google Ads → MCC → Beheer → API Center.',
    )
  if (heeft('DEVELOPER_TOKEN_INVALID') || heeft('MISSING_DEVELOPER_TOKEN') || heeft('DEVELOPER_TOKEN_PROHIBITED'))
    return new KoppelingFout('Google herkent GOOGLE_ADS_DEVELOPER_TOKEN niet. Kopieer de token opnieuw uit het API Center van het MCC en zet hem in Netlify.')
  if (heeft('NOT_ADS_USER'))
    return new GoogleAdsToegangFout('Het verbonden Google-account is geen gebruiker van Google Ads. Verbind onder Koppelingen een account dat bij het MCC kan.')
  if (heeft('USER_PERMISSION_DENIED'))
    return new GoogleAdsToegangFout(
      'Het verbonden Google-account heeft geen toegang tot dit klantaccount via het MCC. Hangt het account onder het MCC, en klopt GOOGLE_ADS_LOGIN_CUSTOMER_ID?',
    )
  if (heeft('CUSTOMER_NOT_ENABLED')) return new KoppelingFout('Dit Google Ads-account is niet actief (geannuleerd of nog niet ingericht).')
  if (heeft('CUSTOMER_NOT_FOUND') || status === 404) return new KoppelingFout(`Google Ads kent dit klant-ID niet. Klopt het nummer? (${melding})`)
  if (heeft('OAUTH_TOKEN_INVALID') || heeft('OAUTH_TOKEN_EXPIRED') || heeft('OAUTH_TOKEN_REVOKED') || status === 401)
    return new GoogleAdsToegangFout('De toegang van het verbonden Google-account is verlopen of ingetrokken. Verbind het opnieuw onder Koppelingen.')
  if (status === 403) return new GoogleAdsToegangFout(`Google Ads: geen toegang. (${melding})`)
  return new KoppelingFout(`Google Ads gaf fout ${status}: ${melding}`)
}

/* ------------------------------ Ophalen ---------------------------------- */

/** De vraag aan Google: per dag de totalen van het account. */
export function gaql(van: string, tot: string): string {
  return [
    'SELECT segments.date, customer.currency_code, metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros',
    'FROM customer',
    `WHERE segments.date BETWEEN '${van}' AND '${tot}'`,
    'ORDER BY segments.date',
  ].join(' ')
}

/** Eén searchStream-aanroep op een account; fouten komen terug als KoppelingFout. */
async function zoek(id: string, query: string, toegang: string, inst: ReturnType<typeof googleAdsInstellingen>): Promise<unknown> {
  const stop = new AbortController()
  const t = setTimeout(() => stop.abort(), 15000)
  try {
    const antwoord = await fetch(`https://googleads.googleapis.com/${API_VERSIE}/customers/${id}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${toegang}`,
        'developer-token': inst.developerToken,
        'login-customer-id': inst.loginCustomerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
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
      // Het hele antwoord in het log van Netlify, voor als de melding niet genoeg zegt.
      console.error(`[google-ads] ${antwoord.status} voor klant ${id}: ${tekst.slice(0, 2000)}`)
      throw leesGoogleAdsFout(antwoord.status, json ?? { error: { message: tekst.slice(0, 200) } })
    }
    return json
  } catch (e) {
    if (e instanceof KoppelingFout) throw e
    if ((e as Error).name === 'AbortError') throw new KoppelingFout('Google Ads reageerde niet binnen 15 seconden.')
    throw new KoppelingFout(`Google Ads niet bereikbaar: ${(e as Error).message}`)
  } finally {
    clearTimeout(t)
  }
}

/** Dagcijfers van één klantaccount, met het token van een verbonden Google-account dat bij het MCC kan. */
export async function haalGoogleAds(klantId: string, van: string, tot: string, toegang: string, env = process.env): Promise<Dagcijfers[]> {
  const inst = googleAdsInstellingen(env)
  if (!inst.klaar) throw new KoppelingFout(`Google Ads is nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  const json = (await zoek(googleAdsKlantId(klantId), gaql(van, tot), toegang, inst)) as GoogleAdsAntwoord
  controleerMunt(json)
  return leesGoogleAds(json)
}

/* ------------------------------ Klantaccounts ---------------------------- */

/*
   Welke accounts onder ons MCC hangen, zodat je bij een klant uit een lijst
   kiest in plaats van een klant-ID over te typen. customer_client geeft de
   hele boom onder het MCC, inclusief het MCC zelf en eventuele sub-MCC's;
   die laten we weg, want daar staan geen campagnes in.
 */

export type GoogleAdsKlant = { id: string; naam: string; munt: string }

type KlantRij = { customerClient?: { id?: string | number; descriptiveName?: string; currencyCode?: string; manager?: boolean; status?: string } }
export type GoogleAdsKlantenAntwoord = { results?: KlantRij[] }[] | { results?: KlantRij[] }

export function klantenGaql(): string {
  return [
    'SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, customer_client.manager, customer_client.status',
    'FROM customer_client',
    "WHERE customer_client.status = 'ENABLED'",
  ].join(' ')
}

/** Met streepjes, zoals Google Ads het zelf toont: 123-456-7890. */
export function toonKlantId(id: string): string {
  return /^\d{10}$/.test(id) ? `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}` : id
}

export function leesGoogleAdsKlanten(json: GoogleAdsKlantenAntwoord): GoogleAdsKlant[] {
  const batches = Array.isArray(json) ? json : [json]
  const klanten: GoogleAdsKlant[] = []
  const gezien = new Set<string>()
  for (const b of batches) {
    for (const r of b.results ?? []) {
      const c = r.customerClient
      if (!c?.id || c.manager) continue
      const id = String(c.id)
      if (gezien.has(id)) continue
      gezien.add(id)
      klanten.push({ id, naam: c.descriptiveName?.trim() || toonKlantId(id), munt: c.currencyCode ?? 'EUR' })
    }
  }
  return klanten.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
}

/** Alle klantaccounts onder het MCC, gezien door het Google-account van dit token. */
export async function haalGoogleAdsKlanten(toegang: string, env = process.env): Promise<GoogleAdsKlant[]> {
  const inst = googleAdsInstellingen(env)
  if (!inst.klaar) throw new KoppelingFout(`Google Ads is nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  return leesGoogleAdsKlanten((await zoek(inst.loginCustomerId, klantenGaql(), toegang, inst)) as GoogleAdsKlantenAntwoord)
}
