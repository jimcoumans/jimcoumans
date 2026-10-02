/* -------------------------------------------------------------------------
   De regels waar een arbeidsovereenkomst aan moet voldoen.

   Dit bestand staat los van de tekst en los van de database, zodat het
   volledig te testen is. Het rekent drie dingen uit die in de praktijk fout
   gaan en die je pas merkt als het te laat is:

   1. De PROEFTIJD hangt aan de looptijd. Bij een contract van zes maanden of
      korter mag er geen proeftijd zijn. Staat hij er toch, dan is hij nietig
      - je denkt dat je er een hebt en je hebt er geen.

   2. De AANZEGTERMIJN. Bij een tijdelijk contract van zes maanden of langer
      moet je uiterlijk een maand voor het einde schriftelijk laten weten of
      je verlengt. Vergeet je dat, dan ben je een maandsalaris verschuldigd.

   3. De KETENREGELING. Na drie tijdelijke contracten, of na 36 maanden,
      ontstaat een contract voor onbepaalde tijd.

   LET OP: dit is geen juridisch advies en dit systeem vervangt geen jurist.
   De grenzen hieronder zijn de wettelijke hoofdregel; bij cao kan ervan
   worden afgeweken en de wetgeving beweegt. De getallen staan daarom als
   constante bovenaan, zodat ze te verplaatsen zijn zonder de rest aan te
   raken.
   ------------------------------------------------------------------------- */

/** Tot en met deze looptijd is een proeftijd niet toegestaan. */
export const PROEFTIJD_GEEN_TOT_MAANDEN = 6
/** Vanaf deze looptijd mag de proeftijd twee maanden zijn. */
export const PROEFTIJD_TWEE_VANAF_MAANDEN = 24
/** Vanaf deze looptijd geldt de aanzegverplichting. */
export const AANZEGGEN_VANAF_MAANDEN = 6
/** Hoeveel maanden voor het einde er uiterlijk aangezegd moet zijn. */
export const AANZEGTERMIJN_MAANDEN = 1
/** Na dit aantal tijdelijke contracten ontstaat een vast contract. */
export const KETEN_MAX_CONTRACTEN = 3
/** Of na dit aantal maanden, wat het eerst komt. */
export const KETEN_MAX_MAANDEN = 36

export type ContractSoort = 'bepaalde_tijd' | 'onbepaalde_tijd'

/* --- Datums --------------------------------------------------------------- */

/**
 * Een aantal maanden bij een datum optellen, zonder over de maand heen te
 * schuiven.
 *
 * 31 januari plus een maand is in JavaScript 3 maart, want februari heeft
 * geen 31e en dan telt hij door. Voor een contractdatum is dat onacceptabel:
 * dan staat er een einddatum in een verkeerde maand. Hier wordt afgekapt op
 * de laatste dag van de doelmaand.
 */
export function maandenErbij(datum: Date, maanden: number): Date {
  const jaar = datum.getFullYear()
  const maand = datum.getMonth() + maanden
  const dag = datum.getDate()

  // Dag 0 van de volgende maand is de laatste dag van deze maand.
  const laatsteDag = new Date(jaar, maand + 1, 0).getDate()

  return new Date(
    jaar,
    maand,
    Math.min(dag, laatsteDag),
    datum.getHours(),
    datum.getMinutes(),
    datum.getSeconds(),
  )
}

/**
 * Wanneer een contract van rechtswege eindigt.
 *
 * Een contract van zeven maanden dat ingaat op 13 oktober eindigt op 12 mei:
 * de dag VOOR dezelfde datum zeven maanden later. Zou het op de 13e
 * eindigen, dan duurde het zeven maanden en een dag.
 */
export function eindeVanRechtswege(start: Date, maanden: number): Date {
  const zelfdeDag = maandenErbij(start, maanden)
  return new Date(
    zelfdeDag.getFullYear(),
    zelfdeDag.getMonth(),
    zelfdeDag.getDate() - 1,
    start.getHours(),
    start.getMinutes(),
    start.getSeconds(),
  )
}

/* --- Proeftijd ------------------------------------------------------------ */

/**
 * Hoeveel maanden proeftijd hier hoogstens mag.
 *
 * Nul betekent: geen proeftijd toegestaan. Dat is geen advies maar een
 * grens - een langere proeftijd dan dit is nietig, en dan heb je er geen in
 * plaats van een kortere.
 */
export function maxProeftijdMaanden(soort: ContractSoort, looptijdMaanden: number | null): number {
  if (soort === 'onbepaalde_tijd') return 2
  if (looptijdMaanden === null) return 0
  if (looptijdMaanden <= PROEFTIJD_GEEN_TOT_MAANDEN) return 0
  if (looptijdMaanden < PROEFTIJD_TWEE_VANAF_MAANDEN) return 1
  return 2
}

/**
 * De proeftijd die er daadwerkelijk in komt.
 *
 * Wat je invult wordt teruggebracht tot wat mag. Niet als waarschuwing maar
 * als feit: een proeftijd die te lang is, is nietig, dus hem afkappen is de
 * enige uitkomst waarin je er nog een hebt.
 */
export function toegestaneProeftijd(
  gewenst: number,
  soort: ContractSoort,
  looptijdMaanden: number | null,
): { maanden: number; aangepast: boolean; uitleg: string | null } {
  const max = maxProeftijdMaanden(soort, looptijdMaanden)
  const maanden = Math.max(0, Math.min(Math.floor(gewenst), max))

  if (maanden === gewenst) return { maanden, aangepast: false, uitleg: null }

  if (max === 0) {
    return {
      maanden: 0,
      aangepast: true,
      uitleg: `Bij een contract van ${looptijdMaanden} maanden is een proeftijd niet toegestaan. Een proeftijd die er toch in staat is nietig, dus hij is eruit gelaten.`,
    }
  }

  return {
    maanden,
    aangepast: true,
    uitleg: `Bij deze looptijd mag de proeftijd hoogstens ${max} ${max === 1 ? 'maand' : 'maanden'} zijn. Een langere proeftijd is nietig, dus hij is teruggebracht naar ${max}.`,
  }
}

/* --- Aanzeggen ------------------------------------------------------------ */

/**
 * Uiterlijk wanneer er aangezegd moet zijn, of null als dat niet hoeft.
 *
 * Geldt alleen bij een tijdelijk contract van zes maanden of langer. Dit is
 * de datum waarop dit hele onderdeel zijn geld verdient: een vergeten
 * aanzegging kost een maandsalaris, en dat is meer dan de hele module.
 */
export function aanzegdatum(
  soort: ContractSoort,
  einde: Date | null,
  looptijdMaanden: number | null,
): Date | null {
  if (soort !== 'bepaalde_tijd') return null
  if (einde === null || looptijdMaanden === null) return null
  if (looptijdMaanden < AANZEGGEN_VANAF_MAANDEN) return null
  return maandenErbij(einde, -AANZEGTERMIJN_MAANDEN)
}

/* --- Ketenregeling -------------------------------------------------------- */

export type KetenStand = {
  /** Het hoeveelste tijdelijke contract dit wordt. */
  nummer: number
  /** Hoeveel maanden tijdelijk werk dit in totaal maakt. */
  totaalMaanden: number
  /** Dit contract zou over de grens gaan en dus van rechtswege vast worden. */
  wordtVast: boolean
  uitleg: string | null
}

/**
 * Waar dit contract in de keten staat.
 *
 * Telt de bestaande tijdelijke contracten en de maanden die daarbij horen.
 * Gaat het nieuwe contract over een van beide grenzen, dan ontstaat er een
 * contract voor onbepaalde tijd - ongeacht wat er in het document staat.
 *
 * De tussenpoos die de keten breekt staat hier bewust niet in. Die is de
 * afgelopen jaren in beweging in de wetgeving; het aantal en de maanden
 * tellen is het deel dat vaststaat. Laat een jurist bevestigen of een
 * onderbreking in jullie geval de keten breekt.
 */
export function ketenStand(
  bestaande: { type: string; startedOn: Date; endsOn: Date | null }[],
  nieuweLooptijdMaanden: number | null,
): KetenStand {
  const tijdelijk = bestaande.filter((c) => c.type === 'bepaalde_tijd')

  const maandenVan = (c: { startedOn: Date; endsOn: Date | null }): number => {
    if (c.endsOn === null) return 0
    const dagen = (c.endsOn.getTime() - c.startedOn.getTime()) / (24 * 60 * 60 * 1000)
    return Math.round((dagen / 365.25) * 12)
  }

  const gedaanMaanden = tijdelijk.reduce((som, c) => som + maandenVan(c), 0)
  const nummer = tijdelijk.length + 1
  const totaalMaanden = gedaanMaanden + (nieuweLooptijdMaanden ?? 0)

  const overAantal = nummer > KETEN_MAX_CONTRACTEN
  const overMaanden = totaalMaanden > KETEN_MAX_MAANDEN

  let uitleg: string | null = null
  if (overAantal) {
    uitleg = `Dit is het ${nummer}e tijdelijke contract. Na ${KETEN_MAX_CONTRACTEN} ontstaat van rechtswege een contract voor onbepaalde tijd.`
  } else if (overMaanden) {
    uitleg = `Hiermee komt de reeks op ${totaalMaanden} maanden. Boven de ${KETEN_MAX_MAANDEN} maanden ontstaat van rechtswege een contract voor onbepaalde tijd.`
  } else if (nummer === KETEN_MAX_CONTRACTEN) {
    uitleg = `Dit is het laatste tijdelijke contract dat kan; een volgende wordt van rechtswege vast.`
  }

  return { nummer, totaalMaanden, wordtVast: overAantal || overMaanden, uitleg }
}
