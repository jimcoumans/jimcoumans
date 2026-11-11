import { redirect } from 'next/navigation'
import { getPortaal } from '@/lib/meekijken'
import { AppShell } from '@/components/AppShell'
import { Resultaten } from '@/components/resultaten/Resultaten'
import { geldigeMaand, getResultaten, type Selectie } from '@/lib/resultaten/laden'
import { isBron } from '@/lib/performance/bronnen'

/** Zie facturen/page.tsx: een vangnet tegen de standaardgrens van Netlify. */
export const maxDuration = 26

/** Resultaten voor de klant: dezelfde rapportage als het team ziet. */
export default async function ResultatenPage({ searchParams }: { searchParams: Promise<{ maand?: string; kanaal?: string }> }) {
  const portaal = await getPortaal()
  if (portaal.status === 'geen_sessie') redirect('/login')
  if (portaal.status === 'team') redirect('/beheer')
  const { user, organizationId, meekijken } = portaal

  const { maand, kanaal } = await searchParams
  const data = await getResultaten(organizationId, geldigeMaand(maand))
  if (!data) redirect('/')
  const selectie: Selectie = kanaal && isBron(kanaal) ? kanaal : 'alle'

  return (
    <AppShell user={user} actief="resultaten" meekijken={meekijken}>
      <Resultaten data={data} pad="/resultaten" kanaal={selectie} />
    </AppShell>
  )
}
