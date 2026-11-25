import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { WebsiteTabs, StatusLabel } from '@/components/marketing/WebsiteKop'
import { marketingGebruiker } from '@/lib/marketing/toegang'
import { alleContent, celStatus, filterContent, type Filters } from '@/lib/marketing/content'
import { lijstBranches, lijstOnderwerpen } from '@/lib/marketing/registers'
import { ONDERWERP_NAAM, PUBLICATIE_NAAM, SOORT_NAAM } from '@/lib/marketing/velden'
import { formatDate } from '@/lib/dates'
import { nieuweContentActie } from '../../../marketing-actions'

/**
 * Alle website-content in één lijst, met filters op soort, branche,
 * onderwerp, eigenaar, status en volledigheid. Dezelfde gegevens als de
 * matrix; dit is alleen een andere weergave.
 */
const PER_PAGINA = 50

export default async function ContentLijst({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await marketingGebruiker()
  const sp = await searchParams
  const [rijen, onderwerpen, branches] = await Promise.all([alleContent({ ookGearchiveerd: sp.workflow === 'archived' }), lijstOnderwerpen(), lijstBranches()])
  const f: Filters = { soort: sp.soort, industryId: sp.branche, subjectId: sp.onderwerp, ownerId: sp.eigenaar, workflow: sp.workflow, publicatie: sp.publicatie, volledig: sp.volledig === 'ja' || sp.volledig === 'nee' ? sp.volledig : undefined, q: sp.q }
  let lijst = filterContent(rijen, f)
  if (sp.sort === 'titel') lijst = [...lijst].sort((a, b) => a.item.title.localeCompare(b.item.title))
  const pagina = Math.max(1, Number(sp.pagina) || 1)
  const zichtbaar = lijst.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA)
  const eigenaren = [...new Map(rijen.filter((r) => r.item.ownerId).map((r) => [r.item.ownerId!, r.eigenaar ?? 'Onbekend'])).entries()]
  const sel = (name: string, label: string, opties: [string, string][]) => (
    <label className="text-xs text-gray-600">
      {label}
      <select name={name} defaultValue={sp[name] ?? ''} className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900">
        <option value="">Alle</option>
        {opties.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
      </select>
    </label>
  )
  const link = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v) as [string, string][]), pagina: String(p) })}`

  return (
    <AppShell user={user} actief="mkt-website">
      <PaginaKop titel="Content" uitleg="Pagina’s, cases, reviews, FAQ’s en insights. Klik op een titel om hem te bewerken." />
      <WebsiteTabs actief="content" />

      <form method="get" className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
        <label className="text-xs text-gray-600 sm:col-span-3 lg:col-span-5">
          Zoeken
          <input name="q" defaultValue={sp.q ?? ''} placeholder="Titel, onderwerp, branche of URL" className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900" />
        </label>
        {sel('soort', 'Soort', Object.entries(SOORT_NAAM))}
        {sel('branche', 'Branche', branches.map((b) => [b.id, b.name]))}
        {sel('onderwerp', 'Dienst, pakket of doelstelling', onderwerpen.map((o) => [o.id, `${ONDERWERP_NAAM[o.type]}: ${o.name}`]))}
        {sel('eigenaar', 'Eigenaar', eigenaren)}
        {sel('workflow', 'Workflow', [['draft', 'Concept'], ['in_review', 'In review'], ['approved', 'Goedgekeurd'], ['herbeoordeling', 'Herbeoordeling nodig'], ['archived', 'Gearchiveerd']])}
        {sel('publicatie', 'Publicatie', Object.entries(PUBLICATIE_NAAM))}
        {sel('volledig', 'Gereedheid', [['ja', 'Klaar voor goedkeuring'], ['nee', 'Nog niet klaar']])}
        {sel('sort', 'Sorteren', [['titel', 'Op titel']])}
        <div className="flex items-end gap-2">
          <button className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-4 py-1.5 text-sm text-white">Filteren</button>
          <Link href="/beheer/marketing/website/content" className="text-sm text-gray-600">Wissen</Link>
        </div>
      </form>

      <section className="mb-6 overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-500">{lijst.length} item(s){lijst.length > PER_PAGINA ? `, pagina ${pagina}` : ''}</p>
        {zichtbaar.length === 0 ? <p className="text-sm text-gray-600">Niets gevonden.</p> : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="pb-2 pr-3 font-normal">Titel</th><th className="pb-2 pr-3 font-normal">Context</th><th className="pb-2 pr-3 font-normal">Status</th><th className="pb-2 pr-3 font-normal">Eigenaar</th><th className="pb-2 pr-3 font-normal">Gereed</th><th className="pb-2 pr-3 font-normal">Gewijzigd</th><th className="pb-2 font-normal">Doel-URL</th>
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((r) => (
                <tr key={r.item.id} className="border-t border-gray-100 align-top">
                  <td className="py-2 pr-3"><Link href={`/beheer/marketing/website/content/${r.item.id}`} className="text-jr-link">{r.item.title}</Link>{r.item.demo && <span className="ml-2 text-xs text-gray-400">demo</span>}</td>
                  <td className="py-2 pr-3 text-gray-600">{SOORT_NAAM[r.soort]}{r.onderwerp || r.branche ? ` · ${[r.onderwerp, r.branche].filter(Boolean).join(' × ')}` : ''}</td>
                  <td className="py-2 pr-3">{r.item.workflowStatus === 'archived' ? 'Gearchiveerd' : <StatusLabel status={celStatus(r.item, null)} />}</td>
                  <td className="py-2 pr-3 text-gray-600">{r.eigenaar ?? '–'}</td>
                  <td className="py-2 pr-3">{r.validatie.fouten.length ? <span className="text-[#94590A]">{r.validatie.volledig}%</span> : <span className="text-[#1D7D3F]">klaar</span>}</td>
                  <td className="py-2 pr-3 text-gray-600">{formatDate(r.item.updatedAt)}</td>
                  <td className="py-2 text-xs text-gray-600">{r.item.targetUrl ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {lijst.length > PER_PAGINA && (
          <div className="mt-3 flex gap-3 text-sm">
            {pagina > 1 && <Link href={link(pagina - 1)} className="text-jr-link">← Vorige</Link>}
            {pagina * PER_PAGINA < lijst.length && <Link href={link(pagina + 1)} className="text-jr-link">Volgende →</Link>}
          </div>
        )}
      </section>

      <section className="max-w-xl rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base">Nieuwe content</h2>
        <p className="mb-4 text-xs text-gray-500">Een pagina hoort bij een onderwerp (algemeen), een branche (branchehub) of allebei (variant). Cases, reviews, FAQ’s en insights koppel je daarna aan onderwerpen, branches en klanten.</p>
        <ActionForm action={nieuweContentActie} submitLabel="Aanmaken">
          <Select label="Soort" name="kind" options={[{ value: 'page', label: 'Pagina' }, { value: 'case', label: 'Case' }, { value: 'review', label: 'Review' }, { value: 'faq', label: 'FAQ' }, { value: 'insight', label: 'Insight' }]} />
          <Select label="Onderwerp (alleen bij een pagina)" name="subjectId" options={[{ value: '', label: 'Geen: branchehub' }, ...onderwerpen.map((o) => ({ value: o.id, label: `${ONDERWERP_NAAM[o.type]}: ${o.name}` }))]} />
          <Select label="Branche (alleen bij een pagina)" name="industryId" options={[{ value: '', label: 'Geen: algemene pagina' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
          <Field label="Titel" name="title" hint="Bij een pagina mag dit leeg: dan volgt de titel uit onderwerp en branche." />
        </ActionForm>
      </section>
    </AppShell>
  )
}
