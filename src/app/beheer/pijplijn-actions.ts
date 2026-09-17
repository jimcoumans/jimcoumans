'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { vergeet } from '@/lib/cache'
import {
  maakDeal,
  verplaatsDeal,
  zetVolgendeActie,
  winDeal,
  verliesDeal,
  heropenDeal,
  wisDeal,
  PijplijnError,
} from '@/lib/pijplijn'
import type { ActionResult } from './actions'

/* Acties voor de salespijplijn. Elke actie begint met requireStaff():
   een server action is een publiek endpoint. */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    vergeet()
    revalidatePath('/beheer/pijplijn')
    revalidatePath('/beheer')
    return { ok: true }
  } catch (error) {
    if (error instanceof PijplijnError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[pijplijn] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (formData: FormData, naam: string) => String(formData.get(naam) ?? '').trim()

/**
 * Een datum uit een `<input type="date">`.
 *
 * Op het middaguur en niet om middernacht: een datum zonder tijd wordt in
 * UTC uitgelegd, en dan schuift hij in een Nederlandse zomer een dag terug
 * op het scherm. Het middaguur ligt daar ruim buiten.
 */
function datum(formData: FormData, naam: string): Date | null {
  const waarde = tekst(formData, naam)
  if (waarde === '') return null
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function nieuweDeal(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = tekst(formData, 'organizationId')
  if (!organizationId) return { ok: false, error: 'Kies bij welk bedrijf deze deal hoort.' }

  const soort = tekst(formData, 'soort')
  const bedrag = tekst(formData, 'bedrag')

  let valueCents: number | null = null
  if (bedrag !== '') {
    const gelezen = parseAmountToCents(bedrag)
    if (gelezen === null) {
      return { ok: false, error: 'Het bedrag is niet te lezen. Schrijf het als 1600 of 1.600,00.' }
    }
    valueCents = gelezen
  }

  return veilig(async () => {
    await maakDeal({
      organizationId,
      title: tekst(formData, 'titel'),
      kind: soort === 'project' ? 'project' : 'retainer',
      valueCents,
      contactId: tekst(formData, 'contactId') || null,
      ownerUserId: tekst(formData, 'eigenaar') || null,
      source: tekst(formData, 'bron') || null,
      expectedCloseOn: datum(formData, 'sluitdatum'),
      nextAction: tekst(formData, 'actie') || null,
      nextActionOn: datum(formData, 'actiedatum'),
      notes: tekst(formData, 'notities') || null,
    })
  })
}

export async function dealNaarFase(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const dealId = tekst(formData, 'dealId')
  const stageId = tekst(formData, 'stageId')
  if (!dealId || !stageId) return { ok: false, error: 'Onbekende deal of fase.' }

  return veilig(() => verplaatsDeal(dealId, stageId))
}

export async function dealVolgendeActie(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const dealId = tekst(formData, 'dealId')
  if (!dealId) return { ok: false, error: 'Onbekende deal.' }

  return veilig(() =>
    zetVolgendeActie(dealId, tekst(formData, 'actie') || null, datum(formData, 'actiedatum')),
  )
}

export async function dealGewonnen(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const dealId = tekst(formData, 'dealId')
  if (!dealId) return { ok: false, error: 'Onbekende deal.' }

  return veilig(async () => {
    await winDeal(dealId)
    // Het bedrijf is nu klant, dus de klantenlijst en het CRM kloppen niet meer.
    revalidatePath('/beheer/klanten')
    revalidatePath('/beheer/crm')
  })
}

export async function dealVerloren(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const dealId = tekst(formData, 'dealId')
  if (!dealId) return { ok: false, error: 'Onbekende deal.' }

  return veilig(() => verliesDeal(dealId, tekst(formData, 'reden')))
}

export async function dealHeropenen(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const dealId = tekst(formData, 'dealId')
  if (!dealId) return { ok: false, error: 'Onbekende deal.' }

  return veilig(() => heropenDeal(dealId))
}

export async function dealVerwijderen(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const dealId = tekst(formData, 'dealId')
  if (!dealId) return { ok: false, error: 'Onbekende deal.' }

  return veilig(() => wisDeal(dealId))
}
