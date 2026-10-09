import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select, TextArea, Check } from '@/components/ActionForm'
import { Paneel, PaneelKop } from '@/components/Paneel'
import { PaginaKop, LeegVlak } from '@/components/PaginaKop'
import { listTeam } from '@/lib/team'
import {
  listVacatures,
  getAchterstand,
  getCijfers,
  getAfvalredenen,
  VACATURE_SOORT_LABELS,
  VACATURE_STATUS_LABELS,
  KANDIDAAT_STATUS_LABELS,
  BRON_LABELS,
  STILTE_DAGEN,
  type KandidaatKaart,
} from '@/lib/werving'
import { getHuis, schaalNamen } from '@/lib/salarishuis'
import { nieuweVacature, nieuweKandidaat, kandidaatBeantwoord } from '../werving-actions'
import { formatDate } from '@/lib/dates'

/**
 * Netlify kapt een functie na tien seconden af. Deze pagina doet zes
 * queries; controleer dat met npm run tel:queries voordat je hier iets bij
 * zet.
 */
export const maxDuration = 26

/**
 * Werving.
 *
 * Bovenaan staat niet de trechter maar de stilte: wie wacht er al dagen op
 * een antwoord van ons. Dat is geen weergavekeuze. De meest gehoorde klacht
 * van sollicitanten is niet dat ze zijn afgewezen maar dat ze niets hoorden,
 * en voor een bureau dat zijn eigen marketing als visitekaartje ziet is dat
 * het duurste wat er is.
 *
 * Daaronder staat wat er gewist gaat worden. Die lijst hoort in beeld en
 * niet in een instelling: als je iemand wilt houden moet je dat weten
 * voordat de termijn om is, niet erna.
 */
export default async function WervingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const cijfers = await getCijfers()
  const vacatures = await listVacatures()
  const achterstand = await getAchterstand()
  const redenen = await getAfvalredenen()
  const team = await listTeam()
  const huis = await getHuis()

  const openVacatures = vacatures.filter(
    (v) => v.vacature.status === 'open' || v.vacature.status === 'gepauzeerd',
  )

  const kandidaatFormulier = (
    <ActionForm action={nieuweKandidaat} submitLabel="Kandidaat toevoegen" className="grid gap-4 sm:grid-cols-2">
      <PaneelKop>Wie</PaneelKop>
      <div className="grid items-end gap-3 sm:col-span-2 sm:grid-cols-[1fr_130px_1fr]">
        <Field label="Voornaam" name="voornaam" required placeholder="Maarten" />
        <Field label="Tussenvoegsel" name="tussenvoegsel" placeholder="van der" />
        <Field label="Achternaam" name="achternaam" placeholder="Brouwer" />
      </div>
      <Field label="E-mail" name="email" type="email" placeholder="naam@voorbeeld.nl" />
      <Field label="Telefoon" name="telefoon" placeholder="06 12 34 56 78" />
      <div className="sm:col-span-2">
        <Field label="LinkedIn" name="linkedin" placeholder="https://linkedin.com/in/..." />
      </div>

      <PaneelKop>Sollicitatie</PaneelKop>
      <Select
        label="Voor welke vacature"
        name="vacatureId"
        defaultValue=""
        options={[{ value: '', label: 'Open sollicitatie' }, ...openVacatures.map((v) => ({ value: v.vacature.id, label: v.vacature.title }))]}
      />
      <Select
        label="Waar komt hij vandaan"
        name="bron"
        defaultValue="zelf_benaderd"
        options={Object.entries(BRON_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <Select
        label="Aangebracht door"
        name="doorverwezenDoor"
        defaultValue=""
        options={[{ value: '', label: 'Niemand in het bijzonder' }, ...team.map((t) => ({ value: t.id, label: t.name ?? t.email }))]}
        hint="Bij een stage: de begeleider, of wie hem aanbracht."
      />
      <Field label="Sollicitatiedatum" name="sollicitatiedatum" type="date" hint="Leeg is vandaag. Hiermee meten we hoe lang iemand wacht." />

      <PaneelKop uitleg="Alleen bij stages en starters.">Opleiding</PaneelKop>
      <Field label="School" name="school" placeholder="Zuyd Hogeschool" />
      <Field label="Opleiding" name="opleiding" placeholder="Commerciële Economie" />

      <PaneelKop uitleg="Zonder vervolgstap zakt een kandidaat stilletjes weg.">Volgende stap</PaneelKop>
      <Field label="Wat ga je doen" name="actie" placeholder="Bellen voor een afspraak" />
      <Field label="Wanneer" name="actiedatum" type="date" />
      <div className="sm:col-span-2">
        <TextArea label="Notities" name="notities" rows={3} hint="Wordt vier weken na afloop van de procedure automatisch gewist." />
      </div>
    </ActionForm>
  )

  const vacatureFormulier = (
    <ActionForm action={nieuweVacature} submitLabel="Vacature aanmaken" className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Titel" name="titel" required placeholder="Marketing Manager" />
      </div>
      <Select
        label="Soort"
        name="soort"
        defaultValue="dienstverband"
        options={[
          { value: 'dienstverband', label: 'Dienstverband' },
          { value: 'stage', label: 'Stage' },
          { value: 'freelance', label: 'Freelance' },
        ]}
      />
      <Field label="Aantal plekken" name="plekken" defaultValue="1" hint="Twee managers zoeken is één vacature met twee plekken." />
      <div className="sm:col-span-2">
        <Select
          label="Van wie is deze vacature"
          name="eigenaar"
          defaultValue=""
          options={[{ value: '', label: 'Nog niet toegewezen' }, ...team.map((t) => ({ value: t.id, label: t.name ?? t.email }))]}
          hint="Zonder eigenaar blijft een vacature liggen."
        />
      </div>

      <PaneelKop>Wat we bieden</PaneelKop>
      {huis ? (
        <Select
          label="Schaal"
          name="schaal"
          defaultValue=""
          options={[{ value: '', label: 'Nog niet bepaald' }, ...schaalNamen(huis).map((n) => ({ value: n, label: n }))]}
        />
      ) : (
        <Field label="Schaal" name="schaal" placeholder="Medior" />
      )}
      <Field label="Uren per week" name="uren" placeholder="32" />
      <Field label="Trede van" name="tredeMin" placeholder="8" />
      <Field label="Trede tot" name="tredeMax" placeholder="14" />

      <PaneelKop>Waarom en wat</PaneelKop>
      <div className="sm:col-span-2">
        <TextArea label="Waarom deze vacature" name="reden" rows={2} hint="Een capaciteitsgat of groei. Over een half jaar weet je anders niet meer waarom je zocht." />
      </div>
      <div className="sm:col-span-2">
        <TextArea label="Omschrijving" name="omschrijving" rows={5} />
      </div>
      <div className="sm:col-span-2">
        <Check label="Meteen openzetten" name="meteenOpen" hint="Anders blijft hij een concept tot je hem openzet." />
      </div>
    </ActionForm>
  )

  const vacaturePaneel = (stijl: 'primair' | 'rustig') => (
    <Paneel knop="Vacature aanmaken" titel="Vacature aanmaken" uitleg="Stages en freelance horen hier ook bij." stijl={stijl}>
      {vacatureFormulier}
    </Paneel>
  )

  return (
    <AppShell user={user} actief="werving" breed>
      <PaginaKop
        titel="Werving"
        uitleg="Vacatures, stages en kandidaten. Bovenaan wie er op ons wacht."
        acties={
          <>
            <a href="/beheer/werving/kandidaten" className="text-jr-text rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-gray-50">
              Alle kandidaten
            </a>
            {vacaturePaneel('rustig')}
            <Paneel knop="+ Kandidaat toevoegen" titel="Kandidaat toevoegen" uitleg="Voor iemand die je zelf benadert of op het oog hebt. Sollicitaties via de website komen vanzelf binnen.">
              {kandidaatFormulier}
            </Paneel>
          </>
        }
        cijfers={[
          { label: 'Open vacatures', waarde: cijfers.openVacatures },
          { label: 'Plekken', waarde: cijfers.openPlekken, hint: 'Twee managers is één vacature' },
          { label: 'In procedure', waarde: cijfers.lopendeKandidaten },
          { label: 'Wacht op antwoord', waarde: cijfers.wachtenOpAntwoord, toon: cijfers.wachtenOpAntwoord > 0 ? 'let-op' : 'normaal' },
          {
            label: 'Reactietijd',
            waarde: cijfers.gemiddeldeReactiedagen === null ? '–' : `${String(cijfers.gemiddeldeReactiedagen).replace('.', ',')} dagen`,
            toon: cijfers.gemiddeldeReactiedagen === null ? 'stil' : 'normaal',
          },
        ]}
      />

      <div className="space-y-6">
        {/* De stilte. Bovenaan, niet in een filter. */}
        {achterstand.wachtenOpAntwoord.length > 0 && (
          <section className="rounded-xl border border-[#FCE3BE] bg-[#FEF7EE] p-6">
            <h2 className="mb-1 text-[17px] text-[#94590A]">
              {achterstand.wachtenOpAntwoord.length}{' '}
              {achterstand.wachtenOpAntwoord.length === 1 ? 'kandidaat wacht' : 'kandidaten wachten'} op antwoord
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Langer dan {STILTE_DAGEN} dagen niets van ons gehoord. Dit is waar mensen over praten, niet de afwijzing zelf.
            </p>
            <ul className="grid gap-2 lg:grid-cols-2">
              {achterstand.wachtenOpAntwoord.map((k) => (
                <li key={k.kandidaat.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-sm shadow-sm">
                  <span className="min-w-0">
                    <a href={`/beheer/werving/kandidaten/${k.kandidaat.id}`} className="hover:text-jr-link font-medium">
                      {k.kandidaat.name}
                    </a>
                    <span className="block text-xs text-gray-600">
                      {k.vacatureTitel ?? 'Open sollicitatie'} · <span className="tabular text-[#94590A]">{k.wachtDagen} dagen</span>
                    </span>
                  </span>
                  <ActionForm
                    action={kandidaatBeantwoord}
                    submitLabel="Gereageerd"
                    submitClassName="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    meldGelukt={false}
                    className="contents"
                  >
                    <input type="hidden" name="kandidaatId" value={k.kandidaat.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(achterstand.zonderVervolg.length > 0 || achterstand.bijnaTeWissen.length > 0) && (
          <div className="grid items-start gap-6 xl:grid-cols-2">
            {achterstand.zonderVervolg.length > 0 && (
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-[17px]">{achterstand.zonderVervolg.length} zonder afgesproken vervolgstap</h2>
                <p className="mb-3 text-sm text-gray-600">Geen volgende stap, of de datum is voorbij. Zo zakt een kandidaat stilletjes weg.</p>
                <ul className="divide-y divide-gray-200">
                  {achterstand.zonderVervolg.map((k) => (
                    <Regel key={k.kandidaat.id} kaart={k} />
                  ))}
                </ul>
              </section>
            )}
            {achterstand.bijnaTeWissen.length > 0 && (
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-[17px]">Bewaartermijn loopt af</h2>
                <p className="mb-3 text-sm text-gray-600">
                  Deze gegevens worden binnenkort automatisch gewist. Wil je iemand houden, vraag dan toestemming en leg die vast op zijn kaart.
                </p>
                <ul className="divide-y divide-gray-200">
                  {achterstand.bijnaTeWissen.map((k) => (
                    <li key={k.kandidaat.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <span>
                        <a href={`/beheer/werving/kandidaten/${k.kandidaat.id}`} className="hover:text-jr-link">
                          {k.kandidaat.name}
                        </a>
                        <span className="ml-2 text-xs text-gray-500">
                          {KANDIDAAT_STATUS_LABELS[k.kandidaat.status]}
                          {k.kandidaat.closedReason && ` · ${k.kandidaat.closedReason}`}
                        </span>
                      </span>
                      <span className={`tabular text-xs ${(k.bewaarDagenResterend ?? 0) <= 0 ? 'text-[#94590A]' : 'text-gray-500'}`}>
                        {(k.bewaarDagenResterend ?? 0) <= 0 ? 'wordt vannacht gewist' : `nog ${k.bewaarDagenResterend} dagen`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* De vacatures. */}
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[19px]">Vacatures</h2>
            {vacatures.length > 0 && <p className="text-sm text-gray-600">{vacatures.length} in totaal</p>}
          </div>
          {vacatures.length === 0 ? (
            <LeegVlak
              titel="Nog geen vacatures"
              tekst="Maak een vacature aan voor een functie of een stage. Kandidaten koppel je er daarna aan, en je ziet per vacature wie er wacht."
              actie={vacaturePaneel('primair')}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                    <th className="px-5 py-3 font-normal">Vacature</th>
                    <th className="px-5 py-3 font-normal">Van wie</th>
                    <th className="px-5 py-3 text-right font-normal">In procedure</th>
                    <th className="px-5 py-3 text-right font-normal">Wacht</th>
                    <th className="px-5 py-3 text-right font-normal">Bezet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vacatures.map((r) => (
                    <tr key={r.vacature.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5">
                        <a href={`/beheer/werving/${r.vacature.id}`} className="hover:text-jr-link text-[15px] font-medium">
                          {r.vacature.title}
                        </a>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{VACATURE_SOORT_LABELS[r.vacature.kind]}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              r.vacature.status === 'open' ? 'bg-jr-lightblue text-jr-deepblue' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {VACATURE_STATUS_LABELS[r.vacature.status]}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{r.eigenaar ?? <span className="text-xs text-[#94590A]">niemand</span>}</td>
                      <td className="tabular px-5 py-3.5 text-right">{r.lopend}</td>
                      <td className={`tabular px-5 py-3.5 text-right ${r.wachten > 0 ? 'font-semibold text-[#94590A]' : 'text-gray-400'}`}>{r.wachten}</td>
                      <td className="tabular px-5 py-3.5 text-right text-gray-600">
                        {r.aangenomen} / {r.vacature.positions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Waarom het niet doorgaat. */}
        {(redenen.afgewezen.length > 0 || redenen.afgehaakt.length > 0) && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-[17px]">Waarom het niet doorgaat</h2>
            <p className="mb-4 text-sm text-gray-600">
              Apart geteld: wie wij afwijzen zegt iets over onze selectie, wie zelf afhaakt zegt iets over ons aanbod.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <Redenen titel="Wij wezen af" regels={redenen.afgewezen} />
              <Redenen titel="Zij haakten af" regels={redenen.afgehaakt} />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}

function Regel({ kaart }: { kaart: KandidaatKaart }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <span>
        <a href={`/beheer/werving/kandidaten/${kaart.kandidaat.id}`} className="hover:text-jr-blue font-medium">
          {kaart.kandidaat.name}
        </a>
        <span className="ml-2 text-xs text-gray-500">
          {kaart.vacatureTitel ?? 'Open sollicitatie'} ·{' '}
          {KANDIDAAT_STATUS_LABELS[kaart.kandidaat.status]}
        </span>
      </span>
      <span className="text-xs text-gray-500">
        {kaart.kandidaat.nextActionOn
          ? `${kaart.kandidaat.nextAction} — stond op ${formatDate(kaart.kandidaat.nextActionOn)}`
          : 'geen vervolgstap'}
      </span>
    </li>
  )
}

function Redenen({ titel, regels }: { titel: string; regels: { reden: string; aantal: number }[] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold text-gray-600">{titel}</h3>
      {regels.length === 0 ? (
        <p className="text-xs text-gray-500">Nog niks vastgelegd.</p>
      ) : (
        <ul className="space-y-1">
          {regels.map((r) => (
            <li key={r.reden} className="flex justify-between gap-3 text-sm">
              <span className="text-gray-700">{r.reden}</span>
              <span className="tabular text-gray-500">{r.aantal}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
