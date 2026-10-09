import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { candidates, users, personalRecords, personalDocuments, personalDocumentViews, candidateNotes } from '@/db/schema'
import type { PersonalRecord } from '@/db/schema'
import { versleutel, ontsleutel, ontsleutelTekst } from './versleuteling'

/* -------------------------------------------------------------------------
   Persoonsgegevens voor het contract en de salarisadministratie.

   Vanaf de fase "contract": de kandidaat is akkoord met het voorstel en
   krijgt het contract ter ondertekening. Tegelijk levert hij via een eigen
   link zijn gegevens aan: naam zoals in zijn paspoort, adres, geboortedatum,
   IBAN, een kopie van zijn ID en het ingevulde loonheffingsformulier. Wij
   geven dat door aan de salarisadministratie en leggen vast wanneer.

   IBAN en documenten staan versleuteld (zie versleuteling.ts); wie een
   document opent, wordt vastgelegd.
   ------------------------------------------------------------------------- */

export class GegevensError extends Error {}

export const LINK_DAGEN = 14
export const MAX_BESTAND = 4 * 1024 * 1024
export const TOEGESTAAN = ['application/pdf', 'image/jpeg', 'image/png'] as const

export const DOCUMENT_LABELS = {
  id_kopie: 'Kopie ID',
  loonheffing: 'Loonheffingsformulier',
  contract: 'Getekend contract',
  overig: 'Overig',
} as const
export type DocumentSoort = keyof typeof DOCUMENT_LABELS

/* ------------------------------ IBAN -------------------------------------- */

/** Een IBAN zonder spaties, in hoofdletters. */
export function schoonIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase()
}

/** Klopt het controlegetal? (ISO 13616, modulo 97.) */
export function ibanKlopt(iban: string): boolean {
  const s = schoonIban(iban)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false
  if (s.startsWith('NL') && s.length !== 18) return false
  const omgezet = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
  let rest = 0
  for (const cijfer of omgezet) rest = (rest * 10 + Number(cijfer)) % 97
  return rest === 1
}

/** NL91 ABNA 0417 1643 00: in groepjes van vier, zoals op een bankpas. */
export function ibanInGroepjes(iban: string): string {
  return schoonIban(iban).replace(/(.{4})/g, '$1 ').trim()
}

/* ------------------------------ De link ----------------------------------- */

function geheim(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET ontbreekt of is te kort (minimaal 32 tekens).')
  return s
}

export function gegevensToken(id: string, versie: number): string {
  return createHmac('sha256', geheim()).update(`gegevens:${id}:${versie}`).digest('base64url').slice(0, 32)
}

export function gegevensPad(id: string, versie: number): string {
  return `/gegevens/${id}/${gegevensToken(id, versie)}`
}

/* ------------------------------ Lezen ------------------------------------- */

export type DocumentInfo = {
  id: string
  kind: DocumentSoort
  contentType: string
  bytes: number
  filename: string | null
  createdAt: Date
  doorKandidaat: boolean
}

export type Gegevens = {
  record: PersonalRecord
  documenten: DocumentInfo[]
  /** Wat er nog ontbreekt voor het contract en de salarisadministratie. */
  ontbreekt: string[]
}

export function watOntbreekt(r: PersonalRecord, documenten: Pick<DocumentInfo, 'kind'>[]): string[] {
  const uit: string[] = []
  if (!r.officialFirstNames?.trim()) uit.push('voornamen zoals in het paspoort')
  if (!r.lastName?.trim()) uit.push('achternaam')
  if (!r.birthDate) uit.push('geboortedatum')
  if (!r.addressLine?.trim() || !r.postalCode?.trim() || !r.city?.trim()) uit.push('adres')
  if (!r.ibanEnc) uit.push('IBAN')
  if (!documenten.some((d) => d.kind === 'id_kopie')) uit.push('kopie ID')
  if (!documenten.some((d) => d.kind === 'loonheffing')) uit.push('loonheffingsformulier')
  return uit
}

async function documentenVan(recordId: string): Promise<DocumentInfo[]> {
  const rijen = await db
    .select({
      id: personalDocuments.id,
      kind: personalDocuments.kind,
      contentType: personalDocuments.contentType,
      bytes: personalDocuments.bytes,
      filename: personalDocuments.filename,
      createdAt: personalDocuments.createdAt,
      uploadedByUserId: personalDocuments.uploadedByUserId,
    })
    .from(personalDocuments)
    .where(eq(personalDocuments.recordId, recordId))
    .orderBy(asc(personalDocuments.createdAt))
  return rijen.map(({ uploadedByUserId, ...d }) => ({ ...d, doorKandidaat: uploadedByUserId === null }))
}

export async function getGegevens(van: { candidateId?: string; userId?: string }): Promise<Gegevens | null> {
  const waar = van.candidateId ? eq(personalRecords.candidateId, van.candidateId) : van.userId ? eq(personalRecords.userId, van.userId) : null
  if (!waar) return null
  const [record] = await db.select().from(personalRecords).where(waar).limit(1)
  if (!record) return null
  const documenten = await documentenVan(record.id)
  return { record, documenten, ontbreekt: watOntbreekt(record, documenten) }
}

/** Het IBAN leesbaar, alleen voor een beheerder op het scherm. */
export function leesIban(r: PersonalRecord): string | null {
  return r.ibanEnc ? ibanInGroepjes(ontsleutelTekst(r.ibanEnc)) : null
}

/** Het dossier voor een kandidaat; maakt het aan als het er nog niet is, met de naam die we al kennen. */
export async function zorgVoorGegevens(candidateId: string): Promise<PersonalRecord> {
  const [bestaand] = await db.select().from(personalRecords).where(eq(personalRecords.candidateId, candidateId)).limit(1)
  if (bestaand) return bestaand
  const [k] = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1)
  if (!k) throw new GegevensError('Deze kandidaat bestaat niet meer.')
  const [nieuw] = await db
    .insert(personalRecords)
    .values({ candidateId, officialFirstNames: k.officialFirstNames, infix: k.infix, lastName: k.lastName })
    .onConflictDoNothing()
    .returning()
  if (nieuw) return nieuw
  const [alsnog] = await db.select().from(personalRecords).where(eq(personalRecords.candidateId, candidateId)).limit(1)
  return alsnog!
}

/**
 * Het dossier van een collega; maakt het aan als het er nog niet is.
 *
 * Voor wie niet via werving binnenkwam, of van voor dit portaal: ook dan
 * horen IBAN, kopie ID en het getekende contract op één versleutelde plek.
 */
export async function zorgVoorGegevensVanCollega(userId: string): Promise<PersonalRecord> {
  const [bestaand] = await db.select().from(personalRecords).where(eq(personalRecords.userId, userId)).limit(1)
  if (bestaand) return bestaand
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!u) throw new GegevensError('Deze collega bestaat niet meer.')
  const [nieuw] = await db
    .insert(personalRecords)
    .values({ userId, infix: u.infix, lastName: u.lastName, addressLine: u.addressLine, postalCode: u.postalCode, city: u.city })
    .onConflictDoNothing()
    .returning()
  if (nieuw) return nieuw
  const [alsnog] = await db.select().from(personalRecords).where(eq(personalRecords.userId, userId)).limit(1)
  return alsnog!
}

/* ------------------------------ Schrijven --------------------------------- */

export type GegevensInvoer = {
  officialFirstNames?: string | null
  infix?: string | null
  lastName?: string | null
  birthDate?: Date | null
  birthPlace?: string | null
  addressLine?: string | null
  postalCode?: string | null
  city?: string | null
  /** Leeg laten = niet wijzigen. */
  iban?: string | null
  accountHolder?: string | null
}

const kort = (s: string | null | undefined, max = 200) => {
  const t = (s ?? '').trim()
  return t === '' ? null : t.slice(0, max)
}

/** Postcode als 1234 AB als het een Nederlandse is; anders zoals getypt. */
export function schoonPostcode(p: string | null | undefined): string | null {
  const t = kort(p, 20)
  if (!t) return null
  const m = /^(\d{4})\s*([a-zA-Z]{2})$/.exec(t)
  return m ? `${m[1]} ${m[2]!.toUpperCase()}` : t
}

export async function slaGegevensOp(recordId: string, invoer: GegevensInvoer): Promise<void> {
  const patch: Partial<typeof personalRecords.$inferInsert> = {
    officialFirstNames: kort(invoer.officialFirstNames),
    infix: kort(invoer.infix, 40),
    lastName: kort(invoer.lastName),
    birthDate: invoer.birthDate ?? null,
    birthPlace: kort(invoer.birthPlace),
    addressLine: kort(invoer.addressLine),
    postalCode: schoonPostcode(invoer.postalCode),
    city: kort(invoer.city),
    accountHolder: kort(invoer.accountHolder),
    updatedAt: new Date(),
  }
  if (invoer.birthDate && (invoer.birthDate.getTime() > Date.now() || invoer.birthDate.getFullYear() < 1920)) {
    throw new GegevensError('De geboortedatum klopt niet.')
  }
  const iban = (invoer.iban ?? '').trim()
  if (iban !== '') {
    if (!ibanKlopt(iban)) throw new GegevensError('Dit IBAN klopt niet. Controleer het nummer op je bankpas.')
    const schoon = schoonIban(iban)
    patch.ibanEnc = versleutel(schoon)
    patch.ibanLast4 = schoon.slice(-4)
  }
  await db.update(personalRecords).set(patch).where(eq(personalRecords.id, recordId))
}

export type NieuwDocument = { kind: DocumentSoort; contentType: string; filename: string | null; data: Buffer }

export function controleerDocument(d: NieuwDocument): void {
  if (!(TOEGESTAAN as readonly string[]).includes(d.contentType)) {
    throw new GegevensError('Alleen een pdf, jpg of png. Een foto van je telefoon is prima.')
  }
  if (d.data.length === 0) throw new GegevensError('Het bestand is leeg.')
  if (d.data.length > MAX_BESTAND) throw new GegevensError('Het bestand is groter dan 4 MB. Maak een kleinere foto of scan.')
}

export async function voegDocumentToe(recordId: string, d: NieuwDocument, doorUserId: string | null): Promise<void> {
  controleerDocument(d)
  await db.insert(personalDocuments).values({
    recordId,
    kind: d.kind,
    contentType: d.contentType,
    bytes: d.data.length,
    dataEnc: versleutel(d.data),
    filename: kort(d.filename, 120),
    uploadedByUserId: doorUserId,
  })
  await db.update(personalRecords).set({ updatedAt: new Date() }).where(eq(personalRecords.id, recordId))
}

/** Een document openen. Wie dat doet, wordt vastgelegd. */
export async function leesDocument(documentId: string, userId: string): Promise<{ data: Buffer; contentType: string; filename: string | null } | null> {
  const [d] = await db.select().from(personalDocuments).where(eq(personalDocuments.id, documentId)).limit(1)
  if (!d) return null
  await db.insert(personalDocumentViews).values({ documentId, userId })
  return { data: ontsleutel(d.dataEnc), contentType: d.contentType, filename: d.filename }
}

export async function wisDocument(documentId: string): Promise<void> {
  await db.delete(personalDocuments).where(eq(personalDocuments.id, documentId))
}

/** Vastleggen dat het is doorgegeven aan de salarisadministratie, of dat terugdraaien. */
export async function markeerDoorgegeven(recordId: string, userId: string, doorgegeven = true): Promise<void> {
  const [r] = await db.select().from(personalRecords).where(eq(personalRecords.id, recordId)).limit(1)
  if (!r) throw new GegevensError('Deze gegevens bestaan niet meer.')
  if (doorgegeven) {
    const documenten = await documentenVan(recordId)
    const mist = watOntbreekt(r, documenten)
    if (mist.length > 0) throw new GegevensError(`Nog niet compleet: ${mist.join(', ')}.`)
  }
  await db
    .update(personalRecords)
    .set({ doorgegevenOp: doorgegeven ? new Date() : null, doorgegevenDoorUserId: doorgegeven ? userId : null, updatedAt: new Date() })
    .where(eq(personalRecords.id, recordId))
  if (r.candidateId) {
    await db.insert(candidateNotes).values({
      candidateId: r.candidateId,
      kind: 'status',
      body: doorgegeven ? 'Gegevens doorgegeven aan de salarisadministratie.' : 'Doorgeven aan de salarisadministratie teruggedraaid.',
      createdByUserId: userId,
    })
  }
}

/* ------------------------------ De invullink ------------------------------ */

export async function maakGegevenslink(recordId: string, opnieuw = false): Promise<string> {
  const [r] = await db.select().from(personalRecords).where(eq(personalRecords.id, recordId)).limit(1)
  if (!r) throw new GegevensError('Deze gegevens bestaan niet meer.')
  const versie = opnieuw || r.linkVersie === 0 ? r.linkVersie + 1 : r.linkVersie
  await db
    .update(personalRecords)
    .set({ linkVersie: versie, linkVerlooptOp: new Date(Date.now() + LINK_DAGEN * 86_400_000), updatedAt: new Date() })
    .where(eq(personalRecords.id, recordId))
  return gegevensPad(recordId, versie)
}

/** Het dossier achter een link, als die klopt en nog geldig is. Anders null, zonder te zeggen waarom. */
export async function gegevensViaLink(id: string, token: string): Promise<(PersonalRecord & { voornaam: string }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[A-Za-z0-9_-]{32}$/.test(token)) return null
  const [r] = await db
    .select({ r: personalRecords, voornaam: candidates.firstName, naam: candidates.name, collegaVoornaam: users.firstName, collegaNaam: users.name })
    .from(personalRecords)
    .leftJoin(candidates, eq(candidates.id, personalRecords.candidateId))
    // Na de aanname hangt het dossier aan de collega; de link blijft dan werken.
    .leftJoin(users, eq(users.id, personalRecords.userId))
    .where(eq(personalRecords.id, id))
    .limit(1)
  if (!r || r.r.linkVersie === 0 || !r.r.linkVerlooptOp) return null
  const verwacht = Buffer.from(gegevensToken(id, r.r.linkVersie))
  const gegeven = Buffer.from(token)
  if (verwacht.length !== gegeven.length || !timingSafeEqual(verwacht, gegeven)) return null
  if (r.r.linkVerlooptOp.getTime() < Date.now()) return null
  return { ...r.r, voornaam: r.voornaam ?? r.collegaVoornaam ?? (r.naam ?? r.collegaNaam ?? '').split(' ')[0] ?? '' }
}

/**
 * De kandidaat stuurt zijn gegevens in. Mag vaker: wie iets vergat, gebruikt
 * dezelfde link nog een keer. Een document van dezelfde soort komt erbij; wij
 * gooien het oude weg als het nieuwe goed is.
 */
export async function dienGegevensIn(id: string, token: string, invoer: GegevensInvoer, documenten: NieuwDocument[]): Promise<string[]> {
  const r = await gegevensViaLink(id, token)
  if (!r) throw new GegevensError('Deze link werkt niet meer. Vraag ons om een nieuwe.')
  for (const d of documenten) controleerDocument(d)
  await slaGegevensOp(id, invoer)
  for (const d of documenten) await voegDocumentToe(id, d, null)
  await db.update(personalRecords).set({ aangeleverdOp: new Date() }).where(eq(personalRecords.id, id))
  if (r.candidateId) {
    // De naam zoals in het paspoort ook op de kandidaat, voor het contract.
    if (invoer.officialFirstNames?.trim()) {
      await db.update(candidates).set({ officialFirstNames: invoer.officialFirstNames.trim(), updatedAt: new Date() }).where(eq(candidates.id, r.candidateId))
    }
    await db.insert(candidateNotes).values({ candidateId: r.candidateId, kind: 'status', body: 'Gegevens aangeleverd via de link.' })
  }
  const na = await getGegevens({ candidateId: r.candidateId ?? undefined, userId: r.candidateId ? undefined : (r.userId ?? undefined) })
  return na?.ontbreekt ?? []
}

/** Voor de tests en het scherm: bestaat er al een dossier bij deze kandidaat? */
export async function heeftGegevens(candidateId: string): Promise<boolean> {
  const [r] = await db.select({ id: personalRecords.id }).from(personalRecords).where(and(eq(personalRecords.candidateId, candidateId))).limit(1)
  return !!r
}
