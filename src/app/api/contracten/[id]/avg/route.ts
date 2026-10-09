import { getSessionUser } from '@/lib/auth'
import { getContract } from '@/lib/contracten'
import { maakAvgPdf, avgPdfNaam } from '@/lib/pdf/AvgPdf'

/** De AVG-verklaring bij een contract, met de naam van de werknemer erin. Alleen voor beheerders. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return new Response('Geen toegang.', { status: 401 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Onbekend contract.', { status: 404 })
  const contract = await getContract(id)
  if (!contract) return new Response('Dit contract bestaat niet.', { status: 404 })

  const pdf = await maakAvgPdf(contract)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${avgPdfNaam(contract).replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
