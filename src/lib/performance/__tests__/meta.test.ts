import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { KoppelingFout } from '../google'
import { controleerMunt, haalMeta, insightsUrl, isConversie, leesMeta, leesMetaFout, metaAccountId, metaInstellingen, spendNaarCenten, telConversies, voegSamen } from '../meta'

describe('instellingen', () => {
  it('noemt wat ontbreekt', () => {
    assert.deepEqual(metaInstellingen({}).ontbreekt, ['META_ACCESS_TOKEN'])
    assert.equal(metaInstellingen({ META_ACCESS_TOKEN: 'EAAB...' }).klaar, true)
  })
  it('zet het account-ID in de vorm die de API wil', () => {
    assert.equal(metaAccountId('act_1234567890'), 'act_1234567890')
    assert.equal(metaAccountId('1234567890'), 'act_1234567890')
    assert.throws(() => metaAccountId('act_abc'), KoppelingFout)
  })
})

describe('spend naar centen', () => {
  it('rekent de tekst van Meta om zonder float', () => {
    assert.equal(spendNaarCenten('12.34'), 1234)
    assert.equal(spendNaarCenten('0.1'), 10)
    assert.equal(spendNaarCenten('5339.5'), 533950)
    assert.equal(spendNaarCenten('1.005'), 101, 'halve cent naar boven')
    assert.equal(spendNaarCenten(undefined), 0)
    assert.equal(spendNaarCenten('0'), 0)
    assert.throws(() => spendNaarCenten('twaalf'), KoppelingFout)
  })
})

describe('conversies uit acties', () => {
  it('telt aanvragen, aankopen en registraties, en custom conversies', () => {
    assert.equal(isConversie('lead'), true)
    assert.equal(isConversie('purchase'), true)
    assert.equal(isConversie('complete_registration'), true)
    assert.equal(isConversie('offsite_conversion.fb_pixel_custom'), true)
    assert.equal(isConversie('offsite_conversion.custom.123456'), true)
  })
  it('telt de pixel-variant niet nog eens als de opgetelde soort er al is', () => {
    assert.equal(isConversie('offsite_conversion.fb_pixel_purchase'), false)
    assert.equal(isConversie('offsite_conversion.fb_pixel_lead'), false)
  })
  it('telt tussenstappen en optellingen niet mee', () => {
    assert.equal(isConversie('offsite_conversion.fb_pixel_add_to_cart'), false)
    assert.equal(isConversie('offsite_conversion.fb_pixel_view_content'), false)
    assert.equal(isConversie('link_click'), false)
    assert.equal(isConversie('post_engagement'), false)
    assert.equal(isConversie('omni_purchase'), false)
  })
  it('telt de waarden op', () => {
    assert.equal(
      telConversies([
        { action_type: 'purchase', value: '3' },
        { action_type: 'offsite_conversion.fb_pixel_purchase', value: '3' },
        { action_type: 'lead', value: '2' },
        { action_type: 'offsite_conversion.custom.99', value: '1' },
        { action_type: 'link_click', value: '140' },
      ]),
      6,
    )
    assert.equal(telConversies(undefined), 0)
  })
})

describe('antwoord lezen', () => {
  it('maakt van een pagina dagcijfers voor de bron meta', () => {
    const rijen = leesMeta({
      data: [
        { date_start: '2026-10-01', date_stop: '2026-10-01', impressions: '4200', clicks: '85', spend: '31.47', actions: [{ action_type: 'purchase', value: '2' }], account_currency: 'EUR' } as never,
        { date_start: '2026-10-02', impressions: '3900', clicks: '70', spend: '29.9' },
      ],
    })
    assert.deepEqual(rijen, [
      { day: '2026-10-01', bron: 'meta', impressions: 4200, clicks: 85, conversions: 2, costCents: 3147 },
      { day: '2026-10-02', bron: 'meta', impressions: 3900, clicks: 70, conversions: 0, costCents: 2990 },
    ])
    assert.deepEqual(leesMeta({}), [])
  })
  it('voegt pagina’s samen zonder een dag dubbel te tellen', () => {
    const samen = voegSamen([
      [{ day: '2026-10-01', bron: 'meta', impressions: 10, clicks: 1, conversions: 0, costCents: 100 }],
      [
        { day: '2026-10-01', bron: 'meta', impressions: 5, clicks: 1, conversions: 1, costCents: 50 },
        { day: '2026-10-02', bron: 'meta', impressions: 7, clicks: 0, conversions: 0, costCents: 70 },
      ],
    ])
    assert.deepEqual(samen, [
      { day: '2026-10-01', bron: 'meta', impressions: 15, clicks: 2, conversions: 1, costCents: 150 },
      { day: '2026-10-02', bron: 'meta', impressions: 7, clicks: 0, conversions: 0, costCents: 70 },
    ])
  })
  it('weigert een account dat niet in euro’s rekent', () => {
    assert.throws(() => controleerMunt({ data: [{ date_start: '2026-10-01', account_currency: 'USD' }] }), /USD/)
  })
  it('vraagt per dag, met het token en de periode in het adres', () => {
    const u = new URL(insightsUrl('act_123456789', '2026-10-01', '2026-10-31', 'TOKEN'))
    assert.equal(u.pathname, '/v26.0/act_123456789/insights')
    assert.equal(u.searchParams.get('time_increment'), '1')
    assert.deepEqual(JSON.parse(u.searchParams.get('time_range')!), { since: '2026-10-01', until: '2026-10-31' })
    assert.match(u.searchParams.get('fields')!, /actions/)
    assert.equal(u.searchParams.get('access_token'), 'TOKEN')
  })
})

describe('fouten', () => {
  it('legt uit wat er aan de hand is', () => {
    assert.match(leesMetaFout(400, { error: { code: 190, message: 'Error validating access token' } }).message, /META_ACCESS_TOKEN/)
    assert.match(leesMetaFout(403, { error: { code: 200, message: 'Permissions error' } }).message, /ads_read/)
    assert.match(leesMetaFout(400, { error: { code: 100, error_subcode: 33, message: 'Unsupported get request' } }).message, /Business Manager/)
    assert.match(leesMetaFout(500, { error: { message: 'Kapot' } }).message, /fout 500: Kapot/)
  })
})

describe('paginering', () => {
  it('volgt paging.next tot het op is, zonder netwerk', async () => {
    const paginas: Record<string, unknown> = {
      eerste: { data: [{ date_start: '2026-10-01', impressions: '10', clicks: '1', spend: '1.00', account_currency: 'EUR' }], paging: { next: 'https://graph.facebook.com/tweede' } },
      'https://graph.facebook.com/tweede': { data: [{ date_start: '2026-10-02', impressions: '20', clicks: '2', spend: '2.50', actions: [{ action_type: 'lead', value: '1' }] }], paging: {} },
    }
    const gevraagd: string[] = []
    const fetchMock = mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
      const u = String(url)
      gevraagd.push(u)
      const body = paginas[u.startsWith('https://graph.facebook.com/v26.0/act_') ? 'eerste' : u]
      return new Response(JSON.stringify(body), { status: 200 })
    })
    try {
      const rijen = await haalMeta('act_123456789', '2026-10-01', '2026-10-02', { META_ACCESS_TOKEN: "T" } as unknown as NodeJS.ProcessEnv)
      assert.equal(gevraagd.length, 2)
      assert.deepEqual(rijen, [
        { day: '2026-10-01', bron: 'meta', impressions: 10, clicks: 1, conversions: 0, costCents: 100 },
        { day: '2026-10-02', bron: 'meta', impressions: 20, clicks: 2, conversions: 1, costCents: 250 },
      ])
    } finally {
      fetchMock.mock.restore()
    }
  })
  it('geeft de fout van Meta door en meldt een ontbrekend token', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: { code: 190, message: 'expired' } }), { status: 400 }))
    try {
      await assert.rejects(haalMeta('act_123456789', '2026-10-01', '2026-10-02', { META_ACCESS_TOKEN: "T" } as unknown as NodeJS.ProcessEnv), /META_ACCESS_TOKEN is verlopen/)
    } finally {
      fetchMock.mock.restore()
    }
    await assert.rejects(haalMeta('act_123456789', '2026-10-01', '2026-10-02', {} as unknown as NodeJS.ProcessEnv), /nog niet ingesteld in Netlify: META_ACCESS_TOKEN/)
  })
})
