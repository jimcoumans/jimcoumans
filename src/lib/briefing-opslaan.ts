import { and, eq, gt, notInArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  campaigns,
  campaignKpis,
  campaignChannels,
  campaignTimeline,
  campaignContacts,
  campaignSpecialists,
  campaignVerwerkingen,
} from '@/db/schema'
import { CampagneError, VOORSTEL_VELDEN } from '@/lib/campagnes'
import { LIJST_VELDEN, leesConcept, ConceptFout, type BriefingConcept } from '@/lib/briefing-concept'

/* -------------------------------------------------------------------------
   De hele briefing in één keer opslaan, in één transactie: alles of niets.
   Regels die blijven, houden hun id (en een tijdlijnregel zijn koppeling
   met ClickUp); nieuwe regels krijgen er een, weggehaalde verdwijnen.
   ------------------------------------------------------------------------- */

const tekst = z.string().max(20_000)
const kort = z.string().max(500)
const punt = z.object({ sleutel: kort, tekst: tekst, sub: z.boolean() })

/** Wat er van buiten binnenkomt: een server action is een publiek endpoint. */
const ConceptSchema: z.ZodType<BriefingConcept> = z.object({
  title: kort,
  marketingManagerId: kort,
  specialistIds: z.array(kort).max(100),
  contactIds: z.array(kort).max(200),
  summary: tekst,
  goalSentence: tekst,
  resultDefinition: tekst,
  offerMessage: tekst,
  region: tekst,
  budgetMode: z.enum(['berekend', 'vast']),
  fixedBudget: kort,
  startOn: kort,
  endOn: kort,
  voorstel: z.array(kort).max(10),
  lijsten: z.object(Object.fromEntries(LIJST_VELDEN.map((v) => [v, z.array(punt).max(200)]))) as unknown as z.ZodType<
    BriefingConcept['lijsten']
  >,
  aannames: z.object({
    cpm: kort,
    ctr: kort,
    conversion: kort,
    units: kort,
    adsShare: kort,
    buffer: kort,
    sourceCpm: tekst,
    sourceClickThrough: tekst,
    sourceConversion: tekst,
    sourceUnits: tekst,
  }),
  kpis: z
    .array(z.object({ sleutel: kort, id: kort.nullable(), label: kort, on: kort, targetQuantity: kort, price: kort }))
    .max(100),
  deliverables: z
    .array(
      z.object({
        sleutel: kort,
        id: kort.nullable(),
        name: kort,
        kind: kort,
        note: tekst,
        quantity: kort,
        liveFrom: kort,
        liveUntil: kort,
        status: z.enum(['maken', 'bestaat']),
      }),
    )
    .max(200),
  tijdlijn: z
    .array(z.object({ sleutel: kort, id: kort.nullable(), dueOn: kort, description: tekst, assignee: kort }))
    .max(300),
})

export type Opgeslagen = {
  /** Nieuwe regels: welk id ze kregen, per sleutel uit het scherm. */
  ids: Record<string, string>
  /** Het moment van opslaan, als nieuw ijkpunt voor het scherm. */
  stempel: string
}

/**
 * Sla de briefing op. `sinds` is het moment waarop het scherm de briefing
 * laadde: is er daarna feedback verwerkt, dan zou opslaan die overschrijven,
 * en dat doen we niet stilletjes.
 */
export async function slaConceptOp(campaignId: string, invoer: unknown, sinds: string): Promise<Opgeslagen> {
  const ontleed = ConceptSchema.safeParse(invoer)
  if (!ontleed.success) throw new CampagneError('De briefing kwam niet goed door. Herlaad de pagina en probeer het opnieuw.')
  let g
  try {
    g = leesConcept(ontleed.data)
  } catch (error) {
    if (error instanceof ConceptFout) throw new CampagneError(error.message)
    throw error
  }
  const voorstel = g.voorstel.filter((v) => v in VOORSTEL_VELDEN)

  const [c] = await db.select({ id: campaigns.id, updatedAt: campaigns.updatedAt }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1)
  if (!c) throw new CampagneError('Deze campagne bestaat niet meer.')

  // Alleen een verwerking die de briefing veranderde nadat dit scherm hem
  // laadde, telt. Een verwerking zet de briefing om en wordt een tel later
  // "klaar"; wie de briefing daarna laadde, heeft die versie al en mag dus
  // gewoon opslaan.
  const vanaf = new Date(sinds)
  if (!Number.isNaN(vanaf.getTime()) && c.updatedAt > vanaf) {
    const [verwerkt] = await db
      .select({ id: campaignVerwerkingen.id })
      .from(campaignVerwerkingen)
      .where(
        and(
          eq(campaignVerwerkingen.campaignId, campaignId),
          eq(campaignVerwerkingen.status, 'klaar'),
          gt(campaignVerwerkingen.klaarOp, vanaf),
        ),
      )
      .limit(1)
    if (verwerkt) {
      throw new CampagneError(
        'Terwijl je dit aanpaste, is er feedback in de briefing verwerkt. Opslaan zou dat overschrijven. Kopieer wat je wilt houden, herlaad de pagina en voer het opnieuw in.',
      )
    }
  }

  const ids: Record<string, string> = {}
  const nu = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(campaigns)
      .set({ ...g.campagne, proposalFields: voorstel, updatedAt: nu })
      .where(eq(campaigns.id, campaignId))

    await tx.delete(campaignContacts).where(eq(campaignContacts.campaignId, campaignId))
    if (g.contactIds.length > 0) await tx.insert(campaignContacts).values(g.contactIds.map((contactId) => ({ campaignId, contactId })))
    await tx.delete(campaignSpecialists).where(eq(campaignSpecialists.campaignId, campaignId))
    if (g.specialistIds.length > 0) await tx.insert(campaignSpecialists).values(g.specialistIds.map((userId) => ({ campaignId, userId })))

    // KPI's en deliverables: bijwerken wat blijft, toevoegen wat nieuw is, de rest weg.
    const kpiIds = g.kpis.flatMap((k) => (k.id ? [k.id] : []))
    await tx
      .delete(campaignKpis)
      .where(kpiIds.length > 0 ? and(eq(campaignKpis.campaignId, campaignId), notInArray(campaignKpis.id, kpiIds)) : eq(campaignKpis.campaignId, campaignId))
    for (const [position, { id, sleutel, ...k }] of g.kpis.entries()) {
      if (id) await tx.update(campaignKpis).set({ ...k, position }).where(and(eq(campaignKpis.id, id), eq(campaignKpis.campaignId, campaignId)))
      else {
        const [r] = await tx.insert(campaignKpis).values({ campaignId, position, ...k }).returning({ id: campaignKpis.id })
        if (r) ids[sleutel] = r.id
      }
    }

    const kanaalIds = g.kanalen.flatMap((k) => (k.id ? [k.id] : []))
    await tx
      .delete(campaignChannels)
      .where(
        kanaalIds.length > 0
          ? and(eq(campaignChannels.campaignId, campaignId), notInArray(campaignChannels.id, kanaalIds))
          : eq(campaignChannels.campaignId, campaignId),
      )
    for (const [position, { id, sleutel, ...k }] of g.kanalen.entries()) {
      if (id) await tx.update(campaignChannels).set({ ...k, position }).where(and(eq(campaignChannels.id, id), eq(campaignChannels.campaignId, campaignId)))
      else {
        const [r] = await tx.insert(campaignChannels).values({ campaignId, position, ...k }).returning({ id: campaignChannels.id })
        if (r) ids[sleutel] = r.id
      }
    }

    const tijdlijnIds = g.tijdlijn.flatMap((t) => (t.id ? [t.id] : []))
    await tx
      .delete(campaignTimeline)
      .where(
        tijdlijnIds.length > 0
          ? and(eq(campaignTimeline.campaignId, campaignId), notInArray(campaignTimeline.id, tijdlijnIds))
          : eq(campaignTimeline.campaignId, campaignId),
      )
    for (const { id, sleutel, ...t } of g.tijdlijn) {
      if (id) await tx.update(campaignTimeline).set(t).where(and(eq(campaignTimeline.id, id), eq(campaignTimeline.campaignId, campaignId)))
      else {
        const [r] = await tx.insert(campaignTimeline).values({ campaignId, ...t }).returning({ id: campaignTimeline.id })
        if (r) ids[sleutel] = r.id
      }
    }
  })

  return { ids, stempel: nu.toISOString() }
}
