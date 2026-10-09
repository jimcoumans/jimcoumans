'use server'

import { revalidatePath } from 'next/cache'
import { alsBeheerder } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { vergeet } from '@/lib/cache'
import { maakHuis, corrigeerHuis, wisHuis, SalarishuisError, type HuisInvoer } from '@/lib/salarishuis'
import type { ActionResult } from './actions'

/* Het salarishuis beheren. Alleen een beheerder: hier staan de bedragen waar
   elk contract uit volgt. Elke actie controleert dat zelf, want een server
   action is een publiek endpoint. */

const GEEN_RECHT: ActionResult = { ok: false, error: 'Alleen een beheerder kan het salarishuis aanpassen.' }

/** Hoeveel schaalregels het formulier maximaal aanbiedt. */
const MAX_SCHALEN = 6

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    vergeet()
    revalidatePath('/beheer/salarishuis')
    revalidatePath('/beheer/contracten')
    return { ok: true }
  } catch (error) {
    if (error instanceof SalarishuisError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[salarishuis] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (formData: FormData, naam: string) => String(formData.get(naam) ?? '').trim()

/** "1,5" of "1.5" naar basispunten (150). Null als het niet te lezen is. */
function procent(formData: FormData, naam: string): number | null {
  const w = tekst(formData, naam).replace('%', '').replace(',', '.').trim()
  if (w === '') return null
  const n = Number(w)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

/** "40" of "37,5" naar kwartieren (4000, 3750). */
function uren(formData: FormData, naam: string): number | null {
  const w = tekst(formData, naam).replace(',', '.')
  if (w === '') return null
  const n = Number(w)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

/** Het formulier lezen. Geeft een foutmelding terug als iets niet te lezen is. */
function leesHuis(formData: FormData): HuisInvoer | string {
  const datum = tekst(formData, 'ingangsdatum')
  const effectiveFrom = new Date(`${datum}T00:00:00Z`)
  if (datum === '' || Number.isNaN(effectiveFrom.getTime())) return 'Vul de datum in vanaf wanneer dit huis geldt.'

  const baseCents = parseAmountToCents(tekst(formData, 'grondslag'))
  if (baseCents === null) return 'De grondslag is niet te lezen. Schrijf hem als 2.578,00.'

  const stepIncreaseBp = procent(formData, 'perTrede')
  const pensionAllowanceBp = procent(formData, 'opToeslag')
  const holidayAllowanceBp = procent(formData, 'vakantietoeslag')
  if (stepIncreaseBp === null || pensionAllowanceBp === null || holidayAllowanceBp === null) {
    return 'Vul de percentages in, zoals 1,5 of 10.'
  }

  const fulltime = uren(formData, 'fulltime')
  if (fulltime === null) return 'Vul in hoeveel uur fulltime is.'
  const vakantieUren = Number(tekst(formData, 'vakantieUren'))
  if (!Number.isInteger(vakantieUren)) return 'Vul de vakantie-uren per jaar bij fulltime in als heel getal.'

  const minimumTekst = tekst(formData, 'minimumloon')
  const minimumHourlyCents = minimumTekst === '' ? null : parseAmountToCents(minimumTekst)
  if (minimumTekst !== '' && minimumHourlyCents === null) return 'Het minimumuurloon is niet te lezen. Schrijf het als 14,71.'

  const schalen: HuisInvoer['schalen'] = []
  for (let n = 0; n < MAX_SCHALEN; n++) {
    const naam = tekst(formData, `schaal${n}`)
    const opslag = procent(formData, `opslag${n}`)
    const tredes = tekst(formData, `tredes${n}`)
    if (naam === '' && opslag === null && tredes === '') continue
    if (naam === '' || opslag === null || tredes === '') return `Vul bij schaal ${n + 1} de naam, de opslag en het aantal tredes in.`
    schalen.push({ name: naam, multiplierBp: opslag, steps: Number(tredes) })
  }

  return {
    effectiveFrom,
    baseCents,
    stepIncreaseBp,
    pensionAllowanceBp,
    holidayAllowanceBp,
    fulltimeHoursWeekQuarters: fulltime,
    holidayHoursFulltime: vakantieUren,
    minimumHourlyCents,
    note: tekst(formData, 'notitie') || null,
    schalen,
  }
}

export async function nieuweHuisVersie(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const invoer = leesHuis(formData)
  if (typeof invoer === 'string') return { ok: false, error: invoer }
  return veilig(async () => {
    await maakHuis(invoer, gebruiker.id)
  })
}

export async function huisCorrigeren(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const id = tekst(formData, 'huisId')
  if (!id) return { ok: false, error: 'Onbekend salarishuis.' }
  const invoer = leesHuis(formData)
  if (typeof invoer === 'string') return { ok: false, error: invoer }
  return veilig(() => corrigeerHuis(id, invoer))
}

export async function huisWissen(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const id = tekst(formData, 'huisId')
  if (!id) return { ok: false, error: 'Onbekend salarishuis.' }
  return veilig(() => wisHuis(id))
}
