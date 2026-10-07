import { Document, Page, View, Text, Link, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { CampagneVolledig } from '@/lib/campagnes'
import { STATUS_LABELS, livePeriode } from '@/lib/campagnes'
import { formatBp, formatHonderdsten, formatAantal } from '@/lib/hypothese'
import { formatDateLong } from '@/lib/dates'
import { leesPunten, groepeerPunten } from '@/lib/punten'
import { registreerFonts } from './fonts'
import { budgetTekst, budgetBereik, omzetBereik, euro, euroPrecies, prijs, regels, versieLabel, LEEG } from '@/components/CampagneBriefing'

/* -------------------------------------------------------------------------
   De campagnebriefing als echte pdf, om te downloaden en mee te sturen.

   Gemaakt op de server, zonder browser: dus geen adresregel, datum of
   werkbalk in de afdruk, en hetzelfde resultaat op elk apparaat. Dezelfde
   inhoud en volgorde als de briefing op het scherm (CampagneBriefing.tsx),
   en dezelfde rekenregels: die komen daar vandaan. Verandert er iets aan de
   briefing, dan in allebei.

   De lettertypen zijn vaste snitten van Inter, gemaakt uit de variabele
   webfonts in src/app/fonts (OFL-licentie).
   ------------------------------------------------------------------------- */


const BLAUW = '#007AFF'
const ZWART = '#1C1C1E'
const GRIJS = '#636466'
const LIJN = '#E5E5E9'
const VLAK = '#F2F2F7'
const LICHTBLAUW = '#E2EBF3'

const s = StyleSheet.create({
  pagina: { fontFamily: 'Inter', fontSize: 9.5, color: ZWART, paddingTop: 42, paddingBottom: 56, paddingHorizontal: 46, lineHeight: 1.4 },
  kop: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.75, borderBottomColor: LIJN, paddingBottom: 12 },
  merk: { fontWeight: 700, fontSize: 10 },
  merkSub: { color: BLAUW, fontSize: 8 },
  rechts: { textAlign: 'right', fontSize: 8, color: GRIJS },
  klein: { fontSize: 8, color: GRIJS },
  titel: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 24, color: BLAUW, marginTop: 3, lineHeight: 1.1 },
  samenvatting: { fontSize: 11, marginTop: 8, lineHeight: 1.4 },
  meta: { flexDirection: 'row', backgroundColor: VLAK, borderRadius: 6, padding: 10, marginTop: 12 },
  metaCel: { flex: 1 },
  sectie: { marginTop: 18 },
  sectieKop: { flexDirection: 'row', marginBottom: 4 },
  sectieNr: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 13, color: GRIJS, marginRight: 6 },
  sectieTitel: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 13, color: BLAUW },
  rij: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LIJN, paddingVertical: 5 },
  label: { width: 120, fontSize: 8, color: GRIJS, paddingTop: 1, paddingRight: 8 },
  waarde: { flex: 1 },
  opsomming: { flexDirection: 'row', marginBottom: 1.5 },
  bolletje: { width: 9 },
  tussenkop: { fontWeight: 700, fontSize: 9.5, marginTop: 10, marginBottom: 3 },
  groot: { fontFamily: 'InterTight', fontWeight: 700, lineHeight: 1.25, marginVertical: 1 },
  tabelKop: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: '#C8C8CD', paddingBottom: 3, fontSize: 8, color: GRIJS },
  tabelRij: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: LIJN, paddingVertical: 4 },
  chip: { fontSize: 7, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 6 },
  voet: { position: 'absolute', bottom: 24, left: 46, right: 46, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: GRIJS },
  vak: { borderRadius: 6, padding: 8 },
})

/** Een webadres kort: zonder https://, www. en een afsluitende /register. */
function kortAdres(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/(register)?$/, '')
}

/**
 * Tekst met webadressen erin: elk adres wordt een korte, klikbare link. Een
 * "(https://…)" achter een woord verdwijnt in de link zelf. Zo hoeft een lang
 * adres niet midden in een woord af te breken.
 */
function MetLinks({ tekst }: { tekst: string }) {
  const delen = tekst.split(/(\s?\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s),]+)/g)
  // Leestekens direct na een link horen bij de link: anders breekt de regel ertussen, met een streepje.
  for (let i = 1; i < delen.length; i += 2) {
    const na = /^[,.;:!?]+/.exec(delen[i + 1] ?? '')
    if (na) {
      delen[i] += na[0]
      delen[i + 1] = delen[i + 1]!.slice(na[0].length)
    }
  }
  return (
    <Text>
      {delen.map((d, i) => {
        const m = /(https?:\/\/[^)\s,]+)/.exec(d)
        if (!m) return d
        const leesteken = /[,.;:!?]+$/.exec(d)?.[0] ?? ''
        return (
          <Link key={i} src={m[1]!} style={{ color: BLAUW, textDecoration: 'none' }}>
            {`${d.startsWith(' ') ? ' ' : ''}${kortAdres(m[1]!)}${leesteken}`}
          </Link>
        )
      })}
    </Text>
  )
}

/** Een puntenveld: één punt als gewone tekst, meer als opsomming, met subpunten eronder. */
function Opsomming({ tekst }: { tekst: string | null | undefined }) {
  const groepen = groepeerPunten(leesPunten(tekst))
  if (groepen.length === 0) return <Text style={{ color: GRIJS }}>{LEEG}</Text>
  if (groepen.length === 1 && groepen[0]!.sub.length === 0) return <MetLinks tekst={groepen[0]!.tekst} />
  return (
    <View>
      {groepen.map((g, i) => (
        <View key={i}>
          <View style={s.opsomming} wrap={false}>
            <Text style={s.bolletje}>•</Text>
            <View style={{ flex: 1 }}>
              <MetLinks tekst={g.tekst} />
            </View>
          </View>
          {g.sub.map((x, j) => (
            <View key={j} style={[s.opsomming, { paddingLeft: 10 }]} wrap={false}>
              <Text style={s.bolletje}>–</Text>
              <View style={{ flex: 1 }}>
                <MetLinks tekst={x} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function Voorstel() {
  return <Text style={{ color: '#9a5b00', fontWeight: 500 }}>Voorstel · </Text>
}

function Rij({ label, children, leeg }: { label: string; children?: React.ReactNode; leeg?: boolean }) {
  return (
    <View style={s.rij} wrap={false}>
      <Text style={s.label}>{label}</Text>
      <View style={s.waarde}>{leeg ? <Text style={{ color: GRIJS }}>{LEEG}</Text> : children}</View>
    </View>
  )
}

/** Een rij die mag doorlopen over een pagina, voor lange velden. */
function LangeRij({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.rij}>
      <Text style={s.label}>{label}</Text>
      <View style={s.waarde}>{children}</View>
    </View>
  )
}

function Tekst({ waarde }: { waarde: string | null | undefined }) {
  return waarde && waarde.trim() ? <MetLinks tekst={waarde} /> : <Text style={{ color: GRIJS }}>{LEEG}</Text>
}

function Sectie({ nummer, titel, children, nieuwePagina = false }: { nummer: number; titel: string; children: React.ReactNode; nieuwePagina?: boolean }) {
  return (
    <View style={s.sectie} break={nieuwePagina}>
      <View style={s.sectieKop} minPresenceAhead={90}>
        <Text style={s.sectieNr}>{nummer}</Text>
        <Text style={s.sectieTitel}>{titel}</Text>
      </View>
      {children}
    </View>
  )
}

export function BriefingPdf({ v }: { v: CampagneVolledig }) {
  const c = v.campagne
  const voorstel = (veld: string) => c.proposalFields.includes(veld)
  const versie = c.version === 0 ? 'Nog niet verstuurd' : `Versie ${versieLabel(c.version)}`
  const versieDatum = v.versies[0]?.createdAt ?? c.updatedAt
  const kpiTotaal = v.kpis.reduce((a, k) => a + k.targetQuantity, 0)
  const h = v.hypothese.ok ? v.hypothese.hypothese : null

  return (
    <Document title={`${c.title} · campagnebriefing`} author="James Robinson" subject={`Campagnebriefing voor ${v.organisatie.name}`} language="nl">
      <Page size="A4" style={s.pagina}>
        <View style={s.voet} fixed>
          <Text>James Robinson — Marketing & Branding | www.jamesrobinson.nl</Text>
          <Text render={({ pageNumber, totalPages }) => `${c.title} · ${versie.toLowerCase()} · pagina ${pageNumber} van ${totalPages}`} />
        </View>

        <View style={s.kop}>
          <View>
            <Text style={s.merk}>James Robinson</Text>
            <Text style={s.merkSub}>Marketing & Branding</Text>
          </View>
          <View>
            <Text style={s.rechts}>
              {versie} · {formatDateLong(versieDatum)}
            </Text>
            <Text style={s.rechts}>{STATUS_LABELS[c.status]}</Text>
          </View>
        </View>

        <Text style={[s.klein, { marginTop: 16 }]}>Campagnebriefing</Text>
        <Text style={s.titel}>{c.title}</Text>
        {c.summary ? <Text style={s.samenvatting}>{c.summary}</Text> : null}

        <View style={s.meta}>
          {[
            ['Klant', v.organisatie.name],
            ['Start', c.startOn ? formatDateLong(c.startOn) : LEEG],
            ['Einde', c.endOn ? formatDateLong(c.endOn) : LEEG],
            ['Status', STATUS_LABELS[c.status]],
          ].map(([l, w]) => (
            <View key={l} style={s.metaCel}>
              <Text style={s.klein}>{l}</Text>
              <Text>{w}</Text>
            </View>
          ))}
        </View>

        <Sectie nummer={1} titel="De basis">
          <Rij label="Campagnenaam">
            <Text>{c.title}</Text>
          </Rij>
          <Rij label="Klant">
            <Text>{v.organisatie.name}</Text>
          </Rij>
          <Rij label="Marketingmanager" leeg={!v.marketingmanager}>
            <Text>{v.marketingmanager?.name ?? v.marketingmanager?.email}</Text>
          </Rij>
          <Rij label="Specialisten" leeg={v.specialisten.length === 0}>
            {v.specialisten.map((p) => (
              <Text key={p.id}>
                {p.name ?? p.email}
                {p.functie ? <Text style={{ color: GRIJS }}>, {p.functie}</Text> : null}
              </Text>
            ))}
          </Rij>
          <Rij label="Contactpersonen" leeg={v.contactpersonen.length === 0}>
            <Text>{v.contactpersonen.map((p) => p.name).join(', ')}</Text>
          </Rij>
        </Sectie>

        <Sectie nummer={2} titel="Het doel">
          <Rij label="Doel in één zin" leeg={!c.goalSentence}>
            <Text>
              {voorstel('doel') && <Voorstel />}
              {c.goalSentence}
            </Text>
          </Rij>
          <Rij label="Wat telt als resultaat">
            <Tekst waarde={c.resultDefinition} />
          </Rij>
          <LangeRij label="Advertentiebudget">
            <Text>
              {voorstel('budget') && <Voorstel />}
              {budgetTekst(v)}
            </Text>
            {regels(c.budgetNote).length > 0 && (
              <View style={{ marginTop: 3 }}>
                <Opsomming tekst={c.budgetNote} />
              </View>
            )}
          </LangeRij>

          <Text style={s.tussenkop} minPresenceAhead={60}>KPI’s</Text>
          <View style={s.tabelKop}>
            <Text style={{ flex: 2.4 }}>Wat</Text>
            <Text style={{ flex: 1.4 }}>Datum</Text>
            <Text style={{ flex: 0.7, textAlign: 'right' }}>Doel</Text>
            <Text style={{ flex: 0.9, textAlign: 'right' }}>Prijs</Text>
            <Text style={{ flex: 0.9, textAlign: 'right' }}>Omzet</Text>
          </View>
          {v.kpis.map((k) => (
            <View key={k.id} style={s.tabelRij} wrap={false}>
              <Text style={{ flex: 2.4 }}>{k.label}</Text>
              <Text style={{ flex: 1.4 }}>{k.on ? formatDateLong(k.on) : LEEG}</Text>
              <Text style={{ flex: 0.7, textAlign: 'right' }}>{formatAantal(k.targetQuantity)}</Text>
              <Text style={{ flex: 0.9, textAlign: 'right' }}>{prijs(k.priceCents)}</Text>
              <Text style={{ flex: 0.9, textAlign: 'right' }}>{k.priceCents === null ? LEEG : prijs(k.priceCents * k.targetQuantity)}</Text>
            </View>
          ))}
          {v.kpis.length > 1 && (
            <View style={[s.tabelRij, { fontWeight: 700 }]} wrap={false}>
              <Text style={{ flex: 2.4 }}>Totaal</Text>
              <Text style={{ flex: 1.4 }} />
              <Text style={{ flex: 0.7, textAlign: 'right' }}>{formatAantal(kpiTotaal)}</Text>
              <Text style={{ flex: 0.9 }} />
              <Text style={{ flex: 0.9, textAlign: 'right' }}>{v.omzetCents > 0 ? euro(v.omzetCents) : LEEG}</Text>
            </View>
          )}
          <LangeRij label="Opmerkingen">
            <Opsomming tekst={c.kpiNotes} />
          </LangeRij>
        </Sectie>

        <Sectie nummer={3} titel="Aanbod en boodschap">
          <LangeRij label="Wat we verkopen">
            <Opsomming tekst={c.offerWhat} />
          </LangeRij>
          <Rij label="Kernboodschap" leeg={!c.offerMessage}>
            <Text>
              {voorstel('kernboodschap') && <Voorstel />}
              {c.offerMessage}
            </Text>
          </Rij>
          <Rij label="Waarom nu">
            <Opsomming tekst={c.offerWhyNow} />
          </Rij>
          <Rij label="Wat we niet beloven">
            <Opsomming tekst={c.offerNotPromised} />
          </Rij>
        </Sectie>

        <Sectie nummer={4} titel="Doelgroep">
          <Rij label="Doelgroepen" leeg={v.doelgroepen.length === 0}>
            <Opsomming tekst={v.doelgroepen.map((d) => d.name).join('\n')} />
          </Rij>
          <Rij label="Regio" leeg={!c.region}>
            <Text>
              {voorstel('regio') && <Voorstel />}
              {c.region}
            </Text>
          </Rij>
          <Rij label="Uitsluiten">
            <Opsomming tekst={c.exclusions} />
          </Rij>
          <Rij label="Opmerkingen">
            <Opsomming tekst={c.audienceNotes} />
          </Rij>
        </Sectie>

        <Sectie nummer={5} titel="Deliverables">
          {v.kanalen.length === 0 ? (
            <Text style={{ color: GRIJS }}>{LEEG}</Text>
          ) : (
            v.kanalen.map((k) => (
              <View key={k.id} style={[s.tabelRij, { paddingVertical: 5 }]} wrap={false}>
                <View style={{ width: 150, paddingRight: 8 }}>
                  <Text style={{ fontWeight: 700 }}>{k.name ?? k.kind}</Text>
                  {k.name ? <Text style={[s.klein, { fontSize: 7.5 }]}>{k.kind}</Text> : null}
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Tekst waarde={k.note} />
                  {k.quantity ? <Text style={s.klein}>Formaat: {k.quantity}</Text> : null}
                  {k.liveFrom || k.liveUntil ? <Text style={s.klein}>Live: {livePeriode(k)}</Text> : null}
                </View>
                <View style={{ width: 62, alignItems: 'flex-end' }}>
                  <Text style={[s.chip, k.status === 'bestaat' ? { backgroundColor: '#E6F7EB', color: '#1d7a36' } : { backgroundColor: LICHTBLAUW, color: '#005CBF' }]}>
                    {k.status === 'bestaat' ? 'bestaat al' : 'nog te maken'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Sectie>

        <Sectie nummer={6} titel="De planning">
          <Rij label="Start">
            <Text>{c.startOn ? formatDateLong(c.startOn) : LEEG}</Text>
          </Rij>
          <Rij label="Einde">
            <Text>{c.endOn ? formatDateLong(c.endOn) : LEEG}</Text>
          </Rij>
          <LangeRij label="Opmerkingen">
            <Opsomming tekst={c.planningNotes} />
          </LangeRij>
          <Text style={s.tussenkop} minPresenceAhead={60}>Tijdlijn</Text>
          {v.tijdlijn.length === 0 ? (
            <Text style={{ color: GRIJS }}>{LEEG}</Text>
          ) : (
            v.tijdlijn.map((t) => (
              <View key={t.id} style={s.tabelRij} wrap={false}>
                <Text style={{ width: 95 }}>{t.dueOn ? formatDateLong(t.dueOn) : LEEG}</Text>
                <Text style={{ flex: 1, paddingRight: 8 }}>{t.description}</Text>
                <Text style={{ width: 110, textAlign: 'right', color: GRIJS }}>{t.assigneeName ?? t.assigneeLabel ?? LEEG}</Text>
              </View>
            ))
          )}
        </Sectie>

        <Sectie nummer={7} titel="Afspraken met de klant">
          <Rij label="Wat de klant zelf doet">
            <Opsomming tekst={c.clientDoes} />
          </Rij>
          <Rij label="Opmerkingen">
            <Opsomming tekst={c.agreementNotes} />
          </Rij>
        </Sectie>

        <Sectie nummer={8} titel="Achtergrondinformatie">
          <Rij label="Wat we weten van vorige keer">
            <Opsomming tekst={c.backgroundPrevious} />
          </Rij>
          <Rij label="Risico’s">
            <Opsomming tekst={c.backgroundRisks} />
          </Rij>
        </Sectie>

        <Sectie nummer={9} titel="Hypothese" nieuwePagina>
          {!h ? (
            <Text style={[s.vak, { backgroundColor: VLAK }]}>
              De hypothese rekent zodra dit is ingevuld: {v.hypothese.ok ? '' : v.hypothese.ontbreekt.join(', ')}.
            </Text>
          ) : (
            <View>
              <Text style={{ marginBottom: 8, color: '#3A3A3C' }}>
                {h.stand === 'berekend' && h.aandeelAdsBp !== null
                  ? `We rekenen vanuit de advertenties. De bovengrens is wat nodig is als het hele doel uit advertenties komt; de ondergrens als ${formatBp(h.aandeelAdsBp)}% eruit komt en de rest via mailings, vaste klanten en direct verkeer.`
                  : h.stand === 'berekend'
                    ? 'We rekenen vanuit de advertenties: alsof het hele doel daaruit komt. Mailings, vaste klanten en direct verkeer maken de campagne alleen goedkoper. Het advies is dus een bovengrens.'
                    : 'Met een vast budget rekenen we vooruit: wat levert dit budget op, als de aannames kloppen.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {[
                  { label: h.ondergrensCents !== null ? 'Budget, bovengrens' : 'Budget', waarde: euro(h.budgetCents) },
                  { label: 'Impressies', waarde: formatAantal(h.impressies) },
                  { label: 'Bezoekers', waarde: formatAantal(h.bezoekers), sub: `${euroPrecies(h.perKlikCents)} per klik` },
                  { label: 'Conversies', waarde: formatAantal(h.conversies), sub: `${euro(h.perConversieCents)} per conversie` },
                  { label: 'Resultaat', waarde: formatAantal(h.resultaatEenheden), sub: h.stand === 'vast' && h.doelEenheden > 0 ? `doel ${formatAantal(h.doelEenheden)}` : undefined },
                ].map((st, i, alle) => (
                  <View key={st.label} style={[s.vak, { flex: 1, backgroundColor: i === 0 || i === alle.length - 1 ? LICHTBLAUW : VLAK }]}>
                    <Text style={s.klein}>{st.label}</Text>
                    <Text style={[s.groot, { fontSize: 13 }]}>{st.waarde}</Text>
                    {st.sub ? <Text style={s.klein}>{st.sub}</Text> : null}
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
                {[
                  {
                    label: h.stand === 'vast' ? 'Vast advertentiebudget' : h.ondergrensCents !== null ? 'Bandbreedte advertentiebudget' : 'Advies advertentiebudget',
                    waarde: budgetBereik(h),
                    sub:
                      h.stand === 'berekend' && h.nodigCents !== null
                        ? h.ondergrensCents !== null && h.aandeelAdsBp !== null
                          ? `bij ${formatBp(h.aandeelAdsBp)}% tot alles uit advertenties, met ${formatBp(c.bufferBp)}% buffer`
                          : `${euro(h.nodigCents)} nodig, plus ${formatBp(c.bufferBp)}% buffer`
                        : undefined,
                  },
                  { label: 'Deel van de omzet', waarde: omzetBereik(h) ?? LEEG, sub: h.omzetCents > 0 ? `van ${euro(h.omzetCents)}` : undefined },
                  { label: 'Minimale conversie', waarde: `${formatBp(h.minimaleConversieBp)}%`, sub: 'om het hele doel uit advertenties te halen' },
                ].map((k) => (
                  <View key={k.label} style={[s.vak, { flex: 1, borderWidth: 0.75, borderColor: LIJN }]}>
                    <Text style={s.klein}>{k.label}</Text>
                    <Text style={[s.groot, { fontSize: 15 }]}>{k.waarde}</Text>
                    {k.sub ? <Text style={s.klein}>{k.sub}</Text> : null}
                  </View>
                ))}
              </View>

              <View style={[s.tabelKop, { marginTop: 10 }]}>
                <Text style={{ flex: 1.6 }}>Aanname</Text>
                <Text style={{ flex: 0.6, textAlign: 'right', paddingRight: 10 }}>Waarde</Text>
                <Text style={{ flex: 2 }}>Bron</Text>
              </View>
              {[
                ['Kosten per 1.000 impressies', c.cpmCents ? euroPrecies(c.cpmCents) : LEEG, c.sourceCpm],
                ['Doorklikratio', c.clickThroughRateBp ? `${formatBp(c.clickThroughRateBp)}%` : LEEG, c.sourceClickThrough],
                ['Conversieratio', c.conversionRateBp ? `${formatBp(c.conversionRateBp)}%` : LEEG, c.sourceConversion],
                ['Eenheden per conversie', formatHonderdsten(c.unitsPerConversionHundredths), c.sourceUnits],
                ['Deel uit advertenties', c.adsShareBp ? `${formatBp(c.adsShareBp)}%` : '100%', c.adsShareBp ? 'verwachting; de rest via mailings, vaste klanten en direct' : 'alles uit advertenties'],
                ...(h.stand === 'berekend' ? [['Buffer', `${formatBp(c.bufferBp)}%`, 'vaste regel']] : []),
                ['Omzet', h.omzetCents > 0 ? euro(h.omzetCents) : LEEG, 'uit de KPI’s'],
              ].map(([l, w, b]) => (
                <View key={l as string} style={s.tabelRij} wrap={false}>
                  <Text style={{ flex: 1.6 }}>{l}</Text>
                  <Text style={{ flex: 0.6, textAlign: 'right', paddingRight: 10 }}>{w}</Text>
                  <Text style={{ flex: 2, color: GRIJS }}>{b || LEEG}</Text>
                </View>
              ))}
              {regels(c.assumptionNotes).length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={s.klein}>Opmerkingen bij de aannames</Text>
                  <Opsomming tekst={c.assumptionNotes} />
                </View>
              )}

              <View style={[s.vak, { backgroundColor: VLAK, marginTop: 10 }]} wrap={false}>
                <Text style={{ fontWeight: 500, marginBottom: 2 }}>De zwakste schakel</Text>
                <Text style={{ color: '#3A3A3C' }}>
                  {h.stand === 'berekend' && h.zwaksteSchakel.nodigCents !== null
                    ? `Valt de conversie 40% lager uit (${formatBp(h.zwaksteSchakel.conversieBp)}% in plaats van ${formatBp(c.conversionRateBp ?? 0)}%), dan is er ${euro(h.zwaksteSchakel.nodigCents)} nodig voor hetzelfde doel. Dat merken we binnen twee weken: dan leggen we de hypothese naast de echte cijfers en sturen we bij op de landingspagina, de boodschap of het budget.`
                    : `Valt de conversie 40% lager uit (${formatBp(h.zwaksteSchakel.conversieBp)}%), dan levert hetzelfde budget ${formatAantal(h.zwaksteSchakel.resultaatEenheden ?? 0)} op. Dat merken we binnen twee weken, en dan sturen we bij.`}
                </Text>
              </View>
            </View>
          )}
        </Sectie>
      </Page>
    </Document>
  )
}

/** De pdf als bytes. */
export async function maakBriefingPdf(v: CampagneVolledig): Promise<Buffer> {
  registreerFonts()
  return renderToBuffer(<BriefingPdf v={v} />)
}

/** De bestandsnaam: "Kerst bij Thiessen – campagnebriefing versie 2.0.pdf". */
export function pdfNaam(v: CampagneVolledig): string {
  // Alleen gewone letters: met een accent of een lang streepje noemt een deel van de browsers het bestand "download".
  const naam =
    v.campagne.title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '-')
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Campagne'
  return `${naam} - campagnebriefing${v.campagne.version > 0 ? ` versie ${versieLabel(v.campagne.version)}` : ''}.pdf`
}
