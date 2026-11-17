/** Tijden worden in UTC opgeslagen; weergave en invoer in een IANA-tijdzone. */

export const DEFAULT_TZ = 'Europe/Amsterdam'

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** Offset (ms) van tz t.o.v. UTC op het gegeven moment. */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/**
 * Lokale wandkloktijd ('2026-03-29', '20:00') in tz -> UTC Date.
 * Werkt over zomertijdgrenzen heen. Een niet-bestaand tijdstip (02:30 op de
 * dag dat de klok vooruit gaat) wordt naar voren geschoven; bij een dubbel
 * tijdstip kiezen we het eerste voorkomen.
 */
export function zonedToUtc(dateStr: string, timeStr: string, tz: string = DEFAULT_TZ): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  const t = /^(\d{1,2}):(\d{2})$/.exec(timeStr)
  if (!m || !t) throw new Error('invalid_datetime')
  const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]))
  // Kandidaten met de offsets rond dit moment; geldig = terugrekenen geeft dezelfde wandkloktijd.
  const offsets = [...new Set([tzOffsetMs(new Date(naive - 86400_000), tz), tzOffsetMs(new Date(naive), tz), tzOffsetMs(new Date(naive + 86400_000), tz)])]
  const valid = offsets.map((o) => naive - o).filter((c) => c + tzOffsetMs(new Date(c), tz) === naive).sort((a, b) => a - b)
  if (valid.length) return new Date(valid[0]!)
  // Niet-bestaand tijdstip (zomertijdsprong): schuif op met de offset van vóór de sprong.
  return new Date(naive - Math.min(...offsets))
}

export function formatDateTime(d: Date | string | null | undefined, tz: string = DEFAULT_TZ, locale = 'nl-NL'): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function formatDate(d: Date | string | null | undefined, tz: string = DEFAULT_TZ, locale = 'nl-NL'): string {
  if (!d) return '—'
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, mo, da] = d.split('-').map(Number)
    return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', dateStyle: 'medium' }).format(new Date(Date.UTC(y!, mo! - 1, da!)))
  }
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat(locale, { timeZone: tz, dateStyle: 'medium' }).format(date)
}

/** Vandaag als 'YYYY-MM-DD' in tz. */
export function todayIn(tz: string = DEFAULT_TZ, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Huidige tijd in ms (los gehouden zodat server components niet direct Date.now() aanroepen). */
export function nowMs(): number {
  return Date.now()
}
