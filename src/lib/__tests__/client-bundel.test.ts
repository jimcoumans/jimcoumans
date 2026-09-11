/**
 * Deze test bewaakt de grens tussen browser en server.
 *
 * Een clientcomponent die iets importeert dat uiteindelijk bij de database
 * uitkomt, sleept de databaselaag mee naar de browser. TypeScript ziet dat
 * niet: het typt prima. Alleen de build struikelt erover, en dan pas na een
 * minuut wachten. Deze test loopt de importketen zelf na, zodat zoiets bij
 * het testen al opvalt.
 *
 * Concreet gebeurde dit met de labels van offertes: die stonden in quotes.ts,
 * naast de queries. Ze staan nu in quote-labels.ts, want labels zijn
 * presentatie en horen niet in de laag die met de database praat.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const SRC = join(process.cwd(), 'src')

/** Elk .ts/.tsx-bestand onder src, behalve de tests zelf. */
function alleBestanden(map: string): string[] {
  const uit: string[] = []
  for (const item of readdirSync(map, { withFileTypes: true })) {
    const pad = join(map, item.name)
    if (item.isDirectory()) {
      if (item.name === '__tests__' || item.name === 'node_modules') continue
      uit.push(...alleBestanden(pad))
    } else if (/\.tsx?$/.test(item.name)) {
      uit.push(pad)
    }
  }
  return uit
}

/**
 * De imports van een bestand die bij ons eigen werk uitkomen.
 *
 * `import type` telt niet mee: dat verdwijnt bij het compileren en komt dus
 * nooit in de browser terecht. Datzelfde geldt voor 'use server'-bestanden:
 * die worden een verwijzing naar de server, geen meegebundelde code.
 */
function eigenImports(bestand: string): string[] {
  const bron = readFileSync(bestand, 'utf8')
  const uit: string[] = []

  const patroon = /^\s*(?:import|export)\s+(type\s+)?([\s\S]*?)from\s+['"]([^'"]+)['"]/gm
  for (const match of bron.matchAll(patroon)) {
    const isType = Boolean(match[1])
    const wat = match[2] ?? ''
    const bronpad = match[3] ?? ''
    if (isType) continue
    // `import { type Foo }` zonder verdere waarden telt ook niet mee.
    if (wat.includes('{') && !wat.replace(/\{[\s\S]*\}/, '').trim()) {
      const binnen = wat.slice(wat.indexOf('{') + 1, wat.lastIndexOf('}'))
      const namen = binnen.split(',').map((n) => n.trim()).filter(Boolean)
      if (namen.length > 0 && namen.every((n) => n.startsWith('type '))) continue
    }
    if (!bronpad.startsWith('@/') && !bronpad.startsWith('.')) continue
    uit.push(bronpad)
  }
  return uit
}

/** Zet een importpad om naar een bestand op schijf, of null als het er niet is. */
function naarBestand(bronpad: string, vanuit: string): string | null {
  const basis = bronpad.startsWith('@/')
    ? join(SRC, bronpad.slice(2))
    : resolve(dirname(vanuit), bronpad)

  for (const kandidaat of [
    basis,
    `${basis}.ts`,
    `${basis}.tsx`,
    join(basis, 'index.ts'),
    join(basis, 'index.tsx'),
  ]) {
    if (existsSync(kandidaat) && /\.tsx?$/.test(kandidaat)) return kandidaat
  }
  return null
}

const alles = alleBestanden(SRC)
const clientBestanden = alles.filter((b) => /^['"]use client['"]/m.test(readFileSync(b, 'utf8')))

test('er zijn clientcomponenten om te controleren', () => {
  // Zonder deze controle zou de test stilletjes slagen als het zoeken misgaat.
  assert.ok(clientBestanden.length >= 3, `slechts ${clientBestanden.length} clientcomponenten gevonden`)
})

test('geen clientcomponent komt via zijn imports bij de database uit', () => {
  const klachten: string[] = []

  for (const start of clientBestanden) {
    const gezien = new Set<string>()
    // We bewaren het pad ernaartoe, zodat de melding laat zien via welke
    // stappen de database wordt binnengehaald.
    const wachtrij: { bestand: string; route: string[] }[] = [{ bestand: start, route: [start] }]

    while (wachtrij.length > 0) {
      const huidig = wachtrij.pop()!
      if (gezien.has(huidig.bestand)) continue
      gezien.add(huidig.bestand)

      const bron = readFileSync(huidig.bestand, 'utf8')
      // Een server action is een verwijzing, geen meegebundelde code.
      if (huidig.bestand !== start && /^['"]use server['"]/m.test(bron)) continue

      for (const bronpad of eigenImports(huidig.bestand)) {
        const volgende = naarBestand(bronpad, huidig.bestand)
        if (!volgende) continue

        const route = [...huidig.route, volgende]
        if (volgende === join(SRC, 'db', 'index.ts') || volgende === join(SRC, 'db', 'schema.ts')) {
          klachten.push(route.map((r) => r.slice(SRC.length + 1)).join(' -> '))
          continue
        }
        wachtrij.push({ bestand: volgende, route })
      }
    }
  }

  assert.deepEqual(
    klachten,
    [],
    'clientcomponenten trekken de databaselaag mee naar de browser:\n' + klachten.join('\n'),
  )
})
