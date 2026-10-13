import { getSessionUser } from '@/lib/auth'
import { medewerkersXlsx } from '@/lib/salarisadministratie'

export const maxDuration = 26

/** Alle medewerkers als Excel, voor de eigen administratie. Alleen voor beheerders. */
export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return new Response('Geen toegang.', { status: 401 })
  const xlsx = await medewerkersXlsx()
  const vandaag = new Date().toISOString().slice(0, 10)
  return new Response(xlsx as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Medewerkers ${vandaag}.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
