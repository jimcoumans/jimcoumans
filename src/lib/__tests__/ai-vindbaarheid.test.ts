/**
 * Tests voor AI-vindbaarheid. Wat vast moet liggen: de herkenning vindt de
 * naam ook met andere hoofdletters en niet als stukje van een ander woord,
 * de plek komt uit de bovenste lijst en niet uit de uitleg eronder, en een
 * meting opnieuw opslaan vervangt de oude in plaats van er een bij te maken.
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { aiMeetsets, aiMetingen } from '../../db/schema'
import {
  analyseer,
  bronnenUit,
  maandenTot,
  periodeVan,
  telMetingen,
  topBronnen,
  bewaarMeting,
  corrigeerMeting,
  bewaarSetInstellingen,
  voegVraagToe,
  haalSet,
  metingenVan,
} from '../ai-vindbaarheid'

const sets: string[] = []
after(async () => {
  for (const id of sets) await db.delete(aiMeetsets).where(eq(aiMeetsets.id, id))
  await client.end()
})

const MERK = ['James Robinson', 'jamesrobinson.nl']

test('genoemd: hoofdletters en accenten maken niet uit, een stukje van een woord telt niet', () => {
  assert.equal(analyseer('Probeer JAMES ROBINSON uit Hulsberg.', MERK, []).genoemd, true)
  assert.equal(analyseer('Kijk op https://www.jamesrobinson.nl/diensten', MERK, []).genoemd, true)
  assert.equal(analyseer('Bureau SuperJames Robinsonia doet dat.', MERK, []).genoemd, false)
  assert.equal(analyseer('Geen idee.', MERK, []).genoemd, false)
})

test('plek: het punt in de genummerde lijst, niet de uitleg eronder', () => {
  const a = analyseer(
    'Een paar opties:\n\n1. **Bureau Zuid**\n   - doet Google Ads\n   - zit in Heerlen\n2. **James Robinson**\n   - Hulsberg\n3. Ander bureau',
    MERK,
    ['Bureau Zuid', 'Ander bureau'],
  )
  assert.equal(a.genoemd, true)
  assert.equal(a.plek, 2)
  assert.deepEqual(a.concurrenten, ['Bureau Zuid', 'Ander bureau'])
})

test('plek: in een opsomming telt alleen de bovenste laag', () => {
  const a = analyseer('- Bureau Zuid\n  - uitleg\n  - nog uitleg\n- James Robinson\n- Bureau Noord', MERK, [])
  assert.equal(a.plek, 2)
})

test('plek zonder lijst: hoeveel bekende concurrenten eerder genoemd worden', () => {
  const a = analyseer('Bureau Zuid en Bureau Noord zijn bekend, en James Robinson ook.', MERK, ['Bureau Zuid', 'Bureau Noord'])
  assert.equal(a.plek, 3)
  assert.equal(analyseer('James Robinson is een bureau.', MERK, []).plek, null)
})

test('bronnen: domeinen zonder www en zonder dubbelen', () => {
  assert.deepEqual(bronnenUit('Zie [x](https://www.Google.com/maps) en https://google.com/a, ook (https://reviews.nl/b).'), ['google.com', 'reviews.nl'])
})

test('maanden en perioden', () => {
  assert.equal(periodeVan('2026-11'), '2026-11-01')
  assert.equal(periodeVan('2026-13'), null)
  assert.deepEqual(maandenTot('2027-02', 3), ['2026-12', '2027-01', '2027-02'])
})

test('tellen per vraag, platform en maand, met de beste plek', () => {
  const T = telMetingen([
    { vraagId: 'v1', periode: '2026-11-01', platform: 'chatgpt', genoemd: true, plek: 3 },
    { vraagId: 'v1', periode: '2026-11-01', platform: 'chatgpt', genoemd: true, plek: 1 },
    { vraagId: 'v1', periode: '2026-11-01', platform: 'chatgpt', genoemd: false, plek: null },
    { vraagId: 'v2', periode: '2026-11-01', platform: 'chatgpt', genoemd: false, plek: null },
  ])
  assert.deepEqual(T.cel('v1', 'chatgpt', '2026-11'), { genoemd: 2, totaal: 3, besteplek: 1 })
  assert.deepEqual(T.platform('chatgpt', '2026-11'), { genoemd: 2, totaal: 4, besteplek: 1 })
  assert.deepEqual(T.cel('v1', 'gemini', '2026-11'), { genoemd: 0, totaal: 0, besteplek: null })
})

test('meting opslaan, opnieuw opslaan vervangt, corrigeren blijft staan', async () => {
  const [set] = await db.insert(aiMeetsets).values({ naam: 'Test AI', merknamen: MERK, concurrenten: ['Bureau Zuid'] }).returning()
  sets.push(set!.id)
  await voegVraagToe(set!.id, 'Welk bureau raad je aan?')
  const s = await haalSet(set!.id)
  const vraagId = s!.vragen[0]!.id

  const m1 = await bewaarMeting({ vraagId, maand: '2026-11', platform: 'chatgpt', herhaling: 1, antwoord: '1. Bureau Zuid\n2. Nog een', userId: null })
  assert.equal(m1.genoemd, false)
  const m2 = await bewaarMeting({ vraagId, maand: '2026-11', platform: 'chatgpt', herhaling: 1, antwoord: '1. James Robinson\n2. Bureau Zuid https://www.reviews.nl', userId: null })
  assert.equal(m2.id, m1.id)
  assert.equal(m2.genoemd, true)
  assert.equal(m2.plek, 1)
  assert.deepEqual(m2.bronnen, ['reviews.nl'])

  await corrigeerMeting(m2.id, true, 2)
  // Merknamen aanpassen herkent opnieuw, maar niet wat met de hand verbeterd is.
  await bewaarSetInstellingen(set!.id, { naam: 'Test AI', merknamen: ['Iets anders'], concurrenten: [] })
  const [na] = await db.select().from(aiMetingen).where(eq(aiMetingen.id, m2.id))
  assert.equal(na!.genoemd, true)
  assert.equal(na!.plek, 2)

  const alle = await metingenVan(set!.id, '2026-10', '2026-11')
  assert.equal(alle.length, 1)
  assert.deepEqual(topBronnen(alle, '2026-11'), [{ domein: 'reviews.nl', aantal: 1 }])
})
