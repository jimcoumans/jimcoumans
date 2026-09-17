import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leeftijd, leeftijdOpVerjaardag } from '../leeftijd'

/* -------------------------------------------------------------------------
   Leeftijd.

   Deze tests staan er om één concrete fout: in het CRM stond "wordt 37"
   achter iemand die 37 IS. Dat komt van huidigJaar - geboortejaar, wat de
   leeftijd geeft die je dit jaar wordt. Is je verjaardag geweest, dan is dat
   je huidige leeftijd en klopt het woord "wordt" niet meer.

   De grens ligt op de verjaardag zelf, en die moet je met maand en dag samen
   uitrekenen. Vandaar de drie tests rond die dag.
   ------------------------------------------------------------------------- */

const op = (jaar: number, maand: number, dag: number) => new Date(jaar, maand - 1, dag, 12, 0, 0)

test('verjaardag is geweest: je bent al zo oud', () => {
  // Jim: 12 maart 1989. Op 17 september 2026 is hij 37, niet "wordt 37".
  assert.equal(leeftijd(12, 3, 1989, op(2026, 9, 17)), 37)
})

test('verjaardag is nog niet geweest: een jaar minder dan het jaarverschil', () => {
  assert.equal(leeftijd(12, 3, 1989, op(2026, 1, 20)), 36)
})

test('op de verjaardag zelf telt het jaar al mee', () => {
  assert.equal(leeftijd(12, 3, 1989, op(2026, 3, 12)), 37)
})

test('de dag voor de verjaardag nog niet', () => {
  assert.equal(leeftijd(12, 3, 1989, op(2026, 3, 11)), 36)
})

test('maand en dag samen, niet los vergeleken', () => {
  /* Dit is de fout die je maakt als je maand en dag apart vergelijkt:
     geboren op 3 maart, vandaag 15 februari. De maand is kleiner (2 < 3)
     maar de dag groter (15 > 3). Wie de dag los checkt, rekent de verjaardag
     als geweest en geeft een jaar te veel. */
  assert.equal(leeftijd(3, 3, 2000, op(2026, 2, 15)), 25)
  // En omgekeerd: geboren op 25 maart, vandaag 3 april. Verjaardag geweest.
  assert.equal(leeftijd(25, 3, 2000, op(2026, 4, 3)), 26)
})

test('29 februari in een jaar zonder 29 februari', () => {
  /* Geboren op een schrikkeldag. Op 28 februari in een gewoon jaar is de
     verjaardag nog niet geweest, op 1 maart wel. Dat is de juridische lezing
     in Nederland en het is ook de enige die niet raar is. */
  assert.equal(leeftijd(29, 2, 2000, op(2026, 2, 28)), 25)
  assert.equal(leeftijd(29, 2, 2000, op(2026, 3, 1)), 26)
  // In een schrikkeljaar op de dag zelf: wel al.
  assert.equal(leeftijd(29, 2, 2000, op(2028, 2, 29)), 28)
})

test('geen leeftijd zonder complete geboortedatum', () => {
  // Niet iedereen geeft zijn geboortejaar. Een verzonnen leeftijd is erger
  // dan geen leeftijd, dus null en geen 0.
  assert.equal(leeftijd(12, 3, null, op(2026, 9, 17)), null)
  assert.equal(leeftijd(12, null, 1989, op(2026, 9, 17)), null)
  assert.equal(leeftijd(null, 3, 1989, op(2026, 9, 17)), null)
})

test('een geboortejaar in de toekomst geeft null, geen negatieve leeftijd', () => {
  // Typefout in de invoer. "min 4 jaar" op een scherm is verwarrender dan
  // een streepje.
  assert.equal(leeftijd(12, 3, 2030, op(2026, 9, 17)), null)
})

test('een baby van nul is nul en niet null', () => {
  // Grensgeval: 0 is een geldige leeftijd en moet niet als "onbekend"
  // wegvallen. Dat gebeurt zodra iemand `if (!leeftijd)` schrijft.
  assert.equal(leeftijd(1, 3, 2026, op(2026, 9, 17)), 0)
})

test('leeftijdOpVerjaardag geeft wat iemand wordt, niet wat hij is', () => {
  // Dit is de andere vraag, voor het overzicht van aankomende verjaardagen:
  // daar stuur je een kaartje met een getal erop.
  assert.equal(leeftijdOpVerjaardag(1989, 2026), 37)
  assert.equal(leeftijdOpVerjaardag(1989, 2027), 38)
  assert.equal(leeftijdOpVerjaardag(null, 2026), null)
  assert.equal(leeftijdOpVerjaardag(2030, 2026), null)
})

test('de twee functies verschillen een jaar zolang de verjaardag nog moet komen', () => {
  const nu = op(2026, 1, 20)
  assert.equal(leeftijd(12, 3, 1989, nu), 36)
  assert.equal(leeftijdOpVerjaardag(1989, 2026), 37)
})
