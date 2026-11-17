/** Geld is altijd een geheel aantal minor units (centen). Nooit floats opslaan. */

export type TaxSplit = { netMinor: number; taxMinor: number; grossMinor: number }

/** Splitst een bedrag in netto/btw/bruto. Afronding op de btw (half-up), netto = bruto - btw. */
export function splitTax(amountMinor: number, taxRateBp: number, includesTax: boolean): TaxSplit {
  assertMinor(amountMinor)
  if (!Number.isInteger(taxRateBp) || taxRateBp < 0 || taxRateBp > 10000) throw new Error('invalid_tax_rate')
  if (includesTax) {
    const gross = amountMinor
    const net = Math.round((gross * 10000) / (10000 + taxRateBp))
    return { netMinor: net, taxMinor: gross - net, grossMinor: gross }
  }
  const net = amountMinor
  const tax = Math.round((net * taxRateBp) / 10000)
  return { netMinor: net, taxMinor: tax, grossMinor: net + tax }
}

export function assertMinor(v: number): void {
  if (!Number.isSafeInteger(v) || v < 0) throw new Error('invalid_amount')
}

/** "350", "350,00", "1.250,50", "€ 1250.5" -> centen. Geeft null bij ongeldige invoer. */
export function parseEuroInput(input: string | null | undefined): number | null {
  if (input == null) return null
  let s = String(input).replace(/[€\s]/g, '').trim()
  if (!s) return null
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d+(,\d{1,2})$/.test(s)) s = s.replace(',', '.')
  else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const [whole, frac = ''] = s.split('.')
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

export function formatMoney(minor: number | null | undefined, currency = 'EUR', locale = 'nl-NL'): string {
  if (minor == null) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100)
}

export function sumMinor(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}
