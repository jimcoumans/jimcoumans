/* -------------------------------------------------------------------------
   Het overzicht voor het team: alle klanten met hun rapportage, ook als er
   nog niets gekoppeld is. Zo staat elke rapportage klaar en zie je in één
   blik wat er per klant nog ontbreekt.
   ------------------------------------------------------------------------- */

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { analyticsConnections, organizationOwners, organizations, users } from '@/db/schema'
import type { Hoofddoel } from './laden'

export type OverzichtRij = {
  id: string
  slug: string
  naam: string
  logoImageId: string | null
  hoofddoel: Hoofddoel | null
  liveOn: string | null
  marketingmanager: string | null
  /** Per bron: werkt, fout, of niet gekoppeld. */
  koppelingen: Record<'ga4' | 'search_console' | 'google_ads' | 'meta_ads', 'werkt' | 'fout' | 'geen'>
}

export async function getRapportageOverzicht(): Promise<OverzichtRij[]> {
  const orgs = await db
    .select({ id: organizations.id, slug: organizations.slug, naam: organizations.name, logoImageId: organizations.logoImageId, hoofddoel: organizations.mainGoal, liveOn: organizations.liveOn })
    .from(organizations)
    .where(and(eq(organizations.status, 'client'), isNull(organizations.archivedAt)))
    .orderBy(asc(organizations.name))
  if (!orgs.length) return []
  const ids = orgs.map((o) => o.id)
  const [eigenaren, koppelingen] = await Promise.all([
    db
      .select({ organizationId: organizationOwners.organizationId, naam: users.name, email: users.email, primair: organizationOwners.isPrimary })
      .from(organizationOwners)
      .innerJoin(users, eq(users.id, organizationOwners.userId))
      .where(and(inArray(organizationOwners.organizationId, ids), isNull(users.disabledAt)))
      .orderBy(desc(organizationOwners.isPrimary), desc(users.isMarketingManager)),
    db
      .select({ organizationId: analyticsConnections.organizationId, source: analyticsConnections.source, gesynct: analyticsConnections.lastSyncedAt, fout: analyticsConnections.lastError, actief: analyticsConnections.active })
      .from(analyticsConnections)
      .where(inArray(analyticsConnections.organizationId, ids)),
  ])
  return orgs.map((o) => {
    const mm = eigenaren.find((e) => e.organizationId === o.id)
    const status = (bron: string) => {
      const k = koppelingen.find((x) => x.organizationId === o.id && x.source === bron && x.actief)
      return !k ? 'geen' : k.fout ? 'fout' : k.gesynct ? 'werkt' : 'geen'
    }
    return {
      ...o,
      hoofddoel: o.hoofddoel as Hoofddoel | null,
      marketingmanager: mm ? mm.naam || mm.email : null,
      koppelingen: { ga4: status('ga4'), search_console: status('search_console'), google_ads: status('google_ads'), meta_ads: status('meta_ads') },
    }
  })
}
