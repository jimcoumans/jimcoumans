'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import {
  zetWachtwoord,
  wisWachtwoord,
  controleerInlog,
  WachtwoordError,
} from '@/lib/wachtwoord'
import type { ActionResult } from './actions'
import { vergeet } from '@/lib/cache'

/* -------------------------------------------------------------------------
   Je wachtwoord zetten of wijzigen.

   Je eigen wachtwoord wijzigen vraagt om je huidige wachtwoord — anders kan
   iemand die even achter een openstaande laptop zit het overnemen.

   Een beheerder kan er een zetten voor een collega die niet meer binnenkomt.
   Zonder die mogelijkheid ben je afhankelijk van werkende mail, en dat is
   precies waar dit hele scherm uit voortkomt.
   ------------------------------------------------------------------------- */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    // Er is iets gewijzigd, dus het onthouden dashboard klopt niet meer.
    // Weggooien is hier het goede antwoord: bijwerken zou betekenen dat je
    // per actie moet weten welke cijfers erdoor veranderen, en dat vergeet
    // iemand een keer. Opnieuw ophalen kost een seconde; een verkeerd cijfer
    // op een dashboard kost vertrouwen.
    vergeet()
    return { ok: true }
  } catch (error) {
    if (error instanceof WachtwoordError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[wachtwoord] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '')

export async function wijzigEigenWachtwoord(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const nieuw = tekst(formData, 'nieuw')
  const herhaal = tekst(formData, 'herhaal')
  if (nieuw !== herhaal) {
    return { ok: false, error: 'De twee wachtwoorden zijn niet hetzelfde.' }
  }

  /*
   * Had je al een wachtwoord, dan moet je het huidige meegeven. Had je er nog
   * geen, dan ben je hier gekomen via een inloglink en is die link het bewijs
   * dat je bij dit adres kunt.
   */
  const huidig = tekst(formData, 'huidig')
  if (huidig !== '') {
    const uitkomst = await controleerInlog(staff.email, huidig)
    if (uitkomst.status !== 'ok') {
      return { ok: false, error: 'Je huidige wachtwoord klopt niet.' }
    }
  } else if (formData.get('heeftAl') === 'ja') {
    return { ok: false, error: 'Vul je huidige wachtwoord in.' }
  }

  return veilig(async () => {
    await zetWachtwoord(staff.id, nieuw)
    revalidatePath(`/beheer/medewerkers/${staff.id}`)
  })
}

export async function zetWachtwoordVoorCollega(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  if (staff.role !== 'admin') {
    return { ok: false, error: 'Alleen een beheerder kan een wachtwoord voor een ander zetten.' }
  }

  const userId = tekst(formData, 'userId').trim()
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  return veilig(async () => {
    await zetWachtwoord(userId, tekst(formData, 'nieuw'))
    revalidatePath(`/beheer/medewerkers/${userId}`)
  })
}

export async function haalWachtwoordWeg(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  const userId = tekst(formData, 'userId').trim()
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  if (userId !== staff.id && staff.role !== 'admin') {
    return { ok: false, error: 'Alleen een beheerder kan dit bij een ander weghalen.' }
  }

  return veilig(async () => {
    await wisWachtwoord(userId)
    revalidatePath(`/beheer/medewerkers/${userId}`)
  })
}
