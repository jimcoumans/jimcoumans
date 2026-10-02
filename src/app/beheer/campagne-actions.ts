'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { parsePercentageToBp, parseHonderdsten } from '@/lib/hypothese'
import {
  CampagneError,
  VOORSTEL_VELDEN,
  getCampagne,
  maakCampagne,
  wijzigCampagne,
  zetContactpersonen,
  zetSpecialisten,
  voegDoelgroepToe,
  koppelDoelgroepen,
  ontkoppelDoelgroep,
  verwijderDoelgroep,
  voegKpiToe,
  verwijderKpi,
  wijzigKpiRegel,
  wijzigKanaalRegel,
  wijzigDoelgroepRegel,
  voegKanaalToe,
  wisselKanaalStatus,
  verwijderKanaal,
  voegTijdlijnToe,
  wijzigTijdlijn,
  verwijderTijdlijn,
  suggereerTijdlijn,
  suggereerSamenvatting,
  verstuurAlsVoorstel,
  zetAkkoord,
  zetStatus,
  verwijderCampagne,
  raakAan,
} from '@/lib/campagnes'
import { zetCampagneInClickUp } from '@/lib/clickup/campagne'
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

function datum(f: FormData, naam: string): Date | null {
  const waarde = tekst(f, naam)
  if (waarde === '') return null
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** De voorstel-vinkjes die in dit formulier stonden, samengevoegd met de rest. */
async function voorstelVelden(campaignId: string, f: FormData, inDitFormulier: (keyof typeof VOORSTEL_VELDEN)[]) {
  const v = await getCampagne(campaignId)
  const bestaand = new Set(v?.campagne.proposalFields ?? [])
  for (const veld of inDitFormulier) {
    if (f.get(`voorstel_${veld}`) === 'on') bestaand.add(veld)
    else bestaand.delete(veld)
  }
  return [...bestaand]
}

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

export async function wijzigBasis(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    const mm = ofNull(formData, 'marketingManagerId')
    await wijzigCampagne(id, {
      title: tekst(formData, 'title'),
      marketingManagerId: mm,
    })
    await zetContactpersonen(id, formData.getAll('contactIds').map(String).filter(Boolean))
    // De marketingmanager is geen specialist naast zichzelf.
    await zetSpecialisten(
      id,
      formData
        .getAll('specialistIds')
        .map(String)
        .filter((u) => u && u !== mm),
    )
  })
}

export async function wijzigDoel(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    const stand = tekst(formData, 'budgetMode') === 'vast' ? 'vast' : 'berekend'
    let vast: number | null = null
    if (stand === 'vast') {
      vast = parseAmountToCents(tekst(formData, 'fixedBudget'))
      if (!vast || vast <= 0) throw new CampagneError('Vul bij een vast budget het bedrag in.')
    }
    await wijzigCampagne(id, {
      goalSentence: ofNull(formData, 'goalSentence'),
      resultDefinition: ofNull(formData, 'resultDefinition'),
      budgetMode: stand,
      fixedBudgetCents: vast,
      budgetNote: ofNull(formData, 'budgetNote'),
      kpiNotes: ofNull(formData, 'kpiNotes'),
      proposalFields: await voorstelVelden(id, formData, ['doel', 'budget']),
    })
  })
}

export async function wijzigAanbod(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    await wijzigCampagne(id, {
      offerWhat: ofNull(formData, 'offerWhat'),
      offerMessage: ofNull(formData, 'offerMessage'),
      offerWhyNow: ofNull(formData, 'offerWhyNow'),
      offerNotPromised: ofNull(formData, 'offerNotPromised'),
      proposalFields: await voorstelVelden(id, formData, ['kernboodschap']),
    })
  })
}

export async function wijzigDoelgroep(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    await wijzigCampagne(id, {
      region: ofNull(formData, 'region'),
      exclusions: ofNull(formData, 'exclusions'),
      audienceNotes: ofNull(formData, 'audienceNotes'),
      proposalFields: await voorstelVelden(id, formData, ['regio']),
    })
  })
}

export async function wijzigPlanning(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    await wijzigCampagne(id, {
      startOn: datum(formData, 'startOn'),
      endOn: datum(formData, 'endOn'),
      planningNotes: ofNull(formData, 'planningNotes'),
    })
  })
}

export async function wijzigAfspraken(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    await wijzigCampagne(id, {
      clientDoes: ofNull(formData, 'clientDoes'),
      agreementNotes: ofNull(formData, 'agreementNotes'),
    })
  })
}

export async function wijzigAchtergrond(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    await wijzigCampagne(id, {
      backgroundPrevious: ofNull(formData, 'backgroundPrevious'),
      backgroundRisks: ofNull(formData, 'backgroundRisks'),
    })
  })
}

export async function wijzigAannames(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    const eenheden = parseHonderdsten(tekst(formData, 'units'))
    if (eenheden === null || eenheden <= 0) throw new CampagneError('Eenheden per conversie is een getal groter dan nul, meestal 1.')
    const percentage = (naam: string, label: string) => {
      const ruw = tekst(formData, naam)
      if (ruw === '') return null
      const bp = parsePercentageToBp(ruw)
      if (bp === null || bp <= 0 || bp > 10_000) throw new CampagneError(`${label}: vul een percentage in, bijvoorbeeld 2,5.`)
      return bp
    }
    const cpmRuw = tekst(formData, 'cpm')
    const cpm = cpmRuw === '' ? null : parseAmountToCents(cpmRuw)
    if (cpmRuw !== '' && (!cpm || cpm <= 0)) throw new CampagneError('Kosten per 1.000 impressies: vul een bedrag in, bijvoorbeeld 8.')
    const buffer = percentage('buffer', 'Buffer') ?? 0
    const aandeel = percentage('adsShare', 'Deel uit advertenties')
    await wijzigCampagne(id, {
      unitsPerConversionHundredths: eenheden,
      conversionRateBp: percentage('conversion', 'Conversieratio'),
      clickThroughRateBp: percentage('ctr', 'Doorklikratio'),
      cpmCents: cpm,
      bufferBp: buffer,
      adsShareBp: aandeel,
      sourceUnits: ofNull(formData, 'sourceUnits'),
      sourceConversion: ofNull(formData, 'sourceConversion'),
      sourceClickThrough: ofNull(formData, 'sourceClickThrough'),
      sourceCpm: ofNull(formData, 'sourceCpm'),
      assumptionNotes: ofNull(formData, 'assumptionNotes'),
    })
  })
}

export async function wijzigSamenvatting(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, async () => {
    await wijzigCampagne(id, { summary: ofNull(formData, 'summary') })
  })
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

function kpiUit(formData: FormData) {
  const aantal = Number.parseInt(tekst(formData, 'targetQuantity'), 10)
  const prijsRuw = tekst(formData, 'price')
  const prijs = prijsRuw === '' ? null : parseAmountToCents(prijsRuw)
  if (prijsRuw !== '' && prijs === null) throw new CampagneError('Vul de prijs in als bedrag, bijvoorbeeld 110.')
  return { label: tekst(formData, 'label'), on: datum(formData, 'on'), targetQuantity: aantal, priceCents: prijs }
}

export async function nieuweKpi(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, () => voegKpiToe(id, kpiUit(formData)))
}

export async function wijzigKpi(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId'), () => wijzigKpiRegel(tekst(formData, 'id'), kpiUit(formData)))
}

export async function wisKpi(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId'), () => verwijderKpi(tekst(formData, 'id')))
}

function kanaalUit(formData: FormData) {
  return {
    kind: tekst(formData, 'kind'),
    quantity: ofNull(formData, 'quantity'),
    note: ofNull(formData, 'note'),
    status: (tekst(formData, 'status') === 'bestaat' ? 'bestaat' : 'maken') as 'bestaat' | 'maken',
  }
}

export async function nieuwKanaal(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, () => voegKanaalToe(id, kanaalUit(formData)))
}

export async function wijzigKanaal(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId'), () => wijzigKanaalRegel(tekst(formData, 'id'), kanaalUit(formData)))
}

export async function wisselKanaal(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId'), () => wisselKanaalStatus(tekst(formData, 'id')))
}

export async function wisKanaal(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId'), () => verwijderKanaal(tekst(formData, 'id')))
}

function tijdlijnUit(formData: FormData) {
  const wie = tekst(formData, 'assignee')
  return {
    dueOn: datum(formData, 'dueOn'),
    description: tekst(formData, 'description'),
    assigneeUserId: wie.startsWith('user:') ? wie.slice(5) : null,
    assigneeLabel: wie.startsWith('label:') ? wie.slice(6) : null,
  }
}

export async function nieuweTijdlijn(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'campaignId')
  return veilig(id, () => voegTijdlijnToe(id, tijdlijnUit(formData)))
}

export async function wijzigTijdlijnRegel(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId'), () => wijzigTijdlijn(tekst(formData, 'id'), tijdlijnUit(formData)))
}

export async function wisTijdlijn(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(tekst(formData, 'campaignId'), () => verwijderTijdlijn(tekst(formData, 'id')))
}

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
