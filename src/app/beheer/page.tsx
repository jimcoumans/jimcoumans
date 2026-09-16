import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { getOverallFigures, getOutstandingInvoices, getFiguresByOrganization } from '@/lib/reports'
import {
  getMonthlyRecurringCents,
  getMonthlyBudgetCents,
  listSubscriptions,
} from '@/lib/billing'
import { listQuotes, getQuoteFigures, quoteStatusLabels, quoteStatusStyles } from '@/lib/quotes'
import { listOrganizations } from '@/lib/admin'
import { komendeVerjaardagen } from '@/lib/verjaardagen'
import { getCockpit } from '@/lib/cockpit'
import { MAANDNAMEN } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { formatDate, formatRelative } from '@/lib/dates'

/** Het dashboard: wat er nu speelt, met de details een klik verder. */
export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const [
    overall,
    mrr,
    maandbudget,
    quoteFigures,
    offertes,
    abonnementen,
    openstaand,
    klanten,
    perKlant,
    cockpit,
  ] = await Promise.all([
      getOverallFigures(),
      getMonthlyRecurringCents(),
      getMonthlyBudgetCents(),
      getQuoteFigures(),
      listQuotes(),
      listSubscriptions(),
      getOutstandingInvoices(),
      listOrganizations(),
      getFiguresByOrganization(),
      getCockpit(),
    ])

  const jarig = await komendeVerjaardagen(7)

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
      <p className="mb-5 text-sm text-gray-600">
        {cockpit.bedrijven} {cockpit.bedrijven === 1 ? 'bedrijf' : 'bedrijven'} in het
        systeem &middot; {cockpit.mensenInCrm} mensen in het CRM
      </p>

      {/* Hoe groot zijn we, in aantallen. De bedragen staan hieronder; dit is
          de andere vraag die je stelt als je binnenkomt. */}
      <section className="mb-7 rounded-xl bg-white px-5 py-4 shadow-sm">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          <Cijfer
            label="Retainerklanten"
            waarde={cockpit.retainerKlanten}
            onder="met lopend abonnement"
          />
          <Cijfer
            label="Projectklanten"
            waarde={cockpit.projectKlanten}
            onder="losse opdrachten"
          />
          <Cijfer
            label="Klanten totaal"
            waarde={cockpit.klanten}
            onder={`${cockpit.oudKlanten} oud-klant${cockpit.oudKlanten === 1 ? '' : 'en'}`}
          />
          <Cijfer
            label="In de pijplijn"
            waarde={cockpit.prospects + cockpit.leads}
            onder={`${cockpit.leads} lead${cockpit.leads === 1 ? '' : 's'} · ${cockpit.prospects} prospect${cockpit.prospects === 1 ? '' : 's'}`}
          />
          <Cijfer label="Collega's" waarde={cockpit.collegas} onder="in dienst" />
          <Cijfer
            label="Partners"
            waarde={cockpit.actievePartners}
            onder="actief"
          />
        </dl>

        {/* Een portaal waar niemand binnenkomt is geen portaal. Dit cijfer
            staat er zolang het niet klopt, en verdwijnt zodra het wel klopt. */}
        {cockpit.klanten > 0 && cockpit.klantenMetToegang < cockpit.klanten && (
          <p className="border-jr-orange mt-4 border-t border-gray-200 pt-3 text-xs text-gray-600">
            <span className="text-jr-orange">
              {cockpit.klantenMetToegang} van de {cockpit.klanten} klanten
            </span>{' '}
            heeft iemand die kan inloggen
            {cockpit.klantgebruikers > 0 &&
              ` · ${cockpit.klantgebruikersIngelogd} van de ${cockpit.klantgebruikers} accounts is ooit binnen geweest`}
            .
          </p>
        )}
      </section>

      {/* De drie cijfers waar het om draait, en ze sluiten op elkaar aan:
          de walletwaarde is wat we per maand aan diensten weggeven, en die
          bestaat uit de omzet die we ervoor factureren plus de korting die we
          erop geven. Per jaar staat erbij omdat je die twee anders niet kunt
          optellen. */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tegel
          label="Walletwaarde per maand"
          waarde={formatCents(maandbudget.budgetCents)}
          onder={<p>{formatCents(maandbudget.budgetCents * 12)} per jaar</p>}
          accent
        />
        <Tegel
          label="Abonnementsomzet per maand"
          waarde={formatCents(mrr)}
          onder={
            <>
              <p>{formatCents(mrr * 12)} per jaar</p>
              {maandbudget.kortingCents > 0 && (
                <p>
                  plus {formatCents(maandbudget.kortingCents)} korting ={' '}
                  {formatCents(maandbudget.budgetCents)} walletwaarde
                </p>
              )}
            </>
          }
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

      {jarig.length > 0 && (
        <section className="mb-8 rounded-xl bg-white shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
            <h2 className="text-base">Jarig deze week</h2>
            <p className="text-xs text-gray-500">
              De eerste bovenaan. Collega&rsquo;s, contactpersonen, partners en hun kinderen.
            </p>
          </div>

          <ul className="divide-y divide-gray-200">
            {jarig.map((v, i) => (
              <li
                key={`${v.soort}-${v.naam}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    {v.href ? (
                      <a href={v.href} className="hover:text-jr-blue">
                        {v.naam}
                      </a>
                    ) : (
                      v.naam
                    )}
                    {v.wordt !== null && (
                      <span className="text-gray-600"> wordt {v.wordt}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    {v.bij}
                    {v.soort === 'collega' && ' · collega'}
                    {v.soort === 'partner' && ' · partner'}
                  </p>
                </div>

                <p
                  className={`text-sm ${
                    v.overDagen === 0 ? 'text-jr-orange font-bold' : 'text-gray-600'
                  }`}
                >
                  {v.overDagen === 0
                    ? 'vandaag'
                    : v.overDagen === 1
                      ? 'morgen'
                      : `over ${v.overDagen} dagen`}
                  <span className="ml-2 text-xs text-gray-500">
                    {v.dag} {MAANDNAMEN[v.maand - 1]}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

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

/**
 * Eén getal uit de cockpit.
 *
 * Bewust kaal: geen kader, geen kleur. Zes gekleurde tegels naast elkaar
 * lezen als een dashboard uit een demo; zes getallen onder elkaar lees je
 * in één blik.
 */
function Cijfer({
  label,
  waarde,
  onder,
}: {
  label: string
  waarde: number
  onder?: string
}) {
  return (
    <div>
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd className="tabular text-jr-blue text-2xl leading-tight font-bold">{waarde}</dd>
      {onder && <p className="text-xs text-gray-500">{onder}</p>}
    </div>
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
  /** Eén of meer regels klein eronder. */
  onder?: React.ReactNode
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
      {onder && <div className="mt-1 space-y-0.5 text-xs text-gray-500">{onder}</div>}
    </div>
  )
}
