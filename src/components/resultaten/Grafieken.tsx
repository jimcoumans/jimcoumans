'use client'

import { useEffect, useRef, useState } from 'react'

/* -------------------------------------------------------------------------
   De twee grafieken van Resultaten. Gewone SVG, op de echte breedte
   getekend, zodat tekst op een telefoon even groot blijft als op een scherm.
   ------------------------------------------------------------------------- */

const getal = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })
const euro = (cents: number) => (cents / 100).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function useBreedte<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [b, setB] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setB(el.clientWidth))
    ro.observe(el)
    setB(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, b]
}

/** Grenzen van de as: een rond getal net boven het maximum, in vier of vijf stappen. */
function as(max: number): number[] {
  if (max <= 0) return [0]
  const ruw = max / 4
  const macht = Math.pow(10, Math.floor(Math.log10(ruw)))
  const stap = [1, 2, 2.5, 5, 10].map((f) => f * macht).find((s) => s >= ruw) ?? 10 * macht
  const uit: number[] = []
  for (let v = 0; v <= max + stap * 0.001; v += stap) uit.push(v)
  const laatste = uit[uit.length - 1] ?? 0
  if (laatste < max) uit.push(laatste + stap)
  return uit
}

export type TijdlijnPunt = { maand: string; kort: string; lang: string; bezoekers: number | null; conversies: number | null }

/** Websitebezoekers als staven, conversies als lijn, publicaties als stip boven de maand. */
export function TijdlijnGrafiek({ punten, publicaties }: { punten: TijdlijnPunt[]; publicaties: { datum: string; titel: string }[] }) {
  const [ref, W] = useBreedte<HTMLDivElement>()
  const H = 240
  const mt = 22
  const mb = 26
  const eind: TijdlijnPunt = punten[punten.length - 1] ?? { maand: '', kort: '', lang: '', bezoekers: null, conversies: null }
  const labelB = eind?.bezoekers == null ? '' : `${getal(eind.bezoekers)} bezoekers`
  const labelC = eind?.conversies == null ? '' : `${getal(eind.conversies)} conversies`
  const mr = Math.max(labelB.length, labelC.length) * 6.6 + 16
  const breed = Math.max(W, 300)
  const n = punten.length
  const stap = (breed - mr) / n
  const bw = stap * 0.68
  const x = (i: number) => i * stap + (stap - bw) / 2
  const maxB = Math.max(1, ...punten.map((p) => p.bezoekers ?? 0)) * 1.1
  const maxC = Math.max(1, ...punten.map((p) => p.conversies ?? 0)) * 1.25
  const yB = (v: number) => H - mb - (v / maxB) * (H - mb - mt)
  const yC = (v: number) => H - mb - (v / maxC) * (H - mb - mt)
  const lijn = punten
    .map((p, i) => (p.conversies == null ? null : `${x(i) + bw / 2},${yC(p.conversies)}`))
    .filter(Boolean)
    .join(' ')
  const pubX = (datum: string) => {
    const i = punten.findIndex((p) => p.maand === datum.slice(0, 7))
    return i < 0 ? null : x(i) + bw * Math.min(1, Number(datum.slice(8, 10)) / 31)
  }
  return (
    <div ref={ref} className="relative min-h-[240px]">
      {W > 0 && (
        <svg width="100%" viewBox={`0 0 ${breed} ${H}`} role="img" aria-label="Websitebezoekers en conversies per maand" className="block overflow-visible">
          {punten.map((p, i) => (
            <rect key={p.maand} x={x(i)} width={bw} y={yB(p.bezoekers ?? 0)} height={H - mb - yB(p.bezoekers ?? 0)} rx={3} fill={i === n - 1 ? '#B8D7FF' : '#E3EFFF'}>
              <title>{`${p.lang}: ${p.bezoekers == null ? 'niet gekoppeld' : `${getal(p.bezoekers)} bezoekers, ${getal(p.conversies ?? 0)} conversies`}`}</title>
            </rect>
          ))}
          {publicaties.map((q, i) => {
            const px = pubX(q.datum)
            if (px == null) return null
            return (
              <g key={i}>
                <line x1={px} x2={px} y1={mt - 10} y2={H - mb} stroke="#636466" strokeDasharray="2 4" opacity={0.3} />
                <circle cx={px} cy={mt - 10} r={3.5} fill="#636466">
                  <title>{`${q.datum.split('-').reverse().join('-')}: ${q.titel}`}</title>
                </circle>
              </g>
            )
          })}
          {lijn && <polyline points={lijn} fill="none" stroke="#007AFF" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
          {eind?.conversies != null && <circle cx={x(n - 1) + bw / 2} cy={yC(eind.conversies)} r={4} fill="#007AFF" />}
          <line x1={0} x2={breed - mr} y1={H - mb} y2={H - mb} stroke="#D2D1D7" />
          {punten.map((p, i) => (
            <text key={p.maand} x={x(i) + bw / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="#636466">
              {breed < 560 && i % 2 === 1 && i !== n - 1 ? '' : p.kort}
            </text>
          ))}
          {labelB && (
            <text x={breed - mr + 8} y={yB(eind.bezoekers ?? 0)} dy="0.32em" fontSize={12} fill="#636466">
              {labelB}
            </text>
          )}
          {labelC && (
            <text x={breed - mr + 8} y={Math.abs(yC(eind.conversies ?? 0) - yB(eind.bezoekers ?? 0)) < 16 ? yB(eind.bezoekers ?? 0) + 16 : yC(eind.conversies ?? 0)} dy="0.32em" fontSize={12} fontWeight={700} fill="#007AFF">
              {labelC}
            </text>
          )}
        </svg>
      )}
    </div>
  )
}

export type KostenPunt = { maand: string; kort: string; lang: string; waardeCents: number | null; conversies: number | null }

/** Kosten per conversie per maand. */
export function KostenGrafiek({ punten }: { punten: KostenPunt[] }) {
  const [ref, W] = useBreedte<HTMLDivElement>()
  const H = 190
  const mt = 10
  const mb = 26
  const breed = Math.max(W, 300)
  const max = Math.max(1, ...punten.map((p) => p.waardeCents ?? 0)) * 1.04
  const ticks = as(max)
  const top = ticks[ticks.length - 1] || 1
  const ml = Math.max(...ticks.map((t) => euro(t).length)) * 6.4 + 12
  const stap = (breed - ml) / punten.length
  const bw = stap * 0.7
  const x = (i: number) => ml + i * stap + (stap - bw) / 2
  const y = (v: number) => H - mb - (v / top) * (H - mb - mt)
  return (
    <div ref={ref} className="relative min-h-[190px]">
      {W > 0 && (
        <svg width="100%" viewBox={`0 0 ${breed} ${H}`} role="img" aria-label="Kosten per conversie per maand" className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ml} x2={breed} y1={y(t)} y2={y(t)} stroke="#E5E5E9" strokeDasharray={t === 0 ? undefined : '2 4'} />
              <text x={ml - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#636466">
                {euro(t)}
              </text>
            </g>
          ))}
          {punten.map((p, i) =>
            p.waardeCents == null ? null : (
              <rect key={p.maand} x={x(i)} width={bw} y={y(p.waardeCents)} height={H - mb - y(p.waardeCents)} rx={2} fill="#007AFF">
                <title>{`${p.lang}: ${euro(p.waardeCents)} per conversie (${getal(p.conversies ?? 0)} conversies)`}</title>
              </rect>
            ),
          )}
          {punten.map((p, i) => (
            <text key={p.maand} x={x(i) + bw / 2} y={H - 7} textAnchor="middle" fontSize={12} fill="#636466">
              {breed < 560 && i % 2 === 1 && i !== punten.length - 1 ? '' : p.kort}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}
