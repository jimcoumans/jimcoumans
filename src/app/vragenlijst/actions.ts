'use server'

import { dienInViaLink, antwoordenUitFormData, FormulierError } from '@/lib/formulieren'
import type { Kleur } from '@/lib/formulieren/vragenlijst'
import { beoordeel, type Antwoorden } from '@/lib/formulieren/vragenlijst'

/* De vragenlijst insturen via de link. Een publiek endpoint: geen login, wel
   het token uit de link, en een lokveld dat een mens niet ziet. */

export type Inzending = { ok: true; kleur: Kleur; redenen: string[]; voornaam: string } | { ok: false; error: string } | null

export async function dienIn(_vorige: Inzending, formData: FormData): Promise<Inzending> {
  // Een bot vult elk veld in, ook dit verborgen veld. Doe dan alsof het gelukt is.
  if (String(formData.get('bedrijfswebsite') ?? '') !== '') return { ok: true, kleur: 'groen', redenen: [], voornaam: '' }
  const id = String(formData.get('id') ?? '')
  const token = String(formData.get('token') ?? '')
  try {
    const ruw = antwoordenUitFormData('vragenlijst', formData)
    const kleur = await dienInViaLink(id, token, ruw)
    const b = beoordeel(ruw as Antwoorden)
    return { ok: true, kleur, redenen: b.redenen, voornaam: String(formData.get('voornaam') ?? '').trim() }
  } catch (error) {
    if (error instanceof FormulierError) return { ok: false, error: error.message }
    console.error('[vragenlijst] insturen mislukt:', error)
    return { ok: false, error: 'Er ging iets mis bij het versturen. Probeer het nog eens, of bel ons: 045 792 0009.' }
  }
}
