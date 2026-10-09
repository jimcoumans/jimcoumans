'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { alsBeheerder } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { vergeet } from '@/lib/cache'
import {
  slaIntroOp,
  slaArtikelOp,
  wisArtikel,
  verschuifArtikel,
  maakSjabloon,
  slaTekstOp,
  controleerTekst,
  ARTIKEL_VOORWAARDEN,
  SjabloonError,
} from '@/lib/sjablonen'
import { slaAvgTekstOp, BedrijfError } from '@/lib/bedrijf'
import { MAIL_SJABLONEN, MAIL_PLAATSHOUDERS, MAIL_VOORWAARDEN, type MailSleutel } from '@/lib/mailsjablonen'
import type { ContractTemplate, ContractTemplateArticle } from '@/db/schema'
import type { ActionResult } from './actions'

/* Standaardteksten beheren: contractsjablonen, de AVG-verklaring en de mails.
   Alleen een beheerder: dit komt in elk contract. Elke actie controleert dat
   zelf, want een server action is een publiek endpoint. */

const GEEN_RECHT: ActionResult = { ok: false, error: 'Alleen een beheerder kan de standaardteksten aanpassen.' }

async function veilig(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    vergeet()
    revalidatePath('/beheer/sjablonen')
    return { ok: true }
  } catch (error) {
    if (error instanceof SjabloonError || error instanceof BedrijfError) return { ok: false, error: error.message }
    const melding = describeDbError(error)
    if (melding) return { ok: false, error: melding }
    console.error('[sjablonen] onverwachte fout:', error)
    return { ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }
  }
}

const tekst = (formData: FormData, naam: string) => String(formData.get(naam) ?? '').replace(/\r\n/g, '\n').trim()

export async function introOpslaan(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(() => slaIntroOp(tekst(formData, 'templateId'), tekst(formData, 'intro')))
}

export async function artikelOpslaan(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const voorwaarde = tekst(formData, 'voorwaarde') || 'altijd'
  if (!(voorwaarde in ARTIKEL_VOORWAARDEN)) return { ok: false, error: 'Onbekende voorwaarde.' }
  return veilig(() =>
    slaArtikelOp({
      id: tekst(formData, 'artikelId') || null,
      templateId: tekst(formData, 'templateId'),
      title: tekst(formData, 'titel'),
      body: tekst(formData, 'tekst'),
      voorwaarde: voorwaarde as ContractTemplateArticle['voorwaarde'],
    }),
  )
}

export async function artikelWissen(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(() => wisArtikel(tekst(formData, 'artikelId')))
}

export async function artikelVerschuiven(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(() => verschuifArtikel(tekst(formData, 'artikelId'), tekst(formData, 'richting') === 'op' ? 'op' : 'neer'))
}

export async function sjabloonMaken(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  const soort = tekst(formData, 'soort') as ContractTemplate['kind']
  const r = await veilig(async () => {
    await maakSjabloon(soort, tekst(formData, 'vanTemplateId'))
  })
  if (r.ok) redirect(`/beheer/sjablonen?tekst=${soort}`)
  return r
}

export async function avgOpslaan(formData: FormData): Promise<ActionResult> {
  if (!(await alsBeheerder())) return GEEN_RECHT
  return veilig(() => slaAvgTekstOp(formData.has('standaard') ? null : tekst(formData, 'tekst')))
}

export async function mailOpslaan(formData: FormData): Promise<ActionResult> {
  const gebruiker = await alsBeheerder()
  if (!gebruiker) return GEEN_RECHT
  const sleutel = tekst(formData, 'sleutel') as MailSleutel
  const standaard = MAIL_SJABLONEN[sleutel]
  if (!standaard) return { ok: false, error: 'Onbekende mail.' }
  if (formData.has('standaard')) return veilig(() => slaTekstOp(sleutel, null, null, gebruiker.id))
  const onderwerp = tekst(formData, 'onderwerp')
  const body = tekst(formData, 'tekst')
  if (!onderwerp || !body) return { ok: false, error: 'Vul een onderwerp en een tekst in.' }
  const fouten = [...controleerTekst(onderwerp, { plaatshouders: MAIL_PLAATSHOUDERS, voorwaarden: MAIL_VOORWAARDEN }), ...controleerTekst(body, { plaatshouders: MAIL_PLAATSHOUDERS, voorwaarden: MAIL_VOORWAARDEN })]
  if (fouten.length > 0) return { ok: false, error: [...new Set(fouten)].join(' ') }
  // Gelijk aan de standaard: niets bewaren, dan krijg je verbeteringen in de standaard vanzelf mee.
  if (onderwerp === standaard.onderwerp && body === standaard.tekst) return veilig(() => slaTekstOp(sleutel, null, null, gebruiker.id))
  return veilig(() => slaTekstOp(sleutel, onderwerp, body, gebruiker.id))
}
