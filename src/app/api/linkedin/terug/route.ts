import { NextResponse } from 'next/server'
import { getSessionUser, safeCompare } from '@/lib/auth'
import { KoppelingFout } from '@/lib/performance/google'
import { linkedinTerugUrl } from '@/lib/performance/linkedin'
import { rondLinkedinVerbindenAf } from '@/lib/performance/linkedin-verbinding'

/** LinkedIn stuurt hier terug na het inloggen. */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const naar = (q: string) => {
    const r = NextResponse.redirect(new URL(`/beheer/koppelingen?${q}`, url.origin))
    r.cookies.delete({ name: 'linkedin_oauth_state', path: '/api/linkedin' })
    return r
  }
  const fout = (m: string) => naar(`fout=${encodeURIComponent(m)}`)

  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(new URL('/login', url.origin))
  if (user.role !== 'admin') return fout('Alleen een beheerder kan een LinkedIn-account verbinden.')

  if (url.searchParams.get('error')) {
    const e = url.searchParams.get('error')
    return fout(e === 'user_cancelled_login' || e === 'user_cancelled_authorize' ? 'Verbinden afgebroken bij LinkedIn.' : `LinkedIn meldde: ${url.searchParams.get('error_description') ?? e}`)
  }

  const state = url.searchParams.get('state') ?? ''
  const verwacht = request.headers.get('cookie')?.match(/(?:^|;\s*)linkedin_oauth_state=([^;]+)/)?.[1] ?? ''
  if (!state || !verwacht || !safeCompare(state, verwacht)) return fout('Deze terugkeer van LinkedIn is verlopen of niet van jou. Probeer opnieuw.')

  const code = url.searchParams.get('code')
  if (!code) return fout('LinkedIn gaf geen code mee. Probeer opnieuw.')

  try {
    const label = await rondLinkedinVerbindenAf(code, linkedinTerugUrl(url.origin), user.id)
    return naar(`verbonden=${encodeURIComponent(label)}`)
  } catch (e) {
    if (e instanceof KoppelingFout) return fout(e.message)
    console.error('[linkedin] verbinden mislukt:', e)
    return fout('Verbinden mislukt. Kijk in de serverlogs.')
  }
}
