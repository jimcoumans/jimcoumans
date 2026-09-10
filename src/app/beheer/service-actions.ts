'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { services, users } from '@/db/schema'
import { requireStaff, normalizeEmail } from '@/lib/auth'
import { addServiceEntry, LedgerError } from '@/lib/ledger'
import { createInvoiceWithTopup } from '@/lib/invoices'
import { parseAmountToCents } from '@/lib/money'
import { parseQuantityToHundredths } from '@/lib/quantity'
import { describeDbError } from '@/lib/db-errors'
import type { ActionResult } from './actions'

/* Acties voor diensten, dienstboekingen, facturen en medewerkers.
   Net als in actions.ts begint elke actie met requireStaff(): een server
   action is een publiek endpoint. */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof LedgerError) return { ok: false, error: error.message }

    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }

    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error

    console.error('[beheer] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

/** Leest een bedrag uit het formulier. Leeg mag, onzin niet. */
function leesBedrag(
  formData: FormData,
  veld: string,
): { ok: true; cents: number | null } | { ok: false; error: string } {
  const raw = String(formData.get(veld) ?? '').trim()
  if (raw === '') return { ok: true, cents: null }

  const cents = parseAmountToCents(raw)
  if (cents === null) {
    return { ok: false, error: `"${raw}" is geen geldig bedrag. Bijvoorbeeld: 100,00` }
  }
  return { ok: true, cents }
}

const UNITS = ['piece', 'hour', 'month', 'project'] as const

/* ------------------------------- Diensten ------------------------------- */

export async function nieuweDienst(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const naam = String(formData.get('naam') ?? '').trim()
  if (naam.length < 2) return { ok: false, error: 'Vul een naam voor de dienst in.' }

  const tarief = leesBedrag(formData, 'tarief')
  if (!tarief.ok) return tarief
  if (tarief.cents === null || tarief.cents <= 0) {
    return { ok: false, error: 'Vul een verkooptarief boven nul in.' }
  }

  const kostprijs = leesBedrag(formData, 'kostprijs')
  if (!kostprijs.ok) return kostprijs
  if (kostprijs.cents !== null && kostprijs.cents < 0) {
    return { ok: false, error: 'De kostprijs kan niet negatief zijn.' }
  }

  const unit = String(formData.get('eenheid') ?? 'piece')
  if (!UNITS.includes(unit as (typeof UNITS)[number])) {
    return { ok: false, error: 'Kies een geldige eenheid.' }
  }

  const minuten = String(formData.get('minuten') ?? '').trim()
  const minutenGetal = minuten === '' ? null : Number.parseInt(minuten, 10)
  if (minuten !== '' && (!Number.isInteger(minutenGetal) || minutenGetal! < 0)) {
    return { ok: false, error: 'De verwachte tijd moet een aantal minuten zijn.' }
  }

  return veilig(async () => {
    await db.insert(services).values({
      code: String(formData.get('code') ?? '').trim() || null,
      name: naam,
      description: String(formData.get('omschrijving') ?? '').trim() || null,
      category: String(formData.get('productgroep') ?? '').trim() || null,
      department: String(formData.get('afdeling') ?? '').trim() || null,
      unit: unit as (typeof UNITS)[number],
      unitPriceCents: tarief.cents!,
      costPriceCents: kostprijs.cents,
      estimatedMinutes: minutenGetal,
      notes: String(formData.get('notities') ?? '').trim() || null,
    })
    revalidatePath('/beheer/diensten')
  })
}

/**
 * Werkt een dienst bij. Dit is veilig voor bestaande boekingen: die hebben
 * het tarief van hun eigen moment gekopieerd.
 */
export async function wijzigDienst(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = String(formData.get('id') ?? '')
  if (!id) return { ok: false, error: 'Onbekende dienst.' }

  const naam = String(formData.get('naam') ?? '').trim()
  if (naam.length < 2) return { ok: false, error: 'Vul een naam voor de dienst in.' }

  const tarief = leesBedrag(formData, 'tarief')
  if (!tarief.ok) return tarief
  if (tarief.cents === null || tarief.cents <= 0) {
    return { ok: false, error: 'Vul een verkooptarief boven nul in.' }
  }

  const kostprijs = leesBedrag(formData, 'kostprijs')
  if (!kostprijs.ok) return kostprijs

  return veilig(async () => {
    await db
      .update(services)
      .set({
        name: naam,
        description: String(formData.get('omschrijving') ?? '').trim() || null,
        category: String(formData.get('productgroep') ?? '').trim() || null,
        department: String(formData.get('afdeling') ?? '').trim() || null,
        unitPriceCents: tarief.cents!,
        costPriceCents: kostprijs.cents,
        notes: String(formData.get('notities') ?? '').trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(services.id, id))
    revalidatePath('/beheer/diensten')
  })
}

/**
 * Zet een dienst actief of inactief. Verwijderen kan niet als er ooit op
 * geboekt is, want dan zou de historie onleesbaar worden.
 */
export async function wisselDienstActief(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = String(formData.get('id') ?? '')
  const activeren = String(formData.get('activeren') ?? '') === '1'
  if (!id) return { ok: false, error: 'Onbekende dienst.' }

  return veilig(async () => {
    await db
      .update(services)
      .set({ active: activeren, updatedAt: new Date() })
      .where(eq(services.id, id))
    revalidatePath('/beheer/diensten')
  })
}

/* --------------------------- Dienst afboeken ---------------------------- */

/** Boekt een geleverde dienst af van het budget van de klant. */
export async function boekDienst(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const walletId = String(formData.get('walletId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const serviceId = String(formData.get('serviceId') ?? '')
  const aantalRaw = String(formData.get('aantal') ?? '').trim()

  if (!walletId) return { ok: false, error: 'Onbekende wallet.' }
  if (!serviceId) return { ok: false, error: 'Kies een dienst.' }

  const aantal = parseQuantityToHundredths(aantalRaw || '1')
  if (aantal === null) {
    return { ok: false, error: 'Vul een aantal groter dan nul in, bijvoorbeeld 3 of 1,5.' }
  }

  const afwijkend = leesBedrag(formData, 'tarief')
  if (!afwijkend.ok) return afwijkend
  if (afwijkend.cents !== null && afwijkend.cents <= 0) {
    return { ok: false, error: 'Een afwijkend tarief moet boven nul zijn.' }
  }

  const datum = String(formData.get('datum') ?? '').trim()
  let bookedOn = new Date()
  if (datum !== '') {
    const parsed = new Date(datum)
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'De datum is niet geldig.' }
    bookedOn = parsed
  }

  const geleverdDoor = String(formData.get('geleverdDoor') ?? '').trim()

  return veilig(async () => {
    await addServiceEntry({
      walletId,
      serviceId,
      quantityHundredths: aantal,
      unitPriceCentsOverride: afwijkend.cents,
      description: String(formData.get('omschrijving') ?? '').trim() || null,
      detail: String(formData.get('toelichting') ?? '').trim() || null,
      bookedOn,
      deliveredByUserId: geleverdDoor || null,
      createdByUserId: staff.id,
    })
    revalidatePath(`/beheer/${slug}`)
  })
}

/* ------------------------------- Facturen ------------------------------- */

/** Maakt een factuur aan en schrijft het bedrag bij als budget. */
export async function nieuweFactuur(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const organizationId = String(formData.get('organizationId') ?? '')
  const walletId = String(formData.get('walletId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const nummer = String(formData.get('nummer') ?? '').trim()

  if (!organizationId || !walletId) return { ok: false, error: 'Onbekende klant of wallet.' }
  if (nummer.length < 1) return { ok: false, error: 'Vul een factuurnummer in.' }

  const bedrag = leesBedrag(formData, 'bedrag')
  if (!bedrag.ok) return bedrag
  if (bedrag.cents === null || bedrag.cents <= 0) {
    return { ok: false, error: 'Vul een factuurbedrag boven nul in (exclusief btw).' }
  }

  const btw = leesBedrag(formData, 'btw')
  if (!btw.ok) return btw

  const datum = String(formData.get('datum') ?? '').trim()
  let issuedOn = new Date()
  if (datum !== '') {
    const parsed = new Date(datum)
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'De factuurdatum is niet geldig.' }
    issuedOn = parsed
  }

  return veilig(async () => {
    await createInvoiceWithTopup({
      organizationId,
      walletId,
      number: nummer,
      amountExclVatCents: bedrag.cents!,
      vatCents: btw.cents ?? undefined,
      description: String(formData.get('omschrijving') ?? '').trim() || null,
      issuedOn,
      createdByUserId: staff.id,
    })
    revalidatePath(`/beheer/${slug}`)
  })
}

/** Betaalstatus van een factuur bijwerken. Raakt het budget niet. */
export async function zetFactuurStatus(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const invoiceId = String(formData.get('invoiceId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const status = String(formData.get('status') ?? '')
  const geldig = ['draft', 'open', 'paid', 'overdue', 'credited']

  if (!invoiceId) return { ok: false, error: 'Onbekende factuur.' }
  if (!geldig.includes(status)) return { ok: false, error: 'Onbekende status.' }

  const { setInvoiceStatus } = await import('@/lib/invoices')

  return veilig(async () => {
    await setInvoiceStatus(invoiceId, status as 'draft' | 'open' | 'paid' | 'overdue' | 'credited')
    revalidatePath(`/beheer/${slug}`)
  })
}

/* ------------------------------ Medewerkers ----------------------------- */

/** Collega toevoegen die in het beheer mag. */
export async function nieuweMedewerker(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  // Alleen een beheerder mag nieuwe beheerders maken; anders kan iedereen
  // met beheerrechten zichzelf tot admin promoveren.
  const rol = String(formData.get('rol') ?? 'staff')
  if (rol === 'admin' && staff.role !== 'admin') {
    return { ok: false, error: 'Alleen een beheerder kan een nieuwe beheerder toevoegen.' }
  }
  if (rol !== 'staff' && rol !== 'admin') {
    return { ok: false, error: 'Kies een geldige rol.' }
  }

  const email = normalizeEmail(String(formData.get('email') ?? ''))
  if (!email.includes('@') || email.length < 5) {
    return { ok: false, error: 'Vul een geldig e-mailadres in.' }
  }

  const naam = String(formData.get('naam') ?? '').trim()

  return veilig(async () => {
    await db
      .insert(users)
      .values({ email, name: naam || null, role: rol, organizationId: null })
      .onConflictDoUpdate({
        target: users.email,
        set: { role: rol, name: naam || null, organizationId: null, disabledAt: null },
      })
    revalidatePath('/beheer/medewerkers')
  })
}

/** Toegang van een medewerker intrekken of teruggeven. */
export async function wisselMedewerkerToegang(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const userId = String(formData.get('userId') ?? '')
  const blokkeren = String(formData.get('blokkeren') ?? '') === '1'

  if (!userId) return { ok: false, error: 'Onbekende medewerker.' }

  // Jezelf buitensluiten zou betekenen dat niemand meer bij het beheer kan.
  if (userId === staff.id && blokkeren) {
    return { ok: false, error: 'Je kunt je eigen toegang niet intrekken.' }
  }

  return veilig(async () => {
    await db
      .update(users)
      .set({ disabledAt: blokkeren ? new Date() : null })
      .where(eq(users.id, userId))
    revalidatePath('/beheer/medewerkers')
  })
}
