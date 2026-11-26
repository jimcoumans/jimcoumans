import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ClickUpClient, type ClickUpTask } from '../clickup/client'
import { berekenRetainerWallet, leesWalletStartmaand, toonWalletStartmaand } from '../retainer-wallet/bereken'

const datum = '2025-10-01'
const opties = [
  { id: 'abonnement', name: 'Marketing Abonnement', orderindex: 4 },
  { id: 'project', name: 'Projectwerk', orderindex: 0 },
]

function taak(id: string, tarief: unknown, plaats: unknown = 'abonnement', status = 'afgerond'): ClickUpTask {
  return {
    id,
    name: id,
    status: { status, type: 'done' },
    date_done: String(Date.parse('2025-09-12T15:00:00Z')),
    custom_fields: [
      { id: 'plaats', name: 'Boekplaats', type: 'drop_down', value: plaats, type_config: { options: opties } },
      { id: 'tarief', name: 'Verkooptarief', type: 'currency', value: tarief },
    ],
  }
}

const factuur = {
  id: '1',
  nummer: '2025-001',
  datum,
  retainer: true,
  bedragExclCents: 100000,
  currency: 'EUR',
}

test('de startmaand begint op de eerste dag en gebruikt MM/JJ', () => {
  assert.equal(leesWalletStartmaand(' 10/25 '), datum)
  assert.equal(toonWalletStartmaand(datum), '10/25')
  for (const invoer of ['2025-10', '00/25', '13/25', '10/2025', '']) {
    assert.equal(leesWalletStartmaand(invoer), null)
  }
})

test('telt verzonden retainerfacturen vanaf de grens en passende ClickUp-taken uit alle maanden', () => {
  const resultaat = berekenRetainerWallet([
    factuur,
    factuur,
    { ...factuur, id: '2', datum: '2025-09-30' },
    { ...factuur, id: '3', retainer: false },
    { ...factuur, id: '4', datum: '2025-11-02', bedragExclCents: -15000 },
  ], [
    taak('eerste', '89.50'),
    taak('eerste', '89.50'),
    taak('tweede', 20, 4, ' Afgerond '),
    taak('derde', 30, '4'),
    taak('vierde', 1, { name: 'Marketing Abonnement' }),
    taak('nultarief', 0),
    taak('niet-afgerond', 100, 'abonnement', 'bezig'),
    taak('los-project', 120, 'project'),
    taak('andere-boekplaats', 60, 0),
    taak('zonder-tarief', undefined),
    taak('leeg-tarief', ''),
  ], datum)

  assert.equal(resultaat.bijgeschrevenCents, 85000)
  assert.equal(resultaat.besteedCents, 14050)
  assert.equal(resultaat.saldoCents, 70950)
  assert.equal(resultaat.zonderTarief, 2)
  assert.equal(resultaat.regels.length, 7)
  assert.equal(resultaat.regels.find((regel) => regel.id === 'clickup:eerste')?.datum, '2025-09-12')
  assert.equal(resultaat.regels.find((regel) => regel.id === 'clickup:nultarief')?.bedragCents, 0)
})

test('ClickUp haalt beide archiefstanden en alle vervolgpagina’s op', async (t) => {
  const aanroepen: string[] = []
  t.mock.method(globalThis, 'fetch', async (adres: string) => {
    const url = new URL(adres)
    assert.equal(url.searchParams.get('statuses[]'), 'afgerond')
    assert.equal(url.searchParams.get('include_closed'), 'true')
    assert.equal(url.searchParams.get('subtasks'), 'true')
    const archief = url.searchParams.get('archived')
    const pagina = url.searchParams.get('page')
    const id = `${archief}-${pagina}`
    aanroepen.push(id)
    return Response.json({ tasks: [taak(id, 10)], last_page: archief === 'true' || pagina === '1' })
  })

  const taken = await new ClickUpClient('testtoken').listRetainerTaken('1', AbortSignal.timeout(1000))
  assert.deepEqual(aanroepen.sort(), ['false-0', 'false-1', 'true-0'])
  assert.deepEqual(taken.map(({ id }) => id), aanroepen)
})
