import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { ActionForm, Field } from '@/components/ActionForm'
import { WebsiteTabs, StatusLabel } from '@/components/marketing/WebsiteKop'
import { marketingGebruiker } from '@/lib/marketing/toegang'
import { matrix } from '@/lib/marketing/content'
import { lijstBranches, lijstOnderwerpen } from '@/lib/marketing/registers'
import { ONDERWERP_NAAM } from '@/lib/marketing/velden'
import { celActie, nieuweContentActie } from '../../../../marketing-actions'

/** Eén lege cel van de matrix: plannen, uitsluiten, uitstellen of bewust een concept beginnen. */
export default async function Cel({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await marketingGebruiker()
  const sp = await searchParams
  const [onderwerpen, branches] = await Promise.all([lijstOnderwerpen(), lijstBranches()])
  const o = onderwerpen.find((x) => x.id === sp.subject)
  if (!o) notFound()
  const metVarianten = o.type === 'service' || o.type === 'package' || o.type === 'objective'
  const terug = metVarianten ? `/beheer/marketing/website/matrix?type=${o.type}` : '/beheer/marketing/website/architectuur'

  if (!sp.industry || !metVarianten) {
    return (
      <AppShell user={user} actief="mkt-website">
        <p className="mb-2 text-sm"><Link href={terug} className="text-jr-link">← Contentmatrix</Link></p>
        <PaginaKop titel={`Algemene pagina: ${o.name}`} uitleg="De algemene pagina is de bron voor alle branchevarianten. Begin hier." />
        <WebsiteTabs actief="matrix" />
        <section className="max-w-xl rounded-xl bg-white p-6 shadow-sm">
          <ActionForm action={nieuweContentActie} submitLabel="Concept beginnen">
            <input type="hidden" name="kind" value="page" />
            <input type="hidden" name="subjectId" value={o.id} />
            <input type="hidden" name="industryId" value="" />
          </ActionForm>
        </section>
      </AppShell>
    )
  }

  const b = branches.find((x) => x.id === sp.industry)
  if (!b) notFound()
  const rij = (await matrix(o.type)).rijen.find((r) => r.onderwerp.id === o.id)
  const cel = rij?.cellen.find((c) => c.branche.id === b.id)
  const keuze = (waarde: string, label: string, toelichting: boolean, klasse?: string) => (
    <ActionForm action={celActie} submitLabel={label} meldGelukt={waarde !== 'concept'} resetOnSuccess={false} submitClassName={klasse}>
      <input type="hidden" name="keuze" value={waarde} />
      <input type="hidden" name="subjectId" value={o.id} />
      <input type="hidden" name="industryId" value={b.id} />
      {toelichting && <Field label="Toelichting (optioneel)" name="notes" defaultValue={cel?.planning?.notes ?? ''} />}
    </ActionForm>
  )

  return (
    <AppShell user={user} actief="mkt-website">
      <p className="mb-2 text-sm"><Link href={terug} className="text-jr-link">← Contentmatrix</Link></p>
      <PaginaKop titel={`${o.name} × ${b.name}`} uitleg={`${ONDERWERP_NAAM[o.type]} voor de branche ${b.name}. Kies wat je met deze combinatie wilt.`} />
      <WebsiteTabs actief="matrix" />
      {cel?.item ? (
        <p className="rounded-xl bg-white p-6 text-sm shadow-sm">Er is al een pagina: <Link href={`/beheer/marketing/website/content/${cel.item.id}`} className="text-jr-link">{cel.item.title}</Link>.</p>
      ) : (
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm">Nu: <StatusLabel status={cel?.status ?? 'niet_gepland'} /></p>
            {!rij?.algemeen && <p className="mb-3 text-sm text-[#94590A]">Dit onderwerp heeft nog geen algemene pagina. Een variant neemt daar zijn tekst van over.</p>}
            {keuze('concept', 'Concept beginnen', false)}
          </section>
          <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
            {keuze('planned', 'Plannen', true)}
            {keuze('deferred', 'Uitstellen', true, 'border border-gray-300 text-gray-700')}
            {keuze('not_relevant', 'Niet relevant', true, 'border border-gray-300 text-gray-700')}
            {cel?.planning && keuze('wissen', 'Keuze wissen', false, 'border border-gray-300 text-gray-700')}
          </section>
        </div>
      )}
    </AppShell>
  )
}
