'use client'

import { useState } from 'react'
import { ActionForm, Field } from './ActionForm'
import { formatCents } from '@/lib/money'
import { parseQuantityToHundredths, lineTotalCents, unitShort } from '@/lib/quantity'
import type { ActionResult } from '@/app/beheer/actions'
import type { Service } from '@/db/schema'

/**
 * Een geleverde dienst afboeken.
 *
 * Het bedrag onderaan is alleen een voorbeeld van wat er geboekt wordt; de
 * server rekent het opnieuw uit aan de hand van de dienst en het aantal.
 * Zo kan een aangepast getal in de browser nooit een verkeerd bedrag in het
 * grootboek zetten.
 */
export function BookServiceForm({
  action,
  walletId,
  slug,
  services,
  staff,
  vandaag,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  walletId: string
  slug: string
  services: Service[]
  staff: { id: string; name: string | null; email: string }[]
  vandaag: string
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [aantal, setAantal] = useState('1')
  const [tarief, setTarief] = useState('')

  const dienst = services.find((s) => s.id === serviceId)
  const voorbeeld = berekenVoorbeeld(dienst, aantal, tarief)

  if (services.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        Er zijn nog geen actieve diensten.{' '}
        <a href="/beheer/diensten" className="text-jr-blue hover:underline">
          Voeg eerst een dienst toe
        </a>
        , bijvoorbeeld &ldquo;Social media post&rdquo; van &euro; 100.
      </p>
    )
  }

  return (
    <ActionForm action={action} submitLabel="Afboeken" className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="walletId" value={walletId} />
      <input type="hidden" name="slug" value={slug} />

      <div className="sm:col-span-2">
        <label htmlFor={`dienst-${walletId}`} className="mb-1 block text-xs text-gray-600">
          Dienst
        </label>
        <select
          id={`dienst-${walletId}`}
          name="serviceId"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {formatCents(s.unitPriceCents)} / {unitShort[s.unit]}
              {s.category ? ` · ${s.category}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`aantal-${walletId}`} className="mb-1 block text-xs text-gray-600">
          Aantal {dienst && <span className="text-gray-400">({unitShort[dienst.unit]})</span>}
        </label>
        <input
          id={`aantal-${walletId}`}
          name="aantal"
          value={aantal}
          onChange={(e) => setAantal(e.target.value)}
          inputMode="decimal"
          placeholder="1"
          className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        />
      </div>

      <div>
        <label htmlFor={`tarief-${walletId}`} className="mb-1 block text-xs text-gray-600">
          Afwijkend tarief <span className="text-gray-400">(optioneel)</span>
        </label>
        <input
          id={`tarief-${walletId}`}
          name="tarief"
          value={tarief}
          onChange={(e) => setTarief(e.target.value)}
          placeholder={dienst ? (dienst.unitPriceCents / 100).toFixed(2).replace('.', ',') : ''}
          className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        />
      </div>

      <div>
        <label
          htmlFor={`geleverd-${walletId}`}
          className="mb-1 block text-xs text-gray-600"
        >
          Geleverd door <span className="text-gray-400">(optioneel)</span>
        </label>
        <select
          id={`geleverd-${walletId}`}
          name="geleverdDoor"
          defaultValue=""
          className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        >
          <option value="">Niet ingevuld</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? s.email}
            </option>
          ))}
        </select>
      </div>

      <Field label="Datum" name="datum" type="date" defaultValue={vandaag} />

      <div className="sm:col-span-2">
        <Field
          label="Andere omschrijving"
          name="omschrijving"
          placeholder={dienst?.name}
          hint="Leeg laten neemt de naam van de dienst. Dit leest de klant."
        />
      </div>

      <div className="sm:col-span-2">
        <Field label="Toelichting" name="toelichting" placeholder="Wat er precies is gedaan" />
      </div>

      <div className="bg-jr-lightblue sm:col-span-2 rounded-lg px-3 py-2.5 text-sm">
        {voorbeeld === null ? (
          <span className="text-gray-600">Vul een geldig aantal in.</span>
        ) : (
          <>
            Gaat van het budget af:{' '}
            <strong className="tabular font-normal">{formatCents(voorbeeld.totaal)}</strong>
            <span className="text-gray-600">
              {' '}
              ({voorbeeld.aantalTekst} × {formatCents(voorbeeld.tarief)})
            </span>
          </>
        )}
      </div>
    </ActionForm>
  )
}

function berekenVoorbeeld(
  dienst: Service | undefined,
  aantalRaw: string,
  tariefRaw: string,
): { totaal: number; tarief: number; aantalTekst: string } | null {
  if (!dienst) return null

  const aantal = parseQuantityToHundredths(aantalRaw || '1')
  if (aantal === null) return null

  let tarief = dienst.unitPriceCents
  const getypt = tariefRaw.trim()
  if (getypt !== '') {
    const cents = parseAmount(getypt)
    if (cents === null || cents <= 0) return null
    tarief = cents
  }

  try {
    return {
      totaal: lineTotalCents(aantal, tarief),
      tarief,
      aantalTekst: `${(aantal / 100).toLocaleString('nl-NL')} ${unitShort[dienst.unit]}`,
    }
  } catch {
    return null
  }
}

/** Kleine kopie van parseAmountToCents, zodat dit component los blijft. */
function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[€\s]/g, '')
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  let body: string
  if (lastComma > lastDot) body = cleaned.replace(/\./g, '').replace(',', '.')
  else if (lastDot > lastComma) body = cleaned.replace(/,/g, '')
  else body = cleaned.replace(/[.,]/g, '')

  if (!/^\d+(\.\d+)?$/.test(body)) return null

  const dot = body.indexOf('.')
  const intPart = dot === -1 ? body : body.slice(0, dot)
  const frac = ((dot === -1 ? '' : body.slice(dot + 1)) + '000').slice(0, 3)

  let cents = Number(intPart) * 100 + Number(frac.slice(0, 2))
  if (Number(frac[2]) >= 5) cents += 1
  return Number.isSafeInteger(cents) ? cents : null
}
