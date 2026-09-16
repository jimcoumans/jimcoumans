import { and, countDistinct, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, subscriptions, users, contacts, partners } from '@/db/schema'

/* -------------------------------------------------------------------------
   De cockpit: hoe groot zijn we, in aantallen.

   De bedragen staan al elders op het dashboard. Dit gaat over de andere
   vraag die je stelt als je binnenkomt: hoeveel klanten lopen er, hoeveel
   daarvan hebben een abonnement, en hoeveel mensen kennen we.

   Eén ding met opzet apart geteld: hoeveel klanten daadwerkelijk kunnen
   inloggen. Een portaal met honderd klanten erin en nul die binnenkomen is
   geen portaal, en dat cijfer moet je zien zonder ernaar te zoeken.
   ------------------------------------------------------------------------- */

export type Cockpit = {
  /** Bedrijven met een lopend abonnement. Onze vaste basis. */
  retainerKlanten: number
  /** Bedrijven met status klant, met of zonder abonnement. */
  klanten: number
  /** Klanten die op losse opdrachten werken: klant, maar geen abonnement. */
  projectKlanten: number
  /** Alles wat er in het systeem staat, ook prospects en oud-klanten. */
  bedrijven: number
  prospects: number
  leads: number
  oudKlanten: number
  /** Klanten waar minstens één persoon een account heeft. */
  klantenMetToegang: number
  /** Mensen met een klantaccount. */
  klantgebruikers: number
  /** Hoeveel van die mensen ooit hebben ingelogd. */
  klantgebruikersIngelogd: number
  /** Iedereen in het CRM: klantcontacten, partnercontacten en collega's. */
  mensenInCrm: number
  /** Collega's in dienst. */
  collegas: number
  /** Actieve partners en leveranciers. */
  actievePartners: number
}

export async function getCockpit(): Promise<Cockpit> {
  const [orgRij, retainerRij, klantMetAbonnementRij, klantRij, teamRij, crmRij, partnerRij] =
    await Promise.all([
      // Alle bedrijven, uitgesplitst naar status. Eén query in plaats van
      // vier: het is dezelfde tabel en dezelfde scan.
      db
        .select({
          totaal: sql<string>`COUNT(*)`,
          klanten: sql<string>`COUNT(*) FILTER (WHERE ${organizations.status} = 'client')`,
          prospects: sql<string>`COUNT(*) FILTER (WHERE ${organizations.status} = 'prospect')`,
          leads: sql<string>`COUNT(*) FILTER (WHERE ${organizations.status} = 'lead')`,
          oud: sql<string>`COUNT(*) FILTER (WHERE ${organizations.status} = 'former')`,
        })
        .from(organizations),

      // Bedrijven met minstens één lopend abonnement. countDistinct, want een
      // klant met drie abonnementen is nog steeds één klant.
      db
        .select({ n: countDistinct(subscriptions.organizationId) })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active')),

      // Klanten met een lopend abonnement. Apart van de regel hierboven,
      // want een prospect met een abonnement telt hier niet mee en zou het
      // aantal projectklanten anders negatief maken.
      db
        .select({ n: countDistinct(organizations.id) })
        .from(organizations)
        .innerJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
        .where(and(eq(organizations.status, 'client'), eq(subscriptions.status, 'active'))),

      // Klantaccounts: hoeveel er zijn, hoeveel er ooit binnen zijn geweest,
      // en bij hoeveel verschillende bedrijven ze horen.
      db
        .select({
          gebruikers: sql<string>`COUNT(*)`,
          ingelogd: sql<string>`COUNT(*) FILTER (WHERE ${users.lastLoginAt} IS NOT NULL)`,
          bedrijven: countDistinct(users.organizationId),
        })
        .from(users)
        .where(and(eq(users.role, 'client'), isNotNull(users.organizationId))),

      // Collega's in dienst. Uit dienst blijft in het systeem staan, maar
      // telt niet mee als "wij".
      db
        .select({ n: sql<string>`COUNT(*)` })
        .from(users)
        .where(
          and(
            sql`${users.role} IN ('staff', 'admin')`,
            sql`(${users.endedOn} IS NULL OR ${users.endedOn} > NOW())`,
          ),
        ),

      // Alle contactpersonen: klanten en partners samen, want ze staan in
      // dezelfde tabel. De collega's tellen we er hieronder bij op.
      db.select({ n: sql<string>`COUNT(*)` }).from(contacts),

      db
        .select({ n: sql<string>`COUNT(*)` })
        .from(partners)
        .where(eq(partners.active, true)),
    ])

  const klanten = Number(orgRij[0]?.klanten ?? 0)
  const klantenMetAbonnement = Number(klantMetAbonnementRij[0]?.n ?? 0)
  const collegas = Number(teamRij[0]?.n ?? 0)

  return {
    retainerKlanten: Number(retainerRij[0]?.n ?? 0),
    klanten,
    projectKlanten: klanten - klantenMetAbonnement,
    bedrijven: Number(orgRij[0]?.totaal ?? 0),
    prospects: Number(orgRij[0]?.prospects ?? 0),
    leads: Number(orgRij[0]?.leads ?? 0),
    oudKlanten: Number(orgRij[0]?.oud ?? 0),
    klantenMetToegang: Number(klantRij[0]?.bedrijven ?? 0),
    klantgebruikers: Number(klantRij[0]?.gebruikers ?? 0),
    klantgebruikersIngelogd: Number(klantRij[0]?.ingelogd ?? 0),
    mensenInCrm: Number(crmRij[0]?.n ?? 0) + collegas,
    collegas,
    actievePartners: Number(partnerRij[0]?.n ?? 0),
  }
}
