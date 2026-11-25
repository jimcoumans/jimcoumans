import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { KoppelingFout } from '../google'
import {
  GoogleAdsToegangFout,
  controleerMunt,
  gaql,
  googleAdsInstellingen,
  googleAdsKlantId,
  klantenGaql,
  leesGoogleAds,
  leesGoogleAdsFout,
  leesGoogleAdsKlanten,
  microsNaarCenten,
  toonKlantId,
} from '../google-ads'

describe('instellingen', () => {
  it('noemt wat ontbreekt', () => {
    assert.deepEqual(googleAdsInstellingen({}).ontbreekt, ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_LOGIN_CUSTOMER_ID'])
    const i = googleAdsInstellingen({ GOOGLE_ADS_DEVELOPER_TOKEN: 'abc', GOOGLE_ADS_LOGIN_CUSTOMER_ID: '123-456-7890' })
    assert.equal(i.klaar, true)
    assert.equal(i.loginCustomerId, '1234567890', 'streepjes gaan eraf')
    assert.equal(googleAdsInstellingen({ GOOGLE_ADS_DEVELOPER_TOKEN: 'abc', GOOGLE_ADS_LOGIN_CUSTOMER_ID: '12' }).klaar, false)
  })
  it('haalt de streepjes uit het klant-ID', () => {
    assert.equal(googleAdsKlantId('123-456-7890'), '1234567890')
    assert.equal(googleAdsKlantId(' 1234567890 '), '1234567890')
    assert.throws(() => googleAdsKlantId('12345'), KoppelingFout)
  })
})

describe('micros naar centen', () => {
  it('rekent zonder float en rondt halve centen naar boven', () => {
    assert.equal(microsNaarCenten('1234560'), 123)
    assert.equal(microsNaarCenten('1235000'), 124, 'precies een halve cent gaat omhoog')
    assert.equal(microsNaarCenten('1234999'), 123)
    assert.equal(microsNaarCenten(0), 0)
    assert.equal(microsNaarCenten(undefined), 0)
    // Groter dan wat een float exact kan: 9.007.199.254.740.993 micro's.
    assert.equal(microsNaarCenten('9007199254740993'), 900719925474)
    assert.throws(() => microsNaarCenten('12.5'), KoppelingFout)
  })
})

describe('antwoord lezen', () => {
  it('maakt van de batches van searchStream dagcijfers voor google_ads', () => {
    const rijen = leesGoogleAds([
      {
        results: [
          { segments: { date: '2026-10-01' }, metrics: { impressions: '1200', clicks: '48', conversions: 2.5, costMicros: '15430000' } },
          { segments: { date: '2026-10-02' }, metrics: { impressions: '900', clicks: '30', conversions: 0, costMicros: '9995000' } },
        ],
      },
      { results: [{ segments: { date: '2026-10-03' }, metrics: { impressions: '0', clicks: '0', conversions: 0, costMicros: '0' } }] },
    ])
    assert.deepEqual(rijen, [
      { day: '2026-10-01', bron: 'google_ads', impressions: 1200, clicks: 48, conversions: 3, costCents: 1543 },
      { day: '2026-10-02', bron: 'google_ads', impressions: 900, clicks: 30, conversions: 0, costCents: 1000 },
      { day: '2026-10-03', bron: 'google_ads', impressions: 0, clicks: 0, conversions: 0, costCents: 0 },
    ])
  })
  it('telt meer regels op dezelfde dag op en slaat regels zonder datum over', () => {
    const rijen = leesGoogleAds({
      results: [
        { segments: { date: '2026-10-01' }, metrics: { impressions: '10', clicks: '1', costMicros: '10000' } },
        { segments: { date: '2026-10-01' }, metrics: { impressions: '5', clicks: '2', costMicros: '20000' } },
        { metrics: { impressions: '999' } },
      ],
    })
    assert.deepEqual(rijen, [{ day: '2026-10-01', bron: 'google_ads', impressions: 15, clicks: 3, conversions: 0, costCents: 3 }])
    assert.deepEqual(leesGoogleAds([]), [])
  })
  it('weigert een account dat niet in euro’s rekent', () => {
    assert.throws(() => controleerMunt([{ results: [{ segments: { date: '2026-10-01' }, customer: { currencyCode: 'USD' } }] }]), /USD/)
    assert.doesNotThrow(() => controleerMunt([{ results: [{ segments: { date: '2026-10-01' }, customer: { currencyCode: 'EUR' } }] }]))
  })
  it('vraagt per dag om de totalen van het account', () => {
    const q = gaql('2026-10-01', '2026-10-31')
    assert.match(q, /FROM customer/)
    assert.match(q, /segments\.date BETWEEN '2026-10-01' AND '2026-10-31'/)
    assert.match(q, /metrics\.cost_micros/)
  })
})

describe('fouten', () => {
  const met = (code: Record<string, string>) => ({
    error: { code: 403, message: 'The caller does not have permission', status: 'PERMISSION_DENIED', details: [{ errors: [{ errorCode: code, message: 'x' }] }] },
  })
  it('legt uit dat de developer token nog op Test-niveau staat', () => {
    const f = leesGoogleAdsFout(403, [met({ authorizationError: 'DEVELOPER_TOKEN_NOT_APPROVED' })])
    assert.match(f.message, /Test-niveau/)
    assert.match(f.message, /API Center/)
    assert.ok(!(f instanceof GoogleAdsToegangFout), 'een ander Google-account helpt hier niet')
  })
  it('legt uit dat het Cloud-project van de OAuth-client nog Test-toegang heeft', () => {
    const f = leesGoogleAdsFout(403, met({ authorizationError: 'CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION' }))
    assert.match(f.message, /Cloud-project/)
    assert.ok(!(f instanceof GoogleAdsToegangFout))
  })
  it('markeert fouten waarbij een ander verbonden account kan helpen', () => {
    assert.ok(leesGoogleAdsFout(403, met({ authorizationError: 'USER_PERMISSION_DENIED' })) instanceof GoogleAdsToegangFout)
    assert.ok(leesGoogleAdsFout(401, null) instanceof GoogleAdsToegangFout)
    assert.ok(leesGoogleAdsFout(403, met({ authenticationError: 'NOT_ADS_USER' })) instanceof GoogleAdsToegangFout)
  })
  it('noemt de variabele bij een verkeerde developer token', () => {
    assert.match(leesGoogleAdsFout(401, met({ authenticationError: 'DEVELOPER_TOKEN_INVALID' })).message, /GOOGLE_ADS_DEVELOPER_TOKEN/)
  })
  it('valt terug op de melding van Google, met de geneste details erbij', () => {
    assert.match(leesGoogleAdsFout(500, { error: { message: 'Internal error' } }).message, /fout 500: Internal error/)
    assert.match(leesGoogleAdsFout(404, null).message, /klant-ID niet/)
    const f = leesGoogleAdsFout(403, {
      error: { message: 'The caller does not have permission', details: [{ errors: [{ errorCode: { quotaError: 'RESOURCE_EXHAUSTED' }, message: 'Too many requests' }] }] },
    })
    assert.match(f.message, /The caller does not have permission · RESOURCE_EXHAUSTED · Too many requests/)
  })
})

describe('klantaccounts onder het MCC', () => {
  it('vraagt de ingeschakelde accounts van de boom onder het MCC', () => {
    assert.match(klantenGaql(), /FROM customer_client/)
    assert.match(klantenGaql(), /customer_client\.status = 'ENABLED'/)
  })
  it('laat het MCC en sub-MCC’s weg en sorteert op naam', () => {
    const klanten = leesGoogleAdsKlanten([
      {
        results: [
          { customerClient: { id: '1111111111', descriptiveName: 'James Robinson MCC', manager: true, currencyCode: 'EUR' } },
          { customerClient: { id: '2222222222', descriptiveName: 'Thiessen Wijnkoopers', manager: false, currencyCode: 'EUR' } },
          { customerClient: { id: '3333333333', descriptiveName: 'Bakkerij De Korenaar', manager: false, currencyCode: 'USD' } },
        ],
      },
      { results: [{ customerClient: { id: 4444444444, manager: false } }, { customerClient: { id: '2222222222', descriptiveName: 'Thiessen Wijnkoopers', manager: false } }] },
    ])
    assert.deepEqual(klanten, [
      { id: '4444444444', naam: '444-444-4444', munt: 'EUR' },
      { id: '3333333333', naam: 'Bakkerij De Korenaar', munt: 'USD' },
      { id: '2222222222', naam: 'Thiessen Wijnkoopers', munt: 'EUR' },
    ])
    assert.deepEqual(leesGoogleAdsKlanten({}), [])
  })
  it('toont het klant-ID met streepjes', () => {
    assert.equal(toonKlantId('1234567890'), '123-456-7890')
    assert.equal(toonKlantId('12'), '12')
  })
})
