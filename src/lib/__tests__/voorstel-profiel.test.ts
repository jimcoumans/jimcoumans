/**
 * Tests voor het profiel voor voorstellen. Wat erin gaat, komt er schoon uit:
 * lijsten per regel zonder opsommingstekens, tarieven als positieve centen,
 * en de interne aandachtspunten gaan nooit mee naar een voorstel.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lijst, normaliseerProfiel, tarieven, voorVoorstel } from '../voorstel-profiel'
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

test('aandachtspunten gaan nooit mee naar een voorstel', () => {
  const p = normaliseerProfiel({ sterktes: 'Snel', aandachtspunten: 'Te perfectionistisch' })
  const v = voorVoorstel(p)
  assert.equal('aandachtspunten' in v, false)
  assert.deepEqual(v.sterktes, ['Snel'])

  const o = naarOpsteller({
    id: 'u1', email: 'a@b.nl', name: 'Jim', firstName: null, infix: null, lastName: null,
    jobTitle: null, phone: null, mobile: null, avatarImageId: null, endedOn: null,
    sellRateCents: 12500, voorstelProfiel: { aandachtspunten: ['intern'], tarieven: [15000] },
  })
  assert.equal(o.tariefCents, 12500)
  assert.deepEqual(o.tarieven, [15000])
  assert.equal(JSON.stringify(o).includes('intern'), false)
})
