import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getFormulier, schoonQuickscan } from '@/lib/formulieren'
import { PUNTEN, standVanScan } from '@/lib/formulieren/quickscan'
import { Logo } from '@/components/Logo'
import { PrintKnop } from '@/components/PrintKnop'
import { formatDateLong } from '@/lib/dates'

export const maxDuration = 26

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const f = await getFormulier(id)
  return { title: f ? `Scanrapport ${f.organisatie.name}` : 'Scanrapport' }
}

const DOT: Record<string, string> = { groen: 'bg-[#34C759]', oranje: 'bg-[#F6A027]', rood: 'bg-[#FF3B30]', nvt: 'bg-gray-300' }
const KLEURNAAM: Record<string, string> = { groen: 'Groen', oranje: 'Oranje', rood: 'Rood', nvt: 'n.v.t.' }

/**
 * Het scanrapport (02.2) zoals de klant het krijgt, bij het intakegesprek.
 * Eén pagina: drie dingen die opvielen, de veertien punten, en wat het
 * herstel vóór de start kost. Bewaren als pdf via afdrukken.
 */
export default async function ScanrapportPagina({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const f = await getFormulier(id)
  if (!f || f.formulier.soort !== 'quickscan') notFound()
  const s = schoonQuickscan(f.formulier.antwoorden as Record<string, unknown>)
  const stand = standVanScan(s)
  const opRapport = PUNTEN.filter((p) => p.uitleg)
  const datum = f.formulier.ingevuldOp ?? f.formulier.updatedAt
  const naam = (nr: number | null) => PUNTEN.find((p) => p.nr === nr)?.naam ?? ''

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <a href={`/beheer/formulieren/${id}`} className="text-jr-blue text-sm hover:underline">
          &larr; Terug naar de quickscan
        </a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">{f.formulier.status === 'vrijgegeven' ? 'Vrijgegeven' : 'Nog niet vrijgegeven'}</span>
          <PrintKnop />
        </div>
      </div>
      <article className="mx-auto max-w-[800px] bg-white px-10 py-10 text-[14px] shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between gap-6 border-b border-gray-200 pb-4">
          <div>
            <p className="text-jr-blue text-xs font-semibold">Scanrapport</p>
            <h1 className="mt-1 text-[26px] leading-tight">{f.organisatie.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Wat we op {formatDateLong(datum)} zagen{f.organisatie.website ? ` op ${f.organisatie.website}` : ''} en in je markt, vóór ons gesprek.
            </p>
          </div>
          <div className="shrink-0 whitespace-nowrap">
            <Logo onderschrift="Marketing &amp; Branding" />
          </div>
        </header>

        <h2 className="mb-2 text-base">Drie dingen die opvielen</h2>
        <div className="mb-6 grid gap-3 sm:grid-cols-3 print:grid-cols-3">
          {[0, 1, 2].map((i) => {
            const b = s.bevindingen[i]
            return (
              <div key={i} className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs text-gray-500">
                  <span className="text-jr-blue mr-1.5 text-base font-bold">{i + 1}</span>
                  {b?.punt ? `punt ${b.punt} · ${naam(b.punt)}` : ''}
                </p>
                <p className="mt-1 font-semibold">{b?.gezien || '–'}</p>
                <p className="mt-1 text-[13px] text-gray-700">{b?.gevolg}</p>
              </div>
            )
          })}
        </div>

        <h2 className="mb-1 text-base">De veertien punten</h2>
        <p className="mb-2 text-xs text-gray-600">Elke kleur volgt uit een vaste norm. Groen haalt de norm, rood niet, oranje zit ertussen.</p>
        <table className="mb-6 w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs text-gray-600">
              <th className="py-1.5 pr-3 font-normal">Punt</th>
              <th className="py-1.5 pr-3 font-normal">Waar het om gaat</th>
              <th className="py-1.5 pr-3 font-normal">Kleur</th>
              <th className="py-1.5 font-normal">Wat we zagen</th>
            </tr>
          </thead>
          <tbody>
            {opRapport.map((p) => {
              const inv = s.punten[String(p.nr)] ?? {}
              return (
                <tr key={p.nr} className="border-b border-gray-100 align-top">
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">
                    {p.nr} · {p.naam}
                  </td>
                  <td className="py-1.5 pr-3 text-gray-600">{p.uitleg}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {inv.kleur ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[inv.kleur]}`} />
                        {KLEURNAAM[inv.kleur]}
                      </span>
                    ) : (
                      '–'
                    )}
                  </td>
                  <td className="py-1.5">{inv.gezien || ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="mb-2 text-base">Herstel vóór de start</h2>
            {stand.webmix.length === 0 ? (
              <p className="text-sm text-gray-600">Niets: de techniek is in orde.</p>
            ) : (
              <table className="w-full text-[13px]">
                <tbody>
                  {stand.webmix.map((w) => (
                    <tr key={w.nr} className="border-b border-gray-100">
                      <td className="py-1 pr-3 text-gray-500">{w.nr}</td>
                      <td className="py-1 pr-3">{w.post}</td>
                      <td className="tabular py-1 text-right whitespace-nowrap">{w.bedrag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-1 text-xs text-gray-500">Excl. btw. Webmix doet het na het tekenen; jij beslist per post.</p>
          </div>
          <div>
            <h2 className="mb-2 text-base">Wie op jouw zoekwoorden adverteert</h2>
            <p className="mb-4 text-[13px]">{s.punten['14']?.gezien || '–'}</p>
            <h2 className="mb-2 text-base">Wat we niet konden zien</h2>
            <p className="text-xs text-gray-600">
              We keken van buitenaf, zonder toegang. Back-ups, updates en of je conversies goed staan, zien we pas in het fundament. Groen is dus geen garantie.
            </p>
          </div>
        </div>

        <p className="mt-8 border-t border-gray-200 pt-3 text-xs text-gray-500">
          Dit rapport is van jou, ook als je niet met ons verdergaat. Vragen? support@jamesrobinson.nl of 045 792 0009. James Robinson · Marketing &amp; Branding · www.jamesrobinson.nl
        </p>
      </article>
    </div>
  )
}
