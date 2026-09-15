'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { LedgerError } from '@/lib/ledger'
import { crediteerFactuur, verwijderConceptfactuur, wijzigFactuur } from '@/lib/invoices'
import type { ActionResult } from './actions'

/* -------------------------------------------------------------------------
   Een factuur rechtzetten.

   Er zijn drie soorten fouten en drie verschillende antwoorden:

   - Verkeerd bedrag → crediteren en opnieuw factureren. Het bedrag zelf is
     niet te wijzigen, want er hangt een bijschrijving aan die precies dat
     bedrag groot is.
   - Verkeerd nummer, datum of omschrijving → gewoon wijzigen.
   - Per ongeluk aangemaakt en nog nergens in meegeteld → weg ermee.
   ------------------------------------------------------------------------- */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof LedgerError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[factuur] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

function datum(f: FormData, n: string): Date | null {
  const waarde = tekst(f, n)
  if (waarde === '') return null
  // Op de middag: om middernacht schuift een datum in een andere tijdzone
  // een dag terug, en dan staat de factuur op de verkeerde dag.
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function crediteerFactuurActie(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const invoiceId = tekst(formData, 'invoiceId')
  const slug = tekst(formData, 'slug')
  const reden = tekst(formData, 'reden')

  if (!invoiceId) return { ok: false, error: 'Onbekende factuur.' }
  if (reden.length < 3) {
    return {
      ok: false,
      error: 'Vul in waarom deze factuur gecrediteerd wordt. Dat komt in het grootboek te staan.',
    }
  }

  return veilig(async () => {
    await crediteerFactuur(invoiceId, { reden, createdByUserId: staff.id })
    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/financieel')
    revalidatePath('/facturen')
  })
}

export async function wijzigFactuurActie(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const invoiceId = tekst(formData, 'invoiceId')
  const slug = tekst(formData, 'slug')
  if (!invoiceId) return { ok: false, error: 'Onbekende factuur.' }

  const uitgifte = datum(formData, 'factuurdatum')
  if (uitgifte === null) return { ok: false, error: 'Vul een geldige factuurdatum in.' }

  return veilig(async () => {
    await wijzigFactuur(invoiceId, {
      number: tekst(formData, 'nummer'),
      description: tekst(formData, 'omschrijving') || null,
      issuedOn: uitgifte,
      dueOn: datum(formData, 'vervaldatum'),
    })
    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/financieel')
  })
}

export async function verwijderFactuurActie(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const invoiceId = tekst(formData, 'invoiceId')
  const slug = tekst(formData, 'slug')
  if (!invoiceId) return { ok: false, error: 'Onbekende factuur.' }

  return veilig(async () => {
    await verwijderConceptfactuur(invoiceId)
    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/financieel')
  })
}
