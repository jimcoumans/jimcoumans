import type { BedrijfsprofielDag, SeoDag } from '@/db/schema'
import { conversieratio, perBron, perDag, type Cijfers, type DagRij } from '@/lib/performance/bronnen'
import { formatEuro } from '@/lib/money'
import { Lijngrafiek } from './Lijngrafiek'

/* -------------------------------------------------------------------------
   Het dashboard zelf: drie kerncijfers met de verandering tegenover de
   periode ervoor, de trend per dag, en per bron wat het opleverde. Hetzelfde
   voor één klant en voor James Robinson als geheel.
   ------------------------------------------------------------------------- */

const getal = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })
const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} mln`
    : n >= 100_000
      ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}k`
      : getal(n)
const procent = (n: number) => `${n.toLocaleString('nl-NL', { maximumFractionDigits: n < 10 ? 1 : 0 })}%`

/** Verandering in procenten, of null als er niets was om mee te vergelijken. */
function verandering(nu: number, toen: number): number | null {
  return toen > 0 ? ((nu - toen) / toen) * 100 : null
}

function Tegel({ label, waarde, nu, toen, hint }: { label: string; waarde: string; nu: number; toen: number; hint?: string }) {
  const v = verandering(nu, toen)
  return (
    <div className="rounded-xl bg-white px-5 py-4 shadow-sm">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="font-display mt-1 text-[30px] leading-none font-semibold tracking-tight">{waarde}</p>
      <p className="mt-2 text-xs text-gray-500">
        {v === null ? (
          'Geen vergelijking'
        ) : (
          <>
            <span className={v > 0.5 ? 'text-[#1D7D3F]' : v < -0.5 ? 'text-[#C02A22]' : 'text-gray-600'}>
              {v > 0 ? '▲' : v < 0 ? '▼' : ''} {procent(Math.abs(v))}
            </span>{' '}
            t.o.v. de periode ervoor
          </>
        )}
        {hint && <span className="block">{hint}</span>}
      </p>
    </div>
  )
}

export function PerformanceDashboard({ rijen, vorige, van, tot }: { rijen: DagRij[]; vorige: DagRij[]; van: string; tot: string }) {
  const { totaal, bronnen } = perBron(rijen)
  const toen = perBron(vorige).totaal
  const dagen = perDag(rijen, van, tot)
  const ratio = conversieratio(totaal)
  const metKosten = totaal.kostenCents > 0
  const maxBezoeken = Math.max(1, ...bronnen.map((b) => b.cijfers.bezoeken))
  // Zolang alleen Search Console impressies levert, zeggen we dat: anders lijkt het totaal.
  const alleenOrganisch = totaal.impressies > 0 && bronnen.every((b) => b.bron === 'organisch_zoeken' || b.cijfers.impressies === 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <Tegel
          label="Impressies"
          waarde={compact(totaal.impressies)}
          nu={totaal.impressies}
          toen={toen.impressies}
          hint={alleenOrganisch ? 'Nu alleen uit Google zelf; advertenties volgen' : undefined}
        />
        <Tegel label="Websitebezoeken" waarde={compact(totaal.bezoeken)} nu={totaal.bezoeken} toen={toen.bezoeken} />
        <Tegel
          label="Conversies"
          waarde={getal(totaal.conversies)}
          nu={totaal.conversies}
          toen={toen.conversies}
          hint={ratio !== null ? `${procent(ratio)} van de bezoeken` : undefined}
        />
        {metKosten && (
          <Tegel
            label="Advertentiekosten"
            waarde={formatEuro(totaal.kostenCents)}
            nu={totaal.kostenCents}
            toen={toen.kostenCents}
            hint={totaal.conversies > 0 ? `${formatEuro(Math.round(totaal.kostenCents / totaal.conversies))} per conversie` : undefined}
          />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Lijngrafiek titel="Impressies" eenheid="impressies" punten={dagen.map((d) => ({ day: d.day, waarde: d.cijfers.impressies }))} />
        <Lijngrafiek titel="Websitebezoeken" eenheid="bezoeken" punten={dagen.map((d) => ({ day: d.day, waarde: d.cijfers.bezoeken }))} />
        <Lijngrafiek titel="Conversies" eenheid="conversies" punten={dagen.map((d) => ({ day: d.day, waarde: d.cijfers.conversies }))} />
      </div>

      <section className="rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-5 pb-3">
          <h2 className="text-[17px]">Per bron</h2>
          <p className="text-xs text-gray-500">Conversies uit Google Analytics; impressies uit Search Console en de advertentieplatforms.</p>
        </div>
        {bronnen.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-gray-500">Nog geen cijfers in deze periode.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y border-gray-150 text-left text-xs text-gray-600">
                  <th className="px-6 py-2.5 font-normal">Bron</th>
                  <th className="px-3 py-2.5 text-right font-normal">Impressies</th>
                  <th className="px-3 py-2.5 font-normal">Websitebezoeken</th>
                  <th className="px-3 py-2.5 text-right font-normal">Conversies</th>
                  <th className="px-3 py-2.5 text-right font-normal">Conversieratio</th>
                  {metKosten && <th className="px-3 py-2.5 text-right font-normal">Kosten</th>}
                  {metKosten && <th className="px-6 py-2.5 text-right font-normal">Per conversie</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {bronnen.map((b) => (
                  <BronRegel key={b.bron} label={b.label} betaald={b.betaald} c={b.cijfers} max={maxBezoeken} metKosten={metKosten} />
                ))}
                <tr className="font-semibold">
                  <td className="px-6 py-3">Totaal</td>
                  <td className="px-3 py-3 text-right tabular-nums">{getal(totaal.impressies)}</td>
                  <td className="px-3 py-3 tabular-nums">{getal(totaal.bezoeken)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{getal(totaal.conversies)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{ratio !== null ? procent(ratio) : '–'}</td>
                  {metKosten && <td className="px-3 py-3 text-right tabular-nums">{formatEuro(totaal.kostenCents)}</td>}
                  {metKosten && (
                    <td className="px-6 py-3 text-right tabular-nums">
                      {totaal.conversies > 0 ? formatEuro(Math.round(totaal.kostenCents / totaal.conversies)) : '–'}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function BronRegel({ label, betaald, c, max, metKosten }: { label: string; betaald: boolean; c: Cijfers; max: number; metKosten: boolean }) {
  const ratio = conversieratio(c)
  return (
    <tr>
      <td className="px-6 py-3">
        {label}
        {betaald && <span className="ml-2 text-xs text-gray-500">betaald</span>}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{c.impressies > 0 ? getal(c.impressies) : <span className="text-gray-400">–</span>}</td>
      <td className="px-3 py-3">
        {/* Eén kleur voor de balk: de naam ernaast zegt welke bron het is. */}
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-right tabular-nums">{getal(c.bezoeken)}</span>
          <span className="h-2 w-full max-w-40 rounded-r-full bg-gray-100">
            <span className="block h-2 rounded-r-full bg-[#0071E3]" style={{ width: `${(c.bezoeken / max) * 100}%` }} />
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{getal(c.conversies)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{ratio !== null ? procent(ratio) : '–'}</td>
      {metKosten && <td className="px-3 py-3 text-right tabular-nums">{c.kostenCents > 0 ? formatEuro(c.kostenCents) : '–'}</td>}
      {metKosten && (
        <td className="px-6 py-3 text-right tabular-nums">{c.kostenCents > 0 && c.conversies > 0 ? formatEuro(Math.round(c.kostenCents / c.conversies)) : '–'}</td>
      )}
    </tr>
  )
}

/* -------------------------------------------------------------------------
   SEO-stand uit Ahrefs: hoe sterk de website staat. Dit zijn standen, geen
   dagtotalen: de tegels tonen de laatste stand in de periode en vergelijken
   die met de laatste stand van de periode ervoor.
   ------------------------------------------------------------------------- */

type SeoMaat = Exclude<keyof SeoDag, 'organizationId' | 'day' | 'updatedAt'>

const SEO_MATEN: { maat: SeoMaat; label: string; eenheid: string; uitleg: string; decimalen: boolean }[] = [
  { maat: 'domainRating', label: 'Domain Rating', eenheid: 'punten', uitleg: 'Sterkte van het linkprofiel, 0 tot 100', decimalen: true },
  { maat: 'organicKeywords', label: 'Organische zoekwoorden', eenheid: 'zoekwoorden', uitleg: 'Zoekwoorden in de top 100 van Google', decimalen: false },
  { maat: 'organicTraffic', label: 'Organisch verkeer', eenheid: 'bezoeken per maand', uitleg: 'Schatting van Ahrefs, per maand', decimalen: false },
  { maat: 'referringDomains', label: 'Verwijzende domeinen', eenheid: 'domeinen', uitleg: 'Websites die naar de klant linken', decimalen: false },
]

/** De laatste dag in de reeks die voor deze maat een waarde heeft. */
function laatsteStand(rijen: SeoDag[], maat: SeoMaat): number | null {
  for (let i = rijen.length - 1; i >= 0; i--) {
    const v = rijen[i]![maat]
    if (typeof v === 'number') return v
  }
  return null
}

function SeoTegel({ label, uitleg, nu, toen, decimalen, eenheid }: { label: string; uitleg: string; nu: number | null; toen: number | null; decimalen: boolean; eenheid: string }) {
  const toon = (n: number) => (decimalen ? n.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : compact(n))
  const verschil = nu !== null && toen !== null ? nu - toen : null
  return (
    <div className="rounded-xl bg-white px-5 py-4 shadow-sm">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="font-display mt-1 text-[30px] leading-none font-semibold tracking-tight">{nu === null ? '–' : toon(nu)}</p>
      <p className="mt-2 text-xs text-gray-500">
        {verschil === null ? (
          'Geen vergelijking'
        ) : (
          <>
            <span className={verschil > 0 ? 'text-[#1D7D3F]' : verschil < 0 ? 'text-[#C02A22]' : 'text-gray-600'}>
              {verschil > 0 ? '▲' : verschil < 0 ? '▼' : ''} {decimalen ? toon(Math.abs(verschil)) : getal(Math.abs(verschil))} {eenheid}
            </span>{' '}
            t.o.v. de periode ervoor
          </>
        )}
        <span className="block">{uitleg}</span>
      </p>
    </div>
  )
}

export function SeoBlok({ rijen, vorige, domein }: { rijen: SeoDag[]; vorige: SeoDag[]; domein: string }) {
  const punten = (maat: SeoMaat) => rijen.filter((r) => typeof r[maat] === 'number').map((r) => ({ day: r.day, waarde: r[maat] as number }))
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px]">Vindbaarheid van {domein}</h2>
        <p className="text-xs text-gray-500">Uit Ahrefs, elke nacht bijgewerkt. Standen, geen totalen: de laatste stand telt.</p>
      </div>
      {rijen.length === 0 ? (
        <p className="rounded-xl bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">Nog geen SEO-stand in deze periode. Die komt binnen bij de volgende ronde ophalen, of nu met Nu bijwerken.</p>
      ) : (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {SEO_MATEN.map((m) => (
              <SeoTegel key={m.maat} label={m.label} uitleg={m.uitleg} nu={laatsteStand(rijen, m.maat)} toen={laatsteStand(vorige, m.maat)} decimalen={m.decimalen} eenheid={m.eenheid} />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Lijngrafiek titel="Organisch verkeer (schatting per maand)" eenheid="bezoeken per maand" punten={punten('organicTraffic')} stand />
            <Lijngrafiek titel="Organische zoekwoorden" eenheid="zoekwoorden" punten={punten('organicKeywords')} stand />
          </div>
        </>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------
   Google Bedrijfsprofiel: hoe vaak het profiel op Maps en in de zoekresultaten
   gezien is, en wat mensen erop deden. Dagtotalen, dus optellen over de
   periode en vergelijken met de periode ervoor, net als de kerncijfers.
   ------------------------------------------------------------------------- */

type ProfielMaat = Exclude<keyof BedrijfsprofielDag, 'organizationId' | 'day' | 'updatedAt'>

const som = (rijen: BedrijfsprofielDag[], maten: ProfielMaat[]) => rijen.reduce((s, r) => s + maten.reduce((t, m) => t + (r[m] ?? 0), 0), 0)

export function BedrijfsprofielBlok({ rijen, vorige, van, tot, naam }: { rijen: BedrijfsprofielDag[]; vorige: BedrijfsprofielDag[]; van: string; tot: string; naam: string }) {
  const tegels: { label: string; maten: ProfielMaat[]; hint?: (nu: number) => string | undefined }[] = [
    {
      label: 'Weergaven van het profiel',
      maten: ['impressionsMaps', 'impressionsSearch'],
      hint: (nu) => (nu > 0 ? `${procent((som(rijen, ['impressionsMaps']) / nu) * 100)} op Google Maps` : undefined),
    },
    { label: 'Klikken naar de website', maten: ['websiteClicks'] },
    { label: 'Telefoontjes', maten: ['callClicks'] },
    { label: 'Routes opgevraagd', maten: ['directionRequests'] },
  ]
  const extra = som(rijen, ['messagingClicks', 'bookings'])
  const weergaven = perDag(
    rijen.map((r) => ({ day: r.day, bron: 'profiel', impressions: (r.impressionsMaps ?? 0) + (r.impressionsSearch ?? 0), clicks: null, sessions: null, conversions: null, costCents: null })),
    van,
    tot,
  )
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px]">Google Bedrijfsprofiel van {naam}</h2>
        <p className="text-xs text-gray-500">Maps en het blok in de zoekresultaten. Google levert deze cijfers een paar dagen later.</p>
      </div>
      {rijen.length === 0 ? (
        <p className="rounded-xl bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">Nog geen cijfers van het Bedrijfsprofiel in deze periode. Die komen binnen bij de volgende ronde ophalen, of nu met Nu bijwerken.</p>
      ) : (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {tegels.map((t) => {
              const nu = som(rijen, t.maten)
              return <Tegel key={t.label} label={t.label} waarde={compact(nu)} nu={nu} toen={som(vorige, t.maten)} hint={t.hint?.(nu)} />
            })}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Lijngrafiek titel="Weergaven van het profiel" eenheid="weergaven" punten={weergaven.map((d) => ({ day: d.day, waarde: d.cijfers.impressies }))} />
            <div className="rounded-xl bg-white p-5 text-sm shadow-sm">
              <p className="text-[15px] font-medium">Wat mensen deden</p>
              <ul className="mt-3 space-y-2 text-gray-600">
                <li className="flex justify-between"><span>Naar de website</span><span className="tabular-nums">{getal(som(rijen, ['websiteClicks']))}</span></li>
                <li className="flex justify-between"><span>Gebeld</span><span className="tabular-nums">{getal(som(rijen, ['callClicks']))}</span></li>
                <li className="flex justify-between"><span>Route opgevraagd</span><span className="tabular-nums">{getal(som(rijen, ['directionRequests']))}</span></li>
                <li className="flex justify-between"><span>Bericht gestuurd</span><span className="tabular-nums">{getal(som(rijen, ['messagingClicks']))}</span></li>
                <li className="flex justify-between"><span>Gereserveerd via Google</span><span className="tabular-nums">{getal(som(rijen, ['bookings']))}</span></li>
              </ul>
              {extra === 0 && <p className="mt-3 text-xs text-gray-500">Berichten en reserveringen tellen alleen als de klant die knoppen op zijn profiel aan heeft.</p>}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
