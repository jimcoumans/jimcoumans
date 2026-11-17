/**
 * Boekingsonderdelen. Eén verzoek kan meerdere onderdelen hebben (hotel,
 * vervoer, diner). "Bevestigd" voor het verzoek alleen als ALLE vereiste
 * onderdelen bevestigd zijn. Bevestigen vereist leveranciersbewijs; de
 * database weigert een bevestiging zonder bron, controletijd en referentie
 * of bevestigingsnotitie. Annuleren door het lid is een verzoek; pas
 * bevestiging door de leverancier maakt het onderdeel geannuleerd.
 */
import { z } from 'zod'
import { withActor, withSystem, type Tx } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'
import { parseEuroInput } from '../money'
import { zonedToUtc, isValidTimeZone } from '../time'
import { audit } from './audit'
import type { BookingRow } from './requests'

export type BookingSummary = 'none' | 'pending' | 'partial' | 'all_confirmed' | 'cancelled'

/** Samenvatting voor weergave: nooit "alles geregeld" bij een openstaand vereist onderdeel. */
export function summarizeBookings(bookings: Pick<BookingRow, 'status' | 'required'>[]): BookingSummary {
  const live = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'failed')
  if (bookings.length === 0) return 'none'
  if (live.length === 0) return 'cancelled'
  const required = live.filter((b) => b.required)
  const confirmed = required.filter((b) => b.status === 'confirmed')
  if (required.length > 0 && confirmed.length === required.length) return 'all_confirmed'
  if (live.some((b) => b.status === 'confirmed')) return 'partial'
  return 'pending'
}

const addSchema = z.object({
  title: z.string().trim().min(2).max(160),
  supplierId: z.string().uuid().optional().or(z.literal('')).default(''),
  supplierName: z.string().trim().max(160).optional().default(''),
  required: z.boolean().default(true),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).default(''),
  time: z.string().regex(/^\d{1,2}:\d{2}$/).optional().or(z.literal('')).default(''),
  timezone: z.string().default('Europe/Amsterdam'),
  price: z.string().trim().max(30).optional().default(''),
  terms: z.string().trim().max(2000).optional().default(''),
})

async function latestApproval(tx: Tx, requestId: string) {
  const [a] = await tx<{ id: string; optionId: string }[]>`
    select a.id, a.option_id from approvals a join proposals p on p.id = a.proposal_id
    where p.request_id = ${requestId} order by a.created_at desc limit 1`
  return a ?? null
}

export async function addBooking(actor: Actor, requestId: string, input: unknown): Promise<{ id: string }> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = addSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  if (!isValidTimeZone(d.timezone)) fail('invalid_input')
  const price = d.price ? parseEuroInput(d.price) : null
  if (d.price && price == null) fail('invalid_input', 'Bedrag niet herkend.')
  return withActor(actor, async (tx) => {
    const [r] = await tx<{ status: string }[]>`select status from requests where id = ${requestId} for update`
    if (!r) fail('not_found')
    if (!['arranging', 'confirmed'].includes(r.status)) fail('approval_required')
    const approval = await latestApproval(tx, requestId)
    if (!approval) fail('approval_required')
    let supplierName = d.supplierName
    if (d.supplierId) {
      const [s] = await tx<{ name: string }[]>`select name from suppliers where id = ${d.supplierId}`
      if (!s) fail('invalid_input')
      supplierName = s.name
    }
    if (!supplierName) fail('invalid_input', 'Kies of noem de leverancier.')
    const startsAt = d.date && d.time ? zonedToUtc(d.date, d.time, d.timezone) : null
    const [b] = await tx<{ id: string }[]>`
      insert into bookings (request_id, approval_id, supplier_id, supplier_name, title, required, starts_at, timezone, price_minor, terms, created_by)
      values (${requestId}, ${approval.id}, ${d.supplierId || null}, ${supplierName}, ${d.title}, ${d.required}, ${startsAt}, ${d.timezone},
              ${price}, ${d.terms || null}, ${actor.userId})
      returning id`
    // Een extra vereist onderdeel na bevestiging: het verzoek is niet langer volledig bevestigd.
    if (r.status === 'confirmed' && d.required) await tx`update requests set status = 'arranging' where id = ${requestId}`
    await audit(tx, actor, 'booking.add', 'booking', b!.id, null, { requestId, title: d.title, required: d.required })
    return b!
  })
}

const confirmSchema = z.object({
  supplierReference: z.string().trim().max(120).optional().default(''),
  confirmationNote: z.string().trim().max(2000).optional().default(''),
  confirmationSource: z.enum(['email', 'phone', 'supplier_system', 'in_person']),
  checkedAt: z.coerce.date(),
  memberDetails: z.string().trim().max(3000).optional().default(''),
  emergencyContact: z.string().trim().max(300).optional().default(''),
})

async function syncRequestStatus(tx: Tx, requestId: string): Promise<void> {
  const [r] = await tx<{ status: string }[]>`select status from requests where id = ${requestId} for update`
  const bookings = await tx<{ status: string; required: boolean }[]>`select status, required from bookings where request_id = ${requestId}`
  const summary = summarizeBookings(bookings)
  if (r?.status === 'arranging' && summary === 'all_confirmed') {
    await tx`update requests set status = 'confirmed', waiting_on = null, next_action = 'Nazorg na afloop', next_action_due_at = null where id = ${requestId}`
  } else if (r?.status === 'confirmed' && summary !== 'all_confirmed') {
    await tx`update requests set status = 'arranging' where id = ${requestId}`
  }
}

export async function confirmBooking(actor: Actor, bookingId: string, input: unknown): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = confirmSchema.safeParse(input)
  if (!parsed.success) fail('evidence_required')
  const d = parsed.data
  if (!d.supplierReference && !d.confirmationNote) fail('evidence_required')
  if (d.checkedAt.getTime() > Date.now() + 5 * 60_000) fail('invalid_input', 'Controletijd kan niet in de toekomst liggen.')
  await withActor(actor, async (tx) => {
    const [b] = await tx<BookingRow[]>`select * from bookings where id = ${bookingId} for update`
    if (!b) fail('not_found')
    if (!['pending', 'requested', 'failed'].includes(b.status)) fail('invalid_input', 'Dit onderdeel kan niet (opnieuw) bevestigd worden.')
    const approval = await tx`select 1 from approvals where id = ${b.approvalId}`
    if (!approval.length) fail('approval_required')
    await tx`update bookings set status = 'confirmed', supplier_reference = ${d.supplierReference || null}, confirmation_note = ${d.confirmationNote || null},
             confirmation_source = ${d.confirmationSource}, checked_at = ${d.checkedAt}, confirmed_at = now(), confirmed_by = ${actor.userId},
             member_details = ${d.memberDetails || null}, emergency_contact = ${d.emergencyContact || null}, updated_at = now()
             where id = ${bookingId}`
    await syncRequestStatus(tx, b.requestId)
    await audit(tx, actor, 'booking.confirm', 'booking', bookingId, { status: b.status }, { requestId: b.requestId, status: 'confirmed', source: d.confirmationSource })
  })
}

export async function setBookingRequested(actor: Actor, bookingId: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  await withActor(actor, async (tx) => {
    const [b] = await tx<{ status: string; requestId: string }[]>`select status, request_id from bookings where id = ${bookingId} for update`
    if (!b || b.status !== 'pending') fail('invalid_input')
    await tx`update bookings set status = 'requested', updated_at = now() where id = ${bookingId}`
    await tx`update requests set waiting_on = 'supplier' where id = ${b.requestId} and status = 'arranging'`
    await audit(tx, actor, 'booking.requested', 'booking', bookingId, null, { requestId: b.requestId })
  })
}

export async function markBookingFailed(actor: Actor, bookingId: string, note: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  if (!note.trim()) fail('invalid_input', 'Leg kort vast wat er misging.')
  await withActor(actor, async (tx) => {
    const [b] = await tx<{ status: string; requestId: string }[]>`select status, request_id from bookings where id = ${bookingId} for update`
    if (!b || !['pending', 'requested'].includes(b.status)) fail('invalid_input')
    await tx`update bookings set status = 'failed', updated_at = now() where id = ${bookingId}`
    await tx`update requests set has_issue = true, issue_note = ${note.trim()} where id = ${b.requestId}`
    await syncRequestStatus(tx, b.requestId)
    await audit(tx, actor, 'booking.failed', 'booking', bookingId, null, { requestId: b.requestId })
  })
}

/** Lid vraagt annulering aan. Dit is een taak voor staff; de boeking blijft tot leveranciersbevestiging staan. */
export async function requestCancellation(actor: Actor, bookingId: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  const visible = await withActor(actor, async (tx) => (await tx<{ requestId: string }[]>`select request_id from bookings where id = ${bookingId}`)[0])
  if (!visible) fail('not_found')
  await withSystem(async (tx) => {
    const [b] = await tx<{ status: string; requestId: string; title: string; cancellationRequestedAt: Date | null }[]>`select status, request_id, title, cancellation_requested_at from bookings where id = ${bookingId} for update`
    if (!b) fail('not_found')
    const [r] = await tx<{ memberId: string }[]>`select member_id from requests where id = ${b.requestId}`
    if (r?.memberId !== actor.userId) fail('forbidden')
    if (b.status === 'cancellation_requested' || (b.status !== 'confirmed' && b.cancellationRequestedAt)) return
    if (!['pending', 'requested', 'confirmed'].includes(b.status)) fail('invalid_input')
    if (b.status === 'confirmed') {
      await tx`update bookings set status = 'cancellation_requested', cancellation_requested_at = now(), updated_at = now() where id = ${bookingId}`
    } else {
      // Nog niet bevestigd door de leverancier: status blijft, het annuleringsverzoek wordt vastgelegd.
      await tx`update bookings set cancellation_requested_at = now(), updated_at = now() where id = ${bookingId}`
    }
    await tx`update requests set cancellation_requested_at = now() where id = ${b.requestId}`
    await tx`insert into tasks (request_id, member_id, title, type, due_at)
             values (${b.requestId}, ${actor.userId}, ${`Annuleringsverzoek: ${b.title}`}, 'cancellation', now() + interval '2 hours')`
    await tx`insert into request_messages (request_id, author_id, sender_type, body, channel, client_key)
             values (${b.requestId}, null, 'system', ${`Uw annuleringsverzoek voor "${b.title}" is ontvangen. Dit is nog geen bevestigde annulering: we stemmen af met de leverancier en laten u weten wat de voorwaarden betekenen.`}, 'portal', ${'cancel-' + bookingId + '-' + Date.now()})`
    await audit(tx, actor, 'booking.cancellation_requested', 'booking', bookingId, null, { requestId: b.requestId })
  })
}

export async function confirmCancellation(actor: Actor, bookingId: string, evidence: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  if (!evidence.trim()) fail('evidence_required')
  await withActor(actor, async (tx) => {
    const [b] = await tx<{ status: string; requestId: string; cancellationRequestedAt: Date | null }[]>`
      select status, request_id, cancellation_requested_at from bookings where id = ${bookingId} for update`
    if (!b || ['cancelled', 'failed'].includes(b.status)) fail('invalid_input')
    await tx`update bookings set status = 'cancelled', cancellation_confirmed_at = now(), cancellation_evidence = ${evidence.trim()}, updated_at = now()
             where id = ${bookingId}`
    const pending = await tx`select 1 from bookings where request_id = ${b.requestId} and cancellation_requested_at is not null and status not in ('cancelled', 'failed')`
    if (!pending.length) await tx`update requests set cancellation_requested_at = null where id = ${b.requestId}`
    await syncRequestStatus(tx, b.requestId)
    await audit(tx, actor, 'booking.cancelled', 'booking', bookingId, { status: b.status }, { requestId: b.requestId, status: 'cancelled' })
  })
}
