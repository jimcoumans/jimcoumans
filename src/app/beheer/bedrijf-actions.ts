'use server'

import { revalidatePath } from 'next/cache'
import { alsBeheerder } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { vergeet } from '@/lib/cache'
import {
  slaBedrijfOp,
  slaVestigingOp,
  sluitVestiging,
  slaLogoOp,
  wisLogo,
  voegHandboekToe,
  slaAvgTekstOp,
  BedrijfError,
} from '@/lib/bedrijf'
import type { ActionResult } from './actions'

/* Bedrijfsgegevens beheren: naam, logo, vestigingen en het personeelshandboek.
   Alleen een beheerder: dit komt in elk contract. Elke actie controleert dat
   zelf, want een server action is een publiek endpoint. */

const GEEN_RECHT: ActionResult = { ok: false, error: 'Alleen een beheerder kan de bedrijfsgegevens aanpassen.' }

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    vergeet()
    revalidatePath('/beheer/bedrijf')
    revalidatePath('/beheer/contracten')
    return { ok: true }
  } catch (error) {
    if (error instanceof BedrijfError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[bedrijf] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (formData: FormData, naam: string) => String(formData.get(naam) ?? '').trim()

async function bestandUit(formData: FormData, naam: string) {
  const f = formData.get(naam)
  if (!(f instanceof File) || f.size === 0) return null
  return { data: Buffer.from(await f.arrayBuffer()), contentType: f.type, filename: f.name || null }
}

export async function bedrijfOpslaan(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(() =>
    slaBedrijfOp({
      legalName: tekst(formData, 'juridischeNaam'),
      tradeName: tekst(formData, 'naam'),
      tagline: tekst(formData, 'ondertitel'),
      kvkNumber: tekst(formData, 'kvk'),
      vatNumber: tekst(formData, 'btw'),
      email: tekst(formData, 'email'),
      phone: tekst(formData, 'telefoon'),
      website: tekst(formData, 'website'),
      signatories: tekst(formData, 'ondertekenaars'),
    }),
  )
}

export async function vestigingOpslaan(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(async () => {
    await slaVestigingOp({
      id: tekst(formData, 'vestigingId') || null,
      name: tekst(formData, 'naam'),
      addressLine: tekst(formData, 'adres'),
      postalCode: tekst(formData, 'postcode'),
      city: tekst(formData, 'plaats'),
      phone: tekst(formData, 'telefoon'),
      email: tekst(formData, 'email'),
      officeHours: tekst(formData, 'kantoortijden'),
      isMain: formData.has('hoofdKeuze') ? ['on', 'ja', 'true'].includes(tekst(formData, 'hoofd')) : undefined,
    })
  })
}

export async function vestigingSluiten(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(() => sluitVestiging(tekst(formData, 'vestigingId')))
}

export async function logoUploaden(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const bestand = await bestandUit(formData, 'logo')
  if (!bestand) return { ok: false, error: 'Kies een png of jpg.' }
  return veilig(() => slaLogoOp(bestand.data, bestand.contentType))
}

export async function logoWissen(): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(() => wisLogo())
}

export async function handboekUploaden(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const bestand = await bestandUit(formData, 'handboek')
  if (!bestand) return { ok: false, error: 'Kies de pdf van het personeelshandboek.' }
  return veilig(async () => {
    await voegHandboekToe(bestand, tekst(formData, 'notitie') || null, gebruiker.id)
  })
}

export async function avgTekstOpslaan(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(() => slaAvgTekstOp(formData.has('standaard') ? null : tekst(formData, 'tekst')))
}
