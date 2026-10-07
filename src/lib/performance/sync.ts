import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyticsConnections, organizations, performanceDaily, type AnalyticsConnection } from '@/db/schema'
import { KoppelingFout, haalGa4, haalSearchConsole, type Dagcijfers } from './google'
import { getVerbinding, toegangstoken } from './oauth'

/* -------------------------------------------------------------------------
   Cijfers ophalen en bewaren.

   Elk uur: per koppeling de laatste dagen opnieuw (GA4 en Search Console
   werken cijfers tot een paar dagen terug nog bij), en één stuk historie
   erbij tot er dertien maanden staat. Een geplande functie op Netlify mag
   maar 30 seconden draaien, dus de run stopt op tijd en gaat het volgende
   uur verder bij de koppeling die het langst niet is bijgewerkt.
   ------------------------------------------------------------------------- */

const RECENT_DAGEN = 4
const STUK_DAGEN = 120
const HISTORIE_MAANDEN = 13

/** Welke bronnen we al kunnen ophalen. De rest wacht op een goedgekeurde koppeling (V2/V3). */
export const KAN_OPHALEN: Record<AnalyticsConnection['source'], boolean> = {
  ga4: true,
  search_console: true,
  google_ads: false,
  meta_ads: false,
  linkedin_ads: false,
  tiktok_ads: false,
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const dagen = (d: string, n: number) => iso(new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86400000))

/** Welke stukken deze run ophaalt: altijd de laatste dagen, en zo nodig een stuk historie. */
export function teHalen(historyFrom: string | null, vandaag: Date): { van: string; tot: string; nieuweHistorie: string }[] {
  const tot = iso(vandaag)
  const recentVan = dagen(tot, -(RECENT_DAGEN - 1))
  const doel = iso(new Date(Date.UTC(vandaag.getUTCFullYear(), vandaag.getUTCMonth() - HISTORIE_MAANDEN, 1)))
  const stukken = [{ van: recentVan, tot, nieuweHistorie: historyFrom && historyFrom < recentVan ? historyFrom : recentVan }]
  const vanaf = historyFrom && historyFrom < recentVan ? historyFrom : recentVan
  if (vanaf > doel) {
    const stukTot = dagen(vanaf, -1)
    const stukVan = [dagen(stukTot, -(STUK_DAGEN - 1)), doel].sort().at(-1)!
    stukken.push({ van: stukVan, tot: stukTot, nieuweHistorie: stukVan })
  }
  return stukken
}

/** Via het verbonden Google-account als dat er is, anders via het serviceaccount. */
async function tokenVoor(k: AnalyticsConnection): Promise<string | undefined> {
  if (!k.googleConnectionId) return undefined
  const v = await getVerbinding(k.googleConnectionId)
  if (!v) throw new KoppelingFout('Het Google-account van deze koppeling is losgekoppeld. Kies de property opnieuw.')
  return toegangstoken(v)
}

async function haal(k: AnalyticsConnection, van: string, tot: string, toegang?: string): Promise<Dagcijfers[]> {
  switch (k.source) {
    case 'ga4':
      return haalGa4(k.externalId, van, tot, toegang)
    case 'search_console':
      return haalSearchConsole(k.externalId, van, tot, toegang)
    default:
      throw new KoppelingFout('Deze bron kunnen we nog niet ophalen; de koppeling volgt.')
  }
}

/** Vervangt de cijfers van één koppeling in een periode: wat er niet meer is, verdwijnt ook. */
async function bewaar(k: AnalyticsConnection, van: string, tot: string, rijen: Dagcijfers[]) {
  await db.transaction(async (tx) => {
    await tx
      .delete(performanceDaily)
      .where(
        and(
          eq(performanceDaily.organizationId, k.organizationId),
          eq(performanceDaily.provider, k.source),
          gte(performanceDaily.day, van),
          lte(performanceDaily.day, tot),
        ),
      )
    if (rijen.length === 0) return
    for (let i = 0; i < rijen.length; i += 500) {
      await tx.insert(performanceDaily).values(
        rijen.slice(i, i + 500).map((r) => ({
          organizationId: k.organizationId,
          day: r.day,
          bron: r.bron,
          provider: k.source,
          impressions: r.impressions ?? null,
          clicks: r.clicks ?? null,
          sessions: r.sessions ?? null,
          conversions: r.conversions ?? null,
          costCents: r.costCents ?? null,
        })),
      )
    }
  })
}

export type SyncUitkomst = { koppeling: string; klant: string; bron: AnalyticsConnection['source']; ok: boolean; melding: string }

export async function syncKoppeling(k: AnalyticsConnection & { klant?: string }, vandaag = new Date()): Promise<SyncUitkomst> {
  const basis = { koppeling: k.id, klant: k.klant ?? '', bron: k.source }
  try {
    let historie = k.historyFrom
    let regels = 0
    const toegang = await tokenVoor(k)
    for (const stuk of teHalen(k.historyFrom, vandaag)) {
      const rijen = await haal(k, stuk.van, stuk.tot, toegang)
      await bewaar(k, stuk.van, stuk.tot, rijen)
      regels += rijen.length
      historie = historie && historie < stuk.nieuweHistorie ? historie : stuk.nieuweHistorie
    }
    await db
      .update(analyticsConnections)
      .set({ lastSyncedAt: new Date(), lastError: null, lastErrorAt: null, historyFrom: historie })
      .where(eq(analyticsConnections.id, k.id))
    return { ...basis, ok: true, melding: `${regels} regels` }
  } catch (e) {
    const melding = e instanceof KoppelingFout ? e.message : `Onverwachte fout: ${(e as Error).message}`
    await db.update(analyticsConnections).set({ lastError: melding, lastErrorAt: new Date() }).where(eq(analyticsConnections.id, k.id))
    return { ...basis, ok: false, melding }
  }
}

/**
 * Alle actieve koppelingen die we kunnen ophalen, de langst niet bijgewerkte
 * eerst, tot het tijdsbudget op is. Optioneel alleen voor één klant.
 */
export async function syncAlles(opties: { budgetMs?: number; organizationId?: string } = {}): Promise<SyncUitkomst[]> {
  const start = Date.now()
  const budget = opties.budgetMs ?? 20000
  const waar = [eq(analyticsConnections.active, true)]
  if (opties.organizationId) waar.push(eq(analyticsConnections.organizationId, opties.organizationId))
  const koppelingen = await db
    .select({ k: analyticsConnections, klant: organizations.name })
    .from(analyticsConnections)
    .innerJoin(organizations, eq(organizations.id, analyticsConnections.organizationId))
    .where(and(...waar))
    .orderBy(sql`${analyticsConnections.lastSyncedAt} ASC NULLS FIRST`, asc(analyticsConnections.createdAt))

  const uit: SyncUitkomst[] = []
  for (const { k, klant } of koppelingen) {
    if (!KAN_OPHALEN[k.source]) continue
    if (Date.now() - start > budget) break
    uit.push(await syncKoppeling({ ...k, klant }))
  }
  return uit
}
