/**
 * De regels van 01.2, zoals ze in het document staan. Verandert een regel,
 * dan hier en in het document tegelijk.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beoordeel, rekensom, type Antwoorden } from '../formulieren/vragenlijst'

const basis: Antwoorden = {
  aanWie: 'Aan particulieren',
  hoeKlant: 'Ze vragen een offerte, afspraak of reservering aan',
  waar: 'In de regio rond mijn vestiging',
  budgetNu: '€ 1.000 – 2.500',
  website: 'voorbeeld.nl',
  opdracht: 1500,
  duur: 'Een tot twee jaar',
  perJaar: 3,
  conversie: 25,
  doorlooptijd: 'Een paar weken',
  beginnen: 'Zo snel mogelijk',
}

test('de rekensom uit het voorbeeld van 01.2 komt op € 337,50', () => {
  assert.equal(rekensom(basis).maxPerAanvraag, 337.5)
  // Korter dan een jaar telt als een half jaar; "weet ik niet" als 20%.
  assert.equal(rekensom({ ...basis, duur: 'Korter dan een jaar', conversie: null }).maxPerAanvraag, 1500 * 3 * 0.3 * 0.5 * 0.2)
  // Eenmalig: vraag 10 valt weg.
  assert.equal(rekensom({ ...basis, duur: 'Eenmalige aankoop', perJaar: 12 }).maxPerAanvraag, 1500 * 0.3 * 0.25)
})

test('groen als alles past', () => {
  assert.equal(beoordeel(basis).kleur, 'groen')
})

test('rood gaat voor alles: direct online kopen of geen website', () => {
  assert.equal(beoordeel({ ...basis, hoeKlant: 'Ze kopen direct online', beginnen: 'Ik oriënteer me nog' }).kleur, 'rood')
  assert.equal(beoordeel({ ...basis, website: 'Ik heb nog geen website' }).kleur, 'rood')
})

test('later gaat voor oranje', () => {
  const b = beoordeel({ ...basis, beginnen: 'Later dan drie maanden', budgetNu: 'Minder dan € 1.000' })
  assert.equal(b.kleur, 'later')
})

test('oranje: budget, wat een aanvraag mag kosten, of de markt', () => {
  assert.equal(beoordeel({ ...basis, budgetNu: 'Minder dan € 1.000' }).kleur, 'oranje')
  assert.equal(beoordeel({ ...basis, budgetNu: 'Nog niets', budgetGepland: 'Minder dan € 1.000' }).kleur, 'oranje')
  assert.equal(beoordeel({ ...basis, budgetNu: 'Nog niets', budgetGepland: '€ 2.500 – 5.000' }).kleur, 'groen')
  assert.equal(beoordeel({ ...basis, opdracht: 100, perJaar: 1, conversie: 50 }).kleur, 'oranje')
  const markt = beoordeel({ ...basis, aanWie: 'Aan bedrijven', doorlooptijd: 'Langer dan een half jaar' })
  assert.equal(markt.kleur, 'oranje')
  assert.match(markt.redenen[0]!, /markt/)
  // Meer punten op oranje: één telefoontje, en het budget staat vooraan.
  const twee = beoordeel({ ...basis, budgetNu: 'Minder dan € 1.000', aanWie: 'Aan bedrijven', doorlooptijd: 'Langer dan een half jaar' })
  assert.equal(twee.redenen.length, 2)
  assert.match(twee.redenen[0]!, /Budget/)
})
