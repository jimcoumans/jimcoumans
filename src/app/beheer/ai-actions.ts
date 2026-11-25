'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import type { ActionResult } from './actions'
import {
  archiveerVraag,
  bewaarMeting,
  bewaarSetInstellingen,
  corrigeerMeting,
  isPlatform,
  periodeVan,
  setVoorJamesRobinson,
  verwijderMeting,
  voegVraagToe,
} from '@/lib/ai-vindbaarheid'

/* -------------------------------------------------------------------------
   Acties voor AI-vindbaarheid. Iedereen in het team mag meten; de vragen en
   merknamen zijn van het hele team, net als de rest van het werk voor
   klanten.
   ------------------------------------------------------------------------- */

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()
const regels = (f: FormData, n: string) => tekst(f, n).split(/\r?\n/).map((r) => r.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean)
const pad = (setId: string) => `/beheer/ai-vindbaarheid/${setId}`

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[ai-vindbaarheid] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

/** De meetset van James Robinson aanmaken (of openen als hij er al is). */
export async function startJamesRobinson(): Promise<ActionResult> {
  await requireStaff()
  let id = ''
  const r = await veilig(async () => {
    id = (await setVoorJamesRobinson()).id
  })
  if (!r.ok) return r
  redirect(pad(id))
}

export async function bewaarInstellingen(f: FormData): Promise<ActionResult> {
  await requireStaff()
  const setId = tekst(f, 'setId')
  const naam = tekst(f, 'naam')
  const merknamen = regels(f, 'merknamen')
  if (!naam) return { ok: false, error: 'Geef de meetset een naam.' }
  if (!merknamen.length) return { ok: false, error: 'Vul minstens één merknaam in, anders kan niets herkend worden.' }
  return veilig(async () => {
    await bewaarSetInstellingen(setId, { naam, merknamen, concurrenten: regels(f, 'concurrenten') })
    revalidatePath(pad(setId))
  })
}

export async function nieuweVraag(f: FormData): Promise<ActionResult> {
  await requireStaff()
  const setId = tekst(f, 'setId'), vraag = tekst(f, 'vraag')
  if (!vraag) return { ok: false, error: 'Typ eerst de vraag.' }
  return veilig(async () => {
    await voegVraagToe(setId, vraag)
    revalidatePath(pad(setId))
  })
}

export async function wisselArchief(f: FormData): Promise<ActionResult> {
  await requireStaff()
  const setId = tekst(f, 'setId')
  return veilig(async () => {
    await archiveerVraag(tekst(f, 'vraagId'), tekst(f, 'archiveren') === '1')
    revalidatePath(pad(setId))
  })
}

export async function bewaarAntwoord(f: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const setId = tekst(f, 'setId'), platform = tekst(f, 'platform'), maand = tekst(f, 'maand')
  const herhaling = Number(tekst(f, 'herhaling'))
  const antwoord = tekst(f, 'antwoord')
  if (!isPlatform(platform)) return { ok: false, error: 'Onbekend platform.' }
  if (!periodeVan(maand)) return { ok: false, error: 'Kies een maand.' }
  if (!antwoord) return { ok: false, error: 'Plak eerst het antwoord van de AI.' }
  return veilig(async () => {
    await bewaarMeting({ vraagId: tekst(f, 'vraagId'), maand, platform, herhaling, antwoord, userId: user.id })
    revalidatePath(pad(setId))
  })
}

export async function corrigeer(f: FormData): Promise<ActionResult> {
  await requireStaff()
  const setId = tekst(f, 'setId')
  const genoemd = tekst(f, 'genoemd') === 'ja'
  const p = tekst(f, 'plek')
  const plek = p === '' ? null : Math.trunc(Number(p))
  if (plek !== null && (!Number.isFinite(plek) || plek < 1)) return { ok: false, error: 'Een plek is 1 of hoger. Laat het leeg als er geen lijst is.' }
  return veilig(async () => {
    await corrigeerMeting(tekst(f, 'metingId'), genoemd, plek)
    revalidatePath(pad(setId))
  })
}

export async function verwijder(f: FormData): Promise<ActionResult> {
  await requireStaff()
  const setId = tekst(f, 'setId')
  return veilig(async () => {
    await verwijderMeting(tekst(f, 'metingId'))
    revalidatePath(pad(setId))
  })
}
