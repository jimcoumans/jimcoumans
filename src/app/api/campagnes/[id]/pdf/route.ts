import { getSessionUser } from '@/lib/auth'
import { getCampagne } from '@/lib/campagnes'
import { maakBriefingPdf, pdfNaam } from '@/lib/pdf/BriefingPdf'

/**
 * De campagnebriefing als pdf-bestand, om te downloaden. Alleen voor het team.
 * Gemaakt op de server, zonder browser: binnen een seconde, en zonder
 * adresregel of werkbalk in de afdruk.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) return new Response('Geen toegang.', { status: 401 })

  const { id } = await params
  const v = await getCampagne(id)
  if (!v) return new Response('Deze campagne bestaat niet.', { status: 404 })

  const pdf = await maakBriefingPdf(v)
  const naam = pdfNaam(v)
  // Een eenvoudige naam voor oude browsers, de echte (met – en accenten) voor de rest.
  const ascii = naam.normalize('NFKD').replace(/[^\x20-\x7E]/g, '-')
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${ascii.replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(naam)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
