import Link from 'next/link'
import { Wordmark } from './Brand'

const NAV: [string, string][] = [
  ['/service', 'De service'],
  ['/how-it-works', 'Zo werkt het'],
  ['/society', 'The James Society'],
  ['/apply', 'Kennismaken'],
]

export function SiteHeader() {
  return (
    <header className="border-b border-line/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Hoofdnavigatie" className="hidden items-center gap-7 text-[15px] md:flex">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="text-ink/85 hover:text-forest">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-quiet hidden text-[14px] md:inline-flex">Ledenlogin</Link>
          <details className="relative md:hidden">
            <summary className="btn-quiet cursor-pointer list-none text-[14px]" aria-label="Menu openen">Menu</summary>
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-lg">
              {NAV.map(([href, label]) => <Link key={href} href={href} className="block rounded-lg px-4 py-3 text-[16px] hover:bg-canvas">{label}</Link>)}
              <Link href="/login" className="mt-1 block rounded-lg border-t border-line px-4 py-3 text-[16px] text-forest">Ledenlogin</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
