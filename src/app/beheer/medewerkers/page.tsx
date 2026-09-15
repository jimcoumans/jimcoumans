import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listTeam, formatContractUren } from '@/lib/team'
import { getFiguresByEmployee } from '@/lib/reports'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select, Uitklap } from '@/components/ActionForm'
import { nieuweMedewerker, wijzigMedewerker, wisselMedewerkerToegang } from '../service-actions'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'

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

  const [team, cijfers] = await Promise.all([listTeam(), getFiguresByEmployee()])
  const perUser = new Map(cijfers.map((c) => [c.userId, c]))

  const inDienst = team.filter((l) => l.endedOn === null)
  const uitDienst = team.filter((l) => l.endedOn !== null)
  const managers = inDienst.filter((l) => l.isMarketingManager)
  const samenPortfolio = team.reduce((t, l) => t + l.portfolioCents, 0)

  return (
    <AppShell user={user} actief="medewerkers" breed>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-jr-blue text-2xl">Team</h1>
          <p className="text-sm text-gray-600">
            Klik op een naam voor het volledige profiel: contactgegevens, contract, verjaardag
            en notities.
          </p>
        </div>

        <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
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
              {formatCents(samenPortfolio)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
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

        <aside className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base">Collega toevoegen</h2>
          <p className="mb-3 text-xs text-gray-500">
            Meer dan een naam en een adres heb je hier niet nodig. De rest vul je op zijn
            profiel in.
          </p>
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
              <label htmlFor="rol" className="mb-1 block text-xs text-gray-600">
                Rol
              </label>
              <select
                id="rol"
                name="rol"
                defaultValue="staff"
                className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
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
        </aside>
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

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
            <th className="px-4 py-2.5 font-normal">Naam</th>
            <th className="px-4 py-2.5 font-normal">Functie</th>
            <th className="px-4 py-2.5 font-normal">Bereikbaar</th>
            <th className="px-4 py-2.5 text-right font-normal">Contract</th>
            <th className="px-4 py-2.5 text-right font-normal">Portfolio p/m</th>
            <th className="px-4 py-2.5 text-right font-normal">Geleverde omzet</th>
            <th className="px-4 py-2.5 font-normal">Laatst actief</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {team.map((lid) => {
            const c = perUser.get(lid.id)
            const bereik = lid.mobile ?? lid.phone
            return (
              <tr key={lid.id} className="align-top">
                <td className="px-4 py-3">
                  <a
                    href={`/beheer/medewerkers/${lid.id}`}
                    className="hover:text-jr-blue font-medium"
                  >
                    {lid.name ?? lid.email}
                  </a>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {lid.role === 'admin' && (
                      <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-1.5 py-0.5 text-xs">
                        Beheerder
                      </span>
                    )}
                    {lid.isMarketingManager && (
                      <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-1.5 py-0.5 text-xs">
                        Manager
                      </span>
                    )}
                    {lid.id === huidigeId && <span className="text-xs text-gray-500">(jij)</span>}
                    {lid.disabledAt && (
                      <span className="bg-jr-red/10 text-jr-red rounded-full px-1.5 py-0.5 text-xs">
                        Geblokkeerd
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <p>{lid.jobTitle ?? <span className="text-gray-400">—</span>}</p>
                  {lid.department && (
                    <p className="text-xs text-gray-600">{lid.department}</p>
                  )}
                </td>

                <td className="px-4 py-3">
                  <a href={`mailto:${lid.email}`} className="hover:text-jr-blue text-xs">
                    {lid.email}
                  </a>
                  {bereik && (
                    <p className="text-xs text-gray-600">
                      <a href={`tel:${bereik.replace(/\s/g, '')}`} className="hover:text-jr-blue">
                        {bereik}
                      </a>
                    </p>
                  )}
                </td>

                <td className="tabular px-4 py-3 text-right">
                  {formatContractUren(lid.contractHoursPerWeekQuarters) ?? (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                <td className="tabular px-4 py-3 text-right">
                  {lid.klanten === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <>
                      {formatCents(lid.portfolioCents)}
                      <span className="block text-xs text-gray-600">
                        {lid.klanten} {lid.klanten === 1 ? 'klant' : 'klanten'}
                      </span>
                    </>
                  )}
                </td>

                <td className="tabular px-4 py-3 text-right">
                  {c && c.revenueCents !== 0 ? (
                    <>
                      {formatCents(c.revenueCents)}
                      <span className="block text-xs text-gray-600">
                        {c.bookingCount} {c.bookingCount === 1 ? 'boeking' : 'boekingen'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                <td className="px-4 py-3 text-xs text-gray-600">
                  {lid.lastLoginAt ? formatDate(lid.lastLoginAt) : 'nog niet ingelogd'}
                </td>

                <td className="px-4 py-3 text-right">
                  <Uitklap label="Rol" className="">
                    <ActionForm
                      action={wijzigMedewerker}
                      submitLabel="Opslaan"
                      resetOnSuccess={false}
                    >
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
                        hint={
                          magAdminMaken
                            ? 'Alleen een beheerder kan abonnementen en medewerkers beheren.'
                            : 'Alleen een beheerder kan iemand tot beheerder maken.'
                        }
                      />
                    </ActionForm>

                    {lid.id !== huidigeId && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <ActionForm
                          action={wisselMedewerkerToegang}
                          submitLabel={lid.disabledAt ? 'Toegang teruggeven' : 'Blokkeren'}
                          submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                          resetOnSuccess={false}
                          className=""
                        >
                          <input type="hidden" name="userId" value={lid.id} />
                          <input
                            type="hidden"
                            name="blokkeren"
                            value={lid.disabledAt ? '0' : '1'}
                          />
                        </ActionForm>
                      </div>
                    )}
                  </Uitklap>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
