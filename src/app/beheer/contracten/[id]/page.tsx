import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { contractGetekend } from '../../aanname-actions'
import { getContract, getWerkgever, ketenVoor, ondertekenaarsVan, namenZin } from '@/lib/contracten'
import { listTeam } from '@/lib/team'
import { contractDefinitief, contractAangezegd } from '../../contract-actions'
import { formatDate, formatDateInput, formatDateLong } from '@/lib/dates'
import { formatCents } from '@/lib/money'

export const maxDuration = 26

/**
 * Eén contract, zoals het eruit komt.
 *
 * De tekst komt uit het contract zelf en wordt niet opnieuw opgebouwd uit
 * het sjabloon. Een arbeidsovereenkomst is een afspraak tussen twee
 * partijen; die verandert niet omdat iemand later een zin in een sjabloon
 * heeft bijgewerkt.
 *
 * De pdf om te versturen en te laten tekenen komt van /api/contracten/[id]/pdf.
 * De pagina drukt daarnaast netjes af, voor wie liever het afdrukvenster
 * gebruikt.
 */
export default async function ContractPagina({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/beheer')

  const { id } = await params
  const contract = await getContract(id)
  if (!contract) notFound()

  const werkgever = await getWerkgever()
  const tekenaars = ondertekenaarsVan(contract, werkgever)
  const team = contract.soort === 'proforma' && !contract.candidateId ? await listTeam() : []
  const keten =
    contract.userId && contract.contractType === 'bepaalde_tijd'
      ? await ketenVoor(contract.userId, contract.durationMonths)
      : null

  const artikelen = contract.body
    .split(/^## /m)
    .map((blok) => blok.trim())
    .filter((blok) => blok !== '')
    .map((blok) => {
      const [kop, ...rest] = blok.split('\n')
      return {
        kop: kop ?? '',
        leden: rest
          .join('\n')
          .split(/\n\s*\n/)
          .map((l) => l.trim())
          .filter((l) => l !== ''),
      }
    })

  return (
    <AppShell user={user} actief="contracten">
      <div className="print:hidden">
        <a
          href="/beheer/contracten"
          className="hover:text-jr-blue mb-3 block text-xs text-gray-500"
        >
          &larr; Contracten
        </a>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="text-[28px] sm:text-[32px]">{contract.employeeName}</h1>
            <p className="text-sm text-gray-600">
              {contract.jobTitle} &middot; {formatDate(contract.startedOn)}
              {contract.endsOn ? ` t/m ${formatDate(contract.endsOn)}` : ' (onbepaalde tijd)'}{' '}
              &middot; {contract.hoursWeekQuarters / 100} uur &middot;{' '}
              {formatCents(contract.grossMonthlyCents)} bruto
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs ${
              contract.soort === 'definitief'
                ? 'bg-jr-lightblue text-jr-deepblue'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {contract.soort === 'definitief' ? 'Definitief' : 'Concept'}
          </span>
        </div>

        {contract.remarks && (
          <div className="border-jr-orange/30 bg-jr-orange/5 mb-5 rounded-xl border p-4">
            <h2 className="text-jr-orange mb-1.5 text-sm font-bold">Let op bij dit contract</h2>
            <ul className="space-y-1 text-sm text-gray-700">
              {contract.remarks.split('\n').map((regel) => (
                <li key={regel}>{regel}</li>
              ))}
            </ul>
          </div>
        )}

        {keten?.uitleg && (
          <div
            className={`mb-5 rounded-xl border p-4 text-sm ${
              keten.wordtVast
                ? 'border-jr-orange/30 bg-jr-orange/5'
                : 'border-gray-200 bg-white'
            }`}
          >
            <strong>Ketenregeling:</strong> {keten.uitleg}
          </div>
        )}

        {contract.aanzeggenVoor && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <span>
              {contract.aangezegdOp ? (
                <>Aangezegd op {formatDate(contract.aangezegdOp)}.</>
              ) : (
                <>
                  <strong>Aanzeggen voor {formatDateLong(contract.aanzeggenVoor)}.</strong> Doe je
                  dat niet, dan ben je een maandsalaris verschuldigd.
                </>
              )}
            </span>
            {!contract.aangezegdOp && contract.soort === 'definitief' && (
              <ActionForm
                action={contractAangezegd}
                submitLabel="Aangezegd"
                submitClassName="bg-jr-btn hover:bg-jr-btnhover text-white"
              >
                <input type="hidden" name="contractId" value={contract.id} />
              </ActionForm>
            )}
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 text-sm shadow-sm">
          <a href={`/api/contracten/${contract.id}/pdf`} className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-4 py-2 text-sm font-medium text-white">
            Download pdf
          </a>
          {contract.soort === 'definitief' &&
            (contract.signedOn ? (
              <span className="bg-jr-green/15 rounded-full px-3 py-1 text-xs text-[#1d7a36]">Getekend op {formatDateLong(contract.signedOn)}</span>
            ) : (
              <span className="text-gray-600">Nog niet getekend.</span>
            ))}
          {contract.candidateId && !contract.userId && (
            <a href={`/beheer/werving/kandidaten/${contract.candidateId}`} className="text-jr-link hover:underline">
              {contract.soort === 'definitief' ? 'In dienst nemen gaat via de kandidaat' : 'Naar de kandidaat'} &rarr;
            </a>
          )}
          {contract.userId && (
            <a href={`/beheer/medewerkers/${contract.userId}`} className="text-jr-link hover:underline">
              Naar het dossier &rarr;
            </a>
          )}
        </div>

        {contract.soort === 'definitief' && !contract.signedOn && (
          <section className="mb-5 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Getekend vastleggen</h2>
            <p className="mb-3 text-xs text-gray-600">De datum waarop beide partijen getekend hebben, en het getekende exemplaar. Dat wordt versleuteld bewaard bij de persoonsgegevens.</p>
            <ActionForm action={contractGetekend} submitLabel="Vastleggen" className="grid items-end gap-3 sm:grid-cols-[1fr_1.6fr_auto]" knopInRij>
              <input type="hidden" name="contractId" value={contract.id} />
              <Field label="Getekend op" name="getekendOp" type="date" required defaultValue={formatDateInput(new Date())} />
              <div>
                <label className="text-jr-text mb-1.5 block text-[13px] font-medium" htmlFor="getekend-bestand">
                  Getekend exemplaar <span className="font-normal text-gray-500">(optioneel)</span>
                </label>
                <input id="getekend-bestand" type="file" name="bestand" accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm" />
              </div>
            </ActionForm>
          </section>
        )}

        {contract.soort === 'proforma' && !contract.candidateId && (
          <section className="mb-5 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Definitief maken</h2>
            <p className="mb-3 text-xs text-gray-600">
              Hiermee komt het contract in het personeelsdossier te staan: een regel in de
              contracthistorie en een regel in de salarishistorie. Niets wordt opnieuw
              ingetypt. Maak de collega eerst aan bij Team als hij er nog niet staat.
            </p>
            <ActionForm
              action={contractDefinitief}
              submitLabel="Definitief maken"
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="contractId" value={contract.id} />
              <Select
                label="Welke collega"
                name="collegaId"
                defaultValue=""
                options={[
                  { value: '', label: 'Kies een collega' },
                  ...team.map((t) => ({ value: t.id, label: t.name ?? t.email })),
                ]}
              />
            </ActionForm>
          </section>
        )}

        <p className="mb-5 text-xs text-gray-500">
          Afdrukken of als PDF opslaan doe je met het afdrukvenster van je browser. Alleen het
          contract hieronder komt op papier.
        </p>
      </div>

      {contract.summary && (
        <details className="mx-auto mb-5 max-w-[46rem] rounded-xl bg-white p-5 text-sm shadow-sm print:hidden">
          <summary className="cursor-pointer font-medium">Begeleidende tekst voor de mail</summary>
          <p className="mt-1 text-xs text-gray-500">Staat niet in het contract en niet in de pdf.</p>
          <p className="mt-3 whitespace-pre-wrap text-gray-700">{contract.summary}</p>
        </details>
      )}

      {/* Het document zelf. Wit, smal en zonder franje: dit gaat naar iemand
          die het moet ondertekenen. */}
      <article className="mx-auto max-w-[46rem] rounded-xl bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <h2 className="mb-6 text-center text-lg font-bold">
          {contract.soort === 'proforma' && '[PROFORMA] '}
          {contract.contractType === 'bepaalde_tijd'
            ? 'ARBEIDSOVEREENKOMST VOOR BEPAALDE TIJD'
            : 'ARBEIDSOVEREENKOMST VOOR ONBEPAALDE TIJD'}
        </h2>

        {werkgever && (
          <section className="mb-6 text-sm">
            <p className="mb-2">De ondergetekenden:</p>
            <p className="mb-3">
              1. Naam: {werkgever.legalName}
              <br />
              Gevestigd te: {werkgever.registeredCity} ({werkgever.registeredPostalCode})
              <br />
              Aan de: {werkgever.registeredAddress}
              <br />
              Hierbij rechtsgeldig vertegenwoordigd door {namenZin(tekenaars)}
              <br />
              Hierna te noemen: &ldquo;de werkgever&rdquo;;
            </p>
            <p className="mb-2">en</p>
            <p>
              2. Naam:{' '}
              {contract.employeeAanhef === 'heer'
                ? 'Dhr. '
                : contract.employeeAanhef === 'mevrouw'
                  ? 'Mevr. '
                  : ''}
              {contract.employeeName}
              {contract.employeeAddress && (
                <>
                  <br />
                  Adres: {contract.employeeAddress}
                </>
              )}
              {contract.employeePostalCode && (
                <>
                  <br />
                  Postcode: {contract.employeePostalCode}
                </>
              )}
              {contract.employeeCity && (
                <>
                  <br />
                  Woonplaats: {contract.employeeCity}
                </>
              )}
              {contract.employeeBirthDate && (
                <>
                  <br />
                  Geboren op: {formatDate(contract.employeeBirthDate)}
                </>
              )}
              <br />
              Hierna te noemen &ldquo;de werknemer&rdquo;;
            </p>
            <p className="mt-3">
              Verklaren een arbeidsovereenkomst te zijn aangegaan onder de navolgende
              bepalingen:
            </p>
          </section>
        )}

        <div className="space-y-5 text-sm">
          {artikelen.map((artikel, i) => (
            <section key={artikel.kop} className="break-inside-avoid">
              <h3 className="mb-1.5 font-bold">{artikel.kop}</h3>
              {artikel.leden.map((lid, j) => (
                <p key={j} className="mb-2 leading-relaxed">
                  <span className="tabular mr-1 text-gray-500">
                    {i + 1}.{j + 1}
                  </span>
                  {lid}
                </p>
              ))}
            </section>
          ))}
        </div>

        <section className="mt-10 text-sm">
          <p className="mb-6">Aldus overeengekomen, opgemaakt in tweevoud en ondertekend</p>
          <p className="mb-8">
            te: {werkgever?.registeredCity ?? ''}, dd. &nbsp;&hellip;&hellip;&hellip;&hellip;
          </p>
          <div className="grid gap-8 sm:grid-cols-2">
            {tekenaars.map((naam) => (
              <div key={naam}>
                <p className="mb-10 text-xs text-gray-500">Namens de werkgever</p>
                <p className="border-t border-gray-400 pt-1">{naam}</p>
              </div>
            ))}
            <div>
              <p className="mb-10 text-xs text-gray-500">De werknemer</p>
              <p className="border-t border-gray-400 pt-1">{contract.employeeName}</p>
            </div>
          </div>
        </section>
      </article>
    </AppShell>
  )
}
