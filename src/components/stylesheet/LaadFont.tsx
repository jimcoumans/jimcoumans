'use client'

import { useEffect } from 'react'
import { googleFontsUrls } from '@/lib/stylesheet'

/**
 * Haalt een lettertype op bij Google Fonts zodra je het intypt, zodat het
 * voorbeeld meteen klopt. Bestaat het daar niet (een eigen of betaald font),
 * dan gebeurt er niets en toont het voorbeeld het reservefont tot het
 * fontbestand in de merkkluis staat.
 */
export function useLaadFont(familie: string, gewicht: number, cursief: boolean) {
  useEffect(() => {
    const naam = familie.trim()
    if (naam.length < 2) return
    const t = setTimeout(() => {
      for (const href of googleFontsUrls([{ fontFamily: naam, weight: gewicht, italic: cursief }])) {
        if (document.querySelector(`link[data-merkfont="${CSS.escape(href)}"]`)) continue
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        link.dataset.merkfont = href
        document.head.appendChild(link)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [familie, gewicht, cursief])
}
