import Link from 'next/link'
import { requireStaff } from '@/lib/auth/session'
import { listWork, BUCKETS, CATEGORIES, CATEGORY_LABEL, STATUS_LABEL } from '@/lib/domain/requests'
import { listOpenTasks } from '@/lib/domain/work'
import { listStaff } from '@/lib/domain/members'
import { PageTitle, EmptyState, Badge } from '@/components/ui'
import { RequestStatus } from '@/components/RequestStatus'
import { formatDateTime, formatDate, nowMs } from '@/lib/time'

type SP = Promise<{ bucket?: string; owner?: string; category?: string; status?: string; urgency?: string; q?: string }>

export default async function Cockpit({ searchParams }: { searchParams: SP }) {
  const { actor } = await requireStaff()
  const f = await searchParams
  const [all, tasks, staff] = await Promise.all([listWork(actor, { ...f, bucket: undefined }), listOpenTasks(actor, true), listStaff(actor)])
  const rows = f.bucket ? all.filter((r) => r.bucket === f.bucket) : all
  const now = nowMs()
  const overdue = all.filter((r) => r.nextActionDueAt && new Date(r.nextActionDueAt).getTime() < now)
  const unowned = all.filter((r) => !r.ownerId)
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...f, ...patch }).filter(([, v]) => v) as [string, string][])
    const s = p.toString()
    return s ? `/ops?${s}` : '/ops'
  }
  return (
    <>
      <PageTitle title="Werkvoorraad" actions={<Link href="/ops/requests/new" className="btn-secondary">Verzoek vastleggen</Link>}>
        Wat moet nu gebeuren, voor wie en wie is verantwoordelijk.
      </PageTitle>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card py-4"><p className="text-sm text-muted">Achterstallige volgende acties</p><p className={`text-[28px] font-medium ${overdue.length ? 'text-danger' : ''}`}>{overdue.length}</p></div>
        <div className="card py-4"><p className="text-sm text-muted">Zonder eigenaar</p><p className={`text-[28px] font-medium ${unowned.length ? 'text-warn' : ''}`}>{unowned.length}</p></div>
        <div className="card py-4"><p className="text-sm text-muted">Mijn open taken</p><p className="text-[28px] font-medium">{tasks.length}</p><Link href="/ops/tasks" className="text-sm text-forest underline">Bekijk taken</Link></div>
      </div>
      <nav aria-label="Werkbakken" className="mb-4 flex flex-wrap gap-2">
        <Link href={qs({ bucket: undefined })} className={`rounded-full border px-3 py-1.5 text-[13px] ${!f.bucket ? 'border-forest bg-forest text-white' : 'border-line bg-surface'}`}>Alles ({all.length})</Link>
        {BUCKETS.map((b) => {
          const n = all.filter((r) => r.bucket === b.key).length
          return <Link key={b.key} href={qs({ bucket: b.key })} className={`rounded-full border px-3 py-1.5 text-[13px] ${f.bucket === b.key ? 'border-forest bg-forest text-white' : 'border-line bg-surface'} ${b.key === 'problem' && n ? 'text-danger' : ''}`}>{b.label} ({n})</Link>
        })}
      </nav>
      <form className="mb-5 grid gap-2 sm:grid-cols-6" method="get">
        {f.bucket && <input type="hidden" name="bucket" value={f.bucket} />}
        <input className="field sm:col-span-2" name="q" defaultValue={f.q} placeholder="Zoek op lid of inhoud" aria-label="Zoeken" />
        <select className="field" name="owner" defaultValue={f.owner ?? ''} aria-label="Eigenaar"><option value="">Alle eigenaren</option><option value="none">Zonder eigenaar</option>{staff.map((s) => <option key={s.userId} value={s.userId}>{s.fullName}</option>)}</select>
        <select className="field" name="category" defaultValue={f.category ?? ''} aria-label="Categorie"><option value="">Alle categorieën</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select>
        <select className="field" name="urgency" defaultValue={f.urgency ?? ''} aria-label="Urgentie"><option value="">Alle urgentie</option><option value="high">Hoog</option><option value="normal">Normaal</option></select>
        <button className="btn-primary">Filter</button>
      </form>
      {rows.length === 0 ? <EmptyState title="Niets in deze werkbak">Alle verzoeken zijn opgepakt of er zijn er nog geen.</EmptyState> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="table min-w-[860px]">
            <thead><tr><th>Lid</th><th>Verzoek</th><th>Status</th><th>Gewenst</th><th>Eigenaar</th><th>Volgende actie</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const late = r.nextActionDueAt && new Date(r.nextActionDueAt).getTime() < now
                return (
                  <tr key={r.id} className="hover:bg-canvas/60">
                    <td className="font-medium">{r.memberName}</td>
                    <td className="max-w-[280px]"><Link href={`/ops/requests/${r.id}`} className="text-forest underline decoration-forest/30">{r.title ?? r.brief.slice(0, 70)}</Link>
                      <div className="mt-1 flex flex-wrap gap-1">{r.category && <Badge>{CATEGORY_LABEL[r.category]}</Badge>}{r.urgency === 'high' && <Badge tone="danger">Urgent</Badge>}{r.hasIssue && <Badge tone="danger">Probleem</Badge>}{r.cancellationRequestedAt && <Badge tone="warn">Annulering gevraagd</Badge>}</div></td>
                    <td><RequestStatus status={r.status} />{r.waitingOn && <p className="mt-1 text-[12px] text-muted">wacht op {r.waitingOn === 'member' ? 'lid' : 'leverancier'}</p>}</td>
                    <td className="whitespace-nowrap">{r.desiredDate ? formatDate(r.desiredDate) : '—'}</td>
                    <td>{r.ownerName ?? <span className="text-warn">Niemand</span>}</td>
                    <td className={late ? 'text-danger' : ''}>{r.nextAction ?? '—'}{r.nextActionDueAt && <p className="text-[12px]">{formatDateTime(r.nextActionDueAt)}</p>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[12px] text-muted">Statussen: {Object.values(STATUS_LABEL).slice(0, 7).join(' → ')}.</p>
    </>
  )
}
