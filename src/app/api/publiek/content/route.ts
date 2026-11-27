import { NextResponse } from 'next/server'
import { goedgekeurdeContent } from '@/lib/publiek/content'
import { GEEN_CACHE, websiteOf401 } from '@/lib/publiek/toegang'

/** Alle goedgekeurde content (pagina's, cases, reviews, FAQ's, insights), voor jamesrobinson.nl. */
export async function GET(req: Request) {
  const fout = websiteOf401(req)
  if (fout) return fout
  return NextResponse.json({ ok: true, content: await goedgekeurdeContent() }, { headers: GEEN_CACHE })
}
