import { NextResponse } from 'next/server'
import { AiFout, schrijf } from '@/lib/voorstel/ai'
import { teamOf401 } from '../team'

/** Zie facturen/page.tsx: het maximum van Netlify voor een gewone functie. */
export const maxDuration = 26

/** De AI van de voorstelgenerator: een opdracht erin, tekst of JSON eruit. Alleen voor het team. */
export async function POST(req: Request) {
  const { fout } = await teamOf401()
  if (fout) return fout
  let body: { prompt?: unknown; json?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Lege aanvraag.', code: 'leeg' }, { status: 400 })
  }
  try {
    const uit = await schrijf(String(body.prompt ?? ''), body.json === true)
    return NextResponse.json({ ok: true, uitkomst: uit })
  } catch (e) {
    if (e instanceof AiFout) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.code === 'geen_sleutel' ? 503 : 400 })
    console.error('[voorstellen/ai] onverwachte fout:', e)
    return NextResponse.json({ ok: false, error: 'De AI gaf een fout. Probeer het zo opnieuw.', code: 'serverfout' }, { status: 502 })
  }
}
