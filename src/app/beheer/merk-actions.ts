'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import {
  MerkError,
  wijzigBestand,
  verwijderBestand,
  voegKleurToe,
  wijzigKleur,
  verwijderKleur,
  voegFontToe,
  wijzigFont,
  verwijderFont,
  zetStem,
  zetTekststijl,
  wisTekststijl,
  zetKnop,
  zetLogoNietVanToepassing,
} from '@/lib/merkkluis'
import { GEWICHTEN, LOGO_SLOTS, TEKSTROLLEN, TOESTANDEN, hexUit, tekststijlUit, type Knop, type LogoSlot, type TekstRol } from '@/lib/stylesheet'
import type { BrandColor, BrandFile, BrandFont, BrandVoice } from '@/db/schema'
import type { ActionResult } from './actions'

/* Acties voor de merkkluis. Elke actie begint met requireStaff(): een
   server action is een publiek endpoint. Uploaden gaat via /api/merk/upload. */

const tekst = (f: FormData, naam: string) => String(f.get(naam) ?? '').trim()
const ofNull = (f: FormData, naam: string) => tekst(f, naam) || null

function uit<T extends string>(f: FormData, naam: string, lijst: readonly T[], standaard: T): T {
  const s = tekst(f, naam)
  return (lijst as readonly string[]).includes(s) ? (s as T) : standaard
}

async function veilig(slug: string, fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    if (slug) revalidatePath(`/beheer/assets/${slug}`)
    revalidatePath('/beheer/assets')
    return { ok: true }
  } catch (error) {
    if (error instanceof MerkError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[merkkluis] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

/** Tags zoals iemand ze typt: "kerst, Diner,  wijn" wordt [kerst, diner, wijn]. */
function tags(invoer: string): string[] {
  return [...new Set(invoer.split(/[,;\n]/).map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30)
}

export async function bewerkBestand(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), async () => {
    const soort = tekst(formData, 'kind') as BrandFile['kind']
    const patch: Parameters<typeof wijzigBestand>[1] = {
      title: tekst(formData, 'title'),
      tags: tags(tekst(formData, 'tags')),
      notes: ofNull(formData, 'notes'),
    }
    if (soort === 'logo') {
      patch.logoVariant = uit(formData, 'logoVariant', ['primair', 'secundair', 'beeldmerk', 'woordmerk', 'anders'] as const, 'primair')
      patch.logoBackground = uit(formData, 'logoBackground', ['licht', 'donker', 'beide'] as const, 'licht')
      patch.logoColorway = uit(formData, 'logoColorway', ['kleur', 'zwart', 'wit'] as const, 'kleur')
    }
    if (soort === 'beeld') {
      const x = Number.parseInt(tekst(formData, 'focusX'), 10)
      const y = Number.parseInt(tekst(formData, 'focusY'), 10)
      if (Number.isFinite(x) && Number.isFinite(y)) {
        patch.focusX = Math.min(100, Math.max(0, x))
        patch.focusY = Math.min(100, Math.max(0, y))
      }
      patch.source = uit(formData, 'source', ['eigen', 'klant', 'stock', 'ai'] as const, 'klant')
      patch.usage = formData
        .getAll('usage')
        .map(String)
        .filter((u) => ['organisch', 'advertenties', 'print'].includes(u))
      const tot = tekst(formData, 'usableUntil')
      patch.usableUntil = tot ? new Date(`${tot}T12:00:00`) : null
      patch.peopleConsent = uit(formData, 'peopleConsent', ['geen', 'toestemming', 'onbekend'] as const, 'onbekend')
      patch.aiAltered = formData.get('aiAltered') === 'on' || patch.source === 'ai'
    }
    await wijzigBestand(tekst(formData, 'id'), patch)
  })
}

export async function wisBestand(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), async () => {
    await verwijderBestand(tekst(formData, 'id'))
  })
}

const ROLLEN = ['primair', 'secundair', 'accent', 'achtergrond', 'tekst'] as const

function kleurUit(f: FormData) {
  return {
    name: tekst(f, 'name'),
    hex: tekst(f, 'hex'),
    role: uit<BrandColor['role']>(f, 'role', ROLLEN, 'primair'),
    notes: ofNull(f, 'notes'),
  }
}

export async function nieuweKleur(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), () => voegKleurToe(tekst(formData, 'organizationId'), kleurUit(formData)))
}

export async function bewerkKleur(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), () => wijzigKleur(tekst(formData, 'id'), kleurUit(formData)))
}

export async function wisKleur(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), () => verwijderKleur(tekst(formData, 'id')))
}

function fontUit(f: FormData) {
  return {
    name: tekst(f, 'name'),
    role: uit<BrandFont['role']>(f, 'role', ['koppen', 'tekst', 'accent'] as const, 'koppen'),
    weights: ofNull(f, 'weights'),
    licence: uit<BrandFont['licence']>(f, 'licence', ['open', 'web', 'desktop', 'onbekend'] as const, 'onbekend'),
    fallback: ofNull(f, 'fallback'),
    notes: ofNull(f, 'notes'),
    fileId: ofNull(f, 'fileId'),
  }
}

export async function nieuwFont(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), () => voegFontToe(tekst(formData, 'organizationId'), fontUit(formData)))
}

export async function bewerkFont(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), () => wijzigFont(tekst(formData, 'id'), fontUit(formData)))
}

export async function wisFont(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), () => verwijderFont(tekst(formData, 'id')))
}

export async function bewaarStem(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  return veilig(tekst(formData, 'slug'), () =>
    zetStem(
      tekst(formData, 'organizationId'),
      {
        address: tekst(formData, 'address') ? uit<NonNullable<BrandVoice['address']>>(formData, 'address', ['je', 'u', 'wisselend'] as const, 'je') : null,
        character: ofNull(formData, 'character'),
        wordsYes: ofNull(formData, 'wordsYes'),
        wordsNo: ofNull(formData, 'wordsNo'),
        goodExamples: ofNull(formData, 'goodExamples'),
        badExamples: ofNull(formData, 'badExamples'),
        ctas: ofNull(formData, 'ctas'),
      },
      user.id,
    ),
  )
}

/* ------------------------------ Stylesheet ------------------------------- */

const ROLLEN_TEKST = TEKSTROLLEN.map((t) => t.rol)

export async function bewaarTekststijl(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const rol = uit<TekstRol>(formData, 'rol', ROLLEN_TEKST, 'body')
  const velden = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]))
  const r = tekststijlUit(velden)
  if (!r.ok) return { ok: false, error: r.fout }
  return veilig(tekst(formData, 'slug'), () => zetTekststijl(tekst(formData, 'organizationId'), rol, r.stijl))
}

export async function wisTekststijlActie(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const rol = uit<TekstRol>(formData, 'rol', ROLLEN_TEKST, 'body')
  return veilig(tekst(formData, 'slug'), () => wisTekststijl(tekst(formData, 'organizationId'), rol))
}

export async function bewaarKnop(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const fouten: string[] = []
  const kleur = (naam: string, label: string) => {
    const invoer = tekst(formData, naam)
    if (!invoer) return null
    const hex = hexUit(invoer)
    if (!hex) fouten.push(`${label}: “${invoer}” is geen kleurcode.`)
    return hex
  }
  const geheel = (naam: string, min: number, max: number, label: string) => {
    const invoer = tekst(formData, naam).replace(/px/i, '').trim()
    if (!invoer) return null
    const n = Math.round(Number(invoer.replace(',', '.')))
    if (!Number.isFinite(n) || n < min || n > max) {
      fouten.push(`${label} moet tussen ${min} en ${max} liggen.`)
      return null
    }
    return n
  }
  const gewicht = Number(tekst(formData, 'weight'))
  const knop: Knop = {
    fontFamily: ofNull(formData, 'fontFamily'),
    weight: GEWICHTEN.some((g) => g.waarde === gewicht) ? gewicht : null,
    sizePx: geheel('sizePx', 6, 200, 'Lettergrootte'),
    uppercase: formData.get('uppercase') === 'on',
    radiusPx: geheel('radiusPx', 0, 999, 'Afronding'),
    kleuren: {
      normal: { bg: null, tekst: null, rand: null },
      hover: { bg: null, tekst: null, rand: null },
      active: { bg: null, tekst: null, rand: null },
    },
  }
  for (const { toestand, label } of TOESTANDEN) {
    knop.kleuren[toestand] = {
      bg: kleur(`${toestand}Bg`, `${label}, achtergrond`),
      tekst: kleur(`${toestand}Text`, `${label}, tekst`),
      rand: kleur(`${toestand}Border`, `${label}, rand`),
    }
  }
  if (fouten.length) return { ok: false, error: fouten.join(' ') }
  return veilig(tekst(formData, 'slug'), () => zetKnop(tekst(formData, 'organizationId'), knop, user.id))
}

export async function logoNietVanToepassing(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const variant = uit<LogoSlot>(formData, 'variant', LOGO_SLOTS.map((l) => l.variant), 'primair')
  return veilig(tekst(formData, 'slug'), () =>
    zetLogoNietVanToepassing(tekst(formData, 'organizationId'), variant, tekst(formData, 'nvt') === '1', user.id),
  )
}
