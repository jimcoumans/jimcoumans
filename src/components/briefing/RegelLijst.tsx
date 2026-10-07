'use client'

import { useEffect, useRef, useState } from 'react'
import type { ConceptPunt } from '@/lib/briefing-concept'

let teller = 0
/** Een sleutel voor een nieuwe regel in het scherm; de database geeft hem later een id. */
export function nieuweSleutel(): string {
  teller += 1
  return `n-${Date.now().toString(36)}-${teller}`
}

/** Een tekstvak dat meegroeit met wat erin staat. */
export function groei(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export const KLEIN_KNOPJE =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-30'

/** Omhoog, omlaag en weg, voor elke regel in een lijst. */
export function RegelKnoppen({
  volgorde,
  weg,
  wat,
}: {
  /** Weglaten als de volgorde vastligt, zoals in de tijdlijn (op datum). */
  volgorde?: { omhoog?: () => void; omlaag?: () => void }
  weg: () => void
  wat: string
}) {
  const omhoog = volgorde?.omhoog
  const omlaag = volgorde?.omlaag
  return (
    <span className="flex shrink-0 items-center opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
      {volgorde && (
        <button type="button" className={KLEIN_KNOPJE} onClick={omhoog} disabled={!omhoog} aria-label={`${wat} omhoog`} title="Omhoog">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M8 13V3m0 0L4 7m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {volgorde && (
        <button type="button" className={KLEIN_KNOPJE} onClick={omlaag} disabled={!omlaag} aria-label={`${wat} omlaag`} title="Omlaag">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M8 3v10m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <button type="button" className={`${KLEIN_KNOPJE} hover:!bg-[#FDECEA] hover:!text-[#C02A22]`} onClick={weg} aria-label={`${wat} weghalen`} title="Weghalen">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  )
}

/** Een element in een lijst verplaatsen; buiten de lijst gebeurt er niets. */
export function verplaats<T>(lijst: T[], van: number, naar: number): T[] {
  if (naar < 0 || naar >= lijst.length) return lijst
  const kopie = [...lijst]
  const [x] = kopie.splice(van, 1)
  kopie.splice(naar, 0, x as T)
  return kopie
}

/**
 * Een opmerkingenveld als losse regels. Enter maakt een nieuwe regel, Tab
 * zet hem in als subpunt, Backspace in een lege regel haalt hem weg. Plak je
 * tekst met meerdere regels, dan wordt elke regel een punt.
 */
export function RegelLijst({
  label,
  uitleg,
  punten,
  onChange,
  placeholder = 'Typ een punt',
  knop = 'Punt toevoegen',
}: {
  label: string
  uitleg?: string
  punten: ConceptPunt[]
  onChange: (punten: ConceptPunt[]) => void
  placeholder?: string
  knop?: string
}) {
  const velden = useRef(new Map<string, HTMLTextAreaElement>())
  const [focus, setFocus] = useState<{ sleutel: string; begin?: boolean } | null>(null)

  useEffect(() => {
    if (!focus) return
    const el = velden.current.get(focus.sleutel)
    if (el) {
      el.focus()
      const plek = focus.begin ? 0 : el.value.length
      el.setSelectionRange(plek, plek)
    }
    setFocus(null)
  }, [focus])

  const zet = (i: number, p: Partial<ConceptPunt>) => onChange(punten.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const voegToe = (na: number, tekst = '', sub = false) => {
    const nieuw = { sleutel: nieuweSleutel(), tekst, sub }
    onChange([...punten.slice(0, na + 1), nieuw, ...punten.slice(na + 1)])
    setFocus({ sleutel: nieuw.sleutel, begin: true })
  }
  const haalWeg = (i: number) => {
    const vorige = punten[i - 1] ?? punten[i + 1]
    onChange(punten.filter((_, j) => j !== i))
    if (vorige) setFocus({ sleutel: vorige.sleutel })
  }

  return (
    <div>
      <p className="text-jr-text mb-1.5 text-[13px] font-medium">{label}</p>
      {uitleg && <p className="-mt-1 mb-2 text-xs text-gray-600">{uitleg}</p>}
      {punten.length > 0 && (
        <ul className="mb-1.5 space-y-1">
          {punten.map((p, i) => (
            <li key={p.sleutel} className={`group flex items-start gap-1.5 ${p.sub && i > 0 ? 'pl-6' : ''}`}>
              <span aria-hidden="true" className={`mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full ${p.sub && i > 0 ? 'border border-gray-400' : 'bg-jr-blue'}`} />
              <textarea
                ref={(el) => {
                  if (el) {
                    velden.current.set(p.sleutel, el)
                    groei(el)
                  } else velden.current.delete(p.sleutel)
                }}
                rows={1}
                value={p.tekst}
                placeholder={placeholder}
                aria-label={`${label}, punt ${i + 1}`}
                onChange={(e) => {
                  groei(e.currentTarget)
                  zet(i, { tekst: e.currentTarget.value.replace(/\r?\n/g, ' ') })
                }}
                onPaste={(e) => {
                  const geplakt = e.clipboardData.getData('text')
                  if (!/\n/.test(geplakt.trim())) return
                  e.preventDefault()
                  const regels = geplakt
                    .split(/\r?\n/)
                    .map((r) => r.trim().replace(/^[-•*]\s*/, ''))
                    .filter(Boolean)
                  const el = e.currentTarget
                  const voor = p.tekst.slice(0, el.selectionStart)
                  const na = p.tekst.slice(el.selectionEnd)
                  const nieuw = regels.map((tekst) => ({ sleutel: nieuweSleutel(), tekst, sub: p.sub }))
                  nieuw[0]!.tekst = voor + nieuw[0]!.tekst
                  nieuw[nieuw.length - 1]!.tekst += na
                  nieuw[0]!.sleutel = p.sleutel
                  onChange([...punten.slice(0, i), ...nieuw, ...punten.slice(i + 1)])
                  setFocus({ sleutel: nieuw[nieuw.length - 1]!.sleutel })
                }}
                onKeyDown={(e) => {
                  const el = e.currentTarget
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    // De tekst na de cursor gaat mee naar de nieuwe regel.
                    const voor = p.tekst.slice(0, el.selectionStart)
                    const na = p.tekst.slice(el.selectionEnd)
                    const nieuw = { sleutel: nieuweSleutel(), tekst: na, sub: p.sub }
                    onChange([...punten.slice(0, i), { ...p, tekst: voor }, nieuw, ...punten.slice(i + 1)])
                    setFocus({ sleutel: nieuw.sleutel, begin: true })
                  } else if (e.key === 'Tab' && (e.shiftKey ? p.sub : i > 0 && !p.sub)) {
                    e.preventDefault()
                    zet(i, { sub: !e.shiftKey })
                  } else if (e.key === 'Backspace' && p.tekst === '' && punten.length > 0) {
                    e.preventDefault()
                    haalWeg(i)
                  } else if (e.key === 'ArrowUp' && el.selectionStart === 0 && i > 0) {
                    e.preventDefault()
                    setFocus({ sleutel: punten[i - 1]!.sleutel })
                  } else if (e.key === 'ArrowDown' && el.selectionEnd === p.tekst.length && i < punten.length - 1) {
                    e.preventDefault()
                    setFocus({ sleutel: punten[i + 1]!.sleutel, begin: true })
                  }
                }}
                className="min-h-9 flex-1 resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[15px] leading-snug outline-none hover:border-gray-200 focus:border-gray-300 focus:bg-white"
              />
              <RegelKnoppen
                wat="Punt"
                volgorde={{
                  omhoog: i > 0 ? () => onChange(verplaats(punten, i, i - 1)) : undefined,
                  omlaag: i < punten.length - 1 ? () => onChange(verplaats(punten, i, i + 1)) : undefined,
                }}
                weg={() => haalWeg(i)}
              />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => voegToe(punten.length - 1)}
        className="text-jr-link inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-gray-100"
      >
        <span aria-hidden="true" className="text-base leading-none">
          +
        </span>
        {knop}
      </button>
    </div>
  )
}
