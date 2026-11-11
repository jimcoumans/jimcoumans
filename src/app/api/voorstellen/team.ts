import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { VoorstelFout } from '@/lib/voorstellen'

/** Alleen het team: voorstellen bevatten prijzen en interne afwegingen. */
export async function teamOf401() {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return { user: null, fout: NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 }) }
  }
  return { user, fout: null }
}

export function foutAntwoord(error: unknown) {
  if (error instanceof VoorstelFout) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  const melding = describeDbError(error)
  if (melding) return NextResponse.json({ ok: false, error: melding }, { status: 400 })
  console.error('[voorstellen] onverwachte fout:', error)
  return NextResponse.json({ ok: false, error: 'Er ging iets mis. Kijk in de serverlogs.' }, { status: 500 })
}
