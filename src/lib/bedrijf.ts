import { randomBytes, randomUUID } from 'node:crypto'
import { and, asc, desc, eq, ne } from 'drizzle-orm'
import { db } from '@/db'
import { companyDocuments, companyLocations, employerSettings } from '@/db/schema'
import type { CompanyDocument, CompanyLocation, EmployerSettings } from '@/db/schema'
import { bewaar, haal, wis, type Bestand } from './bestandsopslag'
import { metGeheugen } from './cache'
import { controleerTekst } from './sjablonen'

/* -------------------------------------------------------------------------
   Bedrijfsgegevens: de enige plek voor wie we zijn en waar we zitten.

   De naam in de kop van een document, het logo, het adres van de
   hoofdvestiging, de standplaatsen, het personeelshandboek: dat staat hier,
   en elk document haalt het hier op. Een nieuw adres of een nieuwe naam pas
   je dus op een plek aan, en niet in een sjabloon.

   Een opgesteld contract bewaart wel zijn eigen kopie van de kop: een
   getekend contract hoort niet te veranderen als we verhuizen.
   ------------------------------------------------------------------------- */

export class BedrijfError extends Error {}

export type Bedrijf = {
  werkgever: EmployerSettings
  /** Waar we statutair en feitelijk zitten: de kop van elk contract. */
  hoofdvestiging: CompanyLocation | null
  /** Actieve vestigingen, de hoofdvestiging eerst: de keuze voor een standplaats. */
  vestigingen: CompanyLocation[]
}

export async function getBedrijf(): Promise<Bedrijf | null> {
  const [werkgever] = await db.select().from(employerSettings).limit(1)
  if (!werkgever) return null
  const vestigingen = await listVestigingen()
  return { werkgever, hoofdvestiging: vestigingen.find((v) => v.isMain) ?? null, vestigingen }
}

/** De actieve vestigingen, de hoofdvestiging eerst. */
export async function listVestigingen(ook: { inactief?: boolean } = {}): Promise<CompanyLocation[]> {
  const rijen = await db
    .select()
    .from(companyLocations)
    .where(ook.inactief ? undefined : eq(companyLocations.active, true))
    .orderBy(desc(companyLocations.isMain), asc(companyLocations.name))
  return rijen
}

export async function getVestiging(id: string): Promise<CompanyLocation | null> {
  const [rij] = await db.select().from(companyLocations).where(eq(companyLocations.id, id)).limit(1)
  return rij ?? null
}

/** "Aalbekerweg 4, 6336 AD Hulsberg" */
export function adresRegel(v: Pick<CompanyLocation, 'addressLine' | 'postalCode' | 'city'>): string {
  return `${v.addressLine}, ${v.postalCode} ${v.city}`
}

export type MerkTekst = { naam: string; ondertitel: string; regel: string; website: string }

/**
 * De naam, ondertitel en website voor een kop of voetregel, voor pagina's en
 * mails die geen contract zijn. Een minuut onthouden: dit staat op elke
 * inlogpagina en verandert zelden. Gaat het ophalen mis, dan de bekende naam:
 * een inlogpagina mag niet stuk gaan op een bedrijfsnaam.
 */
export async function merkTekst(): Promise<MerkTekst> {
  try {
    return await metGeheugen('bedrijf:merk', async () => {
      const [w] = await db.select({ tradeName: employerSettings.tradeName, tagline: employerSettings.tagline, website: employerSettings.website }).from(employerSettings).limit(1)
      const naam = w?.tradeName || 'James Robinson'
      const ondertitel = w?.tagline || ''
      return { naam, ondertitel, regel: [naam, ondertitel].filter(Boolean).join(' '), website: w?.website || 'www.jamesrobinson.nl' }
    })
  } catch {
    return { naam: 'James Robinson', ondertitel: '', regel: 'James Robinson', website: 'www.jamesrobinson.nl' }
  }
}

/**
 * Wie er standaard namens de werkgever tekent, als losse namen. Bewaard als
 * een naam per regel; een oudere waarde als "A en B" of "A, B" werkt ook.
 */
export function standaardTekenaars(w: Pick<EmployerSettings, 'signatories'> | null): string[] {
  const bron = w?.signatories ?? ''
  const delen = bron.includes('\n') ? bron.split('\n') : bron.split(/,| en /)
  return delen.map((x) => x.trim()).filter(Boolean)
}

/**
 * Iemand wordt eigenaar of is het niet meer: dan tekent die standaard mee,
 * of niet meer. Zo staat een nieuwe eigenaar meteen aangevinkt bij een
 * contract. De laatste die standaard tekent, blijft staan: zonder
 * ondertekenaar kan er geen contract worden opgesteld.
 */
export async function zetStandaardTekenaar(naam: string, aan: boolean): Promise<void> {
  const schoon = naam.trim()
  if (!schoon) return
  const [w] = await db.select().from(employerSettings).limit(1)
  if (!w) return
  const nu = standaardTekenaars(w)
  const heeft = nu.some((n) => n.toLowerCase() === schoon.toLowerCase())
  let nieuw = nu
  if (aan && !heeft) nieuw = [...nu, schoon]
  if (!aan && heeft) nieuw = nu.filter((n) => n.toLowerCase() !== schoon.toLowerCase())
  if (nieuw === nu || nieuw.length === 0) return
  await db.update(employerSettings).set({ signatories: nieuw.join('\n'), updatedAt: new Date() }).where(eq(employerSettings.id, w.id))
}

/** "James Robinson Performance Agency": de naam zoals we hem voeren. */
export function merknaam(w: Pick<EmployerSettings, 'tradeName' | 'tagline'>): string {
  return [w.tradeName, w.tagline].filter((x) => x && x.trim()).join(' ')
}

const kort = (s: string | null | undefined, max = 200): string | null => {
  const t = (s ?? '').trim()
  return t === '' ? null : t.slice(0, max)
}

/* --- De bedrijfsgegevens zelf --------------------------------------------- */

export type BedrijfInvoer = {
  legalName: string
  tradeName: string
  tagline?: string | null
  kvkNumber?: string | null
  vatNumber?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  signatories: string
}

export async function slaBedrijfOp(b: BedrijfInvoer): Promise<void> {
  const leeg: string[] = []
  if (!b.legalName.trim()) leeg.push('de juridische naam')
  if (!b.tradeName.trim()) leeg.push('de naam in de kop')
  if (!b.signatories.trim()) leeg.push('wie er standaard tekent (vink minstens een eigenaar aan)')
  if (leeg.length > 0) throw new BedrijfError(`Vul ${leeg.join(', ')} in.`)
  if (b.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email.trim())) throw new BedrijfError('Het e-mailadres klopt niet.')
  if (b.kvkNumber && !/^\d{8}$/.test(b.kvkNumber.replace(/\s/g, ''))) throw new BedrijfError('Een KvK-nummer heeft acht cijfers.')

  const waarden = {
    legalName: b.legalName.trim(),
    tradeName: b.tradeName.trim(),
    tagline: kort(b.tagline),
    kvkNumber: kort(b.kvkNumber?.replace(/\s/g, '')),
    vatNumber: kort(b.vatNumber?.replace(/\s/g, '').toUpperCase()),
    email: kort(b.email),
    phone: kort(b.phone),
    website: kort(b.website),
    signatories: b.signatories.trim(),
    updatedAt: new Date(),
  }
  const [bestaand] = await db.select({ id: employerSettings.id }).from(employerSettings).limit(1)
  if (bestaand) await db.update(employerSettings).set(waarden).where(eq(employerSettings.id, bestaand.id))
  else await db.insert(employerSettings).values(waarden)
}

/* --- Vestigingen ------------------------------------------------------------ */

export type VestigingInvoer = {
  id?: string | null
  name: string
  addressLine: string
  postalCode: string
  city: string
  phone?: string | null
  email?: string | null
  officeHours?: string | null
  isMain?: boolean
}

function schoonPostcode(p: string): string {
  const m = /^(\d{4})\s*([a-zA-Z]{2})$/.exec(p.trim())
  return m ? `${m[1]} ${m[2]!.toUpperCase()}` : p.trim()
}

export async function slaVestigingOp(v: VestigingInvoer): Promise<string> {
  const leeg: string[] = []
  if (!v.name.trim()) leeg.push('de naam')
  if (!v.addressLine.trim()) leeg.push('het adres')
  if (!v.postalCode.trim()) leeg.push('de postcode')
  if (!v.city.trim()) leeg.push('de plaats')
  if (leeg.length > 0) throw new BedrijfError(`Vul ${leeg.join(', ')} in.`)

  const waarden = {
    name: v.name.trim(),
    addressLine: v.addressLine.trim(),
    postalCode: schoonPostcode(v.postalCode),
    city: v.city.trim(),
    phone: kort(v.phone),
    email: kort(v.email),
    officeHours: kort(v.officeHours),
    updatedAt: new Date(),
  }

  return db.transaction(async (tx) => {
    let id = v.id ?? null
    if (id) {
      const [oud] = await tx.select().from(companyLocations).where(eq(companyLocations.id, id)).limit(1)
      if (!oud) throw new BedrijfError('Deze vestiging bestaat niet meer.')
      if (oud.isMain && v.isMain === false) {
        throw new BedrijfError('Maak eerst een andere vestiging de hoofdvestiging.')
      }
      await tx.update(companyLocations).set(waarden).where(eq(companyLocations.id, id))
    } else {
      const [nieuw] = await tx.insert(companyLocations).values(waarden).returning({ id: companyLocations.id })
      id = nieuw!.id
    }
    // De eerste vestiging is vanzelf de hoofdvestiging; er is er altijd precies een.
    const [hoofd] = await tx.select({ id: companyLocations.id }).from(companyLocations).where(eq(companyLocations.isMain, true)).limit(1)
    if (v.isMain || !hoofd) {
      await tx.update(companyLocations).set({ isMain: false }).where(and(eq(companyLocations.isMain, true), ne(companyLocations.id, id)))
      await tx.update(companyLocations).set({ isMain: true, active: true }).where(eq(companyLocations.id, id))
    }
    return id
  })
}

/** Een vestiging die we niet meer hebben. Oude contracten houden hun tekst; alleen kiezen kan niet meer. */
export async function sluitVestiging(id: string): Promise<void> {
  const v = await getVestiging(id)
  if (!v) throw new BedrijfError('Deze vestiging bestaat niet meer.')
  if (v.isMain) throw new BedrijfError('De hoofdvestiging kun je niet sluiten. Maak eerst een andere vestiging de hoofdvestiging.')
  await db.update(companyLocations).set({ active: false, updatedAt: new Date() }).where(eq(companyLocations.id, id))
}

/* --- Logo ------------------------------------------------------------------- */

export const LOGO_MAX_BYTES = 2 * 1024 * 1024
/** Png of jpg: dat kan een pdf tonen. Een svg niet. */
export const LOGO_TYPES = ['image/png', 'image/jpeg'] as const

export async function slaLogoOp(data: Buffer, contentType: string): Promise<void> {
  if (!(LOGO_TYPES as readonly string[]).includes(contentType)) {
    throw new BedrijfError('Een logo moet een png of jpg zijn. Exporteer een svg als png met een transparante achtergrond.')
  }
  if (data.length === 0) throw new BedrijfError('Het bestand is leeg.')
  if (data.length > LOGO_MAX_BYTES) throw new BedrijfError('Het logo is groter dan 2 MB. Een png van 1000 pixels breed is ruim genoeg.')
  const [w] = await db.select().from(employerSettings).limit(1)
  if (!w) throw new BedrijfError('Vul eerst de bedrijfsgegevens in.')
  const sleutel = `bedrijf/logo-${randomUUID()}`
  await bewaar(sleutel, data, contentType)
  await db.update(employerSettings).set({ logoKey: sleutel, logoContentType: contentType, updatedAt: new Date() }).where(eq(employerSettings.id, w.id))
  if (w.logoKey) await wis(w.logoKey).catch(() => undefined)
}

export async function wisLogo(): Promise<void> {
  const [w] = await db.select().from(employerSettings).limit(1)
  if (!w?.logoKey) return
  await db.update(employerSettings).set({ logoKey: null, logoContentType: null, updatedAt: new Date() }).where(eq(employerSettings.id, w.id))
  await wis(w.logoKey).catch(() => undefined)
}

/** Het logo, of niets: een document zonder logo is beter dan een document dat niet opent. */
export async function haalLogo(w: Pick<EmployerSettings, 'logoKey'> | null): Promise<Bestand | null> {
  if (!w?.logoKey) return null
  try {
    return await haal(w.logoKey)
  } catch (fout) {
    console.error('[bedrijf] logo niet te lezen:', fout)
    return null
  }
}

/* --- Bedrijfsdocumenten: personeelshandboek en loonheffingsformulier -------- */

/**
 * De documenten van het bedrijf zelf. Elke upload is een nieuwe versie; de
 * laatste geldt. Het personeelshandboek hoort bij een contract (de versie
 * die de werknemer ontving); het loonheffingsformulier is het model van de
 * Belastingdienst, dat elk jaar een nieuwe versie krijgt.
 */
export const BEDRIJFSDOCUMENTEN = {
  personeelshandboek: { label: 'Personeelshandboek', bestandsnaam: 'Personeelshandboek.pdf' },
  loonheffingsformulier: { label: 'Opgaaf gegevens voor de loonheffingen', bestandsnaam: 'Opgaaf gegevens voor de loonheffingen.pdf' },
} as const
export type BedrijfsdocumentSoort = keyof typeof BEDRIJFSDOCUMENTEN

export const HANDBOEK_MAX_BYTES = 5 * 1024 * 1024

export async function voegBedrijfsdocumentToe(
  kind: BedrijfsdocumentSoort,
  bestand: { data: Buffer; contentType: string; filename: string | null },
  note: string | null,
  doorUserId: string | null,
): Promise<CompanyDocument> {
  const { label, bestandsnaam } = BEDRIJFSDOCUMENTEN[kind]
  if (bestand.contentType !== 'application/pdf') throw new BedrijfError(`${label}: alleen een pdf.`)
  if (bestand.data.length === 0) throw new BedrijfError('Het bestand is leeg.')
  if (bestand.data.length > HANDBOEK_MAX_BYTES) {
    throw new BedrijfError(`${label}: het bestand is groter dan 5 MB. Exporteer de pdf met kleinere afbeeldingen ("geoptimaliseerd voor web").`)
  }
  const id = randomUUID()
  const sleutel = `bedrijf/${kind === 'personeelshandboek' ? 'handboek' : kind}/${id}.pdf`
  await bewaar(sleutel, bestand.data, 'application/pdf')
  const [doc] = await db
    .insert(companyDocuments)
    .values({
      id,
      kind,
      filename: kort(bestand.filename, 160) ?? bestandsnaam,
      contentType: 'application/pdf',
      bytes: bestand.data.length,
      storageKey: sleutel,
      token: randomBytes(24).toString('base64url'),
      note: kort(note, 120),
      uploadedByUserId: doorUserId,
    })
    .returning()
  return doc!
}

export async function voegHandboekToe(bestand: { data: Buffer; contentType: string; filename: string | null }, note: string | null, doorUserId: string | null): Promise<CompanyDocument> {
  return voegBedrijfsdocumentToe('personeelshandboek', bestand, note, doorUserId)
}

/** De geldende versie: de laatst geuploade. */
export async function huidigBedrijfsdocument(kind: BedrijfsdocumentSoort): Promise<CompanyDocument | null> {
  const [doc] = await db.select().from(companyDocuments).where(eq(companyDocuments.kind, kind)).orderBy(desc(companyDocuments.createdAt)).limit(1)
  return doc ?? null
}

export async function huidigHandboek(): Promise<CompanyDocument | null> {
  return huidigBedrijfsdocument('personeelshandboek')
}

export async function listBedrijfsdocumenten(kind: BedrijfsdocumentSoort): Promise<CompanyDocument[]> {
  return db.select().from(companyDocuments).where(eq(companyDocuments.kind, kind)).orderBy(desc(companyDocuments.createdAt))
}

export async function listHandboeken(): Promise<CompanyDocument[]> {
  return listBedrijfsdocumenten('personeelshandboek')
}

export async function getBedrijfsdocument(id: string): Promise<CompanyDocument | null> {
  const [doc] = await db.select().from(companyDocuments).where(eq(companyDocuments.id, id)).limit(1)
  return doc ?? null
}

/** Via de deelbare link. Een onbekend of misvormd token is gewoon niets. */
export async function handboekViaToken(token: string): Promise<CompanyDocument | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null
  const [doc] = await db.select().from(companyDocuments).where(eq(companyDocuments.token, token)).limit(1)
  return doc ?? null
}

export async function haalBedrijfsdocument(doc: CompanyDocument): Promise<Bestand | null> {
  return haal(doc.storageKey)
}

/** De deelbare link: voor het handboek de vertrouwde link, voor de rest een algemene. */
export function handboekPad(doc: Pick<CompanyDocument, 'token' | 'kind'> | Pick<CompanyDocument, 'token'>): string {
  return 'kind' in doc && doc.kind !== 'personeelshandboek' ? `/document/${doc.token}` : `/personeelshandboek/${doc.token}`
}

/* --- De kop van een contract, bewaard bij het contract ---------------------- */

export type WerkgeverKop = {
  legalName: string
  tradeName: string
  tagline: string | null
  addressLine: string
  postalCode: string
  city: string
  kvkNumber: string | null
}

export function werkgeverKop(b: Bedrijf): WerkgeverKop {
  const h = b.hoofdvestiging
  return {
    legalName: b.werkgever.legalName,
    tradeName: b.werkgever.tradeName,
    tagline: b.werkgever.tagline,
    addressLine: h?.addressLine ?? '',
    postalCode: h?.postalCode ?? '',
    city: h?.city ?? '',
    kvkNumber: b.werkgever.kvkNumber,
  }
}

/* --- AVG-verklaring ----------------------------------------------------------- */

/**
 * De standaardtekst van de AVG-verklaring, tot jullie er een eigen versie van
 * maken. Zelfde opbouw als een contractsjabloon: "## " is een kop, een lege
 * regel een nieuwe alinea, "- " een opsomming en "[ ] " een vakje om aan te
 * kruisen.
 *
 * LET OP: een opzet, geen juridisch advies. Laat hem nakijken.
 */
export const STANDAARD_AVG_TEKST = `## Waarom deze verklaring
{{werkgever_naam}} (hierna: de werkgever) verwerkt persoonsgegevens van {{werknemer_naam}} (hierna: de werknemer). De Algemene Verordening Gegevensbescherming (AVG) verplicht de werkgever de werknemer te vertellen welke gegevens dat zijn, waarvoor ze worden gebruikt, met wie ze worden gedeeld en hoe lang ze worden bewaard. Dat staat in deze verklaring. Deze verklaring hoort als bijlage bij de arbeidsovereenkomst.

## Welke gegevens
- Naam, adres, woonplaats, geboortedatum, telefoonnummer en e-mailadres.
- Het burgerservicenummer en een kopie van het identiteitsbewijs.
- Het bankrekeningnummer.
- De gegevens van de loonheffingsverklaring.
- Gegevens over de arbeidsovereenkomst: functie, salaris, werktijden, verlof en verzuim.
- Gegevens over gesprekken, beoordelingen, opleidingen en ontwikkeling.
- Gegevens over het gebruik van bedrijfsmiddelen en systemen, voor zover dat nodig is voor beheer en beveiliging.

## Waarvoor en op welke grond
De werkgever gebruikt deze gegevens voor de uitvoering van de arbeidsovereenkomst, waaronder de salarisadministratie; voor wettelijke verplichtingen, zoals de loonaangifte, de identificatieplicht en de re-integratie bij ziekte; en voor het personeelsbeheer en de beveiliging van systemen en gegevens van de werkgever en haar klanten. De grondslag is de uitvoering van de arbeidsovereenkomst, een wettelijke verplichting of het gerechtvaardigd belang van de werkgever bij een goede bedrijfsvoering.

Bij ziekte vraagt de werkgever niet naar de aard of de oorzaak. Medische gegevens worden alleen verwerkt door de bedrijfsarts of de arbodienst.

## Met wie de gegevens worden gedeeld
- Het administratiekantoor dat de salarisadministratie verzorgt.
- De Belastingdienst, het UWV, de arbodienst en verzekeraars, voor zover dat wettelijk verplicht is of nodig voor de uitvoering van de arbeidsovereenkomst.
- Leveranciers van systemen die de werkgever gebruikt, zoals het personeelsportaal. Met hen heeft de werkgever afspraken gemaakt over de bescherming van de gegevens.

De werkgever verkoopt geen persoonsgegevens. Worden gegevens buiten de Europese Economische Ruimte verwerkt, dan zorgt de werkgever voor de waarborgen die de AVG daarvoor eist.

## Hoe lang
- De loonadministratie, de loonheffingsverklaring en de kopie van het identiteitsbewijs: zo lang als de fiscale bewaarplicht voorschrijft, in de regel vijf tot zeven jaar na het einde van het dienstverband.
- Overige personeelsgegevens: tot twee jaar na het einde van het dienstverband, tenzij een langere termijn wettelijk verplicht is.

## Beveiliging
Gevoelige gegevens, zoals het bankrekeningnummer en de kopie van het identiteitsbewijs, worden versleuteld opgeslagen. Alleen wie de gegevens voor het werk nodig heeft, kan ze inzien.

## Rechten van de werknemer
De werknemer kan de werkgever vragen de eigen gegevens in te zien, te verbeteren, aan te vullen, te verwijderen of het gebruik ervan te beperken, en kan bezwaar maken tegen een verwerking. Een verzoek gaat naar {{werkgever_email}}. Komen werkgever en werknemer er samen niet uit, dan kan de werknemer een klacht indienen bij de Autoriteit Persoonsgegevens.

## Foto's en video's
De werkgever laat graag zien wie er bij {{werkgever_merk}} werkt, bijvoorbeeld met een foto en naam op de website en op sociale media. Daarvoor is toestemming nodig. Die toestemming is vrijwillig: wie nee zegt, merkt daar in het werk niets van. Een gegeven toestemming kan altijd worden ingetrokken; de werkgever haalt het beeld dan zo snel als redelijkerwijs mogelijk weg.

[ ] Ja, de werkgever mag mijn naam, functie en foto's of video's van mij gebruiken op de website en op sociale media van {{werkgever_merk}}.
[ ] Nee, liever niet.

## Ondertekening
De werknemer verklaart deze verklaring te hebben ontvangen en gelezen.`

/** Wat er in de AVG-verklaring tussen {{ }} kan staan. */
export const AVG_PLAATSHOUDERS: Record<string, string> = {
  werknemer_naam: 'Volledige naam van de werknemer',
  werkgever_naam: 'Juridische naam: James Robinson B.V.',
  werkgever_merk: 'Naam zoals we hem voeren: James Robinson',
  werkgever_email: 'E-mailadres uit de bedrijfsgegevens',
}

export function avgTekst(w: Pick<EmployerSettings, 'avgText'> | null): string {
  return w?.avgText?.trim() || STANDAARD_AVG_TEKST
}

export async function slaAvgTekstOp(tekst: string | null): Promise<void> {
  const [w] = await db.select({ id: employerSettings.id }).from(employerSettings).limit(1)
  if (!w) throw new BedrijfError('Vul eerst de bedrijfsgegevens in.')
  const schoon = (tekst ?? '').replace(/\r\n/g, '\n').trim()
  const fouten = controleerTekst(schoon, { plaatshouders: AVG_PLAATSHOUDERS, voorwaarden: {} })
  if (fouten.length > 0) throw new BedrijfError(fouten.join(' '))
  // De standaardtekst bewaren we niet als eigen tekst: dan krijg je verbeteringen in de standaard vanzelf mee.
  await db
    .update(employerSettings)
    .set({ avgText: schoon === '' || schoon === STANDAARD_AVG_TEKST ? null : schoon, updatedAt: new Date() })
    .where(eq(employerSettings.id, w.id))
}
