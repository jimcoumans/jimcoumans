import { ActionForm, Field } from './ActionForm'
import { dossierDocument, dossierDocumentWissen, dossierDoorgegeven, dossierGegevensOpslaan, dossierIban } from '@/app/beheer/aanname-actions'
import { dossierPunten, type DocumentInfo, type DocumentSoort, type Gegevens } from '@/lib/persoonsgegevens'
import { formatDate, formatDateInput, formatDateLong } from '@/lib/dates'

/* -------------------------------------------------------------------------
   Het dossier van een persoon: alles wat er voor het contract en de
   salarisadministratie moet zijn, op één plek. Bovenaan wat er al is en wat
   nog mist; daaronder de gegevens om in te vullen (ook het IBAN) en per
   document een eigen regel met uploaden.

   Hetzelfde blok bij de kandidaat, in de indiensttreding en bij de collega.
   Alleen voor een beheerder: de pagina beslist dat, elke actie controleert
   het opnieuw.
   ------------------------------------------------------------------------- */

export type DossierVan = { kandidaatId: string } | { userId: string }

type Start = { roepnaam?: string | null; voornamen?: string | null; tussenvoegsel?: string | null; achternaam?: string | null }

const KNOP_KLEIN = 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 !px-3 !py-1 !text-xs !min-h-0'
const KNOP_WEG = 'text-gray-500 hover:bg-gray-100 !px-2 !py-0.5 !text-xs !min-h-0'

/** Per document: wat het is en waar je op let. */
export const DOSSIER_DOCUMENTEN: { kind: DocumentSoort; titel: string; uitleg: string }[] = [
  { kind: 'id_kopie', titel: 'Kopie identiteitsbewijs', uitleg: 'Paspoort of ID-kaart, geen rijbewijs. Bekijk het origineel.' },
  { kind: 'loonheffing', titel: 'Getekend loonheffingsformulier', uitleg: 'Opgaaf gegevens voor de loonheffingen, met BSN en de keuze voor de loonheffingskorting.' },
  { kind: 'contract', titel: 'Getekend contract', uitleg: 'De scan met alle handtekeningen en parafen.' },
  { kind: 'avg_verklaring', titel: 'Getekende AVG-verklaring', uitleg: 'De bijlage bij het contract, ingevuld en getekend.' },
  { kind: 'overig', titel: 'Overig', uitleg: 'Niet verplicht. Bijvoorbeeld een diploma of een verklaring omtrent gedrag.' },
]

function Verborgen({ van }: { van: DossierVan }) {
  return 'userId' in van ? <input type="hidden" name="userId" value={van.userId} /> : <input type="hidden" name="kandidaatId" value={van.kandidaatId} />
}

/**
 * Een regel met iets wat er moet zijn: het bolletje, wat het is, wat er al
 * staat, en rechts wat je meteen kunt doen.
 */
export function DossierRegel({
  klaar,
  optioneel = false,
  titel,
  uitleg,
  children,
  actie,
}: {
  klaar: boolean
  /** Hoort er niet per se bij: geen open bolletje dat om aandacht vraagt. */
  optioneel?: boolean
  titel: string
  uitleg?: string
  children?: React.ReactNode
  actie?: React.ReactNode
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
      <div className="flex min-w-0 flex-1 basis-64 gap-3">
        {optioneel && !klaar ? (
          <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 flex-none place-items-center text-gray-300">
            –
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold ${klaar ? 'bg-jr-green text-white' : 'border-2 border-gray-300 text-transparent'}`}
          >
            ✓
          </span>
        )}
        <div className="min-w-0 text-sm">
          <p className={klaar ? 'text-gray-700' : 'font-medium'}>
            {titel}
            {!optioneel && <span className="sr-only">{klaar ? ' (in orde)' : ' (ontbreekt nog)'}</span>}
          </p>
          {uitleg && <p className="text-xs text-gray-500">{uitleg}</p>}
          {children}
        </div>
      </div>
      {actie && <div className="flex-none">{actie}</div>}
    </li>
  )
}

/** Een document in het dossier: openen, en weghalen als het het verkeerde is. */
function Document({ d, van }: { d: DocumentInfo; van: DossierVan }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
      <a href={`/api/persoonsgegevens/${d.id}`} target="_blank" rel="noopener" className="text-jr-link font-medium hover:underline">
        {d.filename ?? 'Bekijken'}
      </a>
      <span className="text-gray-500">
        {Math.round(d.bytes / 1024)} kB · {d.doorKandidaat ? 'zelf aangeleverd' : 'geüpload'} op {formatDate(d.createdAt)}
      </span>
      <ActionForm action={dossierDocumentWissen} submitLabel="Weg" submitClassName={KNOP_WEG} resetOnSuccess={false} meldGelukt={false} className="inline-flex">
        <Verborgen van={van} />
        <input type="hidden" name="documentId" value={d.id} />
      </ActionForm>
    </div>
  )
}

/** Uploaden voor één soort document, rechts in de regel. */
function Uploaden({ van, kind, titel, heeftAl }: { van: DossierVan; kind: DocumentSoort; titel: string; heeftAl: boolean }) {
  return (
    <ActionForm
      action={dossierDocument}
      submitLabel={heeftAl ? 'Nog een uploaden' : 'Uploaden'}
      submitClassName={KNOP_KLEIN}
      meldGelukt={false}
      className="flex flex-wrap items-center gap-2"
      knopInRij
    >
      <Verborgen van={van} />
      <input type="hidden" name="soort" value={kind} />
      <input type="file" name="bestand" required accept="application/pdf,image/jpeg,image/png" className="max-w-[15rem] text-xs" aria-label={`${titel} uploaden`} />
    </ActionForm>
  )
}

/** De regels voor documenten, elk met een eigen upload. Zonder `soorten`: allemaal. */
export function DossierDocumenten({ van, gegevens, soorten }: { van: DossierVan; gegevens: Gegevens | null; soorten?: DocumentSoort[] }) {
  const lijst = soorten ? DOSSIER_DOCUMENTEN.filter((d) => soorten.includes(d.kind)) : DOSSIER_DOCUMENTEN
  return (
    <>
      {lijst.map((s) => {
        const docs = gegevens?.documenten.filter((d) => d.kind === s.kind) ?? []
        return (
          <DossierRegel
            key={s.kind}
            klaar={docs.length > 0}
            optioneel={s.kind === 'overig'}
            titel={s.titel}
            uitleg={docs.length === 0 ? s.uitleg : undefined}
            actie={<Uploaden van={van} kind={s.kind} titel={s.titel} heeftAl={docs.length > 0} />}
          >
            {docs.map((d) => (
              <Document key={d.id} d={d} van={van} />
            ))}
          </DossierRegel>
        )
      })}
    </>
  )
}

/** Het IBAN als eigen regel: wat er staat, of meteen invullen. */
export function IbanRegel({ van, gegevens, iban }: { van: DossierVan; gegevens: Gegevens | null; iban: string | null }) {
  const r = gegevens?.record ?? null
  return (
    <DossierRegel klaar={!!r?.ibanEnc} titel="Bankrekening (IBAN)" uitleg={r?.ibanEnc ? undefined : 'Staat niet op het loonheffingsformulier: vul het hier in.'}>
      {r?.ibanEnc ? (
        <p className="tabular mt-0.5 text-sm">
          {iban ?? `eindigt op ${r.ibanLast4 ?? '…'}`}
          {r.accountHolder && <span className="text-gray-600"> · t.n.v. {r.accountHolder}</span>}
        </p>
      ) : (
        <ActionForm action={dossierIban} submitLabel="Opslaan" submitClassName={KNOP_KLEIN} resetOnSuccess={false} meldGelukt={false} className="mt-2 flex flex-wrap items-center gap-2" knopInRij>
          <Verborgen van={van} />
          <input name="iban" required placeholder="NL00 BANK 0123 4567 89" aria-label="IBAN" className="min-h-9 w-56 rounded-lg border border-gray-300 px-3 text-sm" />
          <input name="tenaamstelling" defaultValue={r?.accountHolder ?? ''} placeholder="Ten name van" aria-label="Ten name van" className="min-h-9 w-44 rounded-lg border border-gray-300 px-3 text-sm" />
        </ActionForm>
      )}
    </DossierRegel>
  )
}

/** De gegevens zelf, altijd open: naam zoals in het paspoort, geboortedatum, adres en IBAN. */
export function DossierGegevens({
  van,
  gegevens,
  iban,
  start,
}: {
  van: DossierVan
  gegevens: Gegevens | null
  iban: string | null
  /** Wat we al weten als er nog niets is opgeslagen, bijvoorbeeld de naam van de kandidaat. */
  start?: Start
}) {
  const r = gegevens?.record ?? null
  return (
    <ActionForm action={dossierGegevensOpslaan} submitLabel="Gegevens opslaan" resetOnSuccess={false}>
      <Verborgen van={van} />
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field
          label="Voornamen (voluit, zoals in het paspoort)"
          name="officieleVoornamen"
          defaultValue={r?.officialFirstNames ?? start?.voornamen ?? ''}
          hint="Alleen bovenaan het contract."
        />
        <Field label="Roepnaam" name="roepnaam" defaultValue={start?.roepnaam ?? ''} hint="Overal elders: roepnaam en achternaam." />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field label="Tussenvoegsel" name="tussenvoegsel" defaultValue={r?.infix ?? start?.tussenvoegsel ?? ''} />
        <Field label="Achternaam" name="achternaam" defaultValue={r?.lastName ?? start?.achternaam ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Geboortedatum" name="geboortedatum" type="date" defaultValue={r?.birthDate ? formatDateInput(r.birthDate) : ''} />
        <Field label="Geboorteplaats" name="geboorteplaats" defaultValue={r?.birthPlace ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
        <Field label="Straat en huisnummer" name="adres" defaultValue={r?.addressLine ?? ''} />
        <Field label="Postcode" name="postcode" defaultValue={r?.postalCode ?? ''} />
        <Field label="Woonplaats" name="woonplaats" defaultValue={r?.city ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="IBAN"
          name="iban"
          placeholder={iban ? `Nu: ${iban}` : 'NL00 BANK 0123 4567 89'}
          hint={iban ? 'Staat erin. Alleen invullen als het verandert.' : 'Wordt versleuteld bewaard.'}
        />
        <Field label="Ten name van" name="tenaamstelling" defaultValue={r?.accountHolder ?? ''} />
      </div>
    </ActionForm>
  )
}

/**
 * Het hele dossier: voortgang, gegevens, documenten en doorgeven aan de
 * salarisadministratie. `invullink` is voor een kandidaat: de link waarmee
 * hij het zelf invult.
 */
export function Persoonsdossier({
  van,
  gegevens,
  iban,
  ibanFout,
  sleutel,
  start,
  invullink,
  uitleg,
}: {
  van: DossierVan
  gegevens: Gegevens | null
  iban: string | null
  ibanFout: boolean
  sleutel: boolean
  start?: Start
  invullink?: React.ReactNode
  uitleg?: string
}) {
  const r = gegevens?.record ?? null
  const punten = dossierPunten(gegevens)
  const klaar = punten.filter((p) => p.klaar).length
  const compleet = klaar === punten.length
  const anker = (s: string) => (['naam', 'geboortedatum', 'adres', 'iban'].includes(s) ? '#dossier-gegevens' : '#dossier-documenten')

  return (
    <section id="dossier" className="scroll-mt-4 rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base">Persoonsgegevens en documenten</h2>
        <span className={`tabular text-sm font-medium ${compleet ? 'text-[#1d7a36]' : 'text-gray-700'}`}>
          {klaar} van {punten.length} compleet
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-500">{uitleg ?? 'Alles voor het contract en de salarisadministratie. Versleuteld bewaard; wie een document opent, wordt vastgelegd.'}</p>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-jr-green h-full rounded-full" style={{ width: `${Math.round((klaar / punten.length) * 100)}%` }} />
      </div>

      {!sleutel && (
        <p className="border-jr-orange bg-jr-orange/10 mb-4 rounded border-l-4 p-3 text-sm">
          De sleutel voor persoonsgegevens (GEGEVENS_SLEUTEL) staat nog niet in Netlify. Zonder die sleutel kan het portaal geen IBAN of documenten opslaan.
        </p>
      )}
      {ibanFout && <p className="mb-4 text-sm text-[#C02A22]">Het IBAN is niet te lezen met de huidige sleutel.</p>}

      {/* Wat er is en wat er mist, in één oogopslag. Klik om ernaar toe te gaan. */}
      <ul className="mb-5 flex flex-wrap gap-1.5">
        {punten.map((p) => (
          <li key={p.sleutel}>
            <a
              href={anker(p.sleutel)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                p.klaar ? 'bg-jr-green/10 text-[#1d7a36]' : 'bg-jr-orange/10 hover:bg-jr-orange/20 font-medium text-[#9a5b00]'
              }`}
            >
              <span aria-hidden="true">{p.klaar ? '✓' : '○'}</span>
              {p.titel}
            </a>
          </li>
        ))}
      </ul>

      {invullink}

      <div id="dossier-gegevens" className="scroll-mt-4 rounded-lg border border-gray-200 p-4">
        <h3 className="mb-1 text-sm font-semibold">Gegevens</h3>
        <p className="mb-3 text-xs text-gray-600">
          {r?.aangeleverdOp ? `Zelf aangeleverd op ${formatDateLong(r.aangeleverdOp)}. ` : ''}
          Wat hier staat, komt in het contract. Pas je het aan na het opstellen, dan zie je bij het contract dat het bijgewerkt moet worden.
        </p>
        <DossierGegevens van={van} gegevens={gegevens} iban={iban} start={start} />
      </div>

      <div id="dossier-documenten" className="mt-4 scroll-mt-4 rounded-lg border border-gray-200 px-4 pt-4 pb-1">
        <h3 className="text-sm font-semibold">Documenten</h3>
        <p className="text-xs text-gray-600">Pdf, jpg of png, maximaal 4 MB. Een foto met de telefoon is prima.</p>
        <ul className="divide-y divide-gray-100">
          <DossierDocumenten van={van} gegevens={gegevens} />
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        {r?.doorgegevenOp ? (
          <>
            <p className="text-sm text-[#1d7a36]">✓ Doorgegeven aan de salarisadministratie op {formatDateLong(r.doorgegevenOp)}.</p>
            <ActionForm action={dossierDoorgegeven} submitLabel="Toch nog niet doorgegeven" submitClassName={KNOP_WEG} resetOnSuccess={false} meldGelukt={false} className="">
              <Verborgen van={van} />
              <input type="hidden" name="terug" value="1" />
            </ActionForm>
          </>
        ) : (
          <>
            <p className="max-w-prose text-xs text-gray-600">
              {gegevens && gegevens.ontbreekt.length === 0
                ? 'Compleet genoeg voor de salarisadministratie. Stuur het door naar Euregio Habets Royen en leg het hier vast.'
                : 'Doorgeven aan de salarisadministratie kan als naam, geboortedatum, adres, IBAN, kopie ID en loonheffingsformulier er zijn.'}
            </p>
            <ActionForm action={dossierDoorgegeven} submitLabel="Doorgegeven aan de salarisadministratie" submitClassName={KNOP_KLEIN} resetOnSuccess={false} className="">
              <Verborgen van={van} />
            </ActionForm>
          </>
        )}
      </div>
    </section>
  )
}
