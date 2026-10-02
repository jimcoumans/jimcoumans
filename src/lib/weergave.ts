import { periodLabel } from './billing-periods'

/* -------------------------------------------------------------------------
   Hoe we interne dingen aan mensen laten zien.

   Een factuurnummer als ABO-2026-10 of een bron als "invoice" is voor het
   systeem, niet voor wie het scherm leest. Hier staat op één plek hoe zo'n
   ding heet in gewoon Nederlands, zodat elk scherm hetzelfde zegt.
   ------------------------------------------------------------------------- */

/**
 * De naam van een factuur zoals een mens hem noemt: "Marketing abonnement
 * oktober 2026" in plaats van "ABO-2026-10". Het nummer blijft beschikbaar
 * als bijzaak, voor wie het in de boekhouding moet terugvinden.
 */
export function factuurTitel(f: { number: string; description: string | null; period: string | null }): string {
  const omschrijving = f.description?.trim()
  if (omschrijving) return omschrijving.charAt(0).toUpperCase() + omschrijving.slice(1)
  if (f.period) return `Factuur ${periodLabel(f.period)}`
  return `Factuur ${f.number}`
}

/**
 * Waar een boeking vandaan komt, alleen als dat iets toevoegt. Met de hand
 * geboekt is de norm en zeggen we dus niet; een factuur staat al in de
 * omschrijving.
 */
export function bronLabel(source: 'clickup' | 'manual' | 'invoice'): string | null {
  return source === 'clickup' ? 'via ClickUp' : null
}
