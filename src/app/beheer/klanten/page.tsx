import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listOrganizations } from '@/lib/admin'
import {
  getFilterKeuzes,
  filterKlantIds,
  organizationStatusLabels,
  organizationStatusStyles,
} from '@/lib/crm'
import { GEZONDHEID_LABELS, GEZONDHEID_STIJLEN, REGIOS } from '@/lib/bedrijf-labels'
import { AppShell } from '@/components/AppShell'
import { Paneel, PaneelKop } from '@/components/Paneel'
import { PaginaKop } from '@/components/PaginaKop'
import { Avatar } from '@/components/Avatar'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { nieuweKlant } from '../actions'
import { formatCents, formatEuro } from '@/lib/money'
import { FilterBalk, Zoekveld } from '@/components/FilterBalk'
import { getMaandbudgetPerKlant } from '@/lib/billing'
import { getHuidigeStappen } from '@/lib/klantreis'
import { metGeheugen } from '@/lib/cache'

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

  // Achter elkaar en onthouden. De lijst zelf en de filterkeuzes veranderen
  // zelden; de treffers hangen aan wat je invult en krijgen hun eigen sleutel.
  const alle = await metGeheugen('klanten:alle', listOrganizations)
  const keuzes = await metGeheugen('klanten:keuzes', getFilterKeuzes)
  const treffers = await metGeheugen(
    `klanten:filter:${JSON.stringify(filter)}`,
    () => filterKlantIds(filter),
  )

  // null betekent: geen filter ingevuld, dus alles.
  const klanten = treffers === null ? alle : alle.filter((k) => treffers.includes(k.organization.id))

  const maandbudget = await metGeheugen('klanten:maandbudget', getMaandbudgetPerKlant)
  // Niet onthouden: wie net een mijlpaal afvinkt, wil de nieuwe stap meteen zien.
  const stappen = await getHuidigeStappen(alle.map((k) => k.organization.id))
  const totaal = klanten.reduce((acc, k) => acc + k.totalBalanceCents, 0)
  const negatief = klanten.filter((k) => k.totalBalanceCents < 0)

  return (
    <AppShell user={user} actief="klanten">
        <PaginaKop
          titel="Bedrijven"
          uitleg={
            <>
              {klanten.length} {klanten.length === 1 ? 'bedrijf' : 'bedrijven'}
              {filtert && ` van ${alle.length}`} &middot; totaal openstaand budget{' '}
              <span className="tabular">{formatCents(totaal)}</span>
            </>
          }
          acties={
            <Paneel
              knop="+ Bedrijf toevoegen"
              titel="Bedrijf toevoegen"
              uitleg="Alleen de naam is verplicht. Wat je nu al weet kun je meteen kwijt; de rest vul je aan op de klantpagina."
            >
              <ActionForm action={nieuweKlant} submitLabel="Klant aanmaken" className="grid gap-4 sm:grid-cols-2">
                <PaneelKop>Het bedrijf</PaneelKop>
                <div className="sm:col-span-2">
                  <Field label="Klantnaam" name="naam" required placeholder="Hotel Voncken" />
                </div>
                <Select
                  label="Status"
                  name="status"
                  defaultValue="client"
                  options={Object.entries(organizationStatusLabels).map(([value, label]) => ({ value, label }))}
                />
                <Field label="Klantnummer" name="klantnummer" placeholder="672" />
                <Field label="Branche" name="branche" placeholder="Horeca" />
                <Select label="Regio" name="regio" options={[{ value: '', label: 'Niet ingevuld' }, ...REGIOS.map((r) => ({ value: r, label: r }))]} />
                <Field label="Plaats" name="plaats" placeholder="Valkenburg" />
                <Field label="Website" name="website" placeholder="klant.nl" />
                <Field label="KvK-nummer" name="kvk" />
                {keuzes.managers.length > 0 && (
                  <Select
                    label="Marketingmanager"
                    name="manager"
                    options={[{ value: '', label: 'Nog niet toegewezen' }, ...keuzes.managers.map((m) => ({ value: m.id, label: m.naam }))]}
                    hint="Wordt meteen eerste aanspreekpartner."
                  />
                )}
                <PaneelKop>Eerste contactpersoon</PaneelKop>
                <div className="grid items-end gap-3 sm:col-span-2 sm:grid-cols-[1fr_130px_1fr]">
                  <Field label="Voornaam" name="contactVoornaam" placeholder="Marieke" />
                  <Field label="Tussenvoegsel" name="contactTussenvoegsel" placeholder="van der" />
                  <Field label="Achternaam" name="contactAchternaam" placeholder="Voncken" />
                </div>
                <Field label="Functie" name="contactFunctie" placeholder="Eigenaar" />
                <Field label="E-mailadres" name="contactEmail" type="email" />
                <Field label="Mobiel" name="contactMobiel" />
                <PaneelKop>Wallet</PaneelKop>
                <Field label="Naam eerste wallet" name="walletNaam" placeholder="Marketing abonnement" hint="Leeg laten geeft: Marketing abonnement" />
              </ActionForm>
            </Paneel>
          }
        />

        <FilterBalk wisHref={filtert ? '/beheer/klanten' : null}>
          <Zoekveld waarde={filter.zoek} placeholder="Zoek op naam, plaats of KvK" />
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
        </FilterBalk>

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

        <div>
          <div>
            {klanten.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  {filtert ? 'Geen klanten die hierbij passen.' : 'Er zijn nog geen klanten. Voeg de eerste toe, of haal ze op met de ClickUp-sync.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
                {klanten.map((k) => (
                  <li key={k.organization.id}>
                    <a
                      href={`/beheer/klanten/${k.organization.slug}`}
                      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-gray-50 sm:px-6"
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
                          {(() => {
                            const stap = stappen.get(k.organization.id)
                            if (!stap) return null
                            const kleur =
                              stap.fase === 'Verkopen'
                                ? 'bg-jr-lightblue text-jr-deepblue'
                                : stap.fase === 'Starten'
                                  ? 'bg-[#F5EAFB] text-[#7E2FB0]'
                                  : 'bg-[#E6F7EB] text-[#1D7D3F]'
                            return (
                              <span className={`rounded-full px-2 py-0.5 text-xs ${kleur}`} title={stap.titel}>
                                {stap.titel}
                              </span>
                            )
                          })()}
                          {k.organization.status !== 'client' && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${organizationStatusStyles[k.organization.status]}`}
                            >
                              {organizationStatusLabels[k.organization.status]}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[13px] text-gray-600">
                          {[k.organization.industry, k.organization.city].filter(Boolean).join(' · ')}
                          {k.clientUserCount === 0 && (
                            <span className="text-[#94590A]">
                              {(k.organization.industry || k.organization.city) && ' · '}
                              Kan nog niet inloggen
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="tabular shrink-0 text-right">
                        <p className="text-xs text-gray-600">
                          {maandbudget.has(k.organization.id)
                            ? `${formatEuro(maandbudget.get(k.organization.id) ?? 0)} per maand`
                            : 'Geen abonnement'}
                        </p>
                        <p
                          className={`text-[15px] font-semibold ${
                            k.totalBalanceCents > 0 ? 'text-[#1D7D3F]' : k.totalBalanceCents < 0 ? 'text-[#C02A22]' : 'text-jr-text'
                          }`}
                        >
                          {formatCents(k.totalBalanceCents)}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
      className="min-h-11 rounded-full border border-gray-300 bg-white py-2.5 pr-9 pl-4 text-[15px] outline-none hover:border-gray-400"
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
