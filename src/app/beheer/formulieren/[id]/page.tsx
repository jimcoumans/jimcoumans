import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { getFormulier, laatsteVragenlijst, linkPad, schoonQuickscan, SOORT_LABEL, SOORT_CODE, LINK_DAGEN } from '@/lib/formulieren'
import { beoordeel, KLEUR_LABEL, VRAGEN, type Antwoorden, type Kleur } from '@/lib/formulieren/vragenlijst'
import { PUNTEN, GROEPEN, standVanScan, OPLOSSER_LABEL, type ScanKleur } from '@/lib/formulieren/quickscan'
import { INTAKE } from '@/lib/formulieren/intake'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Check } from '@/components/ActionForm'
import { VragenlijstVelden } from '@/components/formulieren/VragenlijstVelden'
import { KopieerKnop } from '@/components/formulieren/KopieerKnop'
import { KLEUR_STIJL } from '@/components/formulieren/stijl'
import { formatDateLong } from '@/lib/dates'
import { slaFormulierOp, maakLink, geefScanVrij, heropenFormulier, verwijderFormulier } from '../../formulier-actions'

export const maxDuration = 26

const STATUS: Record<string, string> = { open: 'Open', ingevuld: 'Afgerond', vrijgegeven: 'Vrijgegeven' }

const VELD = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400'
const KNOP_RUSTIG = 'border border-gray-300 text-gray-700 hover:bg-gray-50'

export default async function FormulierPagina({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const f = await getFormulier(id)
  if (!f) notFound()
  const { formulier: fm, organisatie: org } = f
  const a = fm.antwoorden as Record<string, unknown>
  const verborgen = <input type="hidden" name="id" value={fm.id} />
  const vragenlijst = fm.soort === 'vragenlijst' ? null : await laatsteVragenlijst(org.id)

  return (
    <AppShell user={user} actief="klanten">
      <a href={`/beheer/klanten/${org.slug}?tab=formulieren`} className="hover:text-jr-blue mb-4 inline-block text-xs text-gray-500">
        &larr; {org.name}
      </a>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">
            {SOORT_CODE[fm.soort]} · {org.name}
            {f.deal && <> · deal: {f.deal.title}</>}
          </p>
          <h1 className="text-[28px] sm:text-[32px]">{SOORT_LABEL[fm.soort]}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Aangemaakt {formatDateLong(fm.createdAt)}
            {fm.ingevuldOp && <> · afgerond {formatDateLong(fm.ingevuldOp)}{fm.ingevuldDoorKlant && ' door de klant'}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fm.uitkomst && <span className={`rounded-full px-3 py-1 text-xs font-medium ${KLEUR_STIJL[fm.uitkomst as Kleur]}`}>{KLEUR_LABEL[fm.uitkomst as Kleur]}</span>}
          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-700">{STATUS[fm.status]}</span>
        </div>
      </div>

      {fm.soort === 'vragenlijst' && (
        <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
            <h2 className="mb-1 text-[19px]">De antwoorden</h2>
            <p className="mb-6 max-w-2xl text-sm text-gray-600">
              Vult de klant hem zelf in via de link, dan staan de antwoorden hier vanzelf. Aan de telefoon loop je hem samen door en vul je hem hier in: vijf minuten.
            </p>
            <ActionForm action={slaFormulierOp} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <VragenlijstVelden a={a as Antwoorden} />
              {fm.status === 'open' && (
                <Check label="Afronden en beoordelen" name="afronden" hint="Dan vinkt de klantreis stap 01 af en komt de uitkomst op de tijdlijn." />
              )}
            </ActionForm>
          </section>
          <div className="space-y-6">
            {fm.status === 'open' && <KlantLink id={fm.id} versie={fm.linkVersie} verlooptOp={fm.linkVerlooptOp} voornaam={String(a.voornaam ?? '')} />}
            <Beoordeling a={a as Antwoorden} afgerond={fm.status !== 'open'} />
          </div>
        </div>
      )}

      {fm.soort === 'quickscan' && <Quickscan id={fm.id} a={a} status={fm.status} vragenlijst={vragenlijst?.antwoorden as Antwoorden | undefined} />}

      {fm.soort === 'intake' && (
        <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
            <h2 className="mb-1 text-[19px]">Na het uur beantwoord</h2>
            <p className="mb-6 max-w-2xl text-sm text-gray-600">
              De volgorde en de toon staan in het draaiboek (03.1). Wat al uit de vragenlijst of de quickscan komt, vraag je niet opnieuw: je toetst het (vraag 2). Verplicht voor het voorstel: 3, 6, 10 en 24.
            </p>
            <ActionForm action={slaFormulierOp} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <div className="space-y-5">
                {INTAKE.map((v, i) => (
                  <div key={v.id}>
                    {(i === 0 || INTAKE[i - 1]!.groep !== v.groep) && <h3 className="mt-4 mb-3 text-sm font-semibold text-gray-500 uppercase">{v.groep}</h3>}
                    <label className="block">
                      <span className="flex gap-2 text-[15px] font-medium">
                        <span className="text-gray-500">{v.nr}</span>
                        {v.vraag}
                        {v.verplicht && <span className="text-[#C02A22]">*</span>}
                      </span>
                      <span className="mb-1.5 block text-xs text-gray-600">
                        {v.hulp}
                        {v.opties && <> Bijvoorbeeld: {v.opties.join(', ')}.</>}
                      </span>
                      <textarea name={v.id} rows={2} defaultValue={String(a[v.id] ?? '')} className={VELD} />
                    </label>
                  </div>
                ))}
              </div>
              {fm.status === 'open' && <Check label="Afronden" name="afronden" hint="Dan vinkt de klantreis “gesprek gevoerd” af. Kan alleen als 3, 6, 10 en 24 zijn ingevuld." />}
            </ActionForm>
          </section>
          <Context vragenlijst={vragenlijst?.antwoorden as Antwoorden | undefined} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {fm.status !== 'open' && (
          <ActionForm action={heropenFormulier} submitLabel="Weer openzetten om te corrigeren" submitClassName={KNOP_RUSTIG} resetOnSuccess={false} meldGelukt={false} className="">
            {verborgen}
          </ActionForm>
        )}
        {fm.status === 'open' && !fm.ingevuldDoorKlant && (
          <ActionForm action={verwijderFormulier} submitLabel="Verwijder dit formulier" submitClassName={KNOP_RUSTIG} resetOnSuccess={false} meldGelukt={false} className="">
            {verborgen}
          </ActionForm>
        )}
      </div>
    </AppShell>
  )
}

async function KlantLink({ id, versie, verlooptOp, voornaam }: { id: string; versie: number; verlooptOp: Date | null; voornaam: string }) {
  const h = await headers()
  const basis = process.env.APP_URL ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`
  const url = `${basis}${linkPad(id, versie)}`
  const geldig = verlooptOp && verlooptOp.getTime() > Date.now()
  const mail = `Hoi ${voornaam || '[voornaam]'},

Fijn dat je belde. Voordat we elkaar spreken, kijken we eerst naar je website en je markt. Daarvoor hebben we een paar korte vragen, zo’n vijf minuten:

${url}

Daarna weet je direct of het past, en plannen we het gesprek. Schatten mag: een globaal getal is genoeg.

Groet,
[naam]
James Robinson · 045 792 0009`
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base">Link voor de klant</h2>
      {!geldig ? (
        <>
          <p className="mb-3 text-sm text-gray-600">
            De klant vult de vragenlijst zelf in, zonder in te loggen. De link is {LINK_DAGEN} dagen geldig.
          </p>
          <ActionForm action={maakLink} submitLabel="Maak een link" resetOnSuccess={false} meldGelukt={false} className="">
            <input type="hidden" name="id" value={id} />
          </ActionForm>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">Geldig tot {formatDateLong(verlooptOp)}.</p>
          <div className="flex gap-2">
            <input readOnly value={url} aria-label="Link voor de klant" className={`${VELD} text-sm`} />
            <KopieerKnop tekst={url} />
          </div>
          <details>
            <summary className="text-jr-link cursor-pointer text-sm font-medium">Mailtekst</summary>
            <pre className="mt-2 rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-700">{mail}</pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <KopieerKnop tekst={mail} label="Kopieer de mail" />
              <a
                href={`mailto:?subject=${encodeURIComponent('Een paar vragen vooraf')}&body=${encodeURIComponent(mail)}`}
                className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Open in je mail
              </a>
            </div>
          </details>
          <ActionForm action={maakLink} submitLabel="Nieuwe link (de oude vervalt)" submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs" resetOnSuccess={false} meldGelukt={false} bevestig className="">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="opnieuw" value="1" />
          </ActionForm>
        </div>
      )}
    </section>
  )
}

const WAT_NU: Record<Kleur, string> = {
  groen: 'Het intakegesprek inplannen, minstens drie werkdagen vooruit, zodat de quickscan past. Daarna de quickscan starten.',
  oranje: 'Een kwartier bellen over het punt hieronder, met het belscript (01.4). Meer punten: één telefoontje, begin met het budget.',
  later: 'Nu geen gesprek. Eén bericht rond het moment dat de klant noemde.',
  rood: 'De rode mail met de reden in één zin (01.3). Vraag of de klant de nieuwsbrief wil.',
}

function Beoordeling({ a, afgerond }: { a: Antwoorden; afgerond: boolean }) {
  const b = beoordeel(a)
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base">Beoordeling (01.2)</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${KLEUR_STIJL[b.kleur]}`}>{KLEUR_LABEL[b.kleur]}</span>
      </div>
      {!afgerond && <p className="mb-3 text-xs text-gray-500">Voorlopig, op wat er nu is opgeslagen.</p>}
      <ul className="mb-3 list-disc space-y-1 pl-4 text-sm">
        {b.redenen.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
        <b>Wat nu:</b> {WAT_NU[b.kleur]}
      </p>
      {b.rekensom.length > 0 && (
        <>
          <h3 className="mb-1.5 text-sm font-semibold">Wat een aanvraag mag kosten</h3>
          <table className="w-full text-sm">
            <tbody>
              {b.rekensom.map((r, i) => (
                <tr key={r.label} className={i === b.rekensom.length - 1 ? 'border-t border-gray-300 font-semibold' : ''}>
                  <td className="py-1 pr-3 text-gray-700">{r.label}</td>
                  <td className="tabular py-1 text-right whitespace-nowrap">{r.waarde}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">Met 30% marge en twaalf maanden terugverdientijd. Aan tafel vervangen we die door de echte marge en termijn.</p>
        </>
      )}
    </section>
  )
}

/** De getallen uit de vragenlijst, naast de quickscan en het intakegesprek. */
function Context({ vragenlijst }: { vragenlijst: Antwoorden | undefined }) {
  if (!vragenlijst) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base">Uit de vragenlijst</h2>
        <p className="text-sm text-gray-600">Nog geen afgeronde vragenlijst. Start die eerst: daar komen de getallen voor de scan en het gesprek uit.</p>
      </section>
    )
  }
  const b = beoordeel(vragenlijst)
  const toon = (id: string) => {
    const w = vragenlijst[id]
    return Array.isArray(w) ? w.join(', ') : w === null || w === undefined || w === '' ? '–' : String(w)
  }
  const rijen = VRAGEN.filter((v) => ['watVerkoop', 'waar', 'website', 'opdracht', 'aanvragen', 'conversie', 'doorlooptijd', 'knelpunt', 'beginnen'].includes(v.id))
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base">Uit de vragenlijst</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${KLEUR_STIJL[b.kleur]}`}>{KLEUR_LABEL[b.kleur]}</span>
      </div>
      <dl className="space-y-2 text-sm">
        {rijen.map((v) => (
          <div key={v.id} className="grid grid-cols-[1fr_1.2fr] gap-3">
            <dt className="text-gray-600">{v.vraag}</dt>
            <dd>{toon(v.id)}{v.id === 'conversie' && vragenlijst.conversie !== null && vragenlijst.conversie !== undefined && vragenlijst.conversie !== '' ? '%' : ''}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_1.2fr] gap-3 border-t border-gray-200 pt-2 font-semibold">
          <dt>Mag per aanvraag kosten</dt>
          <dd>{b.maxPerAanvraag === null ? '–' : `€ ${b.maxPerAanvraag.toLocaleString('nl-NL')}`}</dd>
        </div>
      </dl>
    </section>
  )
}

const KLEUR_KNOP: Record<ScanKleur, string> = {
  groen: 'has-[:checked]:bg-jr-green/15 has-[:checked]:border-[#1d7a36]',
  oranje: 'has-[:checked]:bg-jr-orange/15 has-[:checked]:border-[#9a5b00]',
  rood: 'has-[:checked]:bg-[#FDECEA] has-[:checked]:border-[#C02A22]',
  nvt: 'has-[:checked]:bg-gray-100 has-[:checked]:border-gray-500',
}

function Quickscan({ id, a, status, vragenlijst }: { id: string; a: Record<string, unknown>; status: string; vragenlijst: Antwoorden | undefined }) {
  const s = schoonQuickscan(a)
  const stand = standVanScan(s)
  const groepen = Object.keys(GROEPEN) as (keyof typeof GROEPEN)[]
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
      <section className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
        <h2 className="mb-1 text-[19px]">De zestien punten</h2>
        <p className="mb-5 max-w-2xl text-sm text-gray-600">
          Per punt: wat je zag (de meting), de kleur en een notitie. Wat tussen groen en rood valt, is oranje; bestaat een punt uit meer metingen, dan telt de slechtste. Eerst alles invullen, dan pas de drie bevindingen. <b>Doe nooit zelf een aanvraag op de site.</b>
        </p>
        <ActionForm action={slaFormulierOp} submitLabel="Opslaan" resetOnSuccess={false}>
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-jr-text mb-1.5 block text-[13px] font-medium">Zoektermen</span>
              <input name="zoektermen" defaultValue={s.zoektermen} className={VELD} />
            </label>
            <label className="block">
              <span className="text-jr-text mb-1.5 block text-[13px] font-medium">Gebied</span>
              <input name="gebied" defaultValue={s.gebied} className={VELD} />
            </label>
          </div>
          {groepen.map((g) => (
            <div key={g} className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-500 uppercase">{GROEPEN[g]}</h3>
              <div className="divide-y divide-gray-200">
                {PUNTEN.filter((p) => p.groep === g).map((p) => {
                  const inv = s.punten[String(p.nr)] ?? {}
                  return (
                    <div key={p.nr} className="py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[15px] font-semibold">
                          {p.nr} · {p.naam} <span className="ml-1 text-xs font-normal text-gray-500">{p.waarmee}</span>
                        </p>
                        <p className="text-xs text-gray-500">{p.lostOp}</p>
                      </div>
                      {p.normen ? (
                        <>
                          <div className="mt-2 grid gap-2 sm:grid-cols-4">
                            {(['groen', 'oranje', 'rood', 'nvt'] as ScanKleur[]).map((k) => (
                              <label key={k} className={`flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 p-2.5 text-xs ${KLEUR_KNOP[k]}`}>
                                <input type="radio" name={`p${p.nr}_kleur`} value={k} defaultChecked={inv.kleur === k} className="mt-0.5" />
                                <span>
                                  <b className="block text-[13px]">{k === 'nvt' ? 'n.v.t.' : k[0]!.toUpperCase() + k.slice(1)}</b>
                                  {k === 'nvt' ? 'Met een reden in de notitie' : p.normen![k]}
                                </span>
                              </label>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-gray-600">Ter informatie, zonder kleur. Noteer wat je zag.</p>
                      )}
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input name={`p${p.nr}_gezien`} defaultValue={inv.gezien ?? ''} placeholder="Wat we zagen" aria-label={`Wat we zagen bij ${p.naam}`} className={VELD} />
                        <input name={`p${p.nr}_notitie`} defaultValue={inv.notitie ?? ''} placeholder="Notitie" aria-label={`Notitie bij ${p.naam}`} className={VELD} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="mt-6">
            <h3 className="mb-1 text-sm font-semibold text-gray-500 uppercase">De drie bevindingen</h3>
            <p className="mb-3 text-xs text-gray-600">
              Het raakt waar de klant tegenaan loopt; het gevolg in de eigen getallen van de klant, nooit een branchecijfer; het grootste probleem gaat altijd mee, ook als wij het niet oplossen.
            </p>
            {[0, 1, 2].map((i) => {
              const b = s.bevindingen[i] ?? { punt: null, gezien: '', gevolg: '' }
              return (
                <div key={i} className="mb-4 grid gap-2 sm:grid-cols-[110px_1fr]">
                  <select name={`b${i + 1}_punt`} defaultValue={b.punt ?? ''} aria-label={`Punt bij bevinding ${i + 1}`} className={VELD}>
                    <option value="">Punt…</option>
                    {PUNTEN.map((p) => (
                      <option key={p.nr} value={p.nr}>
                        {p.nr} · {p.naam}
                      </option>
                    ))}
                  </select>
                  <div className="space-y-2">
                    <input name={`b${i + 1}_gezien`} defaultValue={b.gezien} placeholder="Wat we zagen, in één zin" aria-label={`Wat we zagen bij bevinding ${i + 1}`} className={VELD} />
                    <textarea name={`b${i + 1}_gevolg`} defaultValue={b.gevolg} rows={2} placeholder="Wat het de klant kost, in de eigen getallen" aria-label={`Gevolg bij bevinding ${i + 1}`} className={VELD} />
                  </div>
                </div>
              )
            })}
          </div>
          {status === 'open' && <Check label="Afronden" name="afronden" hint="Kan als alle kleurpunten een kleur hebben, 13 en 14 zijn ingevuld en de drie bevindingen er staan." />}
        </ActionForm>
      </section>

      <div className="space-y-6">
        <Context vragenlijst={vragenlijst} />
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base">Stand van de scan</h2>
          {stand.stopknop && (
            <p className="mb-3 rounded-lg bg-[#FDECEA] p-3 text-sm text-[#C02A22]">
              <b>De stopknop staat op rood.</b> Er kan geen meetcode in de site: de afspraak gaat niet door. Afzeggen met de mail “niet meten” (01.3), uiterlijk een werkdag van tevoren.
            </p>
          )}
          <p className="mb-3 text-sm">
            {stand.telling.groen} groen · {stand.telling.oranje} oranje · {stand.telling.rood} rood
          </p>
          {stand.ontbreekt.length > 0 ? (
            <>
              <p className="mb-1 text-sm font-semibold">Nog te doen</p>
              <ul className="mb-3 list-disc space-y-0.5 pl-4 text-sm text-gray-700">
                {stand.ontbreekt.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mb-3 text-sm text-[#1d7a36]">Compleet.</p>
          )}
          {stand.acties.length > 0 && (
            <>
              <p className="mb-1 text-sm font-semibold">De actielijst: wie lost het op</p>
              <ul className="mb-3 space-y-1 text-sm">
                {stand.acties.map((g) => (
                  <li key={g.oplosser}>
                    <b>{OPLOSSER_LABEL[g.oplosser]}:</b> {g.punten.map((p) => `${p.nr} ${p.naam.toLowerCase()}`).join(', ')}
                  </li>
                ))}
              </ul>
            </>
          )}
          {stand.webmix.length > 0 && (
            <>
              <p className="mb-1 text-sm font-semibold">Herstel vóór de start (Webmix)</p>
              <ul className="mb-3 space-y-0.5 text-sm">
                {stand.webmix.map((w) => (
                  <li key={w.nr} className="flex justify-between gap-3">
                    <span>{w.post}</span>
                    <span className="tabular whitespace-nowrap">{w.bedrag}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500">Excl. btw. Gaat in de rekensom van het voorstel af van de marketingruimte.</p>
            </>
          )}
          {status !== 'open' && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
              <a href={`/beheer/formulieren/${id}/rapport`} className="text-jr-blue text-sm hover:underline">
                Bekijk het scanrapport
              </a>
              {status === 'ingevuld' && (
                <ActionForm action={geefScanVrij} submitLabel="Geef het scanrapport vrij" resetOnSuccess={false} meldGelukt={false} className="">
                  <input type="hidden" name="id" value={id} />
                </ActionForm>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
