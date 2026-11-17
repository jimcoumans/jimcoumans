import Link from 'next/link'
import type { Metadata } from 'next'
import { getSettings } from '@/lib/domain/settings'

export const metadata: Metadata = { title: 'Zo werkt het' }
export const dynamic = 'force-dynamic'

export default async function HowItWorks() {
  const s = await getSettings()
  const hours = s.serviceHours.enabled && s.serviceHours.description
    ? `${s.serviceHours.description}${s.serviceHours.responseTime ? ` ${s.serviceHours.responseTime}` : ''}`
    : 'We bespreken bereikbaarheid en reactietijden tijdens de kennismaking.'
  const faq: [string, React.ReactNode][] = [
    ['Wat kan ik laten regelen?', 'Diners, overnachtingen, vervoer, cadeaus, ervaringen en bijzondere gelegenheden. We beoordelen iedere aanvraag op haalbaarheid. Complexe opdrachten krijgen een apart voorstel.'],
    ['Zijn de kosten van een diner of reis inbegrepen?', 'Nee. Het lidmaatschap betreft de afgesproken dienstverlening. Producten en diensten van leveranciers betaalt u apart, volgens het vooraf geaccepteerde voorstel.'],
    ['Garanderen jullie beschikbaarheid?', 'Een aanvraag is nog geen boeking. U krijgt een bevestiging zodra de leverancier de reservering heeft bevestigd.'],
    ['Moet ik een app downloaden?', 'Nee. U gebruikt het mobiele ledenportaal en, zodra ingericht, het zakelijke WhatsApp-contact.'],
    ['Kan ik zonder uitnodiging kennismaken?', 'Ja. U kunt een aanvraag indienen. We bespreken samen of de service bij uw wensen past.'],
    ['Wie heeft mij uitgenodigd?', 'Bij een persoonlijke uitnodiging kunt u de verwijzer bekijken voordat u zich aanmeldt.'],
    ['Wanneer zijn jullie bereikbaar?', hours],
  ]
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-4">Zo werkt het</p>
      <h1 className="text-[44px] leading-tight sm:text-[56px]">Van wens tot bevestiging, met één aanspreekpunt.</h1>
      <div className="rule my-8" />
      <ol className="space-y-6 text-[16px] leading-relaxed">
        {[
          ['U deelt uw wens', 'In uw eigen woorden, via het ledenportaal of uw persoonlijke contact. Weet u alleen hoe het moet voelen? Dat is genoeg om te beginnen.'],
          ['Wij vragen wat nodig is', 'Ontbreekt er iets, dan stellen we één gerichte vraag. We vullen niets in wat u niet heeft gezegd.'],
          ['U ontvangt een voorstel', 'Hooguit drie passende opties, met kosten, voorwaarden, annuleringsregels en de stand van beschikbaarheid.'],
          ['U kiest en geeft akkoord', 'Uw akkoord geldt voor die ene optie en die versie van het voorstel. Nieuwe kosten vragen altijd een nieuw akkoord.'],
          ['Wij regelen en bevestigen', 'Pas als de leverancier bevestigt, staat het bij u als bevestigd, met de praktische gegevens erbij.'],
          ['Daarna', 'We vragen kort hoe het was en onthouden, met uw instemming, wat we daarvan leren.'],
        ].map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[40px_1fr] gap-4">
            <span className="font-serif text-[30px] leading-none text-bronze" aria-hidden>{i + 1}</span>
            <div><p className="font-medium">{t}</p><p className="text-muted">{d}</p></div>
          </li>
        ))}
      </ol>

      <h2 className="mt-20 text-[36px]">Veelgestelde vragen</h2>
      <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
        {faq.map(([q, a]) => (
          <details key={q} className="group px-6 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 text-[17px] font-medium">
              {q}<span aria-hidden className="text-bronze transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
      <Link href="/apply" className="btn-primary mt-12">Kennismaken</Link>
    </div>
  )
}
