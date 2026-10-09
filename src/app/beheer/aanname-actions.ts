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
  wisDocument,
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
      ...(contract.candidateId ? [`/beheer/werving/kandidaten/${contract.candidateId}`, `/beheer/werving/kandidaten/${contract.candidateId}/indiensttreding`] : []),
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
    ...(contract.candidateId ? [`/beheer/werving/kandidaten/${contract.candidateId}`, `/beheer/werving/kandidaten/${contract.candidateId}/indiensttreding`] : []),
    ...(contract.userId ? [`/beheer/medewerkers/${contract.userId}`] : []),
  ])
}

/* --- Het dossier: persoonsgegevens en documenten ------------------------- */

/* Een set acties voor een kandidaat en een collega: het formulier stuurt
   kandidaatId of userId mee. Zo werkt het dossierblok overal hetzelfde. */

type Van = { kandidaatId: string } | { userId: string }

function vanUit(formData: FormData): Van | null {
  const userId = tekst(formData, 'userId')
  if (userId) return { userId }
  const kandidaatId = tekst(formData, 'kandidaatId')
  return kandidaatId ? { kandidaatId } : null
}

const ONBEKEND: ActionResult = { ok: false, error: 'Onbekend bij wie dit hoort.' }

const recordVan = (v: Van) => ('userId' in v ? zorgVoorGegevensVanCollega(v.userId) : zorgVoorGegevens(v.kandidaatId))

async function inDossier(v: Van, fn: (recordId: string) => Promise<void>): Promise<ActionResult> {
  const r = await veilig(
    async () => fn((await recordVan(v)).id),
    'userId' in v ? [`/beheer/medewerkers/${v.userId}`] : [`/beheer/werving/kandidaten/${v.kandidaatId}`, `/beheer/werving/kandidaten/${v.kandidaatId}/indiensttreding`],
  )
  // Een collega die via werving kwam, staat ook nog bij de kandidaat: die pagina's mee verversen.
  if (r.ok) {
    revalidatePath('/beheer/werving/kandidaten/[id]', 'page')
    revalidatePath('/beheer/werving/kandidaten/[id]/indiensttreding', 'page')
  }
  return r
}

export async function dossierGegevensOpslaan(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const v = vanUit(formData)
  if (!v) return ONBEKEND
  return inDossier(v, (id) =>
    slaGegevensOp(id, {
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
    }),
  )
}

/** Alleen het IBAN, voor de regel bij de getekende stukken. */
export async function dossierIban(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const v = vanUit(formData)
  if (!v) return ONBEKEND
  const iban = tekst(formData, 'iban')
  if (!iban) return { ok: false, error: 'Vul het IBAN in.' }
  return inDossier(v, (id) => werkIbanBij(id, iban, tekst(formData, 'tenaamstelling') || null))
}

export async function dossierDocument(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const v = vanUit(formData)
  if (!v) return ONBEKEND
  const bestand = await bestandUit(formData, 'bestand')
  if (!bestand) return { ok: false, error: 'Kies eerst een bestand.' }
  const soort = tekst(formData, 'soort')
  const kind: DocumentSoort = soort in DOCUMENT_LABELS ? (soort as DocumentSoort) : 'overig'
  return inDossier(v, (id) => voegDocumentToe(id, { kind, ...bestand }, gebruiker.id))
}

export async function dossierDocumentWissen(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const v = vanUit(formData)
  if (!v) return ONBEKEND
  const documentId = tekst(formData, 'documentId')
  return inDossier(v, (id) => wisDocument(documentId, id))
}

export async function dossierDoorgegeven(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const v = vanUit(formData)
  if (!v) return ONBEKEND
  return inDossier(v, (id) => markeerDoorgegeven(id, gebruiker.id, tekst(formData, 'terug') !== '1'))
}
