import { and, asc, desc, eq, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  employmentContracts,
  salaryRecords,
  dossierEntries,
  companyAssets,
  users,
} from '@/db/schema'
import type {
  EmploymentContract,
  SalaryRecord,
  DossierEntry,
  CompanyAsset,
} from '@/db/schema'
import type { DossierRegel } from './personeel-labels'

/* -------------------------------------------------------------------------
   Het personeelsdossier.

   Wat hier NIET in zit staat toegelicht bij de tabellen in het schema: geen
   BSN, geen IBAN en geen medische gegevens. De eerste twee staan al in de
   salarisadministratie; het derde mag een werkgever niet vastleggen.

   Het salaris werkt als het grootboek: je overschrijft niets, je zet er een
   regel bij met een ingangsdatum. Het huidige salaris is dan altijd af te
   leiden, en een verhoging die over twee maanden ingaat kun je nu al
   invoeren zonder dat het scherm vandaag iets verkeerds laat zien.
   ------------------------------------------------------------------------- */

export class PersoneelError extends Error {}

/* De labels en het pure rekenwerk staan apart zodat schermcomponenten ze
   kunnen gebruiken zonder de databaselaag mee te slepen. */
export {
  CONTRACT_LABELS,
  DOSSIER_LABELS,
  DOSSIER_STIJLEN,
  ASSET_LABELS,
  ketensignaal,
  jaarloonCents,
} from './personeel-labels'
export type { Ketensignaal, DossierRegel } from './personeel-labels'

/* --- Contracten ---------------------------------------------------------- */

export async function listContracten(userId: string): Promise<EmploymentContract[]> {
  return db
    .select()
    .from(employmentContracts)
    .where(eq(employmentContracts.userId, userId))
    .orderBy(desc(employmentContracts.startedOn))
}

export type NieuwContract = {
  userId: string
  type: EmploymentContract['type']
  startedOn: Date
  endsOn: Date | null
  hoursPerWeekQuarters: number | null
  jobTitle: string | null
  signedOn: Date | null
  notes: string | null
  createdByUserId?: string | null
}

export async function addContract(input: NieuwContract): Promise<EmploymentContract> {
  if (input.type === 'onbepaalde_tijd' && input.endsOn !== null) {
    throw new PersoneelError(
      'Een contract voor onbepaalde tijd heeft geen einddatum. Haal de einddatum weg, of kies bepaalde tijd.',
    )
  }

  const [contract] = await db
    .insert(employmentContracts)
    .values({
      userId: input.userId,
      type: input.type,
      startedOn: input.startedOn,
      endsOn: input.endsOn,
      hoursPerWeekQuarters: input.hoursPerWeekQuarters,
      jobTitle: input.jobTitle,
      signedOn: input.signedOn,
      notes: input.notes,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning()

  if (!contract) throw new PersoneelError('Contract kon niet worden opgeslagen.')
  return contract
}

export async function verwijderContract(id: string): Promise<void> {
  await db.delete(employmentContracts).where(eq(employmentContracts.id, id))
}

/* --- De ketenregeling ---------------------------------------------------- */

/* --- Salaris ------------------------------------------------------------- */

export async function listSalarissen(userId: string): Promise<SalaryRecord[]> {
  return db
    .select()
    .from(salaryRecords)
    .where(eq(salaryRecords.userId, userId))
    .orderBy(desc(salaryRecords.effectiveFrom))
}

/** Het salaris dat vandaag geldt: de laatste regel die al is ingegaan. */
export async function huidigSalaris(
  userId: string,
  vandaag: Date = new Date(),
): Promise<SalaryRecord | null> {
  const [regel] = await db
    .select()
    .from(salaryRecords)
    .where(and(eq(salaryRecords.userId, userId), lte(salaryRecords.effectiveFrom, vandaag)))
    .orderBy(desc(salaryRecords.effectiveFrom))
    .limit(1)

  return regel ?? null
}

export type NieuwSalaris = {
  userId: string
  grossMonthlyCents: number
  soort?: SalaryRecord['soort']
  employerCostPercent?: number
  basedOnHoursQuarters: number | null
  holidayAllowancePercent: number
  effectiveFrom: Date
  reason: string | null
  createdByUserId?: string | null
}

export async function addSalaris(input: NieuwSalaris): Promise<SalaryRecord> {
  if (input.grossMonthlyCents <= 0) {
    throw new PersoneelError('Een salaris moet boven nul liggen.')
  }

  const [regel] = await db
    .insert(salaryRecords)
    .values({
      userId: input.userId,
      grossMonthlyCents: input.grossMonthlyCents,
      soort: input.soort ?? 'loondienst',
      basedOnHoursQuarters: input.basedOnHoursQuarters,
      holidayAllowancePercent: input.holidayAllowancePercent,
      employerCostPercent: input.employerCostPercent ?? 28,
      effectiveFrom: input.effectiveFrom,
      reason: input.reason,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning()

  if (!regel) throw new PersoneelError('Salarisregel kon niet worden opgeslagen.')
  return regel
}

/**
 * Verwijdert een salarisregel.
 *
 * Mag, in tegenstelling tot een grootboekregel: hier staat wat er is
 * afgesproken, niet wat er is uitbetaald. Een typefout in een afspraak hoort
 * je te kunnen herstellen; een uitbetaling niet.
 */
export async function verwijderSalaris(id: string): Promise<void> {
  await db.delete(salaryRecords).where(eq(salaryRecords.id, id))
}

/* --- Het dossier --------------------------------------------------------- */

export async function listDossier(userId: string): Promise<DossierRegel[]> {
  const rijen = await db
    .select({ regel: dossierEntries, auteur: users.name, auteurMail: users.email })
    .from(dossierEntries)
    .leftJoin(users, eq(users.id, dossierEntries.createdByUserId))
    .where(eq(dossierEntries.userId, userId))
    .orderBy(desc(dossierEntries.happenedOn))

  return rijen.map((r) => ({ ...r.regel, doorWie: r.auteur ?? r.auteurMail ?? null }))
}

export type NieuweDossierRegel = {
  userId: string
  kind: DossierEntry['kind']
  subject: string
  body: string | null
  happenedOn: Date
  createdByUserId?: string | null
}

export async function addDossierRegel(input: NieuweDossierRegel): Promise<DossierEntry> {
  if (input.subject.trim() === '') {
    throw new PersoneelError('Geef de dossierregel een korte titel.')
  }

  const [regel] = await db
    .insert(dossierEntries)
    .values({
      userId: input.userId,
      kind: input.kind,
      subject: input.subject.trim(),
      body: input.body?.trim() || null,
      happenedOn: input.happenedOn,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning()

  if (!regel) throw new PersoneelError('Dossierregel kon niet worden opgeslagen.')
  return regel
}

export async function verwijderDossierRegel(id: string): Promise<void> {
  await db.delete(dossierEntries).where(eq(dossierEntries.id, id))
}

/* --- Bedrijfsmiddelen ---------------------------------------------------- */

export async function listMiddelen(userId: string): Promise<CompanyAsset[]> {
  return db
    .select()
    .from(companyAssets)
    .where(eq(companyAssets.userId, userId))
    .orderBy(asc(companyAssets.returnedOn), desc(companyAssets.handedOutOn))
}

export type NieuwMiddel = {
  userId: string
  kind: CompanyAsset['kind']
  label: string
  serial: string | null
  handedOutOn: Date
  notes: string | null
}

export async function addMiddel(input: NieuwMiddel): Promise<CompanyAsset> {
  if (input.label.trim() === '') {
    throw new PersoneelError('Geef het bedrijfsmiddel een naam.')
  }

  const [middel] = await db
    .insert(companyAssets)
    .values({
      userId: input.userId,
      kind: input.kind,
      label: input.label.trim(),
      serial: input.serial?.trim() || null,
      handedOutOn: input.handedOutOn,
      notes: input.notes?.trim() || null,
    })
    .returning()

  if (!middel) throw new PersoneelError('Bedrijfsmiddel kon niet worden opgeslagen.')
  return middel
}

/** Ingeleverd. Blijft in de lijst staan: wie wat wanneer had is ook geschiedenis. */
export async function leverMiddelIn(id: string, op: Date = new Date()): Promise<void> {
  const [middel] = await db.select().from(companyAssets).where(eq(companyAssets.id, id)).limit(1)
  if (!middel) throw new PersoneelError('Bedrijfsmiddel niet gevonden.')
  if (op < middel.handedOutOn) {
    throw new PersoneelError('De datum van inleveren ligt voor de datum van uitgifte.')
  }
  await db.update(companyAssets).set({ returnedOn: op }).where(eq(companyAssets.id, id))
}

export async function verwijderMiddel(id: string): Promise<void> {
  await db.delete(companyAssets).where(eq(companyAssets.id, id))
}

/** Wat er op dit moment nog uitstaat bij collega's, voor een uitdienst-check. */
export async function openstaandeMiddelen(userId: string): Promise<CompanyAsset[]> {
  return db
    .select()
    .from(companyAssets)
    .where(and(eq(companyAssets.userId, userId), sql`${companyAssets.returnedOn} IS NULL`))
    .orderBy(desc(companyAssets.handedOutOn))
}
