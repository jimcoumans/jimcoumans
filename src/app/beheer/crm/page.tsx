import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  listCrmPersonen,
  telPerSoort,
  SOORTEN,
  SOORT_LABELS,
  SOORT_STIJLEN,
} from '@/lib/crm-personen'
import { AppShell } from '@/components/AppShell'
import { Avatar } from '@/components/Avatar'
import { MAANDNAMEN } from '@/lib/dates'
import { metGeheugen } from '@/lib/cache'

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
  const alle = await metGeheugen(`crm:${zoek}`, () => listCrmPersonen({ zoek }))
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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-jr-blue text-2xl">CRM</h1>
          <p className="text-sm text-gray-600">
            Iedereen die we kennen: klanten, partners en collega&rsquo;s. Op achternaam.
          </p>
        </div>

        <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
          <div>
            <dt className="text-xs text-gray-600">Mensen</dt>
            <dd className="tabular text-jr-blue text-xl font-bold leading-tight">
              {mensen.length}
              {soort !== '' && (
                <span className="ml-1 text-xs font-normal text-gray-500">
                  van {alle.length}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Verjaardag bekend</dt>
            <dd className="tabular text-xl font-bold leading-tight">
              {metVerjaardag.length}
              <span className="ml-1 text-xs font-normal text-gray-500">
                van {mensen.length}
              </span>
            </dd>
          </div>
          {zonderGegevens.length > 0 && (
            <div>
              <dt className="text-xs text-gray-600">Zonder mail of nummer</dt>
              <dd className="tabular text-jr-orange text-xl font-bold leading-tight">
                {zonderGegevens.length}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* De labels zijn zelf het filter. Een keuzelijst zou hier een klik
          extra kosten en de aantallen verbergen. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <a
          href={link('')}
          className={`rounded-full px-3 py-1 text-xs ${
            soort === '' ? 'bg-jr-blue text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Alles ({alle.length})
        </a>
        {SOORTEN.filter((s) => telling[s] > 0).map((s) => (
          <a
            key={s}
            href={link(s)}
            className={`rounded-full px-3 py-1 text-xs ${
              soort === s ? 'bg-jr-blue text-white' : `${SOORT_STIJLEN[s]} hover:opacity-80`
            }`}
          >
            {SOORT_LABELS[s]} ({telling[s]})
          </a>
        ))}
      </div>

      {/* Een gewoon formulier met GET: dan staat de zoekterm in de URL en kun
          je een zoekresultaat bewaren of doorsturen. */}
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        {soort !== '' && <input type="hidden" name="soort" value={soort} />}
        <input
          type="search"
          name="q"
          defaultValue={zoek}
          placeholder="Zoek op naam, e-mail, functie, klant of partner"
          className="focus:border-jr-blue w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          className="bg-jr-btn hover:bg-jr-btnhover rounded-lg px-4 py-2 text-sm text-white"
        >
          Zoeken
        </button>
        {(zoek !== '' || soort !== '') && (
          <a
            href="/beheer/crm"
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Wissen
          </a>
        )}
      </form>

      {mensen.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            {zoek === '' && soort === ''
              ? 'Nog niemand in het CRM. Voeg contactpersonen toe op een klantpagina of bij een partner.'
              : 'Niets gevonden. Probeer een andere zoekterm of een ander label.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                <th className="px-4 py-2.5 font-normal">Naam</th>
                <th className="px-4 py-2.5 font-normal">Functie</th>
                <th className="px-4 py-2.5 font-normal">Waar</th>
                <th className="px-4 py-2.5 font-normal">Bereikbaar</th>
                <th className="px-4 py-2.5 font-normal">Verjaardag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mensen.map((m) => (
                <tr key={`${m.soort}-${m.id}`} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <Avatar naam={m.naam} imageId={m.avatarImageId} maat={32} />
                      <div className="min-w-0">
                        <a href={m.href} className="hover:text-jr-blue font-medium">
                          {m.naam}
                        </a>
                        <div className="mt-0.5 flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-xs ${SOORT_STIJLEN[m.soort]}`}
                          >
                            {SOORT_LABELS[m.soort]}
                          </span>
                          {m.isPrimary && (
                            <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-1.5 py-0.5 text-xs">
                              Vast aanspreekpunt
                            </span>
                          )}
                          {!m.actief && (
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                              Niet meer actief
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {m.functie ?? <span className="text-gray-400">&mdash;</span>}
                  </td>

                  <td className="px-4 py-3">
                    <a href={m.href} className="hover:text-jr-blue">
                      {m.bijNaam}
                    </a>
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="hover:text-jr-blue block">
                        {m.email}
                      </a>
                    )}
                    {m.telefoon && (
                      <a
                        href={`tel:${m.telefoon.replace(/\s/g, '')}`}
                        className="hover:text-jr-blue block text-gray-600"
                      >
                        {m.telefoon}
                      </a>
                    )}
                    {!m.email && !m.telefoon && (
                      <span className="text-jr-orange">geen gegevens</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {m.birthDay !== null && m.birthMonth !== null ? (
                      <>
                        {m.birthDay} {MAANDNAMEN[m.birthMonth - 1]}
                        {m.birthYear !== null && (
                          <span className="block text-gray-500">
                            wordt {new Date().getFullYear() - m.birthYear}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}
