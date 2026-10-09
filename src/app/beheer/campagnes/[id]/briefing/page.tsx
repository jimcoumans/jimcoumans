import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getCampagne } from '@/lib/campagnes'
import { CampagneBriefing, versieLabel } from '@/components/CampagneBriefing'
import { PrintKnop } from '@/components/PrintKnop'
import { PdfDownload } from '@/components/PdfDownload'
import { merkTekst } from '@/lib/bedrijf'

export const maxDuration = 26

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const v = await getCampagne(id)
  return { title: v ? `${v.campagne.title} · campagnebriefing` : 'Campagnebriefing' }
}

/**
 * De briefing zoals de klant hem krijgt: zonder menu, zonder knoppen in de
 * afdruk. Dit is de pagina die je als pdf bewaart en meestuurt.
 */
export default async function BriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const v = await getCampagne(id)
  if (!v) notFound()

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <a href={`/beheer/campagnes/${id}`} className="text-jr-blue text-sm hover:underline">
          &larr; Terug naar invullen
        </a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            {v.campagne.version === 0 ? 'Nog niet verstuurd' : `Versie ${versieLabel(v.campagne.version)}`}
          </span>
          <PrintKnop label="Afdrukken" />
          <PdfDownload href={`/api/campagnes/${id}/pdf`} />
        </div>
      </div>
      <div className="shadow-sm print:shadow-none">
        <CampagneBriefing v={v} merk={await merkTekst()} />
      </div>
    </div>
  )
}
