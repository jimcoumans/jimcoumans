import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, createVerify } from 'node:crypto'
import { teHalen } from '../performance/sync'
import { leesGa4, leesSearchConsole, ga4PropertyId, searchConsoleSite, maakAssertion, leesSleutel } from '../performance/google'

test('eerste keer: laatste dagen plus een stuk historie; daarna steeds verder terug tot 13 maanden', () => {
  const vandaag = new Date('2026-10-05T03:00:00Z')
  const eerste = teHalen(null, vandaag)
  assert.deepEqual(eerste[0], { van: '2026-10-02', tot: '2026-10-05', nieuweHistorie: '2026-10-02' })
  assert.deepEqual(eerste[1], { van: '2026-06-04', tot: '2026-10-01', nieuweHistorie: '2026-06-04' })
  const later = teHalen('2026-06-04', vandaag)
  assert.equal(later[1]!.tot, '2026-06-03')
  // Het doel is de eerste van de maand, dertien maanden terug.
  const bijnaKlaar = teHalen('2025-09-15', vandaag)
  assert.equal(bijnaKlaar[1]!.van, '2025-09-01')
  assert.equal(teHalen('2025-09-01', vandaag).length, 1, 'klaar: alleen nog de laatste dagen')
})

test('GA4-antwoord wordt dagcijfers per bron, opgeteld', () => {
  const rijen = leesGa4({
    rows: [
      { dimensionValues: [{ value: '20261001' }, { value: 'google' }, { value: 'cpc' }, { value: 'Paid Search' }], metricValues: [{ value: '40' }, { value: '3' }] },
      { dimensionValues: [{ value: '20261001' }, { value: 'google' }, { value: '(not set)' }, { value: 'Cross-network' }], metricValues: [{ value: '10' }, { value: '1' }] },
      { dimensionValues: [{ value: '20261001' }, { value: 'google' }, { value: 'organic' }, { value: 'Organic Search' }], metricValues: [{ value: '25' }, { value: '0' }] },
    ],
  })
  assert.deepEqual(rijen, [
    { day: '2026-10-01', bron: 'google_ads', sessions: 50, conversions: 4 },
    { day: '2026-10-01', bron: 'organisch_zoeken', sessions: 25, conversions: 0 },
  ])
  assert.deepEqual(leesGa4({}), [])
})

test('Search Console-antwoord wordt organische impressies', () => {
  assert.deepEqual(leesSearchConsole({ rows: [{ keys: ['2026-10-01'], clicks: 12, impressions: 840 }] }), [
    { day: '2026-10-01', bron: 'organisch_zoeken', impressions: 840, clicks: 12 },
  ])
})

test('invoer van property en site wordt nagekeken met een begrijpelijke melding', () => {
  assert.equal(ga4PropertyId('properties/412345678'), '412345678')
  assert.throws(() => ga4PropertyId('G-ABC123'), /meet-ID/)
  assert.equal(searchConsoleSite('thiessen.nl'), 'sc-domain:thiessen.nl')
  assert.equal(searchConsoleSite('https://www.thiessen.nl'), 'https://www.thiessen.nl/')
  assert.throws(() => searchConsoleSite('geen site'))
})

test('het token is netjes ondertekend met de sleutel van het serviceaccount', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const sleutel = leesSleutel(Buffer.from(JSON.stringify({ client_email: 'portal@jr.iam.gserviceaccount.com', private_key: pem })).toString('base64'))
  const [kop, inhoud, handtekening] = maakAssertion(sleutel, ['a', 'b'], 1000).split('.')
  const claim = JSON.parse(Buffer.from(inhoud!, 'base64url').toString())
  assert.equal(claim.iss, 'portal@jr.iam.gserviceaccount.com')
  assert.equal(claim.scope, 'a b')
  assert.equal(claim.exp, 4600)
  assert.ok(createVerify('RSA-SHA256').update(`${kop}.${inhoud}`).verify(publicKey, Buffer.from(handtekening!, 'base64url')))
  assert.throws(() => leesSleutel(''), /ontbreekt/)
})
