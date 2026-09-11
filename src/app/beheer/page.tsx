import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { getOverallFigures, getOutstandingInvoices, getFiguresByOrganization } from '@/lib/reports'
import { getMonthlyRecurringCents, listSubscriptions } from '@/lib/billing'
import { listQuotes, getQuoteFigures, quoteStatusLabels, quoteStatusStyles } from '@/lib/quotes'
import { listOrganizations } from '@/lib/admin'
import { formatCents } from '@/lib/money'
import { formatDate, formatRelative } from '@/lib/dates'

/** Het dashboard: wat er nu speelt, met de details een klik verder. */
export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const [overall, mrr, quoteFigures, offertes, abonnementen, openstaand, klanten, perKlant] =
    await Promise.all([
      getOverallFigures(),
      getMonthlyRecurringCents(),
      getQuoteFigures(),
      listQuotes(),
      listSubscriptions(),
      getOutstandingInvoices(),
      listOrganizations(),
      getFiguresByOrganization(),
    ])

  const openOffertes = offertes.filter(
    (q) => q.status === 'sent' || q.status === 'awaiting_partner',
  )
  const recenteOffertes = offertes.slice(0, 5)

  // Waar aandacht nodig is: dat hoort bovenaan, niet weggestopt.
  const aandacht: { tekst: string; href: string }[] = []

  const negatief = perKlant.filter((k) => k.balanceCents < 0)
  for (const k of negatief) {
    aandacht.push({
      tekst: `${k.organizationName} staat ${formatCents(k.balanceCents)} in de min`,
      href: `/beheer/klanten/${k.organizationSlug}`,
    })
  }

  const zonderGebruiker = klanten.filter((k) => k.clientUserCount === 0)
  for (const k of zonderGebruiker) {
    aandacht.push({
      tekst: `Bij ${k.organization.name} kan nog niemand inloggen`,
      href: `/beheer/klanten/${k.organization.slug}`,
    })
  }

  const wachtOpPartner = offertes.filter((q) => q.status === 'awaiting_partner')
  for (const q of wachtOpPartner) {
    aandacht.push({
      tekst: `${q.number} wacht op een offerte van ${q.partnerNames.join(', ') || 'een partner'}`,
      href: `/beheer/offertes/${q.id}`,
    })
  }

  const teLaat = openstaand.filter((r) => r.invoice.status === 'overdue')
  for (const r of teLaat) {
    aandacht.push({
      tekst: `Factuur ${r.invoice.number} van ${r.organizationName} staat te lang open`,
      href: `/beheer/klanten/${r.organizationSlug}`,
    })
  }

  return (
    <AppShell user={user} actief="dashboard">
      <h1 className="text-jr-blue mb-1 text-2xl">Dashboard</h1>
      <p className="mb-7 text-sm text-gray-600">
        {klanten.length} klanten &middot; {abonnementen.filter((s) => s.subscription.status === 'active').length} lopende abonnementen
      </p>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tegel
          label="Per maand terugkerend"
          waarde={formatCents(mrr)}
          onder="uit lopende abonnementen"
          accent
        />
        <Tegel
          label="Omzet totaal"
          waarde={formatCents(overall.revenueCents)}
          onder={`marge ${formatCents(overall.marginCents)}`}
        />
        <Tegel
          label="Budget bij klanten"
          waarde={formatCents(overall.openBudgetCents)}
          onder="stand van nu"
          waarschuwing={overall.openBudgetCents < 0}
        />
        <Tegel
          label="Offertes open"
          waarde={formatCents(quoteFigures.openValueCents)}
          onder={`${quoteFigures.openCount} ${quoteFigures.openCount === 1 ? 'voorstel' : 'voorstellen'}${
            quoteFigures.winRatePercent !== null ? ` · ${quoteFigures.winRatePercent}% scoort` : ''
          }`}
        />
      </section>

      {aandacht.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg">Vraagt aandacht</h2>
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
            {aandacht.slice(0, 6).map((a, i) => (
              <li key={i}>
                <a
                  href={a.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50 sm:px-6"
                >
                  <span>{a.tekst}</span>
                  <span className="text-jr-blue shrink-0 text-xs">Bekijken &rarr;</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg">Laatste offertes</h2>
            <a href="/beheer/offertes" className="text-jr-blue text-sm hover:underline">
              Alle offertes
            </a>
          </div>

          {recenteOffertes.length === 0 ? (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">
                Nog geen offertes.{' '}
                <a href="/beheer/offertes" className="text-jr-blue hover:underline">
                  Maak je eerste voorstel
                </a>
                .
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
              {recenteOffertes.map((q) => (
                <li key={q.id}>
                  <a
                    href={`/beheer/offertes/${q.id}`}
                    className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {q.title}{' '}
                        <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${quoteStatusStyles[q.status]}`}>
                          {quoteStatusLabels[q.status]}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {q.organizationName} &middot; {q.number}
                        {q.partnerNames.length > 0 && <> &middot; via {q.partnerNames.join(', ')}</>}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-sm">{formatCents(q.totals.subtotalCents)}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg">Openstaande facturen</h2>
            <a href="/beheer/financieel" className="text-jr-blue text-sm hover:underline">
              Financieel
            </a>
          </div>

          {openstaand.length === 0 ? (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">Alles is betaald.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
              {openstaand.slice(0, 5).map((r) => (
                <li key={r.invoice.id}>
                  <a
                    href={`/beheer/klanten/${r.organizationSlug}`}
                    className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">{r.organizationName}</p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {r.invoice.number} &middot; {formatDate(r.invoice.issuedOn)}
                        {r.invoice.status === 'overdue' && (
                          <span className="text-jr-red"> &middot; te laat</span>
                        )}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-sm">
                      {formatCents(r.invoice.amountExclVatCents)}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function Tegel({
  label,
  waarde,
  onder,
  accent = false,
  waarschuwing = false,
}: {
  label: string
  waarde: string
  onder?: string
  accent?: boolean
  waarschuwing?: boolean
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-600">{label}</p>
      <p
        className={`tabular mt-1 text-2xl font-bold ${
          waarschuwing ? 'text-jr-red' : accent ? 'text-jr-blue' : 'text-jr-black'
        }`}
      >
        {waarde}
      </p>
      {onder && <p className="mt-1 text-xs text-gray-500">{onder}</p>}
    </div>
  )
}
