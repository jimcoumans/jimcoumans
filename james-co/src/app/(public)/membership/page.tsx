import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Lidmaatschap' }

export default function Membership() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-4">Lidmaatschap</p>
      <h1 className="text-[44px] leading-tight sm:text-[56px]">Een persoonlijke service begint met kennismaken.</h1>
      <div className="rule my-8" />
      <p className="max-w-prose text-[17px] leading-relaxed text-ink/85">
        We bespreken wat u graag uit handen geeft en welke dienstverlening daarbij past. U ontvangt vooraf een helder voorstel voor het lidmaatschap, met prijs, inhoud en voorwaarden, voordat u iets accepteert of betaalt.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="card">
          <h2 className="text-[26px]">Inbegrepen</h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
            <li>Een persoonlijk aanspreekpunt</li>
            <li>Een voorkeurenprofiel dat met u meegroeit</li>
            <li>Standaard coördinatie van gewone verzoeken</li>
            <li>Toegang tot uitnodigingen van The James Society</li>
          </ul>
        </div>
        <div className="card">
          <h2 className="text-[26px]">Apart</h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-muted">
            <li>Maaltijden, overnachtingen, vervoer, tickets en cadeaus</li>
            <li>Deelname aan ervaringen</li>
            <li>Complexe opdrachten: vooraf een aparte coördinatieofferte</li>
          </ul>
        </div>
      </div>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <p className="font-serif text-[26px]">Lidmaatschap op aanvraag</p>
        <p className="mt-1 text-[15px] text-muted">Na de kennismaking ontvangt u het voorstel met de werkelijke prijs en voorwaarden. Er is geen automatische verlenging, korting of proefperiode zonder dat die vooraf met u is afgesproken.</p>
      </div>
      <Link href="/apply" className="btn-primary mt-10">Kennismaking aanvragen</Link>
    </div>
  )
}
