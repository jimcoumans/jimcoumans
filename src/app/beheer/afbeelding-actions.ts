'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { bewaarAfbeelding, wisAfbeelding, AfbeeldingError, type Doel } from '@/lib/afbeeldingen'
import type { ActionResult } from './actions'

/* Logo's en profielfoto's uploaden. */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof AfbeeldingError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[afbeelding] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

function leesDoel(formData: FormData): Doel | null {
  const soort = tekst(formData, 'soort')
  const id = tekst(formData, 'doelId')
  if (!id) return null
  if (soort === 'klant' || soort === 'contact' || soort === 'medewerker') {
    return { soort, id }
  }
  return null
}

function ververs(formData: FormData) {
  const slug = tekst(formData, 'slug')
  if (slug) revalidatePath(`/beheer/klanten/${slug}`)
  const userId = tekst(formData, 'doelId')
  revalidatePath(`/beheer/medewerkers/${userId}`)
  revalidatePath('/beheer/klanten')
  revalidatePath('/beheer/contactpersonen')
  revalidatePath('/beheer/medewerkers')
}

export async function uploadAfbeelding(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const doel = leesDoel(formData)
  if (!doel) return { ok: false, error: 'Onbekend doel voor deze afbeelding.' }

  const bestand = formData.get('bestand')
  if (!(bestand instanceof File) || bestand.size === 0) {
    return { ok: false, error: 'Kies een bestand.' }
  }

  return veilig(async () => {
    await bewaarAfbeelding(bestand, doel, staff.id)
    ververs(formData)
  })
}

export async function verwijderAfbeelding(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const doel = leesDoel(formData)
  if (!doel) return { ok: false, error: 'Onbekend doel voor deze afbeelding.' }

  return veilig(async () => {
    await wisAfbeelding(doel)
    ververs(formData)
  })
}
