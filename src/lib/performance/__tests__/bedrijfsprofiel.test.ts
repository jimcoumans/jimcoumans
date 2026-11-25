import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { KoppelingFout } from '../google'
import {
  BEDRIJFSPROFIEL_SCOPE,
  accountsUrl,
  bedrijfsprofielLocatieId,
  cijfersUrl,
  haalBedrijfsprofiel,
  haalLocaties,
  heeftBedrijfsprofielRecht,
  leesBedrijfsprofiel,
  leesBedrijfsprofielFout,
  leesLocaties,
  locatiesUrl,
} from '../bedrijfsprofiel'

describe('recht en locatienummer', () => {
  it('ziet of de verbinding het recht voor Bedrijfsprofiel heeft', () => {
    assert.equal(heeftBedrijfsprofielRecht(`openid email ${BEDRIJFSPROFIEL_SCOPE}`), true)
    assert.equal(heeftBedrijfsprofielRecht('openid email https://www.googleapis.com/auth/analytics.readonly'), false)
  })
  it('haalt het nummer uit locations/...', () => {
    assert.equal(bedrijfsprofielLocatieId('locations/12345678901'), '12345678901')
    assert.equal(bedrijfsprofielLocatieId(' 12345678901 '), '12345678901')
    assert.throws(() => bedrijfsprofielLocatieId('https://maps.google.com/?cid=1'), KoppelingFout)
  })
})

describe('profielen', () => {
  it('vraagt accounts en per account de locaties met een readMask', () => {
    assert.equal(new URL(accountsUrl()).pathname, '/v1/accounts')
    assert.equal(new URL(accountsUrl('x')).searchParams.get('pageToken'), 'x')
    const u = new URL(locatiesUrl('accounts/123'))
    assert.equal(u.pathname, '/v1/accounts/123/locations')
    assert.match(u.searchParams.get('readMask') ?? '', /title/)
    assert.equal(u.searchParams.get('pageSize'), '100')
  })
  it('leest naam, plaats en website', () => {
    assert.deepEqual(
      leesLocaties({
        locations: [
          { name: 'locations/111', title: 'Thiessen Wijnkoopers', websiteUri: 'https://www.thiessen.nl', storefrontAddress: { addressLines: ['Markt 1'], locality: 'Maastricht' } },
          { name: 'locations/222' },
          { name: 'accounts/9', title: 'Fout' },
        ],
      }),
      [
        { id: '111', naam: 'Thiessen Wijnkoopers', plaats: 'Markt 1, Maastricht', website: 'https://www.thiessen.nl' },
        { id: '222', naam: 'Locatie 222', plaats: '', website: '' },
      ],
    )
  })
  it('loopt alle accounts en pagina’s af', async () => {
    const gezien: string[] = []
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input)
      gezien.push(url)
      if (url.includes('/v1/accounts?')) return new Response(JSON.stringify({ accounts: [{ name: 'accounts/1' }, { name: 'accounts/2' }] }), { status: 200 })
      if (url.includes('accounts/1/locations') && !url.includes('pageToken'))
        return new Response(JSON.stringify({ locations: [{ name: 'locations/10', title: 'B' }], nextPageToken: 'volgende' }), { status: 200 })
      if (url.includes('accounts/1/locations')) return new Response(JSON.stringify({ locations: [{ name: 'locations/11', title: 'A' }] }), { status: 200 })
      return new Response(JSON.stringify({ locations: [{ name: 'locations/10', title: 'B' }] }), { status: 200 })
    })
    try {
      const uit = await haalLocaties('T')
      assert.deepEqual(uit.map((l) => l.id), ['11', '10'], 'op naam, en locatie 10 maar één keer')
      assert.equal(gezien.length, 4)
    } finally {
      fetchMock.mock.restore()
    }
  })
})

describe('cijfers', () => {
  it('vraagt alle maten in één keer met de datums los', () => {
    const u = new URL(cijfersUrl('111', '2026-10-01', '2026-10-31'))
    assert.equal(u.pathname, '/v1/locations/111:fetchMultiDailyMetricsTimeSeries')
    assert.ok(u.searchParams.getAll('dailyMetrics').includes('WEBSITE_CLICKS'))
    assert.ok(u.searchParams.getAll('dailyMetrics').includes('BUSINESS_IMPRESSIONS_MOBILE_MAPS'))
    assert.equal(u.searchParams.get('dailyRange.start_date.month'), '10')
    assert.equal(u.searchParams.get('dailyRange.end_date.day'), '31')
  })
  it('telt Maps en zoeken op over desktop en mobiel, per dag', () => {
    const reeks = (dailyMetric: string, waarden: [number, string | number | undefined][]) => ({
      dailyMetric,
      timeSeries: { datedValues: waarden.map(([dag, value]) => ({ date: { year: 2026, month: 10, day: dag }, value })) },
    })
    const uit = leesBedrijfsprofiel({
      multiDailyMetricTimeSeries: [
        { dailyMetricTimeSeries: [reeks('BUSINESS_IMPRESSIONS_DESKTOP_MAPS', [[1, '10'], [2, '5']]), reeks('BUSINESS_IMPRESSIONS_MOBILE_MAPS', [[1, '20']])] },
        { dailyMetricTimeSeries: [reeks('WEBSITE_CLICKS', [[1, 3], [2, undefined]]), reeks('ONBEKEND', [[1, '99']])] },
      ],
    })
    assert.deepEqual(uit, [
      { day: '2026-10-01', impressionsMaps: 30, websiteClicks: 3 },
      { day: '2026-10-02', impressionsMaps: 5, websiteClicks: 0 },
    ])
    assert.deepEqual(leesBedrijfsprofiel({}), [])
  })
  it('vraagt de laatste dagen niet, want die heeft Google nog niet', async () => {
    const gezien: string[] = []
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      gezien.push(String(input))
      return new Response(JSON.stringify({}), { status: 200 })
    })
    try {
      const vandaag = new Date('2026-10-31T12:00:00Z')
      assert.deepEqual(await haalBedrijfsprofiel('12345678901', '2026-10-01', '2026-10-31', 'T', vandaag), [])
      const u = new URL(gezien[0] ?? '')
      assert.equal(u.searchParams.get('dailyRange.end_date.day'), '28')
      assert.deepEqual(await haalBedrijfsprofiel('12345678901', '2026-10-30', '2026-10-31', 'T', vandaag), [], 'alles te vers: geen aanvraag')
      assert.equal(gezien.length, 1)
    } finally {
      fetchMock.mock.restore()
    }
  })
  it('eist een verbonden Google-account', async () => {
    await assert.rejects(haalBedrijfsprofiel('12345678901', '2026-10-01', '2026-10-02', undefined), /verbonden Google-account/)
  })
})

describe('fouten', () => {
  it('legt het quotum van Google uit', () => {
    assert.match(leesBedrijfsprofielFout(429, { error: { message: 'Quota exceeded' } }, 'Test').message, /quotum/)
    assert.match(leesBedrijfsprofielFout(403, { error: { message: 'Quota exceeded for quota metric' } }, 'Test').message, /quotum/)
  })
  it('vraagt om opnieuw verbinden bij een ontbrekend recht', () => {
    assert.match(leesBedrijfsprofielFout(403, { error: { message: 'Request had insufficient authentication scopes.' } }, 'Test').message, /Verbind het opnieuw/)
    assert.match(leesBedrijfsprofielFout(404, null, 'Test').message, /niet gevonden/)
    assert.match(leesBedrijfsprofielFout(500, { error: { message: 'boem' } }, 'Test').message, /fout 500: boem/)
  })
})
