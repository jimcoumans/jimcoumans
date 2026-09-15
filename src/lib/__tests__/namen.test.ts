/**
 * Tests voor het splitsen en samenstellen van namen.
 *
 * Het splitsen is een gok die één keer over bestaande gegevens heen gaat.
 * Juist daarom moet hij de gevallen aankunnen die in Limburg de regel zijn
 * en niet de uitzondering: van der, in 't, op de.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitsNaam, volledigeNaam, achternaamEerst, aanhefVoor } from '../namen'

test('een gewone naam splitst in voornaam en achternaam', () => {
  assert.deepEqual(splitsNaam('Jim Coumans'), {
    firstName: 'Jim',
    infix: null,
    lastName: 'Coumans',
  })
})

test('tussenvoegsels worden herkend, het langste eerst', () => {
  assert.deepEqual(splitsNaam('Pieter van der Velden'), {
    firstName: 'Pieter',
    infix: 'van der',
    lastName: 'Velden',
  })
  // Zou "van" als eerste matchen, dan werd de achternaam "der Velden".
  assert.deepEqual(splitsNaam('Anke van de Weijer'), {
    firstName: 'Anke',
    infix: 'van de',
    lastName: 'Weijer',
  })
  assert.deepEqual(splitsNaam('Rob in ’t Veld').infix, null, 'kromme apostrof telt niet mee')
  assert.deepEqual(splitsNaam("Rob in 't Veld"), {
    firstName: 'Rob',
    infix: "in 't",
    lastName: 'Veld',
  })
})

test('een achternaam die op een tussenvoegsel lijkt blijft heel', () => {
  // Denters begint met "den" maar is geen tussenvoegsel.
  assert.deepEqual(splitsNaam('Dennis Denters'), {
    firstName: 'Dennis',
    infix: null,
    lastName: 'Denters',
  })
  assert.deepEqual(splitsNaam('Karel Terpstra').infix, null)
})

test('één woord is een voornaam, geen achternaam', () => {
  assert.deepEqual(splitsNaam('Robin'), {
    firstName: 'Robin',
    infix: null,
    lastName: null,
  })
})

test('een naam die op een tussenvoegsel eindigt wordt niet afgekapt', () => {
  // Anders hield je een leeg achternaamveld over.
  const delen = splitsNaam('Jan de')
  assert.equal(delen.lastName, 'de')
  assert.equal(delen.infix, null)
})

test('lege invoer levert lege delen op', () => {
  assert.deepEqual(splitsNaam('   '), { firstName: null, infix: null, lastName: null })
})

test('dubbele spaties en spaties eromheen storen niet', () => {
  assert.deepEqual(splitsNaam('  Jim   van der  Berg '), {
    firstName: 'Jim',
    infix: 'van der',
    lastName: 'Berg',
  })
})

test('samenstellen is de omgekeerde weg', () => {
  for (const naam of ['Jim Coumans', 'Pieter van der Velden', 'Robin', "Rob in 't Veld"]) {
    assert.equal(volledigeNaam(splitsNaam(naam)), naam, `${naam} moet heen en weer kunnen`)
  }
})

test('voor een lijst staat de achternaam voorop, zonder tussenvoegsel ervoor', () => {
  // In het Nederlands sorteer je Van den Berg onder de B.
  assert.equal(achternaamEerst(splitsNaam('Jim van den Berg')), 'Berg, van den')
  assert.equal(achternaamEerst(splitsNaam('Jim Coumans')), 'Coumans')
  assert.equal(achternaamEerst(splitsNaam('Robin')), null)
})

test('de aanhef gebruikt de achternaam met tussenvoegsel', () => {
  const delen = splitsNaam('Pieter van der Velden')
  assert.equal(aanhefVoor({ ...delen, aanhef: 'heer' }), 'Geachte heer van der Velden')
  assert.equal(aanhefVoor({ ...delen, aanhef: 'mevrouw' }), 'Geachte mevrouw van der Velden')
})

test('zonder aanhef wordt het de voornaam, en nooit een gok', () => {
  const delen = splitsNaam('Pieter van der Velden')
  assert.equal(aanhefVoor({ ...delen, aanhef: null }), 'Beste Pieter')
  assert.equal(aanhefVoor({ ...delen, aanhef: 'neutraal' }), 'Beste Pieter')
})

test('zonder naam blijft er iets bruikbaars over', () => {
  assert.equal(
    aanhefVoor({ firstName: null, infix: null, lastName: null, aanhef: null }),
    'Goedendag',
  )
})
