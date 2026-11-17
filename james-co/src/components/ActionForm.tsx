'use client'

/**
 * Formulier voor server actions zonder automatische reset: bij een fout of
 * netwerkfout blijft de invoer staan. Tijdens verzenden is het formulier
 * uitgeschakeld (dubbele-submitpreventie); een idempotency key gaat mee
 * zodat ook een herhaalde poging geen dubbel record maakt.
 * Optioneel bewaart draftKey de tekstvelden in sessionStorage tegen refresh.
 */
import { useEffect, useRef, useState, useTransition } from 'react'
import type { FormState } from '@/app/actions/state'

type Props = {
  action: (fd: FormData) => Promise<FormState | void>
  children: React.ReactNode
  className?: string
  idempotent?: boolean
  draftKey?: string
  resetOnSuccess?: boolean
  successMessage?: string
  submitLabel?: string
  pendingLabel?: string
  submitClassName?: string
  hideSubmit?: boolean
  confirm?: string
}

function newKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

export function ActionForm({ action, children, className, idempotent, draftKey, resetOnSuccess, successMessage, submitLabel = 'Opslaan', pendingLabel = 'Bezig…', submitClassName = 'btn-primary', hideSubmit, confirm }: Props) {
  const [state, setState] = useState<FormState>(null)
  const [pending, start] = useTransition()
  // Eén sleutel per poging tot succes: een herhaalde poging na een fout hergebruikt hem.
  const keyRef = useRef<string | null>(null)
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!draftKey || !ref.current) return
    try {
      const raw = sessionStorage.getItem(`draft:${draftKey}`)
      if (!raw) return
      const saved = JSON.parse(raw) as Record<string, string>
      for (const [name, value] of Object.entries(saved)) {
        const el = ref.current.elements.namedItem(name)
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          if (el.type !== 'hidden' && el.type !== 'checkbox' && el.type !== 'radio') el.value = value
        }
      }
    } catch { /* geen opslag beschikbaar */ }
  }, [draftKey])

  function saveDraft() {
    if (!draftKey || !ref.current) return
    try {
      const out: Record<string, string> = {}
      for (const el of Array.from(ref.current.elements)) {
        const input = el as HTMLInputElement
        if (input.name && input.type !== 'hidden' && input.type !== 'checkbox' && input.type !== 'radio' && input.value) out[input.name] = input.value
      }
      sessionStorage.setItem(`draft:${draftKey}`, JSON.stringify(out))
    } catch { /* negeren */ }
  }

  return (
    <form
      ref={ref}
      className={className}
      onChange={saveDraft}
      onSubmit={(e) => {
        e.preventDefault()
        if (pending) return
        if (confirm && !window.confirm(confirm)) return
        const fd = new FormData(e.currentTarget)
        if (idempotent) {
          keyRef.current ??= newKey()
          fd.set('idempotencyKey', keyRef.current)
        }
        start(async () => {
          try {
            const r = await action(fd)
            const next = r ?? { ok: true }
            setState(next)
            if (next?.ok) {
              if (draftKey) try { sessionStorage.removeItem(`draft:${draftKey}`) } catch { /* */ }
              if (resetOnSuccess) ref.current?.reset()
              keyRef.current = null
            }
          } catch {
            setState({ error: 'De verbinding is mislukt. Uw invoer is bewaard; probeer het opnieuw.' })
          }
        })
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
        {state?.error && <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        {state?.ok && (state.message || successMessage) && <p role="status" className="mt-3 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">{state.message ?? successMessage}</p>}
        {!hideSubmit && (
          <div className="mt-4">
            <button type="submit" className={submitClassName} aria-busy={pending}>{pending ? pendingLabel : submitLabel}</button>
          </div>
        )}
      </fieldset>
    </form>
  )
}
