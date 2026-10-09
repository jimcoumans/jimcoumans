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
  listMogelijkeOndertekenaars,
} from '@/lib/contracten'
import { getHuis, schaalNamen } from '@/lib/salarishuis'
import { contractAangezegd } from '../contract-actions'
import { ContractFormulier, LEGE_START } from '@/components/ContractFormulier'
import { getBedrijf, adresRegel } from '@/lib/bedrijf'
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
  const bedrijf = await getBedrijf()
  const tekenaars = await listMogelijkeOndertekenaars()

  const recent = await db
    .select()
    .from(generatedContracts)
    .orderBy(desc(generatedContracts.createdAt))
    .limit(25)

  return (
    <AppShell user={user} actief="medewerkers" breed>
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-[28px] sm:text-[32px]">Contracten</h1>
          <Paneel knop="+ Contract opstellen" titel="Contract opstellen" breed>
          <ContractFormulier
            start={LEGE_START}
            voor="kiezen"
            profielen={profielen}
            schalen={huis ? schaalNamen(huis) : []}
            tekenaars={tekenaars}
            vestigingen={bedrijf?.vestigingen ?? []}
            kandidaten={kandidaten.map((k) => ({ value: k.id, label: k.name }))}
            collegas={team.map((t) => ({ value: t.id, label: t.name ?? t.email }))}
          />
          </Paneel>
        </div>
        <p className="text-sm text-gray-600">
          Vul de gegevens in, dan rolt het contract eruit. Het salaris komt uit het
          salarishuis.
        </p>
      </div>

      <section className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="text-sm">
          <h2 className="mb-1 text-base">Werkgever</h2>
          {bedrijf?.hoofdvestiging ? (
            <p className="text-gray-600">
              {bedrijf.werkgever.legalName}, {adresRegel(bedrijf.hoofdvestiging)}
              {bedrijf.werkgever.kvkNumber ? ` · KvK ${bedrijf.werkgever.kvkNumber}` : ''}. Standplaatsen:{' '}
              {bedrijf.vestigingen.map((v) => v.name).join(', ')}.
            </p>
          ) : (
            <p className="text-jr-orange">De bedrijfsgegevens of de hoofdvestiging ontbreken. Zonder die gegevens kan er geen contract worden opgesteld.</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Naam, logo, vestigingen en het personeelshandboek beheer je op een plek. Een opgesteld contract houdt de gegevens van dat moment.</p>
        </div>
        <a href="/beheer/bedrijf" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Bedrijfsgegevens
        </a>
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
