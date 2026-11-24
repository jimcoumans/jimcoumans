import { asc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { analyticsConnections, linkedinConnections, type LinkedinConnection } from '@/db/schema'
import { vergeet } from '@/lib/cache'
import { KoppelingFout } from './google'
import { haalLinkedinGebruiker, leesTokens, linkedinInstellingen, tokenAanvraag, tokenNogGoed } from './linkedin'
import { ontsleutel, versleutel } from './sleutel'

/* -------------------------------------------------------------------------
   Verbonden LinkedIn-accounts bewaren en hun tokens vernieuwen. Zie
   linkedin.ts voor de API zelf.
   ------------------------------------------------------------------------- */

/** Code uit de terugkeer van LinkedIn omzetten en het account bewaren. Geeft het label terug. */
export async function rondLinkedinVerbindenAf(code: string, redirectUri: string, userId: string): Promise<string> {
  const inst = linkedinInstellingen()
  if (!inst.klaar) throw new KoppelingFout(`Nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  const json = await tokenAanvraag({ grant_type: 'authorization_code', code, client_id: inst.clientId, client_secret: inst.clientSecret, redirect_uri: redirectUri })
  const tokens = leesTokens(json)
  const wie = await haalLinkedinGebruiker(tokens.accessToken)
  const label = `LinkedIn-account met ${wie.accounts} ${wie.accounts === 1 ? 'advertentieaccount' : 'advertentieaccounts'}`
  const waarden = {
    label,
    accessTokenEnc: versleutel(tokens.accessToken),
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshTokenEnc: versleutel(tokens.refreshToken),
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    scopes: tokens.scopes,
    lastError: null,
    lastErrorAt: null,
    updatedAt: new Date(),
  }
  await db
    .insert(linkedinConnections)
    .values({ memberUrn: wie.memberUrn, createdByUserId: userId, ...waarden })
    .onConflictDoUpdate({ target: linkedinConnections.memberUrn, set: waarden })
  vergeet('google:')
  return label
}

/* ------------------------------ Toegang ---------------------------------- */

/**
 * Een geldig toegangstoken voor dit account. Loopt het binnen een week af,
 * dan vernieuwen we het met het vernieuwtoken en bewaren we het nieuwe paar.
 */
export async function linkedinToegangstoken(v: LinkedinConnection): Promise<string> {
  if (tokenNogGoed(v.accessTokenExpiresAt)) return ontsleutel(v.accessTokenEnc)
  const refresh = ontsleutel(v.refreshTokenEnc)
  if (!refresh && tokenNogGoed(v.accessTokenExpiresAt, new Date(), 0)) return ontsleutel(v.accessTokenEnc)
  if (!refresh || !tokenNogGoed(v.refreshTokenExpiresAt, new Date(), 0)) {
    const melding = refresh
      ? 'De LinkedIn-verbinding is na een jaar verlopen. Verbind het LinkedIn-account opnieuw onder Beheer → Koppelingen.'
      : 'Het LinkedIn-token is na zestig dagen verlopen (de app kreeg geen vernieuwtoken). Verbind het LinkedIn-account opnieuw onder Beheer → Koppelingen.'
    await db.update(linkedinConnections).set({ lastError: melding, lastErrorAt: new Date() }).where(eq(linkedinConnections.id, v.id))
    throw new KoppelingFout(melding)
  }
  const inst = linkedinInstellingen()
  if (!inst.klaar) throw new KoppelingFout(`Nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)
  try {
    const json = await tokenAanvraag({ grant_type: 'refresh_token', refresh_token: refresh, client_id: inst.clientId, client_secret: inst.clientSecret })
    const tokens = leesTokens(json, new Date(), { refreshToken: refresh, refreshTokenExpiresAt: v.refreshTokenExpiresAt })
    await db
      .update(linkedinConnections)
      .set({
        accessTokenEnc: versleutel(tokens.accessToken),
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenEnc: versleutel(tokens.refreshToken),
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        lastError: null,
        lastErrorAt: null,
        updatedAt: new Date(),
      })
      .where(eq(linkedinConnections.id, v.id))
    return tokens.accessToken
  } catch (e) {
    const melding = e instanceof KoppelingFout ? e.message : `Vernieuwen mislukt: ${(e as Error).message}`
    await db.update(linkedinConnections).set({ lastError: melding, lastErrorAt: new Date() }).where(eq(linkedinConnections.id, v.id))
    throw new KoppelingFout(`${v.label}: ${melding}`)
  }
}

/* ------------------------------ Beheer ----------------------------------- */

export async function listLinkedinVerbindingen(): Promise<LinkedinConnection[]> {
  return db.select().from(linkedinConnections).orderBy(asc(linkedinConnections.createdAt))
}

export async function getLinkedinVerbinding(id: string): Promise<LinkedinConnection | null> {
  const [v] = await db.select().from(linkedinConnections).where(eq(linkedinConnections.id, id))
  return v ?? null
}

/** Per verbinding: op hoeveel klantkoppelingen hij draait. */
export async function gebruikPerLinkedinVerbinding(): Promise<Map<string, number>> {
  const rijen = await db
    .select({ id: analyticsConnections.linkedinConnectionId, n: sql<number>`count(*)::int` })
    .from(analyticsConnections)
    .where(isNotNull(analyticsConnections.linkedinConnectionId))
    .groupBy(analyticsConnections.linkedinConnectionId)
  return new Map(rijen.map((r) => [r.id!, r.n]))
}

/** Loskoppelen; de klanten die erop draaiden krijgen een duidelijke melding. */
export async function verwijderLinkedinVerbinding(id: string) {
  const v = await getLinkedinVerbinding(id)
  if (!v) return
  await db.transaction(async (tx) => {
    await tx
      .update(analyticsConnections)
      .set({ active: false, lastError: `Het ${v.label} is losgekoppeld. Kies het advertentieaccount opnieuw.`, lastErrorAt: new Date() })
      .where(eq(analyticsConnections.linkedinConnectionId, id))
    await tx.delete(linkedinConnections).where(eq(linkedinConnections.id, id))
  })
  vergeet('google:')
}
