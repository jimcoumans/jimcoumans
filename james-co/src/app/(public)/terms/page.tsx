import type { Metadata } from 'next'
import { Notice } from '@/components/ui'
import { getSettings } from '@/lib/domain/settings'

export const metadata: Metadata = { title: 'Voorwaarden' }
export const dynamic = 'force-dynamic'

export default async function Terms() {
  const s = await getSettings()
  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-[44px]">Voorwaarden</h1>
      <div className="mt-6"><Notice tone="warn" title="Concept">Deze voorwaarden zijn nog niet juridisch beoordeeld en gelden pas als definitieve tekst in een aanbod dat u accepteert. Versie: {s.membershipPlan.termsVersion}.</Notice></div>
      <p className="mt-6 whitespace-pre-line text-[16px] leading-relaxed">{s.membershipPlan.termsText}</p>
    </article>
  )
}
