import Link from 'next/link'
import { getSettings, publicCompany } from '@/lib/domain/settings'
import { Wordmark } from './Brand'

export async function SiteFooter() {
  const company = publicCompany(await getSettings())
  return (
    <footer className="mt-24 border-t border-line/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <Wordmark small />
          <p className="mt-3 max-w-xs text-sm text-muted">Meer tijd voor het goede leven.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/service">De service</Link>
          <Link href="/how-it-works">Zo werkt het</Link>
          <Link href="/membership">Lidmaatschap</Link>
          <Link href="/society">The James Society</Link>
          <Link href="/visiting-the-netherlands" lang="en">Visiting the Netherlands</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Voorwaarden</Link>
        </nav>
        <div className="text-sm text-muted">
          {company ? (
            <address className="not-italic leading-relaxed">
              {company.legalName}<br />
              {company.address && <>{company.address}<br /></>}
              {company.kvk && <>KvK {company.kvk}<br /></>}
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </address>
          ) : (
            <p>Contact via <Link href="/apply" className="underline">kennismaken</Link>.</p>
          )}
        </div>
      </div>
    </footer>
  )
}
