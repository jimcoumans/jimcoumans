import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { getBedrijf, haalLogo } from '@/lib/bedrijf'
import { registreerFonts } from './fonts'
import { DocumentKop, KOP_RUIMTE, merkUit, merkRegel, type Merk, ZWART, GRIJS, BLAUW, RAND, KOPLETTER } from './huisstijl'

/* -------------------------------------------------------------------------
   Het gegevensoverzicht in de map voor de salarisadministratie en voor de
   eigen administratie: alles over een medewerker op één pagina, zonder
   lege regels om in te vullen. Wat er niet is, staat er als "nog niet
   bekend", zodat het opvalt in plaats van verdwijnt.
   ------------------------------------------------------------------------- */

const s = StyleSheet.create({
  pagina: { fontFamily: 'Inter', fontSize: 9.5, color: ZWART, paddingTop: KOP_RUIMTE, paddingBottom: 48, paddingHorizontal: 56 },
  eyebrow: { fontSize: 8.5, color: BLAUW, fontWeight: 500, marginBottom: 6 },
  titel: { fontFamily: KOPLETTER, fontWeight: 700, fontSize: 22, lineHeight: 1.15, marginBottom: 4 },
  ondertitel: { fontSize: 10, color: GRIJS, marginBottom: 12 },
  kop: { fontFamily: KOPLETTER, fontWeight: 700, fontSize: 11, marginTop: 12, marginBottom: 3 },
  veld: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: RAND, paddingVertical: 4.5 },
  label: { width: 170, fontSize: 8.5, color: GRIJS, paddingTop: 1 },
  waarde: { flex: 1, fontSize: 10 },
  leeg: { flex: 1, fontSize: 9, color: '#B5651D' },
  noot: { fontSize: 8, color: GRIJS, lineHeight: 1.5, marginTop: 14 },
})

export type Regel = [string, string | null | undefined]
export type Sectie = { titel: string; regels: Regel[] }

export type Overzicht = {
  /** Het regeltje boven de naam: voor wie de map is. */
  eyebrow: string
  naam: string
  ondertitel: string
  secties: Sectie[]
  documenten: string[]
  gemaakt: string
}

export function OverzichtPdf({ o, merk }: { o: Overzicht; merk: Merk }) {
  return (
    <Document title={`${o.naam} - gegevensoverzicht`} author={merkRegel(merk)}>
      <Page size="A4" style={s.pagina}>
        <DocumentKop soort="Gegevensoverzicht" wie={o.naam} merk={merk} />
        <Text style={s.eyebrow}>{o.eyebrow}</Text>
        <Text style={s.titel}>{o.naam}</Text>
        <Text style={s.ondertitel}>{o.ondertitel}</Text>

        {o.secties.map((sec) => (
          <View key={sec.titel} wrap={false}>
            <Text style={s.kop}>{sec.titel}</Text>
            {sec.regels.map(([label, waarde]) => (
              <View key={label} style={s.veld}>
                <Text style={s.label}>{label}</Text>
                {waarde?.trim() ? <Text style={s.waarde}>{waarde}</Text> : <Text style={s.leeg}>nog niet bekend</Text>}
              </View>
            ))}
          </View>
        ))}

        <View wrap={false}>
          <Text style={s.kop}>In deze map</Text>
          {o.documenten.length > 0 ? (
            o.documenten.map((d) => (
              <Text key={d} style={{ fontSize: 9.5, lineHeight: 1.5 }}>
                • {d}
              </Text>
            ))
          ) : (
            <Text style={s.leeg}>Nog geen documenten.</Text>
          )}
        </View>

        <Text style={s.noot}>
          Gemaakt op {o.gemaakt} uit het portaal van {merk.naam}. Bevat persoonsgegevens: bewaar en deel dit alleen voor de salarisadministratie.
        </Text>
      </Page>
    </Document>
  )
}

export async function maakOverzichtPdf(o: Overzicht): Promise<Buffer> {
  registreerFonts()
  const bedrijf = await getBedrijf()
  const logo = await haalLogo(bedrijf?.werkgever ?? null)
  return renderToBuffer(<OverzichtPdf o={o} merk={merkUit(bedrijf?.werkgever ?? null, logo)} />)
}
