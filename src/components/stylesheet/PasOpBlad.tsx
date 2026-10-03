'use client'

import { useEffect, useRef } from 'react'

/**
 * Houdt de one-pager op één A4. Zodra de lettertypen er zijn, meten we of
 * het blad overloopt; zo ja, dan verkleinen we de koppen (alleen het deel
 * boven 20 px, via --k) in stapjes tot het past. Body, label en micro
 * blijven op ware grootte en de verhouding tussen de koppen blijft gelijk.
 */
export function PasOpBlad({ className, children }: { className: string; children: React.ReactNode }) {
  const blad = useRef<HTMLElement>(null)

  useEffect(() => {
    let weg = false
    document.fonts.ready.then(() => {
      const el = blad.current
      if (!el || weg) return
      let k = 1
      el.style.setProperty('--k', '1')
      while (el.scrollHeight > el.clientHeight + 1 && k > 0) {
        k = Math.max(0, Math.round((k - 0.05) * 100) / 100)
        el.style.setProperty('--k', String(k))
      }
      if (k < 1) el.dataset.verkleind = ''
      else delete el.dataset.verkleind
    })
    return () => {
      weg = true
    }
  }, [])

  return (
    <article ref={blad} className={`group ${className}`}>
      {children}
    </article>
  )
}
