import { and, count, eq, gte, ilike, inArray, or } from 'drizzle-orm'
import { db } from '@/db'
import { candidates, candidateDocuments, vacancies } from '@/db/schema'
import { maakKandidaat } from './werving'
import { haalBestandVeiligOp } from './veilig-ophalen'

/* -------------------------------------------------------------------------
   Sollicitaties die via jamesrobinson.nl binnenkomen.

   Dit is het eerste punt in dit systeem waar iets van buiten naar binnen
   schrijft zonder dat er iemand is ingelogd. Alles hier is daarop gebouwd:

   - Zonder het juiste geheim gebeurt er niets. Het geheim staat in de
     webhook-instelling van Elementor en komt nooit in de HTML van de site
     terecht; de bezoeker post naar WordPress, en WordPress post naar ons.

   - Er zit een lokvakje in het formulier. Een mens laat dat leeg, een bot
     vult alles. Is het gevuld, dan krijgt de afzender een keurig "gelukt"
     en wordt er niets opgeslagen. Een bot die een foutmelding krijgt,
     probeert het anders; een bot die denkt dat het lukte, gaat weg.

   - Er is een harde bovengrens aan het aantal sollicitaties per uur. Niet
     als beveiliging tegen een gerichte aanval - daar is het te grof voor -
     maar zodat een kapot script of een spamgolf de database niet volgooit
     voordat iemand het merkt.

   De velden komen binnen zoals Elementor ze stuurt, en dat verschilt per
   versie en per instelling. Daarom wordt er per veld onder meerdere namen
   gezocht in plaats van dat er een exacte vorm wordt geeist.
   ------------------------------------------------------------------------- */

export class SollicitatieError extends Error {}

/** Het lokvakje. Een mens ziet dit veld niet; een bot vult het. */
export const LOKVELD = 'website'

/** Meer dan dit per uur is geen sollicitatiegolf maar een script. */
export const MAX_PER_UUR = 30

/** Wat een cv mag zijn, en hoe groot. */
export const CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const
export const CV_MAX_BYTES = 5 * 1024 * 1024

/** Zo lang mag een los veld zijn. Daarboven wordt het afgekapt. */
const MAX_TEKST = 500
const MAX_NOTITIE = 5000

/**
 * Leest een veld onder meerdere mogelijke namen.
 *
 * Elementor stuurt velden als `form_fields[naam]`, oudere versies als
 * `fields[naam]` en sommige instellingen gewoon als `naam`. In plaats van
 * een van die vormen te eisen kijken we ze alle drie na - dat scheelt een
 * middag zoeken bij iemand die niet weet welke versie hij draait.
 */
export function leesVeld(data: FormData | URLSearchParams, ...namen: string[]): string {
  for (const naam of namen) {
    for (const vorm of [naam, `form_fields[${naam}]`, `fields[${naam}]`]) {
      const waarde = data.get(vorm)
      if (typeof waarde === 'string' && waarde.trim() !== '') return waarde.trim()
    }
  }
  return ''
}

/** Kapt af en haalt regeleindes weg waar die niet horen. */
function kort(waarde: string, max = MAX_TEKST): string {
  return waarde.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Een e-mailadres dat er tenminste uitziet als een e-mailadres. */
export function lijktOpEmail(waarde: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(waarde) && waarde.length <= 254
}

export type Sollicitatie = {
  voornaam: string
  tussenvoegsel: string
  achternaam: string
  naam: string
  email: string
  telefoon: string
  linkedin: string
  vacatureAanduiding: string
  school: string
  opleiding: string
  motivatie: string
  cvUrl: string
  /** Het lokvakje was gevuld. Dan doen we alsof, en slaan we niets op. */
  lijktBot: boolean
}

/**
 * Haalt een sollicitatie uit wat er binnenkwam.
 *
 * Losse functie zonder database, zodat alles wat hier misgaat te testen is
 * zonder een webserver op te tuigen.
 */
export function leesSollicitatie(data: FormData | URLSearchParams): Sollicitatie {
  const voornaam = kort(leesVeld(data, 'voornaam', 'first_name', 'firstname'), 100)
  const tussenvoegsel = kort(leesVeld(data, 'tussenvoegsel', 'infix'), 30)
  const achternaam = kort(leesVeld(data, 'achternaam', 'last_name', 'lastname'), 100)
  const losseNaam = kort(leesVeld(data, 'naam', 'name', 'volledige_naam'), 200)

  const samengesteld = [voornaam, tussenvoegsel, achternaam].filter((d) => d !== '').join(' ')

  return {
    voornaam,
    tussenvoegsel,
    achternaam,
    naam: samengesteld !== '' ? samengesteld : losseNaam,
    email: kort(leesVeld(data, 'email', 'e-mail', 'mail'), 254).toLowerCase(),
    telefoon: kort(leesVeld(data, 'telefoon', 'phone', 'tel'), 40),
    linkedin: kort(leesVeld(data, 'linkedin', 'linkedin_url'), 300),
    vacatureAanduiding: kort(leesVeld(data, 'vacature', 'vacancy', 'functie'), 200),
    school: kort(leesVeld(data, 'school', 'opleidingsinstituut'), 150),
    opleiding: kort(leesVeld(data, 'opleiding', 'study', 'studie'), 150),
    motivatie: leesVeld(data, 'motivatie', 'bericht', 'message', 'toelichting').slice(
      0,
      MAX_NOTITIE,
    ),
    cvUrl: kort(leesVeld(data, 'cv', 'cv_url', 'bijlage', 'upload'), 1000),
    lijktBot: leesVeld(data, LOKVELD) !== '',
  }
}

/**
 * Zoekt de vacature waar dit op slaat.
 *
 * Het formulier kan een id sturen (als het keuzemenu daarmee gevuld is) of
 * gewoon de titel (als iemand hem heeft overgetypt). Allebei werkt; lukt het
 * niet, dan komt de sollicitatie binnen als open sollicitatie in plaats van
 * dat hij wordt geweigerd. Een kandidaat kwijtraken omdat een keuzemenu niet
 * klopte is het domste wat dit onderdeel kan doen.
 */
export async function zoekVacature(aanduiding: string): Promise<string | null> {
  if (aanduiding === '') return null

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    aanduiding,
  )

  const [gevonden] = await db
    .select({ id: vacancies.id })
    .from(vacancies)
    .where(
      isUuid
        ? eq(vacancies.id, aanduiding)
        : and(
            ilike(vacancies.title, aanduiding),
            or(eq(vacancies.status, 'open'), eq(vacancies.status, 'gepauzeerd')),
          ),
    )
    .limit(1)

  return gevonden?.id ?? null
}

/** Hoeveel sollicitaties er het afgelopen uur binnenkwamen via de website. */
export async function telLaatsteUur(nu: Date = new Date()): Promise<number> {
  const [rij] = await db
    .select({ aantal: count() })
    .from(candidates)
    .where(
      and(
        eq(candidates.source, 'website'),
        gte(candidates.createdAt, new Date(nu.getTime() - 60 * 60 * 1000)),
      ),
    )

  return rij?.aantal ?? 0
}

/**
 * Of deze sollicitatie een herhaling is van eentje die net binnenkwam.
 *
 * Iemand die twee keer op verzenden drukt hoort niet twee keer in de lijst
 * te staan. Alleen binnen het afgelopen uur en op hetzelfde e-mailadres:
 * wie na een maand nog eens solliciteert is een nieuwe kandidaat.
 */
export async function isDubbel(email: string, nu: Date = new Date()): Promise<boolean> {
  if (email === '') return false

  const [rij] = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      and(
        eq(candidates.email, email),
        gte(candidates.createdAt, new Date(nu.getTime() - 60 * 60 * 1000)),
      ),
    )
    .limit(1)

  return rij !== undefined
}

export type OntvangstResultaat =
  | { status: 'opgeslagen'; kandidaatId: string; cv: 'opgeslagen' | 'mislukt' | 'geen' }
  | { status: 'genegeerd'; reden: 'bot' | 'dubbel' }

/**
 * Neemt een sollicitatie aan.
 *
 * Geeft bij een bot of een dubbele inzending gewoon 'genegeerd' terug en
 * geen fout: naar buiten toe ziet dat er hetzelfde uit als gelukt, en dat is
 * precies de bedoeling.
 */
export async function ontvangSollicitatie(
  sollicitatie: Sollicitatie,
  opties: {
    /** De host waarvan een cv opgehaald mag worden. Leeg: niet ophalen. */
    bestandsHost?: string
    fetchImpl?: typeof fetch
    nu?: Date
  } = {},
): Promise<OntvangstResultaat> {
  const nu = opties.nu ?? new Date()

  // Het lokvakje was gevuld. Niets opslaan, maar naar buiten toe niets laten
  // merken: een bot die denkt dat het lukte, gaat weg.
  if (sollicitatie.lijktBot) return { status: 'genegeerd', reden: 'bot' }

  if (sollicitatie.naam === '') {
    throw new SollicitatieError('Er staat geen naam in de sollicitatie.')
  }
  if (sollicitatie.email !== '' && !lijktOpEmail(sollicitatie.email)) {
    throw new SollicitatieError('Het e-mailadres klopt niet.')
  }

  if (await telLaatsteUur(nu).then((n) => n >= MAX_PER_UUR)) {
    throw new SollicitatieError(
      `Er kwamen dit uur al ${MAX_PER_UUR} sollicitaties binnen. Er is iets mis; kijk in de logs.`,
    )
  }

  if (await isDubbel(sollicitatie.email, nu)) {
    return { status: 'genegeerd', reden: 'dubbel' }
  }

  const vacatureId = await zoekVacature(sollicitatie.vacatureAanduiding)

  const kandidaat = await maakKandidaat({
    vacancyId: vacatureId,
    firstName: sollicitatie.voornaam || null,
    infix: sollicitatie.tussenvoegsel || null,
    lastName: sollicitatie.achternaam || null,
    name: sollicitatie.naam,
    email: sollicitatie.email || null,
    phone: sollicitatie.telefoon || null,
    linkedinUrl: sollicitatie.linkedin || null,
    source: vacatureId === null ? 'open_sollicitatie' : 'website',
    school: sollicitatie.school || null,
    study: sollicitatie.opleiding || null,
    notes: sollicitatie.motivatie || null,
    appliedOn: nu,
  })

  if (sollicitatie.cvUrl !== '') {
    await db
      .update(candidates)
      .set({ cvSourceUrl: sollicitatie.cvUrl })
      .where(eq(candidates.id, kandidaat.id))
  }

  const cv = await bewaarCv(kandidaat.id, sollicitatie.cvUrl, opties)
  return { status: 'opgeslagen', kandidaatId: kandidaat.id, cv }
}

/**
 * Haalt het cv op van de WordPress-server en zet het hier neer.
 *
 * Mislukt dit, dan gaat de sollicitatie gewoon door. De kandidaat is
 * belangrijker dan zijn bijlage, en het adres blijft bewaard zodat je er
 * alsnog bij kunt.
 */
async function bewaarCv(
  kandidaatId: string,
  url: string,
  opties: { bestandsHost?: string; fetchImpl?: typeof fetch },
): Promise<'opgeslagen' | 'mislukt' | 'geen'> {
  if (url === '') return 'geen'
  if (!opties.bestandsHost) return 'mislukt'

  const resultaat = await haalBestandVeiligOp(url, {
    toegestaneHost: opties.bestandsHost,
    toegestaneTypes: CV_TYPES,
    maxBytes: CV_MAX_BYTES,
    fetchImpl: opties.fetchImpl,
  })

  if (!resultaat.ok) {
    // De reden wel loggen, het adres niet: daar staat de naam van de
    // sollicitant vaak in de bestandsnaam.
    console.warn(`[sollicitatie] cv niet opgehaald: ${resultaat.reden}`)
    return 'mislukt'
  }

  await db.insert(candidateDocuments).values({
    candidateId: kandidaatId,
    kind: 'cv',
    contentType: resultaat.contentType,
    bytes: resultaat.bytes.byteLength,
    data: Buffer.from(resultaat.bytes).toString('base64'),
    filename: resultaat.filename,
  })

  return 'opgeslagen'
}

/** De bestanden bij een kandidaat, zonder de inhoud. Voor een lijstje. */
export async function listDocumenten(kandidaatId: string) {
  return db
    .select({
      id: candidateDocuments.id,
      kind: candidateDocuments.kind,
      contentType: candidateDocuments.contentType,
      bytes: candidateDocuments.bytes,
      filename: candidateDocuments.filename,
      createdAt: candidateDocuments.createdAt,
    })
    .from(candidateDocuments)
    .where(eq(candidateDocuments.candidateId, kandidaatId))
}

/** Alle bestanden van een lijst kandidaten tegelijk, zonder de inhoud. */
export async function listDocumentenPerKandidaat(kandidaatIds: string[]) {
  if (kandidaatIds.length === 0) return new Map<string, Awaited<ReturnType<typeof listDocumenten>>>()

  const rijen = await db
    .select({
      id: candidateDocuments.id,
      candidateId: candidateDocuments.candidateId,
      kind: candidateDocuments.kind,
      contentType: candidateDocuments.contentType,
      bytes: candidateDocuments.bytes,
      filename: candidateDocuments.filename,
      createdAt: candidateDocuments.createdAt,
    })
    .from(candidateDocuments)
    // Filteren in de database en niet erna: anders haal je bij elke
    // paginaweergave de hele tabel op om er drie rijen uit te pakken.
    .where(inArray(candidateDocuments.candidateId, kandidaatIds))

  const per = new Map<string, typeof rijen>()
  for (const r of rijen) {
    const lijst = per.get(r.candidateId)
    if (lijst) lijst.push(r)
    else per.set(r.candidateId, [r])
  }
  return per
}

/** Eén bestand met inhoud, om te downloaden. */
export async function getDocument(id: string) {
  const [rij] = await db
    .select()
    .from(candidateDocuments)
    .where(eq(candidateDocuments.id, id))
    .limit(1)

  return rij ?? null
}
