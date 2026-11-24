import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyticsConnections, businessProfileDaily, organizations, performanceDaily, seoDaily, type AnalyticsConnection } from '@/db/schema'
import { KoppelingFout, haalGa4, haalSearchConsole, type Dagcijfers } from './google'
import { haalAhrefs, type SeoStand } from './ahrefs'
import { OPNIEUW_VERBINDEN, haalBedrijfsprofiel, heeftBedrijfsprofielRecht, type BedrijfsprofielCijfers } from './bedrijfsprofiel'
import { GoogleAdsToegangFout, haalGoogleAds } from './google-ads'
import { haalMeta } from './meta'
import { haalLinkedin, somPerDag } from './linkedin'
import { metLinkedinToegang } from './linkedin-verbinding'
import { accountsVan, campagnesVan } from './koppeling'
import { getVerbinding, listVerbindingen, toegangstoken } from './oauth'

/* -------------------------------------------------------------------------
   Cijfers ophalen en bewaren.

   Elke nacht: per koppeling de laatste dagen opnieuw (GA4, Search Console en
   de advertentieplatforms werken cijfers tot een paar dagen terug nog bij),
   en één stuk historie erbij tot er dertien maanden staat. Een geplande
   functie op Netlify mag maar 30 seconden draaien, dus de run stopt op tijd
   en gaat de volgende nacht verder bij de koppeling die het langst niet is
   bijgewerkt. Koppelen en "Nu bijwerken" halen direct op.
   ------------------------------------------------------------------------- */

const RECENT_DAGEN = 4
const STUK_DAGEN = 120
const HISTORIE_MAANDEN = 13

/** Welke bronnen we al kunnen ophalen. TikTok wacht op toegang tot zijn API (V3). */
export const KAN_OPHALEN: Record<AnalyticsConnection['source'], boolean> = {
  ga4: true,
  search_console: true,
  google_ads: true,
  meta_ads: true,
  linkedin_ads: true,
  tiktok_ads: false,
  ahrefs: true,
  google_business: true,
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
  if (k.source === 'google_business' && !heeftBedrijfsprofielRecht(v.scopes)) throw new KoppelingFout(`${v.email}: ${OPNIEUW_VERBINDEN}`)
  return toegangstoken(v)
}

/**
 * Google Ads gaat via het MCC: elk verbonden Google-account dat daar bij kan,
 * werkt. Is er bij de koppeling geen account gekozen, dan proberen we ze op
 * volgorde; pas als geen enkel account toegang krijgt, komt die fout in beeld.
 */
async function haalGoogleAdsViaVerbindingen(k: AnalyticsConnection, van: string, tot: string, toegang?: string): Promise<Dagcijfers[]> {
  if (toegang) return haalGoogleAds(k.externalId, van, tot, toegang)
  const verbindingen = await listVerbindingen()
  if (verbindingen.length === 0) {
    throw new KoppelingFout('Google Ads leest mee via een verbonden Google-account met toegang tot het MCC. Verbind er eerst een onder Beheer → Koppelingen.')
  }
  let laatste: KoppelingFout | null = null
  for (const v of verbindingen) {
    try {
      return await haalGoogleAds(k.externalId, van, tot, await toegangstoken(v))
    } catch (e) {
      if (!(e instanceof GoogleAdsToegangFout)) throw e
      laatste = new KoppelingFout(`${v.email}: ${e.message}`)
    }
  }
  throw laatste
}

/**
 * LinkedIn gaat via het LinkedIn-account dat bij de koppeling is gekozen; is
 * dat er niet (meer), dan proberen we de verbonden accounts op volgorde.
 * Meer advertentieaccounts bij één klant tellen we per dag bij elkaar op,
 * elk met alleen zijn eigen aangevinkte campagnes.
 */
async function haalLinkedinViaVerbindingen(k: AnalyticsConnection, van: string, tot: string): Promise<Dagcijfers[]> {
  const accounts = accountsVan(k)
  const reeksen: Dagcijfers[][] = []
  for (const a of accounts) {
    const campagnes = campagnesVan(k, a.id, accounts.length === 1)
    try {
      reeksen.push(await metLinkedinToegang(a.verbinding ?? k.linkedinConnectionId, (toegang) => haalLinkedin(a.id, van, tot, toegang, campagnes)))
    } catch (e) {
      if (accounts.length > 1 && e instanceof KoppelingFout) throw new KoppelingFout(`${a.naam}: ${e.message}`)
      throw e
    }
  }
  return somPerDag(reeksen)
}

async function haal(k: AnalyticsConnection, van: string, tot: string, toegang?: string): Promise<Dagcijfers[]> {
  switch (k.source) {
    case 'ahrefs':
    case 'google_business':
      // Eigen soort cijfers, eigen tabel; zie haalEnBewaar.
      throw new KoppelingFout('Deze bron gaat via een eigen tabel.')
    case 'ga4':
      return haalGa4(k.externalId, van, tot, toegang)
    case 'search_console':
      return haalSearchConsole(k.externalId, van, tot, toegang)
    case 'google_ads':
      return haalGoogleAdsViaVerbindingen(k, van, tot, toegang)
    case 'meta_ads':
      // Alleen de gekozen campagnes, als de klant via het account van James Robinson adverteert.
      return haalMeta(k.externalId, van, tot, process.env, campagnesVan(k, k.externalId, true))
    case 'linkedin_ads':
      return haalLinkedinViaVerbindingen(k, van, tot)
    default:
      throw new KoppelingFout('Deze bron kunnen we nog niet ophalen; de koppeling volgt zodra het platform onze toegang heeft goedgekeurd.')
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

/** Vervangt de SEO-standen van één klant in een periode; Ahrefs is de enige bron, dus zonder provider. */
async function bewaarSeo(k: AnalyticsConnection, van: string, tot: string, rijen: SeoStand[]) {
  await db.transaction(async (tx) => {
    await tx.delete(seoDaily).where(and(eq(seoDaily.organizationId, k.organizationId), gte(seoDaily.day, van), lte(seoDaily.day, tot)))
    if (rijen.length === 0) return
    for (let i = 0; i < rijen.length; i += 500) {
      await tx.insert(seoDaily).values(
        rijen.slice(i, i + 500).map((r) => ({
          organizationId: k.organizationId,
          day: r.day,
          domainRating: r.domainRating ?? null,
          organicKeywords: r.organicKeywords ?? null,
          organicTraffic: r.organicTraffic ?? null,
          referringDomains: r.referringDomains ?? null,
        })),
      )
    }
  })
}

/** Vervangt de Bedrijfsprofiel-cijfers van één klant in een periode. */
async function bewaarBedrijfsprofiel(k: AnalyticsConnection, van: string, tot: string, rijen: BedrijfsprofielCijfers[]) {
  await db.transaction(async (tx) => {
    await tx
      .delete(businessProfileDaily)
      .where(and(eq(businessProfileDaily.organizationId, k.organizationId), gte(businessProfileDaily.day, van), lte(businessProfileDaily.day, tot)))
    if (rijen.length === 0) return
    for (let i = 0; i < rijen.length; i += 500) {
      await tx.insert(businessProfileDaily).values(
        rijen.slice(i, i + 500).map((r) => ({
          organizationId: k.organizationId,
          day: r.day,
          impressionsMaps: r.impressionsMaps ?? null,
          impressionsSearch: r.impressionsSearch ?? null,
          websiteClicks: r.websiteClicks ?? null,
          callClicks: r.callClicks ?? null,
          directionRequests: r.directionRequests ?? null,
          messagingClicks: r.messagingClicks ?? null,
          bookings: r.bookings ?? null,
        })),
      )
    }
  })
}

/** Eén stuk ophalen en wegschrijven; geeft terug hoeveel regels het waren. */
async function haalEnBewaar(k: AnalyticsConnection, van: string, tot: string, toegang?: string): Promise<number> {
  if (k.source === 'ahrefs') {
    const rijen = await haalAhrefs(k.externalId, van, tot)
    await bewaarSeo(k, van, tot, rijen)
    return rijen.length
  }
  if (k.source === 'google_business') {
    const rijen = await haalBedrijfsprofiel(k.externalId, van, tot, toegang)
    await bewaarBedrijfsprofiel(k, van, tot, rijen)
    return rijen.length
  }
  const rijen = await haal(k, van, tot, toegang)
  await bewaar(k, van, tot, rijen)
  return rijen.length
}

export type SyncUitkomst = { koppeling: string; klant: string; bron: AnalyticsConnection['source']; ok: boolean; melding: string }

export async function syncKoppeling(k: AnalyticsConnection & { klant?: string }, vandaag = new Date()): Promise<SyncUitkomst> {
  const basis = { koppeling: k.id, klant: k.klant ?? '', bron: k.source }
  try {
    let historie = k.historyFrom
    let regels = 0
    const toegang = await tokenVoor(k)
    for (const stuk of teHalen(k.historyFrom, vandaag)) {
      regels += await haalEnBewaar(k, stuk.van, stuk.tot, toegang)
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
