import { getSessionUser } from '@/lib/auth'
import { maakAvgPdfVoor } from '@/lib/pdf/AvgPdf'

/** Een voorbeeld van de AVG-verklaring, om de tekst na te lezen voordat hij bij een contract hoort. */
export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return new Response('Geen toegang.', { status: 401 })
  const pdf = await maakAvgPdfVoor('Voorbeeld Medewerker', 'Voorbeeld Medewerker')
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="AVG-verklaring voorbeeld.pdf"', 'Cache-Control': 'private, no-store' },
  })
}
