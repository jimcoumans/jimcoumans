/**
 * Tests voor de hypothese van een campagnebriefing. Geen database: alleen de
 * rekenkunde, nagerekend op de briefing Kerst bij Thiessen.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  berekenHypothese,
  verdeelPerMaand,
  parsePercentageToBp,
  parseHonderdsten,
  formatBp,
  type HypotheseInvoer,
} from '../hypothese'

/** Kerst bij Thiessen: 190 couverts, € 17.900 omzet, 3 per reservering. */
function thiessen(over: Partial<HypotheseInvoer> = {}): HypotheseInvoer {
  return {
    doelEenheden: 190,
    omzetCents: 1_790_000,
    eenhedenPerConversieHonderdsten: 300,
    conversieBp: 250,
    doorklikBp: 100,
    cpmCents: 800,
    bufferBp: 2000,
    stand: 'berekend',
    vastBudgetCents: null,
    start: new Date(2026, 9, 7, 12),
    einde: new Date(2026, 11, 17, 12),
    ...over,
  }
}

function reken(over: Partial<HypotheseInvoer> = {}) {
  const u = berekenHypothese(thiessen(over))
  assert.ok(u.ok, 'de hypothese hoort te rekenen')
  return u.hypothese
}

test('berekend: van het doel terug naar impressies', () => {
  const h = reken()
  assert.equal(h.conversies, 63)
  assert.equal(Math.round(h.bezoekers), 2520)
  assert.equal(Math.round(h.impressies), 252_000)
})

test('berekend: nodig, advies met 20% buffer afgerond op 100 euro, en deel van de omzet', () => {
  const h = reken()
  assert.equal(h.nodigCents, 201_600)
  assert.equal(h.budgetCents, 240_000)
  assert.equal(h.budgetVanOmzetBp, 1341) // 13,4%
})

test('berekend: kosten per klik en minimale conversie bij het advies', () => {
  const h = reken()
  assert.equal(Math.round(h.perKlikCents), 80)
  assert.equal(h.minimaleConversieBp, 210) // 2,1%
})

test('bandbreedte: met 60% uit advertenties loopt het advies van 1.500 tot 2.400 euro', () => {
  const h = reken({ aandeelAdsBp: 6000 })
  assert.equal(h.budgetCents, 240_000)
  // 2.016 nodig x 60% = 1.209,60; plus 20% buffer = 1.451,52; afgerond 1.500.
  assert.equal(h.ondergrensCents, 150_000)
  assert.equal(h.aandeelAdsBp, 6000)
})

test('bandbreedte: zonder aandeel, of bij 100%, alleen de bovengrens', () => {
  assert.equal(reken().ondergrensCents, null)
  assert.equal(reken({ aandeelAdsBp: 10_000 }).ondergrensCents, null)
  assert.equal(reken({ stand: 'vast', vastBudgetCents: 150_000, aandeelAdsBp: 6000 }).ondergrensCents, null)
})

test('zwakste schakel: 40% lagere conversie kost bij berekend meer budget', () => {
  const h = reken()
  assert.equal(h.zwaksteSchakel.conversieBp, 150)
  assert.equal(h.zwaksteSchakel.nodigCents, 336_000)
})

test('vast budget: van het budget vooruit naar het verwachte resultaat', () => {
  const h = reken({ stand: 'vast', vastBudgetCents: 150_000 })
  assert.equal(h.budgetCents, 150_000)
  assert.equal(h.nodigCents, null)
  assert.equal(Math.round(h.impressies), 187_500)
  assert.equal(Math.round(h.resultaatEenheden), 141)
  assert.equal(h.minimaleConversieBp, 336) // 3,4% om toch alles uit advertenties te halen
})

test('meestal is één conversie één eenheid', () => {
  const h = reken({ eenhedenPerConversieHonderdsten: 100, doelEenheden: 40, omzetCents: 0 })
  assert.equal(h.conversies, 40)
  assert.equal(h.budgetVanOmzetBp, null)
})

test('zonder aannames rekent de hypothese niet, en zegt wat er ontbreekt', () => {
  const u = berekenHypothese(thiessen({ conversieBp: null, cpmCents: null }))
  assert.equal(u.ok, false)
  if (!u.ok) assert.deepEqual(u.ontbreekt, ['conversieratio', 'kosten per 1.000 impressies'])
})

test('een vast budget zonder bedrag rekent niet', () => {
  const u = berekenHypothese(thiessen({ stand: 'vast', vastBudgetCents: null }))
  assert.equal(u.ok, false)
})

test('verdeling per maand telt altijd op tot het budget', () => {
  const v = verdeelPerMaand(240_000, new Date(2026, 9, 7, 12), new Date(2026, 11, 17, 12))
  assert.equal(v.length, 3)
  assert.equal(
    v.reduce((a, m) => a + m.cents, 0),
    240_000,
  )
  for (const m of v.slice(0, -1)) assert.equal(m.cents % 10_000, 0)
})

test('percentages en honderdsten lezen zoals mensen ze typen', () => {
  assert.equal(parsePercentageToBp('2,5'), 250)
  assert.equal(parsePercentageToBp('2.5%'), 250)
  assert.equal(parsePercentageToBp('1'), 100)
  assert.equal(parsePercentageToBp(''), null)
  assert.equal(parsePercentageToBp('twee'), null)
  assert.equal(parseHonderdsten('3'), 300)
  assert.equal(parseHonderdsten('2,25'), 225)
  assert.equal(formatBp(250), '2,5')
  assert.equal(formatBp(100), '1')
})
