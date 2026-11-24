'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { KoppelingFout } from '@/lib/performance/google'
import { getKoppeling, zetKoppeling, verwijderKoppeling, zetCampagnes, type Campagne } from '@/lib/performance/lezen'
import { accountsVan } from '@/lib/performance/koppeling'
import { haalMetaCampagnes } from '@/lib/performance/meta'
import { haalLinkedinCampagnes } from '@/lib/performance/linkedin'
import { metLinkedinToegang } from '@/lib/performance/linkedin-verbinding'
import { vergeet } from '@/lib/cache'
import { syncAlles } from '@/lib/performance/sync'
import { alleKeuzes } from '@/lib/performance/oauth'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, type AnalyticsConnection } from '@/db/schema'
import type { ActionResult } from './actions'

const BRONNEN = ['ga4', 'search_console', 'google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads', 'ahrefs', 'google_business'] as const
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
  const keuzes = formData.getAll('keuze').map((v) => String(v).trim()).filter(Boolean)
  const los = tekst(formData, 'externalId')
  return veilig(tekst(formData, 'slug'), async () => {
    // Bij Ahrefs mag je naast de lijst een ander domein invullen; dat wint dan.
    if (keuzes.length && !(bron === 'ahrefs' && los)) {
      // Gekozen uit de lijst: verbinding en ID komen uit wat het platform zelf gaf.
      // Bij Meta en Ahrefs is er geen verbinding; de keuze begint dan met "|". Bij LinkedIn is het een LinkedIn-verbinding.
      const alle = (await alleKeuzes()).keuzes
      const gevonden = keuzes.map((keuze) => {
        const scheiding = keuze.indexOf('|')
        const verbindingId = keuze.slice(0, scheiding)
        const externalId = keuze.slice(scheiding + 1)
        const g = alle.find((k) => k.verbindingId === verbindingId && k.externalId === externalId && k.source === bron)
        if (!g) throw new KoppelingFout('Deze keuze staat niet (meer) in de lijst. Ververs de lijst onder Koppelingen en probeer opnieuw.')
        return g
      })
      // Alleen bij LinkedIn kunnen het er meer zijn; die tellen we bij elkaar op.
      if (gevonden.length > 1 && bron !== 'linkedin_ads') throw new KoppelingFout('Kies één account.')
      const eerste = gevonden[0]!
      const via = bron === 'linkedin_ads' ? { linkedinConnectionId: eerste.verbindingId || null } : bron === 'ahrefs' ? {} : { googleConnectionId: eerste.verbindingId || null }
      await zetKoppeling(orgId, bron, eerste.externalId, {
        ...via,
        displayName: eerste.naam,
        accounts: gevonden.map((g) => ({ id: g.externalId, naam: g.naam, verbinding: g.verbindingId || null })),
      })
    } else {
      if (!los) throw new KoppelingFout(bron === 'ahrefs' ? 'Vul het domein van de website in.' : 'Kies een account uit de lijst.')
      await zetKoppeling(orgId, bron, los)
    }
    // Meteen een eerste keer ophalen, zodat je ziet of de toegang klopt.
    await syncAlles({ organizationId: orgId, budgetMs: 15000 })
  })
}

/**
 * Welke campagnes van het account bij deze klant horen. Niets aangevinkt
 * is: het hele account. De namen komen van het platform zelf, niet uit het
 * formulier. Bij LinkedIn is de waarde "account|campagne", want een klant
 * kan er meer accounts hebben.
 */
export async function kiesCampagnes(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const orgId = tekst(formData, 'organizationId')
  const koppelingId = tekst(formData, 'koppelingId')
  const ruw = formData.getAll('campagne').map((v) => String(v).trim()).filter(Boolean)
  const nietMeer = new KoppelingFout('Een aangevinkte campagne staat niet (meer) in dit account. Herlaad de pagina en kies opnieuw.')
  return veilig(tekst(formData, 'slug'), async () => {
    const k = await getKoppeling(koppelingId)
    if (!k) throw new KoppelingFout('Deze koppeling bestaat niet (meer).')
    const campagnes: Campagne[] = []
    if (k.source === 'meta_ads') {
      const gekozen = new Set(ruw.filter((v) => /^\d+$/.test(v)))
      const lijst = gekozen.size ? await haalMetaCampagnes(k.externalId) : []
      campagnes.push(...lijst.filter((c) => gekozen.has(c.id)).map((c) => ({ id: c.id, naam: c.naam })))
      if (campagnes.length !== gekozen.size) throw nietMeer
      vergeet(`meta:campagnes:${k.externalId}`)
    } else if (k.source === 'linkedin_ads') {
      for (const a of accountsVan(k)) {
        const gekozen = new Set(ruw.filter((v) => v.startsWith(`${a.id}|`)).map((v) => v.slice(a.id.length + 1)).filter((v) => /^\d+$/.test(v)))
        if (gekozen.size === 0) continue
        const lijst = await metLinkedinToegang(a.verbinding ?? k.linkedinConnectionId, (toegang) => haalLinkedinCampagnes(a.id, toegang))
        const van = lijst.filter((c) => gekozen.has(c.id)).map((c) => ({ id: c.id, naam: c.naam, account: a.id }))
        if (van.length !== gekozen.size) throw nietMeer
        campagnes.push(...van)
        vergeet(`linkedin:campagnes:${a.id}`)
      }
    } else {
      throw new KoppelingFout('Campagnes kiezen kan bij Meta Ads en LinkedIn Ads.')
    }
    await zetCampagnes(koppelingId, campagnes)
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

const HOOFDDOELEN = ['aanvragen', 'reserveringen', 'omzet', 'naamsbekendheid'] as const

/** Hoofddoel en livegang: waar de rapportage op stuurt en wanneer de leerfase loopt. */
export async function zetResultaatInstellingen(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const orgId = tekst(formData, 'organizationId')
  const doel = tekst(formData, 'hoofddoel')
  const live = tekst(formData, 'liveOn')
  if (doel && !(HOOFDDOELEN as readonly string[]).includes(doel)) return { ok: false, error: 'Onbekend hoofddoel.' }
  if (live && !/^\d{4}-\d{2}-\d{2}$/.test(live)) return { ok: false, error: 'Vul de livegang in als datum.' }
  return veilig(tekst(formData, 'slug'), async () => {
    await db
      .update(organizations)
      .set({ mainGoal: (doel || null) as (typeof HOOFDDOELEN)[number] | null, liveOn: live || null })
      .where(eq(organizations.id, orgId))
  })
}
