import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  listSubscriptions,
  getMonthlyRecurringCents,
  getMonthlyBudgetCents,
  getKlantAandelen,
} from '@/lib/billing'
import { AppShell } from '@/components/AppShell'
import { ActionForm } from '@/components/ActionForm'
import { SubscriptionCard } from '@/components/SubscriptionCard'
import { factureerNu } from '../subscription-actions'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'

/** Alle abonnementen, met wanneer ze eerstvolgend factureren. */
export default async function AbonnementenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const [alle, mrr, budget, aandelen] = await Promise.all([
    listSubscriptions(),
    getMonthlyRecurringCents(),
    getMonthlyBudgetCents(),
    getKlantAandelen(),
  ])

  const lopend = alle.filter((s) => s.subscription.status === 'active')
  const gepauzeerd = alle.filter((s) => s.subscription.status === 'paused')
  const gestopt = alle.filter((s) => s.subscription.status === 'ended')

  // Welke abonnementen zijn vandaag of eerder aan de beurt? Die wachten op
  // de volgende run.
  const nu = new Date()
  const wachtend = lopend.filter(
    (s) => s.nextBillingOn !== null && s.nextBillingOn <= nu,
  )

  return (
    <AppShell user={user} actief="abonnementen">
        <h1 className="text-jr-blue mb-1 text-2xl">Abonnementen</h1>
        <p className="mb-6 text-sm text-gray-600">
          Zolang een abonnement loopt, wordt op de facturatiedag van elke maand een
          factuur aangemaakt en het bedrag als budget bijgeschreven.
        </p>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-600">Omzet per maand</p>
            <p className="tabular mt-1 text-3xl font-bold">{formatCents(mrr)}</p>
            <p className="mt-1 text-xs text-gray-500">
              uit {lopend.length} {lopend.length === 1 ? 'abonnement' : 'abonnementen'}
              {budget.kortingCents > 0 && ', na korting'}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-600">Per jaar</p>
            <p className="tabular mt-1 text-2xl font-bold">{formatCents(mrr * 12)}</p>
            <p className="mt-1 text-xs text-gray-500">bij ongewijzigde abonnementen</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-600">Budget dat we weggeven</p>
            <p className="tabular mt-1 text-2xl font-bold">
              {formatCents(budget.budgetCents)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {budget.kortingCents > 0 ? (
                <>
                  waarvan{' '}
                  <span className="text-jr-orange">{formatCents(budget.kortingCents)}</span>{' '}
                  korting
                </>
              ) : (
                'gelijk aan de omzet; niemand heeft korting'
              )}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-600">Gepauzeerd of gestopt</p>
            <p className="tabular mt-1 text-2xl font-bold">
              {gepauzeerd.length + gestopt.length}
            </p>
            <p className="mt-1 text-xs text-gray-500">worden niet gefactureerd</p>
          </div>
        </section>

        {aandelen.klanten.length > 0 && (
          <section className="mb-8 rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
              <h2 className="text-base">Wie vormt de abonnementsomzet</h2>
              <p className="text-xs text-gray-500">
                Aandeel in {formatCents(aandelen.totaalOmzetCents)} per maand
              </p>
            </div>

            <ul className="divide-y divide-gray-200">
              {aandelen.klanten.map((k) => (
                <li key={k.organizationSlug} className="px-5 py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <a
                      href={`/beheer/klanten/${k.organizationSlug}`}
                      className="hover:text-jr-blue text-sm"
                    >
                      {k.organizationName}
                    </a>
                    <p className="text-sm">
                      <span className="tabular">{formatCents(k.omzetCents)}</span>
                      <span className="tabular ml-3 inline-block w-12 text-right font-bold">
                        {k.aandeelProcent}%
                      </span>
                    </p>
                  </div>

                  {/* Een balk zegt in één blik meer dan een percentage: je ziet
                      of er één klant uitsteekt zonder de getallen te lezen. */}
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="bg-jr-blue h-full rounded-full"
                      style={{ width: `${Math.max(k.aandeelProcent, 0.5)}%` }}
                    />
                  </div>

                  {k.kortingCents > 0 && (
                    <p className="text-jr-orange mt-0.5 text-xs">
                      krijgt {formatCents(k.budgetCents)} budget &middot;{' '}
                      {formatCents(k.kortingCents)} korting
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {aandelen.klanten[0] && aandelen.klanten[0].aandeelProcent >= 15 && (
              <p className="border-t border-gray-200 px-5 py-3 text-xs text-gray-600">
                {aandelen.klanten[0].organizationName} is{' '}
                {aandelen.klanten[0].aandeelProcent}% van de vaste omzet. Een klant die
                je niet kunt missen is het waard om dat te weten voordat hij opzegt.
              </p>
            )}
          </section>
        )}

        <section className="mb-8 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base">De maandelijkse run</h2>
          <p className="mb-3 text-sm text-gray-600">
            De run draait elke ochtend automatisch en kijkt zelf welke maanden nog
            openstaan. Ligt de server er een dag uit, dan wordt de dag erna alsnog
            gefactureerd. Dubbel factureren kan niet: de database staat maar één
            factuur per abonnement per maand toe.
          </p>

          {wachtend.length > 0 ? (
            <p className="border-jr-blue bg-jr-lightblue mb-3 rounded border-l-4 p-3 text-sm">
              {wachtend.length}{' '}
              {wachtend.length === 1 ? 'abonnement is' : 'abonnementen zijn'} aan de
              beurt: {wachtend.map((s) => s.organizationName).join(', ')}. De
              eerstvolgende run pakt dit op, of start hem nu met de hand.
            </p>
          ) : (
            <p className="mb-3 text-sm text-gray-600">
              Alles is bij: er staat op dit moment niets open.
            </p>
          )}

          <ActionForm action={factureerNu} submitLabel="Run nu starten" resetOnSuccess={false}>
            <input type="hidden" name="slug" value="" />
          </ActionForm>
        </section>

        {alle.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-600">
              Nog geen abonnementen. Je maakt er een aan bij een klant, onder{' '}
              <a href="/beheer/klanten" className="text-jr-blue hover:underline">
                Klanten
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <Groep titel="Lopend" items={lopend} />
            <Groep titel="Gepauzeerd" items={gepauzeerd} />
            <Groep titel="Gestopt" items={gestopt} />
          </div>
        )}
    </AppShell>
  )
}

function Groep({
  titel,
  items,
}: {
  titel: string
  items: Awaited<ReturnType<typeof listSubscriptions>>
}) {
  if (items.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-lg">
        {titel} <span className="text-sm text-gray-600">({items.length})</span>
      </h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <SubscriptionCard
            key={item.subscription.id}
            item={item}
            slug={item.organizationSlug}
            toonKlant
          />
        ))}
      </ul>
    </section>
  )
}
