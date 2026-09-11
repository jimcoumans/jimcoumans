import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listSyncRuns } from '@/lib/admin'
import { AppShell } from '@/components/AppShell'
import { formatDateLong } from '@/lib/dates'

/** Status van de ClickUp-koppeling. */
export default async function SyncPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const runs = await listSyncRuns()
  const gekoppeld = Boolean(process.env.CLICKUP_API_TOKEN)

  return (
    <AppShell user={user} actief="sync">
        <h1 className="text-jr-blue mb-1 text-2xl">ClickUp-sync</h1>
        <p className="mb-6 text-sm text-gray-600">
          Haalt factureerbare taken uit ClickUp en boekt ze af op de wallet van de klant.
        </p>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base">Hoe het werkt</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong className="font-normal">Wat wordt afgeboekt:</strong> taken waarvan
              het veld Facturatie op Factureerbaar, Naar Moneybird of Gefactureerd staat.
              Het bedrag komt uit Verkoopfactuur, en als die leeg is uit Advies.
            </li>
            <li>
              <strong className="font-normal">Wat niet:</strong> taken op Open (bedrag
              staat nog niet vast) en op Niet factureerbaar (valt binnen het abonnement).
            </li>
            <li>
              <strong className="font-normal">De sync voegt alleen toe.</strong> Bestaande
              boekingen worden nooit gewijzigd of verwijderd. Verandert een taak nadat hij
              is afgeboekt, dan corrigeer je dat met de hand bij de klant. Zo verandert
              een saldo nooit vanzelf.
            </li>
            <li>
              <strong className="font-normal">Dubbel boeken kan niet:</strong> per taak is
              maar een boeking per wallet mogelijk, afgedwongen door de database.
            </li>
          </ul>
        </section>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base">Sync starten</h2>

          {!gekoppeld && (
            <p className="border-jr-orange bg-jr-orange/5 mb-4 rounded border-l-4 p-3 text-sm">
              Er is nog geen CLICKUP_API_TOKEN ingesteld. Zonder token kan er niet
              gesynchroniseerd worden.
            </p>
          )}

          <p className="mb-3 text-sm text-gray-600">
            De sync draait vanaf de opdrachtregel. Eerst een proefronde, die niets
            verandert:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs">
            npm run sync:clickup -- --org=klant-slug --lists=901512499356
          </pre>
          <p className="mt-3 mb-3 text-sm text-gray-600">
            Klopt het rapport? Dan pas echt boeken:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs">
            npm run sync:clickup -- --org=klant-slug --lists=901512499356 --apply
          </pre>
        </section>

        <section>
          <h2 className="mb-3 text-lg">Laatste syncs</h2>

          {runs.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">
              Er is nog niet gesynchroniseerd. Proefrondes worden hier niet vastgelegd,
              omdat er niets verandert.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
              {runs.map((run) => (
                <li key={run.id} className="px-4 py-3.5 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {formatDateLong(run.startedAt)}
                        <span className="text-xs text-gray-600">
                          {' '}
                          &middot;{' '}
                          {run.startedAt.toLocaleTimeString('nl-NL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </p>
                      {run.notes && (
                        <p className="mt-0.5 text-xs text-gray-600">{run.notes}</p>
                      )}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        run.status === 'success'
                          ? 'bg-jr-green/10 text-jr-green'
                          : run.status === 'failed'
                            ? 'bg-jr-red/10 text-jr-red'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {run.status === 'success'
                        ? 'Gelukt'
                        : run.status === 'failed'
                          ? 'Mislukt'
                          : 'Bezig'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
    </AppShell>
  )
}
