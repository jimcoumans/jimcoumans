import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // De lettertypen voor de pdf van de briefing: ze worden van schijf gelezen,
  // dus Next.js moet ze meenemen in de serverfunctie.
  outputFileTracingIncludes: {
    '/api/campagnes/*/pdf': ['./src/fonts/pdf/**/*'],
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
