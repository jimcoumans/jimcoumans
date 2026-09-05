import { Logo } from './Logo'
import type { SessionUser } from '@/lib/auth'

export function Header({ user, actief }: { user: SessionUser; actief?: string }) {
  const isTeam = user.role === 'staff' || user.role === 'admin'

  const links = isTeam
    ? [
        { href: '/beheer', label: 'Klanten', key: 'beheer' },
        { href: '/beheer/sync', label: 'Sync', key: 'sync' },
      ]
    : [
        { href: '/', label: 'Mijn wallet', key: 'wallet' },
        { href: '/facturen', label: 'Facturen', key: 'facturen' },
        { href: '/activiteit', label: 'Activiteit', key: 'activiteit' },
      ]

  return (
    <header className="bg-jr-black">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <a href="/" className="shrink-0">
          <Logo variant="light" />
        </a>

        <div className="flex items-center gap-4">
          <nav className="flex gap-1" aria-label="Hoofdmenu">
            {links.map((link) => (
              <a
                key={link.key}
                href={link.href}
                aria-current={actief === link.key ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  actief === link.key
                    ? 'bg-jr-blue text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              Uitloggen
            </button>
          </form>
        </div>
      </div>

      {(isTeam || user.organization) && (
        <div className="bg-white/5 px-4 py-2 sm:px-6">
          <div className="mx-auto max-w-5xl text-xs text-gray-400">
            {isTeam ? (
              <>
                Ingelogd als <span className="text-gray-200">{user.email}</span> &middot;
                James Robinson team
              </>
            ) : (
              <>
                <span className="text-gray-200">{user.organization?.name}</span> &middot;{' '}
                {user.email}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
