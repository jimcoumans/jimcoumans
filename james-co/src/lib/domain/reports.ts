/**
 * Rapportage met expliciete definities (zie docs/METEN.md). Kleine aantallen:
 * we tonen aantallen naast percentages en verzinnen geen groei. Lege periode =
 * eerlijke lege staat.
 */
import { withActor } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'

export async function adminReport(actor: Actor, from: Date, to: Date) {
  if (actor.staffRole !== 'admin') fail('forbidden')
  return withActor(actor, async (tx) => {
    const [members] = await tx<{ active: number; paying: number; complimentary: number }[]>`
      select count(*)::int as active,
             count(*) filter (where not is_complimentary)::int as paying,
             count(*) filter (where is_complimentary)::int as complimentary
      from memberships where status in ('active', 'ending') and coalesce(starts_on, current_date) <= ${to.toISOString().slice(0, 10)}`
    const [revenue] = await tx<{ net: number; gross: number }[]>`
      select coalesce(sum(net_minor), 0)::int as net, coalesce(sum(gross_minor), 0)::int as gross from billing_records
      where status = 'issued' and kind = 'membership' and issued_at >= ${from} and issued_at < ${to}`
    const [otherRevenue] = await tx<{ net: number }[]>`
      select coalesce(sum(net_minor), 0)::int as net from billing_records where status = 'issued' and kind <> 'membership' and issued_at >= ${from} and issued_at < ${to}`
    const [cash] = await tx<{ received: number; refunded: number; corrected: number }[]>`
      select coalesce(sum(amount_minor) filter (where kind = 'payment'), 0)::int as received,
             coalesce(sum(amount_minor) filter (where kind = 'refund'), 0)::int as refunded,
             coalesce(sum(amount_minor) filter (where kind = 'correction'), 0)::int as corrected
      from payment_records where occurred_at >= ${from} and occurred_at < ${to}`
    const [supplierSpend] = await tx<{ total: number }[]>`
      select coalesce(sum(a.accepted_total_minor), 0)::int as total from approvals a where a.created_at >= ${from} and a.created_at < ${to}`
    const [minutes] = await tx<{ total: number }[]>`
      select coalesce(sum(minutes), 0)::int as total from time_entries where created_at >= ${from} and created_at < ${to} and minutes is not null`
    const perCategory = await tx<{ category: string | null; requests: number; minutes: number; p50: number | null; p90: number | null }[]>`
      with per_req as (
        select r.id, r.category, coalesce(sum(t.minutes), 0)::int as minutes from requests r
        left join time_entries t on t.request_id = r.id and t.minutes is not null
        where r.created_at >= ${from} and r.created_at < ${to} group by r.id
      )
      select category, count(*)::int as requests, sum(minutes)::int as minutes,
             percentile_cont(0.5) within group (order by minutes) as p50, percentile_cont(0.9) within group (order by minutes) as p90
      from per_req group by category order by requests desc`
    const [outcomes] = await tx<{ created: number; confirmed: number; completed: number; rejected: number; cancelled: number; issues: number }[]>`
      select count(*)::int as created,
        count(*) filter (where status in ('confirmed','completed','closed'))::int as confirmed,
        count(*) filter (where status in ('completed','closed'))::int as completed,
        count(*) filter (where status = 'rejected')::int as rejected,
        count(*) filter (where status = 'cancelled')::int as cancelled,
        count(*) filter (where has_issue)::int as issues
      from requests where created_at >= ${from} and created_at < ${to}`
    const [firstResponse] = await tx<{ n: number; p50Minutes: number | null }[]>`
      with fr as (
        select r.id, extract(epoch from (min(m.created_at) - r.created_at)) / 60 as minutes
        from requests r join request_messages m on m.request_id = r.id and m.sender_type = 'staff' and m.channel = 'portal'
        where r.created_at >= ${from} and r.created_at < ${to} group by r.id, r.created_at
      ) select count(*)::int as n, percentile_cont(0.5) within group (order by minutes) as p50_minutes from fr`
    const [throughput] = await tx<{ n: number; p50Hours: number | null }[]>`
      with t as (
        select r.id, extract(epoch from (max(b.confirmed_at) - r.created_at)) / 3600 as hours
        from requests r join bookings b on b.request_id = r.id and b.confirmed_at is not null
        where r.created_at >= ${from} and r.created_at < ${to} and r.status in ('confirmed','completed','closed') group by r.id, r.created_at
      ) select count(*)::int as n, percentile_cont(0.5) within group (order by hours) as p50_hours from t`
    const [activation] = await tx<{ activated: number; withCompleted: number; withSecondIn30: number }[]>`
      select count(*)::int as activated,
        count(*) filter (where exists (select 1 from requests r where r.member_id = m.user_id and r.status in ('completed','closed')))::int as with_completed,
        count(*) filter (where (select count(*) from requests r where r.member_id = m.user_id and r.created_at <= m.activated_at + interval '30 days') >= 2)::int as with_second_in30
      from memberships m where m.activated_at is not null`
    const [funnel] = await tx<{ applications: number; offered: number; accepted: number; viaInvitation: number }[]>`
      select count(*)::int as applications,
        count(*) filter (where status in ('offered','accepted','declined'))::int as offered,
        count(*) filter (where status = 'accepted')::int as accepted,
        count(*) filter (where invitation_id is not null)::int as via_invitation
      from applications where status <> 'unverified' and created_at >= ${from} and created_at < ${to}`
    return { members, revenue, otherRevenue, cash, supplierSpend, minutes, perCategory, outcomes, firstResponse, throughput, activation, funnel }
  })
}
