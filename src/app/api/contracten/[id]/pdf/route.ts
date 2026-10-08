import { getSessionUser } from '@/lib/auth'
import { getContract, getWerkgever } from '@/lib/contracten'
import { maakContractPdf, contractPdfNaam } from '@/lib/pdf/ContractPdf'

/** Een contract als pdf. Alleen voor beheerders: er staan salaris en adres in. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return new Response('Geen toegang.', { status: 401 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Onbekend contract.', { status: 404 })
  const contract = await getContract(id)
  if (!contract) return new Response('Dit contract bestaat niet.', { status: 404 })

  const pdf = await maakContractPdf(contract, await getWerkgever())
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${contractPdfNaam(contract).replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
