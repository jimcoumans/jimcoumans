/* -------------------------------------------------------------------------
   Het profiel van een medewerker voor voorstellen.

   Wat op een onepager in een voorstel komt: een korte intro, expertise,
   ervaring en de rest van wat op een cv staat. Iedereen houdt zijn eigen
   profiel bij op Beheer → Medewerkers; een beheerder kan alles.

   Twee velden zijn anders:
   - aandachtspunten zijn intern. Ze staan in het profiel omdat ze bij de
     persoon horen, maar komen nooit in een voorstel en gaan ook niet naar
     de generator.
   - tarieven (afwijkende verkooptarieven, naast het standaardtarief) zet
     alleen een beheerder.
   ------------------------------------------------------------------------- */

export type VoorstelProfiel = {
  intro: string
  quote: string
  expertise: string[]
  vaardigheden: string[]
  sterktes: string[]
  /** Intern: nooit in een voorstel. */
  aandachtspunten: string[]
  werkervaring: string[]
  opleiding: string[]
  talen: string[]
  certificeringen: string[]
  /** Relevante klanten. Alleen noemen met toestemming van de klant. */
  klanten: string[]
  /** Afwijkende verkooptarieven in centen, naast het standaardtarief. Alleen een beheerder. */
  tarieven: number[]
}

export const LEEG_PROFIEL: VoorstelProfiel = {
  intro: '',
  quote: '',
  expertise: [],
  vaardigheden: [],
  sterktes: [],
  aandachtspunten: [],
  werkervaring: [],
  opleiding: [],
  talen: [],
  certificeringen: [],
  klanten: [],
  tarieven: [],
}

/** De lijstvelden, in de volgorde van het formulier. Eén regel is één punt. */
export const LIJSTEN = [
  'expertise',
  'vaardigheden',
  'sterktes',
  'aandachtspunten',
  'werkervaring',
  'opleiding',
  'talen',
  'certificeringen',
  'klanten',
] as const

const tekst = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Een lijst uit tekst (één punt per regel) of uit een array. Lege regels en opsommingstekens eruit. */
export function lijst(v: unknown, maxItems = 12, maxLengte = 200): string[] {
  const ruw = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\r?\n/) : []
  return ruw
    .map((x) => (typeof x === 'string' ? x.replace(/^\s*[-•*·]\s*/, '').trim().slice(0, maxLengte) : ''))
    .filter(Boolean)
    .slice(0, maxItems)
}

/** Tarieven in centen: positieve hele getallen, zonder dubbelen, oplopend. */
export function tarieven(v: unknown): number[] {
  const ruw = Array.isArray(v) ? v : []
  return [...new Set(ruw.map((x) => Math.round(Number(x))).filter((x) => Number.isFinite(x) && x > 0))].sort((a, b) => a - b)
}

/** Maakt van wat er in de database of een formulier staat altijd een volledig, schoon profiel. */
export function normaliseerProfiel(v: unknown): VoorstelProfiel {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  const uit: VoorstelProfiel = { ...LEEG_PROFIEL, intro: tekst(o.intro, 1200), quote: tekst(o.quote, 240), tarieven: tarieven(o.tarieven) }
  for (const k of LIJSTEN) uit[k] = lijst(o[k])
  return uit
}

/** Wat de generator mag zien: alles behalve de interne aandachtspunten. */
export function voorVoorstel(p: VoorstelProfiel): Omit<VoorstelProfiel, 'aandachtspunten'> {
  const { aandachtspunten: _intern, ...rest } = p
  return rest
}
