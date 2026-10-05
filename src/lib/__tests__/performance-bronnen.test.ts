import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bronVoorGa4, perBron, perDag, periodeGrenzen, conversieratio } from '../performance/bronnen'

test('GA4-bezoeken vallen in de juiste bron', () => {
  const b = (source: string, medium: string, channel: string) => bronVoorGa4({ source, medium, channel })
  assert.equal(b('google', 'cpc', 'Paid Search'), 'google_ads')
  assert.equal(b('google', 'organic', 'Organic Search'), 'organisch_zoeken')
  assert.equal(b('facebook', 'paid_social', 'Paid Social'), 'meta')
  assert.equal(b('ig', 'cpc', 'Paid Social'), 'meta')
  assert.equal(b('facebook.com', 'referral', 'Organic Social'), 'organisch_social')
  assert.equal(b('linkedin', 'cpc', 'Paid Social'), 'linkedin')
  assert.equal(b('tiktok', 'paid', 'Paid Other'), 'tiktok')
  assert.equal(b('mailerlite', 'email', 'Email'), 'email')
  assert.equal(b('(direct)', '(none)', 'Direct'), 'direct')
  assert.equal(b('hotelvoncken.nl', 'referral', 'Referral'), 'verwijzing')
  assert.equal(b('bing', 'cpc', 'Paid Search'), 'overige_ads')
  // Performance Max komt binnen als cross-network vanaf google.
  assert.equal(b('google', '(not set)', 'Cross-network'), 'google_ads')
  assert.equal(b('iets', 'raar', 'Unassigned'), 'overig')
})

test('per bron optellen, zonder dubbeltelling tussen koppelingen', () => {
  const rijen = [
    // GA4 levert bezoeken en conversies, Google Ads impressies en kosten: samen één regel.
    { day: '2026-10-01', bron: 'google_ads', impressions: null, clicks: null, sessions: 120, conversions: 6, costCents: null },
    { day: '2026-10-01', bron: 'google_ads', impressions: 9000, clicks: 140, sessions: null, conversions: null, costCents: 4500 },
    { day: '2026-10-02', bron: 'organisch_zoeken', impressions: 3000, clicks: 80, sessions: 70, conversions: 2, costCents: null },
  ]
  const { totaal, bronnen } = perBron(rijen)
  assert.deepEqual(totaal, { impressies: 12000, klikken: 220, bezoeken: 190, conversies: 8, kostenCents: 4500 })
  assert.deepEqual(bronnen.map((b) => b.bron), ['google_ads', 'organisch_zoeken'])
  assert.equal(bronnen[0]!.cijfers.conversies, 6)
  assert.equal(Math.round(conversieratio(totaal)! * 100) / 100, 4.21)
  const dagen = perDag(rijen, '2026-09-30', '2026-10-02')
  assert.deepEqual(dagen.map((d) => d.cijfers.bezoeken), [0, 120, 70])
})

test('periodes en de vergelijkingsperiode ervoor', () => {
  const vandaag = new Date('2026-10-05T10:00:00Z')
  assert.deepEqual(periodeGrenzen('deze_maand', vandaag), { van: '2026-10-01', tot: '2026-10-05', vorigeVan: '2026-09-26', vorigeTot: '2026-09-30' })
  assert.deepEqual(periodeGrenzen('vorige_maand', vandaag), { van: '2026-09-01', tot: '2026-09-30', vorigeVan: '2026-08-02', vorigeTot: '2026-08-31' })
  assert.equal(periodeGrenzen('30_dagen', vandaag).van, '2026-09-06')
  assert.equal(periodeGrenzen('dit_jaar', vandaag).van, '2026-01-01')
})
