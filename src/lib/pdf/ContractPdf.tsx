import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { GeneratedContract, EmployerSettings } from '@/db/schema'
import { formatDate, formatDateLong } from '@/lib/dates'
import { ondertekenaarsVan, namenZin } from '@/lib/contracten'
import { registreerFonts } from './fonts'

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

const ZWART = '#1C1C1E'
const GRIJS = '#636466'
const BLAUW = '#007AFF'
const LIJN = '#E5E5E9'
const VLAK = '#F2F2F7'
const ORANJE = '#94590A'

/* Designsysteem v3.0: Inter Tight voor koppen, Inter voor tekst, JR Blue als
   accent, rustige grijze vlakken. Onderaan elke pagina een paraafvak voor
   iedereen die tekent; daar is de ruimte onderaan voor gereserveerd. */
const s = StyleSheet.create({
  pagina: { fontFamily: 'Inter', fontSize: 9.5, color: ZWART, paddingTop: 70, paddingBottom: 112, paddingHorizontal: 50 },
  /* De regelafstand per tekst en niet op de pagina: op de pagina laat
     react-pdf het paginanummer (een render-tekst) stilletjes weg, en via een
     omringend blok rekent het de afstand ruim twee keer zo groot. Met de
     korps erbij, anders rekent react-pdf met zijn eigen standaardkorps. */
  regel: { fontSize: 9.5, lineHeight: 1.45 },
  kop: { position: 'absolute', top: 28, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 0.75, borderBottomColor: LIJN, paddingBottom: 8 },
  merk: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 11 },
  merkSub: { fontSize: 7.5, color: BLAUW },
  kopRechts: { fontSize: 7.5, color: GRIJS, textAlign: 'right' },
  proforma: { fontSize: 8, color: ORANJE, fontWeight: 500, marginBottom: 10, backgroundColor: '#FEF7EE', borderRadius: 6, padding: 8 },
  watermerk: { position: 'absolute', top: 360, left: 40, right: 40, textAlign: 'center', fontFamily: 'InterTight', fontWeight: 700, fontSize: 96, color: '#F6A027', opacity: 0.08, transform: 'rotate(-30deg)' },
  eyebrow: { fontSize: 8.5, color: BLAUW, fontWeight: 500, marginBottom: 4 },
  titel: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 22, lineHeight: 1.1, marginBottom: 4 },
  ondertitel: { fontSize: 10, color: GRIJS, marginBottom: 18 },
  partijen: { flexDirection: 'row', marginBottom: 10 },
  partij: { flex: 1, backgroundColor: VLAK, borderRadius: 6, padding: 11 },
  partijLabel: { fontSize: 7.5, color: GRIJS, marginBottom: 3 },
  partijNaam: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 11, marginBottom: 3 },
  verklaring: { marginBottom: 16 },
  artikel: { marginBottom: 11 },
  artikelKop: { flexDirection: 'row', marginBottom: 4 },
  artikelNr: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 10.5, color: BLAUW, width: 26 },
  artikelTitel: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 10.5, flex: 1 },
  lid: { flexDirection: 'row', marginBottom: 3.5 },
  lidNr: { width: 26, color: GRIJS, fontSize: 8.5, paddingTop: 0.8 },
  slot: { marginTop: 18, borderTopWidth: 0.75, borderTopColor: LIJN, paddingTop: 14 },
  handtekeningen: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  handtekening: { width: '48%', marginRight: '2%', marginBottom: 16, backgroundColor: VLAK, borderRadius: 6, padding: 10 },
  tekenruimte: { height: 46, borderBottomWidth: 0.75, borderBottomColor: GRIJS, marginBottom: 5 },
  rol: { fontSize: 7.5, color: GRIJS, marginBottom: 2 },
  voet: { position: 'absolute', bottom: 24, left: 50, right: 50 },
  parafen: { flexDirection: 'row', borderTopWidth: 0.75, borderTopColor: LIJN, paddingTop: 7 },
  paraaf: { flex: 1, marginRight: 8 },
  paraafVak: { height: 26, borderWidth: 0.75, borderColor: '#C8C8CD', borderRadius: 4, marginTop: 3 },
  paraafNaam: { fontSize: 6.5, color: GRIJS },
  voetRegel: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: GRIJS, marginTop: 7 },
  paginaNr: { position: 'absolute', bottom: 24, right: 50, fontSize: 7, color: BLAUW },
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

/** Een lid tot een regel of zes breekt niet over twee pagina's. */
function kort(tekst: string | undefined): boolean {
  return (tekst ?? '').length <= 600
}

function Lid({ nr, tekst }: { nr: string; tekst: string }) {
  return (
    <View style={s.lid} wrap={!kort(tekst)}>
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

export function ContractPdf({ c, werkgever }: { c: GeneratedContract; werkgever: EmployerSettings | null }) {
  const proforma = c.soort === 'proforma'
  const tekenaars = ondertekenaarsVan(c, werkgever)
  const werknemer = `${aanhef(c)}${c.employeeName}`
  const iedereen = [...tekenaars, c.employeeName]
  const artikelen = artikelenUit(c.body)
  return (
    <Document title={`${c.employeeName} - ${titelVan(c).toLowerCase()}`} author="James Robinson">
      <Page size="A4" style={s.pagina}>
        <View style={s.kop} fixed>
          <View>
            <Text style={s.merk}>James Robinson</Text>
            <Text style={s.merkSub}>Marketing &amp; Branding</Text>
          </View>
          <Text style={s.kopRechts}>
            {titelVan(c)}
            {'\n'}
            {c.employeeName}
          </Text>
        </View>
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

        <Text style={{ marginBottom: 6 }}>De ondergetekenden:</Text>
        <View style={s.partijen} wrap={false}>
          <View style={[s.partij, { marginRight: 8 }]}>
            <Text style={s.partijLabel}>1. De werkgever</Text>
            <Text style={s.partijNaam}>{werkgever?.legalName ?? 'James Robinson B.V.'}</Text>
            {werkgever && (
              <>
                <Text style={s.regel}>
                  Gevestigd te {werkgever.registeredCity} aan de {werkgever.registeredAddress}, {werkgever.registeredPostalCode} {werkgever.registeredCity}
                </Text>
                {werkgever.kvkNumber ? <Text style={s.regel}>KvK {werkgever.kvkNumber}</Text> : null}
              </>
            )}
            <Text style={[s.regel, { marginTop: 4 }]}>Hierbij rechtsgeldig vertegenwoordigd door {namenZin(tekenaars)}</Text>
            <Text style={[s.regel, { marginTop: 4, color: GRIJS }]}>Hierna te noemen: “de werkgever”;</Text>
          </View>
          <View style={s.partij}>
            <Text style={s.partijLabel}>2. De werknemer</Text>
            <Text style={s.partijNaam}>{werknemer}</Text>
            {c.employeeAddress ? <Text style={s.regel}>{c.employeeAddress}</Text> : null}
            {c.employeePostalCode || c.employeeCity ? (
              <Text style={s.regel}>
                {c.employeePostalCode ?? ''} {c.employeeCity ?? ''}
              </Text>
            ) : null}
            {c.employeeBirthDate ? <Text style={s.regel}>Geboren op {formatDateLong(c.employeeBirthDate)}</Text> : null}
            <Text style={[s.regel, { marginTop: 4, color: GRIJS }]}>Hierna te noemen: “de werknemer”;</Text>
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
              <View wrap={!kort(a.leden[0])}>
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
          <Text style={s.regel}>Aldus overeengekomen, opgemaakt in tweevoud en ondertekend te {werkgever?.registeredCity ?? 'Hulsberg'} op ………………………</Text>
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
              <Text style={{ fontWeight: 500 }}>{c.employeeName}</Text>
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
          <View style={s.voetRegel}>
            <Text>
              {c.employeeName} · {proforma ? 'pro forma, niet tekenen' : 'ter ondertekening'}
            </Text>
          </View>
        </View>
        {/* Los van de paraafregel: een render-tekst binnen een vast blok laat
            react-pdf het hele blok overslaan. */}
        <Text style={s.paginaNr} fixed render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`} />
      </Page>
    </Document>
  )
}

export async function maakContractPdf(c: GeneratedContract, werkgever: EmployerSettings | null): Promise<Buffer> {
  registreerFonts()
  return renderToBuffer(<ContractPdf c={c} werkgever={werkgever} />)
}

/** Alleen gewone tekens: met een accent noemt een deel van de browsers het bestand "download". */
export function contractPdfNaam(c: GeneratedContract): string {
  const naam = c.employeeName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${naam || 'Contract'} - ${c.soort === 'proforma' ? 'pro forma contract' : 'contract'} ${formatDate(c.startedOn).replace(/\s/g, ' ')}.pdf`
}
