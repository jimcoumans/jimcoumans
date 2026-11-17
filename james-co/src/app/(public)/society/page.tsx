import Link from 'next/link'
import type { Metadata } from 'next'
import { publicTeasers } from '@/lib/domain/society'
import { formatDate } from '@/lib/time'
import { Badge } from '@/components/ui'

export const metadata: Metadata = { title: 'The James Society' }
export const dynamic = 'force-dynamic'

export default async function Society() {
  const teasers = await publicTeasers()
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-4">The James Society, by James &amp; Co.</p>
      <h1 className="text-[44px] leading-tight sm:text-[56px]">Bijzondere momenten, gedeeld.</h1>
      <div className="rule my-8" />
      <p className="max-w-prose text-[17px] leading-relaxed text-ink/85">
        The James Society brengt leden samen rond zorgvuldig gekozen ervaringen. Van een intiem diner tot een bijzonder verblijf. Uitnodigingen zijn persoonlijk; deelname wordt per ervaring aangeboden.
      </p>
      <ul className="mt-8 space-y-2 text-[15px] text-muted">
        <li>Het lidmaatschap geeft toegang tot uitnodigingen, voor zover een ervaring voor u toegankelijk is.</li>
        <li>Deelname kan apart worden betaald en is pas zeker na bevestiging van uw plek.</li>
        <li>Wie er verder deelneemt, blijft tussen ons. Er zijn geen openbare ledenlijsten of profielen.</li>
      </ul>
      {teasers.length > 0 && (
        <div className="mt-12">
          <h2 className="text-[28px]">Binnenkort</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {teasers.map((t) => (
              <article key={t.id} className="card">
                {t.isDemo && <Badge tone="warn">Voorbeeld</Badge>}
                <p className="mt-2 text-sm text-muted">{formatDate(t.startsAt, t.timezone)}</p>
                <h3 className="mt-1 text-[24px]">{t.title}</h3>
                <p className="mt-2 text-[15px] text-muted">{t.summary}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">Deelname is voor uitgenodigde leden.</p>
        </div>
      )}
      <Link href="/apply" className="btn-primary mt-12">Kennismaken</Link>
    </div>
  )
}
