import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { factuurStatus, moneybirdBedrag, moneybirdClient, verstuurd } from './client'
import { isRetainerfactuur } from './kenmerk'
import { datumInNederland } from './planning'

export async function leesMoneybirdFacturen(organizationId: string) {
  if (!process.env.MONEYBIRD_API_TOKEN && !process.env.MONEYBIRD_ADMINISTRATION_ID) return null
  const [klant] = await db.select({ contactId: organizations.moneybirdContactId })
    .from(organizations).where(eq(organizations.id, organizationId))
  if (!klant?.contactId) return null

  try {
    const contactId = klant.contactId
    const client = moneybirdClient()
    const facturen = await client.facturen(contactId)
    const vandaag = datumInNederland(new Date())
    return {
      ok: true as const,
      facturen: facturen
        .filter((f) => f.contact_id === contactId && verstuurd(f))
        .map((f) => ({
          id: f.id,
          nummer: f.invoice_id,
          datum: f.invoice_date ?? f.sent_at ?? null,
          betaaldOp: f.paid_at ?? null,
          omschrijving: f.details?.map((d) => d.description).find(Boolean),
          bedragCents: moneybirdBedrag(f.total_price_incl_tax),
          currency: f.currency,
          status: factuurStatus(f, vandaag),
          retainer: isRetainerfactuur(f.reference),
        }))
        .sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? '')),
    }
  } catch (error) {
    console.error('[moneybird] facturen ophalen mislukt', error instanceof Error ? error.name : '')
    return { ok: false as const }
  }
}

export type PortaalMoneybirdFacturen = NonNullable<Awaited<ReturnType<typeof leesMoneybirdFacturen>>>
