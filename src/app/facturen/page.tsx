import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  getOrganizationInvoices,
  invoiceStatusLabels,
  invoiceStatusStyles,
} from '@/lib/invoices'
import { AppShell } from '@/components/AppShell'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'

/** Facturen die het budget hebben opgebouwd. */
export default async function FacturenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (!user.organizationId) redirect('/beheer')

  const facturen = await getOrganizationInvoices(user.organizationId)

  const openstaand = facturen
    .filter((f) => f.status === 'open' || f.status === 'overdue')
    .reduce((acc, f) => acc + f.amountExclVatCents + f.vatCents, 0)

  return (
    <AppShell user={user} actief="facturen">
        <h1 className="text-jr-blue mb-1 text-2xl">Facturen</h1>
        <p className="mb-6 text-sm text-gray-600">
          Deze facturen vormen samen het budget in je wallet. Bedragen zijn exclusief
          btw, net als in je wallet.
        </p>

        {openstaand > 0 && (
          <p className="border-jr-blue bg-jr-lightblue mb-6 rounded border-l-4 p-3 text-sm">
            Openstaand: <span className="tabular">{formatCents(openstaand)}</span> incl.
            btw
          </p>
        )}

        {facturen.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-600">Er zijn nog geen facturen.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
            {facturen.map((factuur) => {
              // De factuur hoort exact als budget te zijn bijgeschreven.
              // Wijkt het af, dan mist er een boeking en dat verzwijgen we niet.
              const afwijking = factuur.toppedUpCents !== factuur.amountExclVatCents

              return (
                <li
                  key={factuur.id}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">Factuur {factuur.number}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${invoiceStatusStyles[factuur.status]}`}
                      >
                        {invoiceStatusLabels[factuur.status]}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-600">
                      {formatDate(factuur.issuedOn)}
                      {factuur.description && <> &middot; {factuur.description}</>}
                    </p>

                    {afwijking && (
                      <p className="text-jr-orange mt-1 text-xs">
                        In je wallet bijgeschreven: {formatCents(factuur.toppedUpCents)}.
                        Wijkt dit af? Laat het je contactpersoon weten.
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm">
                      {formatCents(factuur.amountExclVatCents)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">excl. btw</p>
                    {factuur.pdfUrl && (
                      <a
                        href={factuur.pdfUrl}
                        className="text-jr-blue mt-1 inline-block text-xs hover:underline"
                      >
                        Pdf bekijken
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
    </AppShell>
  )
}
