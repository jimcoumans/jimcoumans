import { redirect } from 'next/navigation'
import { asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getSessionUser } from '@/lib/auth'
import { getFiguresByEmployee } from '@/lib/reports'
import { Header } from '@/components/Header'
import { ActionForm, Field } from '@/components/ActionForm'
import { nieuweMedewerker, wisselMedewerkerToegang } from '../service-actions'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'

/** Het JR-team: wie mag in het beheer, en wat leveren ze op. */
export default async function MedewerkersPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const team = await db
    .select()
    .from(users)
    .where(isNull(users.organizationId))
    .orderBy(asc(users.name), asc(users.email))

  const cijfers = await getFiguresByEmployee()
  const perUser = new Map(cijfers.map((c) => [c.userId, c]))

  return (
    <>
      <Header user={user} actief="medewerkers" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-jr-blue mb-1 text-2xl">Team</h1>
        <p className="mb-6 text-sm text-gray-600">
          {team.length} {team.length === 1 ? 'medewerker' : 'medewerkers'} met toegang tot
          het beheer. De omzet hieronder is wat zij hebben gelevérd, niet wat ze hebben
          ingevoerd.
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {team.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">Nog geen medewerkers toegevoegd.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
                {team.map((lid) => {
                  const c = perUser.get(lid.id)
                  return (
                    <li
                      key={lid.id}
                      className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm">{lid.name ?? lid.email}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              lid.role === 'admin'
                                ? 'bg-jr-lightblue text-jr-deepblue'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {lid.role === 'admin' ? 'Beheerder' : 'Medewerker'}
                          </span>
                          {lid.id === user.id && (
                            <span className="text-xs text-gray-500">(jij)</span>
                          )}
                          {lid.disabledAt && (
                            <span className="bg-jr-red/10 text-jr-red rounded-full px-2 py-0.5 text-xs">
                              Geblokkeerd
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs text-gray-600">
                          {lid.name ? `${lid.email} · ` : ''}
                          {lid.lastLoginAt
                            ? `laatst ingelogd ${formatDate(lid.lastLoginAt)}`
                            : 'nog niet ingelogd'}
                        </p>

                        {c && (
                          <p className="mt-1 text-xs text-gray-600">
                            {c.bookingCount} {c.bookingCount === 1 ? 'boeking' : 'boekingen'}{' '}
                            &middot; {c.clientCount}{' '}
                            {c.clientCount === 1 ? 'klant' : 'klanten'}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        {c ? (
                          <>
                            <p className="tabular text-sm">{formatCents(c.revenueCents)}</p>
                            <p className="text-xs text-gray-600">geleverde omzet</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">nog niets geleverd</p>
                        )}

                        {lid.id !== user.id && (
                          <div className="mt-1">
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
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <aside className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Collega toevoegen</h2>
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
                  Medewerkers en beheerders zien alle klanten. Het verschil is dat alleen
                  een beheerder nieuwe beheerders kan toevoegen.
                </p>
              </div>
            </ActionForm>
          </aside>
        </div>
      </main>
    </>
  )
}
