import type { BrandFile } from '@/db/schema'
import type { Merkkluis } from '@/lib/merkkluis'
import { LOGO_SLOTS, TEKSTROLLEN, TOESTANDEN, alsStijl, knopCss, tekstCss, tekstOmschrijving } from '@/lib/stylesheet'
import { MerkFonts } from './MerkFonts'

/* -------------------------------------------------------------------------
   De merkkluis in één oogopslag, op de klantpagina. Geen tweede plek om te
   bewerken, wel alles zien: logo's, kleuren, letters en de knop, met één
   klik naar de volledige kluis of de pdf.
   ------------------------------------------------------------------------- */

const achtergrond = (b: BrandFile) =>
  b.logoBackground === 'donker' ? 'bg-jr-black' : b.logoBackground === 'beide' ? 'bg-[linear-gradient(90deg,#fff_50%,#1C1C1E_50%)]' : 'bg-white'

/** Op de klantpagina tonen we koppen hooguit zo groot; de echte maat staat ernaast. */
const MAX_PX = 36

export function MerkkluisSamenvatting({ m, slug }: { m: Merkkluis; slug: string }) {
  const v = m.volledigheid
  const stijlen = new Map(m.tekststijlen.map((t) => [t.role, alsStijl(t)]))
  const label = stijlen.get('label') ?? null
  const open = v.punten.filter((p) => !p.klaar)
  const kluis = `/beheer/assets/${slug}`

  return (
    <div className="space-y-6">
      <MerkFonts
        stijlen={[...stijlen.values(), ...(m.knop?.fontFamily ? [{ fontFamily: m.knop.fontFamily, weight: m.knop.weight ?? 600, italic: false }] : [])]}
        bestanden={m.fontbestanden}
      />

      <section className="flex flex-wrap items-start justify-between gap-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <p className="font-display text-[22px] font-semibold tracking-tight">
              {v.klaar} van {v.totaal}
            </p>
            <p className="text-sm text-gray-600">{v.klaar === v.totaal ? 'De merkkluis is compleet.' : 'onderdelen compleet'}</p>
          </div>
          <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-gray-150">
            <div className={`h-full rounded-full ${v.klaar === v.totaal ? 'bg-[#34C759]' : 'bg-jr-blue'}`} style={{ width: `${(v.klaar / v.totaal) * 100}%` }} />
          </div>
          {open.length > 0 && <p className="mt-3 text-[13px] text-gray-600">Nog open: {open.map((p) => p.label.split(':')[0]!.toLowerCase()).join(', ')}.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={kluis} className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-5 py-2.5 text-sm font-medium text-white">
            Merkkluis openen
          </a>
          <a
            href={`${kluis}/stylesheet`}
            target="_blank"
            rel="noopener"
            className="text-jr-text rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
          >
            Stylesheet als pdf
          </a>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Blok titel="Logo’s" href={`${kluis}#logos`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LOGO_SLOTS.map((slot) => {
              const logo =
                m.logos.find((l) => l.logoVariant === slot.variant && l.logoBackground !== 'donker') ?? m.logos.find((l) => l.logoVariant === slot.variant)
              const nvt = !logo && m.logosNvt.includes(slot.variant)
              return (
                <div key={slot.variant}>
                  <div
                    className={`flex h-20 items-center justify-center rounded-lg p-3 ${
                      logo ? `${achtergrond(logo)} border border-gray-200` : 'border border-dashed border-gray-300 bg-gray-50'
                    }`}
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/merk/bestand/${logo.id}${logo.hasThumbnail ? '?formaat=klein' : ''}`} alt={slot.label} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-center text-[11px] text-gray-400">{nvt ? 'Niet van toepassing' : 'Ontbreekt'}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-600">{slot.label}</p>
                </div>
              )
            })}
          </div>
        </Blok>

        <Blok titel="Kleuren" href={`${kluis}#kleuren`}>
          {m.kleuren.length === 0 ? (
            <Leeg />
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {m.kleuren.slice(0, 10).map((k) => (
                <div key={k.id} className="min-w-0">
                  <div className="h-12 rounded-lg border border-black/5" style={{ background: k.hex }} />
                  <p className="mt-1.5 truncate text-xs font-medium">{k.name}</p>
                  <p className="tabular text-[11px] text-gray-500">{k.hex}</p>
                </div>
              ))}
            </div>
          )}
        </Blok>

        <Blok titel="Typografie" href={`${kluis}#typografie`}>
          {stijlen.size === 0 ? (
            <Leeg />
          ) : (
            <div className="space-y-3">
              {TEKSTROLLEN.filter((t) => ['h1', 'h2', 'h3', 'body'].includes(t.rol)).map((t) => {
                const s = stijlen.get(t.rol)
                return (
                  <div key={t.rol} className="grid grid-cols-[48px_minmax(0,1fr)] items-baseline gap-3">
                    <span className="text-xs font-semibold text-gray-600">{t.label}</span>
                    {s ? (
                      <div className="min-w-0">
                        <p className="truncate" style={tekstCss(s, Math.min(1, MAX_PX / s.sizePx))}>
                          {t.rol === 'body' ? 'De tekst waarin je het verhaal vertelt.' : t.voorbeeld}
                        </p>
                        <p className="tabular text-[11px] text-gray-500">{tekstOmschrijving(s)}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Nog niet ingesteld</p>
                    )}
                  </div>
                )
              })}
              <p className="text-xs text-gray-500">
                {stijlen.size} van de {TEKSTROLLEN.length} tekststijlen ingesteld.
              </p>
            </div>
          )}
        </Blok>

        <Blok titel="Knop" href={`${kluis}#knoppen`}>
          {m.knop ? (
            <div className="flex flex-wrap gap-6">
              {TOESTANDEN.map(({ toestand, label: naam }) => (
                <div key={toestand}>
                  <span style={knopCss(m.knop!, toestand, label)}>Reserveer</span>
                  <p className="mt-2 text-xs text-gray-600">{naam}</p>
                </div>
              ))}
            </div>
          ) : (
            <Leeg />
          )}
        </Blok>
      </div>
    </div>
  )
}

function Blok({ titel, href, children }: { titel: string; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px]">{titel}</h2>
        <a href={href} className="text-jr-link text-sm hover:underline">
          Wijzigen
        </a>
      </div>
      {children}
    </section>
  )
}

function Leeg() {
  return <p className="text-sm text-gray-400">Nog niet ingevuld.</p>
}
