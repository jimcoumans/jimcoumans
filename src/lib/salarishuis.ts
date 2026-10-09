import { and, asc, count, desc, eq, gt, gte, isNotNull, lt, lte, ne } from 'drizzle-orm'
import { db } from '@/db'
import { salaryHouses, salaryScales, generatedContracts } from '@/db/schema'
import type { SalaryHouse, SalaryScale } from '@/db/schema'
import { SalarishuisError, controleerHuis, type Huis, type HuisInvoer } from './salarishuis-reken'

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

export {
  SalarishuisError,
  fulltimeCentsVoor,
  berekenBeloning,
  tabel,
  controleerHuis,
  huisUit,
  type Huis,
  type HuisInvoer,
  type Beloning,
} from './salarishuis-reken'

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

/* --- Beheren -------------------------------------------------------------- */

/*
 * Een huis wijzig je niet als er al contracten op zijn opgesteld. Die
 * contracten bewaren hun eigen bedragen en veranderen dus niet mee, maar dan
 * staat er in het portaal een huis dat nooit heeft gegolden voor de mensen
 * die er een contract op kregen. Een indexatie is daarom een nieuwe versie
 * met een eigen ingangsdatum; corrigeren kan alleen zolang niemand er nog
 * een contract op heeft.
 */

/** Hoeveel contracten er met schaal en trede zijn opgesteld in de periode van dit huis. */
export async function contractenOpHuis(huisId: string): Promise<number> {
  const [huis] = await db.select().from(salaryHouses).where(eq(salaryHouses.id, huisId)).limit(1)
  if (!huis) return 0
  const [volgende] = await db
    .select({ effectiveFrom: salaryHouses.effectiveFrom })
    .from(salaryHouses)
    .where(gt(salaryHouses.effectiveFrom, huis.effectiveFrom))
    .orderBy(asc(salaryHouses.effectiveFrom))
    .limit(1)

  const [rij] = await db
    .select({ aantal: count() })
    .from(generatedContracts)
    .where(
      and(
        isNotNull(generatedContracts.salaryScaleName),
        gte(generatedContracts.startedOn, huis.effectiveFrom),
        volgende ? lt(generatedContracts.startedOn, volgende.effectiveFrom) : undefined,
      ),
    )
  return Number(rij?.aantal ?? 0)
}

async function datumVrij(op: Date, behalve: string | null): Promise<void> {
  const [bezet] = await db
    .select({ id: salaryHouses.id })
    .from(salaryHouses)
    .where(and(eq(salaryHouses.effectiveFrom, op), behalve ? ne(salaryHouses.id, behalve) : undefined))
    .limit(1)
  if (bezet) throw new SalarishuisError('Er is al een salarishuis met deze ingangsdatum. Kies een andere datum of corrigeer dat huis.')
}

/** Een nieuwe versie van het huis, met zijn eigen ingangsdatum. */
export async function maakHuis(invoer: HuisInvoer, doorUserId: string | null): Promise<SalaryHouse> {
  controleerHuis(invoer)
  await datumVrij(invoer.effectiveFrom, null)
  return db.transaction(async (tx) => {
    const [huis] = await tx
      .insert(salaryHouses)
      .values({
        effectiveFrom: invoer.effectiveFrom,
        baseCents: invoer.baseCents,
        stepIncreaseBp: invoer.stepIncreaseBp,
        pensionAllowanceBp: invoer.pensionAllowanceBp,
        holidayAllowanceBp: invoer.holidayAllowanceBp,
        fulltimeHoursWeekQuarters: invoer.fulltimeHoursWeekQuarters,
        holidayHoursFulltime: invoer.holidayHoursFulltime,
        minimumHourlyCents: invoer.minimumHourlyCents,
        note: invoer.note,
        createdByUserId: doorUserId,
      })
      .returning()
    if (!huis) throw new SalarishuisError('Het salarishuis kon niet worden opgeslagen.')
    await tx.insert(salaryScales).values(
      invoer.schalen.map((s, n) => ({ houseId: huis.id, name: s.name.trim(), sortOrder: n + 1, multiplierBp: s.multiplierBp, steps: s.steps })),
    )
    return huis
  })
}

/** Een huis corrigeren. Alleen zolang er geen contract op is opgesteld. */
export async function corrigeerHuis(huisId: string, invoer: HuisInvoer): Promise<void> {
  controleerHuis(invoer)
  const inGebruik = await contractenOpHuis(huisId)
  if (inGebruik > 0) {
    throw new SalarishuisError(
      `Op dit huis ${inGebruik === 1 ? 'is al een contract' : `zijn al ${inGebruik} contracten`} opgesteld. Maak een nieuwe versie met een eigen ingangsdatum.`,
    )
  }
  await datumVrij(invoer.effectiveFrom, huisId)
  await db.transaction(async (tx) => {
    const [bij] = await tx
      .update(salaryHouses)
      .set({
        effectiveFrom: invoer.effectiveFrom,
        baseCents: invoer.baseCents,
        stepIncreaseBp: invoer.stepIncreaseBp,
        pensionAllowanceBp: invoer.pensionAllowanceBp,
        holidayAllowanceBp: invoer.holidayAllowanceBp,
        fulltimeHoursWeekQuarters: invoer.fulltimeHoursWeekQuarters,
        holidayHoursFulltime: invoer.holidayHoursFulltime,
        minimumHourlyCents: invoer.minimumHourlyCents,
        note: invoer.note,
      })
      .where(eq(salaryHouses.id, huisId))
      .returning({ id: salaryHouses.id })
    if (!bij) throw new SalarishuisError('Dit salarishuis bestaat niet meer.')
    await tx.delete(salaryScales).where(eq(salaryScales.houseId, huisId))
    await tx.insert(salaryScales).values(
      invoer.schalen.map((s, n) => ({ houseId: huisId, name: s.name.trim(), sortOrder: n + 1, multiplierBp: s.multiplierBp, steps: s.steps })),
    )
  })
}

/** Een huis wissen. Niet het laatste, en niet als er contracten op staan. */
export async function wisHuis(huisId: string): Promise<void> {
  const [rij] = await db.select({ aantal: count() }).from(salaryHouses)
  if (Number(rij?.aantal ?? 0) <= 1) throw new SalarishuisError('Er moet minstens één salarishuis blijven.')
  const inGebruik = await contractenOpHuis(huisId)
  if (inGebruik > 0) throw new SalarishuisError('Op dit huis zijn al contracten opgesteld. Het blijft staan als historie.')
  await db.delete(salaryHouses).where(eq(salaryHouses.id, huisId))
}
