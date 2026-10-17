import { zipSync } from 'fflate'
import { maakXlsx } from './xlsx'
import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { candidates, contacts, employerSettings, employmentContracts, users } from '@/db/schema'
import type { GeneratedContract, PersonalRecord } from '@/db/schema'
import { listContracten, invoerUit, tekennaamVan, urenTekst, deeltijdfactor } from './contracten'
import { getGegevens, leesDocument, leesIban, dossierPunten, salarisPakket, DOCUMENT_LABELS, type DocumentSoort, type Gegevens } from './persoonsgegevens'
import { huidigSalaris } from './personeel'
import { formatCents } from './money'
import { formatDateLong } from './dates'
import { maakOverzichtPdf, type Sectie } from './pdf/OverzichtPdf'
import { maakContractPdf, titelVan } from './pdf/ContractPdf'

/* -------------------------------------------------------------------------
   De salarisadministratie: de map met alles wat zij nodig hebben, de map
   voor de eigen administratie, en het overzicht van alle medewerkers.

   Twee mappen, met opzet verschillend:
   - salaris: gegevensoverzicht, getekend contract, loonheffingsformulier en
     kopie ID. Niet meer dan nodig: de AVG-verklaring en het noodcontact zijn
     van ons, niet van het administratiekantoor.
   - eigen: alles wat er in het dossier staat.

   Elk document dat in een map gaat, wordt geopend via leesDocument: wie de
   map downloadt, staat dus per document in het logboek.
   ------------------------------------------------------------------------- */

export type DossierVan = { kandidaatId: string } | { userId: string }
export type MapSoort = 'salaris' | 'eigen'

const SALARIS_DOCUMENTEN: DocumentSoort[] = ['contract', 'loonheffing', 'id_kopie']
const EIGEN_DOCUMENTEN: DocumentSoort[] = ['contract', 'avg_verklaring', 'loonheffing', 'id_kopie', 'overig']

/** Alles over een persoon wat de map en de mail nodig hebben. */
export type Persoon = {
  /** Roepnaam en achternaam: Daan Voncken. */
  naam: string
  roepnaam: string
  gegevens: Gegevens | null
  contract: GeneratedContract | null
  kandidaatId: string | null
  userId: string | null
}

/** Het contract dat telt: het nieuwste getekende, anders het nieuwste definitieve, anders het nieuwste. */
function kiesContract(lijst: GeneratedContract[]): GeneratedContract | null {
  const definitief = lijst.filter((c) => c.soort === 'definitief')
  return definitief.find((c) => c.signedOn) ?? definitief[0] ?? lijst[0] ?? null
}

export async function getPersoon(van: DossierVan): Promise<Persoon | null> {
  if ('kandidaatId' in van) {
    const [k] = await db.select().from(candidates).where(eq(candidates.id, van.kandidaatId)).limit(1)
    if (!k) return null
    const [gegevens, contracten] = await Promise.all([
      getGegevens(k.hiredUserId ? { userId: k.hiredUserId } : { candidateId: k.id }),
      listContracten({ candidateId: k.id }),
    ])
    const contract = kiesContract(contracten)
    return {
      naam: contract ? tekennaamVan(contract) : k.name,
      roepnaam: k.firstName ?? k.name.split(' ')[0] ?? '',
      gegevens,
      contract,
      kandidaatId: k.id,
      userId: k.hiredUserId,
    }
  }
  const [u] = await db.select().from(users).where(eq(users.id, van.userId)).limit(1)
  if (!u) return null
  const [k] = await db.select({ id: candidates.id }).from(candidates).where(eq(candidates.hiredUserId, u.id)).limit(1)
  const [gegevens, eigen, viaKandidaat] = await Promise.all([
    getGegevens({ userId: u.id }),
    listContracten({ userId: u.id }),
    k ? listContracten({ candidateId: k.id }) : Promise.resolve([]),
  ])
  const contract = kiesContract([...eigen, ...viaKandidaat].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  const naam = (u.name ?? '').trim() || u.email
  return { naam, roepnaam: u.firstName ?? naam.split(' ')[0] ?? '', gegevens, contract, kandidaatId: k?.id ?? null, userId: u.id }
}

/* ------------------------------ Het overzicht ----------------------------- */

const GESLACHT: Record<string, string> = { man: 'Man', vrouw: 'Vrouw', x: 'X' }

function ibanVan(r: PersonalRecord | null): string | null {
  if (!r) return null
  try {
    return leesIban(r)
  } catch {
    return 'Niet te lezen met de huidige sleutel'
  }
}

/** Het contract in regels, voor het overzicht. */
export function contractRegels(c: GeneratedContract | null): [string, string | null][] {
  if (!c) return [['Contract', null]]
  const i = invoerUit(c)
  const salaris = `${formatCents(c.grossMonthlyCents)} bruto per maand${c.salaryScaleName && c.salaryStep ? ` (schaal ${c.salaryScaleName}, trede ${c.salaryStep})` : ''}`
  const fulltime =
    i.fulltimeMaandCents && i.fulltimeUrenKwartier && c.hoursWeekQuarters < i.fulltimeUrenKwartier
      ? `${formatCents(i.fulltimeMaandCents)} bij ${urenTekst(i.fulltimeUrenKwartier)} uur; deeltijdfactor ${deeltijdfactor(c.hoursWeekQuarters, i.fulltimeUrenKwartier)}`
      : null
  return [
    ['Functie', c.jobTitle],
    ['Soort contract', `${titelVan(c)}${c.soort === 'definitief' ? '' : ' (pro forma)'}`],
    ['Ingangsdatum', formatDateLong(c.startedOn)],
    ['Einddatum', c.endsOn ? formatDateLong(c.endsOn) : c.contractType === 'onbepaalde_tijd' ? 'Onbepaalde tijd' : null],
    ['Proeftijd', c.probationMonths > 0 ? `${c.probationMonths} maand${c.probationMonths > 1 ? 'en' : ''}` : 'Geen'],
    ['Uren per week', urenTekst(c.hoursWeekQuarters)],
    ['Salaris', salaris],
    ...(fulltime ? ([['Bij een volledige werkweek', fulltime]] as [string, string][]) : []),
    ['Vakantietoeslag', `${c.holidayAllowanceBp / 100}%`],
    ...(c.opAllowanceCents > 0 ? ([['OP-toeslag', `${formatCents(c.opAllowanceCents)} per maand`]] as [string, string][]) : []),
    ['Vakantie-uren per jaar', c.holidayHoursPerYear ? String(c.holidayHoursPerYear) : null],
    ['Getekend op', c.signedOn ? formatDateLong(c.signedOn) : null],
  ]
}

function secties(p: Persoon, voor: MapSoort): Sectie[] {
  const r = p.gegevens?.record ?? null
  const volledig = r ? [r.officialFirstNames, r.infix, r.lastName].filter(Boolean).join(' ') : null
  const lijst: Sectie[] = [
    {
      titel: 'Persoon',
      regels: [
        ['Naam (zoals in het paspoort)', volledig],
        ['Roepnaam', p.roepnaam],
        ['Geslacht', r?.gender ? GESLACHT[r.gender] : null],
        ['Geboortedatum', r?.birthDate ? formatDateLong(r.birthDate) : null],
        ['Geboorteplaats', r?.birthPlace],
        ['Nationaliteit', r?.nationality],
      ],
    },
    {
      titel: 'Adres en contact',
      regels: [
        ['Adres', r?.addressLine],
        ['Postcode en woonplaats', [r?.postalCode, r?.city].filter(Boolean).join(' ') || null],
        ['Privé e-mailadres', r?.privateEmail],
        ['Mobiel nummer', r?.privatePhone],
      ],
    },
    {
      titel: 'Uitbetaling',
      regels: [
        ['IBAN', ibanVan(r)],
        ['Ten name van', r?.accountHolder],
      ],
    },
    { titel: 'Dienstverband', regels: contractRegels(p.contract) },
  ]
  if (voor === 'eigen') {
    lijst.push({
      titel: 'Bij nood bellen',
      regels: [
        ['Naam', r?.emergencyName],
        ['Relatie', r?.emergencyRelation],
        ['Telefoon', r?.emergencyPhone],
      ],
    })
  }
  return lijst
}

/* ------------------------------ De map ------------------------------------ */

const EXTENSIE: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }

/** Alleen tekens die elk systeem in een bestandsnaam slikt. */
function bestandsnaam(naam: string): string {
  return naam
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w .()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Map = { bestandsnaam: string; zip: Uint8Array; documenten: string[] }

/**
 * De map als zip: eerst het gegevensoverzicht, dan de documenten, genummerd
 * zodat ze in die volgorde in de map staan. In de eigen map ook het contract
 * zoals het portaal het opstelde, voor als er nog geen scan is.
 */
export async function maakMap(van: DossierVan, voor: MapSoort, doorUserId: string): Promise<Map | null> {
  const p = await getPersoon(van)
  if (!p) return null
  const soorten = voor === 'salaris' ? SALARIS_DOCUMENTEN : EIGEN_DOCUMENTEN
  const docs = (p.gegevens?.documenten ?? []).filter((d) => soorten.includes(d.kind)).sort((a, b) => soorten.indexOf(a.kind) - soorten.indexOf(b.kind))

  const naam = bestandsnaam(p.naam) || 'Medewerker'
  const bestanden: Record<string, Uint8Array> = {}
  const inhoud: string[] = []
  let nr = 2
  const telling: Partial<Record<DocumentSoort, number>> = {}
  for (const d of docs) telling[d.kind] = (telling[d.kind] ?? 0) + 1
  const gezien: Partial<Record<DocumentSoort, number>> = {}

  for (const d of docs) {
    const bestand = await leesDocument(d.id, doorUserId)
    if (!bestand) continue
    gezien[d.kind] = (gezien[d.kind] ?? 0) + 1
    const label = DOCUMENT_LABELS[d.kind] + ((telling[d.kind] ?? 0) > 1 ? ` ${gezien[d.kind]}` : '')
    const ext = EXTENSIE[bestand.contentType] ?? 'bin'
    bestanden[`${String(nr).padStart(2, '0')} ${naam} - ${label}.${ext}`] = new Uint8Array(bestand.data)
    inhoud.push(label)
    nr++
  }
  if (voor === 'eigen' && p.contract) {
    bestanden[`${String(nr).padStart(2, '0')} ${naam} - contract zoals opgesteld.pdf`] = new Uint8Array(await maakContractPdf(p.contract))
    inhoud.push('Contract zoals opgesteld in het portaal (zonder handtekeningen)')
  }

  const overzicht = await maakOverzichtPdf({
    eyebrow: voor === 'salaris' ? 'Voor de salarisadministratie' : 'Eigen administratie',
    naam: p.naam,
    ondertitel: voor === 'salaris' ? 'Gegevens voor de loonadministratie' : 'Alles uit het dossier, voor de eigen administratie',
    secties: secties(p, voor),
    documenten: inhoud,
    gemaakt: formatDateLong(new Date()),
  })
  bestanden[`01 ${naam} - gegevensoverzicht.pdf`] = new Uint8Array(overzicht)

  const map = voor === 'salaris' ? `${naam} - salarisadministratie` : `${naam} - dossier`
  const metMap: Record<string, Uint8Array> = {}
  for (const [k, v] of Object.entries(bestanden)) metMap[`${map}/${k}`] = v
  // Pdf's en foto's zijn al ingepakt; nog eens comprimeren kost tijd en levert niets op.
  return { bestandsnaam: `${map}.zip`, zip: zipSync(metMap, { level: 0 }), documenten: ['Gegevensoverzicht', ...inhoud] }
}

/* ------------------------------ De contactpersoon -------------------------- */

export type SalarisContact = { id: string; naam: string; voornaam: string; email: string | null; bedrijf: string | null }

export async function getSalarisContact(): Promise<SalarisContact | null> {
  const [w] = await db.select({ id: employerSettings.payrollContactId }).from(employerSettings).limit(1)
  if (!w?.id) return null
  const [c] = await db.select().from(contacts).where(eq(contacts.id, w.id)).limit(1)
  if (!c) return null
  return { id: c.id, naam: c.name, voornaam: c.firstName ?? c.name.split(' ')[0] ?? '', email: c.email, bedrijf: c.companyName }
}

export async function zetSalarisContact(contactId: string | null): Promise<void> {
  const [w] = await db.select({ id: employerSettings.id }).from(employerSettings).limit(1)
  if (!w) throw new Error('Vul eerst de bedrijfsgegevens in.')
  await db.update(employerSettings).set({ payrollContactId: contactId, updatedAt: new Date() }).where(eq(employerSettings.id, w.id))
}

/** Wie je kunt kiezen: iedereen in Contacten met een e-mailadres. */
export async function listContactenMetEmail(): Promise<{ id: string; label: string }[]> {
  const rijen = await db.select({ id: contacts.id, naam: contacts.name, email: contacts.email, bedrijf: contacts.companyName }).from(contacts)
  return rijen
    .filter((r) => r.email)
    .map((r) => ({ id: r.id, label: `${r.naam}${r.bedrijf ? `, ${r.bedrijf}` : ''} (${r.email})` }))
    .sort((a, b) => a.label.localeCompare(b.label, 'nl-NL'))
}

/** Het contract in het kort, voor de mail. */
export function samenvattingVoorMail(c: GeneratedContract | null): string | null {
  if (!c) return null
  return contractRegels(c)
    .filter(([label, w]) => w && ['Functie', 'Ingangsdatum', 'Einddatum', 'Uren per week', 'Salaris', 'Bij een volledige werkweek'].includes(label))
    .map(([label, w]) => `- ${label}: ${w}`)
    .join('\n')
}

/* ------------------------------ Excel ------------------------------------- */

const datum = (d: Date | null | undefined) => (d ? d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null)

/**
 * Alle medewerkers in één overzicht, voor de eigen administratie en de
 * accountant. Geen IBAN of BSN: die horen in de map per persoon, niet in een
 * spreadsheet die makkelijk rondgaat.
 */
export async function medewerkersXlsx(): Promise<Uint8Array> {
  const team = await db
    .select()
    .from(users)
    .where(inArray(users.role, ['staff', 'admin']))
  const kop = [
    'Naam',
    'Roepnaam',
    'Functie',
    'Afdeling',
    'E-mail (werk)',
    'Telefoon (werk)',
    'Privé e-mailadres',
    'Mobiel nummer (privé)',
    'In dienst sinds',
    'Uit dienst per',
    'Soort contract',
    'Contract tot',
    'Uren per week',
    'Bruto per maand',
    'Geboortedatum',
    'Woonplaats',
    'Dossier compleet',
    'Doorgegeven aan salarisadministratie',
  ]
  const rijen: (string | number | null)[][] = []
  for (const u of team.sort((a, b) => (a.lastName ?? a.name ?? '').localeCompare(b.lastName ?? b.name ?? '', 'nl-NL'))) {
    const [contract] = await db.select().from(employmentContracts).where(eq(employmentContracts.userId, u.id)).orderBy(desc(employmentContracts.startedOn)).limit(1)
    const [salaris, gegevens] = await Promise.all([huidigSalaris(u.id), getGegevens({ userId: u.id })])
    const r = gegevens?.record ?? null
    const punten = dossierPunten(gegevens)
    const soort = contract ? { bepaalde_tijd: 'Bepaalde tijd', onbepaalde_tijd: 'Onbepaalde tijd', oproep: 'Oproep', stage: 'Stage', zzp: 'Opdracht' }[contract.type] ?? contract.type : null
    const uren = contract?.hoursPerWeekQuarters ?? u.contractHoursPerWeekQuarters
    rijen.push([
      (u.name ?? '').trim() || u.email,
      u.firstName,
      u.jobTitle,
      u.department,
      u.email,
      u.mobile ?? u.phone,
      r?.privateEmail ?? null,
      r?.privatePhone ?? null,
      datum(u.startedOn),
      datum(u.endedOn),
      soort,
      datum(contract?.endsOn),
      uren ? uren / 100 : null,
      salaris ? salaris.grossMonthlyCents / 100 : null,
      datum(r?.birthDate),
      r?.city ?? u.city,
      `${punten.filter((p) => p.klaar).length} van ${punten.length}`,
      datum(r?.doorgegevenOp),
    ])
  }
  return maakXlsx(kop, rijen)
}

