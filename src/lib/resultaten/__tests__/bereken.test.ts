/**
 * Tests voor de rekenlaag van Resultaten.
 *
 * Drie dingen moeten vastliggen. Een niet-gekoppelde bron is null, geen nul:
 * anders laat het dashboard een nul zien die niet waar is. Conversies komen
 * alleen uit GA4, ook als een advertentieplatform ze zelf telt. En de
 * benchmark bestaat pas vanaf vijf klanten, zodat niemand de cijfers van één
 * andere klant kan terugrekenen.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kanalen, cijfers, benchmark, oordeel, maandNummer, isLeerfase, maandPlus, delta, type MaandRij, type Provider } from '../bereken'

const rij = (bron: string, provider: Provider, w: Partial<MaandRij>): MaandRij => ({
  organizationId: 'a',
  maand: '2026-10',
  bron,
  provider,
  impressions: null,
  clicks: null,
  sessions: null,
  conversions: null,
  costCents: null,
  ...w,
})

test('zonder koppeling is een cijfer null, niet nul', () => {
  const ks = kanalen([], new Set())
  assert.equal(ks.length, 11)
  for (const k of ks) {
    assert.equal(k.bezoekers, null)
    assert.equal(k.impressies, null)
    assert.equal(k.actief, false)
  }
  const c = cijfers(ks)
  assert.equal(c.bezoekers, null)
  assert.equal(c.cvr, null)
})

test('conversies komen alleen uit GA4', () => {
  const ks = kanalen(
    [
      rij('google_ads', 'ga4', { sessions: 100, conversions: 4 }),
      rij('google_ads', 'google_ads', { impressions: 5000, clicks: 120, conversions: 9, costCents: 30000 }),
    ],
    new Set<Provider>(['ga4', 'google_ads']),
  )
  const g = ks.find((k) => k.bron === 'google_ads')!
  assert.equal(g.conversies, 4)
  assert.equal(g.impressies, 5000)
  assert.equal(g.kostenCents, 30000)
  assert.equal(g.actief, true)
})

test('betaald kanaal zonder platformkoppeling: wel bezoekers, geen kosten', () => {
  const ks = kanalen([rij('meta', 'ga4', { sessions: 50, conversions: 1 })], new Set<Provider>(['ga4']))
  const m = ks.find((k) => k.bron === 'meta')!
  assert.equal(m.bezoekers, 50)
  assert.equal(m.kostenCents, null)
  assert.equal(m.impressies, null)
})

test('doorklikken alleen als alle actieve kanalen impressies hebben', () => {
  const gekoppeld = new Set<Provider>(['ga4', 'search_console'])
  const ks = kanalen(
    [
      rij('organisch_zoeken', 'search_console', { impressions: 10000, clicks: 300 }),
      rij('organisch_zoeken', 'ga4', { sessions: 280, conversions: 7 }),
      rij('direct', 'ga4', { sessions: 120, conversions: 3 }),
    ],
    gekoppeld,
  )
  const alle = cijfers(ks)
  assert.equal(alle.impressies, 10000)
  assert.equal(alle.impressiesDeels, true)
  assert.equal(alle.ctr, null)
  assert.equal(alle.cvr, 10 / 400)
  const zoeken = cijfers(ks.filter((k) => k.bron === 'organisch_zoeken'))
  assert.equal(zoeken.ctr, 280 / 10000)
  assert.equal(zoeken.icr, 7 / 10000)
})

test('benchmark: branche bij vijf of meer, anders alle klanten, anders geen', () => {
  const r = (id: string, branche: string, cvr: number) => ({ organizationId: id, branche, ctr: null, cvr, icr: null })
  const horeca = ['a', 'b', 'c', 'd', 'e'].map((id, i) => r(id, 'Horeca', 0.01 * (i + 1)))
  const anders = ['f', 'g'].map((id) => r(id, 'Retail', 0.5))
  const b1 = benchmark([...horeca, ...anders], 'horeca')
  assert.equal(b1?.bron, 'branche')
  assert.equal(b1?.cvr, 0.03)
  const b2 = benchmark([...horeca, ...anders], 'Retail')
  assert.equal(b2?.bron, 'alle klanten')
  assert.equal(b2?.aantal, 7)
  assert.equal(benchmark(horeca.slice(0, 4), 'Horeca'), null)
})

test('oordeel: goed, matig, slecht, en toeval telt als matig', () => {
  assert.equal(oordeel(100, 1000, 0.1), 'goed')
  assert.equal(oordeel(85, 1000, 0.1), 'matig')
  assert.equal(oordeel(60, 1000, 0.1), 'slecht')
  // Verwacht 10, gezien 6: 40% eronder, maar binnen 2 x wortel(10).
  assert.equal(oordeel(6, 100, 0.1), 'matig')
  assert.equal(oordeel(60, 1000, 0.1, true), 'leerfase')
  assert.equal(oordeel(60, 1000, null), 'geen')
})

test('maandnummer en leerfase', () => {
  assert.equal(maandNummer('2026-08-15', '2026-08'), 1)
  assert.equal(maandNummer('2026-08-15', '2026-10'), 3)
  assert.equal(isLeerfase(maandNummer('2026-08-15', '2026-10')), true)
  assert.equal(isLeerfase(maandNummer('2026-08-15', '2026-11')), false)
  assert.equal(maandNummer('2026-08-15', '2026-07'), null)
  assert.equal(maandNummer(null, '2026-07'), null)
})

test('maanden en verschil met vorig jaar', () => {
  assert.equal(maandPlus('2026-01', -1), '2025-12')
  assert.equal(maandPlus('2026-10', -12), '2025-10')
  assert.equal(delta(110, 100)?.toFixed(2), '0.10')
  assert.equal(delta(5, 0), null)
})
