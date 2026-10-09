import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Check, Field, Select } from '@/components/ActionForm'
import { ContractFormulier, LEGE_START, startUitInvoer, type ContractStart } from '@/components/ContractFormulier'
import { getKandidaat, getVacature } from '@/lib/werving'
import { getIndiensttreding, type StapSleutel } from '@/lib/indiensttreding'
import { listFunctieprofielen, listMogelijkeOndertekenaars, invoerUit, ondertekenaarsVan, namenZin, tekennaamVan, korteNaam } from '@/lib/contracten'
import { getHuis, schaalNamen } from '@/lib/salarishuis'
import { getBedrijf, getBedrijfsdocument, huidigBedrijfsdocument, handboekPad } from '@/lib/bedrijf'
import { leesIban, DOCUMENT_LABELS } from '@/lib/persoonsgegevens'
import { werkadresVoorstel } from '@/lib/aanname'
import { AFDELINGEN } from '@/lib/team'
import { contractMail, mailtoLink } from '@/lib/mailsjablonen'
import { getTekstOverrides } from '@/lib/sjablonen'
import { formatDate, formatDateInput, formatDateLong } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import { gegevensOpslaan } from '../../../../werving-actions'
import { contractBijwerken } from '../../../../contract-actions'
import { getekendeStukken, kandidaatAannemen } from '../../../../aanname-actions'

export const maxDuration = 26

const KNOP = 'bg-jr-btn hover:bg-jr-btnhover inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium text-white'
const KNOP_RUSTIG = 'inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'

/**
 * De indiensttreding van een kandidaat, stap voor stap: gegevens, contract,
 * printen, getekende stukken terug, in dienst nemen. Bovenaan zie je waar je
 * bent en wat er nog mist; de stap waar je mee bezig bent staat open.
 *
 * Wat niet bij deze fase hoort (aanzeggen, ketenregeling) staat hier niet:
 * dat komt in het dossier van de collega.
 */
export default async function IndiensttredingPagina({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/beheer')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const kaart = await getKandidaat(id)
  if (!kaart) notFound()
  const k = kaart.kandidaat

  const [stand, bedrijf, profielen, huis, tekenaars, vacature, mailTeksten] = await Promise.all([
    getIndiensttreding(k),
    getBedrijf(),
    listFunctieprofielen(),
    getHuis(),
    listMogelijkeOndertekenaars(),
    k.vacancyId ? getVacature(k.vacancyId) : Promise.resolve(null),
    getTekstOverrides(),
  ])
  const { contract, gegevens, stappen, huidige, stukken } = stand
  const r = gegevens?.record ?? null
  let iban: string | null = null
  try {
    iban = r ? leesIban(r) : null
  } catch {
    iban = null
  }
  const [handboek, loonheffing] = await Promise.all([
    contract?.handbookDocumentId ? getBedrijfsdocument(contract.handbookDocumentId) : Promise.resolve(null),
    huidigBedrijfsdocument('loonheffingsformulier'),
  ])
  const h = await headers()
  const basis = process.env.APP_URL ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`

  const naam = contract ? tekennaamVan(contract) : korteNaam(k.firstName, r?.infix ?? k.infix, r?.lastName ?? k.lastName) || k.name
  const nummer = stappen.find((s) => s.sleutel === huidige)?.nummer ?? 5
  const open = (s: StapSleutel) => s === huidige
  const klaar = (s: StapSleutel) => stappen.find((x) => x.sleutel === s)!.klaar
  const verborgen = <input type="hidden" name="kandidaatId" value={k.id} />

  /* Alles wat er nog mist, over alle stappen heen: het lijstje voor vandaag. */
  const mist = [
    ...stand.gegevensMist.map((m) => `Persoonsgegevens: ${m}`),
    ...(!contract ? ['Contract opstellen'] : contract.soort !== 'definitief' ? ['Contract definitief maken'] : stand.contractVerouderd ? ['Contract bijwerken met de nieuwe gegevens'] : []),
    ...stukken.filter((s) => !s.klaar).map((s) => s.titel),
    ...(stand.aangenomen ? [] : ['In dienst nemen']),
  ]

  /* Startwaarden voor het contractformulier: uit het contract, of uit wat we van de kandidaat weten. */
  const v = vacature?.vacature ?? null
  const profielBijVacature = profielen.find((p) => p.title === v?.title)
  const start: ContractStart = contract
    ? startUitInvoer(invoerUit(contract), contract.soort === 'definitief' ? 'definitief' : 'proforma', {
        voornamen: r?.officialFirstNames,
        tussenvoegsel: r?.infix,
        achternaam: r?.lastName,
      })
    : {
        ...LEGE_START,
        contractSoort: 'definitief',
        voornamen: r?.officialFirstNames ?? k.officialFirstNames ?? '',
        tussenvoegsel: r?.infix ?? k.infix ?? '',
        achternaam: r?.lastName ?? k.lastName ?? '',
        roepnaam: k.firstName ?? '',
        functieprofiel: profielBijVacature?.id ?? '',
        functie: v?.title ?? '',
        uren: v?.hoursPerWeekQuarters ? String(v.hoursPerWeekQuarters / 100).replace('.', ',') : '',
        schaal: v?.salaryScaleName ?? '',
        trede: v?.salaryStepMin ? String(v.salaryStepMin) : '',
        relatiebeding: profielBijVacature?.hasRelationClause ?? false,
        adres: r?.addressLine ?? '',
        postcode: r?.postalCode ?? '',
        woonplaats: r?.city ?? '',
        geboortedatum: r?.birthDate ? formatDateInput(r.birthDate) : '',
      }
  const formulier = (
    <ContractFormulier
      start={start}
      voor={contract ? 'vast' : { kandidaatId: k.id }}
      contractId={contract?.id}
      profielen={profielen}
      schalen={huis ? schaalNamen(huis) : []}
      tekenaars={tekenaars}
      vestigingen={bedrijf?.vestigingen ?? []}
    />
  )
  const opmerkingen = (contract?.remarks ?? '').split('\n').filter((o) => o && !/aangezegd/.test(o))
  const standplaats = contract?.locationId ? bedrijf?.vestigingen.find((x) => x.id === contract.locationId) : bedrijf?.hoofdvestiging
  const invoer = contract ? invoerUit(contract) : null
  const mail =
    contract && k.email
      ? mailtoLink(
          contractMail(
            {
              aan: k.email,
              roepnaam: k.firstName ?? naam,
              functie: contract.jobTitle,
              startdatum: contract.startedOn,
              afzender: user.name ?? 'James Robinson',
              merk: bedrijf?.werkgever.tradeName ?? null,
              handboekLink: handboek ? `${basis}${handboekPad(handboek)}` : null,
            },
            mailTeksten,
          ),
        )
      : null

  return (
    <AppShell user={user} actief="werving">
      <a href={`/beheer/werving/kandidaten/${k.id}`} className="hover:text-jr-blue mb-3 block text-xs text-gray-500">
        &larr; {k.name}
      </a>
      <div className="mb-5">
        <p className="text-jr-blue text-sm font-medium">Indiensttreding</p>
        <h1 className="text-[28px] sm:text-[32px]">{naam}</h1>
        <p className="text-sm text-gray-600">
          {stand.aangenomen ? 'In dienst genomen. Alles staat in het dossier van de collega.' : `Stap ${nummer} van 5: ${stappen[nummer - 1]!.titel.toLowerCase()}.`}
        </p>
      </div>

      {/* ------------------------------ Voortgang ------------------------------ */}
      <ol className="mb-5 grid grid-cols-5 gap-1.5" aria-label="Voortgang">
        {stappen.map((s) => (
          <li key={s.sleutel}>
            <a href={`#${s.sleutel}`} className="block" aria-current={s.sleutel === huidige ? 'step' : undefined}>
              <span className={`block h-1.5 rounded-full ${s.klaar ? 'bg-jr-green' : s.sleutel === huidige ? 'bg-jr-blue' : 'bg-gray-200'}`} />
              <span className={`mt-1.5 hidden text-xs sm:block ${s.sleutel === huidige ? 'text-jr-text font-medium' : 'text-gray-500'}`}>
                {s.klaar ? '✓ ' : `${s.nummer}. `}
                {s.titel}
              </span>
            </a>
          </li>
        ))}
      </ol>

      {mist.length > 0 && !stand.aangenomen && (
        <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-base">Nog te doen</h2>
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {mist.map((m) => (
              <li key={m} className="flex gap-2">
                <span className="text-gray-400" aria-hidden="true">
                  ○
                </span>
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        {/* ------------------------------ 1. Persoonsgegevens ------------------------------ */}
        <Stap id="gegevens" nummer={1} titel="Persoonsgegevens" klaar={klaar('gegevens')} open={open('gegevens')} samenvatting={r ? `${r.officialFirstNames ?? ''} ${r.infix ?? ''} ${r.lastName ?? ''}`.replace(/\s+/g, ' ').trim() : 'Nog niets ingevuld'}>
          <p className="mb-3 text-sm text-gray-600">Wat er in het contract komt. Eén plek: wat je hier wijzigt, staat ook bij de kandidaat en straks in het dossier.</p>
          <dl className="mb-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Regel label="Voornamen (paspoort)">{r?.officialFirstNames}</Regel>
            <Regel label="Achternaam">{[r?.infix, r?.lastName].filter(Boolean).join(' ') || null}</Regel>
            <Regel label="Roepnaam">{k.firstName}</Regel>
            <Regel label="Geboortedatum">{r?.birthDate ? formatDateLong(r.birthDate) : null}</Regel>
            <Regel label="Adres">{r?.addressLine ? `${r.addressLine}, ${r.postalCode ?? ''} ${r.city ?? ''}` : null}</Regel>
            <Regel label="IBAN">{iban}</Regel>
            <Regel label="E-mail">{k.email}</Regel>
            <Regel label="Telefoon">{k.phone}</Regel>
          </dl>
          <details className="rounded-lg border border-gray-200 p-4" open={stand.gegevensMist.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">Gegevens wijzigen</summary>
            <div className="mt-4">
              <ActionForm action={gegevensOpslaan} submitLabel="Opslaan" resetOnSuccess={false}>
                {verborgen}
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
                  <Field label="Voornamen (paspoort)" name="officieleVoornamen" defaultValue={r?.officialFirstNames ?? k.officialFirstNames ?? ''} />
                  <Field label="Tussenvoegsel" name="tussenvoegsel" defaultValue={r?.infix ?? k.infix ?? ''} />
                  <Field label="Achternaam" name="achternaam" defaultValue={r?.lastName ?? k.lastName ?? ''} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Geboortedatum" name="geboortedatum" type="date" defaultValue={r?.birthDate ? formatDateInput(r.birthDate) : ''} />
                  <Field label="Geboorteplaats" name="geboorteplaats" defaultValue={r?.birthPlace ?? ''} />
                </div>
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
                  <Field label="Adres" name="adres" defaultValue={r?.addressLine ?? ''} />
                  <Field label="Postcode" name="postcode" defaultValue={r?.postalCode ?? ''} />
                  <Field label="Woonplaats" name="woonplaats" defaultValue={r?.city ?? ''} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="IBAN" name="iban" placeholder={iban ? `Nu: ${iban}` : 'NL00 BANK 0123 4567 89'} hint={iban ? 'Leeg laten om het huidige te houden.' : 'Mag ook bij het tekenen.'} />
                  <Field label="Ten name van" name="tenaamstelling" defaultValue={r?.accountHolder ?? ''} />
                </div>
              </ActionForm>
            </div>
          </details>
        </Stap>

        {/* ------------------------------ 2. Contract ------------------------------ */}
        <Stap
          id="contract"
          nummer={2}
          titel="Contract"
          klaar={klaar('contract')}
          open={open('contract')}
          samenvatting={contract ? `${contract.soort === 'definitief' ? 'Definitief' : 'Pro forma'} · ${contract.jobTitle} · ${formatCents(contract.grossMonthlyCents)} per maand` : 'Nog geen contract'}
        >
          {!contract ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-600">Nog geen contract. Naam, adres en geboortedatum komen uit stap 1.</p>
              <Paneel knop="+ Contract opstellen" titel={`Contract voor ${naam}`} breed>
                {formulier}
              </Paneel>
            </div>
          ) : (
            <>
              {(contract.soort !== 'definitief' || stand.contractVerouderd) && (
                <div className="border-jr-blue/30 bg-jr-blue/5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
                  <span>
                    {contract.soort !== 'definitief'
                      ? 'Dit is nog een pro forma. Maak het definitief om het te laten tekenen.'
                      : 'De persoonsgegevens zijn gewijzigd na het opstellen. Werk het contract bij, dan klopt alles weer.'}
                  </span>
                  <ActionForm action={contractBijwerken} submitLabel={contract.soort !== 'definitief' ? 'Maak definitief' : 'Contract bijwerken'} knopInRij>
                    <input type="hidden" name="contractId" value={contract.id} />
                    {contract.soort !== 'definitief' && <input type="hidden" name="definitief" value="1" />}
                  </ActionForm>
                </div>
              )}
              <dl className="mb-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <Regel label="Functie">{contract.jobTitle}</Regel>
                <Regel label="Periode">
                  {formatDateLong(contract.startedOn)}
                  {contract.endsOn ? ` tot en met ${formatDateLong(contract.endsOn)}` : ', onbepaalde tijd'}
                </Regel>
                <Regel label="Uren en salaris">
                  {String(contract.hoursWeekQuarters / 100).replace('.', ',')} uur · {formatCents(contract.grossMonthlyCents)} bruto per maand
                  {contract.salaryScaleName && contract.salaryStep ? ` (${contract.salaryScaleName}, trede ${contract.salaryStep})` : ''}
                </Regel>
                <Regel label="Proeftijd">{contract.probationMonths > 0 ? `${contract.probationMonths} maand${contract.probationMonths > 1 ? 'en' : ''}` : 'Geen'}</Regel>
                <Regel label="Tekent namens de werkgever">{namenZin(ondertekenaarsVan(contract, bedrijf?.werkgever ?? null))}</Regel>
                <Regel label="Standplaats">{standplaats?.name}</Regel>
                <Regel label="Maatwerk">
                  {[
                    invoer?.bereikbaarOpWerkdagen && 'bereikbaar op werkdagen',
                    invoer?.nevenwerk === 'vrij_behalve_klanten' && 'nevenwerk vrij behalve klanten',
                    invoer?.relatiebeding && 'relatiebeding',
                    invoer?.vrijetijdsbudget && 'vrijetijdsbudget',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Geen'}
                </Regel>
                <Regel label="Tekenen">{`Te ${contract.signPlace || '…'} op ${contract.signDate ? formatDateLong(contract.signDate) : '…'}`}</Regel>
              </dl>
              {opmerkingen.length > 0 && (
                <ul className="text-jr-orange mb-4 space-y-1 text-xs">
                  {opmerkingen.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <a href={`/api/contracten/${contract.id}/pdf`} className={KNOP_RUSTIG}>
                  Contract bekijken
                </a>
                {!contract.signedOn && (
                  <Paneel knop="Wijzigen" stijl="rustig" titel={`Contract van ${naam} wijzigen`} breed uitleg="Het contract wordt opnieuw opgesteld met wat je hier invult, onder hetzelfde nummer.">
                    {formulier}
                  </Paneel>
                )}
                {!contract.signedOn && contract.soort === 'definitief' && !stand.contractVerouderd && (
                  <ActionForm action={contractBijwerken} submitLabel="Opnieuw opstellen met de nieuwste teksten" submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs !min-h-0" meldGelukt knopInRij>
                    <input type="hidden" name="contractId" value={contract.id} />
                  </ActionForm>
                )}
              </div>
            </>
          )}
        </Stap>

        {/* ------------------------------ 3. Printen en tekenen ------------------------------ */}
        <Stap id="printen" nummer={3} titel="Printen en tekenen" klaar={klaar('printen')} open={open('printen')} samenvatting={contract?.signedOn ? `Getekend op ${formatDateLong(contract.signedOn)}` : 'Nog niet getekend'}>
          {!contract || contract.soort !== 'definitief' ? (
            <p className="text-sm text-gray-600">Kan zodra het contract definitief is (stap 2).</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <a href={`/api/contracten/${contract.id}/printpakket`} target="_blank" rel="noopener" className={KNOP}>
                  Alles printen
                </a>
                <span className="text-sm text-gray-600">
                  Een pdf met het contract twee keer, de AVG-verklaring en {loonheffing ? 'het loonheffingsformulier van de Belastingdienst' : 'het gegevensformulier'}.
                </span>
              </div>
              <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a href={`/api/contracten/${contract.id}/pdf`} className="text-jr-link hover:underline">
                  Contract
                </a>
                <a href={`/api/contracten/${contract.id}/avg`} className="text-jr-link hover:underline">
                  AVG-verklaring
                </a>
                {loonheffing ? (
                  <a href={handboekPad(loonheffing)} target="_blank" rel="noopener" className="text-jr-link hover:underline">
                    Loonheffingsformulier (Belastingdienst)
                  </a>
                ) : (
                  <a href={`/api/contracten/${contract.id}/gegevensformulier`} className="text-jr-link hover:underline">
                    Gegevensformulier
                  </a>
                )}
                {handboek ? (
                  <a href={handboekPad(handboek)} target="_blank" rel="noopener" className="text-jr-link hover:underline">
                    Personeelshandboek
                  </a>
                ) : (
                  <span className="text-jr-orange">Geen personeelshandboek bij dit contract</span>
                )}
                {mail && (
                  <a href={mail} className="text-jr-link hover:underline">
                    Vooraf mailen
                  </a>
                )}
              </div>
              <h3 className="mb-2 text-sm font-semibold">Bij het tekenen</h3>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                <li>Beide exemplaren van het contract tekenen, en elke pagina parafen. Een exemplaar is voor {k.firstName ?? 'de werknemer'}.</li>
                <li>De AVG-verklaring laten invullen (toestemming voor foto&apos;s) en tekenen.</li>
                {loonheffing ? (
                  <li>Het formulier &ldquo;Opgaaf gegevens voor de loonheffingen&rdquo; laten invullen (met BSN en de keuze voor de loonheffingskorting) en tekenen. Het IBAN staat daar niet op: dat vul je bij stap 4 in.</li>
                ) : (
                  <li>Het gegevensformulier laten aanvullen: BSN, IBAN en de keuze voor de loonheffingskorting. Laten tekenen.</li>
                )}
                <li>Het identiteitsbewijs bekijken en een kopie maken (paspoort of ID-kaart, geen rijbewijs).</li>
                <li>Het personeelshandboek meegeven of de link sturen.</li>
              </ol>
              <p className="mt-3 text-xs text-gray-500">Daarna scan je alles in en zet je het bij stap 4 in het portaal.</p>
            </>
          )}
        </Stap>

        {/* ------------------------------ 4. Getekende stukken ------------------------------ */}
        <Stap id="stukken" nummer={4} titel="Getekende stukken" klaar={klaar('stukken')} open={open('stukken')} samenvatting={`${stukken.filter((s) => s.klaar).length} van ${stukken.length} binnen`}>
          {!contract || contract.soort !== 'definitief' ? (
            <p className="text-sm text-gray-600">Kan zodra het contract definitief is (stap 2).</p>
          ) : (
            <>
              <ul className="mb-4 divide-y divide-gray-100 text-sm">
                {stukken.map((s) => {
                  const doc = gegevens?.documenten.filter((d) => d.kind === s.sleutel).at(-1)
                  return (
                    <li key={s.sleutel} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                      <span className="flex gap-2.5">
                        <span className={s.klaar ? 'text-jr-green' : 'text-gray-400'} aria-hidden="true">
                          {s.klaar ? '✓' : '○'}
                        </span>
                        <span>
                          <span className={s.klaar ? 'text-gray-600' : 'font-medium'}>{s.titel}</span>
                          {s.toelichting && <span className="block text-xs text-gray-500">{s.toelichting}</span>}
                        </span>
                      </span>
                      {doc && (
                        <a href={`/api/persoonsgegevens/${doc.id}`} target="_blank" rel="noopener" className="text-jr-link text-xs hover:underline">
                          {DOCUMENT_LABELS[doc.kind]} bekijken · {formatDate(doc.createdAt)}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>

              {!klaar('stukken') && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-1 text-sm font-semibold">Vastleggen wat er binnen is</h3>
                  <p className="mb-3 text-xs text-gray-600">Upload wat je hebt; wat ontbreekt, vul je later met hetzelfde formulier aan. Alles wordt versleuteld bewaard.</p>
                  <ActionForm action={getekendeStukken} submitLabel="Vastleggen">
                    <input type="hidden" name="contractId" value={contract.id} />
                    {!contract.signedOn && (
                      <Field
                        label="Getekend op"
                        name="getekendOp"
                        type="date"
                        defaultValue={formatDateInput(contract.signDate && contract.signDate.getTime() <= Date.now() ? contract.signDate : new Date())}
                      />
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {!stukken.find((s) => s.sleutel === 'contract')!.klaar && <Bestand naam="contract" label="Getekend contract" />}
                      {!stukken.find((s) => s.sleutel === 'avg_verklaring')!.klaar && <Bestand naam="avg" label="Getekende AVG-verklaring" />}
                      {!stukken.find((s) => s.sleutel === 'loonheffing')!.klaar && <Bestand naam="loonheffing" label="Getekend loonheffingsformulier" />}
                      {!stukken.find((s) => s.sleutel === 'id_kopie')!.klaar && <Bestand naam="idkopie" label="Kopie identiteitsbewijs" />}
                    </div>
                    {!iban && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="IBAN" name="iban" placeholder="NL00 BANK 0123 4567 89" />
                        <Field label="Ten name van" name="tenaamstelling" defaultValue={r?.accountHolder ?? ''} />
                      </div>
                    )}
                    {!contract.handbookGivenOn && (
                      <Check
                        label="Het personeelshandboek is ontvangen"
                        name="handboek"
                        defaultChecked={!!handboek}
                        hint={handboek ? `${handboek.note || handboek.filename}, de versie die bij dit contract hoort.` : 'Er hoort nog geen handboek bij dit contract.'}
                      />
                    )}
                  </ActionForm>
                </div>
              )}
            </>
          )}
        </Stap>

        {/* ------------------------------ 5. In dienst nemen ------------------------------ */}
        <Stap id="aanname" nummer={5} titel="In dienst nemen" klaar={klaar('aanname')} open={open('aanname') || stand.aangenomen} samenvatting={stand.aangenomen ? 'Collega' : 'Nog kandidaat'}>
          {stand.aangenomen ? (
            <p className="text-sm">
              {k.firstName ?? naam} is collega. Contract, salaris en persoonsgegevens staan in het dossier.{' '}
              <a href={`/beheer/medewerkers/${k.hiredUserId}`} className="text-jr-link font-medium hover:underline">
                Naar het dossier
              </a>
            </p>
          ) : !contract?.signedOn ? (
            <p className="text-sm text-gray-600">Kan zodra het contract getekend is (stap 4).</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-600">
                In één keer: er komt een collega bij met dit werkadres, het contract en het salaris gaan in het dossier, de persoonsgegevens gaan mee en de
                kandidaat staat op aangenomen.
              </p>
              {stukken.some((s) => !s.klaar) && (
                <p className="text-jr-orange mb-3 text-sm">
                  Er mist nog: {stukken.filter((s) => !s.klaar).map((s) => s.titel.toLowerCase()).join(', ')}. Dat kan ook na de aanname, in het dossier.
                </p>
              )}
              <ActionForm action={kandidaatAannemen} submitLabel="In dienst nemen" bevestig>
                {verborgen}
                <input type="hidden" name="contractId" value={contract.id} />
                <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
                  <Field label="Werkadres (e-mail)" name="werkEmail" type="email" required defaultValue={werkadresVoorstel(k.firstName)} hint="Hiermee logt de collega in op het portaal." />
                  <Select label="Afdeling" name="afdeling" defaultValue="Marketing" options={[{ value: '', label: 'Geen' }, ...AFDELINGEN.map((a) => ({ value: a, label: a }))]} />
                  <Select
                    label="Rol"
                    name="rol"
                    defaultValue="staff"
                    options={[
                      { value: 'staff', label: 'Collega' },
                      { value: 'admin', label: 'Beheerder' },
                    ]}
                  />
                </div>
              </ActionForm>
            </>
          )}
        </Stap>
      </div>
    </AppShell>
  )
}

function Stap({
  id,
  nummer,
  titel,
  klaar,
  open,
  samenvatting,
  children,
}: {
  id: string
  nummer: number
  titel: string
  klaar: boolean
  open: boolean
  samenvatting: string
  children: React.ReactNode
}) {
  return (
    <details id={id} open={open} className={`group scroll-mt-4 rounded-xl bg-white shadow-sm ${open ? 'ring-jr-blue/40 ring-2' : ''}`}>
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-bold ${
            klaar ? 'bg-jr-green text-white' : open ? 'bg-jr-blue text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {klaar ? '✓' : nummer}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{titel}</span>
          <span className="block truncate text-xs text-gray-500">{samenvatting}</span>
        </span>
        <span className="text-xs text-gray-400 group-open:hidden">Openen</span>
      </summary>
      <div className="border-t border-gray-100 p-5">{children}</div>
    </details>
  )
}

function Regel({ label, children }: { label: string; children: React.ReactNode }) {
  const leeg = children === null || children === undefined || children === ''
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd>{leeg ? <span className="text-jr-orange">nog niet ingevuld</span> : children}</dd>
    </div>
  )
}

function Bestand({ naam, label }: { naam: string; label: string }) {
  return (
    <div>
      <label className="text-jr-text mb-1.5 block text-[13px] font-medium" htmlFor={`stuk-${naam}`}>
        {label}
      </label>
      <input id={`stuk-${naam}`} type="file" name={naam} accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm" />
    </div>
  )
}
