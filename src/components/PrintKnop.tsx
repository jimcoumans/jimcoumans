'use client'

/** Afdrukken of als pdf bewaren: de browser doet het werk. */
export function PrintKnop({ label = 'Afdrukken of pdf' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-jr-btn hover:bg-jr-btnhover rounded-lg px-4 py-2 text-sm text-white"
    >
      {label}
    </button>
  )
}
