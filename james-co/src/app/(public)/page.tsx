import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STEPS = [
  ['Deel uw wens.', 'Via uw persoonlijke contact of het ledenportaal.'],
  ['Kies met vertrouwen.', 'U ontvangt een voorstel met duidelijke kosten en voorwaarden.'],
  ['Laat het regelen.', 'Na uw akkoord coördineren wij de uitvoering en houden we u op de hoogte.'],
]

const CARDS = [
  ['Aan tafel.', 'Dining', 'Een diner dat klopt bij de gelegenheid: van een rustige lunch tot private dining.'],
  ['Even weg.', 'Stays & Travel', 'Een overnachting of weekend dat bij u past. Grotere reizen stemmen we af met een geschikte reispartner.'],
  ['Iets bijzonders.', 'Experiences & Occasions', 'Een voorstelling, een bijzondere activiteit of een gelegenheid om te vieren.'],
]

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <p className="eyebrow mb-6">Private concierge</p>
        <h1 className="max-w-3xl text-[48px] leading-[1.02] sm:text-[76px]">Meer tijd voor het goede leven.</h1>
        <div className="rule my-8" />
        <p className="max-w-xl text-[18px] leading-relaxed text-ink/85">
          Een bijzonder diner. Een weekend dat klopt. Een attentie die raakt. James &amp; Co. brengt uw wensen samen en regelt wat ervoor nodig is. Persoonlijk, zorgvuldig en met één aanspreekpunt.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/apply" className="btn-primary">Maak kennis met James &amp; Co.</Link>
          <Link href="/how-it-works" className="btn-secondary">Zo werkt het</Link>
        </div>
      </section>

      <section className="border-y border-line/70 bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-[36px] leading-tight sm:text-[44px]">U vertelt wat u wilt. Wij brengen het samen.</h2>
            <p className="mt-5 max-w-prose text-[17px] leading-relaxed text-ink/85">
              Soms weet u precies wat u zoekt. Soms alleen hoe het moet voelen. Deel uw plannen en voorkeuren. Wij zoeken passende mogelijkheden, stemmen de details met u af en begeleiden de uitvoering.
            </p>
          </div>
          <ol className="space-y-6">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-5">
                <span className="font-serif text-[34px] leading-none text-bronze" aria-hidden>{i + 1}</span>
                <div>
                  <p className="text-[17px] font-medium">{t}</p>
                  <p className="text-[15px] text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map(([title, cat, text]) => (
            <article key={cat} className="flex min-h-[260px] flex-col justify-between rounded-2xl border border-line bg-surface p-7">
              <p className="eyebrow">{cat}</p>
              <div>
                <h3 className="text-[34px] leading-tight">{title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{text}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-[15px] text-muted">
          Ook vervoer, zoals een chauffeur of luchthavenvervoer, en een cadeau of persoonlijke attentie horen erbij. We beoordelen iedere aanvraag op haalbaarheid.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-forest p-8 text-white sm:p-10">
            <h2 className="text-[32px] leading-tight">Een persoonlijke service begint met kennismaken.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/85">
              We bespreken wat u graag uit handen geeft en welke dienstverlening daarbij past. U ontvangt vooraf een helder voorstel voor het lidmaatschap. Kosten voor reserveringen, aankopen en bijzondere opdrachten stemmen we apart met u af.
            </p>
            <Link href="/membership" className="btn mt-7 bg-white text-forest hover:bg-canvas">Over het lidmaatschap</Link>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-8 sm:p-10">
            <p className="eyebrow mb-3">The James Society</p>
            <h2 className="text-[32px] leading-tight">Bijzondere momenten, gedeeld.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-muted">
              The James Society brengt leden samen rond zorgvuldig gekozen ervaringen. Van een intiem diner tot een bijzonder verblijf. Uitnodigingen zijn persoonlijk; deelname wordt per ervaring aangeboden.
            </p>
            <Link href="/society" className="btn-secondary mt-7">Meer over Society</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24 text-center sm:px-6">
        <h2 className="mx-auto max-w-2xl text-[36px] leading-tight sm:text-[46px]">Wat zou u vaker doen als iemand het voor u regelde?</h2>
        <Link href="/apply" className="btn-primary mt-8">Kennismaken</Link>
      </section>
    </>
  )
}
