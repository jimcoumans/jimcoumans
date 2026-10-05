'use client'

import { useMemo, useState } from 'react'

export type KeuzeOptie = { waarde: string; naam: string; detail: string; voorgesteld: boolean }

/**
 * Kiezen uit wat onze Google-accounts kunnen zien: zoeken op naam, de
 * voorstellen bovenaan. Eén klik en klaar, geen ID's overtypen.
 */
export function KeuzeLijst({ opties, gekozen, naam = 'keuze' }: { opties: KeuzeOptie[]; gekozen?: string; naam?: string }) {
  const [zoek, setZoek] = useState('')
  const [waarde, setWaarde] = useState(gekozen ?? opties.find((o) => o.voorgesteld)?.waarde ?? '')
  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    const lijst = q ? opties.filter((o) => `${o.naam} ${o.detail}`.toLowerCase().includes(q)) : opties
    return [...lijst].sort((a, b) => Number(b.voorgesteld) - Number(a.voorgesteld) || a.naam.localeCompare(b.naam, 'nl'))
  }, [zoek, opties])

  return (
    <div className="col-span-full">
      <input
        type="search"
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder={`Zoek in ${opties.length} ${opties.length === 1 ? 'optie' : 'opties'}`}
        aria-label="Zoeken"
        className="mb-2 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-jr-blue"
      />
      <div role="radiogroup" className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
        {zichtbaar.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">Niets gevonden. Klopt de naam, en heeft de klant ons al toegang gegeven?</p>}
        {zichtbaar.map((o, i) => (
          <label
            key={o.waarde}
            className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''} ${waarde === o.waarde ? 'bg-jr-lightblue/60' : 'hover:bg-gray-50'}`}
          >
            <input type="radio" name={naam} value={o.waarde} checked={waarde === o.waarde} onChange={() => setWaarde(o.waarde)} className="accent-jr-blue mt-1" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px]">
                {o.naam}
                {o.voorgesteld && <span className="ml-2 rounded-full bg-[#E8F7EC] px-2 py-0.5 text-[11px] text-[#1D7D3F]">Voorgesteld</span>}
              </span>
              <span className="block truncate text-[12px] text-gray-500">{o.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
