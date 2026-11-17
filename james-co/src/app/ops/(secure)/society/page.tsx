import Link from 'next/link'
import { requireStaff } from '@/lib/auth/session'
import { listEventsForStaff } from '@/lib/domain/society'
import { PageTitle, Badge, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/time'

export default async function SocietyOps() {
  const { actor } = await requireStaff()
  const events = await listEventsForStaff(actor)
  return (
    <>
      <PageTitle title="The James Society" actions={<Link href="/ops/society/new" className="btn-secondary">Nieuwe ervaring</Link>}>Interesse is nooit een verkochte stoel. Deelnemerslijsten blijven intern.</PageTitle>
      {events.length === 0 ? <EmptyState title="Nog geen ervaringen">Start met één kleinschalige ervaring en een interesselijst.</EmptyState> : (
        <ul className="space-y-3">{events.map((e) => (
          <li key={e.id}><Link href={`/ops/society/${e.id}`} className="card flex flex-wrap items-center justify-between gap-3 hover:border-forest/40">
            <div><p className="font-medium">{e.title} {e.isDemo && <Badge tone="warn">Demo</Badge>}</p><p className="text-sm text-muted">{formatDateTime(e.startsAt, e.timezone)}</p></div>
            <div className="flex gap-2 text-sm"><Badge>{e.status}</Badge><span>{e.confirmedSeats}/{e.capacity ?? '∞'} bevestigd · {e.interested} in behandeling</span></div>
          </Link></li>
        ))}</ul>
      )}
    </>
  )
}
