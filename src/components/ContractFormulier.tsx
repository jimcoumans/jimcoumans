import { ActionForm, Check, Field, Select, TextArea } from '@/components/ActionForm'
import { nieuwContract, contractWijzigen } from '@/app/beheer/contract-actions'
import { formatDateInput } from '@/lib/dates'
import type { CompanyLocation, JobProfile } from '@/db/schema'
import type { ContractInvoer, MogelijkeOndertekenaar } from '@/lib/contracten'

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
  dossierHref,
}: {
  start: ContractStart
  /** Bij een kandidaat of collega staat vast voor wie; bij Contracten kies je. */
  voor: { kandidaatId: string } | { collegaId: string } | 'kiezen' | 'vast'
  /** Gezet: het formulier wijzigt dit contract. */
  contractId?: string
  profielen: JobProfile[]
  /** De schalen uit het salarishuis; leeg als er geen is. */
  schalen: string[]
  tekenaars: MogelijkeOndertekenaar[]
  vestigingen: CompanyLocation[]
  kandidaten?: Keuze[]
  collegas?: Keuze[]
  /**
   * Waar de persoonsgegevens staan. Gezet en de naam is bekend: dan staat de
   * werknemer hier alleen ter controle, en wijzig je hem in het dossier. Eén
   * plek voor naam, adres en geboortedatum.
   */
  dossierHref?: string
}) {
  /* Bij een nieuw contract staat aan wie standaard tekent (bedrijfsgegevens);
     is daar niemand gekozen, dan de eigenaren. Bij wijzigen: wie er tekende. */
  const iemandStandaard = tekenaars.some((t) => t.standaard)
  const gekozen = (t: MogelijkeOndertekenaar) =>
    start.ondertekenaars ? start.ondertekenaars.includes(t.naam) : iemandStandaard ? t.standaard : t.eigenaar
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

      {dossierHref && start.voornamen && start.achternaam ? (
        <>
          <Kop>De werknemer</Kop>
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-gray-50 p-4 text-sm">
            <dl className="grid flex-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <Gegeven label="Naam bovenaan het contract">{[start.voornamen, start.tussenvoegsel, start.achternaam].filter(Boolean).join(' ')}</Gegeven>
              <Gegeven label="Overal elders">{[start.roepnaam || start.voornamen.split(/\s+/)[0], start.tussenvoegsel, start.achternaam].filter(Boolean).join(' ')}</Gegeven>
              <Gegeven label="Adres">{start.adres ? `${start.adres}, ${start.postcode} ${start.woonplaats}` : ''}</Gegeven>
              <Gegeven label="Geboortedatum">{start.geboortedatum ? start.geboortedatum.split('-').reverse().join('-') : ''}</Gegeven>
              <Gegeven label="Aanhef">{start.aanhef === 'heer' ? 'Dhr.' : start.aanhef === 'mevrouw' ? 'Mevr.' : 'Geen'}</Gegeven>
            </dl>
            <a href={dossierHref} className="text-jr-link text-xs font-medium hover:underline">
              Wijzigen bij de persoonsgegevens
            </a>
          </div>
          <input type="hidden" name="officieleVoornamen" value={start.voornamen} />
          <input type="hidden" name="tussenvoegsel" value={start.tussenvoegsel} />
          <input type="hidden" name="achternaam" value={start.achternaam} />
          <input type="hidden" name="roepnaam" value={start.roepnaam} />
          <input type="hidden" name="aanhef" value={start.aanhef} />
          <input type="hidden" name="adres" value={start.adres} />
          <input type="hidden" name="postcode" value={start.postcode} />
          <input type="hidden" name="woonplaats" value={start.woonplaats} />
          <input type="hidden" name="geboortedatum" value={start.geboortedatum} />
        </>
      ) : (
        <>
          <Kop uitleg="Wat je hier invult, gaat ook naar de persoonsgegevens.">De werknemer</Kop>
          <Field markeerOptioneel={false} label="Voornamen, voluit zoals in het paspoort" name="officieleVoornamen" required defaultValue={start.voornamen} placeholder="Daniël Matthijs" hint="Zonder achternaam. Staan alleen bovenaan het contract." />
          <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr_1.6fr]">
            <Field markeerOptioneel={false} label="Roepnaam" name="roepnaam" defaultValue={start.roepnaam} placeholder="Daan" />
            <Field markeerOptioneel={false} label="Tussenvoegsel" name="tussenvoegsel" defaultValue={start.tussenvoegsel} />
            <Field markeerOptioneel={false} label="Achternaam" name="achternaam" required defaultValue={start.achternaam} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
            <Field markeerOptioneel={false} label="Geboortedatum" name="geboortedatum" type="date" defaultValue={start.geboortedatum} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
            <Field markeerOptioneel={false} label="Straat en huisnummer" name="adres" defaultValue={start.adres} />
            <Field markeerOptioneel={false} label="Postcode" name="postcode" defaultValue={start.postcode} />
            <Field markeerOptioneel={false} label="Woonplaats" name="woonplaats" defaultValue={start.woonplaats} />
          </div>
        </>
      )}

      <Kop>Functie en duur</Kop>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Functieprofiel"
          name="functieprofiel"
          defaultValue={start.functieprofiel}
          options={[{ value: '', label: 'Geen profiel' }, ...profielen.map((p) => ({ value: p.id, label: p.title }))]}
          hint="Bepaalt de motivering van het relatiebeding."
        />
        <Field markeerOptioneel={false} label="Functie" name="functie" required defaultValue={start.functie || profiel?.title || ''} placeholder="Marketing Manager" />
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
        <Field markeerOptioneel={false} label="Ingangsdatum" name="ingangsdatum" type="date" required defaultValue={start.ingangsdatum} />
        <Field markeerOptioneel={false} label="Looptijd (maanden)" name="looptijd" defaultValue={start.looptijd} placeholder="7" hint="Bij bepaalde tijd." />
        <Field markeerOptioneel={false} label="Proeftijd (maanden)" name="proeftijd" defaultValue={start.proeftijd} hint="Wordt teruggebracht tot wat mag." />
      </div>

      <Kop uitleg="Met schaal en trede komt het bedrag uit het salarishuis dat geldt op de ingangsdatum; in het contract staat die datum als peildatum.">Uren en salaris</Kop>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field markeerOptioneel={false} label="Uren per week" name="uren" required defaultValue={start.uren} placeholder="32" />
        {schalen.length > 0 ? (
          <>
            <Select label="Schaal" name="schaal" defaultValue={start.schaal} options={[{ value: '', label: 'Buiten schaal' }, ...schalen.map((n) => ({ value: n, label: n }))]} />
            <Field markeerOptioneel={false} label="Trede" name="trede" defaultValue={start.trede} placeholder="5" />
          </>
        ) : (
          <p className="text-jr-orange text-xs sm:col-span-2">Er is nog geen salarishuis. Vul zelf een bedrag in.</p>
        )}
        <Field markeerOptioneel={false} label="Of: bruto per maand" name="bedrag" defaultValue={start.bedrag} placeholder="2.750" hint="Alleen buiten de schaal." />
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
        <Field markeerOptioneel={false} label="Getekend te" name="tekenplaats" defaultValue={start.tekenplaats} placeholder="Leeg: de plaats van de standplaats" />
        <Field markeerOptioneel={false} label="Getekend op" name="tekendatum" type="date" defaultValue={start.tekendatum} hint="De dag waarop jullie tekenen." />
      </div>
      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="text-jr-text px-1 text-[13px] font-medium">Wie tekent</legend>
        <input type="hidden" name="ondertekenaarsKeuze" value="1" />
        <p className="mb-2 text-xs text-gray-600">Namens de werkgever. Aangevinkt staat wie bij Bedrijfsgegevens standaard tekent. De werknemer tekent altijd mee, en iedereen parafeert elke pagina.</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {tekenaars.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ondertekenaar" value={t.naam} defaultChecked={gekozen(t)} />
              {t.naam}
              {t.eigenaar && <span className="text-xs text-gray-500">eigenaar</span>}
              {t.zonderAccount && <span className="text-xs text-gray-500">geen account</span>}
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

function Gegeven({ label, children }: { label: string; children: React.ReactNode }) {
  const leeg = children === '' || children === null || children === undefined
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd>{leeg ? <span className="text-jr-orange">nog niet ingevuld</span> : children}</dd>
    </div>
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
