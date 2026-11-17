import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { getMyMembership, canViewHistory, canCreateRequests } from '@/lib/domain/memberships'
import { Wordmark } from '@/components/Brand'
import { PortalNav } from '@/components/PortalNav'
import { logoutAction } from '@/app/actions/auth'
import { MEMBERSHIP_LABEL } from '@/lib/labels'

export const metadata: Metadata = { title: 'Ledenportaal', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { session, actor } = await requireUser()
  if (session.staffRole) redirect('/ops')
  const m = await getMyMembership(actor)
  if (!canViewHistory(m)) redirect('/onboarding')
  const canRequest = canCreateRequests(m)
  return (
    <div className="min-h-dvh pb-28 md:pb-10">
      <header className="border-b border-line/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Wordmark href="/app" small />
          <PortalNav canRequest={canRequest} />
          <form action={logoutAction} className="md:hidden"><button className="btn-quiet text-sm">Uitloggen</button></form>
        </div>
      </header>
      {!canRequest && (
        <div className="bg-warn-soft px-4 py-2 text-center text-sm text-warn">
          Uw lidmaatschap is {MEMBERSHIP_LABEL[m!.status]?.toLowerCase()}. U kunt uw dossiers, bevestigingen en facturen blijven inzien; nieuwe verzoeken zijn niet mogelijk. <Link href="/app/membership" className="underline">Lidmaatschap</Link>
        </div>
      )}
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto hidden max-w-5xl items-center justify-between px-6 text-sm text-muted md:flex">
        <div className="flex gap-4"><Link href="/app/membership">Lidmaatschap</Link><Link href="/app/invitations">Uitnodigen</Link><Link href="/contact">Contact</Link></div>
        <form action={logoutAction}><button className="btn-quiet text-sm">Uitloggen</button></form>
      </footer>
    </div>
  )
}
