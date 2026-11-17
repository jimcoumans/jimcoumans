import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getMyEvent } from '@/lib/domain/society'
import { DomainError } from '@/lib/errors'
import { ActionForm } from '@/components/ActionForm'
import { Badge, Notice } from '@/components/ui'
import { societyAcceptAction, societyInterestAction, societyWithdrawAction } from '@/app/actions/member'
import { formatDateTime } from '@/lib/time'
import { formatMoney } from '@/lib/money'
import { PARTICIPATION_LABEL } from '@/lib/labels'

export default async function SocietyEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { actor } = await requireUser()
  let data
  try { data = await getMyEvent(actor, id) } catch (e) { if (e instanceof DomainError) notFound(); throw e }
  const { event: e, participation: p } = data
  return (
    <div className="max-w-3xl">
      <Link href="/app/society" className="text-sm text-muted hover:text-forest">← Society</Link>
      <div className="mt-3 flex flex-wrap gap-2">{e.isDemo && <Badge tone="warn">Voorbeeld — fictieve ervaring</Badge>}{p && <Badge tone="forest">{PARTICIPATION_LABEL[p.status]}</Badge>}</div>
      <h1 className="mt-2 text-[38px] leading-tight">{e.title}</h1>
      <p className="text-muted">{formatDateTime(e.startsAt, e.timezone)}{e.location ? ` · ${e.location}` : ''}</p>
      <p className="mt-4 text-[16px]">{e.summary}</p>
      {e.description && <p className="mt-3 whitespace-pre-line text-[15px] text-ink/85">{e.description}</p>}
      {(e.priceMinor != null || e.priceNote) && <p className="mt-4 text-[15px]"><strong>Deelname:</strong> {e.priceMinor != null ? formatMoney(e.priceMinor, e.currency) : ''} {e.priceNote}</p>}

      <div className="card mt-8">
        {!p || ['declined', 'cancelled'].includes(p.status) ? (
          e.status === 'open' ? (
            <ActionForm action={societyInterestAction} submitLabel="Interesse melden">
              <input type="hidden" name="eventId" value={e.id} />
              <label className="label" htmlFor="partySize">Aantal personen</label>
              <select className="field max-w-[160px]" id="partySize" name="partySize" defaultValue="1">{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select>
              <label className="label mt-4" htmlFor="note">Opmerking (optioneel)</label>
              <textarea className="field min-h-[80px]" id="note" name="note" maxLength={500} />
              <p className="hint">Interesse melden is vrijblijvend en nog geen gereserveerde plek.</p>
            </ActionForm>
          ) : <p className="text-sm text-muted">Aanmelden voor deze ervaring is niet (meer) mogelijk.</p>
        ) : p.status === 'offered' ? (
          <>
            <h2 className="text-[22px]">Er is een plek voor u</h2>
            <p className="mt-2 whitespace-pre-line text-[15px]">{p.offerText}</p>
            {p.offerPriceMinor != null && <p className="mt-2 font-medium">{formatMoney(p.offerPriceMinor)}{p.partySize > 1 ? ` (voor ${p.partySize} personen, zie aanbod)` : ''}</p>}
            {p.acceptedAt ? <div className="mt-4"><Notice tone="forest">U heeft het aanbod geaccepteerd. {p.paymentRequired ? 'Na ontvangst van de betaling bevestigen we uw plek.' : 'We bevestigen uw plek zo spoedig mogelijk.'}</Notice></div> : (
              <ActionForm action={societyAcceptAction} submitLabel="Aanbod accepteren">
                <input type="hidden" name="eventId" value={e.id} />
                <label className="mt-4 flex items-start gap-3 text-[15px]"><input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 accent-forest" /><span>Ik accepteer dit aanbod en de bijbehorende voorwaarden.</span></label>
              </ActionForm>
            )}
          </>
        ) : p.status === 'confirmed' ? (
          <Notice tone="ok" title="Uw plek is bevestigd">We zien u graag. Praktische informatie volgt.</Notice>
        ) : (
          <p className="text-[15px]">{PARTICIPATION_LABEL[p.status]}. We nemen contact op zodra er meer duidelijk is.</p>
        )}
        {p && ['interested', 'waitlisted', 'offered', 'confirmed'].includes(p.status) && (
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm action={societyWithdrawAction} submitLabel={p.status === 'confirmed' ? 'Plek opzeggen (verzoek)' : 'Afmelden'} submitClassName="btn-quiet text-sm" confirm="Weet u het zeker?">
              <input type="hidden" name="eventId" value={e.id} />
            </ActionForm>
          </div>
        )}
      </div>
    </div>
  )
}
