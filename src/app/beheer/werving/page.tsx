import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select, TextArea, Check, Uitklap } from '@/components/ActionForm'
import { listTeam } from '@/lib/team'
import {
  listVacatures,
  getAchterstand,
  getCijfers,
  getAfvalredenen,
  VACATURE_SOORT_LABELS,
  VACATURE_STATUS_LABELS,
  KANDIDAAT_STATUS_LABELS,
  BRON_LABELS,
  STILTE_DAGEN,
  type KandidaatKaart,
} from '@/lib/werving'
import { getHuis, schaalNamen } from '@/lib/salarishuis'
import { nieuweVacature, nieuweKandidaat, kandidaatBeantwoord } from '../werving-actions'
import { formatDate } from '@/lib/dates'

/**
 * Netlify kapt een functie na tien seconden af. Deze pagina doet zes
 * queries; controleer dat met npm run tel:queries voordat je hier iets bij
 * zet.
 */
export const maxDuration = 26

/**
 * Werving.
 *
 * Bovenaan staat niet de trechter maar de stilte: wie wacht er al dagen op
 * een antwoord van ons. Dat is geen weergavekeuze. De meest gehoorde klacht
 * van sollicitanten is niet dat ze zijn afgewezen maar dat ze niets hoorden,
 * en voor een bureau dat zijn eigen marketing als visitekaartje ziet is dat
 * het duurste wat er is.
 *
 * Daaronder staat wat er gewist gaat worden. Die lijst hoort in beeld en
 * niet in een instelling: als je iemand wilt houden moet je dat weten
 * voordat de termijn om is, niet erna.
 */
export default async function WervingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const cijfers = await getCijfers()
  const vacatures = await listVacatures()
  const achterstand = await getAchterstand()
  const redenen = await getAfvalredenen()
  const team = await listTeam()
  const huis = await getHuis()

  const openVacatures = vacatures.filter(
    (v) => v.vacature.status === 'open' || v.vacature.status === 'gepauzeerd',
  )

  return (
    <AppShell user={user} actief="werving" breed>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-jr-blue text-2xl">Werving</h1>
          <p className="text-sm text-gray-600">
            Vacatures, stages en kandidaten. Wie wacht er op ons.
          </p>
        </div>

        <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
          <Cijfer label="Open vacatures" waarde={cijfers.openVacatures} />
          <Cijfer
            label="Plekken"
            waarde={cijfers.openPlekken}
            hint="Twee managers is één vacature"
          />
          <Cijfer label="In procedure" waarde={cijfers.lopendeKandidaten} />
          <Cijfer
            label="Wacht op antwoord"
            waarde={cijfers.wachtenOpAntwoord}
            oranje={cijfers.wachtenOpAntwoord > 0}
          />
          <div>
            <dt className="text-xs text-gray-600">Reactietijd</dt>
            <dd className="tabular text-xl font-bold leading-tight">
              {cijfers.gemiddeldeReactiedagen === null ? (
                <span className="text-gray-400">&mdash;</span>
              ) : (
                <>
                  {String(cijfers.gemiddeldeReactiedagen).replace('.', ',')}
                  <span className="text-xs font-normal text-gray-500"> dagen</span>
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* De stilte. Bovenaan, niet in een filter. */}
          {achterstand.wachtenOpAntwoord.length > 0 && (
            <section className="border-jr-orange/30 bg-jr-orange/5 rounded-xl border p-5">
              <h2 className="text-jr-orange mb-1 text-base">
                {achterstand.wachtenOpAntwoord.length}{' '}
                {achterstand.wachtenOpAntwoord.length === 1 ? 'kandidaat wacht' : 'kandidaten wachten'}{' '}
                op antwoord
              </h2>
              <p className="mb-3 text-xs text-gray-600">
                Langer dan {STILTE_DAGEN} dagen niets van ons gehoord. Dit is waar mensen
                over praten, niet de afwijzing zelf.
              </p>
              <ul className="space-y-2">
                {achterstand.wachtenOpAntwoord.map((k) => (
                  <li
                    key={k.kandidaat.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                  >
                    <span>
                      <a
                        href={k.vacatureId ? `/beheer/werving/${k.vacatureId}` : '/beheer/werving'}
                        className="hover:text-jr-blue font-medium"
                      >
                        {k.kandidaat.name}
                      </a>
                      <span className="ml-2 text-xs text-gray-500">
                        {k.vacatureTitel ?? 'Open sollicitatie'}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-jr-orange tabular text-xs">
                        {k.wachtDagen} dagen
                      </span>
                      <ActionForm
                        action={kandidaatBeantwoord}
                        submitLabel="Gereageerd"
                        submitClassName="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        className="contents"
                      >
                        <input type="hidden" name="kandidaatId" value={k.kandidaat.id} />
                      </ActionForm>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Zonder vervolgstap. */}
          {achterstand.zonderVervolg.length > 0 && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">
                {achterstand.zonderVervolg.length} zonder afgesproken vervolgstap
              </h2>
              <p className="mb-3 text-xs text-gray-600">
                Geen volgende stap afgesproken, of de datum is voorbij. Dit is hoe een
                kandidaat stilletjes wegzakt.
              </p>
              <ul className="divide-y divide-gray-100">
                {achterstand.zonderVervolg.map((k) => (
                  <Regel key={k.kandidaat.id} kaart={k} />
                ))}
              </ul>
            </section>
          )}

          {/* Wat er binnenkort gewist wordt. */}
          {achterstand.bijnaTeWissen.length > 0 && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Bewaartermijn loopt af</h2>
              <p className="mb-3 text-xs text-gray-600">
                Deze gegevens worden binnenkort automatisch gewist. Wil je iemand houden
                voor een volgende vacature, vraag dan toestemming en leg die vast op zijn
                kaart.
              </p>
              <ul className="divide-y divide-gray-100">
                {achterstand.bijnaTeWissen.map((k) => (
                  <li
                    key={k.kandidaat.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span>
                      {k.kandidaat.name}
                      <span className="ml-2 text-xs text-gray-500">
                        {KANDIDAAT_STATUS_LABELS[k.kandidaat.status]}
                        {k.kandidaat.closedReason && ` · ${k.kandidaat.closedReason}`}
                      </span>
                    </span>
                    <span
                      className={`tabular text-xs ${
                        (k.bewaarDagenResterend ?? 0) <= 0 ? 'text-jr-orange' : 'text-gray-500'
                      }`}
                    >
                      {(k.bewaarDagenResterend ?? 0) <= 0
                        ? 'wordt vannacht gewist'
                        : `nog ${k.bewaarDagenResterend} dagen`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* De vacatures. */}
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Vacatures</h2>
            {vacatures.length === 0 ? (
              <p className="text-sm text-gray-600">
                Nog geen vacatures. Maak er een aan; stages horen hier ook bij.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                      <th className="px-2 py-2 font-normal">Vacature</th>
                      <th className="px-2 py-2 font-normal">Van wie</th>
                      <th className="px-2 py-2 text-right font-normal">In procedure</th>
                      <th className="px-2 py-2 text-right font-normal">Wacht</th>
                      <th className="px-2 py-2 text-right font-normal">Bezet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vacatures.map((r) => (
                      <tr key={r.vacature.id}>
                        <td className="px-2 py-2.5">
                          <a
                            href={`/beheer/werving/${r.vacature.id}`}
                            className="hover:text-jr-blue font-medium"
                          >
                            {r.vacature.title}
                          </a>
                          <div className="mt-0.5 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                              {VACATURE_SOORT_LABELS[r.vacature.kind]}
                            </span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-xs ${
                                r.vacature.status === 'open'
                                  ? 'bg-jr-lightblue text-jr-deepblue'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {VACATURE_STATUS_LABELS[r.vacature.status]}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-gray-600">
                          {r.eigenaar ?? (
                            <span className="text-jr-orange text-xs">niemand</span>
                          )}
                        </td>
                        <td className="tabular px-2 py-2.5 text-right">{r.lopend}</td>
                        <td
                          className={`tabular px-2 py-2.5 text-right ${
                            r.wachten > 0 ? 'text-jr-orange font-bold' : 'text-gray-400'
                          }`}
                        >
                          {r.wachten}
                        </td>
                        <td className="tabular px-2 py-2.5 text-right text-gray-600">
                          {r.aangenomen} / {r.vacature.positions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Waarom het niet doorgaat. */}
          {(redenen.afgewezen.length > 0 || redenen.afgehaakt.length > 0) && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Waarom het niet doorgaat</h2>
              <p className="mb-3 text-xs text-gray-600">
                Apart geteld, want het zijn twee verschillende problemen: wie wij afwijzen
                zegt iets over onze selectie, wie zelf afhaakt zegt iets over ons aanbod.
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                <Redenen titel="Wij wezen af" regels={redenen.afgewezen} />
                <Redenen titel="Zij haakten af" regels={redenen.afgehaakt} />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Kandidaat toevoegen</h2>
            <p className="mb-3 text-xs text-gray-500">
              Voor iemand die je zelf benadert of op het oog hebt. Sollicitaties via de
              website komen straks vanzelf binnen.
            </p>
            <ActionForm action={nieuweKandidaat} submitLabel="Kandidaat toevoegen">
              <Field label="Voornaam" name="voornaam" required placeholder="Maarten" />
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <Field label="Tussenv." name="tussenvoegsel" placeholder="van der" />
                <Field label="Achternaam" name="achternaam" placeholder="Brouwer" />
              </div>
              <Select
                label="Voor welke vacature"
                name="vacatureId"
                defaultValue=""
                options={[
                  { value: '', label: 'Open sollicitatie' },
                  ...openVacatures.map((v) => ({
                    value: v.vacature.id,
                    label: v.vacature.title,
                  })),
                ]}
              />
              <Select
                label="Waar komt hij vandaan"
                name="bron"
                defaultValue="zelf_benaderd"
                options={Object.entries(BRON_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field label="E-mail" name="email" type="email" placeholder="naam@voorbeeld.nl" />

              <Uitklap label="Meer velden">
                <div className="space-y-3 pt-1">
                  <Field label="Telefoon" name="telefoon" />
                  <Field label="LinkedIn" name="linkedin" placeholder="https://..." />
                  <Select
                    label="Aangebracht door"
                    name="doorverwezenDoor"
                    defaultValue=""
                    options={[
                      { value: '', label: 'Niemand in het bijzonder' },
                      ...team.map((t) => ({ value: t.id, label: t.name ?? t.email })),
                    ]}
                    hint="Bij een stage: wie bij ons de begeleider wordt of wie hem aanbracht."
                  />
                  <Field label="School" name="school" placeholder="Zuyd Hogeschool" />
                  <Field label="Opleiding" name="opleiding" placeholder="Commerciële Economie" />
                  <Field
                    label="Sollicitatiedatum"
                    name="sollicitatiedatum"
                    type="date"
                    hint="Leeg laten is vandaag. Hiermee wordt gemeten hoe lang iemand wacht."
                  />
                  <TextArea
                    label="Notities"
                    name="notities"
                    rows={3}
                    hint="Let op: deze gegevens worden vier weken na afloop van de procedure automatisch gewist."
                  />
                </div>
              </Uitklap>

              <div className="border-t border-gray-200 pt-3">
                <p className="mb-2 text-xs font-bold text-gray-600">Volgende stap</p>
                <Field label="Wat ga je doen" name="actie" placeholder="Bellen voor een afspraak" />
                <Field label="Wanneer" name="actiedatum" type="date" />
              </div>
            </ActionForm>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Vacature aanmaken</h2>
            <ActionForm action={nieuweVacature} submitLabel="Vacature aanmaken">
              <Field label="Titel" name="titel" required placeholder="Marketing Manager" />
              <Select
                label="Soort"
                name="soort"
                defaultValue="dienstverband"
                options={[
                  { value: 'dienstverband', label: 'Dienstverband' },
                  { value: 'stage', label: 'Stage' },
                  { value: 'freelance', label: 'Freelance' },
                ]}
              />
              <Field
                label="Aantal plekken"
                name="plekken"
                defaultValue="1"
                hint="Twee marketing managers zoeken is één vacature met twee plekken."
              />
              <Select
                label="Van wie is deze vacature"
                name="eigenaar"
                defaultValue=""
                options={[
                  { value: '', label: 'Nog niet toegewezen' },
                  ...team.map((t) => ({ value: t.id, label: t.name ?? t.email })),
                ]}
                hint="Zonder eigenaar blijft een vacature liggen."
              />

              <Uitklap label="Wat we bieden">
                <div className="space-y-3 pt-1">
                  {huis ? (
                    <Select
                      label="Schaal"
                      name="schaal"
                      defaultValue=""
                      options={[
                        { value: '', label: 'Nog niet bepaald' },
                        ...schaalNamen(huis).map((n) => ({ value: n, label: n })),
                      ]}
                    />
                  ) : (
                    <Field label="Schaal" name="schaal" placeholder="Medior" />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Trede van" name="tredeMin" placeholder="8" />
                    <Field label="tot" name="tredeMax" placeholder="14" />
                  </div>
                  <Field label="Uren per week" name="uren" placeholder="32" />
                </div>
              </Uitklap>

              <Uitklap label="Waarom en wat">
                <div className="space-y-3 pt-1">
                  <TextArea
                    label="Waarom deze vacature"
                    name="reden"
                    rows={2}
                    hint="Een capaciteitsgat of groei. Over een half jaar weet je anders niet meer waarom je zocht."
                  />
                  <TextArea label="Omschrijving" name="omschrijving" rows={4} />
                </div>
              </Uitklap>

              <Check
                label="Meteen openzetten"
                name="meteenOpen"
                hint="Anders blijft hij een concept tot je hem openzet."
              />
            </ActionForm>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

function Cijfer({
  label,
  waarde,
  hint,
  oranje = false,
}: {
  label: string
  waarde: number
  hint?: string
  oranje?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd
        className={`tabular text-xl font-bold leading-tight ${
          oranje ? 'text-jr-orange' : 'text-jr-blue'
        }`}
      >
        {waarde}
      </dd>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function Regel({ kaart }: { kaart: KandidaatKaart }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <span>
        <a
          href={kaart.vacatureId ? `/beheer/werving/${kaart.vacatureId}` : '/beheer/werving'}
          className="hover:text-jr-blue font-medium"
        >
          {kaart.kandidaat.name}
        </a>
        <span className="ml-2 text-xs text-gray-500">
          {kaart.vacatureTitel ?? 'Open sollicitatie'} ·{' '}
          {KANDIDAAT_STATUS_LABELS[kaart.kandidaat.status]}
        </span>
      </span>
      <span className="text-xs text-gray-500">
        {kaart.kandidaat.nextActionOn
          ? `${kaart.kandidaat.nextAction} — stond op ${formatDate(kaart.kandidaat.nextActionOn)}`
          : 'geen vervolgstap'}
      </span>
    </li>
  )
}

function Redenen({ titel, regels }: { titel: string; regels: { reden: string; aantal: number }[] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold text-gray-600">{titel}</h3>
      {regels.length === 0 ? (
        <p className="text-xs text-gray-500">Nog niks vastgelegd.</p>
      ) : (
        <ul className="space-y-1">
          {regels.map((r) => (
            <li key={r.reden} className="flex justify-between gap-3 text-sm">
              <span className="text-gray-700">{r.reden}</span>
              <span className="tabular text-gray-500">{r.aantal}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
