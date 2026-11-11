/**
 * Tests voor de analyse: de matrix van benchmark en trend, en de
 * seizoenscheck. Een daling boven de benchmark is melden, niet alarmeren;
 * een daling onder de benchmark is urgent.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kanalen, type MaandRij, type Provider } from '../bereken'
import { analyseer, trend, type AnalyseInvoer } from '../analyse'

const GEKOPPELD = new Set<Provider>(['ga4', 'search_console', 'google_ads'])

/** Eén maand met Google Ads: impressies, bezoekers, conversies. */
const maand = (impressies: number, bezoekers: number, conversies: number) =>
  ({
    kanalen: kanalen(
      [
        { organizationId: 'a', maand: 'x', bron: 'google_ads', provider: 'google_ads', impressions: impressies, clicks: null, sessions: null, conversions: null, costCents: 10000 },
        { organizationId: 'a', maand: 'x', bron: 'google_ads', provider: 'ga4', impressions: null, clicks: null, sessions: bezoekers, conversions: conversies, costCents: null },
      ] satisfies MaandRij[],
      GEKOPPELD,
    ),
  })

const basis = (nu: ReturnType<typeof maand>, over: Partial<AnalyseInvoer> = {}): AnalyseInvoer => ({
  nu,
  ervoor: [maand(100000, 2000, 60), maand(100000, 2000, 60), maand(100000, 2000, 60)],
  vorigJaar: null,
  vorigJaarErvoor: [],
  oordelen: { alle: { ctr: 'goed', cvr: 'goed' }, google_ads: { ctr: 'goed', cvr: 'goed' } },
  leerfase: false,
  metGa4: true,
  ...over,
})

test('trend: toeval is stabiel, een echte afwijking niet', () => {
  assert.equal(trend(95, 100), 'stabiel')
  assert.equal(trend(70, 100), 'daling')
  assert.equal(trend(130, 100), 'stijging')
  assert.equal(trend(5, null), 'geen')
})

test('alles stabiel en boven de benchmark: op koers', () => {
  const b = analyseer(basis(maand(100000, 2000, 60)))
  assert.deepEqual(
    b.map((x) => x.code),
    ['op_koers'],
  )
})

test('daling boven de benchmark: melden, niet alarmeren', () => {
  const b = analyseer(basis(maand(100000, 1400, 42)))
  const d = b.find((x) => x.code === 'doorklik:google_ads')!
  assert.equal(d.ernst, 'aandacht')
  assert.match(d.waarom, /boven de benchmark/)
})

test('daling onder de benchmark: urgent, en bovenaan', () => {
  const b = analyseer(basis(maand(100000, 1400, 42), { oordelen: { alle: { ctr: 'goed', cvr: 'goed' }, google_ads: { ctr: 'slecht', cvr: 'goed' } } }))
  assert.equal(b[0]?.code, 'doorklik:google_ads')
  assert.equal(b[0]?.ernst, 'urgent')
})

test('al langer onder de benchmark zonder daling: ook urgent, ander verhaal', () => {
  const b = analyseer(basis(maand(100000, 2000, 60), { oordelen: { alle: { ctr: 'goed', cvr: 'slecht' }, google_ads: { ctr: 'goed', cvr: 'slecht' } } }))
  const c = b.find((x) => x.code === 'conversie:alle')!
  assert.equal(c.ernst, 'urgent')
  assert.match(c.waarom, /niet nieuw/)
})

test('seizoen: vorig jaar dezelfde daling in dezelfde maand', () => {
  const b = analyseer(
    basis(maand(100000, 1400, 42), {
      vorigJaar: maand(100000, 1300, 40),
      vorigJaarErvoor: [maand(100000, 2000, 60), maand(100000, 2000, 60), maand(100000, 2000, 60)],
    }),
  )
  assert.match(b.find((x) => x.code === 'doorklik:google_ads')!.waarom, /seizoen/)
})

test('zonder GA4 alleen de melding over de meting', () => {
  const b = analyseer(basis(maand(100000, 1400, 42), { metGa4: false }))
  assert.deepEqual(
    b.map((x) => x.code),
    ['meting'],
  )
})

test('leerfase: geen alarm, wel de leerfase bovenaan', () => {
  const b = analyseer(basis(maand(100000, 1400, 42), { leerfase: true }))
  assert.ok(b.every((x) => x.ernst === 'neutraal'))
  assert.ok(b.some((x) => x.code === 'leerfase'))
})
