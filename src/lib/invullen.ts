/* -------------------------------------------------------------------------
   Teksten invullen: {{plaatshouders}} en {{#als}}-blokken.

   Gedeeld door contracten, de AVG-verklaring en de mails. Zonder database
   of andere afhankelijkheden, zodat het overal gebruikt en getest kan worden.
   ------------------------------------------------------------------------- */

/** Een plaatshouder die niet is ingevuld valt op in plaats van weg te vallen. */
const ONBEKEND = (naam: string) => `[ONBEKEND: ${naam}]`

/**
 * Vervangt {{plaatshouders}} door waarden.
 *
 * Een ontbrekende waarde wordt zichtbaar gemarkeerd en niet stilletjes leeg
 * gelaten. In een juridisch document is een lege plek erger dan een lelijke:
 * een lege plek lees je over, [ONBEKEND: salaris] niet.
 */
export function vulIn(
  sjabloon: string,
  waarden: Record<string, string>,
): { tekst: string; ontbrekend: string[] } {
  const ontbrekend: string[] = []

  const tekst = sjabloon.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_heel, naam: string) => {
    const waarde = waarden[naam]
    if (waarde === undefined) {
      if (!ontbrekend.includes(naam)) ontbrekend.push(naam)
      return ONBEKEND(naam)
    }
    return waarde
  })

  return { tekst, ontbrekend }
}

/**
 * Voorwaardelijke stukken in een tekst: {{#als naam}}...{{/als}} blijft
 * staan als de voorwaarde geldt, {{#alsniet naam}}...{{/alsniet}} als hij
 * niet geldt. Zo kan een enkel lid maatwerk zijn zonder dat het hele artikel
 * een tweede versie nodig heeft.
 *
 * Blokken mogen in elkaar staan: steeds het binnenste blok eerst, tot er
 * geen meer over is. Een onbekende voorwaarde laat de inhoud staan en wordt
 * teruggemeld, zodat hij opvalt.
 */
export function pasVoorwaardenToe(tekst: string, geldt: Record<string, boolean>): { tekst: string; onbekend: string[] } {
  const onbekend: string[] = []
  // Een blok zonder ander blok erin: de inhoud bevat geen {{#als of {{#alsniet.
  const binnenste = /\{\{\s*#(als|alsniet)\s+([a-z0-9_]+)\s*\}\}((?:(?!\{\{\s*#als)[\s\S])*?)\{\{\s*\/\1\s*\}\}/gi
  let uit = tekst
  for (let ronde = 0; ronde < 50; ronde++) {
    const volgende = uit.replace(binnenste, (_heel, soort: string, naam: string, inhoud: string) => {
      if (!(naam in geldt)) {
        if (!onbekend.includes(naam)) onbekend.push(naam)
        return inhoud
      }
      const wel = soort.toLowerCase() === 'als'
      return geldt[naam] === wel ? inhoud : ''
    })
    if (volgende === uit) break
    uit = volgende
  }
  return { tekst: uit, onbekend }
}
