/** Taken en tijdregistratie. Wachten op een leverancier telt niet als actieve arbeid. */
import { z } from 'zod'
import { withActor } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'

export const ACTIVITIES = ['intake', 'research', 'supplier_contact', 'proposal', 'booking', 'aftercare', 'account_care', 'other'] as const
export const ACTIVITY_LABEL: Record<(typeof ACTIVITIES)[number], string> = {
  intake: 'Intake', research: 'Onderzoek', supplier_contact: 'Leverancierscontact', proposal: 'Voorstel', booking: 'Boeken',
  aftercare: 'Nazorg', account_care: 'Accountzorg', other: 'Overig',
}

const taskSchema = z.object({
  title: z.string().trim().min(2).max(300),
  type: z.enum(['follow_up', 'info_needed', 'supplier_contact', 'cancellation', 'refund', 'handover', 'review_application', 'other']).default('other'),
  dueAt: z.union([z.coerce.date(), z.literal('')]).optional().default(''),
  assignedTo: z.string().uuid().optional().or(z.literal('')).default(''),
  requestId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
})

export async function createTask(actor: Actor, input: unknown): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', parsed.error.issues[0]?.message)
  const d = parsed.data
  await withActor(actor, (tx) => tx`
    insert into tasks (request_id, member_id, assigned_to, title, type, due_at, created_by)
    values (${d.requestId ?? null}, ${d.memberId ?? null}, ${d.assignedTo || actor.userId}, ${d.title}, ${d.type}, ${d.dueAt === '' ? null : d.dueAt}, ${actor.userId})`)
}

export async function setTaskStatus(actor: Actor, taskId: string, status: 'open' | 'done' | 'cancelled'): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  await withActor(actor, (tx) => tx`
    update tasks set status = ${status}, completed_at = ${status === 'open' ? null : new Date()}, assigned_to = coalesce(assigned_to, ${actor.userId})
    where id = ${taskId}`)
}

export type TaskRow = { id: string; title: string; type: string; status: string; dueAt: Date | null; requestId: string | null; memberId: string | null; applicationId: string | null; assignedTo: string | null; assigneeName: string | null; memberName: string | null }

export async function listOpenTasks(actor: Actor, mine = false) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, (tx) => tx<TaskRow[]>`
    select t.id, t.title, t.type, t.status, t.due_at, t.request_id, t.member_id, t.application_id, t.assigned_to,
           a.full_name as assignee_name, coalesce(m.full_name, rm.full_name, ap.full_name) as member_name
    from tasks t
    left join profiles a on a.id = t.assigned_to
    left join profiles m on m.id = t.member_id
    left join requests r on r.id = t.request_id left join profiles rm on rm.id = r.member_id
    left join applications ap on ap.id = t.application_id
    where t.status = 'open' ${mine ? tx`and (t.assigned_to = ${actor.userId} or t.assigned_to is null)` : tx``}
    order by t.due_at nulls last limit 300`)
}

const timeSchema = z.object({
  minutes: z.coerce.number().int().min(1).max(1440),
  activity: z.enum(ACTIVITIES),
  note: z.string().trim().max(500).optional().default(''),
})

export async function addTime(actor: Actor, target: { requestId?: string; memberId?: string }, input: unknown): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = timeSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input', 'Vul minuten (1–1440) en activiteit in.')
  const d = parsed.data
  await withActor(actor, (tx) => tx`
    insert into time_entries (request_id, member_id, staff_id, minutes, activity, note)
    values (${target.requestId ?? null}, ${target.memberId ?? null}, ${actor.userId}, ${d.minutes}, ${d.activity}, ${d.note || null})`)
}

export async function startTimer(actor: Actor, requestId: string, activity: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  const a = z.enum(ACTIVITIES).safeParse(activity)
  if (!a.success) fail('invalid_input')
  await withActor(actor, async (tx) => {
    const running = await tx`select 1 from time_entries where staff_id = ${actor.userId} and minutes is null`
    if (running.length) fail('invalid_input', 'Er loopt al een timer. Stop die eerst.')
    await tx`insert into time_entries (request_id, staff_id, activity, started_at) values (${requestId}, ${actor.userId}, ${a.data}, now())`
  })
}

export async function stopTimer(actor: Actor): Promise<number | null> {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, async (tx) => {
    const [r] = await tx<{ minutes: number }[]>`
      update time_entries set ended_at = now(), minutes = greatest(1, least(1440, ceil(extract(epoch from (now() - started_at)) / 60)::int))
      where staff_id = ${actor.userId} and minutes is null returning minutes`
    return r?.minutes ?? null
  })
}

export async function runningTimer(actor: Actor) {
  if (!actor.staffVerified) return null
  const [r] = await withActor(actor, (tx) => tx<{ requestId: string | null; startedAt: Date; activity: string }[]>`
    select request_id, started_at, activity from time_entries where staff_id = ${actor.userId} and minutes is null`)
  return r ?? null
}
