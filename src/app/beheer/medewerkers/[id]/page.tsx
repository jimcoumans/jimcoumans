import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getTeamlid, formatContractUren, AFDELINGEN } from '@/lib/team'
import { getFiguresByEmployee } from '@/lib/reports'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, TextArea } from '@/components/ActionForm'
import { bewerkMedewerkerprofiel, bewerkUurkostprijs } from '../../medewerker-actions'
import { formatCents } from '@/lib/money'
import { formatDate, formatDateInput, MAANDNAMEN } from '@/lib/dates'

/**
 * Het profiel van één collega.
 *
 * Links wie hij is, rechts wat hij draagt. De uurkostprijs staat apart
 * onderaan en alleen voor beheerders: dat cijfer ligt tegen salaris aan.
 */
export default async function MedewerkerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const detail = await getTeamlid(id)
  if (!detail || detail.lid.organizationId !== null) notFound()

  const { lid, klanten, portfolioCents } = detail
  const isBeheerder = user.role === 'admin'

  const cijfers = await getFiguresByEmployee()
  const eigen = cijfers.find((c) => c.userId === lid.id)

  const uren = formatContractUren(lid.contractHoursPerWeekQuarters)
  const doelCents = lid.monthlyTargetCents
  const bezetting =
    doelCents === null || doelCents === 0 ? null : Math.round((portfolioCents / doelCents) * 100)

  return (
    <AppShell user={user} actief="medewerkers" breed>
      <div className="mb-5">
        <a href="/beheer/medewerkers" className="hover:text-jr-blue text-xs text-gray-500">
          &larr; Team
        </a>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-jr-blue text-2xl">{lid.name ?? lid.email}</h1>
          {lid.role === 'admin' && (
            <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-2 py-0.5 text-xs">
              Beheerder
            </span>
          )}
          {lid.isMarketingManager && (
            <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-2 py-0.5 text-xs">
              Marketing manager
            </span>
          )}
          {lid.endedOn && (
            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
              Uit dienst sinds {formatDate(lid.endedOn)}
            </span>
          )}
          {lid.disabledAt && (
            <span className="bg-jr-red/10 text-jr-red rounded-full px-2 py-0.5 text-xs">
              Geblokkeerd
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600">
          {[lid.jobTitle, lid.department].filter(Boolean).join(' · ') || 'Nog geen functie ingevuld'}
          {' · '}
          <a href={`mailto:${lid.email}`} className="hover:text-jr-blue">
            {lid.email}
          </a>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------------
            Wie is dit
            --------------------------------------------------------------- */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base">Gegevens</h2>
          <p className="mb-4 text-xs text-gray-500">
            Het e-mailadres blijft {lid.email}. Daarmee logt hij in en daaraan hangen zijn
            boekingen; wijzig je dat, dan is het een andere persoon. Dat doe je op de teamlijst.
          </p>

          <ActionForm
            action={bewerkMedewerkerprofiel}
            submitLabel="Opslaan"
            resetOnSuccess={false}
          >
            <input type="hidden" name="userId" value={lid.id} />

            <Field label="Naam" name="naam" defaultValue={lid.name ?? ''} />
            <Field
              label="Functie"
              name="functie"
              defaultValue={lid.jobTitle ?? ''}
              placeholder="Marketing manager"
            />

            {/* Een lijst met een vrij veld erbij: de afdelingen liggen vast,
                maar een nieuwe afdeling mag niet op een formulier stuklopen. */}
            <Field
              label="Afdeling"
              name="afdeling"
              defaultValue={lid.department ?? ''}
              hint={`Gebruikelijk: ${AFDELINGEN.join(', ')}.`}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefoon" name="telefoon" type="tel" defaultValue={lid.phone ?? ''} />
              <Field label="Mobiel" name="mobiel" type="tel" defaultValue={lid.mobile ?? ''} />
            </div>

            <Field
              label="LinkedIn"
              name="linkedin"
              type="url"
              defaultValue={lid.linkedinUrl ?? ''}
              placeholder="https://www.linkedin.com/in/..."
            />

            <div>
              <p className="mb-1 text-xs text-gray-600">
                Verjaardag<span className="text-gray-400"> (optioneel)</span>
              </p>
              <div className="grid grid-cols-[80px_1fr_100px] gap-2">
                <input
                  name="geboortedag"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Dag"
                  defaultValue={lid.birthDay ?? ''}
                  aria-label="Dag"
                  className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                />
                <select
                  name="geboortemaand"
                  defaultValue={lid.birthMonth ?? ''}
                  aria-label="Maand"
                  className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                >
                  <option value="">Maand</option>
                  {MAANDNAMEN.map((naam, i) => (
                    <option key={naam} value={i + 1}>
                      {naam}
                    </option>
                  ))}
                </select>
                <input
                  name="geboortejaar"
                  type="number"
                  min={1900}
                  max={2100}
                  placeholder="Jaar"
                  defaultValue={lid.birthYear ?? ''}
                  aria-label="Jaar"
                  className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Dag en maand horen bij elkaar; het jaar mag je weglaten. Dit komt terug in het
                attentieoverzicht.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="In dienst"
                name="indienst"
                type="date"
                defaultValue={lid.startedOn ? formatDateInput(lid.startedOn) : ''}
              />
              <Field
                label="Uit dienst"
                name="uitdienst"
                type="date"
                defaultValue={lid.endedOn ? formatDateInput(lid.endedOn) : ''}
                hint="Alleen invullen als iemand vertrokken is."
              />
            </div>

            <Field
              label="Contracturen per week"
              name="contracturen"
              defaultValue={
                lid.contractHoursPerWeekQuarters === null
                  ? ''
                  : String(lid.contractHoursPerWeekQuarters / 100).replace('.', ',')
              }
              placeholder="32"
              hint="Halve uren mogen: 36,5."
            />

            <TextArea
              label="Notities"
              name="notities"
              defaultValue={lid.notes ?? ''}
              placeholder="Afspraken, aandachtspunten, wat dan ook."
            />
          </ActionForm>
        </section>

        {/* ---------------------------------------------------------------
            Wat draagt hij
            --------------------------------------------------------------- */}
        <div className="space-y-6">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">In één oogopslag</h2>

            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-xs text-gray-600">Portfolio per maand</dt>
                <dd className="tabular text-jr-blue text-xl font-bold leading-tight">
                  {formatCents(portfolioCents)}
                </dd>
              </div>
              {doelCents !== null && (
                <div>
                  <dt className="text-xs text-gray-600">Maanddoel</dt>
                  <dd className="tabular text-xl font-bold leading-tight">
                    {formatCents(doelCents)}
                    {bezetting !== null && (
                      <span
                        className={`ml-1 text-xs font-normal ${
                          bezetting > 100 ? 'text-jr-red' : 'text-gray-500'
                        }`}
                      >
                        {bezetting}%
                      </span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-600">Klanten</dt>
                <dd className="tabular text-xl font-bold leading-tight">{klanten.length}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">Geleverde omzet</dt>
                <dd className="tabular text-xl font-bold leading-tight">
                  {formatCents(eigen?.revenueCents ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">Contract</dt>
                <dd className="text-xl font-bold leading-tight">{uren ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-600">In dienst</dt>
                <dd className="text-xl font-bold leading-tight">
                  {lid.startedOn ? formatDate(lid.startedOn) : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl bg-white shadow-sm">
            <div className="flex items-baseline justify-between border-b border-gray-200 px-5 py-3">
              <h2 className="text-base">Klanten</h2>
              <p className="text-xs text-gray-500">
                Alleen waar hij eerste aanspreekpartner is telt mee in het portfolio.
              </p>
            </div>

            {klanten.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-600">
                Nog geen klanten. Wijs ze toe op het{' '}
                <a href="/beheer/portfolio" className="text-jr-blue">
                  portfoliobord
                </a>
                .
              </p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {klanten.map((k) => (
                  <li
                    key={k.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5"
                  >
                    <div className="min-w-0">
                      <a href={`/beheer/klanten/${k.slug}`} className="hover:text-jr-blue text-sm">
                        {k.naam}
                      </a>
                      <p className="text-xs text-gray-600">
                        {k.status}
                        {k.rol && ` · ${k.rol}`}
                      </p>
                    </div>
                    <span className="tabular text-sm">
                      {k.maandCents > 0 ? `${formatCents(k.maandCents)} p/m` : 'geen abonnement'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isBeheerder && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Uurkostprijs</h2>
              <p className="mb-3 text-xs text-gray-500">
                Wat een uur van deze collega ons kost. Alleen beheerders zien dit veld — het
                ligt te dicht tegen salaris aan om op een scherm te zetten dat het hele team
                openslaat.
              </p>
              <ActionForm
                action={bewerkUurkostprijs}
                submitLabel="Opslaan"
                resetOnSuccess={false}
              >
                <input type="hidden" name="userId" value={lid.id} />
                <Field
                  label="Kostprijs per uur"
                  name="kostprijs"
                  defaultValue={
                    lid.hourlyCostCents === null
                      ? ''
                      : (lid.hourlyCostCents / 100).toFixed(2).replace('.', ',')
                  }
                  placeholder="42,50"
                  hint="Leeg laten mag: dan rekenen we er nergens mee."
                />
              </ActionForm>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  )
}
