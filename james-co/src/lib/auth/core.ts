/**
 * Authenticatie zonder wachtwoorden: eenmalige e-maillinks, sessies in de
 * database (direct intrekbaar), TOTP voor staff.
 *
 * Generieke respons: wie niet bestaat krijgt dezelfde melding als wie wel
 * bestaat, zodat het formulier niet verraadt wie klant is.
 */
import { withSystem } from '../db-core'
import { randomToken, sha256 } from '../crypto'
import { appUrl, staffMfaRequired } from '../config'
import { hitRateLimit } from '../domain/rate-limit'
import { sendEmail } from '../integrations/email'
import { verifyTotp } from './totp'
import type { Actor } from '../actor'

export const LOGIN_TOKEN_TTL_MIN = 15
export const MEMBER_SESSION_DAYS = 30
export const STAFF_SESSION_HOURS = 12

export function normalizeEmail(e: string): string {
  return e.trim().toLowerCase()
}

export async function requestLoginLink(rawEmail: string, ipKey: string): Promise<{ ok: true } | { ok: false; reason: 'rate_limited' }> {
  const email = normalizeEmail(rawEmail)
  if (!(await hitRateLimit('login_ip', ipKey, 20, 3600))) return { ok: false, reason: 'rate_limited' }
  if (!(await hitRateLimit('login_email', email, 5, 3600))) return { ok: false, reason: 'rate_limited' }

  const token = randomToken()
  const found = await withSystem(async (tx) => {
    const [p] = await tx<{ id: string }[]>`select id from profiles where email = ${email} and disabled_at is null`
    if (!p) return false
    await tx`insert into login_tokens (token_hash, email, purpose, expires_at)
             values (${sha256(token)}, ${email}, 'login', now() + make_interval(mins => ${LOGIN_TOKEN_TTL_MIN}))`
    return true
  })
  if (found) {
    await sendEmail({
      to: email,
      subject: 'Uw inloglink voor James & Co.',
      text: `Goedendag,\n\nMet deze link logt u in bij James & Co.:\n${appUrl()}/login/verify?token=${token}\n\nDe link is ${LOGIN_TOKEN_TTL_MIN} minuten geldig en werkt één keer. Heeft u hem niet aangevraagd? Dan kunt u dit bericht negeren.\n\nJames & Co.`,
    })
  }
  return { ok: true }
}

export type ConsumeResult =
  | { ok: true; userId: string; purpose: 'login' | 'verify_application'; applicationId: string | null }
  | { ok: false }

/** Wisselt een link eenmalig in. FOR UPDATE: twee gelijktijdige klikken leveren één sessie op. */
export async function consumeToken(rawToken: string): Promise<ConsumeResult> {
  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) return { ok: false }
  return withSystem(async (tx) => {
    const [t] = await tx<{ id: string; email: string; purpose: 'login' | 'verify_application'; applicationId: string | null; expiresAt: Date; consumedAt: Date | null }[]>`
      select id, email, purpose, application_id, expires_at, consumed_at from login_tokens
      where token_hash = ${sha256(rawToken)} for update`
    if (!t || t.consumedAt || t.expiresAt.getTime() < Date.now()) return { ok: false as const }
    await tx`update login_tokens set consumed_at = now() where id = ${t.id}`
    let [p] = await tx<{ id: string; disabledAt: Date | null }[]>`select id, disabled_at from profiles where email = ${t.email}`
    if (!p && t.purpose === 'verify_application') {
      const [app] = await tx<{ fullName: string; language: string; phone: string | null; preferredContact: string | null; region: string | null }[]>`
        select full_name, language, phone, preferred_contact, region from applications where id = ${t.applicationId}`
      if (!app) return { ok: false as const }
      ;[p] = await tx<{ id: string; disabledAt: Date | null }[]>`
        insert into profiles (email, full_name, display_name, language, phone, preferred_contact, region, email_verified_at)
        values (${t.email}, ${app.fullName}, ${app.fullName.split(' ')[0] ?? app.fullName}, ${app.language}, ${app.phone}, ${app.preferredContact}, ${app.region}, now())
        returning id, disabled_at`
    }
    if (!p || p.disabledAt) return { ok: false as const }
    await tx`update profiles set email_verified_at = coalesce(email_verified_at, now()) where id = ${p.id}`
    return { ok: true as const, userId: p.id, purpose: t.purpose, applicationId: t.applicationId }
  })
}

export async function isStaffUser(userId: string): Promise<'admin' | 'concierge' | null> {
  const [r] = await withSystem((tx) => tx<{ role: 'admin' | 'concierge' }[]>`
    select role from staff_roles where user_id = ${userId} and active`)
  return r?.role ?? null
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const role = await isStaffUser(userId)
  const ms = role ? STAFF_SESSION_HOURS * 3600_000 : MEMBER_SESSION_DAYS * 86400_000
  const token = randomToken()
  const expiresAt = new Date(Date.now() + ms)
  await withSystem((tx) => tx`insert into sessions (token_hash, user_id, expires_at) values (${sha256(token)}, ${userId}, ${expiresAt})`)
  return { token, expiresAt }
}

export type SessionInfo = {
  sessionId: string
  userId: string
  email: string
  displayName: string | null
  fullName: string | null
  language: 'nl' | 'en'
  staffRole: 'admin' | 'concierge' | null
  mfaVerified: boolean
  mfaEnrolled: boolean
}

export async function loadSession(rawToken: string | undefined): Promise<SessionInfo | null> {
  if (!rawToken || rawToken.length > 200) return null
  const [s] = await withSystem((tx) => tx<(SessionInfo & { mfaVerifiedAt: Date | null; enabledAt: Date | null })[]>`
    select s.id as session_id, s.user_id, p.email, p.display_name, p.full_name, p.language,
           sr.role as staff_role, s.mfa_verified_at, m.enabled_at
    from sessions s
    join profiles p on p.id = s.user_id and p.disabled_at is null
    left join staff_roles sr on sr.user_id = s.user_id and sr.active
    left join staff_mfa m on m.user_id = s.user_id
    where s.token_hash = ${sha256(rawToken)} and s.revoked_at is null and s.expires_at > now()`)
  if (!s) return null
  return {
    sessionId: s.sessionId, userId: s.userId, email: s.email, displayName: s.displayName, fullName: s.fullName,
    language: s.language, staffRole: s.staffRole ?? null,
    mfaVerified: Boolean(s.mfaVerifiedAt), mfaEnrolled: Boolean(s.enabledAt),
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  await withSystem((tx) => tx`update sessions set revoked_at = now() where id = ${sessionId} and revoked_at is null`)
}

export function actorFromSession(s: SessionInfo | null): Actor {
  if (!s) return { userId: null, staffVerified: false, staffRole: null }
  const staffOk = Boolean(s.staffRole) && (!staffMfaRequired() || s.mfaVerified)
  return { userId: s.userId, staffVerified: staffOk, staffRole: staffOk ? s.staffRole : null }
}

// ------------------------------------------------------------------ MFA

export async function startMfaEnrollment(userId: string, secret: string): Promise<void> {
  await withSystem((tx) => tx`
    insert into staff_mfa (user_id, secret_base32) values (${userId}, ${secret})
    on conflict (user_id) do update set secret_base32 = excluded.secret_base32 where staff_mfa.enabled_at is null`)
}

export async function getMfaSecret(userId: string): Promise<{ secret: string; enabled: boolean } | null> {
  const [r] = await withSystem((tx) => tx<{ secretBase32: string; enabledAt: Date | null }[]>`
    select secret_base32, enabled_at from staff_mfa where user_id = ${userId}`)
  return r ? { secret: r.secretBase32, enabled: Boolean(r.enabledAt) } : null
}

/** Controleert een TOTP-code, weigert hergebruik van dezelfde stap, markeert de sessie. */
export async function verifyMfa(sessionId: string, userId: string, code: string): Promise<boolean> {
  if (!(await hitRateLimit('mfa', userId, 10, 900))) return false
  return withSystem(async (tx) => {
    const [m] = await tx<{ secretBase32: string; lastUsedStep: string | null }[]>`
      select secret_base32, last_used_step from staff_mfa where user_id = ${userId} for update`
    if (!m) return false
    const step = verifyTotp(m.secretBase32, code.trim())
    if (step === null || (m.lastUsedStep !== null && step <= Number(m.lastUsedStep))) return false
    await tx`update staff_mfa set last_used_step = ${step}, enabled_at = coalesce(enabled_at, now()) where user_id = ${userId}`
    await tx`update sessions set mfa_verified_at = now() where id = ${sessionId} and user_id = ${userId}`
    return true
  })
}
