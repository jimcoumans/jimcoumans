'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  inhoudVan,
  sorteerTijdlijn,
  type BriefingConcept,
  type ConceptPunt,
  type DeliverableConcept,
  type KpiConcept,
  type LijstVeld,
  type TijdlijnConcept,
} from '@/lib/briefing-concept'
import { parseAmountToCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { slaBriefingOp, doeSuggestieSamenvatting, doeSuggestieTijdlijn } from '@/app/beheer/campagne-actions'
import { Kaart } from './Kaart'
import { RegelLijst, RegelKnoppen, nieuweSleutel, groei, verplaats } from './RegelLijst'
import { meldOpslaan, meldStaat } from './opslaan'

/* -------------------------------------------------------------------------
   De briefing invullen. Alles wat je wijzigt, blijft in het scherm tot je
   op Opslaan klikt: één knop voor de hele briefing, onderaan altijd in
   beeld. Ga je weg met wijzigingen die nog niet zijn opgeslagen, dan vraagt
   de browser of je dat zeker weet. "Bekijk de briefing", de pdf en
   versturen slaan eerst op.
   ------------------------------------------------------------------------- */

const LEEG = '-'

const VELD =
  'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400 focus:border-jr-blue'
const VELD_KLEIN =
  'min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none hover:border-gray-400 focus:border-jr-blue'

type Optie = { value: string; label: string }

export type EditorProps = {
  campaignId: string
  concept: BriefingConcept
  /** Wanneer de briefing voor het laatst in de database veranderde. */
  stempel: string
  team: { id: string; naam: string; functie: string | null }[]
  contacten: { id: string; naam: string; functie: string | null }[]
  klantSlug: string
  wieOpties: Optie[]
  kanaalSoorten: string[]
  tijdlijnOmschrijvingen: string[]
  inClickUp: boolean
  /** De budgetzin zoals hij nu is opgeslagen. */
  budgetNu: string
  /** Doelgroepen koppelen gaat direct, buiten de editor om. */
  doelgroepen: React.ReactNode
  /** De uitkomst van de hypothese, uit wat er is opgeslagen. */
  hypothese: React.ReactNode
}

function metIds(c: BriefingConcept, ids: Record<string, string>): BriefingConcept {
  if (Object.keys(ids).length === 0) return c
  const zet = <T extends { sleutel: string; id: string | null }>(r: T): T => (r.id || !ids[r.sleutel] ? r : { ...r, id: ids[r.sleutel]! })
  return { ...c, kpis: c.kpis.map(zet), deliverables: c.deliverables.map(zet), tijdlijn: c.tijdlijn.map(zet) }
}

const alsDatum = (s: string) => (s ? new Date(`${s}T12:00:00`) : null)

/** Wanneer een deliverable live staat, voor de samenvatting van de regel. */
function liveTekst(k: DeliverableConcept): string {
  const van = alsDatum(k.liveFrom)
  const tot = alsDatum(k.liveUntil)
  const eenDag = /^(mailing|organisch)/i.test(k.kind.trim())
  if (van && tot && k.liveFrom !== k.liveUntil) return `${formatDate(van)} – ${formatDate(tot)}`
  if (van) return eenDag || tot ? formatDate(van) : `vanaf ${formatDate(van)}`
  return tot ? `tot ${formatDate(tot)}` : ''
}

function prijsTekst(cents: number): string {
  return cents % 100 === 0
    ? `€ ${Math.round(cents / 100).toLocaleString('nl-NL')}`
    : `€ ${(cents / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BriefingEditor(p: EditorProps) {
  const [staat, setStaat] = useState(p.concept)
  const [basis, setBasis] = useState(p.concept)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [opgeslagenOm, setOpgeslagenOm] = useState<Date | null>(null)
  const [zekerTerug, setZekerTerug] = useState(false)

  const vuil = useMemo(() => inhoudVan(staat) !== inhoudVan(basis), [staat, basis])
  // Pas na het laden reageert het scherm op typen; tot dan is Opslaan uit.
  const [klaar, setKlaar] = useState(false)
  useEffect(() => setKlaar(true), [])

  const staatRef = useRef(staat)
  staatRef.current = staat
  const vuilRef = useRef(vuil)
  vuilRef.current = vuil
  const sinds = useRef(p.stempel)
  const loopt = useRef<Promise<boolean> | null>(null)

  // Nieuwe gegevens van de server (na opslaan, na verwerkte feedback of een
  // import): overnemen zolang er hier niets openstaat. Met openstaande
  // wijzigingen blijven die staan, en zeggen we dat er een nieuwe versie is.
  const server = useRef({ concept: p.concept, stempel: p.stempel })
  const [nieuwer, setNieuwer] = useState(false)
  const vorigeStempel = useRef(p.stempel)
  useEffect(() => {
    if (p.stempel === vorigeStempel.current) return
    vorigeStempel.current = p.stempel
    server.current = { concept: p.concept, stempel: p.stempel }
    if (vuilRef.current) {
      setNieuwer(true)
      return
    }
    sinds.current = p.stempel
    if (inhoudVan(p.concept) !== inhoudVan(staatRef.current)) {
      setStaat(p.concept)
      setBasis(p.concept)
    }
  }, [p.stempel, p.concept])

  /** De versie van de server laden; wat hier openstond, vervalt. */
  const laadNieuweVersie = useCallback(() => {
    sinds.current = server.current.stempel
    setStaat(server.current.concept)
    setBasis(server.current.concept)
    setNieuwer(false)
    setFout(null)
  }, [])

  const opslaan = useCallback(async (): Promise<boolean> => {
    if (loopt.current) return loopt.current
    const verstuurd = staatRef.current
    const werk = (async () => {
      setFout(null)
      setBezig(true)
      meldStaat({ bezig: true })
      try {
        const r = await slaBriefingOp(p.campaignId, verstuurd, sinds.current)
        if (!r.ok) {
          setFout(r.error)
          return false
        }
        sinds.current = r.stempel
        const bewaard = metIds({ ...verstuurd, tijdlijn: sorteerTijdlijn(verstuurd.tijdlijn) }, r.ids)
        const nu = metIds(staatRef.current, r.ids)
        const ongewijzigd = staatRef.current === verstuurd
        setBasis(bewaard)
        setStaat(ongewijzigd ? bewaard : nu)
        const nogVuil = !ongewijzigd && inhoudVan(nu) !== inhoudVan(bewaard)
        vuilRef.current = nogVuil
        meldStaat({ vuil: nogVuil })
        setOpgeslagenOm(new Date())
        return true
      } catch {
        setFout('Opslaan lukte niet. Controleer je verbinding en probeer het opnieuw; je wijzigingen staan er nog.')
        return false
      } finally {
        setBezig(false)
        meldStaat({ bezig: false })
        loopt.current = null
      }
    })()
    loopt.current = werk
    return werk
  }, [p.campaignId])

  useEffect(() => {
    meldOpslaan(opslaan)
    return () => meldOpslaan(null)
  }, [opslaan])

  useEffect(() => {
    meldStaat({ vuil })
  }, [vuil])

  useEffect(() => () => meldStaat({ vuil: false, bezig: false }), [])

  // Weggaan met wijzigingen die nog niet zijn opgeslagen: de browser vraagt het eerst.
  useEffect(() => {
    if (!vuil) return
    const waarschuw = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', waarschuw)
    return () => window.removeEventListener('beforeunload', waarschuw)
  }, [vuil])

  // Cmd+S of Ctrl+S slaat op, zoals overal.
  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (vuilRef.current) void opslaan()
      }
    }
    window.addEventListener('keydown', toets)
    return () => window.removeEventListener('keydown', toets)
  }, [opslaan])

  useEffect(() => {
    if (!zekerTerug) return
    const t = setTimeout(() => setZekerTerug(false), 4000)
    return () => clearTimeout(t)
  }, [zekerTerug])

  useEffect(() => {
    if (!opgeslagenOm) return
    const t = setTimeout(() => setOpgeslagenOm(null), 4000)
    return () => clearTimeout(t)
  }, [opgeslagenOm])

  /* ------------------------------ Wijzigen ------------------------------ */

  const zet = (patch: Partial<BriefingConcept>) => setStaat((s) => ({ ...s, ...patch }))
  const lijst = (veld: LijstVeld) => ({
    punten: staat.lijsten[veld],
    onChange: (punten: ConceptPunt[]) => setStaat((s) => ({ ...s, lijsten: { ...s.lijsten, [veld]: punten } })),
  })
  const zetAanname = (naam: keyof BriefingConcept['aannames'], waarde: string) =>
    setStaat((s) => ({ ...s, aannames: { ...s.aannames, [naam]: waarde } }))
  const wissel = (veld: 'specialistIds' | 'contactIds' | 'voorstel', id: string, aan: boolean) =>
    setStaat((s) => ({ ...s, [veld]: aan ? [...new Set([...s[veld], id])] : s[veld].filter((x) => x !== id) }))

  const zetKpi = (i: number, patch: Partial<KpiConcept>) => setStaat((s) => ({ ...s, kpis: s.kpis.map((k, j) => (j === i ? { ...k, ...patch } : k)) }))
  const zetDeliverable = (i: number, patch: Partial<DeliverableConcept>) =>
    setStaat((s) => ({ ...s, deliverables: s.deliverables.map((k, j) => (j === i ? { ...k, ...patch } : k)) }))
  const zetRegel = (sleutel: string, patch: Partial<TijdlijnConcept>) =>
    setStaat((s) => ({ ...s, tijdlijn: s.tijdlijn.map((t) => (t.sleutel === sleutel ? { ...t, ...patch } : t)) }))

  /* De tijdlijn op volgorde zetten als je klaar bent met een regel, niet bij elke toets:
     anders springt de regel weg terwijl je nog typt. */
  const [verplaatst, setVerplaatst] = useState<string | null>(null)
  const sorteer = (sleutel: string) => {
    const huidig = staatRef.current.tijdlijn
    const nieuw = sorteerTijdlijn(huidig)
    if (nieuw.every((t, i) => t === huidig[i])) return
    setStaat((s) => ({ ...s, tijdlijn: sorteerTijdlijn(s.tijdlijn) }))
    if (huidig.findIndex((t) => t.sleutel === sleutel) !== nieuw.findIndex((t) => t.sleutel === sleutel)) setVerplaatst(sleutel)
  }
  useEffect(() => {
    if (!verplaatst) return
    document.getElementById(`tijdlijn-${verplaatst}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const t = setTimeout(() => setVerplaatst(null), 1600)
    return () => clearTimeout(t)
  }, [verplaatst])

  const [openDeliverables, setOpenDeliverables] = useState<Set<string>>(new Set())
  const toggleDeliverable = (sleutel: string) =>
    setOpenDeliverables((o) => {
      const n = new Set(o)
      if (n.has(sleutel)) n.delete(sleutel)
      else n.add(sleutel)
      return n
    })

  const [focusOp, setFocusOp] = useState<string | null>(null)
  useEffect(() => {
    if (!focusOp) return
    document.getElementById(focusOp)?.focus()
    setFocusOp(null)
  }, [focusOp])

  /* ------------------------------ Suggesties ---------------------------- */

  const [suggestie, setSuggestie] = useState<{ wat: 'samenvatting' | 'tijdlijn'; fout?: string } | null>(null)
  const doeSuggestie = async (wat: 'samenvatting' | 'tijdlijn') => {
    setSuggestie({ wat })
    // Een suggestie rekent met wat er is opgeslagen, dus eerst opslaan.
    if (vuilRef.current && !(await opslaan())) {
      setSuggestie(null)
      return
    }
    const f = new FormData()
    f.set('campaignId', p.campaignId)
    try {
      const r = await (wat === 'samenvatting' ? doeSuggestieSamenvatting(f) : doeSuggestieTijdlijn(f))
      setSuggestie(r.ok ? null : { wat, fout: r.error })
    } catch {
      setSuggestie({ wat, fout: 'Dat lukte niet. Probeer het opnieuw.' })
    }
  }

  /* ------------------------------ Tellen -------------------------------- */

  const kpiRegels = staat.kpis.map((k) => {
    const aantal = Number(k.targetQuantity.trim())
    const prijs = k.price.trim() === '' ? null : parseAmountToCents(k.price.trim())
    return { aantal: Number.isInteger(aantal) && aantal > 0 ? aantal : 0, prijs }
  })
  const totaalAantal = kpiRegels.reduce((a, k) => a + k.aantal, 0)
  const totaalOmzet = kpiRegels.reduce((a, k) => a + k.aantal * (k.prijs ?? 0), 0)

  const naOpslaan = vuil ? <span className="text-gray-500"> Wordt bijgewerkt als je opslaat.</span> : null

  return (
    <div className="space-y-6" data-klaar={klaar || undefined}>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {/* ---------------------------- Samenvatting ---------------------------- */}
        <Kaart
          titel="Samenvatting"
          uitleg="Eén of twee zinnen bovenaan de briefing. Leeg bij het versturen? Dan schrijven we hem uit wat er is ingevuld."
        >
          <Tekstvak label="Samenvatting" waarde={staat.summary} onChange={(summary) => zet({ summary })} rijen={3} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => doeSuggestie('samenvatting')}
              disabled={suggestie?.wat === 'samenvatting' && !suggestie.fout}
              className="min-h-10 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              {suggestie?.wat === 'samenvatting' && !suggestie.fout ? 'Bezig…' : 'Doe suggestie'}
            </button>
            {suggestie?.wat === 'samenvatting' && suggestie.fout && <span className="text-sm text-[#C02A22]">{suggestie.fout}</span>}
          </div>
        </Kaart>

        {/* ---------------------------- 1 De basis ---------------------------- */}
        <Kaart nummer={1} titel="De basis">
          <div className="space-y-4">
            <Invoer label="Campagnenaam" waarde={staat.title} onChange={(title) => zet({ title })} verplicht />
            <div>
              <label htmlFor="mm" className="text-jr-text mb-1.5 block text-[13px] font-medium">
                Marketingmanager
              </label>
              <select id="mm" value={staat.marketingManagerId} onChange={(e) => zet({ marketingManagerId: e.target.value })} className={VELD}>
                <option value="">{LEEG}</option>
                {p.team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.functie ? `${t.naam} · ${t.functie}` : t.naam}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-600">Komt van de klantkaart; hier aan te passen voor deze campagne.</p>
            </div>
            <fieldset>
              <legend className="text-jr-text mb-2 text-[13px] font-medium">Aangesloten specialisten</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {p.team
                  .filter((t) => t.id !== staat.marketingManagerId)
                  .map((t) => (
                    <Vink
                      key={t.id}
                      label={t.naam}
                      onder={t.functie ?? 'Functie nog niet ingevuld'}
                      aan={staat.specialistIds.includes(t.id)}
                      onChange={(aan) => wissel('specialistIds', t.id, aan)}
                    />
                  ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-jr-text mb-2 text-[13px] font-medium">Contactpersonen</legend>
              {p.contacten.length === 0 ? (
                <p className="text-sm text-gray-600">
                  Nog geen contactpersonen. Voeg ze toe op de{' '}
                  <a href={`/beheer/klanten/${p.klantSlug}`} className="text-jr-link hover:underline">
                    klantkaart
                  </a>
                  .
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {p.contacten.map((c) => (
                    <Vink
                      key={c.id}
                      label={c.naam}
                      onder={c.functie ?? undefined}
                      aan={staat.contactIds.includes(c.id)}
                      onChange={(aan) => wissel('contactIds', c.id, aan)}
                    />
                  ))}
                </div>
              )}
            </fieldset>
          </div>
        </Kaart>
      </div>

      {/* ---------------------------- 2 Het doel ---------------------------- */}
      <Kaart nummer={2} titel="Het doel" uitleg="De KPI’s zijn de basis van de hypothese: het doel is hun som, de omzet aantal maal prijs.">
        <h3 className="mb-2 text-[15px]">KPI’s</h3>
        {staat.kpis.length > 0 && (
          <div className="mb-2">
            <div className="hidden grid-cols-[minmax(0,1fr)_150px_80px_100px_100px_92px] gap-2 border-b border-gray-200 pb-2 text-xs text-gray-600 md:grid">
              <span>Wat</span>
              <span>Datum</span>
              <span className="text-right">Doel</span>
              <span className="text-right">Prijs</span>
              <span className="text-right">Omzet</span>
              <span />
            </div>
            <ul className="divide-y divide-gray-100">
              {staat.kpis.map((k, i) => (
                <li key={k.sleutel} className="group grid items-center gap-2 py-2 md:grid-cols-[minmax(0,1fr)_150px_80px_100px_100px_92px]">
                  <input
                    id={`kpi-${k.sleutel}`}
                    value={k.label}
                    onChange={(e) => zetKpi(i, { label: e.target.value })}
                    placeholder="Kerstdiner"
                    aria-label={`KPI ${i + 1}, wat`}
                    className={VELD_KLEIN}
                  />
                  <input type="date" value={k.on} onChange={(e) => zetKpi(i, { on: e.target.value })} aria-label={`KPI ${i + 1}, datum`} className={VELD_KLEIN} />
                  <input
                    value={k.targetQuantity}
                    onChange={(e) => zetKpi(i, { targetQuantity: e.target.value })}
                    inputMode="numeric"
                    placeholder="80"
                    aria-label={`KPI ${i + 1}, doel`}
                    className={`${VELD_KLEIN} md:text-right`}
                  />
                  <input
                    value={k.price}
                    onChange={(e) => zetKpi(i, { price: e.target.value })}
                    inputMode="decimal"
                    placeholder="110"
                    aria-label={`KPI ${i + 1}, prijs`}
                    className={`${VELD_KLEIN} md:text-right`}
                  />
                  <span className="tabular px-1 text-sm whitespace-nowrap text-gray-700 md:text-right">
                    {kpiRegels[i]!.prijs !== null && kpiRegels[i]!.aantal > 0 ? prijsTekst(kpiRegels[i]!.prijs! * kpiRegels[i]!.aantal) : LEEG}
                  </span>
                  <RegelKnoppen
                    wat={`KPI ${i + 1}`}
                    volgorde={{
                      omhoog: i > 0 ? () => zet({ kpis: verplaats(staat.kpis, i, i - 1) }) : undefined,
                      omlaag: i < staat.kpis.length - 1 ? () => zet({ kpis: verplaats(staat.kpis, i, i + 1) }) : undefined,
                    }}
                    weg={() => zet({ kpis: staat.kpis.filter((_, j) => j !== i) })}
                  />
                </li>
              ))}
            </ul>
            <div className="tabular grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-gray-300 pt-2 text-[15px] font-semibold md:grid-cols-[minmax(0,1fr)_150px_80px_100px_100px_92px]">
              <span>Totaal</span>
              <span className="hidden md:block" />
              <span className="text-right">{totaalAantal.toLocaleString('nl-NL')}</span>
              <span className="hidden md:block" />
              <span className="hidden text-right md:block">{totaalOmzet > 0 ? prijsTekst(totaalOmzet) : LEEG}</span>
            </div>
          </div>
        )}
        <ToevoegKnop
          label="KPI toevoegen"
          onClick={() => {
            const sleutel = nieuweSleutel()
            zet({ kpis: [...staat.kpis, { sleutel, id: null, label: '', on: '', targetQuantity: '', price: '' }] })
            setFocusOp(`kpi-${sleutel}`)
          }}
        />

        <div className="mt-8 grid gap-x-8 gap-y-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Invoer label="Doel in één zin" waarde={staat.goalSentence} onChange={(goalSentence) => zet({ goalSentence })} />
            <VoorstelVink veld="doel" staat={staat} wissel={wissel} />
            <Invoer
              label="Wat telt als resultaat"
              waarde={staat.resultDefinition}
              onChange={(resultDefinition) => zet({ resultDefinition })}
              placeholder="Een reservering in Odoo"
            />
            <RegelLijst label="Opmerkingen bij de KPI’s" {...lijst('kpiNotes')} />
          </div>
          <div className="space-y-4">
            <fieldset className="rounded-lg border border-gray-200 p-3">
              <legend className="text-jr-text px-1 text-[13px] font-medium">Advertentiebudget</legend>
              <div className="space-y-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="budgetMode"
                    checked={staat.budgetMode === 'berekend'}
                    onChange={() => zet({ budgetMode: 'berekend' })}
                    className="accent-jr-blue mt-0.5"
                  />
                  <span>
                    Berekend uit het doel
                    <span className="block text-xs text-gray-500">
                      De hypothese geeft een bandbreedte: van het deel dat we uit advertenties verwachten tot de bovengrens, als alles uit advertenties komt.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="budgetMode"
                    checked={staat.budgetMode === 'vast'}
                    onChange={() => zet({ budgetMode: 'vast' })}
                    className="accent-jr-blue mt-0.5"
                  />
                  <span>
                    Vast budget
                    <span className="block text-xs text-gray-500">De hypothese rekent vooruit naar het verwachte resultaat.</span>
                  </span>
                </label>
                {staat.budgetMode === 'vast' && (
                  <Invoer label="Vast budget in euro’s" waarde={staat.fixedBudget} onChange={(fixedBudget) => zet({ fixedBudget })} placeholder="1500" verplicht />
                )}
              </div>
              <p className="mt-2 rounded bg-gray-100 p-2 text-xs text-gray-700">
                Nu: {p.budgetNu}
                {naOpslaan}
              </p>
            </fieldset>
            <RegelLijst label="Opmerkingen bij het budget" uitleg="Bijvoorbeeld wie de advertenties betaalt, of de verdeling per ad." {...lijst('budgetNote')} />
            <VoorstelVink veld="budget" staat={staat} wissel={wissel} />
          </div>
        </div>
      </Kaart>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        {/* ---------------------------- 3 Aanbod ---------------------------- */}
        <Kaart nummer={3} titel="Aanbod en boodschap">
          <div className="space-y-5">
            <RegelLijst
              label="Wat we verkopen"
              uitleg="Elk product of arrangement een eigen punt. Met Tab maak je er een subpunt van, zoals de gangen van een diner."
              knop="Product of arrangement toevoegen"
              {...lijst('offerWhat')}
            />
            <div>
              <Tekstvak label="Kernboodschap" waarde={staat.offerMessage} onChange={(offerMessage) => zet({ offerMessage })} rijen={2} />
              <div className="mt-2">
                <VoorstelVink veld="kernboodschap" staat={staat} wissel={wissel} />
              </div>
            </div>
            <RegelLijst label="Waarom nu" {...lijst('offerWhyNow')} />
            <RegelLijst label="Wat we niet beloven" {...lijst('offerNotPromised')} />
          </div>
        </Kaart>

        {/* ---------------------------- 4 Doelgroep ---------------------------- */}
        <Kaart nummer={4} titel="Doelgroep">
          {p.doelgroepen}
          <div className="mt-6 space-y-5 border-t border-gray-200 pt-6">
            <div className="space-y-2">
              <Invoer label="Regio" waarde={staat.region} onChange={(region) => zet({ region })} placeholder="Maastricht en 25 kilometer eromheen" />
              <VoorstelVink veld="regio" staat={staat} wissel={wissel} />
            </div>
            <RegelLijst label="Uitsluiten" {...lijst('exclusions')} />
            <RegelLijst label="Opmerkingen" {...lijst('audienceNotes')} />
          </div>
        </Kaart>
      </div>

      {/* ---------------------------- 5 Deliverables ---------------------------- */}
      <Kaart
        nummer={5}
        titel="Deliverables"
        uitleg="Elke uiting een eigen regel met een eigen naam: Ad 1, Ad 2, Mailing 1, Post 1. Dus niet “3 mailings”, maar drie regels, elk met wat erin staat en wanneer hij live gaat. Wat nog gemaakt moet worden, komt in de tijdlijn."
      >
        <datalist id="kanaal-soorten">
          {p.kanaalSoorten.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {staat.deliverables.length > 0 && (
          <ul className="mb-2 divide-y divide-gray-200">
            {staat.deliverables.map((k, i) => {
              const open = openDeliverables.has(k.sleutel)
              const live = liveTekst(k)
              return (
                <li key={k.sleutel} className="group py-2.5">
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                    <button type="button" onClick={() => toggleDeliverable(k.sleutel)} aria-expanded={open} className="min-w-0 flex-1 text-left">
                      <span className="text-[15px]">
                        <span className="font-medium">{k.name.trim() || k.kind.trim() || 'Nieuwe deliverable'}</span>
                        {k.name.trim() && k.kind.trim() && <span className="text-gray-600"> · {k.kind}</span>}
                        {live && <span className="text-gray-600"> · {live}</span>}
                      </span>
                      {!open && k.note.trim() && <span className="mt-0.5 line-clamp-2 block text-xs text-gray-600">{k.note}</span>}
                    </button>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => zetDeliverable(i, { status: k.status === 'bestaat' ? 'maken' : 'bestaat' })}
                        title="Klik om te wisselen"
                        className={`rounded-full px-3 py-1 text-xs ${k.status === 'bestaat' ? 'bg-jr-green/15 text-[#1d7a36]' : 'bg-jr-lightblue text-jr-deepblue'}`}
                      >
                        {k.status === 'bestaat' ? 'Bestaat al' : 'Nog te maken'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDeliverable(k.sleutel)}
                        className="text-jr-link rounded-lg px-2 py-1 text-xs font-medium hover:bg-gray-100"
                      >
                        {open ? 'Klaar' : 'Wijzig'}
                      </button>
                      <RegelKnoppen
                        wat={k.name || `Deliverable ${i + 1}`}
                        volgorde={{
                          omhoog: i > 0 ? () => zet({ deliverables: verplaats(staat.deliverables, i, i - 1) }) : undefined,
                          omlaag: i < staat.deliverables.length - 1 ? () => zet({ deliverables: verplaats(staat.deliverables, i, i + 1) }) : undefined,
                        }}
                        weg={() => zet({ deliverables: staat.deliverables.filter((_, j) => j !== i) })}
                      />
                    </span>
                  </div>
                  {open && (
                    <div className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Invoer
                          id={`deliverable-${k.sleutel}`}
                          label="Naam"
                          waarde={k.name}
                          onChange={(name) => zetDeliverable(i, { name })}
                          placeholder="Ad 1 · Kerstbrunch"
                        />
                        <Invoer label="Kanaal" waarde={k.kind} onChange={(kind) => zetDeliverable(i, { kind })} placeholder="Kies of typ" lijst="kanaal-soorten" verplicht />
                      </div>
                      <Tekstvak label="Wat erin staat en voor wie" waarde={k.note} onChange={(note) => zetDeliverable(i, { note })} rijen={2} />
                      <Invoer label="Formaat" waarde={k.quantity} onChange={(quantity) => zetDeliverable(i, { quantity })} placeholder="1:1, 4:5 en 9:16" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Invoer
                          label="Live vanaf"
                          type="date"
                          waarde={k.liveFrom}
                          onChange={(liveFrom) => zetDeliverable(i, { liveFrom })}
                          hint="Bij een mailing: de verzenddag."
                        />
                        <Invoer label="Live tot" type="date" waarde={k.liveUntil} onChange={(liveUntil) => zetDeliverable(i, { liveUntil })} />
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <ToevoegKnop
          label="Deliverable toevoegen"
          onClick={() => {
            const sleutel = nieuweSleutel()
            zet({
              deliverables: [
                ...staat.deliverables,
                { sleutel, id: null, name: '', kind: '', note: '', quantity: '', liveFrom: '', liveUntil: '', status: 'maken' },
              ],
            })
            setOpenDeliverables((o) => new Set(o).add(sleutel))
            setFocusOp(`deliverable-${sleutel}`)
          }}
        />
      </Kaart>

      {/* ---------------------------- 6 Planning ---------------------------- */}
      <Kaart nummer={6} titel="De planning">
        <div className="grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="grid gap-3 sm:grid-cols-2 lg:self-start">
            <Invoer label="Start" type="date" waarde={staat.startOn} onChange={(startOn) => zet({ startOn })} />
            <Invoer label="Einde" type="date" waarde={staat.endOn} onChange={(endOn) => zet({ endOn })} />
          </div>
          <RegelLijst label="Opmerkingen bij de planning" uitleg="Bijvoorbeeld een stopcriterium of beslismoment." {...lijst('planningNotes')} />
        </div>

        <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px]">Tijdlijn</h3>
          <span className="text-xs text-gray-500">
            Op datum gesorteerd{p.inClickUp ? ' · staat in ClickUp als subtaken' : ''}
          </span>
        </div>
        <datalist id="tijdlijn-omschrijvingen">
          {p.tijdlijnOmschrijvingen.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {staat.tijdlijn.length === 0 ? (
          <p className="mt-1 mb-3 text-sm text-gray-500">Nog leeg. Laat een suggestie doen uit de data en de deliverables, en pas die aan.</p>
        ) : (
          <ul className="mt-2 mb-2 divide-y divide-gray-100">
            {staat.tijdlijn.map((t) => (
              <li
                key={t.sleutel}
                id={`tijdlijn-${t.sleutel}`}
                // Op volgorde zodra je de regel verlaat, niet terwijl je nog in de datum typt.
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) sorteer(t.sleutel)
                }}
                className={`group grid items-center gap-2 rounded-lg py-1.5 transition-colors duration-700 sm:grid-cols-[150px_minmax(0,1fr)_190px_36px] ${
                  verplaatst === t.sleutel ? 'bg-jr-lightblue' : ''
                }`}
              >
                <input
                  type="date"
                  value={t.dueOn}
                  onChange={(e) => zetRegel(t.sleutel, { dueOn: e.target.value })}
                  aria-label="Deadline"
                  className={VELD_KLEIN}
                />
                <input
                  id={`tijdlijn-tekst-${t.sleutel}`}
                  value={t.description}
                  onChange={(e) => zetRegel(t.sleutel, { description: e.target.value })}
                  list="tijdlijn-omschrijvingen"
                  placeholder="Kies of typ wat er moet gebeuren"
                  aria-label="Omschrijving"
                  className={VELD_KLEIN}
                />
                <select value={t.assignee} onChange={(e) => zetRegel(t.sleutel, { assignee: e.target.value })} aria-label="Wie" className={VELD_KLEIN}>
                  {p.wieOpties.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  {t.assignee && !p.wieOpties.some((o) => o.value === t.assignee) && (
                    <option value={t.assignee}>{t.assignee.replace(/^(user|label):/, '')}</option>
                  )}
                </select>
                <RegelKnoppen wat={t.description || 'Regel'} weg={() => zet({ tijdlijn: staat.tijdlijn.filter((x) => x.sleutel !== t.sleutel) })} />
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <ToevoegKnop
            label="Regel toevoegen"
            onClick={() => {
              const sleutel = nieuweSleutel()
              zet({ tijdlijn: [...staat.tijdlijn, { sleutel, id: null, dueOn: '', description: '', assignee: '' }] })
              setFocusOp(`tijdlijn-tekst-${sleutel}`)
            }}
          />
          <button
            type="button"
            onClick={() => doeSuggestie('tijdlijn')}
            disabled={suggestie?.wat === 'tijdlijn' && !suggestie.fout}
            className="min-h-9 rounded-lg border border-gray-300 px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            {suggestie?.wat === 'tijdlijn' && !suggestie.fout ? 'Bezig…' : 'Doe suggestie'}
          </button>
          <span className="text-xs text-gray-500">Een suggestie vult aan uit de data en de deliverables, en wist niets.</span>
          {suggestie?.wat === 'tijdlijn' && suggestie.fout && <span className="text-sm text-[#C02A22]">{suggestie.fout}</span>}
        </div>
      </Kaart>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        {/* ---------------------------- 7 Afspraken ---------------------------- */}
        <Kaart nummer={7} titel="Afspraken met de klant">
          <div className="space-y-5">
            <RegelLijst label="Wat de klant zelf doet" knop="Taak voor de klant toevoegen" placeholder="Elke maandag de stand doorgeven" {...lijst('clientDoes')} />
            <RegelLijst label="Opmerkingen" uitleg="Bijvoorbeeld betaal- of annuleringsvoorwaarden van de klant zelf." {...lijst('agreementNotes')} />
          </div>
        </Kaart>

        {/* ---------------------------- 8 Achtergrond ---------------------------- */}
        <Kaart nummer={8} titel="Achtergrondinformatie">
          <div className="space-y-5">
            <RegelLijst label="Wat we weten van vorige keer" {...lijst('backgroundPrevious')} />
            <RegelLijst label="Risico’s" knop="Risico toevoegen" {...lijst('backgroundRisks')} />
          </div>
        </Kaart>
      </div>

      {/* ---------------------------- 9 Hypothese ---------------------------- */}
      <Kaart nummer={9} titel="Hypothese" uitleg="Alleen getallen, met per aanname de bron. Pas ze aan per campagne; de rest rekent het portaal.">
        <div className="space-y-8">
          <div>
            <div className="hidden gap-4 border-b border-gray-200 pb-2 text-xs text-gray-600 md:grid md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1.2fr)]">
              <span>Aanname</span>
              <span>Waarde</span>
              <span>Bron</span>
            </div>
            {/* In de volgorde van de trechter: vertoning, klik, conversie, opbrengst. */}
            <ol className="divide-y divide-gray-200">
              <AannameRij
                stap={1}
                label="Kosten per 1.000 impressies"
                uitleg="Wat het kost om de advertentie 1.000 keer te tonen."
                eenheid="€"
                waarde={staat.aannames.cpm}
                onChange={(w) => zetAanname('cpm', w)}
                placeholder="8"
                bron={staat.aannames.sourceCpm}
                onBron={(w) => zetAanname('sourceCpm', w)}
              />
              <AannameRij
                stap={2}
                label="Doorklikratio"
                uitleg="Welk deel van wie de advertentie ziet, klikt door."
                eenheid="%"
                waarde={staat.aannames.ctr}
                onChange={(w) => zetAanname('ctr', w)}
                placeholder="1"
                bron={staat.aannames.sourceClickThrough}
                onBron={(w) => zetAanname('sourceClickThrough', w)}
              />
              <AannameRij
                stap={3}
                label="Conversieratio"
                uitleg="Welk deel van de bezoekers converteert."
                eenheid="%"
                waarde={staat.aannames.conversion}
                onChange={(w) => zetAanname('conversion', w)}
                placeholder="2,5"
                bron={staat.aannames.sourceConversion}
                onBron={(w) => zetAanname('sourceConversion', w)}
              />
              <AannameRij
                stap={4}
                label="Eenheden per conversie"
                uitleg="Wat één conversie oplevert. Meestal 1."
                waarde={staat.aannames.units}
                onChange={(w) => zetAanname('units', w)}
                placeholder="1"
                bron={staat.aannames.sourceUnits}
                onBron={(w) => zetAanname('sourceUnits', w)}
              />
              <AannameRij
                stap={5}
                label="Deel uit advertenties"
                uitleg="Welk deel van het doel we uit advertenties verwachten. Geeft de ondergrens van het budget; leeg is alles."
                eenheid="%"
                waarde={staat.aannames.adsShare}
                onChange={(w) => zetAanname('adsShare', w)}
                placeholder="60"
                vasteBron="De rest via mailings, vaste klanten en direct"
              />
              <AannameRij
                stap={6}
                label="Buffer"
                uitleg="Bovenop wat nodig is, voor tegenvallers."
                eenheid="%"
                waarde={staat.aannames.buffer}
                onChange={(w) => zetAanname('buffer', w)}
                placeholder="20"
                vasteBron="Vaste regel: 20%"
              />
            </ol>
          </div>
          <RegelLijst label="Opmerkingen bij de aannames" uitleg="Bijvoorbeeld: gemiddeld 3 per reservering." {...lijst('assumptionNotes')} />
          <div className="border-t border-gray-200 pt-8">
            {vuil && (
              <p className="border-jr-orange bg-jr-orange/10 mb-4 rounded border-l-4 p-2.5 text-xs">
                De berekening hieronder hoort bij wat er is opgeslagen. Sla op om hem met je wijzigingen door te rekenen.
              </p>
            )}
            {p.hypothese}
          </div>
        </div>
      </Kaart>

      {/* ------------------------------ Opslaan ------------------------------ */}
      {/* Alleen in beeld als er iets te bewaren valt, net bewaard is of misging. */}
      <div className="sticky bottom-3 z-30 sm:bottom-5" aria-live="polite">
        {(vuil || bezig || fout || opgeslagenOm) && (
        <div
          className={`mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur sm:px-5 ${
            fout ? 'border-[#F5C2BE] bg-[#FDECEA]/95' : vuil ? 'border-jr-orange/40 bg-white/95' : 'border-gray-200 bg-white/90'
          }`}
        >
          <p className="flex min-w-0 items-center gap-2 text-sm">
            {fout ? (
              <span className="text-[#C02A22]">{fout}</span>
            ) : vuil && nieuwer ? (
              <>
                <span className="bg-jr-orange h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
                <span>Er staat een nieuwe versie van de briefing klaar, uit verwerkte feedback of een import. Laad die; wat je hier wijzigde, vervalt dan.</span>
              </>
            ) : vuil ? (
              <>
                <span className="bg-jr-orange h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
                <span>Wijzigingen nog niet opgeslagen</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-[#1D7D3F]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-gray-600">Opgeslagen. Bekijk de briefing en de pdf tonen nu deze versie.</span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            {vuil && !bezig && nieuwer && (
              <button
                type="button"
                onClick={laadNieuweVersie}
                className="bg-jr-btn hover:bg-jr-btnhover min-h-10 rounded-lg px-4 py-2 text-sm font-medium text-white"
              >
                Nieuwe versie laden
              </button>
            )}
            {vuil && !bezig && !nieuwer && (
              <button
                type="button"
                onClick={() => {
                  if (!zekerTerug) {
                    setZekerTerug(true)
                    return
                  }
                  setZekerTerug(false)
                  setFout(null)
                  setStaat(basis)
                }}
                className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium ${zekerTerug ? 'bg-[#C02A22] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {zekerTerug ? 'Zeker? Klik nog eens' : 'Wijzigingen weggooien'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void opslaan()}
              disabled={!vuil || bezig}
              hidden={vuil && nieuwer}
              className="bg-jr-btn hover:bg-jr-btnhover min-h-10 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {bezig ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ Bouwstenen ------------------------------- */

function Invoer({
  id,
  label,
  waarde,
  onChange,
  type = 'text',
  placeholder,
  hint,
  verplicht = false,
  lijst,
}: {
  id?: string
  label: string
  waarde: string
  onChange: (w: string) => void
  type?: string
  placeholder?: string
  hint?: string
  verplicht?: boolean
  lijst?: string
}) {
  const veldId = id ?? `veld-${label.replace(/\W+/g, '')}`
  return (
    <div>
      <label htmlFor={veldId} className="text-jr-text mb-1.5 block text-[13px] font-medium">
        {label}
        {!verplicht && <span className="font-normal text-gray-500"> (optioneel)</span>}
      </label>
      <input
        id={veldId}
        type={type}
        value={waarde}
        list={lijst}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={VELD}
      />
      {hint && <p className="mt-1.5 text-xs text-gray-600">{hint}</p>}
    </div>
  )
}

function Tekstvak({ label, waarde, onChange, rijen = 2 }: { label: string; waarde: string; onChange: (w: string) => void; rijen?: number }) {
  const id = `tekst-${label.replace(/\W+/g, '')}`
  return (
    <div>
      <label htmlFor={id} className="text-jr-text mb-1.5 block text-[13px] font-medium">
        {label}
        <span className="font-normal text-gray-500"> (optioneel)</span>
      </label>
      <textarea
        id={id}
        ref={groei}
        rows={rijen}
        value={waarde}
        onChange={(e) => {
          groei(e.currentTarget)
          onChange(e.target.value)
        }}
        className={`${VELD} resize-none overflow-hidden`}
      />
    </div>
  )
}

function Vink({ label, onder, aan, onChange }: { label: string; onder?: string; aan: boolean; onChange: (aan: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 text-[15px]">
      <input type="checkbox" checked={aan} onChange={(e) => onChange(e.target.checked)} className="accent-jr-blue mt-0.5 h-[18px] w-[18px] shrink-0" />
      <span>
        {label}
        {onder && <span className="block text-xs text-gray-600">{onder}</span>}
      </span>
    </label>
  )
}

function VoorstelVink({
  veld,
  staat,
  wissel,
}: {
  veld: 'doel' | 'budget' | 'kernboodschap' | 'regio'
  staat: BriefingConcept
  wissel: (veld: 'voorstel', id: string, aan: boolean) => void
}) {
  return <Vink label="Dit is een voorstel aan de klant" aan={staat.voorstel.includes(veld)} onChange={(aan) => wissel('voorstel', veld, aan)} />
}

function ToevoegKnop({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-jr-link inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-gray-100">
      <span aria-hidden="true" className="text-base leading-none">
        +
      </span>
      {label}
    </button>
  )
}

function AannameRij({
  stap,
  label,
  uitleg,
  eenheid,
  waarde,
  onChange,
  placeholder,
  bron,
  onBron,
  vasteBron,
}: {
  stap: number
  label: string
  uitleg: string
  eenheid?: string
  waarde: string
  onChange: (w: string) => void
  placeholder: string
  bron?: string
  onBron?: (w: string) => void
  vasteBron?: string
}) {
  const id = `aanname-${stap}`
  return (
    <li className="grid items-center gap-x-4 gap-y-2 py-3.5 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1.2fr)]">
      <label htmlFor={id} className="flex items-start gap-3">
        <span className="bg-jr-lightblue text-jr-link mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {stap}
        </span>
        <span>
          <span className="block text-[15px] font-medium">{label}</span>
          <span className="block text-xs text-gray-600">{uitleg}</span>
        </span>
      </label>
      <div className="relative ml-9 md:ml-0">
        <input
          id={id}
          value={waarde}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="decimal"
          className={`${VELD} ${eenheid ? 'pr-9' : ''}`}
        />
        {eenheid && <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-gray-500">{eenheid}</span>}
      </div>
      <div className="ml-9 md:ml-0">
        {onBron ? (
          <input
            value={bron ?? ''}
            onChange={(e) => onBron(e.target.value)}
            aria-label={`Bron van ${label.toLowerCase()}`}
            placeholder="Bron: marktgemiddelde, Ads Manager, Odoo"
            className={VELD}
          />
        ) : (
          <span className="text-sm text-gray-600">{vasteBron}</span>
        )}
      </div>
    </li>
  )
}
