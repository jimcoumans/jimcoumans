/**
 * Integratiecontracten. Een ongeconfigureerde adapter retourneert
 * { status: 'not_configured' } en simuleert nooit succes.
 * Demo-adapters bestaan niet in deze codebase: de demo-omgeving gebruikt
 * dezelfde handmatige routes met duidelijk fictieve data.
 */
import { emailConfigured } from '../config'

export type NotConfigured = { status: 'not_configured' }
export const NOT_CONFIGURED: NotConfigured = { status: 'not_configured' }

/** Reserveringen (later: Zenchef e.d. na overeenkomst). V1 = handmatige controle. */
export const reservations = {
  async checkAvailability(): Promise<NotConfigured> { return NOT_CONFIGURED },
  async createBooking(): Promise<NotConfigured> { return NOT_CONFIGURED },
  async getBooking(): Promise<NotConfigured> { return NOT_CONFIGURED },
  async cancelBooking(): Promise<NotConfigured> { return NOT_CONFIGURED },
}

/** WhatsApp Cloud API (P1). V1 = deeplink naar het zakelijke nummer, of verborgen. */
export const whatsappApi = {
  async sendMessage(): Promise<NotConfigured> { return NOT_CONFIGURED },
}

/** Betaalprovider (P1). V1 = handmatige ontvangstregistratie door admin. */
export const payments = {
  async createCheckout(): Promise<NotConfigured> { return NOT_CONFIGURED },
}

/** AI-triage/antwoordconcepten (P1). V1 = handmatige uitvoering. */
export const ai = {
  async draftReply(): Promise<NotConfigured> { return NOT_CONFIGURED },
}

export type IntegrationStatus = { key: string; label: string; status: 'configured' | 'not_configured' | 'manual'; note: string }

export function integrationStatuses(): IntegrationStatus[] {
  return [
    { key: 'email', label: 'E-mail (Resend)', status: emailConfigured() ? 'configured' : 'not_configured',
      note: emailConfigured() ? 'Transactionele mail actief.' : 'RESEND_API_KEY/MAIL_FROM ontbreken. Buiten productie gaat mail naar de lokale dev-mailbox.' },
    { key: 'whatsapp_api', label: 'WhatsApp Cloud API', status: 'not_configured', note: 'P1. Handmatige dossiervorming; knop alleen zichtbaar als het zakelijke nummer is ingesteld.' },
    { key: 'payments', label: 'Online betalen', status: 'manual', note: 'P1. Admin registreert ontvangsten handmatig met referentie.' },
    { key: 'reservations', label: 'Reserveringssystemen', status: 'manual', note: 'Handmatige beschikbaarheidscheck en bevestiging met bewijs.' },
    { key: 'ai', label: 'AI-concepten', status: 'not_configured', note: 'P1. Geen AI-uitvoer in V1.' },
  ]
}
