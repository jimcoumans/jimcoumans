import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getMyRequest } from '@/lib/domain/requests'
import { summarizeBookings } from '@/lib/domain/bookings'
import { DomainError } from '@/lib/errors'
import { ActionForm } from '@/components/ActionForm'
import { Badge, Notice } from '@/components/ui'
import { RequestStatus } from '@/components/RequestStatus'
import { approveAction, cancelBookingAction, feedbackAction, memberMessageAction } from '@/app/actions/member'
import { formatMoney } from '@/lib/money'
import { formatDate, formatDateTime, nowMs } from '@/lib/time'
import { AVAILABILITY_LABEL, BOOKING_LABEL, CATEGORY_LABEL, PAYMENT_ROUTE_LABEL } from '@/lib/labels'

export default async function RequestDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nieuw?: string }> }) {
  const { id } = await params
  const { nieuw } = await searchParams
  const { actor } = await requireUser()
  let data
  try { data = await getMyRequest(actor, id) } catch (e) { if (e instanceof DomainError) notFound(); throw e }
  const { request: r, messages, proposals, bookings } = data
  const now = nowMs()
  const current = proposals.find((p) => p.status === 'issued' && p.expiresAt && new Date(p.expiresAt).getTime() > now)
  const accepted = proposals.find((p) => p.status === 'accepted')
  const summary = summarizeBookings(bookings)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="min-w-0">
        <Link href="/app/requests" className="text-sm text-muted hover:text-forest">← Verzoeken</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-[34px] leading-tight">{r.title ?? 'Uw verzoek'}</h1><RequestStatus status={r.status} /></div>
        {nieuw && <div className="mt-4"><Notice tone="ok" title="Ontvangen">Uw verzoek is opgeslagen. We kijken ernaar en laten weten wat we nog nodig hebben.</Notice></div>}
        <p className="mt-4 whitespace-pre-line rounded-xl bg-surface p-4 text-[15px] leading-relaxed">{r.brief}</p>
        <p className="mt-2 text-sm text-muted">
          {[r.category && CATEGORY_LABEL[r.category], r.desiredDate && `voor ${formatDate(r.desiredDate)}`, r.desiredTime, r.partySize && `${r.partySize} pers.`, r.location,
            r.budgetMinor != null && `budget ${formatMoney(r.budgetMinor)} ${r.budgetBasis === 'per_person' ? 'p.p.' : 'totaal'}`].filter(Boolean).join(' · ')}
        </p>
        {r.statusNote && ['needs_info', 'rejected', 'cancelled'].includes(r.status) && <div className="mt-4"><Notice tone="warn">{r.statusNote}</Notice></div>}

        {current && (
          <section className="mt-8">
            <h2 className="text-[28px]">Voorstel · versie {current.version}</h2>
            <p className="text-sm text-muted">Geldig tot {formatDateTime(current.expiresAt)}. Kies één optie. Uw akkoord geldt alleen voor die optie en deze versie.</p>
            {current.intro && <p className="mt-3 whitespace-pre-line text-[15px]">{current.intro}</p>}
            <div className="mt-4 space-y-4">
              {current.options.map((o) => (
                <article key={o.id} className="card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="eyebrow">Optie {o.position}</p><h3 className="mt-1 text-[24px]">{o.label}</h3>{o.supplierName && <p className="text-sm text-muted">{o.supplierName}</p>}</div>
                    <div className="text-right">
                      <p className="text-[22px] font-medium">{formatMoney(o.totalMinor, o.currency)}</p>
                      <p className="text-[13px] text-muted">{o.priceKind === 'fixed' ? 'Vaste prijs' : `Raming · maximaal ${formatMoney(o.maxMinor, o.currency)}`}</p>
                    </div>
                  </div>
                  {o.description && <p className="mt-3 whitespace-pre-line text-[15px]">{o.description}</p>}
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[150px_1fr]">
                    {o.included && <><dt className="text-muted">Inbegrepen</dt><dd>{o.included}</dd></>}
                    {o.excluded && <><dt className="text-muted">Niet inbegrepen</dt><dd>{o.excluded}</dd></>}
                    <dt className="text-muted">Betaling</dt><dd>{PAYMENT_ROUTE_LABEL[o.paymentRoute]}{o.taxNote ? ` · ${o.taxNote}` : ''}</dd>
                    <dt className="text-muted">Annuleren</dt><dd>{o.cancellationTerms}</dd>
                    <dt className="text-muted">Beschikbaarheid</dt><dd>{AVAILABILITY_LABEL[o.availabilityStatus]}</dd>
                  </dl>
                  <ActionForm action={approveAction} submitLabel="Kies deze optie" pendingLabel="Akkoord vastleggen…">
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="proposalId" value={current.id} />
                    <input type="hidden" name="optionId" value={o.id} />
                    <input type="hidden" name="snapshotHash" value={current.snapshotHash ?? ''} />
                    <label className="mt-4 flex items-start gap-3 rounded-lg bg-canvas p-3 text-[15px]">
                      <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 accent-forest" />
                      <span>Ik ga akkoord met {o.priceKind === 'fixed' ? <>een totaalbedrag van <strong>{formatMoney(o.totalMinor, o.currency)}</strong></> : <>een geraamd bedrag van {formatMoney(o.totalMinor, o.currency)} tot <strong>maximaal {formatMoney(o.maxMinor, o.currency)}</strong></>} en de voorwaarden van deze optie.</span>
                    </label>
                  </ActionForm>
                </article>
              ))}
            </div>
          </section>
        )}

        {accepted && accepted.approval && (
          <section className="card mt-8">
            {r.status === 'arranging' && <div className="mb-4"><Notice tone="forest">Dank u. Uw akkoord is vastgelegd. We regelen het nu en bevestigen zodra de leverancier heeft bevestigd.</Notice></div>}
            <h2 className="text-[24px]">Uw akkoord</h2>
            {(() => { const o = accepted.options.find((x) => x.id === accepted.approval!.optionId); return o ? (
              <p className="mt-2 text-[15px]">{o.label}{o.supplierName ? ` — ${o.supplierName}` : ''} · {o.priceKind === 'fixed' ? formatMoney(accepted.approval.acceptedTotalMinor) : `raming ${formatMoney(accepted.approval.acceptedTotalMinor)}, max. ${formatMoney(accepted.approval.acceptedMaxMinor)}`} · vastgelegd {formatDateTime(accepted.approval.createdAt)} (versie {accepted.version})</p>
            ) : null })()}
          </section>
        )}

        {bookings.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[28px]">Boeking</h2>
            <div className="mt-2">
              {summary === 'all_confirmed' && <Notice tone="ok" title="Alles bevestigd">Alle onderdelen zijn door de leveranciers bevestigd.</Notice>}
              {summary === 'partial' && <Notice tone="warn" title="Gedeeltelijk bevestigd">Nog niet alle onderdelen zijn bevestigd. We houden u op de hoogte.</Notice>}
              {summary === 'pending' && <Notice tone="neutral" title="Wordt geregeld">We stemmen af met de leverancier. U ziet hier een bevestiging zodra die binnen is.</Notice>}
            </div>
            <ul className="mt-4 space-y-3">
              {bookings.map((b) => (
                <li key={b.id} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-medium">{b.title}</p><p className="text-sm text-muted">{b.supplierName}{b.startsAt ? ` · ${formatDateTime(b.startsAt, b.timezone)}` : ''}</p></div>
                    <Badge tone={b.status === 'confirmed' ? 'ok' : b.status === 'cancelled' ? 'neutral' : b.status === 'failed' ? 'danger' : 'warn'}>{BOOKING_LABEL[b.status]}{b.status !== 'cancelled' && b.status !== 'cancellation_requested' && b.cancellationRequestedAt ? ' · annulering aangevraagd' : ''}</Badge>
                  </div>
                  {b.status !== 'pending' && b.status !== 'requested' && b.supplierReference && <p className="mt-2 text-sm">Referentie: {b.supplierReference}</p>}
                  {b.memberDetails && <p className="mt-2 whitespace-pre-line text-sm">{b.memberDetails}</p>}
                  {b.emergencyContact && b.status === 'confirmed' && <p className="mt-2 text-sm text-muted">Contact tijdens de afspraak: {b.emergencyContact}</p>}
                  {b.terms && <p className="mt-2 text-sm text-muted">Voorwaarden: {b.terms}</p>}
                  {['pending', 'requested', 'confirmed'].includes(b.status) && !b.cancellationRequestedAt && (
                    <ActionForm action={cancelBookingAction} submitLabel="Annulering aanvragen" submitClassName="btn-quiet text-sm" confirm="Annulering aanvragen? De voorwaarden van de leverancier blijven bepalend voor eventuele kosten.">
                      <input type="hidden" name="bookingId" value={b.id} /><input type="hidden" name="requestId" value={r.id} />
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {['confirmed', 'completed', 'closed'].includes(r.status) && !r.feedbackRating && (
          <section className="card mt-8">
            <h2 className="text-[22px]">Hoe was het?</h2>
            <ActionForm action={feedbackAction} submitLabel="Feedback versturen">
              <input type="hidden" name="requestId" value={r.id} />
              <fieldset className="mt-3"><legend className="label">Uw oordeel</legend>
                <div className="flex gap-3">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="flex items-center gap-1.5 text-[15px]"><input type="radio" name="rating" value={n} required className="h-5 w-5 accent-forest" />{n}</label>)}</div>
              </fieldset>
              <label className="label mt-3" htmlFor="text">Wat moeten we onthouden?</label>
              <textarea className="field" id="text" name="text" maxLength={2000} />
            </ActionForm>
          </section>
        )}
      </div>

      <aside className="min-w-0">
        <section className="card lg:sticky lg:top-6">
          <h2 className="mb-3 text-[22px]">Berichten</h2>
          {messages.length === 0 ? <p className="text-sm text-muted">Nog geen berichten.</p> : (
            <ol className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {messages.map((m) => (
                <li key={m.id} className={`rounded-xl px-3.5 py-2.5 text-[15px] ${m.senderType === 'member' ? 'ml-6 bg-forest-soft' : m.senderType === 'system' ? 'bg-canvas text-muted' : 'mr-6 bg-canvas'}`}>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className="mt-1 text-[12px] text-muted">{m.senderType === 'member' ? 'U' : m.senderType === 'system' ? 'Systeem' : m.authorName ?? 'James & Co.'} · {formatDateTime(m.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
          {!['closed', 'rejected', 'cancelled'].includes(r.status) && (
            <ActionForm action={memberMessageAction} idempotent resetOnSuccess submitLabel="Versturen" pendingLabel="Versturen…">
              <input type="hidden" name="requestId" value={r.id} />
              <label className="sr-only" htmlFor="body">Bericht</label>
              <textarea className="field mt-4 min-h-[90px]" id="body" name="body" required maxLength={10000} placeholder="Uw bericht" />
            </ActionForm>
          )}
        </section>
      </aside>
    </div>
  )
}
