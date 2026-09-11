import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listActiveServices } from '@/lib/services'
import { listActivePartners, listContacts } from '@/lib/crm'
import {
  getQuote,
  isEditable,
  allowedTransitions,
  quoteStatusLabels,
  quoteStatusStyles,
  lineKindLabels,
} from '@/lib/quotes'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field } from '@/components/ActionForm'
import { QuoteLineForm } from '@/components/QuoteLineForm'
import { verwijderRegel, zetOfferteStatus } from '../../quote-actions'
import { formatCents } from '@/lib/money'
import { formatQuantity, unitShort } from '@/lib/quantity'
import { formatDate } from '@/lib/dates'
import type { Quote } from '@/db/schema'

/* Wat elke knop in gewone taal betekent. */
const STATUS_KNOPPEN: Record<Quote['status'], string> = {
  draft: 'Terug naar concept',
  awaiting_partner: 'Wacht op partner',
  sent: 'Markeer als verstuurd',
  accepted: 'Klant is akkoord',
  declined: 'Klant wijst af',
  expired: 'Markeer als verlopen',
}

export default async function OffertePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const offerte = await getQuote(id)
  if (!offerte) notFound()

  const { quote, lines, totals } = offerte
  const bewerkbaar = isEditable(quote)

  const [diensten, partners, contactpersonen] = await Promise.all([
    listActiveServices(),
    listActivePartners(),
    listContacts(quote.organizationId),
  ])

  const overgangen = allowedTransitions(quote.status)
  const contact =
    offerte.contactName ??
    contactpersonen.find((c) => c.isPrimary)?.name ??
    null

  return (
    <AppShell user={user} actief="offertes">
      <a href="/beheer/offertes" className="hover:text-jr-blue mb-4 inline-block text-xs text-gray-500">
        &larr; Alle offertes
      </a>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="tabular text-xs text-gray-500">{quote.number}</p>
          <h1 className="text-jr-blue text-2xl">{quote.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            <a
              href={`/beheer/klanten/${offerte.organizationSlug}`}
              className="hover:text-jr-blue"
            >
              {offerte.organizationName}
            </a>
            {contact && <> &middot; t.a.v. {contact}</>}
            {' '}&middot; opgesteld {formatDate(quote.issuedOn)}
            {quote.validUntil && <> &middot; geldig tot {formatDate(quote.validUntil)}</>}
          </p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs ${quoteStatusStyles[quote.status]}`}>
          {quoteStatusLabels[quote.status]}
        </span>
      </div>

      {quote.introText && (
        <p className="mb-6 rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
          {quote.introText}
        </p>
      )}

      {quote.status === 'declined' && quote.declineReason && (
        <p className="border-jr-red bg-jr-red/5 mb-6 rounded border-l-4 p-3 text-sm">
          Afgewezen: {quote.declineReason}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div>
          <section className="mb-6 rounded-xl bg-white shadow-sm">
            <div className="flex items-baseline justify-between px-5 pt-5">
              <h2 className="text-base">Regels</h2>
              {!totals.costComplete && (
                <span className="text-jr-orange text-xs">
                  niet elke regel heeft een kostprijs
                </span>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-600">
                Nog geen regels. Voeg er een toe met het formulier hiernaast.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {lines.map((regel) => (
                  <li key={regel.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm">{regel.description}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {lineKindLabels[regel.kind]}
                          </span>
                          {regel.partnerName && (
                            <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-2 py-0.5 text-xs">
                              {regel.partnerName}
                            </span>
                          )}
                        </div>
                        {regel.detail && (
                          <p className="mt-1 text-xs text-gray-600">{regel.detail}</p>
                        )}
                        <p className="tabular mt-1 text-xs text-gray-500">
                          {formatQuantity(regel.quantityHundredths)} &times;{' '}
                          {formatCents(regel.unitPriceCents)}
                          {regel.unitCostCents !== null ? (
                            <>
                              {' '}&middot; kost {formatCents(regel.totals.costCents)} &middot;{' '}
                              marge {formatCents(regel.totals.marginCents)}
                              {regel.totals.marginPercent !== null &&
                                ` (${regel.totals.marginPercent}%)`}
                            </>
                          ) : (
                            regel.kind !== 'discount' && <> &middot; geen kostprijs bekend</>
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="tabular text-sm">
                          {formatCents(regel.totals.revenueCents)}
                        </span>
                        {bewerkbaar && (
                          <ActionForm
                            action={verwijderRegel}
                            submitLabel="Verwijderen"
                            submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                            resetOnSuccess={false}
                            className=""
                          >
                            <input type="hidden" name="lineId" value={regel.id} />
                            <input type="hidden" name="quoteId" value={quote.id} />
                          </ActionForm>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {lines.length > 0 && (
              <div className="border-t border-gray-200 px-5 py-4">
                <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Subtotaal</dt>
                    <dd className="tabular">{formatCents(totals.subtotalCents)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Btw {quote.vatRatePercent}%</dt>
                    <dd className="tabular">{formatCents(totals.vatCents)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold">
                    <dt>Totaal</dt>
                    <dd className="tabular">{formatCents(totals.totalCents)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>

          {lines.length > 0 && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Wat blijft er hangen</h2>
              <p className="mb-3 text-xs text-gray-500">
                Alleen voor ons. Deze bedragen staan niet op de offerte voor de klant.
              </p>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-gray-600">Inkoop en kosten</dt>
                  <dd className="tabular text-lg">{formatCents(totals.costCents)}</dd>
                  {totals.partnerCostCents > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      waarvan {formatCents(totals.partnerCostCents)} naar partners
                    </p>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-600">Marge</dt>
                  <dd className="tabular text-lg font-bold">
                    {formatCents(totals.marginCents)}
                  </dd>
                  {totals.marginPercent !== null && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {totals.marginPercent}% van de omzet
                    </p>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-600">Betrouwbaarheid</dt>
                  <dd className="text-sm">
                    {totals.costComplete ? (
                      <span className="text-jr-green">elke regel heeft een kostprijs</span>
                    ) : (
                      <span className="text-jr-orange">
                        marge is te rooskleurig zolang er kostprijzen ontbreken
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Status</h2>
            {overgangen.length === 0 ? (
              <p className="text-xs text-gray-600">
                Deze offerte is akkoord en ligt vast. Een gewijzigde afspraak wordt een
                nieuwe offerte.
              </p>
            ) : (
              <div className="space-y-2">
                {overgangen.map((naar) =>
                  naar === 'declined' ? (
                    <ActionForm
                      key={naar}
                      action={zetOfferteStatus}
                      submitLabel={STATUS_KNOPPEN[naar]}
                      submitClassName="border border-gray-300 text-gray-700 hover:bg-gray-50 w-full"
                      resetOnSuccess={false}
                      className="space-y-2 border-t border-gray-100 pt-3"
                    >
                      <input type="hidden" name="quoteId" value={quote.id} />
                      <input type="hidden" name="status" value={naar} />
                      <Field
                        label="Waarom ging het niet door"
                        name="reden"
                        required
                        placeholder="Te duur, koos voor partij X"
                        hint="Kort is genoeg. Het helpt bij het volgende voorstel."
                      />
                    </ActionForm>
                  ) : (
                    <ActionForm
                      key={naar}
                      action={zetOfferteStatus}
                      submitLabel={STATUS_KNOPPEN[naar]}
                      submitClassName={
                        naar === 'accepted'
                          ? 'bg-jr-btn hover:bg-jr-btnhover text-white w-full'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50 w-full'
                      }
                      resetOnSuccess={false}
                      className=""
                    >
                      <input type="hidden" name="quoteId" value={quote.id} />
                      <input type="hidden" name="status" value={naar} />
                    </ActionForm>
                  ),
                )}
              </div>
            )}
          </section>

          {bewerkbaar ? (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base">Regel toevoegen</h2>
              <QuoteLineForm
                quoteId={quote.id}
                diensten={diensten.map((d) => ({
                  id: d.id,
                  name: d.name,
                  unitLabel: unitShort[d.unit],
                  unitPriceCents: d.unitPriceCents,
                  costPriceCents: d.costPriceCents,
                }))}
                partners={partners.map((p) => ({
                  id: p.id,
                  name: p.name,
                  hourlyRateCents: p.hourlyRateCents,
                  dayRateCents: p.dayRateCents,
                }))}
              />
            </section>
          ) : (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Vastgelegd</h2>
              <p className="text-xs text-gray-600">
                {quote.status === 'accepted'
                  ? 'Dit is de afspraak zoals de klant hem heeft goedgekeurd. Hij blijft staan zoals hij is.'
                  : 'Deze offerte ligt bij de klant, dus de regels staan vast. Zet hem terug op concept om er nog iets aan te veranderen.'}
              </p>
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  )
}
