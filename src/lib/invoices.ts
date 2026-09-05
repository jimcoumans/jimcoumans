import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { invoices, ledgerEntries } from '@/db/schema'
import type { Invoice } from '@/db/schema'

export type InvoiceWithTopup = Invoice & {
  /** Hoeveel van deze factuur als budget is bijgeschreven, in centen. */
  toppedUpCents: number
}

/**
 * Facturen van een klant, nieuwste eerst, met het bedrag dat er via het
 * grootboek als budget is bijgeschreven. Die twee horen gelijk te zijn;
 * wijken ze af, dan is er iets niet bijgeboekt en dat wil je zien.
 */
export async function getOrganizationInvoices(
  organizationId: string,
  limit = 100,
): Promise<InvoiceWithTopup[]> {
  const rows = await db
    .select({
      invoice: invoices,
      toppedUp: sql<string>`COALESCE(SUM(${ledgerEntries.amountCents}), 0)`,
    })
    .from(invoices)
    .leftJoin(ledgerEntries, eq(ledgerEntries.invoiceId, invoices.id))
    .where(eq(invoices.organizationId, organizationId))
    .groupBy(invoices.id)
    .orderBy(desc(invoices.issuedOn))
    .limit(limit)

  return rows.map((row) => ({ ...row.invoice, toppedUpCents: Number(row.toppedUp) }))
}

export const invoiceStatusLabels: Record<Invoice['status'], string> = {
  draft: 'Concept',
  open: 'Openstaand',
  paid: 'Betaald',
  overdue: 'Te laat',
  credited: 'Gecrediteerd',
}

/** Tailwind-klassen per status, zodat de kleur maar op een plek staat. */
export const invoiceStatusStyles: Record<Invoice['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-jr-lightblue text-jr-deepblue',
  paid: 'bg-jr-green/10 text-jr-green',
  overdue: 'bg-jr-red/10 text-jr-red',
  credited: 'bg-jr-orange/10 text-jr-orange',
}
