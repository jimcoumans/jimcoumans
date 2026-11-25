import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { PaginaKop, type Cijfer } from '@/components/PaginaKop'
import { ActionForm, Field, Select, TextArea } from '@/components/ActionForm'
import {
  HERHALINGEN,
  PLATFORMEN,
  haalSet,
  isPlatform,
  maandNaam,
  maandVan,
  maandenTot,
  metingenVan,
  periodeVan,
  telMetingen,
  topBronnen,
  topConcurrenten,
  type Telling,
} from '@/lib/ai-vindbaarheid'
import type { AiMeting } from '@/db/schema'
import { bewaarAntwoord, bewaarInstellingen, corrigeer, nieuweVraag, verwijder, wisselArchief } from '../../ai-actions'

/**
 * Eén meetset: het overzicht over de maanden, de maandelijkse toetsing per
 * platform, en de instellingen (merknamen, concurrenten, vragen).
 */
const BLADEN = [
  { id: 'overzicht', naam: 'Overzicht' },
  { id: 'toetsen', naam: 'Toetsing invullen' },
  { id: 'instellingen', naam: 'Vragen en instellingen' },
] as const

const pct = (t: Telling) => (t.totaal ? Math.round((t.genoemd / t.totaal) * 100) : null)

/** Een vakje in de lijn: grijs is niet gemeten, wit niet genoemd, lichtblauw soms, blauw altijd. */
function Vakje({ t, titel }: { t: Telling; titel: string }) {
  const kleur = !t.totaal ? 'bg-gray-100' : t.genoemd === 0 ? 'bg-white border border-gray-300' : t.genoemd < t.totaal ? 'bg-[#BFDBFF]' : 'bg-jr-blue'
  return <span title={titel} className={`inline-block h-3 w-3 rounded-sm ${kleur}`} />
}

export default async function AiSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ blad?: string; maand?: string; platform?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const sp = await searchParams
  const data = await haalSet(id)
  if (!data) notFound()
  const { set, vragen, organisatie } = data

  const blad = BLADEN.some((b) => b.id === sp.blad) ? sp.blad! : 'overzicht'
  const maand = sp.maand && periodeVan(sp.maand) ? sp.maand : maandVan()
  const platform = sp.platform && isPlatform(sp.platform) ? sp.platform : 'chatgpt'
  const reeks = maandenTot(maand, 6)
  const metingen = await metingenVan(id, reeks[0]!, maand)
  const T = telMetingen(metingen)
  const vorige = maandenTot(maand, 2)[0]!
  const volgendeMaand = (() => {
    const [j, m] = maand.split('-').map(Number) as [number, number]
    const d = new Date(Date.UTC(j, m, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })()
  const link = (over: Record<string, string>) => {
    const q = new URLSearchParams({ blad, maand, platform, ...over })
    return `/beheer/ai-vindbaarheid/${id}?${q.toString()}`
  }

  const actief = vragen.filter((v) => !v.gearchiveerdOp)
  const zichtbaar = vragen.filter((v) => !v.gearchiveerdOp || metingen.some((m) => m.vraagId === v.id))

  const cijfers: Cijfer[] = PLATFORMEN.map((p) => {
    const nu = T.platform(p.id, maand), toen = T.platform(p.id, vorige)
    const a = pct(nu), b = pct(toen)
    return {
      label: p.naam,
      waarde: a === null ? '–' : `${a}%`,
      hint: a === null ? 'nog niet gemeten' : `${nu.genoemd} van ${nu.totaal} antwoorden${b !== null ? `, vorige maand ${b}%` : ''}`,
      toon: a === null ? 'stil' : b !== null && a < b ? 'let-op' : b !== null && a > b ? 'goed' : 'normaal',
    }
  })

  const metingVan = (vraagId: string, herhaling: number): AiMeting | undefined =>
    metingen.find((m) => m.vraagId === vraagId && m.platform === platform && String(m.periode).startsWith(maand) && m.herhaling === herhaling && m.meetwijze === 'handmatig')
  const p = PLATFORMEN.find((x) => x.id === platform)!

  return (
    <AppShell user={user} actief="ai">
      <p className="mb-2 text-sm">
        <Link href="/beheer/ai-vindbaarheid" className="text-jr-link">← AI-vindbaarheid</Link>
      </p>
      <PaginaKop
        titel={set.naam}
        uitleg={`${organisatie ?? 'James Robinson zelf'} · hoe vaak we genoemd worden in ${maandNaam(maand)}, per platform.`}
        acties={
          <div className="flex items-center gap-2 text-sm">
            <Link href={link({ maand: vorige })} className="rounded-full border border-gray-300 px-3 py-1.5">←</Link>
            <span className="min-w-36 text-center">{maandNaam(maand)}</span>
            <Link href={link({ maand: volgendeMaand })} className="rounded-full border border-gray-300 px-3 py-1.5">→</Link>
          </div>
        }
        cijfers={cijfers}
      />

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3 text-sm">
        {BLADEN.map((b) => (
          <Link
            key={b.id}
            href={link({ blad: b.id })}
            aria-current={blad === b.id ? 'page' : undefined}
            className={`rounded-full px-4 py-1.5 ${blad === b.id ? 'bg-jr-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            {b.naam}
          </Link>
        ))}
      </nav>

      {blad === 'overzicht' && (
        <div className="space-y-6">
          <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Per vraag</h2>
            <p className="mb-4 text-xs text-gray-500">
              Per platform: hoe vaak we genoemd werden in {maandNaam(maand)} (van de drie keer), de beste plek, en de lijn van de laatste zes maanden. Blauw is altijd genoemd, lichtblauw soms, wit niet, grijs niet gemeten.
            </p>
            {zichtbaar.length === 0 ? (
              <p className="text-sm text-gray-600">Nog geen vragen. Voeg ze toe bij Vragen en instellingen.</p>
            ) : (
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4 font-normal">Vraag</th>
                    {PLATFORMEN.map((pl) => (
                      <th key={pl.id} className="pb-2 pr-4 font-normal">{pl.naam}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zichtbaar.map((v) => (
                    <tr key={v.id} className="border-t border-gray-100 align-top">
                      <td className="py-3 pr-4">
                        {v.tekst}
                        {v.gearchiveerdOp && <span className="ml-2 text-xs text-gray-400">gearchiveerd</span>}
                      </td>
                      {PLATFORMEN.map((pl) => {
                        const t = T.cel(v.id, pl.id, maand)
                        return (
                          <td key={pl.id} className="py-3 pr-4">
                            <div>{t.totaal ? `${t.genoemd} van ${t.totaal}` : <span className="text-gray-400">–</span>}</div>
                            {t.besteplek !== null && <div className="text-xs text-gray-500">beste plek {t.besteplek}</div>}
                            <div className="mt-1 flex gap-1">
                              {reeks.map((mnd) => {
                                const r = T.cel(v.id, pl.id, mnd)
                                return <Vakje key={mnd} t={r} titel={`${maandNaam(mnd)}: ${r.totaal ? `${r.genoemd} van ${r.totaal}` : 'niet gemeten'}`} />
                              })}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base">Welke concurrenten genoemd worden</h2>
              <p className="mb-3 text-xs text-gray-500">In {maandNaam(maand)}, alle platforms samen. Alleen de concurrenten die bij de instellingen staan.</p>
              {topConcurrenten(metingen, maand).length === 0 ? (
                <p className="text-sm text-gray-600">Nog niets herkend.{set.concurrenten.length === 0 ? ' Vul concurrenten in bij Vragen en instellingen.' : ''}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {topConcurrenten(metingen, maand).map((c) => (
                    <li key={c.naam} className="flex justify-between gap-4"><span>{c.naam}</span><span className="text-gray-500">{c.aantal}×</span></li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base">Welke bronnen de AI noemt</h2>
              <p className="mb-3 text-xs text-gray-500">Websites waar de antwoorden op leunen. Daar willen we genoemd worden: dit is de werklijst.</p>
              {topBronnen(metingen, maand).length === 0 ? (
                <p className="text-sm text-gray-600">Nog geen bronnen. Plak bij het toetsen het antwoord inclusief de links.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {topBronnen(metingen, maand).map((b) => (
                    <li key={b.domein} className="flex justify-between gap-4"><span>{b.domein}</span><span className="text-gray-500">{b.aantal}×</span></li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {blad === 'toetsen' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 text-sm">
            {PLATFORMEN.map((pl) => (
              <Link
                key={pl.id}
                href={link({ platform: pl.id })}
                aria-current={platform === pl.id ? 'page' : undefined}
                className={`rounded-full border px-4 py-1.5 ${platform === pl.id ? 'border-jr-blue text-jr-blue' : 'border-gray-300 text-gray-700'}`}
              >
                {pl.naam}
              </Link>
            ))}
          </div>
          <section className="rounded-xl bg-[#EDF5FF] p-5 text-sm">
            <p className="mb-1">Zo meet je {p.naam} zonder dat je eigen gebruik meekleurt</p>
            <ul className="list-disc space-y-1 pl-5 text-gray-700">
              <li>{p.schoon}</li>
              <li>Stel elke vraag drie keer, elke keer in een nieuw gesprek, letterlijk zoals hij hier staat en zonder vervolgvraag.</li>
              <li>Plak het hele antwoord, met de links. Dan herkent het portaal zelf of we genoemd worden, op welke plek, welke concurrenten en welke bronnen.</li>
            </ul>
          </section>
          {actief.map((v, i) => (
            <section key={v.id} className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base">
                <span className="mr-2 text-gray-400">{i + 1}.</span>
                {v.tekst}
              </h2>
              <div className="grid gap-4 lg:grid-cols-3">
                {HERHALINGEN.map((h) => {
                  const m = metingVan(v.id, h)
                  return (
                    <div key={h} className="rounded-lg border border-gray-200 p-4">
                      <p className="mb-2 text-xs text-gray-500">Keer {h}</p>
                      {m ? (
                        <div className="space-y-2 text-sm">
                          <p className={m.genoemd ? 'text-[#1D7D3F]' : 'text-gray-700'}>
                            {m.genoemd ? `Genoemd${m.plek ? `, plek ${m.plek}` : ''}` : 'Niet genoemd'}
                            {m.gecorrigeerd && <span className="ml-2 text-xs text-gray-400">met de hand</span>}
                          </p>
                          {m.concurrenten.length > 0 && <p className="text-xs text-gray-600">Ook genoemd: {m.concurrenten.join(', ')}</p>}
                          {m.bronnen.length > 0 && <p className="text-xs text-gray-600">Bronnen: {m.bronnen.join(', ')}</p>}
                          <details className="text-xs">
                            <summary className="text-jr-link cursor-pointer">Antwoord bekijken</summary>
                            <p className="mt-2 whitespace-pre-wrap text-gray-700">{m.antwoord}</p>
                          </details>
                          <details className="text-xs">
                            <summary className="text-jr-link cursor-pointer">Klopt het niet? Verbeteren</summary>
                            <div className="mt-2">
                              <ActionForm action={corrigeer} submitLabel="Opslaan" resetOnSuccess={false}>
                                <input type="hidden" name="setId" value={id} />
                                <input type="hidden" name="metingId" value={m.id} />
                                <Select label="Genoemd" name="genoemd" defaultValue={m.genoemd ? 'ja' : 'nee'} options={[{ value: 'ja', label: 'Ja' }, { value: 'nee', label: 'Nee' }]} />
                                <Field label="Plek" name="plek" type="number" defaultValue={m.plek ? String(m.plek) : ''} hint="Leeg als er geen lijst is." />
                              </ActionForm>
                            </div>
                          </details>
                          <details className="text-xs">
                            <summary className="text-jr-link cursor-pointer">Opnieuw plakken</summary>
                            <div className="mt-2">
                              <ActionForm action={bewaarAntwoord} submitLabel="Vervangen">
                                <input type="hidden" name="setId" value={id} />
                                <input type="hidden" name="vraagId" value={v.id} />
                                <input type="hidden" name="platform" value={platform} />
                                <input type="hidden" name="maand" value={maand} />
                                <input type="hidden" name="herhaling" value={h} />
                                <TextArea label="Antwoord" name="antwoord" rows={5} required />
                              </ActionForm>
                              <div className="mt-2">
                                <ActionForm action={verwijder} submitLabel="Verwijderen" meldGelukt={false} submitClassName="border border-gray-300 text-gray-700">
                                  <input type="hidden" name="setId" value={id} />
                                  <input type="hidden" name="metingId" value={m.id} />
                                </ActionForm>
                              </div>
                            </div>
                          </details>
                        </div>
                      ) : (
                        <ActionForm action={bewaarAntwoord} submitLabel="Opslaan">
                          <input type="hidden" name="setId" value={id} />
                          <input type="hidden" name="vraagId" value={v.id} />
                          <input type="hidden" name="platform" value={platform} />
                          <input type="hidden" name="maand" value={maand} />
                          <input type="hidden" name="herhaling" value={h} />
                          <TextArea label="Plak het antwoord" name="antwoord" rows={5} required />
                        </ActionForm>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {blad === 'instellingen' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="h-fit rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Merknamen en concurrenten</h2>
            <p className="mb-4 text-xs text-gray-500">Waarop de herkenning let. Eén per regel. Na opslaan worden de metingen opnieuw herkend, behalve wat met de hand is verbeterd.</p>
            <ActionForm action={bewaarInstellingen} submitLabel="Opslaan" resetOnSuccess={false}>
              <input type="hidden" name="setId" value={id} />
              <Field label="Naam" name="naam" required defaultValue={set.naam} />
              <TextArea label="Merknamen" name="merknamen" rows={3} required defaultValue={set.merknamen.join('\n')} hint="Naam, handelsnaam en domein. Bijvoorbeeld: James Robinson, jamesrobinson.nl." />
              <TextArea label="Concurrenten" name="concurrenten" rows={6} defaultValue={set.concurrenten.join('\n')} hint="Zoals ze in een antwoord heten. Alleen deze worden herkend." />
            </ActionForm>
          </section>
          <section className="h-fit rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Vragen</h2>
            <p className="mb-4 text-xs text-gray-500">
              Een vraag wijzig je niet: dan klopt de lijn niet meer. Archiveer hem en voeg een nieuwe toe. De metingen van een gearchiveerde vraag blijven in het overzicht.
            </p>
            <ol className="mb-5 space-y-2 text-sm">
              {vragen.map((v, i) => (
                <li key={v.id} className="flex items-start justify-between gap-3 border-t border-gray-100 pt-2 first:border-0 first:pt-0">
                  <span className={v.gearchiveerdOp ? 'text-gray-400 line-through' : ''}>
                    <span className="mr-2 text-gray-400">{i + 1}.</span>
                    {v.tekst}
                  </span>
                  <ActionForm action={wisselArchief} submitLabel={v.gearchiveerdOp ? 'Terugzetten' : 'Archiveren'} meldGelukt={false} submitClassName="border border-gray-300 text-gray-700" bevestig={false}>
                    <input type="hidden" name="setId" value={id} />
                    <input type="hidden" name="vraagId" value={v.id} />
                    <input type="hidden" name="archiveren" value={v.gearchiveerdOp ? '0' : '1'} />
                  </ActionForm>
                </li>
              ))}
            </ol>
            <ActionForm action={nieuweVraag} submitLabel="Vraag toevoegen">
              <input type="hidden" name="setId" value={id} />
              <Field label="Nieuwe vraag" name="vraag" required placeholder="Zoals een klant hem zou stellen" />
            </ActionForm>
          </section>
        </div>
      )}
    </AppShell>
  )
}
