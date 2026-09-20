import { and, asc, count, desc, eq, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { candidates, vacancies, users } from '@/db/schema'
import type { Candidate, Vacancy } from '@/db/schema'
import { volledigeNaam } from './namen'

/* -------------------------------------------------------------------------
   Werving.

   Wat dit anders doet dan een sollicitantenvolgsysteem dat je kunt kopen:
   bovenaan staat niet de trechter maar de STILTE. Wie wacht er al dagen op
   een antwoord van ons.

   Dat is geen weergavekeuze. De meest gehoorde klacht van sollicitanten is
   niet dat ze zijn afgewezen maar dat ze niets hoorden, en voor een bureau
   dat zijn eigen marketing als visitekaartje ziet is dat het duurste wat er
   is. Bij tien man en twee vacatures is het hele proces eigenlijk een
   belofte: binnen een dag reageren. Software kan dat niet doen, maar hij kan
   wel zichtbaar maken wanneer het niet gebeurt.

   Daarnaast de bewaartermijn. Sollicitatiegegevens mogen vier weken na
   afloop van de procedure bewaard worden, of een jaar met expliciete
   toestemming. Dat staat hier als datum en er is een taak die er ook echt
   naar kijkt: een bewaarregel die niemand uitvoert is erger dan geen regel,
   want dan heb je vastgelegd dat je het wist.
   ------------------------------------------------------------------------- */

export class WervingError extends Error {}

/** Vier weken na afloop van de procedure. De norm zonder toestemming. */
export const BEWAARDAGEN_STANDAARD = 28
/** Een jaar, met expliciete toestemming van de kandidaat. */
export const BEWAARDAGEN_MET_TOESTEMMING = 365

/** Na hoeveel dagen zonder antwoord een kandidaat in de achterstand komt. */
export const STILTE_DAGEN = 3

export const VACATURE_SOORT_LABELS = {
  dienstverband: 'Dienstverband',
  stage: 'Stage',
  freelance: 'Freelance',
} as const

export const VACATURE_STATUS_LABELS = {
  concept: 'Concept',
  open: 'Open',
  gepauzeerd: 'Gepauzeerd',
  vervuld: 'Vervuld',
  ingetrokken: 'Ingetrokken',
} as const

export const KANDIDAAT_STATUS_LABELS = {
  nieuw: 'Nieuw',
  in_gesprek: 'In gesprek',
  tweede_gesprek: 'Tweede gesprek',
  aanbod: 'Aanbod',
  aangenomen: 'Aangenomen',
  afgewezen: 'Afgewezen',
  afgehaakt: 'Afgehaakt',
} as const

export const BRON_LABELS = {
  website: 'Website',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  school: 'Via school',
  doorverwijzing: 'Doorverwijzing',
  zelf_benaderd: 'Zelf benaderd',
  open_sollicitatie: 'Open sollicitatie',
  anders: 'Anders',
} as const

/** De statussen waarbij de procedure loopt. */
export const LOPENDE_STATUSSEN = [
  'nieuw',
  'in_gesprek',
  'tweede_gesprek',
  'aanbod',
] as const

/** De statussen waarbij de procedure voorbij is. */
export const AFGESLOTEN_STATUSSEN = ['aangenomen', 'afgewezen', 'afgehaakt'] as const

export type KandidaatStatus = keyof typeof KANDIDAAT_STATUS_LABELS

function isAfgesloten(status: string): boolean {
  return (AFGESLOTEN_STATUSSEN as readonly string[]).includes(status)
}

/* --- Rekenen -------------------------------------------------------------- */

const DAG_MS = 24 * 60 * 60 * 1000

/** Hele dagen tussen twee momenten, naar beneden afgerond. */
export function dagenTussen(van: Date, tot: Date): number {
  return Math.floor((tot.getTime() - van.getTime()) / DAG_MS)
}

/**
 * Tot wanneer we een kandidaat mogen bewaren.
 *
 * Losse functie zodat de termijn op een plek staat en te testen is zonder
 * database. Loopt de procedure nog, dan is er een lopend belang en telt de
 * klok niet - dan is het antwoord null.
 */
export function bewaarTot(afgeslotenOp: Date | null, toestemmingOp: Date | null): Date | null {
  if (afgeslotenOp === null) return null
  const dagen =
    toestemmingOp === null ? BEWAARDAGEN_STANDAARD : BEWAARDAGEN_MET_TOESTEMMING
  return new Date(afgeslotenOp.getTime() + dagen * DAG_MS)
}

/* --- Wat je op een kaart wilt zien --------------------------------------- */

export type KandidaatKaart = {
  kandidaat: Candidate
  vacatureTitel: string | null
  vacatureId: string | null
  doorverwezenDoor: string | null
  /** Hoeveel dagen geleden gesolliciteerd. */
  dagenGeleden: number
  /**
   * Hoeveel dagen deze kandidaat op een eerste antwoord wacht, of null als
   * er al geantwoord is. Dit is het getal waar het om draait.
   */
  wachtDagen: number | null
  /** Geen volgende actie afgesproken, of de datum is voorbij. */
  looptAchter: boolean
  /** Tot wanneer we hem mogen bewaren, en of dat bijna om is. */
  bewaarTot: Date | null
  bewaarDagenResterend: number | null
}

function maakKaart(
  rij: {
    kandidaat: Candidate
    vacatureTitel: string | null
    vacatureId: string | null
    doorverwezenDoor: string | null
  },
  nu: Date,
): KandidaatKaart {
  const k = rij.kandidaat
  const lopend = !isAfgesloten(k.status)

  return {
    ...rij,
    dagenGeleden: dagenTussen(k.appliedOn, nu),
    // Alleen zolang de procedure loopt is stilte een probleem. Is hij
    // afgewezen, dan is er geen antwoord meer nodig.
    wachtDagen: k.respondedOn === null && lopend ? dagenTussen(k.appliedOn, nu) : null,
    looptAchter:
      lopend && (k.nextActionOn === null || k.nextActionOn.getTime() < nu.getTime()),
    bewaarTot: k.retentionUntil,
    bewaarDagenResterend:
      k.retentionUntil === null ? null : dagenTussen(nu, k.retentionUntil),
  }
}

/* --- Ophalen -------------------------------------------------------------- */

/**
 * Kandidaten met alles erbij wat je op een kaart wilt zien.
 *
 * Een query met joins, niet een query per kandidaat. Vanaf een serverless
 * functie is elke query een netwerkronde; het partneroverzicht deed dat ooit
 * per rij en lag er bij drieenveertig partners uit.
 */
export async function listKandidaten(
  filter: { vacatureId?: string; status?: 'lopend' | 'afgesloten' | 'alles' } = {},
  nu: Date = new Date(),
): Promise<KandidaatKaart[]> {
  const waar = []
  if (filter.vacatureId) waar.push(eq(candidates.vacancyId, filter.vacatureId))

  const status = filter.status ?? 'lopend'
  if (status === 'lopend') {
    waar.push(inArray(candidates.status, [...LOPENDE_STATUSSEN]))
  } else if (status === 'afgesloten') {
    waar.push(inArray(candidates.status, [...AFGESLOTEN_STATUSSEN]))
  }

  const rijen = await db
    .select({
      kandidaat: candidates,
      vacatureTitel: vacancies.title,
      vacatureId: vacancies.id,
      doorverwezenDoor: users.name,
    })
    .from(candidates)
    .leftJoin(vacancies, eq(candidates.vacancyId, vacancies.id))
    .leftJoin(users, eq(candidates.referredByUserId, users.id))
    .where(waar.length > 0 ? and(...waar) : undefined)
    .orderBy(asc(candidates.appliedOn))

  return rijen.map((r) => maakKaart(r, nu))
}

export type VacatureRegel = {
  vacature: Vacancy
  eigenaar: string | null
  /** Hoeveel kandidaten er nog in de procedure zitten. */
  lopend: number
  /** Hoeveel er zijn aangenomen. Tegen positions afgezet is dat de voortgang. */
  aangenomen: number
  /** Hoeveel er op een eerste antwoord wachten. */
  wachten: number
}

/**
 * De vacatures met hun aantallen.
 *
 * Twee queries: de vacatures en een telling per vacature. Niet een telling
 * per vacature apart, want dan staan er bij tien vacatures elf netwerkrondes.
 */
export async function listVacatures(
  filter: { open?: boolean } = {},
  nu: Date = new Date(),
): Promise<VacatureRegel[]> {
  const rijen = await db
    .select({ vacature: vacancies, eigenaar: users.name })
    .from(vacancies)
    .leftJoin(users, eq(vacancies.ownerUserId, users.id))
    .where(
      filter.open === true
        ? inArray(vacancies.status, ['open', 'gepauzeerd'])
        : undefined,
    )
    .orderBy(desc(vacancies.status), asc(vacancies.title))

  if (rijen.length === 0) return []

  /* De grens als ISO-tekst met een expliciete cast, en niet als Date.
     Een Date in een ruwe SQL-template wordt gebonden als "Thu Sep 17 2026
     16:05:47 GMT+0000", en dat kan Postgres niet met een timestamptz
     vergelijken. Dit is in dit project nu vier keer misgegaan. Buiten een
     ruwe template gebruik je de getypeerde operatoren (lt, lte); daarbinnen
     altijd toISOString() met ::timestamptz erachter. */
  const grens = new Date(nu.getTime() - STILTE_DAGEN * DAG_MS).toISOString()

  const tellingen = await db
    .select({
      vacancyId: candidates.vacancyId,
      lopend: sql<string>`COUNT(*) FILTER (WHERE ${candidates.status} IN ('nieuw', 'in_gesprek', 'tweede_gesprek', 'aanbod'))`,
      aangenomen: sql<string>`COUNT(*) FILTER (WHERE ${candidates.status} = 'aangenomen')`,
      wachten: sql<string>`COUNT(*) FILTER (WHERE ${candidates.respondedOn} IS NULL AND ${candidates.status} IN ('nieuw', 'in_gesprek', 'tweede_gesprek', 'aanbod') AND ${candidates.appliedOn} < ${grens}::timestamptz)`,
    })
    .from(candidates)
    .groupBy(candidates.vacancyId)

  const per = new Map(tellingen.map((t) => [t.vacancyId, t]))

  return rijen.map((r) => {
    const t = per.get(r.vacature.id)
    return {
      vacature: r.vacature,
      eigenaar: r.eigenaar,
      lopend: Number(t?.lopend ?? 0),
      aangenomen: Number(t?.aangenomen ?? 0),
      wachten: Number(t?.wachten ?? 0),
    }
  })
}

/** Eén vacature met haar kandidaten. */
export async function getVacature(
  id: string,
  nu: Date = new Date(),
): Promise<{ vacature: Vacancy; eigenaar: string | null; kandidaten: KandidaatKaart[] } | null> {
  const [rij] = await db
    .select({ vacature: vacancies, eigenaar: users.name })
    .from(vacancies)
    .leftJoin(users, eq(vacancies.ownerUserId, users.id))
    .where(eq(vacancies.id, id))
    .limit(1)

  if (!rij) return null

  const kandidaten = await listKandidaten({ vacatureId: id, status: 'alles' }, nu)
  return { vacature: rij.vacature, eigenaar: rij.eigenaar, kandidaten }
}

/* --- De achterstand ------------------------------------------------------- */

export type Achterstand = {
  /** Wachten langer dan STILTE_DAGEN op een eerste antwoord. */
  wachtenOpAntwoord: KandidaatKaart[]
  /** Lopen zonder afgesproken vervolgstap, of de datum is voorbij. */
  zonderVervolg: KandidaatKaart[]
  /** Hun bewaartermijn loopt binnen een week af. */
  bijnaTeWissen: KandidaatKaart[]
}

/**
 * Wat er achterloopt, in één query.
 *
 * Drie lijsten uit dezelfde set kandidaten: er is geen reden om drie keer
 * naar Frankfurt te gaan voor gegevens die uit dezelfde tabel komen.
 */
export async function getAchterstand(nu: Date = new Date()): Promise<Achterstand> {
  const alle = await listKandidaten({ status: 'alles' }, nu)

  return {
    wachtenOpAntwoord: alle
      .filter((k) => k.wachtDagen !== null && k.wachtDagen >= STILTE_DAGEN)
      .sort((a, b) => (b.wachtDagen ?? 0) - (a.wachtDagen ?? 0)),
    zonderVervolg: alle
      .filter((k) => k.looptAchter && !(k.wachtDagen !== null && k.wachtDagen >= STILTE_DAGEN))
      .sort((a, b) => b.dagenGeleden - a.dagenGeleden),
    bijnaTeWissen: alle
      .filter(
        (k) => k.bewaarDagenResterend !== null && k.bewaarDagenResterend <= 7,
      )
      .sort((a, b) => (a.bewaarDagenResterend ?? 0) - (b.bewaarDagenResterend ?? 0)),
  }
}

/** Alleen het aantal, voor het dashboard. Eén query. */
export async function telAchterstandWerving(nu: Date = new Date()): Promise<number> {
  const grens = new Date(nu.getTime() - STILTE_DAGEN * DAG_MS)

  const [rij] = await db
    .select({ aantal: count() })
    .from(candidates)
    .where(
      and(
        inArray(candidates.status, [...LOPENDE_STATUSSEN]),
        or(
          // Wacht te lang op een eerste antwoord.
          and(isNull(candidates.respondedOn), lt(candidates.appliedOn, grens)),
          // Of er is geen vervolgstap, of die is verlopen. Let op: lt() en
          // geen ruwe SQL-template. Een Date in een template komt als tekst
          // binnen en die kan Postgres niet met een timestamptz vergelijken;
          // dat is in dit project al drie keer misgegaan.
          isNull(candidates.nextActionOn),
          lt(candidates.nextActionOn, nu),
        ),
      ),
    )

  return rij?.aantal ?? 0
}

/* --- Wijzigen ------------------------------------------------------------- */

export type NieuweVacature = {
  title: string
  kind?: 'dienstverband' | 'stage' | 'freelance'
  positions?: number
  ownerUserId?: string | null
  salaryScaleName?: string | null
  salaryStepMin?: number | null
  salaryStepMax?: number | null
  hoursPerWeekQuarters?: number | null
  reason?: string | null
  description?: string | null
  /** Direct openzetten in plaats van als concept. */
  meteenOpen?: boolean
}

export async function maakVacature(input: NieuweVacature): Promise<Vacancy> {
  if (input.title.trim() === '') {
    throw new WervingError('Geef de vacature een titel, bijvoorbeeld Marketing Manager.')
  }

  const [vacature] = await db
    .insert(vacancies)
    .values({
      title: input.title.trim(),
      kind: input.kind ?? 'dienstverband',
      status: input.meteenOpen ? 'open' : 'concept',
      openedOn: input.meteenOpen ? new Date() : null,
      positions: input.positions ?? 1,
      ownerUserId: input.ownerUserId ?? null,
      salaryScaleName: input.salaryScaleName?.trim() || null,
      salaryStepMin: input.salaryStepMin ?? null,
      salaryStepMax: input.salaryStepMax ?? null,
      hoursPerWeekQuarters: input.hoursPerWeekQuarters ?? null,
      reason: input.reason?.trim() || null,
      description: input.description?.trim() || null,
    })
    .returning()

  if (!vacature) throw new WervingError('De vacature kon niet worden opgeslagen.')
  return vacature
}

/** De status van een vacature wijzigen, met de datums die daarbij horen. */
export async function zetVacatureStatus(
  id: string,
  status: 'concept' | 'open' | 'gepauzeerd' | 'vervuld' | 'ingetrokken',
  nu: Date = new Date(),
): Promise<void> {
  const [huidig] = await db
    .select({ openedOn: vacancies.openedOn })
    .from(vacancies)
    .where(eq(vacancies.id, id))
    .limit(1)

  if (!huidig) throw new WervingError('Deze vacature bestaat niet meer.')

  const dicht = status === 'vervuld' || status === 'ingetrokken'

  await db
    .update(vacancies)
    .set({
      status,
      // Openzetten legt de openingsdatum vast, als die er nog niet was.
      openedOn: status === 'open' && huidig.openedOn === null ? nu : huidig.openedOn,
      closedOn: dicht ? nu : null,
      updatedAt: nu,
    })
    .where(eq(vacancies.id, id))
}

export type NieuweKandidaat = {
  name?: string
  firstName?: string | null
  infix?: string | null
  lastName?: string | null
  vacancyId?: string | null
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  source?: keyof typeof BRON_LABELS
  referredByUserId?: string | null
  school?: string | null
  study?: string | null
  appliedOn?: Date
  notes?: string | null
  nextAction?: string | null
  nextActionOn?: Date | null
}

export async function maakKandidaat(input: NieuweKandidaat): Promise<Candidate> {
  const naam =
    input.name?.trim() ||
    volledigeNaam({
      firstName: input.firstName ?? null,
      infix: input.infix ?? null,
      lastName: input.lastName ?? null,
    })

  if (!naam || naam.trim() === '') {
    throw new WervingError('Geef de kandidaat een naam.')
  }

  controleerVervolgstap(input.nextAction ?? null, input.nextActionOn ?? null)

  const [kandidaat] = await db
    .insert(candidates)
    .values({
      vacancyId: input.vacancyId || null,
      name: naam.trim(),
      firstName: input.firstName?.trim() || null,
      infix: input.infix?.trim() || null,
      lastName: input.lastName?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      linkedinUrl: input.linkedinUrl?.trim() || null,
      source: input.source ?? 'website',
      referredByUserId: input.referredByUserId || null,
      school: input.school?.trim() || null,
      study: input.study?.trim() || null,
      appliedOn: input.appliedOn ?? new Date(),
      notes: input.notes?.trim() || null,
      nextAction: input.nextAction?.trim() || null,
      nextActionOn: input.nextActionOn ?? null,
    })
    .returning()

  if (!kandidaat) throw new WervingError('De kandidaat kon niet worden opgeslagen.')
  return kandidaat
}

function controleerVervolgstap(actie: string | null, opDatum: Date | null): void {
  const schoon = (actie ?? '').trim()
  if ((schoon === '') !== (opDatum === null)) {
    throw new WervingError(
      'Een vervolgstap heeft een omschrijving en een datum. Vul ze allebei in, of laat ze allebei leeg.',
    )
  }
}

/** De vervolgstap vastleggen of weghalen. */
export async function zetVervolgstap(
  kandidaatId: string,
  actie: string | null,
  opDatum: Date | null,
): Promise<void> {
  controleerVervolgstap(actie, opDatum)

  const [bij] = await db
    .update(candidates)
    .set({
      nextAction: actie?.trim() || null,
      nextActionOn: opDatum,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, kandidaatId))
    .returning({ id: candidates.id })

  if (!bij) throw new WervingError('Deze kandidaat bestaat niet meer.')
}

/**
 * Vastleggen dat er geantwoord is.
 *
 * Dit is het knopje dat de stilte stopt. Het zegt niets over wat er is
 * geantwoord - alleen dat de kandidaat niet meer in het ongewisse zit.
 */
export async function markeerBeantwoord(
  kandidaatId: string,
  nu: Date = new Date(),
): Promise<void> {
  const [bij] = await db
    .update(candidates)
    .set({ respondedOn: nu, updatedAt: nu })
    .where(and(eq(candidates.id, kandidaatId), isNull(candidates.respondedOn)))
    .returning({ id: candidates.id })

  if (!bij) {
    // Of hij bestaat niet, of er was al geantwoord. Dat tweede is geen fout.
    const [bestaat] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.id, kandidaatId))
      .limit(1)
    if (!bestaat) throw new WervingError('Deze kandidaat bestaat niet meer.')
  }
}

/**
 * De status van een kandidaat wijzigen.
 *
 * Bij een eindstation worden de einddatum en de bewaartermijn meteen gezet.
 * Dat moet hier en niet later: de database weigert een afgesloten kandidaat
 * zonder bewaartermijn, juist zodat het niet vergeten kan worden.
 */
export async function zetKandidaatStatus(
  kandidaatId: string,
  status: KandidaatStatus,
  reden: string | null = null,
  nu: Date = new Date(),
): Promise<void> {
  const [huidig] = await db
    .select({
      status: candidates.status,
      retentionConsentOn: candidates.retentionConsentOn,
      closedOn: candidates.closedOn,
      respondedOn: candidates.respondedOn,
    })
    .from(candidates)
    .where(eq(candidates.id, kandidaatId))
    .limit(1)

  if (!huidig) throw new WervingError('Deze kandidaat bestaat niet meer.')

  const wordtAfgesloten = isAfgesloten(status)
  const schoneReden = (reden ?? '').trim()

  if (status === 'afgewezen' && schoneReden === '') {
    throw new WervingError(
      'Geef aan waarom je afwijst. Zonder reden kun je over een jaar niet zien waar het telkens op vastloopt.',
    )
  }

  // Blijft afgesloten? Dan de oorspronkelijke einddatum laten staan; anders
  // schuift de bewaartermijn op bij elke kleine wijziging.
  const afgeslotenOp = wordtAfgesloten ? (huidig.closedOn ?? nu) : null

  await db
    .update(candidates)
    .set({
      status,
      closedOn: afgeslotenOp,
      closedReason: wordtAfgesloten ? schoneReden || null : null,
      retentionUntil: bewaarTot(afgeslotenOp, huidig.retentionConsentOn),
      // Wie een besluit krijgt, heeft antwoord gehad.
      respondedOn: wordtAfgesloten ? (huidig.respondedOn ?? nu) : huidig.respondedOn,
      // Een afgesloten kandidaat heeft geen vervolgstap meer.
      nextAction: wordtAfgesloten ? null : undefined,
      nextActionOn: wordtAfgesloten ? null : undefined,
      updatedAt: nu,
    })
    .where(eq(candidates.id, kandidaatId))
}

/** Aangenomen, en gekoppeld aan de medewerker die hij geworden is. */
export async function koppelAanMedewerker(
  kandidaatId: string,
  userId: string,
  nu: Date = new Date(),
): Promise<void> {
  await zetKandidaatStatus(kandidaatId, 'aangenomen', null, nu)
  await db
    .update(candidates)
    .set({ hiredUserId: userId, updatedAt: nu })
    .where(eq(candidates.id, kandidaatId))
}

/**
 * Toestemming om langer te bewaren, of die toestemming intrekken.
 *
 * Intrekken moet ook kunnen: een kandidaat mag zich bedenken, en dan schuift
 * de bewaartermijn meteen terug naar vier weken.
 */
export async function zetBewaartoestemming(
  kandidaatId: string,
  gegeven: boolean,
  nu: Date = new Date(),
): Promise<void> {
  const [huidig] = await db
    .select({ closedOn: candidates.closedOn })
    .from(candidates)
    .where(eq(candidates.id, kandidaatId))
    .limit(1)

  if (!huidig) throw new WervingError('Deze kandidaat bestaat niet meer.')

  const toestemmingOp = gegeven ? nu : null

  await db
    .update(candidates)
    .set({
      retentionConsentOn: toestemmingOp,
      retentionUntil: bewaarTot(huidig.closedOn, toestemmingOp),
      updatedAt: nu,
    })
    .where(eq(candidates.id, kandidaatId))
}

/** Een kandidaat nu meteen wissen, op verzoek of omdat het klaar is. */
export async function wisKandidaat(kandidaatId: string): Promise<void> {
  await db.delete(candidates).where(eq(candidates.id, kandidaatId))
}

/**
 * De opruimtaak: kandidaten wissen waarvan de bewaartermijn om is.
 *
 * Echt wissen, niet archiveren. Een archief is bewaren met een ander woord
 * ervoor, en daar heeft de wet geen boodschap aan.
 *
 * Draait vanuit de dagelijkse cron. Geeft terug hoeveel er weg zijn, zodat
 * dat in de logs staat en er iets te zien is als het misgaat.
 */
export async function wisVerlopenKandidaten(
  nu: Date = new Date(),
): Promise<{ gewist: number; namen: string[] }> {
  const verlopen = await db
    .select({ id: candidates.id, name: candidates.name })
    .from(candidates)
    .where(lte(candidates.retentionUntil, nu))

  if (verlopen.length === 0) return { gewist: 0, namen: [] }

  await db.delete(candidates).where(
    inArray(
      candidates.id,
      verlopen.map((v) => v.id),
    ),
  )

  return { gewist: verlopen.length, namen: verlopen.map((v) => v.name) }
}

/* --- Cijfers -------------------------------------------------------------- */

export type WervingCijfers = {
  openVacatures: number
  openPlekken: number
  lopendeKandidaten: number
  wachtenOpAntwoord: number
  /** Gemiddeld aantal dagen tot het eerste antwoord, over afgeronde gevallen. */
  gemiddeldeReactiedagen: number | null
}

/**
 * De cijfers voor bovenaan het scherm, in één query.
 *
 * De reactietijd is het cijfer waar het om gaat: dat is wat een kandidaat
 * van je merkt voordat hij iets anders van je merkt.
 */
export async function getCijfers(nu: Date = new Date()): Promise<WervingCijfers> {
  // Zie listVacatures hierboven: ISO-tekst met een cast, nooit een Date.
  const grens = new Date(nu.getTime() - STILTE_DAGEN * DAG_MS).toISOString()

  const rijen = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM vacancies WHERE status = 'open') AS open_vacatures,
      (SELECT COALESCE(SUM(positions), 0) FROM vacancies WHERE status = 'open') AS open_plekken,
      (SELECT COUNT(*) FROM candidates
        WHERE status IN ('nieuw', 'in_gesprek', 'tweede_gesprek', 'aanbod')) AS lopend,
      (SELECT COUNT(*) FROM candidates
        WHERE responded_on IS NULL
          AND status IN ('nieuw', 'in_gesprek', 'tweede_gesprek', 'aanbod')
          AND applied_on < ${grens}::timestamptz) AS wachten,
      (SELECT AVG(EXTRACT(EPOCH FROM (responded_on - applied_on)) / 86400)
        FROM candidates WHERE responded_on IS NOT NULL) AS reactiedagen
  `)

  const rij = (rijen as unknown as Record<string, unknown>[])[0] ?? {}
  const getal = (naam: string): number => Number(rij[naam] ?? 0)
  const reactie = rij['reactiedagen']

  return {
    openVacatures: getal('open_vacatures'),
    openPlekken: getal('open_plekken'),
    lopendeKandidaten: getal('lopend'),
    wachtenOpAntwoord: getal('wachten'),
    gemiddeldeReactiedagen:
      reactie === null || reactie === undefined
        ? null
        : Math.round(Number(reactie) * 10) / 10,
  }
}

/**
 * Waarom kandidaten afvallen, geteld.
 *
 * Afgewezen en afgehaakt apart, want dat zijn twee verschillende problemen:
 * het eerste zegt iets over je selectie, het tweede over je aanbod.
 */
export async function getAfvalredenen(): Promise<{
  afgewezen: { reden: string; aantal: number }[]
  afgehaakt: { reden: string; aantal: number }[]
}> {
  const rijen = await db
    .select({
      status: candidates.status,
      reden: candidates.closedReason,
      aantal: count(),
    })
    .from(candidates)
    .where(inArray(candidates.status, ['afgewezen', 'afgehaakt']))
    .groupBy(candidates.status, candidates.closedReason)
    .orderBy(desc(count()))

  const bij = (welke: string) =>
    rijen
      .filter((r) => r.status === welke && (r.reden ?? '').trim() !== '')
      .map((r) => ({ reden: r.reden!, aantal: r.aantal }))

  return { afgewezen: bij('afgewezen'), afgehaakt: bij('afgehaakt') }
}
