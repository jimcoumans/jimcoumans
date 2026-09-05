/**
 * Geld is in dit project altijd een integer aantal centen.
 * Deze module is de enige plek waar geld naar tekst en terug gaat.
 *
 * Belangrijk: het omzetten van tekst naar centen gebeurt volledig met
 * integers, zonder tussenstap via een float. Een float kan 122,505 niet
 * exact bevatten, waardoor afronden onvoorspelbaar wordt en er centen
 * kunnen verdwijnen. Bij een grootboek is dat niet acceptabel.
 */

const nlEuro = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

/** 12250 -> "€ 122,50" */
export function formatCents(cents: number): string {
  return nlEuro.format(cents / 100)
}

/** Zelfde als formatCents, maar altijd met expliciet + of - ervoor. */
export function formatSignedCents(cents: number): string {
  const sign = cents > 0 ? '+ ' : cents < 0 ? '- ' : ''
  return sign + nlEuro.format(Math.abs(cents) / 100)
}

/** Voorkomt overflow bij absurd lange invoer. */
const MAX_DIGITS = 15

/**
 * Zet een door een mens getypt bedrag om naar centen.
 * Accepteert "122,50", "122.50", "1.234,56", "1,234.56", "€ 122,50" en "1234".
 * Rondt af op hele centen, halve centen naar boven.
 * Geeft null bij onzin, zodat de aanroeper een nette foutmelding kan geven.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[€\s ]/g, '')
  if (cleaned === '') return null

  const negative = cleaned.startsWith('-')
  let body = negative ? cleaned.slice(1) : cleaned

  const lastComma = body.lastIndexOf(',')
  const lastDot = body.lastIndexOf('.')

  // Het laatste scheidingsteken is het decimaalteken; eerdere zijn
  // duizendtalscheiders. Zo werkt zowel 1.234,56 als 1,234.56.
  if (lastComma > lastDot) {
    body = body.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    body = body.replace(/,/g, '')
  } else {
    // Geen scheidingsteken, of beide op dezelfde plek (onmogelijk).
    body = body.replace(/[.,]/g, '')
  }

  if (!/^\d+(\.\d+)?$/.test(body)) return null

  const dot = body.indexOf('.')
  const intPart = dot === -1 ? body : body.slice(0, dot)
  const fracPart = dot === -1 ? '' : body.slice(dot + 1)

  if (intPart.length > MAX_DIGITS) return null

  // Drie decimalen: twee voor de centen, de derde bepaalt de afronding.
  const frac = (fracPart + '000').slice(0, 3)

  let cents = Number(intPart) * 100 + Number(frac.slice(0, 2))
  if (Number(frac[2]) >= 5) cents += 1

  if (!Number.isSafeInteger(cents)) return null

  return negative ? -cents : cents
}

/**
 * Euro's als getal naar centen, voor waarden uit de ClickUp-API.
 * Gaat via de tekstweergave van het getal, zodat dezelfde exacte
 * integer-afronding wordt gebruikt als bij handmatige invoer.
 */
export function eurosToCents(euros: number): number {
  if (!Number.isFinite(euros)) {
    throw new TypeError(`Ongeldig bedrag uit externe bron: ${euros}`)
  }
  const cents = parseAmountToCents(euros.toString())
  if (cents === null) {
    throw new TypeError(`Bedrag kon niet worden omgezet naar centen: ${euros}`)
  }
  return cents
}
