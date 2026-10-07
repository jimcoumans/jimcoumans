import type { CampagneVolledig } from '@/lib/campagnes'
import type { Campaign } from '@/db/schema'
import { leesPunten, schrijfPunten, type Punt } from '@/lib/punten'
import { formatDateInput } from '@/lib/dates'
import { parseAmountToCents } from '@/lib/money'
import { parsePercentageToBp, parseHonderdsten, formatBp, formatHonderdsten } from '@/lib/hypothese'

/* -------------------------------------------------------------------------
   De briefing als één concept dat je in het scherm bewerkt en in één keer
   opslaat. Alles is tekst, zoals in een formulier; pas bij opslaan wordt
   het gelezen en gecontroleerd. Dit bestand heeft geen database nodig, zodat
   het scherm en de tests het ook kunnen gebruiken.
   ------------------------------------------------------------------------- */

/** De velden die als losse regels worden bewerkt. */
export const LIJST_VELDEN = [
  'kpiNotes',
  'budgetNote',
  'offerWhat',
  'offerWhyNow',
  'offerNotPromised',
  'exclusions',
  'audienceNotes',
  'planningNotes',
  'clientDoes',
  'agreementNotes',
  'backgroundPrevious',
  'backgroundRisks',
  'assumptionNotes',
] as const satisfies readonly (keyof Campaign)[]
export type LijstVeld = (typeof LIJST_VELDEN)[number]

export type ConceptPunt = Punt & { sleutel: string }

export type KpiConcept = { sleutel: string; id: string | null; label: string; on: string; targetQuantity: string; price: string }

export type DeliverableConcept = {
  sleutel: string
  id: string | null
  name: string
  kind: string
  note: string
  quantity: string
  liveFrom: string
  liveUntil: string
  status: 'maken' | 'bestaat'
}

export type TijdlijnConcept = { sleutel: string; id: string | null; dueOn: string; description: string; assignee: string }

export type BriefingConcept = {
  title: string
  marketingManagerId: string
  specialistIds: string[]
  contactIds: string[]
  summary: string
  goalSentence: string
  resultDefinition: string
  offerMessage: string
  region: string
  budgetMode: 'berekend' | 'vast'
  fixedBudget: string
  startOn: string
  endOn: string
  voorstel: string[]
  lijsten: Record<LijstVeld, ConceptPunt[]>
  aannames: {
    cpm: string
    ctr: string
    conversion: string
    units: string
    adsShare: string
    buffer: string
    sourceCpm: string
    sourceClickThrough: string
    sourceConversion: string
    sourceUnits: string
  }
  kpis: KpiConcept[]
  deliverables: DeliverableConcept[]
  tijdlijn: TijdlijnConcept[]
}

export class ConceptFout extends Error {}

const datumVeld = (d: Date | null) => (d ? formatDateInput(d) : '')
/** Een bedrag zoals je het typt: 115, of 47,50 als er centen zijn. */
const bedragVeld = (cents: number | null) =>
  cents === null ? '' : cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',')

/** Bedragen vergelijken als bedrag: 47,5 en 47,50 zijn hetzelfde. */
function bedragInhoud(s: string): string {
  const t = s.trim()
  if (t === '') return ''
  const cents = parseAmountToCents(t)
  return cents === null ? t : String(cents)
}

/** Wie een tijdlijnregel doet, als één waarde voor de keuzelijst. */
export function wieWaarde(t: { assigneeUserId: string | null; assigneeLabel: string | null }): string {
  return t.assigneeUserId ? `user:${t.assigneeUserId}` : t.assigneeLabel ? `label:${t.assigneeLabel}` : ''
}

/** Op datum, regels zonder datum onderaan; bij gelijke datum op omschrijving. Zoals de database sorteert. */
export function sorteerTijdlijn<T extends { dueOn: string; description: string }>(rijen: T[]): T[] {
  return [...rijen].sort((a, b) => {
    if (a.dueOn !== b.dueOn) {
      if (a.dueOn === '') return 1
      if (b.dueOn === '') return -1
      return a.dueOn < b.dueOn ? -1 : 1
    }
    return a.description.localeCompare(b.description, 'nl')
  })
}

/** Het concept uit wat er in de database staat. */
export function conceptVan(v: CampagneVolledig): BriefingConcept {
  const c = v.campagne
  const lijsten = Object.fromEntries(
    LIJST_VELDEN.map((veld) => [veld, leesPunten(c[veld]).map((p, i) => ({ ...p, sleutel: `${veld}-${i}` }))]),
  ) as Record<LijstVeld, ConceptPunt[]>
  return {
    title: c.title,
    marketingManagerId: c.marketingManagerId ?? '',
    specialistIds: v.specialisten.map((s) => s.id).sort(),
    contactIds: v.contactpersonen.map((p) => p.id).sort(),
    summary: c.summary ?? '',
    goalSentence: c.goalSentence ?? '',
    resultDefinition: c.resultDefinition ?? '',
    offerMessage: c.offerMessage ?? '',
    region: c.region ?? '',
    budgetMode: c.budgetMode,
    fixedBudget: bedragVeld(c.fixedBudgetCents),
    startOn: datumVeld(c.startOn),
    endOn: datumVeld(c.endOn),
    voorstel: [...c.proposalFields].sort(),
    lijsten,
    aannames: {
      cpm: bedragVeld(c.cpmCents),
      ctr: c.clickThroughRateBp ? formatBp(c.clickThroughRateBp) : '',
      conversion: c.conversionRateBp ? formatBp(c.conversionRateBp) : '',
      units: formatHonderdsten(c.unitsPerConversionHundredths),
      adsShare: c.adsShareBp ? formatBp(c.adsShareBp) : '',
      buffer: formatBp(c.bufferBp),
      sourceCpm: c.sourceCpm ?? '',
      sourceClickThrough: c.sourceClickThrough ?? '',
      sourceConversion: c.sourceConversion ?? '',
      sourceUnits: c.sourceUnits ?? '',
    },
    kpis: v.kpis.map((k) => ({
      sleutel: k.id,
      id: k.id,
      label: k.label,
      on: datumVeld(k.on),
      targetQuantity: String(k.targetQuantity),
      price: bedragVeld(k.priceCents),
    })),
    deliverables: v.kanalen.map((k) => ({
      sleutel: k.id,
      id: k.id,
      name: k.name ?? '',
      kind: k.kind,
      note: k.note ?? '',
      quantity: k.quantity ?? '',
      liveFrom: datumVeld(k.liveFrom),
      liveUntil: datumVeld(k.liveUntil),
      status: k.status,
    })),
    tijdlijn: sorteerTijdlijn(
      v.tijdlijn.map((t) => ({ sleutel: t.id, id: t.id, dueOn: datumVeld(t.dueOn), description: t.description, assignee: wieWaarde(t) })),
    ),
  }
}

/**
 * Het concept zonder sleutels en lege regels, in een vaste volgorde: twee
 * concepten met dezelfde inhoud geven dezelfde tekst. Zo weet het scherm of
 * er iets te bewaren valt.
 */
export function inhoudVan(c: BriefingConcept): string {
  const t = (s: string) => s.trim()
  return JSON.stringify({
    ...c,
    title: t(c.title),
    summary: t(c.summary),
    goalSentence: t(c.goalSentence),
    resultDefinition: t(c.resultDefinition),
    offerMessage: t(c.offerMessage),
    region: t(c.region),
    fixedBudget: c.budgetMode === 'vast' ? bedragInhoud(c.fixedBudget) : '',
    specialistIds: [...c.specialistIds].sort(),
    contactIds: [...c.contactIds].sort(),
    voorstel: [...c.voorstel].sort(),
    lijsten: Object.fromEntries(LIJST_VELDEN.map((veld) => [veld, schrijfPunten(c.lijsten[veld])])),
    aannames: Object.fromEntries(Object.entries(c.aannames).map(([k, w]) => [k, k === 'cpm' ? bedragInhoud(w) : t(w)])),
    kpis: c.kpis.map(({ sleutel: _, ...k }) => ({ ...k, label: t(k.label), targetQuantity: t(k.targetQuantity), price: bedragInhoud(k.price) })),
    deliverables: c.deliverables.map(({ sleutel: _, ...k }) => ({
      ...k,
      name: t(k.name),
      kind: t(k.kind),
      note: t(k.note),
      quantity: t(k.quantity),
    })),
    tijdlijn: sorteerTijdlijn(c.tijdlijn.map(({ sleutel: _, ...r }) => ({ ...r, description: t(r.description) }))),
  })
}

/* ------------------------------ Lezen bij opslaan ------------------------ */

function leesDatum(waarde: string, wat: string): Date | null {
  const w = waarde.trim()
  if (w === '') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w)) throw new ConceptFout(`${wat}: geen geldige datum.`)
  const d = new Date(`${w}T12:00:00`)
  if (Number.isNaN(d.getTime())) throw new ConceptFout(`${wat}: geen geldige datum.`)
  return d
}

const ofNull = (s: string) => s.trim() || null

export type GelezenConcept = ReturnType<typeof leesConcept>

/**
 * Het concept gelezen en gecontroleerd, klaar voor de database. Een fout
 * noemt de regel, zodat je weet waar je moet kijken.
 */
export function leesConcept(c: BriefingConcept) {
  if (c.title.trim() === '') throw new ConceptFout('De basis: een campagne heeft een naam nodig.')

  let fixedBudgetCents: number | null = null
  if (c.budgetMode === 'vast') {
    fixedBudgetCents = parseAmountToCents(c.fixedBudget.trim())
    if (!fixedBudgetCents || fixedBudgetCents <= 0) throw new ConceptFout('Het doel: vul bij een vast budget het bedrag in.')
  }

  const startOn = leesDatum(c.startOn, 'De planning, start')
  const endOn = leesDatum(c.endOn, 'De planning, einde')
  if (startOn && endOn && endOn < startOn) throw new ConceptFout('De planning: de einddatum ligt vóór de start.')

  const a = c.aannames
  const eenheden = parseHonderdsten(a.units.trim())
  if (eenheden === null || eenheden <= 0) throw new ConceptFout('Hypothese: eenheden per conversie is een getal groter dan nul, meestal 1.')
  const percentage = (ruw: string, label: string) => {
    if (ruw.trim() === '') return null
    const bp = parsePercentageToBp(ruw.trim())
    if (bp === null || bp <= 0 || bp > 10_000) throw new ConceptFout(`Hypothese, ${label}: vul een percentage in, bijvoorbeeld 2,5.`)
    return bp
  }
  const cpm = a.cpm.trim() === '' ? null : parseAmountToCents(a.cpm.trim())
  if (a.cpm.trim() !== '' && (!cpm || cpm <= 0)) throw new ConceptFout('Hypothese, kosten per 1.000 impressies: vul een bedrag in, bijvoorbeeld 8.')

  const lijsten = Object.fromEntries(LIJST_VELDEN.map((veld) => [veld, schrijfPunten(c.lijsten[veld])])) as Record<LijstVeld, string | null>

  // Een regel waar niets in staat, telt niet mee; een half ingevulde wel, en die moet kloppen.
  const kpis = c.kpis
    .filter((k) => k.label.trim() !== '' || k.targetQuantity.trim() !== '' || k.price.trim() !== '')
    .map((k, i) => {
      const wat = `KPI ${i + 1}${k.label.trim() ? ` (${k.label.trim()})` : ''}`
      if (k.label.trim() === '') throw new ConceptFout(`${wat}: geef het product of onderdeel een naam.`)
      const aantal = Number(k.targetQuantity.trim())
      if (!Number.isInteger(aantal) || aantal <= 0) throw new ConceptFout(`${wat}: het doel is een heel aantal groter dan nul.`)
      const prijs = k.price.trim() === '' ? null : parseAmountToCents(k.price.trim())
      if (k.price.trim() !== '' && (prijs === null || prijs < 0)) throw new ConceptFout(`${wat}: vul de prijs in als bedrag, bijvoorbeeld 110.`)
      return { id: k.id, sleutel: k.sleutel, label: k.label.trim(), on: leesDatum(k.on, wat), targetQuantity: aantal, priceCents: prijs }
    })

  const kanalen = c.deliverables
    .filter((k) => [k.name, k.kind, k.note, k.quantity, k.liveFrom, k.liveUntil].some((w) => w.trim() !== ''))
    .map((k, i) => {
      const wat = `Deliverable ${i + 1}${k.name.trim() ? ` (${k.name.trim()})` : ''}`
      const kind = k.kind.trim()
      if (kind === '') throw new ConceptFout(`${wat}: kies het kanaal.`)
      const liveFrom = leesDatum(k.liveFrom, wat)
      const liveUntil = leesDatum(k.liveUntil, wat)
      if (liveFrom && liveUntil && liveUntil < liveFrom) throw new ConceptFout(`${wat}: de einddatum ligt vóór de startdatum.`)
      return {
        id: k.id,
        sleutel: k.sleutel,
        name: ofNull(k.name),
        kind,
        note: ofNull(k.note),
        quantity: ofNull(k.quantity),
        liveFrom,
        liveUntil,
        status: k.status === 'bestaat' ? ('bestaat' as const) : ('maken' as const),
      }
    })

  const tijdlijn = c.tijdlijn
    .filter((t) => t.description.trim() !== '' || t.dueOn.trim() !== '')
    .map((t, i) => {
      const wat = `Tijdlijn, regel ${i + 1}`
      if (t.description.trim() === '') throw new ConceptFout(`${wat}: zeg wat er moet gebeuren.`)
      const wie = t.assignee
      return {
        id: t.id,
        sleutel: t.sleutel,
        dueOn: leesDatum(t.dueOn, `Tijdlijn (${t.description.trim()})`),
        description: t.description.trim(),
        assigneeUserId: wie.startsWith('user:') ? wie.slice(5) : null,
        assigneeLabel: wie.startsWith('label:') ? wie.slice(6) : null,
      }
    })

  const mm = ofNull(c.marketingManagerId)
  return {
    campagne: {
      title: c.title.trim(),
      marketingManagerId: mm,
      summary: ofNull(c.summary),
      goalSentence: ofNull(c.goalSentence),
      resultDefinition: ofNull(c.resultDefinition),
      offerMessage: ofNull(c.offerMessage),
      region: ofNull(c.region),
      budgetMode: c.budgetMode,
      fixedBudgetCents,
      startOn,
      endOn,
      ...lijsten,
      unitsPerConversionHundredths: eenheden,
      conversionRateBp: percentage(a.conversion, 'conversieratio'),
      clickThroughRateBp: percentage(a.ctr, 'doorklikratio'),
      cpmCents: cpm,
      bufferBp: percentage(a.buffer, 'buffer') ?? 0,
      adsShareBp: percentage(a.adsShare, 'deel uit advertenties'),
      sourceUnits: ofNull(a.sourceUnits),
      sourceConversion: ofNull(a.sourceConversion),
      sourceClickThrough: ofNull(a.sourceClickThrough),
      sourceCpm: ofNull(a.sourceCpm),
    },
    voorstel: [...new Set(c.voorstel)],
    // De marketingmanager is geen specialist naast zichzelf.
    specialistIds: [...new Set(c.specialistIds)].filter((u) => u && u !== mm),
    contactIds: [...new Set(c.contactIds)].filter(Boolean),
    kpis,
    kanalen,
    tijdlijn,
  }
}
