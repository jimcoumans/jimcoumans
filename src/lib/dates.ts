/** Datumweergave, altijd Nederlands. */

const kort = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const lang = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const maandJaar = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' })

/** 15 jan 2026 */
export function formatDate(date: Date): string {
  return kort.format(date)
}

/** 15 januari 2026 */
export function formatDateLong(date: Date): string {
  return lang.format(date)
}

/** januari 2026 - voor kopjes boven een maandgroep. */
export function formatMonth(date: Date): string {
  const text = maandJaar.format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Sleutel om boekingen per maand te groeperen. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** "vandaag", "gisteren", "3 dagen geleden", anders de datum. */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const dagen = Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000)

  if (dagen === 0) return 'vandaag'
  if (dagen === 1) return 'gisteren'
  if (dagen > 1 && dagen < 7) return `${dagen} dagen geleden`
  if (dagen < 0) return formatDate(date)
  return formatDate(date)
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}
