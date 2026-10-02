import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getOrganizationBySlug, listStaff } from '@/lib/admin'
import { listActiveServices } from '@/lib/services'
import { getWalletEntries, getReversedEntryIds } from '@/lib/ledger'
import { getOrganizationInvoices, invoiceStatusLabels, invoiceStatusStyles } from '@/lib/invoices'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Uitklap } from '@/components/ActionForm'
import { boek, draaiTerug, nieuweWallet, nieuweGebruiker, wisselToegang } from '../../actions'
import { boekDienst, nieuweFactuur, zetFactuurStatus } from '../../service-actions'
import { nieuwAbonnement } from '../../subscription-actions'
import {
  crediteerFactuurActie,
  wijzigFactuurActie,
  verwijderFactuurActie,
} from '../../factuur-actions'
import { SubscriptionCard, NewSubscriptionForm } from '@/components/SubscriptionCard'
import { listSubscriptions } from '@/lib/billing'
import { listContacts, listAccounts, listPartnersForOrganization, listActivePartners, listKinderen, listVestigingen, listConcurrenten, listDoelen, organizationStatusLabels, organizationStatusStyles } from '@/lib/crm'
import { Contactpersonen, Partners, Accounts, Bedrijfsgegevens } from '@/components/CrmSections'
import { Vestigingen, Concurrenten, Doelen } from '@/components/Bedrijfsprofiel'
import { Tijdlijn } from '@/components/Tijdlijn'
import { KlantCampagnes, VasteDoelgroepen } from '@/components/KlantCampagnes'
import { KlantreisBalk, KlantreisDetail } from '@/components/Klantreis'
import { Klantprofiel } from '@/components/Klantprofiel'
import { getKlantreis } from '@/lib/klantreis'
import { getProfiel } from '@/lib/klantprofiel'
import { listOwners } from '@/lib/crm-owners'
import { merkTelling } from '@/lib/merkkluis'
import { getTijdlijn, laatsteContact } from '@/lib/tijdlijn'
import { BookServiceForm } from '@/components/BookServiceForm'
import { formatQuantity, unitShort } from '@/lib/quantity'
import { formatCents, formatSignedCents } from '@/lib/money'
import { formatDate, formatDateInput } from '@/lib/dates'

import { PRODUCTGROEPEN } from '@/lib/services'

/**
 * Netlify kapt een functie standaard na tien seconden af. Deze pagina haalt
 * meerdere overzichten tegelijk op, en vanaf een serverless functie kost elke
 * query een netwerkronde naar de database. Zit je daarboven, dan krijgt de
 * bezoeker een 502 zonder dat er ergens staat waarom. Zesentwintig seconden
 * is het maximum voor een gewone functie; het is een vangnet, geen streven.
 */
export const maxDuration = 26

/* De klantkaart in tabbladen: zo zie je eerst het overzicht en zoek je de
   rest op waar het hoort, in plaats van door één lange pagina te scrollen. */
const TABS = [
  { key: 'overzicht', label: 'Overzicht' },
  { key: 'klantreis', label: 'Klantreis' },
  { key: 'profiel', label: 'Klantprofiel' },
  { key: 'budget', label: 'Budget en facturen' },
  { key: 'campagnes', label: 'Campagnes' },
  { key: 'contacten', label: 'Contacten' },
] as const
type Tab = (typeof TABS)[number]['key']

/** Groen als er budget is, rood als het negatief is, zwart op nul. */
function saldoKleur(cents: number): string {
  return cents > 0 ? 'text-[#1D7D3F]' : cents < 0 ? 'text-[#C02A22]' : 'text-jr-text'
}

export default async function KlantPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { slug } = await params
  const { tab: tabParam } = await searchParams
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : 'overzicht'
  const klant = await getOrganizationBySlug(slug)
  if (!klant) notFound()

  const [facturen, diensten, team, abonnementen, contacten, accounts, partnerLinks, allePartners] =
    await Promise.all([
      getOrganizationInvoices(klant.organization.id, 20),
      listActiveServices(),
      listStaff(),
      listSubscriptions({ organizationId: klant.organization.id }),
      listContacts(klant.organization.id),
      listAccounts(klant.organization.id),
      listPartnersForOrganization(klant.organization.id),
      listActivePartners(),
    ])
  // De kinderen apart, want die hangen aan de contactpersonen die we net
  // hebben opgehaald.
  const kinderenPer = await listKinderen(contacten.map((c) => c.id))
  const [vestigingen, concurrenten, doelen, tijdlijn, laatsteContactOp] = await Promise.all([
    listVestigingen(klant.organization.id),
    listConcurrenten(klant.organization.id),
    listDoelen(klant.organization.id),
    getTijdlijn(klant.organization.id, { limiet: 40 }),
    laatsteContact(klant.organization.id),
  ])
  const [klantreis, profiel, eigenaren, merk] = await Promise.all([
    getKlantreis(klant.organization.id),
    getProfiel(klant.organization.id),
    listOwners(klant.organization.id),
    merkTelling(klant.organization.id),
  ])
  const vandaag = new Date().toISOString().slice(0, 10)

  // Het budget in één oogopslag: wat er elke maand bijkomt, wat er nu staat
  // en wanneer de volgende bijschrijving is.
  const actief = abonnementen.filter((a) => a.subscription.status === 'active')
  const perMaand = actief.reduce((som, a) => som + a.subscription.amountExclVatCents, 0)
  const saldo = klant.wallets.reduce((som, w) => som + (w.balance?.balanceCents ?? 0), 0)
  const volgende = actief
    .map((a) => a.nextBillingOn)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0]

  return (
    <AppShell user={user} actief="klanten">
        <a href="/beheer/klanten" className="text-jr-blue text-sm hover:underline">
          &larr; Alle klanten
        </a>

        <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] sm:text-[32px]">{klant.organization.name}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs ${organizationStatusStyles[klant.organization.status]}`}
              >
                {organizationStatusLabels[klant.organization.status]}
              </span>
            </div>
          <p className="mt-1 text-sm text-gray-600">
            {[
              `${klant.wallets.length} ${klant.wallets.length === 1 ? 'wallet' : 'wallets'}`,
              klant.organization.industry,
              contacten.find((c) => c.isPrimary)?.name,
              klant.organization.phone,
            ]
              .filter(Boolean)
              .join(' · ')}
            {klant.organization.website && (
              <>
                {' · '}
                <a
                  href={
                    klant.organization.website.startsWith('http')
                      ? klant.organization.website
                      : `https://${klant.organization.website}`
                  }
                  className="hover:text-jr-blue"
                  rel="noreferrer noopener"
                >
                  {klant.organization.website.replace(/^https?:\/\//, '')}
                </a>
              </>
            )}
          </p>
          </div>
          {/* Het actuele budget, rechtsboven: groen, rood of zwart. */}
          <div className="text-right">
            <p className="text-xs text-gray-600">Actueel budget</p>
            <p className={`font-display tabular text-[32px] leading-tight font-bold tracking-tight ${saldoKleur(saldo)}`}>
              {formatCents(saldo)}
            </p>
            <p className="text-xs text-gray-600">
              {actief.length > 0 ? `${formatCents(perMaand)} per maand erbij` : 'geen lopend abonnement'}
            </p>
          </div>
        </div>

        <nav aria-label="Onderdelen van de klant" className="mb-8 flex gap-1 overflow-x-auto rounded-full bg-gray-150 p-1 sm:inline-flex">
          {TABS.map((t) => (
            <a
              key={t.key}
              href={t.key === 'overzicht' ? `/beheer/klanten/${slug}` : `/beheer/klanten/${slug}?tab=${t.key}`}
              aria-current={tab === t.key ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${
                tab === t.key ? 'text-jr-text bg-white shadow-sm' : 'text-gray-600 hover:text-jr-text'
              }`}
            >
              {t.label}
            </a>
          ))}
        </nav>

        {tab === 'overzicht' && (
          <div className="space-y-8">
            <KlantreisBalk stand={klantreis} slug={slug} />
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-xs text-gray-600">Budget per maand</p>
                <p className="font-display tabular mt-1 text-2xl font-semibold tracking-tight">
                  {actief.length > 0 ? formatCents(perMaand) : 'Geen abonnement'}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {actief.length} {actief.length === 1 ? 'actief abonnement' : 'actieve abonnementen'}
                </p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-xs text-gray-600">Volgende bijschrijving</p>
                <p className="font-display tabular mt-1 text-2xl font-semibold tracking-tight">
                  {volgende ? formatDate(volgende) : '-'}
                </p>
                <p className="mt-1 text-xs text-gray-600">via de dagelijkse abonnementsrun</p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-xs text-gray-600">Vaste contactpersoon</p>
                <p className="font-display mt-1 truncate text-2xl font-semibold tracking-tight">
                  {contacten.find((c) => c.isPrimary)?.name ?? '-'}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {contacten.length} {contacten.length === 1 ? 'contactpersoon' : 'contactpersonen'}
                </p>
              </div>
            </section>
            <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
              <div className="min-w-0">
              <Tijdlijn
                organizationId={klant.organization.id}
                slug={slug}
                items={tijdlijn}
                contacten={contacten}
                laatsteContactOp={laatsteContactOp}
              />
              </div>
              <div className="min-w-0">
                <KlantCampagnes organizationId={klant.organization.id} slug={slug} metDoelgroepen={false} />
              </div>
            </div>
          </div>
        )}

        {tab === 'budget' && (
          <div className="space-y-10">
            {klant.wallets.map(({ wallet, balance }) => (
              <WalletBeheer
                key={wallet.id}
                slug={slug}
                organizationId={klant.organization.id}
                wallet={wallet}
                balance={balance}
                vandaag={vandaag}
                diensten={diensten}
                team={team}
              />
            ))}
            <section>
              <h2 className="mb-1 text-lg">Abonnementen</h2>
              <p className="mb-3 text-sm text-gray-600">
                Zolang een abonnement loopt, wordt op de facturatiedag elke maand
                automatisch een factuur gemaakt en het budget bijgeschreven.
              </p>

              {abonnementen.length > 0 && (
                <ul className="mb-4 space-y-3">
                  {abonnementen.map((item) => (
                    <SubscriptionCard key={item.subscription.id} item={item} slug={slug} />
                  ))}
                </ul>
              )}

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="mb-3 text-sm">
                  {abonnementen.length === 0
                    ? 'Eerste abonnement aanmaken'
                    : 'Abonnement toevoegen'}
                </h3>
                <NewSubscriptionForm
                  action={nieuwAbonnement}
                  organizationId={klant.organization.id}
                  slug={slug}
                  wallets={klant.wallets.map(({ wallet }) => ({
                    id: wallet.id,
                    name: wallet.name,
                  }))}
                  vandaag={vandaag}
                />
              </div>
            </section>
            <Facturen
              facturen={facturen}
              klant={klant}
              slug={slug}
              vandaag={vandaag}
            />
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-base">Wallet toevoegen</h2>
                <ActionForm action={nieuweWallet} submitLabel="Wallet aanmaken">
                  <input type="hidden" name="organizationId" value={klant.organization.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <Field label="Naam" name="naam" required placeholder="Strippenkaart 2026" />
                  <Field
                    label="Signaalgrens"
                    name="drempel"
                    placeholder="250,00"
                    hint="Onder dit saldo krijgt de klant een melding dat het budget opraakt."
                  />
                </ActionForm>
              </div>
            </section>
          </div>
        )}

        {tab === 'klantreis' && <KlantreisDetail stand={klantreis} organizationId={klant.organization.id} slug={slug} />}

        {tab === 'campagnes' && <KlantCampagnes organizationId={klant.organization.id} slug={slug} />}

        {tab === 'contacten' && (
          <div className="space-y-10">
            <Contactpersonen
              contacts={contacten}
              organizationId={klant.organization.id}
              slug={slug}
              kinderenPer={kinderenPer}
            />
            <Partners
              links={partnerLinks}
              alle={allePartners}
              organizationId={klant.organization.id}
              slug={slug}
            />
            <Gebruikers klant={klant} slug={slug} />
          </div>
        )}

        {tab === 'profiel' && (
          <Klantprofiel
            organisatie={klant.organization}
            profiel={profiel}
            marketingmanager={eigenaren.find((e) => e.isPrimary)?.name ?? null}
            pakketten={actief.map((a) => ({ naam: a.subscription.name, start: a.subscription.startedOn }))}
            vestigingen={vestigingen.map((v) => v.name)}
            rechts={{
              1: (
                <div className="space-y-6">
                  <Bedrijfsgegevens org={klant.organization} slug={slug} />
                  <Vestigingen
                organizationId={klant.organization.id}
                slug={slug}
                vestigingen={vestigingen}
              />
                </div>
              ),
              2: <Concurrenten
                organizationId={klant.organization.id}
                slug={slug}
                concurrenten={concurrenten}
              />,
              3: <Doelen organizationId={klant.organization.id} slug={slug} doelen={doelen} />,
              4: <VasteDoelgroepen organizationId={klant.organization.id} slug={slug} />,
              5: (
                <a href={`/beheer/assets/${slug}`} className="block rounded-xl bg-white p-6 shadow-sm hover:shadow-md">
                  <p className="text-xs text-gray-600">Merkkluis</p>
                  <p className="font-display mt-1 text-xl font-semibold tracking-tight">
                    {merk.logos} {merk.logos === 1 ? 'logo' : 'logo’s'} · {merk.beelden} {merk.beelden === 1 ? 'beeld' : 'beelden'}
                  </p>
                  <p className="text-jr-link mt-2 text-sm font-medium">
                    Logo’s, kleuren, lettertypen, toon en beelden in de merkkluis &rarr;
                  </p>
                </a>
              ),
              6: (
                <Accounts accounts={accounts} organizationId={klant.organization.id} slug={slug} />
              ),
              8: <KlantCampagnes organizationId={klant.organization.id} slug={slug} metDoelgroepen={false} />,
            }}
          />
        )}
    </AppShell>
  )
}

async function WalletBeheer({
  slug,
  organizationId,
  wallet,
  balance,
  vandaag,
  diensten,
  team,
}: {
  slug: string
  organizationId: string
  diensten: Awaited<ReturnType<typeof listActiveServices>>
  team: Awaited<ReturnType<typeof listStaff>>
  wallet: Awaited<ReturnType<typeof getOrganizationBySlug>> extends null
    ? never
    : NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>['wallets'][number]['wallet']
  balance: NonNullable<
    Awaited<ReturnType<typeof getOrganizationBySlug>>
  >['wallets'][number]['balance']
  vandaag: string
}) {
  const [entries, reversedIds] = await Promise.all([
    getWalletEntries(wallet.id, { limit: 25 }),
    getReversedEntryIds(wallet.id),
  ])

  return (
    <section>
      <div className="rounded-xl bg-white p-6 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base">{wallet.name}</h2>
            <p
              className={`tabular mt-1 text-3xl font-bold ${
                balance.balanceCents < 0 ? 'text-jr-red' : ''
              }`}
            >
              {formatCents(balance.balanceCents)}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              bijgeschreven {formatCents(balance.toppedUpCents)} &middot; besteed{' '}
              {formatCents(balance.spentCents)}
              {wallet.lowBalanceThresholdCents !== null && (
                <> &middot; signaal onder {formatCents(wallet.lowBalanceThresholdCents)}</>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-5">
          <h3 className="mb-3 text-sm">Dienst afboeken</h3>
          <BookServiceForm
            action={boekDienst}
            walletId={wallet.id}
            slug={slug}
            services={diensten}
            staff={team}
            vandaag={vandaag}
          />
        </div>

        <details className="mt-4 border-t border-gray-200 pt-4">
          <summary className="text-jr-blue cursor-pointer text-sm">
            Los boeken zonder dienst
          </summary>
          <p className="mt-2 mb-3 text-xs text-gray-600">
            Voor werk dat niet in de catalogus staat, of om budget met de hand bij te
            schrijven. Een bijschrijving via een factuur gaat beter via het
            factuurformulier onderaan: dan blijven factuur en budget aan elkaar
            gekoppeld.
          </p>
          <ActionForm action={boek} submitLabel="Boeken" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="walletId" value={wallet.id} />
            <input type="hidden" name="slug" value={slug} />

            <div>
              <label
                htmlFor={`soort-${wallet.id}`}
                className="mb-1 block text-xs text-gray-600"
              >
                Soort
              </label>
              <select
                id={`soort-${wallet.id}`}
                name="soort"
                defaultValue="spend"
                className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
              >
                <option value="spend">Afschrijven (dienst afgenomen)</option>
                <option value="topup">Bijschrijven (budget erbij)</option>
              </select>
            </div>

            <Field label="Bedrag" name="bedrag" required placeholder="122,50" />

            <div className="sm:col-span-2">
              <Field
                label="Omschrijving"
                name="omschrijving"
                required
                placeholder="Website wijzigingen"
                hint="Dit leest de klant in zijn overzicht."
              />
            </div>

            <div>
              <label
                htmlFor={`cat-${wallet.id}`}
                className="mb-1 block text-xs text-gray-600"
              >
                Productgroep <span className="text-gray-400">(optioneel)</span>
              </label>
              <select
                id={`cat-${wallet.id}`}
                name="categorie"
                defaultValue=""
                className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
              >
                <option value="">Geen</option>
                {PRODUCTGROEPEN.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <Field label="Datum" name="datum" type="date" defaultValue={vandaag} />

            <div className="sm:col-span-2">
              <Field
                label="Toelichting"
                name="toelichting"
                placeholder="Wat is er precies gedaan"
              />
            </div>
          </ActionForm>
        </details>
      </div>

      <h3 className="mt-6 mb-3 px-1 text-sm text-gray-600">
        Laatste boekingen &middot; {wallet.name}
      </h3>

      {entries.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
          Nog geen boekingen.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {entries.map((entry) => {
            const teruggedraaid = reversedIds.has(entry.id)
            const corrigeerbaar = entry.kind !== 'correction' && !teruggedraaid

            return (
              <li key={entry.id} className="px-4 py-3 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${teruggedraaid ? 'text-gray-500 line-through' : ''}`}
                    >
                      {entry.description}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {formatDate(entry.bookedOn)}
                      {entry.serviceName && entry.quantityHundredths !== null && (
                        <>
                          {' '}
                          &middot; {formatQuantity(entry.quantityHundredths)}
                          {entry.serviceUnit ? ` ${unitShort[entry.serviceUnit]}` : ''} ×{' '}
                          {entry.unitPriceCents !== null
                            ? formatCents(entry.unitPriceCents)
                            : '?'}
                        </>
                      )}
                      {entry.category && <> &middot; {entry.category}</>}
                      {entry.deliveredByName && <> &middot; {entry.deliveredByName}</>}
                      <> &middot; {entry.source}</>
                      {entry.kind === 'correction' && (
                        <span className="text-jr-orange"> &middot; correctie</span>
                      )}
                      {teruggedraaid && <> &middot; teruggedraaid</>}
                    </p>
                  </div>

                  <p
                    className={`tabular shrink-0 text-sm ${
                      teruggedraaid
                        ? 'text-gray-500 line-through'
                        : entry.amountCents > 0
                          ? 'text-jr-green'
                          : ''
                    }`}
                  >
                    {formatSignedCents(entry.amountCents)}
                  </p>
                </div>

                {corrigeerbaar && (
                  <details className="mt-2">
                    <summary className="text-jr-blue cursor-pointer text-xs">
                      Terugdraaien
                    </summary>
                    <div className="mt-2 rounded-lg bg-gray-50 p-3">
                      <p className="mb-2 text-xs text-gray-600">
                        De boeking blijft staan en wordt opgeheven met een tegenboeking.
                        De klant ziet beide regels plus jouw reden.
                      </p>
                      <ActionForm
                        action={draaiTerug}
                        submitLabel="Terugdraaien"
                        submitClassName="bg-jr-red hover:bg-jr-red/80 text-white"
                        resetOnSuccess={false}
                      >
                        <input type="hidden" name="entryId" value={entry.id} />
                        <input type="hidden" name="slug" value={slug} />
                        <Field
                          label="Reden"
                          name="reden"
                          required
                          placeholder="Dubbel geboekt door de sync"
                        />
                      </ActionForm>
                    </div>
                  </details>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Gebruikers({
  klant,
  slug,
}: {
  klant: NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>
  slug: string
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-base">Wie mag inloggen</h2>

      {klant.users.length === 0 ? (
        <p className="mb-4 text-sm text-gray-600">
          Nog niemand. Zolang er geen gebruiker is, kan deze klant niet bij zijn wallet.
        </p>
      ) : (
        <ul className="mb-4 divide-y divide-gray-200">
          {klant.users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{u.email}</p>
                <p className="text-xs text-gray-600">
                  {u.name ?? 'geen naam'}
                  {u.lastLoginAt
                    ? ` · laatst ingelogd ${formatDate(u.lastLoginAt)}`
                    : ' · nog niet ingelogd'}
                  {u.disabledAt && (
                    <span className="text-jr-red"> &middot; geblokkeerd</span>
                  )}
                </p>
              </div>
              <div className="shrink-0">
                <ActionForm
                  action={wisselToegang}
                  submitLabel={u.disabledAt ? 'Toegang teruggeven' : 'Blokkeren'}
                  submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                  resetOnSuccess={false}
                  className=""
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="blokkeren" value={u.disabledAt ? '0' : '1'} />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={nieuweGebruiker} submitLabel="Gebruiker toevoegen">
        <input type="hidden" name="organizationId" value={klant.organization.id} />
        <input type="hidden" name="slug" value={slug} />
        <Field label="E-mailadres" name="email" type="email" required placeholder="naam@bedrijf.nl" />
        <Field label="Naam" name="naam" placeholder="Voor- en achternaam" />
      </ActionForm>
    </div>
  )
}


/**
 * Facturen van de klant, met de mogelijkheid er een toe te voegen.
 *
 * Een factuur aanmaken schrijft in dezelfde transactie het budget bij. Zo
 * kan er geen factuur bestaan zonder budget, of budget zonder factuur.
 */
function Facturen({
  facturen,
  klant,
  slug,
  vandaag,
}: {
  facturen: Awaited<ReturnType<typeof getOrganizationInvoices>>
  klant: NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>
  slug: string
  vandaag: string
}) {
  const wallets = klant.wallets

  return (
    <section>
      <h2 className="mb-3 text-lg">Facturen</h2>

      <div className="mb-4 rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-sm">Factuur toevoegen</h3>
        <p className="mb-3 text-xs text-gray-600">
          Het bedrag exclusief btw wordt direct als budget bijgeschreven op de gekozen
          wallet. Een factuur van &euro; 1.000 geeft dus &euro; 1.000 budget.
        </p>

        {wallets.length === 0 ? (
          <p className="text-sm text-gray-600">
            Maak eerst een wallet aan om budget op bij te schrijven.
          </p>
        ) : (
          <ActionForm
            action={nieuweFactuur}
            submitLabel="Factuur aanmaken en budget bijschrijven"
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="organizationId" value={klant.organization.id} />

            <Field label="Factuurnummer" name="nummer" required placeholder="2026-0112" />
            <Field
              label="Bedrag excl. btw"
              name="bedrag"
              required
              placeholder="1000,00"
              hint="Dit wordt het budget."
            />

            <div>
              <label htmlFor="factuur-wallet" className="mb-1 block text-xs text-gray-600">
                Budget bijschrijven op
              </label>
              <select
                id="factuur-wallet"
                name="walletId"
                defaultValue={wallets[0]!.wallet.id}
                className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
              >
                {wallets.map(({ wallet }) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </div>

            <Field label="Factuurdatum" name="datum" type="date" defaultValue={vandaag} />

            <div className="sm:col-span-2">
              <Field
                label="Omschrijving"
                name="omschrijving"
                placeholder="Marketing abonnement januari"
                hint="Dit leest de klant bij de bijschrijving."
              />
            </div>

            <Field
              label="Btw-bedrag"
              name="btw"
              placeholder="210,00"
              hint="Leeg laten rekent 21%."
            />
          </ActionForm>
        )}
      </div>

      {facturen.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm">
          Nog geen facturen. Zonder factuur heeft de klant geen budget.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {facturen.map((f) => {
            // Factuur en bijschrijving horen exact gelijk te zijn. Wijkt het
            // af, dan is er iets met de hand aangepast en dat verzwijgen we niet.
            const afwijking = f.toppedUpCents !== f.amountExclVatCents

            return (
              <li key={f.id} className="px-4 py-3.5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">{f.number}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${invoiceStatusStyles[f.status]}`}
                      >
                        {invoiceStatusLabels[f.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {formatDate(f.issuedOn)}
                      {f.description && <> &middot; {f.description}</>}
                      {f.period && <> &middot; abonnement {f.period}</>}
                      {f.paidOn && <> &middot; betaald {formatDate(f.paidOn)}</>}
                    </p>
                    {afwijking && (
                      <p className="text-jr-orange mt-1 text-xs">
                        Als budget bijgeschreven: {formatCents(f.toppedUpCents)} in plaats
                        van {formatCents(f.amountExclVatCents)}.
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm">{formatCents(f.amountExclVatCents)}</p>
                    <p className="text-xs text-gray-500">
                      excl. btw &middot; incl. {formatCents(f.amountExclVatCents + f.vatCents)}
                    </p>
                  </div>
                </div>

                {f.status !== 'credited' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {f.status !== 'paid' && (
                      <ActionForm
                        action={zetFactuurStatus}
                        submitLabel="Markeren als betaald"
                        submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                        resetOnSuccess={false}
                        className=""
                      >
                        <input type="hidden" name="invoiceId" value={f.id} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="status" value="paid" />
                      </ActionForm>
                    )}

                    {/* Verwijderen kan alleen zolang er geen budget aan hangt.
                        Alles wat al is bijgeschreven wordt gecrediteerd, want
                        dan blijft in het grootboek staan dat het gebeurd is. */}
                    {f.status === 'draft' && f.toppedUpCents === 0 && (
                      <ActionForm
                        action={verwijderFactuurActie}
                        submitLabel="Verwijderen"
                        submitClassName="text-jr-red hover:bg-jr-red/10 !px-2 !py-1 !text-xs"
                        resetOnSuccess={false}
                        className=""
                      >
                        <input type="hidden" name="invoiceId" value={f.id} />
                        <input type="hidden" name="slug" value={slug} />
                      </ActionForm>
                    )}
                  </div>
                )}

                {f.status !== 'credited' && (
                  <div className="mt-2 flex flex-wrap gap-x-4">
                    <Uitklap label="Gegevens wijzigen">
                      <p className="mb-3 text-xs text-gray-600">
                        Het bedrag staat hier niet tussen. Daar hangt een bijschrijving
                        aan die precies zo groot is; zou je het hier wijzigen, dan klopt
                        het saldo van de klant niet meer. Een ander bedrag betekent
                        crediteren en opnieuw factureren.
                      </p>
                      <ActionForm
                        action={wijzigFactuurActie}
                        submitLabel="Opslaan"
                        resetOnSuccess={false}
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <input type="hidden" name="invoiceId" value={f.id} />
                        <input type="hidden" name="slug" value={slug} />
                        <Field label="Factuurnummer" name="nummer" required defaultValue={f.number} />
                        <Field
                          label="Factuurdatum"
                          name="factuurdatum"
                          type="date"
                          required
                          defaultValue={formatDateInput(f.issuedOn)}
                        />
                        <Field
                          label="Omschrijving"
                          name="omschrijving"
                          defaultValue={f.description ?? ''}
                        />
                        <Field
                          label="Vervaldatum"
                          name="vervaldatum"
                          type="date"
                          defaultValue={f.dueOn ? formatDateInput(f.dueOn) : ''}
                        />
                      </ActionForm>
                    </Uitklap>

                    <Uitklap label="Crediteren">
                      <p className="mb-3 text-xs text-gray-600">
                        Het bijgeschreven budget van {formatCents(f.toppedUpCents)} gaat er
                        weer af en de factuur wordt gemarkeerd als gecrediteerd. Het
                        factuurnummer blijft bestaan: een gat in de nummering is een vraag
                        van de accountant die je niet wilt krijgen.
                      </p>
                      <ActionForm
                        action={crediteerFactuurActie}
                        submitLabel="Crediteren"
                        submitClassName="bg-jr-red hover:bg-jr-red/90 text-white !text-xs"
                        resetOnSuccess={false}
                      >
                        <input type="hidden" name="invoiceId" value={f.id} />
                        <input type="hidden" name="slug" value={slug} />
                        <Field
                          label="Reden"
                          name="reden"
                          required
                          placeholder="Verkeerd bedrag ingevoerd"
                          hint="Komt in het grootboek te staan bij de tegenboeking."
                        />
                      </ActionForm>
                    </Uitklap>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
