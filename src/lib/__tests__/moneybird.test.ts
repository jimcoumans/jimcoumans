import assert from 'node:assert/strict'
import { test } from 'node:test'
import { factuurStatus, moneybirdClient, verstuurd } from '../moneybird/client'
import { moneybirdContactKeuzes } from '../moneybird/contacten'
import { moneybirdPlanning } from '../moneybird/planning'

test('een terugkerende factuur wordt gepland op de gekozen dag, vanaf de startdatum', () => {
  const plan = moneybirdPlanning(
    new Date('2026-11-26'), new Date('2027-02-01'), 2, new Date('2026-11-26T13:00:00Z'),
  )
  assert.deepEqual(plan, { eersteDatum: '2026-12-02', aantal: 2 })
})

test('de dag waarop het CRM de reeks aanmaakt telt in Nederlandse tijd', () => {
  const nu = new Date('2026-12-01T23:30:00Z')
  assert.equal(moneybirdPlanning(new Date('2026-12-01'), null, 2, nu).eersteDatum, '2027-01-02')
})

const bronfactuur = {
  id: '503680871418561540',
  contact_id: '503000000000000002',
  invoice_id: '2026-0100',
  invoice_date: '2026-11-01',
  total_price_excl_tax: '1350.00',
  total_price_incl_tax: '1633.50',
  currency: 'EUR',
}

test('factuurstatus komt van Moneybird en concepten of geplande facturen blijven buiten het portaal', () => {
  const gepland = { ...bronfactuur, state: 'scheduled', sent_at: null }
  const verstuurde = { ...bronfactuur, state: 'open', sent_at: '2026-11-01' }
  assert.equal(verstuurd(gepland), false)
  assert.equal(verstuurd({ ...verstuurde, state: 'draft' }), false)
  assert.equal(verstuurd(verstuurde), true)
  assert.equal(factuurStatus(verstuurde), 'Verstuurd')
  assert.equal(factuurStatus({ ...verstuurde, state: 'paid', paid_at: '2026-11-20' }), 'Betaald')
})

function stelTestAdministratieIn(t: import('node:test').TestContext) {
  const oudToken = process.env.MONEYBIRD_API_TOKEN
  const oudeAdministratie = process.env.MONEYBIRD_ADMINISTRATION_ID
  process.env.MONEYBIRD_API_TOKEN = 'test'
  process.env.MONEYBIRD_ADMINISTRATION_ID = '123'
  t.after(() => {
    if (oudToken === undefined) delete process.env.MONEYBIRD_API_TOKEN
    else process.env.MONEYBIRD_API_TOKEN = oudToken
    if (oudeAdministratie === undefined) delete process.env.MONEYBIRD_ADMINISTRATION_ID
    else process.env.MONEYBIRD_ADMINISTRATION_ID = oudeAdministratie
  })
}

test('facturen worden per klant en reeks uit Moneybird gelezen met behoud van lange IDs', async (t) => {
  stelTestAdministratieIn(t)
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    const pad = new URL(url)
    assert.equal(pad.pathname, '/api/v2/123/sales_invoices.json')
    assert.equal(pad.searchParams.get('filter'),
      'state:all,contact_id:503000000000000002,recurring_sales_invoice_id:503000000000000003')
    assert.equal(init.method, 'GET')
    return Response.json([{ ...bronfactuur, state: 'paid', sent_at: '2026-11-01' }])
  })
  const [factuur] = await moneybirdClient().facturen(bronfactuur.contact_id, '503000000000000003')
  assert.equal(factuur?.id, bronfactuur.id)
})


test('de keuzelijst zoekt op klantnaam en nummer, zonder dubbele of gearchiveerde contacten', async (t) => {
  stelTestAdministratieIn(t)
  const termen: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    const pad = new URL(url)
    assert.equal(pad.pathname, '/api/v2/123/contacts.json')
    const term = pad.searchParams.get('query')
    if (term) termen.push(term)
    return Response.json([
      { id: '503000000000000002', company_name: 'Proefbedrijf B.V.', customer_id: '101' },
      { id: '503000000000000003', company_name: 'Oud contact', archived: true },
    ])
  })
  assert.deepEqual(await moneybirdContactKeuzes({ name: 'Proefbedrijf B.V.', customerNumber: '101' }), {
    ok: true,
    opties: [{ value: '503000000000000002', label: 'Proefbedrijf B.V. (klant 101)' }],
  })
  assert.deepEqual(termen.sort(), ['101', 'Proefbedrijf'])
})
