import { listCampagnes, listDoelgroepen, STATUS_LABELS, STATUS_STIJL } from '@/lib/campagnes'
import { ActionForm, Field, Uitklap } from '@/components/ActionForm'
import { nieuweDoelgroep, wisDoelgroep } from '@/app/beheer/campagne-actions'
import { formatDate } from '@/lib/dates'

/**
 * Campagnes en vaste doelgroepen op de klantkaart. De campagnes blijven hier
 * staan als historie: wat we deden, wanneer, en met welke versie de klant
 * akkoord gaf.
 */
export async function KlantCampagnes({ organizationId, slug }: { organizationId: string; slug: string }) {
  const [campagnes, doelgroepen] = await Promise.all([listCampagnes(organizationId), listDoelgroepen(organizationId)])

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">Campagnes</h2>
        <a href={`/beheer/campagnes?klant=${organizationId}`} className="text-jr-blue text-sm hover:underline">
          Nieuwe campagne
        </a>
      </div>

      {campagnes.length === 0 ? (
        <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">Nog geen campagnes.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm">
          {campagnes.map(({ campagne: c }) => (
            <li key={c.id}>
              <a href={`/beheer/campagnes/${c.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 hover:bg-gray-100/60">
                <span className="min-w-0">
                  <span className="block text-sm">{c.title}</span>
                  <span className="block text-xs text-gray-600">
                    {c.startOn && c.endOn ? `${formatDate(c.startOn)} – ${formatDate(c.endOn)}` : 'Nog geen data'}
                    {c.version > 0 && ` · versie ${c.version}.0`}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_STIJL[c.status]}`}>{STATUS_LABELS[c.status]}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-base">Vaste doelgroepen</h3>
        <p className="mb-3 text-xs text-gray-600">Eén keer vastleggen, in elke campagnebriefing aan te vinken.</p>
        {doelgroepen.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen vaste doelgroepen.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {doelgroepen.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-3 py-2">
                <span className="text-sm">
                  {d.name}
                  {d.description && <span className="block text-xs text-gray-500">{d.description}</span>}
                </span>
                <ActionForm
                  action={wisDoelgroep}
                  submitLabel="Weg"
                  submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                  resetOnSuccess={false}
                  meldGelukt={false}
                  className=""
                >
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="slug" value={slug} />
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <Uitklap label="Doelgroep toevoegen" className="mt-3">
          <ActionForm action={nieuweDoelgroep} submitLabel="Toevoegen">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <Field label="Naam" name="name" required placeholder="Websitebezoekers, laatste 180 dagen" />
            <Field label="Omschrijving" name="description" />
          </ActionForm>
        </Uitklap>
      </div>
    </section>
  )
}
