import { and, asc, desc, eq, sql, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { quotes, quoteLines, organizations, contacts, partners, services } from '@/db/schema'
import type { Quote, QuoteLine, Partner } from '@/db/schema'
import { lineTotalCents } from './quantity'

/* -------------------------------------------------------------------------
   Offertes.

   Elke regel kent twee bedragen: wat de klant betaalt en wat het ons kost.
   Daaruit volgt de marge per regel, per offerte en per partner. Er is bewust
   geen totaalkolom op de offerte zelf: een totaal dat apart wordt
   bijgehouden loopt vroeg of laat uit de pas met de regels waar het uit
   hoort te volgen.

   Anders dan het grootboek MAG een offerte gewijzigd worden zolang hij nog
   niet verstuurd is. Na versturen is hij vastgelegd; wil je iets anders
   voorstellen, dan maak je een nieuwe versie.
   ------------------------------------------------------------------------- */

export class QuoteError extends Error {}

// De labels staan in een eigen bestand zodat clientcomponenten ze kunnen
// gebruiken zonder de databaselaag mee te slepen.
export { quoteStatusLabels, quoteStatusStyles, lineKindLabels } from './quote-labels'
import { quoteStatusLabels } from './quote-labels'

/** Een offerte telt als opdracht zodra de klant akkoord is. */
export const ACCEPTED_STATUSES = ['accepted'] as const

/* ------------------------------- Rekenwerk ------------------------------ */

export type LineTotals = {
  /** Wat de klant voor deze regel betaalt, in centen. */
  revenueCents: number
  /** Wat de regel ons kost, in centen. Nul als er geen kostprijs bekend is. */
  costCents: number
  /** Omzet minus kosten. */
  marginCents: number
  /** Marge als percentage van de omzet, of null bij een omzet van nul. */
  marginPercent: number | null
  /** Of er een kostprijs bekend is; anders is de marge niet te vertrouwen. */
  hasCost: boolean
}

/**
 * Rekent één regel door. Het bedrag volgt altijd uit aantal maal tarief;
 * er wordt nooit een totaal opgeslagen dat daarvan kan afwijken.
 */
export function lineTotals(line: {
  quantityHundredths: number
  unitPriceCents: number
  unitCostCents: number | null
}): LineTotals {
  // lineTotalCents eist positieve waarden; een kortingsregel is negatief,
  // dus die rekenen we op de absolute waarde en draaien we daarna om.
  const negatief = line.unitPriceCents < 0
  const revenueCents = negatief
    ? -lineTotalCents(line.quantityHundredths, -line.unitPriceCents)
    : lineTotalCents(line.quantityHundredths, line.unitPriceCents)

  const hasCost = line.unitCostCents !== null
  const costCents =
    line.unitCostCents === null || line.unitCostCents === 0
      ? 0
      : lineTotalCents(line.quantityHundredths, line.unitCostCents)

  const marginCents = revenueCents - costCents

  return {
    revenueCents,
    costCents,
    marginCents,
    marginPercent: revenueCents === 0 ? null : Math.round((marginCents / revenueCents) * 100),
    hasCost,
  }
}

export type QuoteTotals = {
  /** Totaal exclusief btw, in centen. */
  subtotalCents: number
  vatCents: number
  /** Totaal inclusief btw. */
  totalCents: number
  /** Wat de offerte ons kost aan inkoop en interne kosten. */
  costCents: number
  marginCents: number
  marginPercent: number | null
  /** Wat er aan partners wordt uitbesteed, in centen. */
  partnerCostCents: number
  /** Of elke regel een kostprijs heeft; anders is de marge te rooskleurig. */
  costComplete: boolean
  lineCount: number
}

/** Telt de regels van een offerte bij elkaar op. */
export function quoteTotals(
  lines: Pick<QuoteLine, 'quantityHundredths' | 'unitPriceCents' | 'unitCostCents' | 'kind'>[],
  vatRatePercent: number,
): QuoteTotals {
  let subtotalCents = 0
  let costCents = 0
  let partnerCostCents = 0
  let costComplete = true

  for (const line of lines) {
    const totals = lineTotals(line)
    subtotalCents += totals.revenueCents
    costCents += totals.costCents
    if (line.kind === 'partner') partnerCostCents += totals.costCents
    // Een kortingsregel hoeft geen kostprijs te hebben.
    if (!totals.hasCost && line.kind !== 'discount') costComplete = false
  }

  const vatCents = Math.round((subtotalCents * vatRatePercent) / 100)
  const marginCents = subtotalCents - costCents

  return {
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
    costCents,
    marginCents,
    marginPercent: subtotalCents === 0 ? null : Math.round((marginCents / subtotalCents) * 100),
    partnerCostCents,
    costComplete,
    lineCount: lines.length,
  }
}

/* ------------------------------- Opvragen ------------------------------- */

export type QuoteWithTotals = Quote & {
  organizationName: string
  organizationSlug: string
  totals: QuoteTotals
  /** De partners die in deze offerte werk uitvoeren. */
  partnerNames: string[]
}

export async function listQuotes(
  opts: { organizationId?: string; partnerId?: string } = {},
): Promise<QuoteWithTotals[]> {
  const voorwaarden = []
  if (opts.organizationId) voorwaarden.push(eq(quotes.organizationId, opts.organizationId))

  let ids: string[] | null = null
  if (opts.partnerId) {
    const rows = await db
      .selectDistinct({ quoteId: quoteLines.quoteId })
      .from(quoteLines)
      .where(eq(quoteLines.partnerId, opts.partnerId))
    ids = rows.map((r) => r.quoteId)
    if (ids.length === 0) return []
    voorwaarden.push(inArray(quotes.id, ids))
  }

  const rijen = await db
    .select({
      quote: quotes,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(quotes)
    .innerJoin(organizations, eq(organizations.id, quotes.organizationId))
    .where(voorwaarden.length > 0 ? and(...voorwaarden) : undefined)
    .orderBy(desc(quotes.issuedOn), desc(quotes.createdAt))

  if (rijen.length === 0) return []

  const alleRegels = await db
    .select({ line: quoteLines, partnerName: partners.name })
    .from(quoteLines)
    .leftJoin(partners, eq(partners.id, quoteLines.partnerId))
    .where(inArray(quoteLines.quoteId, rijen.map((r) => r.quote.id)))

  const perOfferte = new Map<string, { lines: QuoteLine[]; partnerNames: Set<string> }>()
  for (const r of rijen) {
    perOfferte.set(r.quote.id, { lines: [], partnerNames: new Set() })
  }
  for (const r of alleRegels) {
    const bucket = perOfferte.get(r.line.quoteId)
    if (!bucket) continue
    bucket.lines.push(r.line)
    if (r.partnerName) bucket.partnerNames.add(r.partnerName)
  }

  return rijen.map((r) => {
    const bucket = perOfferte.get(r.quote.id)!
    return {
      ...r.quote,
      organizationName: r.organizationName,
      organizationSlug: r.organizationSlug,
      totals: quoteTotals(bucket.lines, r.quote.vatRatePercent),
      partnerNames: [...bucket.partnerNames].sort(),
    }
  })
}

export type QuoteLineWithContext = QuoteLine & {
  partnerName: string | null
  serviceName: string | null
  totals: LineTotals
}

export type QuoteDetail = {
  quote: Quote
  organizationName: string
  organizationSlug: string
  contactName: string | null
  contactEmail: string | null
  lines: QuoteLineWithContext[]
  totals: QuoteTotals
}

export async function getQuote(id: string): Promise<QuoteDetail | null> {
  const [row] = await db
    .select({
      quote: quotes,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      contactName: contacts.name,
      contactEmail: contacts.email,
    })
    .from(quotes)
    .innerJoin(organizations, eq(organizations.id, quotes.organizationId))
    .leftJoin(contacts, eq(contacts.id, quotes.contactId))
    .where(eq(quotes.id, id))
    .limit(1)

  if (!row) return null

  const regels = await db
    .select({ line: quoteLines, partnerName: partners.name, serviceName: services.name })
    .from(quoteLines)
    .leftJoin(partners, eq(partners.id, quoteLines.partnerId))
    .leftJoin(services, eq(services.id, quoteLines.serviceId))
    .where(eq(quoteLines.quoteId, id))
    .orderBy(asc(quoteLines.sortOrder), asc(quoteLines.createdAt))

  const lines = regels.map((r) => ({
    ...r.line,
    partnerName: r.partnerName ?? null,
    serviceName: r.serviceName ?? null,
    totals: lineTotals(r.line),
  }))

  return {
    quote: row.quote,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
    contactName: row.contactName ?? null,
    contactEmail: row.contactEmail ?? null,
    lines,
    totals: quoteTotals(lines, row.quote.vatRatePercent),
  }
}

/* ------------------------------- Aanmaken ------------------------------- */

/** Een vrij offertenummer in de vorm OFF-JJJJ-NNN. */
export async function nextQuoteNumber(): Promise<string> {
  const jaar = new Date().getFullYear()
  const prefix = `OFF-${jaar}-`

  const [row] = await db
    .select({ hoogste: sql<string | null>`MAX(${quotes.number})` })
    .from(quotes)
    .where(sql`${quotes.number} LIKE ${prefix + '%'}`)

  if (!row?.hoogste) return `${prefix}001`

  const volgnummer = Number.parseInt(row.hoogste.slice(prefix.length), 10)
  const volgend = Number.isFinite(volgnummer) ? volgnummer + 1 : 1
  return `${prefix}${String(volgend).padStart(3, '0')}`
}

export async function createQuote(input: {
  organizationId: string
  title: string
  contactId?: string | null
  introText?: string | null
  termsText?: string | null
  validUntil?: Date | null
  vatRatePercent?: number
  createdByUserId?: string | null
}): Promise<Quote> {
  if (input.title.trim().length < 2) {
    throw new QuoteError('Vul een titel voor de offerte in.')
  }

  const [quote] = await db
    .insert(quotes)
    .values({
      organizationId: input.organizationId,
      number: await nextQuoteNumber(),
      title: input.title.trim(),
      contactId: input.contactId ?? null,
      introText: input.introText ?? null,
      termsText: input.termsText ?? null,
      validUntil: input.validUntil ?? null,
      vatRatePercent: input.vatRatePercent ?? 21,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning()

  if (!quote) throw new QuoteError('Offerte kon niet worden opgeslagen.')
  return quote
}

/** Een offerte mag alleen gewijzigd worden zolang hij niet bij de klant ligt. */
export function isEditable(quote: Pick<Quote, 'status'>): boolean {
  return quote.status === 'draft' || quote.status === 'awaiting_partner'
}

export type NewQuoteLine = {
  quoteId: string
  kind: QuoteLine['kind']
  description: string
  detail?: string | null
  quantityHundredths: number
  unitPriceCents: number
  unitCostCents?: number | null
  serviceId?: string | null
  partnerId?: string | null
}

export async function addQuoteLine(input: NewQuoteLine): Promise<QuoteLine> {
  const [quote] = await db
    .select({ status: quotes.status })
    .from(quotes)
    .where(eq(quotes.id, input.quoteId))
    .limit(1)

  if (!quote) throw new QuoteError('Offerte niet gevonden.')
  if (!isEditable(quote)) {
    throw new QuoteError(
      'Deze offerte ligt al bij de klant. Zet hem terug op concept om hem te wijzigen.',
    )
  }
  if (input.description.trim().length < 2) {
    throw new QuoteError('Vul een omschrijving in. De klant leest die.')
  }
  if (input.kind === 'partner' && !input.partnerId) {
    throw new QuoteError('Kies welke partner dit uitvoert.')
  }

  const [hoogste] = await db
    .select({ max: sql<number | null>`MAX(${quoteLines.sortOrder})` })
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, input.quoteId))

  const [line] = await db
    .insert(quoteLines)
    .values({
      quoteId: input.quoteId,
      sortOrder: (hoogste?.max ?? 0) + 10,
      kind: input.kind,
      description: input.description.trim(),
      detail: input.detail ?? null,
      quantityHundredths: input.quantityHundredths,
      unitPriceCents: input.unitPriceCents,
      unitCostCents: input.unitCostCents ?? null,
      serviceId: input.serviceId ?? null,
      partnerId: input.partnerId ?? null,
    })
    .returning()

  if (!line) throw new QuoteError('Regel kon niet worden opgeslagen.')
  return line
}

export async function deleteQuoteLine(lineId: string): Promise<void> {
  const [row] = await db
    .select({ status: quotes.status })
    .from(quoteLines)
    .innerJoin(quotes, eq(quotes.id, quoteLines.quoteId))
    .where(eq(quoteLines.id, lineId))
    .limit(1)

  if (!row) throw new QuoteError('Regel niet gevonden.')
  if (!isEditable(row)) {
    throw new QuoteError('Deze offerte ligt al bij de klant en kan niet meer gewijzigd worden.')
  }

  await db.delete(quoteLines).where(eq(quoteLines.id, lineId))
}

/* ------------------------------- Statusflow ----------------------------- */

/** Welke overgangen logisch zijn. Andere worden geweigerd. */
const TOEGESTAAN: Record<Quote['status'], Quote['status'][]> = {
  draft: ['awaiting_partner', 'sent'],
  awaiting_partner: ['draft', 'sent'],
  sent: ['accepted', 'declined', 'expired', 'draft'],
  accepted: [],
  declined: ['draft'],
  expired: ['draft', 'sent'],
}

/**
 * Naar welke statussen deze offerte nu mag. Het scherm laat alleen die
 * knoppen zien, zodat je niet op iets kunt drukken dat toch wordt geweigerd.
 */
export function allowedTransitions(status: Quote['status']): Quote['status'][] {
  return TOEGESTAAN[status]
}

export async function setQuoteStatus(
  quoteId: string,
  status: Quote['status'],
  opts: { declineReason?: string | null } = {},
): Promise<void> {
  const [quote] = await db
    .select({ status: quotes.status })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1)

  if (!quote) throw new QuoteError('Offerte niet gevonden.')

  if (quote.status === status) return

  if (!TOEGESTAAN[quote.status].includes(status)) {
    // Een geaccepteerde offerte terugdraaien is geen statuswijziging maar
    // een nieuwe afspraak; die hoort een nieuwe offerte te worden.
    throw new QuoteError(
      quote.status === 'accepted'
        ? 'Een geaccepteerde offerte kan niet meer van status veranderen. Maak een nieuwe offerte voor een gewijzigde afspraak.'
        : `Van ${quoteStatusLabels[quote.status]} naar ${quoteStatusLabels[status]} kan niet.`,
    )
  }

  if (status === 'sent') {
    const regels = await db
      .select({
        kind: quoteLines.kind,
        quantityHundredths: quoteLines.quantityHundredths,
        unitPriceCents: quoteLines.unitPriceCents,
        unitCostCents: quoteLines.unitCostCents,
      })
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, quoteId))

    if (regels.length === 0) {
      throw new QuoteError('Een offerte zonder regels versturen heeft geen zin.')
    }

    // Kortingen kunnen het totaal onder nul duwen. Dat is geen voorstel maar
    // een fout die je liever hier ontdekt dan bij de klant.
    const { subtotalCents } = quoteTotals(regels, 0)
    if (subtotalCents <= 0) {
      throw new QuoteError(
        'Het totaal van deze offerte is nul of lager. Controleer de kortingsregels voordat je hem verstuurt.',
      )
    }
  }

  await db
    .update(quotes)
    .set({
      status,
      sentAt: status === 'sent' ? new Date() : undefined,
      decidedAt: ['accepted', 'declined', 'expired'].includes(status) ? new Date() : undefined,
      declineReason: status === 'declined' ? (opts.declineReason ?? null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, quoteId))
}

/* ---------------------------- Partnercijfers ---------------------------- */

export type PartnerFigures = {
  partnerId: string
  partnerName: string
  /** Aantal offertes waarin deze partner werk uitvoert. */
  quoteCount: number
  /** Daarvan geaccepteerd: dat zijn de opdrachten. */
  acceptedCount: number
  /** Nog open: verstuurd of in behandeling. */
  openCount: number
  /** Wat wij de klant rekenen voor werk van deze partner, in centen. */
  revenueCents: number
  /** Wat deze partner ons daarvoor kost: hun omzet via ons. */
  partnerCostCents: number
  /** Onze winst op dit partnerwerk. */
  marginCents: number
  marginPercent: number | null
}

/**
 * Cijfers per partner, uit de offerteregels.
 *
 * Standaard tellen alleen geaccepteerde offertes mee: dat is wat er
 * werkelijk is uitgevoerd. De aantallen offertes en opdrachten laten wel
 * alles zien, zodat je ziet hoeveel er is voorgesteld tegenover hoeveel
 * ervan doorging.
 */
export async function getPartnerFigures(
  opts: { includeAllStatuses?: boolean } = {},
): Promise<PartnerFigures[]> {
  const rijen = await db
    .select({
      partnerId: partners.id,
      partnerName: partners.name,
      quoteId: quotes.id,
      status: quotes.status,
      line: quoteLines,
    })
    .from(quoteLines)
    .innerJoin(partners, eq(partners.id, quoteLines.partnerId))
    .innerJoin(quotes, eq(quotes.id, quoteLines.quoteId))

  const perPartner = new Map<string, PartnerFigures & { quoteIds: Set<string>; acceptedIds: Set<string>; openIds: Set<string> }>()

  for (const r of rijen) {
    let bucket = perPartner.get(r.partnerId)
    if (!bucket) {
      bucket = {
        partnerId: r.partnerId,
        partnerName: r.partnerName,
        quoteCount: 0,
        acceptedCount: 0,
        openCount: 0,
        revenueCents: 0,
        partnerCostCents: 0,
        marginCents: 0,
        marginPercent: null,
        quoteIds: new Set(),
        acceptedIds: new Set(),
        openIds: new Set(),
      }
      perPartner.set(r.partnerId, bucket)
    }

    bucket.quoteIds.add(r.quoteId)
    if (r.status === 'accepted') bucket.acceptedIds.add(r.quoteId)
    if (r.status === 'sent' || r.status === 'awaiting_partner' || r.status === 'draft') {
      bucket.openIds.add(r.quoteId)
    }

    // Alleen geaccepteerd werk telt als omzet; een voorstel dat niet
    // doorging is geen geld.
    const teltMee = opts.includeAllStatuses || r.status === 'accepted'
    if (teltMee) {
      const totals = lineTotals(r.line)
      bucket.revenueCents += totals.revenueCents
      bucket.partnerCostCents += totals.costCents
    }
  }

  return [...perPartner.values()]
    .map((b) => {
      const marginCents = b.revenueCents - b.partnerCostCents
      return {
        partnerId: b.partnerId,
        partnerName: b.partnerName,
        quoteCount: b.quoteIds.size,
        acceptedCount: b.acceptedIds.size,
        openCount: b.openIds.size,
        revenueCents: b.revenueCents,
        partnerCostCents: b.partnerCostCents,
        marginCents,
        marginPercent:
          b.revenueCents === 0 ? null : Math.round((marginCents / b.revenueCents) * 100),
      }
    })
    .sort((a, b) => b.revenueCents - a.revenueCents)
}

/** Kerncijfers over alle offertes, voor het dashboard. */
export async function getQuoteFigures() {
  const alle = await listQuotes()

  const open = alle.filter((q) => q.status === 'sent' || q.status === 'awaiting_partner')
  const geaccepteerd = alle.filter((q) => q.status === 'accepted')
  const beslist = alle.filter((q) => q.status === 'accepted' || q.status === 'declined')

  return {
    totalCount: alle.length,
    openCount: open.length,
    openValueCents: open.reduce((a, q) => a + q.totals.subtotalCents, 0),
    acceptedCount: geaccepteerd.length,
    acceptedValueCents: geaccepteerd.reduce((a, q) => a + q.totals.subtotalCents, 0),
    acceptedMarginCents: geaccepteerd.reduce((a, q) => a + q.totals.marginCents, 0),
    /** Hoeveel van de besliste offertes akkoord kregen. */
    winRatePercent:
      beslist.length === 0
        ? null
        : Math.round((geaccepteerd.length / beslist.length) * 100),
  }
}
