import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { PaginaKop, type Cijfer } from '@/components/PaginaKop'
import { WebsiteTabs } from '@/components/marketing/WebsiteKop'
import { marketingGebruiker } from '@/lib/marketing/toegang'
import { alleContent, voortgang, VEROUDERD_DAGEN } from '@/lib/marketing/content'
import { lijstBranches } from '@/lib/marketing/registers'
import { SOORT_NAAM, WORKFLOW_NAAM } from '@/lib/marketing/velden'
import { formatDate } from '@/lib/dates'

/**
 * Overzicht van de website-content: voortgang met een eerlijke noemer, wat
 * ontbreekt, wat verouderd is, wie wat moet doen, en per branche hoe ver het is.
 * Alle cijfers komen uit de data; niets is ingevuld voor de demo.
 */
export default async function WebsiteOverzicht() {
  const user = await marketingGebruiker()
  const [v, rijen, branches] = await Promise.all([voortgang(), alleContent(), lijstBranches()])
  const nu = Date.now()
  const ontbrekend = rijen.filter((r) => r.validatie.ontbrekend.length > 0)
  const verouderd = rijen.filter((r) => nu - new Date(r.item.updatedAt).getTime() > VEROUDERD_DAGEN * 864e5)
  const perEigenaar = new Map<string, { naam: string; concept: number; review: number; herbeoordeling: number }>()
  for (const r of rijen) {
    const k = r.eigenaar ?? 'Niemand'
    const e = perEigenaar.get(k) ?? { naam: k, concept: 0, review: 0, herbeoordeling: 0 }
    if (r.item.workflowStatus === 'draft') e.concept++
    if (r.item.workflowStatus === 'in_review') e.review++
    if (r.item.needsReview) e.herbeoordeling++
    perEigenaar.set(k, e)
  }
  const pct = (a: number, b: number) => (b ? `${a} van ${b}` : 'nog niets gepland')
  const cijfers: Cijfer[] = [
    { label: 'Algemene pagina’s goedgekeurd', waarde: pct(v.algemeen.klaar, v.algemeen.noemer), hint: `${v.algemeen.concept} concept · ${v.algemeen.in_review} in review · ${v.algemeen.gepubliceerd} gepubliceerd · ${v.algemeen.gepland} nog niet gestart` },
    { label: 'Branchevarianten goedgekeurd', waarde: pct(v.varianten.klaar, v.varianten.noemer), hint: `alleen geplande combinaties · ${v.varianten.concept} concept · ${v.varianten.in_review} in review · ${v.varianten.gepubliceerd} gepubliceerd` },
    { label: 'Branchehubs goedgekeurd', waarde: pct(v.hubs.klaar, v.hubs.noemer), hint: `${v.hubs.concept} concept · ${v.hubs.in_review} in review` },
    { label: 'Herbeoordeling nodig', waarde: String(v.algemeen.herbeoordeling + v.varianten.herbeoordeling + v.hubs.herbeoordeling), toon: v.varianten.herbeoordeling ? 'let-op' : 'normaal', hint: `${v.uitgesteld} uitgesteld · ${v.nietRelevant} niet relevant, apart geteld` },
  ]

  return (
    <AppShell user={user} actief="mkt-website">
      <PaginaKop titel="Website" uitleg="De redactie van onze eigen website. Het portaal is de bron; WordPress is waar het met de hand gepubliceerd wordt." cijfers={cijfers} />
      <WebsiteTabs actief="overzicht" />
      {!v.algemeneFaseKlaar && (
        <p className="mb-6 rounded-xl bg-[#FFF6E5] p-4 text-sm text-[#7A4A00]">
          De algemene fase is nog niet afgerond: {v.algemeen.klaar} van {v.algemeen.noemer} algemene pagina’s goedgekeurd. Branchevarianten kun je voorbereiden, maar niet goedkeuren zolang hun algemene bron niet is goedgekeurd.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Ontbrekende verplichte velden</h2>
          <p className="mb-3 text-xs text-gray-500">Wat goedkeuring nu tegenhoudt.</p>
          {ontbrekend.length === 0 ? <p className="text-sm text-gray-600">Niets ontbreekt.</p> : (
            <ul className="space-y-2 text-sm">
              {ontbrekend.slice(0, 12).map((r) => (
                <li key={r.item.id}>
                  <Link href={`/beheer/marketing/website/content/${r.item.id}`} className="text-jr-link">{r.item.title}</Link>
                  <span className="text-xs text-gray-500"> · {r.validatie.ontbrekend.join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Taken per verantwoordelijke</h2>
          <p className="mb-3 text-xs text-gray-500">Concepten, wat in review staat en wat herbeoordeeld moet worden.</p>
          {perEigenaar.size === 0 ? <p className="text-sm text-gray-600">Nog geen content.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500"><th className="pb-2 font-normal">Wie</th><th className="pb-2 font-normal">Concept</th><th className="pb-2 font-normal">In review</th><th className="pb-2 font-normal">Herbeoordeling</th></tr></thead>
              <tbody>{[...perEigenaar.values()].map((e) => (<tr key={e.naam} className="border-t border-gray-100"><td className="py-2">{e.naam}</td><td>{e.concept}</td><td>{e.review}</td><td>{e.herbeoordeling}</td></tr>))}</tbody>
            </table>
          )}
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Voortgang per branche</h2>
          <p className="mb-3 text-xs text-gray-500">Goedgekeurde varianten van wat gepland of begonnen is, en de branchehub.</p>
          {branches.length === 0 ? <p className="text-sm text-gray-600">Nog geen branches. Voeg ze toe bij Architectuur.</p> : (
            <ul className="space-y-1 text-sm">
              {branches.map((b) => {
                const vs = rijen.filter((r) => r.soort === 'variant' && r.item.industryId === b.id)
                const hub = rijen.find((r) => r.soort === 'hub' && r.item.industryId === b.id)
                return (
                  <li key={b.id} className="flex justify-between gap-4">
                    <span>{b.name}{b.demo && <span className="ml-2 text-xs text-gray-400">demo</span>}</span>
                    <span className="text-gray-600">{vs.filter((r) => r.item.approvedRevisionId).length} van {vs.length} varianten · hub {hub ? WORKFLOW_NAAM[hub.item.workflowStatus].toLowerCase() : 'nog niet'}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Recent gewijzigd</h2>
          <p className="mb-3 text-xs text-gray-500">{verouderd.length ? `${verouderd.length} item(s) al meer dan ${VEROUDERD_DAGEN} dagen niet bijgewerkt.` : 'Niets verouderd.'}</p>
          <ul className="space-y-1 text-sm">
            {rijen.slice(0, 10).map((r) => (
              <li key={r.item.id} className="flex justify-between gap-4">
                <Link href={`/beheer/marketing/website/content/${r.item.id}`} className="text-jr-link">{r.item.title}</Link>
                <span className="shrink-0 text-xs text-gray-500">{SOORT_NAAM[r.soort]} · {formatDate(r.item.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}
