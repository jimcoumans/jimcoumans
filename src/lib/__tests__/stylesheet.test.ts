import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tekststijlUit, tekstCss, tekstOmschrijving, hexUit, raadFontbestand, hoortBijFamilie, googleFontsUrls } from '../stylesheet'

test('Inter Bold Italic 80px wordt precies zo opgeslagen en getoond', () => {
  const r = tekststijlUit({ fontFamily: 'Inter', weight: '700', italic: 'on', sizePx: '80', lineHeight: '1,1', tracking: '-2', colorHex: '1c1c1e' })
  assert.ok(r.ok)
  if (!r.ok) return
  assert.deepEqual(r.stijl, { fontFamily: 'Inter', weight: 700, italic: true, sizePx: 80, lineHeightPct: 110, trackingTenths: -20, uppercase: false, colorHex: '#1C1C1E' })
  const css = tekstCss(r.stijl)
  assert.equal(css.fontWeight, 700)
  assert.equal(css.fontStyle, 'italic')
  assert.equal(css.fontSize, '80px')
  assert.equal(css.letterSpacing, '-0.02em')
  assert.equal(tekstOmschrijving(r.stijl), 'Inter Bold Italic · 80/88 px · -2% · #1C1C1E')
})

test('regelhoogte mag als factor, procent of pixels', () => {
  const met = (lineHeight: string) => {
    const r = tekststijlUit({ fontFamily: 'Inter', weight: '400', sizePx: '20', lineHeight })
    return r.ok ? r.stijl.lineHeightPct : r.fout
  }
  assert.equal(met('1,5'), 150)
  assert.equal(met('150%'), 150)
  assert.equal(met('30px'), 150)
  assert.equal(met(''), 120)
})

test('foute invoer geeft een begrijpelijke melding', () => {
  assert.equal(tekststijlUit({ fontFamily: '', sizePx: '16' }).ok, false)
  assert.equal(tekststijlUit({ fontFamily: 'Inter', weight: '400', sizePx: '2' }).ok, false)
  const kleur = tekststijlUit({ fontFamily: 'Inter', weight: '400', sizePx: '16', colorHex: 'rood' })
  assert.ok(!kleur.ok && kleur.fout.includes('rood'))
})

test('kleurcodes: kort, lang, met en zonder hekje', () => {
  assert.equal(hexUit('#abc'), '#AABBCC')
  assert.equal(hexUit('8b1e2d'), '#8B1E2D')
  assert.equal(hexUit('#12345'), null)
})

test('gewicht en stijl uit de bestandsnaam van een font', () => {
  assert.deepEqual(raadFontbestand('Inter-BoldItalic.woff2'), { gewicht: 700, cursief: true })
  assert.deepEqual(raadFontbestand('Inter-SemiBold.ttf'), { gewicht: 600, cursief: false })
  assert.deepEqual(raadFontbestand('Inter-ExtraLight.otf'), { gewicht: 200, cursief: false })
  assert.deepEqual(raadFontbestand('Inter[wght].ttf'), { gewicht: 'variabel', cursief: false })
  assert.deepEqual(raadFontbestand('Playfair Display Regular.woff'), { gewicht: 400, cursief: false })
  assert.equal(hoortBijFamilie('Playfair-Display-Bold.woff2', 'Playfair Display'), true)
  assert.equal(hoortBijFamilie('Inter-Bold.woff2', 'Playfair Display'), false)
})

test('Google Fonts: per combinatie een eigen adres, zonder dubbelen', () => {
  const urls = googleFontsUrls([
    { fontFamily: 'Playfair Display', weight: 700, italic: true },
    { fontFamily: 'Playfair Display', weight: 700, italic: true },
    { fontFamily: 'Inter', weight: 400, italic: false },
  ])
  assert.deepEqual(urls, [
    'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&display=swap',
    'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400&display=swap',
  ])
})
