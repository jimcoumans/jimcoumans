'use client'

import { useState } from 'react'

/**
 * Een regel in een lijst die je kunt wijzigen zonder hem eerst weg te gooien.
 *
 * Zonder dit kun je een KPI of kanaal alleen verwijderen en opnieuw invoeren,
 * en dan typ je alles twee keer. Het formulier staat al ingevuld onder de
 * regel klaar en gaat open met één klik.
 */
export function Regel({
  weergave,
  acties,
  formulier,
}: {
  weergave: React.ReactNode
  acties?: React.ReactNode
  formulier: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">{weergave}</div>
        <div className="flex items-center gap-1">
          {acties}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-jr-link rounded-lg px-2 py-1 text-xs font-medium hover:bg-gray-100"
          >
            {open ? 'Sluiten' : 'Wijzig'}
          </button>
        </div>
      </div>
      {open && <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-5">{formulier}</div>}
    </li>
  )
}
