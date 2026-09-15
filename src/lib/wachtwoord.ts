import { and, eq, gte, lt, sql, count } from 'drizzle-orm'
import { db } from '@/db'
import { users, loginAttempts } from '@/db/schema'
import { normalizeEmail } from './auth'

/* -------------------------------------------------------------------------
   Inloggen met een wachtwoord.

   Dit bestaat naast de inloglink, niet in plaats daarvan. Klanten loggen in
   met een link — daar valt niets te raden en niets te vergeten. Voor het
   eigen team is een wachtwoord praktischer, en het werkt ook als de mail het
   niet doet.

   Het hashen en vergelijken gebeurt in de database met pgcrypto (bcrypt).
   Dat scheelt een pakket, en het betekent dat een wachtwoord met één regel
   SQL te zetten is als niemand meer binnenkomt.

   Het wachtwoord zelf wordt nergens bewaard: uit een bcrypt-hash valt het
   niet terug te rekenen, en de salt zorgt dat twee mensen met hetzelfde
   wachtwoord een andere hash krijgen.
   ------------------------------------------------------------------------- */

export class WachtwoordError extends Error {}

/** Hoeveel misslagen op één adres voordat de deur dichtgaat, en hoe lang. */
export const MAX_POGINGEN = 10
export const SLOT_MINUTEN = 15

/** De kosten van bcrypt. Twaalf is traag genoeg om raden duur te maken. */
const BCRYPT_KOSTEN = 12

/**
 * Eisen aan een wachtwoord.
 *
 * Twaalf tekens en verder niets. Geen hoofdletter-cijfer-teken-regels: die
 * leveren "Welkom2024!" op, en dat is korter én slechter te raden dan een
 * zin van vier woorden. Lengte is wat telt.
 */
export function controleerWachtwoord(wachtwoord: string): string | null {
  if (wachtwoord.length < 12) {
    return 'Kies een wachtwoord van minstens 12 tekens. Een zin van vier woorden werkt prima en onthoud je makkelijker.'
  }
  if (wachtwoord.length > 200) {
    return 'Dit wachtwoord is te lang.'
  }
  return null
}

/** Zet of vervangt het wachtwoord van een gebruiker. */
export async function zetWachtwoord(userId: string, wachtwoord: string): Promise<void> {
  const fout = controleerWachtwoord(wachtwoord)
  if (fout) throw new WachtwoordError(fout)

  const [bestaat] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
  if (!bestaat) throw new WachtwoordError('Gebruiker niet gevonden.')

  await db
    .update(users)
    .set({ passwordHash: sql`crypt(${wachtwoord}, gen_salt('bf', ${BCRYPT_KOSTEN}))` })
    .where(eq(users.id, userId))
}

/** Haalt het wachtwoord weg; daarna kan alleen nog met een inloglink. */
export async function wisWachtwoord(userId: string): Promise<void> {
  await db.update(users).set({ passwordHash: null }).where(eq(users.id, userId))
}

export type InlogUitkomst =
  | { status: 'ok'; userId: string }
  | { status: 'fout' }
  | { status: 'op_slot'; minuten: number }

/**
 * Controleert e-mailadres en wachtwoord.
 *
 * Bij een onbekend adres, een geblokkeerd account, een gebruiker zonder
 * wachtwoord of een verkeerd wachtwoord komt exact dezelfde uitkomst terug.
 * Zou je die uit elkaar houden, dan kun je via dit formulier uitvissen wie er
 * een account heeft — en dat is precies wat een aanvaller eerst wil weten.
 */
export async function controleerInlog(
  ruwEmail: string,
  wachtwoord: string,
  ip?: string | null,
): Promise<InlogUitkomst> {
  const email = normalizeEmail(ruwEmail)

  const sinds = new Date(Date.now() - SLOT_MINUTEN * 60 * 1000)
  const [misser] = await db
    .select({ aantal: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), gte(loginAttempts.attemptedAt, sinds)))

  if (Number(misser?.aantal ?? 0) >= MAX_POGINGEN) {
    return { status: 'op_slot', minuten: SLOT_MINUTEN }
  }

  const [rij] = await db
    .select({
      id: users.id,
      klopt: sql<boolean>`${users.passwordHash} IS NOT NULL AND ${users.passwordHash} = crypt(${wachtwoord}, ${users.passwordHash})`,
      geblokkeerd: sql<boolean>`${users.disabledAt} IS NOT NULL`,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (rij && rij.klopt && !rij.geblokkeerd) {
    // Geslaagd: de misslagen mogen weg, anders loopt iemand die zich vergiste
    // alsnog tegen het slot aan.
    await db.delete(loginAttempts).where(eq(loginAttempts.email, email))
    return { status: 'ok', userId: rij.id }
  }

  await db.insert(loginAttempts).values({ email, ip: ip ?? null })
  return { status: 'fout' }
}

/** Heeft deze gebruiker een wachtwoord ingesteld? */
export async function heeftWachtwoord(userId: string): Promise<boolean> {
  const [rij] = await db
    .select({ heeft: sql<boolean>`${users.passwordHash} IS NOT NULL` })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rij?.heeft ?? false
}

/** Ruimt oude mislukte pogingen op. Draait mee met de dagelijkse run. */
export async function pruneLoginAttempts(): Promise<number> {
  const grens = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const weg = await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, grens))
    .returning({ id: loginAttempts.id })
  return weg.length
}
