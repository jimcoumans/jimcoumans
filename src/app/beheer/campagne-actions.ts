'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import {
  CampagneError,
  getCampagne,
  maakCampagne,
  wijzigCampagne,
  voegDoelgroepToe,
  koppelDoelgroepen,
  ontkoppelDoelgroep,
  verwijderDoelgroep,
  wijzigDoelgroepRegel,
  voegTijdlijnToe,
  suggereerTijdlijn,
  suggereerSamenvatting,
  verstuurAlsVoorstel,
  zetAkkoord,
  zetStatus,
  verwijderCampagne,
  raakAan,
} from '@/lib/campagnes'
import { zetCampagneInClickUp } from '@/lib/clickup/campagne'
import { draaiVerwerkingTerug, VerwerkError } from '@/lib/campagne-verwerken'
import { slaConceptOp, type Opgeslagen } from '@/lib/briefing-opslaan'
import type { ActionResult } from './actions'

/* Acties voor campagnebriefings. Elke actie begint met requireStaff():
   een server action is een publiek endpoint. */

async function veilig(campaignId: string | null, fn: () => Promise<void>, aanraken = true): Promise<ActionResult> {
  try {
    await fn()
    if (campaignId && aanraken) await raakAan(campaignId)
    revalidatePath('/beheer/campagnes')
    if (campaignId) revalidatePath(`/beheer/campagnes/${campaignId}`)
    return { ok: true }
  } catch (error) {
    if (error instanceof CampagneError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[campagnes] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, naam: string) => String(f.get(naam) ?? '').trim()
const ofNull = (f: FormData, naam: string) => tekst(f, naam) || null

/* ------------------------------ Aanmaken -------------------------------- */

export async function nieuweCampagne(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  let id = ''
  const r = await veilig(null, async () => {
    const organizationId = tekst(formData, 'organizationId')
    if (organizationId === '') throw new CampagneError('Kies de klant.')
    const c = await maakCampagne({ organizationId, title: tekst(formData, 'title'), createdByUserId: user.id })
    id = c.id
  })
  if (r.ok && id) redirect(`/beheer/campagnes/${id}`)
  return r
}

/* ------------------------------ Briefing -------------------------------- */

/**
 * De hele briefing in één keer opslaan: wat je in het scherm wijzigde, in
 * één transactie. Geeft de ids van nieuwe regels terug, zodat het scherm
 * bij de volgende keer opslaan weet dat ze al bestaan.
 */
export async function slaBriefingOp(
  campaignId: string,
  concept: unknown,
  sinds: string,
): Promise<{ ok: true; ids: Record<string, string>; stempel: string } | { ok: false; error: string }> {
  await requireStaff()
  let uit: Opgeslagen | null = null
  const r = await veilig(
    campaignId,
    async () => {
      uit = await slaConceptOp(campaignId, concept, sinds)
    },
    false,
  )
  if (!r.ok) return r
  revalidatePath(`/beheer/campagnes/${campaignId}/briefing`)
  const o = uit as Opgeslagen | null
  return { ok: true, ids: o?.ids ?? {}, stempel: o?.stempel ?? new Date().toISOString() }
}

export async function doeSuggestieSamenvatting(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    const v = await getCampagne(id)
    if (!v) throw new CampagneError('Deze campagne bestaat niet meer.')
    await wijzigCampagne(id, { summary: suggereerSamenvatting(v) })
  })
}

/* ------------------------------ Regels ---------------------------------- */

/** "Doe suggestie": een tijdlijn uit start, einde en wat er gemaakt moet worden. Voegt toe, wist niets. */
export async function doeSuggestieTijdlijn(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    const v = await getCampagne(id)
    if (!v) throw new CampagneError('Deze campagne bestaat niet meer.')
    if (!v.campagne.startOn || !v.campagne.endOn) throw new CampagneError('Vul eerst de start- en einddatum in.')
    const bestaand = new Set(v.tijdlijn.map((t) => t.description.toLowerCase()))
    const regels = suggereerTijdlijn({
      start: v.campagne.startOn,
      einde: v.campagne.endOn,
      kanalen: v.kanalen,
      marketingmanagerId: v.campagne.marketingManagerId,
    })
    for (const r of regels) if (!bestaand.has(r.description.toLowerCase())) await voegTijdlijnToe(id, r)
  })
}

export async function nieuweDoelgroep(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId') || null, async () => {
    await voegDoelgroepToe(tekst(formData, 'organizationId'), tekst(formData, 'name'), ofNull(formData, 'description'))
    const slug = tekst(formData, 'slug')
    if (slug) revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/** Met de hand een doelgroep toevoegen: hij komt bij de klant en meteen in deze campagne. */
export async function doelgroepInCampagne(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    const v = await getCampagne(id)
    if (!v) throw new CampagneError('Deze campagne bestaat niet meer.')
    const d = await voegDoelgroepToe(v.organisatie.id, tekst(formData, 'name'), ofNull(formData, 'description'))
    if (d) await koppelDoelgroepen(id, [d.id])
    revalidatePath(`/beheer/klanten/${v.organisatie.slug}`)
  })
}

/** Bestaande doelgroepen van de klant aan deze campagne hangen. */
export async function kiesDoelgroepen(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, () => koppelDoelgroepen(id, formData.getAll('audienceIds').map(String)))
}

export async function haalDoelgroepWeg(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, () => ontkoppelDoelgroep(id, tekst(formData, 'id')))
}

export async function bewerkDoelgroep(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId') || null, async () => {
    await wijzigDoelgroepRegel(tekst(formData, 'id'), tekst(formData, 'name'), ofNull(formData, 'description'))
    const slug = tekst(formData, 'slug')
    if (slug) revalidatePath(`/beheer/klanten/${slug}`)
  })
}

export async function wisDoelgroep(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(null, async () => {
    await verwijderDoelgroep(tekst(formData, 'id'))
    const slug = tekst(formData, 'slug')
    if (slug) revalidatePath(`/beheer/klanten/${slug}`)
  })
}

/* ------------------------------ Status ---------------------------------- */

export async function verstuurVoorstel(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    await verstuurAlsVoorstel(id, user.id)
  }, false)
}

/**
 * De klant is akkoord. Daarna de tijdlijn naar ClickUp. Lukt ClickUp niet,
 * dan blijft het akkoord staan en zeggen we wat er misging: het akkoord is
 * van de klant, ClickUp is ons gereedschap.
 */
export async function klantAkkoord(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const id = tekst(formData, 'campaignId')
  const r = await veilig(id, () => zetAkkoord(id, user.id), false)
  if (!r.ok) return r
  try {
    const v = await getCampagne(id)
    if (!v) return r
    const uit = await zetCampagneInClickUp(v)
    revalidatePath(`/beheer/campagnes/${id}`)
    if (!uit.gedaan) return { ok: false, error: `Akkoord vastgelegd. ${uit.reden}` }
    return r
  } catch (error) {
    console.error('[campagnes] ClickUp:', error)
    return { ok: false, error: 'Akkoord vastgelegd, maar ClickUp gaf een fout. Kijk in de serverlogs.' }
  }
}

/** Opnieuw proberen, als ClickUp bij het akkoord niet lukte. */
export async function naarClickUp(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  try {
    const v = await getCampagne(id)
    if (!v) return { ok: false, error: 'Deze campagne bestaat niet meer.' }
    if (v.campagne.status !== 'akkoord') return { ok: false, error: 'Pas na akkoord van de klant naar ClickUp.' }
    const uit = await zetCampagneInClickUp(v)
    revalidatePath(`/beheer/campagnes/${id}`)
    return uit.gedaan ? { ok: true } : { ok: false, error: uit.reden }
  } catch (error) {
    console.error('[campagnes] ClickUp:', error)
    return { ok: false, error: 'ClickUp gaf een fout. Kijk in de serverlogs.' }
  }
}

export async function terugNaarConcept(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, () => zetStatus(id, 'concept'), false)
}

export async function rondAf(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, () => zetStatus(id, 'afgerond'), false)
}

export async function wisCampagne(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  const r = await veilig(id, () => verwijderCampagne(id), false)
  if (r.ok) redirect('/beheer/campagnes')
  return r
}

/** De laatste AI-verwerking terugdraaien: de briefing staat weer zoals hij daarvoor was. */
export async function draaiVerwerkingTerugActie(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const campaignId = tekst(formData, 'campaignId')
  const id = tekst(formData, 'id')
  return veilig(
    campaignId,
    async () => {
      try {
        await draaiVerwerkingTerug(id)
      } catch (error) {
        if (error instanceof VerwerkError) throw new CampagneError(error.message)
        throw error
      }
    },
    false,
  )
}
