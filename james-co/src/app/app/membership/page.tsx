import { requireUser } from '@/lib/auth/session'
import { getMyMembership } from '@/lib/domain/memberships'
import { listBilling } from '@/lib/domain/billing'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle, Section, DL, Badge, EmptyState } from '@/components/ui'
import { requestEndAction } from '@/app/actions/member'
import { MEMBERSHIP_LABEL, BILLING_STATE_LABEL } from '@/lib/labels'
import { formatDate } from '@/lib/time'
import { formatMoney } from '@/lib/money'

export default async function MembershipPage() {
  const { actor } = await requireUser()
  const m = await getMyMembership(actor)
  const bills = await listBilling(actor)
  const plan = (m?.planSnapshot ?? {}) as { priceMinor?: number; currency?: string; billingPeriod?: string; scopeText?: string; priceIncludesTax?: boolean; taxRateBp?: number }
  return (
    <>
      <PageTitle eyebrow="Lidmaatschap" title="Uw lidmaatschap" />
      <Section title="Overeenkomst">
        <DL items={[
          ['Status', <Badge key="s" tone={m?.status === 'active' ? 'ok' : 'warn'}>{MEMBERSHIP_LABEL[m?.status ?? ''] ?? '—'}</Badge>],
          ['Sinds', formatDate(m?.startsOn)],
          ['Einddatum', m?.endsOn ? formatDate(m.endsOn) : '—'],
          ['Prijs', plan.priceMinor != null ? `${formatMoney(plan.priceMinor, plan.currency)} ${plan.billingPeriod === 'month' ? 'per maand' : plan.billingPeriod ?? ''} (${plan.priceIncludesTax ? 'incl.' : 'excl.'} btw)` : m?.isComplimentary ? 'Zonder kosten toegekend' : '—'],
          ['Inhoud', plan.scopeText ?? '—'],
          ['Voorwaarden', m?.acceptedTermsVersion ? `versie ${m.acceptedTermsVersion}, geaccepteerd ${formatDate(m.acceptedAt)}` : '—'],
        ]} />
      </Section>
      <Section title="Facturen">
        {bills.length === 0 ? <EmptyState title="Nog geen facturen" /> : (
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>Nummer</th><th>Omschrijving</th><th>Bedrag</th><th>Status</th></tr></thead><tbody>
            {bills.map((b) => <tr key={b.id}><td>{b.invoiceNumber}</td><td>{b.description}<br /><span className="text-[12px] text-muted">{formatDate(b.issuedAt)}</span></td><td>{formatMoney(b.grossMinor, b.currency)}<br /><span className="text-[12px] text-muted">waarvan btw {formatMoney(b.taxMinor, b.currency)}</span></td><td>{BILLING_STATE_LABEL[b.balance.state]}</td></tr>)}
          </tbody></table></div>
        )}
      </Section>
      {m && ['active', 'suspended'].includes(m.status) && (
        <Section title="Beëindigen">
          <p className="mb-3 text-sm text-muted">U kunt de beëindiging aanvragen. We nemen contact op over de einddatum en lopende verzoeken. Uw historie blijft inzichtelijk.</p>
          <ActionForm action={requestEndAction} submitLabel="Beëindiging aanvragen" submitClassName="btn-secondary" confirm="Beëindiging van uw lidmaatschap aanvragen?">
            <label className="label" htmlFor="note">Toelichting (optioneel)</label>
            <textarea className="field min-h-[80px]" id="note" name="note" maxLength={300} />
          </ActionForm>
        </Section>
      )}
    </>
  )
}
