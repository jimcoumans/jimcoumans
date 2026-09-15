import { ActionForm, Field, Uitklap } from './ActionForm'
import {
  nieuweVestiging,
  wisVestiging,
  nieuweConcurrent,
  wisConcurrent,
  nieuwDoel,
  wisselDoel,
  wisDoel,
} from '@/app/beheer/crm-actions'
import { formatDate, formatDateInput } from '@/lib/dates'
import type { OrganizationLocation, Competitor, OrganizationGoal } from '@/db/schema'

/* -------------------------------------------------------------------------
   Vestigingen, concurrenten en doelen bij een klant.

   Alle drie hetzelfde patroon: een lijst met wat er is, en een uitklap om
   er iets bij te zetten. Dat leest rustig op een pagina die al vol staat.
   ------------------------------------------------------------------------- */

export function Vestigingen({
  organizationId,
  slug,
  vestigingen,
}: {
  organizationId: string
  slug: string
  vestigingen: OrganizationLocation[]
}) {
  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
        <h2 className="text-base">Vestigingen</h2>
        <p className="text-xs text-gray-500">Naast het hoofdadres hierboven.</p>
      </div>

      {vestigingen.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-600">Alleen het hoofdadres.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {vestigingen.map((v) => (
            <li key={v.id} className="flex items-start justify-between gap-4 px-5 py-2.5">
              <div className="min-w-0">
                <p className="text-sm">{v.name}</p>
                <p className="text-xs text-gray-600">
                  {[v.addressLine, [v.postalCode, v.city].filter(Boolean).join(' ')]
                    .filter(Boolean)
                    .join(' · ') || 'geen adres ingevuld'}
                  {v.phone && ` · ${v.phone}`}
                </p>
              </div>
              <ActionForm
                action={wisVestiging}
                submitLabel="Weg"
                submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                resetOnSuccess={false}
                className=""
              >
                <input type="hidden" name="vestigingId" value={v.id} />
                <input type="hidden" name="slug" value={slug} />
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-200 px-5 py-3">
        <Uitklap label="Vestiging toevoegen" className="">
          <ActionForm action={nieuweVestiging} submitLabel="Toevoegen" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <Field label="Naam" name="vestigingnaam" required placeholder="Vestiging Maastricht" />
            <Field label="Telefoon" name="vestigingtelefoon" />
            <div className="sm:col-span-2">
              <Field label="Adres" name="vestigingadres" />
            </div>
            <Field label="Postcode" name="vestigingpostcode" />
            <Field label="Plaats" name="vestigingplaats" />
          </ActionForm>
        </Uitklap>
      </div>
    </section>
  )
}

export function Concurrenten({
  organizationId,
  slug,
  concurrenten,
}: {
  organizationId: string
  slug: string
  concurrenten: Competitor[]
}) {
  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
        <h2 className="text-base">Concurrenten</h2>
        <p className="text-xs text-gray-500">
          <a href="/beheer/concurrenten" className="text-jr-blue">
            Wie komen we vaker tegen?
          </a>
        </p>
      </div>

      {concurrenten.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-600">
          Nog niets vastgelegd. Weten tegen wie je het opneemt helpt bij elk voorstel.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {concurrenten.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-4 px-5 py-2.5">
              <div className="min-w-0">
                <p className="text-sm">
                  {c.website ? (
                    <a
                      href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-jr-blue"
                    >
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                </p>
                {c.notes && <p className="text-xs text-gray-600">{c.notes}</p>}
              </div>
              <ActionForm
                action={wisConcurrent}
                submitLabel="Weg"
                submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                resetOnSuccess={false}
                className=""
              >
                <input type="hidden" name="concurrentId" value={c.id} />
                <input type="hidden" name="slug" value={slug} />
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-200 px-5 py-3">
        <Uitklap label="Concurrent toevoegen" className="">
          <ActionForm action={nieuweConcurrent} submitLabel="Toevoegen" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <Field label="Naam" name="concurrentnaam" required />
            <Field label="Website" name="concurrentwebsite" placeholder="concurrent.nl" />
            <div className="sm:col-span-2">
              <Field
                label="Wat maakt hen sterk"
                name="concurrentnotitie"
                placeholder="Waar zitten ze in de weg, wat doen ze beter?"
              />
            </div>
          </ActionForm>
        </Uitklap>
      </div>
    </section>
  )
}

export function Doelen({
  organizationId,
  slug,
  doelen,
}: {
  organizationId: string
  slug: string
  doelen: OrganizationGoal[]
}) {
  const open = doelen.filter((d) => d.achievedOn === null)

  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-gray-200 px-5 py-3">
        <h2 className="text-base">Doelen</h2>
        <p className="text-xs text-gray-500">
          {open.length === 0 ? 'Niets openstaand' : `${open.length} openstaand`}
        </p>
      </div>

      {doelen.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-600">
          Nog geen doelen. Waar werkt deze klant naartoe?
        </p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {doelen.map((d) => {
            const teLaat =
              d.achievedOn === null && d.targetOn !== null && d.targetOn < new Date()
            return (
              <li key={d.id} className="flex items-start justify-between gap-4 px-5 py-2.5">
                <div className="min-w-0">
                  <p className={`text-sm ${d.achievedOn ? 'text-gray-500 line-through' : ''}`}>
                    {d.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    {d.targetOn ? (
                      <span className={teLaat ? 'text-jr-orange' : ''}>
                        streefdatum {formatDate(d.targetOn)}
                        {teLaat && ' · verstreken'}
                      </span>
                    ) : (
                      'geen streefdatum'
                    )}
                    {d.achievedOn && ` · behaald ${formatDate(d.achievedOn)}`}
                  </p>
                  {d.notes && <p className="mt-0.5 text-xs text-gray-500">{d.notes}</p>}
                </div>

                <div className="flex shrink-0 gap-2">
                  <ActionForm
                    action={wisselDoel}
                    submitLabel={d.achievedOn ? 'Toch niet' : 'Behaald'}
                    submitClassName="text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                    resetOnSuccess={false}
                    className=""
                  >
                    <input type="hidden" name="doelId" value={d.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="behaald" value={d.achievedOn ? 'nee' : 'ja'} />
                  </ActionForm>
                  <ActionForm
                    action={wisDoel}
                    submitLabel="Weg"
                    submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                    resetOnSuccess={false}
                    className=""
                  >
                    <input type="hidden" name="doelId" value={d.id} />
                    <input type="hidden" name="slug" value={slug} />
                  </ActionForm>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="border-t border-gray-200 px-5 py-3">
        <Uitklap label="Doel toevoegen" className="">
          <ActionForm action={nieuwDoel} submitLabel="Toevoegen" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <div className="sm:col-span-2">
              <Field
                label="Doel"
                name="doeltitel"
                required
                placeholder="20% meer aanvragen uit organisch verkeer"
              />
            </div>
            <Field
              label="Streefdatum"
              name="doeldatum"
              type="date"
              defaultValue={formatDateInput(new Date())}
              hint="Een doel zonder datum is een wens."
            />
            <Field label="Toelichting" name="doelnotitie" />
          </ActionForm>
        </Uitklap>
      </div>
    </section>
  )
}
