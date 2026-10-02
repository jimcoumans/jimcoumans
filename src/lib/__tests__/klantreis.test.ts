/**
 * De klantreis rekent zelf uit waar een klant staat. Geen database: alleen
 * de regel "de eerste stap met een open mijlpaal".
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { KLANTREIS, ALLE_SLEUTELS, huidigeStap } from '../klantreis'

const tot = (nr: string) =>
  new Set(KLANTREIS.slice(0, KLANTREIS.findIndex((s) => s.nr === nr) + 1).flatMap((s) => s.mijlpalen.map((m) => m.key)))

test('een nieuwe klant staat in stap 01', () => {
  assert.equal(huidigeStap(new Set()).nr, '01')
})

test('na stap 03 staat de klant in stap 04', () => {
  assert.equal(huidigeStap(tot('03')).nr, '04')
})

test('één open mijlpaal houdt de klant in die stap, ook als later al iets af is', () => {
  const gedaan = tot('05')
  gedaan.delete('03.mail')
  assert.equal(huidigeStap(gedaan).nr, '03')
})

test('na het fundament staat de klant in 08, en daar blijft hij', () => {
  assert.equal(huidigeStap(tot('07')).nr, '08')
  assert.equal(huidigeStap(new Set(ALLE_SLEUTELS)).nr, '08')
})

test('acht stappen, drie fasen, elke sleutel uniek en met het stapnummer ervoor', () => {
  assert.equal(KLANTREIS.length, 8)
  assert.deepEqual([...new Set(KLANTREIS.map((s) => s.fase))], ['Verkopen', 'Starten', 'Samenwerken'])
  const sleutels = KLANTREIS.flatMap((s) => s.mijlpalen.map((m) => m.key))
  assert.equal(new Set(sleutels).size, sleutels.length)
  for (const s of KLANTREIS) for (const m of s.mijlpalen) assert.ok(m.key.startsWith(`${s.nr}.`), m.key)
})
