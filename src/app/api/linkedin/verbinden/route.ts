import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { linkedinAutorisatieUrl, linkedinInstellingen, linkedinTerugUrl } from '@/lib/performance/linkedin'

/**
 * Start het verbinden van een LinkedIn-account: door naar LinkedIn, met een
 * eenmalige code in een cookie zodat alleen deze browser terug mag komen.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const terug = (fout: string) => NextResponse.redirect(new URL(`/beheer/koppelingen?fout=${encodeURIComponent(fout)}`, url.origin))

  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(new URL('/login', url.origin))
  if (user.role !== 'admin') return terug('Alleen een beheerder kan een LinkedIn-account verbinden.')

  const inst = linkedinInstellingen()
  if (!inst.klaar) return terug(`Nog niet ingesteld in Netlify: ${inst.ontbreekt.join(', ')}.`)

  const state = randomBytes(24).toString('base64url')
  const antwoord = NextResponse.redirect(linkedinAutorisatieUrl(linkedinTerugUrl(url.origin), state, inst.clientId))
  antwoord.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    path: '/api/linkedin',
    maxAge: 600,
  })
  return antwoord
}
