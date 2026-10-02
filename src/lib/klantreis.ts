import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { clientJourneyItems, users } from '@/db/schema'

/* -------------------------------------------------------------------------
   De klantreis: acht stappen in drie fasen, zoals in de James Robinson-gids.

   Per stap de mijlpalen uit "klaar als", elk met het document dat erbij
   hoort. Ze staan hier in de code en niet in de database, omdat ze voor
   elke klant hetzelfde zijn; per klant bewaren we alleen wat er af is.
   Verandert de gids, dan verandert dit bestand mee.

   De sleutels (key) zijn vast. Een tekst mag je herschrijven; een sleutel
   wijzigen maakt bestaande vinkjes wees.
   ------------------------------------------------------------------------- */

export type Mijlpaal = { key: string; label: string; document?: string }
export type Stap = {
  nr: string
  fase: 'Verkopen' | 'Starten' | 'Samenwerken'
  titel: string
  klaarAls: string
  mijlpalen: Mijlpaal[]
}

export const KLANTREIS: Stap[] = [
  {
    nr: '01',
    fase: 'Verkopen',
    titel: 'Van aanvraag tot afspraak',
    klaarAls: 'Het intakegesprek is geboekt, minstens drie werkdagen vooruit.',
    mijlpalen: [
      { key: '01.vragenlijst', label: 'Vragenlijst op de website ingevuld', document: '01.1' },
      { key: '01.beoordeeld', label: 'Beoordeeld: groen, oranje, later of rood', document: '01.2' },
      { key: '01.geboekt', label: 'Intakegesprek geboekt' },
    ],
  },
  {
    nr: '02',
    fase: 'Verkopen',
    titel: 'De quickscan',
    klaarAls: 'De scan is compleet en het advies vrijgegeven, uiterlijk een werkdag voor het intakegesprek.',
    mijlpalen: [
      { key: '02.scan', label: 'Quickscan ingevuld', document: '02.1' },
      { key: '02.rapport', label: 'Scanrapport vrijgegeven', document: '02.2' },
    ],
  },
  {
    nr: '03',
    fase: 'Verkopen',
    titel: 'Het intakegesprek',
    klaarAls: 'De klantkaart is ingevuld, de mail van dezelfde dag is weg en het voorstelgesprek staat in de agenda.',
    mijlpalen: [
      { key: '03.voorbereid', label: 'Voorbereid', document: '03.3' },
      { key: '03.gevoerd', label: 'Gesprek gevoerd, vragenlijst ingevuld', document: '03.2' },
      { key: '03.mail', label: 'Mail van dezelfde dag verstuurd', document: '03.4' },
      { key: '03.voorstelgesprek', label: 'Voorstelgesprek in de agenda' },
    ],
  },
  {
    nr: '04',
    fase: 'Verkopen',
    titel: 'Voorstel en voorstelgesprek',
    klaarAls: 'Akkoord en de offerte staat klaar om te tekenen, of een concrete datum, of een nee met de reden.',
    mijlpalen: [
      { key: '04.rekensom', label: 'Rekensom gemaakt', document: '04.1' },
      { key: '04.voorstel', label: 'Voorstel vrijgegeven', document: '04.2' },
      { key: '04.gesprek', label: 'Voorstelgesprek gevoerd', document: '04.3' },
      { key: '04.akkoord', label: 'Akkoord van de klant' },
    ],
  },
  {
    nr: '05',
    fase: 'Starten',
    titel: 'Tekenen en betalen',
    klaarAls: 'Getekend, machtiging gegeven, factuur fundament verstuurd, klantkaart op “klant”.',
    mijlpalen: [
      { key: '05.getekend', label: 'Offerte getekend', document: '05.1' },
      { key: '05.machtiging', label: 'Machtiging gegeven' },
      { key: '05.factuur', label: 'Factuur fundament verstuurd' },
    ],
  },
  {
    nr: '06',
    fase: 'Starten',
    titel: 'De onboarding',
    klaarAls: 'Formulier binnen, alle toegangen er, en de datums van het fundament zijn gemaild.',
    mijlpalen: [
      { key: '06.kickoff', label: 'Kick-offmail binnen een uur verstuurd', document: '06.1' },
      { key: '06.formulier', label: 'Onboardingformulier binnen', document: '06.2' },
      { key: '06.toegangen', label: 'Alle toegangen er', document: '06.3' },
      { key: '06.datums', label: 'Datums van het fundament gemaild' },
    ],
  },
  {
    nr: '07',
    fase: 'Starten',
    titel: 'Het fundament',
    klaarAls: 'De campagne staat live, de testaanvraag is in het dashboard aangekomen, en de eerste week is dagelijks gecontroleerd.',
    mijlpalen: [
      { key: '07.gestart', label: 'Fundament gestart (dag 1)', document: '07.1' },
      { key: '07.draaidag', label: 'Draaidag geweest', document: '07.2' },
      { key: '07.merkkluis', label: 'Merkkluis gevuld (logo’s, kleuren, lettertypen, toon, beelden)' },
      { key: '07.merkcheck', label: 'Merkcheck akkoord', document: '07.3' },
      { key: '07.live', label: 'Campagne live (dag 19)', document: '08.1' },
      { key: '07.testaanvraag', label: 'Testaanvraag in het dashboard' },
      { key: '07.eersteweek', label: 'Eerste week dagelijks gecontroleerd' },
    ],
  },
  {
    nr: '08',
    fase: 'Samenwerken',
    titel: 'Live en het maandritme',
    klaarAls: 'Nooit klaar: elke maand een update, en elk kwartaal is duidelijk of we op de doelregel zitten.',
    mijlpalen: [
      { key: '08.livebericht', label: 'Live-bericht verstuurd', document: '08.2' },
      { key: '08.dagmail', label: 'Monitoring en dagmail aan', document: '08.8' },
      { key: '08.100dagen', label: '100-dagenreview gehouden', document: '08.6' },
      { key: '08.jaargesprek', label: 'Jaargesprek gehouden', document: '08.7' },
    ],
  },
]

export const ALLE_SLEUTELS = new Set(KLANTREIS.flatMap((s) => s.mijlpalen.map((m) => m.key)))

/**
 * De stap waar de klant nu staat: de eerste stap met een open mijlpaal.
 * Is alles af, dan staat de klant in 08, want samenwerken is nooit klaar.
 * Rekent alleen met de sleutels; geen database, zodat het te testen is.
 */
export function huidigeStap(gedaan: Set<string>): Stap {
  for (const stap of KLANTREIS.slice(0, -1)) {
    if (stap.mijlpalen.some((m) => !gedaan.has(m.key))) return stap
  }
  return KLANTREIS[KLANTREIS.length - 1]!
}

export type KlantreisStand = {
  stappen: (Omit<Stap, 'mijlpalen'> & {
    mijlpalen: (Mijlpaal & { gedaanOp: Date | null; door: string | null })[]
    klaar: boolean
  })[]
  huidig: Stap
  gedaan: number
  totaal: number
}

export async function getKlantreis(organizationId: string): Promise<KlantreisStand> {
  const rijen = await db
    .select({ key: clientJourneyItems.itemKey, doneAt: clientJourneyItems.doneAt, door: users.name })
    .from(clientJourneyItems)
    .leftJoin(users, eq(users.id, clientJourneyItems.doneByUserId))
    .where(eq(clientJourneyItems.organizationId, organizationId))
  const perSleutel = new Map(rijen.map((r) => [r.key, r]))
  const gedaan = new Set(rijen.map((r) => r.key).filter((k) => ALLE_SLEUTELS.has(k)))
  return {
    stappen: KLANTREIS.map((s) => {
      const mijlpalen = s.mijlpalen.map((m) => ({
        ...m,
        gedaanOp: perSleutel.get(m.key)?.doneAt ?? null,
        door: perSleutel.get(m.key)?.door ?? null,
      }))
      return { ...s, mijlpalen, klaar: mijlpalen.every((m) => m.gedaanOp !== null) }
    }),
    huidig: huidigeStap(gedaan),
    gedaan: gedaan.size,
    totaal: ALLE_SLEUTELS.size,
  }
}

/** De huidige stap per klant, voor het klantenoverzicht. */
export async function getHuidigeStappen(organizationIds: string[]): Promise<Map<string, Stap>> {
  const resultaat = new Map<string, Stap>()
  if (organizationIds.length === 0) return resultaat
  const rijen = await db
    .select({ org: clientJourneyItems.organizationId, key: clientJourneyItems.itemKey })
    .from(clientJourneyItems)
    .where(inArray(clientJourneyItems.organizationId, organizationIds))
  const perOrg = new Map<string, Set<string>>()
  for (const r of rijen) {
    if (!perOrg.has(r.org)) perOrg.set(r.org, new Set())
    perOrg.get(r.org)!.add(r.key)
  }
  for (const id of organizationIds) resultaat.set(id, huidigeStap(perOrg.get(id) ?? new Set()))
  return resultaat
}

export class KlantreisError extends Error {}

/** Een mijlpaal afvinken of weer openzetten. */
export async function zetMijlpaal(organizationId: string, key: string, gedaan: boolean, userId: string): Promise<void> {
  if (!ALLE_SLEUTELS.has(key)) throw new KlantreisError('Deze mijlpaal bestaat niet.')
  if (gedaan) {
    await db.insert(clientJourneyItems).values({ organizationId, itemKey: key, doneByUserId: userId }).onConflictDoNothing()
  } else {
    await db
      .delete(clientJourneyItems)
      .where(and(eq(clientJourneyItems.organizationId, organizationId), eq(clientJourneyItems.itemKey, key)))
  }
}

/**
 * Alle mijlpalen tot en met een stap afvinken. Voor een stap die buiten het
 * portaal om al gedaan is, en voor bestaande klanten die al lang meedraaien.
 */
export async function rondAfTotEnMet(organizationId: string, nr: string, userId: string): Promise<void> {
  const index = KLANTREIS.findIndex((s) => s.nr === nr)
  if (index === -1) throw new KlantreisError('Deze stap bestaat niet.')
  const sleutels = KLANTREIS.slice(0, index + 1).flatMap((s) => s.mijlpalen.map((m) => m.key))
  await db
    .insert(clientJourneyItems)
    .values(sleutels.map((itemKey) => ({ organizationId, itemKey, doneByUserId: userId })))
    .onConflictDoNothing()
}
