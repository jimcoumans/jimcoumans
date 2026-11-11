import Link from 'next/link'
import { Avatar } from '@/components/Avatar'
import { formatCents, formatEuro } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { HOOFDDOEL_LABEL, selectieCijfers, type Resultaten as Data, type Selectie } from '@/lib/resultaten/laden'
import { delta, type Cijfers, type Oordeel } from '@/lib/resultaten/bereken'
import { KostenGrafiek, TijdlijnGrafiek } from './Grafieken'
import { Analyse } from './Analyse'
import s from './resultaten.module.css'

/* -------------------------------------------------------------------------
   Het tabblad Resultaten. Voor elke klant hetzelfde dashboard: wat nog niet
   gekoppeld is, blijft staan in grijs, met de reden erbij. Geen varianten.
   ------------------------------------------------------------------------- */

const NL = 'nl-NL'
const getal = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString(NL, { maximumFractionDigits: 0 }))
const pct = (v: number | null | undefined) => {
  if (v == null || !Number.isFinite(v)) return '—'
  if (v === 0) return '0%'
  const a = Math.abs(v)
  const d = a >= 0.1 ? 0 : a >= 0.01 ? 1 : a >= 0.001 ? 2 : 3
  return v.toLocaleString(NL, { style: 'percent', minimumFractionDigits: d, maximumFractionDigits: d })
}
const verschil = (v: number | null) => (v == null ? '—' : (v > 0.0005 ? '+' : v < -0.0005 ? '−' : '±') + Math.abs(v).toLocaleString(NL, { style: 'percent', maximumFractionDigits: 0 }))
const maandLang = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 1)).toLocaleDateString(NL, { month: 'long', year: 'numeric', timeZone: 'UTC' })
const maandKort = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 1)).toLocaleDateString(NL, { month: 'short', timeZone: 'UTC' }).replace('.', '')
const OORDEEL_KLASSE: Record<Oordeel, string | undefined> = { goed: s.goed, matig: s.matig, slecht: s.slecht, geen: s.neutraal, leerfase: s.neutraal }
const OORDEEL_WOORD: Record<Oordeel, string> = { goed: 'goed', matig: 'matig', slecht: 'slecht', geen: 'geen benchmark', leerfase: 'leerfase, nog geen oordeel' }

export function Resultaten({ data, pad, kanaal, beheer }: { data: Data; pad: string; kanaal: Selectie; beheer?: { slug: string } }) {
  const { klant, nu, vorigJaar, reeks } = data
  const gekoppeld = new Set(data.gekoppeld)
  const metGa4 = gekoppeld.has('ga4')
  const totaal = nu.cijfers
  const totaalVj = vorigJaar.cijfers
  const link = (p: Record<string, string>) => `${pad}?${new URLSearchParams({ maand: data.maand, ...p }).toString()}`

  return (
    <div className={s.r}>
      {/* Kop: wie, welke maand, en wie het aanspreekpunt is */}
      <div className={s.kop}>
        <Avatar naam={klant.naam} imageId={klant.logoImageId} maat={72} rond={false} />
        <div className={s.titel}>
          <div className={s.eyebrow}>
            <b>James Robinson</b> · rapportage {maandLang(data.maand)}
          </div>
          <h1>{klant.naam}</h1>
          <div className={s.chips}>
            {klant.hoofddoel && <span className={s.chipBlauw}>{HOOFDDOEL_LABEL[klant.hoofddoel]}</span>}
            {data.maandnr != null && (
              <span className={s.chip}>
                Maand <b>{data.maandnr}</b> na de livegang
              </span>
            )}
            {data.leerfase && <span className={s.chip}>◦ Leerfase</span>}
            <a href="#toegang" className={s.chip}>
              <b>{data.toegang.filter((t) => t.inlog).length + (data.marketingmanager ? 1 : 0)}</b> met toegang
            </a>
          </div>
        </div>
        <div className={s.mm}>
          <span className={s.mmKop}>Jouw marketingmanager</span>
          {data.marketingmanager ? (
            <div className={s.mmIn}>
              <Avatar naam={data.marketingmanager.naam} imageId={data.marketingmanager.avatarImageId} maat={48} />
              <div>
                <b>{data.marketingmanager.naam}</b>
                {data.marketingmanager.email && <a href={`mailto:${data.marketingmanager.email}`}>{data.marketingmanager.email}</a>}
                {data.marketingmanager.telefoon && <a href={`tel:${data.marketingmanager.telefoon.replace(/\s/g, '')}`}>{data.marketingmanager.telefoon}</a>}
              </div>
            </div>
          ) : (
            <p className={s.sub}>Nog niet gekoppeld aan deze klant.</p>
          )}
        </div>
      </div>

      <form className={s.balk} method="get" action={pad}>
        <label className={s.sub}>
          Maand{' '}
          <select name="maand" defaultValue={data.maand} aria-label="Maand">
            {[...data.maanden].reverse().map((m) => (
              <option key={m} value={m}>
                {maandLang(m)}
              </option>
            ))}
          </select>
        </label>
        {kanaal !== 'alle' && <input type="hidden" name="kanaal" value={kanaal} />}
        <button type="submit" className={s.chip}>
          Toon
        </button>
      </form>

      {!metGa4 && <p className={s.melding}>Google Analytics is nog niet gekoppeld. Daarom staan bezoekers en conversies nog in grijs.</p>}

      {/* De vier cijfers bovenaan, voor elke klant dezelfde */}
      <div className={s.vier}>
        <Tegel
          label="Impressies"
          waarde={totaal.impressies}
          sub={
            totaal.impressies == null
              ? 'Komt uit Search Console en de advertentieplatformen.'
              : totaal.impressiesDeels
                ? 'Alleen wat al gekoppeld is; advertentieplatformen volgen.'
                : `${verschil(delta(totaal.impressies, totaalVj.impressies))} t.o.v. vorig jaar`
          }
        />
        <Tegel label="Websitebezoekers" waarde={totaal.bezoekers} sub={totaal.bezoekers == null ? 'Komt uit Google Analytics.' : `${verschil(delta(totaal.bezoekers, totaalVj.bezoekers))} t.o.v. vorig jaar`} />
        <Tegel label="Conversies" waarde={totaal.conversies} sub={totaal.conversies == null ? 'Komt uit Google Analytics.' : `${verschil(delta(totaal.conversies, totaalVj.conversies))} t.o.v. vorig jaar`} />
        <Tegel label="Opbrengst" waarde={null} sub="De waarde van conversies, uit het systeem van de klant of maandelijks doorgegeven." />
      </div>

      <Inzoomen data={data} kanaal={kanaal} link={link} />

      <Opbrengst data={data} />

      <Analyse bevindingen={data.bevindingen} acties={data.acties} beheer={beheer ? { slug: beheer.slug, organizationId: klant.id, maand: data.maand } : undefined} />

      <section className={s.kaart} id="toegang">
        <h3>Contactpersonen en toegang</h3>
        <ul className={s.toegang}>
          {data.toegang.map((t, i) => (
            <li key={`${t.naam}-${i}`}>
              <Avatar naam={t.naam} imageId={t.avatarImageId} maat={32} />
              <span>
                <b>{t.naam}</b>
                <span>
                  {[t.functie, !t.inlog ? 'geen inlog op het portaal' : t.laatstIngelogd ? `laatst gezien ${formatDate(t.laatstIngelogd)}` : 'nog nooit ingelogd']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </li>
          ))}
          {data.marketingmanager && (
            <li>
              <Avatar naam={data.marketingmanager.naam} imageId={data.marketingmanager.avatarImageId} maat={32} />
              <span>
                <b>{data.marketingmanager.naam}</b>
                <span>James Robinson · marketingmanager</span>
              </span>
            </li>
          )}
        </ul>
        {data.toegang.length === 0 && <p className={s.leeg}>Er staan nog geen contactpersonen bij deze klant.</p>}
        <p className={s.sub}>Iedereen met een inlog ziet dit dashboard. Een inlog regelt James Robinson voor je.</p>
      </section>
    </div>
  )
}

function Tegel({ label, waarde, sub }: { label: string; waarde: number | null; sub: string }) {
  return (
    <div className={`${s.kpi} ${waarde == null ? s.uit : ''}`}>
      <span className={s.kpiL}>{label}</span>
      <span className={s.kpiG}>{waarde == null ? 'Nog niet gekoppeld' : getal(waarde)}</span>
      <span className={s.kpiS}>{sub}</span>
    </div>
  )
}

function Ratio({ waarde, oordeel, tekst }: { waarde: number | null; oordeel: Oordeel; tekst: string }) {
  if (waarde == null) return null
  return (
    <span className={s.st4R}>
      <span className={OORDEEL_KLASSE[oordeel]} title={OORDEEL_WOORD[oordeel]}>
        {pct(waarde)}
      </span>{' '}
      {tekst}
    </span>
  )
}

function Inzoomen({ data, kanaal, link }: { data: Data; kanaal: Selectie; link: (p: Record<string, string>) => string }) {
  const { nu, vorigJaar, reeks } = data
  const c: Cijfers = selectieCijfers(nu, kanaal)
  const vj = selectieCijfers(vorigJaar, kanaal)
  const v = data.verhoudingen[kanaal] ?? data.verhoudingen.alle
  const naam = kanaal === 'alle' ? 'Alle kanalen' : nu.kanalen.find((k) => k.bron === kanaal)?.label ?? kanaal
  const punten = reeks.map((b) => {
    const x = selectieCijfers(b, kanaal)
    return { maand: b.maand, kort: maandKort(b.maand), lang: maandLang(b.maand), bezoekers: x.bezoekers, conversies: x.conversies }
  })
  const bm = v.benchmark

  return (
    <section className={s.kaart} id="inzoomen">
      <div className={s.kaartKop}>
        <span className={s.k}>Inzoomen</span>
        <h2>Waar het resultaat vandaan komt</h2>
      </div>
      <div className={s.strip} role="group" aria-label="Kanaal">
        <Link href={link({})} scroll={false} className={`${s.kk} ${kanaal === 'alle' ? s.kkGekozen : ''}`} aria-current={kanaal === 'alle' ? 'true' : undefined}>
          <span className={s.kkN}>Alle kanalen</span>
          <span className={s.kkV}>{getal(nu.cijfers.bezoekers)}</span>
          <span className={s.kkS}>{getal(nu.cijfers.conversies)} conversies</span>
        </Link>
        {nu.kanalen.map((k) => (
          <Link
            key={k.bron}
            href={link({ kanaal: k.bron })}
            scroll={false}
            className={`${s.kk} ${kanaal === k.bron ? s.kkGekozen : ''} ${k.actief ? '' : s.kkUit}`}
            aria-current={kanaal === k.bron ? 'true' : undefined}
          >
            <span className={s.kkN}>{k.label}</span>
            {k.actief ? (
              <>
                <span className={s.kkV}>{getal(k.bezoekers ?? k.impressies)}</span>
                <span className={s.kkS}>{k.bezoekers == null ? 'impressies' : `${getal(k.conversies)} conversies`}</span>
              </>
            ) : (
              <span className={s.kkS}>{k.bezoekers == null && k.impressies == null ? 'Nog niet gekoppeld' : 'Niet actief'}</span>
            )}
          </Link>
        ))}
      </div>

      <div className={s.selectie}>
        <b>{naam}</b>
        {c.kostenCents != null && <span className={s.sub}>Advertentiekosten {formatEuro(c.kostenCents)}</span>}
      </div>

      <div className={s.rij4}>
        <div className={`${s.st4} ${c.impressies == null ? s.st4Uit : ''}`}>
          <span className={s.st4L}>Impressies</span>
          <span className={s.st4G}>{c.impressies == null ? 'Nog niet gekoppeld' : getal(c.impressies)}</span>
          {c.impressiesDeels && <span className={s.st4R}>alleen wat al gekoppeld is</span>}
          <span className={s.st4V}>vorig jaar {getal(vj.impressies)}</span>
        </div>
        <div className={`${s.st4} ${c.bezoekers == null ? s.st4Uit : ''}`}>
          <span className={s.st4L}>Websitebezoekers</span>
          <span className={s.st4G}>{c.bezoekers == null ? 'Nog niet gekoppeld' : getal(c.bezoekers)}</span>
          <Ratio waarde={c.ctr} oordeel={v.ctr} tekst="klikt door" />
          <span className={s.st4V}>vorig jaar {getal(vj.bezoekers)}</span>
        </div>
        <div className={`${s.st4} ${c.conversies == null ? s.st4Uit : ''}`}>
          <span className={s.st4L}>Conversies</span>
          <span className={s.st4G}>{c.conversies == null ? 'Nog niet gekoppeld' : getal(c.conversies)}</span>
          <Ratio waarde={c.cvr} oordeel={v.cvr} tekst="van de bezoekers" />
          <Ratio waarde={c.icr} oordeel={v.icr} tekst="van de impressies" />
          <span className={s.st4V}>vorig jaar {getal(vj.conversies)}</span>
        </div>
        <div className={`${s.st4} ${s.st4Uit}`}>
          <span className={s.st4L}>Opbrengst</span>
          <span className={s.st4G}>Nog niet gekoppeld</span>
          {c.kostenPerConversieCents != null && <span className={s.st4R}>{formatCents(Math.round(c.kostenPerConversieCents))} kosten per conversie</span>}
        </div>
      </div>
      <p className={s.sub}>
        Kleur tegen de benchmark, de middelste waarde van vergelijkbare klanten van James Robinson in dezelfde maand
        {bm ? ` (${bm.bron === 'branche' ? 'zelfde branche' : 'alle klanten'}, ${bm.aantal} klanten)` : ''}: <span className={s.goed}>groen</span> op of boven,{' '}
        <span className={s.matig}>oranje</span> tot 20% eronder, <span className={s.slecht}>rood</span> verder eronder.
        {!bm && ' Er zijn nog te weinig gekoppelde klanten om te vergelijken; tot die tijd blijft de kleur neutraal.'}
        {data.leerfase && ' In de leerfase geven we nog geen oordeel.'}
      </p>

      <div className={s.legenda}>
        <span>
          <i style={{ background: '#E3EFFF' }} />
          websitebezoekers
        </span>
        <span>
          <i style={{ background: '#007AFF' }} />
          conversies
        </span>
        <span>
          <i style={{ background: '#636466', width: 7, height: 7, borderRadius: '50%' }} />
          publicatie uit een campagne
        </span>
      </div>
      <TijdlijnGrafiek punten={punten} publicaties={data.publicaties} />

      <details className={s.meer}>
        <summary>Alle kanalen in een tabel</summary>
        <div style={{ overflowX: 'auto' }}>
          <table className={s.tabel}>
            <thead>
              <tr>
                <th>Kanaal</th>
                <th>Impressies</th>
                <th>Bezoekers</th>
                <th>Conversies</th>
                <th className={s.verberg}>Conversieratio</th>
                <th>Kosten</th>
              </tr>
            </thead>
            <tbody>
              {nu.kanalen.map((k) => {
                const kc = selectieCijfers(nu, k.bron)
                const o = data.verhoudingen[k.bron]?.cvr ?? 'geen'
                return (
                  <tr key={k.bron} className={k.actief ? '' : s.trUit}>
                    <td>{k.label}</td>
                    {k.actief ? (
                      <>
                        <td>{getal(k.impressies)}</td>
                        <td>{getal(k.bezoekers)}</td>
                        <td>{getal(k.conversies)}</td>
                        <td className={s.verberg}>
                          <span className={OORDEEL_KLASSE[o]}>{pct(kc.cvr)}</span>
                        </td>
                        <td>{k.kostenCents == null ? '' : formatEuro(k.kostenCents)}</td>
                      </>
                    ) : (
                      <td colSpan={5} style={{ textAlign: 'left' }}>
                        {k.bezoekers == null && k.impressies == null ? 'nog niet gekoppeld' : 'niet actief'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

function Opbrengst({ data }: { data: Data }) {
  const { reeks, nu } = data
  const conversies12 = reeks.reduce((t, b) => t + (b.cijfers.conversies ?? 0), 0)
  const kostenBekend = reeks.some((b) => b.cijfers.kostenCents != null)
  const kosten12 = reeks.reduce((t, b) => t + (b.cijfers.kostenCents ?? 0), 0)
  const kpc = kostenBekend && conversies12 > 0 ? kosten12 / conversies12 : null
  const punten = reeks.map((b) => ({
    maand: b.maand,
    kort: maandKort(b.maand),
    lang: maandLang(b.maand),
    waardeCents: b.cijfers.kostenPerConversieCents == null ? null : Math.round(b.cijfers.kostenPerConversieCents),
    conversies: b.cijfers.conversies,
  }))
  const ads = nu.cijfers.kostenCents
  const fee = data.feeCents
  const totaal = (ads ?? 0) + (fee ?? 0)

  return (
    <section className={`${s.kaart} ${s.opbrengst}`} id="opbrengst">
      <div className={s.kaartKop}>
        <span className={s.k}>Investering en opbrengst</span>
        <h2>Wat je investering opleverde</h2>
      </div>
      <div className={s.rend}>
        <div className={`${kpc == null ? s.rendUit : ''}`} style={{ display: 'grid', gap: 4 }}>
          <span className={s.rendL}>Eén conversie kostte aan advertenties gemiddeld</span>
          <span className={s.rendG}>{kpc == null ? 'Nog niet gekoppeld' : formatCents(Math.round(kpc))}</span>
          <span className={s.sub}>over de laatste twaalf maanden</span>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div className={s.vrij}>
            <span className={s.sub}>Conversies</span>
            <b>{data.gekoppeld.includes('ga4') ? getal(conversies12) : '—'}</b>
          </div>
          <div className={s.vrij}>
            <span className={s.sub}>Advertentiekosten</span>
            <b>{kostenBekend ? formatEuro(kosten12) : '—'}</b>
          </div>
          <p className={s.leeg}>
            We meten nog geen waarde per conversie, dus we kunnen nog niet laten zien wat het in geld opleverde. Koppel de omzet of geef maandelijks de waarde door,
            dan staat hier wat elke € 1 investering oplevert.
          </p>
        </div>
      </div>
      <h3>Kosten per conversie, per maand</h3>
      {kostenBekend ? <KostenGrafiek punten={punten} /> : <p className={s.leeg}>Volgt zodra de advertentieplatformen gekoppeld zijn.</p>}
      <div className={s.dezeMaand}>
        <span className={s.sub}>
          Investering {maandLang(data.maand)}: <b>{ads == null && fee == null ? '—' : formatEuro(totaal)}</b>
          {ads == null && ' (zonder advertentiekosten: nog niet gekoppeld)'}
        </span>
        {totaal > 0 && (
          <div className={s.stapel}>
            {ads != null && <i style={{ width: `${(ads / totaal) * 100}%`, background: '#007AFF' }} />}
            {fee != null && <i style={{ width: `${(fee / totaal) * 100}%`, background: '#B8D7FF' }} />}
          </div>
        )}
        <div className={s.legenda}>
          <span>
            <i style={{ background: '#007AFF' }} />
            Advertentiebudget <b>{ads == null ? 'nog niet gekoppeld' : formatEuro(ads)}</b>
          </span>
          <span>
            <i style={{ background: '#B8D7FF' }} />
            Marketing Partnership <b>{fee == null ? '—' : formatEuro(fee)}</b>
          </span>
          <span>
            <i style={{ background: '#F2F2F7', border: '1px solid #E5E5E9' }} />
            Licenties <b>betaal je rechtstreeks aan de leverancier</b>
          </span>
        </div>
      </div>
    </section>
  )
}
