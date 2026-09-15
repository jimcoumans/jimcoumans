import { and, asc, desc, eq, sql, count } from 'drizzle-orm'
import { db } from '@/db'
import {
  organizations,
  contacts,
  partners,
  organizationPartners,
  accounts,
  quoteLines,
} from '@/db/schema'
import type { Contact, Partner, Account, OrganizationPartner } from '@/db/schema'
import type { Aanhef } from './namen'

/* -------------------------------------------------------------------------
   Het CRM-deel: contactpersonen, externe partners en het accountregister.

   Anders dan het grootboek mogen deze gegevens gewoon gewijzigd en
   verwijderd worden. Een telefoonnummer dat verandert is geen boeking; daar
   hoort geen correctieregel bij maar een nieuwe waarde.
   ------------------------------------------------------------------------- */

/**
 * Een weigering met een reden die de gebruiker moet zien.
 *
 * Zonder eigen fouttype belandt "deze partner staat op een offerte" in de
 * algemene vangnetmelding, en staat er op het scherm "er ging iets mis"
 * terwijl er juist iets heel duidelijks aan de hand is.
 */
export class CrmError extends Error {}

/** Branches waarin James Robinson werkt. Suggesties, geen keurslijf. */
export const BRANCHES = [
  'Horeca',
  'Makelaardij',
  'Automotive',
  'Retail',
  'B2B',
  'Zorg',
  'Overheid',
  'Sport & leisure',
  'Bouw',
  'Onderwijs',
] as const

export const partnerTypeLabels = {
  photographer: 'Fotograaf',
  videographer: 'Videograaf',
  printer: 'Drukkerij',
  developer: 'Developer',
  copywriter: 'Tekstschrijver',
  translator: 'Vertaler',
  designer: 'Vormgever',
  other: 'Overig',
} as const

export const accountOwnerLabels = {
  client: 'Klant',
  agency: 'James Robinson',
  shared: 'Gedeeld',
} as const

export const leadSourceLabels = {
  referral: 'Doorverwijzing',
  network: 'Eigen netwerk',
  inbound: 'Via de website',
  outbound: 'Zelf benaderd',
  partner: 'Via een partner',
  event: 'Evenement',
  other: 'Anders',
} as const

export const activityKindLabels = {
  note: 'Notitie',
  call: 'Telefoongesprek',
  meeting: 'Afspraak',
  email: 'Mail',
  task: 'Taak',
} as const

export const organizationStatusLabels = {
  lead: 'Lead',
  prospect: 'Prospect',
  client: 'Klant',
  former: 'Oud-klant',
} as const

export const organizationStatusStyles = {
  lead: 'bg-jr-purple/10 text-jr-purple',
  prospect: 'bg-jr-lightblue text-jr-deepblue',
  client: 'bg-jr-green/10 text-jr-green',
  former: 'bg-gray-100 text-gray-600',
} as const

/* ---------------------------- Contactpersonen --------------------------- */

export async function listContacts(organizationId: string): Promise<Contact[]> {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId))
    // De vaste contactpersoon bovenaan; die zoek je het vaakst.
    .orderBy(desc(contacts.isPrimary), asc(contacts.name))
}

export type NewContact = {
  organizationId: string
  /** De volledige naam; stel hem samen met volledigeNaam() uit de delen. */
  name: string
  firstName?: string | null
  infix?: string | null
  lastName?: string | null
  aanhef?: Aanhef | null
  jobTitle?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  linkedinUrl?: string | null
  isPrimary?: boolean
  receivesInvoices?: boolean
  notes?: string | null
}

/**
 * Voegt een contactpersoon toe.
 *
 * Wordt deze de vaste contactpersoon, dan verliest de vorige die rol in
 * dezelfde transactie. Zonder dat zou de unieke index de invoer weigeren en
 * zou je eerst de oude moeten omzetten, wat niemand onthoudt.
 */
export async function createContact(input: NewContact): Promise<Contact> {
  return db.transaction(async (tx) => {
    if (input.isPrimary) {
      await tx
        .update(contacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(contacts.organizationId, input.organizationId),
            eq(contacts.isPrimary, true),
          ),
        )
    }

    const [contact] = await tx
      .insert(contacts)
      .values({
        organizationId: input.organizationId,
        name: input.name.trim(),
        firstName: input.firstName?.trim() || null,
        infix: input.infix?.trim() || null,
        lastName: input.lastName?.trim() || null,
        aanhef: input.aanhef ?? null,
        jobTitle: input.jobTitle ?? null,
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone ?? null,
        mobile: input.mobile ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        isPrimary: input.isPrimary ?? false,
        receivesInvoices: input.receivesInvoices ?? false,
        notes: input.notes ?? null,
      })
      .returning()

    if (!contact) throw new Error('Contactpersoon kon niet worden opgeslagen.')
    return contact
  })
}

/** Maakt deze persoon de vaste contactpersoon en haalt die rol bij de ander weg. */
export async function makePrimaryContact(contactId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [contact] = await tx
      .select({ organizationId: contacts.organizationId })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1)

    if (!contact) throw new CrmError('Contactpersoon niet gevonden.')

    await tx
      .update(contacts)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(contacts.organizationId, contact.organizationId))

    await tx
      .update(contacts)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(contacts.id, contactId))
  })
}

/**
 * Wijzigt een contactpersoon.
 *
 * Je kunt hier ook de vaste contactpersoon aanwijzen; dan verliest de vorige
 * die rol in dezelfde transactie, precies zoals bij het aanmaken. Anders zou
 * een verbetering van een telefoonnummer kunnen stranden op een index die
 * over iets heel anders gaat.
 */
export type ContactPatch = Omit<NewContact, 'organizationId'>

export async function updateContact(
  contactId: string,
  patch: ContactPatch,
): Promise<Contact> {
  return db.transaction(async (tx) => {
    const [bestaand] = await tx
      .select({ organizationId: contacts.organizationId })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1)

    if (!bestaand) throw new CrmError('Contactpersoon niet gevonden.')

    if (patch.isPrimary) {
      await tx
        .update(contacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(contacts.organizationId, bestaand.organizationId),
            eq(contacts.isPrimary, true),
          ),
        )
    }

    const [contact] = await tx
      .update(contacts)
      .set({
        name: patch.name.trim(),
        firstName: patch.firstName?.trim() || null,
        infix: patch.infix?.trim() || null,
        lastName: patch.lastName?.trim() || null,
        aanhef: patch.aanhef ?? null,
        jobTitle: patch.jobTitle ?? null,
        email: patch.email?.trim().toLowerCase() || null,
        phone: patch.phone ?? null,
        mobile: patch.mobile ?? null,
        linkedinUrl: patch.linkedinUrl ?? null,
        isPrimary: patch.isPrimary ?? false,
        receivesInvoices: patch.receivesInvoices ?? false,
        notes: patch.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId))
      .returning()

    if (!contact) throw new Error('Contactpersoon kon niet worden opgeslagen.')
    return contact
  })
}

export async function deleteContact(contactId: string): Promise<void> {
  await db.delete(contacts).where(eq(contacts.id, contactId))
}

/* ------------------------------- Partners ------------------------------- */

export type PartnerWithUsage = Partner & {
  /** Bij hoeveel klanten deze partner is gekoppeld. */
  clientCount: number
}

export async function listPartners(
  opts: { onlyActive?: boolean } = {},
): Promise<PartnerWithUsage[]> {
  const rows = await db
    .select({
      partner: partners,
      clientCount: sql<string>`COUNT(${organizationPartners.id})`,
    })
    .from(partners)
    .leftJoin(organizationPartners, eq(organizationPartners.partnerId, partners.id))
    .where(opts.onlyActive ? eq(partners.active, true) : undefined)
    .groupBy(partners.id)
    .orderBy(asc(partners.name))

  return rows.map((r) => ({ ...r.partner, clientCount: Number(r.clientCount) }))
}

export async function listActivePartners(): Promise<Partner[]> {
  return db.select().from(partners).where(eq(partners.active, true)).orderBy(asc(partners.name))
}

export type NewPartner = {
  name: string
  type: Partner['type']
  contactName?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  hourlyRateCents?: number | null
  dayRateCents?: number | null
  paymentTermDays?: number | null
  agreementNotes?: string | null
  notes?: string | null
}

export async function createPartner(input: NewPartner): Promise<Partner> {
  const [partner] = await db
    .insert(partners)
    .values({
      name: input.name.trim(),
      type: input.type,
      contactName: input.contactName ?? null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      hourlyRateCents: input.hourlyRateCents ?? null,
      dayRateCents: input.dayRateCents ?? null,
      paymentTermDays: input.paymentTermDays ?? null,
      agreementNotes: input.agreementNotes ?? null,
      notes: input.notes ?? null,
    })
    .returning()

  if (!partner) throw new Error('Partner kon niet worden opgeslagen.')
  return partner
}

/** Wijzigt een partner. De tariefafspraak verandert alleen hier, niet met terugwerkende kracht: een offerteregel houdt het tarief van het moment dat hij werd gemaakt. */
export async function updatePartner(partnerId: string, patch: NewPartner): Promise<Partner> {
  const [partner] = await db
    .update(partners)
    .set({
      name: patch.name.trim(),
      type: patch.type,
      contactName: patch.contactName ?? null,
      email: patch.email?.trim().toLowerCase() || null,
      phone: patch.phone ?? null,
      website: patch.website ?? null,
      hourlyRateCents: patch.hourlyRateCents ?? null,
      dayRateCents: patch.dayRateCents ?? null,
      paymentTermDays: patch.paymentTermDays ?? null,
      agreementNotes: patch.agreementNotes ?? null,
      notes: patch.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, partnerId))
    .returning()

  if (!partner) throw new CrmError('Partner niet gevonden.')
  return partner
}

/** Zet een partner aan of uit. Uit betekent: niet meer kiesbaar, wel in de cijfers. */
export async function setPartnerActive(partnerId: string, active: boolean): Promise<void> {
  await db
    .update(partners)
    .set({ active, updatedAt: new Date() })
    .where(eq(partners.id, partnerId))
}

/**
 * Verwijdert een partner, maar alleen als er niets aan hangt.
 *
 * Staat hij op een offerte of bij een klant, dan is weggooien geen opruimen
 * maar geschiedenis wissen: de cijfers per partner kloppen daarna niet meer.
 * Zet hem dan op non-actief.
 */
export async function deletePartner(partnerId: string): Promise<void> {
  const [regels] = await db
    .select({ aantal: sql<string>`COUNT(*)` })
    .from(quoteLines)
    .where(eq(quoteLines.partnerId, partnerId))

  if (Number(regels?.aantal ?? 0) > 0) {
    throw new CrmError(
      'Deze partner staat op een offerte. Zet hem op non-actief in plaats van hem te verwijderen, anders kloppen de cijfers per partner niet meer.',
    )
  }

  const [koppelingen] = await db
    .select({ aantal: sql<string>`COUNT(*)` })
    .from(organizationPartners)
    .where(eq(organizationPartners.partnerId, partnerId))

  if (Number(koppelingen?.aantal ?? 0) > 0) {
    throw new CrmError('Deze partner is nog aan een klant gekoppeld. Haal die koppelingen eerst weg.')
  }

  await db.delete(partners).where(eq(partners.id, partnerId))
}

export type PartnerLink = OrganizationPartner & {
  partner: Partner
  /** Het tarief dat bij deze klant geldt: afwijkend als dat is afgesproken. */
  effectiveHourlyRateCents: number | null
}

/** De partners van een klant, met het tarief dat bij die klant hoort. */
export async function listPartnersForOrganization(
  organizationId: string,
): Promise<PartnerLink[]> {
  const rows = await db
    .select({ link: organizationPartners, partner: partners })
    .from(organizationPartners)
    .innerJoin(partners, eq(partners.id, organizationPartners.partnerId))
    .where(eq(organizationPartners.organizationId, organizationId))
    .orderBy(asc(organizationPartners.role))

  return rows.map((r) => ({
    ...r.link,
    partner: r.partner,
    effectiveHourlyRateCents: r.link.customHourlyRateCents ?? r.partner.hourlyRateCents,
  }))
}

/** Bij welke klanten een partner is gekoppeld, voor het partneroverzicht. */
export async function listOrganizationsForPartner(partnerId: string) {
  return db
    .select({
      link: organizationPartners,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(organizationPartners)
    .innerJoin(organizations, eq(organizations.id, organizationPartners.organizationId))
    .where(eq(organizationPartners.partnerId, partnerId))
    .orderBy(asc(organizations.name))
}

export async function linkPartner(input: {
  organizationId: string
  partnerId: string
  role: string
  customHourlyRateCents?: number | null
  since?: Date | null
  notes?: string | null
}): Promise<OrganizationPartner> {
  const [link] = await db
    .insert(organizationPartners)
    .values({
      organizationId: input.organizationId,
      partnerId: input.partnerId,
      role: input.role.trim(),
      customHourlyRateCents: input.customHourlyRateCents ?? null,
      since: input.since ?? null,
      notes: input.notes ?? null,
    })
    .returning()

  if (!link) throw new Error('Koppeling kon niet worden opgeslagen.')
  return link
}

/** Wijzigt de afspraak tussen een klant en een partner: rol, afwijkend tarief, notities. */
export async function updatePartnerLink(
  linkId: string,
  patch: { role: string; customHourlyRateCents?: number | null; since?: Date | null; notes?: string | null },
): Promise<OrganizationPartner> {
  const [link] = await db
    .update(organizationPartners)
    .set({
      role: patch.role.trim(),
      customHourlyRateCents: patch.customHourlyRateCents ?? null,
      since: patch.since ?? null,
      notes: patch.notes ?? null,
    })
    .where(eq(organizationPartners.id, linkId))
    .returning()

  if (!link) throw new CrmError('Koppeling niet gevonden.')
  return link
}

export async function unlinkPartner(linkId: string): Promise<void> {
  await db.delete(organizationPartners).where(eq(organizationPartners.id, linkId))
}

/* ---------------------------- Accountregister --------------------------- */

export async function listAccounts(organizationId: string): Promise<Account[]> {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId))
    .orderBy(desc(accounts.active), asc(accounts.name))
}

export type NewAccount = {
  organizationId: string
  name: string
  system?: string | null
  url?: string | null
  loginHint?: string | null
  owner?: Account['owner']
  vaultReference?: string | null
  hasMfa?: boolean
  mfaNotes?: string | null
  notes?: string | null
}

/**
 * Legt een account vast. Er is bewust geen parameter voor een wachtwoord:
 * die hoort in de wachtwoordmanager, en `vaultReference` wijst ernaar.
 */
export async function createAccount(input: NewAccount): Promise<Account> {
  const [account] = await db
    .insert(accounts)
    .values({
      organizationId: input.organizationId,
      name: input.name.trim(),
      system: input.system ?? null,
      url: input.url ?? null,
      loginHint: input.loginHint?.trim() || null,
      owner: input.owner ?? 'client',
      vaultReference: input.vaultReference ?? null,
      hasMfa: input.hasMfa ?? false,
      mfaNotes: input.mfaNotes ?? null,
      notes: input.notes ?? null,
    })
    .returning()

  if (!account) throw new Error('Account kon niet worden opgeslagen.')
  return account
}

/**
 * Wijzigt een account. Ook hier is er geen parameter voor een wachtwoord:
 * `vaultReference` wijst naar de wachtwoordmanager, meer slaan we niet op.
 */
export async function updateAccount(
  accountId: string,
  patch: Omit<NewAccount, 'organizationId'> & { active?: boolean },
): Promise<Account> {
  const [account] = await db
    .update(accounts)
    .set({
      name: patch.name.trim(),
      system: patch.system ?? null,
      url: patch.url ?? null,
      loginHint: patch.loginHint?.trim() || null,
      owner: patch.owner ?? 'client',
      vaultReference: patch.vaultReference ?? null,
      hasMfa: patch.hasMfa ?? false,
      mfaNotes: patch.mfaNotes ?? null,
      notes: patch.notes ?? null,
      active: patch.active ?? true,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, accountId))
    .returning()

  if (!account) throw new CrmError('Account niet gevonden.')
  return account
}

export async function deleteAccount(accountId: string): Promise<void> {
  await db.delete(accounts).where(eq(accounts.id, accountId))
}

/** Systemen die vaak voorkomen, als suggestie bij het invoeren. */
export const COMMON_SYSTEMS = [
  'WordPress',
  'Google Ads',
  'Google Analytics',
  'Google Business Profile',
  'Meta Business Manager',
  'LinkedIn',
  'MailerLite',
  'Moneybird',
  'Hosting',
  'Domeinnaam',
  'Shopify',
  'Overig',
] as const

/* --------------------------- Bedrijfsgegevens --------------------------- */

export type OrganizationDetails = {
  status?: 'prospect' | 'client' | 'former'
  industry?: string | null
  kvkNumber?: string | null
  vatNumber?: string | null
  website?: string | null
  phone?: string | null
  email?: string | null
  addressLine?: string | null
  postalCode?: string | null
  city?: string | null
  /** Niet-nullable in het schema, dus leeg laten betekent: niet wijzigen. */
  country?: string
  clientSince?: Date | null
  notes?: string | null
}

export async function updateOrganizationDetails(
  organizationId: string,
  input: OrganizationDetails,
): Promise<void> {
  // Velden expliciet overzetten in plaats van de invoer uit te spreiden:
  // zo kan een veld dat niet in OrganizationDetails hoort nooit per ongeluk
  // in de update belanden.
  await db
    .update(organizations)
    .set({
      ...(input.status !== undefined && { status: input.status }),
      ...(input.industry !== undefined && { industry: input.industry }),
      ...(input.kvkNumber !== undefined && { kvkNumber: input.kvkNumber }),
      ...(input.vatNumber !== undefined && { vatNumber: input.vatNumber }),
      ...(input.website !== undefined && { website: input.website }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.addressLine !== undefined && { addressLine: input.addressLine }),
      ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.clientSince !== undefined && { clientSince: input.clientSince }),
      ...(input.notes !== undefined && { notes: input.notes }),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
}

/** Aantallen per klant, voor het klantenoverzicht. */
export async function getCrmCounts(organizationIds: string[]) {
  const leeg = new Map<string, { contacts: number; partners: number; accounts: number }>()
  if (organizationIds.length === 0) return leeg

  for (const id of organizationIds) leeg.set(id, { contacts: 0, partners: 0, accounts: 0 })

  const [c, p, a] = await Promise.all([
    db.select({ id: contacts.organizationId, n: count() }).from(contacts).groupBy(contacts.organizationId),
    db.select({ id: organizationPartners.organizationId, n: count() }).from(organizationPartners).groupBy(organizationPartners.organizationId),
    db.select({ id: accounts.organizationId, n: count() }).from(accounts).groupBy(accounts.organizationId),
  ])

  for (const row of c) { const e = leeg.get(row.id); if (e) e.contacts = Number(row.n) }
  for (const row of p) { const e = leeg.get(row.id); if (e) e.partners = Number(row.n) }
  for (const row of a) { const e = leeg.get(row.id); if (e) e.accounts = Number(row.n) }

  return leeg
}

export type ContactMetKlant = Contact & {
  klantNaam: string
  klantSlug: string
  klantStatus: string
}

/**
 * Alle contactpersonen over alle klanten heen.
 *
 * Bestaat omdat je vaker een persoon zoekt dan een bedrijf. Je weet dat je
 * Marieke moet hebben; bij welke klant ze hoort is precies wat je kwijt bent.
 *
 * Er wordt op achternaam gesorteerd en niet op de volledige naam: anders
 * staat iedereen die Van heet onder de V.
 */
export async function listAlleContactpersonen(zoek?: string): Promise<ContactMetKlant[]> {
  const term = (zoek ?? '').trim()

  const rijen = await db
    .select({ contact: contacts, org: organizations })
    .from(contacts)
    .innerJoin(organizations, eq(organizations.id, contacts.organizationId))
    .where(
      term === ''
        ? undefined
        : sql`(
            ${contacts.name} ILIKE ${'%' + term + '%'}
            OR ${contacts.email} ILIKE ${'%' + term + '%'}
            OR ${contacts.jobTitle} ILIKE ${'%' + term + '%'}
            OR ${organizations.name} ILIKE ${'%' + term + '%'}
          )`,
    )
    .orderBy(
      asc(sql`COALESCE(NULLIF(${contacts.lastName}, ''), ${contacts.name})`),
      asc(contacts.firstName),
    )

  return rijen.map((r) => ({
    ...r.contact,
    klantNaam: r.org.name,
    klantSlug: r.org.slug,
    klantStatus: r.org.status,
  }))
}
