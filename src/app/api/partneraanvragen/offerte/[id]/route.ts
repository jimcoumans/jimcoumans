import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { partnerUitvragen } from '@/db/schema'
import { getSessionUser } from '@/lib/auth'
import { haal } from '@/lib/bestandsopslag'

/** De offerte van een partner (pdf of afbeelding), zoals die bij een aanvraag is vastgelegd. Alleen voor het team. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) return new Response('Geen toegang', { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Niet gevonden', { status: 404 })
  const [u] = await db
    .select({ sleutel: partnerUitvragen.offerteSleutel, naam: partnerUitvragen.offerteNaam })
    .from(partnerUitvragen)
    .where(eq(partnerUitvragen.id, id))
    .limit(1)
  if (!u?.sleutel) return new Response('Niet gevonden', { status: 404 })
  const bestand = await haal(u.sleutel)
  if (!bestand) return new Response('Bestand ontbreekt in de opslag', { status: 404 })
  const headers = new Headers({
    'Content-Type': bestand.contentType,
    'Content-Length': String(bestand.data.byteLength),
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `inline; filename="${(u.naam ?? 'offerte').replace(/[^\w.\- ]+/g, '_')}"`,
  })
  if (bestand.contentType !== 'application/pdf') {
    headers.set('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox")
  }
  return new Response(new Uint8Array(bestand.data), { headers })
}
