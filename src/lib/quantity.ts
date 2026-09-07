/**
 * Aantallen worden opgeslagen in HONDERDSTEN, zodat 1,5 uur (= 150) en
 * 0,25 uur (= 25) kunnen zonder floats in de database.
 *
 * Het bedrag van een boeking is aantal maal tarief. Dat rekenwerk staat
 * hier, op een plek, met tests: het bepaalt wat een klant betaalt.
 */

const nlAantal = new Intl.NumberFormat('nl-NL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** 150 -> "1,5"   300 -> "3" */
export function formatQuantity(hundredths: number): string {
  return nlAantal.format(hundredths / 100)
}

/**
 * Leest een getypt aantal en geeft honderdsten terug.
 * Accepteert "3", "1,5", "1.5", "0,25". Null bij onzin.
 */
export function parseQuantityToHundredths(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '')
  if (cleaned === '') return null
  if (cleaned.startsWith('-')) return null

  // Zelfde normalisatie als bij bedragen: het laatste scheidingsteken is
  // het decimaalteken.
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  let body: string
  if (lastComma > lastDot) {
    body = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    body = cleaned.replace(/,/g, '')
  } else {
    body = cleaned.replace(/[.,]/g, '')
  }

  if (!/^\d+(\.\d+)?$/.test(body)) return null

  const dot = body.indexOf('.')
  const intPart = dot === -1 ? body : body.slice(0, dot)
  const fracPart = dot === -1 ? '' : body.slice(dot + 1)

  if (intPart.length > 9) return null

  const frac = (fracPart + '000').slice(0, 3)
  let hundredths = Number(intPart) * 100 + Number(frac.slice(0, 2))
  if (Number(frac[2]) >= 5) hundredths += 1

  if (!Number.isSafeInteger(hundredths) || hundredths <= 0) return null
  return hundredths
}

/**
 * Bedrag van een boeking: aantal maal tarief, afgerond op hele centen.
 *
 * Bijvoorbeeld 3 social posts van 100 euro:
 *   300 honderdsten * 10000 cent / 100 = 30000 cent = 300 euro
 * Of 1,5 uur van 85 euro:
 *   150 * 8500 / 100 = 12750 cent = 127,50 euro
 */
export function lineTotalCents(
  quantityHundredths: number,
  unitPriceCents: number,
): number {
  if (!Number.isInteger(quantityHundredths) || quantityHundredths <= 0) {
    throw new RangeError(`Ongeldig aantal: ${quantityHundredths}`)
  }
  if (!Number.isInteger(unitPriceCents) || unitPriceCents <= 0) {
    throw new RangeError(`Ongeldig tarief: ${unitPriceCents}`)
  }

  // Eerst vermenigvuldigen, dan delen: zo gaat er geen precisie verloren.
  const total = Math.round((quantityHundredths * unitPriceCents) / 100)

  if (!Number.isSafeInteger(total)) {
    throw new RangeError('Bedrag is te groot om exact te berekenen.')
  }
  return total
}

export const unitLabels = {
  piece: 'per stuk',
  hour: 'per uur',
  month: 'per maand',
  project: 'per project',
} as const

export const unitShort = {
  piece: 'st',
  hour: 'uur',
  month: 'mnd',
  project: 'project',
} as const
