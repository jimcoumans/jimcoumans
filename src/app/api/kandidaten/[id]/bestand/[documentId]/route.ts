import { getSessionUser } from '@/lib/auth'
import { getDocument } from '@/lib/sollicitatie'

/**
 * Een cv downloaden.
 *
 * Achter een inlog en alleen voor het team: dit zijn bestanden van mensen
 * die bij ons solliciteerden. Het bestand wordt als download aangeboden en
 * niet in de browser getoond, met een Content-Disposition van 'attachment'
 * en een Content-Security-Policy die alles blokkeert. Een PDF die in een
 * tabblad opent kan JavaScript bevatten dat in de context van onze eigen
 * site draait; als download kan hij dat niet.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return new Response('Geen toegang', { status: 401 })
  }

  const { id, documentId } = await params
  const document = await getDocument(documentId)

  // Ook controleren of het bestand bij deze kandidaat hoort. Anders is de
  // kandidaat in het adres betekenisloos en kun je met een los id elk
  // bestand ophalen.
  if (!document || document.candidateId !== id) {
    return new Response('Niet gevonden', { status: 404 })
  }

  const bytes = Buffer.from(document.data, 'base64')
  const naam = (document.filename ?? 'bestand').replace(/["\\]/g, '')

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': document.contentType,
      'content-length': String(bytes.byteLength),
      'content-disposition': `attachment; filename="${naam}"`,
      'content-security-policy': "default-src 'none'; sandbox",
      'x-content-type-options': 'nosniff',
      // Nooit in een cache onderweg: dit zijn persoonsgegevens.
      'cache-control': 'private, no-store',
    },
  })
}
