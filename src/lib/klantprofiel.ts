import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizationProfiles, users } from '@/db/schema'
import type { OrganizationProfile } from '@/db/schema'

/* -------------------------------------------------------------------------
   Het klantprofiel (I.3). Alleen de vrije tekst; de rest van het profiel
   komt uit wat al op de klantkaart staat.
   ------------------------------------------------------------------------- */

export type ProfielVeld = Exclude<keyof OrganizationProfile, 'organizationId' | 'updatedAt' | 'updatedByUserId'>

/** Alle tekstvelden, zodat een formulier alleen deze kan zetten. */
export const PROFIEL_VELDEN: ProfielVeld[] = [
  'sells',
  'whyChosen',
  'pricingAndCompetition',
  'yearRhythm',
  'capacity',
  'bestCustomer',
  'region',
  'notWanted',
  'brandStyle',
  'brandTone',
  'brandImagery',
  'websiteSystem',
  'emailSetup',
  'bookingSystem',
  'clientCommitments',
  'sensitivities',
]

export async function getProfiel(organizationId: string): Promise<(OrganizationProfile & { bijgewerktDoor: string | null }) | null> {
  const [rij] = await db
    .select({ profiel: organizationProfiles, door: users.name })
    .from(organizationProfiles)
    .leftJoin(users, eq(users.id, organizationProfiles.updatedByUserId))
    .where(eq(organizationProfiles.organizationId, organizationId))
    .limit(1)
  return rij ? { ...rij.profiel, bijgewerktDoor: rij.door } : null
}

/** Een deel van het profiel bijwerken; velden die niet meekomen blijven staan. */
export async function wijzigProfiel(
  organizationId: string,
  patch: Partial<Record<ProfielVeld, string | null>>,
  userId: string,
): Promise<void> {
  const waarden = { ...patch, updatedAt: new Date(), updatedByUserId: userId }
  await db
    .insert(organizationProfiles)
    .values({ organizationId, ...waarden })
    .onConflictDoUpdate({ target: organizationProfiles.organizationId, set: waarden })
}
