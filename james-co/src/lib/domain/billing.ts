/**
 * Facturatie en handmatige betalingsregistratie (V1). Alleen admin schrijft.
 * Betalingen zijn append-only: een fout herstel je met een correctieregel die
 * naar de oorspronkelijke betaling verwijst. Handmatig geregistreerd is altijd
 * herkenbaar (is_manual). Er bestaat geen "betaald via redirect".
 */
import { z } from 'zod'
import { withActor, type Tx } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'
import { splitTax } from '../money'
import { audit } from './audit'

export type BillingState = 'open' | 'partially_paid' | 'paid' | 'overpaid' | 'refunded' | 'void'

export type Balance = { grossMinor: number; paidMinor: number; refundedMinor: number; correctedMinor: number; netReceivedMinor: number; outstandingMinor: number; state: BillingState }

export function computeBalance(grossMinor: number, status: string, payments: { kind: string; amountMinor: number }[]): Balance {
  let paid = 0, refunded = 0, corrected = 0
  for (const p of payments) {
    if (p.kind === 'payment') paid += p.amountMinor
    else if (p.kind === 'refund') refunded += p.amountMinor
    else if (p.kind === 'correction') corrected += p.amountMinor
  }
  const net = paid - refunded - corrected
  let state: BillingState
  if (status === 'void') state = 'void'
  else if (refunded > 0 && net <= 0) state = 'refunded'
  else if (net <= 0) state = 'open'
  else if (net < grossMinor) state = 'partially_paid'
  else if (net === grossMinor) state = 'paid'
  else state = 'overpaid'
  return { grossMinor, paidMinor: paid, refundedMinor: refunded, correctedMinor: corrected, netReceivedMinor: net, outstandingMinor: Math.max(0, grossMinor - net), state }
}

export async function billingBalance(tx: Tx, billingId: string): Promise<Balance> {
  const [b] = await tx<{ grossMinor: number; status: string }[]>`select gross_minor, status from billing_records where id = ${billingId}`
  if (!b) fail('not_found')
  const ps = await tx<{ kind: string; amountMinor: number }[]>`select kind, amount_minor from payment_records where billing_id = ${billingId}`
  return computeBalance(b.grossMinor, b.status, ps)
}

const billingSchema = z.object({
  memberId: z.string().uuid(),
  kind: z.enum(['membership', 'project', 'society', 'visitor']),
  membershipId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  societyEventId: z.string().uuid().optional(),
  description: z.string().trim().min(3).max(300),
  amountMinor: z.number().int().min(0).max(100_000_000),
  amountIncludesTax: z.boolean(),
  taxRateBp: z.number().int().min(0).max(10000),
  currency: z.string().regex(/^[A-Z]{3}$/).default('EUR'),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDays: z.number().int().min(0).max(120).default(14),
})

export async function createBillingRecord(actor: Actor, input: unknown) {
  if (actor.staffRole !== 'admin') fail('forbidden')
  const parsed = billingSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  const split = splitTax(d.amountMinor, d.taxRateBp, d.amountIncludesTax)
  return withActor(actor, async (tx) => {
    if (d.kind === 'membership') {
      if (!d.membershipId) fail('invalid_input')
      const [m] = await tx<{ userId: string }[]>`select user_id from memberships where id = ${d.membershipId}`
      if (!m || m.userId !== d.memberId) fail('invalid_input')
    }
    const [{ n } = { n: 0 }] = await tx<{ n: number }[]>`select nextval('invoice_number_seq')::int as n`
    const invoiceNumber = `JC-${new Date().getUTCFullYear()}-${String(n).padStart(4, '0')}`
    const [b] = await tx<{ id: string }[]>`
      insert into billing_records (member_id, kind, membership_id, request_id, society_event_id, invoice_number, description,
        period_start, period_end, net_minor, tax_minor, gross_minor, tax_rate_bp, currency, due_at, created_by)
      values (${d.memberId}, ${d.kind}, ${d.membershipId ?? null}, ${d.requestId ?? null}, ${d.societyEventId ?? null}, ${invoiceNumber},
        ${d.description}, ${d.periodStart ?? null}, ${d.periodEnd ?? null}, ${split.netMinor}, ${split.taxMinor}, ${split.grossMinor},
        ${d.taxRateBp}, ${d.currency}, now() + make_interval(days => ${d.dueDays}), ${actor.userId})
      returning id`
    await audit(tx, actor, 'billing.create', 'billing_record', b!.id, null, { invoiceNumber, ...split })
    return { id: b!.id, invoiceNumber, ...split }
  })
}

const paymentSchema = z.object({
  billingId: z.string().uuid(),
  kind: z.enum(['payment', 'refund', 'correction']),
  amountMinor: z.number().int().min(1).max(100_000_000),
  method: z.enum(['bank_transfer', 'cash', 'card_terminal', 'other']),
  reference: z.string().trim().min(2).max(120),
  evidenceRef: z.string().trim().max(300).optional().default(''),
  correctsPaymentId: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional().default(''),
  occurredAt: z.coerce.date(),
})

export async function registerPayment(actor: Actor, input: unknown) {
  if (actor.staffRole !== 'admin') fail('forbidden')
  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  if (d.occurredAt.getTime() > Date.now() + 5 * 60_000) fail('invalid_input', 'Een ontvangst kan niet in de toekomst liggen.')
  return withActor(actor, async (tx) => {
    const [b] = await tx<{ id: string; currency: string; status: string }[]>`select id, currency, status from billing_records where id = ${d.billingId} for update`
    if (!b) fail('not_found')
    if (b.status === 'void') fail('invalid_input', 'Factuur is vervallen.')
    const balance = await billingBalance(tx, b.id)
    if (d.kind === 'refund' && d.amountMinor > balance.netReceivedMinor) fail('invalid_input', 'Restitutie is hoger dan het ontvangen bedrag.')
    if (d.kind === 'correction') {
      if (!d.correctsPaymentId) fail('invalid_input', 'Kies de betaling die u corrigeert.')
      const [orig] = await tx<{ amountMinor: number; kind: string }[]>`select amount_minor, kind from payment_records where id = ${d.correctsPaymentId} and billing_id = ${b.id}`
      if (!orig || orig.kind !== 'payment') fail('invalid_input')
      const [{ already } = { already: 0 }] = await tx<{ already: number }[]>`
        select coalesce(sum(amount_minor), 0)::int as already from payment_records where corrects_payment_id = ${d.correctsPaymentId}`
      if (already + d.amountMinor > orig.amountMinor) fail('invalid_input', 'Correctie is hoger dan de oorspronkelijke betaling.')
    }
    const [p] = await tx<{ id: string }[]>`
      insert into payment_records (billing_id, kind, amount_minor, currency, method, reference, is_manual, evidence_ref,
        corrects_payment_id, note, occurred_at, recorded_by)
      values (${b.id}, ${d.kind}, ${d.amountMinor}, ${b.currency}, ${d.method}, ${d.reference}, true, ${d.evidenceRef || null},
        ${d.correctsPaymentId ?? null}, ${d.note || null}, ${d.occurredAt}, ${actor.userId})
      returning id`
    await audit(tx, actor, `payment.${d.kind}`, 'payment_record', p!.id, null, { billingId: b.id, amountMinor: d.amountMinor, reference: d.reference })
    return { id: p!.id, balance: await billingBalance(tx, b.id) }
  })
}

export async function voidBillingRecord(actor: Actor, billingId: string, reason: string): Promise<void> {
  if (actor.staffRole !== 'admin') fail('forbidden')
  if (reason.trim().length < 3) fail('invalid_input', 'Geef een reden.')
  await withActor(actor, async (tx) => {
    const bal = await billingBalance(tx, billingId)
    if (bal.netReceivedMinor > 0) fail('invalid_input', 'Er staat een ontvangst op deze factuur; registreer eerst een restitutie of correctie.')
    await tx`update billing_records set status = 'void' where id = ${billingId}`
    await audit(tx, actor, 'billing.void', 'billing_record', billingId, null, { reason })
  })
}

export type BillingListRow = {
  id: string; invoiceNumber: string; kind: string; description: string; grossMinor: number; netMinor: number; taxMinor: number
  currency: string; status: string; issuedAt: Date; dueAt: Date | null; memberId: string; memberName: string | null
}

export async function listBilling(actor: Actor, memberId?: string) {
  if (!actor.userId) fail('forbidden')
  return withActor(actor, async (tx) => {
    const rows = await tx<BillingListRow[]>`
      select b.id, b.invoice_number, b.kind, b.description, b.gross_minor, b.net_minor, b.tax_minor, b.currency, b.status,
             b.issued_at, b.due_at, b.member_id, p.full_name as member_name
      from billing_records b left join profiles p on p.id = b.member_id
      where ${memberId ? tx`b.member_id = ${memberId}` : tx`true`}
      order by b.issued_at desc limit 300`
    const ids = rows.map((r) => r.id)
    const pays = ids.length
      ? await tx<{ id: string; billingId: string; kind: string; amountMinor: number; method: string; reference: string; isManual: boolean; occurredAt: Date; note: string | null; correctsPaymentId: string | null }[]>`
          select id, billing_id, kind, amount_minor, method, reference, is_manual, occurred_at, note, corrects_payment_id
          from payment_records where billing_id in ${tx(ids)} order by occurred_at`
      : []
    return rows.map((r) => {
      const ps = pays.filter((p) => p.billingId === r.id)
      return { ...r, payments: ps, balance: computeBalance(r.grossMinor, r.status, ps) }
    })
  })
}
