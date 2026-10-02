import { ActionForm, Field } from './ActionForm'
import {
  wijzigAbonnement,
  zetAbonnementStatus,
  factureerNu,
} from '@/app/beheer/subscription-actions'
import { formatEuro } from '@/lib/money'
import { Menu } from './Menu'
import { Paneel } from './Paneel'
import { formatDate } from '@/lib/dates'
import { invoiceCents, discountPercentage } from '@/lib/billing-periods'
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
  // Het budget is wat de klant krijgt; het factuurbedrag is wat hij betaalt.
  // Zonder korting is dat hetzelfde getal en tonen we er maar één.
  const teFactureren = invoiceCents(abo.amountExclVatCents, abo.discountCents)
  const kortingPercentage = discountPercentage(abo.amountExclVatCents, abo.discountCents)

  const actieKnop = '!min-h-0 w-full !rounded-lg !px-3 !py-2 text-left !font-normal'

  return (
    <li className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        {/* Op een telefoon het bedrag onder de tekst, niet ernaast. */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[17px]">{abo.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[abo.status]}`}>
              {statusLabels[abo.status]}
            </span>
          </div>

          {toonKlant && (
            <a
              href={`/beheer/klanten/${item.organizationSlug}`}
              className="hover:text-jr-link mt-0.5 block text-sm text-gray-700"
            >
              {item.organizationName}
            </a>
          )}

          {abo.description && <p className="mt-1 text-sm text-gray-600">{abo.description}</p>}

          <p className="mt-2 text-[13px] text-gray-600">
            Factuur op de {abo.billingDay}e van de maand, sinds {formatDate(abo.startedOn)}
            {abo.endsOn && <>, tot {formatDate(abo.endsOn)}</>}
            {/* De wallet noemen we alleen als die anders heet dan het
                abonnement; anders staat er twee keer hetzelfde. */}
            {item.walletName !== abo.name && <> &middot; budget naar {item.walletName}</>}
          </p>
          <p className="mt-0.5 text-[13px] text-gray-600">
            {item.billedPeriods === 0
              ? 'Nog niet gefactureerd'
              : `${item.billedPeriods} ${item.billedPeriods === 1 ? 'maand' : 'maanden'} gefactureerd, ${formatEuro(item.billedCents)} bijgeschreven`}
          </p>

          {abo.notes && <p className="mt-1.5 text-xs text-gray-500">{abo.notes}</p>}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="tabular font-display text-[22px] leading-tight font-semibold tracking-tight">
            {formatEuro(abo.amountExclVatCents)}
          </p>
          <p className="text-xs text-gray-600">per maand, excl. btw</p>
          {abo.discountCents > 0 && (
            <p className="mt-0.5 text-xs text-[#94590A]">
              {formatEuro(abo.discountCents)} korting
              {kortingPercentage !== null && ` (${kortingPercentage}%)`}, factuur {formatEuro(teFactureren)}
            </p>
          )}
          <p className="mt-1.5 text-xs text-gray-600">
            {item.nextBillingOn ? `Volgende factuur ${formatDate(item.nextBillingOn)}` : 'Geen volgende factuur'}
          </p>
        </div>
        </div>

        <Menu>
          <Paneel
            knop="Aanpassen"
            stijl="menu"
            titel={`${abo.name} aanpassen`}
            uitleg="Een nieuw bedrag geldt vanaf de volgende factuur. Wat al gefactureerd en bijgeschreven is, verandert niet."
          >
            <ActionForm action={wijzigAbonnement} submitLabel="Opslaan" resetOnSuccess={false} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={abo.id} />
              <input type="hidden" name="slug" value={slug} />

              <Field label="Naam" name="naam" required defaultValue={abo.name} />
              <Field
                label="Maandbudget excl. btw"
                name="bedrag"
                required
                defaultValue={bedragVeld(abo.amountExclVatCents)}
                hint="Wat de klant aan diensten krijgt; dit komt in de wallet."
              />
              <Field
                label="Korting"
                name="korting"
                defaultValue={abo.discountCents > 0 ? bedragVeld(abo.discountCents) : ''}
                placeholder="0,00"
                hint="Gaat van de factuur af, niet van het budget."
              />
              <Field
                label="Facturatiedag"
                name="facturatiedag"
                type="number"
                required
                defaultValue={String(abo.billingDay)}
                hint="1 tot 28"
              />
              <Field label="Einddatum" name="einddatum" type="date" defaultValue={datumVeld(abo.endsOn)} hint="Leeg voor doorlopend." />
              <div className="sm:col-span-2">
                <Field label="Omschrijving" name="omschrijving" defaultValue={abo.description ?? ''} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Interne notities" name="notities" defaultValue={abo.notes ?? ''} />
              </div>
            </ActionForm>
          </Paneel>

          {abo.status === 'active' && (
            <ActionForm action={factureerNu} submitLabel="Nu factureren" submitClassName={`${actieKnop} text-jr-text hover:bg-gray-100`} resetOnSuccess={false} meldGelukt={false} className="">
              <input type="hidden" name="subscriptionId" value={abo.id} />
              <input type="hidden" name="slug" value={slug} />
            </ActionForm>
          )}

          {abo.status === 'active' ? (
            <ActionForm action={zetAbonnementStatus} submitLabel="Pauzeren" submitClassName={`${actieKnop} text-jr-text hover:bg-gray-100`} resetOnSuccess={false} meldGelukt={false} className="">
              <input type="hidden" name="id" value={abo.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="status" value="paused" />
            </ActionForm>
          ) : (
            <ActionForm action={zetAbonnementStatus} submitLabel="Weer aanzetten" submitClassName={`${actieKnop} text-jr-text hover:bg-gray-100`} resetOnSuccess={false} meldGelukt={false} className="">
              <input type="hidden" name="id" value={abo.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="status" value="active" />
            </ActionForm>
          )}

          {abo.status !== 'ended' && (
            <ActionForm action={zetAbonnementStatus} submitLabel="Stopzetten" submitClassName={`${actieKnop} text-[#C02A22] hover:bg-[#FDECEA]`} resetOnSuccess={false} meldGelukt={false} className="">
              <input type="hidden" name="id" value={abo.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="status" value="ended" />
            </ActionForm>
          )}
        </Menu>
      </div>
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
        label="Maandbudget excl. btw"
        name="bedrag"
        required
        placeholder="2500,00"
        hint="Wat de klant aan diensten krijgt; dit wordt maandelijks bijgeschreven."
      />
      <Field
        label="Korting"
        name="korting"
        placeholder="0,00"
        hint="Alleen invullen als de klant minder betaalt dan zijn budget. De korting gaat van de factuur af; het budget blijft heel."
      />

      <div>
        <label htmlFor="abo-wallet" className="text-jr-text mb-1.5 block text-[13px] font-medium">
          Budget bijschrijven op
        </label>
        <select
          id="abo-wallet"
          name="walletId"
          defaultValue={wallets[0]!.id}
          className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
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
