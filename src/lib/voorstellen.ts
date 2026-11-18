/* -------------------------------------------------------------------------
   Dossiers van de voorstelgenerator. De generator bewaart zijn hele staat
   als één document; hier staat hij in de database van de Wallet, zodat het
   hele team bij dezelfde dossiers kan.
   ------------------------------------------------------------------------- */

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { proposalSettings, proposals, users } from '@/db/schema'
import { afbeeldingUrl } from './afbeeldingen'
import { volledigeNaam } from './namen'
import { normaliseerProfiel, voorVoorstel, type VoorstelProfiel } from './voorstel-profiel'

export const ID_FORMAAT = /^[a-z0-9][a-z0-9-]{0,80}$/

export type DossierBody = { naam?: unknown; bedrijfsnaam?: unknown; plaats?: unknown; bijgewerkt?: unknown; staat?: unknown }

export class VoorstelFout extends Error {}

const tekst = (v: unknown, max = 300): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t || null
}

/** De lijst voor de keuzelijst in de generator, nieuwste eerst. */
export async function lijstDossiers() {
  const rijen = await db
    .select({
      id: proposals.id,
      naam: proposals.naam,
      plaats: proposals.plaats,
      bijgewerkt: proposals.updatedAt,
      // Wie het opstelt staat in de staat van de generator; voor het overzicht is dat genoeg.
      door: sql<string | null>`${proposals.staat}->'offerte'->>'door'`,
    })
    .from(proposals)
    .orderBy(desc(proposals.updatedAt))
  return rijen.map((r) => ({ id: r.id, naam: r.naam, plaats: r.plaats, door: r.door ?? '', bijgewerkt: r.bijgewerkt.toISOString() }))
}

export async function leesDossier(id: string) {
  if (!ID_FORMAAT.test(id)) return null
  const [r] = await db.select().from(proposals).where(eq(proposals.id, id))
  if (!r) return null
  return { naam: r.naam, bedrijfsnaam: r.bedrijfsnaam ?? '', plaats: r.plaats ?? '', bijgewerkt: r.updatedAt.toISOString(), staat: r.staat }
}

/** Opslaan zoals de generator het aanlevert: naam, plaats en de staat. */
export async function bewaarDossier(id: string, body: DossierBody, userId: string | null): Promise<void> {
  if (!ID_FORMAAT.test(id)) throw new VoorstelFout('Ongeldige sleutel voor het dossier.')
  if (!body.staat || typeof body.staat !== 'object') throw new VoorstelFout('Het dossier is leeg.')
  const waarden = {
    naam: tekst(body.naam) ?? tekst(body.bedrijfsnaam) ?? id,
    bedrijfsnaam: tekst(body.bedrijfsnaam),
    plaats: tekst(body.plaats),
    staat: body.staat,
    updatedByUserId: userId,
    updatedAt: new Date(),
  }
  await db
    .insert(proposals)
    .values({ id, ...waarden })
    .onConflictDoUpdate({ target: proposals.id, set: waarden })
}

export async function verwijderDossier(id: string): Promise<void> {
  if (!ID_FORMAAT.test(id)) return
  await db.delete(proposals).where(eq(proposals.id, id))
}

const INSTELLINGEN = new Set(['subdoelen', 'auteurs'])

export async function leesInstelling(key: string): Promise<unknown | null> {
  if (!INSTELLINGEN.has(key)) return null
  const [r] = await db.select().from(proposalSettings).where(eq(proposalSettings.key, key))
  return r ? r.data : null
}

export async function bewaarInstelling(key: string, data: unknown): Promise<void> {
  if (!INSTELLINGEN.has(key)) throw new VoorstelFout('Onbekende instelling.')
  if (!data || typeof data !== 'object') throw new VoorstelFout('Lege instelling.')
  await db
    .insert(proposalSettings)
    .values({ key, data })
    .onConflictDoUpdate({ target: proposalSettings.key, set: { data, updatedAt: new Date() } })
}

/* -------------------------------------------------------------------------
   Wie een voorstel opstelt. De gegevens komen uit het profiel bij Beheer →
   Medewerkers, zodat er één plek is om ze bij te houden. Uit dienst is uit
   de lijst.
   ------------------------------------------------------------------------- */

export type Opsteller = {
  id: string
  naam: string
  functie: string
  telefoon: string
  email: string
  foto: string | null
  /** Eigenaar van James Robinson. */
  eigenaar: boolean
  /** Verkooptarief per uur in centen; null als het nog niet is ingevuld. */
  tariefCents: number | null
  /** Afwijkende tarieven in centen, te kiezen in een voorstel. */
  tarieven: number[]
  /** Het profiel voor de onepager, zonder de interne aandachtspunten. */
  profiel: Omit<VoorstelProfiel, 'aandachtspunten'>
}

type OpstellerRij = {
  id: string
  email: string
  name: string | null
  firstName: string | null
  infix: string | null
  lastName: string | null
  jobTitle: string | null
  phone: string | null
  mobile: string | null
  avatarImageId: string | null
  isOwner?: boolean
  sellRateCents?: number | null
  voorstelProfiel?: unknown
  endedOn: Date | null
}

/** Een medewerker zoals de generator hem nodig heeft. Mobiel gaat voor vast. */
export function naarOpsteller(r: OpstellerRij): Opsteller {
  const naam = volledigeNaam(r) || r.name?.trim() || r.email
  return {
    id: r.id,
    naam,
    functie: r.jobTitle?.trim() ?? '',
    telefoon: (r.mobile?.trim() || r.phone?.trim()) ?? '',
    email: r.email,
    foto: afbeeldingUrl(r.avatarImageId),
    eigenaar: r.isOwner === true,
    tariefCents: r.sellRateCents ?? null,
    tarieven: normaliseerProfiel(r.voorstelProfiel).tarieven,
    profiel: voorVoorstel(normaliseerProfiel(r.voorstelProfiel)),
  }
}

/** Actief: nog in dienst, of de einddatum ligt in de toekomst. */
export function isActief(r: { endedOn: Date | null }, nu: Date = new Date()): boolean {
  return r.endedOn === null || r.endedOn > nu
}

export async function lijstOpstellers(): Promise<Opsteller[]> {
  const rijen = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      firstName: users.firstName,
      infix: users.infix,
      lastName: users.lastName,
      jobTitle: users.jobTitle,
      phone: users.phone,
      mobile: users.mobile,
      avatarImageId: users.avatarImageId,
      isOwner: users.isOwner,
      sellRateCents: users.sellRateCents,
      voorstelProfiel: users.voorstelProfiel,
      endedOn: users.endedOn,
    })
    .from(users)
    .where(and(isNull(users.organizationId), inArray(users.role, ['staff', 'admin'])))
    .orderBy(asc(users.firstName), asc(users.name), asc(users.email))
  return rijen.filter((r) => isActief(r)).map(naarOpsteller)
}

/** Voorstellen die aan dit bedrijf in het CRM gekoppeld zijn, nieuwste eerst. */
export async function voorstellenVoorBedrijf(organizationId: string) {
  const rijen = await db
    .select({
      id: proposals.id,
      naam: proposals.naam,
      bijgewerkt: proposals.updatedAt,
      door: sql<string | null>`${proposals.staat}->'offerte'->>'door'`,
    })
    .from(proposals)
    .where(eq(proposals.organizationId, organizationId))
    .orderBy(desc(proposals.updatedAt))
  return rijen.map((r) => ({ id: r.id, naam: r.naam, door: r.door ?? '', bijgewerkt: r.bijgewerkt }))
}
