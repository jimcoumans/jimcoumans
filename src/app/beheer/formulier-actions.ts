'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import {
  FormulierError,
  antwoordenUitFormData,
  geefVrij,
  getFormulier,
  heropen,
  maakFormulier,
  maakKlantlink,
  rondAf,
  slaOp,
  wisFormulier,
  type Soort,
} from '@/lib/formulieren'
import type { ActionResult } from './actions'

/* Acties voor formulieren in het klantdossier. Elke actie begint met
   requireStaff(): een server action is een publiek endpoint. */

const SOORTEN: Soort[] = ['vragenlijst', 'quickscan', 'intake']

async function veilig(id: string, fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    const f = await getFormulier(id)
    revalidatePath(`/beheer/formulieren/${id}`)
    if (f) revalidatePath(`/beheer/klanten/${f.organisatie.slug}`)
    return { ok: true }
  } catch (error) {
    if (error instanceof FormulierError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[formulieren] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

export async function nieuwFormulier(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const soort = String(formData.get('soort') ?? '') as Soort
  if (!SOORTEN.includes(soort)) return { ok: false, error: 'Kies een formulier.' }
  let id: string
  try {
    const f = await maakFormulier({ organizationId: String(formData.get('organizationId') ?? ''), soort, userId: user.id })
    id = f.id
  } catch (error) {
    if (error instanceof FormulierError) return { ok: false, error: error.message }
    throw error
  }
  redirect(`/beheer/formulieren/${id}`)
}

/** Opslaan, en met het vinkje "afronden" in één keer afronden. */
export async function slaFormulierOp(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const id = String(formData.get('id') ?? '')
  const f = await getFormulier(id)
  if (!f) return { ok: false, error: 'Dit formulier bestaat niet meer.' }
  return veilig(id, async () => {
    await slaOp(id, antwoordenUitFormData(f.formulier.soort, formData), user.id)
    if (formData.get('afronden') === 'on') await rondAf(id, user.id)
  })
}

export async function maakLink(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = String(formData.get('id') ?? '')
  return veilig(id, async () => {
    await maakKlantlink(id, formData.get('opnieuw') === '1')
  })
}

export async function geefScanVrij(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const id = String(formData.get('id') ?? '')
  return veilig(id, () => geefVrij(id, user.id))
}

export async function heropenFormulier(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const id = String(formData.get('id') ?? '')
  return veilig(id, () => heropen(id, user.id))
}

export async function verwijderFormulier(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = String(formData.get('id') ?? '')
  const f = await getFormulier(id)
  try {
    await wisFormulier(id)
  } catch (error) {
    if (error instanceof FormulierError) return { ok: false, error: error.message }
    throw error
  }
  if (f) redirect(`/beheer/klanten/${f.organisatie.slug}?tab=formulieren`)
  return { ok: true }
}
