import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  listServices,
  PRODUCTGROEPEN,
  AFDELINGEN,
  marginPerUnitCents,
  marginPercent,
} from '@/lib/services'
import { AppShell } from '@/components/AppShell'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Field } from '@/components/ActionForm'
import { nieuweDienst, wijzigDienst, wisselDienstActief } from '../service-actions'
import { formatEuro } from '@/lib/money'
import { unitLabels } from '@/lib/quantity'
import { Menu } from '@/components/Menu'

/** De dienstencatalogus: wat we leveren en wat het kost. */
export default async function DienstenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const diensten = await listServices()
  const actief = diensten.filter((d) => d.active)
  const inactief = diensten.filter((d) => !d.active)

  return (
    <AppShell user={user} actief="diensten">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="mb-1 text-[28px] sm:text-[32px]">Diensten</h1>
          <Paneel
            knop="+ Dienst toevoegen"
            titel="Dienst toevoegen"
          >
            <ActionForm action={nieuweDienst} submitLabel="Dienst aanmaken">
              <Field label="Naam" name="naam" required placeholder="Social media post" />
              <Field label="Verkooptarief" name="tarief" required placeholder="100,00" />

              <div>
                <label htmlFor="eenheid" className="text-jr-text mb-1.5 block text-[13px] font-medium">
                  Eenheid
                </label>
                <select
                  id="eenheid"
                  name="eenheid"
                  defaultValue="piece"
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
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
                <label htmlFor="productgroep" className="text-jr-text mb-1.5 block text-[13px] font-medium">
                  Productgroep <span className="text-gray-400">(optioneel)</span>
                </label>
                <select
                  id="productgroep"
                  name="productgroep"
                  defaultValue=""
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
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
                <label htmlFor="afdeling" className="text-jr-text mb-1.5 block text-[13px] font-medium">
                  Afdeling <span className="text-gray-400">(optioneel)</span>
                </label>
                <select
                  id="afdeling"
                  name="afdeling"
                  defaultValue=""
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
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
          </Paneel>
        </div>
        <p className="mb-6 text-sm text-gray-600">
          {actief.length} actieve {actief.length === 1 ? 'dienst' : 'diensten'}. Het tarief
          hier is het tarief van nu; bestaande boekingen houden het tarief van hun eigen
          moment.
        </p>

        <div>
          <div className="space-y-8">
            {actief.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  Nog geen diensten. Voeg je eerste product toe, bijvoorbeeld
                  &ldquo;Social media post&rdquo; van &euro; 100.
                </p>
              </div>
            ) : (
              // Per productgroep, zoals je een catalogus leest; de groep
              // staat dan als kop boven de lijst in plaats van als label
              // achter elke regel.
              [...new Set(actief.map((d) => d.category ?? 'Overig'))].map((groep) => (
                <section key={groep}>
                  <h2 className="mb-2 px-1 text-[17px]">{groep}</h2>
                  <ul className="divide-y divide-gray-150 rounded-xl bg-white shadow-sm">
                    {actief
                      .filter((d) => (d.category ?? 'Overig') === groep)
                      .map((dienst) => (
                        <DienstKaart key={dienst.id} dienst={dienst} />
                      ))}
                  </ul>
                </section>
              ))
            )}

            {inactief.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm text-gray-600">
                  Niet meer actief ({inactief.length})
                </h2>
                <ul className="divide-y divide-gray-150 rounded-xl bg-white shadow-sm">
                  {inactief.map((dienst) => (
                    <DienstKaart key={dienst.id} dienst={dienst} />
                  ))}
                </ul>
              </section>
            )}
          </div>

        </div>
    </AppShell>
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
    <li className={`flex items-start gap-3 py-3.5 pr-3 pl-6 ${dienst.active ? '' : 'opacity-60'}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[15px]">{dienst.name}</p>
        {dienst.description && <p className="mt-0.5 text-[13px] text-gray-600">{dienst.description}</p>}
        <p className="mt-0.5 text-[13px] text-gray-500">
          {[
            dienst.department,
            dienst.timesBooked === 0
              ? 'Nog nooit geboekt'
              : `${dienst.timesBooked} keer geboekt${dienst.revenueCents > 0 ? `, ${formatEuro(dienst.revenueCents)} omzet` : ''}`,
            dienst.estimatedMinutes !== null ? `ongeveer ${dienst.estimatedMinutes} minuten` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {dienst.notes && <p className="mt-0.5 text-[13px] text-gray-500">{dienst.notes}</p>}
      </div>

      <div className="shrink-0 text-right">
        <p className="tabular text-[15px]">{formatEuro(dienst.unitPriceCents)}</p>
        <p className="text-xs text-gray-500">{unitLabels[dienst.unit]}</p>
        {marge !== null && (
          <p className="text-xs text-gray-500">
            marge {formatEuro(marge)}
            {margePct !== null && <> ({margePct}%)</>}
          </p>
        )}
      </div>

      <Menu>
        <Paneel
          knop="Aanpassen"
          stijl="menu"
          titel={dienst.name}
          uitleg="Een nieuw tarief geldt alleen voor nieuwe boekingen. Wat al geboekt is, verandert niet."
        >
            <ActionForm
              action={wijzigDienst}
              submitLabel="Opslaan"
              resetOnSuccess={false}
              className="grid gap-4 sm:grid-cols-2"
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
        </Paneel>
        <ActionForm
          action={wisselDienstActief}
          submitLabel={dienst.active ? 'Niet meer aanbieden' : 'Weer aanbieden'}
          submitClassName="!min-h-0 w-full !rounded-lg !px-3 !py-2 text-left !font-normal text-jr-text hover:bg-gray-100"
          resetOnSuccess={false}
          meldGelukt={false}
          className=""
        >
          <input type="hidden" name="id" value={dienst.id} />
          <input type="hidden" name="activeren" value={dienst.active ? '0' : '1'} />
        </ActionForm>
      </Menu>
    </li>
  )
}
