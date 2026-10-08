import { getSessionUser } from '@/lib/auth'
import { leesDocument } from '@/lib/persoonsgegevens'

/**
 * Een persoonsdocument openen: een kopie ID of een loonheffingsformulier.
 * Alleen voor beheerders, en wie het opent wordt vastgelegd. Nooit in de
 * cache, en inline zodat het in de browser opent in plaats van in Downloads
 * te blijven slingeren.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return new Response('Geen toegang.', { status: 401 })

  const { documentId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return new Response('Onbekend document.', { status: 404 })
  const doc = await leesDocument(documentId, user.id)
  if (!doc) return new Response('Dit document bestaat niet meer.', { status: 404 })

  const naam = (doc.filename ?? 'document').normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/"/g, '') || 'document'
  return new Response(new Uint8Array(doc.data), {
    headers: {
      'Content-Type': doc.contentType,
      'Content-Disposition': `inline; filename="${naam}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
