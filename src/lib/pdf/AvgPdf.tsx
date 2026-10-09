import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { GeneratedContract } from '@/db/schema'
import { getBedrijf, haalLogo, avgTekst } from '@/lib/bedrijf'
import { vulIn, tekennaamVan } from '@/lib/contracten'
import { registreerFonts } from './fonts'
import { MerkKop, merkUit, merkRegel, type Merk, ZWART, GRIJS, BLAUW, VLAK, RAND } from './huisstijl'
import { bestandsnaam } from './ContractPdf'

/* -------------------------------------------------------------------------
   De AVG-verklaring: de bijlage bij de arbeidsovereenkomst waarin staat wat
   we met de persoonsgegevens van de werknemer doen, met een vakje voor
   toestemming voor foto's en een handtekening.

   De tekst staat in de bedrijfsgegevens en is daar aan te passen. Hetzelfde
   formaat als een contractsjabloon: "## " is een kop, een lege regel een
   nieuwe alinea, "- " een opsomming en "[ ] " een vakje om aan te kruisen.
   ------------------------------------------------------------------------- */

const s = StyleSheet.create({
  pagina: { fontFamily: 'Inter', fontSize: 9.5, color: ZWART, paddingTop: 112, paddingBottom: 72, paddingHorizontal: 56 },
  regel: { fontSize: 9.5, lineHeight: 1.5 },
  eyebrow: { fontSize: 8.5, color: BLAUW, fontWeight: 500, marginBottom: 6 },
  titel: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 24, lineHeight: 1.15, marginBottom: 6 },
  ondertitel: { fontSize: 10, color: GRIJS, marginBottom: 24 },
  kop: { fontFamily: 'InterTight', fontWeight: 700, fontSize: 10.5, marginTop: 8, marginBottom: 5 },
  alinea: { marginBottom: 7 },
  punt: { flexDirection: 'row', marginBottom: 3 },
  bolletje: { width: 14, color: BLAUW, fontSize: 9.5, lineHeight: 1.5 },
  vakje: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  hokje: { width: 11, height: 11, borderWidth: 0.9, borderColor: GRIJS, borderRadius: 2, marginRight: 9, marginTop: 2.5 },
  ondertekening: { flexDirection: 'row', marginTop: 18 },
  veld: { flex: 1, backgroundColor: VLAK, borderRadius: 8, padding: 12, marginRight: 10 },
  label: { fontSize: 7.5, color: GRIJS, marginBottom: 2 },
  lijn: { height: 40, borderBottomWidth: 0.75, borderBottomColor: GRIJS, marginBottom: 6 },
  voetMerk: { position: 'absolute', bottom: 28, left: 56, fontSize: 7, color: GRIJS },
  paginaNr: { position: 'absolute', bottom: 28, right: 56, fontSize: 7, color: BLAUW },
})

type Blok = { soort: 'kop' | 'alinea' | 'punt' | 'vakje'; tekst: string }

/** De tekst in blokken: koppen, alinea's, opsommingen en vakjes. */
export function blokkenUit(tekst: string): Blok[] {
  const blokken: Blok[] = []
  for (const alinea of tekst.split(/\n\s*\n/)) {
    const regels = alinea.split('\n').map((r) => r.trim()).filter(Boolean)
    let lopend: string[] = []
    const sluit = () => {
      if (lopend.length > 0) blokken.push({ soort: 'alinea', tekst: lopend.join(' ') })
      lopend = []
    }
    for (const r of regels) {
      if (r.startsWith('## ')) {
        sluit()
        blokken.push({ soort: 'kop', tekst: r.slice(3).trim() })
      } else if (r.startsWith('- ')) {
        sluit()
        blokken.push({ soort: 'punt', tekst: r.slice(2).trim() })
      } else if (/^\[\s?\]\s/.test(r)) {
        sluit()
        blokken.push({ soort: 'vakje', tekst: r.replace(/^\[\s?\]\s/, '').trim() })
      } else lopend.push(r)
    }
    sluit()
  }
  return blokken
}

export function AvgPdf({ naam, tekst, merk }: { naam: string; tekst: string; merk: Merk }) {
  const blokken = blokkenUit(tekst)
  return (
    <Document title={`${naam} - AVG-verklaring`} author={merkRegel(merk)}>
      <Page size="A4" style={s.pagina}>
        <MerkKop merk={merk} rechts={['AVG-verklaring', naam]} />
        <Text style={s.eyebrow}>Bijlage bij de arbeidsovereenkomst</Text>
        <Text style={s.titel}>AVG-verklaring</Text>
        <Text style={s.ondertitel}>Wat {merk.naam} met de persoonsgegevens van {naam} doet</Text>

        {blokken.map((b, i) => {
          if (b.soort === 'kop') {
            return (
              <Text key={i} style={s.kop} minPresenceAhead={40}>
                {b.tekst}
              </Text>
            )
          }
          if (b.soort === 'punt') {
            return (
              <View key={i} style={s.punt} wrap={false}>
                <Text style={s.bolletje}>•</Text>
                <Text style={[s.regel, { flex: 1 }]}>{b.tekst}</Text>
              </View>
            )
          }
          if (b.soort === 'vakje') {
            return (
              <View key={i} style={s.vakje} wrap={false}>
                <View style={s.hokje} />
                <Text style={[s.regel, { flex: 1 }]}>{b.tekst}</Text>
              </View>
            )
          }
          return (
            <Text key={i} style={[s.regel, s.alinea]}>
              {b.tekst}
            </Text>
          )
        })}

        <View style={s.ondertekening} wrap={false}>
          <View style={s.veld}>
            <Text style={s.label}>Naam</Text>
            <View style={s.lijn} />
            <Text style={{ fontWeight: 500 }}>{naam}</Text>
          </View>
          <View style={s.veld}>
            <Text style={s.label}>Datum en plaats</Text>
            <View style={s.lijn} />
            <Text> </Text>
          </View>
          <View style={[s.veld, { marginRight: 0 }]}>
            <Text style={s.label}>Handtekening</Text>
            <View style={s.lijn} />
            <Text> </Text>
          </View>
        </View>

        <Text style={s.voetMerk} fixed>
          {[merkRegel(merk), merk.website].filter(Boolean).join(' · ')}
        </Text>
        <Text style={s.paginaNr} fixed render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} van ${totalPages}`} />
      </Page>
    </Document>
  )
}

/** De AVG-verklaring voor de werknemer van dit contract. */
export async function maakAvgPdf(c: GeneratedContract): Promise<Buffer> {
  return maakAvgPdfVoor(tekennaamVan(c), c.employeeName)
}

/** De AVG-verklaring voor een naam: ook voor een voorbeeld bij de bedrijfsgegevens. */
export async function maakAvgPdfVoor(naam: string, volledigeNaam: string): Promise<Buffer> {
  registreerFonts()
  const bedrijf = await getBedrijf()
  const logo = await haalLogo(bedrijf?.werkgever ?? null)
  const merk = merkUit(bedrijf?.werkgever ?? null, logo)
  const w = bedrijf?.werkgever ?? null
  const ingevuld = vulIn(avgTekst(w), {
    werkgever_naam: w?.legalName ?? merk.naam,
    werkgever_merk: w?.tradeName ?? merk.naam,
    werkgever_email: w?.email ?? '[e-mailadres]',
    werknemer_naam: volledigeNaam,
  })
  return renderToBuffer(<AvgPdf naam={naam} tekst={ingevuld.tekst} merk={merk} />)
}

export function avgPdfNaam(c: GeneratedContract): string {
  return `${bestandsnaam(tekennaamVan(c)) || 'Medewerker'} - AVG-verklaring.pdf`
}
