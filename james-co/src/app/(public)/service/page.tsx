import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'De service' }

const ROWS: [string, string, string][] = [
  ['Dining', 'Diner, lunch, private dining', 'Wij controleren het aanbod en reserveren na uw akkoord.'],
  ['Stays', 'Hotel, weekend, bijzondere overnachting', 'Voorstel en bevestiging via de leverancier.'],
  ['Travel', 'Reiswens, meerdaagse route', 'Intake en overdracht aan een geschikte reispartner, met een aparte offerte.'],
  ['Transport', 'Chauffeur, luchthavenvervoer', 'Een externe vervoerder bevestigt rit en prijs.'],
  ['Experiences', 'Evenement, voorstelling, bijzondere activiteit', 'Alleen via legitieme leveranciers en controleerbare tickets.'],
  ['Gifts', 'Cadeau of persoonlijke attentie', 'Specificatie, budget en eventuele bezorggegevens per verzoek.'],
  ['Occasions', 'Verjaardag, jubileum, zakelijke ontvangst', 'Scope en projectvergoeding spreken we vooraf af.'],
  ['Overig', 'Een wens buiten de standaardcategorieën', 'Eerst beoordelen; geen automatische toezegging.'],
]

export default function ServicePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-4">De service</p>
      <h1 className="max-w-3xl text-[44px] leading-tight sm:text-[56px]">Uw persoonlijke aanspreekpunt voor bijzondere plannen en alles wat erbij komt kijken.</h1>
      <div className="rule my-8" />
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {ROWS.map(([cat, ex, how]) => (
          <div key={cat} className="grid gap-1 border-b border-line/70 px-6 py-5 last:border-0 md:grid-cols-[160px_1fr_1.2fr] md:gap-6">
            <p className="font-serif text-[22px]">{cat}</p>
            <p className="text-[15px] text-ink/85">{ex}</p>
            <p className="text-[15px] text-muted">{how}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-[30px]">Wat binnen het lidmaatschap valt</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-ink/85">
            Standaard coördinatie van gewone verzoeken valt binnen het lidmaatschap: één gelegenheid, een beperkte selectie en normale afstemming. Meerdere bestemmingen, een uitgebreid evenement of herhaald herontwerp krijgen vooraf een aparte offerte. Geen verborgen toeslag achteraf.
          </p>
        </div>
        <div>
          <h2 className="text-[30px]">Wat u van ons mag verwachten</h2>
          <ul className="mt-3 space-y-2 text-[16px] leading-relaxed text-ink/85">
            <li>Een aanvraag is nog geen boeking. U krijgt een bevestiging zodra de leverancier heeft bevestigd.</li>
            <li>Kosten van leveranciers betaalt u apart, volgens het voorstel dat u vooraf accepteert.</li>
            <li>We kunnen een aanvraag afwijzen als uitvoering niet passend of haalbaar is.</li>
            <li>Geen onbeperkte 24/7-service. Bereikbaarheid bespreken we tijdens de kennismaking.</li>
          </ul>
        </div>
      </div>
      <Link href="/apply" className="btn-primary mt-12">Kennismaken</Link>
    </div>
  )
}
