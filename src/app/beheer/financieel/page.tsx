import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  getOverallFigures,
  getFiguresByOrganization,
  getFiguresByEmployee,
  getFiguresByService,
  getFiguresByMonth,
  getOutstandingInvoices,
  type Periode,
} from '@/lib/reports'
import { Header } from '@/components/Header'
import { formatCents } from '@/lib/money'
import { formatQuantity } from '@/lib/quantity'
import { formatDate, formatMonth } from '@/lib/dates'
import { CATEGORY_COLORS } from '@/lib/chart-colors'
import { getMonthlyRecurringCents } from '@/lib/billing'

/** Financieel overzicht: overall, per klant, per medewerker, per dienst. */
export default async function FinancieelPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const params = await searchParams
  const gekozen = params.periode ?? 'alles'
  const periode = periodeUit(gekozen)

  const [overall, perKlant, perMedewerker, perDienst, perMaand, openstaand, mrr] =
    await Promise.all([
      getOverallFigures(periode),
      getFiguresByOrganization(periode),
      getFiguresByEmployee(periode),
      getFiguresByService(periode),
      getFiguresByMonth(12),
      getOutstandingInvoices(),
      getMonthlyRecurringCents(),
    ])

  const openstaandTotaal = openstaand.reduce(
    (acc, r) => acc + r.invoice.amountExclVatCents + r.invoice.vatCents,
    0,
  )

  return (
    <>
      <Header user={user} actief="financieel" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-jr-blue mb-1 text-2xl">Financieel overzicht</h1>
        <p className="mb-6 text-sm text-gray-600">
          Omzet is wat er aan diensten is geleverd. Teruggedraaide boekingen zitten er
          niet in.
        </p>

        {/* Periodefilter in een rij boven de cijfers. */}
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Periode">
          {PERIODES.map((p) => (
            <a
              key={p.key}
              href={`/beheer/financieel?periode=${p.key}`}
              aria-current={gekozen === p.key ? 'true' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                gekozen === p.key
                  ? 'bg-jr-blue text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </a>
          ))}
        </nav>

        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTegel
            label="Per maand terugkerend"
            waarde={formatCents(mrr)}
            toelichting="uit lopende abonnementen, stand van nu"
            groot
          />
          <StatTegel
            label="Omzet"
            waarde={formatCents(overall.revenueCents)}
            toelichting={`${overall.bookingCount} ${
              overall.bookingCount === 1 ? 'boeking' : 'boekingen'
            }`}
            groot
          />
          <StatTegel
            label="Marge"
            waarde={formatCents(overall.marginCents)}
            toelichting={
              overall.costCents === 0
                ? 'geen kostprijzen ingevuld'
                : `kosten ${formatCents(overall.costCents)}`
            }
          />
          <StatTegel
            label="Gefactureerd budget"
            waarde={formatCents(overall.toppedUpCents)}
            toelichting="exclusief btw"
          />
          <StatTegel
            label="Nog beschikbaar bij klanten"
            waarde={formatCents(overall.openBudgetCents)}
            toelichting="stand van nu, los van de periode"
            waarschuwing={overall.openBudgetCents < 0}
          />
        </section>

        {openstaand.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg">Openstaande facturen</h2>
            <p className="mb-3 text-sm text-gray-600">
              {formatCents(openstaandTotaal)} incl. btw gefactureerd en nog niet betaald.
              Dit budget is wel al beschikbaar voor de klant.
            </p>
            <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
              {openstaand.slice(0, 10).map((r) => (
                <li
                  key={r.invoice.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
                >
                  <div className="min-w-0">
                    <a
                      href={`/beheer/${r.organizationSlug}`}
                      className="hover:text-jr-blue text-sm"
                    >
                      {r.organizationName}
                    </a>
                    <p className="text-xs text-gray-600">
                      {r.invoice.number} &middot; {formatDate(r.invoice.issuedOn)}
                      {r.invoice.status === 'overdue' && (
                        <span className="text-jr-red"> &middot; te laat</span>
                      )}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-sm">
                    {formatCents(r.invoice.amountExclVatCents)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {perMaand.length > 1 && <MaandTrend perMaand={perMaand} />}

        <RankingTabel
          titel="Per klant"
          toelichting="Omzet uit geleverde diensten, en wat er nog aan budget staat."
          kolommen={['Omzet', 'Marge', 'Budget over']}
          rijen={perKlant.map((k) => ({
            key: k.organizationId,
            naam: k.organizationName,
            href: `/beheer/${k.organizationSlug}`,
            onder: `${k.bookingCount} ${k.bookingCount === 1 ? 'boeking' : 'boekingen'}`,
            hoofdwaarde: k.revenueCents,
            waarden: [
              formatCents(k.revenueCents),
              k.costCents === 0 ? '—' : formatCents(k.marginCents),
              formatCents(k.balanceCents),
            ],
            waarschuwing: k.balanceCents < 0,
          }))}
        />

        <RankingTabel
          titel="Per medewerker"
          toelichting="Op basis van wie de dienst heeft geleverd, niet wie de boeking invoerde."
          kolommen={['Omzet', 'Marge', 'Klanten']}
          rijen={perMedewerker.map((m) => ({
            key: m.userId,
            naam: m.name,
            onder: `${m.bookingCount} ${m.bookingCount === 1 ? 'boeking' : 'boekingen'}`,
            hoofdwaarde: m.revenueCents,
            waarden: [
              formatCents(m.revenueCents),
              m.costCents === 0 ? '—' : formatCents(m.marginCents),
              String(m.clientCount),
            ],
          }))}
          leegTekst="Nog geen boekingen met een medewerker erbij. Vul bij het boeken in wie de dienst leverde."
        />

        <RankingTabel
          titel="Per dienst"
          toelichting="Welke producten leveren wat op."
          kolommen={['Omzet', 'Marge', 'Aantal']}
          rijen={perDienst.map((d) => ({
            key: d.serviceId,
            naam: d.name,
            onder: d.category ?? undefined,
            hoofdwaarde: d.revenueCents,
            waarden: [
              formatCents(d.revenueCents),
              d.costCents === 0 ? '—' : formatCents(d.marginCents),
              formatQuantity(d.quantityHundredths),
            ],
          }))}
          leegTekst="Nog geen diensten geboekt."
        />
      </main>
    </>
  )
}

const PERIODES = [
  { key: 'maand', label: 'Deze maand' },
  { key: 'kwartaal', label: 'Dit kwartaal' },
  { key: 'jaar', label: 'Dit jaar' },
  { key: 'alles', label: 'Alles' },
] as const

function periodeUit(key: string): Periode {
  const nu = new Date()
  switch (key) {
    case 'maand':
      return { from: new Date(nu.getFullYear(), nu.getMonth(), 1) }
    case 'kwartaal':
      return { from: new Date(nu.getFullYear(), Math.floor(nu.getMonth() / 3) * 3, 1) }
    case 'jaar':
      return { from: new Date(nu.getFullYear(), 0, 1) }
    default:
      return {}
  }
}

/**
 * Een kerncijfer. Bewust geen grafiek: een enkel getal leest sneller als
 * getal dan als balkje.
 */
function StatTegel({
  label,
  waarde,
  toelichting,
  groot = false,
  waarschuwing = false,
}: {
  label: string
  waarde: string
  toelichting?: string
  groot?: boolean
  waarschuwing?: boolean
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-600">{label}</p>
      <p
        className={`tabular mt-1 font-bold ${groot ? 'text-3xl' : 'text-2xl'} ${
          waarschuwing ? 'text-jr-red' : 'text-jr-black'
        }`}
      >
        {waarde}
      </p>
      {toelichting && <p className="mt-1 text-xs text-gray-500">{toelichting}</p>}
    </div>
  )
}

/**
 * Omzet en gefactureerd budget per maand.
 *
 * Twee series op EEN as: beide zijn euro's, dus ze zijn direct te
 * vergelijken. Een tweede y-as zou de verhouding tussen de twee laten
 * liegen. De legenda staat er altijd bij, dus identiteit hangt niet aan
 * kleur alleen.
 */
function MaandTrend({
  perMaand,
}: {
  perMaand: { month: Date; revenueCents: number; toppedUpCents: number }[]
}) {
  const max = Math.max(
    ...perMaand.map((m) => Math.max(m.revenueCents, m.toppedUpCents)),
    1,
  )

  const omzetKleur = CATEGORY_COLORS[0]
  const budgetKleur = CATEGORY_COLORS[1]

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">Per maand</h2>
        <div className="flex gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: omzetKleur }}
              aria-hidden
            />
            Omzet
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: budgetKleur }}
              aria-hidden
            />
            Gefactureerd
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
        {/* De kolom moet h-full krijgen en het balkenvak flex-1 met min-h-0.
            Zonder die twee heeft het balkenvak hoogte auto, en dan wordt een
            hoogte in procenten nul: de balken renderen dan onzichtbaar. */}
        <div className="flex min-w-[520px] items-end gap-3" style={{ height: '180px' }}>
          {perMaand.map((m) => (
            <div
              key={m.month.toISOString()}
              className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t"
                  style={{
                    height: `${Math.max((m.revenueCents / max) * 100, m.revenueCents > 0 ? 2 : 0)}%`,
                    backgroundColor: omzetKleur,
                  }}
                  title={`Omzet ${formatMonth(m.month)}: ${formatCents(m.revenueCents)}`}
                />
                <div
                  className="w-3 rounded-t"
                  style={{
                    height: `${Math.max((m.toppedUpCents / max) * 100, m.toppedUpCents > 0 ? 2 : 0)}%`,
                    backgroundColor: budgetKleur,
                  }}
                  title={`Gefactureerd ${formatMonth(m.month)}: ${formatCents(m.toppedUpCents)}`}
                />
              </div>
              <span className="truncate text-xs text-gray-500">
                {m.month.toLocaleDateString('nl-NL', { month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* De tabel is de toegankelijke versie van dezelfde cijfers. */}
      <details className="mt-2">
        <summary className="text-jr-blue cursor-pointer text-xs">
          Als tabel bekijken
        </summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-600">
              <th className="py-1 font-normal">Maand</th>
              <th className="py-1 text-right font-normal">Omzet</th>
              <th className="py-1 text-right font-normal">Gefactureerd</th>
            </tr>
          </thead>
          <tbody>
            {perMaand.map((m) => (
              <tr key={m.month.toISOString()} className="border-t border-gray-200">
                <td className="py-1.5">{formatMonth(m.month)}</td>
                <td className="tabular py-1.5 text-right">{formatCents(m.revenueCents)}</td>
                <td className="tabular py-1.5 text-right">
                  {formatCents(m.toppedUpCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

type RankingRij = {
  key: string
  naam: string
  href?: string
  onder?: string
  /** Bepaalt de lengte van de balk. */
  hoofdwaarde: number
  waarden: string[]
  waarschuwing?: boolean
}

/**
 * Ranglijst met een balk achter de naam. Een tabel met een subtiele balk
 * leest hier beter dan een grafiek: de bedragen moeten exact leesbaar zijn
 * en de namen zijn lang.
 */
function RankingTabel({
  titel,
  toelichting,
  kolommen,
  rijen,
  leegTekst = 'Nog geen gegevens.',
}: {
  titel: string
  toelichting?: string
  kolommen: string[]
  rijen: RankingRij[]
  leegTekst?: string
}) {
  const max = Math.max(...rijen.map((r) => r.hoofdwaarde), 1)

  return (
    <section className="mb-10">
      <h2 className="mb-1 text-lg">{titel}</h2>
      {toelichting && <p className="mb-3 text-sm text-gray-600">{toelichting}</p>}

      {rijen.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">{leegTekst}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                <th className="px-4 py-2.5 font-normal sm:px-6">Naam</th>
                {kolommen.map((k) => (
                  <th key={k} className="px-3 py-2.5 text-right font-normal">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rijen.map((rij) => (
                <tr key={rij.key} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 sm:px-6">
                    <div className="min-w-0">
                      {rij.href ? (
                        <a href={rij.href} className="hover:text-jr-blue">
                          {rij.naam}
                        </a>
                      ) : (
                        <span>{rij.naam}</span>
                      )}
                      {rij.onder && (
                        <p className="text-xs text-gray-500">{rij.onder}</p>
                      )}
                      <div
                        className="mt-1.5 h-1 rounded-full"
                        style={{
                          width: `${Math.max((rij.hoofdwaarde / max) * 100, 1)}%`,
                          backgroundColor: CATEGORY_COLORS[0],
                        }}
                        aria-hidden
                      />
                    </div>
                  </td>
                  {rij.waarden.map((waarde, i) => (
                    <td
                      key={i}
                      className={`tabular px-3 py-3 text-right whitespace-nowrap ${
                        i === rij.waarden.length - 1 && rij.waarschuwing
                          ? 'text-jr-red'
                          : ''
                      }`}
                    >
                      {waarde}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
