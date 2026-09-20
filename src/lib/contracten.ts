import { and, asc, desc, eq, isNull, lte, or } from 'drizzle-orm'
import { db } from '@/db'
import {
  contractTemplates,
  contractTemplateArticles,
  employerSettings,
  jobProfiles,
  generatedContracts,
  employmentContracts,
  salaryRecords,
  candidates,
  users,
} from '@/db/schema'
import type {
  ContractTemplate,
  ContractTemplateArticle,
  EmployerSettings,
  JobProfile,
  GeneratedContract,
} from '@/db/schema'
import { formatCents } from './money'
import { formatDateLong } from './dates'
import {
  eindeVanRechtswege,
  toegestaneProeftijd,
  aanzegdatum,
  ketenStand,
  type ContractSoort,
} from './contractregels'

/* -------------------------------------------------------------------------
   Contracten opstellen.

   Een contract komt uit drie dingen: een sjabloon met artikelen, een
   functieprofiel met wat per functie verschilt, en de gegevens van deze ene
   persoon. Wat eruit komt wordt voluit bewaard - een oud contract verandert
   niet omdat iemand later een zin in het sjabloon heeft bijgewerkt.

   De artikelen worden genummerd bij het uitschrijven en niet in de tekst.
   Valt een artikel weg omdat de voorwaarde niet geldt, dan schuift de rest
   op. Daarom staan er in de tekst ook geen verwijzingen naar nummers meer
   maar omschrijvingen: "het in dit artikel bepaalde" in plaats van "het
   bepaalde in 15.1".

   LET OP: dit is geen juridisch advies. Dit systeem vult een sjabloon in dat
   door jullie is vastgesteld; het schrijft geen arbeidsrecht.
   ------------------------------------------------------------------------- */

export class ContractError extends Error {}

/* --- Invullen ------------------------------------------------------------- */

/** Een plaatshouder die niet is ingevuld valt op in plaats van weg te vallen. */
const ONBEKEND = (naam: string) => `[ONBEKEND: ${naam}]`

/**
 * Vervangt {{plaatshouders}} door waarden.
 *
 * Een ontbrekende waarde wordt zichtbaar gemarkeerd en niet stilletjes leeg
 * gelaten. In een juridisch document is een lege plek erger dan een lelijke:
 * een lege plek lees je over, [ONBEKEND: salaris] niet.
 */
export function vulIn(
  sjabloon: string,
  waarden: Record<string, string>,
): { tekst: string; ontbrekend: string[] } {
  const ontbrekend: string[] = []

  const tekst = sjabloon.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_heel, naam: string) => {
    const waarde = waarden[naam]
    if (waarde === undefined) {
      if (!ontbrekend.includes(naam)) ontbrekend.push(naam)
      return ONBEKEND(naam)
    }
    return waarde
  })

  return { tekst, ontbrekend }
}

/* --- Wat er in een contract komt ------------------------------------------ */

export type ContractInvoer = {
  /** Een concept voor een kandidaat, of een contract voor een collega. */
  candidateId?: string | null
  userId?: string | null

  naam: string
  aanhef?: 'heer' | 'mevrouw' | 'neutraal' | null
  adres?: string | null
  postcode?: string | null
  woonplaats?: string | null
  geboortedatum?: Date | null

  jobProfileId?: string | null
  functie: string
  soort: ContractSoort
  ingangsdatum: Date
  /** Bij bepaalde tijd. De einddatum wordt hieruit berekend. */
  looptijdMaanden?: number | null
  /** Wat je zou willen. Wordt teruggebracht tot wat mag. */
  proeftijdMaanden?: number

  urenPerWeekKwartier: number
  schaalNaam?: string | null
  trede?: number | null
  brutoMaandCents: number
  opToeslagCents?: number
  vakantietoeslagBp?: number
  vakantieUrenFulltime?: number
  vakantieUren?: number
  /** Krijgt deze medewerker het vrijetijdsbudget? */
  vrijetijdsbudget?: boolean
}

export type Artikel = { nummer: number; titel: string; leden: string[] }

export type ContractConcept = {
  artikelen: Artikel[]
  intro: string
  /** De uitgeschreven tekst, zoals hij wordt bewaard. */
  body: string
  einddatum: Date | null
  proeftijdMaanden: number
  aanzeggenVoor: Date | null
  /** Waarschuwingen die de gebruiker moet zien voordat hij verstuurt. */
  opmerkingen: string[]
  ontbrekend: string[]
}

const MAANDEN_IN_WOORDEN: Record<number, string> = {
  1: 'één maand',
  2: 'twee maanden',
  3: 'drie maanden',
  6: 'zes maanden',
  7: 'zeven maanden',
  12: 'twaalf maanden',
  24: 'vierentwintig maanden',
}

function maandenInWoorden(n: number): string {
  return MAANDEN_IN_WOORDEN[n] ?? `${n} maanden`
}

/**
 * De voornaam uit een volledige naam, voor de aanhef van de brief.
 *
 * Mensen typen de naam vaak met een aanhef ervoor: "Dhr. Daniël Voncken".
 * Zonder die eruit te halen begint de begeleidende brief met "Beste Dhr.",
 * en dat is precies het soort slordigheid waar dit hele onderdeel voor
 * bestaat. Titels tellen hier ook als aanhef: "Beste Drs." is niet beter.
 */
const AANHEF_WOORDEN = [
  'dhr',
  'hr',
  'mevr',
  'mw',
  'mevrouw',
  'heer',
  'de',
  'drs',
  'ir',
  'mr',
  'ing',
  'dr',
]

export function voornaamUit(naam: string): string {
  const delen = naam
    .trim()
    .split(/\s+/)
    .filter((d) => {
      const schoon = d.replace(/\.$/, '').toLowerCase()
      return !AANHEF_WOORDEN.includes(schoon)
    })

  return delen[0] ?? naam.trim()
}

/** Uren uit kwartieren, netjes geschreven: 3200 wordt "32", 2450 wordt "24,5". */
export function urenTekst(kwartieren: number): string {
  const uren = kwartieren / 100
  return Number.isInteger(uren) ? String(uren) : uren.toFixed(2).replace(/0$/, '').replace('.', ',')
}

/**
 * Stelt het contract samen.
 *
 * Pure functie op het sjabloon: geen database. Wat hier misgaat is te testen
 * zonder iets op te tuigen, en dat is bij een juridisch document het minste
 * wat je wilt.
 */
export function stelContractOp(
  invoer: ContractInvoer,
  sjabloon: { template: ContractTemplate; artikelen: ContractTemplateArticle[] },
  werkgever: EmployerSettings,
  profiel: JobProfile | null,
): ContractConcept {
  const opmerkingen: string[] = []

  const looptijd = invoer.soort === 'bepaalde_tijd' ? (invoer.looptijdMaanden ?? null) : null
  if (invoer.soort === 'bepaalde_tijd' && (looptijd === null || looptijd <= 0)) {
    throw new ContractError('Geef de looptijd in maanden op bij een contract voor bepaalde tijd.')
  }

  const einddatum =
    invoer.soort === 'bepaalde_tijd' && looptijd !== null
      ? eindeVanRechtswege(invoer.ingangsdatum, looptijd)
      : null

  // De proeftijd wordt teruggebracht tot wat mag. Niet als waarschuwing:
  // een te lange proeftijd is nietig, dus afkappen is de enige uitkomst
  // waarin er nog een proeftijd is.
  const proeftijd = toegestaneProeftijd(invoer.proeftijdMaanden ?? 0, invoer.soort, looptijd)
  if (proeftijd.uitleg) opmerkingen.push(proeftijd.uitleg)

  const aanzeggen = aanzegdatum(invoer.soort, einddatum, looptijd)
  if (aanzeggen) {
    opmerkingen.push(
      `Dit contract moet uiterlijk ${formatDateLong(aanzeggen)} schriftelijk worden aangezegd. Vergeet je dat, dan ben je een maandsalaris verschuldigd.`,
    )
  }

  const heeftRelatiebeding = profiel?.hasRelationClause === true
  if (!heeftRelatiebeding && profiel !== null) {
    opmerkingen.push(
      `Bij de functie ${profiel.title} staat geen relatiebeding. Dat artikel blijft dus weg uit het contract.`,
    )
  }

  const opToeslag = invoer.opToeslagCents ?? 0
  const vakantietoeslagBp = invoer.vakantietoeslagBp ?? 800
  const vakantieUrenFulltime = invoer.vakantieUrenFulltime ?? 200

  const aanhefTekst =
    invoer.aanhef === 'heer' ? 'Dhr. ' : invoer.aanhef === 'mevrouw' ? 'Mevr. ' : ''

  const waarden: Record<string, string> = {
    werkgever_naam: werkgever.legalName,
    werkgever_adres: werkgever.registeredAddress,
    werkgever_postcode: werkgever.registeredPostalCode,
    werkgever_vestigingsplaats: werkgever.registeredCity,
    werkgever_ondertekenaars: werkgever.signatories,
    werkplek_adres: werkgever.workAddress,
    werkplek_postcode: werkgever.workPostalCode,
    werkplek_plaats: werkgever.workCity,

    werknemer_aanhef: aanhefTekst,
    werknemer_naam: invoer.naam,
    voornaam: voornaamUit(invoer.naam),
    werknemer_adres: invoer.adres ?? '',
    werknemer_postcode: invoer.postcode ?? '',
    werknemer_woonplaats: invoer.woonplaats ?? '',
    werknemer_geboortedatum: invoer.geboortedatum ? formatDateLong(invoer.geboortedatum) : '',

    functie: invoer.functie,
    ingangsdatum: formatDateLong(invoer.ingangsdatum),
    looptijd: looptijd === null ? '' : maandenInWoorden(looptijd),
    einddatum: einddatum ? formatDateLong(einddatum) : '',
    proeftijd: maandenInWoorden(proeftijd.maanden),

    uren_per_week: urenTekst(invoer.urenPerWeekKwartier),
    salaris: formatCents(invoer.brutoMaandCents),
    schaal_trede:
      invoer.schaalNaam && invoer.trede
        ? `Schaal ${invoer.schaalNaam} ${invoer.trede}`
        : (invoer.schaalNaam ?? 'buiten schaal'),
    vakantietoeslag_percent: String(vakantietoeslagBp / 100),
    vakantiedagen_fulltime: String(Math.round(vakantieUrenFulltime / 8)),
    vakantie_uren_fulltime: String(vakantieUrenFulltime),
    vakantie_uren: String(invoer.vakantieUren ?? vakantieUrenFulltime),

    op_toeslag_percent: String(
      invoer.brutoMaandCents > 0 ? Math.round((opToeslag / invoer.brutoMaandCents) * 100) : 0,
    ),
    op_toeslag_bedrag: formatCents(opToeslag),

    relatiebeding_maanden: String(profiel?.relationClauseMonths ?? 12),
    relatiebeding_motivering: profiel?.relationClauseMotivation ?? '',
    extra_afspraken: profiel?.extraClauses ?? '',
  }

  /* De voorwaarden. Vaste namen en geen uitdrukking die in de database
     staat: dat zou code zijn die niemand nakijkt en die een juridisch
     document bepaalt. */
  const geldt: Record<string, boolean> = {
    altijd: true,
    bepaalde_tijd: invoer.soort === 'bepaalde_tijd',
    onbepaalde_tijd: invoer.soort === 'onbepaalde_tijd',
    proeftijd: proeftijd.maanden > 0,
    relatiebeding: heeftRelatiebeding,
    op_toeslag: opToeslag > 0,
    pensioenregeling: false,
    vrijetijdsbudget: invoer.vrijetijdsbudget === true,
    extra_afspraken: (profiel?.extraClauses ?? '').trim() !== '',
  }

  const ontbrekend: string[] = []
  const artikelen: Artikel[] = []

  for (const artikel of [...sjabloon.artikelen].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!geldt[artikel.voorwaarde]) continue

    const ingevuld = vulIn(artikel.body, waarden)
    for (const naam of ingevuld.ontbrekend) {
      if (!ontbrekend.includes(naam)) ontbrekend.push(naam)
    }

    artikelen.push({
      // Nummeren bij het uitschrijven: valt een artikel weg, dan schuift de
      // rest op en klopt de nummering nog steeds.
      nummer: artikelen.length + 1,
      titel: artikel.title,
      leden: ingevuld.tekst
        .split(/\n\s*\n/)
        .map((l) => l.trim())
        .filter((l) => l !== ''),
    })
  }

  if (artikelen.length === 0) {
    throw new ContractError('Dit sjabloon levert geen enkel artikel op. Controleer de artikelen.')
  }

  const introBron = sjabloon.template.intro ?? ''
  const introWaarden: Record<string, string> = {
    ...waarden,
    duur_zin:
      invoer.soort === 'bepaalde_tijd' && einddatum
        ? `Het is een contract voor bepaalde tijd van ${maandenInWoorden(looptijd!)}; het loopt tot en met ${formatDateLong(einddatum)}.`
        : 'Het is een contract voor onbepaalde tijd.',
    op_toeslag_zin:
      opToeslag > 0
        ? `- Er is geen pensioenregeling; in plaats daarvan krijg je ${formatCents(opToeslag)} per maand als OP-toeslag.\n`
        : '',
    proeftijd_zin:
      proeftijd.maanden > 0
        ? `- Er geldt een proeftijd van ${maandenInWoorden(proeftijd.maanden)}.\n`
        : '- Er geldt geen proeftijd.\n',
    relatiebeding_zin: heeftRelatiebeding
      ? `- Er zit een relatiebeding in: na afloop mag je ${profiel?.relationClauseMonths ?? 12} maanden lang niet zakelijk met onze klanten werken. In het contract staat waarom.\n`
      : '',
  }
  const intro = vulIn(introBron, introWaarden)

  const body = artikelen
    .map((a) => `## Artikel ${a.nummer}: ${a.titel}\n\n${a.leden.join('\n\n')}`)
    .join('\n\n')

  return {
    artikelen,
    intro: intro.tekst,
    body,
    einddatum,
    proeftijdMaanden: proeftijd.maanden,
    aanzeggenVoor: aanzeggen,
    opmerkingen,
    ontbrekend: [...ontbrekend, ...intro.ontbrekend.filter((n) => !ontbrekend.includes(n))],
  }
}

/* --- Ophalen -------------------------------------------------------------- */

/** Het sjabloon dat gold op een datum, met zijn artikelen. Twee queries. */
export async function getSjabloon(
  kind: string,
  op: Date = new Date(),
): Promise<{ template: ContractTemplate; artikelen: ContractTemplateArticle[] } | null> {
  const [template] = await db
    .select()
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.kind, kind as 'bepaalde_tijd'),
        eq(contractTemplates.active, true),
        lte(contractTemplates.effectiveFrom, op),
      ),
    )
    .orderBy(desc(contractTemplates.effectiveFrom))
    .limit(1)

  if (!template) return null

  const artikelen = await db
    .select()
    .from(contractTemplateArticles)
    .where(eq(contractTemplateArticles.templateId, template.id))
    .orderBy(asc(contractTemplateArticles.sortOrder))

  return { template, artikelen }
}

export async function getWerkgever(): Promise<EmployerSettings | null> {
  const [rij] = await db.select().from(employerSettings).limit(1)
  return rij ?? null
}

export async function listFunctieprofielen(): Promise<JobProfile[]> {
  return db
    .select()
    .from(jobProfiles)
    .where(eq(jobProfiles.active, true))
    .orderBy(asc(jobProfiles.title))
}

export async function getFunctieprofiel(id: string): Promise<JobProfile | null> {
  const [rij] = await db.select().from(jobProfiles).where(eq(jobProfiles.id, id)).limit(1)
  return rij ?? null
}

/** De contracten van iemand, nieuwste eerst. */
export async function listContracten(
  van: { candidateId?: string; userId?: string },
): Promise<GeneratedContract[]> {
  const waar = van.candidateId
    ? eq(generatedContracts.candidateId, van.candidateId)
    : van.userId
      ? eq(generatedContracts.userId, van.userId)
      : undefined

  if (!waar) return []

  return db.select().from(generatedContracts).where(waar).orderBy(desc(generatedContracts.createdAt))
}

export async function getContract(id: string): Promise<GeneratedContract | null> {
  const [rij] = await db.select().from(generatedContracts).where(eq(generatedContracts.id, id)).limit(1)
  return rij ?? null
}

/* --- Opslaan -------------------------------------------------------------- */

/**
 * Slaat een opgesteld contract op.
 *
 * Bewaart de uitgeschreven tekst en alle waarden waarmee hij is gemaakt.
 * Zo is een jaar later nog na te gaan wat er is afgesproken, ook als het
 * sjabloon inmiddels anders is.
 */
export async function bewaarContract(
  invoer: ContractInvoer,
  concept: ContractConcept,
  sjabloon: { template: ContractTemplate },
  soort: 'proforma' | 'definitief',
  doorUserId: string | null,
): Promise<GeneratedContract> {
  if (!invoer.candidateId && !invoer.userId) {
    throw new ContractError(
      'Een contract hoort bij een kandidaat of bij een collega. Kies er een.',
    )
  }

  const [contract] = await db
    .insert(generatedContracts)
    .values({
      soort,
      templateId: sjabloon.template.id,
      jobProfileId: invoer.jobProfileId ?? null,
      candidateId: invoer.candidateId ?? null,
      userId: invoer.userId ?? null,

      employeeName: invoer.naam,
      employeeAanhef: invoer.aanhef ?? null,
      employeeAddress: invoer.adres ?? null,
      employeePostalCode: invoer.postcode ?? null,
      employeeCity: invoer.woonplaats ?? null,
      employeeBirthDate: invoer.geboortedatum ?? null,

      jobTitle: invoer.functie,
      contractType: invoer.soort,
      startedOn: invoer.ingangsdatum,
      endsOn: concept.einddatum,
      durationMonths: invoer.looptijdMaanden ?? null,
      probationMonths: concept.proeftijdMaanden,
      hoursWeekQuarters: invoer.urenPerWeekKwartier,

      salaryScaleName: invoer.schaalNaam ?? null,
      salaryStep: invoer.trede ?? null,
      grossMonthlyCents: invoer.brutoMaandCents,
      opAllowanceCents: invoer.opToeslagCents ?? 0,
      holidayAllowanceBp: invoer.vakantietoeslagBp ?? 800,
      holidayHoursPerYear: invoer.vakantieUren ?? null,

      aanzeggenVoor: concept.aanzeggenVoor,
      body: concept.body,
      summary: concept.intro,
      remarks: concept.opmerkingen.length > 0 ? concept.opmerkingen.join('\n') : null,
      createdByUserId: doorUserId,
    })
    .returning()

  if (!contract) throw new ContractError('Het contract kon niet worden opgeslagen.')
  return contract
}

/**
 * Een proforma definitief maken, en het dossier bijwerken.
 *
 * Dit is het moment waarop het contract uit de wervingsmodule in het
 * personeelsdossier terechtkomt: een regel in de contracthistorie en een
 * regel in de salarishistorie. Zonder deze stap zou alles opnieuw moeten
 * worden ingetypt, en dat is precies waar gegevens verdwijnen.
 */
export async function maakDefinitief(
  contractId: string,
  userId: string,
  nu: Date = new Date(),
): Promise<void> {
  const contract = await getContract(contractId)
  if (!contract) throw new ContractError('Dit contract bestaat niet meer.')
  if (contract.soort === 'definitief') {
    throw new ContractError('Dit contract is al definitief gemaakt.')
  }

  await db.transaction(async (tx) => {
    await tx
      .update(generatedContracts)
      .set({ soort: 'definitief', userId })
      .where(eq(generatedContracts.id, contractId))

    await tx.insert(employmentContracts).values({
      userId,
      type: contract.contractType,
      startedOn: contract.startedOn,
      endsOn: contract.endsOn,
      hoursPerWeekQuarters: contract.hoursWeekQuarters,
      jobTitle: contract.jobTitle,
      notes: `Opgesteld met de contractgenerator op ${formatDateLong(nu)}.`,
      createdByUserId: contract.createdByUserId,
    })

    await tx.insert(salaryRecords).values({
      userId,
      grossMonthlyCents: contract.grossMonthlyCents,
      basedOnHoursQuarters: contract.hoursWeekQuarters,
      holidayAllowancePercent: Math.round(contract.holidayAllowanceBp / 100),
      effectiveFrom: contract.startedOn,
      reason: 'Indiensttreding',
      createdByUserId: contract.createdByUserId,
    })
  })
}

/** Vastleggen dat er is aangezegd. */
export async function markeerAangezegd(contractId: string, nu: Date = new Date()): Promise<void> {
  const [bij] = await db
    .update(generatedContracts)
    .set({ aangezegdOp: nu })
    .where(and(eq(generatedContracts.id, contractId), isNull(generatedContracts.aangezegdOp)))
    .returning({ id: generatedContracts.id })

  if (!bij) throw new ContractError('Dit contract is al aangezegd, of bestaat niet meer.')
}

/* --- Bewaken -------------------------------------------------------------- */

export type Aanzegging = {
  contract: GeneratedContract
  naam: string
  dagenTeGaan: number
}

/**
 * Contracten waarvoor de aanzegging eraan komt of te laat is.
 *
 * Dit is het getal waarmee deze module zichzelf terugverdient: een vergeten
 * aanzegging kost een maandsalaris. Alleen definitieve contracten, want een
 * concept is nog geen afspraak.
 */
export async function komendeAanzeggingen(
  binnenDagen = 45,
  nu: Date = new Date(),
): Promise<Aanzegging[]> {
  const grens = new Date(nu.getTime() + binnenDagen * 24 * 60 * 60 * 1000)

  const rijen = await db
    .select({ contract: generatedContracts, naam: users.name })
    .from(generatedContracts)
    .leftJoin(users, eq(generatedContracts.userId, users.id))
    .where(
      and(
        eq(generatedContracts.soort, 'definitief'),
        isNull(generatedContracts.aangezegdOp),
        lte(generatedContracts.aanzeggenVoor, grens),
      ),
    )
    .orderBy(asc(generatedContracts.aanzeggenVoor))

  return rijen
    .filter((r) => r.contract.aanzeggenVoor !== null)
    .map((r) => ({
      contract: r.contract,
      naam: r.naam ?? r.contract.employeeName,
      dagenTeGaan: Math.floor(
        (r.contract.aanzeggenVoor!.getTime() - nu.getTime()) / (24 * 60 * 60 * 1000),
      ),
    }))
}

/** Alleen het aantal, voor het dashboard. */
export async function telAanzeggingen(binnenDagen = 45, nu: Date = new Date()): Promise<number> {
  return (await komendeAanzeggingen(binnenDagen, nu)).length
}

/** Waar iemand in de keten staat, op basis van zijn contracthistorie. */
export async function ketenVoor(
  userId: string,
  nieuweLooptijdMaanden: number | null,
): Promise<ReturnType<typeof ketenStand>> {
  const bestaande = await db
    .select({
      type: employmentContracts.type,
      startedOn: employmentContracts.startedOn,
      endsOn: employmentContracts.endsOn,
    })
    .from(employmentContracts)
    .where(eq(employmentContracts.userId, userId))
    .orderBy(asc(employmentContracts.startedOn))

  return ketenStand(bestaande, nieuweLooptijdMaanden)
}

/** Kandidaten met een aanbod, voor de keuzelijst bij een nieuw contract. */
export async function listKandidatenMetAanbod() {
  return db
    .select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      status: candidates.status,
    })
    .from(candidates)
    .where(or(eq(candidates.status, 'aanbod'), eq(candidates.status, 'aangenomen')))
    .orderBy(asc(candidates.name))
}
