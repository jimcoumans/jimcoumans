import { ActionForm, Field } from './ActionForm'
import {
  wijzigAbonnement,
  zetAbonnementStatus,
  factureerNu,
} from '@/app/beheer/subscription-actions'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import { vatCents } from '@/lib/billing-periods'
import type { SubscriptionOverzicht } from '@/lib/billing'

const statusLabels = {
  active: 'Loopt',
  paused: 'Gepauzeerd',
  ended: 'Gestopt',
} as const

const statusStyles = {
  active: 'bg-jr-green/10 text-jr-green',
  paused: 'bg-jr-orange/10 text-jr-orange',
  ended: 'bg-gray-100 text-gray-600',
} as const

/** Een euro-bedrag als invoerwaarde: 250000 wordt "2500,00". */
function bedragVeld(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** Datum als waarde voor een date-invoerveld. */
function datumVeld(datum: Date | null): string {
  return datum ? datum.toISOString().slice(0, 10) : ''
}

export function SubscriptionCard({
  item,
  slug,
  toonKlant = false,
}: {
  item: SubscriptionOverzicht
  slug: string
  toonKlant?: boolean
}) {
  const { subscription: abo } = item
  const btw = vatCents(abo.amountExclVatCents, abo.vatRatePercent)

  return (
    <li className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base">{abo.name}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[abo.status]}`}
            >
              {statusLabels[abo.status]}
            </span>
          </div>

          {toonKlant && (
            <a
              href={`/beheer/klanten/${item.organizationSlug}`}
              className="hover:text-jr-blue mt-0.5 block text-sm text-gray-700"
            >
              {item.organizationName}
            </a>
          )}

          {abo.description && (
            <p className="mt-1 text-sm text-gray-600">{abo.description}</p>
          )}

          <p className="mt-1.5 text-xs text-gray-600">
            budget naar {item.walletName} &middot; de {abo.billingDay}e van de maand
            &middot; sinds {formatDate(abo.startedOn)}
            {abo.endsOn && <> &middot; tot {formatDate(abo.endsOn)}</>}
          </p>

          <p className="mt-1 text-xs text-gray-600">
            {item.billedPeriods === 0 ? (
              'nog niet gefactureerd'
            ) : (
              <>
                {item.billedPeriods}{' '}
                {item.billedPeriods === 1 ? 'maand' : 'maanden'} gefactureerd &middot;{' '}
                {formatCents(item.billedCents)} totaal bijgeschreven
              </>
            )}
          </p>

          {abo.notes && <p className="mt-1.5 text-xs text-gray-500">{abo.notes}</p>}
        </div>

        <div className="shrink-0 text-right">
          <p className="tabular text-lg">{formatCents(abo.amountExclVatCents)}</p>
          <p className="text-xs text-gray-600">per maand, excl. btw</p>
          <p className="text-xs text-gray-500">
            incl. {formatCents(abo.amountExclVatCents + btw)}
          </p>

          {item.nextBillingOn ? (
            <p className="text-jr-blue mt-1.5 text-xs">
              volgende factuur {formatDate(item.nextBillingOn)}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-500">geen volgende factuur</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
        {abo.status !== 'active' && (
          <ActionForm
            action={zetAbonnementStatus}
            submitLabel="Aanzetten"
            submitClassName="bg-jr-btn hover:bg-jr-btnhover text-white !text-xs"
            resetOnSuccess={false}
            className=""
          >
            <input type="hidden" name="id" value={abo.id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="status" value="active" />
          </ActionForm>
        )}

        {abo.status === 'active' && (
          <>
            <ActionForm
              action={zetAbonnementStatus}
              submitLabel="Pauzeren"
              submitClassName="text-gray-600 hover:bg-gray-100 !text-xs"
              resetOnSuccess={false}
              className=""
            >
              <input type="hidden" name="id" value={abo.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="status" value="paused" />
            </ActionForm>

            <ActionForm
              action={factureerNu}
              submitLabel="Nu factureren"
              submitClassName="text-gray-600 hover:bg-gray-100 !text-xs"
              resetOnSuccess={false}
              className=""
            >
              <input type="hidden" name="subscriptionId" value={abo.id} />
              <input type="hidden" name="slug" value={slug} />
            </ActionForm>
          </>
        )}

        {abo.status !== 'ended' && (
          <ActionForm
            action={zetAbonnementStatus}
            submitLabel="Stopzetten"
            submitClassName="text-gray-600 hover:bg-gray-100 !text-xs"
            resetOnSuccess={false}
            className=""
          >
            <input type="hidden" name="id" value={abo.id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="status" value="ended" />
          </ActionForm>
        )}
      </div>

      <details className="mt-2">
        <summary className="text-jr-blue cursor-pointer text-xs">Aanpassen</summary>
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <p className="mb-3 text-xs text-gray-600">
            Een nieuw bedrag geldt vanaf de volgende factuur. Facturen die al
            verstuurd zijn en het budget dat al is bijgeschreven veranderen niet.
          </p>
          <ActionForm
            action={wijzigAbonnement}
            submitLabel="Opslaan"
            resetOnSuccess={false}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={abo.id} />
            <input type="hidden" name="slug" value={slug} />

            <Field label="Naam" name="naam" required defaultValue={abo.name} />
            <Field
              label="Maandbedrag excl. btw"
              name="bedrag"
              required
              defaultValue={bedragVeld(abo.amountExclVatCents)}
            />
            <Field
              label="Facturatiedag"
              name="facturatiedag"
              type="number"
              required
              defaultValue={String(abo.billingDay)}
              hint="1 tot 28"
            />
            <Field
              label="Einddatum"
              name="einddatum"
              type="date"
              defaultValue={datumVeld(abo.endsOn)}
              hint="Leeg laten voor doorlopend."
            />
            <div className="sm:col-span-2">
              <Field
                label="Omschrijving"
                name="omschrijving"
                defaultValue={abo.description ?? ''}
              />
            </div>
            <div className="sm:col-span-2">
              <Field label="Interne notities" name="notities" defaultValue={abo.notes ?? ''} />
            </div>
          </ActionForm>
        </div>
      </details>
    </li>
  )
}

/** Formulier om een abonnement toe te voegen bij een klant. */
export function NewSubscriptionForm({
  action,
  organizationId,
  slug,
  wallets,
  vandaag,
}: {
  action: (formData: FormData) => Promise<import('@/app/beheer/actions').ActionResult>
  organizationId: string
  slug: string
  wallets: { id: string; name: string }[]
  vandaag: string
}) {
  if (wallets.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Maak eerst een wallet aan om het budget op bij te schrijven.
      </p>
    )
  }

  return (
    <ActionForm
      action={action}
      submitLabel="Abonnement aanmaken"
      className="grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="slug" value={slug} />

      <Field label="Naam" name="naam" required placeholder="Marketing abonnement" />
      <Field
        label="Maandbedrag excl. btw"
        name="bedrag"
        required
        placeholder="2500,00"
        hint="Dit wordt maandelijks als budget bijgeschreven."
      />

      <div>
        <label htmlFor="abo-wallet" className="mb-1 block text-xs text-gray-600">
          Budget bijschrijven op
        </label>
        <select
          id="abo-wallet"
          name="walletId"
          defaultValue={wallets[0]!.id}
          className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <Field
        label="Facturatiedag"
        name="facturatiedag"
        type="number"
        defaultValue="2"
        hint="1 tot 28. Standaard de 2e, zoals de Moneybird-facturen."
      />

      <Field
        label="Startdatum"
        name="startdatum"
        type="date"
        required
        defaultValue={vandaag}
        hint="Maanden van voor vandaag worden niet met terugwerkende kracht gefactureerd."
      />
      <Field
        label="Einddatum"
        name="einddatum"
        type="date"
        hint="Leeg laten voor doorlopend."
      />

      <div className="sm:col-span-2">
        <Field
          label="Omschrijving"
          name="omschrijving"
          placeholder="Wat het abonnement omvat"
        />
      </div>

      <Field label="Btw-percentage" name="btw" type="number" defaultValue="21" />

      <div className="sm:col-span-2">
        <Field label="Interne notities" name="notities" />
      </div>

      <p className="sm:col-span-2 rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
        Vanaf de eerstvolgende facturatiedag wordt elke maand automatisch een
        factuur gemaakt en het budget bijgeschreven. Maanden van voordat je dit
        abonnement invoert worden niet gefactureerd, ook niet met een startdatum in
        het verleden: die facturen staan al in Moneybird. Wil je oud budget alsnog
        in de wallet, boek het dan met de hand bij.
      </p>
    </ActionForm>
  )
}
