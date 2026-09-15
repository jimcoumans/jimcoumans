import { ActionForm, Field, Select, Check, Uitklap } from './ActionForm'
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
    'focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none'
  return (
    <div>
      <p className="mb-1 text-xs text-gray-600">
        Verjaardag<span className="text-gray-400"> (optioneel)</span>
      </p>
      <div className="grid grid-cols-[72px_1fr_88px] gap-2">
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
    'focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none'

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
      <div className="sm:col-span-2">
        <p className="mt-2 mb-1 border-t border-gray-200 pt-3 text-xs font-bold text-gray-600">
          Persoonlijk
        </p>
        <p className="mb-2 text-xs text-gray-500">
          Alles hieronder is optioneel en dient één doel: dat je iemand kent in plaats van
          alleen kunt bereiken. Een half ingevuld profiel is beter dan een leeg profiel.
        </p>
      </div>

      <Verjaardag dag={c.birthDay} maand={c.birthMonth} jaar={c.birthYear} />
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
  return (
    <section>
      <h2 className="mb-1 text-lg">Contactpersonen</h2>
      <p className="mb-3 text-sm text-gray-600">
        Wie je belt en wie de facturen krijgt. Los van wie er kan inloggen.
      </p>

      {contacts.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">
          Nog geen contactpersonen vastgelegd.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {contacts.map((c) => (
            <li key={c.id} className="px-4 py-3.5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 gap-3">
                  <Avatar naam={c.name} imageId={c.avatarImageId} maat={40} />
                  <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{c.name}</span>
                    {c.isPrimary && (
                      <span className="bg-jr-blue/10 text-jr-deepblue rounded-full px-2 py-0.5 text-xs">
                        Vaste contactpersoon
                      </span>
                    )}
                    {c.receivesInvoices && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        Facturen
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-xs text-gray-600">
                    {c.jobTitle && <>{c.jobTitle} &middot; </>}
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:text-jr-blue">
                        {c.email}
                      </a>
                    ) : (
                      'geen e-mailadres'
                    )}
                    {c.mobile && <> &middot; {c.mobile}</>}
                    {c.phone && !c.mobile && <> &middot; {c.phone}</>}
                  </p>

                  {c.notes && <p className="mt-1 text-xs text-gray-500">{c.notes}</p>}

                  <Uitklap label="Wijzigen">
                    <ActionForm
                      action={wijzigContactpersoon}
                      submitLabel="Opslaan"
                      resetOnSuccess={false}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <input type="hidden" name="contactId" value={c.id} />
                      <input type="hidden" name="slug" value={slug} />
                      {/* Voornaam, tussenvoegsel en achternaam horen bij
                          elkaar, dus staan ze naast elkaar. Het tussenvoegsel
                          krijgt weinig ruimte: er past "van der" in en meer
                          hoeft niet. */}
                      <div className="grid gap-3 sm:grid-cols-[1fr_5rem_1fr]">
                        <Field label="Voornaam" name="voornaam" defaultValue={c.firstName ?? ''} />
                        <Field
                          label="Tussenvoegsel"
                          name="tussenvoegsel"
                          defaultValue={c.infix ?? ''}
                          placeholder="van der"
                        />
                        <Field label="Achternaam" name="achternaam" defaultValue={c.lastName ?? ''} />
                      </div>
                      <Field label="Functie" name="functie" defaultValue={c.jobTitle ?? ''} />
                      <Field
                        label="Afdeling"
                        name="afdeling"
                        defaultValue={c.department ?? ''}
                        placeholder="Directie"
                      />
                      <Field label="E-mailadres" name="email" type="email" defaultValue={c.email ?? ''} />
                      <Field label="Mobiel" name="mobiel" defaultValue={c.mobile ?? ''} />
                      <Field label="Telefoon" name="telefoon" defaultValue={c.phone ?? ''} />
                      <Field label="LinkedIn" name="linkedin" defaultValue={c.linkedinUrl ?? ''} />
                      <div className="sm:col-span-2">
                        <Field label="Notities" name="notities" defaultValue={c.notes ?? ''} />
                      </div>
                      <Check label="Dit is de vaste contactpersoon" name="vast" defaultChecked={c.isPrimary} />
                      <Check label="Ontvangt de facturen" name="facturen" defaultChecked={c.receivesInvoices} />

                      <Persoonlijk c={c} />
                    </ActionForm>

                    <Kinderen
                      contactId={c.id}
                      slug={slug}
                      kinderen={kinderenPer.get(c.id) ?? []}
                    />

                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <AfbeeldingKiezer
                        soort="contact"
                        doelId={c.id}
                        naam={c.name}
                        imageId={c.avatarImageId}
                        slug={slug}
                      />
                    </div>
                  </Uitklap>
                  </div>
                </div>

                <div className="flex shrink-0 gap-3">
                  {!c.isPrimary && (
                    <ActionForm
                      action={maakVasteContactpersoon}
                      submitLabel="Maak vast"
                      submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                      resetOnSuccess={false}
                      className=""
                    >
                      <input type="hidden" name="contactId" value={c.id} />
                      <input type="hidden" name="slug" value={slug} />
                    </ActionForm>
                  )}
                  <ActionForm
                    action={verwijderContactpersoon}
                    submitLabel="Verwijderen"
                    submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                    resetOnSuccess={false}
                    className=""
                  >
                    <input type="hidden" name="contactId" value={c.id} />
                    <input type="hidden" name="slug" value={slug} />
                  </ActionForm>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-3">
        <summary className="text-jr-blue cursor-pointer text-sm">Contactpersoon toevoegen</summary>
        <div className="mt-3 rounded-xl bg-white p-5 shadow-sm">
          <ActionForm
            action={nieuweContactpersoon}
            submitLabel="Toevoegen"
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <div className="grid gap-3 sm:grid-cols-[1fr_5rem_1fr]">
              <Field label="Voornaam" name="voornaam" placeholder="Marieke" />
              <Field label="Tussenvoegsel" name="tussenvoegsel" placeholder="van der" />
              <Field label="Achternaam" name="achternaam" placeholder="Voncken" />
            </div>
            <Select
              label="Geslacht"
              name="aanhef"
              options={GESLACHT_OPTIES}
              hint="Bepaalt ook hoe een brief begint. Weet je het niet, kies dan niets."
            />
            <Field label="Functie" name="functie" placeholder="Eigenaar" />
            <Verjaardag dag={null} maand={null} jaar={null} />
            <Field label="E-mailadres" name="email" type="email" placeholder="marieke@voncken.nl" />
            <Field label="Mobiel" name="mobiel" placeholder="06 12 34 56 78" />
            <Field label="Telefoon" name="telefoon" placeholder="043 601 22 38" />
            <Field label="LinkedIn" name="linkedin" placeholder="linkedin.com/in/..." />
            <div className="sm:col-span-2">
              <Field label="Notities" name="notities" />
            </div>
            <Check label="Dit is de vaste contactpersoon" name="vast"
              hint="De vorige vaste contactpersoon verliest die rol." />
            <Check label="Ontvangt de facturen" name="facturen" />
          </ActionForm>
        </div>
      </details>
    </section>
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
        <div className="mt-3 rounded-xl bg-white p-5 shadow-sm">
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
        <div className="mt-3 rounded-xl bg-white p-5 shadow-sm">
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
      <div className="mb-4 rounded-xl bg-white p-5 shadow-sm">
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

      <details className="rounded-xl bg-white p-5 shadow-sm">
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
            <div className="sm:col-span-2">
              <Field label="Notities" name="notities" defaultValue={org.notes ?? ''} />
            </div>
          </ActionForm>
        </div>
      </details>
    </section>
  )
}
