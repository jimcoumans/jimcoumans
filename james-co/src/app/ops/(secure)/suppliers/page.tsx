import Link from 'next/link'
import { requireStaff } from '@/lib/auth/session'
import { listSuppliers } from '@/lib/domain/suppliers'
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/domain/requests'
import { PageTitle, Badge, EmptyState } from '@/components/ui'
import { formatDate } from '@/lib/time'

export default async function Suppliers({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const { actor } = await requireStaff()
  const f = await searchParams
  const rows = await listSuppliers(actor, f)
  return (
    <>
      <PageTitle title="Leveranciers" actions={<Link href="/ops/suppliers/new" className="btn-secondary">Toevoegen</Link>}>Een lange lijst is geen partnernetwerk. Leg betrouwbaarheid en contactroute vast; verificatie heeft altijd een datum.</PageTitle>
      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-4">
        <input className="field sm:col-span-2" name="q" defaultValue={f.q} placeholder="Zoek op naam of regio" aria-label="Zoeken" />
        <select className="field" name="category" defaultValue={f.category ?? ''} aria-label="Categorie"><option value="">Alle categorieën</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select>
        <button className="btn-primary">Filter</button>
      </form>
      {rows.length === 0 ? <EmptyState title="Geen leveranciers" /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface"><table className="table min-w-[680px]"><thead><tr><th>Naam</th><th>Categorie</th><th>Regio</th><th>Verificatie</th><th>Afspraken</th></tr></thead><tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td><Link href={`/ops/suppliers/${s.id}`} className="font-medium text-forest underline decoration-forest/30">{s.name}</Link>{s.isDemo && <span className="ml-2"><Badge tone="warn">Demo</Badge></span>}</td>
              <td>{CATEGORY_LABEL[s.category as keyof typeof CATEGORY_LABEL]}</td><td>{s.region}</td>
              <td>{s.verificationStatus === 'verified' ? <Badge tone="ok">Geverifieerd {formatDate(s.lastVerifiedAt)}</Badge> : s.verificationStatus === 'inactive' ? <Badge>Inactief</Badge> : <Badge tone="warn">Niet geverifieerd</Badge>}</td>
              <td>{s.activeTerms}</td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  )
}
