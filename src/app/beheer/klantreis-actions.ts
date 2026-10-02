'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { zetMijlpaal, rondAfTotEnMet, KlantreisError } from '@/lib/klantreis'
import { wijzigProfiel, PROFIEL_VELDEN, type ProfielVeld } from '@/lib/klantprofiel'
import type { ActionResult } from './actions'

/* Acties voor de klantreis en het klantprofiel. Elke actie begint met
   requireStaff(): een server action is een publiek endpoint. */

const tekst = (f: FormData, naam: string) => String(f.get(naam) ?? '').trim()

async function veilig(slug: string, fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    if (slug) revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/klanten')
    return { ok: true }
  } catch (error) {
    if (error instanceof KlantreisError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[klantreis] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

/** Een mijlpaal afvinken of weer openzetten. */
export async function vinkMijlpaal(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  return veilig(tekst(formData, 'slug'), () =>
    zetMijlpaal(tekst(formData, 'organizationId'), tekst(formData, 'key'), tekst(formData, 'gedaan') === '1', user.id),
  )
}

/** Alles tot en met deze stap afvinken. */
export async function rondStapAf(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  return veilig(tekst(formData, 'slug'), () => rondAfTotEnMet(tekst(formData, 'organizationId'), tekst(formData, 'nr'), user.id))
}

/** Een onderdeel van het klantprofiel opslaan. Alleen de velden die in het formulier staan. */
export async function wijzigKlantprofiel(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  return veilig(tekst(formData, 'slug'), async () => {
    const patch: Partial<Record<ProfielVeld, string | null>> = {}
    for (const veld of PROFIEL_VELDEN) {
      if (formData.has(veld)) patch[veld] = tekst(formData, veld) || null
    }
    await wijzigProfiel(tekst(formData, 'organizationId'), patch, user.id)
  })
}
