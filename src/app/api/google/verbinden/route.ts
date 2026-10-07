import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { autorisatieUrl, oauthInstellingen, terugUrl } from '@/lib/performance/oauth'

/**
 * Start het verbinden van een Google-account: door naar Google, met een
 * eenmalige code in een cookie zodat alleen deze browser terug mag komen.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const terug = (fout: string) => NextResponse.redirect(new URL(`/beheer/koppelingen?fout=${encodeURIComponent(fout)}`, url.origin))

  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(new URL('/login', url.origin))
  if (user.role !== 'admin') return terug('Alleen een beheerder kan een Google-account verbinden.')

  const inst = oauthInstellingen()
  if (!inst.klaar) return terug(`Nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)

  const state = randomBytes(24).toString('base64url')
  const antwoord = NextResponse.redirect(autorisatieUrl(terugUrl(url.origin), state, inst.clientId))
  antwoord.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    path: '/api/google',
    maxAge: 600,
  })
  return antwoord
}
