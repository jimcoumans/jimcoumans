import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { ActionForm, Field, Select, TextArea } from '@/components/ActionForm'
import { WebsiteTabs, StatusLabel } from '@/components/marketing/WebsiteKop'
import { marketingGebruiker } from '@/lib/marketing/toegang'
import { ENGINE_GROEPEN, ONDERWERP_TYPES, lijstBranches, lijstComponenten, lijstKlanten, lijstOnderwerpen, magMarketing, pakketActivaties } from '@/lib/marketing/registers'
import { alleContent, celStatus } from '@/lib/marketing/content'
import { ACTIVATIE_NAAM, GROEP_NAAM, ONDERWERP_NAAM } from '@/lib/marketing/velden'
import {
  bewaarBrancheActie,
  bewaarComponentActie,
  bewaarKlantActie,
  bewaarOnderwerpActie,
  laadKaderActie,
  verwijderBrancheActie,
  verwijderOnderwerpActie,
  wisselOnderwerpActie,
  zetActivatieActie,
} from '../../../marketing-actions'

/**
 * De centrale registers: onderwerpen, branches, de Performance Engine, de
 * activatie per pakket en de referentieklanten. Wat hier staat, is de bron voor
 * elke pagina. Alleen een beheerder wijzigt het; de rest van het team kijkt mee.
 */
export default async function Architectuur() {
  const user = await marketingGebruiker()
  const beheer = magMarketing(user.role, 'beheren')
  const [onderwerpen, branches, componenten, activaties, klanten, rijen] = await Promise.all([
    lijstOnderwerpen({ ookGearchiveerd: true }),
    lijstBranches({ ookInactief: true }),
    lijstComponenten(),
    pakketActivaties(),
    lijstKlanten(),
    alleContent(),
  ])
  const pakketten = onderwerpen.filter((o) => o.type === 'package' && o.lifecycleStatus === 'active')
  const algemeen = (id: string) => rijen.find((r) => r.soort === 'algemeen' && r.item.subjectId === id)
  const typeOpties = ONDERWERP_TYPES.map((t) => ({ value: t, label: ONDERWERP_NAAM[t] }))

  return (
    <AppShell user={user} actief="mkt-website">
      <PaginaKop titel="Architectuur" uitleg="De centrale registers. Een pagina hergebruikt deze gegevens; hij schrijft ze nooit over. Verwijderen kan alleen wat niemand gebruikt; archiveer de rest." />
      <WebsiteTabs actief="architectuur" />
      {!beheer && <p className="mb-6 text-sm text-gray-600">Alleen een beheerder wijzigt de registers. Je kunt alles bekijken.</p>}

      <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base">Onderwerpen en hun algemene pagina</h2>
        <p className="mb-4 text-xs text-gray-500">Diensten, pakketten, doelstellingen, de Engine en losse algemene pagina’s. Elk actief onderwerp krijgt één algemene pagina; die worden eerst afgerond.</p>
        {ONDERWERP_TYPES.map((t) => {
          const lijst = onderwerpen.filter((o) => o.type === t)
          return (
            <div key={t} className="mb-5">
              <h3 className="mb-2 text-sm text-gray-500">{ONDERWERP_NAAM[t]}</h3>
              {lijst.length === 0 ? <p className="text-sm text-gray-400">Nog niets.</p> : (
                <ul className="divide-y divide-gray-100 text-sm">
                  {lijst.map((o) => {
                    const a = algemeen(o.id)
                    return (
                      <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                        <span className={o.lifecycleStatus === 'archived' ? 'text-gray-400 line-through' : ''}>
                          {o.name} <span className="text-xs text-gray-400">/{o.slug}{o.demo ? ' · demo' : ''}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          {a ? <Link href={`/beheer/marketing/website/content/${a.item.id}`} className="text-xs"><StatusLabel status={celStatus(a.item, null)} /></Link> : <span className="text-xs text-gray-400">nog geen algemene pagina</span>}
                          {beheer && (
                            <details className="text-xs">
                              <summary className="text-jr-link cursor-pointer">Bewerken</summary>
                              <div className="mt-2 w-80 space-y-2">
                                <ActionForm action={bewaarOnderwerpActie} submitLabel="Opslaan" resetOnSuccess={false}>
                                  <input type="hidden" name="id" value={o.id} />
                                  <input type="hidden" name="type" value={o.type} />
                                  <Field label="Naam" name="name" required defaultValue={o.name} />
                                  <Field label="Slug" name="slug" required defaultValue={o.slug} />
                                  <TextArea label="Omschrijving" name="description" rows={2} defaultValue={o.description ?? ''} />
                                  <Field label="Volgorde" name="sortOrder" type="number" defaultValue={String(o.sortOrder)} />
                                </ActionForm>
                                <ActionForm action={wisselOnderwerpActie} submitLabel={o.lifecycleStatus === 'archived' ? 'Terugzetten' : 'Archiveren'} meldGelukt={false} bevestig={false} submitClassName="border border-gray-300 text-gray-700">
                                  <input type="hidden" name="id" value={o.id} />
                                  <input type="hidden" name="actief" value={o.lifecycleStatus === 'archived' ? '1' : '0'} />
                                </ActionForm>
                                <ActionForm action={verwijderOnderwerpActie} submitLabel="Verwijderen" meldGelukt={false} submitClassName="border border-gray-300 text-gray-700">
                                  <input type="hidden" name="id" value={o.id} />
                                </ActionForm>
                              </div>
                            </details>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
        {beheer && (
          <details className="mt-2">
            <summary className="text-jr-link cursor-pointer text-sm">+ Onderwerp toevoegen</summary>
            <div className="mt-3 max-w-md">
              <ActionForm action={bewaarOnderwerpActie} submitLabel="Toevoegen">
                <Select label="Soort" name="type" options={typeOpties} />
                <Field label="Naam" name="name" required placeholder="Bijvoorbeeld: Google Ads" />
                <Field label="Slug" name="slug" hint="Leeg: wordt gemaakt uit de naam." />
                <TextArea label="Omschrijving" name="description" rows={2} />
              </ActionForm>
            </div>
          </details>
        )}
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="h-fit rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Branches</h2>
          <p className="mb-4 text-xs text-gray-500">De doelgroepcontext, geen pakketkeuze. Inactief = geen kolom in de matrix.</p>
          <ul className="mb-3 divide-y divide-gray-100 text-sm">
            {branches.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span className={b.active ? '' : 'text-gray-400'}>{b.name} <span className="text-xs text-gray-400">/{b.slug} · prioriteit {b.priority}{b.active ? '' : ' · inactief'}{b.demo ? ' · demo' : ''}</span></span>
                {beheer && (
                  <details className="text-xs">
                    <summary className="text-jr-link cursor-pointer">Bewerken</summary>
                    <div className="mt-2 w-72 space-y-2">
                      <ActionForm action={bewaarBrancheActie} submitLabel="Opslaan" resetOnSuccess={false}>
                        <input type="hidden" name="id" value={b.id} />
                        <Field label="Naam" name="name" required defaultValue={b.name} />
                        <Field label="Slug" name="slug" required defaultValue={b.slug} />
                        <TextArea label="Omschrijving" name="description" rows={2} defaultValue={b.description ?? ''} />
                        <Field label="Prioriteit" name="priority" type="number" defaultValue={String(b.priority)} hint="Hoger staat eerder in de matrix." />
                        <Select label="Actief" name="active" defaultValue={b.active ? '1' : '0'} options={[{ value: '1', label: 'Actief' }, { value: '0', label: 'Inactief' }]} />
                      </ActionForm>
                      <ActionForm action={verwijderBrancheActie} submitLabel="Verwijderen" meldGelukt={false} submitClassName="border border-gray-300 text-gray-700">
                        <input type="hidden" name="id" value={b.id} />
                      </ActionForm>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
          {beheer && (
            <details>
              <summary className="text-jr-link cursor-pointer text-sm">+ Branche toevoegen</summary>
              <div className="mt-3">
                <ActionForm action={bewaarBrancheActie} submitLabel="Toevoegen">
                  <Field label="Naam" name="name" required placeholder="Bijvoorbeeld: Advocatuur" />
                  <Field label="Prioriteit" name="priority" type="number" />
                </ActionForm>
              </div>
            </details>
          )}
        </section>

        <section className="h-fit rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Referentieklanten</h2>
          <p className="mb-4 text-xs text-gray-500">Voor cases en reviews. Zonder toestemming gaat klantbewijs niet mee in een export.</p>
          <ul className="mb-3 divide-y divide-gray-100 text-sm">
            {klanten.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>{k.name} <span className="text-xs text-gray-400">· toestemming {k.publicPermissionStatus === 'granted' ? 'ja' : k.publicPermissionStatus === 'denied' ? 'nee' : 'onbekend'} · {k.industryIds.map((i) => branches.find((b) => b.id === i)?.name).filter(Boolean).join(', ') || 'geen branche'}</span></span>
                {beheer && (
                  <details className="text-xs">
                    <summary className="text-jr-link cursor-pointer">Bewerken</summary>
                    <div className="mt-2 w-72">
                      <ActionForm action={bewaarKlantActie} submitLabel="Opslaan" resetOnSuccess={false}>
                        <input type="hidden" name="id" value={k.id} />
                        <Field label="Naam" name="name" required defaultValue={k.name} />
                        <TextArea label="Publieke omschrijving" name="publicDescription" rows={2} defaultValue={k.publicDescription ?? ''} />
                        <Select label="Publicatietoestemming" name="permission" defaultValue={k.publicPermissionStatus} options={[{ value: 'unknown', label: 'Onbekend' }, { value: 'granted', label: 'Ja, schriftelijk' }, { value: 'denied', label: 'Nee' }]} />
                        <fieldset className="space-y-1"><legend className="mb-1 text-[13px] font-medium">Branches</legend>
                          {branches.map((b) => (<label key={b.id} className="flex items-center gap-2"><input type="checkbox" name="industryIds" value={b.id} defaultChecked={k.industryIds.includes(b.id)} /> {b.name}</label>))}
                        </fieldset>
                      </ActionForm>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
          {beheer && (
            <details>
              <summary className="text-jr-link cursor-pointer text-sm">+ Referentieklant toevoegen</summary>
              <div className="mt-3">
                <ActionForm action={bewaarKlantActie} submitLabel="Toevoegen">
                  <Field label="Naam" name="name" required />
                  <Select label="Publicatietoestemming" name="permission" options={[{ value: 'unknown', label: 'Onbekend' }, { value: 'granted', label: 'Ja, schriftelijk' }, { value: 'denied', label: 'Nee' }]} />
                  <fieldset className="space-y-1 text-sm"><legend className="mb-1 text-[13px] font-medium">Branches</legend>
                    {branches.map((b) => (<label key={b.id} className="flex items-center gap-2"><input type="checkbox" name="industryIds" value={b.id} /> {b.name}</label>))}
                  </fieldset>
                </ActionForm>
              </div>
            </details>
          )}
        </section>
      </div>

      <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base">Performance Engine</h2>
        <p className="mb-4 text-xs text-gray-500">Eén model voor iedereen. Pakketten zijn configuraties van deze Engine, nooit een eigen model per branche of pakket.</p>
        {componenten.length === 0 && beheer && (
          <div className="mb-4 rounded-lg bg-[#EDF5FF] p-4 text-sm">
            <p className="mb-2">Nog geen onderdelen. Je kunt beginnen met het voorlopige begrippenkader uit de opdracht (Direction, Core drivers, Fuel, Booster, Integrated optimisers, Intelligence, Infrastructure) en het daarna aanpassen.</p>
            <ActionForm action={laadKaderActie} submitLabel="Voorlopig kader laden" meldGelukt={false} bevestig={false}><span /></ActionForm>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ENGINE_GROEPEN.map((g) => (
            <div key={g} className="rounded-lg border border-gray-200 p-3">
              <h3 className="mb-2 text-sm">{GROEP_NAAM[g]}</h3>
              <ul className="space-y-1 text-sm">
                {componenten.filter((c) => c.group === g).map((c) => (
                  <li key={c.id} className={c.active ? '' : 'text-gray-400 line-through'}>
                    {beheer ? (
                      <details className="text-sm">
                        <summary className="cursor-pointer">{c.name}</summary>
                        <div className="mt-2">
                          <ActionForm action={bewaarComponentActie} submitLabel="Opslaan" resetOnSuccess={false}>
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="group" value={c.group} />
                            <Field label="Naam" name="name" required defaultValue={c.name} />
                            <TextArea label="Omschrijving" name="description" rows={2} defaultValue={c.description ?? ''} />
                            <Select label="Actief" name="active" defaultValue={c.active ? '1' : '0'} options={[{ value: '1', label: 'Actief' }, { value: '0', label: 'Inactief' }]} />
                          </ActionForm>
                        </div>
                      </details>
                    ) : c.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {beheer && (
          <details className="mt-4">
            <summary className="text-jr-link cursor-pointer text-sm">+ Onderdeel toevoegen</summary>
            <div className="mt-3 max-w-md">
              <ActionForm action={bewaarComponentActie} submitLabel="Toevoegen">
                <Select label="Groep" name="group" options={ENGINE_GROEPEN.map((g) => ({ value: g, label: GROEP_NAAM[g] }))} />
                <Field label="Naam" name="name" required />
                <TextArea label="Omschrijving" name="description" rows={2} />
              </ActionForm>
            </div>
          </details>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base">Pakketconfiguratie</h2>
        <p className="mb-4 text-xs text-gray-500">Per pakket per onderdeel: altijd, optioneel, uit of nog te bepalen. Voorlopig en bewerkbaar; prijzen staan hier bewust niet.</p>
        {pakketten.length === 0 || componenten.length === 0 ? (
          <p className="text-sm text-gray-600">Voeg eerst pakketten (onderwerpen van de soort Pakket) en Engine-onderdelen toe.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="pb-2 pr-4 font-normal">Onderdeel</th>
                  {pakketten.map((p) => (<th key={p.id} className="pb-2 pr-4 font-normal">{p.name}</th>))}
                </tr>
              </thead>
              <tbody>
                {componenten.filter((c) => c.active).map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 align-top">
                    <td className="py-2 pr-4">{c.name} <span className="text-xs text-gray-400">· {GROEP_NAAM[c.group]}</span></td>
                    {pakketten.map((p) => {
                      const a = activaties.find((x) => x.packageSubjectId === p.id && x.componentId === c.id)?.activation ?? 'undecided'
                      return (
                        <td key={p.id} className="py-2 pr-4">
                          {beheer ? (
                            <ActionForm action={zetActivatieActie} submitLabel="Zet" meldGelukt={false} bevestig={false} resetOnSuccess={false} className="flex items-center gap-2" submitClassName="border border-gray-300 text-gray-700">
                              <input type="hidden" name="packageId" value={p.id} />
                              <input type="hidden" name="componentId" value={c.id} />
                              <select name="activation" defaultValue={a} aria-label={`${c.name} in ${p.name}`} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
                                {(['always', 'optional', 'off', 'undecided'] as const).map((k) => (<option key={k} value={k}>{ACTIVATIE_NAAM[k]}</option>))}
                              </select>
                            </ActionForm>
                          ) : ACTIVATIE_NAAM[a]}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  )
}
