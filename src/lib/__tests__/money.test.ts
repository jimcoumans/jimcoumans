import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAmountToCents, formatCents, formatSignedCents, eurosToCents } from '../money'

test('parseAmountToCents leest Nederlandse notatie', () => {
  assert.equal(parseAmountToCents('122,50'), 12250)
  assert.equal(parseAmountToCents('1.234,56'), 123456)
  assert.equal(parseAmountToCents('€ 122,50'), 12250)
  assert.equal(parseAmountToCents('  1.500,00 '), 150000)
})

test('parseAmountToCents leest ook Engelse notatie', () => {
  assert.equal(parseAmountToCents('122.50'), 12250)
  assert.equal(parseAmountToCents('1,234.56'), 123456)
})

test('parseAmountToCents leest hele getallen', () => {
  assert.equal(parseAmountToCents('1500'), 150000)
  assert.equal(parseAmountToCents('0,01'), 1)
})

test('parseAmountToCents rondt af op hele centen', () => {
  assert.equal(parseAmountToCents('122,505'), 12251)
  assert.equal(parseAmountToCents('0,004'), 0)
})

test('parseAmountToCents verwerkt negatieve bedragen', () => {
  assert.equal(parseAmountToCents('-122,50'), -12250)
})

test('parseAmountToCents weigert onzin in plaats van te gokken', () => {
  assert.equal(parseAmountToCents(''), null)
  assert.equal(parseAmountToCents('   '), null)
  assert.equal(parseAmountToCents('abc'), null)
  assert.equal(parseAmountToCents('12,, 50'), null)
  assert.equal(parseAmountToCents('12-50'), null)
})

test('eurosToCents rondt correct af zonder float-resten', () => {
  assert.equal(eurosToCents(122.5), 12250)
  assert.equal(eurosToCents(0.1 + 0.2), 30)
  assert.equal(eurosToCents(1234.565), 123457)
})

test('formatCents geeft Nederlandse euro-notatie', () => {
  // Intl gebruikt een non-breaking space na het euroteken.
  assert.equal(formatCents(12250).replace(/ /g, ' '), '€ 122,50')
  assert.equal(formatCents(0).replace(/ /g, ' '), '€ 0,00')
  assert.equal(formatCents(-12250).replace(/ /g, ' '), '€ -122,50')
})

test('formatSignedCents zet het teken vooraan', () => {
  assert.equal(formatSignedCents(12250).replace(/ /g, ' '), '+ € 122,50')
  assert.equal(formatSignedCents(-12250).replace(/ /g, ' '), '- € 122,50')
  assert.equal(formatSignedCents(0).replace(/ /g, ' '), '€ 0,00')
})

test('heen en weer omzetten verliest geen centen', () => {
  for (const cents of [1, 99, 100, 12250, 123456, 999999999]) {
    const text = formatCents(cents)
    assert.equal(parseAmountToCents(text), cents, `mislukt bij ${cents} (${text})`)
  }
})
