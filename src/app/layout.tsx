import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

/* Het designsysteem: Inter voor tekst en bediening, Figtree voor titels,
   citaten en subkoppen.
   De bestanden staan in de repo (variabele fonts, latin, OFL-licentie), zodat
   de build niet afhangt van Google en de browser niets aan Google vraagt. */
const inter = localFont({
  src: './fonts/Inter-latin.woff2',
  weight: '400 700',
  variable: '--font-inter',
  display: 'swap',
})
const figtree = localFont({
  src: './fonts/Figtree-latin.woff2',
  weight: '300 900',
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'James Robinson Wallet',
  description: 'Inzicht in je marketingbudget bij James Robinson.',
  // Een klantportaal met financiele gegevens hoort niet in Google.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${inter.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  )
}
