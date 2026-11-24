import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { KoppelingFout } from '../google'
import { ahrefsDomein, ahrefsInstellingen, ahrefsUrl, domeinUitWebsite, haalAhrefs, leesAhrefsFout, leesSeo } from '../ahrefs'

describe('instellingen', () => {
  it('noemt wat ontbreekt', () => {
    assert.deepEqual(ahrefsInstellingen({}).ontbreekt, ['AHREFS_API_KEY'])
    assert.equal(ahrefsInstellingen({ AHREFS_API_KEY: ' sleutel ' }).klaar, true)
    assert.equal(ahrefsInstellingen({ AHREFS_API_KEY: ' sleutel ' }).token, 'sleutel')
  })
})

describe('domein', () => {
  it('maakt van een website het kale domein', () => {
    assert.equal(ahrefsDomein('https://www.thiessen.nl/'), 'thiessen.nl')
    assert.equal(ahrefsDomein('Thiessen.NL'), 'thiessen.nl')
    assert.equal(ahrefsDomein('http://shop.thiessen.nl/wijn?x=1#top'), 'shop.thiessen.nl')
    assert.equal(ahrefsDomein('thiessen.nl:443'), 'thiessen.nl')
  })
  it('weigert wat geen domein is', () => {
    assert.throws(() => ahrefsDomein('thiessen'), KoppelingFout)
    assert.throws(() => ahrefsDomein(''), KoppelingFout)
    assert.throws(() => ahrefsDomein('thiessen nl'), KoppelingFout)
  })
  it('vult vooraf in uit de website van de klant, of blijft leeg', () => {
    assert.equal(domeinUitWebsite('https://www.thiessen.nl'), 'thiessen.nl')
    assert.equal(domeinUitWebsite('nog onbekend'), '')
    assert.equal(domeinUitWebsite(null), '')
  })
})

describe('aanvragen', () => {
  it('vraagt per dag, met subdomeinen, in de periode', () => {
    const u = new URL(ahrefsUrl('metrics', 'thiessen.nl', '2026-10-01', '2026-10-31'))
    assert.equal(u.origin + u.pathname, 'https://api.ahrefs.com/v3/site-explorer/metrics-history')
    assert.equal(u.searchParams.get('target'), 'thiessen.nl')
    assert.equal(u.searchParams.get('date_from'), '2026-10-01')
    assert.equal(u.searchParams.get('date_to'), '2026-10-31')
    assert.equal(u.searchParams.get('history_grouping'), 'daily')
    assert.equal(u.searchParams.get('mode'), 'subdomains')
    assert.equal(u.searchParams.get('select'), 'date,org_traffic')
    assert.match(ahrefsUrl('domainRating', 'thiessen.nl', '2026-10-01', '2026-10-31'), /domain-rating-history/)
    assert.match(ahrefsUrl('keywords', 'thiessen.nl', '2026-10-01', '2026-10-31'), /keywords-history.*select=date%2Ctop3%2Ctop4_10%2Ctop11_plus/)
    assert.match(ahrefsUrl('refdomains', 'thiessen.nl', '2026-10-01', '2026-10-31'), /refdomains-history/)
  })
})

describe('antwoord lezen', () => {
  it('voegt de vier reeksen samen tot één stand per dag', () => {
    const uit = leesSeo({
      metrics: { metrics: [{ date: '2026-10-01', org_traffic: 1234 }, { date: '2026-10-02', org_traffic: 1300 }] },
      domainRating: { domain_ratings: [{ date: '2026-10-01', domain_rating: 31.456 }, { date: '2026-10-02', domain_rating: 31.5 }] },
      keywords: { keywords: [{ date: '2026-10-01', top3: 10, top4_10: 40, top11_plus: 950 }] },
      refdomains: { refdomains: [{ date: '2026-10-02', refdomains: 212 }] },
    })
    assert.deepEqual(uit, [
      { day: '2026-10-01', organicTraffic: 1234, domainRating: 31.5, organicKeywords: 1000 },
      { day: '2026-10-02', organicTraffic: 1300, domainRating: 31.5, referringDomains: 212 },
    ])
  })
  it('slaat regels zonder datum of zonder waarde over, en lege antwoorden', () => {
    const uit = leesSeo({
      metrics: { metrics: [{ org_traffic: 5 }, { date: '2026-10-03', org_traffic: null }, { date: '2026-10-04T00:00:00Z', org_traffic: '77' }] },
      domainRating: {},
      keywords: null,
    })
    assert.deepEqual(uit, [{ day: '2026-10-04', organicTraffic: 77 }])
    assert.deepEqual(leesSeo({}), [])
  })
})

describe('fouten', () => {
  it('noemt de variabele bij een geweigerde sleutel', () => {
    assert.match(leesAhrefsFout(401, { error: 'Unauthorized' }).message, /AHREFS_API_KEY/)
  })
  it('legt eenheden en limieten uit', () => {
    assert.match(leesAhrefsFout(403, { error: 'Insufficient units' }).message, /eenheden/)
    assert.match(leesAhrefsFout(429, { error: 'Rate limit' }).message, /te veel/)
    assert.match(leesAhrefsFout(400, { error: 'invalid target' }).message, /domein/)
    assert.match(leesAhrefsFout(500, null).message, /fout 500/)
  })
})

describe('ophalen', () => {
  it('doet vier aanvragen met de sleutel en voegt ze samen', async () => {
    const gezien: string[] = []
    const antwoord = (url: string) => {
      if (url.includes('metrics-history')) return { metrics: [{ date: '2026-10-01', org_traffic: 100 }] }
      if (url.includes('domain-rating-history')) return { domain_ratings: [{ date: '2026-10-01', domain_rating: 20 }] }
      if (url.includes('keywords-history')) return { keywords: [{ date: '2026-10-01', top3: 1, top4_10: 2, top11_plus: 3 }] }
      return { refdomains: [{ date: '2026-10-01', refdomains: 9 }] }
    }
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      gezien.push(url)
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer sleutel')
      return new Response(JSON.stringify(antwoord(url)), { status: 200 })
    })
    try {
      const uit = await haalAhrefs('https://www.thiessen.nl/', '2026-10-01', '2026-10-01', { AHREFS_API_KEY: 'sleutel' })
      assert.deepEqual(uit, [{ day: '2026-10-01', organicTraffic: 100, domainRating: 20, organicKeywords: 6, referringDomains: 9 }])
      assert.equal(gezien.length, 4)
      assert.ok(gezien.every((u) => u.includes('target=thiessen.nl')))
    } finally {
      fetchMock.mock.restore()
    }
  })
  it('zegt het als de sleutel ontbreekt, zonder iets op te halen', async () => {
    await assert.rejects(haalAhrefs('thiessen.nl', '2026-10-01', '2026-10-01', {}), /AHREFS_API_KEY/)
  })
  it('vertaalt een fout van Ahrefs', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    try {
      await assert.rejects(haalAhrefs('thiessen.nl', '2026-10-01', '2026-10-01', { AHREFS_API_KEY: 'x' }), /AHREFS_API_KEY wordt niet geaccepteerd/)
    } finally {
      fetchMock.mock.restore()
    }
  })
})
