import { formatCents } from '../money'
import { moneybirdBedrag, moneybirdClient } from './client'

export async function moneybirdReeksKeuzes(contactId: string) {
  try {
    const client = moneybirdClient()
    const groepen = await Promise.all([client.reeksen(contactId, true), client.reeksen(contactId, false)])
    const reeksen = new Map(groepen.flat().filter((reeks) => reeks.contact_id === contactId)
      .map((reeks) => [reeks.id, reeks]))
    return {
      ok: true as const,
      opties: Array.from(reeksen.values(), (reeks) => {
        const naam = reeks.reference?.trim() || `Reeks ${reeks.id}`
        const bedrag = reeks.currency === 'EUR' && reeks.total_price_excl_tax
          ? `${formatCents(moneybirdBedrag(reeks.total_price_excl_tax))} excl. btw`
          : null
        const status = reeks.active ? null : 'Gestopt'
        return { value: reeks.id, label: [naam, bedrag, status].filter(Boolean).join(' · ') }
      }),
    }
  } catch (error) {
    console.error('[moneybird] reekskeuzes ophalen mislukt', error instanceof Error ? error.name : '')
    return { ok: false as const }
  }
}

export type MoneybirdReeksKeuzes = Awaited<ReturnType<typeof moneybirdReeksKeuzes>>
