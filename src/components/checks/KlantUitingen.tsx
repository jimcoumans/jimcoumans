import { getKlantInstellingen, listChecks, CATEGORIEEN, CATEGORIE_LABELS, SOORTEN, SOORT_LABELS, type Soort } from '@/lib/uitingen-check'
import { ActionForm, Check, Field, Select, TextArea, Uitklap } from '@/components/ActionForm'
import { Paneel } from '@/components/Paneel'
import { OordeelLabel } from './Oordeel'
import { nieuweDoelgroep } from '@/app/beheer/campagne-actions'
import {
  bewerkAfspraak,
  bewerkDoelgroepStijl,
  bewerkMerk,
  nieuweAfspraak,
  nieuwMerk,
  wisAfspraak,
  wisMerk,
} from '@/app/beheer/check-actions'
import { formatDate } from '@/lib/dates'

/* -------------------------------------------------------------------------
   De klantkaart, tab Uitingen: alles wat de uitingen-check per klant moet
   weten. De afspraken (het maatwerk), de merken als de klant er meer heeft,
   en per doelgroep hoe je die aanspreekt. Plus de laatste checks.
   ------------------------------------------------------------------------- */

const CATEGORIE_OPTIES = CATEGORIEEN.map((c) => ({ value: c, label: CATEGORIE_LABELS[c] }))
const SOORT_OPTIES = [{ value: '', label: 'Elke soort' }, ...SOORTEN.map((s) => ({ value: s.value, label: s.label }))]
const AANSPREEK_OPTIES = [
  { value: '', label: 'Zoals de tone of voice van het merk' },
  { value: 'je', label: 'Je' },
  { value: 'u', label: 'U' },
  { value: 'wisselend', label: 'Wisselend' },
]

const KLEIN = 'text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs'

export async function KlantUitingen({ organizationId, slug, naam }: { organizationId: string; slug: string; naam: string }) {
  const [{ merken, logos, afspraken, doelgroepen }, checks] = await Promise.all([getKlantInstellingen(organizationId), listChecks({ organizationId, limiet: 8 })])

  const merkOpties = [{ value: '', label: `Elk merk` }, ...merken.map((m) => ({ value: m.id, label: m.naam }))]
  const doelgroepOpties = [{ value: '', label: 'Elke doelgroep' }, ...doelgroepen.map((d) => ({ value: d.id, label: d.name }))]
  const merkNaam = new Map(merken.map((m) => [m.id, m.naam]))
  const doelgroepNaam = new Map(doelgroepen.map((d) => [d.id, d.name]))

  const afspraakVelden = (a?: (typeof afspraken)[number]) => (
    <>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="slug" value={slug} />
      <TextArea
        label="De afspraak"
        name="tekst"
        required
        rows={3}
        defaultValue={a?.tekst}
        placeholder="Content van Create op de kanalen van Van Oys: altijd het Create-logo, nooit het sjabloon van Van Oys."
      />
      <Select label="Soort" name="categorie" options={CATEGORIE_OPTIES} defaultValue={a?.categorie ?? 'afspraak'} />
      <p className="text-xs text-gray-600">Geldt de afspraak alleen voor een deel van de uitingen? Kies dat hieronder. Leeg: voor alles van {naam}.</p>
      {merken.length > 0 && <Select label="Alleen voor merk" name="merkId" options={merkOpties} defaultValue={a?.merkId ?? ''} />}
      {doelgroepen.length > 0 && <Select label="Alleen voor doelgroep" name="doelgroepId" options={doelgroepOpties} defaultValue={a?.doelgroepId ?? ''} />}
      <Field label="Alleen voor kanaal" name="kanaal" defaultValue={a?.kanaal ?? ''} placeholder="Instagram" />
      <Select label="Alleen voor soort uiting" name="soort" options={SOORT_OPTIES} defaultValue={a?.soort ?? ''} />
    </>
  )

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base">Laatste checks</h3>
            <p className="text-xs text-gray-600">Elke uiting gaat langs de check voordat de klant hem ziet.</p>
          </div>
          <a href={`/beheer/checks/nieuw?klant=${encodeURIComponent(slug)}`} className="bg-jr-btn hover:bg-jr-btnhover rounded-full px-5 py-2 text-sm font-medium text-white">
            + Nieuwe check
          </a>
        </div>
        {checks.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen checks voor {naam}.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {checks.map((c) => (
              <li key={c.id}>
                <a href={`/beheer/checks/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm hover:underline">
                  <span>
                    {c.titel}
                    {c.versie > 1 && <span className="text-gray-500"> · versie {c.versie}</span>}
                    <span className="block text-xs text-gray-500">
                      {[SOORT_LABELS[c.soort as Soort] ?? c.soort, c.kanaal, formatDate(c.createdAt)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <OordeelLabel check={c} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-base">Afspraken met {naam}</h3>
        <p className="mb-3 text-xs text-gray-600">
          Het maatwerk dat anders alleen in een mail of in iemands hoofd staat. Elke check toetst hierop, naast de{' '}
          <a href="/beheer/checks/regels" className="text-jr-link hover:underline">
            algemene regels
          </a>
          . Ook de tone of voice en het klantprofiel (gevoeligheden, wat niet gewenst is) gaan mee.
        </p>
        {afspraken.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen afspraken.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {afspraken.map((a) => {
              const scope = [
                a.merkId ? merkNaam.get(a.merkId) : null,
                a.doelgroepId ? doelgroepNaam.get(a.doelgroepId) : null,
                a.kanaal,
                a.soort ? (SOORT_LABELS[a.soort as Soort] ?? a.soort) : null,
              ].filter(Boolean)
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                  <div className={`min-w-0 text-sm ${a.actief ? '' : 'opacity-50'}`}>
                    <p className="whitespace-pre-wrap">{a.tekst}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {CATEGORIE_LABELS[a.categorie]} · {scope.length ? `alleen ${scope.join(', ')}` : 'voor alles'}
                      {!a.actief && ' · uit'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Paneel knop="Wijzig" stijl="klein" titel="Afspraak wijzigen">
                      <ActionForm action={bewerkAfspraak} submitLabel="Opslaan" resetOnSuccess={false}>
                        <input type="hidden" name="id" value={a.id} />
                        {afspraakVelden(a)}
                        <Check label="Actief: de check toetst deze afspraak" name="actief" defaultChecked={a.actief} />
                      </ActionForm>
                    </Paneel>
                    <ActionForm action={wisAfspraak} submitLabel="Verwijder" submitClassName={KLEIN} resetOnSuccess={false} meldGelukt={false} className="">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <input type="hidden" name="slug" value={slug} />
                    </ActionForm>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Uitklap label="Afspraak toevoegen" className="mt-3" uitleg="Eén afspraak per regel: dan kan de check per afspraak zeggen of hij klopt.">
          <ActionForm action={nieuweAfspraak} submitLabel="Toevoegen">
            {afspraakVelden()}
          </ActionForm>
        </Uitklap>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-base">Doelgroepen en hun stijl</h3>
        <p className="mb-3 text-xs text-gray-600">
          Spreek je de zakelijke klant anders aan dan de particulier? Leg per doelgroep de aanspreekvorm en de stijlaccenten vast. De check kijkt of de uiting de gekozen groep op de
          juiste manier aanspreekt.
        </p>
        {doelgroepen.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen doelgroepen.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {doelgroepen.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{d.name}</p>
                  {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
                  <p className="mt-1 text-gray-700">
                    {d.address ? `Aanspreekvorm: ${d.address}. ` : ''}
                    {d.styleNotes ?? <span className="text-gray-400">Nog geen stijlaccenten.</span>}
                  </p>
                </div>
                <Paneel knop="Stijl" stijl="klein" titel={`Stijl voor ${d.name}`}>
                  <ActionForm action={bewerkDoelgroepStijl} submitLabel="Opslaan" resetOnSuccess={false}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="organizationId" value={organizationId} />
                    <input type="hidden" name="slug" value={slug} />
                    <Select label="Aanspreekvorm" name="address" options={AANSPREEK_OPTIES} defaultValue={d.address ?? ''} />
                    <TextArea
                      label="Stijlaccenten"
                      name="styleNotes"
                      rows={5}
                      defaultValue={d.styleNotes ?? ''}
                      placeholder="Zakelijk: u, zakelijk-warm, nadruk op relatiegeschenken en volumekorting, geen uitroeptekens."
                    />
                  </ActionForm>
                </Paneel>
              </li>
            ))}
          </ul>
        )}
        <Uitklap label="Doelgroep toevoegen" className="mt-3">
          <ActionForm action={nieuweDoelgroep} submitLabel="Toevoegen">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <Field label="Naam" name="name" required placeholder="Zakelijke klanten" />
            <Field label="Omschrijving" name="description" />
          </ActionForm>
        </Uitklap>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-base">Merken</h3>
        <p className="mb-3 text-xs text-gray-600">
          Alleen nodig als {naam} meer dan één merk heeft, zoals Van Oys en Create. Koppel de logo’s uit de merkkluis aan het merk; dan weet de check welk logo op welke uiting
          hoort. Logo’s zonder merk horen bij {naam} zelf.
        </p>
        {merken.length === 0 ? (
          <p className="text-sm text-gray-500">Eén merk: {naam}.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {merken.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{m.naam}</p>
                  {m.omschrijving && <p className="text-gray-700">{m.omschrijving}</p>}
                  <p className="mt-1 text-xs text-gray-500">{m.logos.length ? `Logo’s: ${m.logos.map((l) => l.title).join(', ')}` : 'Nog geen logo gekoppeld.'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Paneel knop="Wijzig" stijl="klein" titel={`Merk ${m.naam}`}>
                    <ActionForm action={bewerkMerk} submitLabel="Opslaan" resetOnSuccess={false}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <input type="hidden" name="slug" value={slug} />
                      <Field label="Naam" name="naam" required defaultValue={m.naam} />
                      <TextArea label="Waar dit merk voor staat en wanneer het op een uiting hoort" name="omschrijving" rows={3} defaultValue={m.omschrijving ?? ''} />
                      <fieldset>
                        <legend className="text-jr-text mb-1.5 block text-[13px] font-medium">Logo’s van dit merk</legend>
                        {logos.length === 0 ? (
                          <p className="text-xs text-gray-500">Er staan nog geen logo’s in de merkkluis.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {logos.map((l) => (
                              <label key={l.id} className="flex items-center gap-2.5 text-sm">
                                <input type="checkbox" name="logoIds" value={l.id} defaultChecked={l.merkId === m.id} className="accent-jr-blue h-[18px] w-[18px]" />
                                <span>
                                  {l.title}
                                  {l.merkId && l.merkId !== m.id && <span className="text-xs text-gray-500"> (nu bij {merkNaam.get(l.merkId)})</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </fieldset>
                    </ActionForm>
                  </Paneel>
                  <ActionForm action={wisMerk} submitLabel="Verwijder" submitClassName={KLEIN} resetOnSuccess={false} meldGelukt={false} className="">
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="organizationId" value={organizationId} />
                    <input type="hidden" name="slug" value={slug} />
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Uitklap label="Merk toevoegen" className="mt-3">
          <ActionForm action={nieuwMerk} submitLabel="Toevoegen">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <Field label="Naam" name="naam" required placeholder="Create" />
            <TextArea label="Waar dit merk voor staat en wanneer het op een uiting hoort" name="omschrijving" rows={3} />
          </ActionForm>
        </Uitklap>
      </section>
    </div>
  )
}
