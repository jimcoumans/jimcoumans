import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getMerkkluis, contrast } from '@/lib/merkkluis'
import type { BrandFile, BrandTextStyle } from '@/db/schema'
import { MerkFonts } from '@/components/stylesheet/MerkFonts'
import { PdfKnop } from '@/components/stylesheet/PdfKnop'
import { PasOpBlad } from '@/components/stylesheet/PasOpBlad'
import { LOGO_SLOTS, TEKSTROLLEN, TOESTANDEN, gewichtNaam, knopCss, tekstCss, type Tekststijl } from '@/lib/stylesheet'
import { formatDateLong } from '@/lib/dates'

export const maxDuration = 26

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const m = await getMerkkluis(slug)
  // De titel wordt de bestandsnaam van de pdf.
  return { title: m ? `Stylesheet ${m.organisatie.name}` : 'Stylesheet' }
}

const ROL: Record<string, string> = { primair: 'Primair', secundair: 'Secundair', accent: 'Accent', achtergrond: 'Achtergrond', tekst: 'Tekst' }

const alsStijl = (r: BrandTextStyle): Tekststijl => ({
  fontFamily: r.fontFamily,
  weight: r.weight,
  italic: r.italic,
  sizePx: r.sizePx,
  lineHeightPct: r.lineHeightPct,
  trackingTenths: r.trackingTenths,
  uppercase: r.uppercase,
  colorHex: r.colorHex,
})

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')

const achtergrond = (b: BrandFile) =>
  b.logoBackground === 'donker' ? '#1C1C1E' : b.logoBackground === 'beide' ? 'linear-gradient(90deg,#fff 50%,#1C1C1E 50%)' : '#FFFFFF'

/** Tot deze grootte staat een stijl altijd op ware grootte op het blad. */
const VAST_TOT = 20

/** Grote koppen krimpen via --k als het blad anders overloopt (zie PasOpBlad). */
function bladGrootte(px: number): string {
  return px <= VAST_TOT ? `${px}px` : `calc(${VAST_TOT}px + ${px - VAST_TOT}px * var(--k, 1))`
}

/**
 * De stylesheet als one-pager op A4: logo's, kleuren, tekststijlen en de
 * knop, in de echte lettertypen. Bewaren als pdf gaat via de browser, zodat
 * de fonts precies zo in de pdf komen als op het scherm.
 */
export default async function StylesheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { slug } = await params
  const m = await getMerkkluis(slug)
  if (!m) notFound()

  const stijlen = new Map(m.tekststijlen.map((t) => [t.role, alsStijl(t)]))
  const label = stijlen.get('label') ?? null
  const primair = m.logos.find((l) => l.logoVariant === 'primair' && l.logoBackground !== 'donker')
  const ontbreekt = m.volledigheid.punten.filter((p) => !p.klaar && !p.label.includes('beelden') && !p.label.includes('Tone'))

  return (
    <div className="min-h-screen bg-gray-150 py-8 print:bg-white print:py-0">
      <MerkFonts
        stijlen={[...stijlen.values(), ...(m.knop?.fontFamily ? [{ fontFamily: m.knop.fontFamily, weight: m.knop.weight ?? 600, italic: false }] : [])]}
        bestanden={m.fontbestanden}
      />

      <div className="mx-auto mb-5 flex w-[210mm] max-w-full flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <a href={`/beheer/assets/${slug}`} className="text-jr-link text-sm hover:underline">
          &larr; Terug naar de merkkluis
        </a>
        <div className="flex items-center gap-4">
          {ontbreekt.length > 0 && (
            <span className="text-xs text-[#94590A]">
              Nog niet compleet: {ontbreekt.map((o) => o.label.split(':')[0]!.toLowerCase()).join(', ')}
            </span>
          )}
          <PdfKnop />
        </div>
      </div>

      {/* Het blad: 180 bij 267 mm is A4 min de marges van 15 mm. */}
      <PasOpBlad className="mx-auto box-content flex h-[267mm] w-[180mm] flex-col overflow-hidden bg-white p-[15mm] text-[#1C1C1E] shadow-[0_8px_30px_rgba(0,0,0,.12)] print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-5">
            {primair && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/merk/bestand/${primair.id}`} alt="" className="h-[14mm] max-w-[50mm] object-contain object-left" />
            )}
            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-gray-500 uppercase">Stylesheet</p>
              <h1 className="text-[22px] leading-tight font-bold">{m.organisatie.name}</h1>
            </div>
          </div>
          <p className="text-right text-[10px] leading-relaxed text-gray-500">
            {m.bijgewerkt ? `Bijgewerkt ${formatDateLong(m.bijgewerkt)}` : formatDateLong(new Date())}
            <br />
            James Robinson
          </p>
        </header>

        <Sectie titel="Logo’s">
          <div className="grid grid-cols-4 gap-3">
            {LOGO_SLOTS.map((slot) => {
              const logo = m.logos.find((l) => l.logoVariant === slot.variant && l.logoBackground !== 'donker') ?? m.logos.find((l) => l.logoVariant === slot.variant)
              const nvt = !logo && m.logosNvt.includes(slot.variant)
              return (
                <div key={slot.variant}>
                  <div
                    className="flex h-[24mm] items-center justify-center rounded-md border border-gray-200 p-3"
                    style={{ background: logo ? achtergrond(logo) : '#F5F5F7' }}
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/merk/bestand/${logo.id}`} alt={slot.label} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[9px] text-gray-400">{nvt ? 'Niet van toepassing' : 'Ontbreekt'}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium">{slot.label}</p>
                </div>
              )
            })}
          </div>
        </Sectie>

        <Sectie titel="Kleuren" noot={m.kleuren.length > 8 ? `De eerste 8 van ${m.kleuren.length}; de rest staat in de merkkluis.` : undefined}>
          {m.kleuren.length === 0 ? (
            <Leeg />
          ) : (
            <div className={`grid gap-3 ${m.kleuren.length > 6 ? 'grid-cols-8' : 'grid-cols-6'}`}>
              {/* Eén rij: meer dan acht kleuren past niet op een one-pager, en
                  is voor de meeste merken ook te veel om mee te werken. */}
              {m.kleuren.slice(0, 8).map((k) => (
                <div key={k.id}>
                  <div className="h-[13mm] rounded-md border border-black/5" style={{ background: k.hex }} />
                  <p className="mt-1.5 truncate text-[10px] font-medium">{k.name}</p>
                  <p className="tabular text-[9px] leading-snug text-gray-600">
                    {k.hex}
                    <br />
                    RGB {rgb(k.hex)}
                    <br />
                    {ROL[k.role]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Sectie>

        <Sectie
          titel="Typografie"
          noot={
            <>
              <span className="group-data-[verkleind]:hidden">Op ware grootte.</span>
              <span className="hidden group-data-[verkleind]:inline">Grote koppen verkleind om op het blad te passen; de maten ernaast zijn de echte.</span>
            </>
          }
        >
          <div className="space-y-1.5">
            {TEKSTROLLEN.map((t) => {
              const s = stijlen.get(t.rol)
              return (
                <div key={t.rol} className="grid min-h-[26px] grid-cols-[36mm_minmax(0,1fr)] items-center gap-4">
                  <div className="text-[9px] leading-snug text-gray-600">
                    <span className="text-[10px] font-semibold text-[#1C1C1E]">{t.label}</span>
                    {s && (
                      <>
                        {' '}
                        {s.sizePx}/{Math.round((s.sizePx * s.lineHeightPct) / 100)} px
                        {s.trackingTenths ? ` · ${(s.trackingTenths / 10).toLocaleString('nl-NL')}%` : ''}
                        <br />
                        {s.fontFamily} {gewichtNaam(s.weight)}
                        {s.italic ? ' Italic' : ''}
                      </>
                    )}
                  </div>
                  {s ? (
                    <p className="truncate" style={{ ...tekstCss(s), fontSize: bladGrootte(s.sizePx) }}>
                      {t.rol === 'body' ? 'De tekst waarin je het verhaal vertelt.' : t.voorbeeld}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400">Ontbreekt</p>
                  )}
                </div>
              )
            })}
          </div>
        </Sectie>

        <Sectie titel="Knop">
          {m.knop ? (
            <div className="grid grid-cols-3 gap-3">
              {TOESTANDEN.map(({ toestand, label: naam }) => {
                const k = m.knop!.kleuren[toestand]
                return (
                  <div key={toestand}>
                    <span style={knopCss(m.knop!, toestand, label)}>Reserveer</span>
                    <p className="mt-2 text-[10px] font-medium">{naam}</p>
                    <p className="tabular text-[9px] leading-snug text-gray-600">
                      {k.bg ?? '-'} · tekst {k.tekst ?? '-'}
                      {k.bg && k.tekst && ` · contrast ${contrast(k.bg, k.tekst).toFixed(1).replace('.', ',')}`}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <Leeg />
          )}
        </Sectie>

        {(m.stem?.address || m.stem?.character) && (
          <Sectie titel="Toon">
            <p className="text-[11px] leading-relaxed">
              {m.stem.address && <>Aanspreekvorm: {m.stem.address === 'wisselend' ? 'wisselend' : m.stem.address === 'u' ? 'u' : 'je en jij'}. </>}
              {m.stem.character}
            </p>
          </Sectie>
        )}

        <footer className="mt-auto border-t border-gray-200 pt-3 text-[8px] text-gray-500">
          James Robinson — Marketing &amp; Branding | www.jamesrobinson.nl
        </footer>
      </PasOpBlad>
    </div>
  )
}

function Sectie({ titel, noot, children }: { titel: string; noot?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="pt-5">
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <h2 className="text-[10px] font-semibold tracking-[0.12em] text-[#007AFF] uppercase">{titel}</h2>
        {noot && <p className="text-[9px] text-gray-500">{noot}</p>}
      </div>
      {children}
    </section>
  )
}

function Leeg() {
  return <p className="text-[10px] text-gray-400">Nog niet ingevuld in de merkkluis.</p>
}
