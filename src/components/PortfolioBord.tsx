'use client'

import { useState, useTransition } from 'react'
import { wijsKlantToe } from '@/app/beheer/portfolio-actions'
import { formatCents } from '@/lib/money'
import type { PortfolioBord as Bord, PortfolioKlant } from '@/lib/portfolio'

/* -------------------------------------------------------------------------
   Het portfoliobord.

   Slepen werkt op een muis, maar niet op een telefoon: HTML5 drag-and-drop
   bestaat daar niet. Daarom heeft elke kaart ook een keuzelijst "verplaats
   naar". Dat is geen noodoplossing maar de betrouwbare weg — slepen is de
   snelle variant erbovenop.

   De kolomtotalen worden hier opnieuw uitgerekend zodra je iets verplaatst,
   zodat je het bedrag ziet meebewegen voordat de server heeft geantwoord.
   Gaat de server alsnog nee zeggen, dan springt het terug.
   ------------------------------------------------------------------------- */

const NIET_TOEGEWEZEN = '__geen__'

export function PortfolioBord({ bord }: { bord: Bord }) {
  // De toewijzing staat in de component zodat het bord meteen meebeweegt.
  const [waar, setWaar] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {}
    for (const kolom of bord.kolommen) {
      for (const k of kolom.klanten) start[k.organizationId] = kolom.userId
    }
    for (const k of bord.nietToegewezen) start[k.organizationId] = NIET_TOEGEWEZEN
    return start
  })
  const [sleept, setSleept] = useState<string | null>(null)
  const [boven, setBoven] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, startOvergang] = useTransition()

  const alleKlanten = new Map<string, PortfolioKlant>()
  for (const kolom of bord.kolommen) {
    for (const k of kolom.klanten) alleKlanten.set(k.organizationId, k)
  }
  for (const k of bord.nietToegewezen) alleKlanten.set(k.organizationId, k)

  function klantenVan(userId: string): PortfolioKlant[] {
    return [...alleKlanten.values()]
      .filter((k) => (waar[k.organizationId] ?? NIET_TOEGEWEZEN) === userId)
      .sort((a, b) => b.maandwaardeCents - a.maandwaardeCents)
  }

  function verplaats(organizationId: string, naarUserId: string) {
    const vorige = waar[organizationId] ?? NIET_TOEGEWEZEN
    if (vorige === naarUserId) return

    setWaar((s) => ({ ...s, [organizationId]: naarUserId }))
    setFout(null)

    startOvergang(async () => {
      const data = new FormData()
      data.set('organizationId', organizationId)
      data.set('userId', naarUserId === NIET_TOEGEWEZEN ? '' : naarUserId)

      const uitkomst = await wijsKlantToe(data)
      if (!uitkomst.ok) {
        // Terugzetten: het bord mag niet iets anders tonen dan de database.
        setWaar((s) => ({ ...s, [organizationId]: vorige }))
        setFout(uitkomst.error)
      }
    })
  }

  const kolomOpties = [
    ...bord.kolommen.map((k) => ({ waarde: k.userId, label: k.naam })),
    { waarde: NIET_TOEGEWEZEN, label: 'Nog niet toegewezen' },
  ]

  return (
    <div>
      {fout && (
        <p role="alert" className="border-jr-red bg-jr-red/5 mb-4 rounded border-l-4 p-3 text-sm">
          {fout}
        </p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {bord.kolommen.map((kolom) => {
          const eigen = klantenVan(kolom.userId)
          const totaal = eigen.reduce((t, k) => t + k.maandwaardeCents, 0)
          const percentage =
            kolom.targetCents === null ? null : Math.round((totaal / kolom.targetCents) * 100)
          const ruimte = kolom.targetCents === null ? null : kolom.targetCents - totaal

          return (
            <Kolom
              key={kolom.userId}
              id={kolom.userId}
              titel={kolom.naam}
              totaal={totaal}
              target={kolom.targetCents}
              percentage={percentage}
              ruimte={ruimte}
              klanten={eigen}
              opties={kolomOpties}
              actief={boven === kolom.userId}
              bezig={bezig}
              onSleepStart={setSleept}
              onSleepBoven={setBoven}
              onDrop={() => {
                if (sleept) verplaats(sleept, kolom.userId)
                setSleept(null)
                setBoven(null)
              }}
              onKies={verplaats}
            />
          )
        })}

        <Kolom
          id={NIET_TOEGEWEZEN}
          titel="Nog niet toegewezen"
          uitleg="Deze klanten dragen wel omzet maar horen bij niemand."
          totaal={klantenVan(NIET_TOEGEWEZEN).reduce((t, k) => t + k.maandwaardeCents, 0)}
          target={null}
          percentage={null}
          ruimte={null}
          klanten={klantenVan(NIET_TOEGEWEZEN)}
          opties={kolomOpties}
          actief={boven === NIET_TOEGEWEZEN}
          bezig={bezig}
          waarschuwing
          onSleepStart={setSleept}
          onSleepBoven={setBoven}
          onDrop={() => {
            if (sleept) verplaats(sleept, NIET_TOEGEWEZEN)
            setSleept(null)
            setBoven(null)
          }}
          onKies={verplaats}
        />
      </div>
    </div>
  )
}

function Kolom({
  id, titel, uitleg, totaal, target, percentage, ruimte, klanten, opties,
  actief, bezig, waarschuwing = false, onSleepStart, onSleepBoven, onDrop, onKies,
}: {
  id: string
  titel: string
  uitleg?: string
  totaal: number
  target: number | null
  percentage: number | null
  ruimte: number | null
  klanten: PortfolioKlant[]
  opties: { waarde: string; label: string }[]
  actief: boolean
  bezig: boolean
  waarschuwing?: boolean
  onSleepStart: (id: string | null) => void
  onSleepBoven: (id: string | null) => void
  onDrop: () => void
  onKies: (organizationId: string, naar: string) => void
}) {
  // Boven de honderd procent is het niet "af" maar te vol; dat moet je zien.
  const balkKleur =
    percentage === null ? 'bg-gray-300' : percentage > 100 ? 'bg-jr-red' : percentage >= 85 ? 'bg-jr-orange' : 'bg-jr-blue'

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault()
        onSleepBoven(id)
      }}
      onDragLeave={() => onSleepBoven(null)}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={`flex w-72 shrink-0 flex-col rounded-xl border-2 transition-colors ${
        actief ? 'border-jr-blue bg-jr-lightblue/40' : 'border-transparent bg-white'
      } shadow-sm`}
    >
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className={`text-base ${waarschuwing ? 'text-jr-orange' : ''}`}>{titel}</h2>
          <span className="tabular text-xs text-gray-500">{klanten.length}</span>
        </div>

        <p className="tabular mt-1.5 text-xl font-bold">{formatCents(totaal)}</p>

        {target !== null ? (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-[width] ${balkKleur}`}
                style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
              />
            </div>
            <p className="tabular mt-1.5 text-xs text-gray-600">
              {percentage}% van {formatCents(target)}
              {ruimte !== null && (
                <span className={ruimte < 0 ? 'text-jr-red' : 'text-gray-500'}>
                  {' '}&middot; {ruimte < 0 ? `${formatCents(-ruimte)} eroverheen` : `${formatCents(ruimte)} ruimte`}
                </span>
              )}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-xs text-gray-500">
            {uitleg ?? 'Geen maanddoel ingesteld.'}
          </p>
        )}
      </div>

      <div className={`flex-1 space-y-2 p-3 ${bezig ? 'opacity-60' : ''}`}>
        {klanten.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-gray-500">
            Sleep hier een klant naartoe.
          </p>
        ) : (
          klanten.map((k) => (
            <article
              key={k.organizationId}
              draggable
              onDragStart={() => onSleepStart(k.organizationId)}
              onDragEnd={() => onSleepStart(null)}
              className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 active:cursor-grabbing"
            >
              <div className="flex items-start justify-between gap-2">
                <a
                  href={`/beheer/klanten/${k.slug}`}
                  className="hover:text-jr-blue text-sm"
                  draggable={false}
                >
                  {k.naam}
                </a>
                <span className="tabular shrink-0 text-sm">{formatCents(k.maandwaardeCents)}</span>
              </div>

              <p className="mt-0.5 text-xs text-gray-500">
                {k.abonnementen === 0
                  ? 'geen lopend abonnement'
                  : `${k.abonnementen} ${k.abonnementen === 1 ? 'abonnement' : 'abonnementen'}`}
                {k.status === 'prospect' && <span className="text-jr-purple"> &middot; prospect</span>}
              </p>

              <label className="mt-2 block">
                <span className="sr-only">Verplaats {k.naam} naar</span>
                <select
                  value={id}
                  onChange={(e) => onKies(k.organizationId, e.target.value)}
                  className="focus:border-jr-blue w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 outline-none"
                >
                  {opties.map((o) => (
                    <option key={o.waarde} value={o.waarde}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
