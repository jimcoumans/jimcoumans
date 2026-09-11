import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  getOrganizationWallets,
  getWalletEntries,
  getReversedEntryIds,
  getSpendByCategory,
} from '@/lib/ledger'
import { AppShell } from '@/components/AppShell'
import { TransactionList } from '@/components/TransactionList'
import { formatCents } from '@/lib/money'
import { categoryColor } from '@/lib/chart-colors'

const PER_PAGINA = 50

/** Het volledige afschrift, plus waar het geld naartoe ging. */
export default async function ActiviteitPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string; pagina?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!user.organizationId) redirect('/beheer')

  const wallets = await getOrganizationWallets(user.organizationId)
  if (wallets.length === 0) redirect('/')

  const params = await searchParams

  // Alleen een wallet van deze klant mag geopend worden; een gegokt id in de
  // URL valt terug op de eerste eigen wallet.
  const gekozen =
    wallets.find((w) => w.wallet.id === params.wallet) ?? wallets[0]!

  const pagina = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1)

  const [entries, reversedIds, perCategorie] = await Promise.all([
    getWalletEntries(gekozen.wallet.id, {
      limit: PER_PAGINA,
      offset: (pagina - 1) * PER_PAGINA,
    }),
    getReversedEntryIds(gekozen.wallet.id),
    getSpendByCategory(gekozen.wallet.id),
  ])

  const meerPaginas = gekozen.balance.entryCount > pagina * PER_PAGINA

  return (
    <AppShell user={user} actief="activiteit">
        <h1 className="text-jr-blue mb-1 text-2xl">Activiteit</h1>
        <p className="mb-6 text-sm text-gray-600">
          Alle mutaties op je wallet, van nieuw naar oud. Bij elke regel staat het
          saldo dat je daarna over had.
        </p>

        {wallets.length > 1 && (
          <nav className="mb-6 flex flex-wrap gap-2" aria-label="Kies wallet">
            {wallets.map(({ wallet }) => (
              <a
                key={wallet.id}
                href={`/activiteit?wallet=${wallet.id}`}
                aria-current={wallet.id === gekozen.wallet.id ? 'true' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  wallet.id === gekozen.wallet.id
                    ? 'bg-jr-blue text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {wallet.name}
              </a>
            ))}
          </nav>
        )}

        {perCategorie.length > 0 && (
          <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base">Waar je budget naartoe ging</h2>
            <CategorieBalk perCategorie={perCategorie} />
          </section>
        )}

        <TransactionList entries={entries} reversedIds={reversedIds} />

        {(pagina > 1 || meerPaginas) && (
          <nav className="mt-6 flex justify-between" aria-label="Paginering">
            {pagina > 1 ? (
              <a
                href={`/activiteit?wallet=${gekozen.wallet.id}&pagina=${pagina - 1}`}
                className="text-jr-blue text-sm hover:underline"
              >
                &larr; Nieuwere mutaties
              </a>
            ) : (
              <span />
            )}
            {meerPaginas && (
              <a
                href={`/activiteit?wallet=${gekozen.wallet.id}&pagina=${pagina + 1}`}
                className="text-jr-blue text-sm hover:underline"
              >
                Oudere mutaties &rarr;
              </a>
            )}
          </nav>
        )}
    </AppShell>
  )
}

/**
 * Verbruik per productgroep als gestapelde balk. Bewust geen cirkeldiagram:
 * bij lange labels en veel kleine categorieen is een balk beter te lezen,
 * en hij werkt ook op een telefoon.
 */
function CategorieBalk({
  perCategorie,
}: {
  perCategorie: { category: string; spentCents: number }[]
}) {
  const totaal = perCategorie.reduce((acc, c) => acc + c.spentCents, 0)
  if (totaal === 0) return null

  return (
    <>
      {/* De 2px witte tussenruimte houdt aangrenzende segmenten van elkaar
          gescheiden, ook als twee kleuren op elkaar lijken. */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-gray-200">
        {perCategorie.map((c, i) => (
          <div
            key={c.category}
            className="first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(c.spentCents / totaal) * 100}%`,
              backgroundColor: categoryColor(i),
            }}
            title={`${c.category}: ${formatCents(c.spentCents)}`}
          />
        ))}
      </div>

      {/* Elke categorie krijgt een eigen tekstlabel met bedrag en aandeel,
          zodat je nooit op kleur alleen hoeft te vertrouwen. */}
      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {perCategorie.map((c, i) => (
          <div key={c.category} className="flex items-center justify-between gap-3">
            <dt className="flex min-w-0 items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: categoryColor(i) }}
                aria-hidden
              />
              <span className="truncate">{c.category}</span>
            </dt>
            <dd className="tabular shrink-0 text-sm text-gray-600">
              {formatCents(c.spentCents)}
              <span className="ml-1.5 text-xs text-gray-500">
                {Math.round((c.spentCents / totaal) * 100)}%
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}
