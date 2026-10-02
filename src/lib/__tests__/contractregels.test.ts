/**
 * Tests voor de wettelijke regels rond een arbeidsovereenkomst.
 *
 * Alle drie de regels hieronder hebben dezelfde eigenschap: als je ze fout
 * toepast, merk je dat pas op het moment dat het geld kost. Een te lange
 * proeftijd is nietig - je denkt dat je er een hebt en je hebt er geen. Een
 * vergeten aanzegging kost een maandsalaris. Een vierde tijdelijk contract
 * is al een vast contract voordat je het opschrijft.
 *
 * Daarom staan ze hier los van alle tekst en alle database.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  maandenErbij,
  eindeVanRechtswege,
  maxProeftijdMaanden,
  toegestaneProeftijd,
  aanzegdatum,
  ketenStand,
  KETEN_MAX_CONTRACTEN,
} from '../contractregels'

const dag = (jaar: number, maand: number, d: number) => new Date(jaar, maand - 1, d, 12, 0, 0)
const alsTekst = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* --- Datums --------------------------------------------------------------- */

test('maanden optellen schuift niet over de maand heen', () => {
  /* 31 januari plus een maand is in JavaScript 3 maart, want februari heeft
     geen 31e. Voor een contractdatum is dat onacceptabel. */
  assert.equal(alsTekst(maandenErbij(dag(2026, 1, 31), 1)), '2026-02-28')
  assert.equal(alsTekst(maandenErbij(dag(2028, 1, 31), 1)), '2028-02-29', 'schrikkeljaar')
  assert.equal(alsTekst(maandenErbij(dag(2026, 3, 31), 1)), '2026-04-30')
  // En gewoon tellen waar het wel past.
  assert.equal(alsTekst(maandenErbij(dag(2026, 10, 13), 7)), '2027-05-13')
  assert.equal(alsTekst(maandenErbij(dag(2026, 12, 1), 2)), '2027-02-01', 'over het jaar heen')
  assert.equal(alsTekst(maandenErbij(dag(2027, 1, 15), -1)), '2026-12-15', 'terug in de tijd')
})

test('het einde van rechtswege is de dag voor dezelfde datum', () => {
  /* Uit het echte contract: zeven maanden vanaf 13 oktober 2026 eindigt op
     12 mei 2027. Zou het op de 13e eindigen, dan duurde het zeven maanden
     en een dag. */
  assert.equal(alsTekst(eindeVanRechtswege(dag(2026, 10, 13), 7)), '2027-05-12')
  assert.equal(alsTekst(eindeVanRechtswege(dag(2026, 1, 1), 12)), '2026-12-31')
  // Ook als de doelmaand korter is dan de startmaand.
  assert.equal(alsTekst(eindeVanRechtswege(dag(2026, 1, 31), 1)), '2026-02-27')
})

/* --- Proeftijd ------------------------------------------------------------ */

test('bij zes maanden of korter mag er geen proeftijd zijn', () => {
  // Een proeftijd die er toch staat is nietig: je denkt dat je er een hebt
  // en je hebt er geen.
  assert.equal(maxProeftijdMaanden('bepaalde_tijd', 3), 0)
  assert.equal(maxProeftijdMaanden('bepaalde_tijd', 6), 0)
})

test('boven zes maanden en onder twee jaar mag een maand', () => {
  assert.equal(maxProeftijdMaanden('bepaalde_tijd', 7), 1)
  assert.equal(maxProeftijdMaanden('bepaalde_tijd', 12), 1)
  assert.equal(maxProeftijdMaanden('bepaalde_tijd', 23), 1)
})

test('vanaf twee jaar en bij onbepaalde tijd mogen er twee', () => {
  assert.equal(maxProeftijdMaanden('bepaalde_tijd', 24), 2)
  assert.equal(maxProeftijdMaanden('onbepaalde_tijd', null), 2)
})

test('een te lange proeftijd wordt teruggebracht, niet gemeld en doorgelaten', () => {
  /* Afkappen is de enige uitkomst waarin je nog een proeftijd hebt. Een
     waarschuwing die iemand wegklikt levert een nietig beding op. */
  const zes = toegestaneProeftijd(1, 'bepaalde_tijd', 6)
  assert.equal(zes.maanden, 0)
  assert.equal(zes.aangepast, true)
  assert.match(zes.uitleg!, /niet toegestaan/)

  const zeven = toegestaneProeftijd(2, 'bepaalde_tijd', 7)
  assert.equal(zeven.maanden, 1)
  assert.equal(zeven.aangepast, true)

  // Wat mag, blijft staan en meldt niets.
  const goed = toegestaneProeftijd(1, 'bepaalde_tijd', 7)
  assert.equal(goed.maanden, 1)
  assert.equal(goed.aangepast, false)
  assert.equal(goed.uitleg, null)
})

test('het contract van Voncken mag precies een maand proeftijd', () => {
  // Zeven maanden vanaf 13 oktober. Dat is de echte casus.
  assert.equal(maxProeftijdMaanden('bepaalde_tijd', 7), 1)
  assert.equal(toegestaneProeftijd(1, 'bepaalde_tijd', 7).maanden, 1)
})

test('geen proeftijd gevraagd blijft geen proeftijd', () => {
  const r = toegestaneProeftijd(0, 'onbepaalde_tijd', null)
  assert.equal(r.maanden, 0)
  assert.equal(r.aangepast, false)
})

/* --- Aanzeggen ------------------------------------------------------------ */

test('bij zes maanden of langer moet er een maand voor het einde aangezegd worden', () => {
  const einde = dag(2027, 5, 12)
  const datum = aanzegdatum('bepaalde_tijd', einde, 7)
  assert.ok(datum)
  assert.equal(alsTekst(datum), '2027-04-12')
})

test('onder de zes maanden hoeft er niet aangezegd te worden', () => {
  assert.equal(aanzegdatum('bepaalde_tijd', dag(2027, 3, 31), 5), null)
})

test('bij onbepaalde tijd is er geen aanzegdatum', () => {
  assert.equal(aanzegdatum('onbepaalde_tijd', null, null), null)
  // Ook niet als er per ongeluk een einddatum meekomt.
  assert.equal(aanzegdatum('onbepaalde_tijd', dag(2027, 1, 1), 12), null)
})

test('precies zes maanden valt nog onder de verplichting', () => {
  // De grens ligt op zes maanden of langer, niet langer dan zes maanden.
  assert.ok(aanzegdatum('bepaalde_tijd', dag(2027, 4, 30), 6) !== null)
})

/* --- Ketenregeling -------------------------------------------------------- */

test('het eerste contract is nummer een en wordt niet vast', () => {
  const stand = ketenStand([], 7)
  assert.equal(stand.nummer, 1)
  assert.equal(stand.wordtVast, false)
})

test('het derde contract is het laatste dat tijdelijk kan', () => {
  const eerder = [
    { type: 'bepaalde_tijd', startedOn: dag(2024, 1, 1), endsOn: dag(2024, 7, 1) },
    { type: 'bepaalde_tijd', startedOn: dag(2024, 7, 1), endsOn: dag(2025, 1, 1) },
  ]
  const stand = ketenStand(eerder, 6)
  assert.equal(stand.nummer, KETEN_MAX_CONTRACTEN)
  assert.equal(stand.wordtVast, false)
  assert.match(stand.uitleg!, /laatste tijdelijke contract/)
})

test('het vierde tijdelijke contract is van rechtswege vast', () => {
  const eerder = [
    { type: 'bepaalde_tijd', startedOn: dag(2024, 1, 1), endsOn: dag(2024, 4, 1) },
    { type: 'bepaalde_tijd', startedOn: dag(2024, 4, 1), endsOn: dag(2024, 7, 1) },
    { type: 'bepaalde_tijd', startedOn: dag(2024, 7, 1), endsOn: dag(2024, 10, 1) },
  ]
  const stand = ketenStand(eerder, 6)
  assert.equal(stand.nummer, 4)
  assert.equal(stand.wordtVast, true)
  assert.match(stand.uitleg!, /onbepaalde tijd/)
})

test('boven de zesendertig maanden wordt het ook vast, ook bij minder contracten', () => {
  const eerder = [
    { type: 'bepaalde_tijd', startedOn: dag(2023, 1, 1), endsOn: dag(2024, 7, 1) }, // 18
    { type: 'bepaalde_tijd', startedOn: dag(2024, 7, 1), endsOn: dag(2026, 1, 1) }, // 18
  ]
  const stand = ketenStand(eerder, 6)
  assert.equal(stand.nummer, 3, 'nog maar het derde contract')
  assert.ok(stand.totaalMaanden > 36)
  assert.equal(stand.wordtVast, true)
})

test('een contract voor onbepaalde tijd telt niet mee in de keten', () => {
  const eerder = [
    { type: 'onbepaalde_tijd', startedOn: dag(2020, 1, 1), endsOn: null },
    { type: 'bepaalde_tijd', startedOn: dag(2024, 1, 1), endsOn: dag(2024, 7, 1) },
  ]
  assert.equal(ketenStand(eerder, 6).nummer, 2)
})

test('een stage telt niet mee in de keten van arbeidsovereenkomsten', () => {
  // Een stageovereenkomst is geen arbeidsovereenkomst.
  const eerder = [
    { type: 'stage', startedOn: dag(2024, 2, 1), endsOn: dag(2024, 7, 1) },
    { type: 'stage', startedOn: dag(2025, 2, 1), endsOn: dag(2025, 7, 1) },
    { type: 'stage', startedOn: dag(2026, 2, 1), endsOn: dag(2026, 7, 1) },
  ]
  const stand = ketenStand(eerder, 12)
  assert.equal(stand.nummer, 1)
  assert.equal(stand.wordtVast, false)
})
