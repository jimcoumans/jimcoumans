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
  const codes = (fout?.error?.details ?? []).flatMap((d) => d.errors ?? []).flatMap((e) => Object.values(e.errorCode ?? {}))
  const melding = fout?.error?.message ?? `fout ${status}`
  const heeft = (code: string) => codes.includes(code)

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

/**
 * Dagcijfers van één klantaccount. Het toegangstoken is van een verbonden
 * Google-account dat bij het MCC kan.
 */
export async function haalGoogleAds(klantId: string, van: string, tot: string, toegang: string, env = process.env): Promise<Dagcijfers[]> {
  const inst = googleAdsInstellingen(env)
  if (!inst.klaar) throw new KoppelingFout(`Google Ads is nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  const id = googleAdsKlantId(klantId)
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
      body: JSON.stringify({ query: gaql(van, tot) }),
      signal: stop.signal,
    })
    const tekst = await antwoord.text()
    let json: unknown = null
    try {
      json = JSON.parse(tekst)
    } catch {
      /* geen JSON */
    }
    if (!antwoord.ok) throw leesGoogleAdsFout(antwoord.status, json ?? { error: { message: tekst.slice(0, 200) } })
    controleerMunt(json as GoogleAdsAntwoord)
    return leesGoogleAds(json as GoogleAdsAntwoord)
  } catch (e) {
    if (e instanceof KoppelingFout) throw e
    if ((e as Error).name === 'AbortError') throw new KoppelingFout('Google Ads reageerde niet binnen 15 seconden.')
    throw new KoppelingFout(`Google Ads niet bereikbaar: ${(e as Error).message}`)
  } finally {
    clearTimeout(t)
  }
}
