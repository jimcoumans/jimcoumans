import { ActionForm, Field, Select, Check, TextArea, Uitklap } from './ActionForm'
import {
  nieuweContactpersoon, wijzigContactpersoon, maakVasteContactpersoon, verwijderContactpersoon,
  nieuwAccount, wijzigAccount, verwijderAccount,
  koppelPartner, wijzigKoppeling, ontkoppelPartner,
  bedrijfsgegevens,
  nieuwKind, wisKind,
} from '@/app/beheer/crm-actions'
import {
  BRANCHES, COMMON_SYSTEMS, partnerTypeLabels, accountOwnerLabels,
  organizationStatusLabels,
} from '@/lib/crm'
import type { PartnerLink } from '@/lib/crm'
import type { ContactChild } from '@/db/schema'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { Avatar } from './Avatar'
import { AfbeeldingKiezer } from './AfbeeldingKiezer'
import { AANHEF_LABELS } from '@/lib/namen'
import {
  RECHTSVORM_LABELS,
  GEZONDHEID_LABELS,
  REGIOS,
} from '@/lib/bedrijf-labels'
import {
  GESLACHT_OPTIES,
  DISC_LABELS,
  DRINK_LABELS,
  KANAAL_LABELS,
  opties,
} from '@/lib/contact-labels'
import { MAANDNAMEN } from '@/lib/dates'

/**
 * De verjaardagsvelden: dag, maand en jaar apart.
 *
 * Lang niet iedereen deelt zijn geboortejaar, en een verzonnen jaartal is
 * erger dan geen jaartal — dan feliciteer je straks iemand met een leeftijd
 * die niet klopt.
 */
function Verjaardag({
  dag,
  maand,
  jaar,
}: {
  dag: number | null
  maand: number | null
  jaar: number | null
}) {
  const veld =
    'min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400'
  return (
    <div>
      <p className="text-jr-text mb-1.5 block text-[13px] font-medium">
        Verjaardag<span className="font-normal text-gray-500"> (optioneel)</span>
      </p>
      <div className="grid max-w-md grid-cols-[90px_1fr_110px] gap-2">
        <input
          name="geboortedag"
          type="number"
          min={1}
          max={31}
          placeholder="Dag"
          aria-label="Dag"
          defaultValue={dag ?? ''}
          className={veld}
        />
        <select name="geboortemaand" aria-label="Maand" defaultValue={maand ?? ''} className={veld}>
          <option value="">Maand</option>
          {MAANDNAMEN.map((naam, i) => (
            <option key={naam} value={i + 1}>
              {naam}
            </option>
          ))}
        </select>
        <input
          name="geboortejaar"
          type="number"
          min={1900}
          max={2100}
          placeholder="Jaar"
          aria-label="Jaar"
          defaultValue={jaar ?? ''}
          className={veld}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Dag en maand horen bij elkaar; het jaar mag je weglaten.
      </p>
    </div>
  )
}

/**
 * De kinderen van een contactpersoon.
 *
 * Bewust klein gehouden: een naam, een verjaardag en één zin. Dit zijn
 * gegevens van kinderen van iemand anders, en die bewaar je niet omdat het
 * kan maar omdat je er iets mee doet — een naam noemen, een kaartje sturen.
 */
function Kinderen({
  contactId,
  slug,
  kinderen,
}: {
  contactId: string
  slug: string
  kinderen: ContactChild[]
}) {
  const veld =
    'min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400'

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <p className="mb-2 text-xs font-bold text-gray-600">Kinderen</p>

      {kinderen.length > 0 && (
        <ul className="mb-2 space-y-1">
          {kinderen.map((k) => (
            <li key={k.id} className="flex items-baseline justify-between gap-2 text-xs">
              <span>
                {k.name}
                {k.birthDay !== null && k.birthMonth !== null && (
                  <span className="text-gray-600">
                    {' '}
                    &middot; {k.birthDay} {MAANDNAMEN[k.birthMonth - 1]}
                    {k.birthYear !== null && ` ${k.birthYear}`}
                  </span>
                )}
                {k.notes && <span className="text-gray-500"> &middot; {k.notes}</span>}
              </span>
              <ActionForm
                action={wisKind}
                submitLabel="Weg"
                submitClassName="text-gray-500 hover:bg-gray-100 !px-1.5 !py-0.5 !text-xs"
                resetOnSuccess={false}
                className=""
              >
                <input type="hidden" name="kindId" value={k.id} />
                <input type="hidden" name="slug" value={slug} />
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <ActionForm
        action={nieuwKind}
        submitLabel="Kind toevoegen"
        submitClassName="text-jr-blue hover:bg-jr-lightblue !px-2 !py-1 !text-xs"
        className="grid gap-2 sm:grid-cols-[1fr_64px_1fr_72px]"
      >
        <input type="hidden" name="contactId" value={contactId} />
        <input type="hidden" name="slug" value={slug} />
        <input name="kindnaam" placeholder="Naam" aria-label="Naam" className={veld} />
        <input
          name="kinddag"
          type="number"
          min={1}
          max={31}
          placeholder="Dag"
          aria-label="Dag"
          className={veld}
        />
        <select name="kindmaand" aria-label="Maand" defaultValue="" className={veld}>
          <option value="">Maand</option>
          {MAANDNAMEN.map((naam, i) => (
            <option key={naam} value={i + 1}>
              {naam}
            </option>
          ))}
        </select>
        <input
          name="kindjaar"
          type="number"
          min={1950}
          max={2100}
          placeholder="Jaar"
          aria-label="Jaar"
          className={veld}
        />
        <div className="sm:col-span-4">
          <input
            name="kindnotitie"
            placeholder="Bijzonderheden: voetbalt, examenjaar, heet naar zijn opa"
            aria-label="Bijzonderheden"
            className={veld}
          />
        </div>
      </ActionForm>
    </div>
  )
}

/** De velden die van een adresboek een profiel maken. */
function Persoonlijk({ c }: { c: Contact }) {
  return (
    <>
      <PaneelKop uitleg="Optioneel, met één doel: dat je iemand kent in plaats van alleen kunt bereiken.">Persoonlijk</PaneelKop>

      <div className="sm:col-span-2">
        <Verjaardag dag={c.birthDay} maand={c.birthMonth} jaar={c.birthYear} />
      </div>
      <Select label="Geslacht" name="aanhef" defaultValue={c.aanhef ?? ''} options={GESLACHT_OPTIES} />

      <Select
        label="Drinkt het liefst"
        name="drinken"
        defaultValue={c.drinkPreference ?? ''}
        options={opties(DRINK_LABELS)}
      />
      <Select
        label="Bereik je het best via"
        name="kanaal"
        defaultValue={c.preferredChannel ?? ''}
        options={opties(KANAAL_LABELS)}
      />

      <div className="sm:col-span-2">
        <Select
          label="DISC-type"
          name="disc"
          defaultValue={c.discType ?? ''}
          options={opties(DISC_LABELS)}
          hint="Hoe hij het liefst benaderd wordt. Laat leeg als je het niet weet."
        />
      </div>

      <Field label="Partner" name="partner" defaultValue={c.partnerName ?? ''} />
      <Field
        label="Hobby's"
        name="hobbies"
        defaultValue={c.hobbies ?? ''}
        placeholder="wielrennen, koken, MVV"
      />

      <div className="sm:col-span-2">
        <Field
          label="Achtergrond"
          name="achtergrond"
          defaultValue={c.background ?? ''}
          placeholder="Waar komt hij vandaan, waar kennen we hem van"
        />
      </div>
    </>
  )
}


import type { Contact, Account, Partner, Organization } from '@/db/schema'
import { Paneel, PaneelKop } from '@/components/Paneel'
import { LeegVlak } from '@/components/PaginaKop'

/* De CRM-blokken op de klantpagina: contactpersonen, partners, accounts en
   de bedrijfsgegevens. */

export function Contactpersonen({
  contacts,
  organizationId,
  slug,
  kinderenPer,
}: {
  contacts: Contact[]
  organizationId: string
  slug: string
  /** Per contactpersoon zijn kinderen; leeg als er geen zijn. */
  kinderenPer: Map<string, ContactChild[]>
}) {
  const toevoegen = (stijl: 'primair' | 'rustig') => (
    <Paneel
      knop="+ Contactpersoon"
      titel="Contactpersoon toevoegen"
      uitleg="Wie je belt en wie de facturen krijgt. Los van wie er kan inloggen."
      stijl={stijl}
    >
      <ActionForm action={nieuweContactpersoon} submitLabel="Toevoegen" className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="slug" value={slug} />
        <PaneelKop>Wie</PaneelKop>
        <NaamVelden />
        <Field label="Functie" name="functie" placeholder="Eigenaar" />
        <Select
          label="Geslacht"
          name="aanhef"
          options={GESLACHT_OPTIES}
          hint="Bepaalt hoe een brief begint. Weet je het niet, kies dan niets."
        />
        <PaneelKop>Bereikbaar</PaneelKop>
        <Field label="E-mailadres" name="email" type="email" placeholder="marieke@voncken.nl" />
        <Field label="Mobiel" name="mobiel" placeholder="06 12 34 56 78" />
        <Field label="Telefoon" name="telefoon" placeholder="043 601 22 38" />
        <Field label="LinkedIn" name="linkedin" placeholder="linkedin.com/in/..." />
        <PaneelKop>Verder</PaneelKop>
        <div className="sm:col-span-2">
          <Verjaardag dag={null} maand={null} jaar={null} />
        </div>
        <div className="sm:col-span-2">
          <TextArea label="Notities" name="notities" rows={2} />
        </div>
        <Check label="Dit is de vaste contactpersoon" name="vast" hint="De vorige vaste contactpersoon verliest die rol." />
        <Check label="Ontvangt de facturen" name="facturen" />
      </ActionForm>
    </Paneel>
  )

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px]">Contactpersonen</h2>
          <p className="mt-0.5 text-sm text-gray-600">Wie je belt en wie de facturen krijgt. Los van wie er kan inloggen.</p>
        </div>
        {contacts.length > 0 && toevoegen('rustig')}
      </div>

      {contacts.length === 0 ? (
        <LeegVlak
          titel="Nog geen contactpersonen"
          tekst="Leg vast wie je belt, wie beslist en wie de facturen krijgt. De vaste contactpersoon komt ook in elke campagnebriefing."
          actie={toevoegen('primair')}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {contacts.map((c) => {
            const nummer = c.mobile ?? c.phone
            return (
              <li key={c.id} className="flex flex-col rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <Avatar naam={c.name} imageId={c.avatarImageId} maat={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-medium">{c.name}</p>
                    <p className="truncate text-sm text-gray-600">
                      {[c.jobTitle, c.department].filter(Boolean).join(' · ') || 'Functie onbekend'}
                    </p>
                    {(c.isPrimary || c.receivesInvoices) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {c.isPrimary && (
                          <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-2 py-0.5 text-xs">Vaste contactpersoon</span>
                        )}
                        {c.receivesInvoices && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Ontvangt facturen</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="text-jr-link flex items-center gap-2 truncate hover:underline">
                      <Pictogram soort="mail" />
                      {c.email}
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 text-gray-400">
                      <Pictogram soort="mail" />
                      geen e-mailadres
                    </p>
                  )}
                  {nummer ? (
                    <a href={`tel:${nummer.replace(/\s/g, '')}`} className="text-jr-link flex items-center gap-2 hover:underline">
                      <Pictogram soort="telefoon" />
                      {nummer}
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 text-gray-400">
                      <Pictogram soort="telefoon" />
                      geen nummer
                    </p>
                  )}
                </div>
                {c.notes && <p className="mt-3 line-clamp-2 text-xs text-gray-600">{c.notes}</p>}

                <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-gray-200 pt-3 mt-4">
                  <Paneel knop="Wijzigen" titel={c.name} uitleg="Alles hieronder is optioneel behalve de naam." stijl="klein" sluitNaOpslaan={false}>
                    <ActionForm action={wijzigContactpersoon} submitLabel="Opslaan" resetOnSuccess={false} className="grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="contactId" value={c.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <PaneelKop>Wie</PaneelKop>
                      <NaamVelden c={c} />
                      <Field label="Functie" name="functie" defaultValue={c.jobTitle ?? ''} />
                      <Field label="Afdeling" name="afdeling" defaultValue={c.department ?? ''} placeholder="Directie" />
                      <PaneelKop>Bereikbaar</PaneelKop>
                      <Field label="E-mailadres" name="email" type="email" defaultValue={c.email ?? ''} />
                      <Field label="Mobiel" name="mobiel" defaultValue={c.mobile ?? ''} />
                      <Field label="Telefoon" name="telefoon" defaultValue={c.phone ?? ''} />
                      <Field label="LinkedIn" name="linkedin" defaultValue={c.linkedinUrl ?? ''} />
                      <div className="sm:col-span-2">
                        <TextArea label="Notities" name="notities" rows={2} defaultValue={c.notes ?? ''} />
                      </div>
                      <Check label="Dit is de vaste contactpersoon" name="vast" defaultChecked={c.isPrimary} />
                      <Check label="Ontvangt de facturen" name="facturen" defaultChecked={c.receivesInvoices} />
                      <Persoonlijk c={c} />
                    </ActionForm>

                    <div className="mt-8 border-t border-gray-200 pt-6">
                      <Kinderen contactId={c.id} slug={slug} kinderen={kinderenPer.get(c.id) ?? []} />
                    </div>
                    <div className="mt-6 border-t border-gray-200 pt-6">
                      <AfbeeldingKiezer soort="contact" doelId={c.id} naam={c.name} imageId={c.avatarImageId} slug={slug} />
                    </div>
                  </Paneel>
                  {!c.isPrimary && (
                    <ActionForm
                      action={maakVasteContactpersoon}
                      submitLabel="Maak vast"
                      submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs !min-h-0"
                      resetOnSuccess={false}
                      meldGelukt={false}
                      className=""
                    >
                      <input type="hidden" name="contactId" value={c.id} />
                      <input type="hidden" name="slug" value={slug} />
                    </ActionForm>
                  )}
                  <span className="flex-1" />
                  <ActionForm
                    action={verwijderContactpersoon}
                    submitLabel="Verwijderen"
                    submitClassName="text-gray-500 hover:bg-[#FDECEA] hover:text-[#C02A22] !px-2 !py-1 !text-xs !min-h-0"
                    resetOnSuccess={false}
                    meldGelukt={false}
                    className=""
                  >
                    <input type="hidden" name="contactId" value={c.id} />
                    <input type="hidden" name="slug" value={slug} />
                  </ActionForm>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Voornaam, tussenvoegsel en achternaam naast elkaar, over de volle breedte. */
function NaamVelden({ c }: { c?: Contact }) {
  return (
    <div className="grid items-end gap-3 sm:col-span-2 sm:grid-cols-[1fr_130px_1fr]">
      <Field label="Voornaam" name="voornaam" defaultValue={c?.firstName ?? ''} placeholder="Marieke" />
      <Field label="Tussenvoegsel" name="tussenvoegsel" defaultValue={c?.infix ?? ''} placeholder="van der" />
      <Field label="Achternaam" name="achternaam" defaultValue={c?.lastName ?? ''} placeholder="Voncken" />
    </div>
  )
}

function Pictogram({ soort }: { soort: 'mail' | 'telefoon' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.7">
      {soort === 'mail' ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3.5 6.5 8.5 6 8.5-6" />
        </>
      ) : (
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
      )}
    </svg>
  )
}

export function Partners({
  links,
  alle,
  organizationId,
  slug,
}: {
  links: PartnerLink[]
  alle: Partner[]
  organizationId: string
  slug: string
}) {
  const gekoppeld = new Set(links.map((l) => l.partnerId))
  const beschikbaar = alle.filter((p) => !gekoppeld.has(p.id))

  return (
    <section>
      <h2 className="mb-1 text-lg">Partners</h2>
      <p className="mb-3 text-sm text-gray-600">
        De externen die voor deze klant werken, met het tarief dat hier geldt.
      </p>

      {links.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">
          Nog geen partners gekoppeld.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {l.role}
                  <span className="text-gray-600"> &middot; {l.partner.name}</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {partnerTypeLabels[l.partner.type]}
                  {l.partner.contactName && <> &middot; {l.partner.contactName}</>}
                  {l.partner.email && <> &middot; {l.partner.email}</>}
                  {l.since && <> &middot; sinds {formatDate(l.since)}</>}
                </p>
                {l.notes && <p className="mt-1 text-xs text-gray-500">{l.notes}</p>}

                <Uitklap label="Afspraak wijzigen">
                  <ActionForm
                    action={wijzigKoppeling}
                    submitLabel="Opslaan"
                    resetOnSuccess={false}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="linkId" value={l.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <Field label="Rol" name="rol" required defaultValue={l.role} />
                    <Field
                      label="Afwijkend uurtarief"
                      name="tarief"
                      defaultValue={
                        l.customHourlyRateCents === null
                          ? ''
                          : (l.customHourlyRateCents / 100).toFixed(2).replace('.', ',')
                      }
                      hint={
                        l.partner.hourlyRateCents === null
                          ? 'Deze partner heeft geen standaardtarief.'
                          : `Leeg laten betekent het standaardtarief van ${formatCents(l.partner.hourlyRateCents)}.`
                      }
                    />
                    <div className="sm:col-span-2">
                      <Field label="Notities" name="notities" defaultValue={l.notes ?? ''} />
                    </div>
                  </ActionForm>
                </Uitklap>
              </div>

              <div className="shrink-0 text-right">
                {l.effectiveHourlyRateCents !== null ? (
                  <>
                    <p className="tabular text-sm">{formatCents(l.effectiveHourlyRateCents)}</p>
                    <p className="text-xs text-gray-500">
                      per uur
                      {l.customHourlyRateCents !== null && (
                        <span className="text-jr-orange"> &middot; klantafspraak</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">geen tarief</p>
                )}
                <div className="mt-1">
                  <ActionForm
                    action={ontkoppelPartner}
                    submitLabel="Ontkoppelen"
                    submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                    resetOnSuccess={false}
                    className=""
                  >
                    <input type="hidden" name="linkId" value={l.id} />
                    <input type="hidden" name="slug" value={slug} />
                  </ActionForm>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-3">
        <summary className="text-jr-blue cursor-pointer text-sm">Partner koppelen</summary>
        <div className="mt-3 rounded-xl bg-white p-6 shadow-sm">
          {beschikbaar.length === 0 ? (
            <p className="text-sm text-gray-600">
              {alle.length === 0 ? (
                <>
                  Er zijn nog geen partners.{' '}
                  <a href="/beheer/partners" className="text-jr-blue hover:underline">
                    Voeg er eerst een toe
                  </a>
                  .
                </>
              ) : (
                'Alle partners zijn al aan deze klant gekoppeld.'
              )}
            </p>
          ) : (
            <ActionForm action={koppelPartner} submitLabel="Koppelen" className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="organizationId" value={organizationId} />
              <input type="hidden" name="slug" value={slug} />
              <Select
                label="Partner"
                name="partnerId"
                options={beschikbaar.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ${partnerTypeLabels[p.type]}${
                    p.hourlyRateCents ? ` · ${formatCents(p.hourlyRateCents)}/uur` : ''
                  }`,
                }))}
              />
              <Field label="Rol bij deze klant" name="rol" required placeholder="Huisfotograaf" />
              <Field
                label="Afwijkend uurtarief"
                name="tarief"
                placeholder="80,00"
                hint="Leeg laten neemt het standaardtarief van de partner."
              />
              <Field label="Notities" name="notities" />
            </ActionForm>
          )}
        </div>
      </details>
    </section>
  )
}

export function Accounts({
  accounts,
  organizationId,
  slug,
}: {
  accounts: Account[]
  organizationId: string
  slug: string
}) {
  const zonderKluis = accounts.filter((a) => a.active && !a.vaultReference).length

  return (
    <section>
      <h2 className="mb-1 text-lg">Accounts en toegangen</h2>
      <p className="mb-3 text-sm text-gray-600">
        Welke systemen deze klant heeft en wie erbij kan. <strong className="font-normal">
        Wachtwoorden staan hier bewust niet in</strong> — die horen in de wachtwoordmanager;
        hier leg je alleen vast waar ze te vinden zijn.
      </p>

      {zonderKluis > 0 && (
        <p className="border-jr-orange bg-jr-orange/5 mb-3 rounded border-l-4 p-3 text-sm">
          {zonderKluis === 1
            ? 'Bij 1 account staat niet waar het wachtwoord te vinden is.'
            : `Bij ${zonderKluis} accounts staat niet waar het wachtwoord te vinden is.`}
        </p>
      )}

      {accounts.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">
          Nog geen accounts vastgelegd.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {accounts.map((a) => (
            <li
              key={a.id}
              className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3.5 sm:px-6 ${
                a.active ? '' : 'opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">{a.name}</span>
                  {a.system && (
                    <span className="bg-jr-lightblue text-jr-deepblue rounded px-1.5 py-0.5 text-xs">
                      {a.system}
                    </span>
                  )}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {accountOwnerLabels[a.owner]}
                  </span>
                  {a.hasMfa && (
                    <span className="bg-jr-green/10 text-jr-green rounded-full px-2 py-0.5 text-xs">
                      2FA
                    </span>
                  )}
                  {!a.active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      niet meer in gebruik
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs text-gray-600">
                  {a.loginHint && <>inloggen met {a.loginHint}</>}
                  {a.url && (
                    <>
                      {a.loginHint && ' · '}
                      <a href={a.url} className="hover:text-jr-blue" rel="noreferrer noopener">
                        {a.url.replace(/^https?:\/\//, '')}
                      </a>
                    </>
                  )}
                </p>

                <p className="mt-1 text-xs">
                  {a.vaultReference ? (
                    <span className="text-gray-500">
                      wachtwoord: {a.vaultReference}
                    </span>
                  ) : (
                    <span className="text-jr-orange">
                      niet vastgelegd waar het wachtwoord staat
                    </span>
                  )}
                </p>

                {a.mfaNotes && <p className="mt-1 text-xs text-gray-500">2FA: {a.mfaNotes}</p>}
                {a.notes && <p className="mt-1 text-xs text-gray-500">{a.notes}</p>}

                <Uitklap label="Wijzigen">
                  <ActionForm
                    action={wijzigAccount}
                    submitLabel="Opslaan"
                    resetOnSuccess={false}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="accountId" value={a.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <Field label="Naam" name="naam" required defaultValue={a.name} />
                    <Select
                      label="Systeem"
                      name="systeem"
                      defaultValue={a.system ?? ''}
                      options={[
                        { value: '', label: 'Kies of laat leeg' },
                        ...COMMON_SYSTEMS.map((x) => ({ value: x, label: x })),
                      ]}
                    />
                    <Field label="URL" name="url" defaultValue={a.url ?? ''} />
                    <Field label="Inlognaam" name="inlognaam" defaultValue={a.loginHint ?? ''} />
                    <Select
                      label="Van wie is het account"
                      name="eigenaar"
                      defaultValue={a.owner}
                      options={Object.entries(accountOwnerLabels).map(([value, label]) => ({ value, label }))}
                    />
                    <Field
                      label="Waar staat het wachtwoord"
                      name="kluis"
                      defaultValue={a.vaultReference ?? ''}
                      hint="Een verwijzing, bijvoorbeeld 1Password › Klanten › Voncken. Nooit het wachtwoord zelf."
                    />
                    <Field label="2FA-notities" name="mfaNotities" defaultValue={a.mfaNotes ?? ''} />
                    <Field label="Notities" name="notities" defaultValue={a.notes ?? ''} />
                    <Check label="Tweestapsverificatie staat aan" name="mfa" defaultChecked={a.hasMfa} />
                    <Check
                      label="Niet meer in gebruik"
                      name="inactief"
                      defaultChecked={!a.active}
                      hint="Blijft staan in het register, maar telt niet meer mee als openstaand."
                    />
                  </ActionForm>
                </Uitklap>
              </div>

              <div className="shrink-0">
                <ActionForm
                  action={verwijderAccount}
                  submitLabel="Verwijderen"
                  submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                  resetOnSuccess={false}
                  className=""
                >
                  <input type="hidden" name="accountId" value={a.id} />
                  <input type="hidden" name="slug" value={slug} />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-3">
        <summary className="text-jr-blue cursor-pointer text-sm">Account toevoegen</summary>
        <div className="mt-3 rounded-xl bg-white p-6 shadow-sm">
          <ActionForm action={nieuwAccount} submitLabel="Toevoegen" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <Field label="Naam" name="naam" required placeholder="WordPress admin" />
            <Select
              label="Systeem"
              name="systeem"
              defaultValue=""
              options={[{ value: '', label: 'Kies of laat leeg' }, ...COMMON_SYSTEMS.map((s) => ({ value: s, label: s }))]}
            />
            <Field label="Adres" name="url" placeholder="https://klant.nl/wp-admin" />
            <Field label="Inloggen met" name="inlognaam" placeholder="marketing@klant.nl" />
            <Select
              label="Eigenaar van het account"
              name="eigenaar"
              defaultValue="client"
              options={Object.entries(accountOwnerLabels).map(([value, label]) => ({ value, label }))}
              hint="Wie het account kan intrekken als de samenwerking stopt."
            />
            <Field
              label="Waar staat het wachtwoord"
              name="kluis"
              placeholder="1Password → Klanten → ..."
              hint="Een verwijzing, geen wachtwoord."
            />
            <div className="sm:col-span-2">
              <Field label="Notities" name="notities" />
            </div>
            <Check label="Er zit tweestapsverificatie op" name="mfa" />
            <Field label="Wie geeft de 2FA-code" name="mfaNotities" placeholder="Telefoon van Marieke" />
          </ActionForm>
        </div>
      </details>
    </section>
  )
}

export function Bedrijfsgegevens({
  org,
  slug,
}: {
  org: Organization
  slug: string
}) {
  const datumVeld = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '')

  return (
    <section>
      <h2 className="mb-1 text-lg">Bedrijfsgegevens</h2>
      <div className="mb-4 rounded-xl bg-white p-6 shadow-sm">
        <AfbeeldingKiezer
          soort="klant"
          doelId={org.id}
          naam={org.name}
          imageId={org.logoImageId}
          slug={slug}
          label="Logo"
          rond={false}
        />
      </div>
      <p className="mb-3 text-sm text-gray-600">
        {[org.industry, org.city, org.kvkNumber && `KvK ${org.kvkNumber}`]
          .filter(Boolean)
          .join(' · ') || 'Nog niets ingevuld.'}
      </p>

      <details className="rounded-xl bg-white p-6 shadow-sm">
        <summary className="text-jr-blue cursor-pointer text-sm">Gegevens aanpassen</summary>
        <div className="mt-4">
          <ActionForm
            action={bedrijfsgegevens}
            submitLabel="Opslaan"
            resetOnSuccess={false}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="organizationId" value={org.id} />
            <input type="hidden" name="slug" value={slug} />

            <Select
              label="Status"
              name="status"
              defaultValue={org.status}
              options={Object.entries(organizationStatusLabels).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label="Branche"
              name="branche"
              defaultValue={org.industry ?? ''}
              options={[
                { value: '', label: 'Geen' },
                ...BRANCHES.map((b) => ({ value: b, label: b })),
              ]}
            />
            <Field label="KvK-nummer" name="kvk" defaultValue={org.kvkNumber ?? ''} placeholder="14012345" />
            <Field label="Btw-nummer" name="btw" defaultValue={org.vatNumber ?? ''} placeholder="NL001234567B01" />
            <Field label="Website" name="website" defaultValue={org.website ?? ''} placeholder="klant.nl" />
            <Field label="Telefoon" name="telefoon" defaultValue={org.phone ?? ''} />
            <Field label="Algemeen e-mailadres" name="email" defaultValue={org.email ?? ''} />
            <Field label="Klant sinds" name="klantSinds" type="date" defaultValue={datumVeld(org.clientSince)} />
            <div className="sm:col-span-2">
              <Field label="Adres" name="adres" defaultValue={org.addressLine ?? ''} placeholder="Straat 1" />
            </div>
            <Field label="Postcode" name="postcode" defaultValue={org.postalCode ?? ''} placeholder="6301 AA" />
            <Field label="Plaats" name="plaats" defaultValue={org.city ?? ''} placeholder="Valkenburg" />
            <Select
              label="Regio"
              name="regio"
              defaultValue={org.region ?? ''}
              options={[
                { value: '', label: 'Niet ingevuld' },
                ...REGIOS.map((r) => ({ value: r, label: r })),
              ]}
              hint="Hierop kun je filteren in het klantenoverzicht."
            />
            <Select
              label="Rechtsvorm"
              name="rechtsvorm"
              defaultValue={org.legalForm ?? ''}
              options={[
                { value: '', label: 'Niet ingevuld' },
                ...Object.entries(RECHTSVORM_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />

            <div className="sm:col-span-2">
              <p className="mt-2 mb-1 border-t border-gray-200 pt-3 text-xs font-bold text-gray-600">
                Boekhouding
              </p>
              <p className="mb-2 text-xs text-gray-500">
                Dezelfde velden als in Moneybird, zodat die kant op te synchroniseren is. Het
                klantnummer is het belangrijkste: daar hangt de koppeling met ClickUp aan, en
                de database laat er geen twee dezelfde toe.
              </p>
            </div>

            <Field
              label="Klantnummer"
              name="klantnummer"
              defaultValue={org.customerNumber ?? ''}
              placeholder="672"
            />
            <Select
              label="Type"
              name="klanttype"
              defaultValue={org.klantType ?? ''}
              options={[
                { value: '', label: 'Niet ingevuld' },
                { value: 'bedrijf', label: 'Bedrijf' },
                { value: 'particulier', label: 'Particulier' },
              ]}
            />
            <Select
              label="Verzendmethode facturen"
              name="verzendmethode"
              defaultValue={org.verzendmethode ?? ''}
              options={[
                { value: '', label: 'Niet ingevuld' },
                { value: 'email', label: 'E-mail' },
                { value: 'peppol', label: 'Peppol' },
                { value: 'zelf', label: 'Zelf verzenden' },
              ]}
            />
            <Field
              label="Projectnummer"
              name="projectnummer"
              defaultValue={org.projectNumber ?? ''}
            />
            <Field
              label="E-mailadres facturen"
              name="factuurmail"
              type="email"
              defaultValue={org.invoiceEmail ?? ''}
              placeholder="crediteuren@klant.nl"
            />
            <Field
              label="T.a.v. facturen"
              name="tavfacturen"
              defaultValue={org.invoiceAttn ?? ''}
            />

            <div className="sm:col-span-2">
              <p className="mt-2 mb-1 border-t border-gray-200 pt-3 text-xs font-bold text-gray-600">
                Het bedrijf
              </p>
            </div>

            <Field
              label="Opgericht op"
              name="opgericht"
              type="date"
              defaultValue={datumVeld(org.foundedOn)}
              hint="Levert ook jubilea op."
            />
            <Select
              label="Relatiegezondheid"
              name="gezondheid"
              defaultValue={org.relationHealth ?? ''}
              options={[
                { value: '', label: 'Niet beoordeeld' },
                ...Object.entries(GEZONDHEID_LABELS).map(([value, label]) => ({ value, label })),
              ]}
              hint="Jouw oordeel, geen berekening. Een klant kan keurig betalen en toch weg willen."
            />
            <Field
              label="Aantal medewerkers"
              name="medewerkers"
              type="number"
              defaultValue={org.employeeCount === null ? '' : String(org.employeeCount)}
            />
            <Field
              label="Jaaromzet (bij benadering)"
              name="jaaromzet"
              defaultValue={
                org.annualRevenueCents === null
                  ? ''
                  : (org.annualRevenueCents / 100).toFixed(2).replace('.', ',')
              }
              placeholder="1500000,00"
            />
            <div className="sm:col-span-2">
              <Field
                label="Kernactiviteit"
                name="kernactiviteit"
                defaultValue={org.coreActivity ?? ''}
                placeholder="Waar verdienen ze hun geld mee?"
              />
            </div>

            <div className="sm:col-span-2">
              <p className="mt-2 mb-1 border-t border-gray-200 pt-3 text-xs font-bold text-gray-600">
                Online
              </p>
            </div>
            <Field label="LinkedIn" name="linkedin" defaultValue={org.linkedinUrl ?? ''} />
            <Field label="Facebook" name="facebook" defaultValue={org.facebookUrl ?? ''} />
            <Field label="Instagram" name="instagram" defaultValue={org.instagramUrl ?? ''} />
            <Field label="YouTube" name="youtube" defaultValue={org.youtubeUrl ?? ''} />
            <Field label="TikTok" name="tiktok" defaultValue={org.tiktokUrl ?? ''} />

            <div className="sm:col-span-2">
              <p className="mt-2 mb-1 border-t border-gray-200 pt-3 text-xs font-bold text-gray-600">
                Wat je moet weten
              </p>
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Vorige bureaus"
                name="vorigebureaus"
                defaultValue={org.previousAgencies ?? ''}
                placeholder="Bij wie zaten ze, en waarom zijn ze daar weg?"
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Alert zijn op"
                name="alert"
                defaultValue={org.alertOn ?? ''}
                placeholder="Kort en concreet: waar moet je bij deze klant op letten?"
              />
            </div>
            <div className="sm:col-span-2">
              <Field label="Notities" name="notities" defaultValue={org.notes ?? ''} />
            </div>
          </ActionForm>
        </div>
      </details>
    </section>
  )
}
