'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { parseQuantityToHundredths } from '@/lib/quantity'
import {
  createQuote, updateQuote, addQuoteLine, updateQuoteLine, deleteQuoteLine,
  setQuoteStatus, QuoteError,
} from '@/lib/quotes'
import { db } from '@/db'
import { services, partners } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { ActionResult } from './actions'
import type { Quote } from '@/db/schema'

/* Acties voor offertes. Elke actie begint met requireStaff(). */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof QuoteError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[offertes] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

export async function nieuweOfferte(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const organizationId = tekst(formData, 'organizationId')
  const titel = tekst(formData, 'titel')

  if (!organizationId) return { ok: false, error: 'Kies een klant.' }
  if (titel.length < 2) return { ok: false, error: 'Vul een titel voor de offerte in.' }

  const geldig = tekst(formData, 'geldigTot')
  let validUntil: Date | null = null
  if (geldig !== '') {
    const parsed = new Date(geldig)
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'De datum is niet geldig.' }
    validUntil = parsed
  }

  let nieuweId: string | null = null
  const uitkomst = await veilig(async () => {
    const quote = await createQuote({
      organizationId,
      title: titel,
      contactId: tekst(formData, 'contactId') || null,
      introText: tekst(formData, 'intro') || null,
      validUntil,
      createdByUserId: staff.id,
    })
    nieuweId = quote.id
  })

  if (!uitkomst.ok) return uitkomst

  // Direct door naar de offerte, want daar voeg je de regels toe.
  redirect(`/beheer/offertes/${nieuweId}`)
}

/** Voegt een regel toe. Bij een dienst of partner worden de tarieven overgenomen. */
export async function nieuweRegel(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const quoteId = tekst(formData, 'quoteId')
  const soort = tekst(formData, 'soort')
  if (!quoteId) return { ok: false, error: 'Onbekende offerte.' }
  if (!['service', 'partner', 'custom', 'discount'].includes(soort)) {
    return { ok: false, error: 'Kies een soort regel.' }
  }

  const aantal = parseQuantityToHundredths(tekst(formData, 'aantal') || '1')
  if (aantal === null) {
    return { ok: false, error: 'Vul een aantal groter dan nul in, bijvoorbeeld 3 of 1,5.' }
  }

  const prijs = parseAmountToCents(tekst(formData, 'prijs'))
  if (prijs === null || prijs <= 0) {
    return { ok: false, error: 'Vul een bedrag boven nul in. Voor een korting kies je het soort Korting.' }
  }

  const kostRaw = tekst(formData, 'kostprijs')
  let kost: number | null = null
  if (kostRaw !== '') {
    kost = parseAmountToCents(kostRaw)
    if (kost === null) return { ok: false, error: 'De kostprijs is geen geldig bedrag.' }
  }

  const serviceId = tekst(formData, 'serviceId') || null
  const partnerId = tekst(formData, 'partnerId') || null
  let omschrijving = tekst(formData, 'omschrijving')

  // Naam overnemen van de dienst of partner als er niets is ingevuld.
  if (omschrijving === '' && soort === 'service' && serviceId) {
    const [dienst] = await db.select({ name: services.name }).from(services).where(eq(services.id, serviceId))
    omschrijving = dienst?.name ?? ''
  }
  if (omschrijving === '' && soort === 'partner' && partnerId) {
    const [partner] = await db.select({ name: partners.name }).from(partners).where(eq(partners.id, partnerId))
    omschrijving = partner ? `Uitgevoerd door ${partner.name}` : ''
  }
  if (omschrijving.length < 2) {
    return { ok: false, error: 'Vul een omschrijving in. De klant leest die.' }
  }

  return veilig(async () => {
    await addQuoteLine({
      quoteId,
      kind: soort as 'service' | 'partner' | 'custom' | 'discount',
      description: omschrijving,
      detail: tekst(formData, 'toelichting') || null,
      quantityHundredths: aantal,
      // Een kortingsregel gaat er als negatief bedrag in.
      unitPriceCents: soort === 'discount' ? -prijs : prijs,
      unitCostCents: soort === 'discount' ? null : kost,
      serviceId: soort === 'service' ? serviceId : null,
      partnerId: soort === 'partner' ? partnerId : null,
    })
    revalidatePath(`/beheer/offertes/${quoteId}`)
  })
}

/** Wijzigt de kop van de offerte: titel, contactpersoon, inleiding, geldig tot. */
export async function wijzigOfferte(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const quoteId = tekst(formData, 'quoteId')
  const titel = tekst(formData, 'titel')
  if (!quoteId) return { ok: false, error: 'Onbekende offerte.' }
  if (titel.length < 2) return { ok: false, error: 'Vul een titel voor de offerte in.' }

  const geldig = tekst(formData, 'geldigTot')
  let validUntil: Date | null = null
  if (geldig !== '') {
    const parsed = new Date(geldig)
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'De datum is niet geldig.' }
    validUntil = parsed
  }

  const btwRaw = tekst(formData, 'btw')
  const btw = btwRaw === '' ? 21 : Number.parseInt(btwRaw, 10)
  if (!Number.isInteger(btw) || btw < 0 || btw > 100) {
    return { ok: false, error: 'Het btw-tarief moet een percentage tussen 0 en 100 zijn.' }
  }

  return veilig(async () => {
    await updateQuote(quoteId, {
      title: titel,
      contactId: tekst(formData, 'contactId') || null,
      introText: tekst(formData, 'intro') || null,
      validUntil,
      vatRatePercent: btw,
    })
    revalidatePath(`/beheer/offertes/${quoteId}`)
    revalidatePath('/beheer/offertes')
  })
}

/**
 * Wijzigt een regel.
 *
 * Het soort blijft wat het is: van partnerwerk je eigen dienst maken is geen
 * correctie maar een ander voorstel. Daarvoor verwijder je de regel.
 */
export async function wijzigRegel(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const lineId = tekst(formData, 'lineId')
  const quoteId = tekst(formData, 'quoteId')
  const soort = tekst(formData, 'soort')
  if (!lineId) return { ok: false, error: 'Onbekende regel.' }

  const aantal = parseQuantityToHundredths(tekst(formData, 'aantal') || '1')
  if (aantal === null) {
    return { ok: false, error: 'Vul een aantal groter dan nul in, bijvoorbeeld 3 of 1,5.' }
  }

  const prijs = parseAmountToCents(tekst(formData, 'prijs'))
  if (prijs === null || prijs <= 0) {
    return { ok: false, error: 'Vul een bedrag boven nul in.' }
  }

  const kostRaw = tekst(formData, 'kostprijs')
  let kost: number | null = null
  if (kostRaw !== '') {
    kost = parseAmountToCents(kostRaw)
    if (kost === null) return { ok: false, error: 'De kostprijs is geen geldig bedrag.' }
  }

  const omschrijving = tekst(formData, 'omschrijving')
  if (omschrijving.length < 2) {
    return { ok: false, error: 'Vul een omschrijving in. De klant leest die.' }
  }

  return veilig(async () => {
    await updateQuoteLine(lineId, {
      description: omschrijving,
      detail: tekst(formData, 'toelichting') || null,
      quantityHundredths: aantal,
      unitPriceCents: soort === 'discount' ? -prijs : prijs,
      unitCostCents: soort === 'discount' ? null : kost,
      partnerId: tekst(formData, 'partnerId') || null,
    })
    revalidatePath(`/beheer/offertes/${quoteId}`)
  })
}

export async function verwijderRegel(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const lineId = tekst(formData, 'lineId')
  const quoteId = tekst(formData, 'quoteId')
  if (!lineId) return { ok: false, error: 'Onbekende regel.' }

  return veilig(async () => {
    await deleteQuoteLine(lineId)
    revalidatePath(`/beheer/offertes/${quoteId}`)
  })
}

export async function zetOfferteStatus(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const quoteId = tekst(formData, 'quoteId')
  const status = tekst(formData, 'status')
  if (!quoteId) return { ok: false, error: 'Onbekende offerte.' }

  const geldig = ['draft', 'awaiting_partner', 'sent', 'accepted', 'declined', 'expired']
  if (!geldig.includes(status)) return { ok: false, error: 'Onbekende status.' }

  const reden = tekst(formData, 'reden')
  if (status === 'declined' && reden.length < 3) {
    return { ok: false, error: 'Geef kort aan waarom het niet doorging. Dat helpt bij het volgende voorstel.' }
  }

  return veilig(async () => {
    await setQuoteStatus(quoteId, status as Quote['status'], { declineReason: reden || null })
    revalidatePath(`/beheer/offertes/${quoteId}`)
    revalidatePath('/beheer/offertes')
    revalidatePath('/beheer')
  })
}
