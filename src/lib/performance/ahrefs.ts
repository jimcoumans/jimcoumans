import { KoppelingFout } from './google'

/* -------------------------------------------------------------------------
   Ahrefs: hoe sterk de website van een klant staat in Google.

   Geen inlogscherm en geen lijst om uit te kiezen: het "account" is het
   domein van de klant, en Ahrefs kijkt naar elke site, ook zonder toegang.
   De API-sleutel van het Ahrefs-abonnement van James Robinson staat in
   Netlify als AHREFS_API_KEY. Per dag halen we vier standen op: Domain
   Rating, aantal organische zoekwoorden, geschat organisch verkeer en het
   aantal verwijzende domeinen. Elke aanvraag kost eenheden van het
   abonnement (minstens 50 per aanvraag, verder per regel); vier aanvragen
   per klant per nacht is daar een fractie van.
   ------------------------------------------------------------------------- */

const API = 'https://api.ahrefs.com/v3'

/* ------------------------------ Instellingen ----------------------------- */

export function ahrefsInstellingen(env: Record<string, string | undefined> = process.env) {
  const ontbreekt = ['AHREFS_API_KEY'].filter((n) => !env[n]?.trim())
  return { klaar: ontbreekt.length === 0, ontbreekt, token: env.AHREFS_API_KEY?.trim() ?? '' }
}

/**
 * Van wat iemand invult of wat als website bij de klant staat naar het
 * domein zoals Ahrefs het wil: zonder https, www, pad of slash. We kijken
 * altijd naar het domein mét subdomeinen, dus www. hoeft er niet bij.
 */
export function ahrefsDomein(invoer: string): string {
  let s = invoer.trim().toLowerCase()
  s = s.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '')
  s = s.split(/[/?#]/)[0] ?? ''
  s = s.replace(/:\d+$/, '').replace(/\.+$/, '')
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) || s.length > 253) throw new KoppelingFout('Vul het domein van de website in, zoals thiessen.nl.')
  return s
}

/** Het domein uit de website van de klant, of leeg als dat niet lukt; voor het vooraf invullen. */
export function domeinUitWebsite(website: string | null | undefined): string {
  if (!website?.trim()) return ''
  try {
    return ahrefsDomein(website)
  } catch {
    return ''
  }
}

/* ------------------------------ Ophalen ---------------------------------- */

/** Eén dag uit Ahrefs. Een stand die Ahrefs voor die dag niet heeft, blijft weg. */
export type SeoStand = { day: string; domainRating?: number; organicKeywords?: number; organicTraffic?: number; referringDomains?: number }

/* De vier reeksen die we per periode vragen, en in welk veld het antwoord zit. */
const REEKSEN = {
  metrics: { pad: 'site-explorer/metrics-history', lijst: 'metrics', extra: { select: 'date,org_traffic', mode: 'subdomains', volume_mode: 'monthly' } },
  domainRating: { pad: 'site-explorer/domain-rating-history', lijst: 'domain_ratings', extra: {} },
  keywords: { pad: 'site-explorer/keywords-history', lijst: 'keywords', extra: { select: 'date,top3,top4_10,top11_plus', mode: 'subdomains' } },
  refdomains: { pad: 'site-explorer/refdomains-history', lijst: 'refdomains', extra: { mode: 'subdomains' } },
} as const

export type Reeks = keyof typeof REEKSEN

export function ahrefsUrl(reeks: Reeks, domein: string, van: string, tot: string): string {
  const r = REEKSEN[reeks]
  const p = new URLSearchParams({ target: domein, date_from: van, date_to: tot, history_grouping: 'daily', output: 'json', ...r.extra })
  return `${API}/${r.pad}?${p}`
}

type Rij = Record<string, unknown>
export type AhrefsAntwoorden = Partial<Record<Reeks, unknown>>

const getal = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function rijen(json: unknown, lijst: string): Rij[] {
  const l = (json as Record<string, unknown> | null)?.[lijst]
  return Array.isArray(l) ? (l as Rij[]) : []
}

/** De vier antwoorden samen, per dag één stand. Dagen zonder enige waarde vallen weg. */
export function leesSeo(antwoorden: AhrefsAntwoorden): SeoStand[] {
  const per = new Map<string, SeoStand>()
  const dag = (r: Rij): SeoStand | null => {
    const d = typeof r.date === 'string' ? r.date.slice(0, 10) : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
    const s = per.get(d) ?? { day: d }
    per.set(d, s)
    return s
  }
  for (const r of rijen(antwoorden.metrics, REEKSEN.metrics.lijst)) {
    const s = dag(r)
    const v = getal(r.org_traffic)
    if (s && v !== undefined) s.organicTraffic = Math.round(v)
  }
  for (const r of rijen(antwoorden.domainRating, REEKSEN.domainRating.lijst)) {
    const s = dag(r)
    const v = getal(r.domain_rating)
    if (s && v !== undefined) s.domainRating = Math.round(v * 10) / 10
  }
  for (const r of rijen(antwoorden.keywords, REEKSEN.keywords.lijst)) {
    const s = dag(r)
    const delen = [r.top3, r.top4_10, r.top11_plus].map(getal)
    if (s && delen.some((v) => v !== undefined)) s.organicKeywords = Math.round(delen.reduce<number>((a, v) => a + (v ?? 0), 0))
  }
  for (const r of rijen(antwoorden.refdomains, REEKSEN.refdomains.lijst)) {
    const s = dag(r)
    const v = getal(r.refdomains)
    if (s && v !== undefined) s.referringDomains = Math.round(v)
  }
  return [...per.values()].filter((s) => Object.keys(s).length > 1).sort((a, b) => a.day.localeCompare(b.day))
}

/* ------------------------------ Fouten ----------------------------------- */

/** De foutmeldingen van Ahrefs in gewone taal. Ahrefs geeft { "error": "..." }. */
export function leesAhrefsFout(status: number, body: unknown): KoppelingFout {
  const ruw = (body as { error?: unknown } | null)?.error
  const melding = typeof ruw === 'string' ? ruw : ruw ? JSON.stringify(ruw).slice(0, 200) : `fout ${status}`
  if (status === 401) return new KoppelingFout('AHREFS_API_KEY wordt niet geaccepteerd. Maak in Ahrefs onder Account settings → API keys een nieuwe sleutel en zet die in Netlify.')
  if (status === 403) return new KoppelingFout(`Ahrefs weigert de toegang: het abonnement heeft geen API-toegang (meer), of de eenheden van deze maand zijn op. (${melding})`)
  if (status === 429) return new KoppelingFout(`Ahrefs vindt dat we te veel vragen; de volgende ronde gaat het verder. (${melding})`)
  if (status === 400) return new KoppelingFout(`Ahrefs begrijpt de aanvraag niet. Klopt het domein? (${melding})`)
  return new KoppelingFout(`Ahrefs gaf fout ${status}: ${melding}`)
}

async function haalJson(url: string, token: string): Promise<unknown> {
  const stop = new AbortController()
  const t = setTimeout(() => stop.abort(), 15000)
  try {
    const antwoord = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: stop.signal })
    const tekst = await antwoord.text()
    let json: unknown = null
    try {
      json = JSON.parse(tekst)
    } catch {
      /* geen JSON */
    }
    if (!antwoord.ok) {
      console.error(`[ahrefs] ${antwoord.status} op ${url.replace(/token=[^&]+/, '')}: ${tekst.slice(0, 300)}`)
      throw leesAhrefsFout(antwoord.status, json ?? { error: tekst.slice(0, 200) })
    }
    return json ?? {}
  } catch (e) {
    if (e instanceof KoppelingFout) throw e
    if ((e as Error).name === 'AbortError') throw new KoppelingFout('Ahrefs reageerde niet binnen 15 seconden.')
    throw new KoppelingFout(`Ahrefs niet bereikbaar: ${(e as Error).message}`)
  } finally {
    clearTimeout(t)
  }
}

/** De SEO-stand per dag van één domein in een periode: vier aanvragen tegelijk, samengevoegd per dag. */
export async function haalAhrefs(domein: string, van: string, tot: string, env: Record<string, string | undefined> = process.env): Promise<SeoStand[]> {
  const inst = ahrefsInstellingen(env)
  if (!inst.klaar) throw new KoppelingFout(`Ahrefs is nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  const d = ahrefsDomein(domein)
  const reeksen = Object.keys(REEKSEN) as Reeks[]
  const antwoorden = await Promise.all(reeksen.map((r) => haalJson(ahrefsUrl(r, d, van, tot), inst.token)))
  return leesSeo(Object.fromEntries(reeksen.map((r, i) => [r, antwoorden[i]])) as AhrefsAntwoorden)
}

/* ------------------------------ Projecten -------------------------------- */

/** Een project in het Ahrefs-abonnement: de klanten die het team al volgt, om uit te kiezen. */
export type AhrefsProject = { id: string; naam: string; domein: string; url: string }

type ProjectenAntwoord = { projects?: { project_id?: string | number; project_name?: string; url?: string }[] }

export function projectenUrl(): string {
  return `${API}/management/projects?output=json`
}

/** Van de projecten naar iets om uit te kiezen; een project zonder bruikbaar domein valt weg. */
export function leesAhrefsProjecten(json: unknown): AhrefsProject[] {
  const uit: AhrefsProject[] = []
  for (const p of (json as ProjectenAntwoord | null)?.projects ?? []) {
    const domein = domeinUitWebsite(p.url)
    if (!domein || p.project_id == null) continue
    uit.push({ id: String(p.project_id), naam: p.project_name?.trim() || domein, domein, url: (p.url ?? '').replace(/\/$/, '') })
  }
  return uit.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
}

/** Alle projecten in het Ahrefs-abonnement. Kost geen eenheden. */
export async function haalAhrefsProjecten(env: Record<string, string | undefined> = process.env): Promise<AhrefsProject[]> {
  const inst = ahrefsInstellingen(env)
  if (!inst.klaar) throw new KoppelingFout(`Ahrefs is nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  return leesAhrefsProjecten(await haalJson(projectenUrl(), inst.token))
}
