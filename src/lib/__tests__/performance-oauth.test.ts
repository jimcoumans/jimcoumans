import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { autorisatieUrl, emailUitIdToken, leesGa4Lijst, leesSiteLijst, oauthInstellingen, ontsleutel, score, terugUrl, versleutel } from '../performance/oauth'

const GEHEIM = 'een-geheim-van-minstens-tweeendertig-tekens'

describe('versleutelen', () => {
  it('geeft terug wat erin ging', () => {
    const v = versleutel('1//refresh-token', GEHEIM)
    assert.equal(v.startsWith('v1.'), true)
    assert.ok(!v.includes('refresh-token'))
    assert.equal(ontsleutel(v, GEHEIM), '1//refresh-token')
  })
  it('levert elke keer iets anders op', () => {
    assert.notEqual(versleutel('x', GEHEIM), versleutel('x', GEHEIM))
  })
  it('weigert met een andere sleutel', () => {
    const v = versleutel('geheim', GEHEIM)
    assert.throws(() => ontsleutel(v, `${GEHEIM}-anders`), /past niet bij TOKEN_SLEUTEL/)
  })
  it('weigert een te korte sleutel', () => {
    assert.throws(() => versleutel('x', 'kort'), /TOKEN_SLEUTEL/)
  })
})

describe('instellingen', () => {
  it('noemt wat ontbreekt', () => {
    assert.deepEqual(oauthInstellingen({}).ontbreekt, ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'TOKEN_SLEUTEL'])
    const i = oauthInstellingen({ GOOGLE_OAUTH_CLIENT_ID: 'a', GOOGLE_OAUTH_CLIENT_SECRET: 'b', TOKEN_SLEUTEL: GEHEIM })
    assert.equal(i.klaar, true)
    assert.equal(oauthInstellingen({ GOOGLE_OAUTH_CLIENT_ID: 'a', GOOGLE_OAUTH_CLIENT_SECRET: 'b', TOKEN_SLEUTEL: 'kort' }).klaar, false)
  })
  it('gebruikt APP_URL voor het terugadres', () => {
    assert.equal(terugUrl('http://localhost:3000', {}), 'http://localhost:3000/api/google/terug')
    assert.equal(terugUrl('https://iets.netlify.app', { APP_URL: 'https://wallet.jamesrobinson.nl/' }), 'https://wallet.jamesrobinson.nl/api/google/terug')
  })
})

describe('inloggen', () => {
  it('vraagt om blijvende toegang', () => {
    const u = new URL(autorisatieUrl('https://x.nl/api/google/terug', 'abc', 'client'))
    assert.equal(u.searchParams.get('access_type'), 'offline')
    assert.ok(u.searchParams.get('prompt')?.includes('consent'))
    assert.equal(u.searchParams.get('state'), 'abc')
    assert.ok(u.searchParams.get('scope')?.includes('analytics.readonly'))
    assert.ok(u.searchParams.get('scope')?.includes('webmasters.readonly'))
  })
  it('leest het e-mailadres uit het id-token', () => {
    const deel = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
    assert.equal(emailUitIdToken(`${deel({})}.${deel({ email: 'Info@JamesRobinson.nl', email_verified: true })}.x`), 'info@jamesrobinson.nl')
    assert.equal(emailUitIdToken(`${deel({})}.${deel({ email: 'a@b.nl', email_verified: false })}.x`), null)
    assert.equal(emailUitIdToken('onzin'), null)
  })
})

describe('lijsten van Google', () => {
  it('maakt van accountSummaries een lijst properties', () => {
    const lijst = leesGa4Lijst({
      accountSummaries: [{ displayName: 'Thiessen', propertySummaries: [{ property: 'properties/412345678', displayName: 'thiessen.nl – GA4' }] }, { displayName: 'Leeg' }],
    })
    assert.deepEqual(lijst, [{ source: 'ga4', externalId: '412345678', naam: 'thiessen.nl – GA4', groep: 'Thiessen' }])
  })
  it('laat niet-geverifieerde sites weg', () => {
    const lijst = leesSiteLijst({
      siteEntry: [
        { siteUrl: 'sc-domain:thiessen.nl', permissionLevel: 'siteFullUser' },
        { siteUrl: 'https://www.ander.nl/', permissionLevel: 'siteUnverifiedUser' },
        { siteUrl: 'https://www.klant.nl/', permissionLevel: 'siteRestrictedUser' },
      ],
    })
    assert.deepEqual(lijst.map((s) => [s.naam, s.groep]), [
      ['thiessen.nl', 'Domein'],
      ['www.klant.nl', 'Website'],
    ])
  })
})

describe('voorstellen', () => {
  const klant = { name: 'Thiessen Wijnkoopers', website: 'https://www.thiessen.nl' }
  it('zet het domein bovenaan', () => {
    const domein = score({ naam: 'thiessen.nl', groep: 'Domein', externalId: 'sc-domain:thiessen.nl' }, klant)
    const naam = score({ naam: 'Wijnkoopers GA4', groep: 'Overig', externalId: '1' }, klant)
    const niets = score({ naam: 'Bakkerij Jansen', groep: 'Jansen', externalId: '2' }, klant)
    assert.ok(domein > naam)
    assert.ok(naam > 0)
    assert.equal(niets, 0)
  })
})
