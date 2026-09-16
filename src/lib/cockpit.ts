import { sql } from 'drizzle-orm'
import { db } from '@/db'

/* -------------------------------------------------------------------------
   De cockpit: hoe groot zijn we, in aantallen.

   De bedragen staan al elders op het dashboard. Dit gaat over de andere
   vraag die je stelt als je binnenkomt: hoeveel klanten lopen er, hoeveel
   daarvan hebben een abonnement, en hoeveel mensen kennen we.

   Eén ding met opzet apart geteld: hoeveel klanten daadwerkelijk kunnen
   inloggen. Een portaal met honderd klanten erin en nul die binnenkomen is
   geen portaal, en dat cijfer moet je zien zonder ernaar te zoeken.

   ALLES IN ÉÉN QUERY. Dat is hier geen optimalisatie vooraf maar een
   reparatie achteraf. De eerste versie vuurde zeven tellingen naast elkaar
   af met Promise.all. Op een lokale database kost dat niets — die staat op
   dezelfde machine en een telling op dertig rijen is een fractie van een
   milliseconde. Vanaf een serverless functie is elke query een netwerkronde
   naar Supabase, en zeven tegelijk lopen daar vast: deze functie deed er
   live meer dan vier seconden over terwijl hij lokaal vierentwintig
   milliseconde kostte, en nam de hele pagina mee in een 502.

   Het zijn allemaal tellingen op kleine tabellen zonder onderling verband.
   Die passen prima als subquery in één SELECT: één ronde in plaats van
   zeven, en de database rekent ze net zo snel uit.
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

/** Wat de database teruggeeft; alles komt binnen als tekst of getal. */
type Rij = Record<string, string | number | null>

const getal = (rij: Rij | undefined, sleutel: string): number => Number(rij?.[sleutel] ?? 0)

export async function getCockpit(): Promise<Cockpit> {
  const rijen = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM organizations) AS bedrijven,
      (SELECT COUNT(*) FROM organizations WHERE status = 'client') AS klanten,
      (SELECT COUNT(*) FROM organizations WHERE status = 'prospect') AS prospects,
      (SELECT COUNT(*) FROM organizations WHERE status = 'lead') AS leads,
      (SELECT COUNT(*) FROM organizations WHERE status = 'former') AS oud,

      -- Een klant met drie abonnementen is nog steeds een klant, vandaar
      -- DISTINCT.
      (SELECT COUNT(DISTINCT organization_id) FROM subscriptions
        WHERE status = 'active') AS retainers,

      -- Apart van de regel hierboven: een prospect met een abonnement telt
      -- hier niet mee, anders wordt het aantal projectklanten negatief.
      (SELECT COUNT(DISTINCT o.id) FROM organizations o
        JOIN subscriptions s ON s.organization_id = o.id
        WHERE o.status = 'client' AND s.status = 'active') AS klant_met_abo,

      (SELECT COUNT(*) FROM users
        WHERE role = 'client' AND organization_id IS NOT NULL) AS klantgebruikers,
      (SELECT COUNT(*) FROM users
        WHERE role = 'client' AND organization_id IS NOT NULL
          AND last_login_at IS NOT NULL) AS ingelogd,
      (SELECT COUNT(DISTINCT organization_id) FROM users
        WHERE role = 'client' AND organization_id IS NOT NULL) AS met_toegang,

      -- Uit dienst blijft in het systeem staan, maar telt niet mee als "wij".
      (SELECT COUNT(*) FROM users
        WHERE role IN ('staff', 'admin')
          AND (ended_on IS NULL OR ended_on > NOW())) AS collegas,

      -- Klant- en partnercontacten staan in dezelfde tabel.
      (SELECT COUNT(*) FROM contacts) AS contacten,

      (SELECT COUNT(*) FROM partners WHERE active) AS partners
  `)

  const rij = (rijen as unknown as Rij[])[0]

  const klanten = getal(rij, 'klanten')
  const collegas = getal(rij, 'collegas')

  return {
    retainerKlanten: getal(rij, 'retainers'),
    klanten,
    projectKlanten: klanten - getal(rij, 'klant_met_abo'),
    bedrijven: getal(rij, 'bedrijven'),
    prospects: getal(rij, 'prospects'),
    leads: getal(rij, 'leads'),
    oudKlanten: getal(rij, 'oud'),
    klantenMetToegang: getal(rij, 'met_toegang'),
    klantgebruikers: getal(rij, 'klantgebruikers'),
    klantgebruikersIngelogd: getal(rij, 'ingelogd'),
    mensenInCrm: getal(rij, 'contacten') + collegas,
    collegas,
    actievePartners: getal(rij, 'partners'),
  }
}
