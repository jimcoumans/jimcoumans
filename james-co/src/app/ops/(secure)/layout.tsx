import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/session'
import { runningTimer } from '@/lib/domain/work'
import { settleEndedMemberships } from '@/lib/domain/memberships'
import { expireProposals } from '@/lib/domain/proposals'
import { Wordmark } from '@/components/Brand'
import { OpsNav } from '@/components/OpsNav'
import { ActionForm } from '@/components/ActionForm'
import { logoutAction } from '@/app/actions/auth'
import { stopTimerAction } from '@/app/actions/staff'
import { formatDateTime } from '@/lib/time'

export const metadata: Metadata = { title: 'Cockpit', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const { session, actor } = await requireStaff()
  // Lichte, idempotente onderhoudstaken (geen achtergrondproces nodig in V1).
  await Promise.all([settleEndedMemberships(), expireProposals()])
  const timer = await runningTimer(actor)
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-line bg-canvas px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r lg:py-6">
        <div className="mb-4 flex items-center justify-between lg:block">
          <Wordmark href="/ops" small />
          <p className="text-[12px] text-muted lg:mt-1">Cockpit · {session.staffRole === 'admin' ? 'Admin' : 'Concierge'}</p>
        </div>
        <OpsNav admin={session.staffRole === 'admin'} />
        <div className="mt-6 hidden text-[13px] text-muted lg:block">
          <p>{session.fullName}</p>
          <form action={logoutAction}><button className="mt-1 underline">Uitloggen</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        {timer && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-forest px-4 py-2 text-sm text-white sm:px-6">
            <span>Timer loopt sinds {formatDateTime(timer.startedAt)} ({timer.activity})</span>
            <ActionForm action={stopTimerAction} submitLabel="Stop timer" submitClassName="btn min-h-0 bg-white px-3 py-1 text-forest"><input type="hidden" name="path" value="/ops" /></ActionForm>
          </div>
        )}
        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
