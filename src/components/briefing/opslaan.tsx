'use client'

import { useSyncExternalStore } from 'react'

/* -------------------------------------------------------------------------
   Eén plek die weet of de briefing wijzigingen heeft die nog niet zijn
   opgeslagen. De editor meldt zich hier aan; knoppen elders op de pagina
   (bekijken, pdf, versturen, feedback verwerken) slaan eerst op, zodat ze
   nooit met een oude versie werken.
   ------------------------------------------------------------------------- */

type Staat = { vuil: boolean; bezig: boolean }

let staat: Staat = { vuil: false, bezig: false }
let opslaan: (() => Promise<boolean>) | null = null
const luisteraars = new Set<() => void>()

export function meldStaat(nieuw: Partial<Staat>) {
  const volgend = { ...staat, ...nieuw }
  if (volgend.vuil === staat.vuil && volgend.bezig === staat.bezig) return
  staat = volgend
  for (const l of luisteraars) l()
}

export function meldOpslaan(fn: (() => Promise<boolean>) | null) {
  opslaan = fn
}

/** Sla op als dat nodig is. Geeft false als opslaan mislukte; de editor toont dan waarom. */
export async function eerstOpslaan(): Promise<boolean> {
  if (!staat.vuil || !opslaan) return true
  return opslaan()
}

const leeg: Staat = { vuil: false, bezig: false }

export function useOpslaanStaat(): Staat {
  return useSyncExternalStore(
    (l) => {
      luisteraars.add(l)
      return () => luisteraars.delete(l)
    },
    () => staat,
    () => leeg,
  )
}

/**
 * Een link die eerst opslaat. Voor "Bekijk de briefing" en de pdf: die moeten
 * laten zien wat er nu staat, niet wat er bij de vorige keer opslaan stond.
 */
export function OpslaanLink({
  href,
  className,
  children,
  download = false,
}: {
  href: string
  className?: string
  children: React.ReactNode
  download?: boolean
}) {
  const { bezig } = useOpslaanStaat()
  return (
    <a
      href={href}
      download={download || undefined}
      aria-disabled={bezig || undefined}
      className={className}
      onClick={async (e) => {
        if (!staat.vuil) return
        e.preventDefault()
        if (await eerstOpslaan()) window.location.href = href
      }}
    >
      {children}
    </a>
  )
}

/**
 * Om formulieren heen die met de opgeslagen briefing werken (versturen,
 * feedback verwerken): bij wijzigingen eerst opslaan, dan pas versturen.
 */
export function EerstOpslaan({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      onSubmitCapture={(e) => {
        if (!staat.vuil) return
        e.preventDefault()
        e.stopPropagation()
        const form = e.target as HTMLFormElement
        const knop = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null
        void eerstOpslaan().then((ok) => {
          if (ok) form.requestSubmit(knop instanceof HTMLButtonElement || knop instanceof HTMLInputElement ? knop : undefined)
        })
      }}
    >
      {children}
    </div>
  )
}
