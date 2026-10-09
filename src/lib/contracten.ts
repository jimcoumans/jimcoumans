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
  CompanyLocation,
  EmployerSettings,
  JobProfile,
  GeneratedContract,
} from '@/db/schema'
import { werkgeverKop, type Bedrijf, type WerkgeverKop } from './bedrijf'
import { REGELINGEN, verzekeringenZin } from './sjablonen'
import { vulIn, pasVoorwaardenToe } from './invullen'
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

export { vulIn, pasVoorwaardenToe } from './invullen'

/* --- Wat er in een contract komt ------------------------------------------ */

export type ContractInvoer = {
  /** Een concept voor een kandidaat, of een contract voor een collega. */
  candidateId?: string | null
  userId?: string | null

  naam: string
  /** De roepnaam, voor de aanhef in de begeleidende tekst. Leeg: de eerste voornaam. */
  roepnaam?: string | null
  /** Roepnaam met achternaam, voor de kop, de paraaf en de handtekening. Leeg: de volledige naam. */
  korteNaam?: string | null
  aanhef?: 'heer' | 'mevrouw' | 'neutraal' | null
  /**
   * Wie namens de werkgever tekent, met volledige naam. Leeg: wat er bij de
   * werkgevergegevens staat.
   */
  ondertekenaars?: string[]
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
  /** Relatiebeding aan of uit. Leeg: wat het functieprofiel zegt. */
  relatiebeding?: boolean
  /** Extra afspraken voor dit contract. Leeg: die van het functieprofiel. */
  extraAfspraken?: string | null

  /** De vestiging waar het werk gewoonlijk gebeurt. Leeg: de hoofdvestiging. */
  standplaatsId?: string | null
  /**
   * Parttime, maar op werkdagen tijdens kantoortijden bereikbaar. Maatwerk:
   * komt als extra lid in het artikel over de arbeidstijd.
   */
  bereikbaarOpWerkdagen?: boolean
  /**
   * Nevenwerkzaamheden: alleen met toestemming (de standaard), of vrij
   * behalve voor klanten van de werkgever en hun groepsmaatschappijen.
   */
  nevenwerk?: 'toestemming' | 'vrij_behalve_klanten'
  /** Waar en wanneer er getekend gaat worden. Leeg: puntjes om in te vullen. */
  tekenplaats?: string | null
  tekendatum?: Date | null
}

/**
 * Alles over de werkgever wat een contract nodig heeft: de gegevens, de
 * hoofdvestiging voor de kop, de standplaats voor het werk, en de link naar
 * het personeelshandboek voor de begeleidende tekst.
 */
export type ContractWerkgever = {
  werkgever: EmployerSettings
  hoofdvestiging: CompanyLocation | null
  standplaats: CompanyLocation | null
  handboekUrl?: string | null
}

/** Uit de bedrijfsgegevens: de standplaats is de gekozen vestiging, anders de hoofdvestiging. */
export function contractWerkgever(bedrijf: Bedrijf, standplaatsId?: string | null, handboekUrl?: string | null): ContractWerkgever {
  const standplaats = (standplaatsId ? bedrijf.vestigingen.find((v) => v.id === standplaatsId) : null) ?? bedrijf.hoofdvestiging
  return { werkgever: bedrijf.werkgever, hoofdvestiging: bedrijf.hoofdvestiging, standplaats, handboekUrl: handboekUrl ?? null }
}

/** "Daan Voncken": de roepnaam met de achternaam, voor de kop en de paraaf. */
export function korteNaam(roepnaam: string | null | undefined, tussenvoegsel: string | null | undefined, achternaam: string | null | undefined): string {
  return [roepnaam, tussenvoegsel, achternaam].map((d) => (d ?? '').trim()).filter(Boolean).join(' ')
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
  context: ContractWerkgever,
  profiel: JobProfile | null,
): ContractConcept {
  const opmerkingen: string[] = []
  const { werkgever, hoofdvestiging, standplaats } = context
  if (!hoofdvestiging) {
    throw new ContractError('Er is nog geen hoofdvestiging. Vul die in bij Bedrijfsgegevens.')
  }
  const werkplek = standplaats ?? hoofdvestiging

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

  const heeftRelatiebeding = invoer.relatiebeding ?? profiel?.hasRelationClause === true
  // Een relatiebeding in een tijdelijk contract is alleen geldig met een schriftelijke motivering (art. 7:653 BW).
  if (heeftRelatiebeding && !(profiel?.relationClauseMotivation ?? '').trim()) {
    throw new ContractError('Een relatiebeding moet gemotiveerd zijn. Kies een functieprofiel met een motivering, of zet het relatiebeding uit.')
  }
  const extraAfspraken = (invoer.extraAfspraken ?? profiel?.extraClauses ?? '').trim()
  if (!heeftRelatiebeding && profiel !== null && invoer.relatiebeding === undefined) {
    opmerkingen.push(
      `Bij de functie ${profiel.title} staat geen relatiebeding. Dat artikel blijft dus weg uit het contract.`,
    )
  }

  const opToeslag = invoer.opToeslagCents ?? 0
  const vakantietoeslagBp = invoer.vakantietoeslagBp ?? 800
  const vakantieUrenFulltime = invoer.vakantieUrenFulltime ?? 200

  const aanhefTekst =
    invoer.aanhef === 'heer' ? 'Dhr. ' : invoer.aanhef === 'mevrouw' ? 'Mevr. ' : ''

  const bereikbaar = invoer.bereikbaarOpWerkdagen === true
  if (bereikbaar && !werkplek.officeHours) {
    opmerkingen.push(`Bij ${werkplek.name} staan geen kantoortijden. In het contract staat nu alleen "tijdens kantoortijden". Vul ze in bij Bedrijfsgegevens en wijzig het contract.`)
  }
  if (!context.handboekUrl) {
    opmerkingen.push('Er is nog geen personeelshandboek geupload. Het contract zegt dat de werknemer het voor de ondertekening ontvangt. Upload het bij Bedrijfsgegevens en wijzig het contract, dan staat de link in de begeleidende tekst.')
  }

  const waarden: Record<string, string> = {
    werkgever_naam: werkgever.legalName,
    werkgever_merk: werkgever.tradeName,
    werkgever_adres: hoofdvestiging.addressLine,
    werkgever_postcode: hoofdvestiging.postalCode,
    werkgever_vestigingsplaats: hoofdvestiging.city,
    werkgever_ondertekenaars: invoer.ondertekenaars && invoer.ondertekenaars.length > 0 ? namenZin(invoer.ondertekenaars) : werkgever.signatories,
    werkplek_adres: werkplek.addressLine,
    werkplek_postcode: werkplek.postalCode,
    werkplek_plaats: werkplek.city,
    kantoortijden: werkplek.officeHours ? ` (${werkplek.officeHours})` : '',

    werknemer_aanhef: aanhefTekst,
    werknemer_naam: invoer.naam,
    voornaam: invoer.roepnaam?.trim() || voornaamUit(invoer.naam),
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
        ? `schaal ${invoer.schaalNaam}, trede ${invoer.trede}`
        : (invoer.schaalNaam ?? 'buiten schaal'),
    salaris_peildatum: formatDateLong(invoer.ingangsdatum),
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
    extra_afspraken: extraAfspraken,
    verzekeringen_zin: verzekeringenZin(werkgever.regelingen ?? []),
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
    pensioenregeling: (werkgever.regelingen ?? []).includes('pensioenregeling'),
    vrijetijdsbudget: invoer.vrijetijdsbudget === true,
    extra_afspraken: extraAfspraken !== '',
    schaal: !!invoer.schaalNaam && !!invoer.trede,
    bereikbaar,
    nevenwerk_toestemming: (invoer.nevenwerk ?? 'toestemming') === 'toestemming',
    nevenwerk_vrij: invoer.nevenwerk === 'vrij_behalve_klanten',
    verzekeringen: verzekeringenZin(werkgever.regelingen ?? []) !== '',
    // Wat bedrijfsbreed geregeld is; pensioenregeling staat hierboven al.
    ...Object.fromEntries(REGELINGEN.filter((r) => r.sleutel !== 'pensioenregeling').map((r) => [r.sleutel, (werkgever.regelingen ?? []).includes(r.sleutel)])),
  }

  const ontbrekend: string[] = []
  const artikelen: Artikel[] = []

  for (const artikel of [...sjabloon.artikelen].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!geldt[artikel.voorwaarde]) continue

    const metVoorwaarden = pasVoorwaardenToe(artikel.body, geldt)
    for (const naam of metVoorwaarden.onbekend) {
      if (!ontbrekend.includes(`voorwaarde ${naam}`)) ontbrekend.push(`voorwaarde ${naam}`)
    }
    const ingevuld = vulIn(metVoorwaarden.tekst, waarden)
    for (const naam of ingevuld.ontbrekend) {
      if (!ontbrekend.includes(naam)) ontbrekend.push(naam)
    }

    const leden = ingevuld.tekst
      .split(/\n\s*\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '')
    // Een artikel waarvan alles in {{#als}}-blokken stond die niet gelden, valt weg.
    if (leden.length === 0) continue

    artikelen.push({
      // Nummeren bij het uitschrijven: valt een artikel weg, dan schuift de
      // rest op en klopt de nummering nog steeds.
      nummer: artikelen.length + 1,
      titel: artikel.title,
      leden,
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
    handboek_zin: context.handboekUrl
      ? `Bij het contract hoort ons personeelshandboek. Lees het voordat je tekent:\n${context.handboekUrl}\n\nOok de AVG-verklaring hoort erbij. Die vul je in en teken je voor je eerste werkdag.\n\n`
      : 'Bij het contract horen ons personeelshandboek en de AVG-verklaring. Die krijg je van ons voordat je tekent.\n\n',
    relatiebeding_zin: heeftRelatiebeding
      ? `- Er zit een relatiebeding in: na afloop mag je ${profiel?.relationClauseMonths ?? 12} maanden lang niet zakelijk met onze klanten werken. In het contract staat waarom.\n`
      : '',
  }
  const intro = vulIn(pasVoorwaardenToe(introBron, geldt).tekst, introWaarden)

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


/** "A", "A en B", "A, B en C". */
export function namenZin(namen: string[]): string {
  const n = namen.map((x) => x.trim()).filter(Boolean)
  if (n.length <= 1) return n[0] ?? ''
  return `${n.slice(0, -1).join(', ')} en ${n[n.length - 1]}`
}

/**
 * Wie er namens de werkgever tekent, als losse namen.
 *
 * Bij een contract van voor deze keuze staat er niets bij het contract;
 * dan de werkgevergegevens, gesplitst op "en" en komma's.
 */
export function ondertekenaarsVan(c: Pick<GeneratedContract, 'employerSigners'>, werkgever: Pick<EmployerSettings, 'signatories'> | null): string[] {
  if (c.employerSigners?.trim()) return c.employerSigners.split('\n').map((x) => x.trim()).filter(Boolean)
  return (werkgever?.signatories ?? '')
    .split(/,| en /)
    .map((x) => x.trim())
    .filter(Boolean)
}

/**
 * Wie er namens de werkgever kan tekenen: de collega's, eigenaren eerst.
 *
 * Wie bij de werkgevergegevens als ondertekenaar staat maar (nog) geen account
 * heeft, staat er ook bij en is aangevinkt: anders valt een eigenaar zonder
 * account stilletjes van het contract af.
 */
export async function listMogelijkeOndertekenaars(): Promise<{ id: string; naam: string; eigenaar: boolean }[]> {
  const [rijen, werkgever] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, isOwner: users.isOwner, firstName: users.firstName, infix: users.infix, lastName: users.lastName })
      .from(users)
      .where(and(isNull(users.organizationId), isNull(users.disabledAt), isNull(users.endedOn), or(eq(users.role, 'admin'), eq(users.role, 'staff')))),
    getWerkgever(),
  ])
  const lijst = rijen.map((r) => ({
    id: r.id,
    naam: [r.firstName, r.infix, r.lastName].filter(Boolean).join(' ') || r.name || r.email,
    eigenaar: r.isOwner,
  }))
  const bekend = new Set(lijst.map((x) => x.naam.toLowerCase()))
  for (const naam of ondertekenaarsVan({ employerSigners: null }, werkgever)) {
    if (!bekend.has(naam.toLowerCase())) lijst.push({ id: `werkgever:${naam}`, naam, eigenaar: true })
  }
  return lijst.sort((a, b) => Number(b.eigenaar) - Number(a.eigenaar) || a.naam.localeCompare(b.naam, 'nl'))
}

/**
 * De werkgever zoals hij in de kop van dit contract hoort: zoals hij was toen
 * het contract werd opgesteld. Een oud contract zonder die kopie krijgt de
 * huidige gegevens.
 */
export function kopVanContract(c: Pick<GeneratedContract, 'employerSnapshot'>, bedrijf: Bedrijf | null): WerkgeverKop | null {
  const bewaard = c.employerSnapshot as Partial<WerkgeverKop> | null
  if (bewaard && typeof bewaard.legalName === 'string' && typeof bewaard.addressLine === 'string') return bewaard as WerkgeverKop
  return bedrijf ? werkgeverKop(bedrijf) : null
}

/** De naam in de kop, bij de paraaf en onder de handtekening: de roepnaam, anders de volledige naam. */
export function tekennaamVan(c: Pick<GeneratedContract, 'employeeShortName' | 'employeeName'>): string {
  return c.employeeShortName?.trim() || c.employeeName
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
/** Wat er naast de invoer bij een contract wordt bewaard. */
export type ContractBijlagen = {
  /** De werkgever zoals hij nu in de kop staat. */
  kop: WerkgeverKop | null
  /** De versie van het personeelshandboek die bij dit contract hoort. */
  handboekId: string | null
}

/** De velden van een contractrij die uit de invoer en het concept komen. */
function contractVelden(invoer: ContractInvoer, concept: ContractConcept, sjabloon: { template: ContractTemplate }, bijlagen: ContractBijlagen) {
  return {
    templateId: sjabloon.template.id,
    jobProfileId: invoer.jobProfileId ?? null,

    employeeName: invoer.naam,
    employeeShortName: invoer.korteNaam?.trim() || null,
    employerSigners: invoer.ondertekenaars && invoer.ondertekenaars.length > 0 ? invoer.ondertekenaars.join('\n') : null,
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

    locationId: invoer.standplaatsId ?? null,
    signPlace: invoer.tekenplaats?.trim() || null,
    signDate: invoer.tekendatum ?? null,
    employerSnapshot: bijlagen.kop,
    handbookDocumentId: bijlagen.handboekId,
    invoer: invoerNaarJson(invoer),

    aanzeggenVoor: concept.aanzeggenVoor,
    body: concept.body,
    summary: concept.intro,
    remarks: concept.opmerkingen.length > 0 ? concept.opmerkingen.join('\n') : null,
  }
}

/** De invoer als json: datums als jjjj-mm-dd, zodat ze bij het terugzetten niet verschuiven. */
function invoerNaarJson(invoer: ContractInvoer): Record<string, unknown> {
  const dag = (d: Date | null | undefined) =>
    d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null
  return { ...invoer, ingangsdatum: dag(invoer.ingangsdatum), geboortedatum: dag(invoer.geboortedatum), tekendatum: dag(invoer.tekendatum) }
}

function dagUit(waarde: unknown): Date | null {
  if (typeof waarde !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(waarde)) return null
  const d = new Date(`${waarde.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * De invoer van een bewaard contract, om het te kunnen wijzigen.
 *
 * Een contract van voor deze kolom heeft geen bewaarde invoer; dan wordt hij
 * zo goed mogelijk uit het contract zelf opgebouwd. Wat er niet in staat
 * (zoals het relatiebeding), valt terug op wat het functieprofiel zegt.
 */
export function invoerUit(c: GeneratedContract): ContractInvoer {
  const j = (c.invoer ?? null) as Record<string, unknown> | null
  if (j && typeof j.naam === 'string') {
    return {
      ...(j as unknown as ContractInvoer),
      ingangsdatum: dagUit(j.ingangsdatum) ?? c.startedOn,
      geboortedatum: dagUit(j.geboortedatum),
      tekendatum: dagUit(j.tekendatum),
    }
  }
  const oudeTekst = c.body
  return {
    candidateId: c.candidateId,
    userId: c.userId,
    naam: c.employeeName,
    korteNaam: c.employeeShortName,
    aanhef: c.employeeAanhef,
    ondertekenaars: c.employerSigners ? c.employerSigners.split('\n').filter(Boolean) : undefined,
    adres: c.employeeAddress,
    postcode: c.employeePostalCode,
    woonplaats: c.employeeCity,
    geboortedatum: c.employeeBirthDate,
    jobProfileId: c.jobProfileId,
    functie: c.jobTitle,
    soort: c.contractType as ContractSoort,
    ingangsdatum: c.startedOn,
    looptijdMaanden: c.durationMonths,
    proeftijdMaanden: c.probationMonths,
    urenPerWeekKwartier: c.hoursWeekQuarters,
    schaalNaam: c.salaryScaleName,
    trede: c.salaryStep,
    brutoMaandCents: c.grossMonthlyCents,
    opToeslagCents: c.opAllowanceCents,
    vakantietoeslagBp: c.holidayAllowanceBp,
    vakantieUren: c.holidayHoursPerYear ?? undefined,
    vrijetijdsbudget: oudeTekst.includes('vrijetijdsbesteding'),
    relatiebeding: oudeTekst.includes('Relatiebeding'),
    standplaatsId: c.locationId,
    tekenplaats: c.signPlace,
    tekendatum: c.signDate,
  }
}

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
  bijlagen: ContractBijlagen = { kop: null, handboekId: null },
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
      candidateId: invoer.candidateId ?? null,
      userId: invoer.userId ?? null,
      ...contractVelden(invoer, concept, sjabloon, bijlagen),
      createdByUserId: doorUserId,
    })
    .returning()

  if (!contract) throw new ContractError('Het contract kon niet worden opgeslagen.')
  return contract
}

/** Kan dit contract nog gewijzigd worden? Zo nee: waarom niet. */
export function waaromNietWijzigen(c: Pick<GeneratedContract, 'signedOn' | 'soort' | 'userId' | 'candidateId'>): string | null {
  if (c.signedOn) return 'Dit contract is getekend. Wat getekend is, verander je niet: stel een nieuw contract op.'
  if (c.soort === 'definitief' && c.userId && c.candidateId === null) {
    return 'Dit contract staat in het dossier van een collega. Stel een nieuw contract op.'
  }
  return null
}

/**
 * Een contract wijzigen dat nog niet getekend is: opnieuw opstellen met de
 * nieuwe invoer, onder hetzelfde nummer. Zo blijft er geen verouderde versie
 * rondzweven die per ongeluk wordt verstuurd.
 */
export async function wijzigContract(
  id: string,
  invoer: ContractInvoer,
  concept: ContractConcept,
  sjabloon: { template: ContractTemplate },
  soort: 'proforma' | 'definitief',
  bijlagen: ContractBijlagen,
): Promise<GeneratedContract> {
  const oud = await getContract(id)
  if (!oud) throw new ContractError('Dit contract bestaat niet meer.')
  const nee = waaromNietWijzigen(oud)
  if (nee) throw new ContractError(nee)
  const [contract] = await db
    .update(generatedContracts)
    .set({ soort, ...contractVelden(invoer, concept, sjabloon, bijlagen) })
    .where(eq(generatedContracts.id, id))
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
  // Een definitief contract voor een kandidaat hangt nog aan niemand; pas bij aanname gaat het naar het dossier.
  if (contract.soort === 'definitief' && contract.userId) {
    throw new ContractError('Dit contract staat al in het dossier van een collega.')
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
      opAllowanceCents: contract.opAllowanceCents,
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
    .where(or(eq(candidates.status, 'aanbod'), eq(candidates.status, 'contract'), eq(candidates.status, 'aangenomen')))
    .orderBy(asc(candidates.name))
}
