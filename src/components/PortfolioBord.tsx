'use client'

import { useState, useTransition } from 'react'
import { wijsKlantToe, zetMaanddoel } from '@/app/beheer/portfolio-actions'
import { formatCents } from '@/lib/money'
import type { PortfolioBord as Bord, PortfolioKlant } from '@/lib/portfolio'

/* -------------------------------------------------------------------------
   Het portfoliobord.

   Twee dingen bepalen de vorm. Het moet in één blik te overzien zijn — dus
   de kolommen staan naast elkaar en passen zich aan de schermbreedte aan, en
   het maanddoel staat in de kolomkop en niet in een tabel eronder. Voor een
   overzicht scrollen is geen overzicht.

   En het moet werken zonder muis. Slepen bestaat niet op een telefoon, dus
   elke kaart heeft ook een knop om hem te verplaatsen. Dat is geen
   noodoplossing maar de betrouwbare weg; slepen ligt daar bovenop.
   ------------------------------------------------------------------------- */

const NIET_TOEGEWEZEN = '__geen__'

export function PortfolioBord({
  bord,
  magBeheren,
}: {
  bord: Bord
  /** Alleen een beheerder mag doelen aanpassen. */
  magBeheren: boolean
}) {
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

  const alle = new Map<string, PortfolioKlant>()
  for (const kolom of bord.kolommen) for (const k of kolom.klanten) alle.set(k.organizationId, k)
  for (const k of bord.nietToegewezen) alle.set(k.organizationId, k)

  const klantenVan = (userId: string) =>
    [...alle.values()]
      .filter((k) => (waar[k.organizationId] ?? NIET_TOEGEWEZEN) === userId)
      .sort((a, b) => b.maandwaardeCents - a.maandwaardeCents)

  function verplaats(organizationId: string, naar: string) {
    const vorige = waar[organizationId] ?? NIET_TOEGEWEZEN
    if (vorige === naar) return

    setWaar((s) => ({ ...s, [organizationId]: naar }))
    setFout(null)

    startOvergang(async () => {
      const data = new FormData()
      data.set('organizationId', organizationId)
      data.set('userId', naar === NIET_TOEGEWEZEN ? '' : naar)

      const uitkomst = await wijsKlantToe(data)
      if (!uitkomst.ok) {
        // Terugzetten: het bord mag nooit iets anders tonen dan de database.
        setWaar((s) => ({ ...s, [organizationId]: vorige }))
        setFout(uitkomst.error)
      }
    })
  }

  const opties = [
    ...bord.kolommen.map((k) => ({ waarde: k.userId, label: k.naam })),
    { waarde: NIET_TOEGEWEZEN, label: 'Nog niet toegewezen' },
  ]

  return (
    <div>
      {fout && (
        <p role="alert" className="border-jr-red bg-jr-red/5 mb-3 rounded border-l-4 p-2.5 text-sm">
          {fout}
        </p>
      )}

      {/* Kolommen die zich aan de breedte aanpassen: op een breed scherm staan
          ze allemaal naast elkaar, op een smal scherm vouwen ze om.

          Dit staat bewust in een style-attribuut en niet in een Tailwind-klasse
          met blokhaken. Zo'n klasse met komma's erin levert ongeldige CSS op,
          en dan valt het HELE stylesheet uit — de pagina komt dan zonder enige
          opmaak binnen. Eén regel kapot is alles kapot. */}
      <div
        className="grid items-start gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        {bord.kolommen.map((kolom) => {
          const eigen = klantenVan(kolom.userId)
          const totaal = eigen.reduce((t, k) => t + k.maandwaardeCents, 0)
          return (
            <Kolom
              key={kolom.userId}
              id={kolom.userId}
              titel={kolom.naam}
              totaal={totaal}
              target={kolom.targetCents}
              klanten={eigen}
              opties={opties}
              actief={boven === kolom.userId}
              bezig={bezig}
              magBeheren={magBeheren}
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
          totaal={klantenVan(NIET_TOEGEWEZEN).reduce((t, k) => t + k.maandwaardeCents, 0)}
          target={null}
          klanten={klantenVan(NIET_TOEGEWEZEN)}
          opties={opties}
          actief={boven === NIET_TOEGEWEZEN}
          bezig={bezig}
          magBeheren={false}
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
  id, titel, totaal, target, klanten, opties, actief, bezig, magBeheren,
  waarschuwing = false, onSleepStart, onSleepBoven, onDrop, onKies,
}: {
  id: string
  titel: string
  totaal: number
  target: number | null
  klanten: PortfolioKlant[]
  opties: { waarde: string; label: string }[]
  actief: boolean
  bezig: boolean
  magBeheren: boolean
  waarschuwing?: boolean
  onSleepStart: (id: string | null) => void
  onSleepBoven: (id: string | null) => void
  onDrop: () => void
  onKies: (organizationId: string, naar: string) => void
}) {
  const percentage = target === null ? null : Math.round((totaal / target) * 100)
  const ruimte = target === null ? null : target - totaal

  // Boven de honderd procent is het niet "af" maar te vol; dat moet je zien.
  const balk =
    percentage === null ? 'bg-gray-300'
      : percentage > 100 ? 'bg-jr-red'
      : percentage >= 85 ? 'bg-jr-orange'
      : 'bg-jr-blue'

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
      className={`flex flex-col rounded-xl border-2 shadow-sm transition-colors ${
        actief ? 'border-jr-blue bg-jr-lightblue/50' : 'border-transparent bg-white'
      }`}
    >
      <header className="border-b border-gray-200 px-3 pt-3 pb-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className={`truncate text-sm font-bold ${waarschuwing ? 'text-jr-orange' : ''}`}>
            {titel}
          </h2>
          {/* Het aantal klanten staat naast het bedrag, want een kolom met
              projectklanten kan weinig euro's tellen en toch vol zitten. */}
          <span className="tabular shrink-0 text-xs text-gray-500">
            {klanten.length}
            {klanten.some((k) => k.abonnementen === 0) && (
              <span className="text-gray-400">
                {' '}
                ({klanten.filter((k) => k.abonnementen === 0).length} project)
              </span>
            )}
          </span>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="tabular text-lg font-bold leading-none">{formatCents(totaal)}</p>
          {percentage !== null && (
            <span
              className={`tabular text-xs ${
                percentage > 100 ? 'text-jr-red' : 'text-gray-500'
              }`}
            >
              {percentage}%
            </span>
          )}
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-[width] ${balk}`}
            style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
          />
        </div>

        <DoelRegel
          id={id}
          target={target}
          ruimte={ruimte}
          magBeheren={magBeheren}
          waarschuwing={waarschuwing}
        />
      </header>

      <div className={`flex-1 space-y-1.5 p-2 ${bezig ? 'opacity-60' : ''}`}>
        {klanten.length === 0 ? (
          <p className="px-1 py-5 text-center text-xs text-gray-400">
            {waarschuwing ? 'Alles is verdeeld.' : 'Sleep hier een klant naartoe.'}
          </p>
        ) : (
          klanten.map((k) => (
            <Kaart key={k.organizationId} klant={k} huidige={id} opties={opties} onKies={onKies} onSleepStart={onSleepStart} />
          ))
        )}
      </div>
    </section>
  )
}

/** Het maanddoel, bewerkbaar in de kop zelf in plaats van in een tabel eronder. */
function DoelRegel({
  id, target, ruimte, magBeheren, waarschuwing,
}: {
  id: string
  target: number | null
  ruimte: number | null
  magBeheren: boolean
  waarschuwing: boolean
}) {
  const [open, setOpen] = useState(false)
  const [waarde, setWaarde] = useState(
    target === null ? '' : (target / 100).toFixed(2).replace('.', ','),
  )
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, start] = useTransition()

  if (waarschuwing) {
    return <p className="mt-1.5 text-xs text-gray-500">Horen bij niemand.</p>
  }

  if (open && magBeheren) {
    return (
      <form
        className="mt-1.5 flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const data = new FormData()
            data.set('userId', id)
            data.set('doel', waarde)
            const uitkomst = await zetMaanddoel(data)
            if (uitkomst.ok) {
              setOpen(false)
              setFout(null)
            } else {
              setFout(uitkomst.error)
            }
          })
        }}
      >
        <input
          autoFocus
          value={waarde}
          onChange={(e) => setWaarde(e.target.value)}
          placeholder="20000,00"
          aria-label="Maanddoel"
          className="focus:border-jr-blue w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs outline-none"
        />
        <button type="submit" disabled={bezig} className="text-jr-blue text-xs disabled:opacity-50">
          {bezig ? '…' : 'ok'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400">
          ×
        </button>
        {fout && <span className="text-jr-red text-xs">{fout}</span>}
      </form>
    )
  }

  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
      {target === null ? (
        <span>geen doel</span>
      ) : (
        <span className="tabular">
          van {formatCents(target)}
          {ruimte !== null && (
            <span className={ruimte < 0 ? 'text-jr-red' : ''}>
              {' · '}
              {ruimte < 0 ? `${formatCents(-ruimte)} te veel` : `${formatCents(ruimte)} ruimte`}
            </span>
          )}
        </span>
      )}
      {magBeheren && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hover:text-jr-blue shrink-0 underline decoration-dotted"
        >
          {target === null ? 'instellen' : 'wijzig'}
        </button>
      )}
    </p>
  )
}

function Kaart({
  klant, huidige, opties, onKies, onSleepStart,
}: {
  klant: PortfolioKlant
  huidige: string
  opties: { waarde: string; label: string }[]
  onKies: (organizationId: string, naar: string) => void
  onSleepStart: (id: string | null) => void
}) {
  const [verplaatsen, setVerplaatsen] = useState(false)

  return (
    <article
      draggable
      onDragStart={() => onSleepStart(klant.organizationId)}
      onDragEnd={() => onSleepStart(null)}
      className="group cursor-grab rounded-lg border border-gray-200 bg-white px-2.5 py-2 active:cursor-grabbing"
    >
      <div className="flex items-baseline justify-between gap-2">
        <a
          href={`/beheer/klanten/${klant.slug}`}
          draggable={false}
          className="hover:text-jr-blue truncate text-[13px]"
        >
          {klant.naam}
        </a>
        <span className="tabular shrink-0 text-[13px]">{formatCents(klant.maandwaardeCents)}</span>
      </div>

      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-gray-500">
          {klant.abonnementen > 0 &&
            `${klant.abonnementen} abo${klant.abonnementen === 1 ? '' : "'s"}`}
          {/* Een klant zonder abonnement is geen lege klant: hij werkt op
              opdrachten. Dat moet je op de kaart kunnen zien, anders lijkt
              een kolom vol projectklanten leeg. */}
          {klant.abonnementen === 0 && klant.projectCents > 0 && 'projectbasis'}
          {klant.abonnementen === 0 && klant.projectCents === 0 && (
            <span className="text-jr-orange">nog geen waarde</span>
          )}
          {klant.abonnementen > 0 && klant.projectCents > 0 && ' + projecten'}
          {klant.status === 'prospect' && <span className="text-jr-purple"> · prospect</span>}
        </p>

        {verplaatsen ? (
          <select
            autoFocus
            value={huidige}
            onChange={(e) => {
              onKies(klant.organizationId, e.target.value)
              setVerplaatsen(false)
            }}
            onBlur={() => setVerplaatsen(false)}
            aria-label={`Verplaats ${klant.naam}`}
            className="focus:border-jr-blue rounded border border-gray-300 px-1 py-0.5 text-[11px] outline-none"
          >
            {opties.map((o) => (
              <option key={o.waarde} value={o.waarde}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setVerplaatsen(true)}
            // Op een aanraakscherm is er geen hover, dus daar staat hij altijd aan.
            className="hover:text-jr-blue shrink-0 text-[11px] text-gray-400 underline decoration-dotted"
          >
            verplaats
          </button>
        )}
      </div>
    </article>
  )
}
