/* -------------------------------------------------------------------------
   Labels voor het persoonsprofiel, zonder database.

   Los van crm.ts zodat schermcomponenten ze kunnen gebruiken zonder de
   databaselaag mee de browserbundel in te slepen.
   ------------------------------------------------------------------------- */

export const GESLACHT_OPTIES = [
  { value: '', label: 'Onbekend' },
  { value: 'heer', label: 'Man' },
  { value: 'mevrouw', label: 'Vrouw' },
  { value: 'neutraal', label: 'Anders / zegt het liever niet' },
]

export const DISC_LABELS = {
  D: 'D — Dominant: wil de kern, houdt niet van omwegen',
  I: 'I — Invloed: wil het gesprek, werkt op enthousiasme',
  S: 'S — Stabiel: wil rust en zekerheid, niet overvallen worden',
  C: 'C — Consciëntieus: wil de onderbouwing en de cijfers',
} as const

export const DISC_KORT = { D: 'D', I: 'I', S: 'S', C: 'C' } as const

export const DRINK_LABELS = {
  koffie_zwart: 'Koffie zwart',
  koffie_suiker: 'Koffie met suiker',
  koffie_melk: 'Koffie met melk',
  koffie_melk_suiker: 'Koffie met melk en suiker',
  cappuccino: 'Cappuccino',
  latte_macchiato: 'Latte macchiato',
  thee: 'Thee',
  spa_rood: 'Spa rood',
  spa_blauw: 'Spa blauw',
  anders: 'Iets anders',
} as const

export const KANAAL_LABELS = {
  mail: 'E-mail',
  telefoon: 'Telefoon',
  whatsapp: 'WhatsApp',
  app: 'Chat in ClickUp',
} as const

/** Van een enum-object een lijst voor een keuzelijst, met "niet ingevuld" vooraan. */
export function opties(labels: Record<string, string>) {
  return [{ value: '', label: 'Niet ingevuld' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]
}
