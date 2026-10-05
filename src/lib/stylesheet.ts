import type { CSSProperties } from 'react'

/* -------------------------------------------------------------------------
   De stylesheet van een merk, als vaste velden.

   Puur rekenwerk zonder database, zodat het scherm (ook in de browser, voor
   het live voorbeeld), de pdf en de tests er allemaal hetzelfde mee doen.
   ------------------------------------------------------------------------- */

export type LogoSlot = 'primair' | 'secundair' | 'beeldmerk' | 'woordmerk'

/** De vier logo's die elk merk minimaal heeft, of bewust niet heeft. */
export const LOGO_SLOTS: { variant: LogoSlot; label: string; uitleg: string }[] = [
  { variant: 'primair', label: 'Primair logo', uitleg: 'Het hoofdlogo, zoals je het meestal ziet.' },
  { variant: 'secundair', label: 'Secundair logo', uitleg: 'Een tweede opstelling, bijvoorbeeld liggend naast staand.' },
  { variant: 'beeldmerk', label: 'Beeldmerk', uitleg: 'Alleen het symbool: voor een profielfoto, favicon of app-icoon.' },
  { variant: 'woordmerk', label: 'Woordmerk', uitleg: 'Alleen de naam in letters.' },
]

export type TekstRol = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'label' | 'micro'

export type Tekststijl = {
  fontFamily: string
  weight: number
  italic: boolean
  sizePx: number
  lineHeightPct: number
  trackingTenths: number
  uppercase: boolean
  colorHex: string | null
}

/** De negen tekststijlen, met een voorbeeldzin en een redelijk startpunt. */
export const TEKSTROLLEN: { rol: TekstRol; label: string; voorbeeld: string; start: Pick<Tekststijl, 'sizePx' | 'weight' | 'lineHeightPct'> }[] = [
  { rol: 'h1', label: 'H1', voorbeeld: 'De grootste kop', start: { sizePx: 56, weight: 700, lineHeightPct: 110 } },
  { rol: 'h2', label: 'H2', voorbeeld: 'Een kop boven een sectie', start: { sizePx: 40, weight: 700, lineHeightPct: 115 } },
  { rol: 'h3', label: 'H3', voorbeeld: 'Een kop boven een blok', start: { sizePx: 32, weight: 600, lineHeightPct: 120 } },
  { rol: 'h4', label: 'H4', voorbeeld: 'Een tussenkop', start: { sizePx: 24, weight: 600, lineHeightPct: 125 } },
  { rol: 'h5', label: 'H5', voorbeeld: 'Een kleine tussenkop', start: { sizePx: 20, weight: 600, lineHeightPct: 130 } },
  { rol: 'h6', label: 'H6', voorbeeld: 'De kleinste kop', start: { sizePx: 17, weight: 600, lineHeightPct: 130 } },
  { rol: 'body', label: 'Body', voorbeeld: 'De tekst waarin je het verhaal vertelt. Zo leest een alinea op de website of in een mail.', start: { sizePx: 16, weight: 400, lineHeightPct: 150 } },
  { rol: 'label', label: 'Label', voorbeeld: 'Label bij een veld of knop', start: { sizePx: 14, weight: 500, lineHeightPct: 130 } },
  { rol: 'micro', label: 'Micro', voorbeeld: 'De kleine lettertjes: voorwaarden, bijschriften, bronnen', start: { sizePx: 12, weight: 400, lineHeightPct: 140 } },
]

export const GEWICHTEN: { waarde: number; naam: string }[] = [
  { waarde: 100, naam: 'Thin' },
  { waarde: 200, naam: 'Extra Light' },
  { waarde: 300, naam: 'Light' },
  { waarde: 400, naam: 'Regular' },
  { waarde: 500, naam: 'Medium' },
  { waarde: 600, naam: 'Semibold' },
  { waarde: 700, naam: 'Bold' },
  { waarde: 800, naam: 'Extra Bold' },
  { waarde: 900, naam: 'Black' },
]

export function gewichtNaam(gewicht: number): string {
  return GEWICHTEN.find((g) => g.waarde === gewicht)?.naam ?? String(gewicht)
}

/** Een getal zoals een mens het typt: "1,5", "-2", " 80 px". */
function getal(invoer: string): number | null {
  const schoon = invoer.replace(/[^\d,.\-]/g, '').replace(',', '.')
  if (schoon === '' || schoon === '-') return null
  const n = Number(schoon)
  return Number.isFinite(n) ? n : null
}

/** Kleurcode in de vorm #RRGGBB, of null. "8b1e2d", "#8B1E2D" en "#abc" mogen. */
export function hexUit(invoer: string): string | null {
  let h = invoer.trim().replace(/^#/, '').toUpperCase()
  if (/^[0-9A-F]{3}$/.test(h)) h = h.replace(/./g, (c) => c + c)
  return /^[0-9A-F]{6}$/.test(h) ? `#${h}` : null
}

export type Velden = Record<string, string | undefined>

/**
 * Een tekststijl uit wat er in de velden staat. Regelhoogte mag als factor
 * (1,2), als procent (120) of als pixels (88px); letterafstand in procenten.
 */
export function tekststijlUit(v: Velden): { ok: true; stijl: Tekststijl } | { ok: false; fout: string } {
  const fontFamily = (v.fontFamily ?? '').trim().replace(/^["']|["']$/g, '')
  if (!fontFamily) return { ok: false, fout: 'Vul het lettertype in.' }
  if (!/^[\p{L}\p{N} \-]+$/u.test(fontFamily)) return { ok: false, fout: 'Gebruik alleen de naam van het lettertype, zonder leestekens.' }

  const sizePx = Math.round(getal(v.sizePx ?? '') ?? NaN)
  if (!Number.isFinite(sizePx) || sizePx < 6 || sizePx > 400) return { ok: false, fout: 'Grootte moet tussen 6 en 400 pixels liggen.' }

  const weight = Number(v.weight ?? 400)
  if (!GEWICHTEN.some((g) => g.waarde === weight)) return { ok: false, fout: 'Kies een gewicht.' }

  let lineHeightPct = 120
  const rh = (v.lineHeight ?? '').trim()
  if (rh) {
    const n = getal(rh)
    if (n === null || n <= 0) return { ok: false, fout: 'Regelhoogte begrijp ik niet. Gebruik bijvoorbeeld 1,2 of 120% of 88px.' }
    if (/px/i.test(rh)) lineHeightPct = Math.round((n / sizePx) * 100)
    else if (n <= 5) lineHeightPct = Math.round(n * 100)
    else lineHeightPct = Math.round(n)
    if (lineHeightPct < 50 || lineHeightPct > 300) return { ok: false, fout: 'Regelhoogte moet tussen 0,5 en 3 keer de lettergrootte liggen.' }
  }

  const tr = getal(v.tracking ?? '') ?? 0
  const trackingTenths = Math.round(tr * 10)
  if (trackingTenths < -500 || trackingTenths > 500) return { ok: false, fout: 'Letterafstand moet tussen -50% en 50% liggen.' }

  const kleur = (v.colorHex ?? '').trim()
  const colorHex = kleur ? hexUit(kleur) : null
  if (kleur && !colorHex) return { ok: false, fout: `“${kleur}” is geen kleurcode. Gebruik de vorm #8B1E2D.` }

  return {
    ok: true,
    stijl: {
      fontFamily,
      weight,
      italic: v.italic === 'on' || v.italic === 'true',
      sizePx,
      lineHeightPct,
      trackingTenths,
      uppercase: v.uppercase === 'on' || v.uppercase === 'true',
      colorHex,
    },
  }
}

/** De CSS voor een tekststijl: zo ziet het eruit op het scherm en in de pdf. */
export function tekstCss(s: Tekststijl, schaal = 1): CSSProperties {
  return {
    fontFamily: `"${s.fontFamily}", system-ui, sans-serif`,
    fontWeight: s.weight,
    fontStyle: s.italic ? 'italic' : 'normal',
    fontSize: `${Math.round(s.sizePx * schaal * 10) / 10}px`,
    lineHeight: s.lineHeightPct / 100,
    letterSpacing: s.trackingTenths ? `${s.trackingTenths / 1000}em` : undefined,
    textTransform: s.uppercase ? 'uppercase' : undefined,
    color: s.colorHex ?? undefined,
  }
}

/** "Inter Bold Italic · 80/88 px · -2%" */
export function tekstOmschrijving(s: Tekststijl): string {
  const regel = Math.round((s.sizePx * s.lineHeightPct) / 100)
  return [
    `${s.fontFamily} ${gewichtNaam(s.weight)}${s.italic ? ' Italic' : ''}`,
    `${s.sizePx}/${regel} px`,
    s.trackingTenths ? `${(s.trackingTenths / 10).toLocaleString('nl-NL')}%` : null,
    s.uppercase ? 'hoofdletters' : null,
    s.colorHex,
  ]
    .filter(Boolean)
    .join(' · ')
}

/* ------------------------------ Knoppen ---------------------------------- */

export type Toestand = 'normal' | 'hover' | 'active'
export const TOESTANDEN: { toestand: Toestand; label: string; uitleg: string }[] = [
  { toestand: 'normal', label: 'Normaal', uitleg: 'Zoals de knop er staat.' },
  { toestand: 'hover', label: 'Hover', uitleg: 'Met de muis erboven.' },
  { toestand: 'active', label: 'Actief', uitleg: 'Op het moment van klikken.' },
]

export type Knop = {
  fontFamily: string | null
  weight: number | null
  sizePx: number | null
  uppercase: boolean
  radiusPx: number | null
  kleuren: Record<Toestand, { bg: string | null; tekst: string | null; rand: string | null }>
}

/** Een knop is pas klaar als elke toestand een achtergrond en een tekstkleur heeft. */
export function knopCompleet(k: Knop | null): boolean {
  return !!k && TOESTANDEN.every(({ toestand }) => k.kleuren[toestand].bg && k.kleuren[toestand].tekst)
}

/** De CSS van de knop in één toestand. Zonder eigen letter neemt hij het label over. */
export function knopCss(k: Knop, toestand: Toestand, label?: Tekststijl | null): CSSProperties {
  const kleur = k.kleuren[toestand]
  const familie = k.fontFamily ?? label?.fontFamily
  return {
    fontFamily: familie ? `"${familie}", system-ui, sans-serif` : undefined,
    fontWeight: k.weight ?? label?.weight ?? 600,
    fontSize: `${k.sizePx ?? label?.sizePx ?? 15}px`,
    textTransform: k.uppercase ? 'uppercase' : undefined,
    borderRadius: `${k.radiusPx ?? 8}px`,
    background: kleur.bg ?? 'transparent',
    color: kleur.tekst ?? undefined,
    border: `1.5px solid ${kleur.rand ?? kleur.bg ?? 'transparent'}`,
    padding: '0.75em 1.5em',
    lineHeight: 1.2,
    display: 'inline-block',
  }
}

/* ------------------------------ Lettertypen laden ------------------------ */

/**
 * Raadt gewicht en stijl uit een bestandsnaam: "Inter-BoldItalic.woff2" is
 * 700 cursief, "Inter[wght].ttf" of "InterVariable" is variabel. Een
 * fontbestand zegt het zelf ook, maar dit is goed genoeg om te tonen.
 */
export function raadFontbestand(naam: string): { gewicht: number | 'variabel'; cursief: boolean } {
  const n = naam.replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[\s_-]+/g, '')
  const cursief = /italic|oblique|cursief/.test(n)
  if (/variable|\[wght|vf$/.test(n)) return { gewicht: 'variabel', cursief }
  const tabel: [RegExp, number][] = [
    [/hairline|thin/, 100],
    [/extralight|ultralight/, 200],
    [/semibold|demibold/, 600],
    [/extrabold|ultrabold/, 800],
    [/black|heavy/, 900],
    [/light/, 300],
    [/medium/, 500],
    [/bold/, 700],
  ]
  for (const [patroon, gewicht] of tabel) if (patroon.test(n)) return { gewicht, cursief }
  return { gewicht: 400, cursief }
}

const plat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Hoort dit fontbestand bij deze familie? Op naam: "Inter-Bold.woff2" bij "Inter". */
export function hoortBijFamilie(bestandsnaam: string, familie: string): boolean {
  const f = plat(familie)
  return f.length > 0 && plat(bestandsnaam).startsWith(f)
}

/**
 * Losse Google Fonts-adressen per familie, gewicht en stijl. Los, omdat
 * Google het hele verzoek weigert als één combinatie niet bestaat; zo valt
 * alleen die ene terug op een reservefont.
 */
export function googleFontsUrls(stijlen: Pick<Tekststijl, 'fontFamily' | 'weight' | 'italic'>[]): string[] {
  const uniek = new Map<string, string>()
  for (const s of stijlen) {
    const familie = s.fontFamily.trim()
    if (!familie) continue
    const sleutel = `${familie}|${s.italic ? 1 : 0}|${s.weight}`
    uniek.set(sleutel, `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familie).replace(/%20/g, '+')}:ital,wght@${s.italic ? 1 : 0},${s.weight}&display=swap`)
  }
  return [...uniek.values()]
}

/** Een rij uit de database als tekststijl, zonder sleutels en datum. */
export function alsStijl(r: Tekststijl & Record<string, unknown>): Tekststijl {
  return {
    fontFamily: r.fontFamily,
    weight: r.weight,
    italic: r.italic,
    sizePx: r.sizePx,
    lineHeightPct: r.lineHeightPct,
    trackingTenths: r.trackingTenths,
    uppercase: r.uppercase,
    colorHex: r.colorHex,
  }
}
