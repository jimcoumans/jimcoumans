/* -------------------------------------------------------------------------
   Velddefinities per soort content. Eén centrale lijst: een pagina krijgt
   geen willekeurige eigen velden. Per veld ligt vast:
   - verplicht: moet gevuld (of bewust verborgen, waar dat mag) voor goedkeuring;
   - overnemen: een branchevariant mag de tekst van de algemene bron overnemen;
   - uniek: bij een indexeerbare variant moet het eigen tekst zijn, anders is
     het een kopie van de algemene pagina en heeft de URL geen bestaansrecht;
   - verbergen: mag bewust leeg blijven.

   De Performance Engine en de pakketconfiguratie zijn geen velden: die komen
   uit de centrale registers en kunnen per pagina niet worden overschreven.
   ------------------------------------------------------------------------- */

export type Paginasoort = 'algemeen' | 'variant' | 'hub' | 'case' | 'review' | 'faq' | 'insight'

export type Veld = {
  sleutel: string
  label: string
  uitleg?: string
  regels?: number
  verplicht?: boolean
  /** Alleen voor varianten: tekst van de algemene bron overnemen. */
  overnemen?: boolean
  /** Alleen voor varianten: moet eigen tekst zijn voor goedkeuring. */
  uniek?: boolean
  verbergen?: boolean
  groep: 'hero' | 'inhoud' | 'cta' | 'seo' | 'beeld' | 'bewijs'
}

const HERO: Veld[] = [
  { sleutel: 'hero_eyebrow', label: 'Eyebrow', groep: 'hero', overnemen: true, verbergen: true },
  { sleutel: 'hero_headline', label: 'Headline', groep: 'hero', verplicht: true, overnemen: true, uniek: true },
  { sleutel: 'hero_subheadline', label: 'Subheadline', groep: 'hero', overnemen: true, uniek: true, verbergen: true },
]
const SEO: Veld[] = [
  { sleutel: 'seo_title', label: 'SEO-titel', groep: 'seo', verplicht: true, uniek: true },
  { sleutel: 'seo_description', label: 'Metabeschrijving', groep: 'seo', verplicht: true, uniek: true, regels: 2 },
  { sleutel: 'indexeerbaar', label: 'Indexeerbaar', uitleg: 'Ja of nee. Een niet-indexeerbare variant hoeft geen unieke metadata.', groep: 'seo' },
]
const BEELD: Veld[] = [
  { sleutel: 'beeldbriefing', label: 'Beeldbriefing', groep: 'beeld', overnemen: true, verbergen: true, regels: 3 },
]

const ALGEMEEN: Veld[] = [
  ...HERO,
  { sleutel: 'introductie', label: 'Introductie', groep: 'inhoud', verplicht: true, overnemen: true, uniek: true, regels: 4 },
  { sleutel: 'definitie', label: 'Definitie en uitleg', groep: 'inhoud', verplicht: true, overnemen: true, regels: 5 },
  { sleutel: 'uitdagingen', label: 'Uitdagingen', groep: 'inhoud', overnemen: true, uniek: true, verbergen: true, regels: 5 },
  { sleutel: 'toepassingen', label: 'Toepassingen en voorbeelden', groep: 'inhoud', overnemen: true, uniek: true, verbergen: true, regels: 5 },
  { sleutel: 'werkwijze', label: 'Werkwijze', groep: 'inhoud', overnemen: true, verbergen: true, regels: 5 },
  { sleutel: 'kpis', label: "KPI's en meetwijze", groep: 'inhoud', overnemen: true, verbergen: true, regels: 4 },
  { sleutel: 'cta', label: 'Call to action', groep: 'cta', verplicht: true, overnemen: true, regels: 2 },
  ...SEO,
  ...BEELD,
]

const HUB: Veld[] = [
  ...HERO.map((v) => ({ ...v, overnemen: false })),
  { sleutel: 'introductie', label: 'Brancheintro', groep: 'inhoud', verplicht: true, regels: 4 },
  { sleutel: 'uitdagingen', label: 'Sectorspecifieke uitdagingen', groep: 'inhoud', verplicht: true, regels: 5 },
  { sleutel: 'doelen', label: 'Relevante doelen', groep: 'inhoud', verbergen: true, regels: 4 },
  { sleutel: 'cta', label: 'Call to action', groep: 'cta', verplicht: true, regels: 2 },
  ...SEO,
  ...BEELD.map((v) => ({ ...v, overnemen: false })),
]

const CASE: Veld[] = [
  { sleutel: 'uitdaging', label: 'Uitdaging', groep: 'bewijs', verplicht: true, regels: 4 },
  { sleutel: 'aanpak', label: 'Aanpak', groep: 'bewijs', verplicht: true, regels: 4 },
  { sleutel: 'resultaat', label: 'Resultaat', uitleg: 'Alleen echte, controleerbare cijfers.', groep: 'bewijs', verplicht: true, regels: 4 },
  { sleutel: 'inzicht', label: 'Inzicht', groep: 'bewijs', verbergen: true, regels: 3 },
  { sleutel: 'quote', label: 'Quote van de klant', uitleg: 'Alleen letterlijk en met toestemming.', groep: 'bewijs', verbergen: true, regels: 2 },
]
const REVIEW: Veld[] = [
  { sleutel: 'tekst', label: 'Review', uitleg: 'Letterlijk, met toestemming.', groep: 'bewijs', verplicht: true, regels: 4 },
  { sleutel: 'naam', label: 'Naam en functie', groep: 'bewijs', verplicht: true },
  { sleutel: 'bron', label: 'Bron', uitleg: 'Bijvoorbeeld Google-reviews.', groep: 'bewijs', verbergen: true },
]
const FAQ: Veld[] = [
  { sleutel: 'vraag', label: 'Vraag', groep: 'inhoud', verplicht: true },
  { sleutel: 'antwoord', label: 'Antwoord', groep: 'inhoud', verplicht: true, regels: 4 },
]
const INSIGHT: Veld[] = [
  { sleutel: 'samenvatting', label: 'Samenvatting', groep: 'inhoud', verplicht: true, regels: 3 },
  { sleutel: 'tekst', label: 'Tekst', groep: 'inhoud', verplicht: true, regels: 8 },
  ...SEO,
]

export const VELDEN: Record<Paginasoort, Veld[]> = {
  algemeen: ALGEMEEN,
  variant: ALGEMEEN,
  hub: HUB,
  case: CASE,
  review: REVIEW,
  faq: FAQ,
  insight: INSIGHT,
}

export const SOORT_NAAM: Record<Paginasoort, string> = {
  algemeen: 'Algemene pagina',
  variant: 'Branchevariant',
  hub: 'Branchehub',
  case: 'Case',
  review: 'Review',
  faq: 'FAQ',
  insight: 'Insight',
}

/** De paginasoort volgt uit de context; die kies je niet los. */
export function soortVan(item: { contentKind: string; subjectId: string | null; industryId: string | null }): Paginasoort {
  if (item.contentKind !== 'page') return item.contentKind as Paginasoort
  if (item.subjectId && item.industryId) return 'variant'
  if (item.industryId) return 'hub'
  return 'algemeen'
}

export const veldenVan = (soort: Paginasoort) => VELDEN[soort]

/** Wat een veld mag in deze soort: overnemen alleen bij varianten. */
export function toegestaneModi(soort: Paginasoort, veld: Veld): ('override' | 'inherit' | 'hidden')[] {
  const uit: ('override' | 'inherit' | 'hidden')[] = ['override']
  if (soort === 'variant' && veld.overnemen) uit.push('inherit')
  if (veld.verbergen) uit.push('hidden')
  return uit
}

/** Standaard bij een nieuwe variant: overnemen waar dat mag, anders eigen tekst. */
export function standaardModus(soort: Paginasoort, veld: Veld): 'override' | 'inherit' {
  return soort === 'variant' && veld.overnemen && !veld.uniek ? 'inherit' : 'override'
}

export const WORKFLOW_NAAM = { draft: 'Concept', in_review: 'In review', approved: 'Goedgekeurd', archived: 'Gearchiveerd' } as const
export const PUBLICATIE_NAAM = { unpublished: 'Niet gepubliceerd', published: 'Gepubliceerd', withdrawn: 'Teruggetrokken' } as const
export const ONDERWERP_NAAM = { service: 'Dienst', package: 'Pakket', objective: 'Doelstelling', engine: 'Engine', general_page: 'Algemene pagina' } as const
export const GROEP_NAAM = {
  direction: 'Direction',
  core_driver: 'Core drivers',
  fuel: 'Fuel',
  booster: 'Booster',
  optimiser: 'Integrated optimisers',
  intelligence: 'Intelligence',
  infrastructure: 'Infrastructure',
} as const
export const ACTIVATIE_NAAM = { always: 'Altijd', optional: 'Optioneel', off: 'Uit', undecided: 'Nog te bepalen' } as const
