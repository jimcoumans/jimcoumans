import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { EmployerSettings } from '@/db/schema'
import type { Bestand } from '@/lib/bestandsopslag'

/* -------------------------------------------------------------------------
   De huisstijl van elk document dat het portaal maakt: kleuren, de kop met
   logo en naam. De naam en het logo komen uit de bedrijfsgegevens, niet uit
   een sjabloon: een nieuwe naam pas je op een plek aan.
   ------------------------------------------------------------------------- */

export const ZWART = '#1C1C1E'
export const GRIJS = '#636466'
export const BLAUW = '#007AFF'
export const LIJN = '#E5E5E9'
export const VLAK = '#F2F2F7'
export const RAND = '#C8C8CD'
/** Titels, citaten en subkoppen. Lopende tekst is Inter. */
export const KOPLETTER = 'Figtree'

export type Merk = {
  naam: string
  ondertitel: string | null
  website: string | null
  logo: { data: Buffer; format: 'png' | 'jpg'; breedte: number; hoogte: number } | null
}

/** Breedte en hoogte uit de kop van een png of jpg. Lukt dat niet, dan geen logo. */
export function afmetingen(data: Buffer, contentType: string): { breedte: number; hoogte: number } | null {
  if (contentType === 'image/png' && data.length > 24 && data.readUInt32BE(12) === 0x49484452) {
    return { breedte: data.readUInt32BE(16), hoogte: data.readUInt32BE(20) }
  }
  if (contentType === 'image/jpeg' && data[0] === 0xff && data[1] === 0xd8) {
    let i = 2
    while (i + 9 < data.length) {
      if (data[i] !== 0xff) return null
      const marker = data[i + 1]!
      const lengte = data.readUInt16BE(i + 2)
      // SOF0 t/m SOF15, behalve DHT (c4), JPG (c8) en DAC (cc): daar staan de afmetingen.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { hoogte: data.readUInt16BE(i + 5), breedte: data.readUInt16BE(i + 7) }
      }
      i += 2 + lengte
    }
  }
  return null
}

export function merkUit(w: Pick<EmployerSettings, 'tradeName' | 'tagline' | 'website'> | null, logo: Bestand | null): Merk {
  const maat = logo ? afmetingen(logo.data, logo.contentType) : null
  return {
    naam: w?.tradeName ?? 'James Robinson',
    ondertitel: w?.tagline ?? null,
    website: w?.website ?? null,
    logo:
      logo && maat && maat.breedte > 0 && maat.hoogte > 0
        ? { data: logo.data, format: logo.contentType === 'image/png' ? 'png' : 'jpg', ...maat }
        : null,
  }
}

/** "James Robinson Performance Agency" */
export function merkRegel(m: Merk): string {
  return [m.naam, m.ondertitel].filter(Boolean).join(' ')
}

const k = StyleSheet.create({
  kop: { position: 'absolute', top: 34, left: 56, right: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.75, borderBottomColor: LIJN, paddingBottom: 14 },
  links: { flexDirection: 'row', alignItems: 'center' },
  naam: { fontFamily: 'Figtree', fontWeight: 700, fontSize: 12, color: ZWART },
  ondertitel: { fontFamily: 'Inter', fontSize: 8, color: BLAUW, marginTop: 1 },
  rechts: { fontFamily: 'Inter', fontSize: 7.5, color: GRIJS, textAlign: 'right', lineHeight: 1.5 },
})

/**
 * De kop bovenaan elke pagina.
 *
 * Een breed logo (beeldmerk met woordmerk) staat alleen; een vierkant
 * beeldmerk krijgt de naam en de ondertitel ernaast. Zo werkt het met
 * welk logo er ook in de bedrijfsgegevens staat.
 */
export function MerkKop({ merk, rechts }: { merk: Merk; rechts: string[] }) {
  const l = merk.logo
  const breed = l ? l.breedte / l.hoogte >= 2.2 : false
  const hoogte = breed ? 30 : 28
  const breedte = l ? Math.min(180, (hoogte * l.breedte) / l.hoogte) : 0
  return (
    <View style={k.kop} fixed>
      <View style={k.links}>
        {l && <Image src={{ data: l.data, format: l.format }} style={{ height: (breedte * l.hoogte) / l.breedte, width: breedte, marginRight: breed ? 0 : 9 }} />}
        {!breed && (
          <View>
            <Text style={k.naam}>{merk.naam}</Text>
            {merk.ondertitel ? <Text style={k.ondertitel}>{merk.ondertitel}</Text> : null}
          </View>
        )}
      </View>
      <Text style={k.rechts}>{rechts.join('\n')}</Text>
    </View>
  )
}

/* De kop van een document: links wat het is en voor wie, rechts het
   paginanummer. Geen logo en geen voetregel: de onderkant van een contract
   is voor de parafen. */

/** Waar de tekst onder de kop begint. */
export const KOP_RUIMTE = 92

const d = StyleSheet.create({
  kop: { position: 'absolute', top: 40, left: 56, right: 56, borderBottomWidth: 0.75, borderBottomColor: LIJN, paddingBottom: 10, paddingRight: 48 },
  soort: { fontFamily: 'Inter', fontSize: 8, color: GRIJS },
  wie: { fontFamily: 'Inter', fontSize: 8, color: ZWART, fontWeight: 500 },
  nr: { position: 'absolute', top: 40, right: 56, width: 48, fontFamily: 'Inter', fontSize: 8, color: GRIJS, textAlign: 'right' },
})

/**
 * "Arbeidsovereenkomst voor bepaalde tijd · Daan Voncken × James Robinson"
 * met rechts "1/9". Het nummer staat los van het blok: een render-tekst in
 * een vast blok laat react-pdf overslaan.
 */
export function DocumentKop({ soort, wie, merk }: { soort: string; wie: string; merk: Merk }) {
  return (
    <>
      <View style={d.kop} fixed>
        <Text style={d.soort}>
          {soort} · <Text style={d.wie}>{wie} × {merk.naam}</Text>
        </Text>
      </View>
      <Text style={d.nr} fixed render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
    </>
  )
}
