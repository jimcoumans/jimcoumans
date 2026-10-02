import type { Organization, OrganizationProfile } from '@/db/schema'
import type { ProfielVeld } from '@/lib/klantprofiel'
import { wijzigKlantprofiel } from '@/app/beheer/klantreis-actions'
import { ActionForm, TextArea } from '@/components/ActionForm'
import { formatDate, formatDateLong } from '@/lib/dates'

/* -------------------------------------------------------------------------
   Het klantprofiel (I.3) op de klantkaart, in de zeven onderdelen van het
   document. Wie aan de klant werkt, leest dit eerst.

   Elk onderdeel heeft links de vrije tekst en rechts wat al in het systeem
   staat (doelen, concurrenten, accounts, doelgroepen). Niets wordt twee keer
   gevraagd.
   ------------------------------------------------------------------------- */

type Veld = { naam: ProfielVeld; label: string; hint: string }

const ONDERDELEN: { nr: number; titel: string; velden: Veld[] }[] = [
  {
    nr: 2,
    titel: 'Het bedrijf in het kort',
    velden: [
      { naam: 'sells', label: 'Wat ze verkopen', hint: 'Hooguit drie diensten of producten, met de waarde per opdracht of klant.' },
      { naam: 'whyChosen', label: 'Waarom klanten voor hen kiezen', hint: 'In hun woorden. Iets wat de concurrent niet had kunnen zeggen.' },
      { naam: 'pricingAndCompetition', label: 'Prijsniveau en concurrenten', hint: 'Van wie verliezen ze, en waarop.' },
      { naam: 'yearRhythm', label: 'Hoe het jaar loopt', hint: 'Pieken, dalen, vaste momenten: feestdagen, seizoen, beurzen.' },
    ],
  },
  {
    nr: 3,
    titel: 'De doelen',
    velden: [{ naam: 'capacity', label: 'Wat ze aankunnen', hint: 'Hoeveel extra werk per maand, en waar het vastloopt.' }],
  },
  {
    nr: 4,
    titel: 'De klant van de klant',
    velden: [
      { naam: 'bestCustomer', label: 'De beste klant', hint: 'Waar ze het meest aan verdienen en het prettigst mee werken.' },
      { naam: 'region', label: 'Regio', hint: 'Waar hun klanten vandaan komen.' },
      { naam: 'notWanted', label: 'Wat ze niet willen', hint: 'Werk, klanten of regio’s om uit te sluiten.' },
    ],
  },
  {
    nr: 5,
    titel: 'Het merk',
    velden: [
      { naam: 'brandStyle', label: 'Huisstijl', hint: 'Kleuren, lettertypes, logo’s; waar de bestanden staan.' },
      { naam: 'brandTone', label: 'Toon', hint: 'Je of u, formeel of los, woorden die wel en niet kunnen.' },
      { naam: 'brandImagery', label: 'Beeld', hint: 'Beeldenbank (Kive), draaidagen, wat niet in beeld mag.' },
    ],
  },
  {
    nr: 6,
    titel: 'Accounts en systemen',
    velden: [
      { naam: 'websiteSystem', label: 'Website', hint: 'Systeem, wie beheert hem, onze toegang.' },
      { naam: 'emailSetup', label: 'E-mail', hint: 'MailerLite: lijsten en aantal adressen.' },
      { naam: 'bookingSystem', label: 'Boeken, aanvragen, CRM', hint: 'Waar aanvragen of reserveringen binnenkomen, en hoe wij de stand zien.' },
    ],
  },
  {
    nr: 7,
    titel: 'Afspraken',
    velden: [
      { naam: 'clientCommitments', label: 'Jouw kant', hint: 'De vijf afspraken (04.4): opvolging, oordeel per aanvraag, één beslisser, de termijnen.' },
      { naam: 'sensitivities', label: 'Gevoeligheden', hint: 'Wat eerder misging, waar de klant scherp op is.' },
    ],
  },
]

function Nummer({ nr, titel }: { nr: number; titel: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-3 text-[19px]">
      <span className="bg-jr-lightblue text-jr-link inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
        {nr}
      </span>
      {titel}
    </h2>
  )
}

function Gegeven({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd className="text-[15px]">{children || <span className="text-gray-400">-</span>}</dd>
    </div>
  )
}

export function Klantprofiel({
  organisatie,
  profiel,
  marketingmanager,
  pakketten,
  vestigingen,
  rechts,
}: {
  organisatie: Organization
  profiel: (OrganizationProfile & { bijgewerktDoor: string | null }) | null
  marketingmanager: string | null
  pakketten: { naam: string; start: Date | null }[]
  vestigingen: string[]
  /** Wat al op de klantkaart staat, per onderdeel: rechts naast de tekst. */
  rechts: Partial<Record<number, React.ReactNode>>
}) {
  return (
    <div className="space-y-10">
      <p className="max-w-3xl text-sm text-gray-600">
        Wie aan deze klant werkt, leest dit eerst. Gevuld aan het eind van de onboarding uit het intakegesprek, het
        onboardingformulier en het voorstel. Een campagnebriefing haalt de basis, de contactpersonen en de vaste
        doelgroepen hier vandaan.
        {profiel && (
          <span className="block text-xs text-gray-500">
            Laatst bijgewerkt op {formatDateLong(profiel.updatedAt)}
            {profiel.bijgewerktDoor ? ` door ${profiel.bijgewerktDoor}` : ''}.
          </span>
        )}
      </p>

      <section>
        <Nummer nr={1} titel="De basis" />
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <dl className="grid gap-x-6 gap-y-4 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2">
            <Gegeven label="Klantnaam">{organisatie.name}</Gegeven>
            <Gegeven label="Website">{organisatie.website}</Gegeven>
            <Gegeven label="Branche">{organisatie.industry}</Gegeven>
            <Gegeven label="Vestiging(en)">{vestigingen.length > 0 ? vestigingen.join(', ') : organisatie.city}</Gegeven>
            <Gegeven label="Marketingmanager">{marketingmanager}</Gegeven>
            <Gegeven label="Pakket en start">
              {pakketten.length > 0
                ? pakketten.map((p) => `${p.naam}${p.start ? `, sinds ${formatDate(p.start)}` : ''}`).join('; ')
                : null}
            </Gegeven>
          </dl>
          {rechts[1]}
        </div>
      </section>

      {ONDERDELEN.map((o) => (
        <section key={o.nr}>
          <Nummer nr={o.nr} titel={o.titel} />
          <div className={`grid items-start gap-6 ${rechts[o.nr] ? 'xl:grid-cols-2' : ''}`}>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <ActionForm action={wijzigKlantprofiel} submitLabel="Opslaan" resetOnSuccess={false}>
                <input type="hidden" name="organizationId" value={organisatie.id} />
                <input type="hidden" name="slug" value={organisatie.slug} />
                <div className={o.velden.length > 1 && !rechts[o.nr] ? 'grid gap-4 lg:grid-cols-2' : 'space-y-4'}>
                  {o.velden.map((v) => (
                    <TextArea key={v.naam} label={v.label} name={v.naam} rows={3} hint={v.hint} defaultValue={profiel?.[v.naam] ?? ''} />
                  ))}
                </div>
              </ActionForm>
            </div>
            {rechts[o.nr]}
          </div>
        </section>
      ))}

      {rechts[8] && (
        <section>
          <Nummer nr={8} titel="Campagnes" />
          {rechts[8]}
        </section>
      )}
    </div>
  )
}
