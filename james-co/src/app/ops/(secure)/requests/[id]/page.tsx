import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth/session'
import { getRequestForStaff, missingInfo, CATEGORIES, CATEGORY_LABEL, type ProposalRow, type BookingRow } from '@/lib/domain/requests'
import { summarizeBookings } from '@/lib/domain/bookings'
import { listSuppliers } from '@/lib/domain/suppliers'
import { ACTIVITIES, ACTIVITY_LABEL } from '@/lib/domain/work'
import { DomainError } from '@/lib/errors'
import { ActionForm } from '@/components/ActionForm'
import { Badge, Notice, DL } from '@/components/ui'
import { RequestStatus } from '@/components/RequestStatus'
import * as act from '@/app/actions/staff'
import { formatMoney } from '@/lib/money'
import { formatDate, formatDateTime, nowMs } from '@/lib/time'
import { AVAILABILITY_LABEL, BOOKING_LABEL, PAYMENT_ROUTE_LABEL } from '@/lib/labels'
import { BUDGET_BANDS } from '@/lib/domain/members'

function localInput(d: Date | null | undefined): string {
  if (!d) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
  return parts.replace(' ', 'T')
}

const CHANNEL_LABEL: Record<string, string> = { portal: 'Portaal', whatsapp_manual: 'WhatsApp (vastgelegd)', whatsapp_api: 'WhatsApp', email: 'E-mail (vastgelegd)', phone_note: 'Telefoon (vastgelegd)' }

export default async function StaffRequest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { actor } = await requireStaff()
  let d
  try { d = await getRequestForStaff(actor, id) } catch (e) { if (e instanceof DomainError) notFound(); throw e }
  const suppliers = await listSuppliers(actor)
  const { request: r } = d
  const missing = missingInfo(r)
  const draft = d.proposals.find((p) => p.status === 'draft')
  const approval = d.proposals.find((p) => p.approval)?.approval
  const closed = ['completed', 'closed', 'rejected', 'cancelled'].includes(r.status)
  const totalMinutes = d.time.reduce((a, t) => a + (t.minutes ?? 0), 0)
  const prefs = (d.prefs ?? {}) as Record<string, unknown>
  const hidden = <input type="hidden" name="requestId" value={r.id} />

  return (
    <div>
      <Link href="/ops" className="text-sm text-muted hover:text-forest">← Werkvoorraad</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-[32px] leading-tight">{r.title ?? 'Verzoek'} · {r.memberName}</h1>
        <RequestStatus status={r.status} />
        {r.urgency === 'high' && <Badge tone="danger">Urgent</Badge>}
        {r.hasIssue && <Badge tone="danger">Probleem</Badge>}
        {r.cancellationRequestedAt && <Badge tone="warn">Annulering aangevraagd</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted">Eigenaar: {r.ownerName ?? 'niemand'} · ingediend {formatDateTime(r.createdAt)} · actieve behandeltijd {totalMinutes} min</p>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section className="card">
            <h2 className="mb-3 text-[22px]">Wens</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{r.brief}</p>
            <div className="mt-4"><DL items={[
              ['Categorie', r.category ? CATEGORY_LABEL[r.category] : '—'], ['Datum', r.desiredDate ? `${formatDate(r.desiredDate)} ${r.desiredTime ?? ''}` : '—'],
              ['Personen', r.partySize ?? '—'], ['Plaats', r.location ?? '—'],
              ['Budget', r.budgetMinor != null ? `${formatMoney(r.budgetMinor)} ${r.budgetBasis === 'per_person' ? 'per persoon' : 'totaal'}` : '—'], ['Flexibiliteit', r.flexibility ?? '—'],
            ]} /></div>
            {missing.length > 0 && <div className="mt-4"><Notice tone="warn" title="Mogelijk ontbrekend">{missing.join(', ')}. Stel één gerichte vraag; vul niets aan uit eigen aanname.</Notice></div>}
          </section>

          <section className="card">
            <h2 className="mb-3 text-[22px]">Klantcontext</h2>
            <DL items={[
              ['E-mail', r.memberEmail], ['Regio', (prefs.homeRegion as string) ?? '—'], ['Reisafstand', prefs.travelRadiusKm ? `${prefs.travelRadiusKm} km` : '—'],
              ['Budgetband', prefs.budgetBand ? BUDGET_BANDS[prefs.budgetBand as keyof typeof BUDGET_BANDS] : '—'], ['Voorkeurstijden', (prefs.preferredTimes as string) ?? '—'],
              ['Notities lid', (prefs.notes as string) ?? '—'],
              ['Dieet/allergie', d.sensitive ? `${d.sensitive.dietary ?? ''} ${d.sensitive.allergies ? `· allergie: ${d.sensitive.allergies}` : ''}` : 'niet gedeeld'],
            ]} />
            <p className="mt-3 text-[13px] text-muted">Deel met leveranciers alleen wat voor dit verzoek nodig is. <Link href={`/ops/members/${r.memberId}`} className="underline">Klantdossier</Link></p>
          </section>

          <section className="card">
            <h2 className="mb-3 text-[22px]">Gesprek met het lid</h2>
            <ol className="max-h-[420px] space-y-3 overflow-y-auto">
              {d.messages.length === 0 && <li className="text-sm text-muted">Nog geen berichten.</li>}
              {d.messages.map((m) => (
                <li key={m.id} className={`rounded-xl px-3.5 py-2.5 text-[14px] ${m.senderType === 'member' ? 'mr-8 bg-canvas' : m.senderType === 'system' ? 'bg-canvas/50 text-muted' : 'ml-8 bg-forest-soft'}`}>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className="mt-1 text-[12px] text-muted">{m.senderType === 'member' ? 'Lid' : m.senderType === 'system' ? 'Systeem' : m.authorName} · {CHANNEL_LABEL[m.channel]} · {formatDateTime(m.createdAt)}{m.deliveryStatus !== 'stored' ? ` · ${m.deliveryStatus}` : ''}</p>
                </li>
              ))}
            </ol>
            {!closed && (
              <ActionForm action={act.staffMessageAction} idempotent resetOnSuccess submitLabel="Plaatsen" pendingLabel="Bezig…">
                {hidden}
                <label className="label mt-4" htmlFor="body">Bericht</label>
                <textarea className="field min-h-[90px]" id="body" name="body" required />
                <label className="label mt-3" htmlFor="channel">Soort</label>
                <select className="field max-w-sm" id="channel" name="channel">
                  <option value="portal">Bericht aan lid in het portaal</option>
                  <option value="whatsapp_manual">Samenvatting van WhatsApp-gesprek (niet verzenden)</option>
                  <option value="phone_note">Samenvatting van telefoongesprek (niet verzenden)</option>
                  <option value="email">Samenvatting van e-mail (niet verzenden)</option>
                </select>
                <p className="hint">Vastgelegde gesprekken zijn zichtbaar voor het lid. Leg alleen de zakelijke samenvatting vast, geen complete privégesprekken.</p>
              </ActionForm>
            )}
          </section>

          <ProposalsSection proposals={d.proposals} draft={draft} requestId={r.id} closed={closed} suppliers={suppliers} checks={d.checks} />
          <BookingsSection bookings={d.bookings} requestId={r.id} hasApproval={Boolean(approval)} status={r.status} suppliers={suppliers} />
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="card">
            <h2 className="mb-3 text-[20px]">Eigenaar</h2>
            <ActionForm action={act.assignAction} submitLabel={r.ownerId ? 'Overdragen' : 'Toewijzen'} submitClassName="btn-secondary">
              {hidden}
              <select className="field" name="ownerId" defaultValue={r.ownerId ?? actor.userId ?? ''} aria-label="Eigenaar">{d.staff.map((s) => <option key={s.userId} value={s.userId}>{s.fullName}</option>)}</select>
              {r.ownerId && <input className="field mt-2" name="note" placeholder="Notitie bij overdracht (verplicht)" aria-label="Notitie bij overdracht" />}
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="mb-3 text-[20px]">Volgende actie</h2>
            <ActionForm action={act.nextActionAction} submitLabel="Opslaan" submitClassName="btn-secondary">
              {hidden}
              <input className="field" name="nextAction" required defaultValue={r.nextAction ?? ''} aria-label="Volgende actie" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className="field" type="datetime-local" name="dueAt" required defaultValue={localInput(r.nextActionDueAt)} aria-label="Deadline" />
                <select className="field" name="urgency" defaultValue={r.urgency} aria-label="Urgentie"><option value="normal">Normaal</option><option value="high">Urgent</option></select>
                <select className="field" name="waitingOn" defaultValue={r.waitingOn ?? ''} aria-label="Wacht op"><option value="">Wacht op niemand</option><option value="member">Wacht op lid</option><option value="supplier">Wacht op leverancier</option></select>
                <select className="field" name="category" defaultValue={r.category ?? ''} aria-label="Categorie"><option value="">Categorie…</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select>
              </div>
              <input className="field mt-2" name="title" defaultValue={r.title ?? ''} placeholder="Korte titel voor het dossier" aria-label="Dossiertitel" />
            </ActionForm>
          </section>

          {!closed && (
            <section className="card">
              <h2 className="mb-3 text-[20px]">Status</h2>
              <ActionForm action={act.statusAction} submitLabel="Wijzigen" submitClassName="btn-secondary">
                {hidden}
                <select className="field" name="status" defaultValue="" required aria-label="Nieuwe status">
                  <option value="" disabled>Kies…</option>
                  <option value="needs_info">Informatie nodig (vraag aan lid)</option>
                  <option value="researching">Onderzoek</option>
                  {r.status === 'confirmed' && <option value="completed">Afgerond</option>}
                  <option value="rejected">Niet uitvoerbaar (afwijzen)</option>
                  <option value="cancelled">Geannuleerd</option>
                </select>
                <select className="field mt-2" name="waitingOn" aria-label="Wacht op"><option value="">—</option><option value="supplier">Wacht op leverancier</option><option value="member">Wacht op lid</option></select>
                <textarea className="field mt-2 min-h-[70px]" name="note" placeholder="Toelichting (bij info nodig/afwijzen zichtbaar voor het lid)" aria-label="Toelichting" />
              </ActionForm>
              {r.status === 'completed' && <p className="mt-2 text-sm text-muted">Afgerond. Sluit na nazorg.</p>}
            </section>
          )}
          {r.status === 'completed' && (
            <section className="card"><ActionForm action={act.statusAction} submitLabel="Dossier sluiten" submitClassName="btn-secondary">{hidden}<input type="hidden" name="status" value="closed" /></ActionForm></section>
          )}

          <section className="card">
            <h2 className="mb-3 text-[20px]">Probleem</h2>
            {r.hasIssue ? (
              <><p className="mb-2 text-sm text-danger">{r.issueNote ?? 'Gemarkeerd als probleem.'}</p>
                <ActionForm action={act.issueFlagAction} submitLabel="Opgelost" submitClassName="btn-secondary">{hidden}<input type="hidden" name="hasIssue" value="false" /></ActionForm></>
            ) : (
              <ActionForm action={act.issueFlagAction} submitLabel="Markeer als probleem" submitClassName="btn-danger">{hidden}<input type="hidden" name="hasIssue" value="true" /><input className="field" name="note" placeholder="Wat is er aan de hand?" aria-label="Probleem" required /></ActionForm>
            )}
          </section>

          <section className="card">
            <h2 className="mb-3 text-[20px]">Beschikbaarheid</h2>
            <ul className="mb-3 space-y-2 text-[13px]">
              {d.checks.length === 0 && <li className="text-muted">Nog geen checks vastgelegd.</li>}
              {d.checks.map((c) => <li key={c.id} className="rounded-lg bg-canvas p-2"><strong>{c.supplierName}</strong>: {c.result} · {c.source} · {formatDateTime(c.checkedAt)}{c.validUntil ? ` · geldig tot ${formatDateTime(c.validUntil)}` : ''}{c.details ? <><br />{c.details}</> : null}</li>)}
            </ul>
            <ActionForm action={act.availabilityAction} submitLabel="Check vastleggen" submitClassName="btn-secondary">
              {hidden}
              <select className="field" name="supplierId" required aria-label="Leverancier" defaultValue=""><option value="" disabled>Leverancier…</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select className="field" name="result" aria-label="Resultaat"><option value="available">Beschikbaar</option><option value="tentative">Voorlopig</option><option value="unavailable">Niet beschikbaar</option><option value="unknown">Onbekend</option></select>
                <select className="field" name="source" aria-label="Bron"><option value="phone">Telefoon</option><option value="email">E-mail</option><option value="website">Website</option><option value="supplier_system">Systeem leverancier</option><option value="in_person">Persoonlijk</option></select>
                <label className="text-[12px] text-muted">Gecontroleerd op<input className="field" type="datetime-local" name="checkedAt" required defaultValue={localInput(new Date())} /></label>
                <label className="text-[12px] text-muted">Geldig tot (optioneel)<input className="field" type="datetime-local" name="validUntil" /></label>
              </div>
              <input className="field mt-2" name="details" placeholder="Details (bijv. tafel 20:00 vastgehouden tot morgen 12:00)" aria-label="Details" />
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="mb-3 text-[20px]">Taken</h2>
            <ul className="mb-3 space-y-2 text-sm">
              {d.tasks.length === 0 && <li className="text-muted">Geen taken.</li>}
              {d.tasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-2">
                  <span className={t.status !== 'open' ? 'text-muted line-through' : ''}>{t.title}{t.dueAt && <span className="block text-[12px] text-muted">{formatDateTime(t.dueAt)} · {t.assigneeName ?? 'niet toegewezen'}</span>}</span>
                  {t.status === 'open' && <ActionForm action={act.taskStatusAction} submitLabel="✓" submitClassName="btn-quiet min-h-0 px-2 py-1"><input type="hidden" name="taskId" value={t.id} /><input type="hidden" name="path" value={`/ops/requests/${r.id}`} /></ActionForm>}
                </li>
              ))}
            </ul>
            <ActionForm action={act.taskAction} resetOnSuccess submitLabel="Taak toevoegen" submitClassName="btn-secondary">
              {hidden}<input type="hidden" name="path" value={`/ops/requests/${r.id}`} />
              <input className="field" name="title" required placeholder="Nieuwe taak" aria-label="Nieuwe taak" />
              <input className="field mt-2" type="datetime-local" name="dueAt" aria-label="Deadline" />
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="mb-1 text-[20px]">Behandeltijd</h2>
            <p className="mb-3 text-[13px] text-muted">Alleen actieve arbeid. Wachten op een leverancier telt niet mee.</p>
            <ul className="mb-3 space-y-1 text-[13px]">{d.time.map((t) => <li key={t.id}>{t.minutes ?? 'loopt'} min · {ACTIVITY_LABEL[t.activity as keyof typeof ACTIVITY_LABEL]} · {t.staffName}{t.note ? ` · ${t.note}` : ''}</li>)}</ul>
            <ActionForm action={act.timeAction} resetOnSuccess submitLabel="Minuten registreren" submitClassName="btn-secondary">
              {hidden}<input type="hidden" name="path" value={`/ops/requests/${r.id}`} />
              <div className="grid grid-cols-2 gap-2">
                <input className="field" type="number" name="minutes" min={1} max={1440} required placeholder="Minuten" aria-label="Minuten" />
                <select className="field" name="activity" aria-label="Activiteit">{ACTIVITIES.map((a) => <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>)}</select>
              </div>
              <input className="field mt-2" name="note" placeholder="Notitie (optioneel)" aria-label="Notitie" />
            </ActionForm>
            <div className="mt-3">
              <ActionForm action={act.startTimerAction} submitLabel="Start timer" submitClassName="btn-quiet text-sm">{hidden}<input type="hidden" name="activity" value="research" /></ActionForm>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-1 text-[20px]">Interne notities</h2>
            <p className="mb-3 text-[13px] text-muted">Nooit zichtbaar voor het lid.</p>
            <ul className="mb-3 space-y-2 text-[14px]">{d.notes.map((n) => <li key={n.id} className="rounded-lg bg-canvas p-2"><p className="whitespace-pre-line">{n.body}</p><p className="text-[12px] text-muted">{n.authorName} · {formatDateTime(n.createdAt)}</p></li>)}</ul>
            <ActionForm action={act.noteAction} resetOnSuccess submitLabel="Notitie toevoegen" submitClassName="btn-secondary">
              {hidden}<input type="hidden" name="path" value={`/ops/requests/${r.id}`} />
              <textarea className="field min-h-[70px]" name="body" required aria-label="Interne notitie" />
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="mb-3 text-[20px]">Audittrail</h2>
            <ol className="max-h-[260px] space-y-1 overflow-y-auto text-[12px] text-muted">
              {d.auditTrail.map((a) => <li key={a.id}>{formatDateTime(a.createdAt)} · {a.actorName ?? a.actorType} · {a.action}</li>)}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}

type Sup = { id: string; name: string }
type Check = { id: string; supplierName: string; result: string; checkedAt: Date }

function ProposalsSection({ proposals, draft, requestId, closed, suppliers, checks }: { proposals: ProposalRow[]; draft?: ProposalRow; requestId: string; closed: boolean; suppliers: Sup[]; checks: Check[] }) {
  const issued = proposals.filter((p) => p.status !== 'draft')
  const nextPosition = draft ? ([1, 2, 3].find((n) => !draft.options.some((o) => o.position === n)) ?? null) : null
  return (
    <section className="card">
      <h2 className="mb-3 text-[22px]">Voorstellen</h2>
      {issued.map((p) => (
        <div key={p.id} className="mb-4 rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Versie {p.version}</p>
            <Badge tone={p.status === 'accepted' ? 'ok' : p.status === 'issued' ? 'warn' : 'neutral'}>{p.status === 'issued' ? 'Uitgegeven · wacht op lid' : p.status === 'accepted' ? 'Geaccepteerd' : p.status === 'expired' ? 'Verlopen' : p.status === 'superseded' ? 'Vervangen' : 'Ingetrokken'}</Badge>
          </div>
          <p className="text-[12px] text-muted">Uitgegeven {formatDateTime(p.issuedAt)} · vervalt {formatDateTime(p.expiresAt)} · hash {p.snapshotHash?.slice(0, 10)}…</p>
          <ul className="mt-2 space-y-1 text-[14px]">
            {p.options.map((o) => <li key={o.id} className={p.approval?.optionId === o.id ? 'font-medium text-ok' : ''}>{o.position}. {o.label} — {formatMoney(o.totalMinor)}{o.priceKind === 'estimate' ? ` (raming, max ${formatMoney(o.maxMinor)})` : ''}{p.approval?.optionId === o.id ? ' ✓ gekozen' : ''}</li>)}
          </ul>
          {p.status === 'issued' && <ActionForm action={act.withdrawProposalAction} submitLabel="Intrekken" submitClassName="btn-quiet text-sm" confirm="Voorstel intrekken?"><input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="proposalId" value={p.id} /></ActionForm>}
        </div>
      ))}
      {!closed && !draft && (
        <ActionForm action={act.draftProposalAction} submitLabel={issued.length ? `Nieuwe versie (${issued.length + 1}) maken` : 'Voorstel maken'} submitClassName="btn-secondary">
          <input type="hidden" name="requestId" value={requestId} />
        </ActionForm>
      )}
      {draft && (
        <div className="rounded-xl border-2 border-dashed border-forest/30 p-4">
          <p className="font-medium">Concept · versie {draft.version}</p>
          <p className="mb-3 text-[13px] text-muted">Na uitgeven is deze versie onveranderlijk. Maximaal drie opties.</p>
          {draft.options.map((o) => (
            <div key={o.id} className="mb-3 rounded-lg bg-canvas p-3 text-[14px]">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-medium">{o.position}. {o.label} — {formatMoney(o.totalMinor)} {o.priceKind === 'estimate' ? `(raming, max ${formatMoney(o.maxMinor)})` : '(vast)'}</p>
                  <p className="text-[12px] text-muted">{o.supplierName ?? 'geen leverancier'} · {PAYMENT_ROUTE_LABEL[o.paymentRoute]} · {AVAILABILITY_LABEL[o.availabilityStatus]} · annuleren: {o.cancellationTerms}</p></div>
                <ActionForm action={act.removeOptionAction} submitLabel="Verwijder" submitClassName="btn-quiet min-h-0 px-2 py-1 text-[12px]"><input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="proposalId" value={draft.id} /><input type="hidden" name="position" value={o.position} /></ActionForm>
              </div>
            </div>
          ))}
          {nextPosition && (
            <details className="mb-3 rounded-lg border border-line p-3" open={draft.options.length === 0}>
              <summary className="cursor-pointer text-[14px] font-medium">Optie {nextPosition} toevoegen</summary>
              <ActionForm action={act.optionAction} submitLabel="Optie opslaan" submitClassName="btn-secondary">
                <input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="proposalId" value={draft.id} /><input type="hidden" name="position" value={nextPosition} />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input className="field sm:col-span-2" name="label" required placeholder="Titel, bijv. Chef's table bij …" aria-label="Titel van de optie" />
                  <select className="field" name="supplierId" aria-label="Leverancier" defaultValue=""><option value="">Leverancier uit bestand…</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  <input className="field" name="supplierName" placeholder="of naam leverancier" aria-label="Naam leverancier" />
                  <textarea className="field sm:col-span-2" name="description" placeholder="Beschrijving voor het lid" aria-label="Beschrijving" />
                  <input className="field" name="included" placeholder="Inbegrepen" aria-label="Inbegrepen" />
                  <input className="field" name="excluded" placeholder="Niet inbegrepen" aria-label="Niet inbegrepen" />
                  <select className="field" name="priceKind" aria-label="Prijssoort"><option value="fixed">Vaste prijs</option><option value="estimate">Raming met maximum</option></select>
                  <input className="field" name="total" required inputMode="decimal" placeholder="Bedrag €" aria-label="Bedrag" />
                  <input className="field" name="max" inputMode="decimal" placeholder="Maximum € (bij raming)" aria-label="Maximum" />
                  <input className="field" name="taxNote" placeholder="Belasting, bijv. incl. btw" aria-label="Belasting" />
                  <select className="field" name="paymentRoute" aria-label="Betaalroute"><option value="pay_supplier_directly">Lid betaalt leverancier</option><option value="invoice_via_james">Factuur via James & Co.</option><option value="prepaid_by_member">Vooruitbetaling door lid</option></select>
                  <select className="field" name="availabilityStatus" aria-label="Beschikbaarheid"><option value="to_be_checked">Nog te controleren</option><option value="tentative">Voorlopig</option><option value="checked_available">Gecontroleerd beschikbaar</option></select>
                  <select className="field sm:col-span-2" name="availabilityCheckId" aria-label="Beschikbaarheidscheck" defaultValue=""><option value="">Koppel check (verplicht bij gecontroleerd)…</option>{checks.filter((c) => c.result === 'available').map((c) => <option key={c.id} value={c.id}>{c.supplierName} · {formatDateTime(c.checkedAt)}</option>)}</select>
                  <textarea className="field sm:col-span-2" name="cancellationTerms" required placeholder="Annuleringsvoorwaarden (verplicht)" aria-label="Annuleringsvoorwaarden" />
                </div>
              </ActionForm>
            </details>
          )}
          {draft.options.length > 0 && (
            <ActionForm action={act.issueProposalAction} submitLabel="Uitgeven aan lid" confirm="Voorstel uitgeven? Deze versie kan daarna niet meer worden gewijzigd.">
              <input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="proposalId" value={draft.id} />
              <label className="label" htmlFor="intro">Introductie voor het lid</label>
              <textarea className="field min-h-[70px]" id="intro" name="intro" defaultValue={draft.intro ?? ''} />
              <label className="label mt-3" htmlFor="expiresAt">Geldig tot</label>
              <input className="field max-w-xs" type="datetime-local" id="expiresAt" name="expiresAt" required defaultValue={localInput(new Date(nowMs() + 2 * 86400_000))} />
            </ActionForm>
          )}
        </div>
      )}
    </section>
  )
}

function BookingsSection({ bookings, requestId, hasApproval, status, suppliers }: { bookings: BookingRow[]; requestId: string; hasApproval: boolean; status: string; suppliers: Sup[] }) {
  const summary = summarizeBookings(bookings)
  const hidden = <input type="hidden" name="requestId" value={requestId} />
  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[22px]">Boekingsonderdelen</h2>
        {bookings.length > 0 && <Badge tone={summary === 'all_confirmed' ? 'ok' : summary === 'partial' ? 'warn' : 'neutral'}>{summary === 'all_confirmed' ? 'Alles bevestigd' : summary === 'partial' ? 'Gedeeltelijk bevestigd' : summary === 'cancelled' ? 'Geannuleerd' : 'Nog niet bevestigd'}</Badge>}
      </div>
      {!hasApproval && <p className="text-sm text-muted">Boeken kan pas na een geldig akkoord van het lid op een voorstel.</p>}
      <ul className="space-y-3">
        {bookings.map((b) => (
          <li key={b.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{b.title} · {b.supplierName}{b.required ? '' : ' (optioneel)'}</p>
              <Badge tone={b.status === 'confirmed' ? 'ok' : b.status === 'failed' ? 'danger' : 'warn'}>{BOOKING_LABEL[b.status]}{b.cancellationRequestedAt && b.status !== 'cancelled' && b.status !== 'cancellation_requested' ? ' · annulering gevraagd' : ''}</Badge>
            </div>
            <p className="text-[12px] text-muted">{b.startsAt ? formatDateTime(b.startsAt, b.timezone) : 'geen tijdstip'}{b.priceMinor != null ? ` · ${formatMoney(b.priceMinor, b.currency)}` : ''}</p>
            {b.confirmedAt && <p className="mt-2 text-[13px]">Bewijs: {b.supplierReference ? `ref. ${b.supplierReference}` : ''} {b.confirmationNote ?? ''} · bron {b.confirmationSource} · gecontroleerd {formatDateTime(b.checkedAt)}</p>}
            {b.cancellationConfirmedAt && <p className="mt-1 text-[13px]">Annulering: {b.cancellationEvidence} · {formatDateTime(b.cancellationConfirmedAt)}</p>}
            {['pending', 'requested', 'failed'].includes(b.status) && !b.cancellationRequestedAt && (
              <div className="mt-3 flex flex-wrap gap-2">
                {b.status === 'pending' && <ActionForm action={act.bookingRequestedAction} submitLabel="Aangevraagd bij leverancier" submitClassName="btn-quiet text-sm">{hidden}<input type="hidden" name="bookingId" value={b.id} /></ActionForm>}
                <details className="w-full rounded-lg bg-canvas p-3">
                  <summary className="cursor-pointer text-[14px] font-medium">Bevestigen met leveranciersbewijs</summary>
                  <ActionForm action={act.confirmBookingAction} submitLabel="Bevestiging vastleggen">
                    {hidden}<input type="hidden" name="bookingId" value={b.id} />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input className="field" name="supplierReference" placeholder="Reserveringsreferentie" aria-label="Referentie" />
                      <select className="field" name="confirmationSource" required aria-label="Bron"><option value="email">Bevestiging per e-mail</option><option value="phone">Telefonisch bevestigd</option><option value="supplier_system">Systeem leverancier</option><option value="in_person">Persoonlijk</option></select>
                      <textarea className="field sm:col-span-2" name="confirmationNote" placeholder="Bevestigingsnotitie: wie bevestigde wat (verplicht zonder referentie)" aria-label="Bevestigingsnotitie" />
                      <label className="text-[12px] text-muted">Gecontroleerd op<input className="field" type="datetime-local" name="checkedAt" required defaultValue={localInput(new Date(nowMs()))} /></label>
                      <input className="field" name="emergencyContact" placeholder="Noodcontact leverancier tijdens afspraak" aria-label="Noodcontact" />
                      <textarea className="field sm:col-span-2" name="memberDetails" placeholder="Praktische gegevens voor het lid (adres, tijd, naam op reservering)" aria-label="Praktische gegevens" />
                    </div>
                  </ActionForm>
                </details>
                {b.status !== 'failed' && <ActionForm action={act.bookingFailedAction} submitLabel="Niet gelukt" submitClassName="btn-quiet text-sm text-danger">{hidden}<input type="hidden" name="bookingId" value={b.id} /><input className="field mt-1" name="note" required placeholder="Wat ging er mis?" aria-label="Wat ging er mis" /></ActionForm>}
              </div>
            )}
            {b.cancellationRequestedAt && !['cancelled', 'failed'].includes(b.status) && (
              <div className="mt-3 rounded-lg bg-warn-soft p-3">
                <p className="text-[14px] font-medium text-warn">Lid vraagt annulering aan ({formatDateTime(b.cancellationRequestedAt)})</p>
                <ActionForm action={act.confirmCancellationAction} submitLabel="Annulering door leverancier bevestigd">
                  {hidden}<input type="hidden" name="bookingId" value={b.id} />
                  <input className="field mt-2" name="evidence" required placeholder="Bewijs: wie bevestigde, wanneer, eventuele kosten" aria-label="Bewijs annulering" />
                </ActionForm>
              </div>
            )}
          </li>
        ))}
      </ul>
      {hasApproval && ['arranging', 'confirmed'].includes(status) && (
        <details className="mt-4 rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-[14px] font-medium">Onderdeel toevoegen</summary>
          <ActionForm action={act.addBookingAction} submitLabel="Toevoegen" submitClassName="btn-secondary">
            {hidden}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input className="field" name="title" required placeholder="Onderdeel, bijv. Diner of Vervoer" aria-label="Onderdeel" />
              <select className="field" name="supplierId" aria-label="Leverancier" defaultValue=""><option value="">Leverancier uit bestand…</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <input className="field" name="supplierName" placeholder="of naam leverancier" aria-label="Naam leverancier" />
              <input className="field" name="price" inputMode="decimal" placeholder="Bedrag €" aria-label="Bedrag" />
              <input className="field" type="date" name="date" aria-label="Datum" />
              <input className="field" type="time" name="time" aria-label="Tijd" />
              <input className="field sm:col-span-2" name="terms" placeholder="Voorwaarden" aria-label="Voorwaarden" />
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="required" defaultChecked className="h-4 w-4 accent-forest" /> Vereist voor &ldquo;alles bevestigd&rdquo;</label>
            </div>
          </ActionForm>
        </details>
      )}
    </section>
  )
}
