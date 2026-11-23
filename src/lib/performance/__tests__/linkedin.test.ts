import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { KoppelingFout } from '../google'
import {
  LinkedinToegangFout,
  accountsPad,
  analyticsPad,
  controleerMunt,
  haalLinkedinAccounts,
  kostenNaarCenten,
  leesLinkedin,
  leesLinkedinAccounts,
  leesLinkedinFout,
  leesTokens,
  linkedinAccountId,
  linkedinAutorisatieUrl,
  linkedinInstellingen,
  linkedinTerugUrl,
  tokenNogGoed,
} from '../linkedin'

describe('instellingen', () => {
  it('noemt wat ontbreekt', () => {
    assert.deepEqual(linkedinInstellingen({}).ontbreekt, ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'TOKEN_SLEUTEL'])
    assert.equal(linkedinInstellingen({ LINKEDIN_CLIENT_ID: 'a', LINKEDIN_CLIENT_SECRET: 'b', TOKEN_SLEUTEL: 'x'.repeat(32) }).klaar, true)
    assert.match(linkedinInstellingen({ LINKEDIN_CLIENT_ID: 'a', LINKEDIN_CLIENT_SECRET: 'b', TOKEN_SLEUTEL: 'kort' }).ontbreekt.join(), /minstens 32/)
  })
  it('gebruikt APP_URL voor het terugadres', () => {
    assert.equal(linkedinTerugUrl('http://localhost:3000', { APP_URL: 'https://wallet.example/' }), 'https://wallet.example/api/linkedin/terug')
    assert.equal(linkedinTerugUrl('http://localhost:3000', {}), 'http://localhost:3000/api/linkedin/terug')
  })
})

describe('inloggen', () => {
  it('vraagt alleen leesrechten op advertenties', () => {
    const u = new URL(linkedinAutorisatieUrl('https://wallet.example/api/linkedin/terug', 'st', 'cid'))
    assert.equal(u.origin + u.pathname, 'https://www.linkedin.com/oauth/v2/authorization')
    assert.equal(u.searchParams.get('scope'), 'r_ads r_ads_reporting')
    assert.equal(u.searchParams.get('state'), 'st')
    assert.equal(u.searchParams.get('response_type'), 'code')
  })
  it('leest beide tokens met hun looptijd', () => {
    const nu = new Date('2026-11-23T12:00:00Z')
    const t = leesTokens({ access_token: 'A', expires_in: 5184000, refresh_token: 'R', refresh_token_expires_in: 31536000, scope: 'r_ads,r_ads_reporting' }, nu)
    assert.equal(t.accessToken, 'A')
    assert.equal(t.accessTokenExpiresAt.toISOString(), '2027-01-22T12:00:00.000Z')
    assert.equal(t.refreshTokenExpiresAt.toISOString(), '2027-11-23T12:00:00.000Z')
  })
  it('houdt bij vernieuwen het oude vernieuwtoken als er geen nieuw meekomt', () => {
    const vorige = { refreshToken: 'R', refreshTokenExpiresAt: new Date('2027-06-01T00:00:00Z') }
    const t = leesTokens({ access_token: 'A2', expires_in: 100 }, new Date(), vorige)
    assert.equal(t.refreshToken, 'R')
    assert.equal(t.refreshTokenExpiresAt, vorige.refreshTokenExpiresAt)
    // Zonder vernieuwtoken: de verbinding loopt even lang als het toegangstoken.
    const los = leesTokens({ access_token: 'A', expires_in: 100 }, new Date('2026-11-23T12:00:00Z'))
    assert.equal(los.refreshToken, '')
    assert.equal(los.refreshTokenExpiresAt.toISOString(), los.accessTokenExpiresAt.toISOString())
    assert.throws(() => leesTokens({}), /toegangstoken/)
  })
  it('vernieuwt een week voor het verlopen', () => {
    const nu = new Date('2026-11-23T12:00:00Z')
    assert.equal(tokenNogGoed(new Date('2026-12-23T12:00:00Z'), nu), true)
    assert.equal(tokenNogGoed(new Date('2026-11-28T12:00:00Z'), nu), false)
    assert.equal(tokenNogGoed(new Date('2026-11-28T12:00:00Z'), nu, 0), true)
  })
})

describe('advertentieaccounts', () => {
  it('zoekt actieve accounts in Rest.li-syntax en pagineert met een token', () => {
    assert.match(accountsPad(), /^adAccounts\?q=search&pageSize=1000&search=\(status:\(values:List\(ACTIVE\)\)\)$/)
    assert.match(accountsPad('abc'), /pageToken=abc/)
  })
  it('laat testaccounts en niet-actieve accounts weg', () => {
    const uit = leesLinkedinAccounts({
      elements: [
        { id: 512345678, name: 'Thiessen Wijnkoopers', currency: 'EUR', status: 'ACTIVE' },
        { id: 512345679, name: 'Test', currency: 'EUR', status: 'ACTIVE', test: true },
        { id: 512345680, name: 'Oud', currency: 'EUR', status: 'CANCELED' },
        { id: 512345681, currency: 'USD', status: 'ACTIVE' },
      ],
    })
    assert.deepEqual(uit, [
      { id: '512345678', naam: 'Thiessen Wijnkoopers', munt: 'EUR' },
      { id: '512345681', naam: '512345681', munt: 'USD' },
    ])
  })
  it('volgt nextPageToken en stuurt de versie mee', async () => {
    const paginas = [
      { elements: [{ id: 2, name: 'B', currency: 'EUR' }], metadata: { nextPageToken: 'p2' } },
      { elements: [{ id: 1, name: 'A', currency: 'EUR' }, { id: 2, name: 'B', currency: 'EUR' }] },
    ]
    const gezien: { url: string; versie: string | null }[] = []
    const fetchMock = mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
      gezien.push({ url: String(url), versie: (init?.headers as Record<string, string>)['Linkedin-Version'] ?? null })
      return new Response(JSON.stringify(paginas.shift()), { status: 200 })
    })
    try {
      const uit = await haalLinkedinAccounts('T')
      assert.deepEqual(
        uit.map((a) => a.naam),
        ['A', 'B'],
      )
      assert.equal(fetchMock.mock.callCount(), 2)
      assert.match(gezien[1]?.url ?? '', /pageToken=p2/)
      assert.equal(gezien[0]?.versie, '202611')
    } finally {
      fetchMock.mock.restore()
    }
  })
})

describe('dagcijfers', () => {
  it('bouwt de analytics-vraag per dag voor één account', () => {
    const pad = analyticsPad('512345678', '2026-10-01', '2026-10-31')
    assert.match(pad, /pivot=ACCOUNT&timeGranularity=DAILY/)
    assert.match(pad, /dateRange=\(start:\(year:2026,month:10,day:1\),end:\(year:2026,month:10,day:31\)\)/)
    assert.match(pad, /accounts=List\(urn%3Ali%3AsponsoredAccount%3A512345678\)/)
    assert.match(pad, /fields=dateRange,impressions,clicks,costInLocalCurrency,externalWebsiteConversions/)
  })
  it('maakt van de elementen dagcijfers voor linkedin', () => {
    const rijen = leesLinkedin({
      elements: [
        { dateRange: { start: { year: 2026, month: 10, day: 2 } }, impressions: 900, clicks: 30, costInLocalCurrency: '99.95', externalWebsiteConversions: 1 },
        { dateRange: { start: { year: 2026, month: 10, day: 1 } }, impressions: 1200, clicks: 48, costInLocalCurrency: '154.30', externalWebsiteConversions: 2 },
        { impressions: 5 },
      ],
    })
    assert.deepEqual(rijen, [
      { day: '2026-10-01', bron: 'linkedin', impressions: 1200, clicks: 48, conversions: 2, costCents: 15430 },
      { day: '2026-10-02', bron: 'linkedin', impressions: 900, clicks: 30, conversions: 1, costCents: 9995 },
    ])
  })
  it('rekent kosten om zonder float en weigert andere munten', () => {
    assert.equal(kostenNaarCenten('0.0'), 0)
    assert.equal(kostenNaarCenten('12.345'), 1235)
    assert.throws(() => kostenNaarCenten('abc'), KoppelingFout)
    assert.throws(() => controleerMunt({ currency: 'USD' }), /USD/)
    assert.doesNotThrow(() => controleerMunt({ currency: 'EUR' }))
    assert.equal(linkedinAccountId('urn:li:sponsoredAccount:512345678'), '512345678')
    assert.throws(() => linkedinAccountId('abc'), KoppelingFout)
  })
})

describe('fouten', () => {
  it('markeert fouten waarbij een ander LinkedIn-account kan helpen', () => {
    assert.ok(leesLinkedinFout(401, { message: 'expired' }) instanceof LinkedinToegangFout)
    assert.ok(leesLinkedinFout(403, { message: 'Not enough permissions' }) instanceof LinkedinToegangFout)
    assert.ok(!(leesLinkedinFout(404, { message: 'x' }) instanceof LinkedinToegangFout))
    assert.match(leesLinkedinFout(500, { message: 'Internal error' }).message, /fout 500: Internal error/)
    assert.match(leesLinkedinFout(426, { message: 'Version not supported' }).message, /202611/)
  })
})
