'use client'

import { useActionState } from 'react'
import type { ActionResult } from '@/app/beheer/actions'

/**
 * Een mijlpaal als vinkje: één klik zet hem af of weer open. Het vinkje is
 * een knop in een formulier, zodat het ook zonder JavaScript werkt.
 */
export function MijlpaalVink({
  action,
  organizationId,
  slug,
  sleutel,
  gedaan,
  label,
  onder,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  organizationId: string
  slug: string
  sleutel: string
  gedaan: boolean
  label: string
  onder?: string
}) {
  const [state, formAction, bezig] = useActionState(async (_p: ActionResult | null, f: FormData) => action(f), null)
  return (
    <form action={formAction}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="key" value={sleutel} />
      <input type="hidden" name="gedaan" value={gedaan ? '0' : '1'} />
      <button
        type="submit"
        disabled={bezig}
        aria-pressed={gedaan}
        className="group flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-gray-100 disabled:opacity-50"
      >
        <span
          className={`mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
            gedaan ? 'border-[#1D7D3F] bg-[#1D7D3F] text-white' : 'border-gray-400 bg-white group-hover:border-gray-500'
          }`}
        >
          {gedaan && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="min-w-0">
          <span className={`block text-sm ${gedaan ? 'text-gray-600' : ''}`}>{label}</span>
          {onder && <span className="block text-xs text-gray-500">{onder}</span>}
        </span>
      </button>
      {state?.ok === false && <p className="text-xs text-[#C02A22]">{state.error}</p>}
    </form>
  )
}
