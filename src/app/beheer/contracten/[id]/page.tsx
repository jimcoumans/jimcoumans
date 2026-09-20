import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Select } from '@/components/ActionForm'
import { getContract, getWerkgever, ketenVoor } from '@/lib/contracten'
import { listTeam } from '@/lib/team'
import { contractDefinitief, contractAangezegd } from '../../contract-actions'
import { formatDate, formatDateLong } from '@/lib/dates'
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
 * Er is geen knop "download als PDF". De pagina is zo opgemaakt dat hij
 * netjes afdrukt, en in elke browser zit "opslaan als PDF" in het
 * afdrukvenster. Een eigen PDF-generator zou een zwaar onderdeel toevoegen
 * aan een omgeving die al traag is, voor iets wat de browser al kan.
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
  const team = contract.soort === 'proforma' ? await listTeam() : []
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
            <h1 className="text-jr-blue text-2xl">{contract.employeeName}</h1>
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

        {contract.soort === 'proforma' && (
          <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
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

      {/* Het document zelf. Wit, smal en zonder franje: dit gaat naar iemand
          die het moet ondertekenen. */}
      <article className="mx-auto max-w-[46rem] rounded-xl bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        {contract.summary && (
          <section className="mb-8 border-b border-gray-200 pb-6 text-sm whitespace-pre-wrap">
            {contract.summary}
          </section>
        )}

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
              Hierbij rechtsgeldig vertegenwoordigd door {werkgever.signatories}
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
          <div className="flex justify-between gap-8">
            <div>
              <p className="mb-10">de werkgever</p>
              <p className="border-t border-gray-400 pt-1">{werkgever?.signatories}</p>
            </div>
            <div>
              <p className="mb-10">de werknemer</p>
              <p className="border-t border-gray-400 pt-1">{contract.employeeName}</p>
            </div>
          </div>
        </section>
      </article>
    </AppShell>
  )
}
