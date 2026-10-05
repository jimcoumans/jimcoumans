import { NextResponse } from 'next/server'
import { getSessionUser, safeCompare } from '@/lib/auth'
import { KoppelingFout } from '@/lib/performance/google'
import { rondVerbindenAf, terugUrl } from '@/lib/performance/oauth'

/** Google stuurt hier terug na het inloggen. */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const naar = (q: string) => {
    const r = NextResponse.redirect(new URL(`/beheer/koppelingen?${q}`, url.origin))
    r.cookies.delete({ name: 'google_oauth_state', path: '/api/google' })
    return r
  }
  const fout = (m: string) => naar(`fout=${encodeURIComponent(m)}`)

  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(new URL('/login', url.origin))
  if (user.role !== 'admin') return fout('Alleen een beheerder kan een Google-account verbinden.')

  if (url.searchParams.get('error')) {
    return fout(url.searchParams.get('error') === 'access_denied' ? 'Verbinden afgebroken bij Google.' : `Google meldde: ${url.searchParams.get('error')}`)
  }

  const state = url.searchParams.get('state') ?? ''
  const verwacht = request.headers.get('cookie')?.match(/(?:^|;\s*)google_oauth_state=([^;]+)/)?.[1] ?? ''
  if (!state || !verwacht || !safeCompare(state, verwacht)) return fout('Deze terugkeer van Google is verlopen of niet van jou. Probeer opnieuw.')

  const code = url.searchParams.get('code')
  if (!code) return fout('Google gaf geen code mee. Probeer opnieuw.')

  try {
    const email = await rondVerbindenAf(code, terugUrl(url.origin), user.id)
    return naar(`verbonden=${encodeURIComponent(email)}`)
  } catch (e) {
    if (e instanceof KoppelingFout) return fout(e.message)
    console.error('[google] verbinden mislukt:', e)
    return fout('Verbinden mislukt. Kijk in de serverlogs.')
  }
}
