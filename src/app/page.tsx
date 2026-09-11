import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getOrganizationWallets, getWalletEntries, getReversedEntryIds } from '@/lib/ledger'
import { AppShell } from '@/components/AppShell'
import { BalanceCard } from '@/components/BalanceCard'
import { TransactionList } from '@/components/TransactionList'
import { formatCents } from '@/lib/money'

/** Het klantportaal: saldo en de laatste mutaties. */
export default async function HomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Het JR-team komt niet in het klantportaal terecht maar in het beheer.
  if (user.role === 'staff' || user.role === 'admin') redirect('/beheer')
  if (!user.organizationId) redirect('/login')

  const wallets = await getOrganizationWallets(user.organizationId)

  return (
    <AppShell user={user} actief="wallet">
        {wallets.length === 0 ? (
          <div className="rounded-xl bg-white p-8 shadow-sm">
            <h1 className="text-jr-blue mb-2 text-2xl">Nog geen wallet</h1>
            <p className="text-sm text-gray-600">
              Er is nog geen wallet ingericht voor {user.organization?.name}. Je vaste
              contactpersoon zet dit voor je klaar.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {wallets.length > 1 && <Totaal wallets={wallets} />}

            {wallets.map(({ wallet, balance }) => (
              <WalletBlok
                key={wallet.id}
                wallet={wallet}
                balance={balance}
                toonWalletNaam={wallets.length > 1}
              />
            ))}
          </div>
        )}
    </AppShell>
  )
}

/** Bij meerdere wallets wil een klant eerst het totaal zien. */
function Totaal({
  wallets,
}: {
  wallets: Awaited<ReturnType<typeof getOrganizationWallets>>
}) {
  const totaal = wallets.reduce((acc, w) => acc + w.balance.balanceCents, 0)

  return (
    <section className="bg-jr-black rounded-xl p-6 text-white sm:p-8">
      <h1 className="text-sm text-gray-400">Totaal beschikbaar</h1>
      <p className="tabular mt-1 text-4xl font-bold sm:text-5xl">{formatCents(totaal)}</p>
      <p className="mt-1.5 text-sm text-gray-400">
        Verdeeld over {wallets.length} wallets
      </p>
    </section>
  )
}

async function WalletBlok({
  wallet,
  balance,
  toonWalletNaam,
}: {
  wallet: Awaited<ReturnType<typeof getOrganizationWallets>>[number]['wallet']
  balance: Awaited<ReturnType<typeof getOrganizationWallets>>[number]['balance']
  toonWalletNaam: boolean
}) {
  const [entries, reversedIds] = await Promise.all([
    getWalletEntries(wallet.id, { limit: 15 }),
    getReversedEntryIds(wallet.id),
  ])

  return (
    <div className="space-y-4">
      <BalanceCard wallet={wallet} balance={balance} />

      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        {/* Bij meerdere wallets moet meteen duidelijk zijn welke mutaties
            bij welke wallet horen. */}
        <h2 className="text-lg">
          Laatste mutaties
          {toonWalletNaam && (
            <span className="text-gray-600"> &middot; {wallet.name}</span>
          )}
        </h2>
        {balance.entryCount > entries.length && (
          <a
            href={`/activiteit?wallet=${wallet.id}`}
            className="text-jr-blue text-sm hover:underline"
          >
            Alles bekijken ({balance.entryCount})
          </a>
        )}
      </div>

      <TransactionList entries={entries} reversedIds={reversedIds} />
    </div>
  )
}
