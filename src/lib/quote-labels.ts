import type { Quote, QuoteLine } from '@/db/schema'

/* -------------------------------------------------------------------------
   De woorden en kleuren die bij een offertestatus en een regelsoort horen.

   Ze staan los van quotes.ts omdat clientcomponenten ze nodig hebben. Zou
   een clientcomponent uit quotes.ts importeren, dan probeert de bundler de
   databaselaag mee naar de browser te nemen. Labels zijn presentatie; die
   horen niet in de laag die met de database praat.
   ------------------------------------------------------------------------- */

export const quoteStatusLabels: Record<Quote['status'], string> = {
  draft: 'Concept',
  awaiting_partner: 'Wacht op partner',
  sent: 'Verstuurd',
  accepted: 'Akkoord',
  declined: 'Afgewezen',
  expired: 'Verlopen',
}

export const quoteStatusStyles: Record<Quote['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  awaiting_partner: 'bg-jr-orange/10 text-jr-orange',
  sent: 'bg-jr-lightblue text-jr-deepblue',
  accepted: 'bg-jr-green/10 text-jr-green',
  declined: 'bg-jr-red/10 text-jr-red',
  expired: 'bg-gray-100 text-gray-500',
}

export const lineKindLabels: Record<QuoteLine['kind'], string> = {
  service: 'Eigen dienst',
  partner: 'Via partner',
  custom: 'Eenmalig',
  discount: 'Korting',
}
