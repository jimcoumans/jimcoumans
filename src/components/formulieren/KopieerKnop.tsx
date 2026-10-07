'use client'

import { useState } from 'react'

/** Een knop die tekst naar het klembord zet, met een kort "gekopieerd". */
export function KopieerKnop({ tekst, label = 'Kopieer' }: { tekst: string; label?: string }) {
  const [klaar, setKlaar] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(tekst)
          setKlaar(true)
          setTimeout(() => setKlaar(false), 2000)
        } catch {
          setKlaar(false)
        }
      }}
      className="min-h-10 shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {klaar ? 'Gekopieerd' : label}
    </button>
  )
}
