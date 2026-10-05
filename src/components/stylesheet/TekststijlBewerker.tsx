'use client'

import { useId, useState } from 'react'
import { ActionForm } from '@/components/ActionForm'
import { bewaarTekststijl } from '@/app/beheer/merk-actions'
import { GEWICHTEN, tekstCss, tekstOmschrijving, tekststijlUit, type TekstRol, type Tekststijl } from '@/lib/stylesheet'
import { KleurVeld, type Merkkleur } from './KleurVeld'
import { useLaadFont } from './LaadFont'

const INVOER = 'min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400'
const LABEL = 'text-jr-text mb-1.5 block text-[13px] font-medium'

/**
 * Eén tekststijl instellen, met bovenaan het voorbeeld dat meeverandert
 * terwijl je typt: Inter Bold Italic 80px staat er dan ook zo.
 */
export function TekststijlBewerker({
  organizationId,
  slug,
  rol,
  voorbeeld,
  huidig,
  start,
  fontNamen,
  merkkleuren,
}: {
  organizationId: string
  slug: string
  rol: TekstRol
  voorbeeld: string
  huidig: Tekststijl | null
  start: Tekststijl
  fontNamen: string[]
  merkkleuren: Merkkleur[]
}) {
  const s = huidig ?? start
  const [familie, setFamilie] = useState(s.fontFamily)
  const [gewicht, setGewicht] = useState(String(s.weight))
  const [cursief, setCursief] = useState(s.italic)
  const [grootte, setGrootte] = useState(String(s.sizePx))
  const [regel, setRegel] = useState(String(s.lineHeightPct / 100).replace('.', ','))
  const [afstand, setAfstand] = useState(String(s.trackingTenths / 10).replace('.', ','))
  const [hoofdletters, setHoofdletters] = useState(s.uppercase)
  const [kleur, setKleur] = useState(s.colorHex ?? '')
  const [tekst, setTekst] = useState(voorbeeld)
  const lijst = useId()

  const r = tekststijlUit({
    fontFamily: familie,
    weight: gewicht,
    italic: cursief ? 'on' : '',
    sizePx: grootte,
    lineHeight: regel,
    tracking: afstand,
    uppercase: hoofdletters ? 'on' : '',
    colorHex: kleur,
  })
  // Bij een half ingetypte waarde houden we het laatste goede voorbeeld vast.
  const [laatsteGoed, setLaatsteGoed] = useState<Tekststijl>(s)
  if (r.ok && JSON.stringify(r.stijl) !== JSON.stringify(laatsteGoed)) setLaatsteGoed(r.stijl)
  useLaadFont(familie, Number(gewicht), cursief)

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="max-h-[320px] overflow-auto bg-white px-5 py-6">
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setTekst(e.currentTarget.textContent || voorbeeld)}
            className="break-words outline-none"
            style={tekstCss(laatsteGoed)}
            title="Klik om de voorbeeldtekst aan te passen"
          >
            {tekst}
          </p>
        </div>
        <p className="tabular border-t border-gray-200 bg-gray-50 px-5 py-2 text-xs text-gray-600">
          {tekstOmschrijving(laatsteGoed)}
          {!r.ok && <span className="text-[#C02A22]"> · {r.fout}</span>}
        </p>
      </div>

      <ActionForm action={bewaarTekststijl} submitLabel="Opslaan" resetOnSuccess={false} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="rol" value={rol} />

        <div className="sm:col-span-2">
          <label htmlFor={`${lijst}-f`} className={LABEL}>
            Lettertype
          </label>
          <input
            id={`${lijst}-f`}
            name="fontFamily"
            list={lijst}
            value={familie}
            onChange={(e) => setFamilie(e.target.value)}
            placeholder="Inter"
            autoComplete="off"
            className={INVOER}
          />
          <datalist id={lijst}>
            {fontNamen.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          <p className="mt-1.5 text-xs text-gray-600">
            Staat het op Google Fonts, dan zie je het meteen. Een eigen of betaald font zie je zodra het fontbestand in de
            merkkluis staat.
          </p>
        </div>

        <div>
          <label htmlFor={`${lijst}-w`} className={LABEL}>
            Gewicht
          </label>
          <select id={`${lijst}-w`} name="weight" value={gewicht} onChange={(e) => setGewicht(e.target.value)} className={INVOER}>
            {GEWICHTEN.map((g) => (
              <option key={g.waarde} value={g.waarde}>
                {g.naam} ({g.waarde})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${lijst}-s`} className={LABEL}>
            Grootte in pixels
          </label>
          <input id={`${lijst}-s`} name="sizePx" inputMode="numeric" value={grootte} onChange={(e) => setGrootte(e.target.value)} className={INVOER} />
        </div>
        <div>
          <label htmlFor={`${lijst}-r`} className={LABEL}>
            Regelhoogte
          </label>
          <input id={`${lijst}-r`} name="lineHeight" value={regel} onChange={(e) => setRegel(e.target.value)} className={INVOER} />
          <p className="mt-1.5 text-xs text-gray-600">Als factor (1,2), procent (120%) of pixels (88px).</p>
        </div>
        <div>
          <label htmlFor={`${lijst}-t`} className={LABEL}>
            Letterafstand in procenten
          </label>
          <input id={`${lijst}-t`} name="tracking" inputMode="decimal" value={afstand} onChange={(e) => setAfstand(e.target.value)} className={INVOER} />
          <p className="mt-1.5 text-xs text-gray-600">0 is normaal; koppen vaak -1 of -2.</p>
        </div>

        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <label className="flex items-center gap-2.5 text-[15px]">
            <input type="checkbox" name="italic" checked={cursief} onChange={(e) => setCursief(e.target.checked)} className="h-[18px] w-[18px]" />
            Cursief
          </label>
          <label className="flex items-center gap-2.5 text-[15px]">
            <input type="checkbox" name="uppercase" checked={hoofdletters} onChange={(e) => setHoofdletters(e.target.checked)} className="h-[18px] w-[18px]" />
            Alles in hoofdletters
          </label>
        </div>

        <div className="sm:col-span-2">
          <KleurVeld label="Kleur" name="colorHex" waarde={kleur} onWaarde={setKleur} merkkleuren={merkkleuren} optioneel />
        </div>
      </ActionForm>
    </div>
  )
}
