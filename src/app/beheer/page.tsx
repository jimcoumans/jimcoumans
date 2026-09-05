import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listOrganizations } from '@/lib/admin'
import { Header } from '@/components/Header'
import { ActionForm, Field } from '@/components/ActionForm'
import { nieuweKlant } from './actions'
import { formatCents } from '@/lib/money'

/** Klantenoverzicht voor het JR-team. */
export default async function BeheerPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const klanten = await listOrganizations()
  const totaal = klanten.reduce((acc, k) => acc + k.totalBalanceCents, 0)
  const negatief = klanten.filter((k) => k.totalBalanceCents < 0)

  return (
    <>
      <Header user={user} actief="beheer" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-jr-blue mb-1 text-2xl">Klanten</h1>
        <p className="mb-6 text-sm text-gray-600">
          {klanten.length} {klanten.length === 1 ? 'klant' : 'klanten'} &middot; totaal
          openstaand budget{' '}
          <span className="tabular">{formatCents(totaal)}</span>
        </p>

        {negatief.length > 0 && (
          <p className="border-jr-orange bg-jr-orange/5 mb-6 rounded border-l-4 p-3 text-sm">
            {negatief.length === 1
              ? '1 klant staat in de min'
              : `${negatief.length} klanten staan in de min`}
            : {negatief.map((k) => k.organization.name).join(', ')}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {klanten.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  Er zijn nog geen klanten. Voeg de eerste toe, of haal ze op met de
                  ClickUp-sync.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
                {klanten.map((k) => (
                  <li key={k.organization.id}>
                    <a
                      href={`/beheer/${k.organization.slug}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-gray-50 sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{k.organization.name}</p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {k.walletCount} {k.walletCount === 1 ? 'wallet' : 'wallets'}{' '}
                          &middot; {k.clientUserCount}{' '}
                          {k.clientUserCount === 1 ? 'gebruiker' : 'gebruikers'}
                          {k.clientUserCount === 0 && (
                            <span className="text-jr-orange">
                              {' '}
                              &middot; nog niemand kan inloggen
                            </span>
                          )}
                        </p>
                      </div>
                      <p
                        className={`tabular shrink-0 text-sm ${
                          k.totalBalanceCents < 0 ? 'text-jr-red' : ''
                        }`}
                      >
                        {formatCents(k.totalBalanceCents)}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Klant toevoegen</h2>
            <ActionForm action={nieuweKlant} submitLabel="Klant aanmaken">
              <Field label="Klantnaam" name="naam" required placeholder="Hotel Voncken" />
              <Field
                label="Naam eerste wallet"
                name="walletNaam"
                placeholder="Marketing abonnement"
                hint="Leeg laten geeft: Marketing abonnement"
              />
            </ActionForm>
          </aside>
        </div>
      </main>
    </>
  )
}
