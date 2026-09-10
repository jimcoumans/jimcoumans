import { ActionForm, Field, Select, Check } from './ActionForm'
import {
  nieuweContactpersoon, maakVasteContactpersoon, verwijderContactpersoon,
  nieuwAccount, verwijderAccount,
  koppelPartner, ontkoppelPartner,
  bedrijfsgegevens,
} from '@/app/beheer/crm-actions'
import {
  BRANCHES, COMMON_SYSTEMS, partnerTypeLabels, accountOwnerLabels,
  organizationStatusLabels,
} from '@/lib/crm'
import type { PartnerLink } from '@/lib/crm'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import type { Contact, Account, Partner, Organization } from '@/db/schema'

/* De CRM-blokken op de klantpagina: contactpersonen, partners, accounts en
   de bedrijfsgegevens. */

export function Contactpersonen({
  contacts,
  organizationId,
  slug,
}: {
  contacts: Contact[]
  organizationId: string
  slug: string
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
            <Field label="Naam" name="naam" required placeholder="Marieke Voncken" />
            <Field label="Functie" name="functie" placeholder="Eigenaar" />
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
