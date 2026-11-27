import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

/**
 * Alleen de website mag de openbare API lezen, met een vaste sleutel
 * (PUBLIEK_API_TOKEN, in Netlify bij het portaal én de website).
 *
 * Wat eruit komt is gepubliceerd en dus openbaar; de sleutel voorkomt dat
 * iemand anders de API leegtrekt of er een eigen site mee vult. Staat de
 * sleutel niet ingesteld, dan staat de API dicht.
 */
export function websiteOf401(req: Request): NextResponse | null {
  const verwacht = process.env.PUBLIEK_API_TOKEN
  if (!verwacht) return NextResponse.json({ ok: false, error: 'De openbare API is niet ingesteld.' }, { status: 503 })
  const kop = req.headers.get('authorization') ?? ''
  const gegeven = kop.startsWith('Bearer ') ? kop.slice(7) : ''
  const a = Buffer.from(gegeven)
  const b = Buffer.from(verwacht)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 })
  return null
}

/** Niet cachen: de website cachet zelf en wordt geseind als er iets verandert. */
export const GEEN_CACHE = { 'cache-control': 'no-store' }
