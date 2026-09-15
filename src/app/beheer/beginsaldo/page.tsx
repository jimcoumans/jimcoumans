import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listWalletsMetSaldo } from '@/lib/beginsaldo'
import { AppShell } from '@/components/AppShell'
import { ActionForm } from '@/components/ActionForm'
import { zetBeginsaldo } from '../beginsaldo-actions'
import { formatCents } from '@/lib/money'

/**
 * Alle saldo's in één scherm rechttrekken.
 *
 * Je vult in wat het saldo MOET zijn, niet wat er bij moet. Zo kun je naast
 * ClickUp gaan zitten en overtypen wat daar staat, zonder per klant een
 * verschil uit te rekenen.
 */
export default async function BeginsaldoPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const wallets = await listWalletsMetSaldo()
  const leeg = wallets.filter((w) => w.boekingen === 0)
  const totaal = wallets.reduce((t, w) => t + w.saldoCents, 0)

  return (
    <AppShell user={user} actief="klanten" breed>
      <div className="mb-5">
        <h1 className="text-jr-blue text-2xl">Beginsaldo&rsquo;s</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Een saldo is altijd de som van de boekingen; er bestaat geen los veld met
          &ldquo;het saldo&rdquo;. Een nieuwe klant staat daarom op nul, ook als hij al
          maanden budget heeft opgebouwd of juist eroverheen zit. Hier trek je dat één
          keer recht.
        </p>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Vul in wat het saldo <strong>moet zijn</strong>. Het verschil wordt als
          boeking vastgelegd, zodat later te zien is waar dat saldo vandaan kwam. Een
          bedrag in de min mag: schrijf <span className="tabular">-340,50</span>. Velden
          die je leeg laat blijven ongemoeid.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <p className="text-xs text-gray-600">Wallets</p>
          <p className="tabular text-xl font-bold leading-tight">{wallets.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Nog nooit geboekt</p>
          <p className="tabular text-jr-orange text-xl font-bold leading-tight">
            {leeg.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Samen in budget</p>
          <p className="tabular text-xl font-bold leading-tight">{formatCents(totaal)}</p>
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Nog geen wallets. Maak eerst klanten met een wallet aan.
          </p>
        </div>
      ) : (
        <ActionForm
          action={zetBeginsaldo}
          submitLabel="Saldo's bijwerken"
          resetOnSuccess={false}
          className=""
        >
          <div className="mb-4 max-w-lg">
            <label htmlFor="omschrijving" className="mb-1 block text-xs text-gray-600">
              Omschrijving op de boeking
            </label>
            <input
              id="omschrijving"
              name="omschrijving"
              defaultValue="Beginsaldo overgenomen uit ClickUp"
              className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              De klant ziet deze regel in zijn portaal staan.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="px-4 py-2.5 font-normal">Klant</th>
                  <th className="px-4 py-2.5 font-normal">Wallet</th>
                  <th className="px-4 py-2.5 text-right font-normal">Saldo nu</th>
                  <th className="px-4 py-2.5 font-normal">Moet zijn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wallets.map((w) => (
                  <tr key={w.walletId}>
                    <td className="px-4 py-2">
                      <a
                        href={`/beheer/klanten/${w.slug}`}
                        className="hover:text-jr-blue"
                      >
                        {w.klantNaam}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {w.walletNaam}
                      {w.boekingen === 0 && (
                        <span className="text-jr-orange"> &middot; nog niets geboekt</span>
                      )}
                    </td>
                    <td
                      className={`tabular px-4 py-2 text-right ${
                        w.saldoCents < 0 ? 'text-jr-red' : ''
                      }`}
                    >
                      {formatCents(w.saldoCents)}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        name={`saldo-${w.walletId}`}
                        inputMode="text"
                        placeholder="laat leeg om over te slaan"
                        aria-label={`Nieuw saldo voor ${w.klantNaam}`}
                        className="focus:border-jr-blue tabular w-44 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ActionForm>
      )}
    </AppShell>
  )
}
