'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import {
  createContact, updateContact, makePrimaryContact, deleteContact,
  createPartner, updatePartner, setPartnerActive, deletePartner,
  linkPartner, updatePartnerLink, unlinkPartner,
  createAccount, updateAccount, deleteAccount,
  updateOrganizationDetails, CrmError,
} from '@/lib/crm'
import type { ContactPatch, NewPartner, NewAccount } from '@/lib/crm'
import type { ActionResult } from './actions'
import type { Partner } from '@/db/schema'

/* Acties voor het CRM-deel. Elke actie begint met requireStaff():
   een server action is een publiek endpoint. */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    // Een bewuste weigering heeft een reden die de gebruiker moet lezen.
    if (error instanceof CrmError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[crm] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (formData: FormData, naam: string) => String(formData.get(naam) ?? '').trim()

/** Leest een optioneel bedrag. Leeg mag, onzin niet. */
function optioneelBedrag(
  formData: FormData,
  veld: string,
): { ok: true; cents: number | null } | { ok: false; error: string } {
  const raw = tekst(formData, veld)
  if (raw === '') return { ok: true, cents: null }
  const cents = parseAmountToCents(raw)
  if (cents === null || cents <= 0) {
    return { ok: false, error: `"${raw}" is geen geldig bedrag. Bijvoorbeeld: 95,00` }
  }
  return { ok: true, cents }
}

/**
 * De velden van een contactpersoon uit een formulier.
 *
 * Aanmaken en wijzigen lezen hetzelfde formulier. Zouden ze dat elk apart
 * doen, dan werkt een nieuw veld op het ene scherm wel en op het andere niet.
 */
function leesContact(
  formData: FormData,
): { ok: true; patch: ContactPatch } | { ok: false; error: string } {
  const naam = tekst(formData, 'naam')
  if (naam.length < 2) return { ok: false, error: 'Vul een naam in.' }

  const email = tekst(formData, 'email')
  if (email !== '' && !email.includes('@')) {
    return { ok: false, error: 'Vul een geldig e-mailadres in, of laat het leeg.' }
  }

  return {
    ok: true,
    patch: {
      name: naam,
      jobTitle: tekst(formData, 'functie') || null,
      email: email || null,
      phone: tekst(formData, 'telefoon') || null,
      mobile: tekst(formData, 'mobiel') || null,
      linkedinUrl: tekst(formData, 'linkedin') || null,
      isPrimary: formData.get('vast') === 'on',
      receivesInvoices: formData.get('facturen') === 'on',
      notes: tekst(formData, 'notities') || null,
    },
  }
}

/** Dezelfde afspraak voor partners. */
function leesPartner(
  formData: FormData,
): { ok: true; patch: NewPartner } | { ok: false; error: string } {
  const naam = tekst(formData, 'naam')
  if (naam.length < 2) return { ok: false, error: 'Vul een naam voor de partner in.' }

  const type = tekst(formData, 'type')
  if (!PARTNER_TYPES.includes(type)) return { ok: false, error: 'Kies een soort partner.' }

  const uur = optioneelBedrag(formData, 'uurtarief')
  if (!uur.ok) return uur
  const dag = optioneelBedrag(formData, 'dagtarief')
  if (!dag.ok) return dag

  const termijn = tekst(formData, 'betaaltermijn')
  const termijnDagen = termijn === '' ? null : Number.parseInt(termijn, 10)
  if (termijn !== '' && (!Number.isInteger(termijnDagen) || termijnDagen! <= 0)) {
    return { ok: false, error: 'De betaaltermijn moet een positief aantal dagen zijn.' }
  }

  return {
    ok: true,
    patch: {
      name: naam,
      type: type as Partner['type'],
      contactName: tekst(formData, 'contactpersoon') || null,
      email: tekst(formData, 'email') || null,
      phone: tekst(formData, 'telefoon') || null,
      website: tekst(formData, 'website') || null,
      hourlyRateCents: uur.cents,
      dayRateCents: dag.cents,
      paymentTermDays: termijnDagen,
      agreementNotes: tekst(formData, 'afspraken') || null,
      notes: tekst(formData, 'notities') || null,
    },
  }
}

/* ---------------------------- Contactpersonen --------------------------- */

export async function nieuweContactpersoon(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = tekst(formData, 'organizationId')
  const slug = tekst(formData, 'slug')
  if (!organizationId) return { ok: false, error: 'Onbekende klant.' }

  const gelezen = leesContact(formData)
  if (!gelezen.ok) return gelezen

  return veilig(async () => {
    await createContact({ organizationId, ...gelezen.patch })
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

export async function wijzigContactpersoon(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = tekst(formData, 'contactId')
  const slug = tekst(formData, 'slug')
  if (!id) return { ok: false, error: 'Onbekende contactpersoon.' }

  const gelezen = leesContact(formData)
  if (!gelezen.ok) return gelezen

  return veilig(async () => {
    await updateContact(id, gelezen.patch)
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

export async function maakVasteContactpersoon(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'contactId')
  const slug = tekst(formData, 'slug')
  if (!id) return { ok: false, error: 'Onbekende contactpersoon.' }

  return veilig(async () => {
    await makePrimaryContact(id)
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

export async function verwijderContactpersoon(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'contactId')
  const slug = tekst(formData, 'slug')
  if (!id) return { ok: false, error: 'Onbekende contactpersoon.' }

  return veilig(async () => {
    await deleteContact(id)
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/* --------------------------- Bedrijfsgegevens --------------------------- */

export async function bedrijfsgegevens(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = tekst(formData, 'organizationId')
  const slug = tekst(formData, 'slug')
  if (!organizationId) return { ok: false, error: 'Onbekende klant.' }

  const status = tekst(formData, 'status')
  if (!['prospect', 'client', 'former'].includes(status)) {
    return { ok: false, error: 'Kies een geldige status.' }
  }

  const sinds = tekst(formData, 'klantSinds')
  let clientSince: Date | null = null
  if (sinds !== '') {
    const parsed = new Date(sinds)
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'De datum is niet geldig.' }
    clientSince = parsed
  }

  return veilig(async () => {
    await updateOrganizationDetails(organizationId, {
      status: status as 'prospect' | 'client' | 'former',
      industry: tekst(formData, 'branche') || null,
      kvkNumber: tekst(formData, 'kvk') || null,
      vatNumber: tekst(formData, 'btw') || null,
      website: tekst(formData, 'website') || null,
      phone: tekst(formData, 'telefoon') || null,
      email: tekst(formData, 'email') || null,
      addressLine: tekst(formData, 'adres') || null,
      postalCode: tekst(formData, 'postcode') || null,
      city: tekst(formData, 'plaats') || null,
      clientSince,
      notes: tekst(formData, 'notities') || null,
    })
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/* ---------------------------- Accountregister --------------------------- */

/**
 * De velden van een account uit een formulier.
 *
 * Let op het vangnet onderaan: er is geen wachtwoordveld, maar iemand kan er
 * een in de notities zetten. Dat is precies de gewoonte die dit register
 * moet voorkomen, dus die invoer wordt geweigerd.
 */
function leesAccount(
  formData: FormData,
):
  | { ok: true; patch: Omit<NewAccount, 'organizationId'> & { active: boolean } }
  | { ok: false; error: string } {
  const naam = tekst(formData, 'naam')
  if (naam.length < 2) return { ok: false, error: 'Vul een naam voor het account in.' }

  const eigenaar = tekst(formData, 'eigenaar')
  if (!['client', 'agency', 'shared'].includes(eigenaar)) {
    return { ok: false, error: 'Kies wie eigenaar van het account is.' }
  }

  const notities = tekst(formData, 'notities')
  if (/wachtwoord|password|pwd\s*[:=]/i.test(notities)) {
    return {
      ok: false,
      error:
        'Zet geen wachtwoord in de notities. Bewaar het in de wachtwoordmanager en vul hier alleen de verwijzing in.',
    }
  }

  return {
    ok: true,
    patch: {
      name: naam,
      system: tekst(formData, 'systeem') || null,
      url: tekst(formData, 'url') || null,
      loginHint: tekst(formData, 'inlognaam') || null,
      owner: eigenaar as 'client' | 'agency' | 'shared',
      vaultReference: tekst(formData, 'kluis') || null,
      hasMfa: formData.get('mfa') === 'on',
      mfaNotes: tekst(formData, 'mfaNotities') || null,
      notes: notities || null,
      active: formData.get('inactief') !== 'on',
    },
  }
}

export async function nieuwAccount(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = tekst(formData, 'organizationId')
  const slug = tekst(formData, 'slug')
  if (!organizationId) return { ok: false, error: 'Onbekende klant.' }

  const gelezen = leesAccount(formData)
  if (!gelezen.ok) return gelezen

  return veilig(async () => {
    await createAccount({ organizationId, ...gelezen.patch })
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

export async function wijzigAccount(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = tekst(formData, 'accountId')
  const slug = tekst(formData, 'slug')
  if (!id) return { ok: false, error: 'Onbekend account.' }

  const gelezen = leesAccount(formData)
  if (!gelezen.ok) return gelezen

  return veilig(async () => {
    await updateAccount(id, gelezen.patch)
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

export async function verwijderAccount(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'accountId')
  const slug = tekst(formData, 'slug')
  if (!id) return { ok: false, error: 'Onbekend account.' }

  return veilig(async () => {
    await deleteAccount(id)
    revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/* ------------------------------- Partners ------------------------------- */

const PARTNER_TYPES = [
  'photographer', 'videographer', 'printer', 'developer',
  'copywriter', 'translator', 'designer', 'other',
]

export async function nieuwePartner(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const gelezen = leesPartner(formData)
  if (!gelezen.ok) return gelezen

  return veilig(async () => {
    await createPartner(gelezen.patch)
    revalidatePath('/beheer/partners')
  })
}

export async function wijzigPartner(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = tekst(formData, 'partnerId')
  if (!id) return { ok: false, error: 'Onbekende partner.' }

  const gelezen = leesPartner(formData)
  if (!gelezen.ok) return gelezen

  return veilig(async () => {
    await updatePartner(id, gelezen.patch)
    revalidatePath('/beheer/partners')
    // Het tarief van een partner staat ook op de klantpagina's.
    revalidatePath('/beheer/klanten', 'layout')
  })
}

/** Zet een partner aan of uit. Uit betekent: niet meer kiesbaar, wel in de cijfers. */
export async function wisselPartnerActief(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = tekst(formData, 'partnerId')
  if (!id) return { ok: false, error: 'Onbekende partner.' }

  return veilig(async () => {
    await setPartnerActive(id, tekst(formData, 'actief') === 'ja')
    revalidatePath('/beheer/partners')
  })
}

export async function verwijderPartner(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const id = tekst(formData, 'partnerId')
  if (!id) return { ok: false, error: 'Onbekende partner.' }

  return veilig(async () => {
    await deletePartner(id)
    revalidatePath('/beheer/partners')
  })
}

export async function koppelPartner(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const organizationId = tekst(formData, 'organizationId')
  const partnerId = tekst(formData, 'partnerId')
  const slug = tekst(formData, 'slug')
  const rol = tekst(formData, 'rol')

  if (!organizationId || !partnerId) return { ok: false, error: 'Kies een partner.' }
  if (rol.length < 2) {
    return { ok: false, error: 'Vul een rol in, bijvoorbeeld Huisfotograaf.' }
  }

  const tarief = optioneelBedrag(formData, 'tarief')
  if (!tarief.ok) return tarief

  return veilig(async () => {
    await linkPartner({
      organizationId,
      partnerId,
      role: rol,
      customHourlyRateCents: tarief.cents,
      notes: tekst(formData, 'notities') || null,
    })
    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/partners')
  })
}

export async function wijzigKoppeling(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const linkId = tekst(formData, 'linkId')
  const slug = tekst(formData, 'slug')
  const rol = tekst(formData, 'rol')

  if (!linkId) return { ok: false, error: 'Onbekende koppeling.' }
  if (rol.length < 2) {
    return { ok: false, error: 'Vul een rol in, bijvoorbeeld Huisfotograaf.' }
  }

  const tarief = optioneelBedrag(formData, 'tarief')
  if (!tarief.ok) return tarief

  return veilig(async () => {
    await updatePartnerLink(linkId, {
      role: rol,
      customHourlyRateCents: tarief.cents,
      notes: tekst(formData, 'notities') || null,
    })
    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/partners')
  })
}

export async function ontkoppelPartner(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const linkId = tekst(formData, 'linkId')
  const slug = tekst(formData, 'slug')
  if (!linkId) return { ok: false, error: 'Onbekende koppeling.' }

  return veilig(async () => {
    await unlinkPartner(linkId)
    revalidatePath(`/beheer/klanten/${slug}`)
    revalidatePath('/beheer/partners')
  })
}
