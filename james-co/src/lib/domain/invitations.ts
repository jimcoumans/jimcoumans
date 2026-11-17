/**
 * Uitnodigingen. Token: 256 bits, alleen de SHA-256-hash wordt opgeslagen,
 * de ruwe link wordt eenmalig getoond bij aanmaken. Openen verbruikt de link
 * niet; de claim gebeurt atomair bij e-mailverificatie van de aanmelding.
 * Bezit van de link bewijst geen identiteit.
 */
import { z } from 'zod'
import { withActor, withSystem, type Tx } from '../db-core'
import type { Actor } from '../actor'
import { randomToken, sha256 } from '../crypto'
import { appUrl } from '../config'
import { fail } from '../errors'
import { audit } from './audit'
import { getSettings } from './settings'
import { hitRateLimit } from './rate-limit'

export type InvitationRow = {
  id: string
  inviterId: string | null
  inviterDisplayName: string | null
  revealConsent: boolean
  expiresAt: Date
  revokedAt: Date | null
  claimedAt: Date | null
  createdAt: Date
}

export type InvitationState = 'open' | 'claimed' | 'expired' | 'revoked'

export function invitationState(i: Pick<InvitationRow, 'expiresAt' | 'revokedAt' | 'claimedAt'>, now = new Date()): InvitationState {
  if (i.claimedAt) return 'claimed'
  if (i.revokedAt) return 'revoked'
  if (i.expiresAt.getTime() <= now.getTime()) return 'expired'
  return 'open'
}

const createSchema = z.object({
  displayName: z.string().trim().max(60).optional().default(''),
  revealConsent: z.boolean(),
})

async function insertInvitation(tx: Tx, actor: Actor, inviterId: string | null, displayName: string | null, reveal: boolean, validDays: number) {
  const token = randomToken(32)
  const [row] = await tx<{ id: string; expiresAt: Date }[]>`
    insert into invitations (token_hash, inviter_id, created_by, inviter_display_name, reveal_consent, reveal_consent_at, expires_at)
    values (${sha256(token)}, ${inviterId}, ${actor.userId}, ${displayName}, ${reveal}, ${reveal ? new Date() : null},
            now() + make_interval(days => ${validDays}))
    returning id, expires_at`
  await audit(tx, actor, 'invitation.create', 'invitation', row!.id, null, { inviterId, revealConsent: reveal })
  return { id: row!.id, expiresAt: row!.expiresAt, url: `${appUrl()}/invite/${token}`, token }
}

/** Lid maakt een persoonlijke link. Vereist actief lidmaatschap en respecteert de limiet. */
export async function createMemberInvitation(actor: Actor, input: unknown) {
  if (!actor.userId) fail('forbidden')
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) fail('invalid_input')
  const { displayName, revealConsent } = parsed.data
  if (revealConsent && !displayName) fail('invalid_input', 'Kies de naam die de ontvanger mag zien.')
  const settings = await getSettings()
  // Eigendom en status onder RLS controleren, daarna in één systeemtransactie
  // (met advisory lock per lid) tellen en aanmaken, zodat de limiet ook bij
  // gelijktijdige verzoeken klopt.
  const active = await withActor(actor, async (tx) => {
    const [m] = await tx`select 1 from memberships where user_id = ${actor.userId} and status = 'active'`
    return Boolean(m)
  })
  if (!active) fail('membership_not_active')
  return withSystem(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${'invite:' + actor.userId}))`
    const [{ open } = { open: 0 }] = await tx<{ open: number }[]>`
      select count(*)::int as open from invitations
      where inviter_id = ${actor.userId} and claimed_at is null and revoked_at is null and expires_at > now()`
    if (open >= settings.invitations.maxOpenPerMember) fail('invitation_limit')
    return insertInvitation(tx, actor, actor.userId, revealConsent ? displayName : null, revealConsent, settings.invitations.validDays)
  })
}

export async function createTeamInvitation(actor: Actor) {
  if (!actor.staffVerified) fail('forbidden')
  const settings = await getSettings()
  return withActor(actor, (tx) => insertInvitation(tx, actor, null, null, false, settings.invitations.validDays))
}

export async function revokeInvitation(actor: Actor, invitationId: string): Promise<void> {
  if (!actor.userId) fail('forbidden')
  await withActor(actor, async (tx) => {
    // RLS: een lid ziet alleen eigen uitnodigingen; staff ziet alles. Leden hebben
    // geen UPDATE-policy, dus het intrekken zelf loopt na deze controle via systeem.
    const [inv] = await tx<{ id: string; inviterId: string | null }[]>`select id, inviter_id from invitations where id = ${invitationId}`
    if (!inv) fail('not_found')
    if (!actor.staffVerified && inv.inviterId !== actor.userId) fail('forbidden')
  })
  await withSystem(async (tx) => {
    await tx`update invitations set revoked_at = now() where id = ${invitationId} and revoked_at is null and claimed_at is null`
    await audit(tx, actor, 'invitation.revoke', 'invitation', invitationId)
  })
}

/** Wat een verwijzer mag zien: alleen de status van de link, niets over de nieuwe klant. */
export async function listOwnInvitations(actor: Actor) {
  if (!actor.userId) fail('forbidden')
  const rows = await withActor(actor, (tx) => tx<InvitationRow[]>`
    select id, inviter_id, inviter_display_name, reveal_consent, expires_at, revoked_at, claimed_at, created_at
    from invitations where inviter_id = ${actor.userId} order by created_at desc limit 50`)
  return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, expiresAt: r.expiresAt, revealConsent: r.revealConsent, displayName: r.inviterDisplayName, state: invitationState(r) }))
}

export type InvitationView = { valid: false } | { valid: true; kind: 'member' | 'team'; canReveal: boolean }

/** Server-side validatie voor /invite/[token]. Geeft geen klantgegevens terug. */
export async function inspectInvitation(rawToken: string): Promise<InvitationView> {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) return { valid: false }
  const [inv] = await withSystem((tx) => tx<InvitationRow[]>`
    select id, inviter_id, inviter_display_name, reveal_consent, expires_at, revoked_at, claimed_at, created_at
    from invitations where token_hash = ${sha256(rawToken)}`)
  if (!inv || invitationState(inv) !== 'open') return { valid: false }
  return { valid: true, kind: inv.inviterId ? 'member' : 'team', canReveal: Boolean(inv.inviterId && inv.revealConsent) }
}

/** Onthult de door de verwijzer gekozen weergavenaam, alleen met diens vastgelegde toestemming. */
export async function revealInviter(rawToken: string, ipKey: string): Promise<{ ok: true; name: string | null; team: boolean } | { ok: false; reason: 'invalid' | 'rate_limited' }> {
  if (!(await hitRateLimit('reveal', ipKey, 30, 3600))) return { ok: false, reason: 'rate_limited' }
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) return { ok: false, reason: 'invalid' }
  const [inv] = await withSystem((tx) => tx<InvitationRow[]>`
    select id, inviter_id, inviter_display_name, reveal_consent, expires_at, revoked_at, claimed_at, created_at
    from invitations where token_hash = ${sha256(rawToken)}`)
  if (!inv || invitationState(inv) !== 'open') return { ok: false, reason: 'invalid' }
  if (!inv.inviterId) return { ok: true, name: null, team: true }
  return { ok: true, name: inv.revealConsent ? inv.inviterDisplayName : null, team: false }
}

/** Zoekt een open uitnodiging op token (bij aanmelden). Claimt nog niet. */
export async function findOpenInvitationId(tx: Tx, rawToken: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(rawToken)) return null
  const [inv] = await tx<InvitationRow[]>`
    select id, inviter_id, inviter_display_name, reveal_consent, expires_at, revoked_at, claimed_at, created_at
    from invitations where token_hash = ${sha256(rawToken)}`
  return inv && invitationState(inv) === 'open' ? inv.id : null
}

/**
 * Atomaire claim: maximaal één geslaagde claim per uitnodiging. De rij wordt
 * door UPDATE gelockt; een tweede gelijktijdige claim ziet claimed_at gevuld
 * en krijgt nul rijen terug.
 */
export async function claimInvitation(tx: Tx, invitationId: string, applicationId: string): Promise<boolean> {
  const rows = await tx`
    update invitations set claimed_at = now(), claimed_application_id = ${applicationId}
    where id = ${invitationId} and claimed_at is null and revoked_at is null and expires_at > now()
    returning id`
  return rows.length === 1
}
