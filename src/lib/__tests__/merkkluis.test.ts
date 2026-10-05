/**
 * De regels van de merkkluis: wat een bestand echt is, welke SVG erin mag,
 * hoe kleuren gelezen en getoetst worden, en wanneer een kluis compleet is.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { herkenType, svgIsVeilig, normaliseerHex, contrast, berekenVolledigheid, MIN_BEELDEN } from '../merkkluis'

test('bestandstype op de inhoud, niet op de naam', async () => {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#007AFF' } }).png().toBuffer()
  const jpg = await sharp(png).jpeg().toBuffer()
  const webp = await sharp(png).webp().toBuffer()
  assert.equal(herkenType(png)?.mime, 'image/png')
  assert.equal(herkenType(jpg)?.mime, 'image/jpeg')
  assert.equal(herkenType(webp)?.mime, 'image/webp')
  assert.equal(herkenType(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'))?.mime, 'image/svg+xml')
  assert.equal(herkenType(Buffer.from('wOF2rest'))?.mime, 'font/woff2')
  assert.equal(herkenType(Buffer.from('%PDF-1.7 niet welkom')), null)
  assert.equal(herkenType(Buffer.from('<html><script>alert(1)</script></html>')), null)
})

test('een SVG met script of event-handlers komt er niet in', () => {
  assert.equal(svgIsVeilig(Buffer.from('<svg><path d="M0 0h1"/></svg>')), true)
  assert.equal(svgIsVeilig(Buffer.from('<svg><script>alert(1)</script></svg>')), false)
  assert.equal(svgIsVeilig(Buffer.from('<svg onload="alert(1)"></svg>')), false)
  assert.equal(svgIsVeilig(Buffer.from('<svg><a href="javascript:alert(1)">x</a></svg>')), false)
  assert.equal(svgIsVeilig(Buffer.from('<svg><foreignObject><div/></foreignObject></svg>')), false)
})

test('kleurcodes lezen zoals mensen ze typen', () => {
  assert.equal(normaliseerHex('#c4f000'), '#C4F000')
  assert.equal(normaliseerHex('007aff'), '#007AFF')
  assert.equal(normaliseerHex('#fff'), '#FFFFFF')
  assert.equal(normaliseerHex('blauw'), null)
  assert.equal(normaliseerHex('#12345'), null)
})

test('contrast volgens WCAG: zwart op wit is 21, JR-blauw op wit net onder de 4,5', () => {
  assert.equal(Math.round(contrast('#000000', '#FFFFFF')), 21)
  assert.equal(contrast('#FFFFFF', '#FFFFFF'), 1)
  const blauw = contrast('#007AFF', '#FFFFFF')
  assert.ok(blauw > 3.9 && blauw < 4.1, String(blauw))
  assert.ok(contrast('#0857C3', '#FFFFFF') >= 4.5)
})

const LEEG = { logos: [], beelden: [], kleuren: [], stem: null, tekststijlen: [], knop: null, logosNvt: [] }
const KNOP = {
  fontFamily: null,
  weight: null,
  sizePx: null,
  uppercase: false,
  radiusPx: 8,
  kleuren: {
    normal: { bg: '#8B1E2D', tekst: '#FFFFFF', rand: null },
    hover: { bg: '#6E1824', tekst: '#FFFFFF', rand: null },
    active: { bg: '#521219', tekst: '#FFFFFF', rand: null },
  },
}

test('een lege kluis is 0 van 7, een gevulde 7 van 7', () => {
  const leeg = berekenVolledigheid(LEEG)
  assert.equal(leeg.klaar, 0)
  assert.equal(leeg.totaal, 7)
  const vol = berekenVolledigheid({
    logos: [
      { logoVariant: 'primair', logoBackground: 'licht' },
      { logoVariant: 'primair', logoBackground: 'donker' },
      { logoVariant: 'secundair', logoBackground: 'licht' },
      { logoVariant: 'beeldmerk', logoBackground: 'licht' },
    ],
    // Geen los woordmerk: bewust niet van toepassing.
    logosNvt: ['woordmerk'],
    beelden: Array.from({ length: MIN_BEELDEN }, () => ({ usage: ['organisch'] })),
    kleuren: [{ role: 'primair' }, { role: 'tekst' }],
    stem: { address: 'je', goodExamples: 'Jij reserveert, wij zorgen voor de rest.' },
    tekststijlen: (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'label', 'micro'] as const).map((role) => ({ role })),
    knop: KNOP,
  })
  assert.equal(vol.klaar, 7)
})

test('logo’s: een ontbrekende variant zonder "heeft het merk niet" telt als open', () => {
  const v = berekenVolledigheid({ ...LEEG, logos: [{ logoVariant: 'primair', logoBackground: 'licht' }] })
  assert.equal(v.punten[0]?.klaar, false)
})

test('knop zonder hover-kleur is niet compleet', () => {
  const half = { ...KNOP, kleuren: { ...KNOP.kleuren, hover: { bg: null, tekst: null, rand: null } } }
  assert.equal(berekenVolledigheid({ ...LEEG, knop: half }).punten.find((p) => p.label.startsWith('Knop'))?.klaar, false)
})

test('beelden zonder gebruiksrechten tellen niet mee', () => {
  const v = berekenVolledigheid({ ...LEEG, beelden: Array.from({ length: 20 }, () => ({ usage: [] })) })
  assert.equal(v.punten.find((p) => p.label.includes('beelden'))?.klaar, false)
})

test('opslag: bewaren, ophalen en wissen, lokaal in een map', async () => {
  const map = await mkdtemp(path.join(tmpdir(), 'opslag-'))
  process.env.BESTANDSOPSLAG_MAP = map
  try {
    const { bewaar, haal, wis } = await import('../bestandsopslag')
    await bewaar('org/beeld/a.png', Buffer.from('abc'), 'image/png')
    const terug = await haal('org/beeld/a.png')
    assert.equal(terug?.contentType, 'image/png')
    assert.equal(terug?.data.toString(), 'abc')
    await wis('org/beeld/a.png')
    assert.equal(await haal('org/beeld/a.png'), null)
    await assert.rejects(() => bewaar('../buiten.png', Buffer.from('x'), 'image/png'))
  } finally {
    delete process.env.BESTANDSOPSLAG_MAP
    await rm(map, { recursive: true, force: true })
  }
})
