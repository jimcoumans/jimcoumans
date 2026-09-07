import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listSubscriptions, getMonthlyRecurringCents } from '@/lib/billing'
import { Header } from '@/components/Header'
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

  const [alle, mrr] = await Promise.all([listSubscriptions(), getMonthlyRecurringCents()])

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
    <>
      <Header user={user} actief="abonnementen" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-jr-blue mb-1 text-2xl">Abonnementen</h1>
        <p className="mb-6 text-sm text-gray-600">
          Zolang een abonnement loopt, wordt op de facturatiedag van elke maand een
          factuur aangemaakt en het bedrag als budget bijgeschreven.
        </p>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-600">Per maand terugkerend</p>
            <p className="tabular mt-1 text-3xl font-bold">{formatCents(mrr)}</p>
            <p className="mt-1 text-xs text-gray-500">
              uit {lopend.length} {lopend.length === 1 ? 'abonnement' : 'abonnementen'}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-600">Per jaar</p>
            <p className="tabular mt-1 text-2xl font-bold">{formatCents(mrr * 12)}</p>
            <p className="mt-1 text-xs text-gray-500">bij ongewijzigde abonnementen</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-600">Gepauzeerd of gestopt</p>
            <p className="tabular mt-1 text-2xl font-bold">
              {gepauzeerd.length + gestopt.length}
            </p>
            <p className="mt-1 text-xs text-gray-500">worden niet gefactureerd</p>
          </div>
        </section>

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
              <a href="/beheer" className="text-jr-blue hover:underline">
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
      </main>
    </>
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
