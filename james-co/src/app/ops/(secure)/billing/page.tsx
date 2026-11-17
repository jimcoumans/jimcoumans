import { requireAdmin } from '@/lib/auth/session'
import { listBilling } from '@/lib/domain/billing'
import { withActor } from '@/lib/db'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle, Section, Badge, EmptyState, Notice } from '@/components/ui'
import { activateAction, billingAction, paymentAction, voidBillingAction } from '@/app/actions/staff'
import { BILLING_STATE_LABEL } from '@/lib/labels'
import { formatMoney } from '@/lib/money'
import { formatDate, formatDateTime } from '@/lib/time'

function nowLocal() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(' ', 'T')
}

export default async function Billing() {
  const { actor } = await requireAdmin()
  const pending = await withActor(actor, (tx) => tx<{ id: string; userId: string; fullName: string | null; planSnapshot: { priceMinor?: number; taxRateBp?: number; priceIncludesTax?: boolean; billingPeriod?: string } | null; acceptedAt: Date | null }[]>`
    select m.id, m.user_id, p.full_name, m.plan_snapshot, m.accepted_at from memberships m join profiles p on p.id = m.user_id where m.status = 'accepted_pending_payment' order by m.accepted_at`)
  const bills = await listBilling(actor)
  const recent = await withActor(actor, (tx) => tx<{ fullName: string | null; activatedAt: Date; isComplimentary: boolean }[]>`
    select p.full_name, m.activated_at, m.is_complimentary from memberships m join profiles p on p.id = m.user_id
    where m.activated_at > now() - interval '1 hour' order by m.activated_at desc limit 5`)
  return (
    <>
      <PageTitle title="Facturatie">Handmatige registratie (V1). Online betalen is nog niet ingericht. Elke ontvangst heeft een referentie en blijft als handmatig herkenbaar. Correcties zijn nieuwe regels, niets wordt overschreven.</PageTitle>
      {recent.length > 0 && (
        <div className="mb-5"><Notice tone="ok" title="Recent geactiveerd">
          <ul>{recent.map((r) => <li key={`${r.fullName}-${r.activatedAt.toISOString()}`}>Lidmaatschap geactiveerd: {r.fullName} · {formatDateTime(r.activatedAt)}{r.isComplimentary ? ' · zonder kosten' : ''}</li>)}</ul>
        </Notice></div>
      )}
      <Section title="Wacht op betaling en activatie">
        {pending.length === 0 ? <p className="text-sm text-muted">Geen geaccepteerde aanbiedingen die wachten.</p> : (
          <ul className="space-y-4">{pending.map((m) => {
            const plan = m.planSnapshot ?? {}
            return (
              <li key={m.id} className="rounded-xl border border-line p-4">
                <p className="font-medium">{m.fullName} · geaccepteerd {formatDateTime(m.acceptedAt)}</p>
                <p className="text-sm text-muted">Aanbod: {formatMoney(plan.priceMinor ?? 0)} {plan.priceIncludesTax ? 'incl.' : 'excl.'} {(plan.taxRateBp ?? 0) / 100}% btw</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <ActionForm action={billingAction} submitLabel="Factuurrecord maken" submitClassName="btn-secondary">
                    <input type="hidden" name="memberId" value={m.userId} /><input type="hidden" name="membershipId" value={m.id} /><input type="hidden" name="kind" value="membership" />
                    <input type="hidden" name="includesTax" value={plan.priceIncludesTax ? 'true' : 'false'} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="field col-span-2" name="description" required defaultValue="Lidmaatschap James & Co. — eerste periode" aria-label="Omschrijving" />
                      <input className="field" name="amount" required defaultValue={((plan.priceMinor ?? 0) / 100).toFixed(2).replace('.', ',')} aria-label="Bedrag" />
                      <input className="field" name="taxRate" required defaultValue={String((plan.taxRateBp ?? 2100) / 100)} aria-label="Btw %" />
                    </div>
                  </ActionForm>
                  <ActionForm action={activateAction} submitLabel="Lidmaatschap activeren" confirm="Activeren? Controleer dat de betaling is ontvangen.">
                    <input type="hidden" name="membershipId" value={m.id} />
                    <p className="text-sm text-muted">Activeren vereist een volledig ontvangen lidmaatschapsfactuur.</p>
                    <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" name="complimentary" className="h-4 w-4 accent-forest" /> Uitzondering: zonder kosten toegekend (blijft zichtbaar als niet-betalend)</label>
                  </ActionForm>
                </div>
              </li>
            )
          })}</ul>
        )}
      </Section>
      <Section title="Factuurrecords">
        {bills.length === 0 ? <EmptyState title="Nog geen facturen">Geen omzet = geen verzonnen grafiek.</EmptyState> : (
          <ul className="space-y-4">{bills.map((b) => (
            <li key={b.id} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{b.invoiceNumber} · {b.memberName} · {b.description}</p>
                <Badge tone={b.balance.state === 'paid' ? 'ok' : b.balance.state === 'void' ? 'neutral' : 'warn'}>{BILLING_STATE_LABEL[b.balance.state]}</Badge>
              </div>
              <p className="text-[13px] text-muted">ID {b.id} · {formatDate(b.issuedAt)} · netto {formatMoney(b.netMinor)} + btw {formatMoney(b.taxMinor)} = {formatMoney(b.grossMinor)} · ontvangen {formatMoney(b.balance.netReceivedMinor)} · open {formatMoney(b.balance.outstandingMinor)}</p>
              {b.payments.length > 0 && <ul className="mt-2 space-y-1 text-[13px]">{b.payments.map((p) => <li key={p.id}>{p.kind === 'payment' ? 'Ontvangst' : p.kind === 'refund' ? 'Restitutie' : 'Correctie'} {formatMoney(p.amountMinor)} · {p.method} · ref. {p.reference} · {formatDateTime(p.occurredAt)}{p.isManual ? ' · handmatig' : ''}{p.note ? ` · ${p.note}` : ''}</li>)}</ul>}
              {b.status !== 'void' && (
                <details className="mt-3"><summary className="cursor-pointer text-[14px] font-medium">Ontvangst, restitutie of correctie registreren</summary>
                  <ActionForm action={paymentAction} submitLabel="Registreren" submitClassName="btn-secondary">
                    <input type="hidden" name="billingId" value={b.id} />
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <select className="field" name="kind" aria-label="Soort"><option value="payment">Ontvangst</option><option value="refund">Restitutie</option><option value="correction">Correctie op ontvangst</option></select>
                      <input className="field" name="amount" required placeholder="Bedrag €" aria-label="Bedrag" />
                      <select className="field" name="method" aria-label="Methode"><option value="bank_transfer">Bankoverschrijving</option><option value="card_terminal">Pinautomaat</option><option value="cash">Contant</option><option value="other">Anders</option></select>
                      <input className="field" name="reference" required placeholder="Referentie (bankafschrift e.d.)" aria-label="Referentie" />
                      <input className="field" type="datetime-local" name="occurredAt" required defaultValue={nowLocal()} aria-label="Datum ontvangst" />
                      <select className="field" name="correctsPaymentId" aria-label="Corrigeert" defaultValue=""><option value="">Corrigeert (bij correctie)…</option>{b.payments.filter((p) => p.kind === 'payment').map((p) => <option key={p.id} value={p.id}>{formatMoney(p.amountMinor)} · {p.reference}</option>)}</select>
                      <input className="field sm:col-span-3" name="evidenceRef" placeholder="Bewijsverwijzing (bijv. afschrift 2026-11, regel 14)" aria-label="Bewijs" />
                      <input className="field sm:col-span-3" name="note" placeholder="Notitie" aria-label="Notitie" />
                    </div>
                  </ActionForm>
                  {b.balance.netReceivedMinor === 0 && (
                    <ActionForm action={voidBillingAction} submitLabel="Factuurrecord laten vervallen" submitClassName="btn-quiet text-sm text-danger" confirm="Laten vervallen?">
                      <input type="hidden" name="billingId" value={b.id} /><input className="field mt-2" name="reason" required placeholder="Reden" aria-label="Reden" />
                    </ActionForm>
                  )}
                </details>
              )}
            </li>
          ))}</ul>
        )}
      </Section>
      <Notice tone="neutral">Een ander soort factuur (project, Society, visitor) maak je vanuit dezelfde route; neem contact op met de ontwikkelaar voor een apart formulier als dat vaker nodig is. Echte factuurnummering en administratie lopen via jullie boekhoudpakket.</Notice>
    </>
  )
}
