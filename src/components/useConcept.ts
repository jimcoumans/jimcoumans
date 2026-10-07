'use client'

import { useEffect, useState, type RefObject } from 'react'

/* -------------------------------------------------------------------------
   Een concept van een formulier in de browser: wat je invulde, tot het is
   opgeslagen. Mislukt opslaan of herlaad je de pagina, dan staat het er nog.
   `versie` is wanneer het formulier op de server veranderde; een concept van
   een oudere versie wordt niet teruggezet, zodat het nooit nieuwere gegevens
   overschrijft.
   ------------------------------------------------------------------------- */

type Veld = { naam: string; type: string; waarde: string; aan: boolean }

/** Wat er in het formulier staat, om als concept te bewaren. */
function leesVelden(form: HTMLFormElement): Veld[] {
  const velden: Veld[] = []
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) continue
    if (!el.name || el.type === 'hidden' || el.type === 'file' || el.type === 'submit' || el.type === 'password') continue
    const aan = el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') ? el.checked : false
    velden.push({ naam: el.name, type: el.type, waarde: el.value, aan })
  }
  return velden
}

function zetVelden(form: HTMLFormElement, velden: Veld[]) {
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) continue
    if (!el.name || el.type === 'hidden' || el.type === 'file') continue
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      const v = velden.find((x) => x.naam === el.name && x.waarde === el.value)
      if (v) el.checked = v.aan
    } else {
      const v = velden.find((x) => x.naam === el.name)
      if (v) el.value = v.waarde
    }
  }
}

function leesConcept(sleutel: string): { versie: string; om: number; velden: Veld[] } | null {
  try {
    const ruw = window.localStorage.getItem(sleutel)
    return ruw ? JSON.parse(ruw) : null
  } catch {
    return null
  }
}

function wisConcept(sleutel: string) {
  try {
    window.localStorage.removeItem(sleutel)
  } catch {
    /* niets te wissen */
  }
}

/** `opgeslagen` is de uitkomst van het laatste geslaagde opslaan (een nieuw object per keer), anders null. */
export function useConcept(form: RefObject<HTMLFormElement | null>, concept: { sleutel: string; versie: string } | undefined, opgeslagen: object | null) {
  const sleutel = concept ? `concept:${concept.sleutel}` : null
  const versie = concept?.versie
  const [teruggezet, setTeruggezet] = useState<Date | null>(null)

  useEffect(() => {
    if (!sleutel || !form.current) return
    const c = leesConcept(sleutel)
    if (!c) return
    if (c.versie !== versie) return wisConcept(sleutel)
    zetVelden(form.current, c.velden)
    setTeruggezet(new Date(c.om))
  }, [sleutel, versie, form])

  useEffect(() => {
    if (opgeslagen && sleutel) {
      wisConcept(sleutel)
      setTeruggezet(null)
    }
  }, [opgeslagen, sleutel])

  const bewaar = () => {
    if (!sleutel || !versie || !form.current) return
    try {
      window.localStorage.setItem(sleutel, JSON.stringify({ versie, om: Date.now(), velden: leesVelden(form.current) }))
    } catch {
      /* geen opslag in deze browser: dan zonder vangnet */
    }
  }

  const gooiWeg = () => {
    if (sleutel) wisConcept(sleutel)
    form.current?.reset()
    setTeruggezet(null)
  }

  return { teruggezet, bewaar, gooiWeg }
}
