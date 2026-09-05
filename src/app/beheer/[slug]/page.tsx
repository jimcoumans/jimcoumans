import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getOrganizationBySlug } from '@/lib/admin'
import { getWalletEntries, getReversedEntryIds } from '@/lib/ledger'
import { getOrganizationInvoices, invoiceStatusLabels } from '@/lib/invoices'
import { Header } from '@/components/Header'
import { ActionForm, Field } from '@/components/ActionForm'
import { boek, draaiTerug, nieuweWallet, nieuweGebruiker, wisselToegang } from '../actions'
import { formatCents, formatSignedCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'

/** Productgroepen zoals ze in ClickUp staan, zodat categorieen consistent blijven. */
const PRODUCTGROEPEN = [
  'SEA',
  'SEO',
  'Social Ads',
  'Social Management',
  'Marketing Management',
  'eCommerce Management',
  'CRO',
  'E-mail Marketing',
  'Marketing Automation',
  'Fotografie',
  'Content Creatie',
  'Web',
]

export default async function KlantPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { slug } = await params
  const klant = await getOrganizationBySlug(slug)
  if (!klant) notFound()

  const facturen = await getOrganizationInvoices(klant.organization.id, 10)
  const vandaag = new Date().toISOString().slice(0, 10)

  return (
    <>
      <Header user={user} actief="beheer" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <a href="/beheer" className="text-jr-blue text-sm hover:underline">
          &larr; Alle klanten
        </a>

        <h1 className="text-jr-blue mt-2 mb-1 text-2xl">{klant.organization.name}</h1>
        <p className="mb-8 text-sm text-gray-600">
          {klant.wallets.length} {klant.wallets.length === 1 ? 'wallet' : 'wallets'}
          {klant.organization.clickupCompanyId && <> &middot; gekoppeld aan ClickUp</>}
        </p>

        <div className="space-y-10">
          {klant.wallets.map(({ wallet, balance }) => (
            <WalletBeheer
              key={wallet.id}
              slug={slug}
              wallet={wallet}
              balance={balance}
              vandaag={vandaag}
            />
          ))}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-5 shadow-sm">
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

            <Gebruikers klant={klant} slug={slug} />
          </section>

          {facturen.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg">Facturen</h2>
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
                {facturen.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
                  >
                    <div>
                      <p className="text-sm">
                        {f.number}{' '}
                        <span className="text-xs text-gray-600">
                          &middot; {invoiceStatusLabels[f.status]}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600">{formatDate(f.issuedOn)}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm">
                        {formatCents(f.amountExclVatCents)}
                      </p>
                      {f.toppedUpCents !== f.amountExclVatCents && (
                        <p className="text-jr-orange text-xs">
                          bijgeschreven {formatCents(f.toppedUpCents)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  )
}

async function WalletBeheer({
  slug,
  wallet,
  balance,
  vandaag,
}: {
  slug: string
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
      <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
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
          <h3 className="mb-3 text-sm">Boeking toevoegen</h3>
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
        </div>
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
                      {entry.category && <> &middot; {entry.category}</>}
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
    <div className="rounded-xl bg-white p-5 shadow-sm">
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
