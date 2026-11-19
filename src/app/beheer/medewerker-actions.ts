'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import { parseContractUren, setHourlyCost, setVerkooptarief, updateInternProfiel, updateTeamlid, updateVoorstelProfiel, TeamError } from '@/lib/team'
import { INTERNE_LIJSTEN, LIJSTEN } from '@/lib/voorstel-profiel'
import { volledigeNaam, type Aanhef } from '@/lib/namen'

const AANHEF_WAARDEN: readonly Aanhef[] = ['heer', 'mevrouw', 'neutraal']
import type { ActionResult } from './actions'
import { vergeet } from '@/lib/cache'
import { zetStandaardTekenaar } from '@/lib/bedrijf'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/* -------------------------------------------------------------------------
   Acties op het medewerkerprofiel.

   Het profiel en de uurkostprijs zijn met opzet twee aparte acties. Wat een
   uur van iemand kost mag alleen een beheerder zien en wijzigen; de rest van
   het profiel houdt de collega zelf bij. Eén formulier zou betekenen dat het
   hele profiel achter beheerdersrechten verdwijnt.
   ------------------------------------------------------------------------- */

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    // Er is iets gewijzigd, dus het onthouden dashboard klopt niet meer.
    // Weggooien is hier het goede antwoord: bijwerken zou betekenen dat je
    // per actie moet weten welke cijfers erdoor veranderen, en dat vergeet
    // iemand een keer. Opnieuw ophalen kost een seconde; een verkeerd cijfer
    // op een dashboard kost vertrouwen.
    vergeet()
    return { ok: true }
  } catch (error) {
    if (error instanceof TeamError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
    console.error('[medewerker] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

/** Leeg veld betekent "niet ingevuld", niet "nul". */
function getal(f: FormData, n: string): number | null {
  const waarde = tekst(f, n)
  if (waarde === '') return null
  const g = Number(waarde)
  return Number.isFinite(g) ? Math.trunc(g) : null
}

/**
 * Een datumveld uit de browser komt als 2024-03-01 binnen.
 *
 * Bewust op middag gezet: op middernacht schuift een datum in een andere
 * tijdzone een dag terug, en dan blijkt iemand een dag eerder in dienst te
 * zijn gegaan dan op zijn contract staat.
 */
function datum(f: FormData, n: string): Date | null {
  const waarde = tekst(f, n)
  if (waarde === '') return null
  const d = new Date(`${waarde}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function bewerkMedewerkerprofiel(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }
  // Je eigen profiel houd je zelf bij; dat van een ander alleen als beheerder.
  const beheerder = staff.role === 'admin'
  if (!beheerder && userId !== staff.id) {
    return { ok: false, error: 'Je kunt alleen je eigen profiel bijwerken. Vraag een beheerder om het profiel van een collega.' }
  }

  const uren = tekst(formData, 'contracturen')
  const urenQuarters = uren === '' ? null : parseContractUren(uren)
  if (uren !== '' && urenQuarters === null) {
    return {
      ok: false,
      error: 'Contracturen begrijp ik niet. Schrijf het als een aantal uur per week, bijvoorbeeld 32 of 36,5.',
    }
  }

  return veilig(async () => {
    const delen = {
      firstName: tekst(formData, 'voornaam') || null,
      infix: tekst(formData, 'tussenvoegsel') || null,
      lastName: tekst(formData, 'achternaam') || null,
    }
    const aanhefWaarde = tekst(formData, 'aanhef')

    const eigenaarNu = beheerder && formData.has('eigenaarKeuze') ? ['on', 'ja', 'true'].includes(tekst(formData, 'eigenaar')) : null
    const [voor] = eigenaarNu === null ? [] : await db.select({ isOwner: users.isOwner, name: users.name }).from(users).where(eq(users.id, userId)).limit(1)

    await updateTeamlid(userId, {
      name: volledigeNaam(delen) || null,
      ...delen,
      aanhef: AANHEF_WAARDEN.includes(aanhefWaarde as Aanhef)
        ? (aanhefWaarde as Aanhef)
        : null,
      jobTitle: tekst(formData, 'functie') || null,
      department: tekst(formData, 'afdeling') || null,
      phone: tekst(formData, 'telefoon') || null,
      mobile: tekst(formData, 'mobiel') || null,
      linkedinUrl: tekst(formData, 'linkedin') || null,
      birthDay: getal(formData, 'geboortedag'),
      birthMonth: getal(formData, 'geboortemaand'),
      birthYear: getal(formData, 'geboortejaar'),
      // In en uit dienst, contracturen en notities horen bij het dienstverband: die zet een beheerder.
      ...(beheerder
        ? {
            startedOn: datum(formData, 'indienst'),
            endedOn: datum(formData, 'uitdienst'),
            contractHoursPerWeekQuarters: urenQuarters,
            notes: tekst(formData, 'notities') || null,
            ...(formData.has('eigenaarKeuze') ? { isOwner: ['on', 'ja', 'true'].includes(tekst(formData, 'eigenaar')) } : {}),
          }
        : {}),
    })

    // Eigenaar geworden of niet meer: dan tekent die standaard mee, of niet meer.
    if (voor && eigenaarNu !== null && voor.isOwner !== eigenaarNu) {
      await zetStandaardTekenaar(volledigeNaam(delen) || voor.name || '', eigenaarNu)
      revalidatePath('/beheer/bedrijf')
    }

    revalidatePath('/beheer/medewerkers')
    revalidatePath(`/beheer/medewerkers/${userId}`)
    revalidatePath('/beheer/portfolio')
  })
}

/** Alleen een beheerder: dit ligt te dicht tegen salaris aan. */
export async function bewerkUurkostprijs(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  if (staff.role !== 'admin') {
    return { ok: false, error: 'Alleen een beheerder kan de uurkostprijs aanpassen.' }
  }

  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const bedrag = tekst(formData, 'kostprijs')
  let cents: number | null = null
  if (bedrag !== '') {
    cents = parseAmountToCents(bedrag)
    if (cents === null) {
      return { ok: false, error: 'Dat bedrag begrijp ik niet. Schrijf het als 42,50.' }
    }
  }

  return veilig(async () => {
    await setHourlyCost(userId, cents)
    revalidatePath(`/beheer/medewerkers/${userId}`)
  })
}

/** Het profiel voor voorstellen: je eigen, of als beheerder dat van een collega. */
export async function bewerkVoorstelprofiel(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }
  const beheerder = staff.role === 'admin'
  if (!beheerder && userId !== staff.id) {
    return { ok: false, error: 'Je kunt alleen je eigen profiel bijwerken. Vraag een beheerder om het profiel van een collega.' }
  }
  const invoer: Record<string, unknown> = { intro: tekst(formData, 'intro'), quote: tekst(formData, 'quote') }
  for (const k of LIJSTEN) invoer[k] = String(formData.get(k) ?? '')
  return veilig(async () => {
    await updateVoorstelProfiel(userId, invoer)
    revalidatePath(`/beheer/medewerkers/${userId}`)
  })
}

/** Het interne profiel: sterktes, ambitie, energie en aandachtspunten. Alleen een beheerder, ook niet de collega zelf. */
export async function bewerkInternProfiel(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  if (staff.role !== 'admin') return { ok: false, error: 'Alleen een beheerder kan het interne profiel aanpassen.' }
  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }
  const invoer: Record<string, unknown> = { bron: tekst(formData, 'bron') }
  for (const k of INTERNE_LIJSTEN) invoer[k] = String(formData.get(k) ?? '')
  return veilig(async () => {
    await updateInternProfiel(userId, invoer)
    revalidatePath(`/beheer/medewerkers/${userId}`)
  })
}

/** Het verkooptarief en de afwijkende tarieven. Alleen een beheerder. */
export async function bewerkVerkooptarief(formData: FormData): Promise<ActionResult> {
  const staff = await requireStaff()
  if (staff.role !== 'admin') return { ok: false, error: 'Alleen een beheerder kan het verkooptarief aanpassen.' }
  const userId = tekst(formData, 'userId')
  if (!userId) return { ok: false, error: 'Onbekende collega.' }

  const bedrag = tekst(formData, 'verkooptarief')
  let cents: number | null = null
  if (bedrag !== '') {
    cents = parseAmountToCents(bedrag)
    if (cents === null || cents <= 0) return { ok: false, error: 'Dat tarief begrijp ik niet. Schrijf het als 125 of 125,00.' }
  }
  // Afwijkende tarieven: gescheiden door komma's of puntkomma's, bijvoorbeeld "150" of "75; 150".
  const afwijkend: number[] = []
  for (const deel of tekst(formData, 'afwijkend').split(/[;\n]|,(?=\s)|\s+en\s+/).map((d) => d.trim()).filter(Boolean)) {
    const c = parseAmountToCents(deel)
    if (c === null || c <= 0) return { ok: false, error: `Het afwijkende tarief "${deel}" begrijp ik niet. Schrijf bijvoorbeeld: 150; 75` }
    afwijkend.push(c)
  }
  return veilig(async () => {
    await setVerkooptarief(userId, cents, afwijkend)
    revalidatePath(`/beheer/medewerkers/${userId}`)
  })
}
