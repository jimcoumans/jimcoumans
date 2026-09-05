import { formatCents, formatSignedCents } from '@/lib/money'
import { formatDate, formatMonth, monthKey } from '@/lib/dates'
import type { EntryWithRunningBalance } from '@/lib/ledger'

/**
 * Het afschrift. Per maand gegroepeerd, nieuwste eerst, met het saldo na
 * elke boeking. Teruggedraaide boekingen blijven staan maar zijn zichtbaar
 * doorgestreept: historie verdwijnt nooit, ook niet als er iets fout ging.
 */
export function TransactionList({
  entries,
  reversedIds,
}: {
  entries: EntryWithRunningBalance[]
  reversedIds: Set<string>
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          Er zijn nog geen mutaties op deze wallet.
        </p>
      </div>
    )
  }

  const perMaand = groepeerPerMaand(entries)

  return (
    <div className="space-y-6">
      {perMaand.map(({ key, label, rijen }) => (
        <section key={key}>
          <h3 className="mb-2 px-1 text-sm text-gray-600">{label}</h3>
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm">
            {rijen.map((entry) => (
              <TransactionRow
                key={entry.id}
                entry={entry}
                teruggedraaid={reversedIds.has(entry.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function TransactionRow({
  entry,
  teruggedraaid,
}: {
  entry: EntryWithRunningBalance
  teruggedraaid: boolean
}) {
  const bij = entry.amountCents > 0

  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3.5 sm:px-6">
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${teruggedraaid ? 'text-gray-500 line-through' : 'text-jr-black'}`}
        >
          {entry.description}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
          <span>{formatDate(entry.bookedOn)}</span>

          {entry.category && (
            <>
              <span aria-hidden>&middot;</span>
              <span className="bg-jr-lightblue text-jr-deepblue rounded px-1.5 py-0.5">
                {entry.category}
              </span>
            </>
          )}

          {entry.invoiceNumber && (
            <>
              <span aria-hidden>&middot;</span>
              <span>Factuur {entry.invoiceNumber}</span>
            </>
          )}

          {entry.kind === 'correction' && (
            <>
              <span aria-hidden>&middot;</span>
              <span className="text-jr-orange">Correctie</span>
            </>
          )}

          {teruggedraaid && (
            <>
              <span aria-hidden>&middot;</span>
              <span className="text-gray-500">teruggedraaid</span>
            </>
          )}
        </div>

        {entry.detail && (
          <p className="mt-1.5 text-xs text-gray-600">{entry.detail}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`tabular text-sm ${
            teruggedraaid
              ? 'text-gray-500 line-through'
              : bij
                ? 'text-jr-green'
                : 'text-jr-black'
          }`}
        >
          {formatSignedCents(entry.amountCents)}
        </p>
        <p className="tabular mt-0.5 text-xs text-gray-500">
          {formatCents(entry.runningBalanceCents)}
        </p>
      </div>
    </li>
  )
}

function groepeerPerMaand(entries: EntryWithRunningBalance[]) {
  const groepen: { key: string; label: string; rijen: EntryWithRunningBalance[] }[] = []

  for (const entry of entries) {
    const key = monthKey(entry.bookedOn)
    const laatste = groepen[groepen.length - 1]

    if (laatste && laatste.key === key) {
      laatste.rijen.push(entry)
    } else {
      groepen.push({ key, label: formatMonth(entry.bookedOn), rijen: [entry] })
    }
  }

  return groepen
}
