import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { images, organizations, contacts, users } from '@/db/schema'

/* -------------------------------------------------------------------------
   Logo's en profielfoto's.

   De bytes staan als base64 in de database. Dat is niet hoe je het zou doen
   voor een fotoalbum, maar voor honderd logo's en tien pasfoto's van hooguit
   een paar honderd kilobyte weegt het niet op tegen een extra opslagdienst
   met eigen sleutels, een eigen bucket en een eigen manier om stuk te gaan.

   SVG wordt geweigerd. Een SVG kan script bevatten, en een plaatje dat een
   collega uploadt en dat daarna in de browser van een ander draait, is een
   gat dat je niet wilt.
   ------------------------------------------------------------------------- */

export class AfbeeldingError extends Error {}

/** Een megabyte: ruim voor een logo, krap genoeg tegen een telefoonfoto. */
export const MAX_BYTES = 1_048_576

const TOEGESTAAN = ['image/png', 'image/jpeg', 'image/webp'] as const

export type Doel =
  | { soort: 'klant'; id: string }
  | { soort: 'contact'; id: string }
  | { soort: 'medewerker'; id: string }

/**
 * Slaat een geüpload bestand op en hangt het aan een klant, contactpersoon of
 * collega. De vorige afbeelding wordt opgeruimd: één plaatje per doel.
 */
export async function bewaarAfbeelding(
  bestand: File,
  doel: Doel,
  uploadedByUserId: string | null,
): Promise<string> {
  if (bestand.size === 0) throw new AfbeeldingError('Er is geen bestand gekozen.')
  if (bestand.size > MAX_BYTES) {
    throw new AfbeeldingError(
      `Dit bestand is ${Math.round(bestand.size / 1024)} kB. Een logo of profielfoto mag maximaal 1 MB zijn; verklein hem eerst.`,
    )
  }
  if (!TOEGESTAAN.includes(bestand.type as (typeof TOEGESTAAN)[number])) {
    throw new AfbeeldingError(
      'Alleen PNG, JPEG en WebP. Geen SVG: daar kan script in zitten dat daarna in de browser van een collega draait.',
    )
  }

  const data = Buffer.from(await bestand.arrayBuffer()).toString('base64')

  return db.transaction(async (tx) => {
    const [afbeelding] = await tx
      .insert(images)
      .values({
        contentType: bestand.type,
        bytes: bestand.size,
        data,
        filename: bestand.name || null,
        uploadedByUserId,
      })
      .returning()

    if (!afbeelding) throw new AfbeeldingError('De afbeelding kon niet worden opgeslagen.')

    const vorige = await koppel(tx, doel, afbeelding.id)
    // De oude bytes weg: anders groeit de database met elke nieuwe poging.
    if (vorige) await tx.delete(images).where(eq(images.id, vorige))

    return afbeelding.id
  })
}

/** Haalt de afbeelding weg en geeft het doel zijn initialen terug. */
export async function wisAfbeelding(doel: Doel): Promise<void> {
  await db.transaction(async (tx) => {
    const vorige = await koppel(tx, doel, null)
    if (vorige) await tx.delete(images).where(eq(images.id, vorige))
  })
}

/**
 * Zet de verwijzing en geeft terug welke afbeelding er stond.
 *
 * Eerst lezen, dan schrijven: `returning()` geeft de nieuwe waarde terug, dus
 * daar kun je de oude niet uit halen. Zonder die oude id blijven de bytes van
 * elke vervangen foto in de database achter.
 */
async function koppel(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  doel: Doel,
  imageId: string | null,
): Promise<string | null> {
  if (doel.soort === 'klant') {
    const [huidig] = await tx
      .select({ vorige: organizations.logoImageId })
      .from(organizations)
      .where(eq(organizations.id, doel.id))
      .limit(1)
    if (!huidig) throw new AfbeeldingError('Klant niet gevonden.')

    await tx
      .update(organizations)
      .set({ logoImageId: imageId })
      .where(eq(organizations.id, doel.id))
    return huidig.vorige
  }

  if (doel.soort === 'contact') {
    const [huidig] = await tx
      .select({ vorige: contacts.avatarImageId })
      .from(contacts)
      .where(eq(contacts.id, doel.id))
      .limit(1)
    if (!huidig) throw new AfbeeldingError('Contactpersoon niet gevonden.')

    await tx.update(contacts).set({ avatarImageId: imageId }).where(eq(contacts.id, doel.id))
    return huidig.vorige
  }

  const [huidig] = await tx
    .select({ vorige: users.avatarImageId })
    .from(users)
    .where(eq(users.id, doel.id))
    .limit(1)
  if (!huidig) throw new AfbeeldingError('Collega niet gevonden.')

  await tx.update(users).set({ avatarImageId: imageId }).where(eq(users.id, doel.id))
  return huidig.vorige
}

/** De bytes van een afbeelding, om uit te serveren. */
export async function leesAfbeelding(
  id: string,
): Promise<{ contentType: string; body: Buffer } | null> {
  const [rij] = await db.select().from(images).where(eq(images.id, id)).limit(1)
  if (!rij) return null
  return { contentType: rij.contentType, body: Buffer.from(rij.data, 'base64') }
}

/** De URL waarop een afbeelding te zien is. */
export function afbeeldingUrl(id: string | null): string | null {
  return id === null ? null : `/afbeelding/${id}`
}

/**
 * De initialen die je toont als er geen foto is.
 *
 * Twee letters uit de naam: bij een persoon voor- en achternaam, bij een
 * bedrijf de eerste letters van de eerste twee woorden. Dat leest beter dan
 * een grijs poppetje en je herkent de rij sneller.
 */
export function initialen(naam: string): string {
  const woorden = naam
    .trim()
    .split(/\s+/)
    // Tussenvoegsels leveren een nietszeggende V of D op.
    .filter((w) => w.length > 0 && !/^(van|de|den|der|het|'t|ten|ter|te|in|op|aan)$/i.test(w))

  if (woorden.length === 0) return '?'
  if (woorden.length === 1) return woorden[0]!.slice(0, 2).toUpperCase()
  return (woorden[0]![0]! + woorden[woorden.length - 1]![0]!).toUpperCase()
}
