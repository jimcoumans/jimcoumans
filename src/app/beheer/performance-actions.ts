'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { KoppelingFout } from '@/lib/performance/google'
import { zetKoppeling, verwijderKoppeling } from '@/lib/performance/lezen'
import { syncAlles } from '@/lib/performance/sync'
import { alleKeuzes } from '@/lib/performance/oauth'
import type { AnalyticsConnection } from '@/db/schema'
import type { ActionResult } from './actions'

const BRONNEN = ['ga4', 'search_console', 'google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads'] as const
const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

function ververs(slug: string) {
  if (slug) revalidatePath(`/beheer/klanten/${slug}`)
  revalidatePath('/beheer/performance')
}

async function veilig(slug: string, fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    ververs(slug)
    return { ok: true }
  } catch (error) {
    if (error instanceof KoppelingFout) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[performance] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

export async function koppel(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const bron = tekst(formData, 'bron') as AnalyticsConnection['source']
  if (!(BRONNEN as readonly string[]).includes(bron)) return { ok: false, error: 'Onbekende bron.' }
  const orgId = tekst(formData, 'organizationId')
  const keuze = tekst(formData, 'keuze')
  return veilig(tekst(formData, 'slug'), async () => {
    if (keuze) {
      // Gekozen uit de lijst: verbinding en ID komen uit wat Google zelf gaf.
      const scheiding = keuze.indexOf('|')
      const verbindingId = keuze.slice(0, scheiding)
      const externalId = keuze.slice(scheiding + 1)
      const gevonden = (await alleKeuzes()).keuzes.find((k) => k.verbindingId === verbindingId && k.externalId === externalId && k.source === bron)
      if (!gevonden) throw new KoppelingFout('Deze keuze staat niet (meer) in de lijst. Ververs de lijst onder Koppelingen en probeer opnieuw.')
      await zetKoppeling(orgId, bron, externalId, { googleConnectionId: verbindingId, displayName: gevonden.naam })
    } else {
      const externalId = tekst(formData, 'externalId')
      if (!externalId) throw new KoppelingFout('Kies een property uit de lijst.')
      await zetKoppeling(orgId, bron, externalId)
    }
    // Meteen een eerste keer ophalen, zodat je ziet of de toegang klopt.
    await syncAlles({ organizationId: orgId, budgetMs: 15000 })
  })
}

export async function ontkoppel(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'slug'), () => verwijderKoppeling(tekst(formData, 'id')))
}

export async function nuBijwerken(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const orgId = tekst(formData, 'organizationId')
  return veilig(tekst(formData, 'slug'), async () => {
    const uit = await syncAlles({ organizationId: orgId, budgetMs: 18000 })
    const mis = uit.filter((u) => !u.ok)
    if (mis.length) throw new KoppelingFout(mis.map((m) => m.melding).join(' '))
  })
}
