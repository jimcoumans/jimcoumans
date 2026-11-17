import { NextResponse } from 'next/server'
import { lijstOpstellers } from '@/lib/voorstellen'
import { foutAntwoord, teamOf401 } from '../team'

/** Wie een voorstel kan opstellen: de actieve medewerkers, en wie er nu is ingelogd. */
export async function GET() {
  const { user, fout } = await teamOf401()
  if (fout) return fout
  try {
    return NextResponse.json({ ok: true, lijst: await lijstOpstellers(), ik: user.id })
  } catch (e) {
    return foutAntwoord(e)
  }
}
