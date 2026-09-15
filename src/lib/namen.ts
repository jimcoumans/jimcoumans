/* -------------------------------------------------------------------------
   Namen in delen.

   Eén veld "naam" is genoeg om iets op een scherm te zetten en verder
   nergens voor. Je kunt er niet mee sorteren op achternaam, geen aanhef mee
   maken en geen mail mee personaliseren. Daarom staat een naam in delen in
   de database, en wordt de volledige naam daaruit samengesteld — niet
   andersom.

   Het tussenvoegsel staat apart omdat het in het Nederlands niet meetelt bij
   sorteren: Van den Berg staat onder de B.
   ------------------------------------------------------------------------- */

import type { aanhefEnum } from '@/db/schema'

export type Aanhef = (typeof aanhefEnum.enumValues)[number]

export const AANHEF_LABELS: Record<Aanhef, string> = {
  heer: 'Meneer',
  mevrouw: 'Mevrouw',
  neutraal: 'Weet ik niet / anders',
}

/**
 * Tussenvoegsels, van lang naar kort.
 *
 * De volgorde is niet toevallig: "van der Berg" moet als "van der" worden
 * herkend en niet als "van", anders wordt de achternaam "der Berg".
 */
const TUSSENVOEGSELS = [
  'van der',
  'van den',
  'van de',
  'van het',
  "van 't",
  'in der',
  'in den',
  'in de',
  'in het',
  "in 't",
  'op der',
  'op den',
  'op de',
  'aan der',
  'aan den',
  'aan de',
  'uit de',
  'uit den',
  'van',
  'de',
  'den',
  'der',
  'des',
  'het',
  "'t",
  'ten',
  'ter',
  'te',
  'uit',
  'op',
  'aan',
  'bij',
  'onder',
  'over',
  'voor',
] as const

export type NaamDelen = {
  firstName: string | null
  infix: string | null
  lastName: string | null
}

/**
 * Splitst een volledige naam in voornaam, tussenvoegsel en achternaam.
 *
 * Dit is een gok, geen waarheid. Bij "Jan Peter van der Velden" gaat er maar
 * één woord naar de voornaam en de rest naar de achternaam, en dat is voor
 * een dubbele voornaam fout. Daarom is het ook alleen bedoeld om bestaande
 * namen één keer uit elkaar te trekken; daarna corrigeer je het in het
 * scherm en wordt er niet meer geraden.
 */
export function splitsNaam(volledig: string): NaamDelen {
  const schoon = volledig.trim().replace(/\s+/g, ' ')
  if (schoon === '') return { firstName: null, infix: null, lastName: null }

  const spatie = schoon.indexOf(' ')
  if (spatie === -1) {
    // Eén woord: dat is een voornaam, geen achternaam.
    return { firstName: schoon, infix: null, lastName: null }
  }

  const voornaam = schoon.slice(0, spatie)
  const rest = schoon.slice(spatie + 1)

  for (const tussenvoegsel of TUSSENVOEGSELS) {
    const begin = `${tussenvoegsel} `
    if (rest.toLowerCase().startsWith(begin.toLowerCase())) {
      const achternaam = rest.slice(begin.length).trim()
      // "Karel de Grote" splitst wel, maar "Jan de" niet: dan is "de" geen
      // tussenvoegsel maar het laatste wat we hebben.
      if (achternaam !== '') {
        return {
          firstName: voornaam,
          infix: rest.slice(0, tussenvoegsel.length),
          lastName: achternaam,
        }
      }
    }
  }

  return { firstName: voornaam, infix: null, lastName: rest }
}

/** De volledige naam uit de delen. Dit is wat er op het scherm komt. */
export function volledigeNaam(delen: NaamDelen): string {
  return [delen.firstName, delen.infix, delen.lastName]
    .map((d) => d?.trim())
    .filter((d): d is string => !!d)
    .join(' ')
}

/** Achternaam met tussenvoegsel erachter: "Berg, van der". Voor lijsten. */
export function achternaamEerst(delen: NaamDelen): string | null {
  if (!delen.lastName) return null
  return delen.infix ? `${delen.lastName}, ${delen.infix}` : delen.lastName
}

/**
 * De aanhef voor een mail of brief.
 *
 * Zonder aanhef of bij 'neutraal' wordt het "Beste <voornaam>". Dat is in
 * onze branche het gewone register en het gokt niets.
 */
export function aanhefVoor(
  delen: NaamDelen & { aanhef: Aanhef | null },
): string {
  const achter = [delen.infix, delen.lastName]
    .map((d) => d?.trim())
    .filter((d): d is string => !!d)
    .join(' ')

  if (delen.aanhef === 'heer' && achter) return `Geachte heer ${achter}`
  if (delen.aanhef === 'mevrouw' && achter) return `Geachte mevrouw ${achter}`

  if (delen.firstName) return `Beste ${delen.firstName}`
  if (achter) return `Beste ${achter}`
  return 'Goedendag'
}
