'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, subscriptions, wallets } from '@/db/schema'
import { requireStaff, getSessionUser } from '@/lib/auth'
import { LedgerError } from '@/lib/ledger'
import { runBilling } from '@/lib/billing'
import { parseAmountToCents } from '@/lib/money'
import { describeDbError } from '@/lib/db-errors'
import type { ActionResult } from './actions'
import { vergeet } from '@/lib/cache'
import { lokaalAbonnement, moneybirdAbonnementenAan, moneybirdBelastingId, stopMoneybirdAbonnement } from '@/lib/moneybird/abonnementen'
import { moneybirdBedrag, moneybirdClient, moneybirdContactId, MoneybirdApiFout } from '@/lib/moneybird/client'
import { moneybirdPlanning } from '@/lib/moneybird/planning'

/* Acties voor abonnementen. Elke actie begint met requireStaff(). */

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
    if (error instanceof LedgerError || error instanceof MoneybirdApiFout) return { ok: false, error: error.message }

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

  const kortingUitkomst = leesKorting(formData, bedrag)
  if ('fout' in kortingUitkomst) return { ok: false, error: kortingUitkomst.fout }
  const korting = kortingUitkomst.cents

  return veilig(async () => {
    // De wallet moet bij deze klant horen, anders zou het budget bij een
    // andere klant terechtkomen.
    const [wallet] = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(and(eq(wallets.id, walletId), eq(wallets.organizationId, organizationId)))
      .limit(1)

    if (!wallet) throw new LedgerError('Deze wallet hoort niet bij deze klant.')

    let moneybird: { moneybirdState: 'wacht'; moneybirdContactId: string } | undefined
    if (moneybirdAbonnementenAan()) {
      const [klant] = await db.select({ contactId: organizations.moneybirdContactId })
        .from(organizations).where(eq(organizations.id, organizationId))
      if (!klant?.contactId) throw new LedgerError('Koppel eerst het Moneybird-contact van deze klant.')
      try {
        moneybirdClient()
        moneybirdBelastingId(btw)
        moneybirdPlanning(start, eind, dag, new Date())
        moneybird = { moneybirdState: 'wacht', moneybirdContactId: moneybirdContactId(klant.contactId) }
      } catch (error) {
        throw new LedgerError(error instanceof Error ? error.message : 'Controleer de Moneybird-instellingen.')
      }
    }

    await db.insert(subscriptions).values({
      ...moneybird,
      organizationId,
      walletId,
      name: naam,
      description: String(formData.get('omschrijving') ?? '').trim() || null,
      amountExclVatCents: bedrag,
      discountCents: korting,
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
 * Leest het kortingsveld. Leeg is geen korting, en dat is het gewone geval.
 *
 * De korting mag het budget niet opeten: dan zou er een factuur van nul of
 * minder uitgaan. De database weigert dat ook, maar hier krijg je een zin te
 * lezen in plaats van een constraintnaam.
 */
function leesKorting(
  formData: FormData,
  budgetCents: number,
): { cents: number } | { fout: string } {
  const ruw = String(formData.get('korting') ?? '').trim()
  if (ruw === '') return { cents: 0 }

  const cents = parseAmountToCents(ruw)
  if (cents === null || cents < 0) {
    return { fout: 'De korting begrijp ik niet. Schrijf hem als 480,00, of laat het veld leeg.' }
  }
  if (cents >= budgetCents) {
    return {
      fout: 'De korting is net zo hoog als het budget of hoger. Dan blijft er geen factuur over.',
    }
  }
  return { cents }
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

  const kortingUitkomstWijzig = leesKorting(formData, bedrag)
  if ('fout' in kortingUitkomstWijzig) return { ok: false, error: kortingUitkomstWijzig.fout }
  const kortingBijWijzigen = kortingUitkomstWijzig.cents

  return veilig(async () => {
    const [aangepast] = await db
      .update(subscriptions)
      .set({
        name: naam,
        description: String(formData.get('omschrijving') ?? '').trim() || null,
        amountExclVatCents: bedrag,
        discountCents: kortingBijWijzigen,
        billingDay: dag,
        endsOn: eind,
        notes: String(formData.get('notities') ?? '').trim() || null,
        updatedAt: new Date(),
      })
       .where(and(eq(subscriptions.id, id), lokaalAbonnement))
      .returning({ id: subscriptions.id })
    if (!aangepast) throw new LedgerError('Bedrag en planning van deze Moneybird-reeks kunnen hier nog niet worden gewijzigd.')

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
    if (status === 'ended' && await stopMoneybirdAbonnement(id)) {
      revalidatePath(`/beheer/klanten/${slug}`)
      revalidatePath('/beheer/abonnementen')
      return
    }

    const [aangepast] = await db
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
      .where(and(eq(subscriptions.id, id), lokaalAbonnement))
      .returning({ id: subscriptions.id })
    if (!aangepast) throw new LedgerError('Je kunt deze Moneybird-reeks via de Wallet stopzetten.')

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


function controleerMoneybirdContact(
  klant: { name: string; customerNumber: string | null; moneybirdContactId: string | null },
  contact: { id: string; customer_id?: string | null; company_name?: string | null },
) {
  if (klant.moneybirdContactId) {
    if (klant.moneybirdContactId !== contact.id) throw new LedgerError('Deze klant is al aan een ander Moneybird-contact gekoppeld.')
    return
  }
  const normaliseer = (naam: string) => naam.toLowerCase()
    .replace(/\b(?:b\.?v\.?|n\.?v\.?)$/i, '').replace(/[^a-z0-9]/g, '')
  if (klant.customerNumber && contact.customer_id && klant.customerNumber !== contact.customer_id) {
    throw new LedgerError('Het Moneybird-klantnummer wijkt af van het CRM.')
  }
  const zelfdeNummer = Boolean(klant.customerNumber && contact.customer_id === klant.customerNumber)
  const zelfdeNaam = Boolean(contact.company_name && normaliseer(contact.company_name) === normaliseer(klant.name))
  if (!zelfdeNaam && !zelfdeNummer) throw new LedgerError('Klantnaam en klantnummer komen niet overeen met Moneybird.')
}

/** Contactkoppeling voor zowel abonnementen als losse verkoopfacturen. */
export async function koppelMoneybirdContact(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser()
  if (user?.role !== 'admin') return { ok: false, error: 'Alleen een beheerder kan facturen koppelen.' }
  const id = String(formData.get('organizationId') ?? '')
  const contactId = String(formData.get('contactId') ?? '').trim()
  if (!id || !/^\d+$/.test(contactId)) return { ok: false, error: 'Vul een geldig Moneybird-contact-ID in.' }

  return veilig(async () => {
    const contact = await moneybirdClient().contact(contactId)
    if (contact.id !== contactId) throw new LedgerError('Moneybird bevestigde een ander contact.')
    const slug = await db.transaction(async (tx) => {
      const [klant] = await tx.select().from(organizations).where(eq(organizations.id, id)).for('update')
      if (!klant) throw new LedgerError('Onbekende klant.')
      controleerMoneybirdContact(klant, contact)
      await tx.update(organizations).set({ moneybirdContactId: contactId }).where(eq(organizations.id, id))
      return klant.slug
    })
    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/facturen')
  })
}

/** Een bestaande reeks verifiëren voordat het CRM het beheer ervan overneemt. */
export async function koppelMoneybirdReeks(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser()
  if (user?.role !== 'admin') return { ok: false, error: 'Alleen een beheerder kan facturen koppelen.' }
  if (!moneybirdAbonnementenAan()) return { ok: false, error: 'Moneybird-abonnementen zijn nog uitgeschakeld.' }

  const id = String(formData.get('id') ?? '')
  const contactId = String(formData.get('contactId') ?? '').trim()
  const reeksId = String(formData.get('reeksId') ?? '').trim()
  if (!id || !/^\d+$/.test(contactId) || !/^\d+$/.test(reeksId)) {
    return { ok: false, error: 'Vul een geldig Moneybird-contact-ID en reeks-ID in.' }
  }

  return veilig(async () => {
    const client = moneybirdClient()
    const [contact, reeks] = await Promise.all([client.contact(contactId), client.reeks(reeksId)])
    if (reeks.contact_id !== contact.id || contact.id !== contactId
        || !reeks.active || !reeks.auto_send || reeks.subscription) {
      throw new LedgerError('Kies een actieve terugkerende factuur van dit Moneybird-contact.')
    }
    await db.transaction(async (tx) => {
      const [abo] = await tx.select().from(subscriptions).where(eq(subscriptions.id, id)).for('update')
      if (!abo || abo.moneybirdState || abo.status !== 'active') {
        throw new LedgerError('Kies een actief CRM-abonnement dat nog niet gekoppeld is.')
      }
      const [klant] = await tx.select().from(organizations)
        .where(eq(organizations.id, abo.organizationId)).for('update')
      if (!klant) throw new LedgerError('Onbekende klant.')
      controleerMoneybirdContact(klant, contact)
      if (abo.endsOn || reeks.currency !== 'EUR' || reeks.frequency !== 1 || reeks.frequency_type !== 'month'
          || !reeks.total_price_excl_tax || moneybirdBedrag(reeks.total_price_excl_tax) !== abo.amountExclVatCents - abo.discountCents
          || !/^\d{4}-\d{2}-\d{2}$/.test(reeks.invoice_date)
          || Number(reeks.invoice_date.slice(-2)) !== abo.billingDay) {
        throw new LedgerError('Bedrag, valuta, looptijd of facturatiedag wijkt af. Controleer de reeks en het CRM-abonnement.')
      }
      await tx.update(organizations).set({ moneybirdContactId: contactId }).where(eq(organizations.id, klant.id))
      await tx.update(subscriptions).set({
        moneybirdState: 'gekoppeld',
        moneybirdContactId: contactId,
        moneybirdRecurringId: reeks.id,
        moneybirdEersteFactuur: reeks.invoice_date,
        updatedAt: new Date(),
      }).where(eq(subscriptions.id, id))
      revalidatePath(`/beheer/klanten/${klant.slug}`)
    })
    revalidatePath('/beheer/abonnementen')
    revalidatePath('/facturen')
  })
}
