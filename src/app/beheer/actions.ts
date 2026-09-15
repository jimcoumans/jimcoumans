'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, wallets, users } from '@/db/schema'
import { requireStaff } from '@/lib/auth'
import { addEntry, reverseEntry, LedgerError } from '@/lib/ledger'
import { parseAmountToCents } from '@/lib/money'
import { describeDbError } from '@/lib/db-errors'
import { uniekeSlug } from '@/lib/admin'
import { normalizeEmail } from '@/lib/auth'

/* -------------------------------------------------------------------------
   Alle acties van het beheerscherm. Elke actie begint met requireStaff():
   een server action is een publiek endpoint, dus de controle hoort hier en
   niet alleen in de pagina die het formulier toont.

   Fouten komen terug als tekst in plaats van een crash, zodat het formulier
   kan zeggen wat er mis is.
   ------------------------------------------------------------------------- */

export type ActionResult = { ok: true } | { ok: false; error: string }

/** Vangt bekende fouten af en laat onbekende doorgaan naar de logs. */
async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof LedgerError) return { ok: false, error: error.message }

    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }

    // Redirects van Next.js zijn geen fouten en moeten doorgegooid worden.
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error

    console.error('[beheer] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

/** Nieuwe klant met meteen een eerste wallet. */
/**
 * Een nieuwe klant, in één keer compleet.
 *
 * Alles wat je weet als iemand binnenkomt kan meteen mee: status, branche,
 * regio, klantnummer, wie de marketing manager wordt en de eerste
 * contactpersoon. Alleen de naam is verplicht — de rest vul je aan wanneer
 * je het weet.
 *
 * Waarom dit één formulier is en geen drie schermen: bij veertig klanten
 * invoeren is elke extra klik veertig extra klikken, en wat je niet meteen
 * kwijt kunt vul je later niet meer in.
 */
export async function nieuweKlant(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const lees = (n: string) => String(formData.get(n) ?? '').trim()

  const naam = lees('naam')
  if (naam.length < 2) return { ok: false, error: 'Vul een klantnaam in.' }

  const walletNaam = lees('walletNaam') || 'Marketing abonnement'

  const status = lees('status')
  if (status !== '' && !['lead', 'prospect', 'client', 'former'].includes(status)) {
    return { ok: false, error: 'Kies een geldige status.' }
  }

  const contactVoornaam = lees('contactVoornaam')
  const contactAchternaam = lees('contactAchternaam')
  const contactMail = lees('contactEmail')
  if (contactMail !== '' && !contactMail.includes('@')) {
    return { ok: false, error: 'Vul een geldig e-mailadres voor de contactpersoon in, of laat het leeg.' }
  }

  return veilig(async () => {
    const { volledigeNaam } = await import('@/lib/namen')
    const { addOwner } = await import('@/lib/crm-owners')
    const { createContact } = await import('@/lib/crm')

    const slug = await uniekeSlug(naam)
    const [org] = await db
      .insert(organizations)
      .values({
        slug,
        name: naam,
        status: (status || 'client') as 'lead' | 'prospect' | 'client' | 'former',
        industry: lees('branche') || null,
        region: lees('regio') || null,
        city: lees('plaats') || null,
        website: lees('website') || null,
        kvkNumber: lees('kvk') || null,
        customerNumber: lees('klantnummer') || null,
      })
      .returning()

    if (!org) throw new LedgerError('Klant kon niet worden aangemaakt.')

    await db.insert(wallets).values({ organizationId: org.id, name: walletNaam })

    // De marketing manager wordt meteen eerste aanspreekpartner, zodat de
    // klant niet in de kolom "nog niet toegewezen" belandt.
    const managerId = lees('manager')
    if (managerId) {
      await addOwner({ organizationId: org.id, userId: managerId, role: 'Marketing manager' })
    }

    const contactNaam = volledigeNaam({
      firstName: contactVoornaam || null,
      infix: lees('contactTussenvoegsel') || null,
      lastName: contactAchternaam || null,
    })
    if (contactNaam.length >= 2) {
      await createContact({
        organizationId: org.id,
        name: contactNaam,
        firstName: contactVoornaam || null,
        infix: lees('contactTussenvoegsel') || null,
        lastName: contactAchternaam || null,
        jobTitle: lees('contactFunctie') || null,
        email: contactMail || null,
        mobile: lees('contactMobiel') || null,
        isPrimary: true,
      })
    }

    revalidatePath('/beheer')
    revalidatePath('/beheer/klanten')
    revalidatePath('/beheer/portfolio')
  })
}

/** Extra wallet bij een bestaande klant. */
export async function nieuweWallet(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = String(formData.get('organizationId') ?? '')
  const naam = String(formData.get('naam') ?? '').trim()
  const slug = String(formData.get('slug') ?? '')
  const drempel = String(formData.get('drempel') ?? '').trim()

  if (!organizationId) return { ok: false, error: 'Onbekende klant.' }
  if (naam.length < 2) return { ok: false, error: 'Vul een naam voor de wallet in.' }

  const drempelCents = drempel === '' ? null : parseAmountToCents(drempel)
  if (drempel !== '' && drempelCents === null) {
    return { ok: false, error: 'De signaalgrens is geen geldig bedrag.' }
  }

  return veilig(async () => {
    await db.insert(wallets).values({
      organizationId,
      name: naam,
      lowBalanceThresholdCents: drempelCents,
    })
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/** Handmatige boeking: bijschrijving of afschrijving. */
export async function boek(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const walletId = String(formData.get('walletId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const soort = String(formData.get('soort') ?? '')
  const bedrag = String(formData.get('bedrag') ?? '')
  const omschrijving = String(formData.get('omschrijving') ?? '').trim()
  const categorie = String(formData.get('categorie') ?? '').trim()
  const toelichting = String(formData.get('toelichting') ?? '').trim()
  const datum = String(formData.get('datum') ?? '').trim()

  if (!walletId) return { ok: false, error: 'Onbekende wallet.' }
  if (soort !== 'topup' && soort !== 'spend') {
    return { ok: false, error: 'Kies bijschrijven of afschrijven.' }
  }
  if (omschrijving.length < 2) {
    return { ok: false, error: 'Vul een omschrijving in. De klant leest die.' }
  }

  const cents = parseAmountToCents(bedrag)
  if (cents === null || cents === 0) {
    return { ok: false, error: 'Vul een geldig bedrag in, bijvoorbeeld 122,50.' }
  }
  if (cents < 0) {
    return {
      ok: false,
      error: 'Vul een positief bedrag in en kies bij- of afschrijven.',
    }
  }

  // Een lege datum wordt vandaag; een onleesbare datum is een fout en
  // wordt niet stil naar vandaag omgezet.
  let bookedOn = new Date()
  if (datum !== '') {
    const parsed = new Date(datum)
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: 'De datum is niet geldig.' }
    }
    bookedOn = parsed
  }

  return veilig(async () => {
    await addEntry({
      walletId,
      kind: soort,
      amountCents: cents,
      description: omschrijving,
      detail: toelichting || null,
      category: categorie || null,
      bookedOn,
      source: 'manual',
      createdByUserId: staff.id,
    })
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/** Boeking terugdraaien met een tegenboeking. */
export async function draaiTerug(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const entryId = String(formData.get('entryId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const reden = String(formData.get('reden') ?? '').trim()

  if (!entryId) return { ok: false, error: 'Onbekende boeking.' }
  if (reden.length < 3) {
    return { ok: false, error: 'Geef een reden op. De klant ziet die bij de correctie.' }
  }

  return veilig(async () => {
    await reverseEntry(entryId, { reason: reden, createdByUserId: staff.id })
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/** Klantgebruiker toevoegen die op het portaal mag inloggen. */
export async function nieuweGebruiker(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = String(formData.get('organizationId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const email = normalizeEmail(String(formData.get('email') ?? ''))
  const naam = String(formData.get('naam') ?? '').trim()

  if (!organizationId) return { ok: false, error: 'Onbekende klant.' }
  if (!email.includes('@') || email.length < 5) {
    return { ok: false, error: 'Vul een geldig e-mailadres in.' }
  }

  return veilig(async () => {
    await db
      .insert(users)
      .values({ email, name: naam || null, role: 'client', organizationId })
      .onConflictDoUpdate({
        target: users.email,
        set: { organizationId, name: naam || null, disabledAt: null },
      })
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/** Toegang van een klantgebruiker intrekken of teruggeven. */
export async function wisselToegang(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const userId = String(formData.get('userId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const blokkeren = String(formData.get('blokkeren') ?? '') === '1'

  if (!userId) return { ok: false, error: 'Onbekende gebruiker.' }

  return veilig(async () => {
    await db
      .update(users)
      .set({ disabledAt: blokkeren ? new Date() : null })
      .where(eq(users.id, userId))
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}
