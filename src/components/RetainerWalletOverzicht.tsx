import { formatDate } from '@/lib/dates'
import { formatCents, formatSignedCents } from '@/lib/money'
import type { RetainerWallet } from '@/lib/retainer-wallet/laden'
import { UitklapLijst } from './UitklapLijst'

export function RetainerWalletOverzicht({ wallet, beheer = false, limiet, offset = 0, open }: {
  wallet: RetainerWallet
  beheer?: boolean
  limiet?: number
  offset?: number
  open?: boolean
}) {
  if (!wallet.ok) {
    return (
      <p role="status" className="rounded-xl bg-white p-5 text-sm text-gray-700 shadow-sm">
        Het actuele budget is tijdelijk niet beschikbaar.
        {beheer && wallet.bron && ` Controleer de koppeling met ${wallet.bron}.`}
      </p>
    )
  }

  const regels = limiet === undefined ? wallet.regels : wallet.regels.slice(offset, offset + limiet)

  const renderLijst = (regels: typeof wallet.regels) => (
    <ul className="divide-y divide-gray-200 rounded-xl bg-white px-5 shadow-sm">
      {regels.map((regel) => (
        <li key={regel.id} className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{beheer || regel.bron === 'Moneybird' ? regel.titel : 'Afgeronde taak'}</p>
            <p className="text-xs text-gray-600">
              {regel.bron}
              {regel.datum && ` · ${formatDate(new Date(regel.datum.slice(0, 10) + 'T12:00:00Z'))}`}
            </p>
          </div>
          <span className="tabular shrink-0 text-sm font-semibold">{formatSignedCents(regel.bedragCents)}</span>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="space-y-5" aria-label="Retainerwallet">
      <dl className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <dt className="text-sm text-gray-600">Actueel budget</dt>
          <dd className="font-display tabular text-3xl font-bold">{formatCents(wallet.saldoCents)}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Retainerfacturen excl. btw</dt>
          <dd className="tabular text-lg font-semibold">{formatCents(wallet.bijgeschrevenCents)}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Besteed aan afgeronde taken</dt>
          <dd className="tabular text-lg font-semibold">{formatCents(wallet.besteedCents)}</dd>
        </div>
      </dl>
      {beheer && wallet.zonderTarief > 0 && (
        <p className="text-sm text-gray-700">
          {wallet.zonderTarief === 1
            ? '1 afgeronde taak zonder ingevuld verkooptarief is overgeslagen.'
            : `${wallet.zonderTarief} afgeronde taken zonder ingevuld verkooptarief zijn overgeslagen.`}
        </p>
      )}
      <div>
        <h2 className="mb-2 text-xl font-semibold">Boekingen</h2>
        {regels.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">Geen boekingen in dit overzicht.</p>
        ) : (
          limiet === undefined
            ? <UitklapLijst regels={regels} label="boekingen" renderLijst={renderLijst} open={open} />
            : renderLijst(regels)
        )}
      </div>
    </section>
  )
}
