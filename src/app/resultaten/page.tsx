import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { Resultaten } from '@/components/resultaten/Resultaten'
import { geldigeMaand, getResultaten, type Selectie } from '@/lib/resultaten/laden'
import { isBron } from '@/lib/performance/bronnen'

/** Zie facturen/page.tsx: een vangnet tegen de standaardgrens van Netlify. */
export const maxDuration = 26

/** Resultaten voor de klant: dezelfde rapportage als het team ziet. */
export default async function ResultatenPage({ searchParams }: { searchParams: Promise<{ maand?: string; kanaal?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!user.organizationId) redirect('/beheer')

  const { maand, kanaal } = await searchParams
  const data = await getResultaten(user.organizationId, geldigeMaand(maand))
  if (!data) redirect('/')
  const selectie: Selectie = kanaal && isBron(kanaal) ? kanaal : 'alle'

  return (
    <AppShell user={user} actief="resultaten">
      <Resultaten data={data} pad="/resultaten" kanaal={selectie} />
    </AppShell>
  )
}
