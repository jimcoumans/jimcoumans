import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { organizationOwners, users, organizations } from '@/db/schema'
import type { OrganizationOwner, User } from '@/db/schema'

/* -------------------------------------------------------------------------
   Accountmanagers: wie is er verantwoordelijk voor deze klant.

   Normaal één, maar het kunnen er meer zijn. Eén van hen is de eerste
   aanspreekpartner; de database staat er maar één toe. Daarom regelen we het
   omzetten hier in een transactie, net als bij de vaste contactpersoon:
   anders weigert de index de invoer en moet je zelf eerst de oude omzetten,
   wat niemand onthoudt.
   ------------------------------------------------------------------------- */

export class OwnerError extends Error {}

export type OwnerWithUser = OrganizationOwner & {
  name: string | null
  email: string
}

export async function listOwners(organizationId: string): Promise<OwnerWithUser[]> {
  const rijen = await db
    .select({ owner: organizationOwners, name: users.name, email: users.email })
    .from(organizationOwners)
    .innerJoin(users, eq(users.id, organizationOwners.userId))
    .where(eq(organizationOwners.organizationId, organizationId))
    // De eerste aanspreekpartner bovenaan; die zoek je het vaakst.
    .orderBy(sql`${organizationOwners.isPrimary} DESC`, asc(users.name))

  return rijen.map((r) => ({ ...r.owner, name: r.name, email: r.email }))
}

/** Bij welke klanten deze collega accountmanager is. */
export async function listOrganizationsForOwner(userId: string) {
  return db
    .select({
      owner: organizationOwners,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      status: organizations.status,
    })
    .from(organizationOwners)
    .innerJoin(organizations, eq(organizations.id, organizationOwners.organizationId))
    .where(eq(organizationOwners.userId, userId))
    .orderBy(asc(organizations.name))
}

export async function addOwner(input: {
  organizationId: string
  userId: string
  role?: string | null
  isPrimary?: boolean
}): Promise<OrganizationOwner> {
  return db.transaction(async (tx) => {
    // Is dit de eerste? Dan is hij vanzelf de aanspreekpartner — anders heeft
    // een klant wel accountmanagers maar geen eerste, en dat is nooit de
    // bedoeling van degene die hem aanmaakt.
    const [bestaand] = await tx
      .select({ aantal: sql<string>`COUNT(*)` })
      .from(organizationOwners)
      .where(eq(organizationOwners.organizationId, input.organizationId))

    const eersteOoit = Number(bestaand?.aantal ?? 0) === 0
    const wordtPrimair = input.isPrimary || eersteOoit

    if (wordtPrimair) {
      await tx
        .update(organizationOwners)
        .set({ isPrimary: false })
        .where(
          and(
            eq(organizationOwners.organizationId, input.organizationId),
            eq(organizationOwners.isPrimary, true),
          ),
        )
    }

    const [owner] = await tx
      .insert(organizationOwners)
      .values({
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role ?? null,
        isPrimary: wordtPrimair,
      })
      .returning()

    if (!owner) throw new OwnerError('Accountmanager kon niet worden opgeslagen.')
    return owner
  })
}

/** Maakt deze collega de eerste aanspreekpartner en haalt die rol bij de ander weg. */
export async function makePrimaryOwner(ownerId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ organizationId: organizationOwners.organizationId })
      .from(organizationOwners)
      .where(eq(organizationOwners.id, ownerId))
      .limit(1)

    if (!owner) throw new OwnerError('Accountmanager niet gevonden.')

    await tx
      .update(organizationOwners)
      .set({ isPrimary: false })
      .where(eq(organizationOwners.organizationId, owner.organizationId))

    await tx
      .update(organizationOwners)
      .set({ isPrimary: true })
      .where(eq(organizationOwners.id, ownerId))
  })
}

export async function updateOwnerRole(ownerId: string, role: string | null): Promise<void> {
  await db
    .update(organizationOwners)
    .set({ role: role?.trim() || null })
    .where(eq(organizationOwners.id, ownerId))
}

/**
 * Haalt een accountmanager weg.
 *
 * Was het de eerste aanspreekpartner en blijven er anderen over, dan wordt
 * de langst zittende dat. Een klant zonder aanspreekpartner terwijl er wel
 * mensen op staan is een gat waar niemand zich verantwoordelijk voelt.
 */
export async function removeOwner(ownerId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select()
      .from(organizationOwners)
      .where(eq(organizationOwners.id, ownerId))
      .limit(1)

    if (!owner) return

    await tx.delete(organizationOwners).where(eq(organizationOwners.id, ownerId))

    if (!owner.isPrimary) return

    const [opvolger] = await tx
      .select({ id: organizationOwners.id })
      .from(organizationOwners)
      .where(eq(organizationOwners.organizationId, owner.organizationId))
      .orderBy(asc(organizationOwners.createdAt))
      .limit(1)

    if (opvolger) {
      await tx
        .update(organizationOwners)
        .set({ isPrimary: true })
        .where(eq(organizationOwners.id, opvolger.id))
    }
  })
}

export type { User }
