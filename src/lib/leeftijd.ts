/* -------------------------------------------------------------------------
   Leeftijd uitrekenen.

   Dit staat apart omdat het er simpeler uitziet dan het is, en omdat het op
   het scherm al fout heeft gestaan. Er stond `huidigJaar - geboortejaar` met
   het woord "wordt" ervoor. Dat geeft de leeftijd die iemand DIT JAAR wordt,
   en is je verjaardag al geweest, dan is dat gewoon je huidige leeftijd.
   Iemand van zevenendertig las dus "wordt 37" terwijl hij het al is.

   Twee verschillende vragen, twee verschillende functies:

     leeftijd()            hoe oud is iemand NU
     leeftijdOpVerjaardag() hoe oud wordt iemand op een bepaalde verjaardag

   In een adresboek wil je de eerste. In een overzicht van aankomende
   verjaardagen de tweede. Ze verschillen een heel jaar zodra de verjaardag
   van dit jaar geweest is, en dat is de helft van het jaar het geval.
   ------------------------------------------------------------------------- */

/**
 * Hoe oud iemand nu is.
 *
 * Null als de geboortedatum niet compleet is. Dat is met opzet: lang niet
 * iedereen deelt zijn geboortejaar, en een verzonnen leeftijd is erger dan
 * geen leeftijd.
 *
 * Ook null bij een geboortejaar in de toekomst. Dat is een typefout in de
 * invoer, en "min 3 jaar" op een scherm is verwarrender dan een streepje.
 */
export function leeftijd(
  birthDay: number | null,
  birthMonth: number | null,
  birthYear: number | null,
  nu: Date = new Date(),
): number | null {
  if (birthDay === null || birthMonth === null || birthYear === null) return null

  let jaren = nu.getFullYear() - birthYear

  /* Is de verjaardag dit jaar nog niet geweest, dan is er een jaar minder
     om. Maand en dag samen vergelijken en niet apart: iemand die op 3 maart
     geboren is en het is 15 februari, heeft een kleinere maand maar een
     grotere dag. Los vergelijken geeft dan het verkeerde antwoord.

     Op de verjaardag zelf telt het jaar wel mee — je bent die dag al zo oud. */
  const nogNietGeweest =
    nu.getMonth() + 1 < birthMonth ||
    (nu.getMonth() + 1 === birthMonth && nu.getDate() < birthDay)

  if (nogNietGeweest) jaren -= 1

  return jaren < 0 ? null : jaren
}

/**
 * Hoe oud iemand wordt op de verjaardag in een bepaald jaar.
 *
 * Voor overzichten van aankomende verjaardagen: daar is "wordt 38" precies
 * wat je wilt weten als je een kaartje stuurt.
 */
export function leeftijdOpVerjaardag(
  birthYear: number | null,
  jaarVanVieren: number,
): number | null {
  if (birthYear === null) return null
  const jaren = jaarVanVieren - birthYear
  return jaren < 0 ? null : jaren
}
