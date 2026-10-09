'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { alsBeheerder } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { vergeet } from '@/lib/cache'
import {
  getSjabloon,
  getContract,
  getFunctieprofiel,
  stelContractOp,
  bewaarContract,
  wijzigContract,
  waaromNietWijzigen,
  invoerUit,
  contractWerkgever,
  korteNaam,
  maakDefinitief,
  markeerAangezegd,
  ContractError,
  type ContractInvoer,
} from '@/lib/contracten'
import { getBedrijf, huidigHandboek, handboekPad, werkgeverKop } from '@/lib/bedrijf'
import { berekenBeloning, getHuis } from '@/lib/salarishuis'
import { zetKandidaatStatus } from '@/lib/werving'
import { zorgVoorGegevens, zorgVoorGegevensVanCollega, werkContractgegevensBij, getGegevens, GegevensError } from '@/lib/persoonsgegevens'
import { volledigeNaam } from '@/lib/namen'
import { db } from '@/db'
import { candidates, candidateNotes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { ActionResult } from './actions'

/* Acties voor de contractgenerator. Alleen voor beheerders, net als de
   pagina's: elke actie controleert het zelf, want een server action is een
   publiek endpoint. */

const GEEN_RECHT: ActionResult = { ok: false, error: 'Alleen een beheerder kan contracten opstellen en bijwerken.' }

async function veilig(fn: () => Promise<void>, ook: string[] = []): Promise<ActionResult> {
  try {
    await fn()
    vergeet()
    revalidatePath('/beheer/contracten')
    revalidatePath('/beheer')
    for (const pad of ook) revalidatePath(pad)
    return { ok: true }
  } catch (error) {
    if (error instanceof ContractError || error instanceof GegevensError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[contracten] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (formData: FormData, naam: string) => String(formData.get(naam) ?? '').trim()

/** Een datum op het middaguur, zodat hij niet een dag terugschuift. */
function datum(formData: FormData, naam: string): Date | null {
  const waarde = tekst(formData, naam)
  if (waarde === '') return null
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function getal(formData: FormData, naam: string): number | null {
  const waarde = tekst(formData, naam)
  if (waarde === '') return null
  const n = Number(waarde.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

type Formulier = {
  invoer: ContractInvoer
  kandidaatId: string | null
  collegaId: string | null
  contractSoort: 'proforma' | 'definitief'
  naamDelen: { voornamen: string; tussenvoegsel: string | null; achternaam: string }
}

/**
 * Leest het contractformulier: hetzelfde voor opstellen en wijzigen.
 *
 * Het salaris komt uit het salarishuis als er een schaal en trede zijn
 * gekozen. Dat is met opzet: een bedrag dat je met de hand intypt kan
 * afwijken van de schaal waar je zegt dat het uit komt, en dan klopt je
 * salarishuis niet meer met je contracten.
 */
async function leesFormulier(formData: FormData): Promise<Formulier | string> {
  const kandidaatId = tekst(formData, 'kandidaatId') || null
  const collegaId = tekst(formData, 'collegaId') || null
  if (!kandidaatId && !collegaId) return 'Kies een kandidaat of een collega.'

  const ingangsdatum = datum(formData, 'ingangsdatum')
  if (!ingangsdatum) return 'Vul een ingangsdatum in.'

  const soort = tekst(formData, 'soort') === 'onbepaalde_tijd' ? 'onbepaalde_tijd' : 'bepaalde_tijd'
  const looptijd = getal(formData, 'looptijd')
  if (soort === 'bepaalde_tijd' && (looptijd === null || looptijd <= 0)) return 'Vul de looptijd in maanden in.'

  const uren = getal(formData, 'uren')
  if (uren === null || uren <= 0) return 'Vul het aantal uren per week in.'
  const urenKwartier = Math.round(uren * 100)

  const schaal = tekst(formData, 'schaal') || null
  const trede = getal(formData, 'trede')

  /* Het bedrag uit het salarishuis halen als schaal en trede bekend zijn.
     Anders het handmatige bedrag; dat is er voor uitzonderingen. */
  let brutoCents: number | null = null
  let opToeslagCents = 0
  let vakantieUren: number | null = null
  let vakantieUrenFulltime = 200
  let vakantietoeslagBp = 800

  if (schaal && trede !== null) {
    const huis = await getHuis(ingangsdatum)
    if (!huis) return 'Er is geen salarishuis dat geldt op de ingangsdatum. Voeg er een toe bij Salarishuis.'
    try {
      const beloning = berekenBeloning(huis, schaal, Math.round(trede), urenKwartier)
      brutoCents = beloning.maandCents
      // OP-toeslag in plaats van een pensioenregeling: standaard aan, uit te zetten.
      const opUit = formData.has('opToeslagKeuze') && !aan(formData, 'opToeslagAan')
      opToeslagCents = opUit ? 0 : beloning.opToeslagCents
      vakantieUren = beloning.vakantieUren
      vakantieUrenFulltime = huis.huis.holidayHoursFulltime
      vakantietoeslagBp = huis.huis.holidayAllowanceBp
      if (beloning.onderMinimumloon === true) return 'Dit komt uit op een uurloon onder het wettelijk minimum. Verhoog de trede of pas het salarishuis aan.'
    } catch (fout) {
      return fout instanceof Error ? fout.message : 'De schaal of trede klopt niet.'
    }
  } else {
    const handmatig = tekst(formData, 'bedrag')
    const gelezen = handmatig === '' ? null : parseAmountToCents(handmatig)
    if (gelezen === null || gelezen <= 0) return 'Kies een schaal en trede, of vul zelf een brutobedrag per maand in.'
    brutoCents = gelezen
  }

  const profielId = tekst(formData, 'functieprofiel') || null
  const profiel = profielId ? await getFunctieprofiel(profielId) : null
  const functie = tekst(formData, 'functie') || profiel?.title || ''
  if (functie === '') return 'Vul de functie in.'

  /* De naam zoals in het paspoort, uit losse delen: die gaan ook terug naar
     de persoonsgegevens. De roepnaam staat in de kop en bij de paraaf. */
  const voornamen = tekst(formData, 'officieleVoornamen')
  const tussenvoegsel = tekst(formData, 'tussenvoegsel')
  const achternaam = tekst(formData, 'achternaam')
  const roepnaam = tekst(formData, 'roepnaam')
  if (!voornamen || !achternaam) return 'Vul de voornamen (zoals in het paspoort) en de achternaam in.'
  const naam = volledigeNaam({ firstName: voornamen, infix: tussenvoegsel, lastName: achternaam })

  /* Wie namens de werkgever tekent. Alleen als het formulier de keuze biedt;
     anders gelden de bedrijfsgegevens. */
  const ondertekenaars = formData.has('ondertekenaarsKeuze')
    ? formData.getAll('ondertekenaar').map((v) => String(v).trim()).filter(Boolean)
    : undefined
  if (ondertekenaars && ondertekenaars.length === 0) return 'Kies wie er namens de werkgever tekent.'

  const aanhef = tekst(formData, 'aanhef')
  const invoer: ContractInvoer = {
    candidateId: kandidaatId,
    userId: collegaId,
    naam,
    roepnaam: roepnaam || null,
    korteNaam: korteNaam(roepnaam || voornamen.split(/\s+/)[0], tussenvoegsel, achternaam),
    ondertekenaars,
    aanhef: aanhef === 'heer' ? 'heer' : aanhef === 'mevrouw' ? 'mevrouw' : 'neutraal',
    adres: tekst(formData, 'adres') || null,
    postcode: tekst(formData, 'postcode') || null,
    woonplaats: tekst(formData, 'woonplaats') || null,
    geboortedatum: datum(formData, 'geboortedatum'),
    jobProfileId: profielId,
    functie,
    soort,
    ingangsdatum,
    looptijdMaanden: soort === 'bepaalde_tijd' ? Math.round(looptijd!) : null,
    proeftijdMaanden: Math.round(getal(formData, 'proeftijd') ?? 0),
    urenPerWeekKwartier: urenKwartier,
    schaalNaam: schaal,
    trede: trede === null ? null : Math.round(trede),
    brutoMaandCents: brutoCents,
    opToeslagCents,
    vakantietoeslagBp,
    vakantieUrenFulltime,
    vakantieUren: vakantieUren ?? undefined,
    vrijetijdsbudget: aan(formData, 'vrijetijdsbudget'),
    // Alleen als het formulier de keuze aanbiedt; anders beslist het functieprofiel.
    relatiebeding: formData.has('relatiebedingKeuze') ? aan(formData, 'relatiebeding') : undefined,
    extraAfspraken: formData.has('extraAfspraken') ? tekst(formData, 'extraAfspraken') : undefined,
    standplaatsId: tekst(formData, 'standplaats') || null,
    bereikbaarOpWerkdagen: aan(formData, 'bereikbaar'),
    nevenwerk: tekst(formData, 'nevenwerk') === 'vrij_behalve_klanten' ? 'vrij_behalve_klanten' : 'toestemming',
    tekenplaats: tekst(formData, 'tekenplaats') || null,
    tekendatum: datum(formData, 'tekendatum'),
  }

  return {
    invoer,
    kandidaatId,
    collegaId,
    contractSoort: tekst(formData, 'contractSoort') === 'definitief' ? 'definitief' : 'proforma',
    naamDelen: { voornamen, tussenvoegsel: formData.has('tussenvoegsel') ? tussenvoegsel || null : null, achternaam },
  }
}

const aan = (formData: FormData, naam: string) => ['ja', 'on', 'true', '1'].includes(tekst(formData, naam))

/**
 * Alles wat nodig is om het contract op te stellen: sjabloon, bedrijf,
 * standplaats en het handboek. En eerst de persoonsgegevens bijwerken: wat
 * in het contract staat, staat daarna ook daar.
 */
async function stelOp(f: Formulier) {
  const { invoer } = f
  const sjabloon = await getSjabloon(invoer.soort, invoer.ingangsdatum)
  if (!sjabloon) {
    throw new ContractError(`Er is nog geen sjabloon voor een contract voor ${invoer.soort === 'bepaalde_tijd' ? 'bepaalde' : 'onbepaalde'} tijd.`)
  }
  const bedrijf = await getBedrijf()
  if (!bedrijf) throw new ContractError('De bedrijfsgegevens ontbreken. Vul die eerst in bij Bedrijfsgegevens.')
  if (invoer.standplaatsId && !bedrijf.vestigingen.some((v) => v.id === invoer.standplaatsId)) {
    throw new ContractError('Deze standplaats bestaat niet meer. Kies een andere vestiging.')
  }
  const handboek = await huidigHandboek()
  const h = await headers()
  const basis = process.env.APP_URL ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  const context = contractWerkgever(bedrijf, invoer.standplaatsId, handboek && basis ? `${basis}${handboekPad(handboek)}` : null)
  // Waar er getekend wordt: standaard de plaats van de standplaats.
  if (!invoer.tekenplaats) invoer.tekenplaats = context.standplaats?.city ?? null

  /* Eén plek voor naam, adres en geboortedatum: wat hier is ingevuld, gaat
     eerst naar de persoonsgegevens. */
  const record = f.kandidaatId ? await zorgVoorGegevens(f.kandidaatId) : await zorgVoorGegevensVanCollega(f.collegaId!)
  await werkContractgegevensBij(record.id, {
    officialFirstNames: f.naamDelen.voornamen,
    infix: f.naamDelen.tussenvoegsel,
    lastName: f.naamDelen.achternaam,
    addressLine: invoer.adres,
    postalCode: invoer.postcode,
    city: invoer.woonplaats,
    birthDate: invoer.geboortedatum,
  })
  if (f.kandidaatId) {
    await db.update(candidates).set({ officialFirstNames: f.naamDelen.voornamen, updatedAt: new Date() }).where(eq(candidates.id, f.kandidaatId))
  }

  const profiel = invoer.jobProfileId ? await getFunctieprofiel(invoer.jobProfileId) : null
  const concept = stelContractOp(invoer, sjabloon, context, profiel)
  return { concept, sjabloon, bijlagen: { kop: werkgeverKop(bedrijf), handboekId: handboek?.id ?? null } }
}

/** De stappen van de indiensttreding van een kandidaat: daar hoort een contract van een kandidaat thuis. */
const stappenPad = (kandidaatId: string) => `/beheer/werving/kandidaten/${kandidaatId}/indiensttreding`

/** Stelt een contract op en bewaart het. */
export async function nieuwContract(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const f = await leesFormulier(formData)
  if (typeof f === 'string') return { ok: false, error: f }

  let nieuwId: string | null = null
  const resultaat = await veilig(async () => {
    const { concept, sjabloon, bijlagen } = await stelOp(f)
    // Pro forma: een voorstel om over te praten. Definitief: ter ondertekening.
    const bewaard = await bewaarContract(f.invoer, concept, sjabloon, f.contractSoort, gebruiker.id, bijlagen)
    nieuwId = bewaard.id
    if (f.kandidaatId) await kandidaatNaarFase(f.kandidaatId, f.contractSoort, gebruiker.id)
  }, f.kandidaatId ? [`/beheer/werving/kandidaten/${f.kandidaatId}`] : [])

  if (resultaat.ok && nieuwId) redirect(f.kandidaatId ? stappenPad(f.kandidaatId) : `/beheer/contracten/${nieuwId}`)
  return resultaat
}

/** Een contract dat nog niet getekend is opnieuw opstellen, onder hetzelfde nummer. */
export async function contractWijzigen(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const contractId = tekst(formData, 'contractId')
  const oud = contractId ? await getContract(contractId) : null
  if (!oud) return { ok: false, error: 'Dit contract bestaat niet meer.' }
  const nee = waaromNietWijzigen(oud)
  if (nee) return { ok: false, error: nee }

  // Bij wie het contract hoort, verandert niet door een wijziging: dat komt uit het contract, niet uit het formulier.
  formData.set('kandidaatId', oud.candidateId ?? '')
  formData.set('collegaId', oud.candidateId ? '' : (oud.userId ?? ''))
  const f = await leesFormulier(formData)
  if (typeof f === 'string') return { ok: false, error: f }
  f.invoer.userId = oud.userId

  const resultaat = await veilig(async () => {
    const { concept, sjabloon, bijlagen } = await stelOp(f)
    await wijzigContract(oud.id, f.invoer, concept, sjabloon, f.contractSoort, bijlagen)
    if (f.kandidaatId && f.contractSoort !== oud.soort) await kandidaatNaarFase(f.kandidaatId, f.contractSoort, gebruiker.id)
  }, [`/beheer/contracten/${oud.id}`, ...(oud.candidateId ? [`/beheer/werving/kandidaten/${oud.candidateId}`] : [])])

  if (resultaat.ok) redirect(oud.candidateId && !oud.signedOn ? stappenPad(oud.candidateId) : `/beheer/contracten/${oud.id}`)
  return resultaat
}

/**
 * Een contract voor een kandidaat zet hem in de bijbehorende fase, als hij daar
 * nog niet was: pro forma is "voorstel", definitief is "contract ter
 * ondertekening". Terug in de tijd gaat het nooit.
 */
async function kandidaatNaarFase(kandidaatId: string, soort: 'proforma' | 'definitief', userId: string) {
  const [k] = await db.select({ status: candidates.status }).from(candidates).where(eq(candidates.id, kandidaatId)).limit(1)
  if (!k) return
  const volgorde = ['nieuw', 'in_gesprek', 'tweede_gesprek', 'aanbod', 'contract']
  const doel = soort === 'definitief' ? 'contract' : 'aanbod'
  const nu = volgorde.indexOf(k.status)
  if (nu >= 0 && nu < volgorde.indexOf(doel)) await zetKandidaatStatus(kandidaatId, doel, null, new Date(), userId)
  await db.insert(candidateNotes).values({
    candidateId: kandidaatId,
    kind: 'status',
    body: soort === 'definitief' ? 'Definitief contract opgesteld, ter ondertekening.' : 'Pro-formacontract opgesteld.',
    createdByUserId: userId,
  })
}

export async function contractDefinitief(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const contractId = tekst(formData, 'contractId')
  const collegaId = tekst(formData, 'collegaId')
  if (!contractId) return { ok: false, error: 'Onbekend contract.' }
  if (!collegaId) {
    return {
      ok: false,
      error: 'Kies bij welke collega dit contract hoort. Maak die eerst aan bij Team als hij er nog niet is.',
    }
  }

  return veilig(() => maakDefinitief(contractId, collegaId), [
    `/beheer/contracten/${contractId}`,
    `/beheer/medewerkers/${collegaId}`,
  ])
}

export async function contractAangezegd(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const contractId = tekst(formData, 'contractId')
  if (!contractId) return { ok: false, error: 'Onbekend contract.' }

  return veilig(() => markeerAangezegd(contractId), [`/beheer/contracten/${contractId}`])
}

/**
 * Een contract opnieuw opstellen met wat er nu bekend is: de persoonsgegevens
 * zoals ze nu zijn en de standaardteksten van nu. Met "definitief" wordt een
 * pro forma meteen het contract ter ondertekening. Kan tot het getekend is.
 */
export async function contractBijwerken(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const oud = await getContract(tekst(formData, 'contractId'))
  if (!oud) return { ok: false, error: 'Dit contract bestaat niet meer.' }
  const nee = waaromNietWijzigen(oud)
  if (nee) return { ok: false, error: nee }

  const gegevens = await getGegevens(oud.candidateId ? { candidateId: oud.candidateId } : { userId: oud.userId! })
  const r = gegevens?.record
  const invoer = invoerUit(oud)
  const voornamen = r?.officialFirstNames?.trim() || invoer.naam
  const achternaam = r?.lastName?.trim() || ''
  const naam = r ? volledigeNaam({ firstName: r.officialFirstNames, infix: r.infix, lastName: r.lastName }) || invoer.naam : invoer.naam
  const f: Formulier = {
    invoer: {
      ...invoer,
      naam,
      korteNaam: r ? korteNaam(invoer.roepnaam || voornamen.split(/\s+/)[0], r.infix, r.lastName) || invoer.korteNaam : invoer.korteNaam,
      adres: r?.addressLine ?? invoer.adres,
      postcode: r?.postalCode ?? invoer.postcode,
      woonplaats: r?.city ?? invoer.woonplaats,
      geboortedatum: r?.birthDate ?? invoer.geboortedatum,
    },
    kandidaatId: oud.candidateId,
    collegaId: oud.candidateId ? null : oud.userId,
    contractSoort: formData.has('definitief') ? 'definitief' : oud.soort === 'definitief' ? 'definitief' : 'proforma',
    naamDelen: { voornamen, tussenvoegsel: r?.infix ?? null, achternaam },
  }
  return veilig(async () => {
    const { concept, sjabloon, bijlagen } = await stelOp(f)
    await wijzigContract(oud.id, f.invoer, concept, sjabloon, f.contractSoort, bijlagen)
    if (f.kandidaatId && f.contractSoort !== oud.soort) await kandidaatNaarFase(f.kandidaatId, f.contractSoort, gebruiker.id)
  }, [`/beheer/contracten/${oud.id}`, ...(oud.candidateId ? [stappenPad(oud.candidateId), `/beheer/werving/kandidaten/${oud.candidateId}`] : [])])
}
