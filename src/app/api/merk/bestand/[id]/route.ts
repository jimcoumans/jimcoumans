import { getSessionUser } from '@/lib/auth'
import { getBestand } from '@/lib/merkkluis'
import { haal } from '@/lib/bestandsopslag'

/**
 * Een bestand uit de merkkluis. Alleen voor het team: klanten kijken in V1
 * nog niet mee. ?formaat=klein geeft de miniatuur, ?download=1 een download.
 *
 * SVG gaat altijd in een sandbox: een SVG kan script bevatten, en wie hem
 * direct opent mag dat nooit laten draaien op ons domein.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) return new Response('Geen toegang', { status: 401 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Niet gevonden', { status: 404 })
  const rij = await getBestand(id)
  if (!rij) return new Response('Niet gevonden', { status: 404 })

  const url = new URL(request.url)
  const klein = url.searchParams.get('formaat') === 'klein' && rij.hasThumbnail
  const bestand = await haal(klein ? `${rij.storageKey}.klein` : rij.storageKey)
  if (!bestand) return new Response('Bestand ontbreekt in de opslag', { status: 404 })

  const headers = new Headers({
    'Content-Type': bestand.contentType,
    'Content-Length': String(bestand.data.byteLength),
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  })
  if (bestand.contentType === 'image/svg+xml') {
    headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox")
  }
  if (url.searchParams.get('download') === '1') {
    const naam = (rij.filename ?? `${rij.title}`).replace(/[^\w.\- ]+/g, '_')
    headers.set('Content-Disposition', `attachment; filename="${naam}"`)
  }
  return new Response(new Uint8Array(bestand.data), { headers })
}
