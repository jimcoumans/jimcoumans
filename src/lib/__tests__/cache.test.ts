/**
 * Tests voor het korte geheugen.
 *
 * Wat hier vastligt is niet dat caching sneller is — dat spreekt vanzelf —
 * maar de twee dingen die stilletjes mis kunnen gaan: dat er per ongeluk
 * tóch twee keer wordt opgehaald, en dat een oud antwoord blijft hangen
 * nadat iemand iets heeft gewijzigd. Dat tweede is het ergste wat een cache
 * kan doen: een verkeerd cijfer op een dashboard ziet er precies zo uit als
 * een goed cijfer.
 */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { metGeheugen, vergeet, geheugenOmvang } from '../cache'

beforeEach(() => {
  vergeet()
})

test('het tweede verzoek haalt niets meer op', async () => {
  let aantalKeerOpgehaald = 0
  const haal = async () => {
    aantalKeerOpgehaald += 1
    return 'waarde'
  }

  assert.equal(await metGeheugen('t:een', haal), 'waarde')
  assert.equal(await metGeheugen('t:een', haal), 'waarde')
  assert.equal(await metGeheugen('t:een', haal), 'waarde')

  assert.equal(aantalKeerOpgehaald, 1)
})

test('twee verzoeken tegelijk leveren samen één query op', async () => {
  let aantalKeerOpgehaald = 0
  const haal = async () => {
    aantalKeerOpgehaald += 1
    await new Promise((r) => setTimeout(r, 20))
    return 42
  }

  // Dit is het geval waar het om gaat: twee bezoekers tegelijk, of een
  // pagina die hetzelfde overzicht op twee plekken nodig heeft. Zonder het
  // aanhaken op een lopende belofte gaan er dan alsnog twee queries uit.
  const [a, b] = await Promise.all([
    metGeheugen('t:tegelijk', haal),
    metGeheugen('t:tegelijk', haal),
  ])

  assert.equal(a, 42)
  assert.equal(b, 42)
  assert.equal(aantalKeerOpgehaald, 1)
})

test('na de bewaartijd wordt er opnieuw opgehaald', async () => {
  let aantalKeerOpgehaald = 0
  const haal = async () => {
    aantalKeerOpgehaald += 1
    return aantalKeerOpgehaald
  }

  assert.equal(await metGeheugen('t:kort', haal, 10), 1)
  await new Promise((r) => setTimeout(r, 25))
  assert.equal(await metGeheugen('t:kort', haal, 10), 2)
})

test('vergeten wist het onthouden antwoord', async () => {
  let aantalKeerOpgehaald = 0
  const haal = async () => {
    aantalKeerOpgehaald += 1
    return aantalKeerOpgehaald
  }

  assert.equal(await metGeheugen('t:wis', haal), 1)
  vergeet()
  assert.equal(await metGeheugen('t:wis', haal), 2)
})

test('vergeten met een voorvoegsel laat de rest staan', async () => {
  await metGeheugen('dash:een', async () => 1)
  await metGeheugen('dash:twee', async () => 2)
  await metGeheugen('anders:drie', async () => 3)

  assert.equal(geheugenOmvang(), 3)
  vergeet('dash:')
  assert.equal(geheugenOmvang(), 1)
})

test('een mislukte ophaling wordt niet onthouden', async () => {
  let pogingen = 0
  const haal = async () => {
    pogingen += 1
    if (pogingen === 1) throw new Error('database even weg')
    return 'gelukt'
  }

  // Zou een fout worden onthouden, dan bleef de pagina een minuut lang stuk
  // nadat de database alweer terug was.
  await assert.rejects(() => metGeheugen('t:fout', haal))
  assert.equal(await metGeheugen('t:fout', haal), 'gelukt')
  assert.equal(pogingen, 2)
})
