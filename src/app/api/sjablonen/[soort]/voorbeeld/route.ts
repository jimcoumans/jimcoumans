import { getSessionUser } from '@/lib/auth'
import { maakVoorbeeldContractPdf } from '@/lib/pdf/ContractPdf'

/** Een voorbeeldcontract van het sjabloon, om een gewijzigde tekst na te lezen. Alleen voor beheerders. */
export async function GET(request: Request, { params }: { params: Promise<{ soort: string }> }) {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return new Response('Geen toegang.', { status: 401 })
  const { soort } = await params
  if (soort !== 'bepaalde_tijd' && soort !== 'onbepaalde_tijd') return new Response('Onbekende soort.', { status: 404 })
  const maatwerk = new URL(request.url).searchParams.get('maatwerk') === '1'
  const pdf = await maakVoorbeeldContractPdf(soort, maatwerk)
  if (!pdf) return new Response('Er is nog geen sjabloon of geen bedrijfsgegevens.', { status: 404 })
  return new Response(new Uint8Array(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="Voorbeeldcontract.pdf"', 'Cache-Control': 'private, no-store' },
  })
}
