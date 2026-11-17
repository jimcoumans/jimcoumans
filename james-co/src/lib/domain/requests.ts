/**
 * Conciergeverzoeken: aanmaken (lid of staff namens lid), berichten,
 * interne notities, eigenaarschap, volgende actie, statuswissels.
 * Statusovergangen worden ook door een databasetrigger afgedwongen.
 */
import { z } from 'zod'
import { withActor, withSystem, type Tx } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'
import { audit } from './audit'
import { parseEuroInput } from '../money'
import { isValidTimeZone, todayIn } from '../time'

export const CATEGORIES = ['dining', 'stays', 'travel', 'transport', 'experiences', 'gifts', 'occasions', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABEL: Record<Category, string> = {
  dining: 'Dining', stays: 'Stays', travel: 'Travel', transport: 'Transport',
  experiences: 'Experiences', gifts: 'Gifts', occasions: 'Occasions', other: 'Overig',
}

export const STATUS_LABEL: Record<string, string> = {
  new: 'Ontvangen', needs_info: 'Informatie nodig', researching: 'In onderzoek', awaiting_approval: 'Voorstel klaar',
  arranging: 'Wordt geregeld', confirmed: 'Bevestigd', completed: 'Afgerond', closed: 'Gesloten', rejected: 'Niet uitvoerbaar', cancelled: 'Geannuleerd',
}

export type RequestRow = {
  id: string; memberId: string; ownerId: string | null; category: Category | null; segment: string; brief: string; title: string | null
  desiredDate: string | null; desiredTime: string | null; timezone: string; location: string | null; partySize: number | null
  budgetMinor: number | null; budgetCurrency: string; budgetBasis: 'per_person' | 'total' | null; flexibility: string | null
  status: string; waitingOn: 'member' | 'supplier' | null; statusNote: string | null; hasIssue: boolean; issueNote: string | null
  urgency: 'normal' | 'high'; nextAction: string | null; nextActionDueAt: Date | null; cancellationRequestedAt: Date | null
  feedbackRating: number | null; feedbackText: string | null; createdAt: Date; updatedAt: Date
}

export const requestInputSchema = z.object({
  brief: z.string().trim().min(3, 'Vertel kort wat we mogen regelen.').max(5000),
  category: z.enum(CATEGORIES).optional().or(z.literal('')).default(''),
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).default(''),
  desiredTime: z.string().trim().max(40).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
  partySize: z.union([z.coerce.number().int().min(1).max(500), z.literal('')]).optional().default(''),
  budget: z.string().trim().max(30).optional().default(''),
  budgetBasis: z.enum(['per_person', 'total']).optional().or(z.literal('')).default(''),
  flexibility: z.string().trim().max(500).optional().default(''),
  timezone: z.string().optional().default('Europe/Amsterdam'),
  idempotencyKey: z.string().uuid(),
})

/** Welke informatie ontbreekt voor een goede eerste stap. We verzinnen niets: ontbrekend blijft leeg. */
export function missingInfo(r: Pick<RequestRow, 'desiredDate' | 'partySize' | 'budgetMinor' | 'category'>): string[] {
  const m: string[] = []
  if (!r.desiredDate && r.category !== 'gifts') m.push('datum')
  if (!r.partySize && ['dining', 'stays', 'experiences', 'occasions', 'transport'].includes(r.category ?? '')) m.push('aantal personen')
  if (r.budgetMinor == null) m.push('budget')
  return m
}

function normalizeInput(data: z.infer<typeof requestInputSchema>) {
  const budgetMinor = data.budget ? parseEuroInput(data.budget) : null
  if (data.budget && budgetMinor == null) fail('invalid_input', 'Budget niet herkend. Gebruik bijvoorbeeld 350 of 350,00.')
  if (budgetMinor != null && !data.budgetBasis) fail('invalid_input', 'Geef aan of het budget per persoon of in totaal is.')
  if (!isValidTimeZone(data.timezone)) fail('invalid_input')
  return {
    brief: data.brief, category: data.category || null, desiredDate: data.desiredDate || null, desiredTime: data.desiredTime || null,
    location: data.location || null, partySize: data.partySize === '' ? null : data.partySize ?? null,
    budgetMinor, budgetBasis: budgetMinor != null ? (data.budgetBasis as 'per_person' | 'total') : null,
    flexibility: data.flexibility || null, timezone: data.timezone, idempotencyKey: data.idempotencyKey,
  }
}

/** Lid maakt een verzoek. RLS-insertpolicy eist een actief lidmaatschap; dubbel versturen geeft hetzelfde verzoek terug. */
export async function createRequest(actor: Actor, input: unknown): Promise<{ id: string; created: boolean }> {
  if (!actor.userId) fail('forbidden')
  const parsed = requestInputSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = normalizeInput(parsed.data)
  const res = await withActor(actor, async (tx) => {
    const [m] = await tx`select 1 from memberships where user_id = ${actor.userId} and status = 'active'`
    if (!m) fail('membership_not_active')
    const existing = await tx<{ id: string }[]>`select id from requests where member_id = ${actor.userId} and idempotency_key = ${d.idempotencyKey}`
    if (existing[0]) return { id: existing[0].id, created: false }
    const [segRow] = await tx<{ segment: string }[]>`select segment from applications where user_id = ${actor.userId} order by created_at desc limit 1`
    const [r] = await tx<{ id: string }[]>`
      insert into requests (member_id, category, segment, brief, desired_date, desired_time, timezone, location, party_size,
        budget_minor, budget_basis, flexibility, idempotency_key, created_by, next_action, next_action_due_at)
      values (${actor.userId}, ${d.category}, ${segRow?.segment ?? 'nl_member'}, ${d.brief}, ${d.desiredDate}, ${d.desiredTime}, ${d.timezone},
        ${d.location}, ${d.partySize}, ${d.budgetMinor}, ${d.budgetBasis}, ${d.flexibility}, ${d.idempotencyKey}, ${actor.userId},
        'Intake beoordelen en eigenaar toewijzen', now() + interval '4 hours')
      on conflict (member_id, idempotency_key) do nothing
      returning id`
    if (!r) {
      const [again] = await tx<{ id: string }[]>`select id from requests where member_id = ${actor.userId} and idempotency_key = ${d.idempotencyKey}`
      return { id: again!.id, created: false }
    }
    await audit(tx, actor, 'request.create', 'request', r.id, null, { category: d.category })
    return { id: r.id, created: true }
  })
  if (res.created) {
    const missing = missingInfo({ ...d, category: d.category as Category | null })
    await withSystem((tx) => tx`
      insert into tasks (request_id, member_id, title, type, due_at)
      values (${res.id}, ${actor.userId}, ${missing.length ? `Nieuw verzoek — ontbreekt mogelijk: ${missing.join(', ')}` : 'Nieuw verzoek beoordelen'},
              ${missing.length ? 'info_needed' : 'follow_up'}, now() + interval '4 hours')`)
  }
  return res
}

/** Staff legt namens een lid een verzoek vast (bijv. uit een WhatsApp-gesprek). Alleen een zakelijke samenvatting. */
export async function createRequestForMember(actor: Actor, memberId: string, input: unknown, channel: 'whatsapp_manual' | 'phone_note' | 'email' = 'whatsapp_manual') {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = requestInputSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = normalizeInput(parsed.data)
  return withActor(actor, async (tx) => {
    const [m] = await tx`select 1 from memberships where user_id = ${memberId} and status = 'active'`
    if (!m) fail('membership_not_active')
    const [r] = await tx<{ id: string }[]>`
      insert into requests (member_id, owner_id, category, brief, desired_date, desired_time, timezone, location, party_size,
        budget_minor, budget_basis, flexibility, idempotency_key, created_by, next_action, next_action_due_at)
      values (${memberId}, ${actor.userId}, ${d.category}, ${d.brief}, ${d.desiredDate}, ${d.desiredTime}, ${d.timezone}, ${d.location},
        ${d.partySize}, ${d.budgetMinor}, ${d.budgetBasis}, ${d.flexibility}, ${d.idempotencyKey}, ${actor.userId},
        'Intake beoordelen', now() + interval '4 hours')
      on conflict (member_id, idempotency_key) do update set updated_at = requests.updated_at
      returning id`
    await tx`insert into request_messages (request_id, author_id, sender_type, body, channel, client_key)
             values (${r!.id}, ${actor.userId}, 'staff', ${`Vastgelegd door James & Co. (${channel === 'whatsapp_manual' ? 'via WhatsApp' : channel === 'phone_note' ? 'telefonisch' : 'per e-mail'}): ${d.brief}`}, ${channel}, ${'intake-' + d.idempotencyKey})
             on conflict (request_id, client_key) do nothing`
    await audit(tx, actor, 'request.create_for_member', 'request', r!.id, null, { memberId, channel })
    return { id: r!.id }
  })
}

// ------------------------------------------------------------------ lid

export type MessageRow = { id: string; senderType: 'member' | 'staff' | 'system'; body: string; channel: string; deliveryStatus: string; createdAt: Date; authorName: string | null }

export async function listMyRequests(actor: Actor) {
  if (!actor.userId) fail('forbidden')
  return withActor(actor, (tx) => tx<(RequestRow & { openProposal: boolean })[]>`
    select r.*, exists (select 1 from proposals p where p.request_id = r.id and p.status = 'issued' and p.expires_at > now()) as open_proposal
    from requests r where r.member_id = ${actor.userId} order by r.created_at desc limit 200`)
}

export async function getMyRequest(actor: Actor, id: string) {
  if (!actor.userId) fail('forbidden')
  if (!z.string().uuid().safeParse(id).success) fail('not_found')
  return withActor(actor, async (tx) => {
    const [r] = await tx<RequestRow[]>`select * from requests where id = ${id} and member_id = ${actor.userId}`
    if (!r) fail('not_found')
    const messages = await tx<MessageRow[]>`
      select m.id, m.sender_type, m.body, m.channel, m.delivery_status, m.created_at,
             case when m.sender_type = 'staff' then coalesce(p.display_name, 'James & Co.') else null end as author_name
      from request_messages m left join profiles p on p.id = m.author_id
      where m.request_id = ${id} order by m.created_at`
    const proposals = await loadProposals(tx, id, false)
    const bookings = await tx<BookingRow[]>`select * from bookings where request_id = ${id} order by created_at`
    return { request: r, messages, proposals, bookings }
  })
}

export async function addMemberMessage(actor: Actor, requestId: string, body: string, clientKey: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  const text = body.trim()
  if (!text || text.length > 10000) fail('invalid_input')
  if (!z.string().uuid().safeParse(clientKey).success) fail('invalid_input')
  await withActor(actor, async (tx) => {
    const [r] = await tx<{ status: string }[]>`select status from requests where id = ${requestId} and member_id = ${actor.userId}`
    if (!r) fail('not_found')
    await tx`insert into request_messages (request_id, author_id, sender_type, body, channel, client_key)
             values (${requestId}, ${actor.userId}, 'member', ${text}, 'portal', ${clientKey})
             on conflict (request_id, client_key) do nothing`
  })
}

export async function submitFeedback(actor: Actor, requestId: string, rating: number, text: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail('invalid_input')
  const owns = await withActor(actor, async (tx) => (await tx<{ status: string }[]>`select status from requests where id = ${requestId} and member_id = ${actor.userId}`)[0])
  if (!owns) fail('not_found')
  if (!['confirmed', 'completed', 'closed'].includes(owns.status)) fail('invalid_input')
  await withSystem(async (tx) => {
    await tx`update requests set feedback_rating = ${rating}, feedback_text = ${text.trim().slice(0, 2000) || null} where id = ${requestId} and member_id = ${actor.userId}`
    await tx`insert into tasks (request_id, member_id, title, type, due_at) values (${requestId}, ${actor.userId}, 'Feedback ontvangen: voorkeuren bijwerken na bevestiging lid', 'follow_up', now() + interval '2 days')`
  })
}

// ------------------------------------------------------------------ proposals laden (gedeeld)

export type ProposalOptionRow = {
  id: string; proposalId: string; position: number; label: string; description: string | null; supplierId: string | null; supplierName: string | null
  included: string | null; excluded: string | null; priceKind: 'fixed' | 'estimate'; totalMinor: number; maxMinor: number | null; currency: string
  taxNote: string | null; paymentRoute: string; cancellationTerms: string; availabilityStatus: string; availabilityCheckId: string | null
}
export type ProposalRow = {
  id: string; requestId: string; version: number; status: string; intro: string | null; issuedAt: Date | null; expiresAt: Date | null
  snapshotHash: string | null; createdAt: Date; options: ProposalOptionRow[]; approval: { optionId: string; createdAt: Date; acceptedTotalMinor: number; acceptedMaxMinor: number | null } | null
}
export type BookingRow = {
  id: string; requestId: string; approvalId: string; supplierId: string | null; supplierName: string; title: string; required: boolean
  status: string; supplierReference: string | null; confirmationNote: string | null; confirmationSource: string | null; checkedAt: Date | null
  confirmedAt: Date | null; startsAt: Date | null; timezone: string; priceMinor: number | null; currency: string; terms: string | null
  memberDetails: string | null; emergencyContact: string | null; cancellationRequestedAt: Date | null; cancellationConfirmedAt: Date | null
  cancellationEvidence: string | null; createdAt: Date
}

export async function loadProposals(tx: Tx, requestId: string, includeDrafts: boolean): Promise<ProposalRow[]> {
  const ps = await tx<Omit<ProposalRow, 'options' | 'approval'>[]>`
    select id, request_id, version, status, intro, issued_at, expires_at, snapshot_hash, created_at
    from proposals where request_id = ${requestId} ${includeDrafts ? tx`` : tx`and status <> 'draft'`} order by version desc`
  if (!ps.length) return []
  const ids = ps.map((p) => p.id)
  const opts = await tx<ProposalOptionRow[]>`select * from proposal_options where proposal_id in ${tx(ids)} order by position`
  const apps = await tx<{ proposalId: string; optionId: string; createdAt: Date; acceptedTotalMinor: number; acceptedMaxMinor: number | null }[]>`
    select proposal_id, option_id, created_at, accepted_total_minor, accepted_max_minor from approvals where proposal_id in ${tx(ids)}`
  return ps.map((p) => ({
    ...p,
    options: opts.filter((o) => o.proposalId === p.id),
    approval: apps.find((a) => a.proposalId === p.id) ?? null,
  }))
}

// ------------------------------------------------------------------ staff

export const BUCKETS = [
  { key: 'new', label: 'Nieuw' },
  { key: 'needs_info', label: 'Informatie nodig' },
  { key: 'research', label: 'Onderzoek' },
  { key: 'waiting_member', label: 'Wacht op lid' },
  { key: 'waiting_supplier', label: 'Wacht op leverancier' },
  { key: 'ready_to_confirm', label: 'Klaar voor bevestiging' },
  { key: 'upcoming', label: 'Aankomend' },
  { key: 'aftercare', label: 'Nazorg' },
  { key: 'problem', label: 'Probleem' },
] as const
export type BucketKey = (typeof BUCKETS)[number]['key']

export function bucketOf(r: Pick<RequestRow, 'status' | 'waitingOn' | 'hasIssue' | 'desiredDate' | 'timezone' | 'cancellationRequestedAt'>, today = todayIn()): BucketKey | null {
  if (['closed', 'rejected', 'cancelled'].includes(r.status)) return null
  if (r.hasIssue || r.cancellationRequestedAt) return 'problem'
  switch (r.status) {
    case 'new': return 'new'
    case 'needs_info': return 'needs_info'
    case 'researching': return r.waitingOn === 'supplier' ? 'waiting_supplier' : r.waitingOn === 'member' ? 'waiting_member' : 'research'
    case 'awaiting_approval': return 'waiting_member'
    case 'arranging': return r.waitingOn === 'supplier' ? 'waiting_supplier' : 'ready_to_confirm'
    case 'confirmed': return r.desiredDate && r.desiredDate < today ? 'aftercare' : 'upcoming'
    case 'completed': return 'aftercare'
  }
  return null
}

export type WorkRow = RequestRow & { memberName: string | null; ownerName: string | null; openTasks: number }

export async function listWork(actor: Actor, filters: { owner?: string; category?: string; status?: string; urgency?: string; bucket?: string; q?: string } = {}) {
  if (!actor.staffVerified) fail('forbidden')
  const rows = await withActor(actor, (tx) => tx<WorkRow[]>`
    select r.*, m.full_name as member_name, o.full_name as owner_name,
           (select count(*)::int from tasks t where t.request_id = r.id and t.status = 'open') as open_tasks
    from requests r join profiles m on m.id = r.member_id left join profiles o on o.id = r.owner_id
    where r.status not in ('closed', 'rejected', 'cancelled')
      ${filters.owner === 'none' ? tx`and r.owner_id is null` : filters.owner ? tx`and r.owner_id = ${filters.owner}` : tx``}
      ${filters.category ? tx`and r.category = ${filters.category}` : tx``}
      ${filters.status ? tx`and r.status = ${filters.status}` : tx``}
      ${filters.urgency ? tx`and r.urgency = ${filters.urgency}` : tx``}
      ${filters.q ? tx`and (r.brief ilike ${'%' + filters.q + '%'} or m.full_name ilike ${'%' + filters.q + '%'} or r.title ilike ${'%' + filters.q + '%'})` : tx``}
    order by (r.urgency = 'high') desc, r.next_action_due_at nulls last, r.created_at
    limit 500`)
  const today = todayIn()
  const withBucket = rows.map((r) => ({ ...r, bucket: bucketOf(r, today) }))
  return filters.bucket ? withBucket.filter((r) => r.bucket === filters.bucket) : withBucket
}

export async function getRequestForStaff(actor: Actor, id: string) {
  if (!actor.staffVerified) fail('forbidden')
  if (!z.string().uuid().safeParse(id).success) fail('not_found')
  return withActor(actor, async (tx) => {
    const [r] = await tx<(RequestRow & { memberName: string | null; memberEmail: string; ownerName: string | null })[]>`
      select r.*, m.full_name as member_name, m.email as member_email, o.full_name as owner_name
      from requests r join profiles m on m.id = r.member_id left join profiles o on o.id = r.owner_id where r.id = ${id}`
    if (!r) fail('not_found')
    const messages = await tx<MessageRow[]>`
      select m.id, m.sender_type, m.body, m.channel, m.delivery_status, m.created_at, p.full_name as author_name
      from request_messages m left join profiles p on p.id = m.author_id where m.request_id = ${id} order by m.created_at`
    const notes = await tx<{ id: string; body: string; createdAt: Date; authorName: string | null }[]>`
      select n.id, n.body, n.created_at, p.full_name as author_name from internal_notes n left join profiles p on p.id = n.author_id
      where n.request_id = ${id} order by n.created_at`
    const tasks = await tx<{ id: string; title: string; type: string; status: string; dueAt: Date | null; assignedTo: string | null; assigneeName: string | null }[]>`
      select t.id, t.title, t.type, t.status, t.due_at, t.assigned_to, p.full_name as assignee_name
      from tasks t left join profiles p on p.id = t.assigned_to where t.request_id = ${id} order by t.status, t.due_at nulls last`
    const checks = await tx<{ id: string; supplierId: string; supplierName: string; source: string; checkedAt: Date; validUntil: Date | null; result: string; details: string | null }[]>`
      select a.id, a.supplier_id, s.name as supplier_name, a.source, a.checked_at, a.valid_until, a.result, a.details
      from availability_checks a join suppliers s on s.id = a.supplier_id where a.request_id = ${id} order by a.checked_at desc`
    const proposals = await loadProposals(tx, id, true)
    const bookings = await tx<BookingRow[]>`select * from bookings where request_id = ${id} order by created_at`
    const time = await tx<{ id: string; minutes: number | null; activity: string; startedAt: Date | null; note: string | null; createdAt: Date; staffName: string | null }[]>`
      select t.id, t.minutes, t.activity, t.started_at, t.note, t.created_at, p.full_name as staff_name
      from time_entries t left join profiles p on p.id = t.staff_id where t.request_id = ${id} order by t.created_at`
    const auditTrail = await tx<{ id: string; action: string; actorType: string; createdAt: Date; actorName: string | null; after: unknown }[]>`
      select a.id, a.action, a.actor_type, a.created_at, p.full_name as actor_name, a.after
      from audit_events a left join profiles p on p.id = a.actor_id
      where (a.entity_type = 'request' and a.entity_id = ${id})
         or (a.entity_type in ('proposal', 'booking', 'approval') and a.after->>'requestId' = ${id})
      order by a.created_at`
    const [prefs] = await tx<Record<string, unknown>[]>`select * from member_preferences where member_id = ${r.memberId}`
    const [sensitive] = await tx<{ dietary: string | null; allergies: string | null }[]>`select dietary, allergies from member_sensitive_preferences where member_id = ${r.memberId}`
    const staff = await tx<{ userId: string; fullName: string | null }[]>`select s.user_id, p.full_name from staff_roles s join profiles p on p.id = s.user_id where s.active order by p.full_name`
    return { request: r, messages, notes, tasks, checks, proposals, bookings, time, auditTrail, prefs: prefs ?? null, sensitive: sensitive ?? null, staff }
  })
}

async function lockRequest(tx: Tx, id: string) {
  const [r] = await tx<RequestRow[]>`select * from requests where id = ${id} for update`
  if (!r) fail('not_found')
  return r
}

export async function assignOwner(actor: Actor, id: string, ownerId: string, note: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  await withActor(actor, async (tx) => {
    const r = await lockRequest(tx, id)
    const [s] = await tx`select 1 from staff_roles where user_id = ${ownerId} and active`
    if (!s) fail('invalid_input', 'Kies een actieve medewerker.')
    if (r.ownerId && r.ownerId !== ownerId && !note.trim()) fail('invalid_input', 'Een overdracht vraagt een korte notitie.')
    await tx`update requests set owner_id = ${ownerId} where id = ${id}`
    if (note.trim()) await tx`insert into internal_notes (request_id, author_id, body) values (${id}, ${actor.userId}, ${`Overdracht: ${note.trim()}`})`
    await audit(tx, actor, 'request.assign', 'request', id, { ownerId: r.ownerId }, { ownerId })
  })
}

const statusSchema = z.object({
  status: z.enum(['needs_info', 'researching', 'arranging', 'confirmed', 'completed', 'closed', 'rejected', 'cancelled']),
  note: z.string().trim().max(2000).optional().default(''),
  waitingOn: z.enum(['member', 'supplier', '']).optional().default(''),
})

/** Handmatige statuswissel door staff. 'confirmed' kan alleen via boekingen (zie bookings.ts). */
export async function setRequestStatus(actor: Actor, id: string, input: unknown): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input')
  const { status, note, waitingOn } = parsed.data
  if (status === 'confirmed') fail('invalid_input', 'Bevestigen gebeurt per boekingsonderdeel met leveranciersbewijs.')
  if (status === 'arranging') fail('invalid_input', 'Regelen start na een geldig akkoord van het lid.')
  await withActor(actor, async (tx) => {
    const r = await lockRequest(tx, id)
    if (['rejected', 'cancelled'].includes(status) && !note) fail('invalid_input', 'Geef een korte uitleg voor het lid.')
    if (r.status === 'arranging' && status === 'researching' && !note) fail('invalid_input', 'Leg uit waarom opnieuw onderzocht wordt.')
    if (status === 'completed') {
      const open = await tx`select 1 from bookings where request_id = ${id} and required and status not in ('confirmed', 'cancelled')`
      if (open.length) fail('invalid_input', 'Niet alle vereiste boekingsonderdelen zijn bevestigd of geannuleerd.')
    }
    if (status === 'cancelled') {
      const live = await tx`select 1 from bookings where request_id = ${id} and status in ('confirmed', 'cancellation_requested')`
      if (live.length) fail('invalid_input', 'Er staan bevestigde boekingen open. Annuleer die eerst met bevestiging van de leverancier.')
    }
    const ownerNeeded = !['completed', 'closed', 'rejected', 'cancelled'].includes(status) && !r.ownerId
    await tx`update requests set status = ${status}, status_note = ${note || null}, waiting_on = ${waitingOn || null},
             owner_id = ${ownerNeeded ? actor.userId : r.ownerId} where id = ${id}`
    if (note && ['needs_info', 'rejected', 'cancelled'].includes(status) || (r.status === 'arranging' && status === 'researching')) {
      await tx`insert into request_messages (request_id, author_id, sender_type, body, channel, client_key)
               values (${id}, ${actor.userId}, 'staff', ${note}, 'portal', ${'status-' + crypto.randomUUID()})`
    }
    await audit(tx, actor, 'request.status', 'request', id, { status: r.status }, { status, waitingOn: waitingOn || null })
  })
}

const nextActionSchema = z.object({
  nextAction: z.string().trim().min(2).max(300),
  dueAt: z.coerce.date(),
  urgency: z.enum(['normal', 'high']).default('normal'),
  waitingOn: z.enum(['member', 'supplier', '']).optional().default(''),
  title: z.string().trim().max(120).optional().default(''),
  category: z.enum(CATEGORIES).optional().or(z.literal('')).default(''),
})

export async function setNextAction(actor: Actor, id: string, input: unknown): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = nextActionSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input')
  const d = parsed.data
  await withActor(actor, async (tx) => {
    const r = await lockRequest(tx, id)
    await tx`update requests set next_action = ${d.nextAction}, next_action_due_at = ${d.dueAt}, urgency = ${d.urgency},
             waiting_on = ${d.waitingOn || null}, title = ${d.title || r.title}, category = ${d.category || r.category},
             owner_id = coalesce(owner_id, ${actor.userId}) where id = ${id}`
    await audit(tx, actor, 'request.next_action', 'request', id, { nextAction: r.nextAction }, { nextAction: d.nextAction, dueAt: d.dueAt.toISOString() })
  })
}

export async function setIssue(actor: Actor, id: string, hasIssue: boolean, note: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  await withActor(actor, async (tx) => {
    await lockRequest(tx, id)
    await tx`update requests set has_issue = ${hasIssue}, issue_note = ${hasIssue ? note.trim() || null : null} where id = ${id}`
    await audit(tx, actor, hasIssue ? 'request.issue_flag' : 'request.issue_clear', 'request', id)
  })
}

/** Staff stuurt een extern bericht naar het lid (portaal). Expliciete actie; geen automatische verzending. */
export async function addStaffMessage(actor: Actor, requestId: string, body: string, channel: 'portal' | 'whatsapp_manual' | 'phone_note' | 'email', clientKey: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const text = body.trim()
  if (!text) fail('invalid_input')
  if (!z.string().uuid().safeParse(clientKey).success) fail('invalid_input')
  await withActor(actor, async (tx) => {
    await lockRequest(tx, requestId)
    // whatsapp_manual/phone_note/email = registratie van een elders gevoerd gesprek, geen verzending.
    await tx`insert into request_messages (request_id, author_id, sender_type, body, channel, client_key, delivery_status)
             values (${requestId}, ${actor.userId}, 'staff', ${text}, ${channel}, ${clientKey}, 'stored')
             on conflict (request_id, client_key) do nothing`
  })
}

export async function addInternalNote(actor: Actor, target: { requestId?: string; memberId?: string; applicationId?: string; supplierId?: string }, body: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const text = body.trim()
  if (!text) fail('invalid_input')
  await withActor(actor, (tx) => tx`
    insert into internal_notes (request_id, member_id, application_id, supplier_id, author_id, body)
    values (${target.requestId ?? null}, ${target.memberId ?? null}, ${target.applicationId ?? null}, ${target.supplierId ?? null}, ${actor.userId}, ${text})`)
}
