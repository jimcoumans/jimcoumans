import { and, asc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { contacts, organizations, partners, users, contactChildren } from '@/db/schema'
import { teamJubileaInMaand, teamVerjaardagenInMaand } from './team'

/* -------------------------------------------------------------------------
   Verjaardagen en jubilea.

   Dit bestaat omdat er een handeling aan vastzit: attentiewaarde. Een veld
   zonder handeling is een veld dat niemand invult.

   De dag en maand staan apart van het jaar, want lang niet iedereen deelt
   zijn geboortejaar. Een verzonnen jaartal is erger dan geen jaartal: dan
   feliciteer je straks iemand met een leeftijd die niet klopt.
   ------------------------------------------------------------------------- */

export type Verjaardag = {
  contactId: string
  naam: string
  jobTitle: string | null
  email: string | null
  mobile: string | null
  organizationId: string
  organizationName: string
  organizationSlug: string
  dag: number
  maand: number
  /** Leeftijd die deze persoon dit jaar wordt, of null als het jaar onbekend is. */
  wordt: number | null
}

export type Jubileum = {
  organizationId: string
  naam: string
  slug: string
  /** Sinds wanneer de samenwerking loopt. */
  sinds: Date
  /** Hoeveel jaar het deze maand wordt. */
  jaren: number
  dag: number
  maand: number
}

/**
 * Wie er in deze maand jarig is.
 *
 * Bewust per maand en niet per week: attenties regel je aan het begin van de
 * maand, niet op de ochtend zelf.
 */
export async function verjaardagenInMaand(
  maand: number,
  peiljaar: number = new Date().getFullYear(),
): Promise<Verjaardag[]> {
  const rijen = await db
    .select({
      contact: contacts,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(contacts)
    .innerJoin(organizations, eq(organizations.id, contacts.organizationId))
    .where(
      and(
        eq(contacts.birthMonth, maand),
        eq(contacts.active, true),
        isNotNull(contacts.birthDay),
        // Oud-klanten feliciteren is meestal niet de bedoeling.
        sql`${organizations.status} <> 'former'`,
      ),
    )
    .orderBy(asc(contacts.birthDay), asc(contacts.name))

  return rijen.map((r) => ({
    contactId: r.contact.id,
    naam: r.contact.name,
    jobTitle: r.contact.jobTitle,
    email: r.contact.email,
    mobile: r.contact.mobile ?? r.contact.phone,
    organizationId: r.organizationId,
    organizationName: r.organizationName,
    organizationSlug: r.organizationSlug,
    dag: r.contact.birthDay!,
    maand: r.contact.birthMonth!,
    wordt: r.contact.birthYear === null ? null : peiljaar - r.contact.birthYear,
  }))
}

/**
 * Welke samenwerkingen deze maand een verjaardag vieren.
 *
 * Alleen hele jaren, en niet het jaar waarin ze begonnen: "één jaar klant"
 * is een moment, "nul jaar klant" is de dag zelf.
 */
export async function jubileaInMaand(
  maand: number,
  peildatum: Date = new Date(),
): Promise<Jubileum[]> {
  const rijen = await db
    .select()
    .from(organizations)
    .where(
      and(
        isNotNull(organizations.clientSince),
        eq(organizations.status, 'client'),
        sql`EXTRACT(MONTH FROM ${organizations.clientSince}) = ${maand}`,
      ),
    )
    .orderBy(asc(organizations.name))

  return rijen
    .map((org) => {
      const sinds = new Date(org.clientSince!)
      const jaren = peildatum.getFullYear() - sinds.getFullYear()
      return {
        organizationId: org.id,
        naam: org.name,
        slug: org.slug,
        sinds,
        jaren,
        dag: sinds.getDate(),
        maand: sinds.getMonth() + 1,
      }
    })
    .filter((j) => j.jaren >= 1)
    .sort((a, b) => a.dag - b.dag)
}

/**
 * Alles wat deze maand aandacht verdient, in één keer.
 *
 * Collega's staan er bewust bij. Je eigen mensen vergeten terwijl je klanten
 * feliciteert is een slechte ruil, en twee losse overzichtjes betekent dat er
 * altijd eentje niet wordt opengeslagen.
 */
export async function attentiesDezeMaand(nu: Date = new Date()) {
  const maand = nu.getMonth() + 1
  const [verjaardagen, jubilea, teamVerjaardagen, teamJubilea] = await Promise.all([
    verjaardagenInMaand(maand, nu.getFullYear()),
    jubileaInMaand(maand, nu),
    teamVerjaardagenInMaand(maand, nu.getFullYear()),
    teamJubileaInMaand(maand, nu),
  ])

  const komtNog = (dag: number) => dag >= nu.getDate()

  return {
    maand,
    verjaardagen,
    jubilea,
    teamVerjaardagen,
    teamJubilea,
    /** Wat er vandaag of later deze maand nog komt, klanten en collega's samen. */
    nogTeGaan:
      verjaardagen.filter((v) => komtNog(v.dag)).length +
      jubilea.filter((j) => komtNog(j.dag)).length +
      teamVerjaardagen.filter((v) => komtNog(v.dag)).length +
      teamJubilea.filter((j) => komtNog(j.dag)).length,
  }
}

export type KomendeVerjaardag = {
  soort: 'contact' | 'partner' | 'collega' | 'kind'
  naam: string
  /** Waar hij werkt, of bij wie het kind hoort. */
  bij: string | null
  /** Link naar de plek waar je meer ziet. */
  href: string | null
  dag: number
  maand: number
  /** Hoeveel nachten nog. Nul is vandaag. */
  overDagen: number
  /** De leeftijd die hij wordt, of null als het jaar niet bekend is. */
  wordt: number | null
}

/**
 * Wie er binnenkort jarig is, de eerste vooraan.
 *
 * Rekent met de eerstvolgende keer dat de dag-en-maand langskomt, dus eind
 * december verschijnen de jarigen van begin januari gewoon in de lijst. Die
 * jaarwisseling is precies waar zo'n overzicht anders stilletjes leegloopt,
 * op het moment dat je er het meest aan hebt.
 */
export async function komendeVerjaardagen(
  dagenVooruit = 7,
  nu: Date = new Date(),
): Promise<KomendeVerjaardag[]> {
  const [contactRijen, partnerRijen, teamRijen, kindRijen] = await Promise.all([
    db
      .select({ contact: contacts, org: organizations })
      .from(contacts)
      .innerJoin(organizations, eq(organizations.id, contacts.organizationId))
      .where(and(isNotNull(contacts.birthDay), isNotNull(contacts.birthMonth))),

    // Ook de vaste fotograaf is jarig. Een partner die je al jaren belt is
    // net zo goed een relatie als de marketingmanager van een klant.
    db
      .select({ contact: contacts, partner: partners })
      .from(contacts)
      .innerJoin(partners, eq(partners.id, contacts.partnerId))
      .where(
        and(
          isNotNull(contacts.birthDay),
          isNotNull(contacts.birthMonth),
          eq(contacts.active, true),
          eq(partners.active, true),
        ),
      ),

    db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.birthDay),
          isNotNull(users.birthMonth),
          sql`${users.organizationId} IS NULL`,
          sql`${users.endedOn} IS NULL`,
        ),
      ),

    db
      .select({ kind: contactChildren, contact: contacts })
      .from(contactChildren)
      .innerJoin(contacts, eq(contacts.id, contactChildren.contactId))
      .where(and(isNotNull(contactChildren.birthDay), isNotNull(contactChildren.birthMonth))),
  ])

  const alles: KomendeVerjaardag[] = [
    ...contactRijen.map((r) => ({
      soort: 'contact' as const,
      naam: r.contact.name,
      bij: r.org.name,
      href: `/beheer/klanten/${r.org.slug}`,
      dag: r.contact.birthDay!,
      maand: r.contact.birthMonth!,
      jaar: r.contact.birthYear,
    })),
    ...partnerRijen.map((r) => ({
      soort: 'partner' as const,
      naam: r.contact.name,
      bij: r.partner.name,
      href: `/beheer/partners#${r.partner.id}`,
      dag: r.contact.birthDay!,
      maand: r.contact.birthMonth!,
      jaar: r.contact.birthYear,
    })),
    ...teamRijen.map((u) => ({
      soort: 'collega' as const,
      naam: u.name ?? u.email,
      bij: u.jobTitle,
      href: `/beheer/medewerkers/${u.id}`,
      dag: u.birthDay!,
      maand: u.birthMonth!,
      jaar: u.birthYear,
    })),
    ...kindRijen.map((r) => ({
      soort: 'kind' as const,
      naam: r.kind.name,
      bij: `kind van ${r.contact.name}`,
      href: null,
      dag: r.kind.birthDay!,
      maand: r.kind.birthMonth!,
      jaar: r.kind.birthYear,
    })),
  ].map((v) => {
    const { overDagen, jaarVanVieren } = tellAf(v.dag, v.maand, nu)
    return {
      soort: v.soort,
      naam: v.naam,
      bij: v.bij,
      href: v.href,
      dag: v.dag,
      maand: v.maand,
      overDagen,
      wordt: v.jaar === null ? null : jaarVanVieren - v.jaar,
    }
  })

  return alles
    .filter((v) => v.overDagen <= dagenVooruit)
    .sort((a, b) => a.overDagen - b.overDagen || a.naam.localeCompare(b.naam, 'nl'))
}

/**
 * Hoeveel nachten tot de eerstvolgende keer dat deze dag langskomt.
 *
 * Valt de verjaardag dit jaar al achter ons, dan telt hij door naar volgend
 * jaar — anders mist een overzicht van "deze week" alles rond oud en nieuw.
 *
 * 29 februari in een gewoon jaar wordt 1 maart. Dat is een keuze: liever een
 * dag te vroeg feliciteren dan drie jaar overslaan.
 */
function tellAf(dag: number, maand: number, nu: Date): { overDagen: number; jaarVanVieren: number } {
  const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())

  const maak = (jaar: number) => {
    const d = new Date(jaar, maand - 1, dag)
    // Een datum die niet bestaat rolt door naar de volgende maand; dat is
    // precies het gedrag dat we willen voor 29 februari.
    return d
  }

  let volgende = maak(vandaag.getFullYear())
  let jaarVanVieren = vandaag.getFullYear()
  if (volgende < vandaag) {
    jaarVanVieren += 1
    volgende = maak(jaarVanVieren)
  }

  return {
    overDagen: Math.round((volgende.getTime() - vandaag.getTime()) / 86_400_000),
    jaarVanVieren,
  }
}
