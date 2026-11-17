/**
 * Aanmelden ("Kennismaking aanvragen"), e-mailverificatie en beoordeling.
 * Een aanmelding maakt niemand staff of actief lid; alleen een admin
 * activeert na geaccepteerd aanbod en geregistreerde betaling.
 */
import { z } from 'zod'
import { withActor, withSystem } from '../db-core'
import type { Actor } from '../actor'
import { randomToken, sha256 } from '../crypto'
import { appUrl } from '../config'
import { fail } from '../errors'
import { audit } from './audit'
import { hitRateLimit } from './rate-limit'
import { claimInvitation, findOpenInvitationId } from './invitations'
import { sendEmail } from '../integrations/email'

export const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  region: z.string().trim().max(120).optional().default(''),
  preferredContact: z.enum(['email', 'phone', 'whatsapp', 'portal']).default('email'),
  phone: z.string().trim().max(40).optional().default(''),
  helpRequest: z.string().trim().min(5).max(3000),
  source: z.string().trim().max(200).optional().default(''),
  segment: z.enum(['nl_member', 'international_visitor']).default('nl_member'),
  language: z.enum(['nl', 'en']).default('nl'),
  visitStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).default(''),
  visitEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')).default(''),
  partySize: z.coerce.number().int().min(1).max(50).optional(),
  privacyAck: z.literal(true),
  idempotencyKey: z.string().uuid(),
  invitationToken: z.string().max(200).optional().default(''),
})

export type ApplicationInput = z.input<typeof applicationSchema>

export async function submitApplication(input: unknown, ipKey: string): Promise<{ ok: true; applicationId: string } | { ok: false; reason: 'invalid' | 'rate_limited'; field?: string }> {
  const parsed = applicationSchema.safeParse(input)
  if (!parsed.success) return { ok: false, reason: 'invalid', field: String(parsed.error.issues[0]?.path[0] ?? '') }
  const d = parsed.data
  if (d.visitStart && d.visitEnd && d.visitEnd < d.visitStart) return { ok: false, reason: 'invalid', field: 'visitEnd' }
  if (!(await hitRateLimit('apply_ip', ipKey, 10, 3600))) return { ok: false, reason: 'rate_limited' }
  if (!(await hitRateLimit('apply_email', d.email, 3, 3600))) return { ok: false, reason: 'rate_limited' }

  const token = randomToken()
  const result = await withSystem(async (tx) => {
    const invitationId = d.invitationToken ? await findOpenInvitationId(tx, d.invitationToken) : null
    const [row] = await tx<{ id: string; inserted: boolean }[]>`
      insert into applications (email, full_name, region, preferred_contact, phone, help_request, source, segment, language,
        visit_start, visit_end, party_size, invitation_id, privacy_ack_at, idempotency_key)
      values (${d.email}, ${d.fullName}, ${d.region || null}, ${d.preferredContact}, ${d.phone || null}, ${d.helpRequest},
        ${d.source || null}, ${d.segment}, ${d.language}, ${d.visitStart || null}, ${d.visitEnd || null}, ${d.partySize ?? null},
        ${invitationId}, now(), ${d.idempotencyKey})
      on conflict (idempotency_key) do update set updated_at = applications.updated_at
      returning id, (xmax = 0) as inserted`
    if (row!.inserted) {
      await tx`insert into login_tokens (token_hash, email, purpose, application_id, expires_at)
               values (${sha256(token)}, ${d.email}, 'verify_application', ${row!.id}, now() + interval '24 hours')`
      await audit(tx, null, 'application.submit', 'application', row!.id, null, { segment: d.segment, viaInvitation: Boolean(invitationId) })
    }
    return row!
  })
  if (result.inserted) {
    const en = d.language === 'en'
    await sendEmail({
      to: d.email,
      subject: en ? 'Please confirm your email address — James & Co.' : 'Bevestig uw e-mailadres — James & Co.',
      text: en
        ? `Thank you for your request. Please confirm your email address with this link:\n${appUrl()}/login/verify?token=${token}\n\nThe link is valid for 24 hours. Did you not request this? Then you can ignore this message.\n\nJames & Co.`
        : `Dank voor uw aanvraag. Bevestig uw e-mailadres via deze link:\n${appUrl()}/login/verify?token=${token}\n\nDe link is 24 uur geldig. Heeft u dit niet aangevraagd? Dan kunt u dit bericht negeren.\n\nJames & Co.`,
    })
  }
  return { ok: true, applicationId: result.id }
}

/** Na verificatie: aanmelding indienen, uitnodiging atomair claimen, beoordelingstaak maken. */
export async function finalizeApplicationVerification(applicationId: string, userId: string): Promise<{ claimed: boolean | null }> {
  return withSystem(async (tx) => {
    const [app] = await tx<{ id: string; status: string; invitationId: string | null; email: string }[]>`
      select id, status, invitation_id, email from applications where id = ${applicationId} for update`
    if (!app) return { claimed: null }
    const [p] = await tx<{ email: string }[]>`select email from profiles where id = ${userId}`
    if (!p || p.email !== app.email) return { claimed: null }
    if (app.status !== 'unverified') return { claimed: null }
    let claimed: boolean | null = null
    if (app.invitationId) {
      claimed = await claimInvitation(tx, app.invitationId, app.id)
      if (!claimed) await tx`update applications set invitation_id = null where id = ${app.id}`
    }
    await tx`update applications set status = 'submitted', verified_at = now(), user_id = ${userId}, updated_at = now() where id = ${app.id}`
    await tx`insert into tasks (application_id, title, type, due_at) values (${app.id}, 'Nieuwe aanmelding beoordelen', 'review_application', now() + interval '2 days')`
    await audit(tx, { userId, staffVerified: false, staffRole: null }, 'application.verified', 'application', app.id, null, { invitationClaimed: claimed })
    return { claimed }
  })
}

// ------------------------------------------------------------------ staff

export type ApplicationRow = {
  id: string; email: string; fullName: string; region: string | null; preferredContact: string | null; phone: string | null
  helpRequest: string; source: string | null; segment: string; language: string; visitStart: string | null; visitEnd: string | null
  partySize: number | null; invitationId: string | null; status: string; userId: string | null; createdAt: Date; verifiedAt: Date | null
}

export async function listApplications(actor: Actor) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, (tx) => tx<(ApplicationRow & { inviterName: string | null; teamInvite: boolean })[]>`
    select a.*, p.full_name as inviter_name, (i.id is not null and i.inviter_id is null) as team_invite
    from applications a
    left join invitations i on i.id = a.invitation_id
    left join profiles p on p.id = i.inviter_id
    where a.status <> 'unverified'
    order by a.created_at desc limit 200`)
}

export async function getApplication(actor: Actor, id: string) {
  if (!actor.staffVerified) fail('forbidden')
  return withActor(actor, async (tx) => {
    const [a] = await tx<ApplicationRow[]>`select * from applications where id = ${id}`
    if (!a) fail('not_found')
    const notes = await tx<{ id: string; body: string; createdAt: Date; author: string | null }[]>`
      select n.id, n.body, n.created_at, p.full_name as author from internal_notes n left join profiles p on p.id = n.author_id
      where n.application_id = ${id} order by n.created_at`
    const membership = a.userId
      ? (await tx<{ id: string; status: string }[]>`select id, status from memberships where user_id = ${a.userId} order by created_at desc limit 1`)[0] ?? null
      : null
    const offers = membership
      ? await tx<{ id: string; version: number; status: string; priceMinor: number; currency: string; expiresAt: Date; issuedAt: Date }[]>`
          select id, version, status, price_minor, currency, expires_at, issued_at from membership_offers where membership_id = ${membership.id} order by version desc`
      : []
    return { application: a, notes, membership, offers }
  })
}

const REVIEW_STATUSES = ['in_review', 'intro_scheduled', 'rejected', 'withdrawn'] as const

export async function setApplicationStatus(actor: Actor, id: string, status: string): Promise<void> {
  if (!actor.staffVerified) fail('forbidden')
  if (!(REVIEW_STATUSES as readonly string[]).includes(status)) fail('invalid_input')
  await withActor(actor, async (tx) => {
    const [a] = await tx<{ status: string }[]>`select status from applications where id = ${id} for update`
    if (!a) fail('not_found')
    if (['unverified', 'accepted'].includes(a.status)) fail('invalid_input', 'Deze aanmelding kan niet meer van status wisselen.')
    await tx`update applications set status = ${status}, reviewed_by = ${actor.userId}, updated_at = now() where id = ${id}`
    await audit(tx, actor, 'application.status', 'application', id, { status: a.status }, { status })
  })
}
