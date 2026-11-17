import 'server-only'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { actorFromSession, loadSession, type SessionInfo } from './core'
import { staffMfaRequired, appEnv } from '../config'
import type { Actor } from '../actor'

export const SESSION_COOKIE = 'jc_session'

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: appEnv() === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const jar = await cookies()
  return loadSession(jar.get(SESSION_COOKIE)?.value)
})

export async function getActor(): Promise<Actor> {
  return actorFromSession(await getSession())
}

export async function requireUser(): Promise<{ session: SessionInfo; actor: Actor }> {
  const session = await getSession()
  if (!session) redirect('/login')
  return { session, actor: actorFromSession(session) }
}

export async function requireStaff(): Promise<{ session: SessionInfo; actor: Actor }> {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.staffRole) redirect('/app')
  if (staffMfaRequired() && !session.mfaVerified) redirect('/ops/mfa')
  return { session, actor: actorFromSession(session) }
}

export async function requireAdmin(): Promise<{ session: SessionInfo; actor: Actor }> {
  const r = await requireStaff()
  if (r.session.staffRole !== 'admin') redirect('/ops')
  return r
}

/** Grof IP-kenmerk voor rate limiting; wordt gehasht opgeslagen. */
export async function clientKey(): Promise<string> {
  const h = await headers()
  return (h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local').slice(0, 64)
}
