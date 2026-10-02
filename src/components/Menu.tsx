'use client'

import { useEffect, useRef, useState } from 'react'

/* -------------------------------------------------------------------------
   Het "…"-menu achter een rij.

   Acties die je zelden gebruikt (terugdraaien, crediteren, stopzetten) staan
   niet meer als rij links onder elke regel, maar achter één knop. De lijst
   leest weer als een lijst; wie iets wil doen, weet waar het zit.

   De inhoud blijft gemount als het menu dicht is, zodat een paneel dat je
   vanuit het menu opent gewoon open blijft.
   ------------------------------------------------------------------------- */

export function Menu({ children, label = 'Meer acties' }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false)
  const doos = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const buiten = (e: MouseEvent) => {
      if (doos.current && !doos.current.contains(e.target as Node)) setOpen(false)
    }
    const toets = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', buiten)
    document.addEventListener('keydown', toets)
    return () => {
      document.removeEventListener('mousedown', buiten)
      document.removeEventListener('keydown', toets)
    }
  }, [open])

  return (
    <div ref={doos} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="hover:text-jr-text flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>
      <div
        // Een klik op iets dat een paneel opent, sluit het menu; een
        // formulierknop niet, zodat je een eventuele foutmelding ziet.
        onClick={(e) => (e.target as HTMLElement).closest('[aria-haspopup=dialog], a') && setOpen(false)}
        className={`absolute top-9 right-0 z-30 min-w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_4px_12px_rgba(0,0,0,.06),0_16px_40px_rgba(0,0,0,.12)] ${
          open ? '' : 'hidden'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

/** De klassen voor een regel in het menu, voor knoppen en links. */
export const MENU_REGEL = 'block w-full rounded-lg px-3 py-2 text-left text-sm text-jr-text hover:bg-gray-100'
export const MENU_GEVAAR = 'block w-full rounded-lg px-3 py-2 text-left text-sm text-[#C02A22] hover:bg-[#FDECEA]'
