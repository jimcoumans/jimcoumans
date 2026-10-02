import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { zoekBeelden, beeldTags } from '@/lib/merkkluis'
import { listKlantenVoorCampagne } from '@/lib/campagnes'
import { AppShell } from '@/components/AppShell'

export const maxDuration = 26

/**
 * De beeldbank: alle beelden over alle klanten, te filteren op klant en tag.
 * Toevoegen en bewerken gebeurt in de merkkluis van de klant zelf.
 */
export default async function BeeldbankPage({ searchParams }: { searchParams: Promise<{ klant?: string; tag?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { klant, tag } = await searchParams
  const [klanten, beelden, tags] = await Promise.all([
    listKlantenVoorCampagne(),
    zoekBeelden({ organizationId: klant || undefined, tag: tag || undefined }),
    beeldTags(klant || undefined),
  ])
  const link = (p: { klant?: string; tag?: string }) => {
    const q = new URLSearchParams()
    if (p.klant) q.set('klant', p.klant)
    if (p.tag) q.set('tag', p.tag)
    const s = q.toString()
    return `/beheer/assets/beeldbank${s ? `?${s}` : ''}`
  }

  return (
    <AppShell user={user} actief="beeldbank" breed>
      <h1 className="mb-1 text-[28px] sm:text-[32px]">Beeldbank</h1>
      <p className="mb-6 text-sm text-gray-600">
        {beelden.length} {beelden.length === 1 ? 'beeld' : 'beelden'}
        {tag && ` met de tag “${tag}”`}. Toevoegen doe je in de merkkluis van de klant.
      </p>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/beheer/assets/beeldbank">
        <select name="klant" defaultValue={klant ?? ''} aria-label="Klant" className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Alle klanten</option>
          {klanten.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        {tag && <input type="hidden" name="tag" value={tag} />}
        <button type="submit" className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-5 py-2 text-sm font-medium text-white">
          Filteren
        </button>
      </form>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <a href={link({ klant })} className={`rounded-full px-3 py-1 text-xs ${!tag ? 'bg-jr-text text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'}`}>
            Alle tags
          </a>
          {tags.slice(0, 40).map((t) => (
            <a
              key={t.tag}
              href={link({ klant, tag: t.tag })}
              className={`rounded-full px-3 py-1 text-xs ${tag === t.tag ? 'bg-jr-text text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'}`}
            >
              {t.tag} <span className="opacity-60">{t.aantal}</span>
            </a>
          ))}
        </div>
      )}

      {beelden.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
          Nog geen beelden{klant || tag ? ' met dit filter' : ''}. Voeg ze toe in de merkkluis van een klant.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7">
          {beelden.map(({ beeld: b, klant: naam, klantSlug }) => (
            <li key={b.id}>
              <a href={`/beheer/assets/${klantSlug}?bewerk=${b.id}#beelden`} className="block overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/merk/bestand/${b.id}${b.hasThumbnail ? '?formaat=klein' : ''}`}
                    alt={b.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${b.focusX}% ${b.focusY}%` }}
                  />
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs">{b.title}</p>
                  <p className="truncate text-[11px] text-gray-600">{naam}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
