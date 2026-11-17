import { requireAdmin } from '@/lib/auth/session'
import { adminReport } from '@/lib/domain/reports'
import { PageTitle, Section, Notice } from '@/components/ui'
import { formatMoney } from '@/lib/money'
import { CATEGORY_LABEL } from '@/lib/labels'

function pct(n: number, d: number) { return d ? `${Math.round((n / d) * 100)}%` : '—' }

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { actor } = await requireAdmin()
  const sp = await searchParams
  const to = sp.to ? new Date(`${sp.to}T23:59:59Z`) : new Date()
  const from = sp.from ? new Date(`${sp.from}T00:00:00Z`) : new Date(to.getTime() - 30 * 86400_000)
  const r = await adminReport(actor, from, to)
  const tile = (label: string, value: React.ReactNode, note: string) => (
    <div className="card py-4"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-[26px] font-medium">{value}</p><p className="mt-1 text-[12px] text-muted">{note}</p></div>
  )
  return (
    <>
      <PageTitle title="Rapportage">Aantallen staan naast percentages. Bij kleine aantallen zijn dit beschrijvingen, geen bewijs. Definities: docs/METEN.md.</PageTitle>
      <form method="get" className="mb-5 flex flex-wrap items-end gap-2">
        <label className="text-sm">Van<input className="field mt-1" type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} /></label>
        <label className="text-sm">Tot en met<input className="field mt-1" type="date" name="to" defaultValue={to.toISOString().slice(0, 10)} /></label>
        <button className="btn-primary">Toon</button>
      </form>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tile('Actieve leden', `${r.members!.active}`, `${r.members!.paying} betalend · ${r.members!.complimentary} zonder kosten`)}
        {tile('Lidmaatschapsomzet (netto)', formatMoney(r.revenue!.net), 'Uitgegeven lidmaatschapsfacturen in periode, excl. btw')}
        {tile('Kasontvangsten', formatMoney(r.cash!.received - r.cash!.refunded - r.cash!.corrected), `Ontvangen ${formatMoney(r.cash!.received)} − restituties/correcties`)}
        {tile('Leveranciersbesteding', formatMoney(r.supplierSpend!.total), 'Geaccepteerde bedragen van leden. Geen James-omzet.')}
        {tile('Overige eigen omzet (netto)', formatMoney(r.otherRevenue!.net), 'Project, Society en visitor')}
        {tile('Actieve behandeltijd', `${r.minutes!.total} min`, 'Geregistreerde minuten; wachttijd telt niet')}
        {tile('Eerste reactie (p50)', r.firstResponse!.p50Minutes != null ? `${Math.round(r.firstResponse!.p50Minutes)} min` : '—', `n=${r.firstResponse!.n}. Eerste inhoudelijke staffbericht in het portaal; kalendertijd, nog niet gecorrigeerd voor service-uren`)}
        {tile('Doorlooptijd tot bevestiging (p50)', r.throughput!.p50Hours != null ? `${Math.round(r.throughput!.p50Hours)} u` : '—', `n=${r.throughput!.n}. Intake tot laatste leveranciersbevestiging`)}
      </div>
      <Section title="Verzoeken in periode">
        {r.outcomes!.created === 0 ? <p className="text-sm text-muted">Geen verzoeken in deze periode.</p> : (
          <p className="text-[15px]">{r.outcomes!.created} ingediend · {r.outcomes!.confirmed} bevestigd ({pct(r.outcomes!.confirmed, r.outcomes!.created)}) · {r.outcomes!.completed} afgerond · {r.outcomes!.rejected} afgewezen · {r.outcomes!.cancelled} geannuleerd · {r.outcomes!.issues} met probleem</p>
        )}
        {r.perCategory.length > 0 && (
          <div className="mt-4 overflow-x-auto"><table className="table"><thead><tr><th>Categorie</th><th>Verzoeken</th><th>Minuten totaal</th><th>p50 per verzoek</th><th>p90 per verzoek</th></tr></thead><tbody>
            {r.perCategory.map((c) => <tr key={c.category ?? 'none'}><td>{c.category ? CATEGORY_LABEL[c.category as keyof typeof CATEGORY_LABEL] : 'Niet ingedeeld'}</td><td>{c.requests}</td><td>{c.minutes}</td><td>{c.p50 != null ? Math.round(c.p50) : '—'}</td><td>{c.p90 != null ? Math.round(c.p90) : '—'}</td></tr>)}
          </tbody></table></div>
        )}
      </Section>
      <Section title="Activatie en gebruik (alle cohorten)">
        <p className="text-[15px]">{r.activation!.activated} geactiveerde leden · {r.activation!.withCompleted} met een afgeronde opdracht ({pct(r.activation!.withCompleted, r.activation!.activated)}) · {r.activation!.withSecondIn30} met een tweede verzoek binnen 30 dagen ({pct(r.activation!.withSecondIn30, r.activation!.activated)})</p>
      </Section>
      <Section title="Instroom in periode">
        <p className="text-[15px]">{r.funnel!.applications} geverifieerde aanmeldingen · {r.funnel!.viaInvitation} via uitnodiging · {r.funnel!.offered} aanbod gedaan · {r.funnel!.accepted} geaccepteerd ({pct(r.funnel!.accepted, r.funnel!.offered)} van aanbiedingen)</p>
      </Section>
      <Notice tone="neutral">Retentie (verlengde betalende leden / verlengbare leden per cohort) is pas zinvol na de eerste verlengmomenten en wordt dan toegevoegd. Bijdrage (eigen opbrengst minus directe uitvoeringskosten) vereist een vastgesteld intern uurtarief; dat is nog niet ingesteld.</Notice>
    </>
  )
}
