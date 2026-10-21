import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { uitingChecks } from '@/db/schema'
import { getSessionUser } from '@/lib/auth'
import { haal } from '@/lib/bestandsopslag'

/** Een bestand van een check, om de uiting naast de bevindingen te zien. Alleen voor het team. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) return new Response('Geen toegang', { status: 401 })

  const { id, n } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d{1,2}$/.test(n)) return new Response('Niet gevonden', { status: 404 })
  const [rij] = await db.select({ bestanden: uitingChecks.bestanden }).from(uitingChecks).where(eq(uitingChecks.id, id)).limit(1)
  const b = rij?.bestanden[Number(n)]
  if (!b) return new Response('Niet gevonden', { status: 404 })
  const bestand = await haal(b.sleutel)
  if (!bestand) return new Response('Bestand ontbreekt in de opslag', { status: 404 })

  const headers = new Headers({
    'Content-Type': bestand.contentType,
    'Content-Length': String(bestand.data.byteLength),
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  })
  // Alleen afbeeldingen en pdf's komen hier binnen (op de inhoud gecontroleerd). Een pdf-lezer heeft
  // script nodig; een afbeelding niet, dus die gaat voor de zekerheid in een sandbox.
  if (bestand.contentType !== 'application/pdf') {
    headers.set('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox")
  }
  return new Response(new Uint8Array(bestand.data), { headers })
}
