import { leesAfbeelding } from '@/lib/afbeeldingen'
import { getSessionUser } from '@/lib/auth'

/**
 * Serveert een logo of profielfoto.
 *
 * Achter inloggen, want een klantenbestand met logo's is ook een
 * klantenbestand. De cache-header staat op private en een jaar: de URL bevat
 * een id dat nooit verandert zolang de afbeelding dezelfde is, en bij een
 * nieuwe upload komt er een nieuw id. Zo hoeft de browser hem nooit opnieuw
 * op te halen en hoeven we nooit een cache leeg te maken.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser()
  if (!user) return new Response('Niet ingelogd', { status: 401 })

  const { id } = await params
  const afbeelding = await leesAfbeelding(id)
  if (!afbeelding) return new Response('Niet gevonden', { status: 404 })

  return new Response(new Uint8Array(afbeelding.body), {
    headers: {
      'Content-Type': afbeelding.contentType,
      'Content-Length': String(afbeelding.body.byteLength),
      'Cache-Control': 'private, max-age=31536000, immutable',
      // Een plaatje blijft een plaatje: nooit laten raden wat het is.
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
