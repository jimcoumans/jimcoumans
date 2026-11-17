import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { sessionSecret } from './config'

/** 32 bytes = 256 bits entropie, base64url. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** Gesleutelde hash voor rate-limitsleutels (e-mail/IP), zodat ruwe waarden niet in de database staan. */
export function keyedHash(value: string): string {
  return createHmac('sha256', sessionSecret()).update(value).digest('hex').slice(0, 40)
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** Stabiele JSON (gesorteerde sleutels) voor snapshot-hashes. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`
}

export function snapshotHash(value: unknown): string {
  return sha256(stableStringify(value))
}
