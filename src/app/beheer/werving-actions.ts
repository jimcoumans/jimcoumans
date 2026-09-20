'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { vergeet } from '@/lib/cache'
import {
  maakVacature,
  zetVacatureStatus,
  maakKandidaat,
  zetVervolgstap,
  markeerBeantwoord,
  zetKandidaatStatus,
  zetBewaartoestemming,
  wisKandidaat,
  WervingError,
  type KandidaatStatus,
} from '@/lib/werving'
import type { ActionResult } from './actions'

/* Acties voor werving. Elke actie begint met requireStaff(): een server
   action is een publiek endpoint. */

async function veilig(fn: () => Promise<void>, ook: string[] = []): Promise<ActionResult> {
  try {
    await fn()
    vergeet()
    revalidatePath('/beheer/werving')
    revalidatePath('/beheer')
    for (const pad of ook) revalidatePath(pad)
    return { ok: true }
  } catch (error) {
    if (error instanceof WervingError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[werving] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (formData: FormData, naam: string) => String(formData.get(naam) ?? '').trim()

/**
 * Een datum uit een `<input type="date">`.
 *
 * Op het middaguur en niet om middernacht: een datum zonder tijd wordt in
 * UTC uitgelegd en schuift dan in een Nederlandse zomer een dag terug op het
 * scherm. Het middaguur ligt daar ruim buiten.
 */
function datum(formData: FormData, naam: string): Date | null {
  const waarde = tekst(formData, naam)
  if (waarde === '') return null
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Een geheel getal uit het formulier, of null. */
function getal(formData: FormData, naam: string): number | null {
  const waarde = tekst(formData, naam)
  if (waarde === '') return null
  const n = Number(waarde)
  return Number.isInteger(n) ? n : null
}

/* --- Vacatures ------------------------------------------------------------ */

export async function nieuweVacature(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const uren = tekst(formData, 'uren')
  let urenKwartier: number | null = null
  if (uren !== '') {
    const n = Number(uren.replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, error: 'Het aantal uren is niet te lezen. Schrijf het als 32 of 24,5.' }
    }
    urenKwartier = Math.round(n * 100)
  }

  return veilig(async () => {
    await maakVacature({
      title: tekst(formData, 'titel'),
      kind:
        tekst(formData, 'soort') === 'stage'
          ? 'stage'
          : tekst(formData, 'soort') === 'freelance'
            ? 'freelance'
            : 'dienstverband',
      positions: getal(formData, 'plekken') ?? 1,
      ownerUserId: tekst(formData, 'eigenaar') || null,
      salaryScaleName: tekst(formData, 'schaal') || null,
      salaryStepMin: getal(formData, 'tredeMin'),
      salaryStepMax: getal(formData, 'tredeMax'),
      hoursPerWeekQuarters: urenKwartier,
      reason: tekst(formData, 'reden') || null,
      description: tekst(formData, 'omschrijving') || null,
      // Een aangevinkt vakje stuurt 'on'; een keuzelijst zou 'ja' sturen.
      meteenOpen: ['ja', 'on', 'true'].includes(tekst(formData, 'meteenOpen')),
    })
  })
}

export async function vacatureStatus(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'vacatureId')
  const status = tekst(formData, 'status')
  if (!id) return { ok: false, error: 'Onbekende vacature.' }

  const toegestaan = ['concept', 'open', 'gepauzeerd', 'vervuld', 'ingetrokken'] as const
  if (!(toegestaan as readonly string[]).includes(status)) {
    return { ok: false, error: 'Onbekende status.' }
  }

  return veilig(() => zetVacatureStatus(id, status as (typeof toegestaan)[number]), [
    `/beheer/werving/${id}`,
  ])
}

/* --- Kandidaten ----------------------------------------------------------- */

export async function nieuweKandidaat(formData: FormData): Promise<ActionResult> {
  await requireStaff()

  const vacatureId = tekst(formData, 'vacatureId') || null
  const bron = tekst(formData, 'bron')
  const toegestaneBronnen = [
    'website',
    'linkedin',
    'indeed',
    'school',
    'doorverwijzing',
    'zelf_benaderd',
    'open_sollicitatie',
    'anders',
  ] as const

  return veilig(
    async () => {
      await maakKandidaat({
        vacancyId: vacatureId,
        firstName: tekst(formData, 'voornaam') || null,
        infix: tekst(formData, 'tussenvoegsel') || null,
        lastName: tekst(formData, 'achternaam') || null,
        email: tekst(formData, 'email') || null,
        phone: tekst(formData, 'telefoon') || null,
        linkedinUrl: tekst(formData, 'linkedin') || null,
        source: (toegestaneBronnen as readonly string[]).includes(bron)
          ? (bron as (typeof toegestaneBronnen)[number])
          : 'zelf_benaderd',
        referredByUserId: tekst(formData, 'doorverwezenDoor') || null,
        school: tekst(formData, 'school') || null,
        study: tekst(formData, 'opleiding') || null,
        appliedOn: datum(formData, 'sollicitatiedatum') ?? new Date(),
        notes: tekst(formData, 'notities') || null,
        nextAction: tekst(formData, 'actie') || null,
        nextActionOn: datum(formData, 'actiedatum'),
      })
    },
    vacatureId ? [`/beheer/werving/${vacatureId}`] : [],
  )
}

export async function kandidaatBeantwoord(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'kandidaatId')
  if (!id) return { ok: false, error: 'Onbekende kandidaat.' }

  const vacatureId = tekst(formData, 'vacatureId')
  return veilig(() => markeerBeantwoord(id), vacatureId ? [`/beheer/werving/${vacatureId}`] : [])
}

export async function kandidaatVervolgstap(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'kandidaatId')
  if (!id) return { ok: false, error: 'Onbekende kandidaat.' }

  const vacatureId = tekst(formData, 'vacatureId')
  return veilig(
    () => zetVervolgstap(id, tekst(formData, 'actie') || null, datum(formData, 'actiedatum')),
    vacatureId ? [`/beheer/werving/${vacatureId}`] : [],
  )
}

export async function kandidaatStatus(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'kandidaatId')
  const status = tekst(formData, 'status')
  if (!id) return { ok: false, error: 'Onbekende kandidaat.' }

  const toegestaan = [
    'nieuw',
    'in_gesprek',
    'tweede_gesprek',
    'aanbod',
    'aangenomen',
    'afgewezen',
    'afgehaakt',
  ] as const
  if (!(toegestaan as readonly string[]).includes(status)) {
    return { ok: false, error: 'Onbekende status.' }
  }

  const vacatureId = tekst(formData, 'vacatureId')
  return veilig(
    () => zetKandidaatStatus(id, status as KandidaatStatus, tekst(formData, 'reden') || null),
    vacatureId ? [`/beheer/werving/${vacatureId}`] : [],
  )
}

export async function kandidaatBewaartoestemming(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'kandidaatId')
  if (!id) return { ok: false, error: 'Onbekende kandidaat.' }

  const vacatureId = tekst(formData, 'vacatureId')
  return veilig(
    () => zetBewaartoestemming(id, ['ja', 'on', 'true'].includes(tekst(formData, 'gegeven'))),
    vacatureId ? [`/beheer/werving/${vacatureId}`] : [],
  )
}

export async function kandidaatWissen(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const id = tekst(formData, 'kandidaatId')
  if (!id) return { ok: false, error: 'Onbekende kandidaat.' }

  const vacatureId = tekst(formData, 'vacatureId')
  return veilig(() => wisKandidaat(id), vacatureId ? [`/beheer/werving/${vacatureId}`] : [])
}
