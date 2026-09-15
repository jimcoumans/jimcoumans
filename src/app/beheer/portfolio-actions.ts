'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { setMarketingManager, setMonthlyTarget, PortfolioError } from '@/lib/portfolio'
import { addOwner, listOwners, makePrimaryOwner, removeOwner, OwnerError } from '@/lib/crm-owners'
import type { ActionResult } from './actions'

/* Acties voor het portfoliobord. Elke actie begint met requireStaff(). */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof PortfolioError || error instanceof OwnerError) {
      return { ok: false, error: error.message }
    }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[portfolio] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

/**
 * Zet een klant bij een marketing manager, of haalt hem uit alle kolommen.
 *
 * Dit verandert wie eerste aanspreekpartner is in organization_owners — het
 * bord heeft geen eigen toewijzing. Stond er al iemand anders, dan raakt die
 * de primaire rol kwijt maar blijft hij wel op de klant staan als hij er een
 * tweede rol had.
 */
export async function wijsKlantToe(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = tekst(formData, 'organizationId')
  const userId = tekst(formData, 'userId')

  if (!organizationId) return { ok: false, error: 'Onbekende klant.' }

  return veilig(async () => {
    const huidige = await listOwners(organizationId)

    // Naar "nog niet toegewezen" slepen: de primaire rol gaat eraf.
    if (userId === '') {
      const primair = huidige.find((o) => o.isPrimary)
      if (primair) await removeOwner(primair.id)
      revalidatePath('/beheer/portfolio')
      return
    }

    const bestaand = huidige.find((o) => o.userId === userId)
    if (bestaand) {
      // Stond al op deze klant; nu wordt hij de eerste aanspreekpartner.
      await makePrimaryOwner(bestaand.id)
    } else {
      await addOwner({ organizationId, userId, isPrimary: true })
    }

    revalidatePath('/beheer/portfolio')
    revalidatePath('/beheer/klanten')
  })
}

export async function wisselMarketingManager(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  if (staff.role !== 'admin') {
    return { ok: false, error: 'Alleen een beheerder kan portfolio-rollen wijzigen.' }
  }

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  return veilig(async () => {
    await setMarketingManager(userId, tekst(formData, 'manager') === 'ja')
    revalidatePath('/beheer/portfolio')
    revalidatePath('/beheer/medewerkers')
  })
}

export async function zetMaanddoel(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  if (staff.role !== 'admin') {
    return { ok: false, error: 'Alleen een beheerder kan maanddoelen instellen.' }
  }

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const raw = tekst(formData, 'doel')
  let cents: number | null = null
  if (raw !== '') {
    cents = parseAmountToCents(raw)
    if (cents === null || cents <= 0) {
      return { ok: false, error: `"${raw}" is geen geldig bedrag. Bijvoorbeeld: 20000,00` }
    }
  }

  return veilig(async () => {
    await setMonthlyTarget(userId, cents)
    revalidatePath('/beheer/portfolio')
    revalidatePath('/beheer/medewerkers')
  })
}
