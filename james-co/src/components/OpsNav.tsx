'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function OpsNav({ admin }: { admin: boolean }) {
  const path = usePathname()
  const items: [string, string][] = [
    ['/ops', 'Werkvoorraad'], ['/ops/tasks', 'Taken'], ['/ops/members', 'Klanten'], ['/ops/suppliers', 'Leveranciers'], ['/ops/society', 'Society'],
    ...(admin ? ([['/ops/billing', 'Facturatie'], ['/ops/reports', 'Rapportage'], ['/ops/settings', 'Instellingen']] as [string, string][]) : []),
  ]
  const active = (h: string) => (h === '/ops' ? path === '/ops' || path.startsWith('/ops/requests') : path.startsWith(h))
  return (
    <nav aria-label="Cockpit" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-[14px] ${active(href) ? 'bg-forest text-white' : 'text-ink/80 hover:bg-surface'}`}>{label}</Link>
      ))}
    </nav>
  )
}
