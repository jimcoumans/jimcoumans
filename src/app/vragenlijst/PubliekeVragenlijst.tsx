'use client'

import { useActionState } from 'react'
import { VragenlijstVelden } from '@/components/formulieren/VragenlijstVelden'
import type { Antwoorden, Kleur } from '@/lib/formulieren/vragenlijst'
import { dienIn, type Inzending } from './actions'

/* De bedankpagina's uit 01.2, in de woorden van de klant. */
function onderwerp(reden: string): string {
  if (reden.startsWith('Budget')) return 'je budget'
  if (reden.startsWith('Wat een aanvraag')) return 'wat een aanvraag je mag kosten'
  return 'je markt'
}

function Bedankt({ kleur, redenen, voornaam }: { kleur: Kleur; redenen: string[]; voornaam: string }) {
  const naam = voornaam ? `, ${voornaam}` : ''
  if (kleur === 'groen') {
    return (
      <Blok kop={`Dit ziet er goed uit${naam}.`}>
        <p>De volgende stap is een gesprek van een uur. We nemen binnen een werkdag contact met je op om een moment te kiezen, minstens drie werkdagen vooruit. Zo hebben we tijd om eerst naar je website en je markt te kijken, en gaat het gesprek over jouw situatie en niet over ons.</p>
      </Blok>
    )
  }
  if (kleur === 'oranje') {
    const punten = [...new Set(redenen.map(onderwerp))]
    return (
      <Blok kop={`Dank je${naam}. Eén punt stemmen we eerst even af.`}>
        <p>
          Het gaat over {punten.join(' en ')}. Dat bespreken we liever in een telefoontje van een kwartier dan dat je een uur voor ons vrijmaakt voor iets wat misschien niet past. We bellen je binnen een werkdag.
        </p>
      </Blok>
    )
  }
  if (kleur === 'later') {
    return (
      <Blok kop={`Dank je${naam}. Dan plannen we nu nog niets.`}>
        <p>Je gaf aan dat je later wilt beginnen. Rond die tijd sturen we je één bericht om te vragen of het zover is. Tot die tijd hoor je niets van ons.</p>
      </Blok>
    )
  }
  const reden = redenen[0]?.startsWith('Nog geen website')
    ? 'Je hebt nog geen website. Daar begint het mee: zonder site is er niets om bezoekers naartoe te sturen.'
    : 'Je klanten kopen direct online. Daarvoor zijn wij niet de beste partij: we zijn gespecialiseerd in bedrijven waar klanten iets aanvragen.'
  return (
    <Blok kop="Dank je voor je antwoorden.">
      <p>{reden} We zeggen dat liever nu dan na drie maanden en een factuur.</p>
    </Blok>
  )
}

function Blok({ kop, children }: { kop: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-3 text-[24px] leading-tight">{kop}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
      <p className="mt-6 text-sm text-gray-500">Vragen? Mail support@jamesrobinson.nl of bel 045 792 0009.</p>
    </div>
  )
}

export function PubliekeVragenlijst({ id, token, antwoorden }: { id: string; token: string; antwoorden: Antwoorden }) {
  const [state, actie, bezig] = useActionState<Inzending, FormData>(dienIn, null)
  if (state?.ok) return <Bedankt kleur={state.kleur} redenen={state.redenen} voornaam={state.voornaam} />
  return (
    <form action={actie} className="space-y-8 rounded-2xl bg-white p-5 shadow-sm sm:p-8">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="token" value={token} />
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label>
          Laat dit veld leeg
          <input name="bedrijfswebsite" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <VragenlijstVelden a={antwoorden} voorKlant />
      {state?.ok === false && (
        <p role="alert" className="rounded-lg bg-[#FDECEA] px-4 py-3 text-sm text-[#C02A22]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={bezig} className="bg-jr-btn hover:bg-jr-btnhover min-h-12 w-full rounded-full px-6 text-[15px] font-medium text-white disabled:opacity-50 sm:w-auto">
        {bezig ? 'Versturen…' : 'Verstuur mijn antwoorden'}
      </button>
    </form>
  )
}
