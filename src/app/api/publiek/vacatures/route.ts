import { NextResponse } from 'next/server'
import { openVacatures } from '@/lib/publiek/vacatures'
import { GEEN_CACHE, websiteOf401 } from '@/lib/publiek/toegang'

/** De open vacatures, voor jamesrobinson.nl. */
export async function GET(req: Request) {
  const fout = websiteOf401(req)
  if (fout) return fout
  return NextResponse.json({ ok: true, vacatures: await openVacatures() }, { headers: GEEN_CACHE })
}
