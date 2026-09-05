import { formatCents } from '@/lib/money'
import { formatRelative } from '@/lib/dates'
import type { WalletBalance } from '@/lib/ledger'
import type { Wallet } from '@/db/schema'

/**
 * Het saldo, zoals bovenaan een bankapp. Het bedrag is bewust het grootste
 * element op de pagina: dat is waar de klant voor komt.
 */
export function BalanceCard({
  wallet,
  balance,
}: {
  wallet: Wallet
  balance: WalletBalance
}) {
  const negatief = balance.balanceCents < 0
  const drempel = wallet.lowBalanceThresholdCents
  const bijnaOp =
    !negatief && drempel !== null && drempel > 0 && balance.balanceCents <= drempel

  // Aandeel van het bijgeschreven budget dat al is besteed.
  const verbruikt =
    balance.toppedUpCents > 0
      ? Math.min(100, Math.round((balance.spentCents / balance.toppedUpCents) * 100))
      : 0

  const balkKleur = negatief ? 'bg-jr-red' : bijnaOp ? 'bg-jr-orange' : 'bg-jr-blue'

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm text-gray-600">{wallet.name}</h2>
          <p
            className={`tabular mt-1 text-4xl font-bold sm:text-5xl ${
              negatief ? 'text-jr-red' : 'text-jr-black'
            }`}
          >
            {formatCents(balance.balanceCents)}
          </p>
          <p className="mt-1.5 text-sm text-gray-600">
            {negatief ? 'Openstaand bedrag' : 'Beschikbaar budget'}
            {balance.lastEntryOn && (
              <> &middot; laatste mutatie {formatRelative(balance.lastEntryOn)}</>
            )}
          </p>
        </div>

        {wallet.status !== 'active' && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            {wallet.status === 'paused' ? 'Gepauzeerd' : 'Afgesloten'}
          </span>
        )}
      </div>

      {balance.toppedUpCents > 0 && (
        <div className="mt-6">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
            role="img"
            aria-label={`${verbruikt} procent van het budget besteed`}
          >
            <div
              className={`h-full rounded-full transition-all ${balkKleur}`}
              style={{ width: `${verbruikt}%` }}
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-600">Bijgeschreven</dt>
              <dd className="tabular mt-0.5 text-base">
                {formatCents(balance.toppedUpCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Besteed</dt>
              <dd className="tabular mt-0.5 text-base">
                {formatCents(balance.spentCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Mutaties</dt>
              <dd className="tabular mt-0.5 text-base">{balance.entryCount}</dd>
            </div>
          </dl>
        </div>
      )}

      {negatief && (
        <p className="border-jr-red bg-jr-red/5 mt-6 rounded border-l-4 p-3 text-sm">
          Er is meer besteed dan er in je wallet zat. Dit bedrag verrekenen we op je
          eerstvolgende factuur. Vragen? Bel je vaste contactpersoon.
        </p>
      )}

      {bijnaOp && (
        <p className="border-jr-orange bg-jr-orange/5 mt-6 rounded border-l-4 p-3 text-sm">
          Je budget raakt op. We nemen contact met je op over de volgende periode.
        </p>
      )}
    </section>
  )
}
