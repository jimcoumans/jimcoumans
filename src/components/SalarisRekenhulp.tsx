'use client'

import { useMemo, useState } from 'react'
import { berekenBeloning, type Huis } from '@/lib/salarishuis-reken'
import { formatCents } from '@/lib/money'

/**
 * Wat iemand verdient op een schaal, trede en aantal uren.
 *
 * Rekent met dezelfde functie als de contractgenerator, in de browser. Zo
 * kun je tijdens een gesprek laten zien wat een trede hoger betekent,
 * zonder eerst een contract op te stellen.
 */
export function SalarisRekenhulp({ huis }: { huis: Huis }) {
  const schalen = useMemo(() => [...huis.schalen].sort((a, b) => a.sortOrder - b.sortOrder), [huis])
  const [schaal, setSchaal] = useState(schalen[0]?.name ?? '')
  const [trede, setTrede] = useState('1')
  const [uren, setUren] = useState(String(huis.huis.fulltimeHoursWeekQuarters / 100).replace('.', ','))
  const [metOp, setMetOp] = useState(true)

  const max = schalen.find((s) => s.name === schaal)?.steps ?? 1
  const uitkomst = useMemo(() => {
    const t = Number(trede)
    const u = Math.round(Number(uren.replace(',', '.')) * 100)
    if (!Number.isInteger(t) || !Number.isFinite(u) || u <= 0) return null
    try {
      return berekenBeloning(huis, schaal, t, u)
    } catch (e) {
      return e instanceof Error ? e.message : null
    }
  }, [huis, schaal, trede, uren])

  const veld = 'min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm'

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <label className="text-[13px] font-medium">
          Schaal
          <select className={`${veld} mt-1`} value={schaal} onChange={(e) => setSchaal(e.target.value)}>
            {schalen.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} (1 t/m {s.steps})
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] font-medium">
          Trede
          <input className={`${veld} mt-1`} inputMode="numeric" value={trede} onChange={(e) => setTrede(e.target.value)} />
          <span className="mt-0.5 block text-xs font-normal text-gray-500">1 t/m {max}</span>
        </label>
        <label className="text-[13px] font-medium">
          Uren per week
          <input className={`${veld} mt-1`} inputMode="decimal" value={uren} onChange={(e) => setUren(e.target.value)} />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={metOp} onChange={(e) => setMetOp(e.target.checked)} />
        OP-toeslag in plaats van een pensioenregeling
      </label>

      {typeof uitkomst === 'string' ? (
        <p className="text-jr-orange mt-4 text-sm">{uitkomst}</p>
      ) : uitkomst ? (
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Regel label="Bruto per maand" waarde={formatCents(uitkomst.maandCents)} sterk />
          <Regel label="OP-toeslag per maand" waarde={metOp ? formatCents(uitkomst.opToeslagCents) : '—'} />
          <Regel label="Per maand overgemaakt (bruto)" waarde={formatCents(uitkomst.maandCents + (metOp ? uitkomst.opToeslagCents : 0))} sterk />
          <Regel label="Vakantietoeslag per jaar" waarde={formatCents(uitkomst.vakantietoeslagPerMaandCents * 12)} />
          <Regel
            label="Bruto per jaar, alles erin"
            waarde={formatCents((uitkomst.maandCents + (metOp ? uitkomst.opToeslagCents : 0) + uitkomst.vakantietoeslagPerMaandCents) * 12)}
          />
          <Regel label="Fulltime op deze trede" waarde={formatCents(uitkomst.fulltimeCents)} />
          <Regel
            label="Uurloon"
            waarde={formatCents(uitkomst.uurloonCents)}
            waarschuwing={uitkomst.onderMinimumloon === true ? 'Onder het wettelijk minimum' : undefined}
          />
          <Regel label="Vakantie-uren per jaar" waarde={`${uitkomst.vakantieUren} uur`} />
        </dl>
      ) : (
        <p className="mt-4 text-sm text-gray-500">Vul een trede en het aantal uren in.</p>
      )}
      <p className="mt-3 text-xs text-gray-500">
        De vakantietoeslag gaat niet over de OP-toeslag. Werkgeverslasten komen er nog bovenop; die staan in het personeelsdossier.
      </p>
    </div>
  )
}

function Regel({ label, waarde, sterk, waarschuwing }: { label: string; waarde: string; sterk?: boolean; waarschuwing?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd className={`tabular ${sterk ? 'text-base font-bold' : ''}`}>{waarde}</dd>
      {waarschuwing && <dd className="text-jr-orange text-xs">{waarschuwing}</dd>}
    </div>
  )
}
