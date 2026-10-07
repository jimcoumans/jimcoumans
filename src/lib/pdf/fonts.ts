import path from 'node:path'
import { Font } from '@react-pdf/renderer'

/* De lettertypen voor alle pdf's die het portaal maakt: vaste snitten van
   Inter, gemaakt uit de variabele webfonts (OFL-licentie). Elke pdf-route
   moet ze meenemen via outputFileTracingIncludes in next.config.ts. */

const FONTS = path.join(/*turbopackIgnore: true*/ process.cwd(), 'src/fonts/pdf')
let geregistreerd = false
export function registreerFonts() {
  if (geregistreerd) return
  Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(FONTS, 'Inter-400.ttf'), fontWeight: 400 },
      { src: path.join(FONTS, 'Inter-500.ttf'), fontWeight: 500 },
      { src: path.join(FONTS, 'Inter-700.ttf'), fontWeight: 700 },
    ],
  })
  Font.register({ family: 'InterTight', src: path.join(FONTS, 'InterTight-700.ttf'), fontWeight: 700 })
  // Geen afbreekstreepjes midden in woorden; alleen een heel lang woord (een webadres) mag breken.
  // Nooit afbreken binnen een woord: de bibliotheek zet er dan een streepje bij, ook in een webadres.
  Font.registerHyphenationCallback((woord) => [woord])
  geregistreerd = true
}
