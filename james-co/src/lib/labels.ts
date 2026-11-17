export { STATUS_LABEL, CATEGORY_LABEL } from './domain/requests'

export const MEMBERSHIP_LABEL: Record<string, string> = {
  pending: 'In behandeling', offered: 'Aanbod ontvangen', accepted_pending_payment: 'Wacht op betaling', active: 'Actief',
  ending: 'Loopt af', ended: 'Beëindigd', declined: 'Afgewezen', suspended: 'Gepauzeerd',
}
export const APPLICATION_LABEL: Record<string, string> = {
  unverified: 'E-mail niet bevestigd', submitted: 'Ontvangen', in_review: 'In beoordeling', intro_scheduled: 'Kennismaking gepland',
  offered: 'Aanbod gedaan', accepted: 'Aanbod geaccepteerd', declined: 'Aanbod afgewezen', rejected: 'Niet passend', withdrawn: 'Ingetrokken',
}
export const BOOKING_LABEL: Record<string, string> = {
  pending: 'Nog te boeken', requested: 'Aangevraagd bij leverancier', confirmed: 'Bevestigd', failed: 'Niet gelukt',
  cancellation_requested: 'Annulering aangevraagd', cancelled: 'Geannuleerd',
}
export const PARTICIPATION_LABEL: Record<string, string> = {
  interested: 'Interesse gemeld', waitlisted: 'Wachtlijst', offered: 'Plek aangeboden', confirmed: 'Plek bevestigd', declined: 'Afgemeld', cancelled: 'Geannuleerd',
}
export const PAYMENT_ROUTE_LABEL: Record<string, string> = {
  pay_supplier_directly: 'U betaalt de leverancier rechtstreeks', invoice_via_james: 'Factuur via James & Co.', prepaid_by_member: 'Vooruitbetaling door u',
}
export const AVAILABILITY_LABEL: Record<string, string> = {
  checked_available: 'Beschikbaarheid gecontroleerd', tentative: 'Voorlopig, nog niet vastgelegd', to_be_checked: 'Nog te controleren na uw keuze',
}
export const BILLING_STATE_LABEL: Record<string, string> = {
  open: 'Openstaand', partially_paid: 'Deels ontvangen', paid: 'Ontvangen', overpaid: 'Te veel ontvangen', refunded: 'Gerestitueerd', void: 'Vervallen',
}
