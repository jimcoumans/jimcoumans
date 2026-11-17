import { DomainError, messageFor } from '@/lib/errors'

export type FormState = { ok?: boolean; error?: string; message?: string; data?: Record<string, string> } | null

export function errorState(e: unknown): FormState {
  if (isRedirectError(e)) throw e
  if (e instanceof DomainError && e.message && e.message !== e.code) return { error: e.message }
  if (!(e instanceof DomainError)) console.error('[action]', e instanceof Error ? `${e.name}: ${e.message}` : 'unknown error')
  return { error: messageFor(e) }
}

function isRedirectError(e: unknown): boolean {
  return Boolean(e && typeof e === 'object' && 'digest' in e && typeof (e as { digest: unknown }).digest === 'string' && ((e as { digest: string }).digest.startsWith('NEXT_REDIRECT') || (e as { digest: string }).digest.startsWith('NEXT_NOT_FOUND')))
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v : ''
}
