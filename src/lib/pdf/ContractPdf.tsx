import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { GeneratedContract, EmployerSettings } from '@/db/schema'
import { formatDate } from '@/lib/dates'
import { registreerFonts } from './fonts'

/* -------------------------------------------------------------------------
   Een contract als pdf: om te downloaden, mee te sturen en te tekenen.

   Dezelfde inhoud als de contractpagina (contracten/[id]): de tekst komt uit
   het contract zelf, niet opnieuw uit het sjabloon. Een pro forma krijgt een
   duidelijke markering op elke pagina, zodat niemand het per ongeluk tekent
   als definitief.
   ------------------------------------------------------------------------- */

const ZWART = '#1C1C1E'
const GRIJS = '#636466'
const BLAUW = '#007AFF'

const s = StyleSheet.create({
  pagina: { fontFamily: 'Inter', fontSize: 9.5, color: ZWART, paddingTop: 48, paddingBottom: 60, paddingHorizontal: 56, lineHeight: 1.45 },
  merk: { fontSize: 8, color: GRIJS, marginBottom: 18 },
  proforma: { fontSize: 8, color: '#9a5b00', fontWeight: 500, marginBottom: 10 },
  titel: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 14, textAlign: 'center', marginBottom: 18 },
  samenvatting: { fontSize: 9, color: GRIJS, borderBottomWidth: 0.5, borderBottomColor: '#D2D1D7', paddingBottom: 12, marginBottom: 16 },
  partij: { marginBottom: 8 },
  artikel: { marginBottom: 10 },
  artikelKop: { fontWeight: 700, marginBottom: 3 },
  lid: { flexDirection: 'row', marginBottom: 3 },
  lidNr: { width: 24, color: GRIJS },
  handtekeningen: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  handtekening: { width: '44%' },
  lijn: { borderTopWidth: 0.5, borderTopColor: GRIJS, marginTop: 44, paddingTop: 3 },
  voet: { position: 'absolute', bottom: 26, left: 56, right: 56, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: GRIJS },
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

function titelVan(c: GeneratedContract): string {
  const soort = {
    bepaalde_tijd: 'ARBEIDSOVEREENKOMST VOOR BEPAALDE TIJD',
    onbepaalde_tijd: 'ARBEIDSOVEREENKOMST VOOR ONBEPAALDE TIJD',
    oproep: 'OPROEPOVEREENKOMST',
    stage: 'STAGEOVEREENKOMST',
    zzp: 'OVEREENKOMST VAN OPDRACHT',
  }[c.contractType]
  return soort ?? 'OVEREENKOMST'
}

function aanhef(c: GeneratedContract): string {
  return c.employeeAanhef === 'heer' ? 'Dhr. ' : c.employeeAanhef === 'mevrouw' ? 'Mevr. ' : ''
}

export function ContractPdf({ c, werkgever }: { c: GeneratedContract; werkgever: EmployerSettings | null }) {
  const proforma = c.soort === 'proforma'
  return (
    <Document title={`${c.employeeName} - ${titelVan(c).toLowerCase()}`} author="James Robinson">
      <Page size="A4" style={s.pagina}>
        <Text style={s.merk} fixed>
          James Robinson — Marketing & Branding
        </Text>
        {proforma && (
          <Text style={s.proforma} fixed>
            PRO FORMA: een voorstel om te bespreken, nog geen overeenkomst. Niet tekenen.
          </Text>
        )}
        {c.summary ? <Text style={s.samenvatting}>{c.summary}</Text> : null}

        <Text style={s.titel}>{titelVan(c)}</Text>

        {werkgever && (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ marginBottom: 6 }}>De ondergetekenden:</Text>
            <View style={s.partij}>
              <Text>1. Naam: {werkgever.legalName}</Text>
              <Text>
                Gevestigd te: {werkgever.registeredCity} ({werkgever.registeredPostalCode})
              </Text>
              <Text>Aan de: {werkgever.registeredAddress}</Text>
              <Text>Hierbij rechtsgeldig vertegenwoordigd door {werkgever.signatories}</Text>
              <Text>Hierna te noemen: “de werkgever”;</Text>
            </View>
            <Text style={{ marginBottom: 6 }}>en</Text>
            <View style={s.partij}>
              <Text>
                2. Naam: {aanhef(c)}
                {c.employeeName}
              </Text>
              {c.employeeAddress ? <Text>Adres: {c.employeeAddress}</Text> : null}
              {c.employeePostalCode ? <Text>Postcode: {c.employeePostalCode}</Text> : null}
              {c.employeeCity ? <Text>Woonplaats: {c.employeeCity}</Text> : null}
              {c.employeeBirthDate ? <Text>Geboren op: {formatDate(c.employeeBirthDate)}</Text> : null}
              <Text>Hierna te noemen “de werknemer”;</Text>
            </View>
            <Text>Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende bepalingen:</Text>
          </View>
        )}

        {artikelenUit(c.body).map((a, i) => (
          <View key={a.kop} style={s.artikel}>
            <Text style={s.artikelKop} minPresenceAhead={40}>
              {a.kop}
            </Text>
            {a.leden.map((lid, j) => (
              <View key={j} style={s.lid}>
                <Text style={s.lidNr}>
                  {i + 1}.{j + 1}
                </Text>
                <Text style={{ flex: 1 }}>{lid}</Text>
              </View>
            ))}
          </View>
        ))}

        <View wrap={false} style={{ marginTop: 18 }}>
          <Text>Aldus overeengekomen, opgemaakt in tweevoud en ondertekend</Text>
          <Text style={{ marginTop: 10 }}>te: {werkgever?.registeredCity ?? ''}, d.d. ………………………</Text>
          <View style={s.handtekeningen}>
            <View style={s.handtekening}>
              <Text>de werkgever</Text>
              <Text style={s.lijn}>{werkgever?.signatories ?? ''}</Text>
            </View>
            <View style={s.handtekening}>
              <Text>de werknemer</Text>
              <Text style={s.lijn}>{c.employeeName}</Text>
            </View>
          </View>
        </View>

        <View style={s.voet} fixed>
          <Text>
            {c.employeeName} · {proforma ? 'pro forma' : 'ter ondertekening'}
          </Text>
          <Text style={{ color: BLAUW }} render={({ pageNumber, totalPages }) => `pagina ${pageNumber} van ${totalPages}`} />
        </View>
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
