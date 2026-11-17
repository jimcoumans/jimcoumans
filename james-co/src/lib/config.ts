/**
 * Omgevingsconfiguratie. Sleutels komen alleen uit environment variables;
 * zakelijke instellingen (prijs, service-uren, WhatsApp-nummer, bedrijfsgegevens)
 * staan in app_settings en worden server-side gevalideerd (zie domain/settings.ts).
 */
export type AppEnv = 'development' | 'demo' | 'test' | 'production'

export function appEnv(): AppEnv {
  const v = process.env.APP_ENV
  if (v === 'demo' || v === 'test' || v === 'production' || v === 'development') return v
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

export const isDemo = () => appEnv() === 'demo'

export function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3100').replace(/\/$/, '')
}

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) throw new Error('SESSION_SECRET ontbreekt of is korter dan 32 tekens.')
  return s
}

/** MFA voor staff: in productie altijd verplicht; daarbuiten standaard ook, uit te zetten voor lokaal werk. */
export function staffMfaRequired(): boolean {
  if (appEnv() === 'production') return true
  return process.env.STAFF_MFA_REQUIRED !== 'false'
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)
}

/** Zonder e-mailprovider mogen inloglinks alleen buiten productie naar de serverconsole. */
export function devMailToConsole(): boolean {
  return appEnv() !== 'production' && !emailConfigured()
}
