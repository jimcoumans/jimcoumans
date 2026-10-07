import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listTeam, formatContractUren } from '@/lib/team'
import { getFiguresByEmployee } from '@/lib/reports'
import { getPersoneelskosten } from '@/lib/kosten'
import { getMonthlyRecurringCents } from '@/lib/billing'
import { Avatar } from '@/components/Avatar'
import { AppShell } from '@/components/AppShell'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { Menu } from '@/components/Menu'
import { nieuweMedewerker, wijzigMedewerker, wisselMedewerkerToegang } from '../service-actions'
import { formatEuro } from '@/lib/money'
import { formatDate } from '@/lib/dates'

/**
 * Netlify kapt een functie standaard na tien seconden af. Deze pagina haalt
 * meerdere overzichten tegelijk op, en vanaf een serverless functie kost elke
 * query een netwerkronde naar de database. Zit je daarboven, dan krijgt de
 * bezoeker een 502 zonder dat er ergens staat waarom. Zesentwintig seconden
 * is het maximum voor een gewone functie; het is een vangnet, geen streven.
 */
export const maxDuration = 26

/**
 * Het team in één tabel.
 *
 * Dit scherm is om te kíjken: wie werkt hier, wat draagt hij en hoe bereik je
 * hem. Wijzigen doe je op het profiel, want daar past alles wat we van iemand
 * bijhouden. Alleen de rol en de toegang staan hier, omdat dat over deze lijst
 * gaat en niet over de persoon.
 */
export default async function MedewerkersPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const isBeheerder = user.role === 'admin'
  const [team, cijfers, kosten, mrr] = await Promise.all([
    listTeam(),
    getFiguresByEmployee(),
    // Kosten alleen ophalen als je ze mag zien: wat je niet opvraagt kan ook
    // niet per ongeluk in de HTML belanden.
    isBeheerder ? getPersoneelskosten() : null,
    isBeheerder ? getMonthlyRecurringCents() : null,
  ])
  const perUser = new Map(cijfers.map((c) => [c.userId, c]))

  const inDienst = team.filter((l) => l.endedOn === null)
  const uitDienst = team.filter((l) => l.endedOn !== null)
  const managers = inDienst.filter((l) => l.isMarketingManager)
  const samenPortfolio = team.reduce((t, l) => t + l.portfolioCents, 0)

  return (
    <AppShell user={user} actief="medewerkers" breed>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-[28px] sm:text-[32px]">Team</h1>
          <p className="text-sm text-gray-600">
            Klik op een naam voor het volledige profiel: contactgegevens, contract, verjaardag
            en notities.
          </p>
        </div>

        <dl className="order-last mt-2 grid w-full gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))] [&>div]:rounded-xl [&>div]:bg-white [&>div]:px-5 [&>div]:py-4 [&>div]:shadow-sm">
          <div>
            <dt className="text-xs text-gray-600">In dienst</dt>
            <dd className="tabular text-jr-blue text-xl font-bold leading-tight">
              {inDienst.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Marketing managers</dt>
            <dd className="tabular text-xl font-bold leading-tight">{managers.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Samen in portfolio</dt>
            <dd className="tabular text-xl font-bold leading-tight">
              {formatEuro(samenPortfolio)}
            </dd>
          </div>
        </dl>
            {/* Wie er in het team zit, bepaalt een beheerder. */}
            {isBeheerder && (
            <Paneel
              knop="+ Collega toevoegen"
              titel="Collega toevoegen"
            uitleg="Meer dan een naam en een adres heb je hier niet nodig. De rest vul je op zijn profiel in."
            >
          <ActionForm action={nieuweMedewerker} submitLabel="Toevoegen">
            <Field
              label="E-mailadres"
              name="email"
              type="email"
              required
              placeholder="naam@jamesrobinson.nl"
            />
            <Field label="Naam" name="naam" placeholder="Voor- en achternaam" />

            <div>
              <label htmlFor="rol" className="text-jr-text mb-1.5 block text-[13px] font-medium">
                Rol
              </label>
              <select
                id="rol"
                name="rol"
                defaultValue="staff"
                className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
              >
                <option value="staff">Medewerker</option>
                <option value="admin" disabled={user.role !== 'admin'}>
                  Beheerder{user.role !== 'admin' ? ' (alleen door beheerder)' : ''}
                </option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Medewerkers en beheerders zien alle klanten. Het verschil is dat alleen een
                beheerder nieuwe beheerders kan toevoegen, en dat alleen hij de uurkostprijs
                ziet.
              </p>
            </div>
          </ActionForm>
            </Paneel>
            )}
      </div>

      {kosten && (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-base">Wat het team kost</h2>
            <p className="text-xs text-gray-500">
              Alleen zichtbaar voor beheerders &middot; brutoloon plus vakantiegeld en
              werkgeverslasten
            </p>
          </div>

          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="text-xs text-gray-600">Per maand</dt>
              <dd className="tabular text-jr-blue text-2xl font-bold leading-tight">
                {formatEuro(kosten.totaalCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Per jaar</dt>
              <dd className="tabular text-2xl font-bold leading-tight">
                {formatEuro(kosten.totaalCents * 12)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Loondienst</dt>
              <dd className="tabular text-2xl font-bold leading-tight">
                {formatEuro(kosten.loondienstCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Management fee</dt>
              <dd className="tabular text-2xl font-bold leading-tight">
                {formatEuro(kosten.managementFeeCents)}
              </dd>
            </div>
            {mrr !== null && mrr > 0 && (
              <div>
                <dt className="text-xs text-gray-600">Van de abonnementsomzet</dt>
                <dd
                  className={`tabular text-2xl font-bold leading-tight ${
                    kosten.totaalCents > mrr ? 'text-jr-red' : ''
                  }`}
                >
                  {Math.round((kosten.totaalCents / mrr) * 100)}%
                </dd>
              </div>
            )}
          </dl>

          {kosten.zonderBeloning.length > 0 && (
            <p className="border-jr-orange bg-jr-orange/5 mt-3 rounded border-l-4 p-3 text-sm">
              {/* Stil op nul zetten is het gevaarlijkst: dan lijkt je grootste
                  kostenpost lager dan hij is. */}
              Nog geen beloning vastgelegd voor{' '}
              {kosten.zonderBeloning.map((z) => z.naam).join(', ')}. Zolang dat zo is tellen
              zij hierboven niet mee.
            </p>
          )}

          {kosten.perAfdeling.length > 1 && (
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-200 pt-3">
              {kosten.perAfdeling.map((a) => (
                <li key={a.afdeling} className="text-xs text-gray-600">
                  {a.afdeling}: <span className="tabular">{formatEuro(a.cents)}</span> (
                  {a.mensen})
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div>
        <div className="space-y-6">
          <Tabel
            team={inDienst}
            perUser={perUser}
            huidigeId={user.id}
            magAdminMaken={user.role === 'admin'}
          />

          {uitDienst.length > 0 && (
            <details>
              <summary className="text-jr-blue cursor-pointer text-sm select-none">
                Uit dienst ({uitDienst.length})
              </summary>
              <div className="mt-3">
                <Tabel
                  team={uitDienst}
                  perUser={perUser}
                  huidigeId={user.id}
                  magAdminMaken={user.role === 'admin'}
                />
              </div>
            </details>
          )}
        </div>

      </div>
    </AppShell>
  )
}

type Cijfers = Awaited<ReturnType<typeof getFiguresByEmployee>>[number]
type Teamlid = Awaited<ReturnType<typeof listTeam>>[number]

/**
 * De tabel scrollt horizontaal als hij niet past.
 *
 * Dat is de enige plek in dit scherm waar dat mag: een tabel smaller maken
 * betekent kolommen weglaten, en dan is het geen overzicht meer.
 */
function Tabel({
  team,
  perUser,
  huidigeId,
  magAdminMaken,
}: {
  team: Teamlid[]
  perUser: Map<string, Cijfers>
  huidigeId: string
  magAdminMaken: boolean
}) {
  if (team.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">Nog geen collega&rsquo;s toegevoegd.</p>
      </div>
    )
  }

  // Als een lijst, niet als tabel: wie, wat en hoe bereikbaar links, wat
  // iemand oplevert rechts. Lege kolommen met streepjes vallen zo weg.
  return (
    <ul className="divide-y divide-gray-150 rounded-xl bg-white shadow-sm">
      {team.map((lid) => {
        const c = perUser.get(lid.id)
        const bereik = lid.mobile ?? lid.phone
        const uren = formatContractUren(lid.contractHoursPerWeekQuarters)
        return (
          <li key={lid.id} className={`flex items-center gap-4 py-3.5 pr-3 pl-5 ${lid.disabledAt ? 'opacity-60' : ''}`}>
            <Avatar naam={lid.name ?? lid.email} imageId={lid.avatarImageId} maat={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px]">
                <a href={`/beheer/medewerkers/${lid.id}`} className="hover:text-jr-link font-medium">
                  {lid.name ?? lid.email}
                </a>
                {lid.id === huidigeId && <span className="ml-1.5 text-xs text-gray-500">jij</span>}
                {lid.role === 'admin' && <span className="text-jr-link ml-2 text-xs">Beheerder</span>}
                {lid.isMarketingManager && <span className="text-jr-link ml-2 text-xs">Marketingmanager</span>}
                {lid.disabledAt && <span className="ml-2 text-xs text-[#C02A22]">Geblokkeerd</span>}
              </p>
              <p className="truncate text-[13px] text-gray-600">
                {[lid.jobTitle ?? 'Functie nog niet ingevuld', lid.department, uren].filter(Boolean).join(' · ')}
              </p>
              <p className="truncate text-[13px]">
                <a href={`mailto:${lid.email}`} className="text-jr-link hover:underline">
                  {lid.email}
                </a>
                {bereik && (
                  <a href={`tel:${bereik.replace(/\s/g, '')}`} className="ml-2 text-gray-600 hover:underline">
                    {bereik}
                  </a>
                )}
              </p>
            </div>

            <div className="hidden shrink-0 text-right text-[13px] sm:block">
              {lid.klanten > 0 && (
                <p>
                  <span className="tabular text-[15px]">{formatEuro(lid.portfolioCents)}</span>{' '}
                  <span className="text-gray-500">
                    per maand, {lid.klanten} {lid.klanten === 1 ? 'klant' : 'klanten'}
                  </span>
                </p>
              )}
              {c && c.revenueCents !== 0 && (
                <p className="text-gray-600">
                  {formatEuro(c.revenueCents)} geleverd in {c.bookingCount} {c.bookingCount === 1 ? 'boeking' : 'boekingen'}
                </p>
              )}
              <p className="text-gray-500">{lid.lastLoginAt ? `Laatst ingelogd ${formatDate(lid.lastLoginAt)}` : 'Nog nooit ingelogd'}</p>
            </div>

            <Menu>
              {magAdminMaken && (
              <Paneel knop="Rol wijzigen" stijl="menu" titel={`Rol van ${lid.name ?? lid.email}`}>
                <ActionForm action={wijzigMedewerker} submitLabel="Opslaan" resetOnSuccess={false}>
                  <input type="hidden" name="userId" value={lid.id} />
                  <input type="hidden" name="naam" value={lid.name ?? ''} />
                  <Select
                    label="Rol"
                    name="rol"
                    defaultValue={lid.role}
                    options={[
                      { value: 'staff', label: 'Medewerker' },
                      { value: 'admin', label: 'Beheerder' },
                    ]}
                    hint="Een beheerder beheert ook abonnementen, het team, contracten en salarissen."
                  />
                </ActionForm>
              </Paneel>
              )}
              <a href={`/beheer/medewerkers/${lid.id}`} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-jr-text hover:bg-gray-100">
                Profiel openen
              </a>
              {magAdminMaken && lid.id !== huidigeId && (
                <ActionForm
                  action={wisselMedewerkerToegang}
                  submitLabel={lid.disabledAt ? 'Toegang teruggeven' : 'Blokkeren'}
                  submitClassName={`!min-h-0 w-full !rounded-lg !px-3 !py-2 text-left !font-normal ${lid.disabledAt ? 'text-jr-text hover:bg-gray-100' : 'text-[#C02A22] hover:bg-[#FDECEA]'}`}
                  resetOnSuccess={false}
                  meldGelukt={false}
                  className=""
                >
                  <input type="hidden" name="userId" value={lid.id} />
                  <input type="hidden" name="blokkeren" value={lid.disabledAt ? '0' : '1'} />
                </ActionForm>
              )}
            </Menu>
          </li>
        )
      })}
    </ul>
  )
}
