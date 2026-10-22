'use server'

import { revalidatePath } from 'next/cache'
import { AanvraagError, beantwoord } from '@/lib/partneraanvragen'
import { parseAmountToCents } from '@/lib/money'
import type { ActionResult } from '@/app/beheer/actions'

/**
 * Het antwoord van een partner op een uitvraag. Geen login: de link is de
 * sleutel, en beantwoord() controleert hem opnieuw. Een publiek endpoint,
 * dus niets uit het formulier wordt geloofd zonder die controle.
 */
export async function verstuurAntwoord(formData: FormData): Promise<ActionResult> {
  const tekst = (naam: string) => String(formData.get(naam) ?? '').trim()
  const id = tekst('id')
  const token = tekst('token')
  const pakket = tekst('pakket')
  const prijs = tekst('prijs')
  try {
    await beantwoord(id, token, {
      beschikbaar: tekst('beschikbaar') === 'ja',
      andereDatum: tekst('andereDatum') || null,
      pakketId: pakket && pakket !== 'geen' ? pakket : null,
      prijsCents: prijs ? parseAmountToCents(prijs) : null,
      opmerking: tekst('opmerking') || null,
    })
    revalidatePath(`/uitvraag/${id}/${token}`)
    return { ok: true }
  } catch (error) {
    if (error instanceof AanvraagError) return { ok: false, error: error.message }
    console.error('[uitvraag] antwoord mislukt:', error)
    return { ok: false, error: 'Je antwoord kwam niet aan. Probeer het nog eens, of mail ons.' }
  }
}
