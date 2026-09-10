import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listOrganizations } from '@/lib/admin'
import { getCrmCounts, organizationStatusLabels, organizationStatusStyles } from '@/lib/crm'
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
  const crm = await getCrmCounts(klanten.map((k) => k.organization.id))
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
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm">{k.organization.name}</p>
                          {k.organization.status !== 'client' && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${organizationStatusStyles[k.organization.status]}`}
                            >
                              {organizationStatusLabels[k.organization.status]}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {[
                            k.organization.industry,
                            `${k.walletCount} ${k.walletCount === 1 ? 'wallet' : 'wallets'}`,
                            (() => {
                              const c = crm.get(k.organization.id)
                              if (!c) return null
                              const delen = []
                              if (c.contacts > 0) delen.push(`${c.contacts} contact${c.contacts === 1 ? '' : 'en'}`)
                              if (c.partners > 0) delen.push(`${c.partners} partner${c.partners === 1 ? '' : 's'}`)
                              if (c.accounts > 0) delen.push(`${c.accounts} account${c.accounts === 1 ? '' : 's'}`)
                              return delen.join(' · ') || null
                            })(),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
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
