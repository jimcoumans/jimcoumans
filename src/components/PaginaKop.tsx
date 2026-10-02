/* -------------------------------------------------------------------------
   De kop van een overzichtspagina, overal hetzelfde: titel en uitleg links,
   acties rechts, en de kerncijfers als tegels eronder. Zo weet je op elke
   pagina waar je kijkt, wat er speelt en wat je kunt doen.
   ------------------------------------------------------------------------- */

export type Cijfer = {
  label: string
  waarde: React.ReactNode
  hint?: string
  /** let-op kleurt oranje, goed groen. */
  toon?: 'normaal' | 'let-op' | 'goed' | 'stil'
}

const TOON: Record<NonNullable<Cijfer['toon']>, string> = {
  normaal: 'text-jr-text',
  'let-op': 'text-[#94590A]',
  goed: 'text-[#1D7D3F]',
  stil: 'text-gray-400',
}

export function PaginaKop({
  titel,
  uitleg,
  acties,
  cijfers,
}: {
  titel: string
  uitleg?: React.ReactNode
  acties?: React.ReactNode
  cijfers?: Cijfer[]
}) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[28px] sm:text-[32px]">{titel}</h1>
          {uitleg && <p className="mt-1 max-w-2xl text-sm text-gray-600">{uitleg}</p>}
        </div>
        {acties && <div className="flex flex-wrap items-center gap-2">{acties}</div>}
      </div>
      {cijfers && cijfers.length > 0 && (
        <dl
          className="mt-6 grid gap-3"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${cijfers.length > 4 ? 150 : 190}px, 1fr))` }}
        >
          {cijfers.map((c) => (
            <div key={c.label} className="rounded-xl bg-white px-5 py-4 shadow-sm">
              <dt className="text-xs text-gray-600">{c.label}</dt>
              <dd className={`font-display tabular mt-1 text-[26px] leading-none font-semibold tracking-tight ${TOON[c.toon ?? 'normaal']}`}>
                {c.waarde}
              </dd>
              {c.hint && <p className="mt-1.5 text-xs text-gray-500">{c.hint}</p>}
            </div>
          ))}
        </dl>
      )}
    </header>
  )
}

/** Een lege lijst die zegt wat je kunt doen, met de knop erbij. */
export function LeegVlak({ titel, tekst, actie }: { titel: string; tekst: string; actie?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white/60 px-6 py-12 text-center">
      <div className="bg-jr-lightblue text-jr-link mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[17px] font-medium">{titel}</p>
      <p className="mt-1 max-w-md text-sm text-gray-600">{tekst}</p>
      {actie && <div className="mt-5">{actie}</div>}
    </div>
  )
}
