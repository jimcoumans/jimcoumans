'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { createActivity, deleteActivity, ActivityError } from '@/lib/tijdlijn'
import type { Activity } from '@/db/schema'
import type { ActionResult } from './actions'
import { vergeet } from '@/lib/cache'

/* Notities, gesprekken en afspraken op de tijdlijn van een klant. */

const SOORTEN: readonly Activity['kind'][] = ['note', 'call', 'meeting', 'email', 'task']

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
    if (error instanceof ActivityError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[tijdlijn] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

export async function nieuweNotitie(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const organizationId = tekst(formData, 'organizationId')
  const slug = tekst(formData, 'slug')
  if (!organizationId) return { ok: false, error: 'Onbekende klant.' }

  const kind = tekst(formData, 'soort') as Activity['kind']
  if (!SOORTEN.includes(kind)) return { ok: false, error: 'Kies wat voor moment dit was.' }

  // Op de middag: om middernacht schuift een datum in een andere tijdzone een
  // dag terug, en dan staat het gesprek op de verkeerde dag.
  const datum = tekst(formData, 'datum')
  const wanneer = datum === '' ? new Date() : new Date(`${datum}T12:00:00`)
  if (Number.isNaN(wanneer.getTime())) return { ok: false, error: 'De datum is niet geldig.' }

  return veilig(async () => {
    await createActivity({
      organizationId,
      kind,
      subject: tekst(formData, 'titel'),
      body: tekst(formData, 'tekst') || null,
      contactId: tekst(formData, 'contact') || null,
      userId: staff.id,
      occurredAt: wanneer,
    })
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

export async function wisNotitie(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'activityId')
  const slug = tekst(formData, 'slug')
  if (!id) return { ok: false, error: 'Onbekende notitie.' }

  return veilig(async () => {
    await deleteActivity(id)
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}
