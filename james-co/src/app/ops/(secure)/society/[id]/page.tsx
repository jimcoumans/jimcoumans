import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth/session'
import { getEventForStaff } from '@/lib/domain/society'
import { DomainError } from '@/lib/errors'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle, Section, Badge } from '@/components/ui'
import { EventForm } from '@/components/EventForm'
import * as act from '@/app/actions/staff'
import { PARTICIPATION_LABEL } from '@/lib/labels'
import { formatMoney } from '@/lib/money'

export default async function EventOps({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { actor } = await requireStaff()
  let d
  try { d = await getEventForStaff(actor, id) } catch (e) { if (e instanceof DomainError) notFound(); throw e }
  const { event: e } = d
  const invitedIds = new Set(d.invited.map((i) => i.memberId))
  const hidden = <input type="hidden" name="eventId" value={id} />
  return (
    <>
      <PageTitle title={e.title}>
        <span className="flex flex-wrap gap-2"><Badge>{e.status}</Badge><Badge tone="forest">{d.confirmedSeats}/{e.capacity ?? '∞'} plaatsen bevestigd</Badge>{e.isDemo && <Badge tone="warn">Demo</Badge>}</span>
      </PageTitle>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div>
          <Section title="Status">
            <div className="flex flex-wrap gap-2">
              {(['draft', 'open', 'closed', 'completed', 'cancelled'] as const).filter((s) => s !== e.status).map((s) => (
                <ActionForm key={s} action={act.eventStatusAction} submitLabel={{ draft: 'Concept', open: 'Openen voor interesse', closed: 'Aanmelden sluiten', completed: 'Afgerond', cancelled: 'Annuleren' }[s]} submitClassName="btn-secondary text-sm">{hidden}<input type="hidden" name="status" value={s} /></ActionForm>
              ))}
            </div>
          </Section>
          <Section title="Uitgenodigde leden">
            <ActionForm action={act.inviteMembersAction} submitLabel="Uitnodigen" submitClassName="btn-secondary">
              {hidden}
              {d.eligible.length === 0 ? <p className="text-sm text-muted">Geen actieve leden.</p> : (
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">{d.eligible.map((m) => (
                  <li key={m.userId}><label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="memberIds" value={m.userId} defaultChecked={invitedIds.has(m.userId)} disabled={invitedIds.has(m.userId)} className="h-4 w-4 accent-forest" />{m.fullName}{invitedIds.has(m.userId) ? ' (uitgenodigd)' : ''}</label></li>
                ))}</ul>
              )}
            </ActionForm>
          </Section>
          <Section title="Bewerken"><EventForm e={e} /></Section>
        </div>
        <Section title="Deelnemers (intern)">
          {d.participants.length === 0 ? <p className="text-sm text-muted">Nog geen interesse.</p> : (
            <ul className="space-y-3">{d.participants.map((p) => (
              <li key={p.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{p.memberName} · {p.partySize} pers.</p><Badge tone={p.status === 'confirmed' ? 'ok' : 'forest'}>{PARTICIPATION_LABEL[p.status]}{p.acceptedAt && p.status === 'offered' ? ' · geaccepteerd' : ''}</Badge></div>
                {p.memberNote && <p className="mt-1 text-[13px] text-muted">“{p.memberNote}”</p>}
                {p.offerText && <p className="mt-1 text-[13px]">Aanbod: {p.offerText} {p.offerPriceMinor != null ? `(${formatMoney(p.offerPriceMinor)})` : ''}{p.paymentRequired ? ' · betaling vereist' : ''}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {['interested', 'waitlisted', 'offered'].includes(p.status) && (
                    <details className="w-full"><summary className="cursor-pointer text-[13px] font-medium">Plek aanbieden</summary>
                      <ActionForm action={act.offerPlaceAction} submitLabel="Aanbod doen" submitClassName="btn-secondary text-sm">
                        {hidden}<input type="hidden" name="participationId" value={p.id} />
                        <textarea className="field mt-2" name="offerText" required placeholder="Aanbod en voorwaarden" aria-label="Aanbod" />
                        <div className="mt-2 flex gap-2"><input className="field" name="price" placeholder="Bijdrage €" aria-label="Bijdrage" /><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="paymentRequired" className="h-4 w-4 accent-forest" />betaling vóór bevestiging</label></div>
                      </ActionForm>
                    </details>
                  )}
                  {p.status === 'offered' && p.acceptedAt && <ActionForm action={act.confirmPlaceAction} submitLabel="Plek bevestigen" submitClassName="btn-primary text-sm">{hidden}<input type="hidden" name="participationId" value={p.id} /></ActionForm>}
                  {p.paymentRequired && !p.billingId && <ActionForm action={act.linkParticipationBillingAction} submitLabel="Koppel factuur-ID" submitClassName="btn-quiet text-sm">{hidden}<input type="hidden" name="participationId" value={p.id} /><input className="field" name="billingId" placeholder="Factuurrecord-ID (admin)" aria-label="Factuur" /></ActionForm>}
                  {['interested', 'offered'].includes(p.status) && <ActionForm action={act.participationStatusAction} submitLabel="Wachtlijst" submitClassName="btn-quiet text-sm">{hidden}<input type="hidden" name="participationId" value={p.id} /><input type="hidden" name="status" value="waitlisted" /></ActionForm>}
                  {p.status !== 'cancelled' && p.status !== 'declined' && <ActionForm action={act.participationStatusAction} submitLabel="Annuleren" submitClassName="btn-quiet text-sm" confirm="Deelname annuleren?">{hidden}<input type="hidden" name="participationId" value={p.id} /><input type="hidden" name="status" value="cancelled" /></ActionForm>}
                </div>
              </li>
            ))}</ul>
          )}
        </Section>
      </div>
    </>
  )
}
