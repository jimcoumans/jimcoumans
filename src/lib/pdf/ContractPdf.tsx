import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { GeneratedContract } from '@/db/schema'
import { formatDate, formatDateLong } from '@/lib/dates'
import { ondertekenaarsVan, namenZin, kopVanContract, tekennaamVan } from '@/lib/contracten'
import { getBedrijf, haalLogo, type WerkgeverKop } from '@/lib/bedrijf'
import { registreerFonts } from './fonts'
import { MerkKop, merkUit, merkRegel, type Merk, ZWART, GRIJS, BLAUW, LIJN, VLAK, RAND } from './huisstijl'

/* -------------------------------------------------------------------------
   Een contract als pdf: om te downloaden, mee te sturen en te tekenen.

   Dezelfde inhoud als de contractpagina (contracten/[id]): de tekst komt uit
   het contract zelf, niet opnieuw uit het sjabloon. Een pro forma krijgt een
   duidelijke markering op elke pagina, zodat niemand het per ongeluk tekent
   als definitief.

   De begeleidende tekst (de samenvatting voor de mail) staat er niet in: het
   document is alleen de overeenkomst. Elke pagina heeft onderaan een
   paraafvak voor iedereen die tekent.
   ------------------------------------------------------------------------- */

const ORANJE = '#94590A'

/* Designsysteem v3.0: Inter Tight voor koppen, Inter voor tekst, JR Blue als
   accent, rustige grijze vlakken. Ruim boven en onder: de kop en de
   paraafregel staan vast op elke pagina, daar is de ruimte voor. */
const s = StyleSheet.create({
  pagina: { fontFamily: 'Inter', fontSize: 9.5, color: ZWART, paddingTop: 112, paddingBottom: 132, paddingHorizontal: 56 },
  /* De regelafstand per tekst en niet op de pagina: op de pagina laat
     react-pdf het paginanummer (een render-tekst) stilletjes weg, en via een
     omringend blok rekent het de afstand ruim twee keer zo groot. Met de
     korps erbij, anders rekent react-pdf met zijn eigen standaardkorps. */
  regel: { fontSize: 9.5, lineHeight: 1.5 },
  proforma: { fontSize: 8.5, color: ORANJE, fontWeight: 500, marginBottom: 14, backgroundColor: '#FEF7EE', borderRadius: 6, padding: 9 },
  watermerk: { position: 'absolute', top: 360, left: 40, right: 40, textAlign: 'center', fontFamily: 'InterTight', fontWeight: 700, fontSize: 96, color: '#F6A027', opacity: 0.08, transform: 'rotate(-30deg)' },
  eyebrow: { fontSize: 8.5, color: BLAUW, fontWeight: 500, marginBottom: 6 },
  titel: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 24, lineHeight: 1.15, marginBottom: 6 },
  ondertitel: { fontSize: 10, color: GRIJS, marginBottom: 26 },
  ondergetekenden: { fontSize: 9.5, marginBottom: 8 },
  partijen: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 16 },
  partij: { flex: 1, flexDirection: 'column', backgroundColor: VLAK, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 14 },
  partijLabel: { fontSize: 7.5, color: GRIJS, marginBottom: 5 },
  partijNaam: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 11.5, lineHeight: 1.3, marginBottom: 5 },
  /* De "hierna te noemen" staat onderaan het vlak, in beide vlakken op
     dezelfde hoogte, met een witregel erboven. */
  vuller: { flexGrow: 1 },
  hierna: { fontSize: 9.5, lineHeight: 1.5, color: GRIJS, marginTop: 14 },
  verklaring: { marginBottom: 22 },
  artikel: { marginBottom: 13 },
  artikelKop: { flexDirection: 'row', marginBottom: 5 },
  artikelNr: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 10.5, color: BLAUW, width: 28 },
  artikelTitel: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 10.5, flex: 1 },
  lid: { flexDirection: 'row', marginBottom: 4 },
  lidNr: { width: 28, color: GRIJS, fontSize: 8.5, paddingTop: 1 },
  slot: { marginTop: 22, borderTopWidth: 0.75, borderTopColor: LIJN, paddingTop: 18 },
  handtekeningen: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
  handtekening: { width: '48%', marginRight: '2%', marginBottom: 14, backgroundColor: VLAK, borderRadius: 8, padding: 12 },
  tekenruimte: { height: 52, borderBottomWidth: 0.75, borderBottomColor: GRIJS, marginBottom: 6 },
  rol: { fontSize: 7.5, color: GRIJS, marginBottom: 2 },
  voet: { position: 'absolute', bottom: 40, left: 56, right: 56 },
  parafen: { flexDirection: 'row', borderTopWidth: 0.75, borderTopColor: LIJN, paddingTop: 12 },
  paraaf: { flex: 1, marginRight: 10 },
  paraafVak: { height: 30, borderWidth: 0.75, borderColor: RAND, borderRadius: 5, marginTop: 4 },
  paraafNaam: { fontSize: 6.5, color: GRIJS },
  voetMerk: { position: 'absolute', bottom: 20, left: 56, fontSize: 7, color: GRIJS },
  paginaNr: { position: 'absolute', bottom: 20, right: 56, fontSize: 7, color: BLAUW },
})

export function artikelenUit(body: string): { kop: string; leden: string[] }[] {
  return body
    .split(/^## /m)
    .map((blok) => blok.trim())
    .filter((blok) => blok !== '')
    .map((blok) => {
      const [kop, ...rest] = blok.split('\n')
      return {
        kop: kop ?? '',
        leden: rest
          .join('\n')
          .split(/\n\s*\n/)
          .map((l) => l.trim())
          .filter((l) => l !== ''),
      }
    })
}

/** "Artikel 3: Functie" in het nummer en de titel. */
function splitsKop(kop: string): { nr: string; titel: string } {
  const m = /^Artikel\s+(\d+)\s*:\s*(.*)$/.exec(kop)
  return m ? { nr: m[1]!, titel: m[2]! } : { nr: '', titel: kop }
}

/* Een lid breekt nooit over twee pagina's: react-pdf zet dan het nummer
   onderaan de ene pagina en de hele tekst op de volgende. Het langste lid is
   een regel of twaalf; dat past altijd. Alleen een uitzonderlijk lang lid
   (een flinke extra afspraak) mag breken, anders valt het van de pagina. */
const PAST_OP_PAGINA = 3500

function Lid({ nr, tekst }: { nr: string; tekst: string }) {
  return (
    <View style={s.lid} wrap={tekst.length > PAST_OP_PAGINA}>
      <Text style={s.lidNr}>{nr}</Text>
      <Text style={[s.regel, { flex: 1 }]}>{tekst}</Text>
    </View>
  )
}

export function titelVan(c: Pick<GeneratedContract, 'contractType'>): string {
  const soort = {
    bepaalde_tijd: 'Arbeidsovereenkomst voor bepaalde tijd',
    onbepaalde_tijd: 'Arbeidsovereenkomst voor onbepaalde tijd',
    oproep: 'Oproepovereenkomst',
    stage: 'Stageovereenkomst',
    zzp: 'Overeenkomst van opdracht',
  }[c.contractType]
  return soort ?? 'Overeenkomst'
}

function aanhef(c: GeneratedContract): string {
  return c.employeeAanhef === 'heer' ? 'Dhr. ' : c.employeeAanhef === 'mevrouw' ? 'Mevr. ' : ''
}

const PUNTJES = '……………………'

export function ContractPdf({ c, kop, tekenaars, merk }: { c: GeneratedContract; kop: WerkgeverKop | null; tekenaars: string[]; merk: Merk }) {
  const proforma = c.soort === 'proforma'
  const tekennaam = tekennaamVan(c)
  const iedereen = [...tekenaars, tekennaam]
  const artikelen = artikelenUit(c.body)
  const plaats = c.signPlace?.trim() || PUNTJES
  const datum = c.signDate ? formatDateLong(c.signDate) : PUNTJES
  return (
    <Document title={`${tekennaam} - ${titelVan(c).toLowerCase()}`} author={merkRegel(merk)}>
      <Page size="A4" style={s.pagina}>
        <MerkKop merk={merk} rechts={[titelVan(c), tekennaam]} />
        {proforma && (
          <Text style={s.watermerk} fixed>
            PRO FORMA
          </Text>
        )}

        {proforma && <Text style={s.proforma}>Pro forma: een voorstel om te bespreken, nog geen overeenkomst. Niet tekenen.</Text>}
        <Text style={s.eyebrow}>{proforma ? 'Pro forma' : 'Ter ondertekening'}</Text>
        <Text style={s.titel}>{titelVan(c)}</Text>
        <Text style={s.ondertitel}>
          {c.jobTitle} · met ingang van {formatDateLong(c.startedOn)}
          {c.endsOn ? ` tot en met ${formatDateLong(c.endsOn)}` : ''}
        </Text>

        <Text style={s.ondergetekenden}>De ondergetekenden:</Text>
        <View style={s.partijen} wrap={false}>
          <View style={[s.partij, { marginRight: 10 }]}>
            <Text style={s.partijLabel}>1. De werkgever</Text>
            <Text style={s.partijNaam}>{kop?.legalName ?? merk.naam}</Text>
            {kop && kop.addressLine ? (
              <>
                <Text style={s.regel}>{kop.addressLine}</Text>
                <Text style={s.regel}>
                  {kop.postalCode} {kop.city}
                </Text>
              </>
            ) : null}
            {kop?.kvkNumber ? <Text style={s.regel}>KvK {kop.kvkNumber}</Text> : null}
            <Text style={[s.regel, { marginTop: 8 }]}>Hierbij rechtsgeldig vertegenwoordigd door {namenZin(tekenaars)}</Text>
            <View style={s.vuller} />
            <Text style={s.hierna}>Hierna te noemen: “de werkgever”;</Text>
          </View>
          <View style={s.partij}>
            <Text style={s.partijLabel}>2. De werknemer</Text>
            <Text style={s.partijNaam}>
              {aanhef(c)}
              {c.employeeName}
            </Text>
            {c.employeeAddress ? <Text style={s.regel}>{c.employeeAddress}</Text> : null}
            {c.employeePostalCode || c.employeeCity ? (
              <Text style={s.regel}>
                {c.employeePostalCode ?? ''} {c.employeeCity ?? ''}
              </Text>
            ) : null}
            {c.employeeBirthDate ? <Text style={s.regel}>Geboren op {formatDateLong(c.employeeBirthDate)}</Text> : null}
            <View style={s.vuller} />
            <Text style={s.hierna}>Hierna te noemen: “de werknemer”;</Text>
          </View>
        </View>
        <Text style={[s.regel, s.verklaring]}>Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende bepalingen:</Text>

        {artikelen.map((a, i) => {
          const { nr, titel } = splitsKop(a.kop)
          return (
            <View key={a.kop} style={s.artikel}>
              {/* De kop gaat samen met het eerste lid naar de volgende pagina,
                  en een kort lid breekt niet: anders blijft een kop of een
                  lidnummer los onderaan een pagina staan. */}
              <View wrap={(a.leden[0] ?? '').length > PAST_OP_PAGINA}>
                <View style={s.artikelKop}>
                  <Text style={s.artikelNr}>{nr || i + 1}</Text>
                  <Text style={s.artikelTitel}>{titel}</Text>
                </View>
                {a.leden[0] !== undefined && <Lid nr={`${nr || i + 1}.1`} tekst={a.leden[0]} />}
              </View>
              {a.leden.slice(1).map((lid, j) => (
                <Lid key={j} nr={`${nr || i + 1}.${j + 2}`} tekst={lid} />
              ))}
            </View>
          )
        })}

        <View wrap={false} style={s.slot}>
          <Text style={s.regel}>
            Aldus overeengekomen, in tweevoud opgemaakt en ondertekend te {plaats} op {datum}.
          </Text>
          <View style={s.handtekeningen}>
            {tekenaars.map((naam) => (
              <View key={naam} style={s.handtekening}>
                <Text style={s.rol}>Namens de werkgever</Text>
                <View style={s.tekenruimte} />
                <Text style={{ fontWeight: 500 }}>{naam}</Text>
              </View>
            ))}
            <View style={s.handtekening}>
              <Text style={s.rol}>De werknemer</Text>
              <View style={s.tekenruimte} />
              <Text style={{ fontWeight: 500 }}>{tekennaam}</Text>
            </View>
          </View>
        </View>

        <View style={s.voet} fixed>
          <View style={s.parafen}>
            {iedereen.map((naam) => (
              <View key={naam} style={s.paraaf}>
                <Text style={s.paraafNaam}>Paraaf {naam}</Text>
                <View style={s.paraafVak} />
              </View>
            ))}
          </View>
        </View>
        {/* Los van de paraafregel: een render-tekst binnen een vast blok laat
            react-pdf het hele blok overslaan. */}
        <Text style={s.voetMerk} fixed>
          {[merkRegel(merk), merk.website].filter(Boolean).join(' · ')}
        </Text>
        <Text style={s.paginaNr} fixed render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`} />
      </Page>
    </Document>
  )
}

/** Het contract als pdf, met de kop zoals hij bij het opstellen was en het logo van nu. */
export async function maakContractPdf(c: GeneratedContract): Promise<Buffer> {
  registreerFonts()
  const bedrijf = await getBedrijf()
  const logo = await haalLogo(bedrijf?.werkgever ?? null)
  const merk = merkUit(bedrijf?.werkgever ?? null, logo)
  const kop = kopVanContract(c, bedrijf)
  // Een bewaarde kop heeft een eigen merknaam: die hoort bij het contract.
  if (kop) {
    merk.naam = kop.tradeName || merk.naam
    merk.ondertitel = kop.tagline ?? merk.ondertitel
  }
  const tekenaars = ondertekenaarsVan(c, bedrijf?.werkgever ?? null)
  return renderToBuffer(<ContractPdf c={c} kop={kop} tekenaars={tekenaars} merk={merk} />)
}

/** Alleen gewone tekens: met een accent noemt een deel van de browsers het bestand "download". */
export function bestandsnaam(naam: string): string {
  return naam
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function contractPdfNaam(c: GeneratedContract): string {
  const naam = bestandsnaam(tekennaamVan(c))
  return `${naam || 'Contract'} - ${c.soort === 'proforma' ? 'pro forma contract' : 'contract'} ${formatDate(c.startedOn).replace(/\s/g, ' ')}.pdf`
}

/**
 * Een voorbeeldcontract van een sjabloon, met verzonnen gegevens: om een
 * gewijzigde tekst na te lezen zoals hij in een contract komt. Met maatwerk
 * staan alle keuzes aan (bereikbaarheid, vrij nevenwerk, relatiebeding).
 */
export async function maakVoorbeeldContractPdf(soort: 'bepaalde_tijd' | 'onbepaalde_tijd', maatwerk: boolean): Promise<Buffer | null> {
  const [{ getSjabloon, stelContractOp, contractWerkgever, listFunctieprofielen }, { getHuis, berekenBeloning }] = await Promise.all([
    import('@/lib/contracten'),
    import('@/lib/salarishuis'),
  ])
  const ingang = new Date()
  ingang.setHours(12, 0, 0, 0)
  const sjabloon = await getSjabloon(soort, ingang)
  const bedrijf = await getBedrijf()
  if (!sjabloon || !bedrijf) return null
  const huis = await getHuis(ingang)
  const beloning = huis ? (() => { try { return berekenBeloning(huis, 'Medior', 20, 2400) } catch { return null } })() : null
  const profiel = (await listFunctieprofielen()).find((p) => p.hasRelationClause && p.relationClauseMotivation) ?? null
  const invoer = {
    candidateId: 'voorbeeld',
    naam: 'Voorbeeld Maria Medewerker',
    roepnaam: 'Maria',
    korteNaam: 'Maria Medewerker',
    aanhef: 'neutraal' as const,
    adres: 'Voorbeeldstraat 1',
    postcode: '1234 AB',
    woonplaats: 'Voorbeeldstad',
    geboortedatum: new Date(1995, 0, 1, 12),
    jobProfileId: profiel?.id ?? null,
    functie: profiel?.title ?? 'Marketing Manager',
    soort,
    ingangsdatum: ingang,
    looptijdMaanden: soort === 'bepaalde_tijd' ? 12 : null,
    proeftijdMaanden: 1,
    urenPerWeekKwartier: 2400,
    schaalNaam: beloning ? 'Medior' : null,
    trede: beloning ? 20 : null,
    brutoMaandCents: beloning?.maandCents ?? 250_000,
    opToeslagCents: beloning?.opToeslagCents ?? 25_000,
    vakantietoeslagBp: huis?.huis.holidayAllowanceBp ?? 800,
    vakantieUrenFulltime: huis?.huis.holidayHoursFulltime ?? 200,
    vakantieUren: beloning?.vakantieUren ?? 120,
    vrijetijdsbudget: true,
    relatiebeding: maatwerk && !!profiel,
    bereikbaarOpWerkdagen: maatwerk,
    nevenwerk: maatwerk ? ('vrij_behalve_klanten' as const) : ('toestemming' as const),
    tekenplaats: bedrijf.hoofdvestiging?.city ?? null,
    tekendatum: null,
  }
  const concept = stelContractOp(invoer, sjabloon, contractWerkgever(bedrijf, null, 'https://voorbeeld/personeelshandboek'), profiel)
  const nu = new Date()
  const c = {
    id: 'voorbeeld', soort: 'proforma', templateId: sjabloon.template.id, jobProfileId: invoer.jobProfileId, candidateId: null, userId: null,
    employeeName: invoer.naam, employeeAanhef: null, employeeAddress: invoer.adres, employeePostalCode: invoer.postcode, employeeCity: invoer.woonplaats,
    employeeBirthDate: invoer.geboortedatum, jobTitle: invoer.functie, contractType: soort, startedOn: ingang, endsOn: concept.einddatum,
    durationMonths: invoer.looptijdMaanden, probationMonths: concept.proeftijdMaanden, hoursWeekQuarters: 2400, salaryScaleName: invoer.schaalNaam,
    salaryStep: invoer.trede, grossMonthlyCents: invoer.brutoMaandCents, opAllowanceCents: invoer.opToeslagCents, holidayAllowanceBp: invoer.vakantietoeslagBp,
    holidayHoursPerYear: invoer.vakantieUren, aanzeggenVoor: concept.aanzeggenVoor, aangezegdOp: null, employerSigners: null, employeeShortName: invoer.korteNaam,
    locationId: null, signPlace: invoer.tekenplaats, signDate: null, employerSnapshot: null, invoer: null, handbookDocumentId: null, handbookGivenOn: null,
    body: concept.body, summary: concept.intro, remarks: null, signedOn: null, createdAt: nu, createdByUserId: null,
  } as GeneratedContract
  return maakContractPdf(c)
}
