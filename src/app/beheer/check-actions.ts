'use server'

import { revalidatePath } from 'next/cache'
import { alsBeheerder, requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import {
  CheckError,
  geefVrij,
  maakAfspraak,
  maakMerk,
  maakRegel,
  verwijderAfspraak,
  verwijderMerk,
  verwijderRegel,
  wijzigAfspraak,
  wijzigMerk,
  wijzigRegel,
  zetDoelgroepStijl,
  type AfspraakInvoer,
} from '@/lib/uitingen-check'
import type { ActionResult } from './actions'

/* Acties voor de uitingen-check. Elke actie begint met requireStaff(): een
   server action is een publiek endpoint. De algemene regels wijzigt alleen
   een beheerder; ze gelden voor elke klant. Een check aanmaken gaat via
   /api/checks, omdat daar bestanden in zitten. */

const tekst = (f: FormData, naam: string) => String(f.get(naam) ?? '').trim()
const ofNull = (f: FormData, naam: string) => tekst(f, naam) || null

async function veilig(paden: string[], fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    for (const p of paden) revalidatePath(p)
    return { ok: true }
  } catch (error) {
    if (error instanceof CheckError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[uitingen-check] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

/** De klantkaart, tab uitingen: daar staan merken, doelgroepen en afspraken. */
const klantPaden = (f: FormData) => [`/beheer/klanten/${tekst(f, 'slug')}`]

/* ------------------------------ Algemene regels -------------------------- */

const GEEN_BEHEERDER: ActionResult = { ok: false, error: 'Alleen een beheerder wijzigt de algemene regels.' }

export async function nieuweRegel(formData: FormData): Promise<ActionResult> {
  const user = await alsBeheerder()
  if (!user) return GEEN_BEHEERDER
  return veilig(['/beheer/checks/regels'], () =>
    maakRegel({ titel: tekst(formData, 'titel'), tekst: tekst(formData, 'tekst'), categorie: tekst(formData, 'categorie') }, user.id),
  )
}

export async function bewerkRegel(formData: FormData): Promise<ActionResult> {
  const user = await alsBeheerder()
  if (!user) return GEEN_BEHEERDER
  return veilig(['/beheer/checks/regels'], () =>
    wijzigRegel(
      tekst(formData, 'id'),
      { titel: tekst(formData, 'titel'), tekst: tekst(formData, 'tekst'), categorie: tekst(formData, 'categorie'), actief: formData.get('actief') === 'on' },
      user.id,
    ),
  )
}

export async function wisRegel(formData: FormData): Promise<ActionResult> {
  const user = await alsBeheerder()
  if (!user) return GEEN_BEHEERDER
  return veilig(['/beheer/checks/regels'], () => verwijderRegel(tekst(formData, 'id')))
}

/* ------------------------------ Merken ----------------------------------- */

export async function nieuwMerk(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(klantPaden(formData), () => maakMerk(tekst(formData, 'organizationId'), { naam: tekst(formData, 'naam'), omschrijving: ofNull(formData, 'omschrijving') }))
}

export async function bewerkMerk(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(klantPaden(formData), () =>
    wijzigMerk(tekst(formData, 'id'), tekst(formData, 'organizationId'), {
      naam: tekst(formData, 'naam'),
      omschrijving: ofNull(formData, 'omschrijving'),
      logoIds: formData.getAll('logoIds').map(String).filter(Boolean),
    }),
  )
}

export async function wisMerk(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(klantPaden(formData), () => verwijderMerk(tekst(formData, 'id'), tekst(formData, 'organizationId')))
}

/* ------------------------------ Afspraken -------------------------------- */

function afspraakUit(f: FormData): AfspraakInvoer {
  return {
    tekst: tekst(f, 'tekst'),
    categorie: tekst(f, 'categorie'),
    merkId: ofNull(f, 'merkId'),
    doelgroepId: ofNull(f, 'doelgroepId'),
    kanaal: ofNull(f, 'kanaal'),
    soort: ofNull(f, 'soort'),
  }
}

export async function nieuweAfspraak(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  return veilig(klantPaden(formData), () => maakAfspraak(tekst(formData, 'organizationId'), afspraakUit(formData), user.id))
}

export async function bewerkAfspraak(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(klantPaden(formData), () =>
    wijzigAfspraak(tekst(formData, 'id'), tekst(formData, 'organizationId'), { ...afspraakUit(formData), actief: formData.get('actief') === 'on' }),
  )
}

export async function wisAfspraak(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(klantPaden(formData), () => verwijderAfspraak(tekst(formData, 'id'), tekst(formData, 'organizationId')))
}

/* ------------------------------ Doelgroepen ------------------------------ */

export async function bewerkDoelgroepStijl(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const aanspreek = tekst(formData, 'address')
  return veilig(klantPaden(formData), () =>
    zetDoelgroepStijl(tekst(formData, 'id'), tekst(formData, 'organizationId'), {
      address: aanspreek === 'je' || aanspreek === 'u' || aanspreek === 'wisselend' ? aanspreek : null,
      styleNotes: ofNull(formData, 'styleNotes'),
    }),
  )
}

/* ------------------------------ De poort --------------------------------- */

export async function geefCheckVrij(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const id = tekst(formData, 'id')
  return veilig([`/beheer/checks/${id}`, '/beheer/checks'], () => geefVrij(id, user.id, ofNull(formData, 'reden')))
}
