import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Check, Field, Select, TextArea } from '@/components/ActionForm'
import { KopieerKnop } from '@/components/formulieren/KopieerKnop'
import {
  getKandidaat,
  listNotities,
  listVacatures,
  getVacature,
  KANDIDAAT_STATUS_LABELS,
  BRON_LABELS,
  LOPENDE_STATUSSEN,
  GEGEVENS_STATUSSEN,
  type KandidaatStatus,
} from '@/lib/werving'
import { listDocumentenPerKandidaat } from '@/lib/sollicitatie'
import { listTeam } from '@/lib/team'
import { listContracten, listFunctieprofielen } from '@/lib/contracten'
import { getHuis, schaalNamen } from '@/lib/salarishuis'
import { getGegevens, leesIban, gegevensPad, DOCUMENT_LABELS, LINK_DAGEN } from '@/lib/persoonsgegevens'
import { heeftSleutel } from '@/lib/versleuteling'
import { formatDate, formatDateInput, formatDateLong } from '@/lib/dates'
import { formatCents } from '@/lib/money'
import {
  kandidaatBewerken,
  kandidaatNotitie,
  kandidaatNotitieWissen,
  kandidaatDocument,
  kandidaatDocumentWissen,
  kandidaatStatus,
  kandidaatVervolgstap,
  kandidaatBeantwoord,
  kandidaatBewaartoestemming,
  kandidaatWissen,
  gegevensOpslaan,
  gegevensDocument,
  gegevensDocumentWissen,
  gegevenslink,
  gegevensDoorgegeven,
} from '../../../werving-actions'
import { ContractFormulier, LEGE_START, type ContractStart } from '@/components/ContractFormulier'
import { getIndiensttreding } from '@/lib/indiensttreding'
import { contractMail, gegevensMail, welkomMail, mailtoLink } from '@/lib/mailsjablonen'
import { getTekstOverrides } from '@/lib/sjablonen'
import { listMogelijkeOndertekenaars } from '@/lib/contracten'
import { getBedrijf, adresRegel, getBedrijfsdocument, handboekPad } from '@/lib/bedrijf'

export const maxDuration = 26

/* De fasen van de procedure, in volgorde: wat je bovenaan als voortgang ziet. */
const FASEN: { status: KandidaatStatus; kort: string }[] = [
  { status: 'nieuw', kort: 'Nieuw' },
  { status: 'in_gesprek', kort: 'Kennismaking' },
  { status: 'tweede_gesprek', kort: 'Tweede gesprek' },
  { status: 'aanbod', kort: 'Pro forma' },
  { status: 'contract', kort: 'Contract' },
  { status: 'aangenomen', kort: 'Aangenomen' },
]

const KNOP_RUSTIG = 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
const KNOP_KLEIN = 'text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs'

/**
 * Eén kandidaat, van sollicitatie tot contract. Alles over deze persoon op
 * één plek: zijn gegevens, wat er besproken is, zijn cv, het contract, en
 * vanaf de fase "contract" wat er nodig is voor de salarisadministratie.
 */
export default async function KandidaatPagina({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')
  const beheerder = user.role === 'admin'

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const kaart = await getKandidaat(id)
  if (!kaart) notFound()
  const k = kaart.kandidaat

  const [notities, documentenMap, vacatures, team] = await Promise.all([
    listNotities(id),
    listDocumentenPerKandidaat([id]),
    listVacatures(),
    listTeam(),
  ])
  const documenten = documentenMap.get(id) ?? []
  const lopend = (LOPENDE_STATUSSEN as readonly string[]).includes(k.status)
  const gegevensFase = (GEGEVENS_STATUSSEN as readonly string[]).includes(k.status)

  /* Contract en persoonsgegevens: alleen voor een beheerder, en niet ophalen
     als je het niet mag zien. */
  /* Na de aanname staan de persoonsgegevens bij de collega, niet meer bij de
     kandidaat: anders zouden ze met zijn bewaartermijn worden gewist. */
  const aangenomen = k.status === 'aangenomen' && k.hiredUserId !== null
  const [contracten, gegevens, huis, profielen, vacature, bedrijf, tekenaars] = beheerder
    ? await Promise.all([
        listContracten({ candidateId: id }),
        getGegevens(aangenomen ? { userId: k.hiredUserId! } : { candidateId: id }),
        getHuis(),
        listFunctieprofielen(),
        k.vacancyId ? getVacature(k.vacancyId) : Promise.resolve(null),
        getBedrijf(),
        listMogelijkeOndertekenaars(),
      ])
    : [[], null, null, [], null, null, []]
  const toonStappen = beheerder && (k.status === 'aanbod' || k.status === 'contract' || k.status === 'aangenomen' || contracten.length > 0)
  const indiensttreding = toonStappen ? await getIndiensttreding(k) : null

  let iban: string | null = null
  let ibanFout = false
  if (gegevens) {
    try {
      iban = leesIban(gegevens.record)
    } catch {
      ibanFout = true
    }
  }
  const sleutel = heeftSleutel()
  const h = await headers()
  const basis = process.env.APP_URL ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`
  const linkGeldig = gegevens?.record.linkVerlooptOp && gegevens.record.linkVerlooptOp.getTime() > Date.now() && gegevens.record.linkVersie > 0
  const link = gegevens && linkGeldig ? `${basis}${gegevensPad(gegevens.record.id, gegevens.record.linkVersie)}` : null

  const faseIndex = FASEN.findIndex((f) => f.status === k.status)
  const v = vacature?.vacature ?? null
  const verborgen = <input type="hidden" name="kandidaatId" value={k.id} />

  /* Het contractformulier begint met wat we al weten: de persoonsgegevens,
     de kandidaat en de vacature. De voornamen alleen als ze er voluit staan:
     de roepnaam is geen paspoortnaam. */
  const profielBijVacature = profielen.find((p) => p.title === v?.title)
  const contractStart: ContractStart = {
    ...LEGE_START,
    contractSoort: k.status === 'aanbod' || k.status === 'contract' ? 'definitief' : 'proforma',
    voornamen: gegevens?.record.officialFirstNames ?? k.officialFirstNames ?? '',
    tussenvoegsel: gegevens?.record.infix ?? k.infix ?? '',
    achternaam: gegevens?.record.lastName ?? k.lastName ?? '',
    roepnaam: k.firstName ?? '',
    functieprofiel: profielBijVacature?.id ?? '',
    functie: v?.title ?? '',
    uren: v?.hoursPerWeekQuarters ? String(v.hoursPerWeekQuarters / 100).replace('.', ',') : '',
    schaal: v?.salaryScaleName ?? '',
    trede: v?.salaryStepMin ? String(v.salaryStepMin) : '',
    relatiebeding: profielBijVacature?.hasRelationClause ?? false,
    adres: gegevens?.record.addressLine ?? '',
    postcode: gegevens?.record.postalCode ?? '',
    woonplaats: gegevens?.record.city ?? '',
    geboortedatum: gegevens?.record.birthDate ? formatDateInput(gegevens.record.birthDate) : '',
  }

  /* Wat er klaarligt om in dienst te nemen: een definitief, getekend contract
     dat nog bij niemand in het dossier staat. */
  const definitief = contracten.filter((c) => c.soort === 'definitief' && !c.userId)
  const laatsteDefinitief = definitief[0] ?? null
  const roepnaam = k.firstName ?? k.name.split(' ')[0] ?? ''
  const mailTeksten = beheerder ? await getTekstOverrides() : undefined
  const mailContract = laatsteDefinitief ?? contracten[0] ?? null
  const mailHandboek = mailContract?.handbookDocumentId ? await getBedrijfsdocument(mailContract.handbookDocumentId) : null
  const mailBasis = {
    aan: k.email ?? '',
    roepnaam,
    functie: laatsteDefinitief?.jobTitle ?? contracten[0]?.jobTitle ?? v?.title ?? '[functie]',
    startdatum: laatsteDefinitief?.startedOn ?? contracten[0]?.startedOn ?? null,
    afzender: user.name ?? 'James Robinson',
    gegevenslink: link,
    linkDagen: LINK_DAGEN,
    werkadres: bedrijf?.hoofdvestiging ? adresRegel(bedrijf.hoofdvestiging) : null,
    inlogUrl: `${basis}/login`,
    handboekLink: mailHandboek ? `${basis}${handboekPad(mailHandboek)}` : null,
    merk: bedrijf?.werkgever.tradeName ?? null,
  }
  const KNOP_MAIL = 'inline-flex items-center rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50'

  return (
    <AppShell user={user} actief="werving">
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <a href="/beheer/werving" className="text-jr-link hover:underline">
          &larr; Werving
        </a>
        <a href="/beheer/werving/kandidaten" className="text-jr-link hover:underline">
          Alle kandidaten
        </a>
        {kaart.vacatureId && (
          <a href={`/beheer/werving/${kaart.vacatureId}`} className="text-jr-link hover:underline">
            {kaart.vacatureTitel}
          </a>
        )}
      </div>

      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">{kaart.vacatureTitel ?? 'Open sollicitatie'}</p>
            <h1 className="text-[28px] sm:text-[32px]">{k.name}</h1>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
              <span>{BRON_LABELS[k.source]}</span>
              {kaart.doorverwezenDoor && <span>via {kaart.doorverwezenDoor}</span>}
              <span>gesolliciteerd {formatDate(k.appliedOn)}</span>
              {k.email && (
                <a href={`mailto:${k.email}`} className="hover:text-jr-blue">
                  {k.email}
                </a>
              )}
              {k.phone && (
                <a href={`tel:${k.phone.replace(/\s/g, '')}`} className="hover:text-jr-blue">
                  {k.phone}
                </a>
              )}
              {k.linkedinUrl && (
                <a href={k.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-jr-blue">
                  LinkedIn
                </a>
              )}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              k.status === 'aangenomen'
                ? 'bg-jr-green/15 text-[#1d7a36]'
                : k.status === 'afgewezen' || k.status === 'afgehaakt'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-jr-lightblue text-jr-deepblue'
            }`}
          >
            {KANDIDAAT_STATUS_LABELS[k.status]}
          </span>
        </div>

        {/* Waar hij staat in de procedure. */}
        {faseIndex >= 0 && (
          <ol className="mt-5 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {FASEN.map((f, i) => (
              <li
                key={f.status}
                className={`rounded-lg px-2.5 py-1.5 text-center text-xs ${
                  i < faseIndex ? 'bg-jr-lightblue text-jr-deepblue' : i === faseIndex ? 'bg-jr-blue font-medium text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {f.kort}
              </li>
            ))}
          </ol>
        )}
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          {/* ------------------------------ Volgende stap ------------------------------ */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Status en volgende stap</h2>
            {lopend && (
              <p className="mb-4 text-sm text-gray-600">
                {k.nextActionOn ? (
                  <>
                    Volgende stap: <strong>{k.nextAction}</strong> op {formatDate(k.nextActionOn)}
                    {kaart.looptAchter && <span className="text-jr-orange"> — die datum is voorbij</span>}
                  </>
                ) : (
                  <span className="text-jr-orange">Nog geen volgende stap afgesproken.</span>
                )}
                {kaart.wachtDagen !== null && (
                  <span className={kaart.wachtDagen >= 3 ? 'text-jr-orange' : ''}>
                    {' '}
                    · wacht {kaart.wachtDagen} {kaart.wachtDagen === 1 ? 'dag' : 'dagen'} op een eerste antwoord
                  </span>
                )}
              </p>
            )}
            <div className="grid gap-5 lg:grid-cols-2">
              <ActionForm action={kandidaatStatus} submitLabel="Status opslaan" submitClassName={KNOP_RUSTIG} resetOnSuccess={false}>
                {verborgen}
                <input type="hidden" name="vacatureId" value={k.vacancyId ?? ''} />
                <Select
                  label="Status"
                  name="status"
                  defaultValue={k.status}
                  options={Object.entries(KANDIDAAT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
                />
                <Field label="Reden" name="reden" defaultValue={k.closedReason ?? ''} hint="Verplicht bij afwijzen. Komt ook op de tijdlijn." />
              </ActionForm>
              {lopend && (
                <ActionForm action={kandidaatVervolgstap} submitLabel="Vastleggen" submitClassName={KNOP_RUSTIG} resetOnSuccess={false}>
                  {verborgen}
                  <input type="hidden" name="vacatureId" value={k.vacancyId ?? ''} />
                  <Field label="Volgende stap" name="actie" defaultValue={k.nextAction ?? ''} placeholder="Kennismaking met Jim en Stan" />
                  <Field label="Wanneer" name="actiedatum" type="date" defaultValue={k.nextActionOn ? formatDateInput(k.nextActionOn) : ''} />
                </ActionForm>
              )}
            </div>
            {k.respondedOn === null && lopend && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <ActionForm action={kandidaatBeantwoord} submitLabel="We hebben gereageerd" resetOnSuccess={false} className="">
                  {verborgen}
                  <input type="hidden" name="vacatureId" value={k.vacancyId ?? ''} />
                </ActionForm>
              </div>
            )}
          </section>

          {/* ------------------------------ Contract ------------------------------ */}
          {beheerder && indiensttreding && (
            <section className="border-jr-blue/30 bg-jr-blue/5 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-6">
              <div>
                <h2 className="text-base">Indiensttreding</h2>
                <p className="text-sm text-gray-700">
                  {indiensttreding.aangenomen
                    ? 'Afgerond: in dienst genomen.'
                    : `Stap ${indiensttreding.stappen.find((s) => s.sleutel === indiensttreding.huidige)?.nummer ?? 5} van 5: ${indiensttreding.stappen.find((s) => s.sleutel === indiensttreding.huidige)?.titel.toLowerCase() ?? 'in dienst nemen'}.`}{' '}
                  Gegevens, contract, printen, getekende stukken en in dienst nemen, stap voor stap.
                </p>
                <div className="mt-2 flex gap-1" aria-hidden="true">
                  {indiensttreding.stappen.map((s) => (
                    <span key={s.sleutel} className={`h-1.5 w-10 rounded-full ${s.klaar ? 'bg-jr-green' : s.sleutel === indiensttreding.huidige ? 'bg-jr-blue' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
              <a href={`/beheer/werving/kandidaten/${k.id}/indiensttreding`} className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-5 py-2.5 text-sm font-medium text-white">
                {indiensttreding.aangenomen ? 'Bekijken' : 'Verder met de indiensttreding'}
              </a>
            </section>
          )}

          {beheerder && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-base">Contract</h2>
                <Paneel knop="+ Contract opstellen" titel={`Contract voor ${k.name}`} breed uitleg="Pro forma om te bespreken, of definitief ter ondertekening. Het salaris komt uit het salarishuis.">
                  <ContractFormulier
                    start={contractStart}
                    voor={{ kandidaatId: k.id }}
                    profielen={profielen}
                    schalen={huis ? schaalNamen(huis) : []}
                    tekenaars={tekenaars}
                    vestigingen={bedrijf?.vestigingen ?? []}
                  />
                </Paneel>
              </div>
              {contracten.length > 0 && k.email && !aangenomen && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3">
                  <a href={mailtoLink(contractMail({ ...mailBasis, functie: contracten[0]!.jobTitle, startdatum: contracten[0]!.startedOn }, mailTeksten))} className={KNOP_MAIL}>
                    Mail het contract
                  </a>
                  <span className="text-xs text-gray-600">Opent je mailprogramma met de tekst erin{link ? ' en de invullink voor de gegevens' : ''}. Download de pdf en voeg hem als bijlage toe.</span>
                </div>
              )}
              {contracten.length === 0 ? (
                <p className="text-sm text-gray-600">Nog geen contract. Stel een pro forma op om te bespreken, of meteen een definitief contract.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {contracten.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                      <span>
                        <a href={`/beheer/contracten/${c.id}`} className="hover:text-jr-blue font-medium">
                          {c.soort === 'proforma' ? 'Pro forma' : 'Definitief'}
                        </a>{' '}
                        <span className="text-gray-600">
                          · {c.jobTitle} · {formatDate(c.startedOn)}
                          {c.endsOn ? ` t/m ${formatDate(c.endsOn)}` : ''} · {formatCents(c.grossMonthlyCents)} per maand · opgesteld {formatDate(c.createdAt)}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        {c.soort === 'definitief' && c.signedOn && (
                          <span className="bg-jr-green/15 rounded-full px-2.5 py-0.5 text-xs text-[#1d7a36]">Getekend {formatDate(c.signedOn)}</span>
                        )}

                        <a href={`/api/contracten/${c.id}/pdf`} className="text-jr-link text-xs font-medium hover:underline">
                          Contract
                        </a>
                        <a href={`/api/contracten/${c.id}/avg`} className="text-jr-link text-xs font-medium hover:underline">
                          AVG-verklaring
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ------------------------------ In dienst nemen ------------------------------ */}
          {beheerder && aangenomen && (
            <section className="border-jr-green/30 bg-jr-green/5 rounded-xl border p-6">
              <h2 className="mb-1 text-base">In dienst</h2>
              <p className="text-sm text-gray-700">
                {k.firstName ?? k.name} is aangenomen. Contract, salaris en persoonsgegevens staan in het dossier.{' '}
                <a href={`/beheer/medewerkers/${k.hiredUserId}`} className="text-jr-link font-medium hover:underline">
                  Naar het profiel van de collega
                </a>
              </p>
              {k.email && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a href={mailtoLink(welkomMail({ ...mailBasis }, mailTeksten))} className={KNOP_MAIL}>
                    Welkomstmail
                  </a>
                  <span className="text-xs text-gray-600">Met de startdatum, het adres en hoe hij inlogt. Vul de tijd en het programma zelf in.</span>
                </div>
              )}
            </section>
          )}

          {/* ------------------------------ Persoonsgegevens ------------------------------ */}
          {beheerder && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base">Persoonsgegevens voor contract en salarisadministratie</h2>
              {aangenomen ? (
                <p className="text-sm text-gray-600">
                  Staan nu in het dossier van de collega, los van de bewaartermijn van de kandidaat.{' '}
                  <a href={`/beheer/medewerkers/${k.hiredUserId}`} className="text-jr-link hover:underline">
                    Bekijk ze daar
                  </a>
                  .
                </p>
              ) : !gegevensFase && !gegevens ? (
                <p className="text-sm text-gray-600">
                  Komt in beeld in de fase “contract ter ondertekening”: pas als iemand bij ons komt werken, vragen we zijn paspoort, IBAN en loonheffingsformulier.
                  Zet de status op “Contract ter ondertekening” of stel een definitief contract op.
                </p>
              ) : (
                <div className="space-y-5">
                  {!sleutel && (
                    <p className="border-jr-orange bg-jr-orange/10 rounded border-l-4 p-3 text-sm">
                      De sleutel voor persoonsgegevens (GEGEVENS_SLEUTEL) staat nog niet in Netlify. Zonder die sleutel kan het portaal geen IBAN of documenten opslaan.
                    </p>
                  )}
                  {ibanFout && <p className="text-sm text-[#C02A22]">Het IBAN is niet te lezen met de huidige sleutel.</p>}

                  <div
                    className={`rounded-lg p-3 text-sm ${
                      gegevens && gegevens.ontbreekt.length === 0 ? 'bg-jr-green/10 text-[#1d7a36]' : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {!gegevens || gegevens.ontbreekt.length > 0 ? (
                      <>Nog nodig: {(gegevens?.ontbreekt ?? ['voornamen zoals in het paspoort', 'geboortedatum', 'adres', 'IBAN', 'kopie ID', 'loonheffingsformulier']).join(', ')}.</>
                    ) : gegevens.record.doorgegevenOp ? (
                      <>Compleet, en doorgegeven aan de salarisadministratie op {formatDateLong(gegevens.record.doorgegevenOp)}.</>
                    ) : (
                      <>Compleet. Klaar om door te geven aan de salarisadministratie.</>
                    )}
                    {gegevens?.record.aangeleverdOp && <span className="block text-xs text-gray-500">Door de kandidaat aangeleverd op {formatDateLong(gegevens.record.aangeleverdOp)}.</span>}
                  </div>

                  {/* De link voor de kandidaat */}
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-1 text-sm font-semibold">Laat de kandidaat het zelf invullen</h3>
                    <p className="mb-3 text-xs text-gray-600">
                      Een persoonlijke link, {LINK_DAGEN} dagen geldig, zonder inloggen. Hij vult zijn gegevens in en uploadt zijn ID en loonheffingsformulier. Alles komt versleuteld hier binnen.
                    </p>
                    {link ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input readOnly value={link} aria-label="Link voor de kandidaat" className="min-h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm" />
                          <KopieerKnop tekst={link} />
                        </div>
                        <p className="text-xs text-gray-500">Geldig tot {formatDateLong(gegevens!.record.linkVerlooptOp!)}.</p>
                        {k.email && (
                          <a href={mailtoLink(gegevensMail(mailBasis, mailTeksten))} className={KNOP_MAIL}>
                            Mail de link
                          </a>
                        )}
                        <ActionForm action={gegevenslink} submitLabel="Nieuwe link (de oude vervalt)" submitClassName={KNOP_KLEIN} resetOnSuccess={false} meldGelukt={false} bevestig className="">
                          {verborgen}
                          <input type="hidden" name="opnieuw" value="1" />
                        </ActionForm>
                      </div>
                    ) : (
                      <ActionForm action={gegevenslink} submitLabel="Maak de link" resetOnSuccess={false} meldGelukt={false} className="">
                        {verborgen}
                      </ActionForm>
                    )}
                  </div>

                  {/* Zelf invullen of corrigeren */}
                  <details className="rounded-lg border border-gray-200 p-4" open={!!gegevens && !gegevens.record.aangeleverdOp}>
                    <summary className="cursor-pointer text-sm font-semibold">Gegevens {gegevens?.record.aangeleverdOp ? 'bekijken of corrigeren' : 'zelf invullen'}</summary>
                    <div className="mt-4">
                      <ActionForm action={gegevensOpslaan} submitLabel="Gegevens opslaan" resetOnSuccess={false}>
                        {verborgen}
                        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
                          <Field label="Voornamen (paspoort)" name="officieleVoornamen" defaultValue={gegevens?.record.officialFirstNames ?? k.officialFirstNames ?? ''} />
                          <Field label="Tussenvoegsel" name="tussenvoegsel" defaultValue={gegevens?.record.infix ?? k.infix ?? ''} />
                          <Field label="Achternaam" name="achternaam" defaultValue={gegevens?.record.lastName ?? k.lastName ?? ''} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Geboortedatum" name="geboortedatum" type="date" defaultValue={gegevens?.record.birthDate ? formatDateInput(gegevens.record.birthDate) : ''} />
                          <Field label="Geboorteplaats" name="geboorteplaats" defaultValue={gegevens?.record.birthPlace ?? ''} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
                          <Field label="Adres" name="adres" defaultValue={gegevens?.record.addressLine ?? ''} />
                          <Field label="Postcode" name="postcode" defaultValue={gegevens?.record.postalCode ?? ''} />
                          <Field label="Woonplaats" name="woonplaats" defaultValue={gegevens?.record.city ?? ''} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field
                            label="IBAN"
                            name="iban"
                            placeholder={iban ? `Nu: ${iban}` : 'NL00 BANK 0123 4567 89'}
                            hint={iban ? 'Leeg laten om het huidige te houden.' : 'Wordt versleuteld opgeslagen.'}
                          />
                          <Field label="Ten name van" name="tenaamstelling" defaultValue={gegevens?.record.accountHolder ?? ''} />
                        </div>
                      </ActionForm>
                    </div>
                  </details>

                  {iban && (
                    <p className="text-sm">
                      IBAN: <span className="tabular font-medium">{iban}</span>
                      {gegevens?.record.accountHolder && <span className="text-gray-600"> · t.n.v. {gegevens.record.accountHolder}</span>}
                    </p>
                  )}

                  {/* Documenten */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Documenten</h3>
                    {gegevens && gegevens.documenten.length > 0 ? (
                      <ul className="mb-3 divide-y divide-gray-100 text-sm">
                        {gegevens.documenten.map((d) => (
                          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <span>
                              <a href={`/api/persoonsgegevens/${d.id}`} target="_blank" rel="noopener" className="text-jr-link font-medium hover:underline">
                                {DOCUMENT_LABELS[d.kind]}
                              </a>
                              <span className="text-xs text-gray-500">
                                {' '}
                                · {d.filename ?? 'bestand'} · {Math.round(d.bytes / 1024)} kB · {d.doorKandidaat ? 'door de kandidaat' : 'door ons'} op {formatDate(d.createdAt)}
                              </span>
                            </span>
                            <ActionForm action={gegevensDocumentWissen} submitLabel="Weg" submitClassName={KNOP_KLEIN} resetOnSuccess={false} meldGelukt={false} className="">
                              {verborgen}
                              <input type="hidden" name="documentId" value={d.id} />
                            </ActionForm>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-3 text-sm text-gray-600">Nog geen documenten.</p>
                    )}
                    <ActionForm action={gegevensDocument} submitLabel="Uploaden" submitClassName={KNOP_RUSTIG} className="grid items-end gap-3 sm:grid-cols-[1fr_1.6fr_auto]" knopInRij>
                      {verborgen}
                      <Select
                        label="Soort"
                        name="soort"
                        defaultValue="id_kopie"
                        options={Object.entries(DOCUMENT_LABELS).map(([value, label]) => ({ value, label }))}
                      />
                      <div>
                        <label className="text-jr-text mb-1.5 block text-[13px] font-medium" htmlFor="gegevens-bestand">
                          Bestand (pdf, jpg of png, max. 4 MB)
                        </label>
                        <input id="gegevens-bestand" type="file" name="bestand" accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm" />
                      </div>
                    </ActionForm>
                    <p className="mt-2 text-xs text-gray-500">Wie een document opent, wordt vastgelegd.</p>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    {gegevens?.record.doorgegevenOp ? (
                      <ActionForm action={gegevensDoorgegeven} submitLabel="Toch nog niet doorgegeven" submitClassName={KNOP_KLEIN} resetOnSuccess={false} meldGelukt={false} className="">
                        {verborgen}
                        <input type="hidden" name="terug" value="1" />
                      </ActionForm>
                    ) : (
                      <ActionForm action={gegevensDoorgegeven} submitLabel="Doorgegeven aan de salarisadministratie" resetOnSuccess={false} className="space-y-2">
                        {verborgen}
                        <p className="text-xs text-gray-600">Klik als je de gegevens hebt doorgestuurd naar Euregio Habets Royen. Kan pas als alles compleet is.</p>
                      </ActionForm>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ------------------------------ Tijdlijn ------------------------------ */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base">Notities en tijdlijn</h2>
            <ActionForm action={kandidaatNotitie} submitLabel="Toevoegen">
              {verborgen}
              <TextArea label="Notitie" name="tekst" rows={3} placeholder="Wat er besproken is, indruk, afspraken." />
              <Select
                label="Soort"
                name="soort"
                defaultValue="notitie"
                options={[
                  { value: 'notitie', label: 'Notitie' },
                  { value: 'gesprek', label: 'Verslag van een gesprek' },
                ]}
              />
            </ActionForm>
            {notities.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">Nog niets vastgelegd.</p>
            ) : (
              <ol className="mt-5 space-y-3 border-l-2 border-gray-100 pl-4">
                {notities.map((n) => (
                  <li key={n.id} className="relative">
                    <span
                      className={`absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full ${n.kind === 'status' ? 'bg-gray-300' : n.kind === 'gesprek' ? 'bg-jr-green' : 'bg-jr-blue'}`}
                      aria-hidden="true"
                    />
                    <p className="text-xs text-gray-500">
                      {formatDateLong(n.createdAt)} {n.createdAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}
                      {n.door && <> · {n.door}</>}
                      {n.kind === 'gesprek' && <> · gesprek</>}
                    </p>
                    <p className={`text-sm whitespace-pre-wrap ${n.kind === 'status' ? 'text-gray-600' : ''}`}>{n.body}</p>
                    {n.kind !== 'status' && (
                      <ActionForm action={kandidaatNotitieWissen} submitLabel="Weg" submitClassName={KNOP_KLEIN} resetOnSuccess={false} meldGelukt={false} className="">
                        {verborgen}
                        <input type="hidden" name="notitieId" value={n.id} />
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* ------------------------------ Gegevens ------------------------------ */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base">Gegevens</h2>
            <ActionForm action={kandidaatBewerken} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_1.4fr]">
                <Field label="Roepnaam" name="voornaam" defaultValue={k.firstName ?? ''} />
                <Field label="Tussenv." name="tussenvoegsel" defaultValue={k.infix ?? ''} />
                <Field label="Achternaam" name="achternaam" defaultValue={k.lastName ?? ''} />
              </div>
              <Field label="Alle voornamen (paspoort)" name="officieleVoornamen" defaultValue={k.officialFirstNames ?? ''} placeholder="Johannes Hubertus Maria" hint="Voor het contract. De roepnaam gebruiken we in het gesprek en de mail." />
              <Field label="E-mail" name="email" type="email" defaultValue={k.email ?? ''} />
              <Field label="Telefoon" name="telefoon" defaultValue={k.phone ?? ''} />
              <Field label="LinkedIn" name="linkedin" defaultValue={k.linkedinUrl ?? ''} />
              <Select
                label="Vacature"
                name="vacatureId"
                defaultValue={k.vacancyId ?? ''}
                options={[{ value: '', label: 'Open sollicitatie' }, ...vacatures.map((vac) => ({ value: vac.vacature.id, label: vac.vacature.title }))]}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Bron" name="bron" defaultValue={k.source} options={Object.entries(BRON_LABELS).map(([value, label]) => ({ value, label }))} />
                <Select
                  label="Doorverwezen door"
                  name="doorverwezenDoor"
                  defaultValue={k.referredByUserId ?? ''}
                  options={[{ value: '', label: 'Niemand' }, ...team.map((t) => ({ value: t.id, label: t.name ?? t.email }))]}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="School" name="school" defaultValue={k.school ?? ''} />
                <Field label="Opleiding" name="opleiding" defaultValue={k.study ?? ''} />
              </div>
              <Field label="Gesolliciteerd op" name="sollicitatiedatum" type="date" defaultValue={formatDateInput(k.appliedOn)} />
            </ActionForm>
          </section>

          {/* ------------------------------ Cv en motivatie ------------------------------ */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base">Cv en motivatie</h2>
            {documenten.length > 0 ? (
              <ul className="mb-4 divide-y divide-gray-100 text-sm">
                {documenten.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                    <a href={`/api/kandidaten/${k.id}/bestand/${d.id}`} className="text-jr-link hover:underline">
                      {d.kind === 'cv' ? 'Cv' : d.kind === 'motivatie' ? 'Motivatie' : 'Bestand'} · {d.filename ?? 'bestand'} ({Math.round(d.bytes / 1024)} kB)
                    </a>
                    <ActionForm action={kandidaatDocumentWissen} submitLabel="Weg" submitClassName={KNOP_KLEIN} resetOnSuccess={false} meldGelukt={false} className="">
                      {verborgen}
                      <input type="hidden" name="documentId" value={d.id} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-gray-600">
                {k.cvSourceUrl ? 'Het cv kon niet worden opgehaald van de website. Upload het hier.' : 'Nog geen cv of motivatie.'}
              </p>
            )}
            <ActionForm action={kandidaatDocument} submitLabel="Uploaden" submitClassName={KNOP_RUSTIG}>
              {verborgen}
              <Select
                label="Soort"
                name="soort"
                defaultValue="cv"
                options={[
                  { value: 'cv', label: 'Cv' },
                  { value: 'motivatie', label: 'Motivatie' },
                  { value: 'overig', label: 'Iets anders' },
                ]}
              />
              <div>
                <label className="text-jr-text mb-1.5 block text-[13px] font-medium" htmlFor="kandidaat-bestand">
                  Bestand (pdf of Word, max. 4 MB)
                </label>
                <input
                  id="kandidaat-bestand"
                  type="file"
                  name="bestand"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="block w-full text-sm"
                />
              </div>
            </ActionForm>
          </section>

          {/* ------------------------------ Bewaren ------------------------------ */}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-base">Bewaren en wissen</h2>
            <p className="mb-3 text-sm text-gray-600">
              {kaart.bewaarTot
                ? `Wordt gewist op ${formatDateLong(kaart.bewaarTot)}${k.retentionConsentOn ? ', met toestemming van de kandidaat' : ''}.`
                : 'Zolang de procedure loopt, wordt er niets gewist. Daarna vier weken, of een jaar met toestemming.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {kaart.bewaarTot && (
                <ActionForm
                  action={kandidaatBewaartoestemming}
                  submitLabel={k.retentionConsentOn ? 'Toestemming intrekken' : 'Langer bewaren (toestemming)'}
                  submitClassName={KNOP_RUSTIG}
                  resetOnSuccess={false}
                  className=""
                >
                  {verborgen}
                  <input type="hidden" name="vacatureId" value={k.vacancyId ?? ''} />
                  <input type="hidden" name="gegeven" value={k.retentionConsentOn ? 'nee' : 'ja'} />
                </ActionForm>
              )}
              <ActionForm action={kandidaatWissen} submitLabel="Nu wissen" submitClassName={KNOP_RUSTIG} resetOnSuccess={false} meldGelukt={false} bevestig className="">
                {verborgen}
                <input type="hidden" name="terug" value="1" />
                <input type="hidden" name="vacatureId" value={k.vacancyId ?? ''} />
              </ActionForm>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
