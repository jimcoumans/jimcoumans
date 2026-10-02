'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* -------------------------------------------------------------------------
   Een paneel dat van rechts inschuift, voor toevoegen en wijzigen.

   Waarom dit en niet een formulier in een zijkolom: zo'n formulier gebruik
   je zelden, maar het kost altijd ruimte. De pagina blijft smal en jij vult
   een naam in in een kolom van 320 pixels. Een paneel staat er alleen als
   je het nodig hebt, is breed genoeg voor twee kolommen, en sluit vanzelf
   als het opslaan gelukt is.
   ------------------------------------------------------------------------- */

const KNOP = {
  primair: 'bg-jr-btn hover:bg-jr-btnhover text-white rounded-full px-5 py-2.5 text-sm font-medium',
  rustig: 'border border-gray-300 bg-white text-jr-text hover:bg-gray-50 rounded-full px-5 py-2.5 text-sm font-medium',
  link: 'text-jr-link hover:underline text-sm font-medium',
  klein: 'text-jr-link rounded-lg px-2 py-1 text-xs font-medium hover:bg-gray-100',
}

export function Paneel({
  knop,
  titel,
  uitleg,
  children,
  stijl = 'primair',
  breed = false,
  sluitNaOpslaan = true,
  startOpen = false,
}: {
  knop: React.ReactNode
  titel: string
  uitleg?: string
  children: React.ReactNode
  stijl?: keyof typeof KNOP
  /** Extra breed, voor formulieren met veel velden naast elkaar. */
  breed?: boolean
  /** Uit als er meerdere formulieren in staan, zodat het niet dichtgaat na het eerste. */
  sluitNaOpslaan?: boolean
  /** Meteen open, bijvoorbeeld als je via een link "Nieuwe campagne" hier kwam. */
  startOpen?: boolean
}) {
  const [open, setOpen] = useState(startOpen)
  const [klaar, setKlaar] = useState(false)
  const inhoud = useRef<HTMLDivElement>(null)
  const knopRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setKlaar(true), [])

  useEffect(() => {
    if (!open) return
    const toets = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', toets)
    const oud = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Het eerste veld krijgt de focus: je opent het paneel om te typen.
    const eerste = inhoud.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')
    eerste?.focus()
    const element = inhoud.current
    const gelukt = () => sluitNaOpslaan && setOpen(false)
    element?.addEventListener('actionform:gelukt', gelukt)
    return () => {
      document.removeEventListener('keydown', toets)
      document.body.style.overflow = oud
      element?.removeEventListener('actionform:gelukt', gelukt)
      knopRef.current?.focus()
    }
  }, [open, sluitNaOpslaan])

  return (
    <>
      <button ref={knopRef} type="button" onClick={() => setOpen(true)} className={KNOP[stijl]} aria-haspopup="dialog">
        {knop}
      </button>
      {klaar &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={titel}>
            <button type="button" aria-label="Sluiten" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
            <div
              className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-[0_8px_24px_rgba(0,0,0,.08),0_32px_72px_rgba(0,0,0,.14)] ${
                breed ? 'max-w-3xl' : 'max-w-2xl'
              } animate-[paneel_.22s_cubic-bezier(.16,1,.3,1)] sm:rounded-l-2xl`}
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 sm:px-8">
                <div>
                  <h2 className="text-[22px]">{titel}</h2>
                  {uitleg && <p className="mt-1 max-w-xl text-sm text-gray-600">{uitleg}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Sluiten"
                  className="-mr-2 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-jr-text"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div ref={inhoud} className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                {children}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

/** Een kopje in een paneelformulier, over de volle breedte. */
export function PaneelKop({ children, uitleg }: { children: React.ReactNode; uitleg?: string }) {
  return (
    <div className="pt-2 sm:col-span-2">
      <h3 className="text-[15px] font-semibold">{children}</h3>
      {uitleg && <p className="mt-0.5 text-xs text-gray-600">{uitleg}</p>}
    </div>
  )
}
