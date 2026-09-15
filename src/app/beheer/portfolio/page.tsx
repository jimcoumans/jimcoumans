import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getPortfolioBord } from '@/lib/portfolio'
import { db } from '@/db'
import { users } from '@/db/schema'
import { asc, isNull } from 'drizzle-orm'
import { AppShell } from '@/components/AppShell'
import { PortfolioBord } from '@/components/PortfolioBord'
import { ActionForm, Field } from '@/components/ActionForm'
import { wisselMarketingManager, zetMaanddoel } from '../portfolio-actions'
import { formatCents } from '@/lib/money'

/** Het portfoliobord: wie draagt welke klanten, en hoe vol zit hij. */
export default async function PortfolioPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const [bord, team] = await Promise.all([
    getPortfolioBord(),
    db.select().from(users).where(isNull(users.organizationId)).orderBy(asc(users.name), asc(users.email)),
  ])

  const bezetting =
    bord.totaalTargetCents === 0
      ? null
      : Math.round(
          (bord.kolommen.reduce((t, k) => t + k.totaalCents, 0) / bord.totaalTargetCents) * 100,
        )

  const teVol = bord.kolommen.filter(
    (k) => k.bezettingPercentage !== null && k.bezettingPercentage > 100,
  )

  return (
    <AppShell user={user} actief="portfolio">
      <h1 className="text-jr-blue mb-1 text-2xl">Portfolio</h1>
      <p className="mb-6 text-sm text-gray-600">
        Wie draagt welke klanten, en hoeveel ruimte is er nog. De waarde van een klant is
        wat zijn lopende abonnementen per maand opleveren — niet wat er vorige maand
        toevallig geboekt is.
      </p>

      <section className="mb-7 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-600">Verdeeld</p>
          <p className="tabular text-jr-blue mt-1 text-2xl font-bold">
            {formatCents(bord.totaalCents - bord.nietToegewezenCents)}
          </p>
          <p className="mt-1 text-xs text-gray-500">per maand, over {bord.kolommen.length} managers</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-600">Nog niet toegewezen</p>
          <p
            className={`tabular mt-1 text-2xl font-bold ${
              bord.nietToegewezenCents > 0 ? 'text-jr-orange' : ''
            }`}
          >
            {formatCents(bord.nietToegewezenCents)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {bord.nietToegewezen.length} {bord.nietToegewezen.length === 1 ? 'klant' : 'klanten'}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-600">Samen aan doelen</p>
          <p className="tabular mt-1 text-2xl font-bold">{formatCents(bord.totaalTargetCents)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {bezetting === null ? 'geen doelen ingesteld' : `${bezetting}% gevuld`}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-xs text-gray-600">Zit te vol</p>
          <p className={`tabular mt-1 text-2xl font-bold ${teVol.length > 0 ? 'text-jr-red' : ''}`}>
            {teVol.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {teVol.length === 0 ? 'iedereen binnen zijn doel' : teVol.map((k) => k.naam).join(', ')}
          </p>
        </div>
      </section>

      {bord.kolommen.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Nog geen marketing managers aangewezen. Zet hieronder een collega aan als
            marketing manager, dan krijgt hij een kolom.
          </p>
        </div>
      ) : (
        <PortfolioBord bord={bord} />
      )}

      <section className="mt-8">
        <h2 className="mb-1 text-base">Marketing managers en hun doel</h2>
        <p className="mb-3 text-xs text-gray-500">
          Wie een portfolio draagt krijgt een kolom. Het maanddoel is waar de belasting
          tegen wordt afgezet.
          {user.role !== 'admin' && ' Alleen een beheerder kan dit wijzigen.'}
        </p>

        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {team.map((lid) => {
            const kolom = bord.kolommen.find((k) => k.userId === lid.id)
            return (
              <li key={lid.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm">
                    {lid.name ?? lid.email}
                    {lid.isMarketingManager && (
                      <span className="bg-jr-lightblue text-jr-deepblue ml-2 rounded-full px-2 py-0.5 text-xs">
                        Marketing manager
                      </span>
                    )}
                    {lid.disabledAt && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        geblokkeerd
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    {lid.email}
                    {kolom && (
                      <>
                        {' '}&middot; {kolom.klanten.length} klanten &middot;{' '}
                        <span className="tabular">{formatCents(kolom.totaalCents)}</span> per maand
                      </>
                    )}
                  </p>
                </div>

                {user.role === 'admin' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <ActionForm
                      action={wisselMarketingManager}
                      submitLabel={lid.isMarketingManager ? 'Geen manager meer' : 'Maak manager'}
                      submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                      resetOnSuccess={false}
                      className=""
                    >
                      <input type="hidden" name="userId" value={lid.id} />
                      <input type="hidden" name="manager" value={lid.isMarketingManager ? 'nee' : 'ja'} />
                    </ActionForm>

                    {lid.isMarketingManager && (
                      <ActionForm
                        action={zetMaanddoel}
                        submitLabel="Doel opslaan"
                        submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                        resetOnSuccess={false}
                        className="flex items-end gap-2"
                      >
                        <input type="hidden" name="userId" value={lid.id} />
                        <div className="w-32">
                          <Field
                            label="Maanddoel"
                            name="doel"
                            defaultValue={
                              lid.monthlyTargetCents === null
                                ? ''
                                : (lid.monthlyTargetCents / 100).toFixed(2).replace('.', ',')
                            }
                            placeholder="20000,00"
                          />
                        </div>
                      </ActionForm>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </AppShell>
  )
}
