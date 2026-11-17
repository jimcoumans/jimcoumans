import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { isDemo, appUrl } from '@/lib/config'

const serif = localFont({
  src: [
    { path: './fonts/cormorant-garamond-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-500-italic.woff2', weight: '500', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
})
const sans = localFont({
  src: [
    { path: './fonts/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: 'James & Co. — Meer tijd voor het goede leven', template: '%s — James & Co.' },
  description: 'Uw persoonlijke aanspreekpunt voor bijzondere plannen en alles wat erbij komt kijken.',
  robots: isDemo() ? { index: false, follow: false } : undefined,
}

export const viewport: Viewport = { themeColor: '#F6F3ED', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">Naar de inhoud</a>
        {isDemo() && (
          <div role="note" className="bg-warn-soft px-4 py-1.5 text-center text-[13px] text-warn">
            Demo-omgeving — alle namen, leveranciers, verzoeken en bedragen zijn fictief. Geen echte boekingen of betalingen.
          </div>
        )}
        {children}
      </body>
    </html>
  )
}
