'use client'

import { useState } from 'react'

/**
 * Bewaart de pagina als pdf via de browser. Eerst wachten tot de
 * lettertypen er zijn, anders staat er in de pdf het reservefont.
 * In het venster dat opent: kies "Opslaan als pdf".
 */
export function PdfKnop() {
  const [bezig, setBezig] = useState(false)
  return (
    <button
      type="button"
      disabled={bezig}
      onClick={async () => {
        setBezig(true)
        await document.fonts.ready
        setBezig(false)
        window.print()
      }}
      className="bg-jr-btn hover:bg-jr-btnhover inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {bezig ? 'Lettertypen laden…' : 'Download als pdf'}
    </button>
  )
}
