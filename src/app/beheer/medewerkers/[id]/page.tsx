import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getTeamlid, formatContractUren, AFDELINGEN } from '@/lib/team'
import { getFiguresByEmployee } from '@/lib/reports'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Check, Field, Select, TextArea } from '@/components/ActionForm'
import { bewerkMedewerkerprofiel, bewerkUurkostprijs } from '../../medewerker-actions'
import { formatEuro } from '@/lib/money'
import { formatDate, formatDateInput, MAANDNAMEN } from '@/lib/dates'
import { AANHEF_LABELS } from '@/lib/namen'
import {
  listContracten,
  listSalarissen,
  huidigSalaris,
  listDossier,
  listMiddelen,
  ketensignaal,
} from '@/lib/personeel'
import {
  Contracten,
  Salaris,
  Dossier,
  Bedrijfsmiddelen,
} from '@/components/Personeelsdossier'
import { Avatar } from '@/components/Avatar'
import { CollegaGegevens } from '@/components/CollegaGegevens'
import { Vervolgstappen } from '@/components/Vervolgstappen'
import { vervolgstappen } from '@/lib/aanname'
import { getGegevens, leesIban } from '@/lib/persoonsgegevens'
import { heeftSleutel } from '@/lib/versleuteling'
import { AfbeeldingKiezer } from '@/components/AfbeeldingKiezer'
import { heeftWachtwoord } from '@/lib/wachtwoord'
import {
  wijzigEigenWachtwoord,
  zetWachtwoordVoorCollega,
  haalWachtwoordWeg,
} from '../../wachtwoord-actions'

/**
 * Het profiel van één collega.
 *
 * Links wie hij is, rechts wat hij draagt. De uurkostprijs staat apart
 * onderaan en alleen voor beheerders: dat cijfer ligt tegen salaris aan.
 */
export default async function MedewerkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ welkom?: string }>
}) {
  const { welkom } = await searchParams
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const detail = await getTeamlid(id)
  if (!detail || detail.lid.organizationId !== null) notFound()

  const { lid, klanten, portfolioCents } = detail
  const isBeheerder = user.role === 'admin'

  const heeftEenWachtwoord = await heeftWachtwoord(lid.id)
  const isZelf = lid.id === user.id
  const cijfers = await getFiguresByEmployee()
  const eigen = cijfers.find((c) => c.userId === lid.id)

  /* Het personeelsdossier wordt alleen opgehaald als de kijker beheerder is.
     Niet ophalen en dan verbergen: wat je niet opvraagt kan ook niet per
     ongeluk ergens in de HTML belanden. */
  const dossierGegevens = isBeheerder
    ? await Promise.all([
        listContracten(lid.id),
        listSalarissen(lid.id),
        huidigSalaris(lid.id),
        listDossier(lid.id),
        listMiddelen(lid.id),
      ])
    : null

  /* Persoonsgegevens en de vervolgstappen van een nieuwe collega: alleen voor
     een beheerder. De stappen tonen we de eerste drie maanden na de start,
     of zolang er nog iets openstaat. */
  const persoonlijk = isBeheerder ? await getGegevens({ userId: lid.id }) : null
  let iban: string | null = null
  let ibanFout = false
  if (persoonlijk) {
    try {
      iban = leesIban(persoonlijk.record)
    } catch {
      ibanFout = true
    }
  }
  const stappen = isBeheerder ? await vervolgstappen({ userId: lid.id }) : []
  const nieuw = lid.startedOn !== null && lid.startedOn.getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
  const toonStappen = isBeheerder && (nieuw || welkom === '1') && stappen.some((st) => !st.klaar)

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
          <Avatar naam={lid.name ?? lid.email} imageId={lid.avatarImageId} maat={44} />
          <h1 className="text-[28px] sm:text-[32px]">{lid.name ?? lid.email}</h1>
          {lid.role === 'admin' && (
            <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-2 py-0.5 text-xs">
              Beheerder
            </span>
          )}
          {lid.isOwner && (
            <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-2 py-0.5 text-xs">
              Eigenaar
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

      {isBeheerder && welkom === '1' && (
        <div className="border-jr-green/30 bg-jr-green/10 mb-5 rounded-xl border p-4 text-sm text-[#1d7a36]">
          In dienst gezet. Account, contract, salaris en persoonsgegevens staan hieronder. Hij logt in via de inlogpagina met {lid.email}.
        </div>
      )}

      {toonStappen && (
        <div className="mb-6">
          <Vervolgstappen stappen={stappen} titel="Onboarding" eigenaar={{ userId: lid.id }} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------------
            Wie is dit
            --------------------------------------------------------------- */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Gegevens</h2>
          <p className="mb-4 text-xs text-gray-500">
            Het e-mailadres blijft {lid.email}. Daarmee logt hij in en daaraan hangen zijn
            boekingen; wijzig je dat, dan is het een andere persoon. Dat doe je op de teamlijst.
          </p>

          {!isBeheerder && !isZelf ? (
            <p className="text-sm text-gray-600">Dit profiel houdt {lid.firstName ?? lid.name ?? 'je collega'} zelf bij, samen met een beheerder.</p>
          ) : (
          <ActionForm
            action={bewerkMedewerkerprofiel}
            submitLabel="Opslaan"
            resetOnSuccess={false}
          >
            <input type="hidden" name="userId" value={lid.id} />

            <div className="grid items-end gap-3 sm:grid-cols-[1fr_120px_1fr]">
              <Field label="Voornaam" name="voornaam" defaultValue={lid.firstName ?? ''} />
              <Field
                label="Tussenvoegsel"
                name="tussenvoegsel"
                defaultValue={lid.infix ?? ''}
                placeholder="van der"
              />
              <Field label="Achternaam" name="achternaam" defaultValue={lid.lastName ?? ''} />
            </div>
            <Select
              label="Aanhef"
              name="aanhef"
              defaultValue={lid.aanhef ?? ''}
              options={[
                { value: '', label: 'Niet ingevuld' },
                { value: 'heer', label: AANHEF_LABELS.heer },
                { value: 'mevrouw', label: AANHEF_LABELS.mevrouw },
                { value: 'neutraal', label: AANHEF_LABELS.neutraal },
              ]}
            />
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
              <p className="text-jr-text mb-1.5 block text-[13px] font-medium">
                Verjaardag<span className="font-normal text-gray-500"> (optioneel)</span>
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
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
                />
                <select
                  name="geboortemaand"
                  defaultValue={lid.birthMonth ?? ''}
                  aria-label="Maand"
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
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
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Dag en maand horen bij elkaar; het jaar mag je weglaten. Dit komt terug in het
                attentieoverzicht.
              </p>
            </div>

            {/* In en uit dienst, uren en notities horen bij het dienstverband: die zet een beheerder. */}
            {isBeheerder && (
              <>
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

                <input type="hidden" name="eigenaarKeuze" value="1" />
                <Check
                  label="Eigenaar van James Robinson"
                  name="eigenaar"
                  defaultChecked={lid.isOwner}
                  hint="Eigenaren tekenen standaard elk contract namens de werkgever. Bij het opstellen kun je iemand uitvinken."
                />

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
              </>
            )}
          </ActionForm>
          )}

          <div className="mt-4 border-t border-gray-200 pt-4">
            <AfbeeldingKiezer
              soort="medewerker"
              doelId={lid.id}
              naam={lid.name ?? lid.email}
              imageId={lid.avatarImageId}
            />
          </div>
        </section>

        {/* ---------------------------------------------------------------
            Wat draagt hij
            --------------------------------------------------------------- */}
        <div className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base">In één oogopslag</h2>

            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-xs text-gray-600">Portfolio per maand</dt>
                <dd className="tabular text-jr-blue text-xl font-bold leading-tight">
                  {formatEuro(portfolioCents)}
                </dd>
              </div>
              {doelCents !== null && (
                <div>
                  <dt className="text-xs text-gray-600">Maanddoel</dt>
                  <dd className="tabular text-xl font-bold leading-tight">
                    {formatEuro(doelCents)}
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
                  {formatEuro(eigen?.revenueCents ?? 0)}
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
                      {k.maandCents > 0 ? `${formatEuro(k.maandCents)} per maand` : 'geen abonnement'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(isZelf || isBeheerder) && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base">Inloggen</h2>
              <p className="mb-3 text-xs text-gray-500">
                {heeftEenWachtwoord
                  ? 'Deze collega logt in met een wachtwoord. Een inloglink blijft ook werken.'
                  : 'Deze collega logt in met een inloglink. Een wachtwoord instellen kan hieronder.'}
              </p>

              {isZelf ? (
                <ActionForm
                  action={wijzigEigenWachtwoord}
                  submitLabel={heeftEenWachtwoord ? 'Wachtwoord wijzigen' : 'Wachtwoord instellen'}
                >
                  <input type="hidden" name="heeftAl" value={heeftEenWachtwoord ? 'ja' : 'nee'} />
                  {heeftEenWachtwoord && (
                    <Field label="Huidig wachtwoord" name="huidig" type="password" required />
                  )}
                  <Field
                    label="Nieuw wachtwoord"
                    name="nieuw"
                    type="password"
                    required
                    hint="Minstens 12 tekens. Een zin van vier woorden werkt prima en onthoud je makkelijker dan Welkom2024!"
                  />
                  <Field label="Nog een keer" name="herhaal" type="password" required />
                </ActionForm>
              ) : (
                <ActionForm
                  action={zetWachtwoordVoorCollega}
                  submitLabel="Wachtwoord instellen"
                >
                  <input type="hidden" name="userId" value={lid.id} />
                  <Field
                    label="Nieuw wachtwoord"
                    name="nieuw"
                    type="password"
                    required
                    hint="Spreek het persoonlijk af en laat hem het daarna zelf wijzigen."
                  />
                </ActionForm>
              )}

              {heeftEenWachtwoord && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <ActionForm
                    action={haalWachtwoordWeg}
                    submitLabel="Wachtwoord weghalen"
                    submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                    resetOnSuccess={false}
                    className=""
                  >
                    <input type="hidden" name="userId" value={lid.id} />
                  </ActionForm>
                </div>
              )}
            </section>
          )}

          {isBeheerder && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
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

      {dossierGegevens && (
        <div className="mt-6 space-y-6">
          <Contracten
            userId={lid.id}
            contracten={dossierGegevens[0]}
            signaal={ketensignaal(dossierGegevens[0])}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <Salaris
              userId={lid.id}
              regels={dossierGegevens[1]}
              huidig={dossierGegevens[2]}
            />
            <Bedrijfsmiddelen userId={lid.id} middelen={dossierGegevens[4]} />
          </div>

          <CollegaGegevens userId={lid.id} gegevens={persoonlijk} iban={iban} ibanFout={ibanFout} sleutel={heeftSleutel()} />

          <Dossier userId={lid.id} regels={dossierGegevens[3]} />
        </div>
      )}

      {!isBeheerder && (
        <p className="mt-6 text-xs text-gray-500">
          Contracten, salaris en het personeelsdossier zijn alleen zichtbaar voor
          beheerders.
        </p>
      )}
    </AppShell>
  )
}
