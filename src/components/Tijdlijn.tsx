import { ActionForm, Field, Select, TextArea, Uitklap } from './ActionForm'
import { nieuweNotitie, wisNotitie } from '@/app/beheer/tijdlijn-actions'
import { formatCents } from '@/lib/money'
import { formatDate, formatDateInput, formatRelative } from '@/lib/dates'
import type { TijdlijnItem } from '@/lib/tijdlijn'
import type { Contact } from '@/db/schema'

/* -------------------------------------------------------------------------
   De tijdlijn van een klant.

   Wat je met de hand vastlegt staat door elkaar met wat het systeem al weet:
   offertes, facturen, boekingen. Die worden bij het TONEN samengevoegd en
   niet als extra regel weggeschreven — anders heb je twee waarheden die uit
   elkaar kunnen lopen.

   Alleen wat met de hand is vastgelegd kun je weghalen. Een factuur haal je
   niet van de tijdlijn af; die bestaat.
   ------------------------------------------------------------------------- */

const SOORT_LABELS = {
  note: 'Notitie',
  call: 'Gebeld',
  meeting: 'Afspraak',
  email: 'Mail',
  task: 'Actie',
} as const

const BRON_LABELS = {
  activity: '',
  quote: 'Offerte',
  invoice: 'Factuur',
  booking: 'Boeking',
  topup: 'Budget',
} as const

const BRON_STIJLEN = {
  activity: 'bg-jr-lightblue text-jr-deepblue',
  quote: 'bg-jr-purple/10 text-jr-purple',
  invoice: 'bg-gray-100 text-gray-700',
  booking: 'bg-jr-orange/10 text-jr-orange',
  topup: 'bg-jr-green/10 text-jr-green',
} as const

export function Tijdlijn({
  organizationId,
  slug,
  items,
  contacten,
  laatsteContactOp,
}: {
  organizationId: string
  slug: string
  items: TijdlijnItem[]
  contacten: Contact[]
  laatsteContactOp: Date | null
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg">Tijdlijn</h2>
        <p className="text-xs text-gray-500">
          {laatsteContactOp
            ? `Laatste contact ${formatRelative(laatsteContactOp)}`
            : 'Nog geen contact vastgelegd'}
        </p>
      </div>

      <div className="mb-4 rounded-xl bg-white p-5 shadow-sm">
        <Uitklap label="Moment vastleggen" className="">
          <ActionForm action={nieuweNotitie} submitLabel="Vastleggen" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <Select
              label="Wat was het"
              name="soort"
              defaultValue="call"
              options={Object.entries(SOORT_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Field label="Wanneer" name="datum" type="date" defaultValue={formatDateInput(new Date())} />
            <div className="sm:col-span-2">
              <Field label="Kort" name="titel" required placeholder="Gebeld over de campagne" />
            </div>
            <Select
              label="Met wie"
              name="contact"
              defaultValue=""
              options={[
                { value: '', label: 'Niet bij een persoon' },
                ...contacten.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <div className="sm:col-span-2">
              <TextArea label="Wat is er besproken" name="tekst" rows={3} />
            </div>
          </ActionForm>
        </Uitklap>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Nog niets gebeurd. Zodra je factureert, een offerte stuurt of hierboven iets
            vastlegt, staat het hier.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
          {items.map((item) => (
            <li key={`${item.bron}-${item.id}`} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${BRON_STIJLEN[item.bron]}`}
                    >
                      {item.bron === 'activity' && item.kind
                        ? SOORT_LABELS[item.kind]
                        : BRON_LABELS[item.bron]}
                    </span>
                    {item.href ? (
                      <a href={item.href} className="hover:text-jr-blue">
                        {item.titel}
                      </a>
                    ) : (
                      item.titel
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {formatDate(item.wanneer)}
                    {item.metWie && ` · met ${item.metWie}`}
                    {item.wie && ` · ${item.wie}`}
                  </p>
                  {item.toelichting && (
                    <p className="mt-1 text-sm whitespace-pre-line text-gray-700">
                      {item.toelichting}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-baseline gap-3">
                  {item.bedragCents !== null && (
                    <span className="tabular text-sm">{formatCents(item.bedragCents)}</span>
                  )}
                  {/* Alleen wat met de hand is vastgelegd kun je weghalen. Een
                      factuur haal je niet van de tijdlijn af; die bestaat. */}
                  {item.bron === 'activity' && (
                    <ActionForm
                      action={wisNotitie}
                      submitLabel="Weg"
                      submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs"
                      resetOnSuccess={false}
                      className=""
                    >
                      <input type="hidden" name="activityId" value={item.id} />
                      <input type="hidden" name="slug" value={slug} />
                    </ActionForm>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
