import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listMyRequests } from '@/lib/domain/requests'
import { getMyMembership, canCreateRequests } from '@/lib/domain/memberships'
import { withActor } from '@/lib/db'
import { EmptyState, PageTitle } from '@/components/ui'
import { RequestStatus } from '@/components/RequestStatus'
import { formatDateTime } from '@/lib/time'

export default async function Overview() {
  const { session, actor } = await requireUser()
  const [requests, membership] = await Promise.all([listMyRequests(actor), getMyMembership(actor)])
  const upcoming = await withActor(actor, (tx) => tx<{ id: string; title: string; supplierName: string; startsAt: Date; timezone: string; requestId: string }[]>`
    select b.id, b.title, b.supplier_name, b.starts_at, b.timezone, b.request_id from bookings b join requests r on r.id = b.request_id
    where r.member_id = ${actor.userId} and b.status = 'confirmed' and b.starts_at > now() order by b.starts_at limit 3`)
  const openActions = requests.filter((r) => r.openProposal || r.status === 'needs_info')
  const active = requests.filter((r) => !['completed', 'closed', 'rejected', 'cancelled'].includes(r.status))
  const canRequest = canCreateRequests(membership)

  return (
    <>
      <PageTitle eyebrow="Overzicht" title={`Goedendag${session.displayName ? `, ${session.displayName}` : ''}.`} />
      {requests.length === 0 && canRequest ? (
        <EmptyState title="Wat mogen we als eerste voor u regelen?" action={<Link href="/app/requests/new" className="btn-primary">Nieuw verzoek</Link>}>
          Een diner, een weekend, een attentie. Vertel het in uw eigen woorden; wij vragen wat we verder nodig hebben.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <section className="card">
            <h2 className="mb-3 text-[24px]">Wacht op u</h2>
            {openActions.length === 0 ? <p className="text-sm text-muted">Er staat niets voor u open.</p> : (
              <ul className="space-y-3">
                {openActions.map((r) => (
                  <li key={r.id}>
                    <Link href={`/app/requests/${r.id}`} className="block rounded-xl border border-line p-4 hover:border-forest/40">
                      <div className="flex items-center justify-between gap-3"><span className="font-medium">{r.title ?? r.brief.slice(0, 60)}</span><RequestStatus status={r.status} /></div>
                      <p className="mt-1 text-sm text-muted">{r.openProposal ? 'Er staat een voorstel voor u klaar.' : 'We hebben een vraag voor u.'}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <h2 className="mb-3 text-[24px]">Eerstvolgend</h2>
            {upcoming.length === 0 ? <p className="text-sm text-muted">Nog geen bevestigde afspraken in de toekomst.</p> : (
              <ul className="space-y-3">
                {upcoming.map((b) => (
                  <li key={b.id}><Link href={`/app/requests/${b.requestId}`} className="block rounded-xl border border-line p-4 hover:border-forest/40">
                    <p className="font-medium">{b.title}</p><p className="text-sm text-muted">{b.supplierName} · {formatDateTime(b.startsAt, b.timezone)}</p>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>
          <section className="card md:col-span-2">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-[24px]">Lopende verzoeken</h2><Link href="/app/requests" className="text-sm text-forest underline">Alle verzoeken</Link></div>
            {active.length === 0 ? <p className="text-sm text-muted">Geen lopende verzoeken.</p> : (
              <ul className="divide-y divide-line">
                {active.slice(0, 6).map((r) => (
                  <li key={r.id}><Link href={`/app/requests/${r.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-forest"><span className="truncate">{r.title ?? r.brief}</span><RequestStatus status={r.status} /></Link></li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )
}
