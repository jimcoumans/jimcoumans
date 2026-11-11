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
import { Avatar } from '@/components/Avatar'
import { getRapportageOverzicht, type OverzichtRij } from '@/lib/resultaten/overzicht'
import { HOOFDDOEL_LABEL } from '@/lib/resultaten/laden'
import { startMeekijken } from '@/app/beheer/meekijken-actions'

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
  const [rijen, vorige, perKlant, koppelingen, klanten, overzicht] = await Promise.all([
    getDagcijfers(g.van, g.tot),
    getDagcijfers(g.vorigeVan, g.vorigeTot),
    getPerKlant(g.van, g.tot),
    getAlleKoppelingen(),
    listOrganizations(),
    getRapportageOverzicht(),
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

      <Rapportages rijen={overzicht} />

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

const KOPPEL_LABEL: Record<keyof OverzichtRij['koppelingen'], string> = { ga4: 'Analytics', search_console: 'Search Console', google_ads: 'Google Ads', meta_ads: 'Meta' }
const KOPPEL_STIJL = { werkt: 'bg-[#E3F4E8] text-[#1D7D3F]', fout: 'bg-[#FDECEA] text-[#C02A22]', geen: 'bg-gray-100 text-gray-400' }

/** Elke klant met zijn rapportage, ook zonder koppelingen: wat er al is, staat er al in. */
function Rapportages({ rijen }: { rijen: OverzichtRij[] }) {
  return (
    <section className="mb-8 rounded-xl bg-white shadow-sm">
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-[17px]">Rapportages per klant</h2>
        <p className="mt-1 text-sm text-gray-600">
          Voor elke klant staat de rapportage klaar. Wat nog niet gekoppeld is, staat er in grijs bij. Met Portaal kijk je mee zoals de klant het ziet.
        </p>
      </div>
      {rijen.length === 0 ? (
        <p className="px-6 pb-5 text-sm text-gray-500">Nog geen klanten met de status klant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-y border-gray-150 text-left text-xs text-gray-600">
                <th className="px-6 py-2.5 font-normal">Klant</th>
                <th className="px-3 py-2.5 font-normal">Hoofddoel</th>
                <th className="px-3 py-2.5 font-normal">Marketingmanager</th>
                <th className="px-3 py-2.5 font-normal">Koppelingen</th>
                <th className="px-6 py-2.5 text-right font-normal">Bekijken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {rijen.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-3">
                    <a href={`/beheer/klanten/${r.slug}?tab=performance`} className="flex items-center gap-3 hover:text-jr-link">
                      <Avatar naam={r.naam} imageId={r.logoImageId} maat={28} rond={false} />
                      {r.naam}
                    </a>
                  </td>
                  <td className="px-3 py-3">{r.hoofddoel ? HOOFDDOEL_LABEL[r.hoofddoel] : <span className="text-gray-400">Nog vastleggen</span>}</td>
                  <td className="px-3 py-3">{r.marketingmanager ?? <span className="text-gray-400">Nog koppelen</span>}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(KOPPEL_LABEL) as (keyof OverzichtRij['koppelingen'])[]).map((k) => (
                        <span key={k} className={`rounded-full px-2 py-0.5 text-xs ${KOPPEL_STIJL[r.koppelingen[k]]}`} title={r.koppelingen[k] === 'fout' ? 'Koppeling geeft een fout' : undefined}>
                          {KOPPEL_LABEL[k]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/beheer/klanten/${r.slug}/resultaten`} className="rounded-full border border-gray-300 px-3 py-1 text-xs hover:border-jr-blue hover:text-jr-blue">
                        Rapportage en acties
                      </a>
                      <form action={startMeekijken}>
                        <input type="hidden" name="organizationId" value={r.id} />
                        <input type="hidden" name="naar" value="/resultaten" />
                        <button type="submit" className="rounded-full border border-gray-300 px-3 py-1 text-xs hover:border-jr-blue hover:text-jr-blue">
                          Portaal
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
