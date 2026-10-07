'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { alsBeheerder } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { vergeet } from '@/lib/cache'
import {
  getSjabloon,
  getWerkgever,
  getFunctieprofiel,
  stelContractOp,
  bewaarContract,
  maakDefinitief,
  markeerAangezegd,
  ContractError,
  type ContractInvoer,
} from '@/lib/contracten'
import { berekenBeloning, getHuis } from '@/lib/salarishuis'
import { zetKandidaatStatus } from '@/lib/werving'
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
    if (error instanceof ContractError) return { ok: false, error: error.message }
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

/**
 * Stelt een contract op en bewaart het als concept.
 *
 * Het salaris komt uit het salarishuis als er een schaal en trede zijn
 * gekozen. Dat is met opzet: een bedrag dat je met de hand intypt kan
 * afwijken van de schaal waar je zegt dat het uit komt, en dan klopt je
 * salarishuis niet meer met je contracten.
 */
export async function nieuwContract(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT

  const kandidaatId = tekst(formData, 'kandidaatId') || null
  const collegaId = tekst(formData, 'collegaId') || null
  if (!kandidaatId && !collegaId) {
    return { ok: false, error: 'Kies een kandidaat of een collega.' }
  }

  const ingangsdatum = datum(formData, 'ingangsdatum')
  if (!ingangsdatum) return { ok: false, error: 'Vul een ingangsdatum in.' }

  const soort = tekst(formData, 'soort') === 'onbepaalde_tijd' ? 'onbepaalde_tijd' : 'bepaalde_tijd'
  const looptijd = getal(formData, 'looptijd')
  if (soort === 'bepaalde_tijd' && (looptijd === null || looptijd <= 0)) {
    return { ok: false, error: 'Vul de looptijd in maanden in.' }
  }

  const uren = getal(formData, 'uren')
  if (uren === null || uren <= 0) {
    return { ok: false, error: 'Vul het aantal uren per week in.' }
  }
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
    if (!huis) {
      return {
        ok: false,
        error: 'Er is geen salarishuis dat geldt op de ingangsdatum. Voeg er een toe bij Salarishuis.',
      }
    }
    try {
      const beloning = berekenBeloning(huis, schaal, Math.round(trede), urenKwartier)
      brutoCents = beloning.maandCents
      // OP-toeslag in plaats van een pensioenregeling: standaard aan, uit te zetten.
      const opUit = formData.has('opToeslagKeuze') && !['ja', 'on', 'true'].includes(tekst(formData, 'opToeslagAan'))
      opToeslagCents = opUit ? 0 : beloning.opToeslagCents
      vakantieUren = beloning.vakantieUren
      vakantieUrenFulltime = huis.huis.holidayHoursFulltime
      vakantietoeslagBp = huis.huis.holidayAllowanceBp

      if (beloning.onderMinimumloon === true) {
        return {
          ok: false,
          error: `Dit komt uit op een uurloon onder het wettelijk minimum. Verhoog de trede of pas het salarishuis aan.`,
        }
      }
    } catch (fout) {
      return {
        ok: false,
        error: fout instanceof Error ? fout.message : 'De schaal of trede klopt niet.',
      }
    }
  } else {
    const handmatig = tekst(formData, 'bedrag')
    const gelezen = handmatig === '' ? null : parseAmountToCents(handmatig)
    if (gelezen === null || gelezen <= 0) {
      return {
        ok: false,
        error: 'Kies een schaal en trede, of vul zelf een brutobedrag per maand in.',
      }
    }
    brutoCents = gelezen
  }

  const profielId = tekst(formData, 'functieprofiel') || null
  const profiel = profielId ? await getFunctieprofiel(profielId) : null

  const functie = tekst(formData, 'functie') || profiel?.title || ''
  if (functie === '') return { ok: false, error: 'Vul de functie in.' }

  const invoer: ContractInvoer = {
    candidateId: kandidaatId,
    userId: collegaId,
    naam: tekst(formData, 'naam'),
    aanhef:
      tekst(formData, 'aanhef') === 'heer'
        ? 'heer'
        : tekst(formData, 'aanhef') === 'mevrouw'
          ? 'mevrouw'
          : 'neutraal',
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
    vrijetijdsbudget: ['ja', 'on', 'true'].includes(tekst(formData, 'vrijetijdsbudget')),
    // Alleen als het formulier de keuze aanbiedt; anders beslist het functieprofiel.
    relatiebeding: formData.has('relatiebedingKeuze') ? ['ja', 'on', 'true'].includes(tekst(formData, 'relatiebeding')) : undefined,
    extraAfspraken: formData.has('extraAfspraken') ? tekst(formData, 'extraAfspraken') : undefined,
  }

  if (invoer.naam === '') return { ok: false, error: 'Vul de naam van de werknemer in.' }

  let nieuwId: string | null = null

  const resultaat = await veilig(async () => {
    const sjabloon = await getSjabloon(soort, ingangsdatum)
    if (!sjabloon) {
      throw new ContractError(
        `Er is nog geen sjabloon voor een contract voor ${soort === 'bepaalde_tijd' ? 'bepaalde' : 'onbepaalde'} tijd.`,
      )
    }
    const werkgever = await getWerkgever()
    if (!werkgever) {
      throw new ContractError('De gegevens van de werkgever ontbreken. Vul die eerst in.')
    }

    const concept = stelContractOp(invoer, sjabloon, werkgever, profiel)
    // Pro forma: een voorstel om over te praten. Definitief: ter ondertekening.
    const contractSoort = tekst(formData, 'contractSoort') === 'definitief' ? 'definitief' : 'proforma'
    const bewaard = await bewaarContract(invoer, concept, sjabloon, contractSoort, gebruiker.id)
    nieuwId = bewaard.id
    if (kandidaatId) await kandidaatNaarFase(kandidaatId, contractSoort, gebruiker.id)
  }, kandidaatId ? [`/beheer/werving/kandidaten/${kandidaatId}`] : [])

  if (resultaat.ok && nieuwId) redirect(`/beheer/contracten/${nieuwId}`)
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
