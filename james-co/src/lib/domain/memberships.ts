/**
 * Lidmaatschap: pending -> offered -> accepted_pending_payment -> active -> ending -> ended
 * (plus declined en suspended). Activeren alleen door admin, na geaccepteerd
 * aanbod én geregistreerde ontvangst (of een expliciet als gratis gemarkeerd lidmaatschap).
 */
import { z } from 'zod'
import { withActor, withSystem, type Tx } from '../db-core'
import type { Actor } from '../actor'
import { fail } from '../errors'
import { snapshotHash } from '../crypto'
import { audit } from './audit'
import { getSettings } from './settings'
import { billingBalance } from './billing'

export type MembershipStatus = 'pending' | 'offered' | 'accepted_pending_payment' | 'active' | 'ending' | 'ended' | 'declined' | 'suspended'

export type Membership = {
  id: string; userId: string; status: MembershipStatus; planSnapshot: Record<string, unknown> | null
  acceptedOfferId: string | null; acceptedTermsVersion: string | null; acceptedAt: Date | null
  isComplimentary: boolean; startsOn: string | null; endsOn: string | null; activatedAt: Date | null; createdAt: Date
}

/** Mag dit lid nieuwe conciergeverzoeken openen? Alleen bij een actief lidmaatschap. */
export function canCreateRequests(m: Pick<Membership, 'status'> | null): boolean {
  return m?.status === 'active'
}

/** Mag dit account het ledenportaal (historie) zien? Ook na beëindiging of schorsing. */
export function canViewHistory(m: Pick<Membership, 'status'> | null): boolean {
  return Boolean(m && ['active', 'ending', 'ended', 'suspended'].includes(m.status))
}

export async function getMyMembership(actor: Actor): Promise<Membership | null> {
  if (!actor.userId) return null
  const [m] = await withActor(actor, (tx) => tx<Membership[]>`
    select * from memberships where user_id = ${actor.userId}
    order by (status not in ('ended', 'declined')) desc, created_at desc limit 1`)
  return m ?? null
}

export type OfferView = {
  id: string; version: number; status: string; priceMinor: number; currency: string; taxRateBp: number
  priceIncludesTax: boolean; billingPeriod: string; scopeText: string; termsVersion: string; termsText: string
  expiresAt: Date; issuedAt: Date; snapshotHash: string
}

export async function getMyOpenOffer(actor: Actor): Promise<OfferView | null> {
  if (!actor.userId) return null
  const [o] = await withActor(actor, (tx) => tx<OfferView[]>`
    select o.* from membership_offers o join memberships m on m.id = o.membership_id
    where m.user_id = ${actor.userId} and o.status = 'issued' order by o.version desc limit 1`)
  return o ?? null
}

export function offerSnapshot(o: Omit<OfferView, 'id' | 'status' | 'snapshotHash' | 'issuedAt'> & { membershipId: string }) {
  return {
    membershipId: o.membershipId, version: o.version, priceMinor: o.priceMinor, currency: o.currency, taxRateBp: o.taxRateBp,
    priceIncludesTax: o.priceIncludesTax, billingPeriod: o.billingPeriod, scopeText: o.scopeText,
    termsVersion: o.termsVersion, termsText: o.termsText, expiresAt: new Date(o.expiresAt).toISOString(),
  }
}

const offerSchema = z.object({
  priceMinor: z.number().int().min(0).max(10_000_000).optional(),
  scopeText: z.string().trim().min(10).max(4000).optional(),
  validDays: z.number().int().min(1).max(90).optional(),
})

/** Staff maakt (een nieuwe versie van) het lidmaatschapsaanbod voor een geverifieerde kandidaat. */
export async function issueMembershipOffer(actor: Actor, applicationId: string, input: unknown = {}) {
  if (!actor.staffVerified) fail('forbidden')
  const parsed = offerSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input')
  const s = await getSettings()
  const plan = s.membershipPlan
  return withActor(actor, async (tx) => {
    const [app] = await tx<{ id: string; userId: string | null; status: string }[]>`
      select id, user_id, status from applications where id = ${applicationId} for update`
    if (!app || !app.userId) fail('not_found')
    if (['unverified', 'rejected', 'withdrawn', 'accepted'].includes(app.status)) fail('invalid_input', 'Voor deze aanmelding kan geen aanbod worden gedaan.')
    let [m] = await tx<{ id: string; status: MembershipStatus }[]>`
      select id, status from memberships where user_id = ${app.userId} and status not in ('ended', 'declined') for update`
    if (m && !['pending', 'offered'].includes(m.status)) fail('invalid_input', 'Er loopt al een lidmaatschap.')
    if (!m) {
      ;[m] = await tx<{ id: string; status: MembershipStatus }[]>`
        insert into memberships (user_id, application_id, status) values (${app.userId}, ${app.id}, 'offered') returning id, status`
    } else {
      await tx`update memberships set status = 'offered', updated_at = now() where id = ${m.id}`
    }
    await tx`update membership_offers set status = 'superseded' where membership_id = ${m!.id} and status = 'issued'`
    const [{ next } = { next: 1 }] = await tx<{ next: number }[]>`
      select coalesce(max(version), 0)::int + 1 as next from membership_offers where membership_id = ${m!.id}`
    const expiresAt = new Date(Date.now() + (parsed.data.validDays ?? plan.offerValidDays) * 86400_000)
    const base = {
      membershipId: m!.id, version: next, priceMinor: parsed.data.priceMinor ?? plan.priceMinor, currency: plan.currency,
      taxRateBp: plan.taxRateBp, priceIncludesTax: plan.includesTax, billingPeriod: plan.billingPeriod,
      scopeText: parsed.data.scopeText ?? plan.scopeText, termsVersion: plan.termsVersion, termsText: plan.termsText, expiresAt,
    }
    const hash = snapshotHash(offerSnapshot(base))
    const [o] = await tx<{ id: string }[]>`
      insert into membership_offers (membership_id, version, price_minor, currency, tax_rate_bp, price_includes_tax, billing_period,
        scope_text, terms_version, terms_text, issued_by, expires_at, snapshot_hash)
      values (${m!.id}, ${next}, ${base.priceMinor}, ${base.currency}, ${base.taxRateBp}, ${base.priceIncludesTax}, ${base.billingPeriod},
        ${base.scopeText}, ${base.termsVersion}, ${base.termsText}, ${actor.userId}, ${expiresAt}, ${hash})
      returning id`
    await tx`update applications set status = 'offered', reviewed_by = ${actor.userId}, updated_at = now() where id = ${app.id}`
    await audit(tx, actor, 'membership.offer', 'membership_offer', o!.id, null, { version: next, priceMinor: base.priceMinor })
    return { offerId: o!.id, membershipId: m!.id, version: next }
  })
}

/** Kandidaat accepteert exact de versie die hij zag (hash), vóór verval. */
export async function acceptMembershipOffer(actor: Actor, offerId: string, expectedHash: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  // Zichtbaarheid onder RLS = eigendomsbewijs.
  const visible = await withActor(actor, async (tx) => (await tx`select 1 from membership_offers where id = ${offerId}`).length === 1)
  if (!visible) fail('not_found')
  await withSystem(async (tx) => {
    const [o] = await tx<(OfferView & { membershipId: string })[]>`select * from membership_offers where id = ${offerId} for update`
    if (!o) fail('not_found')
    const [m] = await tx<{ id: string; userId: string; status: string }[]>`select id, user_id, status from memberships where id = ${o.membershipId} for update`
    if (!m || m.userId !== actor.userId) fail('forbidden')
    if (o.status === 'accepted') return // idempotent
    if (o.status !== 'issued') fail('proposal_not_current')
    if (new Date(o.expiresAt).getTime() <= Date.now()) fail('offer_expired')
    if (o.snapshotHash !== expectedHash) fail('proposal_changed')
    const snap = offerSnapshot(o)
    await tx`update membership_offers set status = 'accepted', accepted_at = now(), accepted_by = ${actor.userId} where id = ${o.id}`
    await tx`update memberships set status = 'accepted_pending_payment', accepted_offer_id = ${o.id}, accepted_terms_version = ${o.termsVersion},
             accepted_at = now(), plan_snapshot = ${tx.json(snap as never)}, updated_at = now() where id = ${m.id}`
    await tx`update applications set status = 'accepted', updated_at = now() where user_id = ${actor.userId} and status = 'offered'`
    await tx`insert into tasks (member_id, title, type, due_at) values (${actor.userId}, 'Aanbod geaccepteerd: factuur maken en betaling registreren', 'follow_up', now() + interval '1 day')`
    await audit(tx, actor, 'membership.accept', 'membership', m.id, { status: m.status }, { status: 'accepted_pending_payment', offerVersion: o.version })
  })
}

export async function declineMembershipOffer(actor: Actor, offerId: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  const visible = await withActor(actor, async (tx) => (await tx`select 1 from membership_offers where id = ${offerId}`).length === 1)
  if (!visible) fail('not_found')
  await withSystem(async (tx) => {
    const [o] = await tx<{ id: string; membershipId: string; status: string }[]>`select id, membership_id, status from membership_offers where id = ${offerId} for update`
    if (!o || o.status !== 'issued') fail('proposal_not_current')
    await tx`update membership_offers set status = 'withdrawn' where id = ${o.id}`
    await tx`update memberships set status = 'declined', updated_at = now() where id = ${o.membershipId} and user_id = ${actor.userId}`
    await tx`update applications set status = 'declined', updated_at = now() where user_id = ${actor.userId} and status = 'offered'`
    await audit(tx, actor, 'membership.decline', 'membership', o.membershipId)
  })
}

async function lockMembership(tx: Tx, id: string) {
  const [m] = await tx<Membership[]>`select * from memberships where id = ${id} for update`
  if (!m) fail('not_found')
  return m
}

/** Admin activeert. Vereist geaccepteerd aanbod en volledig ontvangen lidmaatschapsfactuur (tenzij gratis gemarkeerd). */
export async function activateMembership(actor: Actor, membershipId: string, opts: { complimentary?: boolean; startsOn?: string } = {}): Promise<void> {
  if (actor.staffRole !== 'admin') fail('forbidden')
  const s = await getSettings()
  await withActor(actor, async (tx) => {
    const m = await lockMembership(tx, membershipId)
    if (m.status !== 'accepted_pending_payment' || !m.acceptedOfferId) fail('invalid_input', 'Activeren kan pas na een geaccepteerd aanbod.')
    if (!opts.complimentary) {
      const bills = await tx<{ id: string; grossMinor: number; status: string }[]>`
        select id, gross_minor, status from billing_records where membership_id = ${m.id} and kind = 'membership' and status = 'issued'`
      let paid = false
      for (const b of bills) {
        const bal = await billingBalance(tx, b.id)
        if (bal.state === 'paid' || bal.state === 'overpaid') paid = true
      }
      if (!paid) fail('payment_required')
    }
    const [{ active } = { active: 0 }] = await tx<{ active: number }[]>`select count(*)::int as active from memberships where status = 'active'`
    if (active >= s.capacity.maxActiveMembers) fail('invalid_input', `Maximaal ${s.capacity.maxActiveMembers} actieve leden ingesteld (operationele capaciteit).`)
    await tx`update memberships set status = 'active', is_complimentary = ${Boolean(opts.complimentary)}, activated_at = now(), activated_by = ${actor.userId},
             starts_on = ${opts.startsOn ?? new Date().toISOString().slice(0, 10)}, updated_at = now() where id = ${m.id}`
    await audit(tx, actor, 'membership.activate', 'membership', m.id, { status: m.status }, { status: 'active', complimentary: Boolean(opts.complimentary) })
  })
}

const ADMIN_TRANSITIONS: Record<string, MembershipStatus[]> = {
  suspend: ['active', 'ending'],
  reinstate: ['suspended'],
  end_at: ['active', 'suspended'],
  end_now: ['active', 'ending', 'suspended'],
}

export async function changeMembershipStatus(actor: Actor, membershipId: string, action: 'suspend' | 'reinstate' | 'end_at' | 'end_now', input: { reason?: string; endsOn?: string } = {}): Promise<void> {
  if (actor.staffRole !== 'admin') fail('forbidden')
  if (!ADMIN_TRANSITIONS[action]) fail('invalid_input')
  await withActor(actor, async (tx) => {
    const m = await lockMembership(tx, membershipId)
    if (!ADMIN_TRANSITIONS[action]!.includes(m.status)) fail('invalid_input', 'Deze wijziging past niet bij de huidige status.')
    const next: MembershipStatus = action === 'suspend' ? 'suspended' : action === 'reinstate' ? 'active' : action === 'end_at' ? 'ending' : 'ended'
    const endsOn = action === 'end_now' ? new Date().toISOString().slice(0, 10) : action === 'end_at' ? input.endsOn ?? null : m.endsOn
    if (action === 'end_at' && !endsOn) fail('invalid_input', 'Kies een einddatum.')
    await tx`update memberships set status = ${next}, ends_on = ${endsOn}, updated_at = now() where id = ${m.id}`
    if (input.reason?.trim()) {
      await tx`insert into internal_notes (member_id, author_id, body) values (${m.userId}, ${actor.userId}, ${`Lidmaatschap ${action}: ${input.reason.trim()}`})`
    }
    // Bestaande verplichtingen blijven opgevolgd: open verzoeken krijgen een taak.
    if (next !== 'active') {
      await tx`insert into tasks (member_id, title, type, due_at)
               select ${m.userId}, 'Lidmaatschap gewijzigd: lopende verzoeken en boekingen opvolgen', 'follow_up', now() + interval '1 day'
               where exists (select 1 from requests where member_id = ${m.userId} and status not in ('completed','closed','rejected','cancelled'))`
    }
    await audit(tx, actor, `membership.${action}`, 'membership', m.id, { status: m.status }, { status: next, endsOn })
  })
}

/** Leden met einddatum in het verleden en status ending -> ended. Idempotent; kan bij elke ops-load draaien. */
export async function settleEndedMemberships(): Promise<number> {
  const rows = await withSystem((tx) => tx`
    update memberships set status = 'ended', updated_at = now()
    where status = 'ending' and ends_on is not null and ends_on < current_date returning id`)
  return rows.length
}

/** Leden die een beëindiging aanvragen: een taak, geen directe statuswijziging. */
export async function requestMembershipEnd(actor: Actor, note: string): Promise<void> {
  const m = await getMyMembership(actor)
  if (!m || !['active', 'suspended'].includes(m.status)) fail('invalid_input')
  await withSystem(async (tx) => {
    await tx`insert into tasks (member_id, title, type, due_at)
             values (${actor.userId}, ${`Lid vraagt beëindiging aan${note.trim() ? `: ${note.trim().slice(0, 300)}` : ''}`}, 'follow_up', now() + interval '2 days')`
    await audit(tx, actor, 'membership.end_requested', 'membership', m.id)
  })
}
