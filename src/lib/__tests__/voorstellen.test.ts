/**
 * Tests voor de voorstelgenerator in de Wallet: dossiers opslaan, lezen en
 * verwijderen, en de vervanger die de generator laat praten met de Wallet.
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { client } from '../../db'
import { bewaarDossier, bewaarInstelling, leesDossier, leesInstelling, lijstDossiers, verwijderDossier, VoorstelFout } from '../voorstellen'
import { zetIn } from '../voorstel/pagina'

const id = `test-${Math.random().toString(36).slice(2, 8)}`

after(async () => {
  await verwijderDossier(id)
  await client.end()
})

test('een dossier opslaan, bijwerken, lezen en verwijderen', async () => {
  await bewaarDossier(id, { naam: 'Testbedrijf', plaats: 'Hulsberg', staat: { bedrijf: { naam: 'Testbedrijf' } } }, null)
  await bewaarDossier(id, { naam: 'Testbedrijf BV', plaats: 'Hulsberg', staat: { bedrijf: { naam: 'Testbedrijf BV' } } }, null)
  const d = await leesDossier(id)
  assert.equal(d?.naam, 'Testbedrijf BV')
  assert.deepEqual(d?.staat, { bedrijf: { naam: 'Testbedrijf BV' } })
  assert.ok((await lijstDossiers()).some((x) => x.id === id))
  await verwijderDossier(id)
  assert.equal(await leesDossier(id), null)
})

test('een onzinnige sleutel of een leeg dossier wordt geweigerd', async () => {
  await assert.rejects(bewaarDossier('../etc', { staat: {} }, null), VoorstelFout)
  await assert.rejects(bewaarDossier(id, { naam: 'x' }, null), VoorstelFout)
  assert.equal(await leesDossier('Hoofdletters'), null)
})

test('alleen bekende instellingen', async () => {
  const oud = await leesInstelling('subdoelen')
  await bewaarInstelling('subdoelen', { lijst: ['Test'] })
  assert.deepEqual(await leesInstelling('subdoelen'), { lijst: ['Test'] })
  if (oud) await bewaarInstelling('subdoelen', oud)
  await assert.rejects(bewaarInstelling('iets', { a: 1 }), VoorstelFout)
  assert.equal(await leesInstelling('iets'), null)
})

test('de generator krijgt de vervanger vóór zijn eigen script', async () => {
  const html = zetIn(await readFile('src/lib/voorstel/generator.html', 'utf8'))
  const shim = html.indexOf('window.claude = { use')
  const eigen = html.indexOf("window.claude.use('db')")
  assert.ok(shim > 0 && eigen > shim)
  assert.ok(html.includes('Terug naar het beheer'))
})
