import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  listServices,
  PRODUCTGROEPEN,
  AFDELINGEN,
  marginPerUnitCents,
  marginPercent,
} from '@/lib/services'
import { Header } from '@/components/Header'
import { ActionForm, Field } from '@/components/ActionForm'
import { nieuweDienst, wijzigDienst, wisselDienstActief } from '../service-actions'
import { formatCents } from '@/lib/money'
import { unitLabels } from '@/lib/quantity'

/** De dienstencatalogus: wat we leveren en wat het kost. */
export default async function DienstenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const diensten = await listServices()
  const actief = diensten.filter((d) => d.active)
  const inactief = diensten.filter((d) => !d.active)

  return (
    <>
      <Header user={user} actief="diensten" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-jr-blue mb-1 text-2xl">Diensten</h1>
        <p className="mb-6 text-sm text-gray-600">
          {actief.length} actieve {actief.length === 1 ? 'dienst' : 'diensten'}. Het tarief
          hier is het tarief van nu; bestaande boekingen houden het tarief van hun eigen
          moment.
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-8">
            {actief.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  Nog geen diensten. Voeg je eerste product toe, bijvoorbeeld
                  &ldquo;Social media post&rdquo; van &euro; 100.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {actief.map((dienst) => (
                  <DienstKaart key={dienst.id} dienst={dienst} />
                ))}
              </ul>
            )}

            {inactief.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm text-gray-600">
                  Niet meer actief ({inactief.length})
                </h2>
                <ul className="space-y-3">
                  {inactief.map((dienst) => (
                    <DienstKaart key={dienst.id} dienst={dienst} />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="rounded-xl bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:self-start">
            <h2 className="mb-3 text-base">Dienst toevoegen</h2>
            <ActionForm action={nieuweDienst} submitLabel="Dienst aanmaken">
              <Field label="Naam" name="naam" required placeholder="Social media post" />
              <Field label="Verkooptarief" name="tarief" required placeholder="100,00" />

              <div>
                <label htmlFor="eenheid" className="mb-1 block text-xs text-gray-600">
                  Eenheid
                </label>
                <select
                  id="eenheid"
                  name="eenheid"
                  defaultValue="piece"
                  className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                >
                  {Object.entries(unitLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                label="Kostprijs"
                name="kostprijs"
                placeholder="35,00"
                hint="Inkoop of interne kosten. Alleen voor de marge; klanten zien dit nooit."
              />

              <div>
                <label htmlFor="productgroep" className="mb-1 block text-xs text-gray-600">
                  Productgroep <span className="text-gray-400">(optioneel)</span>
                </label>
                <select
                  id="productgroep"
                  name="productgroep"
                  defaultValue=""
                  className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                >
                  <option value="">Geen</option>
                  {PRODUCTGROEPEN.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="afdeling" className="mb-1 block text-xs text-gray-600">
                  Afdeling <span className="text-gray-400">(optioneel)</span>
                </label>
                <select
                  id="afdeling"
                  name="afdeling"
                  defaultValue=""
                  className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                >
                  <option value="">Geen</option>
                  {AFDELINGEN.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <Field label="Code" name="code" placeholder="SOC-POST" />
              <Field
                label="Omschrijving"
                name="omschrijving"
                placeholder="Wat de klant krijgt"
              />
              <Field
                label="Verwachte tijd in minuten"
                name="minuten"
                type="number"
                placeholder="45"
                hint="Voor capaciteitsplanning later."
              />
              <Field label="Interne notities" name="notities" />
            </ActionForm>
          </aside>
        </div>
      </main>
    </>
  )
}

function DienstKaart({
  dienst,
}: {
  dienst: Awaited<ReturnType<typeof listServices>>[number]
}) {
  const marge = marginPerUnitCents(dienst)
  const margePct = marginPercent(dienst)

  return (
    <li className={`rounded-xl bg-white p-5 shadow-sm ${dienst.active ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base">{dienst.name}</h3>
            {dienst.code && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {dienst.code}
              </span>
            )}
            {dienst.category && (
              <span className="bg-jr-lightblue text-jr-deepblue rounded px-1.5 py-0.5 text-xs">
                {dienst.category}
              </span>
            )}
            {!dienst.active && (
              <span className="text-jr-orange rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                inactief
              </span>
            )}
          </div>

          {dienst.description && (
            <p className="mt-1 text-sm text-gray-600">{dienst.description}</p>
          )}

          <p className="mt-1.5 text-xs text-gray-600">
            {dienst.department && <>{dienst.department} &middot; </>}
            {dienst.timesBooked}× geboekt
            {dienst.revenueCents > 0 && <> &middot; {formatCents(dienst.revenueCents)} omzet</>}
            {dienst.estimatedMinutes !== null && <> &middot; ~{dienst.estimatedMinutes} min</>}
          </p>

          {dienst.notes && <p className="mt-1.5 text-xs text-gray-500">{dienst.notes}</p>}
        </div>

        <div className="shrink-0 text-right">
          <p className="tabular text-lg">{formatCents(dienst.unitPriceCents)}</p>
          <p className="text-xs text-gray-600">{unitLabels[dienst.unit]}</p>
          {marge !== null && (
            <p className="mt-1 text-xs text-gray-600">
              marge {formatCents(marge)}
              {margePct !== null && <> ({margePct}%)</>}
            </p>
          )}
        </div>
      </div>

      <details className="mt-3">
        <summary className="text-jr-blue cursor-pointer text-xs">Aanpassen</summary>
        <div className="mt-3 grid gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs text-gray-600">
              Een tariefwijziging geldt alleen voor nieuwe boekingen. Bestaande
              boekingen en saldi veranderen niet.
            </p>
            <ActionForm
              action={wijzigDienst}
              submitLabel="Opslaan"
              resetOnSuccess={false}
              className="grid gap-3 sm:grid-cols-2"
            >
              <input type="hidden" name="id" value={dienst.id} />
              <Field label="Naam" name="naam" required defaultValue={dienst.name} />
              <Field
                label="Verkooptarief"
                name="tarief"
                required
                defaultValue={(dienst.unitPriceCents / 100).toFixed(2).replace('.', ',')}
              />
              <Field
                label="Kostprijs"
                name="kostprijs"
                defaultValue={
                  dienst.costPriceCents === null
                    ? ''
                    : (dienst.costPriceCents / 100).toFixed(2).replace('.', ',')
                }
              />
              <Field
                label="Productgroep"
                name="productgroep"
                defaultValue={dienst.category ?? ''}
              />
              <Field label="Afdeling" name="afdeling" defaultValue={dienst.department ?? ''} />
              <div className="sm:col-span-2">
                <Field
                  label="Omschrijving"
                  name="omschrijving"
                  defaultValue={dienst.description ?? ''}
                />
              </div>
              <div className="sm:col-span-2">
                <Field label="Interne notities" name="notities" defaultValue={dienst.notes ?? ''} />
              </div>
            </ActionForm>
          </div>

          <div className="sm:col-span-2 border-t border-gray-200 pt-3">
            <p className="mb-2 text-xs text-gray-600">
              {dienst.timesBooked > 0
                ? 'Deze dienst is geboekt en kan niet verwijderd worden. Op inactief zetten haalt hem uit de keuzelijst; de historie blijft leesbaar.'
                : 'Deze dienst is nog nooit geboekt.'}
            </p>
            <ActionForm
              action={wisselDienstActief}
              submitLabel={dienst.active ? 'Op inactief zetten' : 'Weer activeren'}
              submitClassName="text-gray-600 hover:bg-gray-200 !text-xs"
              resetOnSuccess={false}
              className=""
            >
              <input type="hidden" name="id" value={dienst.id} />
              <input type="hidden" name="activeren" value={dienst.active ? '0' : '1'} />
            </ActionForm>
          </div>
        </div>
      </details>
    </li>
  )
}
