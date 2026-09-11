'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { subscriptions, wallets } from '@/db/schema'
import { requireStaff } from '@/lib/auth'
import { LedgerError } from '@/lib/ledger'
import { runBilling } from '@/lib/billing'
import { parseAmountToCents } from '@/lib/money'
import { describeDbError } from '@/lib/db-errors'
import type { ActionResult } from './actions'

/* Acties voor abonnementen. Elke actie begint met requireStaff(). */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof LedgerError) return { ok: false, error: error.message }

    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }

    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error

    console.error('[abonnementen] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

function leesDatum(raw: string): Date | null | 'fout' {
  const waarde = raw.trim()
  if (waarde === '') return null
  const parsed = new Date(waarde)
  return Number.isNaN(parsed.getTime()) ? 'fout' : parsed
}

/** Nieuw abonnement bij een klant. */
export async function nieuwAbonnement(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = String(formData.get('organizationId') ?? '')
  const walletId = String(formData.get('walletId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const naam = String(formData.get('naam') ?? '').trim()

  if (!organizationId || !walletId) return { ok: false, error: 'Onbekende klant of wallet.' }
  if (naam.length < 2) return { ok: false, error: 'Vul een naam voor het abonnement in.' }

  const bedrag = parseAmountToCents(String(formData.get('bedrag') ?? ''))
  if (bedrag === null || bedrag <= 0) {
    return { ok: false, error: 'Vul een maandbedrag boven nul in, exclusief btw.' }
  }

  const dag = Number.parseInt(String(formData.get('facturatiedag') ?? '2'), 10)
  if (!Number.isInteger(dag) || dag < 1 || dag > 28) {
    return {
      ok: false,
      error: 'De facturatiedag moet tussen 1 en 28 liggen, zodat de dag in elke maand bestaat.',
    }
  }

  const btw = Number.parseInt(String(formData.get('btw') ?? '21'), 10)
  if (!Number.isInteger(btw) || btw < 0 || btw > 100) {
    return { ok: false, error: 'Het btw-percentage moet tussen 0 en 100 liggen.' }
  }

  const start = leesDatum(String(formData.get('startdatum') ?? ''))
  if (start === 'fout') return { ok: false, error: 'De startdatum is niet geldig.' }
  if (start === null) return { ok: false, error: 'Vul een startdatum in.' }

  const eind = leesDatum(String(formData.get('einddatum') ?? ''))
  if (eind === 'fout') return { ok: false, error: 'De einddatum is niet geldig.' }
  if (eind !== null && eind < start) {
    return { ok: false, error: 'De einddatum kan niet voor de startdatum liggen.' }
  }

  return veilig(async () => {
    // De wallet moet bij deze klant horen, anders zou het budget bij een
    // andere klant terechtkomen.
    const [wallet] = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(and(eq(wallets.id, walletId), eq(wallets.organizationId, organizationId)))
      .limit(1)

    if (!wallet) throw new LedgerError('Deze wallet hoort niet bij deze klant.')

    await db.insert(subscriptions).values({
      organizationId,
      walletId,
      name: naam,
      description: String(formData.get('omschrijving') ?? '').trim() || null,
      amountExclVatCents: bedrag,
      vatRatePercent: btw,
      billingDay: dag,
      startedOn: start,
      endsOn: eind,
      notes: String(formData.get('notities') ?? '').trim() || null,
    })

    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/abonnementen')
  })
}

/**
 * Past een abonnement aan. Bestaande facturen veranderen niet mee: een
 * nieuw bedrag geldt vanaf de volgende factuur.
 */
export async function wijzigAbonnement(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = String(formData.get('id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  if (!id) return { ok: false, error: 'Onbekend abonnement.' }

  const naam = String(formData.get('naam') ?? '').trim()
  if (naam.length < 2) return { ok: false, error: 'Vul een naam voor het abonnement in.' }

  const bedrag = parseAmountToCents(String(formData.get('bedrag') ?? ''))
  if (bedrag === null || bedrag <= 0) {
    return { ok: false, error: 'Vul een maandbedrag boven nul in, exclusief btw.' }
  }

  const dag = Number.parseInt(String(formData.get('facturatiedag') ?? '2'), 10)
  if (!Number.isInteger(dag) || dag < 1 || dag > 28) {
    return { ok: false, error: 'De facturatiedag moet tussen 1 en 28 liggen.' }
  }

  const eind = leesDatum(String(formData.get('einddatum') ?? ''))
  if (eind === 'fout') return { ok: false, error: 'De einddatum is niet geldig.' }

  return veilig(async () => {
    await db
      .update(subscriptions)
      .set({
        name: naam,
        description: String(formData.get('omschrijving') ?? '').trim() || null,
        amountExclVatCents: bedrag,
        billingDay: dag,
        endsOn: eind,
        notes: String(formData.get('notities') ?? '').trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))

    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/abonnementen')
  })
}

/** Abonnement aan, op pauze of gestopt zetten. */
export async function zetAbonnementStatus(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = String(formData.get('id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const status = String(formData.get('status') ?? '')

  if (!id) return { ok: false, error: 'Onbekend abonnement.' }
  if (!['active', 'paused', 'ended'].includes(status)) {
    return { ok: false, error: 'Onbekende status.' }
  }

  return veilig(async () => {
    await db
      .update(subscriptions)
      .set({
        status: status as 'active' | 'paused' | 'ended',
        updatedAt: new Date(),
        // Stopzetten zet ook de einddatum, zodat een latere heractivering
        // niet ineens alle tussenliggende maanden inhaalt.
        ...(status === 'ended' ? { endsOn: new Date() } : {}),
        // Weer aanzetten haalt de einddatum weg, anders blijft hij stil staan.
        ...(status === 'active' ? { endsOn: null } : {}),
      })
      .where(eq(subscriptions.id, id))

    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/abonnementen')
  })
}

/**
 * Draait de abonnementsrun met de hand.
 *
 * Handig om niet op de cron te hoeven wachten, en om na het aanzetten van
 * een abonnement direct het budget klaar te zetten. Dubbel factureren kan
 * niet: de database weigert een tweede factuur voor dezelfde periode.
 */
export async function factureerNu(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const alleen = String(formData.get('subscriptionId') ?? '') || undefined
  const slug = String(formData.get('slug') ?? '')

  return veilig(async () => {
    const rapport = await runBilling({ apply: true, onlySubscriptionId: alleen })

    if (rapport.fouten > 0) {
      const eerste = rapport.regels.find((r) => r.soort === 'fout')
      throw new LedgerError(
        `De run gaf ${rapport.fouten} ${rapport.fouten === 1 ? 'fout' : 'fouten'}: ${
          eerste?.toelichting ?? 'onbekend'
        }`,
      )
    }

    if (slug) revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/abonnementen')
    revalidatePath('/beheer/financieel')
  })
}
