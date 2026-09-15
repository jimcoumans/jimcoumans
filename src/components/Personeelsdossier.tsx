import { ActionForm, Field, Select, TextArea, Uitklap } from './ActionForm'
import {
  nieuwContract,
  wisContract,
  nieuwSalaris,
  wisSalaris,
  nieuweDossierRegel,
  wisDossierRegel,
  nieuwMiddel,
  leverIn,
  wisMiddel,
} from '@/app/beheer/personeel-actions'
import {
  CONTRACT_LABELS,
  DOSSIER_LABELS,
  DOSSIER_STIJLEN,
  ASSET_LABELS,
  jaarloonCents,
  type Ketensignaal,
  type DossierRegel,
} from '@/lib/personeel-labels'
import { formatContractUren } from '@/lib/team'
import { formatCents } from '@/lib/money'
import { formatDate, formatDateInput } from '@/lib/dates'
import type { EmploymentContract, SalaryRecord, CompanyAsset } from '@/db/schema'

/* -------------------------------------------------------------------------
   Het personeelsdossier op het profiel van een collega.

   Alleen zichtbaar voor beheerders. Dat wordt op de pagina beslist; deze
   component gaat er vanuit dat hij alleen dan getoond wordt, en elke actie
   controleert het daarnaast nog eens zelf.
   ------------------------------------------------------------------------- */

const vandaag = () => formatDateInput(new Date())

/* --- Contracten ---------------------------------------------------------- */

export function Contracten({
  userId,
  contracten,
  signaal,
}: {
  userId: string
  contracten: EmploymentContract[]
  signaal: Ketensignaal
}) {
  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
        <h2 className="text-base">Contracten</h2>
        <p className="text-xs text-gray-500">
          Elk contract apart, ook een verlenging. Anders is de keten niet te tellen.
        </p>
      </div>

      {signaal.aantal > 0 && (
        <div
          className={`border-b border-gray-200 px-5 py-3 text-sm ${
            signaal.stand === 'over'
              ? 'bg-jr-red/5'
              : signaal.stand === 'laatste'
                ? 'bg-jr-orange/5'
                : ''
          }`}
        >
          <p>
            <strong>
              {signaal.aantal} tijdelijk{signaal.aantal === 1 ? ' contract' : 'e contracten'} in
              de lopende keten
            </strong>
            , samen {signaal.maanden} maanden.
            {signaal.stand === 'over' && (
              <span className="text-jr-red">
                {' '}
                Dat is over de grens van drie contracten of 36 maanden.
              </span>
            )}
            {signaal.stand === 'laatste' && (
              <span className="text-jr-orange">
                {' '}
                Dit is het laatste contract dat nog tijdelijk kan zijn.
              </span>
            )}
            {signaal.laatsteEindigtOp && (
              <> Loopt af op {formatDate(signaal.laatsteEindigtOp)}.</>
            )}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Dit is een signaal om naar te kijken, geen juridisch oordeel. Stage en zzp tellen
            hier niet mee en cao-afspraken kent dit systeem niet. Laat het toetsen voordat je
            er een besluit op baseert.
          </p>
        </div>
      )}

      {contracten.length === 0 ? (
        <p className="px-5 py-5 text-sm text-gray-600">Nog geen contracten vastgelegd.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {contracten.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm">
                  {CONTRACT_LABELS[c.type]}
                  {c.jobTitle && <span className="text-gray-600"> &middot; {c.jobTitle}</span>}
                </p>
                <p className="text-xs text-gray-600">
                  {formatDate(c.startedOn)}
                  {c.endsOn ? ` tot ${formatDate(c.endsOn)}` : ' — doorlopend'}
                  {c.hoursPerWeekQuarters !== null && (
                    <> &middot; {formatContractUren(c.hoursPerWeekQuarters)} per week</>
                  )}
                  {c.signedOn && <> &middot; getekend {formatDate(c.signedOn)}</>}
                </p>
                {c.notes && <p className="mt-0.5 text-xs text-gray-500">{c.notes}</p>}
              </div>

              <ActionForm
                action={wisContract}
                submitLabel="Verwijderen"
                submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                resetOnSuccess={false}
                className=""
              >
                <input type="hidden" name="contractId" value={c.id} />
                <input type="hidden" name="userId" value={userId} />
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-200 px-5 py-3">
        <Uitklap label="Contract toevoegen" className="">
          <ActionForm action={nieuwContract} submitLabel="Toevoegen" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="userId" value={userId} />
            <Select
              label="Soort"
              name="type"
              defaultValue="bepaalde_tijd"
              options={Object.entries(CONTRACT_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Field label="Functie" name="functie" placeholder="Marketing manager" />
            <Field label="Startdatum" name="startdatum" type="date" required defaultValue={vandaag()} />
            <Field
              label="Einddatum"
              name="einddatum"
              type="date"
              hint="Leeg bij onbepaalde tijd."
            />
            <Field label="Uren per week" name="uren" placeholder="32" hint="Halve uren mogen: 36,5." />
            <Field label="Getekend op" name="getekend" type="date" />
            <div className="sm:col-span-2">
              <TextArea label="Notities" name="notities" rows={2} />
            </div>
          </ActionForm>
        </Uitklap>
      </div>
    </section>
  )
}

/* --- Salaris ------------------------------------------------------------- */

export function Salaris({
  userId,
  regels,
  huidig,
}: {
  userId: string
  regels: SalaryRecord[]
  huidig: SalaryRecord | null
}) {
  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
        <h2 className="text-base">Salaris</h2>
        <p className="text-xs text-gray-500">Alleen zichtbaar voor beheerders.</p>
      </div>

      <div className="border-b border-gray-200 px-5 py-4">
        {huidig ? (
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="text-xs text-gray-600">Bruto per maand</dt>
              <dd className="tabular text-jr-blue text-xl font-bold leading-tight">
                {formatCents(huidig.grossMonthlyCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Per jaar incl. vakantiegeld</dt>
              <dd className="tabular text-xl font-bold leading-tight">
                {formatCents(jaarloonCents(huidig))}
                <span className="ml-1 text-xs font-normal text-gray-500">
                  {huidig.holidayAllowancePercent}%
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-600">Sinds</dt>
              <dd className="text-xl font-bold leading-tight">
                {formatDate(huidig.effectiveFrom)}
              </dd>
            </div>
            {huidig.basedOnHoursQuarters !== null && (
              <div>
                <dt className="text-xs text-gray-600">Bij</dt>
                <dd className="text-xl font-bold leading-tight">
                  {formatContractUren(huidig.basedOnHoursQuarters)}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-600">Nog geen salaris vastgelegd.</p>
        )}
      </div>

      {regels.length > 0 && (
        <ul className="divide-y divide-gray-200">
          {regels.map((r) => {
            const nogNietIn = r.effectiveFrom > new Date()
            return (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="tabular">{formatCents(r.grossMonthlyCents)}</span>
                    <span className="text-gray-600"> vanaf {formatDate(r.effectiveFrom)}</span>
                    {nogNietIn && (
                      <span className="bg-jr-lightblue text-jr-deepblue ml-2 rounded-full px-2 py-0.5 text-xs">
                        gaat nog in
                      </span>
                    )}
                  </p>
                  {r.reason && <p className="text-xs text-gray-600">{r.reason}</p>}
                </div>

                <ActionForm
                  action={wisSalaris}
                  submitLabel="Verwijderen"
                  submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                  resetOnSuccess={false}
                  className=""
                >
                  <input type="hidden" name="salarisId" value={r.id} />
                  <input type="hidden" name="userId" value={userId} />
                </ActionForm>
              </li>
            )
          })}
        </ul>
      )}

      <div className="border-t border-gray-200 px-5 py-3">
        <Uitklap label="Salaris vastleggen" className="">
          <p className="mb-3 text-xs text-gray-600">
            Een verhoging voer je in als nieuwe regel met een ingangsdatum; de oude blijft
            staan. Zo is later terug te zien wat er wanneer is afgesproken, en kun je een
            afspraak die pas volgend kwartaal ingaat nu al invoeren.
          </p>
          <ActionForm action={nieuwSalaris} submitLabel="Vastleggen" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="userId" value={userId} />
            <Field label="Bruto per maand" name="bedrag" required placeholder="3200,00" />
            <Field label="Ingangsdatum" name="ingangsdatum" type="date" required defaultValue={vandaag()} />
            <Field
              label="Bij hoeveel uur"
              name="uren"
              placeholder="32"
              hint="Zodat het bedrag later niet iets anders gaat betekenen."
            />
            <Field
              label="Vakantiegeld in %"
              name="vakantiegeld"
              type="number"
              defaultValue="8"
              hint="Wettelijk minimaal 8."
            />
            <div className="sm:col-span-2">
              <Field label="Reden" name="reden" placeholder="Periodieke verhoging" />
            </div>
          </ActionForm>
        </Uitklap>
      </div>
    </section>
  )
}

/* --- Dossier ------------------------------------------------------------- */

export function Dossier({ userId, regels }: { userId: string; regels: DossierRegel[] }) {
  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
        <h2 className="text-base">Dossier</h2>
        <p className="text-xs text-gray-500">
          Gesprekken, afspraken, opleidingen. Geen ziekte of medische gegevens.
        </p>
      </div>

      {regels.length === 0 ? (
        <p className="px-5 py-5 text-sm text-gray-600">Nog niets vastgelegd.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {regels.map((r) => (
            <li key={r.id} className="px-5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${DOSSIER_STIJLEN[r.kind]}`}>
                      {DOSSIER_LABELS[r.kind]}
                    </span>
                    {r.subject}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {formatDate(r.happenedOn)}
                    {r.doorWie && <> &middot; vastgelegd door {r.doorWie}</>}
                  </p>
                  {r.body && <p className="mt-1 text-sm whitespace-pre-line">{r.body}</p>}
                </div>

                <ActionForm
                  action={wisDossierRegel}
                  submitLabel="Verwijderen"
                  submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                  resetOnSuccess={false}
                  className=""
                >
                  <input type="hidden" name="regelId" value={r.id} />
                  <input type="hidden" name="userId" value={userId} />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-200 px-5 py-3">
        <Uitklap label="Regel toevoegen" className="">
          <ActionForm action={nieuweDossierRegel} submitLabel="Toevoegen" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="userId" value={userId} />
            <Select
              label="Soort"
              name="soort"
              defaultValue="gesprek"
              options={Object.entries(DOSSIER_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Field label="Datum" name="datum" type="date" defaultValue={vandaag()} />
            <div className="sm:col-span-2">
              <Field label="Titel" name="titel" required placeholder="Functioneringsgesprek" />
            </div>
            <div className="sm:col-span-2">
              <TextArea
                label="Wat is er besproken"
                name="tekst"
                rows={4}
                hint="Geen medische gegevens: je mag vastleggen dat iemand ziek is, niet wat hij heeft."
              />
            </div>
          </ActionForm>
        </Uitklap>
      </div>
    </section>
  )
}

/* --- Bedrijfsmiddelen ---------------------------------------------------- */

export function Bedrijfsmiddelen({
  userId,
  middelen,
}: {
  userId: string
  middelen: CompanyAsset[]
}) {
  const open = middelen.filter((m) => m.returnedOn === null)

  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
        <h2 className="text-base">Bedrijfsmiddelen</h2>
        <p className="text-xs text-gray-500">
          {open.length === 0
            ? 'Niets uitstaand'
            : `${open.length} nog niet ingeleverd`}
        </p>
      </div>

      {middelen.length === 0 ? (
        <p className="px-5 py-5 text-sm text-gray-600">Niets uitgegeven.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {middelen.map((m) => (
            <li key={m.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm">
                  {m.label}
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {ASSET_LABELS[m.kind]}
                  </span>
                </p>
                <p className="text-xs text-gray-600">
                  uitgegeven {formatDate(m.handedOutOn)}
                  {m.serial && <> &middot; {m.serial}</>}
                  {m.returnedOn ? (
                    <> &middot; ingeleverd {formatDate(m.returnedOn)}</>
                  ) : (
                    <span className="text-jr-orange"> &middot; nog in gebruik</span>
                  )}
                </p>
                {m.notes && <p className="mt-0.5 text-xs text-gray-500">{m.notes}</p>}
              </div>

              <div className="flex gap-2">
                {m.returnedOn === null && (
                  <ActionForm
                    action={leverIn}
                    submitLabel="Ingeleverd"
                    submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                    resetOnSuccess={false}
                    className=""
                  >
                    <input type="hidden" name="middelId" value={m.id} />
                    <input type="hidden" name="userId" value={userId} />
                  </ActionForm>
                )}
                <ActionForm
                  action={wisMiddel}
                  submitLabel="Verwijderen"
                  submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                  resetOnSuccess={false}
                  className=""
                >
                  <input type="hidden" name="middelId" value={m.id} />
                  <input type="hidden" name="userId" value={userId} />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-200 px-5 py-3">
        <Uitklap label="Bedrijfsmiddel uitgeven" className="">
          <ActionForm action={nieuwMiddel} submitLabel="Uitgeven" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="userId" value={userId} />
            <Select
              label="Soort"
              name="soort"
              defaultValue="laptop"
              options={Object.entries(ASSET_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Field label="Uitgegeven op" name="uitgegeven" type="date" defaultValue={vandaag()} />
            <Field
              label="Omschrijving"
              name="omschrijving"
              required
              placeholder="MacBook Pro 14, 2023"
            />
            <Field label="Serienummer" name="serienummer" />
          </ActionForm>
        </Uitklap>
      </div>
    </section>
  )
}
