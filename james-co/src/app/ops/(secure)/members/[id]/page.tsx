import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth/session'
import { getMemberForStaff } from '@/lib/domain/members'
import { DomainError } from '@/lib/errors'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle, Section, DL, Badge } from '@/components/ui'
import { RequestStatus } from '@/components/RequestStatus'
import { membershipChangeAction, noteAction, timeAction } from '@/app/actions/staff'
import { MEMBERSHIP_LABEL } from '@/lib/labels'
import { formatDate, formatDateTime } from '@/lib/time'

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { actor, session } = await requireStaff()
  let d
  try { d = await getMemberForStaff(actor, id) } catch (e) { if (e instanceof DomainError) notFound(); throw e }
  const m = d.memberships[0]
  const admin = session.staffRole === 'admin'
  return (
    <>
      <PageTitle title={d.profile.fullName ?? d.profile.email} actions={m?.status === 'active' ? <Link href={`/ops/requests/new?member=${id}`} className="btn-secondary">Verzoek vastleggen</Link> : undefined} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Profiel">
          <DL items={[['E-mail', d.profile.email], ['Telefoon', d.profile.phone], ['Voorkeurscontact', d.profile.preferredContact], ['Regio', d.profile.region], ['Taal', d.profile.language],
            ['Toestemmingen', d.consents.length ? d.consents.map((c) => `${c.purpose}: ${c.granted ? 'aan' : 'uit'}`).join(', ') : 'geen'], ['Behandeltijd 30 dagen', `${d.minutes30d} min`]]} />
        </Section>
        <Section title="Lidmaatschap">
          {m ? (
            <>
              <DL items={[['Status', <Badge key="s">{MEMBERSHIP_LABEL[m.status]}</Badge>], ['Sinds', formatDate(m.startsOn)], ['Einde', formatDate(m.endsOn)], ['Voorwaarden', m.acceptedTermsVersion], ['Zonder kosten', m.isComplimentary ? 'ja' : 'nee']]} />
              {admin && ['active', 'suspended', 'ending'].includes(m.status) && (
                <ActionForm action={membershipChangeAction} submitLabel="Wijzigen" submitClassName="btn-secondary" confirm="Lidmaatschap wijzigen?">
                  <input type="hidden" name="membershipId" value={m.id} /><input type="hidden" name="userId" value={id} />
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <select className="field" name="change" aria-label="Wijziging">{m.status === 'suspended' ? <option value="reinstate">Heractiveren</option> : <option value="suspend">Schorsen</option>}<option value="end_at">Beëindigen per datum</option><option value="end_now">Direct beëindigen</option></select>
                    <input className="field" type="date" name="endsOn" aria-label="Einddatum" />
                    <input className="field sm:col-span-2" name="reason" placeholder="Reden (intern)" aria-label="Reden" />
                  </div>
                  <p className="hint">Historie blijft voor het lid inzichtelijk; nieuwe verzoeken worden geblokkeerd. Lopende verplichtingen krijgen een opvolgtaak.</p>
                </ActionForm>
              )}
            </>
          ) : <p className="text-sm text-muted">Geen lidmaatschap.</p>}
        </Section>
        <Section title="Verzoeken">
          <ul className="divide-y divide-line">{d.requests.map((r) => <li key={r.id} className="flex items-center justify-between gap-2 py-2"><Link href={`/ops/requests/${r.id}`} className="truncate underline">{r.title ?? r.brief}</Link><RequestStatus status={r.status} /></li>)}</ul>
        </Section>
        <Section title="Interne notities">
          <ul className="mb-3 space-y-2 text-[14px]">{d.notes.map((n) => <li key={n.id} className="rounded-lg bg-canvas p-2"><p className="whitespace-pre-line">{n.body}</p><p className="text-[12px] text-muted">{n.authorName} · {formatDateTime(n.createdAt)}</p></li>)}</ul>
          <ActionForm action={noteAction} resetOnSuccess submitLabel="Notitie toevoegen" submitClassName="btn-secondary"><input type="hidden" name="memberId" value={id} /><input type="hidden" name="path" value={`/ops/members/${id}`} /><textarea className="field" name="body" required aria-label="Notitie" /></ActionForm>
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-sm font-medium">Accountzorg (tijd)</p>
            <ActionForm action={timeAction} resetOnSuccess submitLabel="Registreren" submitClassName="btn-secondary"><input type="hidden" name="memberId" value={id} /><input type="hidden" name="path" value={`/ops/members/${id}`} /><input type="hidden" name="activity" value="account_care" />
              <input className="field max-w-[160px]" type="number" name="minutes" min={1} required placeholder="Minuten" aria-label="Minuten" /></ActionForm>
          </div>
        </Section>
      </div>
    </>
  )
}
