'use client'

import { useMemo, useState } from 'react'

export type VinkOptie = { waarde: string; naam: string; detail: string; weg?: boolean }

/**
 * Meerdere aanvinken uit een lange lijst, met zoeken: welke campagnes van
 * een advertentieaccount bij deze klant horen. Niets aangevinkt betekent:
 * alles telt mee. Aangevinkte regels staan bovenaan, zodat je ziet wat er
 * nu geldt zonder te scrollen.
 */
export function VinkLijst({ opties, gekozen = [], naam = 'keuze' }: { opties: VinkOptie[]; gekozen?: string[]; naam?: string }) {
  const [zoek, setZoek] = useState('')
  const [aan, setAan] = useState<Set<string>>(() => new Set(gekozen))
  // De volgorde volgt wat bij het openen gold, niet elke klik: anders springt de regel onder je muis weg.
  const zichtbaar = useMemo(() => {
    const was = new Set(gekozen)
    const q = zoek.trim().toLowerCase()
    const lijst = q ? opties.filter((o) => `${o.naam} ${o.detail}`.toLowerCase().includes(q)) : opties
    return [...lijst].sort((a, b) => Number(was.has(b.waarde)) - Number(was.has(a.waarde)) || a.naam.localeCompare(b.naam, 'nl'))
  }, [zoek, opties, gekozen])

  const wissel = (w: string) =>
    setAan((s) => {
      const n = new Set(s)
      if (n.has(w)) n.delete(w)
      else n.add(w)
      return n
    })

  return (
    <div className="col-span-full">
      <div className="mb-2 flex items-center gap-3">
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder={`Zoek in ${opties.length} ${opties.length === 1 ? 'campagne' : 'campagnes'}`}
          aria-label="Zoeken"
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-jr-blue"
        />
        <span className="shrink-0 text-xs text-gray-600 tabular-nums">{aan.size === 0 ? 'Alles telt mee' : `${aan.size} aangevinkt`}</span>
        {aan.size > 0 && (
          <button type="button" onClick={() => setAan(new Set())} className="shrink-0 text-xs text-jr-link hover:underline">
            Leegmaken
          </button>
        )}
      </div>
      <div role="group" className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
        {zichtbaar.length === 0 && <p className="px-4 py-3 text-sm text-gray-500">Niets gevonden.</p>}
        {zichtbaar.map((o, i) => (
          <label
            key={o.waarde}
            className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''} ${aan.has(o.waarde) ? 'bg-jr-lightblue/60' : 'hover:bg-gray-50'}`}
          >
            <input type="checkbox" name={naam} value={o.waarde} checked={aan.has(o.waarde)} onChange={() => wissel(o.waarde)} className="accent-jr-blue mt-1 h-[18px] w-[18px] shrink-0" />
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] ${o.weg ? 'text-gray-500 line-through' : ''}`}>{o.naam}</span>
              <span className="block truncate text-[12px] text-gray-500">{o.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
