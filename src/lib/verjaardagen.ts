import { and, asc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { contacts, organizations } from '@/db/schema'

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
    organizationId: r.contact.organizationId,
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

/** Verjaardagen en jubilea van deze maand in één keer, voor het dashboard. */
export async function attentiesDezeMaand(nu: Date = new Date()) {
  const maand = nu.getMonth() + 1
  const [verjaardagen, jubilea] = await Promise.all([
    verjaardagenInMaand(maand, nu.getFullYear()),
    jubileaInMaand(maand, nu),
  ])

  return {
    maand,
    verjaardagen,
    jubilea,
    /** Wat er vandaag of later deze maand nog komt. */
    nogTeGaan: [
      ...verjaardagen.filter((v) => v.dag >= nu.getDate()).map(() => 1),
      ...jubilea.filter((j) => j.dag >= nu.getDate()).map(() => 1),
    ].length,
  }
}
