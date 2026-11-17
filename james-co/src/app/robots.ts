import type { MetadataRoute } from 'next'
import { appUrl, appEnv } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  if (appEnv() !== 'production') return { rules: [{ userAgent: '*', disallow: '/' }] }
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/invite/', '/app', '/ops', '/onboarding', '/login'] }], sitemap: `${appUrl()}/sitemap.xml` }
}
