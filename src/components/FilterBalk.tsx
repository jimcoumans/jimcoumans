'use client'

/* -------------------------------------------------------------------------
   Een filterbalk zonder "Filteren"-knop: kies je iets in een keuzelijst,
   dan past de lijst zich meteen aan. Zoeken gaat met Enter.

   Onder water nog steeds een gewoon formulier met GET: de filters staan in
   de URL, dus je kunt een selectie bewaren of naar een collega sturen, en
   zonder JavaScript werkt Enter ook.
   ------------------------------------------------------------------------- */

export function FilterBalk({
  children,
  wisHref,
  className = 'mb-6 flex flex-wrap items-center gap-2',
}: {
  children: React.ReactNode
  /** Waar "Wissen" naartoe gaat; leeg als er niets gefilterd is. */
  wisHref?: string | null
  className?: string
}) {
  return (
    <form
      method="get"
      className={className}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === 'SELECT') e.currentTarget.requestSubmit()
      }}
    >
      {children}
      <button type="submit" className="sr-only">
        Zoeken
      </button>
      {wisHref && (
        <a href={wisHref} className="text-jr-link rounded-full px-3 py-2 text-sm hover:bg-gray-100">
          Wissen
        </a>
      )}
    </form>
  )
}

/** Een zoekveld met vergrootglas, voor in de filterbalk. */
export function Zoekveld({ naam = 'zoek', waarde, placeholder }: { naam?: string; waarde: string; placeholder: string }) {
  return (
    <div className="relative w-full max-w-sm">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        name={naam}
        defaultValue={waarde}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-11 w-full rounded-full border border-gray-300 bg-white py-2.5 pr-4 pl-10 text-[15px] outline-none hover:border-gray-400"
      />
    </div>
  )
}
