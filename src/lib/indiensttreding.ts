import type { Candidate, GeneratedContract } from '@/db/schema'
import { listContracten } from './contracten'
import { getGegevens, type Gegevens } from './persoonsgegevens'
import { volledigeNaam } from './namen'

/* -------------------------------------------------------------------------
   Indiensttreding: van kandidaat met een aanbod naar collega, in vijf stappen.

   1. Persoonsgegevens: wat er in het contract komt.
   2. Contract: definitief en kloppend.
   3. Printen: alles wat getekend moet worden, in een pakket.
   4. Getekende stukken: terug in het portaal, en wat er nog mist.
   5. In dienst nemen: de kandidaat wordt collega.

   Elke stap is klaar als het portaal ziet dat hij gedaan is, niet omdat
   iemand een vinkje zette. Zo staat de lijst nooit groen terwijl het
   getekende contract nog in iemands tas zit.
   ------------------------------------------------------------------------- */

export type StapSleutel = 'gegevens' | 'contract' | 'printen' | 'stukken' | 'aanname'

export type Stap = { sleutel: StapSleutel; nummer: number; titel: string; klaar: boolean }

/** Een ding dat bij het tekenen terug moet komen. */
export type Stuk = {
  sleutel: 'getekend' | 'contract' | 'avg_verklaring' | 'loonheffing' | 'id_kopie' | 'iban' | 'handboek'
  titel: string
  klaar: boolean
  toelichting?: string
}

export type Indiensttreding = {
  contract: GeneratedContract | null
  gegevens: Gegevens | null
  stappen: Stap[]
  /** De eerste stap die nog niet klaar is; na de aanname: null. */
  huidige: StapSleutel | null
  stukken: Stuk[]
  /** Wat er in de persoonsgegevens nog ontbreekt voor het contract. */
  gegevensMist: string[]
  /** De persoonsgegevens wijken af van wat er in het contract staat. */
  contractVerouderd: boolean
  aangenomen: boolean
}

/** Het contract waar het om gaat: het nieuwste definitieve, anders het nieuwste pro forma. */
export function kiesContract(contracten: GeneratedContract[]): GeneratedContract | null {
  return contracten.find((c) => c.soort === 'definitief') ?? contracten[0] ?? null
}

export async function getIndiensttreding(k: Candidate): Promise<Indiensttreding> {
  const aangenomen = k.status === 'aangenomen' && !!k.hiredUserId
  const [contracten, gegevens] = await Promise.all([
    listContracten({ candidateId: k.id }),
    getGegevens(aangenomen ? { userId: k.hiredUserId! } : { candidateId: k.id }),
  ])
  const contract = kiesContract(contracten)
  const r = gegevens?.record ?? null
  const heeft = (kind: string) => !!gegevens?.documenten.some((d) => d.kind === kind)

  const gegevensMist: string[] = []
  if (!r?.officialFirstNames?.trim()) gegevensMist.push('voornamen zoals in het paspoort')
  if (!r?.lastName?.trim()) gegevensMist.push('achternaam')
  if (!r?.birthDate) gegevensMist.push('geboortedatum')
  if (!r?.addressLine?.trim() || !r?.postalCode?.trim() || !r?.city?.trim()) gegevensMist.push('adres')

  const naamNu = r ? volledigeNaam({ firstName: r.officialFirstNames, infix: r.infix, lastName: r.lastName }) : ''
  const contractVerouderd =
    !!contract &&
    !contract.signedOn &&
    !!r &&
    gegevensMist.length === 0 &&
    (contract.employeeName !== naamNu ||
      (contract.employeeAddress ?? '') !== (r.addressLine ?? '') ||
      (contract.employeePostalCode ?? '') !== (r.postalCode ?? '') ||
      (contract.employeeCity ?? '') !== (r.city ?? '') ||
      (contract.employeeBirthDate?.toDateString() ?? '') !== (r.birthDate?.toDateString() ?? ''))

  const stukken: Stuk[] = [
    {
      sleutel: 'getekend',
      titel: 'Datum van ondertekening',
      klaar: !!contract?.signedOn,
      toelichting: contract?.signedOn ? `Getekend op ${contract.signedOn.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}.` : undefined,
    },
    { sleutel: 'contract', titel: 'Getekend contract', klaar: heeft('contract'), toelichting: 'De scan met alle handtekeningen en parafen.' },
    { sleutel: 'avg_verklaring', titel: 'Getekende AVG-verklaring', klaar: heeft('avg_verklaring') },
    { sleutel: 'loonheffing', titel: 'Getekend loonheffingsformulier', klaar: heeft('loonheffing'), toelichting: 'Opgaaf gegevens voor de loonheffingen: met BSN en de keuze voor de loonheffingskorting.' },
    { sleutel: 'id_kopie', titel: 'Kopie identiteitsbewijs', klaar: heeft('id_kopie'), toelichting: 'Bekijk het origineel bij het tekenen.' },
    { sleutel: 'iban', titel: 'Bankrekening (IBAN)', klaar: !!r?.ibanEnc, toelichting: r?.ibanEnc ? `Eindigt op ${r.ibanLast4 ?? '…'}.` : undefined },
    {
      sleutel: 'handboek',
      titel: 'Personeelshandboek ontvangen',
      klaar: !!contract?.handbookGivenOn,
      toelichting: contract?.handbookDocumentId ? undefined : 'Er hoort nog geen handboek bij dit contract.',
    },
  ]

  const stappen: Stap[] = [
    { sleutel: 'gegevens', nummer: 1, titel: 'Persoonsgegevens', klaar: gegevensMist.length === 0 },
    { sleutel: 'contract', nummer: 2, titel: 'Contract', klaar: contract?.soort === 'definitief' && !contractVerouderd },
    { sleutel: 'printen', nummer: 3, titel: 'Printen en tekenen', klaar: !!contract?.signedOn },
    { sleutel: 'stukken', nummer: 4, titel: 'Getekende stukken', klaar: stukken.every((s) => s.klaar) },
    { sleutel: 'aanname', nummer: 5, titel: 'In dienst nemen', klaar: aangenomen },
  ]
  return {
    contract,
    gegevens,
    stappen,
    huidige: aangenomen ? null : (stappen.find((s) => !s.klaar)?.sleutel ?? 'aanname'),
    stukken,
    gegevensMist,
    contractVerouderd,
    aangenomen,
  }
}
