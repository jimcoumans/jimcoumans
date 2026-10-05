import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listMerkkluizen, zoekInMerkkluizen } from '@/lib/merkkluis'
import { AppShell } from '@/components/AppShell'
import { FilterBalk, Zoekveld } from '@/components/FilterBalk'

export const maxDuration = 26

/** Alle merkkluizen, met hoe compleet ze zijn. Eerst de klanten, dan de rest. Te doorzoeken. */
export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { q = '' } = await searchParams
  const zoekt = q.trim().length >= 2
  const [alle, treffers] = await Promise.all([listMerkkluizen(), zoekt ? zoekInMerkkluizen(q) : Promise.resolve(null)])
  const kluizen = alle
    .filter((k) => !treffers || treffers.has(k.id))
    .sort((a, b) => Number(b.status === 'client') - Number(a.status === 'client') || b.volledigheid.klaar - a.volledigheid.klaar)

  return (
    <AppShell user={user} actief="assets">
      <h1 className="mb-1 text-[28px] sm:text-[32px]">Merkkluizen</h1>
      <p className="mb-6 max-w-3xl text-sm text-gray-600">
        Per klant alles wat je nodig hebt om iets te maken dat klopt: logo’s, kleuren, lettertypen, toon en beelden. Gevuld in de
        onboarding, gebruikt in elke campagne.
      </p>

      <FilterBalk wisHref={q ? '/beheer/assets' : null}>
        <Zoekveld naam="q" waarde={q} placeholder="Zoek op klant, kleur, lettertype of tag" />
        {zoekt && (
          <span className="text-sm text-gray-600">
            {kluizen.length} {kluizen.length === 1 ? 'merkkluis' : 'merkkluizen'}
          </span>
        )}
      </FilterBalk>

      {kluizen.length === 0 ? (
        <p className="rounded-xl bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
          Niets gevonden voor “{q}”. Zoek op een klantnaam, een kleur (naam of code zoals #8B1E2D), een lettertype of een tag.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kluizen.map((k) => {
            const pct = Math.round((k.volledigheid.klaar / k.volledigheid.totaal) * 100)
            const waarom = treffers?.get(k.id)?.filter((r) => r !== 'naam') ?? []
            return (
              <li key={k.id}>
                <a href={`/beheer/assets/${k.slug}`} className="block h-full rounded-xl bg-white p-6 shadow-sm hover:shadow-md">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[17px] font-medium">{k.name}</p>
                    <p className="shrink-0 text-xs text-gray-600">
                      {k.volledigheid.klaar} van {k.volledigheid.totaal}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-150">
                    <div
                      className={`h-full rounded-full ${pct === 100 ? 'bg-[#34C759]' : pct > 0 ? 'bg-jr-blue' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    {k.logos} {k.logos === 1 ? 'logo' : 'logo’s'} · {k.kleuren} {k.kleuren === 1 ? 'kleur' : 'kleuren'} · {k.beelden}{' '}
                    {k.beelden === 1 ? 'beeld' : 'beelden'}
                  </p>
                  {waarom.length > 0 && <p className="text-jr-link mt-2 truncate text-xs">Gevonden op {waarom.join(', ')}</p>}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </AppShell>
  )
}
