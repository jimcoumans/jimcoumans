import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listPartners, listOrganizationsForPartner, partnerTypeLabels } from '@/lib/crm'
import { Header } from '@/components/Header'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { nieuwePartner } from '../crm-actions'
import { formatCents } from '@/lib/money'

/** Externe partners met wie we werken, en de afspraken die er gelden. */
export default async function PartnersPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const partners = await listPartners()
  const actief = partners.filter((p) => p.active)

  // Bij welke klanten elke partner hoort; dat is waar het overzicht om draait.
  const koppelingen = await Promise.all(
    partners.map(async (p) => ({ id: p.id, klanten: await listOrganizationsForPartner(p.id) })),
  )
  const perPartner = new Map(koppelingen.map((k) => [k.id, k.klanten]))

  return (
    <>
      <Header user={user} actief="partners" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-jr-blue mb-1 text-2xl">Partners</h1>
        <p className="mb-6 text-sm text-gray-600">
          De externen met wie we werken, wat we met ze hebben afgesproken en bij welke
          klanten ze horen.
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
          <div>
            {actief.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  Nog geen partners. Voeg je huisfotograaf of vaste drukker toe.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {actief.map((p) => {
                  const klanten = perPartner.get(p.id) ?? []
                  return (
                    <li key={p.id} className="rounded-xl bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base">{p.name}</h2>
                            <span className="bg-jr-lightblue text-jr-deepblue rounded-full px-2 py-0.5 text-xs">
                              {partnerTypeLabels[p.type]}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-gray-600">
                            {p.contactName && <>{p.contactName} &middot; </>}
                            {p.email && <>{p.email} &middot; </>}
                            {p.phone}
                            {!p.contactName && !p.email && !p.phone && 'geen contactgegevens'}
                          </p>

                          {p.agreementNotes && (
                            <p className="mt-2 text-sm text-gray-600">{p.agreementNotes}</p>
                          )}

                          {klanten.length > 0 ? (
                            <p className="mt-2.5 text-xs text-gray-600">
                              {klanten.map((k, i) => (
                                <span key={k.link.id}>
                                  {i > 0 && ' · '}
                                  <a
                                    href={`/beheer/${k.organizationSlug}`}
                                    className="hover:text-jr-blue"
                                  >
                                    {k.link.role} bij {k.organizationName}
                                  </a>
                                </span>
                              ))}
                            </p>
                          ) : (
                            <p className="mt-2.5 text-xs text-gray-500">
                              nog niet aan een klant gekoppeld
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          {p.hourlyRateCents !== null && (
                            <p className="tabular text-base">
                              {formatCents(p.hourlyRateCents)}
                              <span className="text-xs text-gray-600"> /uur</span>
                            </p>
                          )}
                          {p.dayRateCents !== null && (
                            <p className="tabular text-sm text-gray-600">
                              {formatCents(p.dayRateCents)}
                              <span className="text-xs"> /dag</span>
                            </p>
                          )}
                          {p.hourlyRateCents === null && p.dayRateCents === null && (
                            <p className="text-xs text-gray-500">geen tarief vastgelegd</p>
                          )}
                          {p.paymentTermDays !== null && (
                            <p className="mt-1 text-xs text-gray-500">
                              betaaltermijn {p.paymentTermDays} dagen
                            </p>
                          )}
                        </div>
                      </div>

                      {p.notes && (
                        <p className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500">
                          {p.notes}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <aside className="rounded-xl bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:self-start">
            <h2 className="mb-3 text-base">Partner toevoegen</h2>
            <ActionForm action={nieuwePartner} submitLabel="Partner aanmaken">
              <Field label="Naam" name="naam" required placeholder="Studio Lens" />
              <Select
                label="Soort"
                name="type"
                defaultValue="photographer"
                options={Object.entries(partnerTypeLabels).map(([value, label]) => ({ value, label }))}
              />
              <Field label="Contactpersoon" name="contactpersoon" placeholder="Tom Lens" />
              <Field label="E-mailadres" name="email" type="email" placeholder="tom@studiolens.nl" />
              <Field label="Telefoon" name="telefoon" placeholder="06 12 34 56 78" />
              <Field label="Website" name="website" placeholder="studiolens.nl" />
              <Field label="Uurtarief" name="uurtarief" placeholder="95,00" />
              <Field label="Dagtarief" name="dagtarief" placeholder="650,00" />
              <Field
                label="Betaaltermijn in dagen"
                name="betaaltermijn"
                type="number"
                placeholder="30"
              />
              <Field
                label="Tariefafspraken"
                name="afspraken"
                placeholder="Reiskosten binnen Limburg inbegrepen"
                hint="Staffels, voorwaarden, wat er wel en niet bij zit."
              />
              <Field label="Interne notities" name="notities" />
            </ActionForm>
          </aside>
        </div>
      </main>
    </>
  )
}
