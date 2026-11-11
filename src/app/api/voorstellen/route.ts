import { NextResponse } from 'next/server'
import { lijstDossiers } from '@/lib/voorstellen'
import { foutAntwoord, teamOf401 } from './team'

/** Alle dossiers van de voorstelgenerator, nieuwste eerst. */
export async function GET() {
  const { fout } = await teamOf401()
  if (fout) return fout
  try {
    return NextResponse.json({ ok: true, dossiers: await lijstDossiers() })
  } catch (e) {
    return foutAntwoord(e)
  }
}
