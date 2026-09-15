import { asc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { tags, organizationTags } from '@/db/schema'
import type { Tag } from '@/db/schema'

/* -------------------------------------------------------------------------
   Labels: post-its op een bedrijf.

   "Heeft webshop", "seizoensgebonden", "via Jim K". Dit is de ontsnapping
   voor alles wat we niet als veld hebben voorzien. Daarom zijn ze vrij van
   vorm — maar niet vrij van orde: een label bestaat één keer, hoe je het ook
   typt. Anders krijg je "Horeca" naast "horeca" en twee halve groepen.
   ------------------------------------------------------------------------- */

export class TagError extends Error {}

/** Kleuren uit de huisstijl die naast elkaar te onderscheiden zijn. */
export const TAG_KLEUREN = [
  { waarde: 'blue', label: 'Blauw', klasse: 'bg-jr-lightblue text-jr-deepblue' },
  { waarde: 'purple', label: 'Paars', klasse: 'bg-jr-purple/10 text-jr-purple' },
  { waarde: 'orange', label: 'Oranje', klasse: 'bg-jr-orange/10 text-jr-orange' },
  { waarde: 'green', label: 'Groen', klasse: 'bg-jr-green/10 text-jr-green' },
  { waarde: 'grey', label: 'Grijs', klasse: 'bg-gray-100 text-gray-600' },
] as const

export function tagKlasse(color: string | null): string {
  return TAG_KLEUREN.find((k) => k.waarde === color)?.klasse ?? 'bg-gray-100 text-gray-600'
}

export type TagWithUsage = Tag & { organizationCount: number }

export async function listTags(): Promise<TagWithUsage[]> {
  const rijen = await db
    .select({
      tag: tags,
      aantal: sql<string>`COUNT(${organizationTags.organizationId})`,
    })
    .from(tags)
    .leftJoin(organizationTags, eq(organizationTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name))

  return rijen.map((r) => ({ ...r.tag, organizationCount: Number(r.aantal) }))
}

/** De labels van één klant. */
export async function listTagsForOrganization(organizationId: string): Promise<Tag[]> {
  const rijen = await db
    .select({ tag: tags })
    .from(organizationTags)
    .innerJoin(tags, eq(tags.id, organizationTags.tagId))
    .where(eq(organizationTags.organizationId, organizationId))
    .orderBy(asc(tags.name))

  return rijen.map((r) => r.tag)
}

/** De labels van meerdere klanten tegelijk, voor een lijstweergave. */
export async function listTagsForOrganizations(
  organizationIds: string[],
): Promise<Map<string, Tag[]>> {
  const perOrg = new Map<string, Tag[]>()
  if (organizationIds.length === 0) return perOrg

  const rijen = await db
    .select({ organizationId: organizationTags.organizationId, tag: tags })
    .from(organizationTags)
    .innerJoin(tags, eq(tags.id, organizationTags.tagId))
    .where(inArray(organizationTags.organizationId, organizationIds))
    .orderBy(asc(tags.name))

  for (const r of rijen) {
    const lijst = perOrg.get(r.organizationId) ?? []
    lijst.push(r.tag)
    perOrg.set(r.organizationId, lijst)
  }
  return perOrg
}

/**
 * Zoekt het label op naam of maakt het aan, en hangt het aan de klant.
 *
 * Hoofdletters doen er niet toe bij het zoeken: wie "Horeca" typt terwijl er
 * al "horeca" staat, krijgt het bestaande label. De schrijfwijze van de
 * eerste keer blijft staan.
 */
export async function attachTag(input: {
  organizationId: string
  name: string
  color?: string | null
}): Promise<Tag> {
  const naam = input.name.trim()
  if (naam.length < 2) throw new TagError('Een label heeft minstens twee tekens nodig.')
  if (naam.length > 40) throw new TagError('Houd een label kort — maximaal 40 tekens.')

  return db.transaction(async (tx) => {
    const [bestaand] = await tx
      .select()
      .from(tags)
      .where(sql`lower(${tags.name}) = lower(${naam})`)
      .limit(1)

    let tag = bestaand
    if (!tag) {
      const [nieuw] = await tx
        .insert(tags)
        .values({ name: naam, color: input.color ?? null })
        .returning()
      if (!nieuw) throw new TagError('Label kon niet worden opgeslagen.')
      tag = nieuw
    }

    await tx
      .insert(organizationTags)
      .values({ organizationId: input.organizationId, tagId: tag.id })
      // Twee keer hetzelfde label op dezelfde klant is geen fout, gewoon niets.
      .onConflictDoNothing()

    return tag
  })
}

export async function detachTag(organizationId: string, tagId: string): Promise<void> {
  await db
    .delete(organizationTags)
    .where(
      sql`${organizationTags.organizationId} = ${organizationId} AND ${organizationTags.tagId} = ${tagId}`,
    )
}

/**
 * Verwijdert een label helemaal, ook bij de klanten die het hebben.
 *
 * Dat is expres: een label dat nergens meer op slaat moet weg kunnen zonder
 * dat je het eerst bij dertig klanten los moet klikken.
 */
export async function deleteTag(tagId: string): Promise<void> {
  await db.delete(tags).where(eq(tags.id, tagId))
}

export async function renameTag(tagId: string, name: string, color?: string | null): Promise<void> {
  const naam = name.trim()
  if (naam.length < 2) throw new TagError('Een label heeft minstens twee tekens nodig.')

  await db
    .update(tags)
    .set({ name: naam, color: color ?? null })
    .where(eq(tags.id, tagId))
}
