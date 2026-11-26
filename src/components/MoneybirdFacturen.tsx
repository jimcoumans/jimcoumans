import type { PortaalMoneybirdFacturen } from '@/lib/moneybird/facturen'
import { formatDate } from '@/lib/dates'
import type { MoneybirdFactuurStatus } from '@/lib/moneybird/client'

const statusKleuren: Partial<Record<MoneybirdFactuurStatus, string>> = {
  Betaald: '#2B8272',
  Verlopen: '#EC0001',
  Verstuurd: '#9E6900',
  Herinnerd: '#44403C',
}

export function MoneybirdFacturen({ gegevens }: { gegevens: PortaalMoneybirdFacturen }) {
  if (!gegevens.ok) return <p role="status">Moneybird-facturen zijn tijdelijk niet beschikbaar.</p>
  const groepen = [
    { titel: 'Retainerfacturen', uitleg: 'Facturen met het kenmerk Marketing Partnership.', retainer: true },
    { titel: 'Overige facturen', uitleg: 'Losse facturen, zoals drukwerk. Deze tellen niet mee voor je walletsaldo.', retainer: false },
  ]
  return (
    <div className="space-y-8">
      {groepen.map(({ titel, uitleg, retainer }) => {
        const facturen = gegevens.facturen.filter((f) => f.retainer === retainer)
        return (
          <section key={titel}>
            <h2 className="text-[18px]">{titel}</h2>
            <p className="mt-1 mb-3 text-sm text-gray-600">{uitleg}</p>
            {facturen.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm">Geen facturen.</p>
            ) : (
              <ul className="divide-y divide-gray-200 rounded-xl bg-white shadow-sm">
                {facturen.map((factuur) => (
                  <li key={factuur.id} className="flex flex-wrap justify-between gap-3 px-4 py-4 text-sm">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p>{factuur.nummer ? `Factuur ${factuur.nummer}` : 'Factuur'}</p>
                        <span className="rounded-full border border-current px-2 py-0.5 text-xs font-medium"
                          style={{ color: statusKleuren[factuur.status] }}>
                          {factuur.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        {[datumMoneybird(factuur.datum), factuur.omschrijving].filter(Boolean).join(' · ')}
                      </p>
                      {factuur.betaaldOp && (
                        <p className="mt-1 text-xs text-gray-600">Betaald op {datumMoneybird(factuur.betaaldOp)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="tabular">{new Intl.NumberFormat('nl-NL', {
                        style: 'currency', currency: factuur.currency,
                      }).format(factuur.bedragCents / 100)}</p>
                      <p className="text-xs text-gray-600">incl. btw</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function datumMoneybird(datum: string | null) {
  if (!datum) return null
  const parsed = new Date(datum)
  return Number.isNaN(parsed.getTime()) ? null : formatDate(parsed)
}
