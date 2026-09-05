'use client'

import { useActionState } from 'react'
import type { ActionResult } from '@/app/beheer/actions'

/**
 * Formulier rond een server action, dat de foutmelding van die action
 * toont en de knop uitschakelt terwijl hij loopt.
 *
 * Zonder dit zou een mislukte boeking er stil uitzien alsof hij gelukt is,
 * en bij geld is stil falen het slechtste wat je kunt doen.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  submitClassName = 'bg-jr-btn hover:bg-jr-btnhover text-white',
  resetOnSuccess = true,
  className = 'space-y-3',
}: {
  action: (formData: FormData) => Promise<ActionResult>
  children: React.ReactNode
  submitLabel: string
  submitClassName?: string
  resetOnSuccess?: boolean
  className?: string
}) {
  const [state, formAction, bezig] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => action(formData),
    null,
  )

  const gelukt = state?.ok === true

  return (
    <form
      action={formAction}
      className={className}
      // Na een gelukte actie het formulier leegmaken, zodat je niet per
      // ongeluk dezelfde boeking twee keer verstuurt.
      key={resetOnSuccess && gelukt ? 'leeg' : 'ingevuld'}
    >
      {children}

      {state?.ok === false && (
        <p
          role="alert"
          className="border-jr-red bg-jr-red/5 rounded border-l-4 p-2.5 text-sm"
        >
          {state.error}
        </p>
      )}

      {gelukt && (
        <p className="border-jr-green bg-jr-green/5 rounded border-l-4 p-2.5 text-sm">
          Opgeslagen.
        </p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className={`rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 ${submitClassName}`}
      >
        {bezig ? 'Bezig…' : submitLabel}
      </button>
    </form>
  )
}

/** Invoerveld met label, in de stijl van de rest van het beheerscherm. */
export function Field({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
  defaultValue,
  hint,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
  hint?: string
}) {
  const id = `veld-${name}-${label.replace(/\W+/g, '')}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-gray-600">
        {label}
        {!required && <span className="text-gray-400"> (optioneel)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="focus:border-jr-blue focus:ring-jr-blue/20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
