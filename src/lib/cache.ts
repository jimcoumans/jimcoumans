/* -------------------------------------------------------------------------
   Een kort geheugen voor dure overzichten.

   Waarom dit er is. Elke query naar de database kost vanaf de server zo'n
   honderd milliseconde — dat is reistijd, geen rekentijd. Een dashboard dat
   twintig overzichten ophaalt is daarmee twee seconden bezig, elke keer
   opnieuw, ook als er in die twee seconden niets is veranderd. Bij vier
   collega's die tegelijk kijken gebeurt datzelfde werk vier keer.

   Dat is zonde, want deze cijfers veranderen niet van seconde tot seconde.
   Hoeveel klanten we hebben, wat de abonnementsomzet is, wie er jarig is:
   dat is een minuut later nog steeds waar.

   Dus: het antwoord wordt onthouden, en een minuut lang hergebruikt.

   Wat hier NIET in hoort. Alles wat iemand net heeft ingevoerd. Zie je na
   het opslaan van een contactpersoon nog even de oude lijst, dan denk je dat
   het opslaan niet werkte en doe je het nog een keer. Deze cache is alleen
   voor overzichtscijfers waar niemand direct op zit te wachten na een
   wijziging — en die dus ook nooit door een formulier worden gelezen.

   Het geheugen zit in het proces, niet in een aparte dienst. Draaien er drie
   serverinstanties, dan heeft elk zijn eigen kopie en kan de een een halve
   minuut voorlopen op de ander. Voor cijfers met een minuut speling is dat
   prima, en het scheelt een hele extra dienst om te beheren.
   ------------------------------------------------------------------------- */

type Bewaard = { waarde: unknown; verlooptOp: number }

/**
 * Het geheugen hangt aan globalThis en niet aan de module.
 *
 * Bij elke hot reload in development wordt de module opnieuw geladen; zonder
 * dit zou de cache dan elke keer leeg zijn en meet je iets anders dan wat er
 * in productie gebeurt.
 */
const globalVoorCache = globalThis as unknown as { jrWalletCache?: Map<string, Bewaard> }
const geheugen: Map<string, Bewaard> = (globalVoorCache.jrWalletCache ??= new Map())

/** Hoe lang een antwoord standaard meegaat. */
export const STANDAARD_TTL_MS = 60_000

/**
 * Onthoudt wat een functie teruggaf, en geeft dat een tijdje ongewijzigd
 * terug.
 *
 * Twee aanroepen tegelijk met dezelfde sleutel leveren één query op: de
 * tweede haakt aan bij de belofte van de eerste. Dat is precies het geval
 * waar het om gaat — een pagina die hetzelfde overzicht op twee plekken
 * nodig heeft, of twee collega's die tegelijk verversen.
 */
const lopend = new Map<string, Promise<unknown>>()

export async function metGeheugen<T>(
  sleutel: string,
  haalOp: () => Promise<T>,
  ttlMs: number = STANDAARD_TTL_MS,
): Promise<T> {
  const nu = Date.now()

  const bewaard = geheugen.get(sleutel)
  if (bewaard && bewaard.verlooptOp > nu) {
    return bewaard.waarde as T
  }

  // Loopt er al een aanroep voor deze sleutel, haak daarbij aan in plaats van
  // dezelfde query nog een keer te doen.
  const alBezig = lopend.get(sleutel)
  if (alBezig) return alBezig as Promise<T>

  const belofte = haalOp()
    .then((waarde) => {
      geheugen.set(sleutel, { waarde, verlooptOp: Date.now() + ttlMs })
      return waarde
    })
    .finally(() => {
      lopend.delete(sleutel)
    })

  lopend.set(sleutel, belofte)
  return belofte
}

/**
 * Gooit onthouden antwoorden weg.
 *
 * Aanroepen na een wijziging die meteen zichtbaar moet zijn. Zonder argument
 * gaat alles weg; met een voorvoegsel alleen wat daarmee begint.
 */
export function vergeet(voorvoegsel?: string): void {
  if (voorvoegsel === undefined) {
    geheugen.clear()
    return
  }
  for (const sleutel of geheugen.keys()) {
    if (sleutel.startsWith(voorvoegsel)) geheugen.delete(sleutel)
  }
}

/** Voor tests en voor het meetpunt: hoeveel er nu onthouden is. */
export function geheugenOmvang(): number {
  return geheugen.size
}
