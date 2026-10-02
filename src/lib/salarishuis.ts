import { asc, desc, eq, lte } from 'drizzle-orm'
import { db } from '@/db'
import { salaryHouses, salaryScales } from '@/db/schema'
import type { SalaryHouse, SalaryScale } from '@/db/schema'

/* -------------------------------------------------------------------------
   Het salarishuis.

   Dit bestand rekent uit wat iemand verdient op een schaal en een trede, en
   het is de enige plek waar dat gebeurt. Een contract, een voorstel en het
   personeelsdossier moeten hetzelfde getal laten zien; staat de formule op
   drie plekken, dan lopen ze uit elkaar en merk je dat pas bij de eerste
   loonstrook.

   Twee dingen die hier makkelijk misgaan:

   1. De opslag per schaal stapelt. Senior staat op 125% en dat is 125% van
      MEDIOR, niet van de grondslag. Lees je het verkeerd, dan zit elk
      seniorcontract er bijna vijfhonderd euro per maand naast en klopt de
      formule er nog steeds uit.

   2. Afronden mag maar op één plek. Het fulltimebedrag van een schaal-trede
      wordt afgerond op centen, en alles daarna leidt daarvan af. Rond je
      onderweg nog een keer af, dan lopen het contract en de loonadministratie
      een paar cent uit elkaar - en dat is precies het soort verschil waar
      een medewerker over mailt.

   De uitkomsten zijn gecontroleerd tegen de sheet van Jim: alle 65 tredes
   maal twee kolommen, nul verschillen. Die controle staat als test in
   __tests__/salarishuis.test.ts en moet groen blijven.
   ------------------------------------------------------------------------- */

export class SalarishuisError extends Error {}

/** Een huis met zijn schalen, op volgorde van onder naar boven. */
export type Huis = {
  huis: SalaryHouse
  schalen: SalaryScale[]
}

/**
 * Wat een schaal-trede oplevert, helemaal uitgerekend.
 *
 * Alles in centen. Bruto, want netto hangt af van de persoonlijke situatie
 * en dat hoort bij de salarisadministratie, niet hier.
 */
export type Beloning = {
  schaal: string
  trede: number
  /** Bruto per maand bij fulltime. */
  fulltimeCents: number
  /** Bruto per maand bij het afgesproken aantal uren. */
  maandCents: number
  /** De OP-toeslag over het maandbedrag, als er geen pensioenregeling is. */
  opToeslagCents: number
  /** Maandbedrag plus OP-toeslag. Dit is wat er maandelijks wordt overgemaakt. */
  maandMetToeslagCents: number
  /** Vakantietoeslag per maand opgebouwd. Niet over de OP-toeslag. */
  vakantietoeslagPerMaandCents: number
  /** Bruto per uur, waarmee je tegen het minimumloon toetst. */
  uurloonCents: number
  /** Vakantie-uren per kalenderjaar, naar rato van de uren. */
  vakantieUren: number
  /** Uren per week in kwartieren, zoals meegegeven. */
  urenPerWeekKwartier: number
  /**
   * Waar het uurloon onder het wettelijk minimum ligt.
   *
   * Null als er geen minimum in het huis staat. False betekent dus echt
   * gecontroleerd en in orde, en niet "we weten het niet".
   */
  onderMinimumloon: boolean | null
}

/* --- Rekenen -------------------------------------------------------------- */

/**
 * Het fulltimebedrag van een schaal-trede, in centen.
 *
 * De enige plek waar wordt afgerond. Losgetrokken van de rest zodat de
 * berekening zonder database te testen is.
 */
export function fulltimeCentsVoor(
  baseCents: number,
  stepIncreaseBp: number,
  schalenTotEnMet: { multiplierBp: number }[],
  trede: number,
): number {
  let bedrag = baseCents
  // Stapelen, in deze volgorde. Zie de waarschuwing bovenaan dit bestand.
  for (const s of schalenTotEnMet) bedrag = bedrag * (s.multiplierBp / 10_000)
  bedrag = bedrag * (1 + stepIncreaseBp / 10_000) ** (trede - 1)
  return Math.round(bedrag)
}

/** Deelt een percentage in basispunten toe en rondt af op centen. */
function deelBp(cents: number, bp: number): number {
  return Math.round((cents * bp) / 10_000)
}

/**
 * Wat iemand verdient op deze schaal en trede, bij dit aantal uren.
 *
 * Pure functie: geen database, geen datum, geen verrassingen. Het huis geef
 * je mee, zodat een oud contract met het oude huis doorgerekend kan worden.
 */
export function berekenBeloning(
  huis: Huis,
  schaalNaam: string,
  trede: number,
  urenPerWeekKwartier: number,
): Beloning {
  const geordend = [...huis.schalen].sort((a, b) => a.sortOrder - b.sortOrder)
  const index = geordend.findIndex((s) => s.name === schaalNaam)
  if (index === -1) {
    throw new SalarishuisError(
      `Schaal "${schaalNaam}" bestaat niet in dit salarishuis. Beschikbaar: ${geordend
        .map((s) => s.name)
        .join(', ')}.`,
    )
  }

  const schaal = geordend[index]!
  if (!Number.isInteger(trede) || trede < 1 || trede > schaal.steps) {
    throw new SalarishuisError(
      `Trede ${trede} bestaat niet in schaal ${schaal.name}; die loopt van 1 tot en met ${schaal.steps}.`,
    )
  }
  if (urenPerWeekKwartier <= 0) {
    throw new SalarishuisError('Het aantal uren per week moet groter dan nul zijn.')
  }

  const h = huis.huis
  const fulltimeCents = fulltimeCentsVoor(
    h.baseCents,
    h.stepIncreaseBp,
    geordend.slice(0, index + 1),
    trede,
  )

  const deel = urenPerWeekKwartier / h.fulltimeHoursWeekQuarters
  const maandCents = Math.round(fulltimeCents * deel)
  const opToeslagCents = deelBp(maandCents, h.pensionAllowanceBp)

  /* Uurloon: het maandbedrag maal twaalf, gedeeld door de uren in een jaar.
     Niet maandbedrag gedeeld door "uren in deze maand" - die verschilt per
     maand en dan zou het uurloon in februari hoger zijn dan in maart. */
  const urenPerWeek = urenPerWeekKwartier / 100
  const uurloonCents = Math.round((maandCents * 12) / (urenPerWeek * 52))

  return {
    schaal: schaal.name,
    trede,
    fulltimeCents,
    maandCents,
    opToeslagCents,
    maandMetToeslagCents: maandCents + opToeslagCents,
    // Vakantietoeslag gaat NIET over de OP-toeslag. Staat zo in het contract
    // en het scheelt op jaarbasis een paar honderd euro per persoon.
    vakantietoeslagPerMaandCents: deelBp(maandCents, h.holidayAllowanceBp),
    uurloonCents,
    vakantieUren: Math.round(h.holidayHoursFulltime * deel),
    urenPerWeekKwartier,
    onderMinimumloon:
      h.minimumHourlyCents === null ? null : uurloonCents < h.minimumHourlyCents,
  }
}

/**
 * Het hele huis als tabel, zoals de sheet hem laat zien.
 *
 * Voor het scherm, en voor de test die hem tegen de sheet legt.
 */
export function tabel(huis: Huis): {
  schaal: string
  sortOrder: number
  tredes: { trede: number; fulltimeCents: number; metToeslagCents: number }[]
}[] {
  const geordend = [...huis.schalen].sort((a, b) => a.sortOrder - b.sortOrder)

  return geordend.map((schaal, index) => ({
    schaal: schaal.name,
    sortOrder: schaal.sortOrder,
    tredes: Array.from({ length: schaal.steps }, (_, i) => {
      const trede = i + 1
      const fulltimeCents = fulltimeCentsVoor(
        huis.huis.baseCents,
        huis.huis.stepIncreaseBp,
        geordend.slice(0, index + 1),
        trede,
      )
      return {
        trede,
        fulltimeCents,
        metToeslagCents:
          fulltimeCents + deelBp(fulltimeCents, huis.huis.pensionAllowanceBp),
      }
    }),
  }))
}

/* --- Ophalen -------------------------------------------------------------- */

/**
 * Het salarishuis dat gold op een bepaalde datum.
 *
 * Het laatste huis met een ingangsdatum op of voor die dag. Een contract uit
 * vorig jaar rekent dus door met het huis van vorig jaar, ook nadat er
 * geindexeerd is. Dat is de hele reden dat huizen versies hebben.
 *
 * Twee queries: het huis en zijn schalen. Vanaf een serverless functie is
 * elke query een netwerkronde, dus niet meer dan nodig.
 */
export async function getHuis(op: Date = new Date()): Promise<Huis | null> {
  const [huis] = await db
    .select()
    .from(salaryHouses)
    .where(lte(salaryHouses.effectiveFrom, op))
    .orderBy(desc(salaryHouses.effectiveFrom))
    .limit(1)

  if (!huis) return null

  const schalen = await db
    .select()
    .from(salaryScales)
    .where(eq(salaryScales.houseId, huis.id))
    .orderBy(asc(salaryScales.sortOrder))

  return { huis, schalen }
}

/** Alle huizen met hun schalen, nieuwste eerst. Voor het beheerscherm. */
export async function listHuizen(): Promise<Huis[]> {
  const huizen = await db
    .select()
    .from(salaryHouses)
    .orderBy(desc(salaryHouses.effectiveFrom))

  if (huizen.length === 0) return []

  const alleSchalen = await db
    .select()
    .from(salaryScales)
    .orderBy(asc(salaryScales.sortOrder))

  const perHuis = new Map<string, SalaryScale[]>()
  for (const s of alleSchalen) {
    const lijst = perHuis.get(s.houseId)
    if (lijst) lijst.push(s)
    else perHuis.set(s.houseId, [s])
  }

  return huizen.map((huis) => ({ huis, schalen: perHuis.get(huis.id) ?? [] }))
}

/**
 * Het huis op een datum, of een nette fout.
 *
 * Voor de plekken waar zonder huis niets te doen valt, zoals een contract
 * opstellen. Scheelt overal dezelfde null-controle.
 */
export async function vereisHuis(op: Date = new Date()): Promise<Huis> {
  const huis = await getHuis(op)
  if (!huis) {
    throw new SalarishuisError(
      'Er is geen salarishuis dat geldt op deze datum. Voeg er een toe bij Beheer.',
    )
  }
  if (huis.schalen.length === 0) {
    throw new SalarishuisError(
      'Dit salarishuis heeft nog geen schalen. Zonder schalen valt er niets uit te rekenen.',
    )
  }
  return huis
}

/** Alleen de namen, voor een keuzelijst. */
export function schaalNamen(huis: Huis): string[] {
  return [...huis.schalen].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.name)
}

/** Hoeveel tredes een schaal heeft, of null als de schaal niet bestaat. */
export function aantalTredes(huis: Huis, schaalNaam: string): number | null {
  return huis.schalen.find((s) => s.name === schaalNaam)?.steps ?? null
}
