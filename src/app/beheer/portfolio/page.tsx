import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getPortfolioBord } from '@/lib/portfolio'
import { listTeam } from '@/lib/team'
import { AppShell } from '@/components/AppShell'
import { PortfolioBord } from '@/components/PortfolioBord'
import { ActionForm } from '@/components/ActionForm'
import { wisselMarketingManager } from '../portfolio-actions'
import { formatCents } from '@/lib/money'

/**
 * Het portfoliobord: wie draagt welke klanten, en hoeveel ruimte is er nog.
 *
 * Alles wat je in één blik wilt zien staat boven de vouw: de cijfers, de
 * kolommen en de doelen. Wie er marketing manager is staat eronder, want dat
 * stel je één keer in en daarna nooit meer.
 */
export default async function PortfolioPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const [bord, team] = await Promise.all([getPortfolioBord(), listTeam()])
  const isBeheerder = user.role === 'admin'

  const verdeeld = bord.totaalCents - bord.nietToegewezenCents
  const bezetting =
    bord.totaalTargetCents === 0 ? null : Math.round((verdeeld / bord.totaalTargetCents) * 100)
  const teVol = bord.kolommen.filter(
    (k) => k.bezettingPercentage !== null && k.bezettingPercentage > 100,
  )
  const zonderDoel = bord.kolommen.filter((k) => k.targetCents === null)

  return (
    <AppShell user={user} actief="portfolio" breed>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-jr-blue text-2xl">Portfolio</h1>
          <p className="text-sm text-gray-600">
            De waarde van een klant is wat zijn lopende abonnementen per maand opleveren.
          </p>
        </div>

        {/* De cijfers naast de titel in plaats van in vier grote tegels: het
            bord is waar het om gaat en dat wil je meteen zien. */}
        <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
          <div>
            <dt className="text-xs text-gray-600">Verdeeld</dt>
            <dd className="tabular text-jr-blue text-xl font-bold leading-tight">
              {formatCents(verdeeld)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Niet toegewezen</dt>
            <dd
              className={`tabular text-xl font-bold leading-tight ${
                bord.nietToegewezenCents > 0 ? 'text-jr-orange' : ''
              }`}
            >
              {formatCents(bord.nietToegewezenCents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Samen aan doelen</dt>
            <dd className="tabular text-xl font-bold leading-tight">
              {formatCents(bord.totaalTargetCents)}
              {bezetting !== null && (
                <span className="ml-1 text-xs font-normal text-gray-500">{bezetting}%</span>
              )}
            </dd>
          </div>
          {teVol.length > 0 && (
            <div>
              <dt className="text-xs text-gray-600">Zit te vol</dt>
              <dd className="text-jr-red text-xl font-bold leading-tight">{teVol.length}</dd>
            </div>
          )}
        </dl>
      </div>

      {bord.kolommen.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Nog geen marketing managers aangewezen. Zet hieronder een collega aan, dan
            krijgt hij een kolom.
          </p>
        </div>
      ) : (
        <PortfolioBord bord={bord} magBeheren={isBeheerder} />
      )}

      {zonderDoel.length > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          Zonder maanddoel is er niets om de belasting tegen af te zetten:{' '}
          {zonderDoel.map((k) => k.naam).join(', ')}.
          {isBeheerder && ' Stel het in via "instellen" in de kolomkop.'}
        </p>
      )}

      <details className="mt-8">
        <summary className="text-jr-blue cursor-pointer text-sm select-none">
          Wie is marketing manager?
        </summary>

        <div className="mt-3 rounded-xl bg-white shadow-sm">
          <p className="border-b border-gray-200 px-5 py-3 text-xs text-gray-500">
            Wie een portfolio draagt krijgt een kolom op het bord.
            {!isBeheerder && ' Alleen een beheerder kan dit wijzigen.'}
          </p>

          <ul className="divide-y divide-gray-200">
            {team.map((lid) => (
              <li
                key={lid.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    <a href={`/beheer/medewerkers/${lid.id}`} className="hover:text-jr-blue">
                      {lid.name ?? lid.email}
                    </a>
                    {lid.isMarketingManager && (
                      <span className="bg-jr-lightblue text-jr-deepblue ml-2 rounded-full px-2 py-0.5 text-xs">
                        Marketing manager
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    {lid.jobTitle ?? lid.email}
                    {lid.klanten > 0 && (
                      <>
                        {' '}&middot; {lid.klanten} klanten &middot;{' '}
                        <span className="tabular">{formatCents(lid.portfolioCents)}</span> per maand
                      </>
                    )}
                  </p>
                </div>

                {isBeheerder && (
                  <ActionForm
                    action={wisselMarketingManager}
                    submitLabel={lid.isMarketingManager ? 'Geen manager meer' : 'Maak manager'}
                    submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                    resetOnSuccess={false}
                    className=""
                  >
                    <input type="hidden" name="userId" value={lid.id} />
                    <input
                      type="hidden"
                      name="manager"
                      value={lid.isMarketingManager ? 'nee' : 'ja'}
                    />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </AppShell>
  )
}
