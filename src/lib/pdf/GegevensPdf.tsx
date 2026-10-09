import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { PDFDocument } from 'pdf-lib'
import type { GeneratedContract } from '@/db/schema'
import { formatDateLong } from '@/lib/dates'
import { tekennaamVan } from '@/lib/contracten'
import { getBedrijf, haalLogo, huidigBedrijfsdocument, haalBedrijfsdocument } from '@/lib/bedrijf'
import { getGegevens, leesIban } from '@/lib/persoonsgegevens'
import { registreerFonts } from './fonts'
import { DocumentKop, KOP_RUIMTE, merkUit, merkRegel, type Merk, ZWART, GRIJS, BLAUW, VLAK, RAND, KOPLETTER } from './huisstijl'
import { bestandsnaam, maakContractPdf } from './ContractPdf'
import { maakAvgPdf } from './AvgPdf'

/* -------------------------------------------------------------------------
   Het gegevensformulier voor de salarisadministratie: wat de werkgever nodig
   heeft voor de loonaangifte, met de keuze voor de loonheffingskorting en een
   handtekening. Wat we al weten staat erin; de werknemer vult de rest aan
   (het BSN schrijven we nergens op) en tekent.

   En het printpakket: alles wat er bij het tekenen op tafel moet liggen, in
   een bestand. Het contract twee keer, want het wordt in tweevoud getekend.
   ------------------------------------------------------------------------- */

const s = StyleSheet.create({
  pagina: { fontFamily: 'Inter', fontSize: 9.5, color: ZWART, paddingTop: KOP_RUIMTE, paddingBottom: 48, paddingHorizontal: 56 },
  regel: { fontSize: 9.5, lineHeight: 1.5 },
  eyebrow: { fontSize: 8.5, color: BLAUW, fontWeight: 500, marginBottom: 6 },
  titel: { fontFamily: KOPLETTER, fontWeight: 700, fontSize: 22, lineHeight: 1.15, marginBottom: 4 },
  ondertitel: { fontSize: 10, color: GRIJS, marginBottom: 10 },
  kop: { fontFamily: KOPLETTER, fontWeight: 700, fontSize: 11, marginTop: 10, marginBottom: 3 },
  veld: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: RAND, paddingVertical: 5 },
  label: { width: 170, fontSize: 8.5, color: GRIJS, paddingTop: 1 },
  waarde: { flex: 1, fontSize: 10, minHeight: 13 },
  keuze: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  hokje: { width: 11, height: 11, borderWidth: 0.9, borderColor: GRIJS, borderRadius: 2, marginRight: 9, marginTop: 2.5 },
  noot: { fontSize: 8, color: GRIJS, lineHeight: 1.5, marginTop: 4 },
  ondertekening: { flexDirection: 'row', marginTop: 12 },
  vlak: { flex: 1, backgroundColor: VLAK, borderRadius: 8, padding: 12, marginRight: 10 },
  lijn: { height: 30, borderBottomWidth: 0.75, borderBottomColor: GRIJS, marginBottom: 6 },
})

type Veld = [string, string | null | undefined]

function Velden({ velden }: { velden: Veld[] }) {
  return (
    <View>
      {velden.map(([label, waarde]) => (
        <View key={label} style={s.veld} wrap={false}>
          <Text style={s.label}>{label}</Text>
          <Text style={s.waarde}>{waarde?.trim() || ' '}</Text>
        </View>
      ))}
    </View>
  )
}

export type GegevensVoorFormulier = {
  naam: string
  achternaam: string | null
  voornamen: string | null
  geboortedatum: Date | null
  geboorteplaats: string | null
  adres: string | null
  postcodePlaats: string | null
  iban: string | null
  tenaamstelling: string | null
  indienst: Date
  functie: string
}

export function GegevensPdf({ g, merk }: { g: GegevensVoorFormulier; merk: Merk }) {
  return (
    <Document title={`${g.naam} - gegevens voor de salarisadministratie`} author={merkRegel(merk)}>
      <Page size="A4" style={s.pagina}>
        <DocumentKop soort="Gegevens voor de salarisadministratie" wie={g.naam} merk={merk} />
        <Text style={s.eyebrow}>Bij de arbeidsovereenkomst</Text>
        <Text style={s.titel}>Gegevens voor de salarisadministratie</Text>
        <Text style={s.ondertitel}>Wat er al staat, controleer je. Wat leeg is, vul je aan. Daarna teken je onderaan.</Text>

        <Text style={s.kop}>Persoonlijke gegevens</Text>
        <Velden
          velden={[
            ['Achternaam', g.achternaam],
            ['Voornamen (voluit)', g.voornamen],
            ['Geboortedatum', g.geboortedatum ? formatDateLong(g.geboortedatum) : null],
            ['Geboorteplaats', g.geboorteplaats],
            ['Adres', g.adres],
            ['Postcode en woonplaats', g.postcodePlaats],
            ['Burgerservicenummer (BSN)', null],
          ]}
        />

        <Text style={s.kop}>Uitbetaling</Text>
        <Velden
          velden={[
            ['IBAN', g.iban],
            ['Ten name van', g.tenaamstelling],
          ]}
        />

        <Text style={s.kop}>Dienstverband</Text>
        <Velden
          velden={[
            ['Functie', g.functie],
            ['Datum van indiensttreding', formatDateLong(g.indienst)],
          ]}
        />

        <View wrap={false}>
          <Text style={s.kop}>Loonheffingskorting</Text>
          <Text style={[s.regel, { marginBottom: 5 }]}>Wil je dat de werkgever de loonheffingskorting toepast?</Text>
          <View style={s.keuze}>
            <View style={s.hokje} />
            <Text style={s.regel}>Ja, met ingang van ……………………</Text>
          </View>
          <View style={s.keuze}>
            <View style={s.hokje} />
            <Text style={s.regel}>Nee</Text>
          </View>
          <Text style={s.noot}>
            Laat de loonheffingskorting maar door een werkgever of uitkeringsinstantie tegelijk toepassen. Wie hem bij meer dan een toepast, moet achteraf
            belasting terugbetalen.
          </Text>
        </View>

        <View style={s.ondertekening} wrap={false}>
          <View style={s.vlak}>
            <Text style={{ fontSize: 7.5, color: GRIJS, marginBottom: 2 }}>Naam</Text>
            <View style={s.lijn} />
            <Text style={{ fontWeight: 500 }}>{g.naam}</Text>
          </View>
          <View style={s.vlak}>
            <Text style={{ fontSize: 7.5, color: GRIJS, marginBottom: 2 }}>Datum</Text>
            <View style={s.lijn} />
            <Text> </Text>
          </View>
          <View style={[s.vlak, { marginRight: 0 }]}>
            <Text style={{ fontSize: 7.5, color: GRIJS, marginBottom: 2 }}>Handtekening</Text>
            <View style={s.lijn} />
            <Text> </Text>
          </View>
        </View>
        <Text style={s.noot}>
          De gegevens worden versleuteld bewaard en alleen gedeeld met het administratiekantoor dat de salarisadministratie verzorgt. Liever het formulier
          &quot;Opgaaf gegevens voor de loonheffingen&quot; van de Belastingdienst? Dat kan ook.
        </Text>

      </Page>
    </Document>
  )
}

/** Het gegevensformulier voor de werknemer van dit contract, met wat we al weten. */
export async function maakGegevensPdf(c: GeneratedContract): Promise<Buffer> {
  registreerFonts()
  const bedrijf = await getBedrijf()
  const logo = await haalLogo(bedrijf?.werkgever ?? null)
  const merk = merkUit(bedrijf?.werkgever ?? null, logo)
  // Na de aanname staan de persoonsgegevens bij de collega, daarvoor bij de kandidaat.
  const gegevens = (c.userId ? await getGegevens({ userId: c.userId }) : null) ?? (c.candidateId ? await getGegevens({ candidateId: c.candidateId }) : null)
  const r = gegevens?.record ?? null
  let iban: string | null = null
  try {
    iban = r ? leesIban(r) : null
  } catch {
    iban = null
  }
  const tussen = r?.infix?.trim()
  const g: GegevensVoorFormulier = {
    naam: tekennaamVan(c),
    achternaam: r?.lastName ? (tussen ? `${r.lastName}, ${tussen}` : r.lastName) : null,
    voornamen: r?.officialFirstNames ?? null,
    geboortedatum: r?.birthDate ?? c.employeeBirthDate,
    geboorteplaats: r?.birthPlace ?? null,
    adres: r?.addressLine ?? c.employeeAddress,
    postcodePlaats: [r?.postalCode ?? c.employeePostalCode, r?.city ?? c.employeeCity].filter(Boolean).join(' ') || null,
    iban,
    tenaamstelling: r?.accountHolder ?? null,
    indienst: c.startedOn,
    functie: c.jobTitle,
  }
  return renderToBuffer(<GegevensPdf g={g} merk={merk} />)
}

export function gegevensPdfNaam(c: GeneratedContract): string {
  return `${bestandsnaam(tekennaamVan(c)) || 'Medewerker'} - gegevens salarisadministratie.pdf`
}

/**
 * Het loonheffingsformulier van de Belastingdienst, als het bij de
 * bedrijfsgegevens staat. Lukt het niet om het te lezen (een beveiligde
 * pdf, of de opslag doet het even niet), dan ons eigen gegevensformulier:
 * liever een bruikbaar pakket dan geen pakket.
 */
async function loonheffingsformulier(): Promise<Uint8Array | null> {
  try {
    const doc = await huidigBedrijfsdocument('loonheffingsformulier')
    if (!doc) return null
    const bestand = await haalBedrijfsdocument(doc)
    return bestand ? new Uint8Array(bestand.data) : null
  } catch (fout) {
    console.error('[printpakket] loonheffingsformulier niet te lezen:', fout)
    return null
  }
}

/**
 * Alles om te printen voor het tekenen, in een bestand: het contract twee
 * keer (in tweevoud), de AVG-verklaring en het loonheffingsformulier van de
 * Belastingdienst. Is dat er niet, dan ons eigen gegevensformulier.
 */
export async function maakPrintpakket(c: GeneratedContract): Promise<Buffer> {
  const [contract, avg, officieel] = await Promise.all([maakContractPdf(c), maakAvgPdf(c), loonheffingsformulier()])
  const pakket = await PDFDocument.create()
  pakket.setTitle(`${tekennaamVan(c)} - documenten om te tekenen`)
  const voegToe = async (bron: Uint8Array) => {
    const doc = await PDFDocument.load(bron, { ignoreEncryption: true })
    const paginas = await pakket.copyPages(doc, doc.getPageIndices())
    for (const p of paginas) pakket.addPage(p)
  }
  for (const bron of [contract, contract, avg]) await voegToe(bron)
  let gelukt = false
  if (officieel) {
    try {
      await voegToe(officieel)
      gelukt = true
    } catch (fout) {
      console.error('[printpakket] loonheffingsformulier niet toe te voegen:', fout)
    }
  }
  if (!gelukt) await voegToe(await maakGegevensPdf(c))
  return Buffer.from(await pakket.save())
}

export function printpakketNaam(c: GeneratedContract): string {
  return `${bestandsnaam(tekennaamVan(c)) || 'Medewerker'} - documenten om te tekenen.pdf`
}
