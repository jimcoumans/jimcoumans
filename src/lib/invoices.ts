import { desc, eq, sql, and } from 'drizzle-orm'
import { db } from '@/db'
import { invoices, ledgerEntries, wallets } from '@/db/schema'
import type { Invoice, LedgerEntry } from '@/db/schema'
import { LedgerError } from './ledger'
import { formatDateLong } from './dates'

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


/* -------------------------------------------------------------------------
   Factureren en budget bijschrijven horen bij elkaar.

   De afspraak is: een factuur van 1.000 euro betekent 1.000 euro budget in
   de wallet. Om te voorkomen dat die twee uit elkaar lopen gebeurt het in
   EEN transactie. Mislukt de bijschrijving, dan komt de factuur er ook
   niet: liever geen factuur dan een factuur zonder budget.

   Let op: het budget komt beschikbaar bij FACTUREREN, niet bij BETALEN. Een
   klant kan dus budget opmaken dat nog niet betaald is. Dat is een bewuste
   keuze die past bij werken op retainer; de betaalstatus blijft zichtbaar
   in het beheer zodat je onbetaald-maar-opgemaakt kunt zien.
   ------------------------------------------------------------------------- */

export type NewInvoiceInput = {
  organizationId: string
  /** Wallet waar het budget op wordt bijgeschreven. */
  walletId: string
  number: string
  /** Bedrag exclusief btw, in centen. Dit wordt het budget. */
  amountExclVatCents: number
  vatCents?: number
  description?: string | null
  issuedOn?: Date
  dueOn?: Date | null
  status?: Invoice['status']
  moneybirdId?: string | null
  pdfUrl?: string | null
  createdByUserId?: string | null
}

/**
 * Maakt een factuur aan en schrijft het bedrag in dezelfde transactie bij
 * als budget. Geeft beide terug.
 */
export async function createInvoiceWithTopup(
  input: NewInvoiceInput,
): Promise<{ invoice: Invoice; entry: LedgerEntry }> {
  if (!Number.isSafeInteger(input.amountExclVatCents) || input.amountExclVatCents <= 0) {
    throw new LedgerError('Het factuurbedrag moet groter dan nul zijn.')
  }
  if (input.number.trim() === '') {
    throw new LedgerError('Vul een factuurnummer in.')
  }

  const issuedOn = input.issuedOn ?? new Date()

  return db.transaction(async (tx) => {
    // De wallet moet bij dezelfde klant horen, anders zou budget van de ene
    // klant op de wallet van een andere belanden.
    const [wallet] = await tx
      .select({ id: wallets.id, name: wallets.name })
      .from(wallets)
      .where(
        and(eq(wallets.id, input.walletId), eq(wallets.organizationId, input.organizationId)),
      )
      .limit(1)

    if (!wallet) {
      throw new LedgerError('Deze wallet hoort niet bij deze klant.')
    }

    const [invoice] = await tx
      .insert(invoices)
      .values({
        organizationId: input.organizationId,
        number: input.number.trim(),
        description: input.description ?? null,
        amountExclVatCents: input.amountExclVatCents,
        vatCents: input.vatCents ?? Math.round(input.amountExclVatCents * 0.21),
        status: input.status ?? 'open',
        issuedOn,
        dueOn: input.dueOn ?? null,
        moneybirdId: input.moneybirdId ?? null,
        pdfUrl: input.pdfUrl ?? null,
      })
      .returning()

    if (!invoice) throw new LedgerError('Factuur kon niet worden opgeslagen.')

    const [entry] = await tx
      .insert(ledgerEntries)
      .values({
        walletId: wallet.id,
        kind: 'topup',
        amountCents: input.amountExclVatCents,
        description:
          input.description?.trim() ||
          `Budget ${formatDateLong(issuedOn)}`,
        detail: `Factuur ${invoice.number}`,
        bookedOn: issuedOn,
        source: 'invoice',
        invoiceId: invoice.id,
        createdByUserId: input.createdByUserId ?? null,
      })
      .returning()

    if (!entry) throw new LedgerError('Bijschrijving kon niet worden opgeslagen.')

    return { invoice, entry }
  })
}

/**
 * Werkt de betaalstatus van een factuur bij.
 *
 * Dit raakt het budget NIET: dat is bij het factureren al bijgeschreven.
 * Een factuur crediteren doe je met een correctie op de bijschrijving, niet
 * door hier de status te wijzigen.
 */
export async function setInvoiceStatus(
  invoiceId: string,
  status: Invoice['status'],
): Promise<void> {
  await db
    .update(invoices)
    .set({ status, paidOn: status === 'paid' ? new Date() : null })
    .where(eq(invoices.id, invoiceId))
}

/** Facturen zonder bijschrijving in het grootboek: die horen niet te bestaan. */
export async function findInvoicesWithoutTopup(): Promise<Invoice[]> {
  const rows = await db
    .select({ invoice: invoices, topup: sql<string>`COALESCE(SUM(${ledgerEntries.amountCents}), 0)` })
    .from(invoices)
    .leftJoin(ledgerEntries, eq(ledgerEntries.invoiceId, invoices.id))
    .groupBy(invoices.id)
    .having(sql`COALESCE(SUM(${ledgerEntries.amountCents}), 0) <> ${invoices.amountExclVatCents}`)

  return rows.map((r) => r.invoice)
}
