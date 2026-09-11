'use client'

import { useState } from 'react'
import { ActionForm, Field, Select } from './ActionForm'
import { nieuweRegel } from '@/app/beheer/quote-actions'
import { lineKindLabels } from '@/lib/quote-labels'

/* -------------------------------------------------------------------------
   Regel toevoegen aan een offerte.

   Welke velden je ziet hangt af van het soort regel: bij een eigen dienst
   kies je uit de dienstenlijst en worden tarief en kostprijs voorgevuld,
   bij partnerwerk vul je in wat de partner rekent en wat jij de klant
   rekent. Het verschil rekent dit formulier meteen voor je uit, want dat
   is precies de vraag die je stelt voordat je op versturen drukt.
   ------------------------------------------------------------------------- */

export type DienstKeuze = {
  id: string
  name: string
  unitLabel: string
  unitPriceCents: number
  costPriceCents: number | null
}

export type PartnerKeuze = {
  id: string
  name: string
  hourlyRateCents: number | null
  dayRateCents: number | null
}

type Soort = 'service' | 'partner' | 'custom' | 'discount'

/** Ruwe lezing van een bedrag, alleen om de marge te laten meelopen. */
function leesBedrag(waarde: string): number | null {
  const schoon = waarde.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (schoon === '') return null
  const getal = Number(schoon)
  return Number.isFinite(getal) ? getal : null
}

function euro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function QuoteLineForm({
  quoteId,
  diensten,
  partners,
}: {
  quoteId: string
  diensten: DienstKeuze[]
  partners: PartnerKeuze[]
}) {
  // De eerste dienst staat voorgeselecteerd, dus ook diens tarieven.
  const eerste = diensten[0]

  const [soort, setSoort] = useState<Soort>('service')
  const [dienstId, setDienstId] = useState(eerste?.id ?? '')
  const [prijs, setPrijs] = useState(eerste ? euro(eerste.unitPriceCents) : '')
  const [kostprijs, setKostprijs] = useState(
    eerste && eerste.costPriceCents !== null ? euro(eerste.costPriceCents) : '',
  )
  const [aantal, setAantal] = useState('1')

  const dienst = diensten.find((d) => d.id === dienstId)

  // Bij het kiezen van een dienst nemen we de tarieven over, maar je mag ze
  // daarna gewoon aanpassen: het bedrag op de offerte is leidend.
  function kiesDienst(id: string) {
    setDienstId(id)
    const gekozen = diensten.find((d) => d.id === id)
    if (gekozen) {
      setPrijs(euro(gekozen.unitPriceCents))
      setKostprijs(gekozen.costPriceCents === null ? '' : euro(gekozen.costPriceCents))
    }
  }

  const prijsGetal = leesBedrag(prijs)
  const kostGetal = leesBedrag(kostprijs)
  const aantalGetal = leesBedrag(aantal) ?? 1
  const margeZichtbaar =
    soort !== 'discount' && prijsGetal !== null && kostGetal !== null && prijsGetal > 0
  const marge = margeZichtbaar ? (prijsGetal - (kostGetal ?? 0)) * aantalGetal : 0
  const margePercentage =
    margeZichtbaar && prijsGetal > 0
      ? Math.round(((prijsGetal - (kostGetal ?? 0)) / prijsGetal) * 100)
      : null

  return (
    <ActionForm action={nieuweRegel} submitLabel="Regel toevoegen">
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="soort" value={soort} />

      <div>
        <span className="mb-1 block text-xs text-gray-600">Soort regel</span>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(lineKindLabels) as Soort[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSoort(k)}
              aria-pressed={soort === k}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                soort === k
                  ? 'border-jr-blue bg-jr-lightblue text-jr-deepblue'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {lineKindLabels[k]}
            </button>
          ))}
        </div>
      </div>

      {soort === 'service' &&
        (diensten.length === 0 ? (
          <p className="text-xs text-gray-500">
            Er zijn nog geen actieve diensten. Kies zolang Eenmalig.
          </p>
        ) : (
          <div>
            <label htmlFor="regel-dienst" className="mb-1 block text-xs text-gray-600">
              Dienst
            </label>
            <select
              id="regel-dienst"
              name="serviceId"
              value={dienstId}
              onChange={(e) => kiesDienst(e.target.value)}
              className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
            >
              {diensten.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {euro(d.unitPriceCents)} per {d.unitLabel}
                </option>
              ))}
            </select>
            {dienst && dienst.costPriceCents === null && (
              <p className="mt-1 text-xs text-gray-500">
                Deze dienst heeft geen kostprijs. Vul hem hier in, anders lijkt de
                marge hoger dan hij is.
              </p>
            )}
          </div>
        ))}

      {soort === 'partner' &&
        (partners.length === 0 ? (
          <p className="text-xs text-gray-500">
            Er zijn nog geen actieve partners. Voeg er een toe bij Partners.
          </p>
        ) : (
          <Select
            label="Partner"
            name="partnerId"
            options={partners.map((p) => ({
              value: p.id,
              label:
                p.hourlyRateCents === null
                  ? p.name
                  : `${p.name} — ${euro(p.hourlyRateCents)} per uur`,
            }))}
            hint="Wat zij rekenen vul je in als kostprijs."
          />
        ))}

      <Field
        label="Omschrijving"
        name="omschrijving"
        placeholder={soort === 'discount' ? 'Introductiekorting' : 'Wat de klant leest'}
        hint={
          soort === 'service' || soort === 'partner'
            ? 'Leeg laten mag: dan pakken we de naam van de dienst of partner.'
            : undefined
        }
      />

      <div>
        <label htmlFor="regel-aantal" className="mb-1 block text-xs text-gray-600">
          Aantal
        </label>
        <input
          id="regel-aantal"
          name="aantal"
          value={aantal}
          onChange={(e) => setAantal(e.target.value)}
          placeholder="1"
          className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        />
      </div>

      <div>
        <label htmlFor="regel-prijs" className="mb-1 block text-xs text-gray-600">
          {soort === 'discount' ? 'Korting per stuk' : 'Prijs per stuk voor de klant'}
        </label>
        <input
          id="regel-prijs"
          name="prijs"
          value={prijs}
          onChange={(e) => setPrijs(e.target.value)}
          placeholder="2.400,00"
          className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        />
        {soort === 'discount' && (
          <p className="mt-1 text-xs text-gray-500">
            Vul een positief bedrag in; het gaat er als korting vanaf.
          </p>
        )}
      </div>

      {soort !== 'discount' && (
        <div>
          <label htmlFor="regel-kostprijs" className="mb-1 block text-xs text-gray-600">
            {soort === 'partner' ? 'Wat de partner ons rekent' : 'Kostprijs per stuk'}
            <span className="text-gray-400"> (optioneel)</span>
          </label>
          <input
            id="regel-kostprijs"
            name="kostprijs"
            value={kostprijs}
            onChange={(e) => setKostprijs(e.target.value)}
            placeholder="1.800,00"
            className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Alleen voor ons. De klant ziet dit nooit.
          </p>
        </div>
      )}

      <Field label="Toelichting" name="toelichting" placeholder="Extra uitleg onder de regel" />

      {margeZichtbaar && (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${
            marge > 0 ? 'bg-jr-lightblue text-jr-deepblue' : 'bg-jr-red/5 text-jr-red'
          }`}
        >
          Marge op deze regel: {euro(Math.round(marge * 100))}
          {margePercentage !== null && ` (${margePercentage}%)`}
          {marge <= 0 && ' — je legt hier geld op toe.'}
        </p>
      )}
    </ActionForm>
  )
}
