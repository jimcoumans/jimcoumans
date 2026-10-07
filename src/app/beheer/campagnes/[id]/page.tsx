import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import {
  getCampagne,
  listDoelgroepen,
  listTeam,
  gewijzigdSindsVersie,
  STATUS_LABELS,
  STATUS_STIJL,
  KANAAL_SOORTEN,
  TIJDLIJN_OMSCHRIJVINGEN,
} from '@/lib/campagnes'
import { listContacts } from '@/lib/crm'
import { AppShell } from '@/components/AppShell'
import { Regel } from '@/components/Regel'
import { ActionForm, Field, Uitklap } from '@/components/ActionForm'
import { HypotheseWeergave, budgetTekst, budgetBereik, omzetBereik, euro, versieLabel, LEEG } from '@/components/CampagneBriefing'
import {
  doelgroepInCampagne,
  kiesDoelgroepen,
  haalDoelgroepWeg,
  bewerkDoelgroep,
  verstuurVoorstel,
  klantAkkoord,
  naarClickUp,
  terugNaarConcept,
  rondAf,
  wisCampagne,
  draaiVerwerkingTerugActie,
} from '../../campagne-actions'
import { listVerwerkingen, type VerwerkingWeergave } from '@/lib/campagne-verwerken'
import { FeedbackVerwerken } from '@/components/FeedbackVerwerken'
import { PdfDownload } from '@/components/PdfDownload'
import { BriefingEditor } from '@/components/briefing/BriefingEditor'
import { Kaart } from '@/components/briefing/Kaart'
import { EerstOpslaan, OpslaanLink } from '@/components/briefing/opslaan'
import { conceptVan } from '@/lib/briefing-concept'
import { formatAantal } from '@/lib/hypothese'
import { formatDate, formatDateLong } from '@/lib/dates'

export const maxDuration = 26

/* Vaste namen voor wie iets doet, naast de collega's zelf. */
const ROLLEN = ['Campagne', 'Content', 'Content en techniek', 'Campagne en techniek', 'Klant']

const KNOP_OPSLAAN = 'bg-jr-btn hover:bg-jr-btnhover text-white'
const KNOP_RUSTIG = 'border border-gray-300 text-gray-700 hover:bg-gray-50'
const KNOP_KLEIN = 'text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs'

export default async function CampagnePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const v = await getCampagne(id)
  if (!v) notFound()

  const c = v.campagne
  const org = v.organisatie
  const [team, contacten, doelgroepen, verwerkingen] = await Promise.all([
    listTeam(),
    listContacts(org.id),
    listDoelgroepen(org.id),
    listVerwerkingen(id),
  ])
  const verwerkingLoopt = verwerkingen.some((r) => (r.status === 'wacht' || r.status === 'bezig') && !r.vastgelopen)

  const gewijzigd = gewijzigdSindsVersie(v)
  const verborgen = <input type="hidden" name="campaignId" value={c.id} />
  const gekozenDoelgroepen = new Set(v.doelgroepen.map((d) => d.id))
  const beschikbareDoelgroepen = doelgroepen.filter((d) => !gekozenDoelgroepen.has(d.id))
  const wieOpties = [
    { value: '', label: LEEG },
    ...team.map((t) => ({ value: `user:${t.id}`, label: t.name ?? t.email })),
    ...ROLLEN.map((r) => ({ value: `label:${r}`, label: r })),
  ]

  return (
    <AppShell user={user} actief="campagnes">
      <a href="/beheer/campagnes" className="hover:text-jr-blue mb-4 inline-block text-xs text-gray-500">
        &larr; Alle campagnes
      </a>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Campagnebriefing</p>
          <h1 className="text-[28px] sm:text-[32px]">{c.title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            <a href={`/beheer/klanten/${org.slug}`} className="hover:text-jr-blue">
              {org.name}
            </a>
            {c.startOn && c.endOn && (
              <>
                {' '}
                &middot; {formatDate(c.startOn)} – {formatDate(c.endOn)}
              </>
            )}
            {c.version > 0 && <> &middot; versie {versieLabel(c.version)}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OpslaanLink href={`/beheer/campagnes/${c.id}/briefing`} className="text-jr-blue text-sm hover:underline">
            Bekijk de briefing
          </OpslaanLink>
          <span className={`rounded-full px-3 py-1 text-xs ${STATUS_STIJL[c.status]}`}>{STATUS_LABELS[c.status]}</span>
        </div>
      </div>

      {/* Bovenaan: waar staat hij, wat levert hij op, welke versies. */}
      <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_1fr_1fr]">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Status</h2>
          <p className="mb-3 text-sm text-gray-600">
            {c.status === 'concept' && 'In te vullen. Klaar? Verstuur hem als voorstel.'}
            {c.status === 'voorstel' && 'Ligt bij de klant. Akkoord? Dan zet het portaal de tijdlijn in ClickUp.'}
            {c.status === 'akkoord' && 'Akkoord. Het team werkt vanuit ClickUp.'}
            {c.status === 'afgerond' && 'Afgerond. Blijft als historie op de klantkaart.'}
          </p>
          {gewijzigd && (
            <p className="border-jr-orange bg-jr-orange/10 mb-3 rounded border-l-4 p-2.5 text-xs">
              Gewijzigd sinds versie {versieLabel(c.version)}. Verstuur een nieuwe versie zodat de klant ziet wat er nu staat.
            </p>
          )}
          {c.proposalFields.length > 0 && c.status !== 'akkoord' && (
            <p className="mb-3 text-xs text-gray-600">
              {c.proposalFields.length} {c.proposalFields.length === 1 ? 'veld staat' : 'velden staan'} als voorstel.
            </p>
          )}

          <EerstOpslaan className="space-y-2">
            {(c.status === 'concept' || ((c.status === 'voorstel' || c.status === 'akkoord') && gewijzigd)) && (
              <StatusKnop
                action={verstuurVoorstel}
                campaignId={c.id}
                label={c.version === 0 ? 'Verstuur als voorstel' : 'Verstuur als nieuwe versie'}
                primair
              />
            )}
            {c.status === 'voorstel' && (
              <StatusKnop action={klantAkkoord} campaignId={c.id} label="Klant is akkoord" primair={!gewijzigd} />
            )}
            {c.status === 'akkoord' && <StatusKnop action={rondAf} campaignId={c.id} label="Rond af" />}
            {(c.status === 'voorstel' || c.status === 'afgerond') && (
              <StatusKnop action={terugNaarConcept} campaignId={c.id} label="Terug naar concept" />
            )}
          </EerstOpslaan>

          {c.status === 'akkoord' && !c.clickupTaskId && (
            <div className="border-jr-orange bg-jr-orange/10 mt-3 rounded border-l-4 p-2.5 text-xs">
              <p className="mb-2">De tijdlijn staat nog niet in ClickUp.</p>
              <EerstOpslaan>
                <StatusKnop action={naarClickUp} campaignId={c.id} label="Zet in ClickUp" />
              </EerstOpslaan>
            </div>
          )}
          {c.clickupTaskId && (
            <p className="mt-3 text-xs">
              <a
                href={`https://app.clickup.com/t/${c.clickupTaskId}`}
                className="text-jr-blue hover:underline"
                rel="noreferrer noopener"
                target="_blank"
              >
                Open de taak in ClickUp
              </a>
            </p>
          )}

          <div className="mt-4 border-t border-gray-100 pt-3">
            <OpslaanLink href={`/beheer/campagnes/${c.id}/briefing`} className="text-jr-blue text-sm hover:underline">
              Bekijk de briefing zoals de klant hem krijgt
            </OpslaanLink>
            <div className="mt-3">
              <PdfDownload href={`/api/campagnes/${c.id}/pdf`} rustig />
            </div>
          </div>
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base">In het kort</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Kerngetal label="Doel" waarde={v.doelEenheden > 0 ? formatAantal(v.doelEenheden) : null} />
            <Kerngetal label="Omzet" waarde={v.omzetCents > 0 ? euro(v.omzetCents) : null} />
            <Kerngetal
              label={c.budgetMode === 'vast' ? 'Vast budget' : 'Advies budget'}
              waarde={v.hypothese.ok ? budgetBereik(v.hypothese.hypothese) : null}
              blauw
            />
            <Kerngetal
              label="Deel van de omzet"
              waarde={
                v.hypothese.ok ? omzetBereik(v.hypothese.hypothese) : null
              }
            />
          </dl>
          <p className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-600">
            Marketingmanager: <span className="text-jr-text">{v.marketingmanager?.name ?? LEEG}</span>
          </p>
        </section>
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-base">Versies</h2>
          {v.versies.length === 0 ? (
            <p className="text-sm text-gray-500">Nog niet verstuurd.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {v.versies.map((ver) => (
                <li key={`${ver.version}-${ver.status}`} className="flex justify-between gap-3">
                  <span>
                    {versieLabel(ver.version)} · {STATUS_LABELS[ver.status].toLowerCase()}
                  </span>
                  <span className="text-gray-500">{formatDateLong(ver.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-6">
        {/* ------------------------- Feedback van de klant ------------------------- */}
        {(c.status !== 'afgerond' || verwerkingen.length > 0) && (
          <Kaart
            titel="Feedback van de klant verwerken"
            uitleg="Plak of upload wat de klant terugstuurde. De AI maakt er een nieuwe, schone briefing van: zonder sporen van wat er veranderde. Wat er veranderde en wat nog open staat, lees je hier, alleen intern."
          >
            <div className="grid items-start gap-8 xl:grid-cols-[1fr_1.2fr]">
              {c.status !== 'afgerond' ? (
                <EerstOpslaan>
                  <FeedbackVerwerken campaignId={c.id} loopt={verwerkingLoopt} />
                </EerstOpslaan>
              ) : (
                <p className="text-sm text-gray-600">Afgerond: hier verwerken we geen feedback meer.</p>
              )}
              <div>
                <h3 className="mb-3 text-sm font-semibold">Notities bij de verwerkingen</h3>
                {verwerkingen.length === 0 ? (
                  <p className="text-sm text-gray-500">Nog niets verwerkt.</p>
                ) : (
                  <ol className="space-y-4">
                    {verwerkingen.map((r) => (
                      <VerwerkingNotitie key={r.id} r={r} campaignId={c.id} />
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </Kaart>
        )}

        <BriefingEditor
          campaignId={c.id}
          concept={conceptVan(v)}
          stempel={c.updatedAt.toISOString()}
          team={team.map((t) => ({ id: t.id, naam: t.name ?? t.email, functie: t.jobTitle }))}
          contacten={contacten.map((p) => ({ id: p.id, naam: p.name, functie: p.jobTitle }))}
          klantSlug={org.slug}
          wieOpties={wieOpties}
          kanaalSoorten={[...KANAAL_SOORTEN]}
          tijdlijnOmschrijvingen={[...TIJDLIJN_OMSCHRIJVINGEN]}
          inClickUp={!!c.clickupTaskId}
          budgetNu={budgetTekst(v)}
          hypothese={<HypotheseWeergave v={v} compact />}
          doelgroepen={
            <>
                <h3 className="mb-2 text-[15px]">Doelgroepen in deze campagne</h3>
                {v.doelgroepen.length === 0 ? (
                  <p className="mb-3 text-sm text-gray-600">Nog geen doelgroepen. Voeg er een toe, of kies uit de bestaande.</p>
                ) : (
                  <ul className="mb-3 divide-y divide-gray-200">
                    {v.doelgroepen.map((d) => (
                      <Regel
                        key={`${d.id}-${d.name}-${d.description ?? ''}`}
                        weergave={
                          <div className="text-[15px]">
                            {d.name}
                            {d.description && <span className="block text-xs text-gray-600">{d.description}</span>}
                          </div>
                        }
                        acties={<KleineKnop action={haalDoelgroepWeg} campaignId={c.id} id={d.id} label="Weg" />}
                        formulier={
                          <ActionForm action={bewerkDoelgroep} submitLabel="Opslaan" resetOnSuccess={false}>
                            {verborgen}
                            <input type="hidden" name="id" value={d.id} />
                            <input type="hidden" name="slug" value={org.slug} />
                            <Field label="Naam" name="name" required defaultValue={d.name} />
                            <Field label="Omschrijving" name="description" defaultValue={d.description ?? ''} />
                            <p className="text-xs text-gray-600">Dit wijzigt de doelgroep ook bij {org.name}, voor volgende campagnes.</p>
                          </ActionForm>
                        }
                      />
                    ))}
                  </ul>
                )}
                <div className="space-y-3">
                  <Uitklap label="Doelgroep toevoegen" className="">
                    <ActionForm action={doelgroepInCampagne} submitLabel="Toevoegen">
                      {verborgen}
                      <Field label="Naam" name="name" required placeholder="Nieuwsbriefabonnees" />
                      <Field label="Omschrijving" name="description" />
                      <p className="text-xs text-gray-600">Wordt ook bewaard bij {org.name}, zodat je hem bij een volgende campagne kunt kiezen.</p>
                    </ActionForm>
                  </Uitklap>
                  {beschikbareDoelgroepen.length > 0 && (
                    <Uitklap label={`Kies uit bestaande doelgroepen van ${org.name} (${beschikbareDoelgroepen.length})`} className="">
                      <ActionForm action={kiesDoelgroepen} submitLabel="Toevoegen aan de campagne">
                        {verborgen}
                        <div className="space-y-2">
                          {beschikbareDoelgroepen.map((d) => (
                            <label key={d.id} className="flex items-start gap-2.5 text-[15px]">
                              <input type="checkbox" name="audienceIds" value={d.id} className="accent-jr-blue mt-0.5 h-[18px] w-[18px] shrink-0" />
                              <span>
                                {d.name}
                                {d.description && <span className="block text-xs text-gray-600">{d.description}</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                      </ActionForm>
                    </Uitklap>
                  )}
                </div>
              <p className="mt-3 text-xs text-gray-500">Doelgroepen koppelen en weghalen gaat meteen, zonder Opslaan.</p>
            </>
          }
        />
        {c.version === 0 && (
          <section className="max-w-sm">
            <ActionForm
              action={wisCampagne}
              submitLabel="Verwijder deze campagne"
              submitClassName="text-[#C02A22] hover:bg-[#FDECEA] border border-gray-300 bg-white !rounded-full"
              resetOnSuccess={false}
              meldGelukt={false}
              className="space-y-2"
            >
              {verborgen}
              <p className="text-xs text-gray-500">Kan zolang hij nog niet naar de klant is gestuurd.</p>
            </ActionForm>
          </section>
        )}
      </div>
    </AppShell>
  )
}

/* ------------------------------ Bouwstenen ------------------------------- */

const VERWERKING_STATUS: Record<VerwerkingWeergave['status'], { label: string; stijl: string }> = {
  wacht: { label: 'Wacht', stijl: 'bg-gray-200 text-gray-700' },
  bezig: { label: 'Bezig', stijl: 'bg-jr-lightblue text-jr-deepblue' },
  klaar: { label: 'Verwerkt', stijl: 'bg-jr-green/15 text-[#1d7a36]' },
  fout: { label: 'Mislukt', stijl: 'bg-[#FDECEA] text-[#C02A22]' },
  teruggedraaid: { label: 'Teruggedraaid', stijl: 'bg-gray-200 text-gray-700' },
}

function VerwerkingNotitie({ r, campaignId }: { r: VerwerkingWeergave; campaignId: string }) {
  const status = r.vastgelopen ? { label: 'Vastgelopen', stijl: 'bg-[#FDECEA] text-[#C02A22]' } : VERWERKING_STATUS[r.status]
  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-600">
          {formatDateLong(r.createdAt)} om {r.createdAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}
          {r.door && <> &middot; {r.door}</>}
          {r.bron === 'import' && <> &middot; ingelezen zonder AI</>}
          {r.bestandNaam && <> &middot; {r.bestandNaam}</>}
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${status.stijl}`}>{status.label}</span>
      </div>
      {(r.status === 'wacht' || r.status === 'bezig') && !r.vastgelopen && (
        <p className="text-sm text-gray-600">De AI leest de feedback en schrijft de briefing opnieuw. Dit duurt meestal een à twee minuten.</p>
      )}
      {r.vastgelopen && <p className="text-sm text-[#C02A22]">Deze verwerking is nooit afgerond. De briefing is niet aangepast; probeer het opnieuw.</p>}
      {r.status === 'fout' && r.fout && <p className="text-sm text-[#C02A22]">{r.fout} De briefing is niet aangepast.</p>}
      {r.openVragen.length > 0 && r.status !== 'teruggedraaid' && (
        <div className="border-jr-orange bg-jr-orange/10 mb-3 rounded border-l-4 p-3">
          <p className="mb-1 text-xs font-semibold">Nog open</p>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {r.openVragen.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}
      {r.wijzigingen.length > 0 && (
        <div className={r.status === 'teruggedraaid' ? 'opacity-60' : ''}>
          <p className="mb-1 text-xs font-semibold">Wat er veranderde{r.status === 'teruggedraaid' && ' (teruggedraaid)'}</p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-gray-700">
            {r.wijzigingen.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {r.invoer && (
        <details className="mt-3">
          <summary className="text-jr-link cursor-pointer text-xs font-medium select-none hover:underline">Wat de klant schreef</summary>
          <p className="mt-2 rounded bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-700">{r.invoer}</p>
        </details>
      )}
      {r.magTerug && (
        <div className="mt-3">
          <ActionForm
            action={draaiVerwerkingTerugActie}
            submitLabel="Draai terug"
            submitClassName={KNOP_KLEIN}
            resetOnSuccess={false}
            meldGelukt={false}
            bevestig
            className=""
          >
            <input type="hidden" name="campaignId" value={campaignId} />
            <input type="hidden" name="id" value={r.id} />
          </ActionForm>
        </div>
      )}
    </li>
  )
}

function Kerngetal({ label, waarde, blauw = false }: { label: string; waarde: string | null; blauw?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd className={`font-display tabular mt-0.5 text-2xl font-semibold tracking-tight ${blauw ? 'text-jr-blue' : ''}`}>
        {waarde ?? <span className="text-gray-400">{LEEG}</span>}
      </dd>
    </div>
  )
}

type Actie = (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>

function KleineKnop({ action, campaignId, id, label }: { action: Actie; campaignId: string; id: string; label: string }) {
  return (
    <ActionForm action={action} submitLabel={label} submitClassName={KNOP_KLEIN} resetOnSuccess={false} meldGelukt={false} className="">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="id" value={id} />
    </ActionForm>
  )
}

function StatusKnop({
  action,
  campaignId,
  label,
  primair = false,
}: {
  action: Actie
  campaignId: string
  label: string
  primair?: boolean
}) {
  return (
    <ActionForm
      action={action}
      submitLabel={label}
      submitClassName={`${primair ? KNOP_OPSLAAN : KNOP_RUSTIG} w-full`}
      resetOnSuccess={false}
      meldGelukt={false}
      className="space-y-2"
    >
      <input type="hidden" name="campaignId" value={campaignId} />
    </ActionForm>
  )
}
