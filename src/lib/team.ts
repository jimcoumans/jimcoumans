import { and, asc, eq, isNull, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { users, organizationOwners, organizations, subscriptions } from '@/db/schema'
import type { User } from '@/db/schema'
import type { Aanhef } from './namen'

/* -------------------------------------------------------------------------
   Het team.

   Een medewerker was tot nu toe een e-mailadres met een rol. Dat is genoeg om
   in te loggen, maar niet om mee te werken: je wilt weten wie iemand is, hoe
   je hem bereikt, hoeveel uur hij werkt en wanneer hij jarig is.

   Wat een uur van iemand kost staat er ook in, maar dat is alleen voor
   beheerders. Dat ligt te dicht tegen salaris aan om op een scherm te zetten
   dat het hele team openslaat.
   ------------------------------------------------------------------------- */

export class TeamError extends Error {}

export const AFDELINGEN = [
  'Marketing',
  'Web',
  'Managed Services',
  'Content Creatie',
  'Directie',
] as const

/** 3200 kwartieren is 32 uur. Zo blijft een halve dag een heel getal. */
export function formatContractUren(quarters: number | null): string | null {
  if (quarters === null) return null
  const uren = quarters / 100
  return `${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 }).format(uren)} uur`
}

export function parseContractUren(invoer: string): number | null {
  const schoon = invoer.trim().replace(',', '.')
  if (schoon === '') return null
  const getal = Number(schoon)
  if (!Number.isFinite(getal) || getal <= 0 || getal > 80) return null
  return Math.round(getal * 100)
}

export type TeamlidMetPortfolio = User & {
  /** Aantal klanten waar deze collega eerste aanspreekpartner van is. */
  klanten: number
  /** Wat die klanten samen per maand structureel opleveren. */
  portfolioCents: number
}

export async function listTeam(): Promise<TeamlidMetPortfolio[]> {
  const [team, portfolio] = await Promise.all([
    db
      .select()
      .from(users)
      .where(isNull(users.organizationId))
      .orderBy(asc(users.name), asc(users.email)),

    db
      .select({
        userId: organizationOwners.userId,
        klanten: sql<string>`COUNT(DISTINCT ${organizationOwners.organizationId})`,
        // Na korting: een portfolio telt wat er binnenkomt.
        cents: sql<string>`COALESCE(SUM(${subscriptions.amountExclVatCents} - ${subscriptions.discountCents}), 0)`,
      })
      .from(organizationOwners)
      .leftJoin(
        subscriptions,
        and(
          eq(subscriptions.organizationId, organizationOwners.organizationId),
          eq(subscriptions.status, 'active'),
        ),
      )
      .where(eq(organizationOwners.isPrimary, true))
      .groupBy(organizationOwners.userId),
  ])

  const perUser = new Map(
    portfolio.map((p) => [p.userId, { klanten: Number(p.klanten), cents: Number(p.cents) }]),
  )

  return team.map((lid) => {
    const eigen = perUser.get(lid.id)
    return { ...lid, klanten: eigen?.klanten ?? 0, portfolioCents: eigen?.cents ?? 0 }
  })
}

export type TeamlidDetail = {
  lid: User
  klanten: { id: string; naam: string; slug: string; status: string; maandCents: number; rol: string | null }[]
  portfolioCents: number
}

export async function getTeamlid(userId: string): Promise<TeamlidDetail | null> {
  const [lid] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!lid) return null

  const rijen = await db
    .select({
      id: organizations.id,
      naam: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
      rol: organizationOwners.role,
      isPrimary: organizationOwners.isPrimary,
      maandCents: sql<string>`COALESCE((
        SELECT SUM(${subscriptions.amountExclVatCents} - ${subscriptions.discountCents})
        FROM ${subscriptions}
        WHERE ${subscriptions.organizationId} = ${organizations.id}
          AND ${subscriptions.status} = 'active'
      ), 0)`,
    })
    .from(organizationOwners)
    .innerJoin(organizations, eq(organizations.id, organizationOwners.organizationId))
    .where(eq(organizationOwners.userId, userId))
    .orderBy(asc(organizations.name))

  const klanten = rijen.map((r) => ({
    id: r.id,
    naam: r.naam,
    slug: r.slug,
    status: r.status,
    maandCents: Number(r.maandCents),
    rol: r.rol,
  }))

  return {
    lid,
    klanten,
    // Alleen wat hij als eerste aanspreekpartner draagt telt als portfolio;
    // een tweede rol bij een klant is meekijken, geen dragen.
    portfolioCents: rijen
      .filter((r) => r.isPrimary)
      .reduce((t, r) => t + Number(r.maandCents), 0),
  }
}

export type TeamlidPatch = {
  /** Wordt samengesteld uit de delen hieronder; niet los invullen. */
  name: string | null
  firstName?: string | null
  infix?: string | null
  lastName?: string | null
  aanhef?: Aanhef | null
  jobTitle?: string | null
  department?: string | null
  phone?: string | null
  mobile?: string | null
  linkedinUrl?: string | null
  birthDay?: number | null
  birthMonth?: number | null
  birthYear?: number | null
  startedOn?: Date | null
  endedOn?: Date | null
  contractHoursPerWeekQuarters?: number | null
  notes?: string | null
}

export async function updateTeamlid(userId: string, patch: TeamlidPatch): Promise<void> {
  const [bestaand] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
  if (!bestaand) throw new TeamError('Collega niet gevonden.')

  await db
    .update(users)
    .set({
      name: patch.name?.trim() || null,
      firstName: patch.firstName?.trim() || null,
      infix: patch.infix?.trim() || null,
      lastName: patch.lastName?.trim() || null,
      aanhef: patch.aanhef ?? null,
      jobTitle: patch.jobTitle?.trim() || null,
      department: patch.department?.trim() || null,
      phone: patch.phone?.trim() || null,
      mobile: patch.mobile?.trim() || null,
      linkedinUrl: patch.linkedinUrl?.trim() || null,
      birthDay: patch.birthDay ?? null,
      birthMonth: patch.birthMonth ?? null,
      birthYear: patch.birthYear ?? null,
      startedOn: patch.startedOn ?? null,
      endedOn: patch.endedOn ?? null,
      contractHoursPerWeekQuarters: patch.contractHoursPerWeekQuarters ?? null,
      notes: patch.notes?.trim() || null,
    })
    .where(eq(users.id, userId))
}

/** Het uurtarief dat een collega ons kost. Apart, omdat alleen beheerders dit mogen zien. */
export async function setHourlyCost(userId: string, cents: number | null): Promise<void> {
  if (cents !== null && cents < 0) {
    throw new TeamError('Een uurkostprijs kan niet negatief zijn.')
  }
  await db.update(users).set({ hourlyCostCents: cents }).where(eq(users.id, userId))
}

/**
 * Verjaardagen van collega's in deze maand.
 *
 * Staat naast de verjaardagen van klanten in hetzelfde attentieoverzicht:
 * je eigen mensen vergeten terwijl je klanten feliciteert is een slechte ruil.
 */
export async function teamVerjaardagenInMaand(
  maand: number,
  peiljaar: number = new Date().getFullYear(),
) {
  const rijen = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.birthMonth, maand),
        isNotNull(users.birthDay),
        isNull(users.organizationId),
        isNull(users.endedOn),
      ),
    )
    .orderBy(asc(users.birthDay))

  return rijen.map((lid) => ({
    userId: lid.id,
    naam: lid.name ?? lid.email,
    jobTitle: lid.jobTitle,
    dag: lid.birthDay!,
    maand: lid.birthMonth!,
    wordt: lid.birthYear === null ? null : peiljaar - lid.birthYear,
  }))
}

/** Werkjubilea: collega's die deze maand een jaar langer in dienst zijn. */
export async function teamJubileaInMaand(maand: number, peildatum: Date = new Date()) {
  const rijen = await db
    .select()
    .from(users)
    .where(
      and(
        isNotNull(users.startedOn),
        isNull(users.endedOn),
        isNull(users.organizationId),
        sql`EXTRACT(MONTH FROM ${users.startedOn}) = ${maand}`,
      ),
    )
    .orderBy(asc(users.name))

  return rijen
    .map((lid) => {
      const sinds = new Date(lid.startedOn!)
      return {
        userId: lid.id,
        naam: lid.name ?? lid.email,
        sinds,
        jaren: peildatum.getFullYear() - sinds.getFullYear(),
        dag: sinds.getDate(),
      }
    })
    .filter((j) => j.jaren >= 1)
    .sort((a, b) => a.dag - b.dag)
}
