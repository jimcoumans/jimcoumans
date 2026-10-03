'use client'

import { useId, useState } from 'react'
import { ActionForm } from '@/components/ActionForm'
import { bewaarKnop } from '@/app/beheer/merk-actions'
import { GEWICHTEN, TOESTANDEN, hexUit, knopCss, type Knop, type Tekststijl, type Toestand } from '@/lib/stylesheet'
import { KleurVeld, type Merkkleur } from './KleurVeld'
import { useLaadFont } from './LaadFont'

const INVOER = 'min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400'
const LABEL = 'text-jr-text mb-1.5 block text-[13px] font-medium'

type Kleuren = Record<Toestand, { bg: string; tekst: string; rand: string }>

/** De knop in drie toestanden, met een voorbeeld dat je ook echt kunt aanwijzen en indrukken. */
export function KnopBewerker({
  organizationId,
  slug,
  huidig,
  label,
  fontNamen,
  merkkleuren,
}: {
  organizationId: string
  slug: string
  huidig: Knop | null
  label: Tekststijl | null
  fontNamen: string[]
  merkkleuren: Merkkleur[]
}) {
  const id = useId()
  const [familie, setFamilie] = useState(huidig?.fontFamily ?? '')
  const [gewicht, setGewicht] = useState(huidig?.weight ? String(huidig.weight) : '')
  const [grootte, setGrootte] = useState(huidig?.sizePx ? String(huidig.sizePx) : '')
  const [radius, setRadius] = useState(huidig?.radiusPx !== null && huidig?.radiusPx !== undefined ? String(huidig.radiusPx) : '8')
  const [hoofdletters, setHoofdletters] = useState(huidig?.uppercase ?? false)
  const [kleuren, setKleuren] = useState<Kleuren>(() => {
    const k = huidig?.kleuren
    const uit = (t: Toestand) => ({ bg: k?.[t].bg ?? '', tekst: k?.[t].tekst ?? '', rand: k?.[t].rand ?? '' })
    return { normal: uit('normal'), hover: uit('hover'), active: uit('active') }
  })
  const [aanwijzen, setAanwijzen] = useState<Toestand>('normal')
  useLaadFont(familie || label?.fontFamily || '', Number(gewicht) || label?.weight || 600, false)

  const zet = (t: Toestand, veld: 'bg' | 'tekst' | 'rand', v: string) => setKleuren((oud) => ({ ...oud, [t]: { ...oud[t], [veld]: v } }))
  const knop: Knop = {
    fontFamily: familie.trim() || null,
    weight: Number(gewicht) || null,
    sizePx: Number(grootte) || null,
    uppercase: hoofdletters,
    radiusPx: radius === '' ? null : Number(radius),
    kleuren: {
      normal: { bg: hexUit(kleuren.normal.bg), tekst: hexUit(kleuren.normal.tekst), rand: hexUit(kleuren.normal.rand) },
      hover: { bg: hexUit(kleuren.hover.bg), tekst: hexUit(kleuren.hover.tekst), rand: hexUit(kleuren.hover.rand) },
      active: { bg: hexUit(kleuren.active.bg), tekst: hexUit(kleuren.active.tekst), rand: hexUit(kleuren.active.rand) },
    },
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          {TOESTANDEN.map(({ toestand, label: naam }) => (
            <div key={toestand}>
              <span style={knopCss(knop, toestand, label)}>Reserveer</span>
              <p className="mt-2 text-xs text-gray-600">{naam}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-gray-200 pt-4 text-center">
          <button
            type="button"
            onMouseEnter={() => setAanwijzen('hover')}
            onMouseLeave={() => setAanwijzen('normal')}
            onMouseDown={() => setAanwijzen('active')}
            onMouseUp={() => setAanwijzen('hover')}
            style={knopCss(knop, aanwijzen, label)}
          >
            Probeer mij
          </button>
          <p className="mt-2 text-xs text-gray-500">Wijs aan en klik: zo reageert de knop.</p>
        </div>
      </div>

      <ActionForm action={bewaarKnop} submitLabel="Opslaan" resetOnSuccess={false} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="slug" value={slug} />

        <div>
          <label htmlFor={`${id}-f`} className={LABEL}>
            Lettertype <span className="font-normal text-gray-400">(leeg is zoals Label)</span>
          </label>
          <input id={`${id}-f`} name="fontFamily" list={`${id}-l`} value={familie} onChange={(e) => setFamilie(e.target.value)} placeholder={label?.fontFamily ?? 'Inter'} autoComplete="off" className={INVOER} />
          <datalist id={`${id}-l`}>
            {fontNamen.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={`${id}-w`} className={LABEL}>
            Gewicht
          </label>
          <select id={`${id}-w`} name="weight" value={gewicht} onChange={(e) => setGewicht(e.target.value)} className={INVOER}>
            <option value="">Zoals Label</option>
            {GEWICHTEN.map((g) => (
              <option key={g.waarde} value={g.waarde}>
                {g.naam} ({g.waarde})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-s`} className={LABEL}>
            Grootte in pixels
          </label>
          <input id={`${id}-s`} name="sizePx" inputMode="numeric" value={grootte} onChange={(e) => setGrootte(e.target.value)} placeholder={String(label?.sizePx ?? 15)} className={INVOER} />
        </div>
        <div>
          <label htmlFor={`${id}-r`} className={LABEL}>
            Afronding in pixels
          </label>
          <input id={`${id}-r`} name="radiusPx" inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value)} className={INVOER} />
          <p className="mt-1.5 text-xs text-gray-600">0 is hoekig, 999 is helemaal rond.</p>
        </div>
        <label className="flex items-center gap-2.5 text-[15px] sm:col-span-2">
          <input type="checkbox" name="uppercase" checked={hoofdletters} onChange={(e) => setHoofdletters(e.target.checked)} className="h-[18px] w-[18px]" />
          Tekst in hoofdletters
        </label>

        {TOESTANDEN.map(({ toestand, label: naam, uitleg }) => (
          <fieldset key={toestand} className="grid gap-4 border-t border-gray-200 pt-5 sm:col-span-2 sm:grid-cols-3">
            <legend className="sr-only">{naam}</legend>
            <div className="sm:col-span-3 -mt-1">
              <p className="text-[15px] font-semibold">{naam}</p>
              <p className="text-xs text-gray-600">{uitleg}</p>
            </div>
            <KleurVeld label="Achtergrond" name={`${toestand}Bg`} waarde={kleuren[toestand].bg} onWaarde={(v) => zet(toestand, 'bg', v)} merkkleuren={merkkleuren} />
            <KleurVeld label="Tekst" name={`${toestand}Text`} waarde={kleuren[toestand].tekst} onWaarde={(v) => zet(toestand, 'tekst', v)} merkkleuren={merkkleuren} />
            <KleurVeld label="Rand" name={`${toestand}Border`} waarde={kleuren[toestand].rand} onWaarde={(v) => zet(toestand, 'rand', v)} merkkleuren={merkkleuren} optioneel />
          </fieldset>
        ))}
      </ActionForm>
    </div>
  )
}
