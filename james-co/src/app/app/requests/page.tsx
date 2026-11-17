import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listMyRequests } from '@/lib/domain/requests'
import { EmptyState, PageTitle } from '@/components/ui'
import { RequestStatus } from '@/components/RequestStatus'
import { formatDate } from '@/lib/time'
import { CATEGORY_LABEL } from '@/lib/labels'

export default async function Requests() {
  const { actor } = await requireUser()
  const rows = await listMyRequests(actor)
  return (
    <>
      <PageTitle eyebrow="Verzoeken" title="Uw verzoeken" />
      {rows.length === 0 ? <EmptyState title="Nog geen verzoeken">Uw verzoeken en hun status verschijnen hier.</EmptyState> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/app/requests/${r.id}`} className="card flex flex-col gap-2 hover:border-forest/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title ?? r.brief}</p>
                  <p className="text-sm text-muted">{r.category ? CATEGORY_LABEL[r.category] : 'Nog niet ingedeeld'} · ingediend {formatDate(r.createdAt)}{r.desiredDate ? ` · voor ${formatDate(r.desiredDate)}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">{r.openProposal && <span className="text-sm text-warn">Voorstel klaar</span>}<RequestStatus status={r.status} /></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
