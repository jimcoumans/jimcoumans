import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listMyEvents } from '@/lib/domain/society'
import { Badge, EmptyState, PageTitle } from '@/components/ui'
import { formatDateTime } from '@/lib/time'
import { PARTICIPATION_LABEL } from '@/lib/labels'

export default async function SocietyList() {
  const { actor } = await requireUser()
  const items = await listMyEvents(actor)
  return (
    <>
      <PageTitle eyebrow="The James Society" title="Uw uitnodigingen">Persoonlijke uitnodigingen voor kleinschalige ervaringen. Interesse melden is nog geen gereserveerde plek.</PageTitle>
      {items.length === 0 ? <EmptyState title="Nog geen uitnodigingen">Zodra er een ervaring voor u openstaat, ziet u die hier.</EmptyState> : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map(({ event: e, participation: p }) => (
            <li key={e.id}><Link href={`/app/society/${e.id}`} className="card block h-full hover:border-forest/40">
              <div className="flex flex-wrap gap-2">{e.isDemo && <Badge tone="warn">Voorbeeld</Badge>}{p && <Badge tone={p.status === 'confirmed' ? 'ok' : 'forest'}>{PARTICIPATION_LABEL[p.status]}</Badge>}{e.status !== 'open' && <Badge>{e.status === 'closed' ? 'Aanmelden gesloten' : e.status === 'cancelled' ? 'Geannuleerd' : 'Afgelopen'}</Badge>}</div>
              <h2 className="mt-2 text-[24px]">{e.title}</h2>
              <p className="text-sm text-muted">{formatDateTime(e.startsAt, e.timezone)}{e.location ? ` · ${e.location}` : ''}</p>
              <p className="mt-2 text-[15px]">{e.summary}</p>
            </Link></li>
          ))}
        </ul>
      )}
    </>
  )
}
