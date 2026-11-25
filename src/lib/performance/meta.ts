import { parseAmountToCents } from '@/lib/money'
import { KoppelingFout, type Dagcijfers } from './google'

/* -------------------------------------------------------------------------
   Meta Ads (Facebook en Instagram), via de Business Manager van James Robinson.

   Geen inlogscherm en geen OAuth-flow: een systeemgebruiker in Business
   Manager heeft een blijvend token met alleen leesrecht op advertenties
   (ads_read). Dat token staat in Netlify als META_ACCESS_TOKEN. Elk
   advertentieaccount waar de Business Manager bij kan, is dan op te halen
   met zijn act_-nummer uit de koppeling.
   ------------------------------------------------------------------------- */

/**
 * De Marketing API gaat een stuk korter mee dan de Graph API met hetzelfde
 * nummer; zie developers.facebook.com/docs/graph-api/changelog.
 */
const API_VERSIE = 'v26.0'

/** Meer regels per pagina dan de standaard 25, zodat vier maanden in één keer passen. */
const PER_PAGINA = 500

/* ------------------------------ Instellingen ----------------------------- */

export function metaInstellingen(env: Record<string, string | undefined> = process.env) {
  const ontbreekt = ['META_ACCESS_TOKEN'].filter((n) => !env[n]?.trim())
  return { klaar: ontbreekt.length === 0, ontbreekt, token: env.META_ACCESS_TOKEN?.trim() ?? '' }
}

/** "act_123" of "123": de API wil act_ met het nummer. */
export function metaAccountId(invoer: string): string {
  const n = invoer.trim().replace(/^act_/, '')
  if (!/^\d{6,20}$/.test(n)) throw new KoppelingFout('Een Meta-advertentieaccount is act_ gevolgd door cijfers.')
  return `act_${n}`
}

/* ------------------------------ Conversies ------------------------------- */

/*
   Welke acties van Meta we een conversie noemen.

   Meta geeft per dag een lijst acties, en dezelfde gebeurtenis staat daar
   vaak twee keer in: één keer als pixel-event (offsite_conversion.fb_pixel_
   purchase) en één keer opgeteld over pixel, app en winkel (purchase). We
   tellen daarom:

   - de opgetelde soorten die een echte conversie zijn: aanvraag (lead),
     aankoop (purchase), registratie (complete_registration), contact en
     afspraak (schedule);
   - de pixel- en custom-conversies (offsite_conversion.*) die daar NIET al
     in zitten, zoals een custom conversie op een bedankpagina;
   - nooit de tussenstappen van een funnel (bekeken, in winkelwagen, naar
     de kassa), en nooit de omni_*-varianten: die zijn weer een optelling.

   Het dashboard rekent uiteindelijk met de conversies uit GA4 (zie
   resultaten/bereken.ts); dit cijfer is wat Meta er zelf van zegt.
 */
const CONVERSIE_SOORTEN = new Set(['lead', 'purchase', 'complete_registration', 'contact', 'schedule'])
const FUNNEL_STAPPEN = new Set(['view_content', 'add_to_cart', 'initiate_checkout', 'add_payment_info', 'add_to_wishlist', 'search', 'page_view', 'landing_page_view'])

export function isConversie(actionType: string): boolean {
  if (CONVERSIE_SOORTEN.has(actionType)) return true
  if (!actionType.startsWith('offsite_conversion.')) return false
  const rest = actionType.slice('offsite_conversion.'.length)
  const pixel = rest.startsWith('fb_pixel_') ? rest.slice('fb_pixel_'.length) : null
  if (pixel && (CONVERSIE_SOORTEN.has(pixel) || FUNNEL_STAPPEN.has(pixel))) return false
  return true
}

type Actie = { action_type?: string; value?: string | number }

export function telConversies(acties: Actie[] | undefined): number {
  let n = 0
  for (const a of acties ?? []) {
    if (!a.action_type || !isConversie(a.action_type)) continue
    n += Math.round(Number(a.value ?? 0))
  }
  return n
}

/* ------------------------------ Omrekenen -------------------------------- */

/** Meta geeft de uitgaven als tekst in euro's met punt ("12.34"); wij rekenen in centen, zonder float. */
export function spendNaarCenten(spend: string | number | undefined | null): number {
  if (spend == null || spend === '') return 0
  const centen = parseAmountToCents(String(spend))
  if (centen === null) throw new KoppelingFout(`Meta gaf een onleesbaar bedrag terug: ${String(spend)}`)
  return centen
}

type MetaRij = {
  date_start?: string
  impressions?: string | number
  clicks?: string | number
  spend?: string | number
  actions?: Actie[]
  account_currency?: string
}

export type MetaAntwoord = { data?: MetaRij[]; paging?: { next?: string }; error?: MetaFout['error'] }

/** Eén pagina van de lijst advertentieaccounts van de systeemgebruiker. */
export type MetaAccountsAntwoord = { data?: MetaAccountRij[]; paging?: { next?: string }; error?: MetaFout['error'] }

/** Eén pagina van de lijst campagnes van een advertentieaccount. */
export type MetaCampagnesAntwoord = { data?: MetaCampagneRij[]; paging?: { next?: string }; error?: MetaFout['error'] }

/** Eén pagina van het antwoord als dagcijfers voor de bron meta; per dag opgeteld. */
export function leesMeta(json: MetaAntwoord): Dagcijfers[] {
  const per = new Map<string, Dagcijfers>()
  for (const r of json.data ?? []) {
    const day = r.date_start
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
    const oud = per.get(day) ?? { day, bron: 'meta' as const, impressions: 0, clicks: 0, conversions: 0, costCents: 0 }
    oud.impressions = (oud.impressions ?? 0) + Math.round(Number(r.impressions ?? 0))
    oud.clicks = (oud.clicks ?? 0) + Math.round(Number(r.clicks ?? 0))
    oud.conversions = (oud.conversions ?? 0) + telConversies(r.actions)
    oud.costCents = (oud.costCents ?? 0) + spendNaarCenten(r.spend)
    per.set(day, oud)
  }
  return [...per.values()].sort((a, b) => a.day.localeCompare(b.day))
}

/** Twee pagina's met dezelfde dag erin: optellen, niet dubbel bewaren. */
export function voegSamen(paginas: Dagcijfers[][]): Dagcijfers[] {
  const per = new Map<string, Dagcijfers>()
  for (const r of paginas.flat()) {
    const oud = per.get(r.day)
    if (!oud) {
      per.set(r.day, { ...r })
      continue
    }
    oud.impressions = (oud.impressions ?? 0) + (r.impressions ?? 0)
    oud.clicks = (oud.clicks ?? 0) + (r.clicks ?? 0)
    oud.conversions = (oud.conversions ?? 0) + (r.conversions ?? 0)
    oud.costCents = (oud.costCents ?? 0) + (r.costCents ?? 0)
  }
  return [...per.values()].sort((a, b) => a.day.localeCompare(b.day))
}

export function controleerMunt(json: MetaAntwoord) {
  const munt = (json.data ?? []).find((r) => r.account_currency)?.account_currency
  if (munt && munt !== 'EUR') throw new KoppelingFout(`Dit advertentieaccount rekent in ${munt}; het portaal toont euro's. Koppel een account in euro's.`)
}

/* ------------------------------ Fouten ----------------------------------- */

type MetaFout = { error?: { message?: string; type?: string; code?: number; error_subcode?: number } }

/** De foutcodes van Meta in gewone taal. */
export function leesMetaFout(status: number, body: unknown): KoppelingFout {
  const fout = (body as MetaFout | null)?.error
  const code = fout?.code
  const melding = fout?.message ?? `fout ${status}`
  if (code === 190) return new KoppelingFout('META_ACCESS_TOKEN is verlopen of ingetrokken. Maak in Business Manager bij de systeemgebruiker een nieuw token (ads_read) en zet het in Netlify.')
  if (code === 10 || code === 200 || code === 272 || code === 3)
    return new KoppelingFout(`Meta weigert de toegang: de systeemgebruiker mist het recht ads_read op dit account, of de app heeft de Ads-toegang niet. (${melding})`)
  if (code === 100 && fout?.error_subcode === 33)
    return new KoppelingFout('Meta kent dit advertentieaccount niet, of onze Business Manager heeft er geen toegang toe. Voeg het account toe aan de Business Manager en geef de systeemgebruiker leesrecht.')
  if (code === 17 || code === 4 || code === 32 || code === 613) return new KoppelingFout(`Meta vindt dat we te veel vragen; de volgende ronde gaat het verder. (${melding})`)
  if (status === 404) return new KoppelingFout(`Meta kent dit advertentieaccount niet. Klopt het act_-nummer? (${melding})`)
  return new KoppelingFout(`Meta gaf fout ${status}: ${melding}`)
}

/* ------------------------------ Ophalen ---------------------------------- */

/**
 * Het eerste adres; daarna volgen we paging.next tot het op is.
 *
 * Met campagne-ID's vragen we per campagne in plaats van per account en
 * laten we Meta filteren; leesMeta telt de campagnes per dag weer op. Zo
 * tellen voor een klant die via het eigen account van James Robinson
 * adverteert, alleen zijn eigen campagnes mee.
 */
export function insightsUrl(accountId: string, van: string, tot: string, token: string, campagneIds: string[] = []): string {
  const p = new URLSearchParams({
    fields: 'impressions,clicks,spend,actions,account_currency',
    time_increment: '1',
    time_range: JSON.stringify({ since: van, until: tot }),
    level: campagneIds.length ? 'campaign' : 'account',
    limit: String(PER_PAGINA),
    access_token: token,
  })
  if (campagneIds.length) p.set('filtering', JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: campagneIds }]))
  return `https://graph.facebook.com/${API_VERSIE}/${accountId}/insights?${p}`
}

async function haalPagina<T extends MetaAntwoord | MetaAccountsAntwoord | MetaCampagnesAntwoord = MetaAntwoord>(url: string): Promise<T> {
  const stop = new AbortController()
  const t = setTimeout(() => stop.abort(), 15000)
  try {
    const antwoord = await fetch(url, { signal: stop.signal })
    const tekst = await antwoord.text()
    let json: unknown = null
    try {
      json = JSON.parse(tekst)
    } catch {
      /* geen JSON */
    }
    if (!antwoord.ok) throw leesMetaFout(antwoord.status, json ?? { error: { message: tekst.slice(0, 200) } })
    return (json ?? {}) as T
  } catch (e) {
    if (e instanceof KoppelingFout) throw e
    if ((e as Error).name === 'AbortError') throw new KoppelingFout('Meta reageerde niet binnen 15 seconden.')
    throw new KoppelingFout(`Meta niet bereikbaar: ${(e as Error).message}`)
  } finally {
    clearTimeout(t)
  }
}

/** Dagcijfers van één advertentieaccount (of alleen van de gekozen campagnes erin), alle pagina's bij elkaar. */
export async function haalMeta(accountId: string, van: string, tot: string, env: Record<string, string | undefined> = process.env, campagneIds: string[] = []): Promise<Dagcijfers[]> {
  const inst = metaInstellingen(env)
  if (!inst.klaar) throw new KoppelingFout(`Meta Ads is nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  const paginas: Dagcijfers[][] = []
  let url: string | undefined = insightsUrl(metaAccountId(accountId), van, tot, inst.token, campagneIds)
  // Meer dan een handvol pagina's is niet normaal voor dagcijfers; dit voorkomt een eindeloze lus.
  for (let n = 0; url && n < 50; n++) {
    const json: MetaAntwoord = await haalPagina(url)
    controleerMunt(json)
    paginas.push(leesMeta(json))
    url = json.paging?.next
  }
  return voegSamen(paginas)
}

/* ------------------------------ Advertentieaccounts ---------------------- */

/*
   Welke advertentieaccounts de systeemgebruiker kan zien, zodat je bij een
   klant uit een lijst kiest in plaats van een act_-nummer over te typen. Dat
   zijn de accounts van onze Business Manager plus de accounts van klanten
   die ons als partner hebben toegevoegd, mits de systeemgebruiker er
   leesrecht op heeft.
 */

export type MetaAccount = { id: string; naam: string; bedrijf: string; munt: string; actief: boolean }

type MetaAccountRij = { id?: string; account_id?: string; name?: string; account_status?: number; currency?: string; business_name?: string }

/* account_status van Meta: 1 actief, 2 uitgeschakeld, 3 openstaand saldo, 101 gesloten, enzovoort. */
const ACTIEF = 1
const GESLOTEN = new Set([100, 101, 202])

export function accountsUrl(token: string): string {
  const p = new URLSearchParams({ fields: 'id,account_id,name,account_status,currency,business_name', limit: String(PER_PAGINA), access_token: token })
  return `https://graph.facebook.com/${API_VERSIE}/me/adaccounts?${p}`
}

export function leesMetaAccounts(json: MetaAccountsAntwoord): MetaAccount[] {
  const uit: MetaAccount[] = []
  for (const r of json.data ?? []) {
    const nummer = r.account_id ?? r.id?.replace(/^act_/, '')
    if (!nummer || !/^\d{6,20}$/.test(nummer)) continue
    if (r.account_status !== undefined && GESLOTEN.has(r.account_status)) continue
    uit.push({
      id: `act_${nummer}`,
      naam: r.name?.trim() || `act_${nummer}`,
      bedrijf: r.business_name?.trim() || '',
      munt: r.currency ?? 'EUR',
      actief: r.account_status === undefined || r.account_status === ACTIEF,
    })
  }
  return uit
}

/** Alle advertentieaccounts waar de systeemgebruiker bij kan, alle pagina's bij elkaar. */
export async function haalMetaAccounts(env: Record<string, string | undefined> = process.env): Promise<MetaAccount[]> {
  const inst = metaInstellingen(env)
  if (!inst.klaar) throw new KoppelingFout(`Meta Ads is nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  const alles: MetaAccount[] = []
  const gezien = new Set<string>()
  let url: string | undefined = accountsUrl(inst.token)
  for (let n = 0; url && n < 50; n++) {
    const json: MetaAccountsAntwoord = await haalPagina(url)
    for (const a of leesMetaAccounts(json)) {
      if (gezien.has(a.id)) continue
      gezien.add(a.id)
      alles.push(a)
    }
    url = json.paging?.next
  }
  return alles.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
}

/* ------------------------------ Campagnes -------------------------------- */

/*
   Sommige klanten adverteren niet vanuit een eigen advertentieaccount maar
   vanuit dat van James Robinson, naast andere klanten. Dan kies je bij de
   koppeling welke campagnes van dat account bij deze klant horen; alleen
   die tellen mee. Hiervoor de lijst campagnes van een account.
 */

export type MetaCampagne = { id: string; naam: string; actief: boolean; status: string }

type MetaCampagneRij = { id?: string; name?: string; status?: string; effective_status?: string; updated_time?: string }

/* Weg is weg: verwijderde en gearchiveerde campagnes staan niet in de lijst. */
const WEG = new Set(['DELETED', 'ARCHIVED'])

export function campagnesUrl(accountId: string, token: string): string {
  const p = new URLSearchParams({ fields: 'id,name,status,effective_status,updated_time', limit: String(PER_PAGINA), access_token: token })
  return `https://graph.facebook.com/${API_VERSIE}/${accountId}/campaigns?${p}`
}

export function leesMetaCampagnes(json: MetaCampagnesAntwoord): MetaCampagne[] {
  const uit: MetaCampagne[] = []
  for (const r of json.data ?? []) {
    if (!r.id || !/^\d+$/.test(r.id)) continue
    const status = r.effective_status ?? r.status ?? ''
    if (WEG.has(status)) continue
    uit.push({ id: r.id, naam: r.name?.trim() || r.id, actief: status === 'ACTIVE', status })
  }
  return uit
}

/** Alle campagnes van één advertentieaccount, actieve eerst, dan op naam. */
export async function haalMetaCampagnes(accountId: string, env: Record<string, string | undefined> = process.env): Promise<MetaCampagne[]> {
  const inst = metaInstellingen(env)
  if (!inst.klaar) throw new KoppelingFout(`Meta Ads is nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  const alles: MetaCampagne[] = []
  const gezien = new Set<string>()
  let url: string | undefined = campagnesUrl(metaAccountId(accountId), inst.token)
  for (let n = 0; url && n < 50; n++) {
    const json: MetaCampagnesAntwoord = await haalPagina(url)
    for (const c of leesMetaCampagnes(json)) {
      if (gezien.has(c.id)) continue
      gezien.add(c.id)
      alles.push(c)
    }
    url = json.paging?.next
  }
  return alles.sort((a, b) => Number(b.actief) - Number(a.actief) || a.naam.localeCompare(b.naam, 'nl'))
}
