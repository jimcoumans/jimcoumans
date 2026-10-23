import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import {
  EENHEID_LABELS,
  getAanvraag,
  indicatieVoor,
  listPartnersVoorKeuze,
  omvangTekst,
  onsWerkCents,
  pakkettenPerPartner,
  UITVRAAG_STATUS_LABELS,
  vergelijk,
  voorgesteldePrijs,
  type Eenheid,
} from '@/lib/partneraanvragen'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Field, TextArea } from '@/components/ActionForm'
import { AanvraagVelden } from '@/components/partners/AanvraagVelden'
import { NieuwePartnerVelden, OfferteVelden } from '@/components/partners/AanvraagFormulieren'
import { PartnerProfiel } from '@/components/partners/PartnerProfiel'
import { KopieerKnop } from '@/components/checks/CheckVolger'
import {
  annuleerAanvraag,
  beoordeelPartner,
  bevestigPartner,
  bewaarWerk,
  bewerkAanvraag,
  extraWerk,
  maakPartnerVoorstel,
  nieuwePartnerVoorAanvraag,
  offerteVastleggen,
  vraagOpnieuwUit,
  vraagUit,
  wijsPartnerAf,
} from '../../../partneraanvraag-actions'
import { formatEuro } from '@/lib/money'
import { formatDate } from '@/lib/dates'

export const maxDuration = 26

const STATUS_STIJL: Record<string, string> = {
  verstuurd: 'bg-[#FFF3E0] text-[#94590A]',
  beantwoord: 'bg-jr-lightblue text-jr-link',
  bevestigd: 'bg-[#E6F7EB] text-[#1D7D3F]',
  afgewezen: 'bg-gray-100 text-gray-600',
}

const KLEIN = 'text-gray-600 hover:bg-gray-100 !px-2 !py-1 !text-xs'
const invoer = 'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm tabular'
const euroInvoer = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

function Stap({ nummer, titel, uitleg, acties, children }: { nummer: number; titel: string; uitleg?: React.ReactNode; acties?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base">
          <span className="bg-jr-text mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white">{nummer}</span>
          {titel}
        </h2>
        {acties && <div className="flex flex-wrap items-center gap-2">{acties}</div>}
      </div>
      {uitleg && <p className="mb-4 text-xs text-gray-600">{uitleg}</p>}
      {children}
    </section>
  )
}

export default async function AanvraagPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const detail = await getAanvraag(id)
  if (!detail) notFound()
  const { aanvraag: a, klant, werk, uitvragen, quote } = detail
  const [rijen, keuze, perPartner] = await Promise.all([vergelijk(id), listPartnersVoorKeuze(), pakkettenPerPartner()])
  const vandaag = new Date().toISOString().slice(0, 10)
  const eigenWerk = onsWerkCents(werk)
  const open = a.status === 'open'
  const bevestigd = uitvragen.filter((u) => u.status === 'bevestigd' && u.prijsCents)
  const productenVoor = (partnerId: string) => (perPartner.get(partnerId) ?? []).filter((p) => p.actief && p.specialisme === a.specialisme)

  const h = await headers()
  const basis = process.env.APP_URL ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  const omvang = omvangTekst(a)

  const nieuwePartner = open && (
    <Paneel knop="+ Nieuwe partner" stijl="rustig" titel="Partner toevoegen" uitleg={`Hij komt meteen in de vergelijking, met specialisme ${a.specialisme.toLowerCase()}. Matchprofiel en meer producten vul je later aan bij Partners.`}>
      <ActionForm action={nieuwePartnerVoorAanvraag} submitLabel="Partner toevoegen">
        <NieuwePartnerVelden aanvraag={a} />
      </ActionForm>
    </Paneel>
  )
  const offerteInvoeren = (stijl: 'primair' | 'rustig') =>
    open && (
      <Paneel knop="Offerte van een partner invoeren" stijl={stijl} titel="Offerte van een partner" uitleg="Kwam de prijs per mail, telefoon of als pdf binnen? Leg hem hier vast. Er gaat geen mail naar de partner.">
        <ActionForm action={offerteVastleggen} submitLabel="Vastleggen">
          <OfferteVelden aanvraag={a} partners={keuze} />
        </ActionForm>
      </Paneel>
    )

  return (
    <AppShell user={user} actief="partneraanvragen">
      <PaginaKop
        titel={a.titel}
        uitleg={
          <>
            <a href={`/beheer/klanten/${klant.slug}`} className="text-jr-link hover:underline">
              {klant.name}
            </a>
            {' · '}
            {[a.specialisme, a.branche, a.voorkeursdatum ? formatDate(new Date(`${a.voorkeursdatum}T12:00:00`)) : null, a.locatie, omvang || null].filter(Boolean).join(' · ')}
            {a.status === 'geannuleerd' && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">Geannuleerd</span>}
          </>
        }
        acties={
          <>
            <a href="/beheer/partners/aanvragen" className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-jr-text hover:bg-gray-50">
              Alle aanvragen
            </a>
            {quote && (
              <a href={`/beheer/offertes/${quote.id}`} className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-5 py-2.5 text-sm font-medium text-white">
                Offerte {quote.number}
              </a>
            )}
            {open && (
              <Paneel knop="Wijzig aanvraag" stijl="rustig" titel="Aanvraag wijzigen" uitleg="Partners die al zijn uitgevraagd, zien de wijziging pas als je ze opnieuw uitvraagt.">
                <ActionForm action={bewerkAanvraag} submitLabel="Opslaan" resetOnSuccess={false}>
                  <input type="hidden" name="aanvraagId" value={a.id} />
                  <AanvraagVelden aanvraag={a} />
                </ActionForm>
              </Paneel>
            )}
            {a.status !== 'voorstel' && (
              <ActionForm action={annuleerAanvraag} submitLabel={open ? 'Annuleer' : 'Heropen'} submitClassName={KLEIN} resetOnSuccess={false} meldGelukt={false} className="" bevestig={open}>
                <input type="hidden" name="aanvraagId" value={a.id} />
                <input type="hidden" name="status" value={open ? 'geannuleerd' : 'open'} />
              </ActionForm>
            )}
          </>
        }
      />

      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <p className="text-xs text-gray-600">De vraag, zoals de partner hem leest</p>
        <p className="mt-1 text-[15px] whitespace-pre-wrap">{a.vraag}</p>
        {a.datumToelichting && <p className="mt-2 text-sm text-gray-600">Datum: {a.datumToelichting}</p>}
        {a.notities && <p className="mt-2 text-sm text-gray-500">Intern: {a.notities}</p>}
      </div>

      {/* 1. Wie past, wat kost het. Partners en standaardproducten beheer je hier ook. */}
      <Stap
        nummer={1}
        titel={`Partners voor ${a.specialisme.toLowerCase()}`}
        uitleg={
          <>
            De beste match bovenaan; bij elke score staat waarom. De prijs komt uit de standaardproducten van de partner. Vink partners aan om ze per mail een uitvraag te sturen,
            of leg hun offerte zelf vast. Advies: vraag de beste match en één reserve uit.
          </>
        }
        acties={
          <>
            {nieuwePartner}
            {offerteInvoeren('rustig')}
          </>
        }
      >
        {rijen.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
            Nog geen actieve partner met specialisme {a.specialisme.toLowerCase()}. Voeg er een toe met <strong>+ Nieuwe partner</strong>, of zet het specialisme aan bij een bestaande
            partner op{' '}
            <a href="/beheer/partners" className="text-jr-link hover:underline">
              Partners
            </a>
            .
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                    <th className="w-8 pb-2 font-normal" />
                    <th className="pb-2 font-normal">Partner</th>
                    <th className="pb-2 font-normal">Match</th>
                    <th className="w-56 pb-2 font-normal">Standaardproduct</th>
                    <th className="pb-2 text-right font-normal">Partner</th>
                    <th className="pb-2 text-right font-normal">Klant betaalt</th>
                    <th className="w-36 pb-2 font-normal" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 align-top">
                  {rijen.map((r, i) => {
                    return (
                      <tr key={r.partner.id}>
                        <td className="py-3">
                          {r.uitvraag ? (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap ${STATUS_STIJL[r.uitvraag.status]}`}>
                              {r.uitvraag.handmatig && r.uitvraag.status !== 'verstuurd' ? (r.uitvraag.status === 'bevestigd' ? 'Bevestigd' : 'Offerte binnen') : UITVRAAG_STATUS_LABELS[r.uitvraag.status]}
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              form="uitvraag-formulier"
                              name="partnerId"
                              value={r.partner.id}
                              defaultChecked={i === 0 && uitvragen.length === 0}
                              disabled={!open}
                              aria-label={`${r.partner.name} uitvragen`}
                              className="accent-jr-blue mt-0.5 h-[18px] w-[18px]"
                            />
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-medium">
                            {r.partner.name}
                            {i === 0 && <span className="ml-2 rounded-full bg-jr-lightblue px-2 py-0.5 text-[11px] font-normal text-jr-link">Beste match</span>}
                          </p>
                          {r.partner.sterktes && <p className="mt-0.5 max-w-xs text-xs text-gray-600">{r.partner.sterktes}</p>}
                          {r.partner.werkgebied && <p className="mt-0.5 text-xs text-gray-500">{r.partner.werkgebied}</p>}
                          {!r.partner.email && <p className="mt-0.5 text-xs text-[#94590A]">Geen e-mailadres: uitvragen per mail kan niet</p>}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                              <span className="bg-jr-blue block h-full" style={{ width: `${r.match.score}%` }} />
                            </span>
                            <span className="tabular text-xs font-medium">{r.match.score}</span>
                          </div>
                          <ul className="mt-1 space-y-0.5 text-xs">
                            {r.match.redenen.map((t) => (
                              <li key={t} className="text-[#1D7D3F]">
                                ✓ {t}
                              </li>
                            ))}
                            {r.match.bezwaren.map((t) => (
                              <li key={t} className="text-[#94590A]">
                                ! {t}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-3 pr-3">
                          {r.pakketten.length === 0 ? (
                            <span className="text-xs text-gray-500">Nog geen standaardproduct</span>
                          ) : r.uitvraag ? (
                            <span className="text-xs">{r.pakketten.find((p) => p.id === (r.uitvraag?.antwoordPakketId ?? r.uitvraag?.pakketId))?.naam ?? 'Eigen prijs'}</span>
                          ) : (
                            <select
                              form="uitvraag-formulier"
                              name={`pakket_${r.partner.id}`}
                              defaultValue={r.indicatie?.pakket.id ?? ''}
                              disabled={!open}
                              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs"
                            >
                              {r.pakketten.map((p) => {
                                const ind = indicatieVoor(p, a, vandaag)
                                return (
                                  <option key={p.id} value={p.id}>
                                    {p.naam}: {formatEuro(ind.cents)}
                                    {ind.verlopen ? ' (verlopen)' : ''}
                                  </option>
                                )
                              })}
                            </select>
                          )}
                          {r.indicatie && !r.uitvraag && (
                            <p className="mt-1 text-[11px] text-gray-500">
                              {r.indicatie.uitleg}
                              {r.indicatie.aanname && <span className="text-[#94590A]"> (vul de omvang in)</span>}
                            </p>
                          )}
                        </td>
                        <td className="tabular py-3 text-right">
                          {r.uitvraag?.prijsCents ? formatEuro(r.uitvraag.prijsCents) : r.indicatie ? formatEuro(r.indicatie.cents) : '–'}
                        </td>
                        <td className="tabular py-3 text-right font-medium">
                          {r.uitvraag?.prijsCents ? formatEuro(r.uitvraag.prijsCents + eigenWerk) : r.klantprijsCents !== null ? formatEuro(r.klantprijsCents) : '–'}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            {open && (
                              <Paneel knop="Offerte invoeren" stijl="klein" titel={`Offerte van ${r.partner.name}`} uitleg="Zoals die per mail, telefoon of als pdf binnenkwam. Er gaat geen mail naar de partner.">
                                <ActionForm action={offerteVastleggen} submitLabel="Vastleggen" resetOnSuccess={false}>
                                  <OfferteVelden aanvraag={a} partnerId={r.partner.id} pakketten={r.pakketten} bestaand={r.uitvraag} />
                                </ActionForm>
                              </Paneel>
                            )}
                            <Paneel knop="Standaardproducten" stijl="klein" titel={r.partner.name} sluitNaOpslaan={false}>
                              <PartnerProfiel partner={r.partner} pakketten={perPartner.get(r.partner.id) ?? []} />
                            </Paneel>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {open && rijen.some((r) => !r.uitvraag) && (
              <ActionForm id="uitvraag-formulier" action={vraagUit} submitLabel="Stuur de aangevinkte partners een uitvraag" bevestig={false} className="mt-4 space-y-3" resetOnSuccess={false}>
                <input type="hidden" name="aanvraagId" value={a.id} />
              </ActionForm>
            )}
          </>
        )}
      </Stap>

      {/* 2. Wat de partners antwoordden of wat we vastlegden, en wat wij bevestigen. */}
      <Stap
        nummer={2}
        titel="Offertes van partners"
        uitleg="Antwoorden via de link en offertes die je zelf vastlegt. Bevestig de prijs die we met de partner afspreken; die gaat één-op-één op de offerte voor de klant."
        acties={uitvragen.length > 0 ? offerteInvoeren('rustig') : undefined}
      >
        {uitvragen.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
            Nog niets. Stuur partners in stap 1 een uitvraag, of leg de offerte van een partner vast. <span className="ml-1 inline-block">{offerteInvoeren('primair')}</span>
          </p>
        ) : (
          <ul className="space-y-3">
            {uitvragen.map((u) => {
              const voorstel = voorgesteldePrijs(u, a, vandaag)
              const link = `${basis}${u.link}`
              return (
                <li key={u.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-medium">{u.partner.name}</p>
                      <p className="text-xs text-gray-500">
                        {u.handmatig ? 'Zelf vastgelegd' : `Uitgevraagd op ${formatDate(u.verstuurdOp)}`}
                        {u.pakket && !u.handmatig && ` · voorgesteld: ${u.pakket.naam}`}
                        {u.indicatieCents !== null && !u.handmatig && ` (${formatEuro(u.indicatieCents)})`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_STIJL[u.status]}`}>{UITVRAAG_STATUS_LABELS[u.status]}</span>
                  </div>

                  {u.mailFout && u.status === 'verstuurd' && (
                    <div className="mt-3 rounded-lg border-l-4 border-jr-orange bg-jr-orange/10 px-4 py-3 text-sm">
                      <p>De mail ging niet weg: {u.mailFout}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 break-all">
                        Deel de link zelf: <span className="text-xs">{link}</span> <KopieerKnop tekst={link} />
                      </p>
                    </div>
                  )}

                  {u.beantwoordOp && (
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-gray-600">Beschikbaar</dt>
                        <dd>{u.beschikbaar ? 'Ja, op de gevraagde datum' : u.andereDatum ? `Niet op die datum; wel: ${u.andereDatum}` : 'Nee'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-600">Prijs van de partner</dt>
                        <dd className="tabular">
                          {u.antwoordPrijsCents
                            ? `${formatEuro(u.antwoordPrijsCents)}${u.antwoordPakket ? ` (${u.antwoordPakket.naam})` : ', eigen prijs'}`
                            : u.antwoordPakket
                              ? `${u.antwoordPakket.naam}: ${formatEuro(indicatieVoor(u.antwoordPakket, a, vandaag).cents)}${u.antwoordPakket.eenheid !== 'opdracht' ? ` (${EENHEID_LABELS[u.antwoordPakket.eenheid as Eenheid]})` : ''}`
                              : '–'}
                        </dd>
                      </div>
                      {u.antwoordOpmerking && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-gray-600">Opmerking</dt>
                          <dd className="whitespace-pre-wrap">{u.antwoordOpmerking}</dd>
                        </div>
                      )}
                      {u.offerteSleutel && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-gray-600">Offerte van de partner</dt>
                          <dd>
                            <a href={`/api/partneraanvragen/offerte/${u.id}`} target="_blank" rel="noreferrer" className="text-jr-link hover:underline">
                              {u.offerteNaam ?? 'Bekijk de offerte'}
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {u.status === 'bevestigd' && u.prijsCents && (
                    <p className="mt-3 text-sm">
                      Bevestigd voor <span className="tabular font-medium">{formatEuro(u.prijsCents)}</span>. Met ons werk erbij betaalt de klant{' '}
                      <span className="tabular font-medium">{formatEuro(u.prijsCents + eigenWerk)}</span>.
                    </p>
                  )}

                  {open && (
                    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
                      {u.status !== 'afgewezen' && u.beschikbaar !== false && (
                        <ActionForm
                          action={bevestigPartner}
                          submitLabel={u.status === 'bevestigd' ? 'Prijs aanpassen' : 'Bevestig'}
                          resetOnSuccess={false}
                          meldGelukt={false}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <input type="hidden" name="aanvraagId" value={a.id} />
                          <input type="hidden" name="uitvraagId" value={u.id} />
                          <label className="block">
                            <span className="mb-1 block text-xs text-gray-600">Inkoopprijs, exclusief btw</span>
                            <input name="prijs" defaultValue={u.prijsCents ? euroInvoer(u.prijsCents) : voorstel ? euroInvoer(voorstel) : ''} className={`${invoer} w-32`} required />
                          </label>
                        </ActionForm>
                      )}
                      <Paneel knop="Offerte bijwerken" stijl="klein" titel={`Offerte van ${u.partner.name}`} uitleg="Pas aan wat de partner bood, of voeg de offerte als bestand toe.">
                        <ActionForm action={offerteVastleggen} submitLabel="Vastleggen" resetOnSuccess={false}>
                          <OfferteVelden aanvraag={a} partnerId={u.partnerId} pakketten={productenVoor(u.partnerId)} bestaand={u} />
                        </ActionForm>
                      </Paneel>
                      {u.status !== 'bevestigd' && !u.handmatig && (
                        <ActionForm action={vraagOpnieuwUit} submitLabel="Opnieuw versturen" submitClassName={KLEIN} resetOnSuccess={false} meldGelukt={false} className="" bevestig={false}>
                          <input type="hidden" name="aanvraagId" value={a.id} />
                          <input type="hidden" name="uitvraagId" value={u.id} />
                        </ActionForm>
                      )}
                      {u.status !== 'afgewezen' && (
                        <ActionForm action={wijsPartnerAf} submitLabel="Niet deze partner" submitClassName={KLEIN} resetOnSuccess={false} meldGelukt={false} className="" bevestig={false}>
                          <input type="hidden" name="aanvraagId" value={a.id} />
                          <input type="hidden" name="uitvraagId" value={u.id} />
                        </ActionForm>
                      )}
                    </div>
                  )}

                  {u.status === 'bevestigd' && a.status === 'voorstel' && (
                    <details className="mt-4 border-t border-gray-100 pt-3" open={!u.beoordeling}>
                      <summary className="cursor-pointer text-sm font-medium">{u.beoordeling ? `Beoordeling: ${u.beoordeling} uit 5` : 'Na de opdracht: hoe ging het?'}</summary>
                      <ActionForm action={beoordeelPartner} submitLabel="Opslaan" resetOnSuccess={false} className="mt-3 space-y-3">
                        <input type="hidden" name="aanvraagId" value={a.id} />
                        <input type="hidden" name="uitvraagId" value={u.id} />
                        <fieldset className="flex gap-3 text-sm">
                          <legend className="mb-1 text-xs text-gray-600">Beoordeling (telt mee in de volgende match)</legend>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <label key={n} className="flex items-center gap-1">
                              <input type="radio" name="beoordeling" value={n} defaultChecked={u.beoordeling === n} required className="accent-jr-blue" />
                              {n}
                            </label>
                          ))}
                        </fieldset>
                        <TextArea label="Wat viel op" name="notitie" rows={2} defaultValue={u.beoordelingNotitie ?? ''} />
                      </ActionForm>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Stap>

      {/* 3. Ons werk: per regel aan of uit. De basisfee staat standaard aan, maar mag uit. */}
      <Stap
        nummer={3}
        titel="Ons werk"
        uitleg="Het werk van de partner gaat één-op-één door, zonder opslag. Vink uit wat we hier niet rekenen: omdat we het voor eigen rekening nemen, of omdat het al in de uren voor marketingmanagement zit."
        acties={<p className="tabular text-sm">{formatEuro(eigenWerk)} <span className="text-xs text-gray-500">bovenop de partnerprijs</span></p>}
      >
        <ActionForm action={bewaarWerk} submitLabel="Opslaan" resetOnSuccess={false} className="space-y-2">
          <input type="hidden" name="aanvraagId" value={a.id} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-600">
                  <th className="w-8 pb-2 font-normal" />
                  <th className="pb-2 font-normal">Onderdeel</th>
                  <th className="w-24 pb-2 font-normal">Uren</th>
                  <th className="w-28 pb-2 font-normal">Uurtarief</th>
                  <th className="w-24 pb-2 text-right font-normal">Bedrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {werk.map((w) => (
                  <tr key={w.id} className={w.aan ? '' : 'text-gray-400'}>
                    <td className="py-2">
                      <input type="hidden" name="werkId" value={w.id} />
                      <input type="checkbox" name={`aan_${w.id}`} defaultChecked={w.aan} disabled={!open} aria-label={`${w.naam} meerekenen`} className="accent-jr-blue h-[18px] w-[18px]" />
                    </td>
                    <td className="py-2 pr-3">
                      {w.naam}
                      {w.omschrijving && <span className="block text-xs text-gray-500">{w.omschrijving}</span>}
                    </td>
                    <td className="py-2 pr-2">
                      <input name={`uren_${w.id}`} defaultValue={(w.urenHonderdsten / 100).toString().replace('.', ',')} disabled={!open} className={invoer} aria-label="Uren" />
                    </td>
                    <td className="py-2 pr-2">
                      <input name={`tarief_${w.id}`} defaultValue={euroInvoer(w.uurtariefCents)} disabled={!open} className={invoer} aria-label="Uurtarief" />
                    </td>
                    <td className="tabular py-2 text-right">{formatEuro(Math.round((w.urenHonderdsten * w.uurtariefCents) / 100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ActionForm>
        {open && (
          <details className="mt-3">
            <summary className="text-jr-link cursor-pointer text-sm font-medium">Ander werk toevoegen</summary>
            <ActionForm action={extraWerk} submitLabel="Toevoegen" className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="aanvraagId" value={a.id} />
              <Field label="Onderdeel" name="naam" required placeholder="Begeleiding op locatie" />
              <Field label="Omschrijving voor de klant" name="omschrijving" />
              <Field label="Uren" name="uren" required placeholder="2" />
              <Field label="Uurtarief" name="tarief" required placeholder="100,00" />
            </ActionForm>
          </details>
        )}
      </Stap>

      {/* 4. De offerte voor de klant. */}
      <Stap nummer={4} titel="Offerte voor de klant">
        {quote ? (
          <p className="text-sm">
            De offerte staat klaar:{' '}
            <a href={`/beheer/offertes/${quote.id}`} className="text-jr-link font-medium hover:underline">
              {quote.number}
            </a>
            . Daar werk je hem af en zet je hem op verstuurd.
          </p>
        ) : !open ? (
          <p className="text-sm text-gray-600">Deze aanvraag is geannuleerd. Heropen hem om een offerte te maken.</p>
        ) : bevestigd.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
            Bevestig eerst de prijs van een partner (stap 2), of leg zijn offerte vast met &ldquo;meteen bevestigen&rdquo; aan. Dan maak je hier met één klik de offerte.
          </p>
        ) : (
          <ActionForm action={maakPartnerVoorstel} submitLabel="Maak de offerte voor de klant" bevestig={false} resetOnSuccess={false} meldGelukt={false} className="space-y-4">
            <input type="hidden" name="aanvraagId" value={a.id} />
            <p className="text-xs text-gray-600">
              Kies de partner. De offerte wordt een concept in Offertes: de partner één-op-één, plus het werk dat in stap 3 aan staat. Daarna kun je er nog regels aan toevoegen of
              wijzigen.
            </p>
            <ul className="space-y-2">
              {bevestigd.map((u, i) => (
                <li key={u.id}>
                  <label className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm hover:bg-gray-50">
                    <span className="flex items-center gap-3">
                      <input type="radio" name="uitvraagId" value={u.id} defaultChecked={i === 0} required className="accent-jr-blue h-[18px] w-[18px]" />
                      <span>
                        <span className="font-medium">{u.partner.name}</span>
                        <span className="block text-xs text-gray-500">
                          {(u.antwoordPakket ?? u.pakket)?.naam ?? 'Eigen prijs'} · partner {formatEuro(u.prijsCents!)} + ons werk {formatEuro(eigenWerk)}
                        </span>
                      </span>
                    </span>
                    <span className="tabular text-[15px] font-semibold">{formatEuro(u.prijsCents! + eigenWerk)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </ActionForm>
        )}
      </Stap>
    </AppShell>
  )
}
