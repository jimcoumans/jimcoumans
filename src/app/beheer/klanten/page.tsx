import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listOrganizations } from '@/lib/admin'
import {
  getCrmCounts,
  getFilterKeuzes,
  filterKlantIds,
  organizationStatusLabels,
  organizationStatusStyles,
} from '@/lib/crm'
import { GEZONDHEID_LABELS, GEZONDHEID_STIJLEN, REGIOS } from '@/lib/bedrijf-labels'
import { AppShell } from '@/components/AppShell'
import { Avatar } from '@/components/Avatar'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { nieuweKlant } from '../actions'
import { formatCents } from '@/lib/money'

/**
 * Netlify kapt een functie standaard na tien seconden af. Deze pagina haalt
 * meerdere overzichten tegelijk op, en vanaf een serverless functie kost elke
 * query een netwerkronde naar de database. Zit je daarboven, dan krijgt de
 * bezoeker een 502 zonder dat er ergens staat waarom. Zesentwintig seconden
 * is het maximum voor een gewone functie; het is een vangnet, geen streven.
 */
export const maxDuration = 26

/** Klantenoverzicht voor het JR-team. */
export default async function BeheerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const q = await searchParams
  const filter = {
    zoek: q.zoek ?? '',
    status: q.status ?? '',
    branche: q.branche ?? '',
    regio: q.regio ?? '',
    gezondheid: q.gezondheid ?? '',
    manager: q.manager ?? '',
  }
  const filtert = Object.values(filter).some((v) => v !== '')

  const [alle, keuzes, treffers] = await Promise.all([
    listOrganizations(),
    getFilterKeuzes(),
    filterKlantIds(filter),
  ])

  // null betekent: geen filter ingevuld, dus alles.
  const klanten = treffers === null ? alle : alle.filter((k) => treffers.includes(k.organization.id))

  const crm = await getCrmCounts(klanten.map((k) => k.organization.id))
  const totaal = klanten.reduce((acc, k) => acc + k.totalBalanceCents, 0)
  const negatief = klanten.filter((k) => k.totalBalanceCents < 0)

  return (
    <AppShell user={user} actief="klanten">
        <h1 className="text-jr-blue mb-1 text-2xl">Klanten</h1>
        <p className="mb-4 text-sm text-gray-600">
          {klanten.length} {klanten.length === 1 ? 'klant' : 'klanten'}
          {filtert && ` van ${alle.length}`} &middot; totaal openstaand budget{' '}
          <span className="tabular">{formatCents(totaal)}</span>
        </p>

        {/* Een gewoon formulier met GET: de filters staan in de URL, dus je
            kunt een selectie bewaren of naar een collega sturen. */}
        <form method="get" className="mb-6 flex flex-wrap items-end gap-2">
          <input
            type="search"
            name="zoek"
            defaultValue={filter.zoek}
            placeholder="Naam, plaats, KvK of kernactiviteit"
            className="focus:border-jr-blue w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
          />
          <FilterKeuze naam="status" waarde={filter.status} leeg="Alle statussen"
            opties={Object.entries(organizationStatusLabels).map(([v, l]) => ({ value: v, label: l }))} />
          <FilterKeuze naam="branche" waarde={filter.branche} leeg="Alle branches"
            opties={keuzes.branches.map((b) => ({ value: b, label: b }))} />
          <FilterKeuze naam="regio" waarde={filter.regio} leeg="Alle regio's"
            opties={keuzes.regios.map((r) => ({ value: r, label: r }))} />
          <FilterKeuze naam="gezondheid" waarde={filter.gezondheid} leeg="Alle relaties"
            opties={Object.entries(GEZONDHEID_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <FilterKeuze naam="manager" waarde={filter.manager} leeg="Alle managers"
            opties={keuzes.managers.map((m) => ({ value: m.id, label: m.naam }))} />

          <button
            type="submit"
            className="bg-jr-btn hover:bg-jr-btnhover rounded-lg px-4 py-2 text-sm text-white"
          >
            Filteren
          </button>
          {filtert && (
            <a href="/beheer/klanten" className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Wissen
            </a>
          )}
        </form>

        {/* Staat alles op nul, dan is er nog nooit geboekt. Dat is bij het
            invullen van een vers systeem de normale situatie, en dan is een
            link naar het scherm dat het rechttrekt nuttiger dan een cijfer. */}
        {totaal === 0 && klanten.length > 0 && (
          <p className="mb-6 text-sm text-gray-600">
            Alle saldo&rsquo;s staan op nul. Een saldo ontstaat pas bij een boeking; een
            abonnement is een afspraak, nog geen bedrag.{' '}
            <a href="/beheer/beginsaldo" className="text-jr-blue">
              Beginsaldo&rsquo;s overzetten
            </a>
            .
          </p>
        )}

        {negatief.length > 0 && (
          <p className="border-jr-orange bg-jr-orange/5 mb-6 rounded border-l-4 p-3 text-sm">
            {negatief.length === 1
              ? '1 klant staat in de min'
              : `${negatief.length} klanten staan in de min`}
            : {negatief.map((k) => k.organization.name).join(', ')}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {klanten.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  Er zijn nog geen klanten. Voeg de eerste toe, of haal ze op met de
                  ClickUp-sync.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
                {klanten.map((k) => (
                  <li key={k.organization.id}>
                    <a
                      href={`/beheer/klanten/${k.organization.slug}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-gray-50 sm:px-6"
                    >
                      {/* Het logo vierkant en niet rond: een bedrijfslogo
                          heeft zelden een rond formaat en wordt anders aan
                          twee kanten afgesneden. */}
                      <Avatar
                        naam={k.organization.name}
                        imageId={k.organization.logoImageId}
                        maat={40}
                        rond={false}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm">{k.organization.name}</p>
                          {k.organization.relationHealth && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${GEZONDHEID_STIJLEN[k.organization.relationHealth]}`}
                            >
                              {GEZONDHEID_LABELS[k.organization.relationHealth]}
                            </span>
                          )}
                          {k.organization.status !== 'client' && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${organizationStatusStyles[k.organization.status]}`}
                            >
                              {organizationStatusLabels[k.organization.status]}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {[
                            k.organization.industry,
                            `${k.walletCount} ${k.walletCount === 1 ? 'wallet' : 'wallets'}`,
                            (() => {
                              const c = crm.get(k.organization.id)
                              if (!c) return null
                              const delen = []
                              if (c.contacts > 0) delen.push(`${c.contacts} contact${c.contacts === 1 ? '' : 'en'}`)
                              if (c.partners > 0) delen.push(`${c.partners} partner${c.partners === 1 ? '' : 's'}`)
                              if (c.accounts > 0) delen.push(`${c.accounts} account${c.accounts === 1 ? '' : 's'}`)
                              return delen.join(' · ') || null
                            })(),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          {k.clientUserCount === 0 && (
                            <span className="text-jr-orange">
                              {' '}
                              &middot; nog niemand kan inloggen
                            </span>
                          )}
                        </p>
                      </div>
                      <p
                        className={`tabular shrink-0 text-sm ${
                          k.totalBalanceCents < 0 ? 'text-jr-red' : ''
                        }`}
                      >
                        {formatCents(k.totalBalanceCents)}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Klant toevoegen</h2>
            <p className="mb-3 text-xs text-gray-500">
              Alleen de naam is verplicht. Wat je nu al weet kun je meteen kwijt; de rest
              vul je aan op de klantpagina.
            </p>
            <ActionForm action={nieuweKlant} submitLabel="Klant aanmaken">
              <Field label="Klantnaam" name="naam" required placeholder="Hotel Voncken" />
              <Select
                label="Status"
                name="status"
                defaultValue="client"
                options={Object.entries(organizationStatusLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field label="Klantnummer" name="klantnummer" placeholder="672" />
              <Field label="Branche" name="branche" placeholder="Horeca" />
              <Select
                label="Regio"
                name="regio"
                options={[
                  { value: '', label: 'Niet ingevuld' },
                  ...REGIOS.map((r) => ({ value: r, label: r })),
                ]}
              />
              <Field label="Plaats" name="plaats" placeholder="Valkenburg" />
              <Field label="Website" name="website" placeholder="klant.nl" />
              <Field label="KvK-nummer" name="kvk" />

              {keuzes.managers.length > 0 && (
                <Select
                  label="Marketing manager"
                  name="manager"
                  options={[
                    { value: '', label: 'Nog niet toegewezen' },
                    ...keuzes.managers.map((m) => ({ value: m.id, label: m.naam })),
                  ]}
                  hint="Wordt meteen eerste aanspreekpartner, dan staat hij niet in de restkolom."
                />
              )}

              <div className="border-t border-gray-200 pt-3">
                <p className="mb-2 text-xs font-bold text-gray-600">Eerste contactpersoon</p>
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_4rem_1fr]">
                    <Field label="Voornaam" name="contactVoornaam" />
                    <Field label="Tussen" name="contactTussenvoegsel" />
                    <Field label="Achternaam" name="contactAchternaam" />
                  </div>
                  <Field label="Functie" name="contactFunctie" placeholder="Eigenaar" />
                  <Field label="E-mailadres" name="contactEmail" type="email" />
                  <Field label="Mobiel" name="contactMobiel" />
                </div>
              </div>

              <Field
                label="Naam eerste wallet"
                name="walletNaam"
                placeholder="Marketing abonnement"
                hint="Leeg laten geeft: Marketing abonnement"
              />
            </ActionForm>
          </aside>
        </div>
    </AppShell>
  )
}

/** Eén keuzelijst in de filterbalk. Leeg is altijd de eerste optie. */
function FilterKeuze({
  naam,
  waarde,
  leeg,
  opties,
}: {
  naam: string
  waarde: string
  leeg: string
  opties: { value: string; label: string }[]
}) {
  // Een filter zonder opties toont niets: dan valt er ook niets te kiezen.
  if (opties.length === 0) return null

  return (
    <select
      name={naam}
      defaultValue={waarde}
      aria-label={leeg}
      className="focus:border-jr-blue rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
    >
      <option value="">{leeg}</option>
      {opties.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
