/* -------------------------------------------------------------------------
   Het profiel van een medewerker voor voorstellen.

   Wat op een onepager in een voorstel komt: een korte intro, expertise,
   ervaring en de rest van wat op een cv staat. Iedereen houdt zijn eigen
   profiel bij op Beheer → Medewerkers; een beheerder kan alles.

   Twee delen zijn anders:
   - het interne profiel (sterk in, ambitie, wat energie geeft en kost, de
     bron). Dat ziet en wijzigt alleen een beheerder; de collega zelf niet.
     Het komt nooit in een voorstel en gaat ook niet naar de generator.
   - tarieven (afwijkende verkooptarieven, naast het standaardtarief) zet
     alleen een beheerder.
   ------------------------------------------------------------------------- */

export type VoorstelProfiel = {
  intro: string
  quote: string
  expertise: string[]
  vaardigheden: string[]
  /** Intern, alleen beheerders: nooit in een voorstel. */
  sterktes: string[]
  /** Intern, alleen beheerders. */
  ambitie: string[]
  /** Intern, alleen beheerders: wat energie geeft. */
  energie: string[]
  /** Intern, alleen beheerders: wat energie kost, en aandachtspunten. */
  aandachtspunten: string[]
  /** Intern, alleen beheerders: van wie het interne profiel komt en hoe zeker het is. */
  bron: string
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
  ambitie: [],
  energie: [],
  aandachtspunten: [],
  bron: '',
  werkervaring: [],
  opleiding: [],
  talen: [],
  certificeringen: [],
  klanten: [],
  tarieven: [],
}

/** De lijstvelden die de collega zelf bijhoudt, in de volgorde van het formulier. Eén regel is één punt. */
export const LIJSTEN = [
  'expertise',
  'vaardigheden',
  'werkervaring',
  'opleiding',
  'talen',
  'certificeringen',
  'klanten',
] as const

/** De interne lijstvelden: alleen een beheerder ziet en wijzigt ze. */
export const INTERNE_LIJSTEN = ['sterktes', 'ambitie', 'energie', 'aandachtspunten'] as const

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
  const uit: VoorstelProfiel = { ...LEEG_PROFIEL, intro: tekst(o.intro, 1200), quote: tekst(o.quote, 240), tarieven: tarieven(o.tarieven), bron: tekst(o.bron, 400) }
  for (const k of [...LIJSTEN, ...INTERNE_LIJSTEN]) uit[k] = lijst(o[k])
  return uit
}

/** Wat een collega zelf mag wijzigen. Het interne deel en de tarieven blijven zoals ze waren. */
export function metEigenDeel(bestaand: VoorstelProfiel, invoer: unknown): VoorstelProfiel {
  const nieuw = normaliseerProfiel(invoer)
  return { ...bestaand, intro: nieuw.intro, quote: nieuw.quote, ...Object.fromEntries(LIJSTEN.map((k) => [k, nieuw[k]])) }
}

/** Het interne deel, door een beheerder. De rest blijft zoals het was. */
export function metInternDeel(bestaand: VoorstelProfiel, invoer: unknown): VoorstelProfiel {
  const nieuw = normaliseerProfiel(invoer)
  return { ...bestaand, bron: nieuw.bron, ...Object.fromEntries(INTERNE_LIJSTEN.map((k) => [k, nieuw[k]])) }
}

export type ProfielVoorVoorstel = Omit<VoorstelProfiel, (typeof INTERNE_LIJSTEN)[number] | 'bron'>

/** Wat de generator mag zien: alles behalve het interne profiel. */
export function voorVoorstel(p: VoorstelProfiel): ProfielVoorVoorstel {
  const { sterktes: _a, ambitie: _b, energie: _c, aandachtspunten: _d, bron: _e, ...rest } = p
  return rest
}
