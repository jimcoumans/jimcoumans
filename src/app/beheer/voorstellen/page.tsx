import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { lijstDossiers } from '@/lib/voorstellen'
import { AppShell } from '@/components/AppShell'
import { formatDate } from '@/lib/dates'

/**
 * Alle voorstellen uit de voorstelgenerator. Vanaf hier ga je verder met een
 * voorstel of begin je een nieuw. De generator zelf opent dan precies dat
 * dossier, in plaats van het laatste waar iemand in deze browser mee bezig was.
 */
export const maxDuration = 26

export default async function VoorstellenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const dossiers = await lijstDossiers()

  return (
    <AppShell user={user} actief="voorstellen">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="mb-1 text-[28px] sm:text-[32px]">Voorstellen</h1>
        {/* Een gewone link: de generator is een losse pagina, geen route van de app. */}
        <a
          href="/beheer/voorstellen/generator?nieuw=1"
          className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-5 py-2.5 text-sm font-medium text-white"
        >
          + Nieuw voorstel
        </a>
      </div>
      <p className="mb-6 text-sm text-gray-600">
        Voorstellen voor een Marketing Partnership, gemaakt met de voorstelgenerator. Klik op een
        voorstel om verder te gaan.
      </p>

      {dossiers.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Nog geen voorstellen. Begin er een met “+ Nieuw voorstel” rechtsboven.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {dossiers.map((d) => (
            <li key={d.id}>
              <a
                href={`/beheer/voorstellen/generator?dossier=${encodeURIComponent(d.id)}`}
                className="hover:border-jr-blue block rounded-xl border border-transparent bg-white p-4 shadow-sm transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm">{d.naam || d.id}</span>
                    <p className="mt-1 text-xs text-gray-600">
                      {[d.plaats, d.door ? `opgesteld door ${d.door}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">
                    bijgewerkt {formatDate(new Date(d.bijgewerkt))}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
