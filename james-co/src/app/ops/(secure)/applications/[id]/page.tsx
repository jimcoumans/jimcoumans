import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth/session'
import { getApplication } from '@/lib/domain/applications'
import { getSettings } from '@/lib/domain/settings'
import { DomainError } from '@/lib/errors'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle, Section, DL, Badge, Notice } from '@/components/ui'
import { applicationStatusAction, issueOfferAction, noteAction } from '@/app/actions/staff'
import { APPLICATION_LABEL } from '@/lib/labels'
import { formatDate, formatDateTime } from '@/lib/time'
import { formatMoney } from '@/lib/money'

const QUESTIONS = [
  'Wat heeft u de afgelopen maand zelf georganiseerd terwijl u het liever had uitbesteed?',
  'Hoe vaak gebeurt dat en wie regelt het nu?',
  'Welke uitkomst zou een concierge voor u waardevol maken?',
  'Welke categorieën, regio’s en budgetten zijn relevant?',
  'Wat verwacht u aan snelheid en bereikbaarheid?',
  'Wilt u beginnen tegen de werkelijk aangeboden vergoeding?',
]

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { actor } = await requireStaff()
  let d
  try { d = await getApplication(actor, id) } catch (e) { if (e instanceof DomainError) notFound(); throw e }
  const s = await getSettings()
  const a = d.application
  const hidden = <input type="hidden" name="applicationId" value={id} />
  return (
    <>
      <PageTitle eyebrow="Aanmelding" title={a.fullName}><Badge>{APPLICATION_LABEL[a.status]}</Badge></PageTitle>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Aanvraag">
          <DL items={[['E-mail', a.email], ['Regio', a.region], ['Contact', `${a.preferredContact ?? ''} ${a.phone ?? ''}`], ['Segment', a.segment === 'international_visitor' ? 'International visitor' : 'NL lid'],
            ['Taal', a.language], ['Bezoek', a.visitStart ? `${formatDate(a.visitStart)} – ${formatDate(a.visitEnd)} (${a.partySize ?? '?'} pers.)` : '—'],
            ['Hulpvraag', <span key="h" className="whitespace-pre-line">{a.helpRequest}</span>], ['Gevonden via', a.source], ['Uitnodiging', a.invitationId ? 'Ja (geclaimd)' : 'Nee'], ['Ingediend', formatDateTime(a.createdAt)]]} />
          <ActionForm action={applicationStatusAction} submitLabel="Status wijzigen" submitClassName="btn-secondary">
            {hidden}
            <select className="field mt-4 max-w-xs" name="status" aria-label="Status"><option value="in_review">In beoordeling</option><option value="intro_scheduled">Kennismaking gepland</option><option value="rejected">Niet passend</option><option value="withdrawn">Ingetrokken</option></select>
          </ActionForm>
        </Section>
        <Section title="Kennismakingsgesprek">
          <ol className="list-decimal space-y-1 pl-5 text-[14px]">{QUESTIONS.map((q) => <li key={q}>{q}</li>)}</ol>
          <p className="mt-3 text-[13px] text-muted">Een enthousiaste reactie is geen koopbewijs. Betaalde deelname, herhaald gebruik en verlenging zijn dat wel.</p>
          <ul className="mt-4 space-y-2 text-[14px]">{d.notes.map((n) => <li key={n.id} className="rounded-lg bg-canvas p-2"><p className="whitespace-pre-line">{n.body}</p><p className="text-[12px] text-muted">{n.author} · {formatDateTime(n.createdAt)}</p></li>)}</ul>
          <ActionForm action={noteAction} resetOnSuccess submitLabel="Gespreksnotitie opslaan" submitClassName="btn-secondary">{hidden}<input type="hidden" name="path" value={`/ops/applications/${id}`} /><textarea className="field mt-2 min-h-[100px]" name="body" required aria-label="Notitie" /></ActionForm>
        </Section>
        <Section title="Lidmaatschapsaanbod">
          {d.offers.length > 0 && (
            <ul className="mb-4 space-y-1 text-[14px]">{d.offers.map((o) => <li key={o.id}>Versie {o.version}: {formatMoney(o.priceMinor, o.currency)} · {o.status} · vervalt {formatDate(o.expiresAt)}</li>)}</ul>
          )}
          {a.status === 'accepted' ? <Notice tone="ok">Aanbod geaccepteerd. Ga naar Facturatie voor factuur, betaling en activatie.</Notice> : ['submitted', 'in_review', 'intro_scheduled', 'offered', 'declined'].includes(a.status) ? (
            <ActionForm action={issueOfferAction} submitLabel={d.offers.length ? 'Nieuwe versie uitgeven' : 'Aanbod uitgeven'} confirm="Aanbod uitgeven aan deze kandidaat?">
              {hidden}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-sm">Prijs € ({s.membershipPlan.includesTax ? 'incl.' : 'excl.'} {s.membershipPlan.taxRateBp / 100}% btw)<input className="field mt-1" name="price" defaultValue={(s.membershipPlan.priceMinor / 100).toFixed(2).replace('.', ',')} /></label>
                <label className="text-sm">Geldig (dagen)<input className="field mt-1" type="number" name="validDays" defaultValue={s.membershipPlan.offerValidDays} min={1} max={90} /></label>
                <label className="text-sm sm:col-span-2">Inhoud<textarea className="field mt-1 min-h-[110px]" name="scopeText" defaultValue={s.membershipPlan.scopeText} /></label>
              </div>
              <p className="hint">Voorwaarden: versie {s.membershipPlan.termsVersion} (Instellingen). Prijs en btw-behandeling zijn nog te valideren met een fiscalist.</p>
            </ActionForm>
          ) : <p className="text-sm text-muted">Geen aanbod mogelijk in deze status.</p>}
        </Section>
      </div>
    </>
  )
}
