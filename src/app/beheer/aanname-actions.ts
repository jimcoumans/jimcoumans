'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { alsBeheerder } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { vergeet } from '@/lib/cache'
import { neemAan, markeerGetekend, markeerHandboekOntvangen, AannameError } from '@/lib/aanname'
import {
  zorgVoorGegevens,
  zorgVoorGegevensVanCollega,
  voegDocumentToe,
  slaGegevensOp,
  markeerDoorgegeven,
  werkIbanBij,
  GegevensError,
  DOCUMENT_LABELS,
  type DocumentSoort,
} from '@/lib/persoonsgegevens'
import { SleutelError } from '@/lib/versleuteling'
import { getContract } from '@/lib/contracten'
import type { ActionResult } from './actions'

/* Aannemen, ondertekening en de persoonsgegevens van een collega. Alleen een
   beheerder: hier staan contracten, salarissen, IBAN en paspoortkopieën. */

const GEEN_RECHT: ActionResult = { ok: false, error: 'Alleen een beheerder kan dit doen.' }

async function veilig(fn: () => Promise<void>, paden: string[]): Promise<ActionResult> {
  try {
    await fn()
    vergeet()
    for (const pad of ['/beheer', '/beheer/werving', '/beheer/werving/kandidaten', '/beheer/contracten', '/beheer/medewerkers', ...paden]) {
      revalidatePath(pad)
    }
    return { ok: true }
  } catch (error) {
    if (error instanceof AannameError || error instanceof GegevensError || error instanceof SleutelError) {
      return { ok: false, error: error.message }
    }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[aanname] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (formData: FormData, naam: string) => String(formData.get(naam) ?? '').trim()

function datum(formData: FormData, naam: string): Date | null {
  const waarde = tekst(formData, naam)
  if (waarde === '') return null
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

async function bestandUit(formData: FormData, naam: string) {
  const f = formData.get(naam)
  if (!(f instanceof File) || f.size === 0) return null
  return { contentType: f.type, filename: f.name || null, data: Buffer.from(await f.arrayBuffer()) }
}

/** In dienst nemen: van kandidaat naar collega, in één stap. */
export async function kandidaatAannemen(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const kandidaatId = tekst(formData, 'kandidaatId')
  const contractId = tekst(formData, 'contractId')
  if (!kandidaatId || !contractId) return { ok: false, error: 'Kies het getekende contract.' }

  let userId: string | null = null
  const r = await veilig(async () => {
    const uit = await neemAan({
      kandidaatId,
      contractId,
      werkEmail: tekst(formData, 'werkEmail'),
      rol: tekst(formData, 'rol') === 'admin' ? 'admin' : 'staff',
      afdeling: tekst(formData, 'afdeling') || null,
      doorUserId: gebruiker.id,
    })
    userId = uit.userId
  }, [`/beheer/werving/kandidaten/${kandidaatId}`])
  if (r.ok && userId) redirect(`/beheer/medewerkers/${userId}?welkom=1`)
  return r
}

/**
 * De ondertekening vastleggen: de datum, en desgewenst meteen het getekende
 * exemplaar. Dat laatste gaat versleuteld bij de persoonsgegevens, net als
 * de kopie ID.
 */
export async function contractGetekend(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const contractId = tekst(formData, 'contractId')
  const contract = contractId ? await getContract(contractId) : null
  if (!contract) return { ok: false, error: 'Onbekend contract.' }

  const terug = tekst(formData, 'terug') === '1'
  const op = terug ? null : datum(formData, 'getekendOp')
  if (!terug && !op) return { ok: false, error: 'Vul de datum van ondertekening in.' }
  const bestand = terug ? null : await bestandUit(formData, 'bestand')
  const avg = terug ? null : await bestandUit(formData, 'avg')
  const handboek = !terug && formData.has('handboek')

  return veilig(
    async () => {
      await markeerGetekend(contractId, op)
      if (bestand || avg) {
        const record = contract.userId
          ? await zorgVoorGegevensVanCollega(contract.userId)
          : await zorgVoorGegevens(contract.candidateId!)
        if (bestand) await voegDocumentToe(record.id, { kind: 'contract', ...bestand }, gebruiker.id)
        if (avg) await voegDocumentToe(record.id, { kind: 'avg_verklaring', ...avg }, gebruiker.id)
      }
      if (handboek && !contract.handbookGivenOn) await markeerHandboekOntvangen(contractId, op)
    },
    [
      `/beheer/contracten/${contractId}`,
      ...(contract.candidateId ? [`/beheer/werving/kandidaten/${contract.candidateId}`] : []),
      ...(contract.userId ? [`/beheer/medewerkers/${contract.userId}`] : []),
    ],
  )
}

/** Vastleggen dat het personeelshandboek is ontvangen, vanuit de vervolgstappen. */
export async function handboekOntvangen(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const contractId = tekst(formData, 'contractId')
  const contract = contractId ? await getContract(contractId) : null
  if (!contract) return { ok: false, error: 'Onbekend contract.' }
  const op = datum(formData, 'op') ?? new Date()
  return veilig(() => markeerHandboekOntvangen(contractId, op), [
    `/beheer/contracten/${contractId}`,
    ...(contract.candidateId ? [`/beheer/werving/kandidaten/${contract.candidateId}`] : []),
    ...(contract.userId ? [`/beheer/medewerkers/${contract.userId}`] : []),
  ])
}

/**
 * Een document uploaden vanuit de vervolgstappen: de getekende AVG-verklaring,
 * een kopie ID of de loonheffingsverklaring. Het gaat naar de persoonsgegevens
 * van de kandidaat of de collega, versleuteld.
 */
export async function stapDocument(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const kandidaatId = tekst(formData, 'kandidaatId') || null
  const userId = tekst(formData, 'userId') || null
  if (!kandidaatId && !userId) return { ok: false, error: 'Onbekend bij wie dit hoort.' }
  const bestand = await bestandUit(formData, 'bestand')
  if (!bestand) return { ok: false, error: 'Kies een bestand.' }
  const soort = tekst(formData, 'soort')
  const kind: DocumentSoort = soort in DOCUMENT_LABELS ? (soort as DocumentSoort) : 'overig'
  return veilig(
    async () => {
      const r = userId ? await zorgVoorGegevensVanCollega(userId) : await zorgVoorGegevens(kandidaatId!)
      await voegDocumentToe(r.id, { kind, ...bestand }, gebruiker.id)
    },
    [...(kandidaatId ? [`/beheer/werving/kandidaten/${kandidaatId}`] : []), ...(userId ? [`/beheer/medewerkers/${userId}`] : []), '/beheer/contracten'],
  )
}

/**
 * Alles van het moment van tekenen in een keer: de datum, de gescande
 * stukken, het IBAN en het handboek. Wat je nu niet hebt, kun je later met
 * hetzelfde formulier aanvullen; wat er al is, blijft staan.
 */
export async function getekendeStukken(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const contractId = tekst(formData, 'contractId')
  const contract = contractId ? await getContract(contractId) : null
  if (!contract) return { ok: false, error: 'Onbekend contract.' }
  if (contract.soort !== 'definitief') return { ok: false, error: 'Maak het contract eerst definitief: een pro forma wordt niet getekend.' }

  const op = datum(formData, 'getekendOp')
  const bestanden = {
    contract: await bestandUit(formData, 'contract'),
    avg_verklaring: await bestandUit(formData, 'avg'),
    loonheffing: await bestandUit(formData, 'loonheffing'),
    id_kopie: await bestandUit(formData, 'idkopie'),
  } as const
  const iban = tekst(formData, 'iban')
  const handboek = formData.has('handboek')
  if (!contract.signedOn && !op && Object.values(bestanden).some(Boolean)) {
    return { ok: false, error: 'Vul ook de datum van ondertekening in.' }
  }
  if (!op && !iban && !handboek && !Object.values(bestanden).some(Boolean)) {
    return { ok: false, error: 'Er is niets om vast te leggen. Kies een bestand, vul het IBAN in of zet een vinkje.' }
  }

  return veilig(
    async () => {
      if (op && !contract.signedOn) await markeerGetekend(contractId, op)
      const record = contract.userId ? await zorgVoorGegevensVanCollega(contract.userId) : await zorgVoorGegevens(contract.candidateId!)
      for (const [kind, bestand] of Object.entries(bestanden)) {
        if (bestand) await voegDocumentToe(record.id, { kind: kind as DocumentSoort, ...bestand }, gebruiker.id)
      }
      if (iban) await werkIbanBij(record.id, iban, tekst(formData, 'tenaamstelling') || null)
      if (handboek && !contract.handbookGivenOn) await markeerHandboekOntvangen(contractId, op ?? contract.signedOn ?? new Date())
    },
    [
      `/beheer/contracten/${contractId}`,
      ...(contract.candidateId ? [`/beheer/werving/kandidaten/${contract.candidateId}`, `/beheer/werving/kandidaten/${contract.candidateId}/indiensttreding`] : []),
    ],
  )
}

/* --- Persoonsgegevens van een collega ------------------------------------- */

const collegaPad = (id: string) => `/beheer/medewerkers/${id}`

export async function collegaDocument(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }
  const bestand = await bestandUit(formData, 'bestand')
  if (!bestand) return { ok: false, error: 'Kies een bestand.' }
  const soort = tekst(formData, 'soort')
  const kind: DocumentSoort = soort in DOCUMENT_LABELS ? (soort as DocumentSoort) : 'overig'
  return veilig(async () => {
    const r = await zorgVoorGegevensVanCollega(userId)
    await voegDocumentToe(r.id, { kind, ...bestand }, gebruiker.id)
  }, [collegaPad(userId)])
}

export async function collegaGegevensOpslaan(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }
  return veilig(async () => {
    const r = await zorgVoorGegevensVanCollega(userId)
    await slaGegevensOp(r.id, {
      officialFirstNames: tekst(formData, 'officieleVoornamen'),
      infix: tekst(formData, 'tussenvoegsel'),
      lastName: tekst(formData, 'achternaam'),
      birthDate: datum(formData, 'geboortedatum'),
      birthPlace: tekst(formData, 'geboorteplaats'),
      addressLine: tekst(formData, 'adres'),
      postalCode: tekst(formData, 'postcode'),
      city: tekst(formData, 'woonplaats'),
      iban: tekst(formData, 'iban'),
      accountHolder: tekst(formData, 'tenaamstelling'),
    })
  }, [collegaPad(userId)])
}

export async function collegaDoorgegeven(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }
  return veilig(async () => {
    const r = await zorgVoorGegevensVanCollega(userId)
    await markeerDoorgegeven(r.id, gebruiker.id, tekst(formData, 'terug') !== '1')
  }, [collegaPad(userId)])
}
