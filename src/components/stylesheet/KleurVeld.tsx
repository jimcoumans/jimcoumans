'use client'

import { useId } from 'react'
import { hexUit } from '@/lib/stylesheet'

export type Merkkleur = { name: string; hex: string }

/**
 * Een kleur kiezen: een staal dat meteen de kleur laat zien, een veld voor
 * de code, en de kleuren van het merk als snelkeuze. Klik op het staal voor
 * de kleurkiezer van het systeem.
 */
export function KleurVeld({
  label,
  name,
  waarde,
  onWaarde,
  merkkleuren,
  optioneel = false,
}: {
  label: string
  name: string
  waarde: string
  onWaarde: (v: string) => void
  merkkleuren: Merkkleur[]
  optioneel?: boolean
}) {
  const id = useId()
  const hex = hexUit(waarde)
  const fout = waarde.trim() !== '' && !hex

  return (
    <div>
      <label htmlFor={id} className="text-jr-text mb-1.5 block text-[13px] font-medium">
        {label} {optioneel && <span className="font-normal text-gray-400">(optioneel)</span>}
      </label>
      <div className="flex items-center gap-2">
        <label
          className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-300"
          style={{ background: hex ?? 'repeating-conic-gradient(#E5E5EA 0 25%, #fff 0 50%) 0 0 / 10px 10px' }}
          title="Kies een kleur"
        >
          <input
            type="color"
            value={hex ?? '#FFFFFF'}
            onChange={(e) => onWaarde(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label}: kleurkiezer`}
          />
        </label>
        <input
          id={id}
          name={name}
          value={waarde}
          onChange={(e) => onWaarde(e.target.value)}
          onBlur={() => hex && onWaarde(hex)}
          placeholder={optioneel ? 'Geen' : '#8B1E2D'}
          spellCheck={false}
          className={`tabular min-h-11 w-full rounded-lg border px-3.5 py-2.5 font-mono text-[15px] uppercase outline-none ${
            fout ? 'border-[#C02A22]' : 'border-gray-300 hover:border-gray-400'
          }`}
        />
      </div>
      {merkkleuren.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {merkkleuren.map((k) => (
            <button
              key={k.hex + k.name}
              type="button"
              onClick={() => onWaarde(k.hex)}
              title={`${k.name} ${k.hex}`}
              aria-label={`${k.name} ${k.hex}`}
              className={`h-6 w-6 rounded-full border ${hex === k.hex ? 'ring-jr-blue ring-2 ring-offset-1' : 'border-gray-300'}`}
              style={{ background: k.hex }}
            />
          ))}
          {optioneel && waarde && (
            <button type="button" onClick={() => onWaarde('')} className="ml-1 text-xs text-gray-500 hover:text-jr-text">
              Leegmaken
            </button>
          )}
        </div>
      )}
      {fout && <p className="mt-1 text-xs text-[#C02A22]">Gebruik de vorm #8B1E2D.</p>}
    </div>
  )
}
