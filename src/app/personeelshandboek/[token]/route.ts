import { handboekViaToken, haalBedrijfsdocument } from '@/lib/bedrijf'

/**
 * Het personeelshandboek via de link in de begeleidende mail, zonder
 * inloggen: een kandidaat heeft nog geen account. Elke versie heeft een eigen
 * geheime link, zodat de link in een contract altijd de versie toont die bij
 * dat contract hoort.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const doc = await handboekViaToken(token)
  if (!doc) return new Response('Deze link werkt niet (meer). Vraag ons om een nieuwe.', { status: 404 })
  const bestand = await haalBedrijfsdocument(doc)
  if (!bestand) return new Response('Het handboek is even niet te openen. Probeer het later nog eens.', { status: 503 })
  return new Response(new Uint8Array(bestand.data), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${doc.filename.replace(/[^\x20-\x7E]/g, '-').replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Robots-Tag': 'noindex',
    },
  })
}
