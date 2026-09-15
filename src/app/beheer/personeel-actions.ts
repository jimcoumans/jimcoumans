'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { parseContractUren } from '@/lib/team'
import {
  addContract,
  verwijderContract,
  addSalaris,
  verwijderSalaris,
  addDossierRegel,
  verwijderDossierRegel,
  addMiddel,
  leverMiddelIn,
  verwijderMiddel,
  PersoneelError,
} from '@/lib/personeel'
import type { EmploymentContract, DossierEntry, CompanyAsset } from '@/db/schema'
import type { ActionResult } from './actions'

/* -------------------------------------------------------------------------
   Acties op het personeelsdossier.

   Alles hier is alleen voor beheerders. Salarissen, contracten en
   dossierregels horen niet op een scherm dat het hele team kan openslaan, en
   dat is geen kwestie van de knop verstoppen: elke actie controleert het zelf.
   ------------------------------------------------------------------------- */

async function beheerder() {
  const staff = await requireStaff()
  if (staff.role !== 'admin') {
    throw new PersoneelError('Alleen een beheerder kan het personeelsdossier bijwerken.')
  }
  return staff
}

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof PersoneelError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[personeel] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

/** Op de middag: om middernacht schuift een datum in een andere tijdzone terug. */
function datum(f: FormData, n: string): Date | null {
  const waarde = tekst(f, n)
  if (waarde === '') return null
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function ververs(userId: string) {
  revalidatePath(`/beheer/medewerkers/${userId}`)
  revalidatePath('/beheer/medewerkers')
}

/* --- Contracten ---------------------------------------------------------- */

const CONTRACT_TYPES: readonly EmploymentContract['type'][] = [
  'bepaalde_tijd',
  'onbepaalde_tijd',
  'oproep',
  'stage',
  'zzp',
]

export async function nieuwContract(formData: FormData): Promise<ActionResult> {
  const staff = await beheerder()

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const type = tekst(formData, 'type') as EmploymentContract['type']
  if (!CONTRACT_TYPES.includes(type)) return { ok: false, error: 'Kies een soort contract.' }

  const start = datum(formData, 'startdatum')
  if (start === null) return { ok: false, error: 'Vul een startdatum in.' }

  const uren = tekst(formData, 'uren')
  const urenQuarters = uren === '' ? null : parseContractUren(uren)
  if (uren !== '' && urenQuarters === null) {
    return { ok: false, error: 'De contracturen begrijp ik niet. Schrijf ze als 32 of 36,5.' }
  }

  return veilig(async () => {
    await addContract({
      userId,
      type,
      startedOn: start,
      endsOn: datum(formData, 'einddatum'),
      hoursPerWeekQuarters: urenQuarters,
      jobTitle: tekst(formData, 'functie') || null,
      signedOn: datum(formData, 'getekend'),
      notes: tekst(formData, 'notities') || null,
      createdByUserId: staff.id,
    })
    ververs(userId)
  })
}

export async function wisContract(formData: FormData): Promise<ActionResult> {
  await beheerder()
  const id = tekst(formData, 'contractId')
  const userId = tekst(formData, 'userId')
  if (!id) return { ok: false, error: 'Onbekend contract.' }

  return veilig(async () => {
    await verwijderContract(id)
    ververs(userId)
  })
}

/* --- Salaris ------------------------------------------------------------- */

export async function nieuwSalaris(formData: FormData): Promise<ActionResult> {
  const staff = await beheerder()

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const bedrag = parseAmountToCents(tekst(formData, 'bedrag'))
  if (bedrag === null || bedrag <= 0) {
    return { ok: false, error: 'Vul een brutobedrag per maand in, bijvoorbeeld 3200,00.' }
  }

  const ingang = datum(formData, 'ingangsdatum')
  if (ingang === null) return { ok: false, error: 'Vul een ingangsdatum in.' }

  const vakantiegeld = Number.parseInt(tekst(formData, 'vakantiegeld') || '8', 10)
  if (!Number.isInteger(vakantiegeld) || vakantiegeld < 0 || vakantiegeld > 100) {
    return { ok: false, error: 'Het vakantiegeld moet tussen 0 en 100 procent liggen.' }
  }

  const uren = tekst(formData, 'uren')
  const urenQuarters = uren === '' ? null : parseContractUren(uren)
  if (uren !== '' && urenQuarters === null) {
    return { ok: false, error: 'Het aantal uren begrijp ik niet. Schrijf het als 32 of 36,5.' }
  }

  return veilig(async () => {
    await addSalaris({
      userId,
      grossMonthlyCents: bedrag,
      basedOnHoursQuarters: urenQuarters,
      holidayAllowancePercent: vakantiegeld,
      effectiveFrom: ingang,
      reason: tekst(formData, 'reden') || null,
      createdByUserId: staff.id,
    })
    ververs(userId)
  })
}

export async function wisSalaris(formData: FormData): Promise<ActionResult> {
  await beheerder()
  const id = tekst(formData, 'salarisId')
  const userId = tekst(formData, 'userId')
  if (!id) return { ok: false, error: 'Onbekende salarisregel.' }

  return veilig(async () => {
    await verwijderSalaris(id)
    ververs(userId)
  })
}

/* --- Dossier ------------------------------------------------------------- */

const DOSSIER_SOORTEN: readonly DossierEntry['kind'][] = [
  'gesprek',
  'afspraak',
  'opleiding',
  'waarschuwing',
  'mijlpaal',
  'overig',
]

export async function nieuweDossierRegel(formData: FormData): Promise<ActionResult> {
  const staff = await beheerder()

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const kind = tekst(formData, 'soort') as DossierEntry['kind']
  if (!DOSSIER_SOORTEN.includes(kind)) return { ok: false, error: 'Kies een soort regel.' }

  const subject = tekst(formData, 'titel')
  if (subject.length < 2) return { ok: false, error: 'Geef de regel een korte titel.' }

  const wanneer = datum(formData, 'datum') ?? new Date()

  return veilig(async () => {
    await addDossierRegel({
      userId,
      kind,
      subject,
      body: tekst(formData, 'tekst') || null,
      happenedOn: wanneer,
      createdByUserId: staff.id,
    })
    ververs(userId)
  })
}

export async function wisDossierRegel(formData: FormData): Promise<ActionResult> {
  await beheerder()
  const id = tekst(formData, 'regelId')
  const userId = tekst(formData, 'userId')
  if (!id) return { ok: false, error: 'Onbekende dossierregel.' }

  return veilig(async () => {
    await verwijderDossierRegel(id)
    ververs(userId)
  })
}

/* --- Bedrijfsmiddelen ---------------------------------------------------- */

const MIDDEL_SOORTEN: readonly CompanyAsset['kind'][] = [
  'laptop',
  'telefoon',
  'auto',
  'sleutel',
  'toegangspas',
  'overig',
]

export async function nieuwMiddel(formData: FormData): Promise<ActionResult> {
  await beheerder()

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const kind = tekst(formData, 'soort') as CompanyAsset['kind']
  if (!MIDDEL_SOORTEN.includes(kind)) return { ok: false, error: 'Kies een soort bedrijfsmiddel.' }

  const label = tekst(formData, 'omschrijving')
  if (label.length < 2) {
    return { ok: false, error: 'Geef het bedrijfsmiddel een naam, bijvoorbeeld "MacBook Pro 14".' }
  }

  return veilig(async () => {
    await addMiddel({
      userId,
      kind,
      label,
      serial: tekst(formData, 'serienummer') || null,
      handedOutOn: datum(formData, 'uitgegeven') ?? new Date(),
      notes: tekst(formData, 'notities') || null,
    })
    ververs(userId)
  })
}

export async function leverIn(formData: FormData): Promise<ActionResult> {
  await beheerder()
  const id = tekst(formData, 'middelId')
  const userId = tekst(formData, 'userId')
  if (!id) return { ok: false, error: 'Onbekend bedrijfsmiddel.' }

  return veilig(async () => {
    await leverMiddelIn(id, datum(formData, 'ingeleverd') ?? new Date())
    ververs(userId)
  })
}

export async function wisMiddel(formData: FormData): Promise<ActionResult> {
  await beheerder()
  const id = tekst(formData, 'middelId')
  const userId = tekst(formData, 'userId')
  if (!id) return { ok: false, error: 'Onbekend bedrijfsmiddel.' }

  return veilig(async () => {
    await verwijderMiddel(id)
    ververs(userId)
  })
}
