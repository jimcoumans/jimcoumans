import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listChecks, SOORT_LABELS, type Soort } from '@/lib/uitingen-check'
import { AppShell } from '@/components/AppShell'
import { PaginaKop, LeegVlak } from '@/components/PaginaKop'
import { OordeelLabel } from '@/components/checks/Oordeel'
import { CheckVolger } from '@/components/checks/CheckVolger'
import { formatDate } from '@/lib/dates'

export const maxDuration = 26

const KNOP = 'bg-jr-btn hover:bg-jr-btnhover rounded-full px-5 py-2.5 text-sm font-medium text-white'
const RUSTIG = 'rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-jr-text hover:bg-gray-50'

export default async function ChecksPage({ searchParams }: { searchParams: Promise<{ klant?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { klant } = await searchParams
  const alle = await listChecks({ limiet: 300 })
  const rijen = klant ? alle.filter((r) => r.slug === klant) : alle

  // De nieuwste versie van elke uiting: niemand verwijst ernaar als vorige.
  const opgevolgd = new Set(alle.map((r) => r.vorigeCheckId).filter(Boolean))
  const nieuwste = rijen.filter((r) => !opgevolgd.has(r.id))
  const week = Date.now() - 7 * 24 * 60 * 60 * 1000
  const wachtOpVrijgave = nieuwste.filter((r) => r.status === 'klaar' && !r.vrijgegevenOp)
  const toch = rijen.filter((r) => r.vrijgegevenOp && r.oordeel !== 'groen' && r.vrijgegevenOp.getTime() > week)
  const loopt = rijen.some((r) => (r.status === 'wacht' || r.status === 'bezig') && !r.vastgelopen)
  const klanten = [...new Map(alle.map((r) => [r.slug, r.klant])).entries()].sort((a, b) => a[1].localeCompare(b[1]))

  const nieuwHref = klant ? `/beheer/checks/nieuw?klant=${encodeURIComponent(klant)}` : '/beheer/checks/nieuw'
  return (
    <AppShell user={user} actief="checks">
      <CheckVolger loopt={loopt} />
      <PaginaKop
        titel="Uitingen-check"
        uitleg="Elke uiting gaat hier doorheen voordat de klant hem ziet. De AI toetst op onze regels, de afspraken met de klant, tone of voice, doelgroep, spelling, huisstijl en de landingspagina."
        acties={
          <>
            <a href="/beheer/checks/regels" className={RUSTIG}>
              Algemene regels
            </a>
            <a href={nieuwHref} className={KNOP}>
              + Nieuwe check
            </a>
          </>
        }
        cijfers={[
          { label: 'Checks deze week', waarde: rijen.filter((r) => r.createdAt.getTime() > week).length },
          {
            label: 'Rood, nog niet opgelost',
            waarde: nieuwste.filter((r) => r.oordeel === 'rood' && !r.vrijgegevenOp).length,
            toon: nieuwste.some((r) => r.oordeel === 'rood' && !r.vrijgegevenOp) ? 'let-op' : 'normaal',
          },
          { label: 'Wacht op vrijgave', waarde: wachtOpVrijgave.length },
          {
            label: 'Niet groen toch vrijgegeven',
            waarde: toch.length,
            hint: 'Afgelopen week, met reden.',
            toon: toch.length > 0 ? 'let-op' : 'normaal',
          },
        ]}
      />

      {klanten.length > 1 && (
        <form className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="klant" className="text-gray-600">
            Klant
          </label>
          <select id="klant" name="klant" defaultValue={klant ?? ''} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5">
            <option value="">Alle klanten</option>
            {klanten.map(([slug, naam]) => (
              <option key={slug} value={slug}>
                {naam}
              </option>
            ))}
          </select>
          <button type="submit" className="text-jr-link rounded-lg px-2 py-1 font-medium hover:bg-gray-100">
            Toon
          </button>
        </form>
      )}

      {rijen.length === 0 ? (
        <LeegVlak
          titel="Nog geen checks"
          tekst="Upload een post, advertentie, nieuwsbrief of flyer, of plak de link. Leg eerst de afspraken met de klant vast op de klantkaart, tab Uitingen: dan toetst de check daar ook op."
          actie={
            <a href={nieuwHref} className={KNOP}>
              + Nieuwe check
            </a>
          }
        />
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm">
          {rijen.map((r) => (
            <li key={r.id}>
              <a href={`/beheer/checks/${r.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-gray-100/60">
                <span className="min-w-0">
                  <span className="block text-sm">
                    {r.titel}
                    {r.versie > 1 && <span className="text-gray-500"> · versie {r.versie}</span>}
                  </span>
                  <span className="block text-xs text-gray-600">
                    {[r.klant, SOORT_LABELS[r.soort as Soort] ?? r.soort, r.kanaal, r.door, formatDate(r.createdAt)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {opgevolgd.has(r.id) && <span className="text-xs text-gray-500">Opgevolgd</span>}
                  {r.vrijgegevenOp && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs">Vrijgegeven</span>}
                  <OordeelLabel check={r} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
