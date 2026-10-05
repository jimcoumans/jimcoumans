import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { PaginaKop, LeegVlak } from '@/components/PaginaKop'
import { FilterBalk } from '@/components/FilterBalk'
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard'
import { getAlleKoppelingen, getDagcijfers, getPerKlant } from '@/lib/performance/lezen'
import { PERIODES, periodeGrenzen, type Periode } from '@/lib/performance/bronnen'
import { listOrganizations } from '@/lib/admin'
import { formatEuro } from '@/lib/money'

export const maxDuration = 26

const getal = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })

/**
 * James Robinson als geheel: wat onze marketing voor alle klanten samen
 * mogelijk maakte, per bron en per klant. Telt alleen klanten waarvan de
 * bronnen gekoppeld zijn; hoeveel dat er zijn, staat er eerlijk bij.
 */
export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { periode: p } = await searchParams
  const periode = (PERIODES.some((x) => x.periode === p) ? p : '30_dagen') as Periode
  const g = periodeGrenzen(periode)
  const [rijen, vorige, perKlant, koppelingen, klanten] = await Promise.all([
    getDagcijfers(g.van, g.tot),
    getDagcijfers(g.vorigeVan, g.vorigeTot),
    getPerKlant(g.van, g.tot),
    getAlleKoppelingen(),
    listOrganizations(),
  ])
  const actieveKlanten = klanten.filter((k) => k.organization.status === 'client')
  // Alleen een werkende koppeling telt: een koppeling met een fout levert niets.
  const metGa4 = new Set(koppelingen.filter((k) => k.k.source === 'ga4' && k.k.lastSyncedAt && !k.k.lastError).map((k) => k.k.organizationId))
  const metFout = koppelingen.filter((k) => k.k.lastError)

  return (
    <AppShell user={user} actief="performance">
      <PaginaKop
        titel="Performance"
        uitleg={`Wat onze marketing voor alle klanten samen mogelijk maakte. ${metGa4.size} van de ${actieveKlanten.length} klanten hebben een werkende koppeling met Google Analytics; alleen hun cijfers tellen mee.`}
        acties={
          <FilterBalk className="flex flex-wrap items-center gap-2">
            <select name="periode" defaultValue={periode} aria-label="Periode" className="min-h-11 rounded-full border border-gray-300 bg-white py-2.5 pr-9 pl-4 text-[15px] outline-none hover:border-gray-400">
              {PERIODES.map((x) => (
                <option key={x.periode} value={x.periode}>
                  {x.label}
                </option>
              ))}
            </select>
          </FilterBalk>
        }
      />

      {metFout.length > 0 && (
        <section className="mb-6 rounded-xl bg-[#FDECEA] px-5 py-4 text-sm text-[#C02A22]">
          <p className="font-medium">{metFout.length === 1 ? 'Eén koppeling werkt niet' : `${metFout.length} koppelingen werken niet`}</p>
          <ul className="mt-1 space-y-0.5">
            {metFout.map(({ k, naam, slug }) => (
              <li key={k.id}>
                <a href={`/beheer/klanten/${slug}?tab=performance`} className="underline">
                  {naam}
                </a>
                : {k.lastError}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rijen.length === 0 ? (
        <LeegVlak
          titel="Nog geen cijfers"
          tekst="Koppel bij een klant onder Performance Google Analytics en Search Console. Zodra er cijfers binnenkomen, tellen ze hier op."
        />
      ) : (
        <div className="space-y-8">
          <PerformanceDashboard rijen={rijen} vorige={vorige} van={g.van} tot={g.tot} />

          <section className="rounded-xl bg-white shadow-sm">
            <h2 className="px-6 pt-5 pb-3 text-[17px]">Per klant</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-gray-150 text-left text-xs text-gray-600">
                    <th className="px-6 py-2.5 font-normal">Klant</th>
                    <th className="px-3 py-2.5 text-right font-normal">Impressies</th>
                    <th className="px-3 py-2.5 text-right font-normal">Websitebezoeken</th>
                    <th className="px-3 py-2.5 text-right font-normal">Conversies</th>
                    <th className="px-6 py-2.5 text-right font-normal">Advertentiekosten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {perKlant.map((k) => (
                    <tr key={k.id}>
                      <td className="px-6 py-3">
                        <a href={`/beheer/klanten/${k.slug}?tab=performance&periode=${periode}`} className="hover:text-jr-link">
                          {k.naam}
                        </a>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{getal(k.impressies)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{getal(k.bezoeken)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{getal(k.conversies)}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{k.kostenCents > 0 ? formatEuro(k.kostenCents) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}
