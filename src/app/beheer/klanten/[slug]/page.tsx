import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getOrganizationBySlug, listStaff } from '@/lib/admin'
import { listActiveServices } from '@/lib/services'
import { getWalletEntries, getReversedEntryIds } from '@/lib/ledger'
import { getOrganizationInvoices, invoiceStatusLabels, invoiceStatusStyles } from '@/lib/invoices'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { Paneel } from '@/components/Paneel'
import { Menu } from '@/components/Menu'
import { Avatar } from '@/components/Avatar'
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
import { FormulierenTab } from '@/components/formulieren/FormulierenTab'
import { KlantCampagnes, VasteDoelgroepen } from '@/components/KlantCampagnes'
import { KlantreisBalk, KlantreisDetail } from '@/components/Klantreis'
import { Klantprofiel } from '@/components/Klantprofiel'
import { getKlantreis } from '@/lib/klantreis'
import { getProfiel } from '@/lib/klantprofiel'
import { listOwners } from '@/lib/crm-owners'
import { merkTelling, getMerkkluis } from '@/lib/merkkluis'
import { MerkkluisSamenvatting } from '@/components/stylesheet/MerkkluisSamenvatting'
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard'
import { Koppelingen, meetcheck } from '@/components/performance/Koppelingen'
import { FilterBalk } from '@/components/FilterBalk'
import { LeegVlak } from '@/components/PaginaKop'
import { getKoppelingen, getDagcijfers } from '@/lib/performance/lezen'
import { serviceaccountAdres } from '@/lib/performance/google'
import { alleKeuzes, listVerbindingen } from '@/lib/performance/oauth'
import { PERIODES, periodeGrenzen, perBron, type Periode } from '@/lib/performance/bronnen'
import { getTijdlijn, laatsteContact } from '@/lib/tijdlijn'
import { BookServiceForm } from '@/components/BookServiceForm'
import { aantalMetEenheid } from '@/lib/quantity'
import { formatCents, formatEuro, formatSignedCents } from '@/lib/money'
import { factuurTitel, bronLabel } from '@/lib/weergave'
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
  { key: 'performance', label: 'Performance' },
  { key: 'klantreis', label: 'Klantreis' },
  { key: 'formulieren', label: 'Formulieren' },
  { key: 'profiel', label: 'Klantprofiel' },
  { key: 'merkkluis', label: 'Merkkluis' },
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
  searchParams: Promise<{ tab?: string; alles?: string; periode?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { slug } = await params
  const { tab: tabParam, alles, periode } = await searchParams
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
  const vast = contacten.find((c) => c.isPrimary)

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
          {/* Wat het bedrijf is en waar het zit. Telefoon en contactpersoon
              horen bij Contacten, het aantal wallets bij Budget. */}
          <p className="mt-1 text-[15px] text-gray-600">
            {[klant.organization.industry, klant.organization.city].filter(Boolean).join(' · ')}
            {klant.organization.website && (
              <>
                {(klant.organization.industry || klant.organization.city) && ' · '}
                <a
                  href={
                    klant.organization.website.startsWith('http')
                      ? klant.organization.website
                      : `https://${klant.organization.website}`
                  }
                  className="text-jr-link hover:underline"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {klant.organization.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </>
            )}
          </p>
          </div>
          {/* Het actuele budget, rechtsboven: groen, rood of zwart. */}
          <div className="sm:text-right">
            <p className="text-xs text-gray-600">Actueel budget</p>
            <p className={`font-display tabular text-[32px] leading-tight font-bold tracking-tight ${saldoKleur(saldo)}`}>
              {formatCents(saldo)}
            </p>
            <p className="text-xs text-gray-600">
              {actief.length > 0 ? `${formatEuro(perMaand)} per maand erbij` : 'Geen lopend abonnement'}
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
                  {actief.length > 0 ? formatEuro(perMaand) : 'Geen abonnement'}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {actief.length === 1 ? actief[0]!.subscription.name : actief.length > 1 ? `${actief.length} abonnementen` : 'Alleen losse facturen'}
                </p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-xs text-gray-600">Volgende bijschrijving</p>
                <p className="font-display tabular mt-1 text-2xl font-semibold tracking-tight">
                  {volgende ? formatDate(volgende) : 'Geen'}
                </p>
                <p className="mt-1 text-xs text-gray-600">{volgende ? 'Factuur en budget gaan vanzelf' : 'Er loopt geen abonnement'}</p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-xs text-gray-600">Vaste contactpersoon</p>
                <p className="font-display mt-1 truncate text-2xl font-semibold tracking-tight">
                  {vast?.name ?? 'Nog niemand'}
                </p>
                <p className="mt-1 truncate text-xs text-gray-600">
                  {vast ? [vast.jobTitle, vast.mobile ?? vast.phone ?? vast.email].filter(Boolean).join(' · ') : 'Kies er een bij Contacten'}
                </p>
              </div>
            </section>
            {/* Pas naast elkaar als er echt ruimte is; anders wordt de
                tijdlijn een smalle kolom met afgebroken regels. */}
            <div className="grid items-start gap-8 2xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
              <div className="min-w-0 2xl:order-1 order-2">
              <Tijdlijn
                organizationId={klant.organization.id}
                slug={slug}
                items={tijdlijn}
                contacten={contacten}
                laatsteContactOp={laatsteContactOp}
                kort={alles === '1' ? undefined : 10}
                meerHref={`/beheer/klanten/${slug}?alles=1`}
              />
              </div>
              <div className="order-1 min-w-0 2xl:order-2">
                <KlantCampagnes organizationId={klant.organization.id} slug={slug} metDoelgroepen={false} />
              </div>
            </div>
          </div>
        )}

        {tab === 'budget' && (
          <div className="space-y-12">
            {klant.wallets.map(({ wallet, balance }) => (
              <WalletBeheer
                key={wallet.id}
                slug={slug}
                wallet={wallet}
                balance={balance}
                vandaag={vandaag}
                diensten={diensten}
                team={team}
                alles={alles === '1'}
              />
            ))}

            <section>
              <SectieKop
                titel="Abonnementen"
                uitleg="Zolang een abonnement loopt, komt er elke maand vanzelf een factuur en gaat het budget erbij."
                actie={
                  klant.wallets.length > 0 && (
                    <Paneel knop="+ Abonnement" stijl="rustig" titel="Abonnement toevoegen" breed>
                      <NewSubscriptionForm
                        action={nieuwAbonnement}
                        organizationId={klant.organization.id}
                        slug={slug}
                        wallets={klant.wallets.map(({ wallet }) => ({ id: wallet.id, name: wallet.name }))}
                        vandaag={vandaag}
                      />
                    </Paneel>
                  )
                }
              />
              {abonnementen.length > 0 ? (
                <ul className="space-y-3">
                  {abonnementen.map((item) => (
                    <SubscriptionCard key={item.subscription.id} item={item} slug={slug} />
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
                  Geen abonnement. Zonder abonnement komt er geen budget bij, behalve via een losse factuur.
                </p>
              )}
            </section>

            <Facturen facturen={facturen} klant={klant} slug={slug} vandaag={vandaag} />

            <Paneel knop="+ Nog een wallet" stijl="link" titel="Wallet toevoegen" uitleg="Een tweede potje naast het abonnement, bijvoorbeeld een strippenkaart of een projectbudget.">
              <ActionForm action={nieuweWallet} submitLabel="Wallet aanmaken" className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="organizationId" value={klant.organization.id} />
                <input type="hidden" name="slug" value={slug} />
                <Field label="Naam" name="naam" required placeholder="Strippenkaart 2026" />
                <Field
                  label="Melding onder"
                  name="drempel"
                  placeholder="250,00"
                  hint="Komt het saldo hieronder, dan krijgt de klant een seintje."
                />
              </ActionForm>
            </Paneel>
          </div>
        )}

        {tab === 'merkkluis' && <MerkkluisTab slug={slug} />}

        {tab === 'performance' && <PerformanceTab organizationId={klant.organization.id} slug={slug} periode={periode} klant={{ name: klant.organization.name, website: klant.organization.website }} />}

        {tab === 'klantreis' && <KlantreisDetail stand={klantreis} organizationId={klant.organization.id} slug={slug} />}

        {tab === 'formulieren' && <FormulierenTab organizationId={klant.organization.id} />}

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
            basis={
              <Bedrijfsgegevens
                org={klant.organization}
                slug={slug}
                extra={[
                  { label: 'Branche', waarde: klant.organization.industry },
                  { label: 'Marketingmanager', waarde: eigenaren.find((e) => e.isPrimary)?.name },
                  {
                    label: actief.length > 1 ? 'Pakketten' : 'Pakket',
                    waarde:
                      actief.length > 0 &&
                      actief.map((a) => `${a.subscription.name}, sinds ${formatDate(a.subscription.startedOn)}`).join('; '),
                  },
                ]}
              />
            }
            rechts={{
              1: <Vestigingen organizationId={klant.organization.id} slug={slug} vestigingen={vestigingen} />,
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

/** De performance van deze klant. Alleen opgehaald als je het tabblad opent. */
async function PerformanceTab({
  organizationId,
  slug,
  periode: periodeParam,
  klant,
}: {
  organizationId: string
  slug: string
  periode?: string
  klant: { name: string; website: string | null }
}) {
  const periode = (PERIODES.some((p) => p.periode === periodeParam) ? periodeParam : '30_dagen') as Periode
  const g = periodeGrenzen(periode)
  const [koppelingen, rijen, vorige, google, verbindingen] = await Promise.all([
    getKoppelingen(organizationId),
    getDagcijfers(g.van, g.tot, organizationId),
    getDagcijfers(g.vorigeVan, g.vorigeTot, organizationId),
    alleKeuzes(),
    listVerbindingen(),
  ])
  const waarschuwingen = meetcheck(koppelingen, perBron(rijen).totaal)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBalk className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="tab" value="performance" />
          <select name="periode" defaultValue={periode} aria-label="Periode" className="min-h-11 rounded-full border border-gray-300 bg-white py-2.5 pr-9 pl-4 text-[15px] outline-none hover:border-gray-400">
            {PERIODES.map((p) => (
              <option key={p.periode} value={p.periode}>
                {p.label}
              </option>
            ))}
          </select>
        </FilterBalk>
        <p className="text-xs text-gray-500">Alleen zichtbaar voor het team. De klant ziet dit later in zijn eigen wallet.</p>
      </div>

      {waarschuwingen.length > 0 && (
        <section className="rounded-xl bg-[#FFF4E0] px-5 py-4 text-sm text-[#94590A]">
          <p className="font-medium">Meetcheck</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {waarschuwingen.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {rijen.length > 0 ? (
        <PerformanceDashboard rijen={rijen} vorige={vorige} van={g.van} tot={g.tot} />
      ) : (
        <LeegVlak
          titel={!koppelingen.length ? 'Nog niets gekoppeld' : koppelingen.every((k) => k.lastError) ? 'De koppeling werkt nog niet' : 'Nog geen cijfers in deze periode'}
          tekst={
            !koppelingen.length
              ? 'Koppel Google Analytics en Search Console hieronder. Daarna zie je impressies, bezoeken en conversies per bron.'
              : koppelingen.every((k) => k.lastError)
                ? 'Hieronder bij de koppeling staat wat er misgaat. Is dat opgelost, klik dan op Nu bijwerken.'
                : 'De koppeling staat er; de cijfers komen binnen bij de volgende ronde ophalen (elk uur), of nu met Nu bijwerken.'
          }
        />
      )}

      <Koppelingen
        organizationId={organizationId}
        slug={slug}
        koppelingen={koppelingen}
        serviceaccount={serviceaccountAdres()}
        klant={klant}
        keuzes={google.keuzes}
        verbonden={verbindingen.map((v) => v.email)}
      />
    </div>
  )
}

/** De merkkluis op de klantpagina. Alleen opgehaald als je het tabblad opent. */
async function MerkkluisTab({ slug }: { slug: string }) {
  const m = await getMerkkluis(slug)
  if (!m) return null
  return <MerkkluisSamenvatting m={m} slug={slug} />
}

/** Een kop boven een blok, met de actie rechts. */
function SectieKop({ titel, uitleg, actie }: { titel: string; uitleg?: string; actie?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 className="text-[22px]">{titel}</h2>
        {uitleg && <p className="mt-0.5 max-w-2xl text-sm text-gray-600">{uitleg}</p>}
      </div>
      {actie}
    </div>
  )
}

/** Een knop in een Menu die een formulier verstuurt. */
const MENU_KNOP = '!min-h-0 w-full !rounded-lg !px-3 !py-2 text-left !font-normal text-jr-text hover:bg-gray-100'
const MENU_KNOP_GEVAAR = '!min-h-0 w-full !rounded-lg !px-3 !py-2 text-left !font-normal text-[#C02A22] hover:bg-[#FDECEA]'

/** Hoeveel boekingen je ziet voordat je op "alle" klikt. */
const BOEKINGEN_KORT = 8

async function WalletBeheer({
  slug,
  wallet,
  balance,
  vandaag,
  diensten,
  team,
  alles,
}: {
  slug: string
  diensten: Awaited<ReturnType<typeof listActiveServices>>
  team: Awaited<ReturnType<typeof listStaff>>
  wallet: NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>['wallets'][number]['wallet']
  balance: NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>['wallets'][number]['balance']
  vandaag: string
  alles: boolean
}) {
  const [opgehaald, reversedIds] = await Promise.all([
    getWalletEntries(wallet.id, { limit: alles ? 1000 : BOEKINGEN_KORT + 1 }),
    getReversedEntryIds(wallet.id),
  ])
  const meer = !alles && opgehaald.length > BOEKINGEN_KORT
  const entries = meer ? opgehaald.slice(0, BOEKINGEN_KORT) : opgehaald

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-6 rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm text-gray-600">{wallet.name}</p>
          <p className={`font-display tabular mt-1 text-[34px] leading-tight font-semibold tracking-tight ${saldoKleur(balance.balanceCents)}`}>
            {formatCents(balance.balanceCents)}
          </p>
          <p className="mt-1 text-[13px] text-gray-600">
            {formatEuro(balance.toppedUpCents)} bijgeschreven, {formatEuro(balance.spentCents)} besteed
            {wallet.lowBalanceThresholdCents !== null && <>. Seintje onder {formatEuro(wallet.lowBalanceThresholdCents)}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Paneel
            knop="Dienst afboeken"
            titel="Dienst afboeken"
            uitleg={`Gaat van ${wallet.name} af. De klant ziet de omschrijving in zijn wallet.`}
          >
            <BookServiceForm action={boekDienst} walletId={wallet.id} slug={slug} services={diensten} staff={team} vandaag={vandaag} />
          </Paneel>
          <Paneel
            knop="Los boeken"
            stijl="rustig"
            titel="Los boeken"
            uitleg="Voor werk dat niet in de catalogus staat, of om met de hand budget bij te schrijven. Hoort er een factuur bij, voeg dan de factuur toe: dan blijven factuur en budget gekoppeld."
          >
            <ActionForm action={boek} submitLabel="Boeken" className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="walletId" value={wallet.id} />
              <input type="hidden" name="slug" value={slug} />
              <Select
                label="Soort"
                name="soort"
                defaultValue="spend"
                options={[
                  { value: 'spend', label: 'Afschrijven' },
                  { value: 'topup', label: 'Bijschrijven' },
                ]}
              />
              <Field label="Bedrag" name="bedrag" required placeholder="122,50" />
              <div className="sm:col-span-2">
                <Field label="Omschrijving" name="omschrijving" required placeholder="Website wijzigingen" hint="Dit leest de klant." />
              </div>
              <Select
                label="Productgroep"
                name="categorie"
                defaultValue=""
                options={[{ value: '', label: 'Geen' }, ...PRODUCTGROEPEN.map((p) => ({ value: p, label: p }))]}
              />
              <Field label="Datum" name="datum" type="date" defaultValue={vandaag} />
              <div className="sm:col-span-2">
                <Field label="Toelichting" name="toelichting" placeholder="Wat er precies is gedaan" />
              </div>
            </ActionForm>
          </Paneel>
        </div>
      </div>

      <div className="mt-8 mb-3 flex items-baseline justify-between gap-4 px-1">
        <h3 className="text-[17px]">Boekingen</h3>
        {meer && (
          <a href={`/beheer/klanten/${slug}?tab=budget&alles=1`} className="text-jr-link text-sm hover:underline">
            Alles tonen
          </a>
        )}
        {alles && (
          <a href={`/beheer/klanten/${slug}?tab=budget`} className="text-jr-link text-sm hover:underline">
            Alleen de laatste
          </a>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">Nog geen boekingen.</p>
      ) : (
        <ul className="divide-y divide-gray-150 rounded-xl bg-white shadow-sm">
          {entries.map((entry) => {
            const teruggedraaid = reversedIds.has(entry.id)
            // Budget uit een factuur draai je terug door de factuur te
            // crediteren; dan blijven factuur en wallet gelijk.
            const vanFactuur = entry.source === 'invoice' || entry.invoiceId !== null
            const corrigeerbaar = entry.kind !== 'correction' && !teruggedraaid && !vanFactuur
            const regel = [
              formatDate(entry.bookedOn),
              entry.serviceName && entry.quantityHundredths !== null && entry.serviceUnit && entry.unitPriceCents !== null
                ? `${aantalMetEenheid(entry.quantityHundredths, entry.serviceUnit)} × ${formatEuro(entry.unitPriceCents)}`
                : null,
              entry.deliveredByName,
              bronLabel(entry.source),
              entry.kind === 'correction' ? 'Correctie' : null,
              teruggedraaid ? 'Teruggedraaid' : null,
            ].filter(Boolean)

            return (
              <li key={entry.id} className="flex items-start gap-3 py-3.5 pr-3 pl-5 sm:pl-6">
                {/* Op een telefoon het bedrag onder de omschrijving, niet ernaast. */}
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] ${teruggedraaid ? 'text-gray-500 line-through' : ''}`}>{entry.description}</p>
                  <p className="mt-0.5 text-[13px] text-gray-600">{regel.join(' · ')}</p>
                  {entry.detail && !vanFactuur && <p className="mt-0.5 text-[13px] text-gray-500">{entry.detail}</p>}
                </div>
                <p
                  className={`tabular shrink-0 text-[15px] sm:pt-px ${
                    teruggedraaid ? 'text-gray-500 line-through' : entry.amountCents > 0 ? 'text-[#1D7D3F]' : ''
                  }`}
                >
                  {formatSignedCents(entry.amountCents)}
                </p>
                </div>
                <div className="w-8 shrink-0">
                  {corrigeerbaar && (
                    <Menu>
                      <Paneel
                        knop="Terugdraaien"
                        stijl="menuGevaar"
                        titel="Boeking terugdraaien"
                        uitleg="De boeking blijft staan en wordt opgeheven met een tegenboeking. De klant ziet beide regels en jouw reden."
                      >
                        <p className="mb-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                          {entry.description} <span className="tabular text-gray-600">({formatSignedCents(entry.amountCents)})</span>
                        </p>
                        <ActionForm
                          action={draaiTerug}
                          submitLabel="Terugdraaien"
                          submitClassName="bg-[#C02A22] hover:bg-[#A3241D] text-white"
                          resetOnSuccess={false}
                        >
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input type="hidden" name="slug" value={slug} />
                          <Field label="Reden" name="reden" required placeholder="Dubbel geboekt" />
                        </ActionForm>
                      </Paneel>
                    </Menu>
                  )}
                </div>
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
    <section>
      <SectieKop
        titel="Wie mag inloggen"
        uitleg="Wie bij de klant in de wallet kan kijken. Los van wie contactpersoon is."
        actie={
          <Paneel knop="+ Toegang geven" stijl="rustig" titel="Toegang geven" uitleg="Deze persoon kan inloggen met een link per mail; een wachtwoord is niet nodig.">
            <ActionForm action={nieuweGebruiker} submitLabel="Toegang geven" className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="organizationId" value={klant.organization.id} />
              <input type="hidden" name="slug" value={slug} />
              <Field label="E-mailadres" name="email" type="email" required placeholder="naam@bedrijf.nl" />
              <Field label="Naam" name="naam" placeholder="Voor- en achternaam" />
            </ActionForm>
          </Paneel>
        }
      />

      {klant.users.length === 0 ? (
        <p className="rounded-xl bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
          Nog niemand. Zolang niemand toegang heeft, kan de klant zijn budget niet zien.
        </p>
      ) : (
        <ul className="divide-y divide-gray-150 rounded-xl bg-white shadow-sm">
          {klant.users.map((u) => (
            <li key={u.id} className="flex items-center gap-4 py-3.5 pr-3 pl-6">
              <Avatar naam={u.name ?? u.email} imageId={null} maat={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px]">{u.name ?? u.email}</p>
                <p className="truncate text-[13px] text-gray-600">
                  {u.name ? `${u.email} · ` : ''}
                  {u.disabledAt ? (
                    <span className="text-[#C02A22]">Geblokkeerd</span>
                  ) : u.lastLoginAt ? (
                    `Laatst ingelogd ${formatDate(u.lastLoginAt)}`
                  ) : (
                    'Nog nooit ingelogd'
                  )}
                </p>
              </div>
              <Menu>
                <ActionForm
                  action={wisselToegang}
                  submitLabel={u.disabledAt ? 'Toegang teruggeven' : 'Blokkeren'}
                  submitClassName={u.disabledAt ? MENU_KNOP : MENU_KNOP_GEVAAR}
                  resetOnSuccess={false}
                  meldGelukt={false}
                  className=""
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="blokkeren" value={u.disabledAt ? '0' : '1'} />
                </ActionForm>
              </Menu>
            </li>
          ))}
        </ul>
      )}
    </section>
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
      <SectieKop
        titel="Facturen"
        uitleg="Het bedrag exclusief btw van een factuur komt direct als budget in de wallet."
        actie={
          wallets.length > 0 && (
            <Paneel
              knop="+ Factuur"
              stijl="rustig"
              titel="Factuur toevoegen"
              uitleg="Het bedrag exclusief btw wordt meteen als budget bijgeschreven. Een factuur van € 1.000 geeft € 1.000 budget."
            >
              <ActionForm action={nieuweFactuur} submitLabel="Factuur toevoegen" className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="organizationId" value={klant.organization.id} />
                <Field label="Factuurnummer" name="nummer" required placeholder="2026-0112" />
                <Field label="Bedrag excl. btw" name="bedrag" required placeholder="1000,00" hint="Dit wordt het budget." />
                <Select
                  label="Budget naar"
                  name="walletId"
                  defaultValue={wallets[0]!.wallet.id}
                  options={wallets.map(({ wallet }) => ({ value: wallet.id, label: wallet.name }))}
                />
                <Field label="Factuurdatum" name="datum" type="date" defaultValue={vandaag} />
                <div className="sm:col-span-2">
                  <Field label="Omschrijving" name="omschrijving" placeholder="Marketing abonnement januari" hint="Dit leest de klant bij de bijschrijving." />
                </div>
                <Field label="Btw-bedrag" name="btw" placeholder="210,00" hint="Leeg laten rekent 21%." />
              </ActionForm>
            </Paneel>
          )
        }
      />

      {facturen.length === 0 ? (
        <p className="rounded-xl bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
          Nog geen facturen. Zonder factuur heeft de klant geen budget.
        </p>
      ) : (
        <ul className="divide-y divide-gray-150 rounded-xl bg-white shadow-sm">
          {facturen.map((f) => {
            // Factuur en bijschrijving horen exact gelijk te zijn. Wijkt het
            // af, dan is er iets met de hand aangepast en dat verzwijgen we niet.
            const afwijking = f.toppedUpCents !== f.amountExclVatCents
            const kanWeg = f.status === 'draft' && f.toppedUpCents === 0

            return (
              <li key={f.id} className="flex items-start gap-3 py-3.5 pr-3 pl-5 sm:pl-6">
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px]">{factuurTitel(f)}</span>
                    {f.status !== 'paid' && (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${invoiceStatusStyles[f.status]}`}>
                        {invoiceStatusLabels[f.status]}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] text-gray-600">
                    {formatDate(f.issuedOn)}
                    {f.paidOn && <>, betaald {formatDate(f.paidOn)}</>}
                    <span className="text-gray-400"> &middot; nr. {f.number}</span>
                  </p>
                  {afwijking && (
                    <p className="mt-1 text-[13px] text-[#94590A]">
                      Als budget bijgeschreven: {formatCents(f.toppedUpCents)} in plaats van {formatCents(f.amountExclVatCents)}.
                    </p>
                  )}
                </div>

                <div className="shrink-0 sm:text-right">
                  <p className="tabular text-[15px]">{formatCents(f.amountExclVatCents)}</p>
                  <p className="text-xs text-gray-500">incl. btw {formatCents(f.amountExclVatCents + f.vatCents)}</p>
                </div>
                </div>

                <div className="w-8 shrink-0">
                  {f.status !== 'credited' && (
                    <Menu>
                      {f.status !== 'paid' && (
                        <ActionForm action={zetFactuurStatus} submitLabel="Markeren als betaald" submitClassName={MENU_KNOP} resetOnSuccess={false} meldGelukt={false} className="">
                          <input type="hidden" name="invoiceId" value={f.id} />
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="status" value="paid" />
                        </ActionForm>
                      )}
                      <Paneel
                        knop="Gegevens wijzigen"
                        stijl="menu"
                        titel="Factuur wijzigen"
                        uitleg="Het bedrag staat hier niet bij: daar hangt een bijschrijving aan die precies even groot is. Een ander bedrag is crediteren en opnieuw factureren."
                      >
                        <ActionForm action={wijzigFactuurActie} submitLabel="Opslaan" resetOnSuccess={false} className="grid gap-4 sm:grid-cols-2">
                          <input type="hidden" name="invoiceId" value={f.id} />
                          <input type="hidden" name="slug" value={slug} />
                          <Field label="Factuurnummer" name="nummer" required defaultValue={f.number} />
                          <Field label="Factuurdatum" name="factuurdatum" type="date" required defaultValue={formatDateInput(f.issuedOn)} />
                          <Field label="Omschrijving" name="omschrijving" defaultValue={f.description ?? ''} />
                          <Field label="Vervaldatum" name="vervaldatum" type="date" defaultValue={f.dueOn ? formatDateInput(f.dueOn) : ''} />
                        </ActionForm>
                      </Paneel>
                      {kanWeg ? (
                        <ActionForm action={verwijderFactuurActie} submitLabel="Verwijderen" submitClassName={MENU_KNOP_GEVAAR} resetOnSuccess={false} meldGelukt={false} className="">
                          <input type="hidden" name="invoiceId" value={f.id} />
                          <input type="hidden" name="slug" value={slug} />
                        </ActionForm>
                      ) : (
                        <Paneel
                          knop="Crediteren"
                          stijl="menuGevaar"
                          titel="Factuur crediteren"
                          uitleg={`Het bijgeschreven budget van ${formatCents(f.toppedUpCents)} gaat er weer af en de factuur staat daarna op gecrediteerd. Het nummer blijft bestaan, zodat de nummering geen gat krijgt.`}
                        >
                          <ActionForm
                            action={crediteerFactuurActie}
                            submitLabel="Crediteren"
                            submitClassName="bg-[#C02A22] hover:bg-[#A3241D] text-white"
                            resetOnSuccess={false}
                          >
                            <input type="hidden" name="invoiceId" value={f.id} />
                            <input type="hidden" name="slug" value={slug} />
                            <Field label="Reden" name="reden" required placeholder="Verkeerd bedrag ingevoerd" hint="Komt bij de tegenboeking te staan." />
                          </ActionForm>
                        </Paneel>
                      )}
                    </Menu>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
