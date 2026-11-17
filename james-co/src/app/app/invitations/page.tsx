import { requireUser } from '@/lib/auth/session'
import { listOwnInvitations } from '@/lib/domain/invitations'
import { getMyMembership } from '@/lib/domain/memberships'
import { ActionForm } from '@/components/ActionForm'
import { InvitationCreator } from '@/components/InvitationCreator'
import { PageTitle, Section, Badge, EmptyState } from '@/components/ui'
import { revokeInvitationAction } from '@/app/actions/member'
import { formatDate } from '@/lib/time'

const STATE: Record<string, [string, 'neutral' | 'ok' | 'warn' | 'forest']> = {
  open: ['Link aangemaakt', 'forest'], claimed: ['Gebruikt', 'ok'], expired: ['Verlopen', 'neutral'], revoked: ['Ingetrokken', 'neutral'],
}

export default async function Invitations() {
  const { session, actor } = await requireUser()
  const [rows, m] = await Promise.all([listOwnInvitations(actor), getMyMembership(actor)])
  return (
    <>
      <PageTitle eyebrow="Uitnodigen" title="Iemand uitnodigen">Kent u iemand voor wie James &amp; Co. waardevol kan zijn? Maak een persoonlijke link en deel die zelf. Wij benaderen niemand ongevraagd.</PageTitle>
      {m?.status === 'active' ? (
        <Section title="Nieuwe link"><InvitationCreator defaultName={session.displayName ?? ''} /></Section>
      ) : <p className="mb-5 text-sm text-muted">Uitnodigen kan met een actief lidmaatschap.</p>}
      <Section title="Uw links">
        <p className="mb-4 text-sm text-muted">U ziet alleen of een link is gebruikt. Wat de ontvanger met ons bespreekt, blijft privé.</p>
        {rows.length === 0 ? <EmptyState title="Nog geen links" /> : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><Badge tone={STATE[r.state]![1]}>{STATE[r.state]![0]}</Badge><p className="mt-1 text-[13px] text-muted">Aangemaakt {formatDate(r.createdAt)} · {r.revealConsent ? `naam zichtbaar: ${r.displayName}` : 'naam verborgen'} · verloopt {formatDate(r.expiresAt)}</p></div>
                {r.state === 'open' && (
                  <ActionForm action={revokeInvitationAction} submitLabel="Intrekken" submitClassName="btn-quiet text-sm" confirm="Link intrekken? Hij werkt daarna niet meer.">
                    <input type="hidden" name="id" value={r.id} />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}
