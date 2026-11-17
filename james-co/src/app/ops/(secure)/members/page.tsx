import Link from 'next/link'
import { requireStaff } from '@/lib/auth/session'
import { listMembers } from '@/lib/domain/members'
import { listApplications } from '@/lib/domain/applications'
import { PageTitle, Section, Badge, EmptyState } from '@/components/ui'
import { MEMBERSHIP_LABEL, APPLICATION_LABEL } from '@/lib/labels'
import { formatDate } from '@/lib/time'

export default async function Members() {
  const { actor } = await requireStaff()
  const [members, apps] = await Promise.all([listMembers(actor), listApplications(actor)])
  const openApps = apps.filter((a) => !['accepted', 'rejected', 'withdrawn', 'declined'].includes(a.status))
  return (
    <>
      <PageTitle title="Klanten en kandidaten" />
      <Section title={`Kandidaten (${openApps.length})`}>
        {openApps.length === 0 ? <EmptyState title="Geen openstaande aanmeldingen" /> : (
          <div className="overflow-x-auto"><table className="table min-w-[720px]"><thead><tr><th>Naam</th><th>Segment</th><th>Hulpvraag</th><th>Herkomst</th><th>Status</th><th>Datum</th></tr></thead><tbody>
            {openApps.map((a) => (
              <tr key={a.id}>
                <td><Link className="font-medium text-forest underline decoration-forest/30" href={`/ops/applications/${a.id}`}>{a.fullName}</Link><br /><span className="text-[12px] text-muted">{a.email}</span></td>
                <td>{a.segment === 'international_visitor' ? <Badge tone="forest">Visitor (EN)</Badge> : 'NL'}</td>
                <td className="max-w-[260px] truncate">{a.helpRequest}</td>
                <td className="text-[13px]">{a.inviterName ? `Uitnodiging ${a.inviterName}` : a.teamInvite ? 'Uitnodiging team' : a.source ?? 'Organisch'}</td>
                <td><Badge>{APPLICATION_LABEL[a.status]}</Badge></td>
                <td className="whitespace-nowrap">{formatDate(a.createdAt)}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Section>
      <Section title={`Leden (${members.filter((m) => m.status === 'active').length} actief)`}>
        {members.length === 0 ? <EmptyState title="Nog geen leden" /> : (
          <div className="overflow-x-auto"><table className="table min-w-[640px]"><thead><tr><th>Naam</th><th>Status</th><th>Sinds</th><th>Open verzoeken</th></tr></thead><tbody>
            {members.map((m) => (
              <tr key={m.membershipId}>
                <td><Link className="font-medium text-forest underline decoration-forest/30" href={`/ops/members/${m.userId}`}>{m.fullName}</Link><br /><span className="text-[12px] text-muted">{m.email}</span></td>
                <td><Badge tone={m.status === 'active' ? 'ok' : 'neutral'}>{MEMBERSHIP_LABEL[m.status]}</Badge>{m.isComplimentary && <span className="ml-1 text-[12px] text-muted">(zonder kosten)</span>}</td>
                <td>{formatDate(m.startsOn)}</td>
                <td>{m.openRequests}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Section>
    </>
  )
}
