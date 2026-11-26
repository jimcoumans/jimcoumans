import { moneybirdClient } from './client'

export async function moneybirdContactKeuzes(klant: {
  name: string
  customerNumber: string | null
}) {
  const bedrijfsnaam = klant.name.trim().replace(/\s+(?:b\.?v\.?|n\.?v\.?)$/i, '')
  const zoektermen = new Set([bedrijfsnaam, klant.customerNumber?.trim() ?? ''].filter(Boolean))
  try {
    const client = moneybirdClient()
    const resultaten = await Promise.all(
      Array.from(zoektermen, (term) => client.zoekContacten(term)),
    )
    const contacten = new Map(resultaten.flat().map((contact) => [contact.id, contact]))
    const opties = Array.from(contacten.values()).flatMap((contact) => {
      if (contact.archived) return []
      const naam = contact.company_name?.trim()
        || [contact.firstname?.trim(), contact.lastname?.trim()].filter(Boolean).join(' ')
      if (!naam) return []
      return [{
        value: contact.id,
        label: contact.customer_id ? `${naam} (klant ${contact.customer_id})` : naam,
      }]
    })
    opties.sort((a, b) => a.label.localeCompare(b.label, 'nl'))
    return { ok: true as const, opties }
  } catch (error) {
    console.error('[moneybird] contactkeuzes ophalen mislukt', error instanceof Error ? error.name : '')
    return { ok: false as const }
  }
}
