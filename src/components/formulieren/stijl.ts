import type { Kleur } from '@/lib/formulieren/vragenlijst'

/** De chips voor groen, oranje, later en rood, overal hetzelfde. */
export const KLEUR_STIJL: Record<Kleur, string> = {
  groen: 'bg-jr-green/15 text-[#1d7a36]',
  oranje: 'bg-jr-orange/15 text-[#9a5b00]',
  later: 'bg-jr-lightblue text-jr-deepblue',
  rood: 'bg-[#FDECEA] text-[#C02A22]',
}
