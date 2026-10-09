import { ActionForm, Check, Field, Select, TextArea } from '@/components/ActionForm'
import { nieuwContract, contractWijzigen } from '@/app/beheer/contract-actions'
import { formatDateInput } from '@/lib/dates'
import type { CompanyLocation, JobProfile } from '@/db/schema'
import type { ContractInvoer } from '@/lib/contracten'

/* -------------------------------------------------------------------------
   Het contractformulier: hetzelfde bij een kandidaat, bij Contracten en bij
   het wijzigen van een contract. Een formulier, zodat een veld dat er bij
   het opstellen in staat er bij het wijzigen ook in staat.
   ------------------------------------------------------------------------- */

export type ContractStart = {
  contractSoort: 'proforma' | 'definitief'
  voornamen: string
  tussenvoegsel: string
  achternaam: string
  roepnaam: string
  aanhef: 'neutraal' | 'heer' | 'mevrouw'
  functieprofiel: string
  functie: string
  soort: 'bepaalde_tijd' | 'onbepaalde_tijd'
  ingangsdatum: string
  looptijd: string
  proeftijd: string
  uren: string
  schaal: string
  trede: string
  bedrag: string
  relatiebeding: boolean
  opToeslag: boolean
  vrijetijdsbudget: boolean
  extraAfspraken: string
  bereikbaar: boolean
  nevenwerk: 'toestemming' | 'vrij_behalve_klanten'
  adres: string
  postcode: string
  woonplaats: string
  geboortedatum: string
  standplaatsId: string
  tekenplaats: string
  tekendatum: string
  /** Leeg: de eigenaren staan aan. */
  ondertekenaars: string[] | null
}

export const LEGE_START: ContractStart = {
  contractSoort: 'proforma',
  voornamen: '',
  tussenvoegsel: '',
  achternaam: '',
  roepnaam: '',
  aanhef: 'neutraal',
  functieprofiel: '',
  functie: '',
  soort: 'bepaalde_tijd',
  ingangsdatum: '',
  looptijd: '',
  proeftijd: '0',
  uren: '',
  schaal: '',
  trede: '',
  bedrag: '',
  relatiebeding: false,
  opToeslag: true,
  vrijetijdsbudget: true,
  extraAfspraken: '',
  bereikbaar: false,
  nevenwerk: 'toestemming',
  adres: '',
  postcode: '',
  woonplaats: '',
  geboortedatum: '',
  standplaatsId: '',
  tekenplaats: '',
  tekendatum: '',
  ondertekenaars: null,
}

const uren = (kwartier: number) => String(kwartier / 100).replace('.', ',')
const bedrag = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

/**
 * De startwaarden uit een bewaard contract, om het te wijzigen.
 * Naamdelen komen uit de persoonsgegevens: die zijn bij het opstellen bijgewerkt.
 */
export function startUitInvoer(
  i: ContractInvoer,
  soort: 'proforma' | 'definitief',
  naam: { voornamen?: string | null; tussenvoegsel?: string | null; achternaam?: string | null },
): ContractStart {
  return {
    contractSoort: soort,
    voornamen: naam.voornamen ?? i.naam,
    tussenvoegsel: naam.tussenvoegsel ?? '',
    achternaam: naam.achternaam ?? '',
    roepnaam: i.roepnaam ?? '',
    aanhef: i.aanhef === 'heer' || i.aanhef === 'mevrouw' ? i.aanhef : 'neutraal',
    functieprofiel: i.jobProfileId ?? '',
    functie: i.functie,
    soort: i.soort === 'onbepaalde_tijd' ? 'onbepaalde_tijd' : 'bepaalde_tijd',
    ingangsdatum: formatDateInput(i.ingangsdatum),
    looptijd: i.looptijdMaanden ? String(i.looptijdMaanden) : '',
    proeftijd: String(i.proeftijdMaanden ?? 0),
    uren: uren(i.urenPerWeekKwartier),
    schaal: i.schaalNaam ?? '',
    trede: i.trede ? String(i.trede) : '',
    bedrag: i.schaalNaam && i.trede ? '' : bedrag(i.brutoMaandCents),
    relatiebeding: i.relatiebeding === true,
    opToeslag: (i.opToeslagCents ?? 0) > 0,
    vrijetijdsbudget: i.vrijetijdsbudget === true,
    extraAfspraken: i.extraAfspraken ?? '',
    bereikbaar: i.bereikbaarOpWerkdagen === true,
    nevenwerk: i.nevenwerk ?? 'toestemming',
    adres: i.adres ?? '',
    postcode: i.postcode ?? '',
    woonplaats: i.woonplaats ?? '',
    geboortedatum: i.geboortedatum ? formatDateInput(i.geboortedatum) : '',
    standplaatsId: i.standplaatsId ?? '',
    tekenplaats: i.tekenplaats ?? '',
    tekendatum: i.tekendatum ? formatDateInput(i.tekendatum) : '',
    ondertekenaars: i.ondertekenaars && i.ondertekenaars.length > 0 ? i.ondertekenaars : null,
  }
}

type Keuze = { value: string; label: string }

export function ContractFormulier({
  start,
  voor,
  contractId,
  profielen,
  schalen,
  tekenaars,
  vestigingen,
  kandidaten = [],
  collegas = [],
}: {
  start: ContractStart
  /** Bij een kandidaat of collega staat vast voor wie; bij Contracten kies je. */
  voor: { kandidaatId: string } | { collegaId: string } | 'kiezen' | 'vast'
  /** Gezet: het formulier wijzigt dit contract. */
  contractId?: string
  profielen: JobProfile[]
  /** De schalen uit het salarishuis; leeg als er geen is. */
  schalen: string[]
  tekenaars: { id: string; naam: string; eigenaar: boolean }[]
  vestigingen: CompanyLocation[]
  kandidaten?: Keuze[]
  collegas?: Keuze[]
}) {
  const gekozen = (naam: string, eigenaar: boolean) => (start.ondertekenaars ? start.ondertekenaars.includes(naam) : eigenaar)
  // Een ondertekenaar uit een oud contract die niet meer in de lijst staat, blijft zichtbaar.
  const extraTekenaars = (start.ondertekenaars ?? []).filter((n) => !tekenaars.some((t) => t.naam === n))
  const profiel = profielen.find((p) => p.id === start.functieprofiel)

  return (
    <ActionForm action={contractId ? contractWijzigen : nieuwContract} submitLabel={contractId ? 'Wijzigingen opslaan' : 'Contract opstellen'} resetOnSuccess={!contractId}>
      {contractId && <input type="hidden" name="contractId" value={contractId} />}
      {typeof voor === 'object' && 'kandidaatId' in voor && <input type="hidden" name="kandidaatId" value={voor.kandidaatId} />}
      {typeof voor === 'object' && 'collegaId' in voor && <input type="hidden" name="collegaId" value={voor.collegaId} />}

      <fieldset>
        <legend className="text-jr-text mb-2 text-[13px] font-medium">Wat stel je voor?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="has-[:checked]:border-jr-blue flex items-start gap-2.5 rounded-lg border border-gray-200 px-3.5 py-2.5 text-[15px]">
            <input type="radio" name="contractSoort" value="proforma" defaultChecked={start.contractSoort === 'proforma'} className="mt-1" />
            <span>
              Pro forma
              <span className="block text-xs text-gray-600">Een voorstel om te bespreken. Staat als “pro forma, niet tekenen” op elke pagina.</span>
            </span>
          </label>
          <label className="has-[:checked]:border-jr-blue flex items-start gap-2.5 rounded-lg border border-gray-200 px-3.5 py-2.5 text-[15px]">
            <input type="radio" name="contractSoort" value="definitief" defaultChecked={start.contractSoort === 'definitief'} className="mt-1" />
            <span>
              Definitief
              <span className="block text-xs text-gray-600">Ter ondertekening.</span>
            </span>
          </label>
        </div>
      </fieldset>

      {voor === 'kiezen' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Voor een kandidaat" name="kandidaatId" defaultValue="" options={[{ value: '', label: 'Geen kandidaat' }, ...kandidaten]} hint="Kandidaten met een aanbod of een contract." />
          <Select label="Of een collega" name="collegaId" defaultValue="" options={[{ value: '', label: 'Geen collega' }, ...collegas]} hint="Voor een verlenging of een nieuw contract." />
        </div>
      )}

      <Kop uitleg="Naam, adres en geboortedatum komen uit de persoonsgegevens. Wat je hier aanvult of verbetert, wordt daar ook opgeslagen.">De werknemer</Kop>
      <div className="grid gap-3 sm:grid-cols-[2fr_0.9fr_1.5fr]">
        <Field label="Voornamen (paspoort)" name="officieleVoornamen" required defaultValue={start.voornamen} placeholder="Daniël Matthijs" hint="Alle voornamen. Staan voluit bij de werknemer." />
        <Field label="Tussenvoegsel" name="tussenvoegsel" defaultValue={start.tussenvoegsel} />
        <Field label="Achternaam" name="achternaam" required defaultValue={start.achternaam} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Roepnaam" name="roepnaam" defaultValue={start.roepnaam} placeholder="Daan" hint="In de kop, bij de paraaf, onder de handtekening en in de mail." />
        <Select
          label="Aanhef"
          name="aanhef"
          defaultValue={start.aanhef}
          options={[
            { value: 'neutraal', label: 'Geen aanhef' },
            { value: 'heer', label: 'Dhr.' },
            { value: 'mevrouw', label: 'Mevr.' },
          ]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
        <Field label="Adres" name="adres" defaultValue={start.adres} />
        <Field label="Postcode" name="postcode" defaultValue={start.postcode} />
        <Field label="Woonplaats" name="woonplaats" defaultValue={start.woonplaats} />
      </div>
      <Field label="Geboortedatum" name="geboortedatum" type="date" defaultValue={start.geboortedatum} />

      <Kop>Functie en duur</Kop>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Functieprofiel"
          name="functieprofiel"
          defaultValue={start.functieprofiel}
          options={[{ value: '', label: 'Geen profiel' }, ...profielen.map((p) => ({ value: p.id, label: p.title }))]}
          hint="Bepaalt de motivering van het relatiebeding."
        />
        <Field label="Functie" name="functie" required defaultValue={start.functie || profiel?.title || ''} placeholder="Marketing Manager" />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Select
          label="Soort contract"
          name="soort"
          defaultValue={start.soort}
          options={[
            { value: 'bepaalde_tijd', label: 'Bepaalde tijd' },
            { value: 'onbepaalde_tijd', label: 'Onbepaalde tijd' },
          ]}
        />
        <Field label="Ingangsdatum" name="ingangsdatum" type="date" required defaultValue={start.ingangsdatum} />
        <Field label="Looptijd (maanden)" name="looptijd" defaultValue={start.looptijd} placeholder="7" hint="Bij bepaalde tijd." />
        <Field label="Proeftijd (maanden)" name="proeftijd" defaultValue={start.proeftijd} hint="Wordt teruggebracht tot wat mag." />
      </div>

      <Kop uitleg="Met schaal en trede komt het bedrag uit het salarishuis dat geldt op de ingangsdatum; in het contract staat die datum als peildatum.">Uren en salaris</Kop>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Uren per week" name="uren" required defaultValue={start.uren} placeholder="32" />
        {schalen.length > 0 ? (
          <>
            <Select label="Schaal" name="schaal" defaultValue={start.schaal} options={[{ value: '', label: 'Buiten schaal' }, ...schalen.map((n) => ({ value: n, label: n }))]} />
            <Field label="Trede" name="trede" defaultValue={start.trede} placeholder="5" />
          </>
        ) : (
          <p className="text-jr-orange text-xs sm:col-span-2">Er is nog geen salarishuis. Vul zelf een bedrag in.</p>
        )}
        <Field label="Of: bruto per maand" name="bedrag" defaultValue={start.bedrag} placeholder="2.750" hint="Alleen buiten de schaal." />
      </div>

      <Kop uitleg="Maatwerk per contract. Wat je hier aan- of uitzet, komt als artikel of lid in het contract.">Afspraken</Kop>
      <div className="space-y-2.5 rounded-lg border border-gray-200 p-3">
        <input type="hidden" name="relatiebedingKeuze" value="1" />
        <Check
          label="Relatiebeding"
          name="relatiebeding"
          defaultChecked={start.relatiebeding}
          hint="Alleen met een functieprofiel dat een motivering heeft; zonder motivering is het beding in een tijdelijk contract niet geldig."
        />
        <input type="hidden" name="opToeslagKeuze" value="1" />
        <Check label="OP-toeslag in plaats van een pensioenregeling" name="opToeslagAan" defaultChecked={start.opToeslag} hint="Uit: geen OP-toeslag in het salaris en het contract." />
        <Check label="Vrijetijdsbudget van € 100 per jaar" name="vrijetijdsbudget" defaultChecked={start.vrijetijdsbudget} />
        <Check
          label="Op werkdagen bereikbaar tijdens kantoortijden"
          name="bereikbaar"
          defaultChecked={start.bereikbaar}
          hint="Voor parttime: de uren verdeeld over maandag tot en met vrijdag, en tijdens kantoortijden bereikbaar voor korte afstemming. Komt als extra lid bij de arbeidstijd."
        />
        <Select
          label="Nevenwerkzaamheden"
          name="nevenwerk"
          defaultValue={start.nevenwerk}
          options={[
            { value: 'toestemming', label: 'Alleen met toestemming van de werkgever (standaard)' },
            { value: 'vrij_behalve_klanten', label: 'Toegestaan, behalve voor klanten en hun groepsmaatschappijen' },
          ]}
        />
        <TextArea label="Extra afspraken" name="extraAfspraken" rows={2} defaultValue={start.extraAfspraken} hint="Bijvoorbeeld een studiekostenregeling of thuiswerken. Leeg: wat er bij het functieprofiel staat." />
      </div>

      <Kop uitleg="De standplaats staat in het artikel over de standplaats. Plaats en datum van ondertekening staan boven de handtekeningen; leeg laat puntjes staan.">Standplaats en ondertekening</Kop>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Standplaats"
          name="standplaats"
          defaultValue={start.standplaatsId || vestigingen.find((v) => v.isMain)?.id || ''}
          options={vestigingen.map((v) => ({ value: v.id, label: `${v.name} (${v.addressLine}, ${v.city})` }))}
          hint="Beheer je bij Bedrijfsgegevens."
        />
        <Field label="Getekend te" name="tekenplaats" defaultValue={start.tekenplaats} placeholder="Leeg: de plaats van de standplaats" />
        <Field label="Getekend op" name="tekendatum" type="date" defaultValue={start.tekendatum} hint="De dag waarop jullie tekenen." />
      </div>
      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="text-jr-text px-1 text-[13px] font-medium">Wie tekent</legend>
        <input type="hidden" name="ondertekenaarsKeuze" value="1" />
        <p className="mb-2 text-xs text-gray-600">Namens de werkgever. Eigenaren staan standaard aan. De werknemer tekent altijd mee, en iedereen parafeert elke pagina.</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {tekenaars.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ondertekenaar" value={t.naam} defaultChecked={gekozen(t.naam, t.eigenaar)} />
              {t.naam}
              {t.eigenaar && <span className="text-xs text-gray-500">eigenaar</span>}
            </label>
          ))}
          {extraTekenaars.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ondertekenaar" value={n} defaultChecked />
              {n}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked disabled readOnly />
            De werknemer zelf
          </label>
        </div>
      </fieldset>
    </ActionForm>
  )
}

function Kop({ children, uitleg }: { children: React.ReactNode; uitleg?: string }) {
  return (
    <div className="col-span-full border-t border-gray-100 pt-3">
      <h3 className="text-[15px] font-semibold">{children}</h3>
      {uitleg && <p className="mt-0.5 text-xs text-gray-600">{uitleg}</p>}
    </div>
  )
}
