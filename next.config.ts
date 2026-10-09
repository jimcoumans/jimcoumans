import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Documenten (cv, kopie ID, loonheffingsformulier) gaan via een server action.
    // Standaard is 1 MB; Netlify neemt tot 6 MB per verzoek aan. Per bestand houden
    // we 4 MB aan, en foto's worden in de browser eerst verkleind.
    serverActions: { bodySizeLimit: '5mb' },
  },
  // De lettertypen voor de pdf van de briefing: ze worden van schijf gelezen,
  // dus Next.js moet ze meenemen in de serverfunctie.
  outputFileTracingIncludes: {
    '/api/campagnes/*/pdf': ['./src/fonts/pdf/**/*'],
    '/api/contracten/*/pdf': ['./src/fonts/pdf/**/*'],
    '/api/contracten/*/avg': ['./src/fonts/pdf/**/*'],
    '/api/bedrijf/avg-voorbeeld': ['./src/fonts/pdf/**/*'],
    '/api/sjablonen/*/voorbeeld': ['./src/fonts/pdf/**/*'],
  },
  async headers() {
    return [
      {
        // Klantfinancien: niet indexeren, niet cachen, geen framing.
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
}

export default nextConfig
