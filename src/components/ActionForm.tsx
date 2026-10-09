'use client'

import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import type { ActionResult } from '@/app/beheer/actions'
import { Paneel } from './Paneel'
import { useConcept } from './useConcept'

/**
 * Formulier rond een server action, dat de foutmelding van die action
 * toont en de knop uitschakelt terwijl hij loopt.
 *
 * Zonder dit zou een mislukte boeking er stil uitzien alsof hij gelukt is,
 * en bij geld is stil falen het slechtste wat je kunt doen.
 */
/** Een fout die de server niet netjes teruggaf: geen verbinding, of een nieuwe versie van het portaal. */
function foutTekst(error: unknown, formData?: FormData): string {
  /* Netlify weigert een verzoek boven 6 MB voordat het het portaal bereikt;
     de browser ziet dan alleen een mislukte verbinding. Zat er een groot
     bestand in het formulier, dan is dat bijna zeker de oorzaak. */
  let bytes = 0
  formData?.forEach((v) => {
    if (typeof v !== 'string') bytes += v.size
  })
  if (bytes > 4 * 1024 * 1024) {
    return `Het bestand is te groot om te versturen (${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB; maximaal 4 MB). Maak het kleiner, bijvoorbeeld op de Mac in Voorvertoning via Archief, Exporteer, Kwartsfilter "Verklein bestandsgrootte", en probeer het opnieuw.`
  }
  const bericht = error instanceof Error ? error.message : ''
  if (/server action/i.test(bericht)) {
    return 'Het portaal is net bijgewerkt naar een nieuwe versie. Herlaad de pagina en klik nog eens op opslaan. Wat je invulde, staat er na het herladen nog.'
  }
  return 'Opslaan lukte niet: geen verbinding met het portaal. Wat je invulde, staat er nog. Probeer het zo nog eens.'
}

/** Next gebruikt fouten om door te sturen (redirect, notFound); die moeten door. */
function isNextSignaal(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest
  return typeof digest === 'string' && digest.startsWith('NEXT_')
}

/** Labels van acties die je niet terugdraait; die vragen eerst om bevestiging. */
const ONOMKEERBAAR = /verwijder|^weg$|weghalen|wissen|stopzetten|ontkoppel|blokkeren|leegmaken/i

export function ActionForm({
  action,
  children,
  submitLabel,
  submitClassName = 'bg-jr-btn hover:bg-jr-btnhover text-white',
  resetOnSuccess = true,
  className = 'space-y-3',
  meldGelukt = true,
  bevestig,
  knopInRij = false,
  concept,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  children: React.ReactNode
  submitLabel: string
  submitClassName?: string
  resetOnSuccess?: boolean
  className?: string
  /** Uit voor kleine knoppen (verwijderen, wisselen): daar is het resultaat zelf de melding. */
  meldGelukt?: boolean
  /**
   * Vraag eerst om bevestiging. Standaard aan voor alles wat je niet
   * terugdraait (verwijderen, stopzetten, ontkoppelen, blokkeren); met
   * false zet je het uit.
   */
  bevestig?: boolean
  /** De knop als laatste kolom op dezelfde regel, in een raster dat daar een kolom voor heeft. */
  knopInRij?: boolean
  /**
   * Bewaar wat er is ingevuld ook in de browser, tot het is opgeslagen. Voor
   * lange formulieren: mislukt opslaan of herlaad je de pagina, dan staat het
   * er nog. `versie` is wanneer het formulier op de server veranderde; een
   * concept van een oudere versie wordt niet teruggezet.
   */
  concept?: { sleutel: string; versie: string }
}) {
  const vragen = bevestig ?? ONOMKEERBAAR.test(submitLabel)
  const [zeker, setZeker] = useState(false)
  useEffect(() => {
    if (!zeker) return
    const t = setTimeout(() => setZeker(false), 4000)
    return () => clearTimeout(t)
  }, [zeker])

  const [state, formAction, bezig] = useActionState(async (_prev: ActionResult | null, formData: FormData): Promise<ActionResult> => {
    try {
      return await action(formData)
    } catch (error) {
      if (isNextSignaal(error)) throw error
      console.error('[formulier] opslaan mislukt:', error)
      return { ok: false, error: foutTekst(error, formData) }
    }
  }, null)

  const gelukt = state?.ok === true
  const formulier = useRef<HTMLFormElement>(null)

  const { teruggezet, bewaar: bewaarConcept, gooiWeg } = useConcept(formulier, concept, state?.ok ? state : null)

  return (
    <form
      ref={formulier}
      onInput={concept ? bewaarConcept : undefined}
      onChange={concept ? bewaarConcept : undefined}
      onSubmit={(e) => {
        // Zelf versturen in plaats van via action={…}: dan zet React het formulier na
        // afloop niet terug. Mislukt opslaan, dan blijft staan wat je invulde.
        e.preventDefault()
        // Eerste klik: vragen. Tweede klik binnen vier seconden: uitvoeren.
        if (vragen && !zeker) {
          setZeker(true)
          return
        }
        setZeker(false)
        const submitter = (e.nativeEvent as SubmitEvent).submitter
        const data = new FormData(e.currentTarget, submitter instanceof HTMLElement ? submitter : null)
        startTransition(() => formAction(data))
      }}
      className={className}
      // Na een gelukte actie het formulier leegmaken, zodat je niet per
      // ongeluk dezelfde boeking twee keer verstuurt.
      key={resetOnSuccess && gelukt ? 'leeg' : 'ingevuld'}
    >
      {teruggezet && !gelukt && (
        <p className="col-span-full rounded-lg border-l-4 border-jr-orange bg-jr-orange/10 px-4 py-3 text-sm">
          Wat je op {teruggezet.toLocaleString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} invulde maar nog niet
          opsloeg, staat er weer in. Klik op {submitLabel.toLowerCase()} om het te bewaren.{' '}
          <button
            type="button"
            className="text-jr-link font-medium hover:underline"
            onClick={gooiWeg}
          >
            Weggooien
          </button>
        </p>
      )}

      {children}

      {state?.ok === false && (
        <p
          role="alert"
          className="col-span-full rounded-lg bg-[#FDECEA] px-4 py-3 text-sm text-[#C02A22]"
        >
          {state.error}
        </p>
      )}

      {gelukt && meldGelukt && (
        <p className="col-span-full rounded-lg bg-[#E6F7EB] px-4 py-3 text-sm text-[#1D7D3F]">
          Opgeslagen.
        </p>
      )}

      <button
        type="submit"
        disabled={bezig}
        // In een raster van twee kolommen een eigen regel en niet uitgerekt
        // over de cel: een knop zo breed als een veld leest als een veld.
        className={`${knopInRij ? '' : 'col-span-full justify-self-start'} min-h-10 rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-40 ${submitClassName} ${zeker ? '!bg-[#C02A22] !text-white' : ''}`}
      >
        {bezig ? 'Bezig…' : zeker ? 'Zeker weten? Klik nog eens' : submitLabel}
      </button>
      {zeker && (
        <span role="status" className="sr-only">
          Klik nog eens om te bevestigen
        </span>
      )}
    </form>
  )
}

/** Aanvinkveld, voor ja-of-nee zonder dat er een waarde bij hoort. */
export function Check({
  label,
  name,
  hint,
  defaultChecked = false,
}: {
  label: string
  name: string
  hint?: string
  defaultChecked?: boolean
}) {
  const id = `check-${name}-${label.replace(/\W+/g, '')}`
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2.5 text-[15px]">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="accent-jr-blue mt-0.5 h-[18px] w-[18px] shrink-0"
        />
        <span>{label}</span>
      </label>
      {hint && <p className="mt-1 ml-7 text-xs text-gray-600">{hint}</p>}
    </div>
  )
}

/** Keuzelijst met label. */
export function Select({
  label,
  name,
  options,
  defaultValue,
  hint,
}: {
  label: string
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string
  hint?: string
}) {
  const id = `select-${name}-${label.replace(/\W+/g, '')}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-jr-text">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1.5 text-xs text-gray-600">{hint}</p>}
    </div>
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
  markeerOptioneel = true,
  autoComplete,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
  hint?: string
  /**
   * "(optioneel)" achter het label. Uit in formulieren waar alles optioneel
   * is: daar zegt het niets en duwt het labels naar een tweede regel.
   */
  markeerOptioneel?: boolean
  autoComplete?: string
}) {
  const id = `veld-${name}-${label.replace(/\W+/g, '')}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-jr-text">
        {label}
        {!required && markeerOptioneel && <span className="font-normal text-gray-500"> (optioneel)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
      />
      {hint && <p className="mt-1.5 text-xs text-gray-600">{hint}</p>}
    </div>
  )
}

/** Meerregelig invoerveld, voor notities die niet op één regel passen. */
export function TextArea({
  label,
  name,
  rows = 4,
  placeholder,
  defaultValue,
  hint,
}: {
  label: string
  name: string
  rows?: number
  placeholder?: string
  defaultValue?: string
  hint?: string
}) {
  const id = `tekst-${name}-${label.replace(/\W+/g, '')}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-jr-text">
        {label}
        <span className="font-normal text-gray-500"> (optioneel)</span>
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
      />
      {hint && <p className="mt-1.5 text-xs text-gray-600">{hint}</p>}
    </div>
  )
}

/**
 * Een formulier dat pas verschijnt als je erom vraagt, in een paneel van rechts.
 *
 * De lijst blijft leesbaar — je kijkt meestal, je wijzigt zelden — en het
 * formulier zit er wel bij in plaats van op een aparte pagina. Zonder deze
 * uitklap staat elk scherm vol met velden die je bijna nooit nodig hebt.
 */
export function Uitklap({
  label,
  children,
  className = 'mt-2',
  titel,
  uitleg,
  inline = false,
}: {
  label: string
  children: React.ReactNode
  className?: string
  /** De kop van het paneel; standaard het label. */
  titel?: string
  uitleg?: string
  /** Echt uitklappen op de plek zelf, voor "meer velden" binnen een formulier. */
  inline?: boolean
}) {
  if (inline) {
    return (
      <details className={className}>
        <summary className="text-jr-link cursor-pointer text-sm font-medium select-none hover:underline">{label}</summary>
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-5">{children}</div>
      </details>
    )
  }
  // Toevoegen en wijzigen gebeurt overal in een paneel van rechts: de lijst
  // blijft rustig en het formulier heeft de ruimte.
  return (
    <div className={className}>
      <Paneel knop={label} stijl="link" titel={titel ?? label} uitleg={uitleg}>
        {children}
      </Paneel>
    </div>
  )
}
