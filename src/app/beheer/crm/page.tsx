import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  listCrmPersonen,
  telPerSoort,
  SOORTEN,
  SOORT_LABELS,
  SOORT_STIJLEN,
} from '@/lib/crm-personen'
import { FilterBalk, Zoekveld } from '@/components/FilterBalk'
import { AppShell } from '@/components/AppShell'
import { Avatar } from '@/components/Avatar'
import { MAANDNAMEN } from '@/lib/dates'
import { leeftijd } from '@/lib/leeftijd'
import { metGeheugen } from '@/lib/cache'
import { listBedrijfsnamen } from '@/lib/pijplijn'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Field, Select, TextArea } from '@/components/ActionForm'
import { nieuwContact } from '../crm-actions'

/**
 * Netlify kapt een functie standaard na tien seconden af. Deze pagina haalt
 * meerdere overzichten tegelijk op, en vanaf een serverless functie kost elke
 * query een netwerkronde naar de database. Zit je daarboven, dan krijgt de
 * bezoeker een 502 zonder dat er ergens staat waarom. Zesentwintig seconden
 * is het maximum voor een gewone functie; het is een vangnet, geen streven.
 */
export const maxDuration = 26

/**
 * Het CRM: iedereen die we kennen, op één pagina.
 *
 * Klantcontacten, contactpersonen bij partners en eigen collega's door
 * elkaar heen, met een label erbij. Je zoekt vaker een persoon dan een
 * bedrijf: je weet dat je Marieke moet hebben, en waar ze werkt is precies
 * wat je kwijt bent.
 *
 * Wijzigen doe je waar iemand thuishoort — op de klantpagina, bij de partner
 * of in het medewerkersprofiel. Hier is het overzicht, niet de invoer.
 */
export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; soort?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const params = await searchParams
  const zoek = (params.q ?? '').trim()
  const soort = (params.soort ?? '').trim()

  // Zonder soortfilter, om de tellers per label te kunnen laten zien: die
  // moeten blijven staan als je op een van de labels klikt, anders kun je
  // niet meer terug naar de rest.
  // Onthouden per zoekterm. Wie een lijst filtert of terugklikt krijgt hem
  // uit het geheugen in plaats van opnieuw over de oceaan.
  const [alle, bedrijven] = await Promise.all([metGeheugen(`crm:${zoek}`, () => listCrmPersonen({ zoek })), listBedrijfsnamen()])
  const telling = telPerSoort(alle)
  const mensen = soort === '' ? alle : alle.filter((m) => m.soort === soort)

  const metVerjaardag = mensen.filter((m) => m.birthDay !== null && m.birthMonth !== null)
  const zonderGegevens = mensen.filter((m) => !m.email && !m.telefoon)

  /** Bouwt een link die de andere filters laat staan. */
  function link(nieuweSoort: string): string {
    const q = new URLSearchParams()
    if (zoek !== '') q.set('q', zoek)
    if (nieuweSoort !== '') q.set('soort', nieuweSoort)
    const s = q.toString()
    return s === '' ? '/beheer/crm' : `/beheer/crm?${s}`
  }

  // Op voornaam gegroepeerd, zoals Contacten op een telefoon. De lijst komt
  // al op voornaam binnen; hier alleen de beginletter erbij.
  const letterVan = (naam: string) => {
    const l = naam.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase()
    return /[A-Z]/.test(l) ? l : '#'
  }
  const groepen: { letter: string; mensen: typeof mensen }[] = []
  for (const m of mensen) {
    const l = letterVan(m.naam)
    const laatste = groepen.at(-1)
    if (laatste && laatste.letter === l) laatste.mensen.push(m)
    else groepen.push({ letter: l, mensen: [m] })
  }

  return (
    <AppShell user={user} actief="crm" breed>
      {/* Kop: compact, zodat de lijst op een telefoon meteen in beeld is. */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight sm:text-[32px]">
            Contacten <span className="align-middle text-base font-normal text-gray-400">{alle.length}</span>
          </h1>
          <p className="mt-1 hidden text-sm text-gray-600 sm:block">Iedereen die we kennen, met of zonder bedrijf: klanten, partners, netwerk en collega’s, op voornaam.</p>
        </div>
        <div className="shrink-0">
          <Paneel knop="+ Nieuw" titel="Contact toevoegen" uitleg="Een bedrijf kiezen mag, hoeft niet. Werkt iemand ergens dat (nog) geen klant is, vul het dan als tekst in.">
            <ActionForm action={nieuwContact} submitLabel="Toevoegen">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_1.4fr]">
                <Field label="Voornaam" name="voornaam" />
                <Field label="Tussenv." name="tussenvoegsel" />
                <Field label="Achternaam" name="achternaam" />
              </div>
              <Field label="Functie" name="functie" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Bij klant of prospect"
                  name="organizationId"
                  defaultValue=""
                  options={[{ value: '', label: 'Geen: los contact' }, ...bedrijven.map((b) => ({ value: b.id, label: b.naam }))]}
                />
                <Field label="Of: werkt bij" name="bedrijfsnaam" placeholder="Bijvoorbeeld Rabobank" hint="Alleen als je hiernaast geen klant kiest." />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="E-mail" name="email" type="email" />
                <Field label="Mobiel" name="mobiel" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Telefoon" name="telefoon" />
                <Field label="LinkedIn" name="linkedin" placeholder="https://www.linkedin.com/in/…" />
              </div>
              <TextArea label="Notities" name="notities" rows={3} />
            </ActionForm>
          </Paneel>
        </div>
      </div>

      {/* Een gewoon formulier met GET: dan staat de zoekterm in de URL en kun
          je een zoekresultaat bewaren of doorsturen. Zoekt tijdens het typen. */}
      <FilterBalk className="mb-3 flex items-center gap-2" wisHref={zoek !== '' || soort !== '' ? '/beheer/crm' : null}>
        {soort !== '' && <input type="hidden" name="soort" value={soort} />}
        <div className="w-full sm:max-w-md">
          <Zoekveld naam="q" waarde={zoek} placeholder="Zoek op naam, bedrijf, mail of functie" breed />
        </div>
      </FilterBalk>

      {/* De labels zijn zelf het filter. Op een telefoon één rij die je
          zijwaarts schuift, zodat ze de lijst niet naar beneden duwen. */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        <a
          href={link('')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap ${
            soort === '' ? 'bg-jr-text text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'
          }`}
        >
          Alles {alle.length}
        </a>
        {SOORTEN.filter((s) => telling[s] > 0).map((s) => (
          <a
            key={s}
            href={link(s)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap ${
              soort === s ? 'bg-jr-text text-white' : `${SOORT_STIJLEN[s]} hover:opacity-80`
            }`}
          >
            {SOORT_LABELS[s]} {telling[s]}
          </a>
        ))}
      </div>

      {zonderGegevens.length > 0 && (
        <p className="mb-3 text-xs text-[#94590A]">
          {zonderGegevens.length === 1 ? '1 persoon zonder mail of nummer' : `${zonderGegevens.length} mensen zonder mail of nummer`}
          {metVerjaardag.length > 0 && <span className="text-gray-500"> · van {metVerjaardag.length} weten we de verjaardag</span>}
        </p>
      )}

      {mensen.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            {zoek === '' && soort === ''
              ? 'Nog niemand in het adresboek. Voeg iemand toe met de knop rechtsboven.'
              : 'Niets gevonden. Probeer een andere zoekterm of een ander label.'}
          </p>
        </div>
      ) : (
        // Zoals Contacten op een iPhone: per letter, wie en waar op twee
        // regels, en op een telefoon bellen en mailen met één tik.
        <div className="rounded-xl bg-white shadow-sm">
          {groepen.map((g, i) => (
            <section key={g.letter} aria-label={`Letter ${g.letter}`}>
              <h2 className={`sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 border-b border-gray-150 bg-gray-50/95 px-5 py-1 text-xs font-semibold text-gray-500 backdrop-blur lg:top-0 ${i === 0 ? 'rounded-t-xl' : ''}`}>
                {g.letter}
              </h2>
              <ul className="divide-y divide-gray-150">
                {g.mensen.map((m) => {
                  const nummer = m.telefoon?.replace(/\s/g, '')
                  return (
                    <li key={`${m.soort}-${m.id}`} className={`flex items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-5 ${m.actief ? '' : 'opacity-60'}`}>
                      <a href={m.href} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                        <Avatar naam={m.naam} imageId={m.avatarImageId} maat={44} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-medium sm:text-[15px]">
                            {m.naam}
                            {m.isPrimary && <span className="text-jr-link ml-2 text-xs font-normal">Vast aanspreekpunt</span>}
                            {!m.actief && <span className="ml-2 text-xs font-normal text-gray-500">Niet meer actief</span>}
                          </span>
                          <span className="block truncate text-[13px] text-gray-600">
                            {m.functie ? `${m.functie} · ` : ''}
                            {m.bijNaam}
                            {m.birthDay !== null && m.birthMonth !== null && (
                              <span className="hidden text-gray-500 sm:inline">
                                {' '}
                                &middot; jarig {m.birthDay} {MAANDNAMEN[m.birthMonth - 1]}
                                {leeftijd(m.birthDay, m.birthMonth, m.birthYear) !== null && ` (${leeftijd(m.birthDay, m.birthMonth, m.birthYear)})`}
                              </span>
                            )}
                          </span>
                        </span>
                      </a>

                      {/* Telefoon: twee ronde knoppen, groot genoeg om te raken. */}
                      <div className="flex shrink-0 gap-1.5 sm:hidden">
                        {nummer && (
                          <a href={`tel:${nummer}`} aria-label={`Bel ${m.naam}`} className="bg-jr-blue/10 text-jr-blue flex h-10 w-10 items-center justify-center rounded-full active:bg-jr-blue/20">
                            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
                          </a>
                        )}
                        {m.email && (
                          <a href={`mailto:${m.email}`} aria-label={`Mail ${m.naam}`} className="bg-jr-blue/10 text-jr-blue flex h-10 w-10 items-center justify-center rounded-full active:bg-jr-blue/20">
                            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" /></svg>
                          </a>
                        )}
                      </div>

                      {/* Breed scherm: het adres en het nummer zelf. */}
                      <div className="hidden shrink-0 text-right text-[13px] sm:block">
                        {m.email && (
                          <a href={`mailto:${m.email}`} className="text-jr-link block hover:underline">
                            {m.email}
                          </a>
                        )}
                        {m.telefoon && (
                          <a href={`tel:${nummer}`} className="block text-gray-600 hover:underline">
                            {m.telefoon}
                          </a>
                        )}
                        {!m.email && !m.telefoon && <span className="text-[#94590A]">Geen mail of nummer</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  )
}
