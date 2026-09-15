import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listAlleContactpersonen } from '@/lib/crm'
import { AppShell } from '@/components/AppShell'
import { organizationStatusLabels, organizationStatusStyles } from '@/lib/crm'
import { aanhefVoor, achternaamEerst } from '@/lib/namen'
import { MAANDNAMEN } from '@/lib/dates'

/**
 * Alle contactpersonen bij elkaar.
 *
 * Je zoekt vaker een persoon dan een bedrijf: je weet dat je Marieke moet
 * hebben, en bij welke klant ze hoort is precies wat je kwijt bent.
 */
export default async function ContactpersonenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { q } = await searchParams
  const zoek = (q ?? '').trim()
  const contacten = await listAlleContactpersonen(zoek)

  const metVerjaardag = contacten.filter((c) => c.birthDay !== null && c.birthMonth !== null)
  const vast = contacten.filter((c) => c.isPrimary)

  return (
    <AppShell user={user} actief="contactpersonen" breed>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-jr-blue text-2xl">Contactpersonen</h1>
          <p className="text-sm text-gray-600">
            Iedereen bij onze klanten, op achternaam. Een contactpersoon wijzigen doe je
            op de klantpagina.
          </p>
        </div>

        <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
          <div>
            <dt className="text-xs text-gray-600">Contactpersonen</dt>
            <dd className="tabular text-jr-blue text-xl font-bold leading-tight">
              {contacten.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Vaste aanspreekpunten</dt>
            <dd className="tabular text-xl font-bold leading-tight">{vast.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Verjaardag bekend</dt>
            <dd className="tabular text-xl font-bold leading-tight">
              {metVerjaardag.length}
              <span className="ml-1 text-xs font-normal text-gray-500">
                van {contacten.length}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Een gewoon formulier met GET: dan staat de zoekterm in de URL en kun
          je een zoekresultaat bewaren of doorsturen. */}
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={zoek}
          placeholder="Zoek op naam, e-mail, functie of klant"
          className="focus:border-jr-blue w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          className="bg-jr-btn hover:bg-jr-btnhover rounded-lg px-4 py-2 text-sm text-white"
        >
          Zoeken
        </button>
        {zoek !== '' && (
          <a
            href="/beheer/contactpersonen"
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Wissen
          </a>
        )}
      </form>

      {contacten.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            {zoek === ''
              ? 'Nog geen contactpersonen. Voeg ze toe op de klantpagina.'
              : `Niets gevonden voor "${zoek}".`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                <th className="px-4 py-2.5 font-normal">Naam</th>
                <th className="px-4 py-2.5 font-normal">Functie</th>
                <th className="px-4 py-2.5 font-normal">Klant</th>
                <th className="px-4 py-2.5 font-normal">Bereikbaar</th>
                <th className="px-4 py-2.5 font-normal">Verjaardag</th>
                <th className="px-4 py-2.5 font-normal">Aanhef</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contacten.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-3">
                    <a
                      href={`/beheer/klanten/${c.klantSlug}`}
                      className="hover:text-jr-blue font-medium"
                    >
                      {c.name}
                    </a>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      {c.isPrimary && (
                        <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-1.5 py-0.5 text-xs">
                          Vast aanspreekpunt
                        </span>
                      )}
                      {c.receivesInvoices && (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          Facturen
                        </span>
                      )}
                    </div>
                    {achternaamEerst(c) && c.lastName && (
                      <p className="mt-0.5 text-xs text-gray-400">{achternaamEerst(c)}</p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {c.jobTitle ?? <span className="text-gray-400">&mdash;</span>}
                  </td>

                  <td className="px-4 py-3">
                    <a href={`/beheer/klanten/${c.klantSlug}`} className="hover:text-jr-blue">
                      {c.klantNaam}
                    </a>
                    <span
                      className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                        organizationStatusStyles[
                          c.klantStatus as keyof typeof organizationStatusStyles
                        ]
                      }`}
                    >
                      {
                        organizationStatusLabels[
                          c.klantStatus as keyof typeof organizationStatusLabels
                        ]
                      }
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="hover:text-jr-blue block">
                        {c.email}
                      </a>
                    )}
                    {(c.mobile ?? c.phone) && (
                      <a
                        href={`tel:${(c.mobile ?? c.phone)!.replace(/\s/g, '')}`}
                        className="hover:text-jr-blue block text-gray-600"
                      >
                        {c.mobile ?? c.phone}
                      </a>
                    )}
                    {!c.email && !c.mobile && !c.phone && (
                      <span className="text-jr-orange">geen gegevens</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs">
                    {c.birthDay !== null && c.birthMonth !== null ? (
                      <>
                        {c.birthDay} {MAANDNAMEN[c.birthMonth - 1]}
                        {c.birthYear !== null && (
                          <span className="block text-gray-500">
                            wordt {new Date().getFullYear() - c.birthYear}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-600">{aanhefVoor(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}
