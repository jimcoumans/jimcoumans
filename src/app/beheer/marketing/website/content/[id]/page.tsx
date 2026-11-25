import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select, TextArea } from '@/components/ActionForm'
import { WebsiteTabs, StatusLabel } from '@/components/marketing/WebsiteKop'
import { marketingGebruiker } from '@/lib/marketing/toegang'
import { bewijsVoor, celStatus, haalContent, opmerkingenEnRevisies, valideer, voortgang, type VeldStaat } from '@/lib/marketing/content'
import { lijstBranches, lijstComponenten, lijstKlanten, lijstOnderwerpen, magMarketing, pakketActivaties } from '@/lib/marketing/registers'
import { ACTIVATIE_NAAM, GROEP_NAAM, ONDERWERP_NAAM, PUBLICATIE_NAAM, SOORT_NAAM, WORKFLOW_NAAM, toegestaneModi } from '@/lib/marketing/velden'
import { lijstOpstellers } from '@/lib/voorstellen'
import { formatDate } from '@/lib/dates'
import { assetActie, bewaarGegevensActie, bewaarKoppelingenActie, bewaarVeldenActie, opmerkingActie, publicatieActie, workflowActie } from '../../../../marketing-actions'

/**
 * De editor van één stuk content. Links de velden van de paginasoort, met bij
 * een variant de algemene bron ernaast; rechts de workflow, publicatie,
 * koppelingen, bewijs, beeld, opmerkingen en revisies. De Performance Engine
 * en de pakketconfiguratie komen uit de registers en zijn hier niet te wijzigen.
 */
const MODUS_NAAM = { override: 'Eigen tekst', inherit: 'Overnemen van algemeen', hidden: 'Verbergen' } as const
const HERKOMST = { eigen: 'eigen tekst', bron: 'uit de algemene pagina', verborgen: 'bewust verborgen', leeg: 'leeg' } as const

function VeldBlok({ v, soort }: { v: VeldStaat; soort: Parameters<typeof toegestaneModi>[0] }) {
  const modi = toegestaneModi(soort, v.veld)
  const isVariant = v.bron !== null
  return (
    <div className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={`v-${v.veld.sleutel}`} className="text-[13px] font-medium">
          {v.veld.label}
          {v.veld.verplicht && <span className="ml-2 text-xs font-normal text-gray-500">verplicht</span>}
          {isVariant && v.veld.uniek && <span className="ml-2 text-xs font-normal text-gray-500">uniek in variant</span>}
        </label>
        <span className={`text-xs ${v.herkomst === 'leeg' && v.veld.verplicht ? 'text-[#B42318]' : 'text-gray-500'}`}>
          {HERKOMST[v.herkomst]}{v.gelijkAanBron ? ' · gelijk aan de bron' : ''}
        </span>
      </div>
      {v.veld.uitleg && <p className="mb-1 text-xs text-gray-500">{v.veld.uitleg}</p>}
      {modi.length > 1 ? (
        <select name={`modus__${v.veld.sleutel}`} defaultValue={v.modus} aria-label={`Modus ${v.veld.label}`} className="mb-2 rounded-md border border-gray-300 px-2 py-1 text-xs">
          {modi.map((m) => (<option key={m} value={m}>{MODUS_NAAM[m]}</option>))}
        </select>
      ) : <input type="hidden" name={`modus__${v.veld.sleutel}`} value={modi[0]} />}
      <div className={isVariant ? 'grid gap-3 lg:grid-cols-2' : ''}>
        {v.veld.sleutel === 'indexeerbaar' ? (
          <select id={`v-${v.veld.sleutel}`} name={`waarde__${v.veld.sleutel}`} defaultValue={/^n(ee)?$/i.test(v.eigen.trim()) ? 'nee' : v.eigen.trim() ? 'ja' : ''} className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-[15px]">
            <option value="">Ja (standaard)</option>
            <option value="ja">Ja</option>
            <option value="nee">Nee</option>
          </select>
        ) : (
        <textarea id={`v-${v.veld.sleutel}`} name={`waarde__${v.veld.sleutel}`} defaultValue={v.eigen} rows={v.veld.regels ?? 1} placeholder={v.modus === 'inherit' ? 'Wordt overgenomen; schrijf hier alleen als je eigen tekst wilt' : ''} className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-[15px]" />
        )}
        {isVariant && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            <p className="mb-1 text-xs text-gray-400">Algemene bron</p>
            <p className="whitespace-pre-wrap">{v.bron || <span className="text-gray-400">leeg</span>}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function ContentEditor({ params }: { params: Promise<{ id: string }> }) {
  const user = await marketingGebruiker()
  const { id } = await params
  const d = await haalContent(id)
  if (!d) notFound()
  const beoordelen = magMarketing(user.role, 'beoordelen')
  const [{ opmerkingen, revisies }, onderwerpen, branches, klanten, collega, v] = await Promise.all([
    opmerkingenEnRevisies(id),
    lijstOnderwerpen(),
    lijstBranches(),
    lijstKlanten(),
    lijstOpstellers(),
    voortgang(),
  ])
  const val = valideer(d)
  const isPagina = d.item.contentKind === 'page'
  const bewijs = isPagina ? await bewijsVoor({ subjectId: d.item.subjectId, industryId: d.item.industryId }) : []
  const toonEngine = d.onderwerp?.type === 'engine' || d.onderwerp?.type === 'package'
  const [componenten, activaties] = toonEngine ? await Promise.all([lijstComponenten(), pakketActivaties()]) : [[], []]
  const archief = d.item.workflowStatus === 'archived'
  const status = celStatus(d.item, null)
  const stap = (naam: string, label: string, opties?: { note?: boolean; klasse?: string }) => (
    <ActionForm action={workflowActie} submitLabel={label} meldGelukt={false} bevestig={naam === 'archiveren'} submitClassName={opties?.klasse}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stap" value={naam} />
      {opties?.note && <TextArea label="Toelichting" name="note" rows={2} required={naam === 'terugsturen'} />}
    </ActionForm>
  )

  return (
    <AppShell user={user} actief="mkt-website">
      <p className="mb-2 text-sm"><Link href="/beheer/marketing/website/content" className="text-jr-link">← Content</Link></p>
      <header className="mb-4">
        <h1 className="text-[28px]">{d.item.title}{d.item.demo && <span className="ml-3 align-middle text-sm text-gray-400">demo</span>}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {SOORT_NAAM[d.soort]}
          {d.onderwerp && <> · {ONDERWERP_NAAM[d.onderwerp.type]}: {d.onderwerp.name}</>}
          {d.branche && <> · Branche: {d.branche.name}</>}
          {d.bron && <> · bron: <Link href={`/beheer/marketing/website/content/${d.bron.id}`} className="text-jr-link">{d.bron.title}</Link> ({WORKFLOW_NAAM[d.bron.workflowStatus].toLowerCase()})</>}
        </p>
        <p className="mt-2 flex flex-wrap gap-4 text-sm">
          {archief ? <span>Gearchiveerd</span> : <StatusLabel status={status} />}
          <span className="text-gray-600">{PUBLICATIE_NAAM[d.item.publicationStatus]}</span>
          <span className="text-gray-600">{val.volledig}% van de verplichte velden</span>
        </p>
      </header>
      <WebsiteTabs actief="content" />

      {d.soort === 'variant' && !v.algemeneFaseKlaar && (
        <p className="mb-4 rounded-xl bg-[#FFF6E5] p-4 text-sm text-[#7A4A00]">De algemene fase is nog niet afgerond. Deze variant kun je voorbereiden; goedkeuren kan pas als zijn algemene bron is goedgekeurd.</p>
      )}
      {d.item.needsReview && <p className="mb-4 rounded-xl bg-[#FDECEC] p-4 text-sm text-[#B42318]">Herbeoordeling nodig: een veld dat deze variant overneemt, is in de algemene bron gewijzigd. De gepubliceerde tekst is niet aangepast.</p>}
      {val.fouten.length > 0 && !archief && (
        <div className="mb-4 rounded-xl bg-white p-4 text-sm shadow-sm">
          <p className="mb-1 text-gray-700">Nog niet klaar voor goedkeuring</p>
          <ul className="list-disc pl-5 text-gray-600">{val.fouten.map((f) => (<li key={f}>{f}</li>))}</ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Velden</h2>
            <p className="mb-4 text-xs text-gray-500">
              {d.soort === 'variant' ? 'Per veld: overnemen van de algemene pagina, eigen tekst, of bewust verbergen. Rechts staat de huidige bron.' : 'De vaste velden van deze soort.'} Een goedgekeurde tekst bewerken maakt er weer een concept van.
            </p>
            {archief ? (
              <div className="space-y-3 text-sm">{d.velden.map((x) => (<p key={x.veld.sleutel}><span className="text-gray-500">{x.veld.label}: </span>{x.effectief || '–'}</p>))}</div>
            ) : (
              <ActionForm action={bewaarVeldenActie} submitLabel="Opslaan" resetOnSuccess={false} className="space-y-4">
                <input type="hidden" name="id" value={id} />
                {d.velden.map((x) => (<VeldBlok key={x.veld.sleutel} v={x} soort={d.soort} />))}
              </ActionForm>
            )}
          </section>

          {toonEngine && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base">Performance Engine</h2>
              <p className="mb-3 text-xs text-gray-500">Centrale data uit Architectuur. Hier niet te wijzigen.</p>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {componenten.filter((c) => c.active).map((c) => {
                  const a = d.onderwerp?.type === 'package' ? activaties.find((x) => x.packageSubjectId === d.onderwerp!.id && x.componentId === c.id)?.activation ?? 'undecided' : null
                  return (<li key={c.id}><span className="text-gray-500">{GROEP_NAAM[c.group]}:</span> {c.name}{a && <span className="text-gray-500"> · {ACTIVATIE_NAAM[a]}</span>}</li>)
                })}
              </ul>
            </section>
          )}

          <details className="rounded-xl bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-base">Voorbeeld van de effectieve tekst</summary>
            <div className="mt-4 space-y-4 text-sm">
              {d.velden.filter((x) => x.herkomst !== 'verborgen').map((x) => (
                <div key={x.veld.sleutel}><p className="text-xs text-gray-400">{x.veld.label} · {HERKOMST[x.herkomst]}</p><p className="whitespace-pre-wrap">{x.effectief || '–'}</p></div>
              ))}
            </div>
          </details>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base">Opmerkingen</h2>
            <ActionForm action={opmerkingActie} submitLabel="Plaatsen">
              <input type="hidden" name="id" value={id} />
              <TextArea label="Opmerking" name="body" rows={2} required />
            </ActionForm>
            <ul className="mt-4 space-y-3 text-sm">
              {opmerkingen.map(({ c, naam }) => (<li key={c.id}><p className="text-xs text-gray-500">{naam ?? 'Onbekend'} · {formatDate(c.createdAt)}</p><p className="whitespace-pre-wrap">{c.body}</p></li>))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Workflow</h2>
            {archief ? <p className="text-sm text-gray-600">Gearchiveerd. De revisies blijven bewaard.</p> : (
              <div className="space-y-3">
                {(d.item.workflowStatus === 'draft' || (d.item.workflowStatus === 'approved' && d.item.needsReview)) && stap('indienen', 'Aanbieden voor review', { note: true })}
                {d.item.workflowStatus === 'in_review' && beoordelen && stap('goedkeuren', 'Goedkeuren', { note: true })}
                {d.item.workflowStatus === 'in_review' && beoordelen && stap('terugsturen', 'Terugsturen', { note: true, klasse: 'border border-gray-300 text-gray-700' })}
                {d.item.workflowStatus === 'in_review' && !beoordelen && <p className="text-sm text-gray-600">Staat in review. Een beheerder keurt goed of stuurt terug.</p>}
                {beoordelen && stap('archiveren', 'Archiveren', { klasse: 'border border-gray-300 text-gray-700' })}
              </div>
            )}
          </section>

          {beoordelen && !archief && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Publicatie</h2>
              <p className="mb-3 text-xs text-gray-500">Met de hand in WordPress gezet? Leg het hier vast. Er gaat niets automatisch naar WordPress.</p>
              {d.item.approvedRevisionId ? (
                <ActionForm action={publicatieActie} submitLabel="Publicatie vastleggen" resetOnSuccess={false}>
                  <input type="hidden" name="id" value={id} />
                  <Field label="URL" name="targetUrl" required defaultValue={d.item.targetUrl ?? ''} placeholder="/diensten/google-ads/" />
                  <Field label="WordPress-ID" name="externalId" defaultValue={d.item.wordpressExternalId ?? ''} />
                  <Field label="Datum" name="datum" type="date" />
                </ActionForm>
              ) : <p className="text-sm text-gray-600">Eerst goedkeuren.</p>}
              {d.item.publicationStatus === 'published' && <div className="mt-3">{stap('terugtrekken', 'Als teruggetrokken markeren', { klasse: 'border border-gray-300 text-gray-700' })}</div>}
            </section>
          )}

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Gegevens</h2>
            <ActionForm action={bewaarGegevensActie} submitLabel="Opslaan" resetOnSuccess={false}>
              <input type="hidden" name="id" value={id} />
              <Field label="Titel" name="title" required defaultValue={d.item.title} />
              <Field label="Slug" name="slug" defaultValue={d.item.slug ?? ''} />
              <Field label="Doel-URL" name="targetUrl" defaultValue={d.item.targetUrl ?? ''} placeholder="/branches/advocatuur/diensten/google-ads/" />
              <Select label="Eigenaar" name="ownerId" defaultValue={d.item.ownerId ?? ''} options={[{ value: '', label: 'Niemand' }, ...collega.map((c) => ({ value: c.id, label: c.naam }))]} />
            </ActionForm>
            <p className="mt-3 flex gap-3 text-sm">
              <a href={`/api/marketing/content/${id}?format=md`} className="text-jr-link">Markdown</a>
              <a href={`/api/marketing/content/${id}?format=json`} className="text-jr-link">JSON</a>
            </p>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-base">Geldt ook voor</h2>
            <p className="mb-3 text-xs text-gray-500">{isPagina ? 'Aanvullende relevantie. De primaire context hierboven verandert niet.' : 'Waar dit bewijs bij hoort. In een context verschijnt het als het aan het onderwerp én de branche hangt.'}</p>
            <ActionForm action={bewaarKoppelingenActie} submitLabel="Opslaan" resetOnSuccess={false}>
              <input type="hidden" name="id" value={id} />
              <fieldset className="space-y-1 text-sm"><legend className="mb-1 text-[13px] font-medium">Onderwerpen</legend>
                {onderwerpen.map((o) => (<label key={o.id} className="flex items-center gap-2"><input type="checkbox" name="subjectIds" value={o.id} defaultChecked={d.koppelingen.subjectIds.includes(o.id)} /> <span className="text-gray-500">{ONDERWERP_NAAM[o.type]}:</span> {o.name}</label>))}
              </fieldset>
              <fieldset className="space-y-1 text-sm"><legend className="mb-1 text-[13px] font-medium">Branches</legend>
                {branches.map((b) => (<label key={b.id} className="flex items-center gap-2"><input type="checkbox" name="industryIds" value={b.id} defaultChecked={d.koppelingen.industryIds.includes(b.id)} /> {b.name}</label>))}
              </fieldset>
              <fieldset className="space-y-1 text-sm"><legend className="mb-1 text-[13px] font-medium">Klanten</legend>
                {klanten.map((k) => (<label key={k.id} className="flex items-center gap-2"><input type="checkbox" name="clientIds" value={k.id} defaultChecked={d.koppelingen.clientIds.includes(k.id)} /> {k.name}{k.publicPermissionStatus !== 'granted' && <span className="text-xs text-[#94590A]">geen toestemming</span>}</label>))}
              </fieldset>
            </ActionForm>
          </section>

          {isPagina && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Bewijs in deze context</h2>
              <p className="mb-3 text-xs text-gray-500">Cases, reviews, FAQ’s en insights die aan {[d.onderwerp?.name, d.branche?.name].filter(Boolean).join(' én ')} hangen.</p>
              {bewijs.length === 0 ? <p className="text-sm text-[#94590A]">Nog geen bewijs. Dat is een aandachtspunt, geen reden om het te verzinnen.</p> : (
                <ul className="space-y-2 text-sm">
                  {bewijs.map((b) => (
                    <li key={b.item.id}>
                      <Link href={`/beheer/marketing/website/content/${b.item.id}`} className="text-jr-link">{b.item.title}</Link>
                      <span className="text-xs text-gray-500"> · {SOORT_NAAM[b.item.contentKind as 'case']}{b.brancheHerkomst === 'afgeleid' ? ' · branche via de klant' : b.brancheHerkomst === 'direct' ? ' · direct gekoppeld' : ''}{b.klanten.some((k) => k.toestemming !== 'granted') ? ' · geen toestemming: niet in export' : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Beeld</h2>
            <ul className="mb-3 space-y-2 text-sm">
              {d.assets.map(({ asset, link }) => (
                <li key={asset.id} className="flex items-start justify-between gap-2">
                  <span className="min-w-0 break-words">{link.role}: {asset.storageReference}<span className="block text-xs text-gray-500">alt: {asset.altText || '–'} · rechten {asset.rightsStatus === 'granted' ? 'ja' : asset.rightsStatus === 'denied' ? 'nee' : 'onbekend'}</span></span>
                  <ActionForm action={assetActie} submitLabel="Weghalen" meldGelukt={false} submitClassName="border border-gray-300 text-gray-700">
                    <input type="hidden" name="id" value={id} /><input type="hidden" name="ontkoppel" value={asset.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
            <details>
              <summary className="text-jr-link cursor-pointer text-sm">+ Beeld toevoegen</summary>
              <div className="mt-3">
                <ActionForm action={assetActie} submitLabel="Toevoegen">
                  <input type="hidden" name="id" value={id} />
                  <Field label="Waar staat het" name="storageReference" required placeholder="Link naar Kive of de bestandsnaam" />
                  <Field label="Alttekst" name="altText" />
                  <Field label="Rol" name="role" placeholder="hero, sfeer, logo" />
                  <Select label="Beeldrechten" name="rightsStatus" options={[{ value: 'unknown', label: 'Onbekend' }, { value: 'granted', label: 'In orde' }, { value: 'denied', label: 'Niet toegestaan' }]} />
                </ActionForm>
              </div>
            </details>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base">Revisies</h2>
            {revisies.length === 0 ? <p className="text-sm text-gray-600">Nog geen vastgelegde versies.</p> : (
              <ul className="space-y-1 text-sm">
                {revisies.map(({ r, naam }) => (
                  <li key={r.id}>
                    {({ concept: 'Concept', review: 'Aangeboden voor review', approved: 'Goedgekeurd', published: 'Gepubliceerd', archived: 'Gearchiveerd' } as const)[r.kind]}
                    <span className="text-xs text-gray-500"> · {naam ?? 'Onbekend'} · {formatDate(r.createdAt)}{r.id === d.item.approvedRevisionId ? ' · huidige goedgekeurde' : ''}{r.id === d.item.publishedRevisionId ? ' · gepubliceerd' : ''}</span>
                    {r.changeNote && <span className="block text-xs text-gray-600">{r.changeNote}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
