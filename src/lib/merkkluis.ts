import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '@/db'
import { brandColors, brandFiles, brandFonts, brandVoices, organizations } from '@/db/schema'
import type { BrandColor, BrandFile, BrandFont, BrandVoice, Organization } from '@/db/schema'
import { bewaar, wis } from './bestandsopslag'

/* -------------------------------------------------------------------------
   De merkkluis: per klant de logo's, kleuren, lettertypen, toon, beelden en
   grafische elementen. Hier de regels; de schermen en acties roepen dit aan.
   ------------------------------------------------------------------------- */

export class MerkError extends Error {}

export type Soort = BrandFile['kind']

/** Hoe groot een upload mag zijn. Netlify neemt per verzoek 6 MB aan; de browser verkleint foto's eerst. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const SOORT_LABELS: Record<Soort, string> = {
  logo: 'Logo',
  beeld: 'Beeld',
  element: 'Grafisch element',
  lettertype: 'Lettertype',
}

/* ------------------------------ Bestandstypen ---------------------------- */

type Type = { mime: string; ext: string }

/**
 * Wat een bestand echt is, op de eerste bytes en niet op de naam. Een .png
 * die eigenlijk iets anders is, komt er zo niet in.
 */
export function herkenType(data: Buffer): Type | null {
  const begin = data.subarray(0, 12)
  const hex = begin.toString('hex')
  if (hex.startsWith('89504e470d0a1a0a')) return { mime: 'image/png', ext: 'png' }
  if (hex.startsWith('ffd8ff')) return { mime: 'image/jpeg', ext: 'jpg' }
  if (begin.subarray(0, 4).toString('latin1') === 'RIFF' && begin.subarray(8, 12).toString('latin1') === 'WEBP')
    return { mime: 'image/webp', ext: 'webp' }
  const vier = begin.subarray(0, 4).toString('latin1')
  if (vier === 'wOF2') return { mime: 'font/woff2', ext: 'woff2' }
  if (vier === 'wOFF') return { mime: 'font/woff', ext: 'woff' }
  if (vier === 'OTTO') return { mime: 'font/otf', ext: 'otf' }
  if (hex.startsWith('00010000') || vier === 'true') return { mime: 'font/ttf', ext: 'ttf' }
  const tekst = data.subarray(0, 2048).toString('utf8').trimStart()
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(tekst)) return { mime: 'image/svg+xml', ext: 'svg' }
  return null
}

const TOEGESTAAN: Record<Soort, string[]> = {
  logo: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  beeld: ['image/png', 'image/jpeg', 'image/webp'],
  element: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  lettertype: ['font/woff2', 'font/woff', 'font/otf', 'font/ttf'],
}

/**
 * Een SVG kan script bevatten. Via een <img> draait dat niet, maar wie het
 * bestand direct opent wel. We serveren SVG daarom altijd in een sandbox,
 * en weigeren hier wat er onmiskenbaar actief in zit.
 */
export function svgIsVeilig(data: Buffer): boolean {
  const tekst = data.toString('utf8')
  return !/<script|<foreignObject|\son[a-z]+\s*=|javascript:|<iframe|<embed|<object/i.test(tekst)
}

/* ------------------------------ Uploaden --------------------------------- */

export type NieuwBestand = {
  organizationId: string
  kind: Soort
  title: string
  filename: string | null
  data: Buffer
  userId: string
  logoVariant?: BrandFile['logoVariant']
  logoBackground?: BrandFile['logoBackground']
  logoColorway?: BrandFile['logoColorway']
}

/** Controleert, maakt een miniatuur, zet het bestand in de opslag en de gegevens in de database. */
export async function voegBestandToe(n: NieuwBestand): Promise<BrandFile> {
  if (n.data.byteLength === 0) throw new MerkError('Dit bestand is leeg.')
  if (n.data.byteLength > MAX_UPLOAD_BYTES) {
    throw new MerkError(`Dit bestand is ${(n.data.byteLength / 1024 / 1024).toFixed(1)} MB; maximaal 5 MB. Verklein het eerst.`)
  }
  const type = herkenType(n.data)
  if (!type || !TOEGESTAAN[n.kind].includes(type.mime)) {
    const mag = TOEGESTAAN[n.kind].map((m) => m.split('/')[1]!.replace('svg+xml', 'svg').replace('jpeg', 'jpg').toUpperCase()).join(', ')
    throw new MerkError(`Dit bestandstype past niet bij ${SOORT_LABELS[n.kind].toLowerCase()}. Toegestaan: ${mag}.`)
  }
  if (type.mime === 'image/svg+xml' && !svgIsVeilig(n.data)) {
    throw new MerkError('Deze SVG bevat script of actieve inhoud. Exporteer hem opnieuw als schone SVG, of gebruik PNG.')
  }

  const sleutel = `${n.organizationId}/${n.kind}/${randomUUID()}.${type.ext}`
  let breedte: number | null = null
  let hoogte: number | null = null
  let miniatuur: Buffer | null = null

  if (type.mime.startsWith('image/') && type.mime !== 'image/svg+xml') {
    const sharp = (await import('sharp')).default
    const beeld = sharp(n.data, { failOn: 'error' }).rotate()
    const meta = await beeld.metadata()
    // Na rotate() geldt de oriëntatie uit de camera; breedte en hoogte wisselen dan om.
    const gedraaid = (meta.orientation ?? 1) >= 5
    breedte = (gedraaid ? meta.height : meta.width) ?? null
    hoogte = (gedraaid ? meta.width : meta.height) ?? null
    miniatuur = await beeld.resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  }

  await bewaar(sleutel, n.data, type.mime)
  if (miniatuur) await bewaar(`${sleutel}.klein`, miniatuur, 'image/webp')

  const titel = n.title.trim() || (n.filename ?? '').replace(/\.[^.]+$/, '').trim() || SOORT_LABELS[n.kind]
  try {
    const [rij] = await db
      .insert(brandFiles)
      .values({
        organizationId: n.organizationId,
        kind: n.kind,
        title: titel,
        storageKey: sleutel,
        hasThumbnail: miniatuur !== null,
        contentType: type.mime,
        bytes: n.data.byteLength,
        width: breedte,
        height: hoogte,
        filename: n.filename,
        logoVariant: n.kind === 'logo' ? (n.logoVariant ?? 'primair') : null,
        logoBackground: n.kind === 'logo' ? (n.logoBackground ?? 'licht') : null,
        logoColorway: n.kind === 'logo' ? (n.logoColorway ?? 'kleur') : null,
        source: n.kind === 'beeld' ? 'klant' : null,
        peopleConsent: n.kind === 'beeld' ? 'onbekend' : null,
        createdByUserId: n.userId,
      })
      .returning()
    if (!rij) throw new MerkError('Het bestand kon niet worden opgeslagen.')
    return rij
  } catch (error) {
    // Geen weesbestanden in de opslag als de database weigert.
    await wis(sleutel).catch(() => {})
    if (miniatuur) await wis(`${sleutel}.klein`).catch(() => {})
    throw error
  }
}

export async function verwijderBestand(id: string): Promise<BrandFile | null> {
  const [rij] = await db.delete(brandFiles).where(eq(brandFiles.id, id)).returning()
  if (!rij) return null
  await wis(rij.storageKey).catch((e) => console.error('[merkkluis] wissen mislukt:', e))
  if (rij.hasThumbnail) await wis(`${rij.storageKey}.klein`).catch(() => {})
  return rij
}

export async function wijzigBestand(
  id: string,
  patch: Partial<
    Pick<
      BrandFile,
      | 'title'
      | 'tags'
      | 'notes'
      | 'logoVariant'
      | 'logoBackground'
      | 'logoColorway'
      | 'focusX'
      | 'focusY'
      | 'source'
      | 'usage'
      | 'usableUntil'
      | 'peopleConsent'
      | 'aiAltered'
    >
  >,
): Promise<void> {
  if (patch.title !== undefined && patch.title.trim() === '') throw new MerkError('Geef het bestand een naam.')
  await db.update(brandFiles).set(patch).where(eq(brandFiles.id, id))
}

export async function getBestand(id: string): Promise<BrandFile | null> {
  const [rij] = await db.select().from(brandFiles).where(eq(brandFiles.id, id)).limit(1)
  return rij ?? null
}

/* ------------------------------ Kleuren ---------------------------------- */

/** "#c4f000", "C4F000" of "#C4F" naar "#C4F000"; onzin naar null. */
export function normaliseerHex(invoer: string): string | null {
  let h = invoer.trim().replace(/^#/, '').toUpperCase()
  if (/^[0-9A-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('')
  return /^[0-9A-F]{6}$/.test(h) ? `#${h}` : null
}

function luminantie(hex: string): number {
  const kanaal = (i: number) => {
    const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * kanaal(0) + 0.7152 * kanaal(1) + 0.0722 * kanaal(2)
}

/** Contrastverhouding volgens WCAG, van 1 tot 21. */
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminantie(a), luminantie(b)].sort((x, y) => y - x) as [number, number]
  return (l1 + 0.05) / (l2 + 0.05)
}

export async function voegKleurToe(organizationId: string, k: { name: string; hex: string; role: BrandColor['role']; notes: string | null }) {
  const hex = normaliseerHex(k.hex)
  if (!hex) throw new MerkError('Vul een kleurcode in zoals #C4F000.')
  if (k.name.trim() === '') throw new MerkError('Geef de kleur een naam.')
  const [telling] = await db.select({ n: count() }).from(brandColors).where(eq(brandColors.organizationId, organizationId))
  await db.insert(brandColors).values({ organizationId, ...k, name: k.name.trim(), hex, position: Number(telling?.n ?? 0) })
}

export async function wijzigKleur(id: string, k: { name: string; hex: string; role: BrandColor['role']; notes: string | null }) {
  const hex = normaliseerHex(k.hex)
  if (!hex) throw new MerkError('Vul een kleurcode in zoals #C4F000.')
  if (k.name.trim() === '') throw new MerkError('Geef de kleur een naam.')
  await db.update(brandColors).set({ ...k, name: k.name.trim(), hex }).where(eq(brandColors.id, id))
}

export async function verwijderKleur(id: string) {
  await db.delete(brandColors).where(eq(brandColors.id, id))
}

/* ------------------------------ Lettertypen ------------------------------ */

type FontInvoer = Pick<BrandFont, 'name' | 'role' | 'weights' | 'licence' | 'fallback' | 'notes' | 'fileId'>

export async function voegFontToe(organizationId: string, f: FontInvoer) {
  if (f.name.trim() === '') throw new MerkError('Vul de naam van het lettertype in.')
  await db.insert(brandFonts).values({ organizationId, ...f, name: f.name.trim() })
}

export async function wijzigFont(id: string, f: FontInvoer) {
  if (f.name.trim() === '') throw new MerkError('Vul de naam van het lettertype in.')
  await db.update(brandFonts).set({ ...f, name: f.name.trim() }).where(eq(brandFonts.id, id))
}

export async function verwijderFont(id: string) {
  await db.delete(brandFonts).where(eq(brandFonts.id, id))
}

/* ------------------------------ Tone of voice ---------------------------- */

export type StemInvoer = Omit<BrandVoice, 'organizationId' | 'updatedAt' | 'updatedByUserId'>

export async function zetStem(organizationId: string, stem: StemInvoer, userId: string) {
  const waarden = { ...stem, updatedAt: new Date(), updatedByUserId: userId }
  await db.insert(brandVoices).values({ organizationId, ...waarden }).onConflictDoUpdate({ target: brandVoices.organizationId, set: waarden })
}

/* ------------------------------ Lezen ------------------------------------ */

export type Merkkluis = {
  organisatie: Organization
  logos: BrandFile[]
  beelden: BrandFile[]
  elementen: BrandFile[]
  fontbestanden: BrandFile[]
  kleuren: BrandColor[]
  fonts: BrandFont[]
  stem: BrandVoice | null
  volledigheid: Volledigheid
}

export async function getMerkkluis(slug: string): Promise<Merkkluis | null> {
  const [organisatie] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1)
  if (!organisatie) return null
  const [bestanden, kleuren, fonts, [stem]] = await Promise.all([
    db.select().from(brandFiles).where(eq(brandFiles.organizationId, organisatie.id)).orderBy(desc(brandFiles.createdAt)),
    db.select().from(brandColors).where(eq(brandColors.organizationId, organisatie.id)).orderBy(asc(brandColors.position)),
    db.select().from(brandFonts).where(eq(brandFonts.organizationId, organisatie.id)).orderBy(asc(brandFonts.role), asc(brandFonts.name)),
    db.select().from(brandVoices).where(eq(brandVoices.organizationId, organisatie.id)).limit(1),
  ])
  const logos = bestanden.filter((b) => b.kind === 'logo')
  const beelden = bestanden.filter((b) => b.kind === 'beeld')
  return {
    organisatie,
    logos,
    beelden,
    elementen: bestanden.filter((b) => b.kind === 'element'),
    fontbestanden: bestanden.filter((b) => b.kind === 'lettertype'),
    kleuren,
    fonts,
    stem: stem ?? null,
    volledigheid: berekenVolledigheid({ logos, beelden, kleuren, fonts, stem: stem ?? null }),
  }
}

/* ------------------------------ Volledigheid ----------------------------- */

export type Volledigheid = { punten: { label: string; klaar: boolean }[]; klaar: number; totaal: number }

export const MIN_BEELDEN = 10

/**
 * Wat er minimaal in een merkkluis moet zitten voordat je er iets mee kunt
 * maken. Een lege kluis maakt elk sjabloon waardeloos; dit maakt zichtbaar
 * wat er nog ontbreekt.
 */
export function berekenVolledigheid(m: {
  logos: Pick<BrandFile, 'logoVariant' | 'logoBackground'>[]
  beelden: Pick<BrandFile, 'usage'>[]
  kleuren: Pick<BrandColor, 'role'>[]
  fonts: Pick<BrandFont, 'role'>[]
  stem: Pick<BrandVoice, 'address' | 'goodExamples'> | null
}): Volledigheid {
  const punten = [
    {
      label: 'Hoofdlogo voor een lichte achtergrond',
      klaar: m.logos.some((l) => l.logoVariant === 'primair' && (l.logoBackground === 'licht' || l.logoBackground === 'beide')),
    },
    { label: 'Logo voor een donkere achtergrond', klaar: m.logos.some((l) => l.logoBackground === 'donker' || l.logoBackground === 'beide') },
    { label: 'Minstens twee kleuren, waarvan een primair', klaar: m.kleuren.length >= 2 && m.kleuren.some((k) => k.role === 'primair') },
    { label: 'Lettertype voor koppen en voor tekst', klaar: m.fonts.some((f) => f.role === 'koppen') && m.fonts.some((f) => f.role === 'tekst') },
    { label: 'Tone of voice: aanspreekvorm en voorbeeldzinnen', klaar: !!m.stem?.address && !!m.stem.goodExamples?.trim() },
    { label: `Minstens ${MIN_BEELDEN} beelden met gebruiksrechten`, klaar: m.beelden.filter((b) => b.usage.length > 0).length >= MIN_BEELDEN },
  ]
  return { punten, klaar: punten.filter((p) => p.klaar).length, totaal: punten.length }
}

/** Alle klanten met hoe ver hun merkkluis is, voor het overzicht. */
export async function listMerkkluizen() {
  const [orgs, bestanden, kleuren, fonts, stemmen] = await Promise.all([
    db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug, status: organizations.status }).from(organizations).orderBy(asc(organizations.name)),
    db.select({ org: brandFiles.organizationId, kind: brandFiles.kind, logoVariant: brandFiles.logoVariant, logoBackground: brandFiles.logoBackground, usage: brandFiles.usage }).from(brandFiles),
    db.select({ org: brandColors.organizationId, role: brandColors.role }).from(brandColors),
    db.select({ org: brandFonts.organizationId, role: brandFonts.role }).from(brandFonts),
    db.select({ org: brandVoices.organizationId, address: brandVoices.address, goodExamples: brandVoices.goodExamples }).from(brandVoices),
  ])
  return orgs.map((o) => {
    const eigen = bestanden.filter((b) => b.org === o.id)
    const logos = eigen.filter((b) => b.kind === 'logo')
    const beelden = eigen.filter((b) => b.kind === 'beeld')
    const v = berekenVolledigheid({
      logos,
      beelden,
      kleuren: kleuren.filter((k) => k.org === o.id),
      fonts: fonts.filter((f) => f.org === o.id),
      stem: stemmen.find((s) => s.org === o.id) ?? null,
    })
    return { ...o, logos: logos.length, beelden: beelden.length, kleuren: kleuren.filter((k) => k.org === o.id).length, volledigheid: v }
  })
}

/** De beeldbank: beelden over alle klanten, te filteren op klant en tag. */
export async function zoekBeelden(filter: { organizationId?: string; tag?: string }) {
  const voorwaarden = [eq(brandFiles.kind, 'beeld')]
  if (filter.organizationId) voorwaarden.push(eq(brandFiles.organizationId, filter.organizationId))
  if (filter.tag) voorwaarden.push(sql`${filter.tag.toLowerCase()} = ANY(${brandFiles.tags})`)
  return db
    .select({ beeld: brandFiles, klant: organizations.name, klantSlug: organizations.slug })
    .from(brandFiles)
    .innerJoin(organizations, eq(organizations.id, brandFiles.organizationId))
    .where(and(...voorwaarden))
    .orderBy(desc(brandFiles.createdAt))
    .limit(300)
}

/** Alle tags die in de beeldbank voorkomen, met hoe vaak. */
export async function beeldTags(organizationId?: string) {
  const rijen = await db
    .select({ tag: sql<string>`unnest(${brandFiles.tags})`, n: count() })
    .from(brandFiles)
    .where(organizationId ? and(eq(brandFiles.kind, 'beeld'), eq(brandFiles.organizationId, organizationId)) : eq(brandFiles.kind, 'beeld'))
    .groupBy(sql`1`)
    .orderBy(desc(count()))
  return rijen.map((r) => ({ tag: r.tag, aantal: Number(r.n) }))
}

/** Hoeveel er per klant in de kluis zit, voor een samenvatting op de klantkaart. */
export async function merkTelling(organizationId: string) {
  const rijen = await db
    .select({ kind: brandFiles.kind, n: count() })
    .from(brandFiles)
    .where(eq(brandFiles.organizationId, organizationId))
    .groupBy(brandFiles.kind)
  const per = new Map(rijen.map((r) => [r.kind, Number(r.n)]))
  return { logos: per.get('logo') ?? 0, beelden: per.get('beeld') ?? 0, elementen: per.get('element') ?? 0 }
}


