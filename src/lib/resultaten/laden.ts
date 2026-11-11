/* -------------------------------------------------------------------------
   Alles wat het tabblad Resultaten nodig heeft, voor één klant en één maand.
   Het rekenwerk zit in bereken.ts; hier alleen ophalen en samenvoegen.
   ------------------------------------------------------------------------- */

import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { type ReportAction, analyticsConnections, contacts, campaignChannels, campaigns, organizationOwners, organizations, performanceDaily, subscriptions, users } from '@/db/schema'
import type { Bron } from '../performance/bronnen'
import { analyseer, type Bevinding } from './analyse'
import { getActies } from './acties'
import {
  benchmark,
  cijfers,
  delta,
  isLeerfase,
  kanalen,
  maandNummer,
  maandPlus,
  oordeel,
  type Benchmark,
  type BenchmarkRij,
  type Cijfers,
  type Kanaal,
  type MaandRij,
  type Oordeel,
  type Provider,
} from './bereken'

export type Hoofddoel = 'aanvragen' | 'reserveringen' | 'omzet' | 'naamsbekendheid'

export const HOOFDDOEL_LABEL: Record<Hoofddoel, string> = {
  aanvragen: 'Meer aanvragen',
  reserveringen: 'Meer reserveringen en boekingen',
  omzet: 'Meer omzet',
  naamsbekendheid: 'Meer naamsbekendheid',
}

export type Selectie = Bron | 'alle'

export type Contactpersoon = {
  naam: string
  functie: string | null
  avatarImageId: string | null
  /** Heeft een inlog op het portaal (en die is niet ingetrokken). */
  inlog: boolean
  laatstIngelogd: Date | null
}

/** Contactpersonen uit het CRM, aangevuld met inloggers die (nog) geen contactpersoon zijn. */
function contactpersonen(
  rijen: { naam: string; functie: string | null; avatarImageId: string | null; userId: string | null; laatstIngelogd: Date | null; uitgeschakeld: Date | null }[],
  inloggers: { id: string; naam: string | null; email: string; functie: string | null; laatstIngelogd: Date | null; avatarImageId: string | null }[],
): Contactpersoon[] {
  const actieveInlog = new Set(inloggers.map((u) => u.id))
  const uit: Contactpersoon[] = rijen.map((c) => ({
    naam: c.naam,
    functie: c.functie,
    avatarImageId: c.avatarImageId,
    inlog: !!c.userId && actieveInlog.has(c.userId),
    laatstIngelogd: c.userId && actieveInlog.has(c.userId) ? c.laatstIngelogd : null,
  }))
  const gekoppeld = new Set(rijen.map((c) => c.userId).filter(Boolean))
  for (const u of inloggers) {
    if (gekoppeld.has(u.id)) continue
    uit.push({ naam: u.naam || u.email, functie: u.functie, avatarImageId: u.avatarImageId, inlog: true, laatstIngelogd: u.laatstIngelogd })
  }
  return uit
}

export type Maandbeeld = {
  maand: string
  kanalen: Kanaal[]
  cijfers: Cijfers
}

export type Verhoudingen = {
  benchmark: Benchmark
  ctr: Oordeel
  cvr: Oordeel
  icr: Oordeel
}

export type Resultaten = {
  klant: {
    id: string
    naam: string
    logoImageId: string | null
    branche: string | null
    hoofddoel: Hoofddoel | null
    liveOn: string | null
  }
  maand: string
  maandnr: number | null
  leerfase: boolean
  maanden: string[]
  gekoppeld: Provider[]
  marketingmanager: { naam: string; functie: string | null; email: string | null; telefoon: string | null; avatarImageId: string | null } | null
  /** Contactpersonen van de klant, met of zonder inlog op het portaal. */
  toegang: Contactpersoon[]
  nu: Maandbeeld
  vorigJaar: Maandbeeld
  /** Twaalf maanden tot en met de gekozen maand, plus dezelfde maand een jaar eerder vooraan. */
  reeks: Maandbeeld[]
  /** Per selectie (alle kanalen of één kanaal) het oordeel tegen de benchmark. */
  verhoudingen: Record<Selectie, Verhoudingen>
  /** Marketing Partnership en andere abonnementen in deze maand, of null als er geen zijn. */
  feeCents: number | null
  /** De analyse, belangrijkste eerst. */
  bevindingen: Bevinding[]
  /** Wat de marketingmanager voor deze maand heeft aangevinkt. */
  acties: ReportAction[]
  publicaties: { datum: string; titel: string }[]
}

const vandaagMaand = () => new Date().toISOString().slice(0, 7)

/** De standaardmaand: de laatste complete maand. */
export const standaardMaand = () => maandPlus(vandaagMaand(), -1)

export function geldigeMaand(m: string | undefined): string {
  if (m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= vandaagMaand()) return m
  return standaardMaand()
}

const eersteDag = (maand: string) => `${maand}-01`

/** Opgeteld per klant, maand, bron en platform. Zonder klant: alle klanten. */
async function maandRijen(van: string, totEnMet: string, organizationId?: string): Promise<MaandRij[]> {
  const maand = sql<string>`to_char(${performanceDaily.day}, 'YYYY-MM')`
  const rijen = await db
    .select({
      organizationId: performanceDaily.organizationId,
      maand,
      bron: performanceDaily.bron,
      provider: performanceDaily.provider,
      impressions: sql<string | null>`sum(${performanceDaily.impressions})`,
      clicks: sql<string | null>`sum(${performanceDaily.clicks})`,
      sessions: sql<string | null>`sum(${performanceDaily.sessions})`,
      conversions: sql<string | null>`sum(${performanceDaily.conversions})`,
      costCents: sql<string | null>`sum(${performanceDaily.costCents})`,
    })
    .from(performanceDaily)
    .where(
      and(
        gte(performanceDaily.day, eersteDag(van)),
        lt(performanceDaily.day, eersteDag(maandPlus(totEnMet, 1))),
        organizationId ? eq(performanceDaily.organizationId, organizationId) : undefined,
      ),
    )
    .groupBy(performanceDaily.organizationId, maand, performanceDaily.bron, performanceDaily.provider)
  const getal = (v: string | null) => (v == null ? null : Number(v))
  return rijen.map((r) => ({
    organizationId: r.organizationId,
    maand: r.maand,
    bron: r.bron,
    provider: r.provider as Provider,
    impressions: getal(r.impressions),
    clicks: getal(r.clicks),
    sessions: getal(r.sessions),
    conversions: getal(r.conversions),
    costCents: getal(r.costCents),
  }))
}

/** Welke bronnen per klant echt binnenkomen: actief en minstens één keer opgehaald. */
async function koppelingenPerKlant(organizationId?: string): Promise<Map<string, Set<Provider>>> {
  const rijen = await db
    .select({ organizationId: analyticsConnections.organizationId, source: analyticsConnections.source })
    .from(analyticsConnections)
    .where(
      and(
        eq(analyticsConnections.active, true),
        isNotNull(analyticsConnections.lastSyncedAt),
        organizationId ? eq(analyticsConnections.organizationId, organizationId) : undefined,
      ),
    )
  const uit = new Map<string, Set<Provider>>()
  for (const r of rijen) {
    if (!uit.has(r.organizationId)) uit.set(r.organizationId, new Set())
    uit.get(r.organizationId)!.add(r.source as Provider)
  }
  return uit
}

function beeld(maand: string, rijen: MaandRij[], gekoppeld: ReadonlySet<Provider>): Maandbeeld {
  const ks = kanalen(
    rijen.filter((r) => r.maand === maand),
    gekoppeld,
  )
  return { maand, kanalen: ks, cijfers: cijfers(ks) }
}

export const selectieCijfers = (b: Maandbeeld, s: Selectie): Cijfers =>
  cijfers(s === 'alle' ? b.kanalen : b.kanalen.filter((k) => k.bron === s))

export async function getResultaten(organizationId: string, maand: string): Promise<Resultaten | null> {
  const [org] = await db
    .select({
      id: organizations.id,
      naam: organizations.name,
      logoImageId: organizations.logoImageId,
      branche: organizations.industry,
      hoofddoel: organizations.mainGoal,
      liveOn: organizations.liveOn,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
  if (!org) return null

  // Zestien maanden: twaalf voor de grafiek, plus de drie maanden voor dezelfde maand vorig jaar (seizoen).
  const van = maandPlus(maand, -15)
  const [eigenRijen, alleRijen, koppelingen, alleOrgs, mm, toegang, abonnementen, pubs, acties, contactRijen, mmCampagne] = await Promise.all([
    maandRijen(van, maand, organizationId),
    maandRijen(maand, maand),
    koppelingenPerKlant(),
    db.select({ id: organizations.id, branche: organizations.industry, liveOn: organizations.liveOn }).from(organizations),
    db
      .select({
        naam: users.name,
        voornaam: users.firstName,
        functie: users.jobTitle,
        email: users.email,
        telefoon: users.phone,
        mobiel: users.mobile,
        avatarImageId: users.avatarImageId,
      })
      .from(organizationOwners)
      .innerJoin(users, eq(users.id, organizationOwners.userId))
      .where(and(eq(organizationOwners.organizationId, organizationId), isNull(users.disabledAt)))
      .orderBy(desc(organizationOwners.isPrimary), desc(users.isMarketingManager), asc(organizationOwners.createdAt))
      .limit(1),
    db
      .select({ id: users.id, naam: users.name, email: users.email, functie: users.jobTitle, laatstIngelogd: users.lastLoginAt, avatarImageId: users.avatarImageId })
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.role, 'client'), isNull(users.disabledAt)))
      .orderBy(asc(users.name)),
    db
      .select({ bedrag: subscriptions.amountExclVatCents, korting: subscriptions.discountCents })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.organizationId, organizationId),
          inArray(subscriptions.status, ['active', 'ended']),
          lt(subscriptions.startedOn, new Date(`${eersteDag(maandPlus(maand, 1))}T00:00:00Z`)),
          or(isNull(subscriptions.endsOn), gte(subscriptions.endsOn, new Date(`${eersteDag(maand)}T00:00:00Z`))),
        ),
      ),
    db
      .select({ datum: campaignChannels.liveFrom, naam: campaignChannels.name, soort: campaignChannels.kind, campagne: campaigns.title })
      .from(campaignChannels)
      .innerJoin(campaigns, eq(campaigns.id, campaignChannels.campaignId))
      .where(
        and(
          eq(campaigns.organizationId, organizationId),
          isNotNull(campaignChannels.liveFrom),
          gte(campaignChannels.liveFrom, new Date(`${eersteDag(van)}T00:00:00Z`)),
          lte(campaignChannels.liveFrom, new Date(`${eersteDag(maandPlus(maand, 1))}T00:00:00Z`)),
        ),
      ),
    getActies(organizationId, maand),
    db
      .select({
        naam: contacts.name,
        functie: contacts.jobTitle,
        avatarImageId: contacts.avatarImageId,
        userId: contacts.userId,
        laatstIngelogd: users.lastLoginAt,
        uitgeschakeld: users.disabledAt,
      })
      .from(contacts)
      .leftJoin(users, eq(users.id, contacts.userId))
      .where(and(eq(contacts.organizationId, organizationId), eq(contacts.active, true)))
      .orderBy(desc(contacts.isPrimary), asc(contacts.name)),
    // Geen vaste aanspreekpartner? Dan de marketingmanager van de laatste campagne.
    db
      .select({
        naam: users.name,
        voornaam: users.firstName,
        functie: users.jobTitle,
        email: users.email,
        telefoon: users.phone,
        mobiel: users.mobile,
        avatarImageId: users.avatarImageId,
      })
      .from(campaigns)
      .innerJoin(users, eq(users.id, campaigns.marketingManagerId))
      .where(and(eq(campaigns.organizationId, organizationId), isNull(users.disabledAt)))
      .orderBy(desc(campaigns.createdAt))
      .limit(1),
  ])

  const gekoppeld = koppelingen.get(organizationId) ?? new Set<Provider>()
  const maanden: string[] = []
  for (let i = 12; i >= 0; i -= 1) maanden.push(maandPlus(maand, -i))
  const reeks = maanden.map((m) => beeld(m, eigenRijen, gekoppeld))
  const nu = reeks[reeks.length - 1]!
  const vorigJaar = reeks[0]!
  const historie = (n: number) => beeld(maandPlus(maand, -n), eigenRijen, gekoppeld)

  const maandnr = maandNummer(org.liveOn, maand)
  const leerfase = isLeerfase(maandnr)

  // Benchmark: dezelfde maand, alle klanten met cijfers, per selectie.
  const brancheVan = new Map(alleOrgs.map((o) => [o.id, o.branche]))
  const perKlant = new Map<string, Maandbeeld>()
  for (const id of new Set(alleRijen.map((r) => r.organizationId))) {
    perKlant.set(id, beeld(maand, alleRijen.filter((r) => r.organizationId === id), koppelingen.get(id) ?? new Set()))
  }
  const selecties: Selectie[] = ['alle', ...nu.kanalen.map((k) => k.bron)]
  const verhoudingen = {} as Record<Selectie, Verhoudingen>
  for (const s of selecties) {
    const rijen: BenchmarkRij[] = []
    for (const [id, b] of perKlant) {
      const c = selectieCijfers(b, s)
      if ((c.bezoekers ?? 0) <= 0) continue
      rijen.push({ organizationId: id, branche: brancheVan.get(id) ?? null, ctr: c.ctr, cvr: c.cvr, icr: c.icr })
    }
    const bm = benchmark(rijen, org.branche)
    const c = selectieCijfers(nu, s)
    verhoudingen[s] = {
      benchmark: bm,
      ctr: oordeel(c.bezoekers, c.impressiesDeels ? null : c.impressies, bm?.ctr ?? null, leerfase),
      cvr: oordeel(c.conversies, c.bezoekers, bm?.cvr ?? null, leerfase),
      icr: oordeel(c.conversies, c.impressiesDeels ? null : c.impressies, bm?.icr ?? null, leerfase),
    }
  }

  const bevindingen = analyseer({
    nu,
    ervoor: [3, 2, 1].map(historie),
    vorigJaar,
    vorigJaarErvoor: [15, 14, 13].map(historie),
    oordelen: verhoudingen,
    leerfase,
    metGa4: gekoppeld.has('ga4'),
  })

  const m = mm[0] ?? mmCampagne[0]
  const fee = abonnementen.reduce((t, a) => t + a.bedrag - a.korting, 0)

  return {
    klant: { ...org, hoofddoel: org.hoofddoel as Hoofddoel | null },
    maand,
    maandnr,
    leerfase,
    maanden,
    gekoppeld: [...gekoppeld],
    marketingmanager: m
      ? { naam: m.naam || m.email, functie: m.functie, email: m.email, telefoon: m.telefoon || m.mobiel, avatarImageId: m.avatarImageId }
      : null,
    toegang: contactpersonen(contactRijen, toegang),
    nu,
    vorigJaar,
    reeks: reeks.slice(1),
    verhoudingen,
    feeCents: abonnementen.length ? fee : null,
    bevindingen,
    acties,
    publicaties: pubs
      .filter((p) => p.datum)
      .map((p) => ({ datum: p.datum!.toISOString().slice(0, 10), titel: `${p.campagne}: ${p.naam || p.soort}` })),
  }
}

export { delta }
