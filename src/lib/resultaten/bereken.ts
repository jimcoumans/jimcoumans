/* -------------------------------------------------------------------------
   De rekenlaag van het tabblad Resultaten. Puur rekenwerk, zonder database:
   dezelfde uitkomst in het klantportaal, in het beheer en in de tests.

   Twee regels lopen overal doorheen.

   1. Elk cijfer komt uit één bron. Bezoekers en conversies komen uit GA4,
      ook als een advertentieplatform zelf conversies telt: anders tel je
      dezelfde aanvraag twee keer. Impressies, klikken en kosten komen uit het
      platform zelf (en impressies in Google zoeken uit Search Console).

   2. Niet gekoppeld is iets anders dan nul. Een cijfer zonder gekoppelde bron
      is null, en het dashboard laat het vak dan grijs zien in plaats van een
      nul die niet waar is.
   ------------------------------------------------------------------------- */

import { BRONNEN, type Bron } from '../performance/bronnen'

export type Provider = 'ga4' | 'search_console' | 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'tiktok_ads'

/** Opgeteld per klant, maand, bron en platform, zoals de database het teruggeeft. */
export type MaandRij = {
  organizationId: string
  maand: string // JJJJ-MM
  bron: string
  provider: Provider
  impressions: number | null
  clicks: number | null
  sessions: number | null
  conversions: number | null
  costCents: number | null
}

/** Welk platform de impressies, klikken en kosten van een bron levert. */
export const IMPRESSIE_BRON: Partial<Record<Bron, Provider>> = {
  google_ads: 'google_ads',
  meta: 'meta_ads',
  linkedin: 'linkedin_ads',
  tiktok: 'tiktok_ads',
  organisch_zoeken: 'search_console',
}

const BETAALDE_PROVIDERS: Provider[] = ['google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads']

export type Kanaal = {
  bron: Bron
  label: string
  betaald: boolean
  /** Er is deze maand iets gebeurd in dit kanaal. */
  actief: boolean
  impressies: number | null
  klikken: number | null
  bezoekers: number | null
  conversies: number | null
  /** Advertentiekosten. Null bij een betaald kanaal zonder koppeling; bij organisch altijd null. */
  kostenCents: number | null
}

export type Cijfers = {
  impressies: number | null
  /** Er zijn actieve kanalen zonder impressiebron: het totaal is een ondergrens. */
  impressiesDeels: boolean
  bezoekers: number | null
  conversies: number | null
  kostenCents: number | null
  /** Bezoekers per impressie (doorklikken). */
  ctr: number | null
  /** Conversies per bezoeker. */
  cvr: number | null
  /** Conversies per impressie, van impressie tot conversie. */
  icr: number | null
  kostenPerConversieCents: number | null
}

const deel = (a: number | null, b: number | null): number | null => (a == null || b == null || b === 0 ? null : a / b)

export const maandPlus = (maand: string, n: number): string => {
  const d = new Date(Date.UTC(Number(maand.slice(0, 4)), Number(maand.slice(5, 7)) - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

/** Maanden tussen twee maanden, a tot b. */
export const maandenTussen = (a: string, b: string): number =>
  (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7))

/**
 * De kanalen van één klant in één maand, altijd alle bronnen in de vaste
 * volgorde, ook die niet draaien.
 */
export function kanalen(rijen: MaandRij[], gekoppeld: ReadonlySet<Provider>): Kanaal[] {
  const som = (bron: string, providers: Provider[], veld: 'impressions' | 'clicks' | 'sessions' | 'conversions' | 'costCents') =>
    rijen.filter((r) => r.bron === bron && providers.includes(r.provider)).reduce((t, r) => t + (r[veld] ?? 0), 0)

  return BRONNEN.map(({ bron, label, betaald }) => {
    const impressieBron = IMPRESSIE_BRON[bron]
    const metImpressies = impressieBron != null && gekoppeld.has(impressieBron)
    const metGa4 = gekoppeld.has('ga4')
    const kostenBron = betaald && impressieBron && BETAALDE_PROVIDERS.includes(impressieBron) ? impressieBron : null
    const k: Kanaal = {
      bron,
      label,
      betaald,
      actief: false,
      impressies: metImpressies ? som(bron, [impressieBron!], 'impressions') : null,
      klikken: metImpressies ? som(bron, [impressieBron!], 'clicks') : null,
      bezoekers: metGa4 ? som(bron, ['ga4'], 'sessions') : null,
      conversies: metGa4 ? som(bron, ['ga4'], 'conversions') : null,
      kostenCents: kostenBron && gekoppeld.has(kostenBron) ? som(bron, [kostenBron], 'costCents') : null,
    }
    k.actief = [k.impressies, k.bezoekers, k.kostenCents].some((v) => v != null && v > 0)
    return k
  })
}

/** Cijfers en verhoudingen van een of meer kanalen samen. */
export function cijfers(ks: Kanaal[]): Cijfers {
  const tel = (veld: 'impressies' | 'bezoekers' | 'conversies' | 'kostenCents') => {
    const w = ks.map((k) => k[veld]).filter((v): v is number => v != null)
    return w.length ? w.reduce((a, b) => a + b, 0) : null
  }
  const impressies = tel('impressies')
  const bezoekers = tel('bezoekers')
  const conversies = tel('conversies')
  const kostenCents = tel('kostenCents')
  // Doorklikken is alleen eerlijk als elk actief kanaal met bezoekers ook impressies heeft.
  const impressiesDeels = impressies != null && ks.some((k) => k.actief && k.impressies == null && (k.bezoekers ?? 0) > 0)
  return {
    impressies,
    impressiesDeels,
    bezoekers,
    conversies,
    kostenCents,
    ctr: impressiesDeels ? null : deel(bezoekers, impressies),
    cvr: deel(conversies, bezoekers),
    icr: impressiesDeels ? null : deel(conversies, impressies),
    kostenPerConversieCents: deel(kostenCents, conversies),
  }
}

/** Verschil met dezelfde maand vorig jaar, als fractie. */
export function delta(nu: number | null, toen: number | null): number | null {
  return nu == null || toen == null || toen === 0 ? null : nu / toen - 1
}

/* ------------------------------ Benchmark -------------------------------- */

export const MINIMUM_KLANTEN = 5

export type Oordeel = 'goed' | 'matig' | 'slecht' | 'geen' | 'leerfase'

export type BenchmarkRij = { organizationId: string; branche: string | null; ctr: number | null; cvr: number | null; icr: number | null }

export type Benchmark = { bron: 'branche' | 'alle klanten'; aantal: number; ctr: number | null; cvr: number | null; icr: number | null } | null

const mediaan = (w: number[]): number | null => {
  if (!w.length) return null
  const s = [...w].sort((a, b) => a - b)
  const h = Math.floor(s.length / 2)
  return s.length % 2 ? (s[h] ?? null) : ((s[h - 1] ?? 0) + (s[h] ?? 0)) / 2
}

/**
 * De middelste waarde van vergelijkbare klanten: dezelfde branche als dat er
 * minstens vijf zijn, anders alle klanten (ook minstens vijf), anders geen.
 * Een klant ziet zo nooit de cijfers van één andere klant.
 */
export function benchmark(rijen: BenchmarkRij[], branche: string | null): Benchmark {
  const groep = (rs: BenchmarkRij[], bron: 'branche' | 'alle klanten'): Benchmark => {
    const n = new Set(rs.map((r) => r.organizationId)).size
    if (n < MINIMUM_KLANTEN) return null
    const m = (k: 'ctr' | 'cvr' | 'icr') => {
      const w = rs.map((r) => r[k]).filter((v): v is number => v != null)
      return w.length >= MINIMUM_KLANTEN ? mediaan(w) : null
    }
    return { bron, aantal: n, ctr: m('ctr'), cvr: m('cvr'), icr: m('icr') }
  }
  const eigen = branche ? rijen.filter((r) => r.branche && r.branche.toLowerCase() === branche.toLowerCase()) : []
  return groep(eigen, 'branche') ?? groep(rijen, 'alle klanten')
}

/**
 * Goed: op of boven de benchmark. Matig: tot 20% eronder, of verder eronder
 * maar binnen het toeval (twee keer de wortel van het verwachte aantal).
 * Slecht: duidelijk eronder.
 */
export function oordeel(waargenomen: number | null, basis: number | null, bench: number | null, leerfase = false): Oordeel {
  if (waargenomen == null || basis == null || bench == null || basis <= 0) return 'geen'
  if (leerfase) return 'leerfase'
  const verwacht = basis * bench
  if (verwacht <= 0) return 'geen'
  const r = waargenomen / verwacht
  if (r >= 0.95) return 'goed'
  if (r >= 0.8 || verwacht - waargenomen <= 2 * Math.sqrt(verwacht)) return 'matig'
  return 'slecht'
}

/** Maand 1 is de maand van de livegang. De eerste drie maanden leren de platformen nog. */
export function maandNummer(liveOn: string | null, maand: string): number | null {
  if (!liveOn) return null
  const n = maandenTussen(liveOn.slice(0, 7), maand) + 1
  return n >= 1 ? n : null
}

export const isLeerfase = (maandnr: number | null) => maandnr != null && maandnr >= 1 && maandnr <= 3
