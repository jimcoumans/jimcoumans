'use server'

import { redirect } from 'next/navigation'
import { requestLoginLink, consumeToken, createSession, revokeSession, verifyMfa, startMfaEnrollment, isStaffUser } from '@/lib/auth/core'
import { finalizeApplicationVerification } from '@/lib/domain/applications'
import { clientKey, setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth/session'
import { generateTotpSecret } from '@/lib/auth/totp'
import { staffMfaRequired } from '@/lib/config'
import { str, type FormState } from './state'

export async function loginAction(fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Vul een geldig e-mailadres in.' }
  const r = await requestLoginLink(email, await clientKey())
  if (!r.ok) return { error: 'Te veel pogingen. Probeer het over een uur opnieuw.' }
  return { ok: true, message: 'Als dit adres bij ons bekend is, ontvangt u binnen enkele minuten een inloglink. De link is 15 minuten geldig.' }
}

export async function verifyAction(fd: FormData): Promise<FormState> {
  const r = await consumeToken(str(fd, 'token'))
  if (!r.ok) return { error: 'Deze link is ongeldig, verlopen of al gebruikt. Vraag een nieuwe link aan.' }
  if (r.purpose === 'verify_application' && r.applicationId) await finalizeApplicationVerification(r.applicationId, r.userId)
  const s = await createSession(r.userId)
  await setSessionCookie(s.token, s.expiresAt)
  const staff = await isStaffUser(r.userId)
  if (staff) redirect(staffMfaRequired() ? '/ops/mfa' : '/ops')
  redirect(r.purpose === 'verify_application' ? '/onboarding' : '/app')
}

export async function logoutAction(): Promise<void> {
  const s = await getSession()
  if (s) await revokeSession(s.sessionId)
  await clearSessionCookie()
  redirect('/login')
}

export async function startMfaAction(): Promise<FormState> {
  const s = await getSession()
  if (!s?.staffRole) return { error: 'Geen toegang.' }
  if (s.mfaEnrolled) return { error: 'Tweestapsverificatie is al ingesteld.' }
  await startMfaEnrollment(s.userId, generateTotpSecret())
  redirect('/ops/mfa')
}

export async function verifyMfaAction(fd: FormData): Promise<FormState> {
  const s = await getSession()
  if (!s?.staffRole) return { error: 'Geen toegang.' }
  const ok = await verifyMfa(s.sessionId, s.userId, str(fd, 'code'))
  if (!ok) return { error: 'Code onjuist of al gebruikt. Wacht op de volgende code en probeer opnieuw.' }
  redirect('/ops')
}
