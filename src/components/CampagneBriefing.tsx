import type { CampagneVolledig, VoorstelVeld } from '@/lib/campagnes'
import { STATUS_LABELS } from '@/lib/campagnes'
import { verdeelPerMaand, formatBp, formatHonderdsten, formatAantal, type Hypothese } from '@/lib/hypothese'
import { formatDateLong } from '@/lib/dates'

/* -------------------------------------------------------------------------
   De campagnebriefing zoals de klant hem ziet: dezelfde versie als wij,
   zonder interne codes of knoppen. Leeg is een streepje, zodat je ziet dat
   een veld bewust leeg is en niet vergeten.
   ------------------------------------------------------------------------- */

export const LEEG = '-'

/** Hele euro's: € 2.400 */
export function euro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return LEEG
  return `€ ${Math.round(cents / 100).toLocaleString('nl-NL')}`
}

/** Euro's met centen als het om kleine bedragen gaat: € 0,80 */
export function euroPrecies(cents: number): string {
  return `€ ${(cents / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Een opmerkingenveld als opsomming: één punt per regel. */
export function regels(tekst: string | null | undefined): string[] {
  return (tekst ?? '')
    .split('\n')
    .map((r) => r.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean)
}

export function versieLabel(versie: number): string {
  return `${Math.max(versie, 1)}.0`
}

const maandNaam = new Intl.DateTimeFormat('nl-NL', { month: 'long' })

/** De zin over het advertentiebudget, uit de hypothese. Nooit een eigen getal ernaast. */
export function budgetTekst(v: CampagneVolledig): string {
  const c = v.campagne
  if (!v.hypothese.ok) {
    if (c.budgetMode === 'vast' && c.fixedBudgetCents) return `Vast budget: ${euro(c.fixedBudgetCents)}.`
    return LEEG
  }
  const h = v.hypothese.hypothese
  const deel = h.budgetVanOmzetBp !== null ? ` (${formatBp(h.budgetVanOmzetBp)}% van de omzet)` : ''
  let tekst: string
  if (h.stand === 'berekend') {
    tekst = `Berekend uit het doel: advies ${euro(h.budgetCents)}${deel}. Dat is de bovengrens, als alles via advertenties komt; zie de hypothese.`
  } else {
    const vanDoel = h.doelEenheden > 0 ? ` (${Math.round((h.resultaatEenheden / h.doelEenheden) * 100)}% van het doel)` : ''
    tekst = `Vast budget: ${euro(h.budgetCents)}${deel}. Daarmee verwachten we ${formatAantal(h.resultaatEenheden)}${vanDoel} uit advertenties; zie de hypothese.`
  }
  if (c.startOn && c.endOn) {
    const maanden = verdeelPerMaand(h.budgetCents, c.startOn, c.endOn)
    if (maanden.length > 1) {
      tekst += ` ${maanden.map((m) => `${maandNaam.format(m.maand)} ${euro(m.cents)}`).join(', ')}.`
    }
  }
  return tekst
}

function Chip({ children, kleur = 'grijs' }: { children: React.ReactNode; kleur?: 'grijs' | 'blauw' | 'oranje' | 'groen' }) {
  const stijl = {
    grijs: 'bg-gray-100 text-gray-700',
    blauw: 'bg-jr-lightblue text-jr-deepblue',
    oranje: 'bg-jr-orange/15 text-[#9a5b00]',
    groen: 'bg-jr-green/15 text-[#1d7a36]',
  }[kleur]
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap ${stijl}`}>{children}</span>
}

function Voorstel({ v, veld }: { v: CampagneVolledig; veld: VoorstelVeld }) {
  if (!v.campagne.proposalFields.includes(veld)) return null
  return (
    <>
      <Chip kleur="oranje">voorstel</Chip>{' '}
    </>
  )
}

function Waarde({ children }: { children: React.ReactNode }) {
  const leeg = children === null || children === undefined || children === '' || (Array.isArray(children) && children.length === 0)
  return <>{leeg ? <span className="text-gray-500">{LEEG}</span> : children}</>
}

function Opsomming({ tekst }: { tekst: string | null | undefined }) {
  const r = regels(tekst)
  if (r.length === 0) return <span className="text-gray-500">{LEEG}</span>
  if (r.length === 1) return <>{r[0]}</>
  return (
    <ul className="list-disc space-y-0.5 pl-4">
      {r.map((x, k) => (
        <li key={k}>{x}</li>
      ))}
    </ul>
  )
}

function Rij({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-0.5 border-b border-gray-200 py-2.5 last:border-b-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-xs text-gray-600 sm:pt-0.5">{label}</dt>
      <dd className="text-sm">
        <Waarde>{children}</Waarde>
      </dd>
    </div>
  )
}

function Sectie({ nummer, titel, children }: { nummer: number; titel: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid-page">
      <h2 className="text-jr-blue mb-2 text-lg">
        <span className="mr-2 font-normal text-gray-500">{nummer}</span>
        {titel}
      </h2>
      {children}
    </section>
  )
}

/** De hele briefing, voor op het scherm, als link of geprint. */
export function CampagneBriefing({ v }: { v: CampagneVolledig }) {
  const c = v.campagne
  const kpiTotaal = v.kpis.reduce((a, k) => a + k.targetQuantity, 0)
  const versieDatum = v.versies[0]?.createdAt ?? c.updatedAt

  return (
    <article className="mx-auto max-w-[800px] bg-white px-6 py-8 sm:px-12 sm:py-12 print:max-w-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <p className="text-sm font-bold">James Robinson</p>
          <p className="text-jr-blue text-xs">Marketing &amp; Branding</p>
        </div>
        <div className="text-right text-xs text-gray-600">
          <p>
            {c.version === 0 ? 'Concept' : `Versie ${versieLabel(c.version)}`} · {formatDateLong(versieDatum)}
          </p>
          <p className="mt-1">
            <Chip kleur={c.status === 'akkoord' ? 'groen' : c.status === 'voorstel' ? 'oranje' : 'grijs'}>
              {STATUS_LABELS[c.status]}
            </Chip>
          </p>
        </div>
      </header>

      <p className="mt-6 text-xs text-gray-600">Campagnebriefing</p>
      <h1 className="text-jr-blue mt-1 text-3xl">{c.title}</h1>
      {c.summary && <p className="mt-3 text-base leading-snug font-normal">{c.summary}</p>}

      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-gray-100 p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-gray-600">Klant</dt>
          <dd>{v.organisatie.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-600">Start</dt>
          <dd>{c.startOn ? formatDateLong(c.startOn) : LEEG}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-600">Einde</dt>
          <dd>{c.endOn ? formatDateLong(c.endOn) : LEEG}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-600">Status</dt>
          <dd>{STATUS_LABELS[c.status]}</dd>
        </div>
      </dl>

      <Sectie nummer={1} titel="De basis">
        <dl>
          <Rij label="Campagnenaam">{c.title}</Rij>
          <Rij label="Klant">{v.organisatie.name}</Rij>
          <Rij label="Type">{c.kind === 'retainer' ? 'Retainer' : c.kind === 'project' ? 'Project' : null}</Rij>
          <Rij label="Marketingmanager">{v.marketingmanager?.name ?? v.marketingmanager?.email}</Rij>
          <Rij label="Contactpersonen">{v.contactpersonen.map((p) => p.name).join(', ')}</Rij>
        </dl>
      </Sectie>

      <Sectie nummer={2} titel="Het doel">
        <dl>
          <Rij label="Doel in één zin">
            {c.goalSentence && (
              <>
                <Voorstel v={v} veld="doel" />
                {c.goalSentence}
              </>
            )}
          </Rij>
          <Rij label="Wat telt als resultaat">{c.resultDefinition}</Rij>
          <Rij label="Advertentiebudget">
            <Voorstel v={v} veld="budget" />
            {budgetTekst(v)}
            {regels(c.budgetNote).length > 0 && (
              <div className="mt-1.5">
                <Opsomming tekst={c.budgetNote} />
              </div>
            )}
          </Rij>
        </dl>

        <h3 className="mt-4 mb-1.5 text-sm">KPI’s</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs text-gray-600">
                <th className="py-1.5 pr-3 font-normal">Wat</th>
                <th className="py-1.5 pr-3 font-normal">Datum</th>
                <th className="py-1.5 pr-3 text-right font-normal">Doel</th>
                <th className="py-1.5 pr-3 text-right font-normal">Prijs</th>
                <th className="py-1.5 text-right font-normal">Omzet</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {v.kpis.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2 text-gray-500">
                    {LEEG}
                  </td>
                </tr>
              )}
              {v.kpis.map((k) => (
                <tr key={k.id} className="border-b border-gray-100">
                  <td className="py-1.5 pr-3">{k.label}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{k.on ? formatDateLong(k.on) : LEEG}</td>
                  <td className="py-1.5 pr-3 text-right">{formatAantal(k.targetQuantity)}</td>
                  <td className="py-1.5 pr-3 text-right whitespace-nowrap">{euro(k.priceCents)}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">{k.priceCents === null ? LEEG : euro(k.priceCents * k.targetQuantity)}</td>
                </tr>
              ))}
              {v.kpis.length > 1 && (
                <tr className="font-bold">
                  <td className="py-1.5 pr-3">Totaal</td>
                  <td />
                  <td className="py-1.5 pr-3 text-right">{formatAantal(kpiTotaal)}</td>
                  <td />
                  <td className="py-1.5 text-right">{v.omzetCents > 0 ? euro(v.omzetCents) : LEEG}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <dl className="mt-2">
          <Rij label="Opmerkingen">
            <Opsomming tekst={c.kpiNotes} />
          </Rij>
        </dl>
      </Sectie>

      <Sectie nummer={3} titel="Aanbod en boodschap">
        <dl>
          <Rij label="Wat we verkopen">{c.offerWhat}</Rij>
          <Rij label="Kernboodschap">
            {c.offerMessage && (
              <>
                <Voorstel v={v} veld="kernboodschap" />
                {c.offerMessage}
              </>
            )}
          </Rij>
          <Rij label="Waarom nu">{c.offerWhyNow}</Rij>
          <Rij label="Wat we niet beloven">{c.offerNotPromised}</Rij>
        </dl>
      </Sectie>

      <Sectie nummer={4} titel="Doelgroep">
        <dl>
          <Rij label="Doelgroepen">
            {v.doelgroepen.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4">
                {v.doelgroepen.map((d) => (
                  <li key={d.id}>{d.name}</li>
                ))}
              </ul>
            )}
          </Rij>
          <Rij label="Regio">
            {c.region && (
              <>
                <Voorstel v={v} veld="regio" />
                {c.region}
              </>
            )}
          </Rij>
          <Rij label="Uitsluiten">{c.exclusions}</Rij>
          <Rij label="Opmerkingen">
            <Opsomming tekst={c.audienceNotes} />
          </Rij>
        </dl>
      </Sectie>

      <Sectie nummer={5} titel="Kanalen en content">
        {v.kanalen.length === 0 ? (
          <p className="text-sm text-gray-500">{LEEG}</p>
        ) : (
          <ul className="divide-y divide-gray-200 text-sm">
            {v.kanalen.map((k) => (
              <li key={k.id} className="grid gap-x-6 gap-y-1 py-2.5 sm:grid-cols-[180px_1fr_auto]">
                <span>
                  {k.kind}
                  {k.quantity && <span className="text-gray-600"> · {k.quantity}</span>}
                </span>
                <span className="text-gray-700">
                  <Waarde>{k.note}</Waarde>
                </span>
                <span>
                  <Chip kleur={k.status === 'bestaat' ? 'groen' : 'blauw'}>{k.status === 'bestaat' ? 'bestaat al' : 'nog te maken'}</Chip>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Sectie>

      <Sectie nummer={6} titel="De planning">
        <dl>
          <Rij label="Start">{c.startOn ? formatDateLong(c.startOn) : null}</Rij>
          <Rij label="Einde">{c.endOn ? formatDateLong(c.endOn) : null}</Rij>
          <Rij label="Opmerkingen">
            <Opsomming tekst={c.planningNotes} />
          </Rij>
        </dl>
        <h3 className="mt-4 mb-1.5 text-sm">Tijdlijn</h3>
        {v.tijdlijn.length === 0 ? (
          <p className="text-sm text-gray-500">{LEEG}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {v.tijdlijn.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 align-top">
                  <td className="py-1.5 pr-4 whitespace-nowrap">{t.dueOn ? formatDateLong(t.dueOn) : LEEG}</td>
                  <td className="py-1.5 pr-4">{t.description}</td>
                  <td className="py-1.5 text-right text-gray-600">{t.assigneeName ?? t.assigneeLabel ?? LEEG}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sectie>

      <Sectie nummer={7} titel="Afspraken met de klant">
        <dl>
          <Rij label="Wat de klant zelf doet">{c.clientDoes}</Rij>
          <Rij label="Opmerkingen">
            <Opsomming tekst={c.agreementNotes} />
          </Rij>
        </dl>
      </Sectie>

      <Sectie nummer={8} titel="Achtergrondinformatie">
        <dl>
          <Rij label="Wat we weten van vorige keer">{c.backgroundPrevious}</Rij>
          <Rij label="Risico’s">
            <Opsomming tekst={c.backgroundRisks} />
          </Rij>
        </dl>
      </Sectie>

      <div className="break-before-page">
        <Sectie nummer={9} titel="Hypothese">
          <HypotheseWeergave v={v} />
        </Sectie>
      </div>

      <footer className="mt-10 border-t border-gray-200 pt-3 text-[11px] text-gray-500">
        James Robinson — Marketing &amp; Branding | www.jamesrobinson.nl
      </footer>
    </article>
  )
}

/* ------------------------------ Hypothese -------------------------------- */

/** De hypothese: de keten van budget tot resultaat, de aannames en de zwakste schakel. */
export function HypotheseWeergave({ v, compact = false }: { v: CampagneVolledig; compact?: boolean }) {
  const c = v.campagne
  if (!v.hypothese.ok) {
    return (
      <p className="rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
        De hypothese rekent zodra dit is ingevuld: {v.hypothese.ontbreekt.join(', ')}.
      </p>
    )
  }
  const h = v.hypothese.hypothese

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">
        {h.stand === 'berekend'
          ? 'We rekenen vanuit de advertenties: alsof het hele doel daaruit komt. Mailings, vaste klanten en direct verkeer maken de campagne alleen goedkoper. Het advies is dus een bovengrens.'
          : 'Met een vast budget rekenen we vooruit: wat levert dit budget op, als de aannames kloppen.'}
      </p>

      <Keten h={h} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kengetal
          label={h.stand === 'berekend' ? 'Advies advertentiebudget' : 'Vast advertentiebudget'}
          waarde={euro(h.budgetCents)}
          toelichting={
            h.stand === 'berekend' && h.nodigCents !== null
              ? `${euro(h.nodigCents)} nodig, plus ${formatBp(c.bufferBp)}% buffer`
              : undefined
          }
        />
        <Kengetal
          label="Deel van de omzet"
          waarde={h.budgetVanOmzetBp !== null ? `${formatBp(h.budgetVanOmzetBp)}%` : LEEG}
          toelichting={h.omzetCents > 0 ? `van ${euro(h.omzetCents)}` : undefined}
        />
        <Kengetal
          label="Minimale conversie"
          waarde={`${formatBp(h.minimaleConversieBp)}%`}
          toelichting="om het hele doel uit advertenties te halen"
        />
      </div>

      {!compact && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left text-xs text-gray-600">
                  <th className="py-1.5 pr-3 font-normal">Aanname</th>
                  <th className="py-1.5 pr-3 text-right font-normal">Waarde</th>
                  <th className="py-1.5 font-normal">Bron</th>
                </tr>
              </thead>
              <tbody>
                <Aanname label="Eenheden per conversie" waarde={formatHonderdsten(c.unitsPerConversionHundredths)} bron={c.sourceUnits} />
                <Aanname label="Conversieratio" waarde={c.conversionRateBp ? `${formatBp(c.conversionRateBp)}%` : LEEG} bron={c.sourceConversion} />
                <Aanname label="Doorklikratio" waarde={c.clickThroughRateBp ? `${formatBp(c.clickThroughRateBp)}%` : LEEG} bron={c.sourceClickThrough} />
                <Aanname label="Kosten per 1.000 impressies" waarde={c.cpmCents ? euroPrecies(c.cpmCents) : LEEG} bron={c.sourceCpm} />
                {h.stand === 'berekend' && <Aanname label="Buffer" waarde={`${formatBp(c.bufferBp)}%`} bron="vaste regel" />}
                <Aanname label="Omzet" waarde={h.omzetCents > 0 ? euro(h.omzetCents) : LEEG} bron="uit de KPI’s" />
              </tbody>
            </table>
          </div>
          {regels(c.assumptionNotes).length > 0 && (
            <div className="text-sm">
              <p className="mb-1 text-xs text-gray-600">Opmerkingen bij de aannames</p>
              <Opsomming tekst={c.assumptionNotes} />
            </div>
          )}
        </>
      )}

      <div className="rounded-lg bg-gray-100 p-4 text-sm">
        <p className="mb-1 font-normal">De zwakste schakel</p>
        <p className="text-gray-700">
          {h.stand === 'berekend' && h.zwaksteSchakel.nodigCents !== null
            ? `Valt de conversie 40% lager uit (${formatBp(h.zwaksteSchakel.conversieBp)}% in plaats van ${formatBp(c.conversionRateBp ?? 0)}%), dan is er ${euro(h.zwaksteSchakel.nodigCents)} nodig voor hetzelfde doel. Dat merken we binnen twee weken: dan leggen we de hypothese naast de echte cijfers en sturen we bij op de landingspagina, de boodschap of het budget.`
            : `Valt de conversie 40% lager uit (${formatBp(h.zwaksteSchakel.conversieBp)}%), dan levert hetzelfde budget ${formatAantal(h.zwaksteSchakel.resultaatEenheden ?? 0)} op. Dat merken we binnen twee weken, en dan sturen we bij.`}
        </p>
      </div>
    </div>
  )
}

function Keten({ h }: { h: Hypothese }) {
  const stappen = [
    { label: 'Budget', waarde: euro(h.budgetCents) },
    { label: 'Impressies', waarde: formatAantal(h.impressies) },
    { label: 'Bezoekers', waarde: formatAantal(h.bezoekers), sub: `${euroPrecies(h.perKlikCents)} per klik` },
    { label: 'Conversies', waarde: formatAantal(h.conversies), sub: `${euro(h.perConversieCents)} per conversie` },
    { label: 'Resultaat', waarde: formatAantal(h.resultaatEenheden), sub: h.stand === 'vast' && h.doelEenheden > 0 ? `doel ${formatAantal(h.doelEenheden)}` : undefined },
  ]
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {stappen.map((s, k) => (
        <li key={s.label} className={`rounded-lg p-3 ${k === 0 || k === stappen.length - 1 ? 'bg-jr-lightblue' : 'bg-gray-100'}`}>
          <p className="text-[11px] text-gray-600">{s.label}</p>
          <p className="tabular text-lg font-bold">{s.waarde}</p>
          {s.sub && <p className="text-[11px] text-gray-600">{s.sub}</p>}
        </li>
      ))}
    </ol>
  )
}

function Kengetal({ label, waarde, toelichting }: { label: string; waarde: string; toelichting?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="tabular text-xl font-bold">{waarde}</p>
      {toelichting && <p className="text-xs text-gray-600">{toelichting}</p>}
    </div>
  )
}

function Aanname({ label, waarde, bron }: { label: string; waarde: string; bron: string | null }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-1.5 pr-3">{label}</td>
      <td className="tabular py-1.5 pr-3 text-right">{waarde}</td>
      <td className="py-1.5 text-gray-600">{bron || LEEG}</td>
    </tr>
  )
}
