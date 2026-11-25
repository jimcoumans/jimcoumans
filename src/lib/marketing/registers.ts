import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  marketingClientIndustries,
  marketingClients,
  marketingContentItems,
  marketingContentSubjectLinks,
  marketingCoverage,
  marketingEngineComponents,
  marketingIndustries,
  marketingPackageComponents,
  marketingSubjects,
} from '@/db/schema'

/* -------------------------------------------------------------------------
   De centrale registers van Marketing → Website: onderwerpen (diensten,
   pakketten, doelstellingen, Engine, algemene pagina's), branches, de
   onderdelen van de Performance Engine, de activatie per pakket en de
   referentieklanten. Inhoudelijke keuzes maakt James Robinson hier zelf;
   de module legt niets vast als definitieve commerciële waarheid.
   ------------------------------------------------------------------------- */

export class MarketingFout extends Error {}

export type OnderwerpType = 'service' | 'package' | 'objective' | 'engine' | 'general_page'
export const ONDERWERP_TYPES: OnderwerpType[] = ['service', 'package', 'objective', 'engine', 'general_page']

/** "Google Ads" → "google-ads". */
export function maakSlug(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' en ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function lijstOnderwerpen(opts: { type?: OnderwerpType; ookGearchiveerd?: boolean } = {}) {
  const w = []
  if (opts.type) w.push(eq(marketingSubjects.type, opts.type))
  if (!opts.ookGearchiveerd) w.push(eq(marketingSubjects.lifecycleStatus, 'active'))
  return db.select().from(marketingSubjects).where(w.length ? and(...w) : undefined).orderBy(asc(marketingSubjects.type), asc(marketingSubjects.sortOrder), asc(marketingSubjects.name))
}

export async function bewaarOnderwerp(inv: { id?: string; type: OnderwerpType; name: string; slug?: string; description?: string; sortOrder?: number; demo?: boolean }) {
  const waarden = {
    type: inv.type,
    name: inv.name.trim(),
    slug: (inv.slug?.trim() || maakSlug(inv.name)),
    description: inv.description?.trim() || null,
    sortOrder: inv.sortOrder ?? 0,
    updatedAt: new Date(),
  }
  if (inv.id) {
    const [r] = await db.update(marketingSubjects).set(waarden).where(eq(marketingSubjects.id, inv.id)).returning()
    return r!
  }
  const [r] = await db.insert(marketingSubjects).values({ ...waarden, demo: inv.demo ?? false }).returning()
  return r!
}

/** Archiveren mag altijd; de pagina's en revisies blijven bestaan. */
export async function zetOnderwerpStatus(id: string, actief: boolean) {
  await db.update(marketingSubjects).set({ lifecycleStatus: actief ? 'active' : 'archived', updatedAt: new Date() }).where(eq(marketingSubjects.id, id))
}

/** Verwijderen kan alleen als niets het onderwerp gebruikt; anders archiveren. */
export async function verwijderOnderwerp(id: string) {
  const [gebruikt] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(marketingContentItems)
    .where(eq(marketingContentItems.subjectId, id))
  const [gekoppeld] = await db.select({ n: sql<number>`count(*)::int` }).from(marketingContentSubjectLinks).where(eq(marketingContentSubjectLinks.subjectId, id))
  const [gepland] = await db.select({ n: sql<number>`count(*)::int` }).from(marketingCoverage).where(eq(marketingCoverage.subjectId, id))
  if ((gebruikt?.n ?? 0) + (gekoppeld?.n ?? 0) + (gepland?.n ?? 0) > 0) {
    throw new MarketingFout('Dit onderwerp wordt gebruikt door content of planning. Archiveer het in plaats van het te verwijderen.')
  }
  await db.delete(marketingSubjects).where(eq(marketingSubjects.id, id))
}

export async function lijstBranches(opts: { ookInactief?: boolean } = {}) {
  return db
    .select()
    .from(marketingIndustries)
    .where(opts.ookInactief ? undefined : eq(marketingIndustries.active, true))
    .orderBy(desc(marketingIndustries.priority), asc(marketingIndustries.name))
}

export async function bewaarBranche(inv: { id?: string; name: string; slug?: string; description?: string; priority?: number; active?: boolean; demo?: boolean }) {
  const waarden = {
    name: inv.name.trim(),
    slug: inv.slug?.trim() || maakSlug(inv.name),
    description: inv.description?.trim() || null,
    priority: inv.priority ?? 0,
    active: inv.active ?? true,
    updatedAt: new Date(),
  }
  if (inv.id) {
    const [r] = await db.update(marketingIndustries).set(waarden).where(eq(marketingIndustries.id, inv.id)).returning()
    return r!
  }
  const [r] = await db.insert(marketingIndustries).values({ ...waarden, demo: inv.demo ?? false }).returning()
  return r!
}

export async function verwijderBranche(id: string) {
  const [gebruikt] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(marketingContentItems)
    .where(eq(marketingContentItems.industryId, id))
  if ((gebruikt?.n ?? 0) > 0) throw new MarketingFout('Deze branche heeft content. Zet hem op inactief in plaats van hem te verwijderen.')
  await db.delete(marketingIndustries).where(eq(marketingIndustries.id, id))
}

/* --------------------------- Performance Engine --------------------------- */

export type EngineGroep = 'direction' | 'core_driver' | 'fuel' | 'booster' | 'optimiser' | 'intelligence' | 'infrastructure'
export const ENGINE_GROEPEN: EngineGroep[] = ['direction', 'core_driver', 'fuel', 'booster', 'optimiser', 'intelligence', 'infrastructure']

/** Het voorlopige begrippenkader uit de opdracht. Alleen te laden als er nog geen onderdelen zijn. */
export const VOORLOPIG_KADER: { group: EngineGroep; name: string }[] = [
  { group: 'direction', name: 'Strategy & Objectives' },
  { group: 'core_driver', name: 'Paid Search' },
  { group: 'core_driver', name: 'Paid Social' },
  { group: 'core_driver', name: 'AI Visibility' },
  { group: 'fuel', name: 'Copy' },
  { group: 'fuel', name: 'Fotografie' },
  { group: 'fuel', name: 'Video' },
  { group: 'booster', name: 'Mediabudget' },
  { group: 'booster', name: 'Autoriteitsopbouw en linkbuilding' },
  { group: 'optimiser', name: 'SEO' },
  { group: 'optimiser', name: 'CRO' },
  { group: 'optimiser', name: 'E-mailmarketing' },
  { group: 'optimiser', name: 'AI' },
  { group: 'optimiser', name: 'Automation' },
  { group: 'optimiser', name: 'Tooling' },
  { group: 'intelligence', name: 'Data, tracking, analyse en proactieve rapportage' },
  { group: 'infrastructure', name: 'Techniek, snelheid en integraties' },
]

export async function lijstComponenten() {
  return db.select().from(marketingEngineComponents).orderBy(asc(marketingEngineComponents.group), asc(marketingEngineComponents.sortOrder), asc(marketingEngineComponents.name))
}

export async function laadVoorlopigKader() {
  const bestaand = await lijstComponenten()
  if (bestaand.length) throw new MarketingFout('Er staan al Engine-onderdelen. Het voorlopige kader laad je alleen in een lege Engine.')
  await db.insert(marketingEngineComponents).values(VOORLOPIG_KADER.map((c, i) => ({ ...c, sortOrder: i })))
}

export async function bewaarComponent(inv: { id?: string; group: EngineGroep; name: string; description?: string; sortOrder?: number; active?: boolean }) {
  const waarden = { group: inv.group, name: inv.name.trim(), description: inv.description?.trim() || null, sortOrder: inv.sortOrder ?? 0, active: inv.active ?? true }
  if (inv.id) await db.update(marketingEngineComponents).set(waarden).where(eq(marketingEngineComponents.id, inv.id))
  else await db.insert(marketingEngineComponents).values(waarden)
}

export type Activatie = 'always' | 'optional' | 'off' | 'undecided'

/** De activatie per pakket per onderdeel; ontbrekend = nog te bepalen. */
export async function pakketActivaties() {
  return db.select().from(marketingPackageComponents)
}

export async function zetActivatie(packageSubjectId: string, componentId: string, activation: Activatie, notes?: string) {
  const [pakket] = await db.select({ type: marketingSubjects.type }).from(marketingSubjects).where(eq(marketingSubjects.id, packageSubjectId)).limit(1)
  if (!pakket || pakket.type !== 'package') throw new MarketingFout('Activaties horen bij een pakket.')
  await db
    .insert(marketingPackageComponents)
    .values({ packageSubjectId, componentId, activation, notes: notes?.trim() || null })
    .onConflictDoUpdate({ target: [marketingPackageComponents.packageSubjectId, marketingPackageComponents.componentId], set: { activation, notes: notes?.trim() || null, updatedAt: new Date() } })
}

/* ----------------------------- Referentieklanten ----------------------------- */

export async function lijstKlanten() {
  const klanten = await db.select().from(marketingClients).orderBy(asc(marketingClients.name))
  const ids = klanten.map((k) => k.id)
  const branches = ids.length ? await db.select().from(marketingClientIndustries).where(inArray(marketingClientIndustries.clientId, ids)) : []
  return klanten.map((k) => ({ ...k, industryIds: branches.filter((b) => b.clientId === k.id).map((b) => b.industryId) }))
}

export async function bewaarKlant(inv: { id?: string; name: string; publicDescription?: string; permission?: 'unknown' | 'granted' | 'denied'; industryIds?: string[]; demo?: boolean }) {
  return db.transaction(async (tx) => {
    const waarden = { name: inv.name.trim(), publicDescription: inv.publicDescription?.trim() || null, publicPermissionStatus: inv.permission ?? 'unknown' }
    let id = inv.id
    if (id) await tx.update(marketingClients).set(waarden).where(eq(marketingClients.id, id))
    else id = (await tx.insert(marketingClients).values({ ...waarden, demo: inv.demo ?? false }).returning())[0]!.id
    if (inv.industryIds) {
      await tx.delete(marketingClientIndustries).where(eq(marketingClientIndustries.clientId, id))
      if (inv.industryIds.length) await tx.insert(marketingClientIndustries).values([...new Set(inv.industryIds)].map((industryId) => ({ clientId: id!, industryId })))
    }
    return id!
  })
}

/** Rechten: redactie = elke medewerker, review en beheer = beheerder. Klanten nooit. */
export type MarketingRecht = 'lezen' | 'bewerken' | 'beoordelen' | 'beheren'
export function magMarketing(rol: string | null | undefined, recht: MarketingRecht): boolean {
  if (rol === 'admin') return true
  if (rol === 'staff') return recht === 'lezen' || recht === 'bewerken'
  return false
}

