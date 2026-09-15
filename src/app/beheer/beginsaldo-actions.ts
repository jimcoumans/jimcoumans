'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { zetBeginsaldos, BeginsaldoError, type SaldoDoel } from '@/lib/beginsaldo'
import { LedgerError } from '@/lib/ledger'
import type { ActionResult } from './actions'

/**
 * Slaat de ingevulde beginsaldo's op.
 *
 * Lege velden slaan we over. Dat is het verschil tussen "deze klant staat op
 * nul" en "deze klant heb ik nog niet nagekeken", en dat verschil moet je
 * kunnen maken als je 38 klanten in meerdere zittingen doorloopt.
 */
export async function zetBeginsaldo(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const omschrijving = String(formData.get('omschrijving') ?? '').trim()

  const doelen: SaldoDoel[] = []
  for (const [naam, waarde] of formData.entries()) {
    if (!naam.startsWith('saldo-')) continue

    const ruw = String(waarde).trim()
    if (ruw === '') continue

    // parseAmountToCents weigert negatieve bedragen; een saldo in de min is
    // hier juist normaal, dus het minteken halen we er zelf af.
    const negatief = ruw.startsWith('-')
    const cents = parseAmountToCents(negatief ? ruw.slice(1).trim() : ruw)
    if (cents === null) {
      return {
        ok: false,
        error: `"${ruw}" begrijp ik niet als bedrag. Schrijf het als 1250,00 of -340,50.`,
      }
    }

    doelen.push({ walletId: naam.slice('saldo-'.length), doelCents: negatief ? -cents : cents })
  }

  if (doelen.length === 0) {
    return { ok: false, error: 'Vul bij minstens één klant een saldo in.' }
  }

  try {
    const resultaat = await zetBeginsaldos(doelen, {
      omschrijving,
      createdByUserId: staff.id,
    })

    revalidatePath('/beheer/beginsaldo')
    revalidatePath('/beheer/klanten')
    revalidatePath('/beheer')

    if (resultaat.geboekt === 0) {
      return { ok: false, error: 'Deze saldo’s stonden er al zo in; er is niets geboekt.' }
    }
    return { ok: true }
  } catch (error) {
    if (error instanceof BeginsaldoError || error instanceof LedgerError) {
      return { ok: false, error: error.message }
    }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[beginsaldo] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}
