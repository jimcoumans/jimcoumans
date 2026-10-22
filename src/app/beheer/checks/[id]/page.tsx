import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  CATEGORIE_LABELS,
  ERNST,
  ERNST_LABELS,
  getCheck,
  isAfbeeldingUrl,
  SOORT_LABELS,
  type Bevinding,
  type Soort,
  type Toets,
  type Uitkomst,
} from '@/lib/uitingen-check'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { ActionForm, TextArea } from '@/components/ActionForm'
import { OordeelLabel } from '@/components/checks/Oordeel'
import { CheckVolger, KopieerKnop, OpnieuwKnop } from '@/components/checks/CheckVolger'
import { geefCheckVrij } from '../../check-actions'
import { formatDate } from '@/lib/dates'

export const maxDuration = 26

const RAND: Record<Bevinding['ernst'], string> = {
  blokkerend: 'border-l-[#FF3B30]',
  belangrijk: 'border-l-[#F6A027]',
  suggestie: 'border-l-gray-300',
}

const TOETS_STIJL: Record<Toets['uitkomst'], { label: string; klasse: string }> = {
  ok: { label: 'In orde', klasse: 'bg-[#E6F7EB] text-[#1D7D3F]' },
  fout: { label: 'Fout', klasse: 'bg-[#FDECEA] text-[#C02A22]' },
  onbekend: { label: 'Niet te controleren', klasse: 'bg-[#FFF3E0] text-[#94590A]' },
  nvt: { label: 'Niet van toepassing', klasse: 'bg-gray-100 text-gray-600' },
}

/** Opus 5.5: $ 4 per miljoen tokens in, $ 20 uit. Een indicatie, de factuur van Anthropic is leidend. */
function kosten(invoer: number | null, uitvoer: number | null): string | null {
  if (invoer === null || uitvoer === null) return null
  const dollar = (invoer * 4 + uitvoer * 20) / 1_000_000
  return `$ ${dollar.toFixed(2).replace('.', ',')}`
}

const KNOP = 'bg-jr-btn hover:bg-jr-btnhover rounded-full px-5 py-2.5 text-sm font-medium text-white'
const RUSTIG = 'rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-jr-text hover:bg-gray-50'

export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const c = await getCheck(id)
  if (!c) notFound()

  const uitkomst = c.status === 'klaar' ? (c.uitkomst as Uitkomst | null) : null
  const loopt = (c.status === 'wacht' || c.status === 'bezig') && !c.vastgelopen
  const regelTekst = new Map((uitkomst?.regels ?? []).map((r) => [r.code, r.tekst]))

  return (
    <AppShell user={user} actief="checks">
      <CheckVolger loopt={loopt} />
      <PaginaKop
        titel={c.titel}
        uitleg={
          <>
            <a href={`/beheer/klanten/${c.slug}?tab=uitingen`} className="text-jr-link hover:underline">
              {c.klant}
            </a>
            {' · '}
            {[
              SOORT_LABELS[c.soort as Soort] ?? c.soort,
              c.kanaal,
              c.doelgroep ? `doelgroep ${c.doelgroep}` : null,
              c.merk ? `merk ${c.merk}` : null,
              c.kanaalMerk ? `op het kanaal van ${c.kanaalMerk}` : null,
              `versie ${c.versie}`,
              c.door,
              formatDate(c.createdAt),
            ]
              .filter(Boolean)
              .join(' · ')}
          </>
        }
        acties={
          <>
            <a href="/beheer/checks" className={RUSTIG}>
              Alle checks
            </a>
            {c.nieuwste && c.status !== 'wacht' && c.status !== 'bezig' && (
              <a href={`/beheer/checks/nieuw?vorige=${c.id}`} className={KNOP}>
                Nieuwe versie checken
              </a>
            )}
          </>
        }
      />

      {loopt && (
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-[17px] font-medium">De AI is aan het checken</p>
          <p className="mt-1 text-sm text-gray-600">
            Meestal duurt dit één tot drie minuten; met een landingspagina erbij wat langer. Deze pagina ververst vanzelf.
          </p>
        </div>
      )}

      {(c.status === 'fout' || c.vastgelopen) && (
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-[17px] font-medium">De check is mislukt</p>
          <p className="mt-1 text-sm text-[#C02A22]">{c.fout ?? 'Vastgelopen: de check is nooit afgerond.'}</p>
          {c.status === 'fout' && <OpnieuwKnop id={c.id} />}
        </div>
      )}

      {uitkomst && c.oordeel && (
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <OordeelLabel check={c} />
            <span className="text-sm text-gray-600">
              {ERNST.map((e) => {
                const n = uitkomst.bevindingen.filter((b) => b.ernst === e).length
                return n > 0 ? `${n} ${ERNST_LABELS[e].toLowerCase()}` : null
              })
                .filter(Boolean)
                .join(' · ') || 'Geen bevindingen'}
            </span>
          </div>
          {uitkomst.samenvatting && <p className="mt-3 text-[17px]">{uitkomst.samenvatting}</p>}
          {uitkomst.nietGecontroleerd.length > 0 && (
            <div className="mt-4 rounded-lg border-l-4 border-jr-orange bg-jr-orange/10 px-4 py-3 text-sm">
              <p className="font-medium">Niet gecontroleerd</p>
              <ul className="mt-1 list-disc pl-5">
                {uitkomst.nietGecontroleerd.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* De uiting zelf, zodat je de bevindingen ernaast kunt leggen. */}
        <section className="space-y-4">
          <h2 className="text-base">De uiting</h2>
          {c.bestanden.map((b, i) =>
            b.type === 'application/pdf' ? (
              <a key={b.sleutel} href={`/api/checks/${c.id}/bestand/${i}`} target="_blank" rel="noreferrer" className="block rounded-xl bg-white p-4 text-sm shadow-sm hover:bg-gray-50">
                Pdf: {b.naam}
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.sleutel} src={`/api/checks/${c.id}/bestand/${i}`} alt={b.naam} className="w-full rounded-xl bg-white shadow-sm" />
            ),
          )}
          {c.uitingUrl &&
            (isAfbeeldingUrl(c.uitingUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.uitingUrl} alt="De uiting" className="w-full rounded-xl bg-white shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <p className="rounded-xl bg-white p-4 text-sm shadow-sm">
                Link:{' '}
                <a href={c.uitingUrl} target="_blank" rel="noreferrer noopener" className="text-jr-link break-all hover:underline">
                  {c.uitingUrl}
                </a>
              </p>
            ))}
          {c.tekst && (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs text-gray-600">Tekst</p>
              <p className="text-sm whitespace-pre-wrap">{c.tekst}</p>
            </div>
          )}
          {c.lpUrl && (
            <div className="rounded-xl bg-white p-4 text-sm shadow-sm">
              <p className="mb-1 text-xs text-gray-600">Landingspagina</p>
              <a href={c.lpUrl} target="_blank" rel="noreferrer noopener" className="text-jr-link break-all hover:underline">
                {c.lpUrl}
              </a>
              {uitkomst?.landingspagina && (
                <p className="mt-2 text-gray-600">
                  {uitkomst.landingspagina.opgehaald ? 'Opgehaald en vergeleken.' : 'Kon niet worden opgehaald; niet vergeleken.'}{' '}
                  {uitkomst.landingspagina.wat}
                </p>
              )}
            </div>
          )}
          {(c.doel || c.toelichting || c.campagne) && (
            <dl className="space-y-2 rounded-xl bg-white p-4 text-sm shadow-sm">
              {c.doel && (
                <div>
                  <dt className="text-xs text-gray-600">Doel</dt>
                  <dd>{c.doel}</dd>
                </div>
              )}
              {c.campagne && (
                <div>
                  <dt className="text-xs text-gray-600">Campagne</dt>
                  <dd>
                    <a href={`/beheer/campagnes/${c.campagne.id}`} className="text-jr-link hover:underline">
                      {c.campagne.title}
                    </a>
                  </dd>
                </div>
              )}
              {c.toelichting && (
                <div>
                  <dt className="text-xs text-gray-600">Toelichting</dt>
                  <dd className="whitespace-pre-wrap">{c.toelichting}</dd>
                </div>
              )}
            </dl>
          )}
        </section>

        <section className="space-y-8">
          {uitkomst && (
            <>
              {ERNST.map((ernst) => {
                const lijst = uitkomst.bevindingen.filter((b) => b.ernst === ernst)
                if (lijst.length === 0) return null
                return (
                  <div key={ernst}>
                    <h2 className="mb-2 text-base">
                      {ERNST_LABELS[ernst]} <span className="text-gray-500">({lijst.length})</span>
                    </h2>
                    <ul className="space-y-3">
                      {lijst.map((b, i) => (
                        <li key={i} className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${RAND[b.ernst]}`}>
                          <p className="text-xs text-gray-600">
                            {[CATEGORIE_LABELS[b.categorie], b.waar].filter(Boolean).join(' · ')}
                            {b.regel && (
                              <span title={regelTekst.get(b.regel) ?? undefined} className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">
                                {b.regel}
                              </span>
                            )}
                          </p>
                          <p className="mt-1.5 text-[15px]">{b.probleem}</p>
                          {b.citaat && <p className="mt-2 rounded-lg bg-[#FDECEA]/60 px-3 py-2 text-sm">“{b.citaat}”</p>}
                          {b.voorstel && <p className="mt-2 rounded-lg bg-[#E6F7EB]/70 px-3 py-2 text-sm">{b.voorstel}</p>}
                          {b.regel && regelTekst.get(b.regel) && <p className="mt-2 text-xs text-gray-500">{regelTekst.get(b.regel)}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}

              {uitkomst.verbeterdeTekst && (
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-base">Verbeterde tekst</h2>
                    <KopieerKnop tekst={uitkomst.verbeterdeTekst} />
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{uitkomst.verbeterdeTekst}</p>
                </div>
              )}

              {uitkomst.getoetst.length > 0 && (
                <details className="rounded-xl bg-white p-5 shadow-sm">
                  <summary className="cursor-pointer text-base select-none">Getoetste regels en afspraken ({uitkomst.getoetst.length})</summary>
                  <ul className="mt-3 divide-y divide-gray-100">
                    {uitkomst.getoetst.map((t, i) => (
                      <li key={i} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{t.regel}</span> {regelTekst.get(t.regel) ?? ''}
                          {t.toelichting && <span className="block text-xs text-gray-600">{t.toelichting}</span>}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs ${TOETS_STIJL[t.uitkomst].klasse}`}>{TOETS_STIJL[t.uitkomst].label}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* De poort: pas na de check naar de klant, en niet-groen alleen met een reden. */}
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="text-base">Naar de klant</h2>
                {c.vrijgegevenOp ? (
                  <p className="mt-1 text-sm">
                    Vrijgegeven door {c.vrijgegevenDoor ?? 'onbekend'} op {formatDate(c.vrijgegevenOp)}.
                    {c.vrijgaveReden && <span className="mt-1 block text-gray-600">Reden: {c.vrijgaveReden}</span>}
                  </p>
                ) : !c.nieuwste ? (
                  <p className="mt-1 text-sm text-gray-600">Er is een nieuwere versie. Geef die vrij.</p>
                ) : c.oordeel === 'groen' ? (
                  <ActionForm action={geefCheckVrij} submitLabel="Vrijgeven voor de klant" className="mt-3 space-y-3" meldGelukt={false}>
                    <input type="hidden" name="id" value={c.id} />
                    <p className="text-sm text-gray-600">De check is groen. Vrijgeven legt vast dat deze versie naar de klant gaat.</p>
                  </ActionForm>
                ) : (
                  <ActionForm action={geefCheckVrij} submitLabel="Toch vrijgeven" submitClassName="border border-gray-300 bg-white text-jr-text hover:bg-gray-50" className="mt-3 space-y-3" meldGelukt={false}>
                    <input type="hidden" name="id" value={c.id} />
                    <p className="text-sm text-gray-600">
                      Los de punten op en check een nieuwe versie. Mag deze versie toch naar de klant, schrijf dan op waarom; dat blijft bij de check staan.
                    </p>
                    <TextArea label="Waarom toch" name="reden" required rows={2} placeholder="De klant leverde deze tekst zelf aan en wil hem letterlijk zo." />
                  </ActionForm>
                )}
              </div>
            </>
          )}

          {c.versies.length > 1 && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-base">Versies</h2>
              <ul className="divide-y divide-gray-100">
                {c.versies.map((v) => (
                  <li key={v.id}>
                    <a
                      href={`/beheer/checks/${v.id}`}
                      aria-current={v.id === c.id ? 'page' : undefined}
                      className={`flex items-center justify-between gap-3 py-2 text-sm hover:underline ${v.id === c.id ? 'font-medium' : ''}`}
                    >
                      <span>
                        Versie {v.versie} · {formatDate(v.createdAt)}
                      </span>
                      <OordeelLabel check={v} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {kosten(c.invoerTokens, c.uitvoerTokens) && (
            <p className="text-xs text-gray-500">
              AI-kosten van deze check: ongeveer {kosten(c.invoerTokens, c.uitvoerTokens)} ({(c.invoerTokens ?? 0).toLocaleString('nl-NL')} tokens in,{' '}
              {(c.uitvoerTokens ?? 0).toLocaleString('nl-NL')} uit).
            </p>
          )}
        </section>
      </div>
    </AppShell>
  )
}
