/* -------------------------------------------------------------------------
   De bronnen zoals wij ze tonen, en hoe de cijfers van elk platform daarin
   vallen. Puur rekenwerk, zonder database: te testen, en in het dashboard,
   de sync en de overall-view hetzelfde.
   ------------------------------------------------------------------------- */

export type Bron =
  | 'google_ads'
  | 'meta'
  | 'linkedin'
  | 'tiktok'
  | 'overige_ads'
  | 'organisch_zoeken'
  | 'organisch_social'
  | 'email'
  | 'verwijzing'
  | 'direct'
  | 'overig'

/** In deze volgorde in elke tabel: eerst betaald, dan organisch, dan de rest. */
/** De bron staat altijd met naam in beeld, dus geen kleur per bron: elf kleuren zijn niet uit elkaar te houden. */
export const BRONNEN: { bron: Bron; label: string; betaald: boolean }[] = [
  { bron: 'google_ads', label: 'Google Ads', betaald: true },
  { bron: 'meta', label: 'Meta (Facebook, Instagram)', betaald: true },
  { bron: 'linkedin', label: 'LinkedIn Ads', betaald: true },
  { bron: 'tiktok', label: 'TikTok Ads', betaald: true },
  { bron: 'overige_ads', label: 'Overige advertenties', betaald: true },
  { bron: 'organisch_zoeken', label: 'Organisch zoeken', betaald: false },
  { bron: 'organisch_social', label: 'Organische social', betaald: false },
  { bron: 'email', label: 'E-mail', betaald: false },
  { bron: 'verwijzing', label: 'Verwijzende websites', betaald: false },
  { bron: 'direct', label: 'Direct', betaald: false },
  { bron: 'overig', label: 'Overig', betaald: false },
]

export const BRON_LABEL = Object.fromEntries(BRONNEN.map((b) => [b.bron, b.label])) as Record<Bron, string>

export function isBron(s: string): s is Bron {
  return BRONNEN.some((b) => b.bron === s)
}

const BETAALD_MEDIUM = /^(cpc|ppc|cpm|cpv|cpa|paid|paidsearch|paid[_ -]?search|paid[_ -]?social|paidsocial|display|banner|ads?|retargeting|remarketing)$/
const BETAALD_KANAAL = /^(paid |cross-network|display$)/i

/**
 * Welke bron een GA4-bezoek is, uit bron, medium en het standaardkanaal
 * van GA4. Eerst betaald of niet, dan welk platform: een bezoek van
 * "facebook / cpc" is Meta-advertentie, "facebook / referral" organische social.
 */
export function bronVoorGa4(r: { source: string; medium: string; channel: string }): Bron {
  const source = r.source.trim().toLowerCase()
  const medium = r.medium.trim().toLowerCase()
  const channel = r.channel.trim()

  const betaald = BETAALD_MEDIUM.test(medium) || BETAALD_KANAAL.test(channel)
  if (betaald) {
    if (/google|youtube|dv360|doubleclick|gdn/.test(source)) return 'google_ads'
    if (/facebook|instagram|^fb$|^ig$|meta|messenger|audience_network/.test(source)) return 'meta'
    if (/linkedin|lnkd/.test(source)) return 'linkedin'
    if (/tiktok/.test(source)) return 'tiktok'
    return 'overige_ads'
  }

  if (/^email$|^e-mail$|newsletter|nieuwsbrief|mailing/.test(medium) || /mailerlite|mailchimp|newsletter/.test(source) || channel === 'Email') return 'email'
  if (channel === 'Organic Search' || medium === 'organic') return 'organisch_zoeken'
  if (channel === 'Organic Social' || channel === 'Organic Video' || /facebook|instagram|linkedin|lnkd|tiktok|youtube|pinterest|twitter|^t\.co$|^x\.com$/.test(source))
    return 'organisch_social'
  if (channel === 'Direct' || (source === '(direct)' && /\(none\)|\(not set\)/.test(medium))) return 'direct'
  if (channel === 'Referral' || medium === 'referral') return 'verwijzing'
  return 'overig'
}

/* ------------------------------ Optellen --------------------------------- */

export type Cijfers = { impressies: number; klikken: number; bezoeken: number; conversies: number; kostenCents: number }

export const NUL: Cijfers = { impressies: 0, klikken: 0, bezoeken: 0, conversies: 0, kostenCents: 0 }

export type DagRij = {
  day: string
  bron: string
  impressions: number | null
  clicks: number | null
  sessions: number | null
  conversions: number | null
  costCents: number | null
}

export function telOp(a: Cijfers, r: DagRij): Cijfers {
  return {
    impressies: a.impressies + (r.impressions ?? 0),
    klikken: a.klikken + (r.clicks ?? 0),
    bezoeken: a.bezoeken + (r.sessions ?? 0),
    conversies: a.conversies + (r.conversions ?? 0),
    kostenCents: a.kostenCents + (r.costCents ?? 0),
  }
}

/** Totaal en per bron, in de vaste volgorde, alleen bronnen met iets erin. */
export function perBron(rijen: DagRij[]): { totaal: Cijfers; bronnen: { bron: Bron; label: string; betaald: boolean; cijfers: Cijfers }[] } {
  const per = new Map<string, Cijfers>()
  let totaal = NUL
  for (const r of rijen) {
    per.set(r.bron, telOp(per.get(r.bron) ?? NUL, r))
    totaal = telOp(totaal, r)
  }
  const bronnen = BRONNEN.filter((b) => per.has(b.bron))
    .map((b) => ({ bron: b.bron, label: b.label, betaald: b.betaald, cijfers: per.get(b.bron)! }))
    .filter((b) => Object.values(b.cijfers).some((v) => v > 0))
  return { totaal, bronnen }
}

/** Per dag opgeteld, met lege dagen als nul, voor een lijn die niet liegt over gaten. */
export function perDag(rijen: DagRij[], van: string, tot: string): { day: string; cijfers: Cijfers }[] {
  const per = new Map<string, Cijfers>()
  for (const r of rijen) per.set(r.day, telOp(per.get(r.day) ?? NUL, r))
  const uit: { day: string; cijfers: Cijfers }[] = []
  for (let d = new Date(`${van}T00:00:00Z`); d <= new Date(`${tot}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const dag = d.toISOString().slice(0, 10)
    uit.push({ day: dag, cijfers: per.get(dag) ?? NUL })
  }
  return uit
}

/** Conversieratio in procenten van de bezoeken, of null als er geen bezoeken zijn. */
export function conversieratio(c: Cijfers): number | null {
  return c.bezoeken > 0 ? (c.conversies / c.bezoeken) * 100 : null
}

/* ------------------------------ Periodes --------------------------------- */

export type Periode = 'deze_maand' | 'vorige_maand' | '30_dagen' | '90_dagen' | 'dit_jaar'

export const PERIODES: { periode: Periode; label: string }[] = [
  { periode: '30_dagen', label: 'Laatste 30 dagen' },
  { periode: 'deze_maand', label: 'Deze maand' },
  { periode: 'vorige_maand', label: 'Vorige maand' },
  { periode: '90_dagen', label: 'Laatste 90 dagen' },
  { periode: 'dit_jaar', label: 'Dit jaar' },
]

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Van en tot (beide inclusief) als JJJJ-MM-DD, plus dezelfde lengte ervoor om mee te vergelijken. */
export function periodeGrenzen(p: Periode, vandaag: Date = new Date()): { van: string; tot: string; vorigeVan: string; vorigeTot: string } {
  const j = vandaag.getUTCFullYear()
  const m = vandaag.getUTCMonth()
  const dag = new Date(Date.UTC(j, m, vandaag.getUTCDate()))
  let van: Date
  let tot: Date
  switch (p) {
    case 'deze_maand':
      van = new Date(Date.UTC(j, m, 1))
      tot = dag
      break
    case 'vorige_maand':
      van = new Date(Date.UTC(j, m - 1, 1))
      tot = new Date(Date.UTC(j, m, 0))
      break
    case '90_dagen':
      tot = dag
      van = new Date(dag.getTime() - 89 * 86400000)
      break
    case 'dit_jaar':
      van = new Date(Date.UTC(j, 0, 1))
      tot = dag
      break
    default:
      tot = dag
      van = new Date(dag.getTime() - 29 * 86400000)
  }
  const lengte = Math.round((tot.getTime() - van.getTime()) / 86400000) + 1
  const vorigeTot = new Date(van.getTime() - 86400000)
  const vorigeVan = new Date(vorigeTot.getTime() - (lengte - 1) * 86400000)
  return { van: iso(van), tot: iso(tot), vorigeVan: iso(vorigeVan), vorigeTot: iso(vorigeTot) }
}
