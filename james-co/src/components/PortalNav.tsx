'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS: [string, string][] = [['/app', 'Overzicht'], ['/app/requests', 'Verzoeken'], ['/app/society', 'Society'], ['/app/profile', 'Profiel']]

export function PortalNav({ canRequest }: { canRequest: boolean }) {
  const path = usePathname()
  const active = (href: string) => (href === '/app' ? path === '/app' : path.startsWith(href))
  return (
    <>
      <nav aria-label="Portaal" className="hidden items-center gap-1 md:flex">
        {ITEMS.map(([href, label]) => (
          <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`rounded-full px-4 py-2 text-[15px] ${active(href) ? 'bg-forest-soft text-forest' : 'hover:bg-surface'}`}>{label}</Link>
        ))}
        {canRequest && <Link href="/app/requests/new" className="btn-primary ml-2">Nieuw verzoek</Link>}
      </nav>
      <nav aria-label="Portaal mobiel" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {canRequest && (
          <div className="absolute -top-16 right-4">
            <Link href="/app/requests/new" className="btn-primary shadow-lg">Nieuw verzoek</Link>
          </div>
        )}
        <ul className="grid grid-cols-4">
          {ITEMS.map(([href, label]) => (
            <li key={href}>
              <Link href={href} aria-current={active(href) ? 'page' : undefined} className={`flex min-h-[56px] items-center justify-center text-[13px] font-medium ${active(href) ? 'text-forest' : 'text-muted'}`}>{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
