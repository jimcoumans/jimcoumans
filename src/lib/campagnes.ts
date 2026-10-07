import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  campaigns,
  campaignKpis,
  campaignChannels,
  campaignTimeline,
  campaignContacts,
  campaignSpecialists,
  campaignAudiences,
  campaignVersions,
  organizationAudiences,
  organizations,
  organizationOwners,
  contacts,
  users,
} from '@/db/schema'
import type {
  Campaign,
  CampaignKpi,
  CampaignChannel,
  CampaignTimelineItem,
  OrganizationAudience,
  Contact,
  Organization,
} from '@/db/schema'
import { berekenHypothese, type HypotheseUitkomst } from './hypothese'
import { formatDate } from './dates'

/* -------------------------------------------------------------------------
   Campagnebriefings.

   Een briefing begint als concept, gaat als voorstel naar de klant en wordt
   na akkoord het werkblad van het team. Elke keer dat hij verstuurd of
   goedgekeurd wordt, bevriezen we hem als versie: wat de klant zag en waar
   hij ja op zei, blijft letterlijk terug te lezen.
   ------------------------------------------------------------------------- */

export class CampagneError extends Error {}

export const STATUS_LABELS: Record<Campaign['status'], string> = {
  concept: 'Concept',
  voorstel: 'Voorstel',
  akkoord: 'Akkoord',
  afgerond: 'Afgerond',
}

/** Tailwind-klassen per status, voor de chips. */
export const STATUS_STIJL: Record<Campaign['status'], string> = {
  concept: 'bg-gray-200 text-gray-700',
  voorstel: 'bg-jr-orange/15 text-[#9a5b00]',
  akkoord: 'bg-jr-green/15 text-[#1d7a36]',
  afgerond: 'bg-jr-lightblue text-jr-deepblue',
}

/** Velden die als voorstel aangevinkt kunnen worden, met hoe ze heten. */
export const VOORSTEL_VELDEN = {
  budget: 'Advertentiebudget',
  kernboodschap: 'Kernboodschap',
  regio: 'Regio',
  doel: 'Doel in één zin',
} as const
export type VoorstelVeld = keyof typeof VOORSTEL_VELDEN

/** De vaste omschrijvingen voor de tijdlijn. */
export const TIJDLIJN_OMSCHRIJVINGEN = [
  'Briefing akkoord',
  'Landingspagina klaar',
  'Content klaar',
  'Merkcheck',
  'Live',
  'Contentronde',
  'Mailing',
  'Beslismoment',
  'Hypothese naast de echte cijfers',
  'Einde campagne',
  'Evaluatie in de Performance Review',
] as const

/** De keuzelijst voor het kanaal van een deliverable. */
export const KANAAL_SOORTEN = [
  'Meta Ads: targeting',
  'Meta Ads: retargeting',
  'Google Ads',
  'Microsoft Ads',
  'LinkedIn Ads',
  'TikTok Ads',
  'Organisch: Instagram en Facebook',
  'Organisch: LinkedIn',
  'Mailing',
  'Landingspagina',
  'Drukwerk: flyer of poster',
  'Content: beeldenbank',
  'Content: draaidag',
  'Content: materiaal van de klant',
  'Content: sjablonen',
] as const

/**
 * Wanneer een deliverable live staat. Een mailing of post is één dag; een ad
 * loopt van tot. Zonder einddatum loopt hij "vanaf".
 */
export function livePeriode(k: Pick<CampaignChannel, 'kind' | 'liveFrom' | 'liveUntil'>): string {
  const eenDag = /^(mailing|organisch)/i.test(k.kind.trim())
  if (k.liveFrom && k.liveUntil && k.liveUntil.getTime() !== k.liveFrom.getTime()) return `${formatDate(k.liveFrom)} – ${formatDate(k.liveUntil)}`
  if (k.liveFrom) return eenDag || k.liveUntil ? formatDate(k.liveFrom) : `vanaf ${formatDate(k.liveFrom)}`
  return k.liveUntil ? `tot ${formatDate(k.liveUntil)}` : ''
}

/* ------------------------------ Lezen ------------------------------------ */

export type Specialist = { id: string; name: string | null; email: string; functie: string | null }

export type CampagneVolledig = {
  campagne: Campaign
  organisatie: Organization
  marketingmanager: { id: string; name: string | null; email: string } | null
  kpis: CampaignKpi[]
  kanalen: CampaignChannel[]
  tijdlijn: (CampaignTimelineItem & { assigneeName: string | null })[]
  contactpersonen: Contact[]
  /** Wie er naast de marketingmanager aan werkt, met de functie erbij. */
  specialisten: Specialist[]
  doelgroepen: OrganizationAudience[]
  hypothese: HypotheseUitkomst
  doelEenheden: number
  omzetCents: number
  versies: { version: number; status: Campaign['status']; createdAt: Date }[]
}

export async function getCampagne(id: string): Promise<CampagneVolledig | null> {
  const [rij] = await db
    .select({ campagne: campaigns, organisatie: organizations })
    .from(campaigns)
    .innerJoin(organizations, eq(organizations.id, campaigns.organizationId))
    .where(eq(campaigns.id, id))
    .limit(1)
  if (!rij) return null
  const c = rij.campagne

  const [mm, kpis, kanalen, tijdlijn, contactRijen, doelgroepRijen, versies, specialisten] = await Promise.all([
    c.marketingManagerId
      ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, c.marketingManagerId)).limit(1)
      : Promise.resolve([]),
    db.select().from(campaignKpis).where(eq(campaignKpis.campaignId, id)).orderBy(asc(campaignKpis.position), asc(campaignKpis.on)),
    db.select().from(campaignChannels).where(eq(campaignChannels.campaignId, id)).orderBy(asc(campaignChannels.position)),
    db
      .select({ item: campaignTimeline, assigneeName: users.name })
      .from(campaignTimeline)
      .leftJoin(users, eq(users.id, campaignTimeline.assigneeUserId))
      .where(eq(campaignTimeline.campaignId, id))
      .orderBy(sql`${campaignTimeline.dueOn} ASC NULLS LAST`, asc(campaignTimeline.description)),
    db
      .select({ contact: contacts })
      .from(campaignContacts)
      .innerJoin(contacts, eq(contacts.id, campaignContacts.contactId))
      .where(eq(campaignContacts.campaignId, id))
      .orderBy(asc(contacts.name)),
    db
      .select({ doelgroep: organizationAudiences })
      .from(campaignAudiences)
      .innerJoin(organizationAudiences, eq(organizationAudiences.id, campaignAudiences.audienceId))
      .where(eq(campaignAudiences.campaignId, id))
      .orderBy(asc(organizationAudiences.name)),
    db
      .select({ version: campaignVersions.version, status: campaignVersions.status, createdAt: campaignVersions.createdAt })
      .from(campaignVersions)
      .where(eq(campaignVersions.campaignId, id))
      .orderBy(desc(campaignVersions.createdAt)),
    listSpecialisten(id, c.organizationId),
  ])

  const doelEenheden = kpis.reduce((a, k) => a + k.targetQuantity, 0)
  const omzetCents = kpis.reduce((a, k) => a + k.targetQuantity * (k.priceCents ?? 0), 0)

  return {
    campagne: c,
    organisatie: rij.organisatie,
    marketingmanager: mm[0] ?? null,
    kpis,
    kanalen,
    tijdlijn: tijdlijn.map((t) => ({ ...t.item, assigneeName: t.assigneeName })),
    contactpersonen: contactRijen.map((r) => r.contact),
    specialisten,
    doelgroepen: doelgroepRijen.map((r) => r.doelgroep),
    hypothese: hypotheseVoor(c, doelEenheden, omzetCents),
    doelEenheden,
    omzetCents,
    versies,
  }
}

export function hypotheseVoor(c: Campaign, doelEenheden: number, omzetCents: number): HypotheseUitkomst {
  return berekenHypothese({
    doelEenheden,
    omzetCents,
    eenhedenPerConversieHonderdsten: c.unitsPerConversionHundredths,
    conversieBp: c.conversionRateBp,
    doorklikBp: c.clickThroughRateBp,
    cpmCents: c.cpmCents,
    bufferBp: c.bufferBp,
    stand: c.budgetMode,
    vastBudgetCents: c.fixedBudgetCents,
    aandeelAdsBp: c.adsShareBp,
    start: c.startOn,
    einde: c.endOn,
  })
}

/** Alle campagnes, nieuwste eerst, met de klantnaam. */
export async function listCampagnes(organizationId?: string) {
  return db
    .select({
      campagne: campaigns,
      klant: organizations.name,
      klantSlug: organizations.slug,
      marketingmanager: users.name,
    })
    .from(campaigns)
    .innerJoin(organizations, eq(organizations.id, campaigns.organizationId))
    .leftJoin(users, eq(users.id, campaigns.marketingManagerId))
    .where(organizationId ? eq(campaigns.organizationId, organizationId) : undefined)
    .orderBy(sql`${campaigns.startOn} DESC NULLS FIRST`, desc(campaigns.createdAt))
}

export async function listDoelgroepen(organizationId: string): Promise<OrganizationAudience[]> {
  return db
    .select()
    .from(organizationAudiences)
    .where(eq(organizationAudiences.organizationId, organizationId))
    .orderBy(asc(organizationAudiences.name))
}

/**
 * De specialisten op een campagne. De functie komt uit het teamprofiel; staat
 * die er niet, dan de rol die de collega bij deze klant heeft.
 */
async function listSpecialisten(campaignId: string, organizationId: string): Promise<Specialist[]> {
  const rijen = await db
    .select({ id: users.id, name: users.name, email: users.email, jobTitle: users.jobTitle, rol: organizationOwners.role })
    .from(campaignSpecialists)
    .innerJoin(users, eq(users.id, campaignSpecialists.userId))
    .leftJoin(
      organizationOwners,
      and(eq(organizationOwners.userId, users.id), eq(organizationOwners.organizationId, organizationId)),
    )
    .where(eq(campaignSpecialists.campaignId, campaignId))
    .orderBy(asc(users.name))
  return rijen.map((r) => ({ id: r.id, name: r.name, email: r.email, functie: r.jobTitle?.trim() || r.rol?.trim() || null }))
}

export async function zetSpecialisten(id: string, userIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(campaignSpecialists).where(eq(campaignSpecialists.campaignId, id))
    const uniek = [...new Set(userIds)]
    if (uniek.length > 0) await tx.insert(campaignSpecialists).values(uniek.map((userId) => ({ campaignId: id, userId })))
    await tx.update(campaigns).set({ updatedAt: new Date() }).where(eq(campaigns.id, id))
  })
}

/** Collega's die een tijdlijnregel of een campagne kunnen trekken. */
export async function listTeam() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, jobTitle: users.jobTitle, isMarketingManager: users.isMarketingManager })
    .from(users)
    .where(inArray(users.role, ['staff', 'admin']))
    .orderBy(asc(users.name))
}

/* ------------------------------ Schrijven -------------------------------- */

/**
 * Een nieuwe campagne voor een klant. De marketingmanager komt uit het
 * systeem: de eerste aanspreekpartner van de klant. De vaste contactpersoon
 * van de klant staat er meteen bij.
 */
export async function maakCampagne(input: {
  organizationId: string
  title: string
  createdByUserId: string
}): Promise<Campaign> {
  const title = input.title.trim()
  if (title === '') throw new CampagneError('Geef de campagne een naam.')

  return db.transaction(async (tx) => {
    const [eerste] = await tx
      .select({ userId: organizationOwners.userId })
      .from(organizationOwners)
      .where(and(eq(organizationOwners.organizationId, input.organizationId), eq(organizationOwners.isPrimary, true)))
      .limit(1)

    const [nieuw] = await tx
      .insert(campaigns)
      .values({
        organizationId: input.organizationId,
        title,
        marketingManagerId: eerste?.userId ?? null,
        createdByUserId: input.createdByUserId,
      })
      .returning()
    if (!nieuw) throw new CampagneError('De campagne kon niet worden aangemaakt.')

    const vaste = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.organizationId, input.organizationId), eq(contacts.isPrimary, true)))
      .limit(1)
    if (vaste[0]) await tx.insert(campaignContacts).values({ campaignId: nieuw.id, contactId: vaste[0].id })

    // De andere collega's die aan deze klant hangen, staan er meteen bij als specialist.
    const anderen = await tx
      .select({ userId: organizationOwners.userId })
      .from(organizationOwners)
      .where(and(eq(organizationOwners.organizationId, input.organizationId), eq(organizationOwners.isPrimary, false)))
    if (anderen.length > 0) await tx.insert(campaignSpecialists).values(anderen.map((a) => ({ campaignId: nieuw.id, userId: a.userId })))

    return nieuw
  })
}

/** Een deel van de briefing bijwerken. Alleen de velden die meegegeven zijn. */
export async function wijzigCampagne(
  id: string,
  patch: Partial<Omit<Campaign, 'id' | 'organizationId' | 'createdAt' | 'createdByUserId' | 'version' | 'status'>>,
): Promise<void> {
  if (patch.title !== undefined && patch.title.trim() === '') throw new CampagneError('Een campagne heeft een naam nodig.')
  await db.update(campaigns).set({ ...patch, updatedAt: new Date() }).where(eq(campaigns.id, id))
}

export async function zetContactpersonen(id: string, contactIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(campaignContacts).where(eq(campaignContacts.campaignId, id))
    if (contactIds.length > 0) await tx.insert(campaignContacts).values(contactIds.map((contactId) => ({ campaignId: id, contactId })))
    await tx.update(campaigns).set({ updatedAt: new Date() }).where(eq(campaigns.id, id))
  })
}

export async function zetDoelgroepen(id: string, audienceIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(campaignAudiences).where(eq(campaignAudiences.campaignId, id))
    if (audienceIds.length > 0) await tx.insert(campaignAudiences).values(audienceIds.map((audienceId) => ({ campaignId: id, audienceId })))
    await tx.update(campaigns).set({ updatedAt: new Date() }).where(eq(campaigns.id, id))
  })
}

/** Doelgroepen aan een campagne hangen, zonder de bestaande los te laten. */
export async function koppelDoelgroepen(campaignId: string, audienceIds: string[]): Promise<void> {
  const uniek = [...new Set(audienceIds)].filter(Boolean)
  if (uniek.length === 0) throw new CampagneError('Vink minstens één doelgroep aan.')
  await db
    .insert(campaignAudiences)
    .values(uniek.map((audienceId) => ({ campaignId, audienceId })))
    .onConflictDoNothing()
  await raak(campaignId)
}

/** Een doelgroep van de campagne halen. Bij de klant blijft hij bestaan. */
export async function ontkoppelDoelgroep(campaignId: string, audienceId: string): Promise<void> {
  await db
    .delete(campaignAudiences)
    .where(and(eq(campaignAudiences.campaignId, campaignId), eq(campaignAudiences.audienceId, audienceId)))
  await raak(campaignId)
}

export async function voegDoelgroepToe(organizationId: string, name: string, description: string | null) {
  if (name.trim() === '') throw new CampagneError('Geef de doelgroep een naam.')
  const [d] = await db.insert(organizationAudiences).values({ organizationId, name: name.trim(), description }).returning()
  return d
}

export async function wijzigDoelgroepRegel(id: string, name: string, description: string | null) {
  if (name.trim() === '') throw new CampagneError('Geef de doelgroep een naam.')
  await db.update(organizationAudiences).set({ name: name.trim(), description }).where(eq(organizationAudiences.id, id))
}

export async function verwijderDoelgroep(id: string) {
  await db.delete(organizationAudiences).where(eq(organizationAudiences.id, id))
}

export async function voegKpiToe(campaignId: string, kpi: { label: string; on: Date | null; targetQuantity: number; priceCents: number | null }) {
  if (kpi.label.trim() === '') throw new CampagneError('Geef het product of onderdeel een naam.')
  if (!Number.isInteger(kpi.targetQuantity) || kpi.targetQuantity <= 0) throw new CampagneError('Het doel is een heel aantal groter dan nul.')
  const [telling] = await db.select({ n: sql<number>`count(*)::int` }).from(campaignKpis).where(eq(campaignKpis.campaignId, campaignId))
  await db.insert(campaignKpis).values({ campaignId, position: telling?.n ?? 0, ...kpi, label: kpi.label.trim() })
  await raak(campaignId)
}

export async function wijzigKpiRegel(id: string, kpi: { label: string; on: Date | null; targetQuantity: number; priceCents: number | null }) {
  if (kpi.label.trim() === '') throw new CampagneError('Geef het product of onderdeel een naam.')
  if (!Number.isInteger(kpi.targetQuantity) || kpi.targetQuantity <= 0) throw new CampagneError('Het doel is een heel aantal groter dan nul.')
  const [k] = await db.update(campaignKpis).set({ ...kpi, label: kpi.label.trim() }).where(eq(campaignKpis.id, id)).returning()
  if (k) await raak(k.campaignId)
}

export async function verwijderKpi(id: string) {
  const [k] = await db.delete(campaignKpis).where(eq(campaignKpis.id, id)).returning()
  if (k) await raak(k.campaignId)
}

export type DeliverableInvoer = {
  name: string | null
  kind: string
  quantity: string | null
  note: string | null
  liveFrom: Date | null
  liveUntil: Date | null
  status: 'bestaat' | 'maken'
}

function controleerDeliverable(k: DeliverableInvoer) {
  if (k.kind.trim() === '') throw new CampagneError('Kies het kanaal van deze deliverable.')
  if (k.liveFrom && k.liveUntil && k.liveUntil < k.liveFrom) throw new CampagneError('De einddatum ligt vóór de startdatum.')
}

export async function voegKanaalToe(campaignId: string, k: DeliverableInvoer) {
  controleerDeliverable(k)
  const [telling] = await db.select({ n: sql<number>`count(*)::int` }).from(campaignChannels).where(eq(campaignChannels.campaignId, campaignId))
  await db.insert(campaignChannels).values({ campaignId, position: telling?.n ?? 0, ...k, kind: k.kind.trim(), name: k.name?.trim() || null })
  await raak(campaignId)
}

export async function wijzigKanaalRegel(id: string, k: DeliverableInvoer) {
  controleerDeliverable(k)
  const [r] = await db.update(campaignChannels).set({ ...k, kind: k.kind.trim(), name: k.name?.trim() || null }).where(eq(campaignChannels.id, id)).returning()
  if (r) await raak(r.campaignId)
}

export async function wisselKanaalStatus(id: string) {
  const [k] = await db
    .update(campaignChannels)
    .set({ status: sql`CASE WHEN ${campaignChannels.status} = 'maken' THEN 'bestaat'::channel_status ELSE 'maken'::channel_status END` })
    .where(eq(campaignChannels.id, id))
    .returning()
  if (k) await raak(k.campaignId)
}

export async function verwijderKanaal(id: string) {
  const [k] = await db.delete(campaignChannels).where(eq(campaignChannels.id, id)).returning()
  if (k) await raak(k.campaignId)
}

export async function voegTijdlijnToe(
  campaignId: string,
  t: { dueOn: Date | null; description: string; assigneeUserId: string | null; assigneeLabel: string | null },
) {
  if (t.description.trim() === '') throw new CampagneError('Zeg wat er moet gebeuren.')
  await db.insert(campaignTimeline).values({ campaignId, ...t, description: t.description.trim() })
  await raak(campaignId)
}

export async function wijzigTijdlijn(
  id: string,
  t: { dueOn: Date | null; description: string; assigneeUserId: string | null; assigneeLabel: string | null },
) {
  if (t.description.trim() === '') throw new CampagneError('Zeg wat er moet gebeuren.')
  const [r] = await db.update(campaignTimeline).set({ ...t, description: t.description.trim() }).where(eq(campaignTimeline.id, id)).returning()
  if (r) await raak(r.campaignId)
}

export async function verwijderTijdlijn(id: string) {
  const [r] = await db.delete(campaignTimeline).where(eq(campaignTimeline.id, id)).returning()
  if (r) await raak(r.campaignId)
}

async function raak(campaignId: string) {
  await db.update(campaigns).set({ updatedAt: new Date() }).where(eq(campaigns.id, campaignId))
}

/* ------------------------------ Suggesties ------------------------------- */

const DAG = 86_400_000
const plus = (d: Date, dagen: number) => new Date(d.getTime() + dagen * DAG)

/**
 * Een tijdlijn uit de start- en einddatum en wat er nog gemaakt moet worden.
 * Een voorstel om aan te passen, geen plan dat vastligt.
 */
export function suggereerTijdlijn(input: {
  start: Date
  einde: Date
  kanalen: (Pick<CampaignChannel, 'kind' | 'quantity' | 'status'> & Partial<Pick<CampaignChannel, 'name' | 'liveFrom'>>)[]
  marketingmanagerId: string | null
}): { dueOn: Date; description: string; assigneeUserId: string | null; assigneeLabel: string | null }[] {
  const { start, einde, kanalen } = input
  const mm = input.marketingmanagerId
  const regels: { dueOn: Date; description: string; assigneeUserId: string | null; assigneeLabel: string | null }[] = []
  const voor = (description: string, dueOn: Date, label: string | null, viaMm = false) =>
    regels.push({ dueOn, description, assigneeUserId: viaMm ? mm : null, assigneeLabel: viaMm ? null : label })

  voor('Briefing akkoord', plus(start, -2), null, true)
  // Ads die later live gaan dan de start (een tweede flight): per datum één regel "Live".
  const laterLive = new Map<number, string[]>()
  for (const k of kanalen.filter((k) => k.status === 'maken')) {
    const soort = k.kind.toLowerCase()
    const naam = k.name?.trim()
    // Een deliverable met een naam krijgt zijn eigen regel, op de dag voor hij live gaat.
    if (naam) {
      const live = k.liveFrom ?? start
      if (soort.startsWith('mailing')) voor(`${naam} verstuurd`, live, null, true)
      else if (soort.startsWith('organisch')) voor(`${naam} online`, live, 'Content')
      else if (soort.startsWith('landingspagina')) voor(`${naam} klaar`, plus(live, -2), 'Content en techniek')
      else voor(`${naam} klaar`, plus(live, -2), 'Content')
      if (/ads/.test(soort) && live.getTime() > start.getTime()) {
        const dag = live.getTime()
        laterLive.set(dag, [...(laterLive.get(dag) ?? []), naam])
      }
      continue
    }
    if (soort.startsWith('landingspagina')) voor('Landingspagina klaar', plus(start, -1), 'Content en techniek')
    else if (soort.startsWith('content')) voor(`Content klaar: ${k.kind.replace(/^Content:\s*/i, '')}`, plus(start, -1), 'Content')
    else if (soort.startsWith('mailing')) {
      const aantal = Math.max(1, Number.parseInt(k.quantity ?? '1', 10) || 1)
      // Mailings verspreid over de eerste driekwart van de looptijd: daarna is het te laat om nog te vullen.
      const looptijd = (einde.getTime() - start.getTime()) / DAG
      for (let n = 0; n < aantal; n++) {
        voor(`Mailing ${n + 1} van ${aantal}`, plus(start, Math.round(((n + 0.5) / aantal) * looptijd * 0.75)), null, true)
      }
    } else voor(`${k.kind} klaar`, plus(start, -1), 'Campagne')
  }
  voor('Merkcheck', plus(start, -1), null, true)
  voor('Live', start, 'Campagne')
  for (const [dag, namen] of laterLive) voor(`Live: ${opsomming(namen)}`, new Date(dag), 'Campagne')
  voor('Hypothese naast de echte cijfers', plus(start, 14), null, true)
  voor('Einde campagne', einde, 'Campagne')
  voor('Evaluatie in de Performance Review', plus(einde, 21), null, true)
  return regels.sort((a, b) => a.dueOn.getTime() - b.dueOn.getTime())
}

/** De samenvatting bovenaan, uit wat er is ingevuld. Aan te passen. */
export function suggereerSamenvatting(v: CampagneVolledig): string {
  const c = v.campagne
  const doel = c.goalSentence?.trim().replace(/\.$/, '')
  const delen = [`${v.organisatie.name}: ${c.title}.`]
  if (doel) delen.push(`${doel}.`)
  else if (v.doelEenheden > 0) {
    delen.push(
      `Het doel is ${v.doelEenheden.toLocaleString('nl-NL')}${v.omzetCents > 0 ? `, goed voor € ${Math.round(v.omzetCents / 100).toLocaleString('nl-NL')} omzet` : ''}.`,
    )
  }
  const middelen = kanaalWoorden(v.kanalen.map((k) => k.kind))
  const periode = c.startOn && c.endOn ? `van ${datumLang(c.startOn)} tot ${datumLang(c.endOn)}` : null
  if (middelen.length > 0) delen.push(`Met ${opsomming(middelen)}${periode ? `, ${periode}` : ''}.`)
  else if (periode) delen.push(`${periode.charAt(0).toUpperCase()}${periode.slice(1)}.`)
  return delen.join(' ')
}

/** Kanalen zoals je ze in een zin noemt: "Meta Ads, drie mailings en een landingspagina". Content laten we weg. */
function kanaalWoorden(soorten: string[]): string[] {
  const woorden: string[] = []
  const tel = (prefix: string) => soorten.filter((s) => s.toLowerCase().startsWith(prefix)).length
  for (const s of soorten) {
    const kop = (s.split(':')[0] ?? s).trim()
    const laag = kop.toLowerCase()
    if (laag === 'content' || laag === 'mailing' || laag === 'landingspagina') continue
    if (!woorden.includes(kop)) woorden.push(kop)
  }
  if (tel('mailing') > 0) woorden.push('mailings')
  if (tel('landingspagina') === 1) woorden.push('een eigen landingspagina')
  else if (tel('landingspagina') > 1) woorden.push('eigen landingspagina’s')
  return woorden
}

function opsomming(woorden: string[]): string {
  if (woorden.length <= 1) return woorden.join('')
  return `${woorden.slice(0, -1).join(', ')} en ${woorden[woorden.length - 1]}`
}

function datumLang(d: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

/* ------------------------------ Status ----------------------------------- */

/**
 * Versturen als voorstel: een nieuwe versie, bevroren. Zonder samenvatting
 * maken we er een, zodat de klant nooit een briefing zonder kop krijgt.
 */
export async function verstuurAlsVoorstel(id: string, userId: string): Promise<number> {
  const v = await getCampagne(id)
  if (!v) throw new CampagneError('Deze campagne bestaat niet meer.')
  if (v.campagne.status === 'afgerond') throw new CampagneError('Een afgeronde campagne versturen we niet opnieuw.')
  if (!v.campagne.startOn || !v.campagne.endOn) throw new CampagneError('Vul eerst de start- en einddatum in.')
  if (v.kpis.length === 0) throw new CampagneError('Vul eerst minstens één KPI in.')

  const samenvatting = v.campagne.summary?.trim() || suggereerSamenvatting(v)
  const versie = v.campagne.version + 1
  await db.transaction(async (tx) => {
    await tx.update(campaigns).set({ status: 'voorstel', version: versie, summary: samenvatting, updatedAt: new Date() }).where(eq(campaigns.id, id))
    await tx.insert(campaignVersions).values({
      campaignId: id,
      version: versie,
      status: 'voorstel',
      snapshot: momentopname({ ...v, campagne: { ...v.campagne, summary: samenvatting, status: 'voorstel', version: versie } }),
      createdByUserId: userId,
    })
  })
  return versie
}

/**
 * De klant is akkoord. Wat voorstel was, wordt akkoord, en we bevriezen deze
 * versie nog een keer met die status: dit is waar de klant ja op zei.
 */
export async function zetAkkoord(id: string, userId: string): Promise<void> {
  const v = await getCampagne(id)
  if (!v) throw new CampagneError('Deze campagne bestaat niet meer.')
  if (v.campagne.status !== 'voorstel') throw new CampagneError('Alleen een verstuurd voorstel kan akkoord krijgen.')
  await db.transaction(async (tx) => {
    await tx.update(campaigns).set({ status: 'akkoord', proposalFields: [], updatedAt: new Date() }).where(eq(campaigns.id, id))
    await tx.insert(campaignVersions).values({
      campaignId: id,
      version: v.campagne.version,
      status: 'akkoord',
      snapshot: momentopname({ ...v, campagne: { ...v.campagne, status: 'akkoord', proposalFields: [] } }),
      createdByUserId: userId,
    })
  })
}

/** Een regel erbij of eraf is ook een wijziging aan de briefing. */
export async function raakAan(id: string): Promise<void> {
  await db.update(campaigns).set({ updatedAt: new Date() }).where(eq(campaigns.id, id))
}

export async function zetStatus(id: string, status: 'concept' | 'afgerond'): Promise<void> {
  await db.update(campaigns).set({ status, updatedAt: new Date() }).where(eq(campaigns.id, id))
}

export async function verwijderCampagne(id: string): Promise<void> {
  const [c] = await db.select({ status: campaigns.status, version: campaigns.version }).from(campaigns).where(eq(campaigns.id, id)).limit(1)
  if (!c) return
  // Wat de klant ooit heeft gezien, blijft bestaan.
  if (c.version > 0) throw new CampagneError('Deze briefing is al naar de klant gestuurd en blijft als historie bewaard. Zet hem op afgerond.')
  await db.delete(campaigns).where(eq(campaigns.id, id))
}

export function momentopname(v: CampagneVolledig) {
  return JSON.parse(
    JSON.stringify({
      campagne: v.campagne,
      organisatie: { id: v.organisatie.id, name: v.organisatie.name },
      marketingmanager: v.marketingmanager,
      kpis: v.kpis,
      kanalen: v.kanalen,
      tijdlijn: v.tijdlijn,
      contactpersonen: v.contactpersonen.map((c) => ({ id: c.id, name: c.name })),
      specialisten: v.specialisten,
      doelgroepen: v.doelgroepen,
      hypothese: v.hypothese,
    }),
  )
}

/** Is de briefing veranderd sinds de laatste verstuurde versie? */
export function gewijzigdSindsVersie(v: CampagneVolledig): boolean {
  const laatste = v.versies[0]
  return !!laatste && v.campagne.updatedAt.getTime() > laatste.createdAt.getTime() + 1000
}

/** Klanten om een campagne voor te maken: alles behalve gearchiveerd. */
export async function listKlantenVoorCampagne() {
  return db
    .select({ id: organizations.id, name: organizations.name, status: organizations.status })
    .from(organizations)
    .orderBy(asc(organizations.name))
}
