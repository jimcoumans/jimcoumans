import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth/session'
import { getSupplier } from '@/lib/domain/suppliers'
import { DomainError } from '@/lib/errors'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle, Section, Badge } from '@/components/ui'
import { SupplierForm } from '@/components/SupplierForm'
import { supplierContactAction, supplierTermsAction, supplierVerificationAction } from '@/app/actions/staff'
import { formatDate, formatDateTime } from '@/lib/time'

export default async function SupplierDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { actor } = await requireStaff()
  let d
  try { d = await getSupplier(actor, id) } catch (e) { if (e instanceof DomainError) notFound(); throw e }
  const s = d.supplier
  const hidden = <input type="hidden" name="id" value={id} />
  return (
    <>
      <PageTitle title={s.name}>{s.isDemo && <Badge tone="warn">Demo — fictieve leverancier</Badge>} {s.verificationStatus === 'verified' ? <Badge tone="ok">Geverifieerd {formatDate(s.lastVerifiedAt)}</Badge> : <Badge tone="warn">{s.verificationStatus === 'inactive' ? 'Inactief' : 'Niet geverifieerd'}</Badge>}</PageTitle>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Gegevens"><SupplierForm s={s} /></Section>
        <div>
          <Section title="Verificatie">
            <ActionForm action={supplierVerificationAction} submitLabel="Vastleggen" submitClassName="btn-secondary">
              {hidden}
              <select className="field" name="status" defaultValue={s.verificationStatus} aria-label="Status"><option value="verified">Geverifieerd</option><option value="unverified">Niet geverifieerd</option><option value="inactive">Inactief</option></select>
              <input className="field mt-2" name="note" placeholder="Hoe en met wie geverifieerd (verplicht bij geverifieerd)" aria-label="Toelichting" />
            </ActionForm>
          </Section>
          <Section title="Afspraken en commissie (intern)">
            <ul className="mb-4 space-y-2 text-[14px]">{d.terms.length === 0 && <li className="text-muted">Geen vastgelegde afspraken.</li>}{d.terms.map((t) => <li key={t.id} className="rounded-lg bg-canvas p-2">{formatDate(t.validFrom)} – {t.validUntil ? formatDate(t.validUntil) : 'doorlopend'}: {t.agreement}{t.commissionBp != null ? ` · commissie ${t.commissionBp / 100}%` : ''}{t.commissionBasis ? ` (${t.commissionBasis})` : ''}</li>)}</ul>
            <ActionForm action={supplierTermsAction} resetOnSuccess submitLabel="Afspraak toevoegen" submitClassName="btn-secondary">
              {hidden}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-sm">Geldig vanaf<input className="field mt-1" type="date" name="validFrom" required /></label>
                <label className="text-sm">Geldig tot<input className="field mt-1" type="date" name="validUntil" /></label>
                <textarea className="field sm:col-span-2" name="agreement" required placeholder="Afspraak" aria-label="Afspraak" />
                <input className="field" name="commissionPercent" placeholder="Commissie %" aria-label="Commissie" />
                <input className="field" name="commissionBasis" placeholder="Grondslag" aria-label="Grondslag" />
              </div>
              <p className="hint">Commissie is nooit een reden om een slechter passende optie te adviseren. Leveranciers betalen in V1 niet voor plaatsing.</p>
            </ActionForm>
          </Section>
          <Section title="Contacthistorie">
            <ul className="mb-3 space-y-1 text-[13px]">{d.contacts.map((c) => <li key={c.id}>{formatDateTime(c.createdAt)} · {c.channel} · {c.staffName}: {c.summary}</li>)}</ul>
            <ActionForm action={supplierContactAction} resetOnSuccess submitLabel="Contact vastleggen" submitClassName="btn-secondary">
              {hidden}
              <div className="grid grid-cols-[140px_1fr] gap-2"><select className="field" name="channel" aria-label="Kanaal"><option value="phone">Telefoon</option><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option><option value="in_person">Persoonlijk</option><option value="other">Anders</option></select><input className="field" name="summary" required placeholder="Samenvatting" aria-label="Samenvatting" /></div>
            </ActionForm>
          </Section>
        </div>
      </div>
    </>
  )
}
