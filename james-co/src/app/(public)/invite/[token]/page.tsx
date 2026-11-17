import Link from 'next/link'
import type { Metadata } from 'next'
import { inspectInvitation } from '@/lib/domain/invitations'
import { ActionForm } from '@/components/ActionForm'
import { ApplyForm } from '@/components/ApplyForm'
import { revealAction } from '@/app/actions/public'

export const metadata: Metadata = { title: 'Uitnodiging', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export const dynamic = 'force-dynamic'

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const inv = await inspectInvitation(token)
  if (!inv.valid) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-[38px] leading-tight">Deze uitnodiging is niet meer geldig.</h1>
        <p className="mt-4 text-[16px] text-muted">Een uitnodiging kan verlopen, ingetrokken of al gebruikt zijn. U kunt altijd zelf een kennismaking aanvragen.</p>
        <Link href="/apply" className="btn-primary mt-8">Kennismaking aanvragen</Link>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow mb-4">Persoonlijke uitnodiging</p>
      <h1 className="text-[44px] leading-tight sm:text-[54px]">{inv.kind === 'team' ? 'U bent uitgenodigd door James & Co.' : 'U bent uitgenodigd voor James & Co.'}</h1>
      <div className="rule my-8" />
      <p className="max-w-prose text-[17px] leading-relaxed text-ink/85">
        Een persoonlijke service voor mensen die graag goed leven en hun tijd bewust besteden. Van een bijzonder diner tot een zorgvuldig geregeld weekend: één aanspreekpunt voor uw plannen.
      </p>
      <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-ink/85">
        Ontdek de service of bekijk wie u heeft uitgenodigd. Aan deze uitnodiging zijn geen verplichtingen verbonden.
      </p>
      <div className="mt-8 flex flex-wrap items-start gap-3">
        <Link href="/service" className="btn-secondary">Ontdek James &amp; Co.</Link>
        {inv.kind === 'member' && (
          <ActionForm action={revealAction} submitLabel="Wie heeft mij uitgenodigd?" submitClassName="btn-secondary" pendingLabel="Even kijken…">
            <input type="hidden" name="token" value={token} />
          </ActionForm>
        )}
        <a href="#kennismaken" className="btn-primary">Kennismaken</a>
      </div>
      <section id="kennismaken" className="card mt-14 scroll-mt-8">
        <h2 className="mb-1 text-[28px]">Kennismaken</h2>
        <p className="mb-5 text-[15px] text-muted">Na het bevestigen van uw e-mailadres nemen we persoonlijk contact op. Een uitnodiging is geen lidmaatschap en verplicht tot niets.</p>
        <ApplyForm invitationToken={token} />
      </section>
    </div>
  )
}
