import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseQuantityToHundredths,
  formatQuantity,
  lineTotalCents,
} from '../quantity'

test('parseQuantityToHundredths leest hele en gebroken aantallen', () => {
  assert.equal(parseQuantityToHundredths('3'), 300)
  assert.equal(parseQuantityToHundredths('1,5'), 150)
  assert.equal(parseQuantityToHundredths('1.5'), 150)
  assert.equal(parseQuantityToHundredths('0,25'), 25)
  assert.equal(parseQuantityToHundredths('12'), 1200)
  assert.equal(parseQuantityToHundredths(' 2,75 '), 275)
})

test('parseQuantityToHundredths rondt af op honderdsten', () => {
  assert.equal(parseQuantityToHundredths('1,555'), 156)
  assert.equal(parseQuantityToHundredths('1,554'), 155)
})

test('parseQuantityToHundredths weigert nul, negatief en onzin', () => {
  assert.equal(parseQuantityToHundredths('0'), null)
  assert.equal(parseQuantityToHundredths('-3'), null)
  assert.equal(parseQuantityToHundredths(''), null)
  assert.equal(parseQuantityToHundredths('drie'), null)
  assert.equal(parseQuantityToHundredths('1,,5'), null)
})

test('formatQuantity laat hele aantallen zonder komma zien', () => {
  assert.equal(formatQuantity(300), '3')
  assert.equal(formatQuantity(150), '1,5')
  assert.equal(formatQuantity(25), '0,25')
  assert.equal(formatQuantity(1200), '12')
})

test('lineTotalCents rekent aantal maal tarief exact', () => {
  // 3 social posts van 100 euro
  assert.equal(lineTotalCents(300, 10_000), 30_000)
  // 1,5 uur van 85 euro
  assert.equal(lineTotalCents(150, 8_500), 12_750)
  // 1 stuk van 122,50
  assert.equal(lineTotalCents(100, 12_250), 12_250)
  // 0,25 uur van 85 euro
  assert.equal(lineTotalCents(25, 8_500), 2_125)
})

test('lineTotalCents rondt halve centen naar boven', () => {
  // 0,33 stuk van 1 euro = 33 cent (32,999... zonder afronding)
  assert.equal(lineTotalCents(33, 100), 33)
  // 1,5 stuk van 1,01 euro = 1,515 -> 152 cent
  assert.equal(lineTotalCents(150, 101), 152)
})

test('lineTotalCents weigert onmogelijke waarden in plaats van te gokken', () => {
  assert.throws(() => lineTotalCents(0, 10_000), RangeError)
  assert.throws(() => lineTotalCents(-100, 10_000), RangeError)
  assert.throws(() => lineTotalCents(100, 0), RangeError)
  assert.throws(() => lineTotalCents(100, -500), RangeError)
  assert.throws(() => lineTotalCents(1.5, 10_000), RangeError)
})

test('grote aantallen blijven exact', () => {
  // 1000 uur van 150 euro = 150.000 euro
  assert.equal(lineTotalCents(100_000, 15_000), 15_000_000)
})

test('een getypt aantal en tarief komen samen op het juiste bedrag', () => {
  const aantal = parseQuantityToHundredths('12')!
  const tarief = 10_000 // 100,00
  assert.equal(lineTotalCents(aantal, tarief), 120_000) // 1.200,00
})
