import { getSessionUser } from '@/lib/auth'
import { maakMap, type DossierVan } from '@/lib/salarisadministratie'

export const maxDuration = 26

/**
 * De map van een medewerker of kandidaat als zip: voor de salarisadministratie
 * (?voor=salaris) of de eigen administratie (?voor=eigen). Alleen voor
 * beheerders; elk document erin wordt als geopend vastgelegd.
 */
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return new Response('Geen toegang.', { status: 401 })

  const q = new URL(request.url).searchParams
  const kandidaat = q.get('kandidaat') ?? ''
  const collega = q.get('collega') ?? ''
  const uuid = /^[0-9a-f-]{36}$/i
  const van: DossierVan | null = uuid.test(collega) ? { userId: collega } : uuid.test(kandidaat) ? { kandidaatId: kandidaat } : null
  if (!van) return new Response('Onbekend bij wie dit hoort.', { status: 404 })

  const map = await maakMap(van, q.get('voor') === 'eigen' ? 'eigen' : 'salaris', user.id)
  if (!map) return new Response('Deze persoon bestaat niet meer.', { status: 404 })

  return new Response(map.zip as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${map.bestandsnaam.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
