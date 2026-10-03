import type { BrandFile } from '@/db/schema'
import { googleFontsUrls, hoortBijFamilie, raadFontbestand } from '@/lib/stylesheet'

const FORMAAT: Record<string, string> = { 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/otf': 'opentype', 'font/ttf': 'truetype' }

/**
 * Zorgt dat de lettertypen van het merk echt geladen zijn, zodat een kop in
 * "Playfair Display Bold" er ook zo uitziet.
 *
 * Staat het fontbestand in de merkkluis, dan gebruiken we dat (het juiste
 * font, ook als het betaald is). Anders proberen we Google Fonts; bestaat
 * het daar niet, dan valt het terug op het systeemfont.
 */
export function MerkFonts({
  stijlen,
  bestanden,
}: {
  stijlen: { fontFamily: string; weight: number; italic: boolean }[]
  bestanden: BrandFile[]
}) {
  // Alleen letters, cijfers, spaties en streepjes: zo kan een fontnaam nooit
  // uit de <style> breken.
  const families = [...new Set(stijlen.map((s) => s.fontFamily.trim()).filter((f) => f && /^[\p{L}\p{N} \-]+$/u.test(f)))]
  const regels: string[] = []
  const google: string[] = []

  for (const familie of families) {
    const eigen = bestanden.filter((b) => hoortBijFamilie(b.filename ?? b.title, familie) || hoortBijFamilie(b.title, familie))
    if (eigen.length > 0) {
      for (const b of eigen) {
        const { gewicht, cursief } = raadFontbestand(b.filename ?? b.title)
        regels.push(
          `@font-face{font-family:${JSON.stringify(familie)};src:url(/api/merk/bestand/${b.id}) format("${FORMAAT[b.contentType] ?? 'woff2'}");font-weight:${gewicht === 'variabel' ? '100 900' : gewicht};font-style:${cursief ? 'italic' : 'normal'};font-display:swap}`,
        )
      }
    } else {
      google.push(...googleFontsUrls(stijlen.filter((s) => s.fontFamily.trim() === familie)))
    }
  }

  return (
    <>
      {regels.length > 0 && <style dangerouslySetInnerHTML={{ __html: regels.join('\n') }} />}
      {google.map((href) => (
        <link key={href} rel="stylesheet" href={href} data-merkfont={href} />
      ))}
    </>
  )
}
