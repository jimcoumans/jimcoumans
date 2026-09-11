'use client'

import { useState } from 'react'
import type { SessionUser } from '@/lib/auth'

/* -------------------------------------------------------------------------
   De omlijsting van het portaal: een vaste navigatiekolom links.

   Op een breed scherm staat de kolom altijd open; op een telefoon schuift
   hij over de inhoud heen en gaat hij dicht zodra je iets kiest. Zo is er
   één navigatie in plaats van twee varianten die uit elkaar lopen.
   ------------------------------------------------------------------------- */

type NavItem = { href: string; label: string; key: string; icon: React.ReactNode }

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="7.5" height="8" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="2" />
      <rect x="3" y="14" width="7.5" height="7" rx="2" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="2" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 20V7l8-3v16M12 20h8V11l-8-3" />
      <path d="M7 11h2M7 15h2M15 13h2M15 17h2" />
    </svg>
  ),
  quotes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 11h7M9 15h5" />
    </svg>
  ),
  subs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  services: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  partners: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 11.5a3 3 0 1 0 0-6M17 19c0-2.5-.8-4-2-5" />
    </svg>
  ),
  finance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 19V6M4 19h16" />
      <path d="M8 15l3.5-4L15 13l4-5" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 19c0-3.3 3-6 7-6s7 2.7 7 6" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16 14.5h2" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 18V9M10 18V5M16 18v-6M22 18h-2" />
    </svg>
  ),
  sync: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
    </svg>
  ),
}

const TEAM_NAV: NavItem[] = [
  { href: '/beheer', label: 'Dashboard', key: 'dashboard', icon: icons.dashboard },
  { href: '/beheer/klanten', label: 'Klanten', key: 'klanten', icon: icons.clients },
  { href: '/beheer/offertes', label: 'Offertes', key: 'offertes', icon: icons.quotes },
  { href: '/beheer/abonnementen', label: 'Abonnementen', key: 'abonnementen', icon: icons.subs },
  { href: '/beheer/diensten', label: 'Diensten', key: 'diensten', icon: icons.services },
  { href: '/beheer/partners', label: 'Partners', key: 'partners', icon: icons.partners },
  { href: '/beheer/financieel', label: 'Financieel', key: 'financieel', icon: icons.finance },
  { href: '/beheer/medewerkers', label: 'Team', key: 'medewerkers', icon: icons.team },
]

const CLIENT_NAV: NavItem[] = [
  { href: '/', label: 'Mijn wallet', key: 'wallet', icon: icons.wallet },
  { href: '/activiteit', label: 'Activiteit', key: 'activiteit', icon: icons.activity },
  { href: '/facturen', label: 'Facturen', key: 'facturen', icon: icons.quotes },
]

export function AppShell({
  user,
  actief,
  children,
}: {
  user: SessionUser
  actief?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const isTeam = user.role === 'staff' || user.role === 'admin'
  const items = isTeam ? TEAM_NAV : CLIENT_NAV

  return (
    <div className="min-h-screen lg:flex">
      {/* Balk bovenaan, alleen op smalle schermen */}
      <div className="bg-jr-black flex items-center justify-between px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menu openen"
          className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <span className="inline-flex items-baseline gap-2">
          <span className="text-sm font-bold text-white">James Robinson</span>
          <span className="text-jr-blue text-xs">Wallet</span>
        </span>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            aria-label="Uitloggen"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </form>
      </div>

      {/* Donkere laag achter het uitgeschoven menu */}
      {open && (
        <button
          type="button"
          aria-label="Menu sluiten"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* De navigatiekolom */}
      <nav
        aria-label="Hoofdmenu"
        className={`bg-jr-black fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <a href={isTeam ? '/beheer' : '/'} className="inline-flex items-baseline gap-2">
            <span className="text-[15px] font-bold tracking-tight text-white">James Robinson</span>
            <span className="text-jr-blue text-xs">Wallet</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Menu sluiten"
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={actief === item.key ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  actief === item.key
                    ? 'bg-jr-blue text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="h-[18px] w-[18px] shrink-0">{item.icon}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {isTeam && (
          <div className="px-3 pb-2">
            <a
              href="/beheer/sync"
              onClick={() => setOpen(false)}
              aria-current={actief === 'sync' ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors ${
                actief === 'sync'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:bg-white/10 hover:text-gray-300'
              }`}
            >
              <span className="h-4 w-4 shrink-0">{icons.sync}</span>
              Koppelingen
            </a>
          </div>
        )}

        <div className="border-t border-white/10 px-5 py-4">
          {(() => {
            // Zonder naam staat het e-mailadres er anders twee keer.
            const bovenste = isTeam ? user.name : user.organization?.name
            return (
              <>
                {bovenste && <p className="truncate text-xs text-gray-300">{bovenste}</p>}
                <p
                  className={`truncate text-xs ${bovenste ? 'text-gray-500' : 'text-gray-300'}`}
                >
                  {user.email}
                </p>
              </>
            )
          })()}
          <form action="/api/auth/logout" method="post" className="mt-2">
            <button type="submit" className="text-xs text-gray-400 hover:text-white">
              Uitloggen
            </button>
          </form>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-5xl px-4 py-7 sm:px-8">{children}</main>
      </div>
    </div>
  )
}
