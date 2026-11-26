import type { PortaalMoneybirdFacturen } from '@/lib/moneybird/facturen'
import { formatDate } from '@/lib/dates'
import type { MoneybirdFactuurStatus } from '@/lib/moneybird/client'
import { zetMoneybirdRetainerIndeling } from '@/app/beheer/moneybird-factuur-actions'
import { ActionForm } from './ActionForm'

const statusKleuren: Partial<Record<MoneybirdFactuurStatus, string>> = {
  Betaald: '#2B8272',
  Verlopen: '#EC0001',
  Verstuurd: '#9E6900',
  Herinnerd: '#44403C',
}

export function MoneybirdFacturen({ gegevens, beheerKlantId }: {
  gegevens: PortaalMoneybirdFacturen
  beheerKlantId?: string
}) {
  if (!gegevens.ok) return <p role="status">Moneybird-facturen zijn tijdelijk niet beschikbaar.</p>
  const groepen = [
    { titel: 'Retainerfacturen', uitleg: 'Facturen die bij het Marketing Partnership horen.', retainer: true },
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
                      <p className="tabular">{formatBedrag(factuur.bedragExclCents, factuur.currency)} <span className="text-xs text-gray-600">excl. btw</span></p>
                      <p className="tabular text-xs text-gray-600">{formatBedrag(factuur.bedragInclCents, factuur.currency)} incl. btw</p>
                      {beheerKlantId && (!factuur.retainer || factuur.kanHandmatigeIndelingTerugdraaien) && (
                        <ActionForm action={zetMoneybirdRetainerIndeling}
                          submitLabel={factuur.retainer ? 'Terug naar overige facturen' : 'Markeer als retainerfactuur'}
                          submitClassName="!min-h-0 !p-0 text-xs text-jr-link hover:underline"
                          className="mt-2" resetOnSuccess={false} meldGelukt={false}>
                          <input type="hidden" name="organizationId" value={beheerKlantId} />
                          <input type="hidden" name="factuurId" value={factuur.id} />
                          <input type="hidden" name="indeling" value={factuur.retainer ? 'standaard' : 'retainer'} />
                        </ActionForm>
                      )}
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


function formatBedrag(centen: number, currency: string) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(centen / 100)
}
