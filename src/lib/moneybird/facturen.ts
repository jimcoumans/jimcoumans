import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, subscriptions } from '@/db/schema'
import { factuurStatus, moneybirdBedrag, moneybirdClient, verstuurd } from './client'

export async function leesMoneybirdFacturen(organizationId: string) {
  if (!process.env.MONEYBIRD_API_TOKEN && !process.env.MONEYBIRD_ADMINISTRATION_ID) return null
  const [klant] = await db.select({ contactId: organizations.moneybirdContactId })
    .from(organizations).where(eq(organizations.id, organizationId))
  if (!klant?.contactId) return null

  try {
    const contactId = klant.contactId
    const client = moneybirdClient()
    const [facturen, abonnementen] = await Promise.all([
      client.facturen(contactId),
      db.select({ reeksId: subscriptions.moneybirdRecurringId }).from(subscriptions)
        .where(and(eq(subscriptions.organizationId, organizationId), isNotNull(subscriptions.moneybirdRecurringId))),
    ])
    const perReeks = await Promise.all(abonnementen.flatMap(({ reeksId }) =>
      reeksId ? [client.facturen(contactId, reeksId)] : []
    ))
    const retainerIds = new Set(perReeks.flat().filter((f) => f.contact_id === contactId).map((f) => f.id))
    return {
      ok: true as const,
      facturen: facturen
        .filter((f) => f.contact_id === klant.contactId && verstuurd(f))
        .map((f) => ({
          id: f.id,
          nummer: f.invoice_id,
          datum: f.invoice_date ?? f.sent_at ?? null,
          betaaldOp: f.paid_at ?? null,
          omschrijving: f.details?.map((d) => d.description).find(Boolean),
          bedragCents: moneybirdBedrag(f.total_price_incl_tax),
          currency: f.currency,
          status: factuurStatus(f),
          retainer: retainerIds.has(f.id),
        }))
        .sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? '')),
    }
  } catch (error) {
    console.error('[moneybird] facturen ophalen mislukt', error instanceof Error ? error.name : '')
    return { ok: false as const }
  }
}

export type PortaalMoneybirdFacturen = NonNullable<Awaited<ReturnType<typeof leesMoneybirdFacturen>>>
