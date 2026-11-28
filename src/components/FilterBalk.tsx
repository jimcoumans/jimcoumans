'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/* -------------------------------------------------------------------------
   Een filterbalk zonder "Filteren"-knop: kies je iets in een keuzelijst,
   dan past de lijst zich meteen aan. Typ je in het zoekveld, dan zie je
   de resultaten al tijdens het typen.

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

/**
 * Een zoekveld met vergrootglas, voor in de filterbalk.
 *
 * Zoekt live: een kwart seconde nadat je stopt met typen, gaat de zoekterm
 * met de rest van het formulier in de URL en ververst de lijst, zonder dat het
 * veld zijn focus kwijtraakt. Enter werkt nog steeds, ook zonder JavaScript.
 */
export function Zoekveld({ naam = 'zoek', waarde, placeholder, breed = false }: { naam?: string; waarde: string; placeholder: string; breed?: boolean }) {
  const router = useRouter()
  const pad = usePathname()
  const [bezig, start] = useTransition()
  const [tekst, setTekst] = useState(waarde)
  const veld = useRef<HTMLInputElement>(null)
  const laatste = useRef(waarde)

  useEffect(() => {
    if (tekst.trim() === laatste.current.trim()) return
    const t = setTimeout(() => {
      const form = veld.current?.form
      const params = new URLSearchParams()
      if (form) {
        for (const [k, v] of new FormData(form).entries()) {
          if (typeof v === 'string' && v.trim() !== '' && k !== 'pagina') params.set(k, v)
        }
      } else if (tekst.trim()) params.set(naam, tekst.trim())
      laatste.current = tekst
      start(() => router.replace(params.size ? `${pad}?${params}` : pad, { scroll: false }))
    }, 250)
    return () => clearTimeout(t)
  }, [tekst, naam, pad, router])

  return (
    <div className={`relative w-full ${breed ? '' : 'max-w-sm'}`}>
      <svg
        viewBox="0 0 24 24"
        className={`pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 ${bezig ? 'text-jr-blue animate-pulse' : 'text-gray-400'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        ref={veld}
        type="search"
        name={naam}
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="min-h-11 w-full rounded-full border border-gray-300 bg-white py-2.5 pr-4 pl-10 text-[15px] outline-none hover:border-gray-400"
      />
    </div>
  )
}
