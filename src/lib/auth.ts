import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { and, eq, lt, isNull, gte, count } from 'drizzle-orm'
import { db } from '@/db'
import { loginTokens, users, organizations } from '@/db/schema'
import type { User, Organization } from '@/db/schema'

/* -------------------------------------------------------------------------
   Inloggen zonder wachtwoord.

   Waarom geen wachtwoorden: klanten loggen een paar keer per maand in. Een
   wachtwoord dat je zelden gebruikt wordt zwak of vergeten, en dan bouw je
   een wachtwoord-vergeten-flow die zelf weer een e-maillink is. Dan kun je
   net zo goed alleen die link hebben. Scheelt ook supportvragen.

   Er is bewust GEEN zelfregistratie. Een klant krijgt toegang omdat het
   JR-team hem toevoegt. Wie niet in de gebruikerstabel staat, krijgt geen
   link, maar ziet wel dezelfde bevestiging: anders kun je via het
   inlogformulier uitvissen wie klant is bij James Robinson.
   ------------------------------------------------------------------------- */

const SESSION_COOKIE = 'jr_wallet_session'
const TOKEN_TTL_MINUTES = 15
const SESSION_TTL_DAYS = 30
/** Meer dan dit aantal aanvragen per e-mailadres per uur is misbruik. */
const MAX_TOKENS_PER_HOUR = 5

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET ontbreekt of is te kort (minimaal 32 tekens).')
  }
  return new TextEncoder().encode(value)
}

/** E-mailadressen worden altijd genormaliseerd, zodat Jim@ en jim@ hetzelfde zijn. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type LoginRequestResult =
  | { status: 'sent'; token: string; email: string }
  | { status: 'unknown_email' }
  | { status: 'rate_limited' }

/**
 * Maakt een eenmalige inloglink aan. De aanroeper verstuurt de e-mail.
 *
 * Het onbewerkte token wordt alleen teruggegeven, nooit opgeslagen: in de
 * database staat enkel de SHA-256 hash. Wie de database leest, kan daarmee
 * niet inloggen.
 */
export async function createLoginToken(
  rawEmail: string,
  requestedIp?: string | null,
): Promise<LoginRequestResult> {
  const email = normalizeEmail(rawEmail)

  const [user] = await db
    .select({ id: users.id, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user || user.disabledAt !== null) {
    return { status: 'unknown_email' }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const [recent] = await db
    .select({ total: count() })
    .from(loginTokens)
    .where(and(eq(loginTokens.email, email), gte(loginTokens.createdAt, oneHourAgo)))

  if (Number(recent?.total ?? 0) >= MAX_TOKENS_PER_HOUR) {
    return { status: 'rate_limited' }
  }

  const token = randomBytes(32).toString('base64url')

  await db.insert(loginTokens).values({
    tokenHash: hashToken(token),
    email,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
    requestedIp: requestedIp ?? null,
  })

  return { status: 'sent', token, email }
}

export type VerifyResult =
  | { status: 'ok'; userId: string }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'used' }

/**
 * Wisselt een inloglink in voor een sessie. Het token wordt in dezelfde
 * transactie als gebruikt gemarkeerd, zodat dezelfde link niet twee keer
 * werkt, ook niet als iemand er twee keer tegelijk op klikt.
 */
export async function consumeLoginToken(token: string): Promise<VerifyResult> {
  const tokenHash = hashToken(token)

  return db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(loginTokens)
      .where(eq(loginTokens.tokenHash, tokenHash))
      .for('update')
      .limit(1)

    if (!record) return { status: 'invalid' as const }
    if (record.consumedAt !== null) return { status: 'used' as const }
    if (record.expiresAt.getTime() < Date.now()) return { status: 'expired' as const }

    const [user] = await tx
      .select({ id: users.id, disabledAt: users.disabledAt })
      .from(users)
      .where(eq(users.email, record.email))
      .limit(1)

    if (!user || user.disabledAt !== null) return { status: 'invalid' as const }

    await tx
      .update(loginTokens)
      .set({ consumedAt: new Date() })
      .where(eq(loginTokens.id, record.id))

    await tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))

    return { status: 'ok' as const, userId: user.id }
  })
}

/** Zet de sessiecookie. */
export async function createSession(userId: string): Promise<void> {
  const jwt = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secret())

  const jar = await cookies()
  jar.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    // Alleen over https in productie; lokaal draait het op http.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export type SessionUser = User & { organization: Organization | null }

/**
 * De ingelogde gebruiker, of null.
 *
 * De gebruiker wordt bij elke aanroep uit de database gelezen in plaats van
 * uit het token. Dat kost een query, maar het betekent dat het intrekken van
 * toegang (disabledAt) direct werkt. Bij een portaal met klantfinancien is
 * dat belangrijker dan die query.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const raw = jar.get(SESSION_COOKIE)?.value
  if (!raw) return null

  let userId: string
  try {
    const { payload } = await jwtVerify(raw, secret(), { algorithms: ['HS256'] })
    if (typeof payload.sub !== 'string') return null
    userId = payload.sub
  } catch {
    // Verlopen of gemanipuleerde cookie: gewoon niet ingelogd.
    return null
  }

  const [row] = await db
    .select({ user: users, organization: organizations })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .where(and(eq(users.id, userId), isNull(users.disabledAt)))
    .limit(1)

  if (!row) return null
  return { ...row.user, organization: row.organization }
}

/** Voor pagina's die inloggen vereisen. Gooit als er geen sessie is. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new UnauthorizedError()
  return user
}

/** Voor pagina's die alleen het JR-team mag zien. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'staff' && user.role !== 'admin') {
    throw new ForbiddenError()
  }
  return user
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Niet ingelogd')
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Geen toegang')
  }
}

/**
 * Controleert of deze gebruiker bij deze klant mag kijken.
 * Klanten alleen bij hun eigen organisatie, het JR-team overal.
 * Elke pagina die klantdata toont moet hier langs.
 */
export function canAccessOrganization(user: SessionUser, organizationId: string): boolean {
  if (user.role === 'staff' || user.role === 'admin') return true
  return user.organizationId === organizationId
}

/** Vergelijking in constante tijd, voor het sync-geheim. */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Ruimt verlopen en gebruikte inloglinks op. Draai dit periodiek. */
export async function pruneLoginTokens(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const deleted = await db
    .delete(loginTokens)
    .where(lt(loginTokens.expiresAt, cutoff))
    .returning({ id: loginTokens.id })
  return deleted.length
}
