import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyticsConnections, organizations, performanceDaily, type AnalyticsConnection } from '@/db/schema'
import { KoppelingFout, ga4PropertyId, searchConsoleSite } from './google'
import type { DagRij } from './bronnen'

/* De cijfers voor de schermen: per klant of voor alle klanten samen. */

export async function getKoppelingen(organizationId: string): Promise<AnalyticsConnection[]> {
  return db.select().from(analyticsConnections).where(eq(analyticsConnections.organizationId, organizationId)).orderBy(asc(analyticsConnections.createdAt))
}

/** Dagcijfers per bron, opgeteld over de koppelingen. Zonder klant: alle klanten samen. */
export async function getDagcijfers(van: string, tot: string, organizationId?: string): Promise<DagRij[]> {
  const waar = [gte(performanceDaily.day, van), lte(performanceDaily.day, tot)]
  if (organizationId) waar.push(eq(performanceDaily.organizationId, organizationId))
  const rijen = await db
    .select({
      day: performanceDaily.day,
      bron: performanceDaily.bron,
      impressions: sql<string | null>`SUM(${performanceDaily.impressions})`,
      clicks: sql<string | null>`SUM(${performanceDaily.clicks})`,
      sessions: sql<string | null>`SUM(${performanceDaily.sessions})`,
      conversions: sql<string | null>`SUM(${performanceDaily.conversions})`,
      costCents: sql<string | null>`SUM(${performanceDaily.costCents})`,
    })
    .from(performanceDaily)
    .where(and(...waar))
    .groupBy(performanceDaily.day, performanceDaily.bron)
  const n = (v: string | null) => (v === null ? null : Number(v))
  return rijen.map((r) => ({ ...r, impressions: n(r.impressions), clicks: n(r.clicks), sessions: n(r.sessions), conversions: n(r.conversions), costCents: n(r.costCents) }))
}

/** Per klant de totalen in een periode, voor de overall-view. */
export async function getPerKlant(van: string, tot: string) {
  const rijen = await db
    .select({
      id: organizations.id,
      naam: organizations.name,
      slug: organizations.slug,
      impressies: sql<string>`COALESCE(SUM(${performanceDaily.impressions}), 0)`,
      bezoeken: sql<string>`COALESCE(SUM(${performanceDaily.sessions}), 0)`,
      conversies: sql<string>`COALESCE(SUM(${performanceDaily.conversions}), 0)`,
      kostenCents: sql<string>`COALESCE(SUM(${performanceDaily.costCents}), 0)`,
    })
    .from(performanceDaily)
    .innerJoin(organizations, eq(organizations.id, performanceDaily.organizationId))
    .where(and(gte(performanceDaily.day, van), lte(performanceDaily.day, tot)))
    .groupBy(organizations.id, organizations.name, organizations.slug)
  return rijen
    .map((r) => ({ ...r, impressies: Number(r.impressies), bezoeken: Number(r.bezoeken), conversies: Number(r.conversies), kostenCents: Number(r.kostenCents) }))
    .sort((a, b) => b.conversies - a.conversies || b.bezoeken - a.bezoeken)
}

/** Alle koppelingen met de klantnaam, voor het overzicht van wat er gekoppeld is. */
export async function getAlleKoppelingen() {
  return db
    .select({ k: analyticsConnections, naam: organizations.name, slug: organizations.slug })
    .from(analyticsConnections)
    .innerJoin(organizations, eq(organizations.id, analyticsConnections.organizationId))
    .orderBy(asc(organizations.name))
}

/* ------------------------------ Koppelen --------------------------------- */

export const BRON_KOPPELING: Record<AnalyticsConnection['source'], { naam: string; veld: string; voorbeeld: string; uitleg: string }> = {
  ga4: {
    naam: 'Google Analytics 4',
    veld: 'Property-ID',
    voorbeeld: '412345678',
    uitleg: 'In GA4 onder Beheer → Property-details. Een getal, niet de meet-ID (G-...).',
  },
  search_console: {
    naam: 'Google Search Console',
    veld: 'Site',
    voorbeeld: 'thiessen.nl of https://www.thiessen.nl/',
    uitleg: 'Precies zoals de property in Search Console heet. Een domein zonder https is een domeinproperty.',
  },
  google_ads: { naam: 'Google Ads', veld: 'Klant-ID', voorbeeld: '123-456-7890', uitleg: 'Rechtsboven in Google Ads, of in jullie MCC.' },
  meta_ads: { naam: 'Meta Ads', veld: 'Advertentieaccount-ID', voorbeeld: 'act_1234567890', uitleg: 'In Business Manager onder Advertentieaccounts.' },
  linkedin_ads: { naam: 'LinkedIn Ads', veld: 'Account-ID', voorbeeld: '512345678', uitleg: 'In Campaign Manager, naast de accountnaam.' },
  tiktok_ads: { naam: 'TikTok Ads', veld: 'Advertiser-ID', voorbeeld: '7123456789012345678', uitleg: 'In TikTok Ads Manager onder het account.' },
}

/** Nakijken en in nette vorm zetten; gooit een begrijpelijke fout. */
export function normaliseerExternId(source: AnalyticsConnection['source'], invoer: string): string {
  const s = invoer.trim()
  switch (source) {
    case 'ga4':
      return ga4PropertyId(s)
    case 'search_console':
      return searchConsoleSite(s)
    case 'google_ads': {
      const cijfers = s.replace(/-/g, '')
      if (!/^\d{10}$/.test(cijfers)) throw new KoppelingFout('Een Google Ads-klant-ID heeft 10 cijfers, zoals 123-456-7890.')
      return `${cijfers.slice(0, 3)}-${cijfers.slice(3, 6)}-${cijfers.slice(6)}`
    }
    case 'meta_ads': {
      const n = s.replace(/^act_/, '')
      if (!/^\d{6,20}$/.test(n)) throw new KoppelingFout('Een Meta-advertentieaccount is act_ gevolgd door cijfers.')
      return `act_${n}`
    }
    default:
      if (!/^\d{5,25}$/.test(s)) throw new KoppelingFout('Vul het account-ID in: alleen cijfers.')
      return s
  }
}

export async function zetKoppeling(
  organizationId: string,
  source: AnalyticsConnection['source'],
  invoer: string,
  via: { googleConnectionId?: string | null; displayName?: string | null } = {},
) {
  const externalId = normaliseerExternId(source, invoer)
  const herkomst = { googleConnectionId: via.googleConnectionId ?? null, displayName: via.displayName?.trim() || null }
  // Een ander ID betekent andere cijfers: de oude historie hoort er dan niet meer bij.
  const [oud] = await db
    .select()
    .from(analyticsConnections)
    .where(and(eq(analyticsConnections.organizationId, organizationId), eq(analyticsConnections.source, source)))
  if (oud && oud.externalId !== externalId) {
    await db.delete(performanceDaily).where(and(eq(performanceDaily.organizationId, organizationId), eq(performanceDaily.provider, source)))
  }
  await db
    .insert(analyticsConnections)
    .values({ organizationId, source, externalId, ...herkomst })
    .onConflictDoUpdate({
      target: [analyticsConnections.organizationId, analyticsConnections.source],
      set:
        oud && oud.externalId === externalId
          ? { active: true, ...herkomst, lastError: null, lastErrorAt: null }
          : { externalId, ...herkomst, active: true, historyFrom: null, lastSyncedAt: null, lastError: null, lastErrorAt: null },
    })
}

/** Ontkoppelen haalt ook de cijfers van die bron weg; anders tellen ze stilletjes mee. */
export async function verwijderKoppeling(id: string) {
  const [k] = await db.select().from(analyticsConnections).where(eq(analyticsConnections.id, id))
  if (!k) return
  await db.transaction(async (tx) => {
    await tx.delete(performanceDaily).where(and(eq(performanceDaily.organizationId, k.organizationId), eq(performanceDaily.provider, k.source)))
    await tx.delete(analyticsConnections).where(eq(analyticsConnections.id, id))
  })
}
