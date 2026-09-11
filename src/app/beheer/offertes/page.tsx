import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listOrganizations } from '@/lib/admin'
import { listActivePartners } from '@/lib/crm'
import {
  listQuotes,
  getQuoteFigures,
  quoteStatusLabels,
  quoteStatusStyles,
} from '@/lib/quotes'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { nieuweOfferte } from '../quote-actions'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import type { Quote } from '@/db/schema'

/* De volgorde waarin je offertes wilt zien: eerst wat aandacht vraagt. */
const GROEPEN: { status: Quote['status']; uitleg: string }[] = [
  { status: 'awaiting_partner', uitleg: 'Wachten op een prijs van de partner voordat ze de deur uit kunnen.' },
  { status: 'sent', uitleg: 'Liggen bij de klant.' },
  { status: 'draft', uitleg: 'Nog niet verstuurd.' },
  { status: 'accepted', uitleg: 'Akkoord: dit zijn de opdrachten.' },
  { status: 'declined', uitleg: 'Niet doorgegaan.' },
  { status: 'expired', uitleg: 'Verlopen zonder reactie.' },
]

export default async function OffertesPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  // Filteren op partner, zodat je vanuit het partneroverzicht meteen ziet
  // welke voorstellen daarachter zitten.
  const { partner: partnerId } = await searchParams
  const [alle, cijfers, klanten, partners] = await Promise.all([
    listQuotes(partnerId ? { partnerId } : {}),
    getQuoteFigures(),
    listOrganizations(),
    listActivePartners(),
  ])

  const gefilterdePartner = partnerId ? partners.find((p) => p.id === partnerId) : undefined

  return (
    <AppShell user={user} actief="offertes">
      <h1 className="text-jr-blue mb-1 text-2xl">Offertes</h1>
      <p className="mb-6 text-sm text-gray-600">
        Voorstellen op basis van eigen diensten en werk dat via een partner loopt. De
        marge per regel zie jij; de klant ziet alleen wat hij betaalt.
      </p>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-600">Open bij klanten</p>
          <p className="tabular mt-1 text-3xl font-bold">{formatCents(cijfers.openValueCents)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {cijfers.openCount} {cijfers.openCount === 1 ? 'offerte' : 'offertes'} onderweg
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-600">Akkoord gekregen</p>
          <p className="tabular mt-1 text-2xl font-bold">
            {formatCents(cijfers.acceptedValueCents)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            waarvan {formatCents(cijfers.acceptedMarginCents)} marge
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-600">Scoringspercentage</p>
          <p className="tabular mt-1 text-2xl font-bold">
            {cijfers.winRatePercent === null ? '—' : `${cijfers.winRatePercent}%`}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {cijfers.winRatePercent === null
              ? 'nog niets beslist'
              : `${cijfers.acceptedCount} van ${cijfers.totalCount} voorstellen`}
          </p>
        </div>
      </section>

      {partnerId && (
        <p className="bg-jr-lightblue mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-sm">
          <span>
            Alleen offertes waarin{' '}
            {gefilterdePartner ? gefilterdePartner.name : 'deze partner'} werk uitvoert.
          </span>
          <a href="/beheer/offertes" className="text-jr-deepblue text-xs underline">
            filter weghalen
          </a>
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div>
          {alle.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-600">
                {partnerId
                  ? 'Nog geen offertes met werk van deze partner.'
                  : 'Nog geen offertes. Maak er een aan met het formulier hiernaast.'}
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {GROEPEN.map(({ status, uitleg }) => {
                const groep = alle.filter((q) => q.status === status)
                if (groep.length === 0) return null

                return (
                  <section key={status}>
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                      <h2 className="text-base">{quoteStatusLabels[status]}</h2>
                      <span className="text-xs text-gray-500">{uitleg}</span>
                    </div>

                    <ul className="space-y-2">
                      {groep.map((q) => (
                        <li key={q.id}>
                          <a
                            href={`/beheer/offertes/${q.id}`}
                            className="hover:border-jr-blue block rounded-xl border border-transparent bg-white p-4 shadow-sm transition-colors"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="tabular text-xs text-gray-500">{q.number}</span>
                                  <span className="text-sm">{q.title}</span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs ${quoteStatusStyles[q.status]}`}
                                  >
                                    {quoteStatusLabels[q.status]}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-600">
                                  {q.organizationName} &middot; {formatDate(q.issuedOn)}
                                  {q.partnerNames.length > 0 && (
                                    <> &middot; via {q.partnerNames.join(', ')}</>
                                  )}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <p className="tabular text-base">
                                  {formatCents(q.totals.subtotalCents)}
                                </p>
                                <p className="tabular text-xs text-gray-500">
                                  {q.totals.lineCount === 0
                                    ? 'nog geen regels'
                                    : `marge ${formatCents(q.totals.marginCents)}${
                                        q.totals.costComplete ? '' : ' (onvolledig)'
                                      }`}
                                </p>
                              </div>
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        <aside className="rounded-xl bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:self-start">
          <h2 className="mb-1 text-base">Nieuwe offerte</h2>
          <p className="mb-3 text-xs text-gray-500">
            Je maakt hem hier aan en voegt daarna de regels toe.
          </p>
          {klanten.length === 0 ? (
            <p className="text-sm text-gray-600">
              Maak eerst een klant aan; een offerte hoort altijd bij een bedrijf.
            </p>
          ) : (
            <ActionForm action={nieuweOfferte} submitLabel="Offerte aanmaken">
              <Select
                label="Klant"
                name="organizationId"
                options={klanten.map((k) => ({
                  value: k.organization.id,
                  label: k.organization.name,
                }))}
              />
              <Field
                label="Titel"
                name="titel"
                required
                placeholder="Training contentmarketing"
              />
              <Field
                label="Geldig tot"
                name="geldigTot"
                type="date"
                hint="Leeg laten mag; dan staat er geen einddatum op."
              />
              <Field
                label="Inleiding"
                name="intro"
                placeholder="Naar aanleiding van ons gesprek…"
              />
            </ActionForm>
          )}
        </aside>
      </div>
    </AppShell>
  )
}
