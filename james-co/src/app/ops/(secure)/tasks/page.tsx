import Link from 'next/link'
import { requireStaff } from '@/lib/auth/session'
import { listOpenTasks } from '@/lib/domain/work'
import { listStaff } from '@/lib/domain/members'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle, EmptyState, Section } from '@/components/ui'
import { taskAction, taskStatusAction } from '@/app/actions/staff'
import { formatDateTime, nowMs } from '@/lib/time'

export default async function Tasks({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { actor } = await requireStaff()
  const all = (await searchParams).all === '1'
  const [tasks, staff] = await Promise.all([listOpenTasks(actor, !all), listStaff(actor)])
  const now = nowMs()
  return (
    <>
      <PageTitle title="Taken" actions={<Link href={all ? '/ops/tasks' : '/ops/tasks?all=1'} className="btn-secondary">{all ? 'Alleen mijn taken' : 'Alle taken'}</Link>} />
      {tasks.length === 0 ? <EmptyState title="Geen open taken" /> : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="card flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{t.title}</p>
                <p className={`text-[13px] ${t.dueAt && new Date(t.dueAt).getTime() < now ? 'text-danger' : 'text-muted'}`}>
                  {t.memberName ? `${t.memberName} · ` : ''}{t.dueAt ? `deadline ${formatDateTime(t.dueAt)}` : 'geen deadline'} · {t.assigneeName ?? 'niet toegewezen'}
                  {t.requestId && <> · <Link className="underline" href={`/ops/requests/${t.requestId}`}>dossier</Link></>}
                  {t.applicationId && <> · <Link className="underline" href={`/ops/applications/${t.applicationId}`}>aanmelding</Link></>}
                  {t.memberId && !t.requestId && <> · <Link className="underline" href={`/ops/members/${t.memberId}`}>klant</Link></>}
                </p>
              </div>
              <ActionForm action={taskStatusAction} submitLabel="Afgerond" submitClassName="btn-secondary text-sm">
                <input type="hidden" name="taskId" value={t.id} /><input type="hidden" name="status" value="done" /><input type="hidden" name="path" value="/ops/tasks" />
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      <Section title="Nieuwe taak">
        <ActionForm action={taskAction} resetOnSuccess submitLabel="Taak toevoegen">
          <input type="hidden" name="path" value="/ops/tasks" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input className="field sm:col-span-3" name="title" required placeholder="Omschrijving" aria-label="Omschrijving" />
            <input className="field" type="datetime-local" name="dueAt" aria-label="Deadline" />
            <select className="field" name="assignedTo" aria-label="Toewijzen aan" defaultValue={actor.userId ?? ''}>{staff.filter((s) => s.active).map((s) => <option key={s.userId} value={s.userId}>{s.fullName}</option>)}</select>
          </div>
        </ActionForm>
      </Section>
    </>
  )
}
