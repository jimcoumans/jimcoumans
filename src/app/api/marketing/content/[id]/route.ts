import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { exportJson, exportMarkdown } from '@/lib/marketing/content'
import { magMarketing } from '@/lib/marketing/registers'

/**
 * Export van één stuk content als JSON of Markdown, voor wie de pagina met de
 * hand in WordPress zet. Bewijs zonder toestemming van de klant gaat er niet in.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || !magMarketing(user.role, 'lezen')) return NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 })
  const { id } = await params
  const format = new URL(req.url).searchParams.get('format') === 'md' ? 'md' : 'json'
  if (format === 'md') {
    const md = await exportMarkdown(id)
    if (md === null) return NextResponse.json({ ok: false, error: 'Niet gevonden.' }, { status: 404 })
    return new NextResponse(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="content-${id}.md"` } })
  }
  const j = await exportJson(id)
  if (!j) return NextResponse.json({ ok: false, error: 'Niet gevonden.' }, { status: 404 })
  return new NextResponse(JSON.stringify(j, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="content-${j.slug || id}.json"` } })
}
