import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getOrganizationBySlug } from '@/lib/admin'
import { AppShell } from '@/components/AppShell'
import { Resultaten } from '@/components/resultaten/Resultaten'
import { geldigeMaand, getResultaten, type Selectie } from '@/lib/resultaten/laden'
import { isBron } from '@/lib/performance/bronnen'

/** Zie facturen/page.tsx: een vangnet tegen de standaardgrens van Netlify. */
export const maxDuration = 26

/** Resultaten van een klant, precies zoals de klant ze in het portaal ziet. */
export default async function KlantResultatenPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ maand?: string; kanaal?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { slug } = await params
  const { maand, kanaal } = await searchParams
  const klant = await getOrganizationBySlug(slug)
  if (!klant) notFound()
  const data = await getResultaten(klant.organization.id, geldigeMaand(maand))
  if (!data) notFound()
  const selectie: Selectie = kanaal && isBron(kanaal) ? kanaal : 'alle'

  return (
    <AppShell user={user} actief="klanten">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={`/beheer/klanten/${slug}?tab=performance`} className="text-jr-link hover:underline">
          ← Terug naar {klant.organization.name}
        </Link>
        <span className="text-gray-500">Zo ziet de klant het onder Resultaten in het portaal.</span>
      </div>
      <Resultaten data={data} pad={`/beheer/klanten/${slug}/resultaten`} kanaal={selectie} />
    </AppShell>
  )
}
