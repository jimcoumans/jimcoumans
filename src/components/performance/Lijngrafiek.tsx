'use client'

import { useEffect, useRef, useState } from 'react'

/* -------------------------------------------------------------------------
   Eén reeks per dag als lijn, met een kruisdraad die de dag vindt en een
   tooltip met de waarde. Eén reeks, dus geen legenda: de titel zegt wat het
   is. Twee maten met een andere schaal krijgen elk hun eigen grafiek, nooit
   twee assen in één.
   ------------------------------------------------------------------------- */

const KLEUR = '#0071E3'
const HOOGTE = 168
const RAND = { links: 44, rechts: 12, boven: 12, onder: 24 }

const getal = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })
const kort = (n: number) => (n >= 10000 ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 0 })}k` : getal(n))
const datum = (d: string, lang = false) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('nl-NL', lang ? { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Een rond getal boven het maximum, zodat de as op 0 / 50 / 100 eindigt en niet op 87. */
function plafond(max: number): number {
  if (max <= 0) return 1
  const stap = 10 ** Math.floor(Math.log10(max))
  for (const f of [1, 2, 2.5, 5, 10]) if (f * stap >= max) return f * stap
  return 10 * stap
}

export function Lijngrafiek({ titel, eenheid, punten }: { titel: string; eenheid: string; punten: { day: string; waarde: number }[] }) {
  const doos = useRef<HTMLDivElement>(null)
  const [breedte, setBreedte] = useState(600)
  const [actief, setActief] = useState<number | null>(null)

  useEffect(() => {
    const el = doos.current
    if (!el) return
    const meet = () => setBreedte(Math.max(260, el.clientWidth))
    meet()
    const ro = new ResizeObserver(meet)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max = plafond(Math.max(0, ...punten.map((p) => p.waarde)))
  const b = breedte - RAND.links - RAND.rechts
  const h = HOOGTE - RAND.boven - RAND.onder
  const x = (i: number) => RAND.links + (punten.length <= 1 ? b / 2 : (i / (punten.length - 1)) * b)
  const y = (v: number) => RAND.boven + h - (v / max) * h
  const lijn = punten.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.waarde).toFixed(1)}`).join('')
  const vlak = punten.length ? `${lijn}L${x(punten.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : ''
  const ticks = [0, max / 2, max]
  const labelDagen = punten.length ? [0, Math.floor((punten.length - 1) / 2), punten.length - 1] : []
  const totaal = punten.reduce((s, p) => s + p.waarde, 0)

  function wijs(clientX: number) {
    const el = doos.current
    if (!el || punten.length === 0) return
    const rx = clientX - el.getBoundingClientRect().left - RAND.links
    setActief(Math.max(0, Math.min(punten.length - 1, Math.round((rx / b) * (punten.length - 1)))))
  }

  const p = actief !== null ? punten[actief] : null

  return (
    <figure className="rounded-xl bg-white p-5 shadow-sm">
      <figcaption className="mb-3">
        <span className="block text-[15px] font-medium">{titel}</span>
        <span className="text-xs text-gray-500">
          Per dag, {getal(totaal)} in totaal
        </span>
      </figcaption>
      <div
        ref={doos}
        className="relative touch-none select-none"
        onPointerMove={(e) => wijs(e.clientX)}
        onPointerLeave={() => setActief(null)}
        onFocus={() => setActief(punten.length - 1)}
        onBlur={() => setActief(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setActief((a) => Math.max(0, (a ?? punten.length) - 1))
          if (e.key === 'ArrowRight') setActief((a) => Math.min(punten.length - 1, (a ?? -1) + 1))
        }}
        tabIndex={0}
        role="img"
        aria-label={`${titel}: ${getal(totaal)} ${eenheid} van ${punten[0] ? datum(punten[0].day, true) : ''} tot ${punten.at(-1) ? datum(punten.at(-1)!.day, true) : ''}`}
      >
        <svg width={breedte} height={HOOGTE} className="block max-w-full overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={RAND.links} x2={breedte - RAND.rechts} y1={y(t)} y2={y(t)} stroke="#ECECEE" strokeWidth={1} />
              <text x={RAND.links - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-gray-500 text-[11px] tabular-nums">
                {kort(t)}
              </text>
            </g>
          ))}
          {labelDagen.map((i, n) => (
            <text key={i} x={x(i)} y={HOOGTE - 6} textAnchor={n === 0 ? 'start' : n === labelDagen.length - 1 ? 'end' : 'middle'} className="fill-gray-500 text-[11px]">
              {datum(punten[i]!.day)}
            </text>
          ))}
          <path d={vlak} fill={KLEUR} opacity={0.1} />
          <path d={lijn} fill="none" stroke={KLEUR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {p && actief !== null && (
            <g>
              <line x1={x(actief)} x2={x(actief)} y1={RAND.boven} y2={RAND.boven + h} stroke="#C7C7CC" strokeWidth={1} />
              <circle cx={x(actief)} cy={y(p.waarde)} r={5} fill={KLEUR} stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {p && actief !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: Math.min(Math.max(x(actief) - 70, 0), breedte - 150), width: 140 }}
            role="status"
          >
            <p className="text-[15px] font-semibold tabular-nums">{getal(p.waarde)}</p>
            <p className="text-gray-600">
              {eenheid}, {datum(p.day, true)}
            </p>
          </div>
        )}
      </div>
    </figure>
  )
}
