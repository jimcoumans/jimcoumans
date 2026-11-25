import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { WebsiteTabs, StatusLabel } from '@/components/marketing/WebsiteKop'
import { marketingGebruiker } from '@/lib/marketing/toegang'
import { CEL_NAAM, matrix, voortgang, type CelStatus } from '@/lib/marketing/content'
import { formatDate } from '@/lib/dates'

/**
 * De contentmatrix: onderwerpen als rijen, branches als kolommen. Een lege cel
 * is geen record; pas als iemand plant, uitsluit of een concept begint, wordt
 * er iets vastgelegd. Zo ontstaat er geen ongecontroleerde explosie aan pagina's.
 */
const SOORTEN = [
  { type: 'service', label: 'Diensten' },
  { type: 'package', label: 'Pakketten' },
  { type: 'objective', label: 'Doelstellingen' },
] as const
const OPEN: CelStatus[] = ['gepland', 'concept', 'in_review', 'herbeoordeling']

export default async function Matrix({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await marketingGebruiker()
  const sp = await searchParams
  const type = SOORTEN.find((s) => s.type === sp.type)?.type ?? 'service'
  const [m, v] = await Promise.all([matrix(type), voortgang()])
  const q = (sp.q ?? '').trim().toLowerCase()
  const alleenOpen = sp.open === '1'
  // Zoeken: eerst op onderwerp (rijen), anders op branche (kolommen).
  const rijTreffers = q ? m.rijen.filter((r) => r.onderwerp.name.toLowerCase().includes(q)) : m.rijen
  const kolomTreffers = q ? m.branches.filter((b) => b.name.toLowerCase().includes(q)) : m.branches
  let rijen = !q || rijTreffers.length ? rijTreffers : kolomTreffers.length ? m.rijen : []
  const kolommen = q && !rijTreffers.length && kolomTreffers.length ? kolomTreffers : m.branches
  if (alleenOpen) rijen = rijen.filter((r) => OPEN.includes(r.algemeenStatus) || !r.algemeen || r.cellen.some((c) => OPEN.includes(c.status)))
  const tip = (status: CelStatus, extra: (string | null | undefined)[]) => [CEL_NAAM[status], ...extra.filter(Boolean)].join('\n')
  const tel: Partial<Record<CelStatus, number>> = {}
  for (const r of m.rijen) for (const c of r.cellen) tel[c.status] = (tel[c.status] ?? 0) + 1

  return (
    <AppShell user={user} actief="mkt-website">
      <PaginaKop titel="Contentmatrix" uitleg="Welke dienst, welk pakket of welke doelstelling heeft al een pagina per branche. Een lege cel bestaat pas als iemand er een keuze voor maakt." />
      <WebsiteTabs actief="matrix" />

      <nav className="mb-4 flex flex-wrap gap-2 text-sm" aria-label="Soort onderwerp">
        {SOORTEN.map((s) => (
          <Link key={s.type} href={`?type=${s.type}`} aria-current={type === s.type ? 'page' : undefined} className={`rounded-full border px-4 py-1.5 ${type === s.type ? 'border-jr-blue text-jr-blue' : 'border-gray-300 text-gray-700'}`}>{s.label}</Link>
        ))}
      </nav>

      <p className="mb-3 text-sm text-gray-600">
        Varianten {v.varianten.klaar} van {v.varianten.noemer} klaar (alleen geplande combinaties tellen mee) · {v.uitgesteld} uitgesteld · {v.nietRelevant} niet relevant.
        {' '}In deze weergave: {Object.entries(tel).filter(([k]) => k !== 'niet_gepland').map(([k, n]) => `${n} ${CEL_NAAM[k as CelStatus].toLowerCase()}`).join(', ') || 'nog niets gepland'}.
      </p>
      {!v.algemeneFaseKlaar && <p className="mb-4 rounded-xl bg-[#FFF6E5] p-4 text-sm text-[#7A4A00]">Eerst de algemene pagina’s. Varianten kun je plannen en voorbereiden, maar pas goedkeuren als hun algemene bron is goedgekeurd.</p>}

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="type" value={type} />
        <label className="text-xs text-gray-600">Zoeken<input name="q" defaultValue={sp.q ?? ''} placeholder="Onderwerp of branche" className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900" /></label>
        <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="open" value="1" defaultChecked={alleenOpen} /> Alleen met open werk</label>
        <button className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-4 py-1.5 text-white">Toepassen</button>
        <a href={`/api/marketing/matrix?type=${type}`} className="text-jr-link pb-2">CSV</a>
      </form>

      {m.rijen.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">Nog geen actieve onderwerpen van deze soort. Voeg ze toe onder <Link href="/beheer/marketing/website/architectuur" className="text-jr-link">Architectuur</Link>.</p>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-xl bg-white shadow-sm">
          <table className="text-sm">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="text-left text-xs text-gray-500">
                <th className="sticky left-0 z-30 min-w-[200px] bg-white p-3 font-normal">Onderwerp</th>
                <th className="min-w-[130px] bg-[#F2F2F7] p-3 font-normal">Algemeen</th>
                {kolommen.map((b) => (<th key={b.id} className="min-w-[130px] p-3 font-normal">{b.name}</th>))}
              </tr>
            </thead>
            <tbody>
              {rijen.map((r) => (
                <tr key={r.onderwerp.id} className="border-t border-gray-100">
                  <th scope="row" className="sticky left-0 z-10 bg-white p-3 text-left font-normal">{r.onderwerp.name}{r.onderwerp.demo && <span className="ml-2 text-xs text-gray-400">demo</span>}</th>
                  <td className="bg-[#F2F2F7] p-3">
                    {r.algemeen ? (
                      <Link href={`/beheer/marketing/website/content/${r.algemeen.id}`} title={tip(r.algemeenStatus, [r.algemeen.targetUrl, `gewijzigd ${formatDate(r.algemeen.updatedAt)}`])}><StatusLabel status={r.algemeenStatus} /></Link>
                    ) : (
                      <Link href={`/beheer/marketing/website/matrix/cel?subject=${r.onderwerp.id}`} className="text-jr-link text-xs">+ Algemene pagina</Link>
                    )}
                  </td>
                  {kolommen.map((b) => {
                    const c = r.cellen.find((x) => x.branche.id === b.id)!
                    return (
                      <td key={b.id} className="p-3">
                        {c.item ? (
                          <Link href={`/beheer/marketing/website/content/${c.item.id}`} title={tip(c.status, [c.eigenaar && `eigenaar ${c.eigenaar}`, c.item.targetUrl, `gewijzigd ${formatDate(c.item.updatedAt)}`])}><StatusLabel status={c.status} /></Link>
                        ) : (
                          <Link href={`/beheer/marketing/website/matrix/cel?subject=${r.onderwerp.id}&industry=${b.id}`} title={tip(c.status, [c.planning?.notes])}><StatusLabel status={c.status} /></Link>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">Tekens: · niet gepland, ○ gepland, ✎ concept, → in review, ✓ goedgekeurd, ● gepubliceerd, ! herbeoordeling, ‖ uitgesteld, – niet relevant.</p>
    </AppShell>
  )
}
