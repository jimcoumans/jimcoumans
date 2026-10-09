import { redirect } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { getSessionUser } from '@/lib/auth'
import { db } from '@/db'
import { generatedContracts } from '@/db/schema'
import { AppShell } from '@/components/AppShell'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Field, Select, Check, Uitklap } from '@/components/ActionForm'
import { listTeam } from '@/lib/team'
import {
  listFunctieprofielen,
  listKandidatenMetAanbod,
  komendeAanzeggingen,
  getWerkgever,
  listMogelijkeOndertekenaars,
} from '@/lib/contracten'
import { getHuis, schaalNamen } from '@/lib/salarishuis'
import { nieuwContract, contractAangezegd, werkgeverOpslaan } from '../contract-actions'
import { formatDate } from '@/lib/dates'
import { formatCents } from '@/lib/money'

export const maxDuration = 26

/**
 * Contracten.
 *
 * Alleen voor beheerders: hier staan salarissen, adressen en
 * geboortedatums.
 *
 * Bovenaan staat de aanzegbewaking, en dat is geen opsmuk. Bij een tijdelijk
 * contract van zes maanden of langer moet je uiterlijk een maand voor het
 * einde schriftelijk laten weten of je verlengt; vergeet je dat, dan ben je
 * een maandsalaris verschuldigd. Eén vergeten aanzegging kost meer dan deze
 * hele module.
 */
export default async function ContractenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/beheer')

  const aanzeggingen = await komendeAanzeggingen()
  const profielen = await listFunctieprofielen()
  const kandidaten = await listKandidatenMetAanbod()
  const team = await listTeam()
  const huis = await getHuis()
  const werkgever = await getWerkgever()
  const tekenaars = await listMogelijkeOndertekenaars()

  const recent = await db
    .select()
    .from(generatedContracts)
    .orderBy(desc(generatedContracts.createdAt))
    .limit(25)

  return (
    <AppShell user={user} actief="contracten" breed>
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-[28px] sm:text-[32px]">Contracten</h1>
          <Paneel
            knop="+ Contract opstellen"
            titel="Contract opstellen"
          >
          <ActionForm action={nieuwContract} submitLabel="Contract opstellen">
            <Select
              label="Voor wie"
              name="kandidaatId"
              defaultValue=""
              options={[
                { value: '', label: 'Een collega (hieronder)' },
                ...kandidaten.map((k) => ({ value: k.id, label: `${k.name} (kandidaat)` })),
              ]}
              hint="Kandidaten met een aanbod of een aanname staan hier."
            />
            <Select
              label="Of een collega"
              name="collegaId"
              defaultValue=""
              options={[
                { value: '', label: 'Geen' },
                ...team.map((t) => ({ value: t.id, label: t.name ?? t.email })),
              ]}
              hint="Voor een verlenging of een nieuw contract van iemand die er al werkt."
            />

            <Field label="Voornamen (paspoort)" name="officieleVoornamen" required placeholder="Daniël Matthijs" />
            <Field label="Tussenvoegsel" name="tussenvoegsel" />
            <Field label="Achternaam" name="achternaam" required placeholder="Voncken" />
            <Select
              label="Aanhef"
              name="aanhef"
              defaultValue="neutraal"
              options={[
                { value: 'neutraal', label: 'Geen aanhef' },
                { value: 'heer', label: 'Dhr.' },
                { value: 'mevrouw', label: 'Mevr.' },
              ]}
            />
            <fieldset className="rounded-lg border border-gray-200 p-3">
              <legend className="text-jr-text px-1 text-[13px] font-medium">Wie tekent namens James Robinson</legend>
              <input type="hidden" name="ondertekenaarsKeuze" value="1" />
              <div className="grid gap-1.5">
                {tekenaars.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="ondertekenaar" value={t.naam} defaultChecked={t.eigenaar} />
                    {t.naam}
                    {t.eigenaar && <span className="text-xs text-gray-500">eigenaar</span>}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">De werknemer tekent altijd mee. Iedereen parafeert elke pagina.</p>
            </fieldset>

            <Select
              label="Functieprofiel"
              name="functieprofiel"
              defaultValue=""
              options={[
                { value: '', label: 'Geen profiel' },
                ...profielen.map((p) => ({ value: p.id, label: p.title })),
              ]}
              hint="Bepaalt of er een relatiebeding in komt, en met welke motivering."
            />
            <Field label="Functie" name="functie" placeholder="Marketing Manager" hint="Leeg laten neemt de naam van het profiel over." />

            <Select
              label="Soort contract"
              name="soort"
              defaultValue="bepaalde_tijd"
              options={[
                { value: 'bepaalde_tijd', label: 'Bepaalde tijd' },
                { value: 'onbepaalde_tijd', label: 'Onbepaalde tijd' },
              ]}
            />
            <Field label="Ingangsdatum" name="ingangsdatum" type="date" required />
            <Field
              label="Looptijd in maanden"
              name="looptijd"
              placeholder="7"
              hint="Alleen bij bepaalde tijd. De einddatum wordt hieruit berekend."
            />
            <Field
              label="Proeftijd in maanden"
              name="proeftijd"
              defaultValue="0"
              hint="Wordt teruggebracht tot wat mag: bij zes maanden of korter is een proeftijd niet toegestaan."
            />
            <Field label="Uren per week" name="uren" required placeholder="32" />

            {huis ? (
              <>
                <Select
                  label="Schaal"
                  name="schaal"
                  defaultValue=""
                  options={[
                    { value: '', label: 'Buiten schaal' },
                    ...schaalNamen(huis).map((n) => ({ value: n, label: n })),
                  ]}
                />
                <Field label="Trede" name="trede" placeholder="12" />
              </>
            ) : (
              <p className="text-jr-orange text-xs">
                Er is nog geen salarishuis. Vul hieronder zelf een bedrag in.
              </p>
            )}

            <Uitklap label="Meer velden" inline>
              <div className="space-y-3 pt-1">
                <Field
                  label="Bruto per maand"
                  name="bedrag"
                  placeholder="2095,59"
                  hint="Alleen nodig als je buiten de schaal werkt."
                />
                <Field label="Adres" name="adres" placeholder="Sint Hubertusstraat 9" />
                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <Field label="Postcode" name="postcode" placeholder="6181 EZ" />
                  <Field label="Woonplaats" name="woonplaats" placeholder="Elsloo" />
                </div>
                <Field label="Geboortedatum" name="geboortedatum" type="date" />
                <Check
                  label="Vrijetijdsbudget van € 100 per jaar"
                  name="vrijetijdsbudget"
                  hint="Voegt het artikel over het budget voor vrijetijdsbesteding bij klanten toe."
                />
              </div>
            </Uitklap>
          </ActionForm>
          </Paneel>
        </div>
        <p className="text-sm text-gray-600">
          Vul de gegevens in, dan rolt het contract eruit. Het salaris komt uit het
          salarishuis.
        </p>
      </div>

      {!werkgever && (
        <div className="border-jr-orange/30 bg-jr-orange/5 mb-5 rounded-xl border p-4 text-sm">
          De gegevens van de werkgever ontbreken. Zonder die gegevens kan er geen contract
          worden opgesteld.
        </div>
      )}

      <section className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="text-sm">
          <h2 className="mb-1 text-base">Werkgever</h2>
          {werkgever ? (
            <p className="text-gray-600">
              {werkgever.legalName}, gevestigd {werkgever.registeredAddress}, {werkgever.registeredPostalCode} {werkgever.registeredCity}
              {werkgever.kvkNumber ? ` · KvK ${werkgever.kvkNumber}` : ''}. Werkplek {werkgever.workAddress}, {werkgever.workPostalCode} {werkgever.workCity}.
            </p>
          ) : (
            <p className="text-gray-600">Nog niet ingevuld.</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Staat in de kop van elk nieuw contract. Bestaande contracten houden hun eigen tekst.</p>
        </div>
        <Paneel knop="Bewerken" stijl="rustig" titel="Werkgevergegevens" uitleg="De vestiging is wat in de KvK staat; de werkplek is waar het werk gedaan wordt. Die mogen verschillen.">
          <ActionForm action={werkgeverOpslaan} submitLabel="Opslaan" resetOnSuccess={false}>
            <Field label="Naam" name="naam" required defaultValue={werkgever?.legalName ?? 'James Robinson B.V.'} />
            <Field label="KvK-nummer" name="kvk" defaultValue={werkgever?.kvkNumber ?? ''} />
            <Field label="Vestiging (KvK): adres" name="adres" required defaultValue={werkgever?.registeredAddress ?? ''} />
            <Field label="Vestiging: postcode" name="postcode" required defaultValue={werkgever?.registeredPostalCode ?? ''} />
            <Field label="Vestiging: plaats" name="plaats" required defaultValue={werkgever?.registeredCity ?? ''} />
            <Field label="Werkplek: adres" name="werkAdres" required defaultValue={werkgever?.workAddress ?? ''} />
            <Field label="Werkplek: postcode" name="werkPostcode" required defaultValue={werkgever?.workPostalCode ?? ''} />
            <Field label="Werkplek: plaats" name="werkPlaats" required defaultValue={werkgever?.workCity ?? ''} />
            <Field
              label="Wie tekent als er niets gekozen is"
              name="ondertekenaars"
              required
              defaultValue={werkgever?.signatories ?? ''}
              hint="Bij een nieuw contract kies je de ondertekenaars zelf; eigenaren staan standaard aan."
            />
          </ActionForm>
        </Paneel>
      </section>

      {aanzeggingen.length > 0 && (
        <section className="border-jr-orange/30 bg-jr-orange/5 mb-5 rounded-xl border p-5">
          <h2 className="text-jr-orange mb-1 text-base">
            {aanzeggingen.length}{' '}
            {aanzeggingen.length === 1 ? 'contract moet' : 'contracten moeten'} aangezegd worden
          </h2>
          <p className="mb-3 text-xs text-gray-600">
            Bij een tijdelijk contract van zes maanden of langer moet je uiterlijk een maand
            voor het einde schriftelijk laten weten of je verlengt. Vergeet je dat, dan ben je
            een maandsalaris verschuldigd.
          </p>
          <ul className="space-y-2">
            {aanzeggingen.map((a) => (
              <li
                key={a.contract.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
              >
                <span>
                  <a
                    href={`/beheer/contracten/${a.contract.id}`}
                    className="hover:text-jr-blue font-medium"
                  >
                    {a.naam}
                  </a>
                  <span className="ml-2 text-xs text-gray-500">
                    loopt af op{' '}
                    {a.contract.endsOn ? formatDate(a.contract.endsOn) : 'onbekend'}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={`tabular text-xs ${
                      a.dagenTeGaan < 0 ? 'text-jr-orange font-bold' : 'text-gray-600'
                    }`}
                  >
                    {a.dagenTeGaan < 0
                      ? `${Math.abs(a.dagenTeGaan)} dagen te laat`
                      : `aanzeggen voor ${formatDate(a.contract.aanzeggenVoor!)}`}
                  </span>
                  <ActionForm
                    action={contractAangezegd}
                    submitLabel="Aangezegd"
                    submitClassName="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    className="contents"
                  >
                    <input type="hidden" name="contractId" value={a.contract.id} />
                  </ActionForm>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base">Opgestelde contracten</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-600">
              Nog geen contracten opgesteld. Begin met “+ Contract opstellen” rechtsboven.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                    <th className="px-2 py-2 font-normal">Naam</th>
                    <th className="px-2 py-2 font-normal">Functie</th>
                    <th className="px-2 py-2 font-normal">Periode</th>
                    <th className="px-2 py-2 text-right font-normal">Bruto</th>
                    <th className="px-2 py-2 font-normal">Soort</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent.map((c) => (
                    <tr key={c.id}>
                      <td className="px-2 py-2.5">
                        <a
                          href={`/beheer/contracten/${c.id}`}
                          className="hover:text-jr-blue font-medium"
                        >
                          {c.employeeName}
                        </a>
                      </td>
                      <td className="px-2 py-2.5 text-gray-600">{c.jobTitle}</td>
                      <td className="px-2 py-2.5 text-xs text-gray-600">
                        {formatDate(c.startedOn)}
                        {c.endsOn ? ` t/m ${formatDate(c.endsOn)}` : ' (onbepaald)'}
                      </td>
                      <td className="tabular px-2 py-2.5 text-right">
                        {formatCents(c.grossMonthlyCents)}
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-xs ${
                            c.soort === 'definitief'
                              ? 'bg-jr-lightblue text-jr-deepblue'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {c.soort === 'definitief' ? 'Definitief' : 'Concept'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </AppShell>
  )
}
