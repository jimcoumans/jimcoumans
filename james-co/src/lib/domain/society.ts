/**
 * The James Society: ervaringen, doelgroepselectie, interesse en plaatsen.
 * Interesse is nooit een verkochte stoel. Bevestigen gebruikt een
 * capaciteitstransactie (rijlock op het event + databasetrigger), zodat
 * twee medewerkers nooit tegelijk de laatste plek aan twee leden geven.
 * Deelnemerslijsten zijn alleen voor staff.
 */
import { z } from 'zod'
import { withActor, withSystem, dbErrorCode } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'
import { parseEuroInput } from '../money'
import { zonedToUtc, isValidTimeZone } from '../time'
import { audit } from './audit'
import { billingBalance } from './billing'

export type SocietyEvent = {
  id: string; title: string; summary: string; description: string | null; location: string | null; startsAt: Date; endsAt: Date | null
  timezone: string; capacity: number | null; priceMinor: number | null; currency: string; priceNote: string | null; status: string
  publicTeaser: boolean; isDemo: boolean; createdAt: Date
}
export type Participation = {
  id: string; eventId: string; memberId: string; partySize: number; status: string; offerText: string | null; offerPriceMinor: number | null
  paymentRequired: boolean; offeredAt: Date | null; acceptedAt: Date | null; billingId: string | null; confirmedAt: Date | null; memberNote: string | null; createdAt: Date
}

const eventSchema = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().min(3).max(400),
  description: z.string().trim().max(5000).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{1,2}:\d{2}$/),
  timezone: z.string().default('Europe/Amsterdam'),
  capacity: z.union([z.coerce.number().int().min(1).max(1000), z.literal('')]).optional().default(''),
  price: z.string().trim().max(30).optional().default(''),
  priceNote: z.string().trim().max(300).optional().default(''),
  publicTeaser: z.boolean().default(false),
})

export async function saveEvent(actor: Actor, id: string | null, input: unknown): Promise<{ id: string }> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = eventSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  if (!isValidTimeZone(d.timezone)) fail('invalid_input')
  const startsAt = zonedToUtc(d.date, d.time, d.timezone)
  const price = d.price ? parseEuroInput(d.price) : null
  if (d.price && price == null) fail('invalid_input', 'Bedrag niet herkend.')
  const capacity = d.capacity === '' ? null : d.capacity
  try {
    return await withActor(actor, async (tx) => {
      if (id) {
        const [row] = await tx<{ id: string }[]>`
          update society_events set title = ${d.title}, summary = ${d.summary}, description = ${d.description || null}, location = ${d.location || null},
            starts_at = ${startsAt}, timezone = ${d.timezone}, capacity = ${capacity}, price_minor = ${price}, price_note = ${d.priceNote || null},
            public_teaser = ${d.publicTeaser}
          where id = ${id} returning id`
        if (!row) fail('not_found')
        await audit(tx, actor, 'society.update', 'society_event', id, null, { capacity })
        return row
      }
      const [row] = await tx<{ id: string }[]>`
        insert into society_events (title, summary, description, location, starts_at, timezone, capacity, price_minor, price_note, public_teaser, created_by)
        values (${d.title}, ${d.summary}, ${d.description || null}, ${d.location || null}, ${startsAt}, ${d.timezone}, ${capacity}, ${price},
                ${d.priceNote || null}, ${d.publicTeaser}, ${actor.userId})
        returning id`
      await audit(tx, actor, 'society.create', 'society_event', row!.id, null, { capacity })
      return row!
    })
  } catch (e) {
    if (dbErrorCode(e) === 'society_capacity_below_confirmed') fail('society_capacity_below_confirmed')
    throw e
  }
}

export async function setEventStatus(actor: Actor, id: string, status: 'draft' | 'open' | 'closed' | 'cancelled' | 'completed'): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  await withActor(actor, async (tx) => {
    const [e] = await tx<{ status: string }[]>`select status from society_events where id = ${id} for update`
    if (!e) fail('not_found')
    await tx`update society_events set status = ${status} where id = ${id}`
    await audit(tx, actor, 'society.status', 'society_event', id, { status: e.status }, { status })
  })
}

/** Doelgroepselectie: alleen actieve leden kunnen worden uitgenodigd. */
export async function inviteMembers(actor: Actor, eventId: string, memberIds: string[]): Promise<number> {
  if (!actor.staffVerified) fail('forbidden')
  const ids = memberIds.filter((x) => z.string().uuid().safeParse(x).success)
  if (!ids.length) return 0
  return withActor(actor, async (tx) => {
    const rows = await tx`
      insert into society_invitations (event_id, member_id, invited_by)
      select ${eventId}, m.user_id, ${actor.userId} from memberships m where m.user_id in ${tx(ids)} and m.status = 'active'
      on conflict (event_id, member_id) do nothing returning id`
    await audit(tx, actor, 'society.invite', 'society_event', eventId, null, { count: rows.length })
    return rows.length
  })
}

export async function getEventForStaff(actor: Actor, id: string) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, async (tx) => {
    const [event] = await tx<SocietyEvent[]>`select * from society_events where id = ${id}`
    if (!event) fail('not_found')
    const participants = await tx<(Participation & { memberName: string | null })[]>`
      select sp.*, p.full_name as member_name from society_participations sp join profiles p on p.id = sp.member_id
      where sp.event_id = ${id} order by sp.created_at`
    const invited = await tx<{ memberId: string; memberName: string | null }[]>`
      select si.member_id, p.full_name as member_name from society_invitations si join profiles p on p.id = si.member_id where si.event_id = ${id}`
    const eligible = await tx<{ userId: string; fullName: string | null }[]>`
      select m.user_id, p.full_name from memberships m join profiles p on p.id = m.user_id where m.status = 'active' order by p.full_name`
    const confirmedSeats = participants.filter((p) => p.status === 'confirmed').reduce((a, p) => a + p.partySize, 0)
    return { event, participants, invited, eligible, confirmedSeats }
  })
}

export async function listEventsForStaff(actor: Actor) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, (tx) => tx<(SocietyEvent & { interested: number; confirmedSeats: number })[]>`
    select e.*,
      (select count(*)::int from society_participations p where p.event_id = e.id and p.status in ('interested','waitlisted','offered')) as interested,
      (select coalesce(sum(party_size),0)::int from society_participations p where p.event_id = e.id and p.status = 'confirmed') as confirmed_seats
    from society_events e order by e.starts_at desc`)
}

// ------------------------------------------------------------------ lid

export async function listMyEvents(actor: Actor) {
  if (!actor.userId) fail('forbidden')
  return withActor(actor, async (tx) => {
    const events = await tx<SocietyEvent[]>`select * from society_events order by starts_at`
    const parts = await tx<Participation[]>`select * from society_participations where member_id = ${actor.userId}`
    return events.map((e) => ({ event: e, participation: parts.find((p) => p.eventId === e.id) ?? null }))
  })
}

export async function getMyEvent(actor: Actor, id: string) {
  if (!actor.userId) fail('forbidden')
  if (!z.string().uuid().safeParse(id).success) fail('not_found')
  return withActor(actor, async (tx) => {
    const [event] = await tx<SocietyEvent[]>`select * from society_events where id = ${id}`
    if (!event) fail('not_found')
    const [participation] = await tx<Participation[]>`select * from society_participations where event_id = ${id} and member_id = ${actor.userId}`
    return { event, participation: participation ?? null }
  })
}

export async function registerInterest(actor: Actor, eventId: string, partySize: number, note: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 10) fail('invalid_input')
  const ev = await withActor(actor, async (tx) => {
    const [e] = await tx<{ status: string }[]>`select status from society_events where id = ${eventId}`
    const [m] = await tx`select 1 from memberships where user_id = ${actor.userId} and status = 'active'`
    return e ? { status: e.status, active: Boolean(m) } : null
  })
  if (!ev) fail('not_found')
  if (!ev.active) fail('membership_not_active')
  if (ev.status !== 'open') fail('invalid_input', 'Aanmelden voor deze ervaring is gesloten.')
  await withSystem(async (tx) => {
    const [existing] = await tx<{ status: string }[]>`select status from society_participations where event_id = ${eventId} and member_id = ${actor.userId} for update`
    if (existing && !['declined', 'cancelled', 'interested'].includes(existing.status)) fail('invalid_input', 'U staat al op de lijst voor deze ervaring.')
    await tx`insert into society_participations (event_id, member_id, party_size, status, member_note)
             values (${eventId}, ${actor.userId}, ${partySize}, 'interested', ${note.trim() || null})
             on conflict (event_id, member_id) do update set party_size = excluded.party_size, status = 'interested', member_note = excluded.member_note,
               offered_at = null, accepted_at = null, offer_text = null, offer_price_minor = null`
    await audit(tx, actor, 'society.interest', 'society_event', eventId, null, { partySize })
  })
}

export async function withdrawParticipation(actor: Actor, eventId: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  await withSystem(async (tx) => {
    const [p] = await tx<{ id: string; status: string }[]>`select id, status from society_participations where event_id = ${eventId} and member_id = ${actor.userId} for update`
    if (!p) fail('not_found')
    if (p.status === 'confirmed') {
      // Een bevestigde plek opzeggen is een verzoek; voorwaarden en eventuele kosten volgen via staff.
      await tx`insert into tasks (member_id, title, type, due_at) values (${actor.userId}, 'Society: lid wil bevestigde plek opzeggen', 'cancellation', now() + interval '1 day')`
      return
    }
    await tx`update society_participations set status = 'declined' where id = ${p.id}`
    await audit(tx, actor, 'society.withdraw', 'society_participation', p.id)
  })
}

/** Lid accepteert het aanbod (prijs/voorwaarden). Daarna bevestigt staff de plek. */
export async function acceptPlaceOffer(actor: Actor, eventId: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  await withSystem(async (tx) => {
    const [p] = await tx<{ id: string; status: string }[]>`select id, status from society_participations where event_id = ${eventId} and member_id = ${actor.userId} for update`
    if (!p) fail('not_found')
    if (p.status !== 'offered') fail('invalid_input')
    await tx`update society_participations set accepted_at = coalesce(accepted_at, now()) where id = ${p.id}`
    await audit(tx, actor, 'society.accept_offer', 'society_participation', p.id)
  })
}

// ------------------------------------------------------------------ staff: plaatsen

export async function offerPlace(actor: Actor, participationId: string, input: { offerText: string; price: string; paymentRequired: boolean }): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const price = input.price ? parseEuroInput(input.price) : null
  if (input.price && price == null) fail('invalid_input')
  if (!input.offerText.trim()) fail('invalid_input', 'Beschrijf het aanbod en de voorwaarden.')
  await withActor(actor, async (tx) => {
    const [p] = await tx<{ status: string }[]>`select status from society_participations where id = ${participationId} for update`
    if (!p || !['interested', 'waitlisted', 'offered'].includes(p.status)) fail('invalid_input')
    await tx`update society_participations set status = 'offered', offer_text = ${input.offerText.trim()}, offer_price_minor = ${price},
             payment_required = ${input.paymentRequired}, offered_at = now(), accepted_at = null where id = ${participationId}`
    await audit(tx, actor, 'society.offer', 'society_participation', participationId, null, { priceMinor: price })
  })
}

export async function setParticipationStatus(actor: Actor, participationId: string, status: 'waitlisted' | 'declined' | 'cancelled'): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  await withActor(actor, async (tx) => {
    const [p] = await tx<{ status: string }[]>`select status from society_participations where id = ${participationId} for update`
    if (!p) fail('not_found')
    await tx`update society_participations set status = ${status} where id = ${participationId}`
    await audit(tx, actor, 'society.participation_status', 'society_participation', participationId, { status: p.status }, { status })
  })
}

export async function linkParticipationBilling(actor: Actor, participationId: string, billingId: string): Promise<void> {
  if (actor.staffRole !== 'admin') fail('forbidden')
  await withActor(actor, (tx) => tx`update society_participations set billing_id = ${billingId} where id = ${participationId}`)
}

/** Plek bevestigen: lid heeft geaccepteerd, betaling (indien vereist) ontvangen, capaciteit beschikbaar. */
export async function confirmPlace(actor: Actor, participationId: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  try {
    await withActor(actor, async (tx) => {
      const [p] = await tx<Participation[]>`select * from society_participations where id = ${participationId} for update`
      if (!p) fail('not_found')
      if (p.status === 'confirmed') return
      if (p.status !== 'offered' || !p.acceptedAt) fail('invalid_input', 'Het lid heeft het aanbod nog niet geaccepteerd.')
      if (p.paymentRequired) {
        if (!p.billingId) fail('payment_required')
        const bal = await billingBalance(tx, p.billingId)
        if (!['paid', 'overpaid'].includes(bal.state)) fail('payment_required')
      }
      await tx`update society_participations set status = 'confirmed', confirmed_at = now(), confirmed_by = ${actor.userId} where id = ${participationId}`
      await audit(tx, actor, 'society.confirm', 'society_participation', participationId, null, { partySize: p.partySize })
    })
  } catch (e) {
    if (dbErrorCode(e) === 'society_capacity_exceeded') fail('society_capacity_exceeded')
    throw e
  }
}

/** Publieke teasers: alleen expliciet als teaser gemarkeerde, open ervaringen, zonder deelnemers. */
export async function publicTeasers() {
  return withSystem((tx) => tx<{ id: string; title: string; summary: string; startsAt: Date; timezone: string; isDemo: boolean }[]>`
    select id, title, summary, starts_at, timezone, is_demo from society_events
    where public_teaser and status = 'open' and starts_at > now() order by starts_at limit 3`)
}
