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
import { PaginaKop } from '@/components/PaginaKop'
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

  return (
    <AppShell user={user} actief="crm" breed>
      <PaginaKop
        titel="Contacten"
        uitleg="Ons adresboek: iedereen die we kennen, met of zonder bedrijf. Klanten, partners, netwerk en collega’s, op achternaam. Klik op een naam voor de kaart."
        acties={
          <Paneel knop="+ Contact toevoegen" titel="Contact toevoegen" uitleg="Een bedrijf kiezen mag, hoeft niet. Werkt iemand ergens dat (nog) geen klant is, vul het dan als tekst in.">
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
        }
        cijfers={[
          { label: 'Mensen', waarde: mensen.length, hint: soort !== '' ? `van ${alle.length}` : undefined },
          { label: 'Verjaardag bekend', waarde: metVerjaardag.length, hint: `van ${mensen.length}` },
          { label: 'Zonder mail of nummer', waarde: zonderGegevens.length, toon: zonderGegevens.length > 0 ? 'let-op' : 'goed' },
        ]}
      />

      {/* De labels zijn zelf het filter. Een keuzelijst zou hier een klik
          extra kosten en de aantallen verbergen. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <a
          href={link('')}
          className={`rounded-full px-3.5 py-1.5 text-sm ${
            soort === '' ? 'bg-jr-text text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-100'
          }`}
        >
          Alles ({alle.length})
        </a>
        {SOORTEN.filter((s) => telling[s] > 0).map((s) => (
          <a
            key={s}
            href={link(s)}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              soort === s ? 'bg-jr-text text-white' : `${SOORT_STIJLEN[s]} hover:opacity-80`
            }`}
          >
            {SOORT_LABELS[s]} ({telling[s]})
          </a>
        ))}
      </div>

      {/* Een gewoon formulier met GET: dan staat de zoekterm in de URL en kun
          je een zoekresultaat bewaren of doorsturen. */}
      <FilterBalk className="mb-4 flex flex-wrap items-center gap-2" wisHref={zoek !== '' || soort !== '' ? '/beheer/crm' : null}>
        {soort !== '' && <input type="hidden" name="soort" value={soort} />}
        <Zoekveld naam="q" waarde={zoek} placeholder="Zoek op naam, e-mail, functie of bedrijf" />
      </FilterBalk>

      {mensen.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            {zoek === '' && soort === ''
              ? 'Nog niemand in het adresboek. Voeg iemand toe met de knop rechtsboven.'
              : 'Niets gevonden. Probeer een andere zoekterm of een ander label.'}
          </p>
        </div>
      ) : (
        // Zoals Contacten op een iPhone: wie, wat en waar op één regel,
        // bereikbaarheid rechts. Geen tabel met lege kolommen.
        <ul className="divide-y divide-gray-150 rounded-xl bg-white shadow-sm">
          {mensen.map((m) => (
            <li key={`${m.soort}-${m.id}`} className={`flex items-center gap-4 px-5 py-3 ${m.actief ? '' : 'opacity-60'}`}>
              <Avatar naam={m.naam} imageId={m.avatarImageId} maat={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px]">
                  <a href={m.href} className="hover:text-jr-link font-medium">
                    {m.naam}
                  </a>
                  {m.isPrimary && <span className="text-jr-link ml-2 text-xs">Vast aanspreekpunt</span>}
                  {!m.actief && <span className="ml-2 text-xs text-gray-500">Niet meer actief</span>}
                </p>
                <p className="truncate text-[13px] text-gray-600">
                  {m.functie ? `${m.functie} bij ` : ''}
                  {m.bijHref ? (
                    <a href={m.bijHref} className="hover:text-jr-link">
                      {m.bijNaam}
                    </a>
                  ) : (
                    m.bijNaam
                  )}
                  {m.birthDay !== null && m.birthMonth !== null && (
                    <span className="text-gray-500">
                      {' '}
                      &middot; jarig {m.birthDay} {MAANDNAMEN[m.birthMonth - 1]}
                      {leeftijd(m.birthDay, m.birthMonth, m.birthYear) !== null && ` (${leeftijd(m.birthDay, m.birthMonth, m.birthYear)})`}
                    </span>
                  )}
                </p>
              </div>
              <div className="hidden shrink-0 text-right text-[13px] sm:block">
                {m.email && (
                  <a href={`mailto:${m.email}`} className="text-jr-link block hover:underline">
                    {m.email}
                  </a>
                )}
                {m.telefoon && (
                  <a href={`tel:${m.telefoon.replace(/\s/g, '')}`} className="block text-gray-600 hover:underline">
                    {m.telefoon}
                  </a>
                )}
                {!m.email && !m.telefoon && <span className="text-[#94590A]">Geen mail of nummer</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
