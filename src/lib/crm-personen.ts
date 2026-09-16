import { asc, eq, isNotNull, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, contacts, partners, users } from '@/db/schema'
import type { Contact, Organization, Partner } from '@/db/schema'

type OrganizationStatus = Organization['status']
type PartnerType = Partner['type']

/* -------------------------------------------------------------------------
   Het CRM: alle mensen op een hoop.

   Tot nu toe stonden de mensen op drie plekken. Contactpersonen bij klanten
   in het ene scherm, partners met een losse naam in het andere, collega's in
   het derde. Dat werkt zolang je weet waar iemand hoort — en dat is precies
   wat je kwijt bent op het moment dat je hem zoekt.

   Hier komen ze bij elkaar, met een label erbij zodat je nog steeds ziet wie
   wie is. Niet drie tabellen samengevoegd, wel drie bronnen in een lijst:

     - contactpersonen met een organization_id  -> klant, prospect, lead, oud
     - contactpersonen met een partner_id       -> partner of leverancier
     - gebruikers met de rol staff of admin     -> collega

   Waarom geen aparte "personen"-tabel waar alles in past: een collega is
   geen contactpersoon. Hij heeft een contract, een salaris en een dossier,
   en die horen niet in dezelfde tabel als de marketingmanager van een klant.
   Samenvoegen in het datamodel zou dat door elkaar halen; samenvoegen in het
   overzicht is wat je echt wilde.
   ------------------------------------------------------------------------- */

/** Waar iemand vandaan komt. Bepaalt het label en waar je heen klikt. */
export type PersoonSoort = 'klant' | 'prospect' | 'lead' | 'oud-klant' | 'partner' | 'collega'

export const SOORT_LABELS: Record<PersoonSoort, string> = {
  klant: 'Klant',
  prospect: 'Prospect',
  lead: 'Lead',
  'oud-klant': 'Oud-klant',
  partner: 'Partner',
  collega: 'Collega',
}

export const SOORT_STIJLEN: Record<PersoonSoort, string> = {
  klant: 'bg-jr-blue/10 text-jr-blue',
  prospect: 'bg-jr-orange/10 text-jr-orange',
  lead: 'bg-amber-100 text-amber-800',
  'oud-klant': 'bg-gray-100 text-gray-600',
  partner: 'bg-emerald-100 text-emerald-800',
  collega: 'bg-violet-100 text-violet-800',
}

/** De volgorde waarin de labels in een filter staan. */
export const SOORTEN: PersoonSoort[] = [
  'klant',
  'prospect',
  'lead',
  'partner',
  'collega',
  'oud-klant',
]

/** Van de status van een bedrijf naar het label dat je op de kaart ziet. */
function soortVoorStatus(status: OrganizationStatus): PersoonSoort {
  switch (status) {
    case 'client':
      return 'klant'
    case 'prospect':
      return 'prospect'
    case 'lead':
      return 'lead'
    case 'former':
      return 'oud-klant'
  }
}

/**
 * Eén persoon in het CRM, ongeacht waar hij vandaan komt.
 *
 * De velden zijn met opzet mager gehouden. Dit is een lijst waarin je zoekt;
 * het volledige profiel staat een klik verder, op de pagina van de klant, de
 * partner of de medewerker.
 */
export type CrmPersoon = {
  id: string
  soort: PersoonSoort
  naam: string
  /** Achternaam als die bekend is, anders de volledige naam. Hierop sorteren. */
  sorteernaam: string
  functie: string | null
  email: string | null
  telefoon: string | null
  /** Bij welk bedrijf, welke partner of welke afdeling hij hoort. */
  bijNaam: string
  /** Waar je heen gaat als je erop klikt. */
  href: string
  avatarImageId: string | null
  birthDay: number | null
  birthMonth: number | null
  birthYear: number | null
  /** De vaste contactpersoon bij die klant of partner. */
  isPrimary: boolean
  actief: boolean
  /** Soort partner, alleen gevuld bij een partnercontact. */
  partnerType: PartnerType | null
}

export type CrmFilter = {
  zoek?: string
  /** Leeg is alles. */
  soort?: string
}

/** Sorteersleutel: achternaam als we hem hebben, anders de hele naam. */
function sorteernaamVan(lastName: string | null, naam: string): string {
  const achter = (lastName ?? '').trim()
  return (achter === '' ? naam : achter).toLocaleLowerCase('nl-NL')
}

/**
 * Alle mensen in het CRM, op achternaam.
 *
 * Er wordt op achternaam gesorteerd en niet op de volledige naam: anders
 * staat iedereen die Van heet onder de V.
 *
 * De drie bronnen worden in de app samengevoegd en niet met een SQL-UNION.
 * Een union dwingt alle kolommen in dezelfde vorm, en dan ga je nullen
 * invullen voor velden die bij die bron helemaal niet bestaan. Drie kleine
 * queries die parallel lopen zijn hier sneller te lezen en net zo snel.
 */
export async function listCrmPersonen(filter: CrmFilter = {}): Promise<CrmPersoon[]> {
  const term = (filter.zoek ?? '').trim()
  const like = `%${term}%`

  const [klantRijen, partnerRijen, collegaRijen] = await Promise.all([
    db
      .select({ contact: contacts, org: organizations })
      .from(contacts)
      .innerJoin(organizations, eq(organizations.id, contacts.organizationId))
      .where(
        term === ''
          ? undefined
          : sql`(
              ${contacts.name} ILIKE ${like}
              OR ${contacts.email} ILIKE ${like}
              OR ${contacts.jobTitle} ILIKE ${like}
              OR ${organizations.name} ILIKE ${like}
            )`,
      ),

    db
      .select({ contact: contacts, partner: partners })
      .from(contacts)
      .innerJoin(partners, eq(partners.id, contacts.partnerId))
      .where(
        term === ''
          ? undefined
          : sql`(
              ${contacts.name} ILIKE ${like}
              OR ${contacts.email} ILIKE ${like}
              OR ${contacts.jobTitle} ILIKE ${like}
              OR ${partners.name} ILIKE ${like}
            )`,
      ),

    db
      .select()
      .from(users)
      .where(
        term === ''
          ? or(eq(users.role, 'staff'), eq(users.role, 'admin'))
          : sql`(${users.role} IN ('staff', 'admin')) AND (
              ${users.name} ILIKE ${like}
              OR ${users.email} ILIKE ${like}
              OR ${users.jobTitle} ILIKE ${like}
              OR ${users.department} ILIKE ${like}
            )`,
      ),
  ])

  const mensen: CrmPersoon[] = []

  for (const r of klantRijen) {
    mensen.push({
      id: r.contact.id,
      soort: soortVoorStatus(r.org.status),
      naam: r.contact.name,
      sorteernaam: sorteernaamVan(r.contact.lastName, r.contact.name),
      functie: r.contact.jobTitle,
      email: r.contact.email,
      telefoon: r.contact.mobile ?? r.contact.phone,
      bijNaam: r.org.name,
      href: `/beheer/klanten/${r.org.slug}`,
      avatarImageId: r.contact.avatarImageId,
      birthDay: r.contact.birthDay,
      birthMonth: r.contact.birthMonth,
      birthYear: r.contact.birthYear,
      isPrimary: r.contact.isPrimary,
      actief: r.contact.active,
      partnerType: null,
    })
  }

  for (const r of partnerRijen) {
    mensen.push({
      id: r.contact.id,
      soort: 'partner',
      naam: r.contact.name,
      sorteernaam: sorteernaamVan(r.contact.lastName, r.contact.name),
      functie: r.contact.jobTitle,
      email: r.contact.email,
      telefoon: r.contact.mobile ?? r.contact.phone,
      bijNaam: r.partner.name,
      href: `/beheer/partners#${r.partner.id}`,
      avatarImageId: r.contact.avatarImageId,
      birthDay: r.contact.birthDay,
      birthMonth: r.contact.birthMonth,
      birthYear: r.contact.birthYear,
      isPrimary: r.contact.isPrimary,
      actief: r.contact.active && r.partner.active,
      partnerType: r.partner.type,
    })
  }

  for (const u of collegaRijen) {
    const naam = (u.name ?? '').trim() === '' ? u.email : (u.name as string)
    mensen.push({
      id: u.id,
      soort: 'collega',
      naam,
      sorteernaam: sorteernaamVan(u.lastName, naam),
      functie: u.jobTitle,
      email: u.email,
      telefoon: u.mobile ?? u.phone,
      bijNaam: u.department ?? 'James Robinson',
      href: `/beheer/medewerkers/${u.id}`,
      avatarImageId: u.avatarImageId,
      birthDay: u.birthDay,
      birthMonth: u.birthMonth,
      birthYear: u.birthYear,
      isPrimary: false,
      // Uit dienst is niet weg: je wilt een oud-collega kunnen terugvinden.
      actief: u.endedOn === null || u.endedOn > new Date(),
      partnerType: null,
    })
  }

  const gefilterd =
    filter.soort && filter.soort !== ''
      ? mensen.filter((m) => m.soort === filter.soort)
      : mensen

  return gefilterd.sort(
    (a, b) => a.sorteernaam.localeCompare(b.sorteernaam, 'nl-NL') || a.naam.localeCompare(b.naam, 'nl-NL'),
  )
}

/** Hoeveel mensen er per soort zijn. Voor de tellers boven de lijst. */
export function telPerSoort(mensen: CrmPersoon[]): Record<PersoonSoort, number> {
  const telling: Record<PersoonSoort, number> = {
    klant: 0,
    prospect: 0,
    lead: 0,
    'oud-klant': 0,
    partner: 0,
    collega: 0,
  }
  for (const m of mensen) telling[m.soort] += 1
  return telling
}

/* --- Contactpersonen van een partner --------------------------------------
   Het partnerscherm heeft ze nodig, en de losse `contact_name` op de partner
   blijft staan voor wat er al in stond. Nieuwe invoer hoort hier. */

export async function listPartnerContacten(partnerId: string) {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.partnerId, partnerId))
    .orderBy(
      // De vaste contactpersoon bovenaan: die bel je.
      asc(sql`CASE WHEN ${contacts.isPrimary} THEN 0 ELSE 1 END`),
      asc(sql`COALESCE(NULLIF(${contacts.lastName}, ''), ${contacts.name})`),
    )
}

/**
 * De contactpersonen van ALLE partners, in een query.
 *
 * Bestaat omdat het partneroverzicht anders per partner een query afvuurt.
 * Bij veertig partners zijn dat veertig heen-en-weertjes naar de database.
 * Lokaal merk je dat niet — daar staat de database op dezelfde machine. Vanaf
 * een serverless functie kost elke query een netwerkronde, en veertig daarvan
 * achter elkaar is het verschil tussen een pagina die laadt en een functie die
 * in zijn tijdslimiet loopt.
 */
export async function listContactenPerPartner(): Promise<Map<string, Contact[]>> {
  const rijen = await db
    .select()
    .from(contacts)
    .where(isNotNull(contacts.partnerId))
    .orderBy(
      // De vaste contactpersoon bovenaan: die bel je.
      asc(sql`CASE WHEN ${contacts.isPrimary} THEN 0 ELSE 1 END`),
      asc(sql`COALESCE(NULLIF(${contacts.lastName}, ''), ${contacts.name})`),
    )

  const perPartner = new Map<string, Contact[]>()
  for (const rij of rijen) {
    if (!rij.partnerId) continue
    const lijst = perPartner.get(rij.partnerId) ?? []
    lijst.push(rij)
    perPartner.set(rij.partnerId, lijst)
  }
  return perPartner
}

/** Hoeveel contactpersonen elke partner heeft. Voor het partneroverzicht. */
export async function telPartnerContacten(): Promise<Map<string, number>> {
  const rijen = await db
    .select({ partnerId: contacts.partnerId, n: sql<string>`COUNT(*)` })
    .from(contacts)
    .where(isNotNull(contacts.partnerId))
    .groupBy(contacts.partnerId)

  const perPartner = new Map<string, number>()
  for (const r of rijen) {
    if (r.partnerId) perPartner.set(r.partnerId, Number(r.n))
  }
  return perPartner
}
