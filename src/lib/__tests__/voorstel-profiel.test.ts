/**
 * Tests voor het profiel voor voorstellen. Wat erin gaat, komt er schoon uit:
 * lijsten per regel zonder opsommingstekens, tarieven als positieve centen,
 * het interne profiel gaat nooit mee naar een voorstel, en een collega
 * kan het interne deel en de tarieven niet overschrijven.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lijst, metEigenDeel, metInternDeel, normaliseerProfiel, tarieven, voorVoorstel } from '../voorstel-profiel'
import { naarOpsteller } from '../voorstellen'

test('lijst: één punt per regel, zonder opsommingstekens en lege regels', () => {
  assert.deepEqual(lijst('- Strategie\n\n• Google Ads\n  Meta  '), ['Strategie', 'Google Ads', 'Meta'])
  assert.deepEqual(lijst(['a', '', 3]), ['a'])
})

test('tarieven: positieve centen, zonder dubbelen, oplopend', () => {
  assert.deepEqual(tarieven([15000, 7500, 15000, -1, 'x']), [7500, 15000])
})

test('normaliseren: altijd een volledig profiel, ook uit niets', () => {
  const p = normaliseerProfiel(null)
  assert.equal(p.intro, '')
  assert.deepEqual(p.expertise, [])
  assert.deepEqual(normaliseerProfiel({ intro: '  Hoi  ', expertise: 'A\nB' }).expertise, ['A', 'B'])
})

test('het interne profiel gaat nooit mee naar een voorstel', () => {
  const p = normaliseerProfiel({ intro: 'Hoi', sterktes: 'Snel', ambitie: 'Groeien', energie: 'Bouwen', aandachtspunten: 'Te perfectionistisch', bron: 'Jim K' })
  const v = voorVoorstel(p)
  for (const k of ['sterktes', 'ambitie', 'energie', 'aandachtspunten', 'bron']) assert.equal(k in v, false, k)
  assert.equal(v.intro, 'Hoi')

  const o = naarOpsteller({
    id: 'u1', email: 'a@b.nl', name: 'Jim', firstName: null, infix: null, lastName: null,
    jobTitle: null, phone: null, mobile: null, avatarImageId: null, endedOn: null,
    sellRateCents: 12500, voorstelProfiel: { aandachtspunten: ['intern'], sterktes: ['intern'], bron: 'intern', tarieven: [15000] },
  })
  assert.equal(o.tariefCents, 12500)
  assert.deepEqual(o.tarieven, [15000])
  assert.equal(JSON.stringify(o).includes('intern'), false)
})

test('een collega overschrijft het interne deel en de tarieven niet; een beheerder het eigen deel niet', () => {
  const bestaand = normaliseerProfiel({ intro: 'Oud', sterktes: 'Snel', aandachtspunten: 'Begrenzen', bron: 'Jim K', tarieven: [15000] })
  const zelf = metEigenDeel(bestaand, { intro: 'Nieuw', sterktes: 'Gehackt', aandachtspunten: '', tarieven: [1] })
  assert.equal(zelf.intro, 'Nieuw')
  assert.deepEqual(zelf.sterktes, ['Snel'])
  assert.deepEqual(zelf.aandachtspunten, ['Begrenzen'])
  assert.deepEqual(zelf.tarieven, [15000])

  const intern = metInternDeel(zelf, { intro: 'Weg', sterktes: 'Overzicht\nAfronden', bron: 'MT' })
  assert.equal(intern.intro, 'Nieuw')
  assert.deepEqual(intern.sterktes, ['Overzicht', 'Afronden'])
  assert.equal(intern.bron, 'MT')
  assert.deepEqual(intern.tarieven, [15000])
})
