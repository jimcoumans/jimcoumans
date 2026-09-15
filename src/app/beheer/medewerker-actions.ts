'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { parseContractUren, setHourlyCost, updateTeamlid, TeamError } from '@/lib/team'
import { volledigeNaam, type Aanhef } from '@/lib/namen'

const AANHEF_WAARDEN: readonly Aanhef[] = ['heer', 'mevrouw', 'neutraal']
import type { ActionResult } from './actions'

/* -------------------------------------------------------------------------
   Acties op het medewerkerprofiel.

   Het profiel en de uurkostprijs zijn met opzet twee aparte acties. Wat een
   uur van iemand kost mag alleen een beheerder zien en wijzigen; de rest van
   het profiel houdt de collega zelf bij. Eén formulier zou betekenen dat het
   hele profiel achter beheerdersrechten verdwijnt.
   ------------------------------------------------------------------------- */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof TeamError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[medewerker] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

/** Leeg veld betekent "niet ingevuld", niet "nul". */
function getal(f: FormData, n: string): number | null {
  const waarde = tekst(f, n)
  if (waarde === '') return null
  const g = Number(waarde)
  return Number.isFinite(g) ? Math.trunc(g) : null
}

/**
 * Een datumveld uit de browser komt als 2024-03-01 binnen.
 *
 * Bewust op middag gezet: op middernacht schuift een datum in een andere
 * tijdzone een dag terug, en dan blijkt iemand een dag eerder in dienst te
 * zijn gegaan dan op zijn contract staat.
 */
function datum(f: FormData, n: string): Date | null {
  const waarde = tekst(f, n)
  if (waarde === '') return null
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function bewerkMedewerkerprofiel(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const uren = tekst(formData, 'contracturen')
  const urenQuarters = uren === '' ? null : parseContractUren(uren)
  if (uren !== '' && urenQuarters === null) {
    return {
      ok: false,
      error: 'Contracturen begrijp ik niet. Schrijf het als een aantal uur per week, bijvoorbeeld 32 of 36,5.',
    }
  }

  return veilig(async () => {
    const delen = {
      firstName: tekst(formData, 'voornaam') || null,
      infix: tekst(formData, 'tussenvoegsel') || null,
      lastName: tekst(formData, 'achternaam') || null,
    }
    const aanhefWaarde = tekst(formData, 'aanhef')

    await updateTeamlid(userId, {
      name: volledigeNaam(delen) || null,
      ...delen,
      aanhef: AANHEF_WAARDEN.includes(aanhefWaarde as Aanhef)
        ? (aanhefWaarde as Aanhef)
        : null,
      jobTitle: tekst(formData, 'functie') || null,
      department: tekst(formData, 'afdeling') || null,
      phone: tekst(formData, 'telefoon') || null,
      mobile: tekst(formData, 'mobiel') || null,
      linkedinUrl: tekst(formData, 'linkedin') || null,
      birthDay: getal(formData, 'geboortedag'),
      birthMonth: getal(formData, 'geboortemaand'),
      birthYear: getal(formData, 'geboortejaar'),
      startedOn: datum(formData, 'indienst'),
      endedOn: datum(formData, 'uitdienst'),
      contractHoursPerWeekQuarters: urenQuarters,
      notes: tekst(formData, 'notities') || null,
    })

    revalidatePath('/beheer/medewerkers')
    revalidatePath(`/beheer/medewerkers/${userId}`)
    revalidatePath('/beheer/portfolio')
  })
}

/** Alleen een beheerder: dit ligt te dicht tegen salaris aan. */
export async function bewerkUurkostprijs(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  if (staff.role !== 'admin') {
    return { ok: false, error: 'Alleen een beheerder kan de uurkostprijs aanpassen.' }
  }

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const bedrag = tekst(formData, 'kostprijs')
  let cents: number | null = null
  if (bedrag !== '') {
    cents = parseAmountToCents(bedrag)
    if (cents === null) {
      return { ok: false, error: 'Dat bedrag begrijp ik niet. Schrijf het als 42,50.' }
    }
  }

  return veilig(async () => {
    await setHourlyCost(userId, cents)
    revalidatePath(`/beheer/medewerkers/${userId}`)
  })
}
