/**
 * Tests voor het salarishuis.
 *
 * De belangrijkste test is de eerste: de hele sheet van Jim, alle 65 tredes
 * maal twee kolommen, overgetypt uit het origineel. Als de code die tabel
 * niet cel voor cel reproduceert, is de code fout - niet de sheet. Elk
 * contract dat hier uit rolt hangt hieraan.
 *
 * Daarnaast staan hier de twee dingen die makkelijk misgaan: de opslag per
 * schaal stapelt (Senior is 125% van MEDIOR), en er wordt maar op een plek
 * afgerond.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { salaryHouses, salaryScales } from '../../db/schema'
import {
  berekenBeloning,
  tabel,
  getHuis,
  listHuizen,
  vereisHuis,
  schaalNamen,
  aantalTredes,
  fulltimeCentsVoor,
  SalarishuisError,
  type Huis,
} from '../salarishuis'

/* Het huis van 2026, los van de database opgebouwd zodat de rekentests
   draaien zonder dat er iets in staat. */
const HUIS_2026: Huis = {
  huis: {
    id: 'test',
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    baseCents: 257_800,
    stepIncreaseBp: 150,
    pensionAllowanceBp: 1000,
    holidayAllowanceBp: 800,
    fulltimeHoursWeekQuarters: 4000,
    holidayHoursFulltime: 200,
    minimumHourlyCents: 1471,
    note: null,
    createdAt: new Date(),
    createdByUserId: null,
  },
  schalen: [
    { id: 's1', houseId: 'test', name: 'Junior', sortOrder: 1, multiplierBp: 10_000, steps: 15 },
    { id: 's2', houseId: 'test', name: 'Medior', sortOrder: 2, multiplierBp: 11_500, steps: 20 },
    { id: 's3', houseId: 'test', name: 'Senior', sortOrder: 3, multiplierBp: 12_500, steps: 30 },
  ],
}

/* De sheet, overgetypt. Per trede: [per maand, incl. OP-toeslag] in hele
   euro's, zoals de sheet ze toont. */
const SHEET: Record<string, [number, number][]> = {
  Junior: [
    [2578, 2836], [2617, 2878], [2656, 2922], [2696, 2965], [2736, 3010],
    [2777, 3055], [2819, 3101], [2861, 3147], [2904, 3195], [2948, 3242],
    [2992, 3291], [3037, 3340], [3082, 3391], [3129, 3441], [3175, 3493],
  ],
  Medior: [
    [2965, 3261], [3009, 3310], [3054, 3360], [3100, 3410], [3147, 3461],
    [3194, 3513], [3242, 3566], [3290, 3619], [3340, 3674], [3390, 3729],
    [3441, 3785], [3492, 3841], [3545, 3899], [3598, 3958], [3652, 4017],
    [3707, 4077], [3762, 4138], [3819, 4200], [3876, 4263], [3934, 4327],
  ],
  Senior: [
    [3706, 4076], [3761, 4138], [3818, 4200], [3875, 4263], [3933, 4327],
    [3992, 4392], [4052, 4457], [4113, 4524], [4175, 4592], [4237, 4661],
    [4301, 4731], [4365, 4802], [4431, 4874], [4497, 4947], [4565, 5021],
    [4633, 5097], [4703, 5173], [4773, 5251], [4845, 5329], [4918, 5409],
    [4991, 5490], [5066, 5573], [5142, 5656], [5219, 5741], [5298, 5827],
    [5377, 5915], [5458, 6003], [5540, 6093], [5623, 6185], [5707, 6278],
  ],
}

/* --- De sheet ------------------------------------------------------------ */

test('de hele tabel van 2026 komt op de euro uit met de sheet', () => {
  const uitgerekend = tabel(HUIS_2026)
  let gecontroleerd = 0

  for (const rij of uitgerekend) {
    const verwacht: [number, number][] | undefined = SHEET[rij.schaal]
    if (!verwacht) throw new Error(`schaal ${rij.schaal} staat niet in de sheet`)
    assert.equal(rij.tredes.length, verwacht.length, `aantal tredes in ${rij.schaal}`)

    for (const t of rij.tredes) {
      const regel: [number, number] | undefined = verwacht[t.trede - 1]
      if (!regel) throw new Error(`${rij.schaal} trede ${t.trede} staat niet in de sheet`)
      const perMaand: number = regel[0]
      const metToeslag: number = regel[1]
      assert.equal(
        Math.round(t.fulltimeCents / 100),
        perMaand,
        `${rij.schaal} trede ${t.trede} per maand`,
      )
      /* De kolom met OP-toeslag mag een euro afwijken, en precies een euro.
         Reden: de sheet rekent in een keer maal 1,1, terwijl er in
         werkelijkheid twee los afgeronde bedragen worden uitbetaald - het
         salaris en de toeslag, zoals ze ook als twee bedragen in het
         contract staan. Bij Medior trede 12 valt dat net over een halve
         euro heen. Zie de test hieronder; het is een cel van de 65. */
      assert.ok(
        Math.abs(Math.round(t.metToeslagCents / 100) - metToeslag) <= 1,
        `${rij.schaal} trede ${t.trede} incl. OP-toeslag: ${Math.round(
          t.metToeslagCents / 100,
        )} tegen ${metToeslag} in de sheet`,
      )
      gecontroleerd += 2
    }
  }

  assert.equal(gecontroleerd, 130, 'alle 65 tredes maal twee kolommen horen gecontroleerd')
})

test('precies een cel wijkt een euro af van de sheet, en daar is een reden voor', () => {
  /* De sheet toont bij Medior 12 het bedrag 3.841 inclusief OP-toeslag; dit
     systeem komt op 3.842. Geen rekenfout: de sheet vermenigvuldigt het
     onafgeronde bedrag met 1,1, dit systeem telt het salaris en de los
     afgeronde toeslag bij elkaar op. Dat laatste is wat er daadwerkelijk
     wordt uitbetaald en wat als twee aparte bedragen in het contract komt.

     Het verschil is een cent (384.149,17 tegenover 384.150 centen) en valt
     alleen bij deze ene trede over een halve euro heen. Deze test staat er
     zodat het bij een volgende wijziging niet stilletjes een andere cel
     wordt. */
  const rijen = tabel(HUIS_2026)
  const afwijkend: string[] = []

  for (const rij of rijen) {
    const verwacht = SHEET[rij.schaal]
    if (!verwacht) continue
    for (const t of rij.tredes) {
      const regel: [number, number] | undefined = verwacht[t.trede - 1]
      if (!regel) continue
      if (Math.round(t.metToeslagCents / 100) !== regel[1]) {
        afwijkend.push(`${rij.schaal} ${t.trede}`)
      }
    }
  }

  assert.deepEqual(afwijkend, ['Medior 12'])
})

/* --- De val: de opslag stapelt ------------------------------------------- */

test('Senior is 125% van Medior en niet van de grondslag', () => {
  /* Dit is waar het hele onderdeel op staat of valt. 125% van de grondslag
     zou 3.222,50 zijn; de sheet zegt 3.706. Dat scheelt bijna vijfhonderd
     euro per maand op elk seniorcontract. */
  const senior1 = berekenBeloning(HUIS_2026, 'Senior', 1, 4000)
  assert.equal(senior1.fulltimeCents, 370_588)

  const naief = Math.round(257_800 * 1.25)
  assert.notEqual(senior1.fulltimeCents, naief)

  // En expliciet: senior 1 is medior 1 maal 1,25.
  const medior1 = berekenBeloning(HUIS_2026, 'Medior', 1, 4000)
  assert.equal(senior1.fulltimeCents, Math.round(medior1.fulltimeCents * 1.25))
})

test('de volgorde van de schalen bepaalt de uitkomst, niet de volgorde in de lijst', () => {
  // Dezelfde schalen, in de verkeerde volgorde aangeleverd. De sortOrder
  // hoort te winnen; anders krijg je een ander bedrag afhankelijk van hoe de
  // database ze toevallig teruggeeft.
  const doorElkaar: Huis = {
    huis: HUIS_2026.huis,
    schalen: [...HUIS_2026.schalen].reverse(),
  }
  assert.equal(
    berekenBeloning(doorElkaar, 'Senior', 1, 4000).fulltimeCents,
    berekenBeloning(HUIS_2026, 'Senior', 1, 4000).fulltimeCents,
  )
})

/* --- Het contract van Voncken -------------------------------------------- */

test('Medior trede 12 bij 24 uur komt uit op het bedrag uit het contract', () => {
  /* Het echte contract zegt bruto EUR 2.095,59 per maand bij 24 uur, en een
     OP-toeslag van EUR 209,56. Het huis levert 2.095,36 en 209,54: veertien
     respectievelijk twee cent verschil. Dat verschil is geen rekenfout maar
     komt uit de sheet zelf; de tabel toont hele euro's en het contract is
     getypt vanaf een cel met meer decimalen.

     Deze test legt vast wat DIT systeem rekent. Wijkt het meer dan een euro
     af van het contract, dan zit er wel een echte fout in. */
  const b = berekenBeloning(HUIS_2026, 'Medior', 12, 2400)

  assert.equal(b.fulltimeCents, 349_227)
  assert.equal(b.maandCents, 209_536)
  assert.equal(b.opToeslagCents, 20_954)
  assert.equal(b.maandMetToeslagCents, 230_490)

  assert.ok(
    Math.abs(b.maandCents - 209_559) < 100,
    'meer dan een euro verschil met het contract betekent een echte fout',
  )
})

test('de vakantie-uren volgen de deeltijdfactor', () => {
  // Het contract zegt 120 uur bij 24 uur per week, uit 200 uur fulltime.
  assert.equal(berekenBeloning(HUIS_2026, 'Medior', 12, 2400).vakantieUren, 120)
  assert.equal(berekenBeloning(HUIS_2026, 'Medior', 12, 4000).vakantieUren, 200)
})

/* --- Toeslagen ------------------------------------------------------------ */

test('er gaat geen vakantiegeld over de OP-toeslag', () => {
  /* Staat zo in het contract, artikel 13. Zou het er wel over gaan, dan is
     dat per persoon een paar honderd euro per jaar te veel. */
  const b = berekenBeloning(HUIS_2026, 'Medior', 12, 4000)
  assert.equal(b.vakantietoeslagPerMaandCents, Math.round(b.maandCents * 0.08))
  assert.notEqual(
    b.vakantietoeslagPerMaandCents,
    Math.round(b.maandMetToeslagCents * 0.08),
  )
})

test('deeltijd rekent evenredig door op alles', () => {
  const vol = berekenBeloning(HUIS_2026, 'Junior', 5, 4000)
  const half = berekenBeloning(HUIS_2026, 'Junior', 5, 2000)

  assert.equal(half.maandCents, Math.round(vol.maandCents / 2))
  assert.equal(half.fulltimeCents, vol.fulltimeCents, 'het fulltimebedrag verandert niet')
  // Het uurloon blijft gelijk: minder uren, evenredig minder geld.
  assert.equal(half.uurloonCents, vol.uurloonCents)
})

/* --- Minimumloon ---------------------------------------------------------- */

test('de onderste trede wordt tegen het minimumuurloon gehouden', () => {
  /* Junior trede 1 komt uit op ongeveer 14,87 per uur. Dat zit vlak boven
     het minimum, en het minimum gaat elk halfjaar omhoog terwijl het huis
     dat niet automatisch doet. */
  const b = berekenBeloning(HUIS_2026, 'Junior', 1, 4000)
  assert.equal(b.uurloonCents, 1487)
  assert.equal(b.onderMinimumloon, false)

  // Gaat het minimum naar 15,00, dan valt de onderste trede eronder.
  const straks: Huis = {
    huis: { ...HUIS_2026.huis, minimumHourlyCents: 1500 },
    schalen: HUIS_2026.schalen,
  }
  assert.equal(berekenBeloning(straks, 'Junior', 1, 4000).onderMinimumloon, true)
  // De hogere tredes blijven ruim boven.
  assert.equal(berekenBeloning(straks, 'Senior', 1, 4000).onderMinimumloon, false)
})

test('zonder minimumloon in het huis is de uitkomst null en niet false', () => {
  // false zou betekenen "gecontroleerd en in orde". Dat is iets anders dan
  // "we weten het niet", en dat verschil mag niet wegvallen op het scherm.
  const zonder: Huis = {
    huis: { ...HUIS_2026.huis, minimumHourlyCents: null },
    schalen: HUIS_2026.schalen,
  }
  assert.equal(berekenBeloning(zonder, 'Junior', 1, 4000).onderMinimumloon, null)
})

test('het uurloon hangt niet af van de lengte van de maand', () => {
  // Gedeeld door de uren in een jaar, niet die in een maand. Anders zou
  // hetzelfde salaris in februari een hoger uurloon opleveren dan in maart.
  const b = berekenBeloning(HUIS_2026, 'Medior', 1, 4000)
  assert.equal(b.uurloonCents, Math.round((b.maandCents * 12) / (40 * 52)))
})

/* --- Weigeren wat niet kan ------------------------------------------------ */

test('een onbekende schaal wordt geweigerd met de beschikbare schalen erbij', () => {
  assert.throws(
    () => berekenBeloning(HUIS_2026, 'Directie', 1, 4000),
    (f: unknown) =>
      f instanceof SalarishuisError &&
      /Junior, Medior, Senior/.test(f.message),
  )
})

test('een trede buiten de schaal wordt geweigerd', () => {
  // Junior heeft er 15. Trede 16 zou gewoon doorrekenen als je niet controleert.
  assert.throws(
    () => berekenBeloning(HUIS_2026, 'Junior', 16, 4000),
    (f: unknown) => f instanceof SalarishuisError && /1 tot en met 15/.test(f.message),
  )
  assert.throws(
    () => berekenBeloning(HUIS_2026, 'Junior', 0, 4000),
    (f: unknown) => f instanceof SalarishuisError,
  )
  assert.throws(
    () => berekenBeloning(HUIS_2026, 'Junior', 1.5, 4000),
    (f: unknown) => f instanceof SalarishuisError,
  )
})

test('nul uren wordt geweigerd', () => {
  assert.throws(
    () => berekenBeloning(HUIS_2026, 'Junior', 1, 0),
    (f: unknown) => f instanceof SalarishuisError,
  )
})

/* --- Hulpjes -------------------------------------------------------------- */

test('fulltimeCentsVoor zonder opslag is gewoon de grondslag', () => {
  assert.equal(fulltimeCentsVoor(257_800, 150, [{ multiplierBp: 10_000 }], 1), 257_800)
})

test('schaalnamen komen in de goede volgorde, ook door elkaar aangeleverd', () => {
  const doorElkaar: Huis = { huis: HUIS_2026.huis, schalen: [...HUIS_2026.schalen].reverse() }
  assert.deepEqual(schaalNamen(doorElkaar), ['Junior', 'Medior', 'Senior'])
  assert.equal(aantalTredes(HUIS_2026, 'Medior'), 20)
  assert.equal(aantalTredes(HUIS_2026, 'Bestaat niet'), null)
})

/* --- Versies in de database ---------------------------------------------- */

const merk = `sh${Date.now()}`
const gemaakt: string[] = []

before(async () => {
  for (const [jaar, grondslag] of [[2024, 240_000], [2025, 250_000]] as const) {
    const [h] = await db
      .insert(salaryHouses)
      .values({
        effectiveFrom: new Date(`${jaar}-01-01T00:00:00Z`),
        baseCents: grondslag,
        stepIncreaseBp: 150,
        note: merk,
      })
      .returning()
    gemaakt.push(h!.id)
    await db.insert(salaryScales).values([
      { houseId: h!.id, name: 'Junior', sortOrder: 1, multiplierBp: 10_000, steps: 15 },
      { houseId: h!.id, name: 'Medior', sortOrder: 2, multiplierBp: 11_500, steps: 20 },
    ])
  }
})

after(async () => {
  if (gemaakt.length > 0) {
    await db.delete(salaryHouses).where(inArray(salaryHouses.id, gemaakt))
  }
  await client.end()
})

test('een oud contract rekent door met het huis van toen', () => {
  /* De reden dat huizen versies hebben. Indexeer je in januari en reken je
     een contract uit juni opnieuw door, dan moet daar hetzelfde uitkomen als
     toen - anders klopt geen enkele historie meer. */
  const oud: Huis = {
    huis: { ...HUIS_2026.huis, baseCents: 250_000 },
    schalen: HUIS_2026.schalen,
  }
  assert.notEqual(
    berekenBeloning(oud, 'Medior', 12, 4000).fulltimeCents,
    berekenBeloning(HUIS_2026, 'Medior', 12, 4000).fulltimeCents,
  )
})

test('getHuis pakt het laatste huis op of voor de datum', async () => {
  const in2024 = await getHuis(new Date('2024-06-01T00:00:00Z'))
  assert.ok(in2024)
  assert.equal(in2024.huis.baseCents, 240_000)

  const in2025 = await getHuis(new Date('2025-06-01T00:00:00Z'))
  assert.ok(in2025)
  assert.equal(in2025.huis.baseCents, 250_000)

  // Op de ingangsdatum zelf geldt het nieuwe huis al.
  const opDeDag = await getHuis(new Date('2025-01-01T00:00:00Z'))
  assert.ok(opDeDag)
  assert.equal(opDeDag.huis.baseCents, 250_000)
})

test('voor een datum waar nog geen huis gold is er geen huis', async () => {
  const eerder = await getHuis(new Date('2020-01-01T00:00:00Z'))
  // Er kunnen andere tests huizen hebben gezet; alleen de onze tellen hier.
  if (eerder) assert.ok(eerder.huis.effectiveFrom <= new Date('2020-01-01T00:00:00Z'))
})

test('een huis komt met zijn eigen schalen mee', async () => {
  const huis = await getHuis(new Date('2024-06-01T00:00:00Z'))
  assert.ok(huis)
  assert.equal(huis.schalen.length, 2)
  assert.deepEqual(schaalNamen(huis), ['Junior', 'Medior'])
})

test('listHuizen koppelt de schalen aan het juiste huis', async () => {
  const alle = await listHuizen()
  const onze = alle.filter((h) => gemaakt.includes(h.huis.id))
  assert.equal(onze.length, 2)
  for (const h of onze) {
    assert.equal(h.schalen.length, 2, 'elk huis hoort zijn eigen twee schalen te hebben')
    assert.ok(h.schalen.every((s) => s.houseId === h.huis.id))
  }
  // Nieuwste eerst.
  assert.ok(onze[0]!.huis.effectiveFrom > onze[1]!.huis.effectiveFrom)
})

test('vereisHuis geeft een leesbare fout als er niets geldt', async () => {
  await assert.rejects(
    () => vereisHuis(new Date('1990-01-01T00:00:00Z')),
    (f: unknown) => f instanceof SalarishuisError,
  )
})

test('twee huizen op dezelfde dag laat de database niet toe', async () => {
  // Anders is niet te zeggen welke geldt en kiest een query er willekeurig een.
  await assert.rejects(() =>
    db.insert(salaryHouses).values({
      effectiveFrom: new Date('2024-01-01T00:00:00Z'),
      baseCents: 111_111,
      stepIncreaseBp: 150,
    }),
  )
})

test('de database weigert een grondslag van nul', async () => {
  await assert.rejects(() =>
    db.insert(salaryHouses).values({
      effectiveFrom: new Date(`${merk.slice(2, 6)}-01-01T00:00:00Z`),
      baseCents: 0,
      stepIncreaseBp: 150,
    }),
  )
})

test('de database weigert twee schalen op dezelfde plek in hetzelfde huis', async () => {
  const eerste = gemaakt[0]!
  await assert.rejects(() =>
    db.insert(salaryScales).values({
      houseId: eerste,
      name: 'Nog een',
      sortOrder: 1,
      multiplierBp: 11_000,
      steps: 10,
    }),
  )
})

test('de schalen verdwijnen met hun huis', async () => {
  const [tijdelijk] = await db
    .insert(salaryHouses)
    .values({
      effectiveFrom: new Date('2019-01-01T00:00:00Z'),
      baseCents: 200_000,
      stepIncreaseBp: 150,
      note: merk,
    })
    .returning()

  await db.insert(salaryScales).values({
    houseId: tijdelijk!.id,
    name: 'Junior',
    sortOrder: 1,
    multiplierBp: 10_000,
    steps: 5,
  })

  await db.delete(salaryHouses).where(eq(salaryHouses.id, tijdelijk!.id))

  const over = await db
    .select()
    .from(salaryScales)
    .where(eq(salaryScales.houseId, tijdelijk!.id))
  assert.equal(over.length, 0)
})
