import { and, asc, desc, eq, sql, count } from 'drizzle-orm'
import { db } from '@/db'
import {
  organizations,
  contacts,
  partners,
  organizationPartners,
  accounts,
} from '@/db/schema'
import type { Contact, Partner, Account, OrganizationPartner } from '@/db/schema'

/* -------------------------------------------------------------------------
   Het CRM-deel: contactpersonen, externe partners en het accountregister.

   Anders dan het grootboek mogen deze gegevens gewoon gewijzigd en
   verwijderd worden. Een telefoonnummer dat verandert is geen boeking; daar
   hoort geen correctieregel bij maar een nieuwe waarde.
   ------------------------------------------------------------------------- */

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

export const organizationStatusLabels = {
  prospect: 'Prospect',
  client: 'Klant',
  former: 'Oud-klant',
} as const

export const organizationStatusStyles = {
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
  name: string
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

    if (!contact) throw new Error('Contactpersoon niet gevonden.')

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
