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
