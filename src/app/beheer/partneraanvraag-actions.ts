'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { alsBeheerder, requireStaff } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { parseAmountToCents } from '@/lib/money'
import {
  AanvraagError,
  beoordeel,
  bevestig,
  maakAanvraag,
  maakPakket,
  maakSjabloon,
  maakVoorstel,
  verstuurOpnieuw,
  verstuurUitvragen,
  verwijderPakket,
  voegWerkToe,
  wijsAf,
  wijzigAanvraag,
  wijzigPakket,
  wijzigSjabloon,
  zetAanvraagStatus,
  zetPartnerProfiel,
  zetWerk,
  type AanvraagInvoer,
  type PakketInvoer,
} from '@/lib/partneraanvragen'
import type { ActionResult } from './actions'

/* Acties voor partneraanvragen, het matchprofiel en de prijsafspraken van
   partners. Elke actie begint met requireStaff(): een server action is een
   publiek endpoint. De sjablonen voor ons eigen werk wijzigt een beheerder. */

const tekst = (f: FormData, naam: string) => String(f.get(naam) ?? '').trim()
const ofNull = (f: FormData, naam: string) => tekst(f, naam) || null
const bedrag = (f: FormData, naam: string) => (tekst(f, naam) ? parseAmountToCents(tekst(f, naam)) : null)
const geheel = (f: FormData, naam: string) => {
  const s = tekst(f, naam)
  if (!s) return null
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}
/** Uren zoals iemand ze typt: "1,5" of "2". In honderdsten. */
const uren = (f: FormData, naam: string) => {
  const s = tekst(f, naam).replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

async function veilig(paden: string[], fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    for (const p of paden) revalidatePath(p)
    return { ok: true }
  } catch (error) {
    if (error instanceof AanvraagError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[partneraanvragen] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const aanvraagPad = (f: FormData) => `/beheer/partners/aanvragen/${tekst(f, 'aanvraagId')}`

/* ------------------------------ Partners ---------------------------------- */

export async function bewaarPartnerProfiel(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(['/beheer/partners'], () =>
    zetPartnerProfiel(tekst(formData, 'partnerId'), {
      specialismen: formData.getAll('specialismen').map(String),
      branches: [...formData.getAll('branches').map(String), ...tekst(formData, 'brancheExtra').split(',')],
      werkgebied: ofNull(formData, 'werkgebied'),
      sterktes: ofNull(formData, 'sterktes'),
    }),
  )
}

function pakketUit(f: FormData): PakketInvoer {
  return {
    specialisme: tekst(f, 'specialisme'),
    naam: tekst(f, 'naam'),
    omschrijving: ofNull(f, 'omschrijving'),
    prijsCents: bedrag(f, 'prijs'),
    eenheid: tekst(f, 'eenheid'),
    geldigTot: ofNull(f, 'geldigTot'),
  }
}

export async function nieuwPakket(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(['/beheer/partners'], () => maakPakket(tekst(formData, 'partnerId'), pakketUit(formData)))
}

export async function bewerkPakket(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(['/beheer/partners'], () => wijzigPakket(tekst(formData, 'id'), { ...pakketUit(formData), actief: formData.get('actief') === 'on' }))
}

export async function wisPakket(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig(['/beheer/partners'], () => verwijderPakket(tekst(formData, 'id')))
}

/* ------------------------------ Ons werk (sjablonen) ---------------------- */

const GEEN_BEHEERDER: ActionResult = { ok: false, error: 'Alleen een beheerder wijzigt de standaard werkzaamheden.' }

export async function nieuwSjabloon(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_BEHEERDER
  return veilig(['/beheer/partners/aanvragen'], () =>
    maakSjabloon({
      naam: tekst(formData, 'naam'),
      omschrijving: ofNull(formData, 'omschrijving'),
      urenHonderdsten: uren(formData, 'uren'),
      uurtariefCents: bedrag(formData, 'tarief'),
      standaardAan: formData.get('standaardAan') === 'on',
    }),
  )
}

export async function bewerkSjabloon(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_BEHEERDER
  return veilig(['/beheer/partners/aanvragen'], () =>
    wijzigSjabloon(tekst(formData, 'id'), {
      naam: tekst(formData, 'naam'),
      omschrijving: ofNull(formData, 'omschrijving'),
      urenHonderdsten: uren(formData, 'uren'),
      uurtariefCents: bedrag(formData, 'tarief'),
      standaardAan: formData.get('standaardAan') === 'on',
      actief: formData.get('actief') === 'on',
    }),
  )
}

/* ------------------------------ Aanvragen --------------------------------- */

function aanvraagUit(f: FormData): Omit<AanvraagInvoer, 'organizationId'> {
  return {
    titel: tekst(f, 'titel'),
    specialisme: tekst(f, 'specialisme'),
    vraag: tekst(f, 'vraag'),
    branche: ofNull(f, 'branche'),
    voorkeursdatum: ofNull(f, 'voorkeursdatum'),
    datumToelichting: ofNull(f, 'datumToelichting'),
    locatie: ofNull(f, 'locatie'),
    dagdelen: geheel(f, 'dagdelen'),
    stuks: geheel(f, 'stuks'),
    notities: ofNull(f, 'notities'),
  }
}

export async function nieuweAanvraag(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  let id = ''
  const uit = await veilig(['/beheer/partners/aanvragen'], async () => {
    id = (await maakAanvraag({ organizationId: tekst(formData, 'organizationId'), ...aanvraagUit(formData) }, user.id)).id
  })
  if (uit.ok) redirect(`/beheer/partners/aanvragen/${id}`)
  return uit
}

export async function bewerkAanvraag(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig([aanvraagPad(formData)], () => wijzigAanvraag(tekst(formData, 'aanvraagId'), aanvraagUit(formData)))
}

export async function annuleerAanvraag(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig([aanvraagPad(formData), '/beheer/partners/aanvragen'], () =>
    zetAanvraagStatus(tekst(formData, 'aanvraagId'), tekst(formData, 'status') === 'open' ? 'open' : 'geannuleerd'),
  )
}

/** Ons werk op deze aanvraag: elke regel met id-, aan-, uren- en tariefveld. */
export async function bewaarWerk(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  const ids = formData.getAll('werkId').map(String)
  return veilig([aanvraagPad(formData)], () =>
    zetWerk(
      tekst(formData, 'aanvraagId'),
      ids.map((id) => ({ id, aan: formData.get(`aan_${id}`) === 'on', urenHonderdsten: uren(formData, `uren_${id}`), uurtariefCents: bedrag(formData, `tarief_${id}`) })),
    ),
  )
}

export async function extraWerk(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig([aanvraagPad(formData)], () =>
    voegWerkToe(tekst(formData, 'aanvraagId'), { naam: tekst(formData, 'naam'), omschrijving: ofNull(formData, 'omschrijving'), urenHonderdsten: uren(formData, 'uren'), uurtariefCents: bedrag(formData, 'tarief') }),
  )
}

/* ------------------------------ Uitvragen --------------------------------- */

export async function vraagUit(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  const gekozen = formData.getAll('partnerId').map(String)
  let mislukt: string[] = []
  const uit = await veilig([aanvraagPad(formData)], async () => {
    const r = await verstuurUitvragen(
      tekst(formData, 'aanvraagId'),
      gekozen.map((partnerId) => ({ partnerId, pakketId: ofNull(formData, `pakket_${partnerId}`) })),
      user,
    )
    mislukt = r.mislukt
  })
  if (uit.ok && mislukt.length > 0) {
    return { ok: false, error: `Uitgevraagd, maar niet iedereen kreeg een mail. ${mislukt.join(' ')} Deel de link bij die partner zelf.` }
  }
  return uit
}

export async function vraagOpnieuwUit(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  let fout: string | null = null
  const uit = await veilig([aanvraagPad(formData)], async () => {
    fout = await verstuurOpnieuw(tekst(formData, 'uitvraagId'), user)
  })
  if (uit.ok && fout) return { ok: false, error: `Nieuwe link gemaakt, maar de mail ging niet weg: ${fout} Deel de link zelf.` }
  return uit
}

export async function bevestigPartner(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  return veilig([aanvraagPad(formData)], () => bevestig(tekst(formData, 'uitvraagId'), bedrag(formData, 'prijs'), user.id))
}

export async function wijsPartnerAf(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig([aanvraagPad(formData)], () => wijsAf(tekst(formData, 'uitvraagId')))
}

export async function beoordeelPartner(formData: FormData): Promise<ActionResult> {
  await requireStaff()
  return veilig([aanvraagPad(formData), '/beheer/partners'], () => beoordeel(tekst(formData, 'uitvraagId'), geheel(formData, 'beoordeling') ?? 0, ofNull(formData, 'notitie')))
}

export async function maakPartnerVoorstel(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  let quoteId = ''
  const uit = await veilig([aanvraagPad(formData), '/beheer/offertes'], async () => {
    quoteId = await maakVoorstel(tekst(formData, 'aanvraagId'), tekst(formData, 'uitvraagId'), user.id)
  })
  if (uit.ok) redirect(`/beheer/offertes/${quoteId}`)
  return uit
}
