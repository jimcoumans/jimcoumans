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
  type CampagneVolledig,
} from '@/lib/campagnes'
import { listContacts } from '@/lib/crm'
import { AppShell } from '@/components/AppShell'
import { Regel } from '@/components/Regel'
import { ActionForm, Check, Field, Select, TextArea, Uitklap } from '@/components/ActionForm'
import { HypotheseWeergave, budgetTekst, budgetBereik, omzetBereik, euro, versieLabel, LEEG } from '@/components/CampagneBriefing'
import {
  wijzigBasis,
  wijzigDoel,
  wijzigAanbod,
  wijzigDoelgroep,
  wijzigPlanning,
  wijzigAfspraken,
  wijzigAchtergrond,
  wijzigAannames,
  wijzigSamenvatting,
  doeSuggestieSamenvatting,
  nieuweKpi,
  wijzigKpi,
  wijzigKanaal,
  doelgroepInCampagne,
  kiesDoelgroepen,
  haalDoelgroepWeg,
  bewerkDoelgroep,
  wisKpi,
  nieuwKanaal,
  wisselKanaal,
  wisKanaal,
  nieuweTijdlijn,
  wijzigTijdlijnRegel,
  wisTijdlijn,
  doeSuggestieTijdlijn,
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
import type { CampaignKpi, CampaignChannel } from '@/db/schema'
import { formatBp, formatHonderdsten, formatAantal } from '@/lib/hypothese'
import { formatDate, formatDateInput, formatDateLong } from '@/lib/dates'

export const maxDuration = 26

/* Vaste namen voor wie iets doet, naast de collega's zelf. */
const ROLLEN = ['Campagne', 'Content', 'Content en techniek', 'Campagne en techniek', 'Klant']

const KNOP_OPSLAAN = 'bg-jr-btn hover:bg-jr-btnhover text-white'
const KNOP_RUSTIG = 'border border-gray-300 text-gray-700 hover:bg-gray-50'
const KNOP_KLEIN = 'text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs'

function bedragVeld(cents: number | null): string {
  return cents === null ? '' : String(cents / 100).replace('.', ',')
}

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
  const gekozenContacten = new Set(v.contactpersonen.map((p) => p.id))
  const gekozenDoelgroepen = new Set(v.doelgroepen.map((d) => d.id))
  const beschikbareDoelgroepen = doelgroepen.filter((d) => !gekozenDoelgroepen.has(d.id))
  const gekozenSpecialisten = new Set(v.specialisten.map((p) => p.id))
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
          <a href={`/beheer/campagnes/${c.id}/briefing`} className="text-jr-blue text-sm hover:underline">
            Bekijk de briefing
          </a>
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

          <div className="space-y-2">
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
          </div>

          {c.status === 'akkoord' && !c.clickupTaskId && (
            <div className="border-jr-orange bg-jr-orange/10 mt-3 rounded border-l-4 p-2.5 text-xs">
              <p className="mb-2">De tijdlijn staat nog niet in ClickUp.</p>
              <StatusKnop action={naarClickUp} campaignId={c.id} label="Zet in ClickUp" />
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
            <a href={`/beheer/campagnes/${c.id}/briefing`} className="text-jr-blue text-sm hover:underline">
              Bekijk, print of bewaar als pdf
            </a>
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
                <FeedbackVerwerken campaignId={c.id} loopt={verwerkingLoopt} />
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

        <div className="grid items-start gap-6 xl:grid-cols-2">
          {/* ---------------------------- Samenvatting ---------------------------- */}
          <Kaart
            titel="Samenvatting"
            uitleg="Eén of twee zinnen bovenaan de briefing. Leeg bij het versturen? Dan schrijven we hem uit wat er is ingevuld."
          >
            <ActionForm key={c.summary ?? ''} action={wijzigSamenvatting} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <TextArea label="Samenvatting" name="summary" rows={3} defaultValue={c.summary ?? ''} />
            </ActionForm>
            <SuggestieKnop action={doeSuggestieSamenvatting} campaignId={c.id} />
          </Kaart>

          {/* ---------------------------- 1 De basis ---------------------------- */}
          <Kaart nummer={1} titel="De basis">
            <ActionForm action={wijzigBasis} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <Field label="Campagnenaam" name="title" required defaultValue={c.title} />
              <Select
                label="Marketingmanager"
                name="marketingManagerId"
                defaultValue={c.marketingManagerId ?? ''}
                hint="Komt van de klantkaart; hier aan te passen voor deze campagne."
                options={[
                  { value: '', label: LEEG },
                  ...team.map((t) => ({ value: t.id, label: t.jobTitle ? `${t.name ?? t.email} · ${t.jobTitle}` : (t.name ?? t.email) })),
                ]}
              />
              <fieldset>
                <legend className="text-jr-text mb-2 text-[13px] font-medium">Aangesloten specialisten</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {team
                    .filter((t) => t.id !== c.marketingManagerId)
                    .map((t) => (
                      <label key={t.id} className="flex items-start gap-2.5 text-[15px]">
                        <input
                          type="checkbox"
                          name="specialistIds"
                          value={t.id}
                          defaultChecked={gekozenSpecialisten.has(t.id)}
                          className="accent-jr-blue mt-0.5 h-[18px] w-[18px] shrink-0"
                        />
                        <span>
                          {t.name ?? t.email}
                          <span className="block text-xs text-gray-600">{t.jobTitle ?? 'Functie nog niet ingevuld'}</span>
                        </span>
                      </label>
                    ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-jr-text mb-2 text-[13px] font-medium">Contactpersonen</legend>
                {contacten.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Nog geen contactpersonen. Voeg ze toe op de{' '}
                    <a href={`/beheer/klanten/${org.slug}`} className="text-jr-link hover:underline">
                      klantkaart
                    </a>
                    .
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {contacten.map((p) => (
                      <label key={p.id} className="flex items-start gap-2.5 text-[15px]">
                        <input
                          type="checkbox"
                          name="contactIds"
                          value={p.id}
                          defaultChecked={gekozenContacten.has(p.id)}
                          className="accent-jr-blue mt-0.5 h-[18px] w-[18px] shrink-0"
                        />
                        <span>
                          {p.name}
                          {p.jobTitle && <span className="block text-xs text-gray-600">{p.jobTitle}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            </ActionForm>
          </Kaart>
        </div>
        {/* ---------------------------- 2 Het doel ---------------------------- */}
        <Kaart
          nummer={2}
          titel="Het doel"
          uitleg="De KPI’s zijn de basis van de hypothese: het doel is hun som, de omzet aantal maal prijs."
        >
          <h3 className="mb-2 text-[15px]">KPI’s</h3>
          {v.kpis.length === 0 ? (
            <p className="mb-3 text-sm text-gray-600">Nog geen KPI’s.</p>
          ) : (
            <div className="mb-3">
              <div className="hidden grid-cols-[minmax(0,1fr)_130px_70px_90px_100px_120px] gap-3 border-b border-gray-200 pb-2 text-xs text-gray-600 sm:grid">
                <span>Wat</span>
                <span>Datum</span>
                <span className="text-right">Doel</span>
                <span className="text-right">Prijs</span>
                <span className="text-right">Omzet</span>
                <span />
              </div>
              <ul className="tabular divide-y divide-gray-200">
                {v.kpis.map((k) => (
                  <Regel
                    key={`${k.id}-${k.label}-${k.targetQuantity}-${k.priceCents}-${k.on?.getTime()}`}
                    weergave={
                      <div className="grid gap-x-3 text-[15px] sm:grid-cols-[minmax(0,1fr)_130px_70px_90px_100px]">
                        <span>{k.label}</span>
                        <span className="text-gray-600">{k.on ? formatDate(k.on) : LEEG}</span>
                        <span className="sm:text-right">{formatAantal(k.targetQuantity)}</span>
                        <span className="whitespace-nowrap sm:text-right">{euro(k.priceCents)}</span>
                        <span className="whitespace-nowrap sm:text-right">{k.priceCents === null ? LEEG : euro(k.priceCents * k.targetQuantity)}</span>
                      </div>
                    }
                    acties={<KleineKnop action={wisKpi} campaignId={c.id} id={k.id} label="Weg" />}
                    formulier={
                      <ActionForm action={wijzigKpi} submitLabel="Opslaan" resetOnSuccess={false}>
                        {verborgen}
                        <input type="hidden" name="id" value={k.id} />
                        <KpiVelden k={k} />
                      </ActionForm>
                    }
                  />
                ))}
              </ul>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-gray-300 pt-2 text-[15px] font-semibold sm:grid-cols-[minmax(0,1fr)_130px_70px_90px_100px_120px]">
                <span>Totaal</span>
                <span className="hidden sm:block" />
                <span className="text-right">{formatAantal(v.doelEenheden)}</span>
                <span className="hidden sm:block" />
                <span className="hidden text-right sm:block">{v.omzetCents > 0 ? euro(v.omzetCents) : LEEG}</span>
              </div>
            </div>
          )}
          <Uitklap label="KPI toevoegen" className="mb-6">
            <ActionForm action={nieuweKpi} submitLabel="Toevoegen">
              {verborgen}
              <KpiVelden />
            </ActionForm>
          </Uitklap>

          <ActionForm action={wijzigDoel} submitLabel="Opslaan" resetOnSuccess={false}>
            {verborgen}
            <Field label="Doel in één zin" name="goalSentence" defaultValue={c.goalSentence ?? ''} />
            <VoorstelVink naam="doel" v={v} />
            <Field
              label="Wat telt als resultaat"
              name="resultDefinition"
              defaultValue={c.resultDefinition ?? ''}
              placeholder="Een reservering in Odoo"
            />
            <TextArea
              label="Opmerkingen bij de KPI’s"
              name="kpiNotes"
              rows={3}
              defaultValue={c.kpiNotes ?? ''}
              hint="Eén punt per regel."
            />

            <fieldset className="rounded-lg border border-gray-200 p-3">
              <legend className="text-jr-text px-1 text-[13px] font-medium">Advertentiebudget</legend>
              <div className="space-y-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="budgetMode"
                    value="berekend"
                    defaultChecked={c.budgetMode === 'berekend'}
                    className="accent-jr-blue mt-0.5"
                  />
                  <span>
                    Berekend uit het doel
                    <span className="block text-xs text-gray-500">
                      De hypothese geeft een bandbreedte: van het deel dat we uit advertenties verwachten tot de bovengrens, als alles uit advertenties komt.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="budgetMode"
                    value="vast"
                    defaultChecked={c.budgetMode === 'vast'}
                    className="accent-jr-blue mt-0.5"
                  />
                  <span>
                    Vast budget
                    <span className="block text-xs text-gray-500">De hypothese rekent vooruit naar het verwachte resultaat.</span>
                  </span>
                </label>
                <Field label="Vast budget in euro’s" name="fixedBudget" defaultValue={bedragVeld(c.fixedBudgetCents)} placeholder="1500" />
              </div>
              <p className="mt-2 rounded bg-gray-100 p-2 text-xs text-gray-700">Nu: {budgetTekst(v)}</p>
            </fieldset>
            <TextArea
              label="Opmerkingen bij het budget"
              name="budgetNote"
              rows={2}
              defaultValue={c.budgetNote ?? ''}
              hint="Bijvoorbeeld wie de advertenties betaalt. Eén punt per regel."
            />
            <VoorstelVink naam="budget" v={v} />
          </ActionForm>
        </Kaart>

        <div className="grid items-start gap-6 xl:grid-cols-2">
          {/* ---------------------------- 3 Aanbod ---------------------------- */}
          <Kaart nummer={3} titel="Aanbod en boodschap">
            <ActionForm action={wijzigAanbod} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <TextArea label="Wat we verkopen" name="offerWhat" rows={2} defaultValue={c.offerWhat ?? ''} />
              <TextArea label="Kernboodschap" name="offerMessage" rows={2} defaultValue={c.offerMessage ?? ''} />
              <VoorstelVink naam="kernboodschap" v={v} />
              <TextArea label="Waarom nu" name="offerWhyNow" rows={2} defaultValue={c.offerWhyNow ?? ''} />
              <TextArea label="Wat we niet beloven" name="offerNotPromised" rows={2} defaultValue={c.offerNotPromised ?? ''} />
            </ActionForm>
          </Kaart>

          {/* ---------------------------- 4 Doelgroep ---------------------------- */}
          <Kaart nummer={4} titel="Doelgroep">
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

            <div className="mt-6 border-t border-gray-200 pt-6">
              <ActionForm action={wijzigDoelgroep} submitLabel="Opslaan" resetOnSuccess={false}>
                {verborgen}
                <Field label="Regio" name="region" defaultValue={c.region ?? ''} placeholder="Maastricht en 25 kilometer eromheen" />
                <VoorstelVink naam="regio" v={v} />
                <Field label="Uitsluiten" name="exclusions" defaultValue={c.exclusions ?? ''} />
                <TextArea label="Opmerkingen" name="audienceNotes" rows={2} defaultValue={c.audienceNotes ?? ''} hint="Eén punt per regel." />
              </ActionForm>
            </div>
          </Kaart>
        </div>
        {/* ---------------------------- 5 Kanalen ---------------------------- */}
        <Kaart
          nummer={5}
          titel="Kanalen en content"
          uitleg="Per regel: bestaat het al, of moet het nog gemaakt worden? Wat nog gemaakt moet worden, komt in de tijdlijn."
        >
          {v.kanalen.length === 0 ? (
            <p className="mb-3 text-sm text-gray-600">Nog geen kanalen.</p>
          ) : (
            <ul className="mb-3 divide-y divide-gray-200">
              {v.kanalen.map((k) => (
                <Regel
                  key={`${k.id}-${k.kind}-${k.quantity ?? ''}-${k.note ?? ''}-${k.status}`}
                  weergave={
                    <div className="text-[15px]">
                      {k.kind}
                      {k.quantity && <span className="text-gray-600"> · {k.quantity}</span>}
                      {k.note && <p className="text-xs text-gray-600">{k.note}</p>}
                    </div>
                  }
                  acties={
                    <>
                      <ActionForm
                        action={wisselKanaal}
                        submitLabel={k.status === 'bestaat' ? 'Bestaat al' : 'Nog te maken'}
                        submitClassName={`!min-h-0 !px-3 !py-1 !text-xs !rounded-full ${k.status === 'bestaat' ? 'bg-jr-green/15 text-[#1d7a36]' : 'bg-jr-lightblue text-jr-deepblue'}`}
                        resetOnSuccess={false}
                        meldGelukt={false}
                        className=""
                      >
                        {verborgen}
                        <input type="hidden" name="id" value={k.id} />
                      </ActionForm>
                      <KleineKnop action={wisKanaal} campaignId={c.id} id={k.id} label="Weg" />
                    </>
                  }
                  formulier={
                    <ActionForm action={wijzigKanaal} submitLabel="Opslaan" resetOnSuccess={false}>
                      {verborgen}
                      <input type="hidden" name="id" value={k.id} />
                      <KanaalVelden k={k} />
                    </ActionForm>
                  }
                />
              ))}
            </ul>
          )}
          <datalist id="kanaal-soorten">
            {KANAAL_SOORTEN.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Uitklap label="Kanaal, middel of content toevoegen">
            <ActionForm action={nieuwKanaal} submitLabel="Toevoegen">
              {verborgen}
              <KanaalVelden />
            </ActionForm>
          </Uitklap>
        </Kaart>

        {/* ---------------------------- 6 Planning ---------------------------- */}
        <Kaart nummer={6} titel="De planning">
          <ActionForm action={wijzigPlanning} submitLabel="Opslaan" resetOnSuccess={false}>
            {verborgen}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start" name="startOn" type="date" defaultValue={c.startOn ? formatDateInput(c.startOn) : ''} />
              <Field label="Einde" name="endOn" type="date" defaultValue={c.endOn ? formatDateInput(c.endOn) : ''} />
            </div>
            <TextArea
              label="Opmerkingen bij de planning"
              name="planningNotes"
              rows={2}
              defaultValue={c.planningNotes ?? ''}
              hint="Bijvoorbeeld een stopcriterium of beslismoment. Eén punt per regel."
            />
          </ActionForm>

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm">Tijdlijn</h3>
            {c.clickupTaskId && <span className="text-xs text-gray-500">Staat in ClickUp als subtaken</span>}
          </div>
          {v.tijdlijn.length === 0 ? (
            <p className="mt-1 mb-3 text-sm text-gray-500">Nog leeg. Laat een suggestie doen uit de data en de kanalen, en pas die aan.</p>
          ) : (
            <ul className="mt-2 mb-3 divide-y divide-gray-100">
              {v.tijdlijn.map((t) => (
                <li
                  key={`${t.id}-${t.dueOn?.getTime() ?? 0}-${t.description}-${t.assigneeUserId ?? t.assigneeLabel ?? ''}`}
                  className="flex items-center gap-1 py-2"
                >
                  <ActionForm
                    action={wijzigTijdlijnRegel}
                    submitLabel="Bewaar"
                    submitClassName={KNOP_KLEIN}
                    resetOnSuccess={false}
                    meldGelukt={false}
                    knopInRij
                    className="grid min-w-0 flex-1 items-center gap-2 sm:grid-cols-[150px_1fr_170px_auto]"
                  >
                    {verborgen}
                    <input type="hidden" name="id" value={t.id} />
                    <input
                      type="date"
                      name="dueOn"
                      aria-label="Deadline"
                      defaultValue={t.dueOn ? formatDateInput(t.dueOn) : ''}
                      className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none hover:border-gray-400"
                    />
                    <input
                      name="description"
                      aria-label="Omschrijving"
                      list="tijdlijn-omschrijvingen"
                      defaultValue={t.description}
                      className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none hover:border-gray-400"
                    />
                    <select
                      name="assignee"
                      aria-label="Wie"
                      defaultValue={t.assigneeUserId ? `user:${t.assigneeUserId}` : t.assigneeLabel ? `label:${t.assigneeLabel}` : ''}
                      className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none hover:border-gray-400"
                    >
                      {wieOpties.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {t.assigneeLabel && !ROLLEN.includes(t.assigneeLabel) && (
                        <option value={`label:${t.assigneeLabel}`}>{t.assigneeLabel}</option>
                      )}
                    </select>
                  </ActionForm>
                  <KleineKnop action={wisTijdlijn} campaignId={c.id} id={t.id} label="Weg" />
                </li>
              ))}
            </ul>
          )}
          <datalist id="tijdlijn-omschrijvingen">
            {TIJDLIJN_OMSCHRIJVINGEN.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="flex flex-wrap items-start gap-3">
            <SuggestieKnop action={doeSuggestieTijdlijn} campaignId={c.id} uitleg="Vult aan, wist niets." />
          </div>
          <Uitklap label="Regel toevoegen" className="mt-3">
            <ActionForm action={nieuweTijdlijn} submitLabel="Toevoegen">
              {verborgen}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Deadline" name="dueOn" type="date" />
                <Select label="Wie" name="assignee" options={wieOpties} />
              </div>
              <div>
                <label htmlFor="tijdlijn-nieuw" className="text-jr-text mb-1.5 block text-[13px] font-medium">
                  Omschrijving
                </label>
                <input
                  id="tijdlijn-nieuw"
                  name="description"
                  list="tijdlijn-omschrijvingen"
                  required
                  placeholder="Kies of typ"
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
                />
              </div>
            </ActionForm>
          </Uitklap>
        </Kaart>

        <div className="grid items-start gap-6 xl:grid-cols-2">
          {/* ---------------------------- 7 Afspraken ---------------------------- */}
          <Kaart nummer={7} titel="Afspraken met de klant">
            <ActionForm action={wijzigAfspraken} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <TextArea
                label="Wat de klant zelf doet"
                name="clientDoes"
                rows={2}
                defaultValue={c.clientDoes ?? ''}
                placeholder="Elke maandag de stand doorgeven"
              />
              <TextArea
                label="Opmerkingen"
                name="agreementNotes"
                rows={2}
                defaultValue={c.agreementNotes ?? ''}
                hint="Bijvoorbeeld betaal- of annuleringsvoorwaarden van de klant zelf. Eén punt per regel."
              />
            </ActionForm>
          </Kaart>

          {/* ---------------------------- 8 Achtergrond ---------------------------- */}
          <Kaart nummer={8} titel="Achtergrondinformatie">
            <ActionForm action={wijzigAchtergrond} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <TextArea label="Wat we weten van vorige keer" name="backgroundPrevious" rows={3} defaultValue={c.backgroundPrevious ?? ''} />
              <TextArea
                label="Risico’s"
                name="backgroundRisks"
                rows={3}
                defaultValue={c.backgroundRisks ?? ''}
                hint="Eén punt per regel."
              />
            </ActionForm>
          </Kaart>
        </div>
        {/* ---------------------------- 9 Hypothese ---------------------------- */}
        <Kaart
          nummer={9}
          titel="Hypothese"
          uitleg="Alleen getallen, met per aanname de bron. Pas ze aan per campagne; de rest rekent het portaal."
        >
          <div className="space-y-8">
            <ActionForm action={wijzigAannames} submitLabel="Opslaan en herrekenen" resetOnSuccess={false}>
              {verborgen}
              {/* In de volgorde van de trechter: vertoning, klik, conversie, opbrengst. */}
              <div>
                <div className="hidden gap-4 border-b border-gray-200 pb-2 text-xs text-gray-600 md:grid md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1.2fr)]">
                  <span>Aanname</span>
                  <span>Waarde</span>
                  <span>Bron</span>
                </div>
                <ol className="divide-y divide-gray-200">
                  <AannameRij
                    stap={1}
                    label="Kosten per 1.000 impressies"
                    uitleg="Wat het kost om de advertentie 1.000 keer te tonen."
                    naam="cpm"
                    eenheid="€"
                    waarde={bedragVeld(c.cpmCents)}
                    placeholder="8"
                    bronNaam="sourceCpm"
                    bron={c.sourceCpm}
                  />
                  <AannameRij
                    stap={2}
                    label="Doorklikratio"
                    uitleg="Welk deel van wie de advertentie ziet, klikt door."
                    naam="ctr"
                    eenheid="%"
                    waarde={c.clickThroughRateBp ? formatBp(c.clickThroughRateBp) : ''}
                    placeholder="1"
                    bronNaam="sourceClickThrough"
                    bron={c.sourceClickThrough}
                  />
                  <AannameRij
                    stap={3}
                    label="Conversieratio"
                    uitleg="Welk deel van de bezoekers converteert."
                    naam="conversion"
                    eenheid="%"
                    waarde={c.conversionRateBp ? formatBp(c.conversionRateBp) : ''}
                    placeholder="2,5"
                    bronNaam="sourceConversion"
                    bron={c.sourceConversion}
                  />
                  <AannameRij
                    stap={4}
                    label="Eenheden per conversie"
                    uitleg="Wat één conversie oplevert. Meestal 1."
                    naam="units"
                    waarde={formatHonderdsten(c.unitsPerConversionHundredths)}
                    placeholder="1"
                    bronNaam="sourceUnits"
                    bron={c.sourceUnits}
                    verplicht
                  />
                  <AannameRij
                    stap={5}
                    label="Deel uit advertenties"
                    uitleg="Welk deel van het doel we uit advertenties verwachten. Geeft de ondergrens van het budget; leeg is alles."
                    naam="adsShare"
                    eenheid="%"
                    waarde={c.adsShareBp ? formatBp(c.adsShareBp) : ''}
                    placeholder="60"
                    vasteBron="De rest via mailings, vaste klanten en direct"
                  />
                  <AannameRij
                    stap={6}
                    label="Buffer"
                    uitleg="Bovenop wat nodig is, voor tegenvallers."
                    naam="buffer"
                    eenheid="%"
                    waarde={formatBp(c.bufferBp)}
                    placeholder="20"
                    vasteBron="Vaste regel: 20%"
                  />
                </ol>
              </div>
              <TextArea
                label="Opmerkingen bij de aannames"
                name="assumptionNotes"
                rows={2}
                defaultValue={c.assumptionNotes ?? ''}
                hint="Bijvoorbeeld: gemiddeld 3 per reservering. Eén punt per regel."
              />
            </ActionForm>
            <div className="border-t border-gray-200 pt-8">
              <HypotheseWeergave v={v} compact />
            </div>
          </div>
        </Kaart>
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

/** De velden van een KPI, leeg om toe te voegen of ingevuld om te wijzigen. */
function KpiVelden({ k }: { k?: CampaignKpi }) {
  return (
    <>
      <Field label="Wat" name="label" required placeholder="Kerstdiner" defaultValue={k?.label ?? ''} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Datum" name="on" type="date" defaultValue={k?.on ? formatDateInput(k.on) : ''} />
        <Field label="Doel (aantal)" name="targetQuantity" type="number" required placeholder="80" defaultValue={k ? String(k.targetQuantity) : ''} />
        <Field label="Prijs per stuk" name="price" placeholder="110" defaultValue={k ? bedragVeld(k.priceCents) : ''} />
      </div>
    </>
  )
}

/** De velden van een kanaal, middel of soort content. */
function KanaalVelden({ k }: { k?: CampaignChannel }) {
  const id = `kanaal-soort-${k?.id ?? 'nieuw'}`
  return (
    <>
      <div>
        <label htmlFor={id} className="text-jr-text mb-1.5 block text-[13px] font-medium">
          Wat
        </label>
        <input
          id={id}
          name="kind"
          list="kanaal-soorten"
          required
          placeholder="Kies of typ"
          defaultValue={k?.kind ?? ''}
          className="min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Aantal" name="quantity" placeholder="3" defaultValue={k?.quantity ?? ''} />
        <Select
          label="Status"
          name="status"
          defaultValue={k?.status ?? 'maken'}
          options={[
            { value: 'maken', label: 'Nog te maken' },
            { value: 'bestaat', label: 'Bestaat al' },
          ]}
        />
      </div>
      <Field label="Toelichting" name="note" defaultValue={k?.note ?? ''} />
    </>
  )
}

function Kaart({ nummer, titel, uitleg, children }: { nummer?: number; titel: string; uitleg?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
      <h2 className="flex items-center gap-3 text-[19px]">
        {nummer !== undefined && (
          <span className="bg-jr-lightblue text-jr-link inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
            {nummer}
          </span>
        )}
        {titel}
      </h2>
      {uitleg && <p className="mt-1.5 max-w-2xl text-sm text-gray-600">{uitleg}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

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

function VoorstelVink({ naam, v }: { naam: 'doel' | 'budget' | 'kernboodschap' | 'regio'; v: CampagneVolledig }) {
  return (
    <Check label="Dit is een voorstel aan de klant" name={`voorstel_${naam}`} defaultChecked={v.campagne.proposalFields.includes(naam)} />
  )
}

function AannameRij({
  stap,
  label,
  uitleg,
  naam,
  eenheid,
  waarde,
  placeholder,
  bronNaam,
  bron,
  vasteBron,
  verplicht = false,
}: {
  stap: number
  label: string
  uitleg: string
  naam: string
  eenheid?: string
  waarde: string
  placeholder: string
  bronNaam?: string
  bron?: string | null
  vasteBron?: string
  verplicht?: boolean
}) {
  const id = `aanname-${naam}`
  const veld = 'min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400'
  return (
    <li className="grid items-center gap-x-4 gap-y-2 py-3.5 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,1.2fr)]">
      <label htmlFor={id} className="flex items-start gap-3">
        <span className="bg-jr-lightblue text-jr-link mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {stap}
        </span>
        <span>
          <span className="block text-[15px] font-medium">{label}</span>
          <span className="block text-xs text-gray-600">{uitleg}</span>
        </span>
      </label>
      <div className="relative ml-9 md:ml-0">
        <input id={id} name={naam} defaultValue={waarde} placeholder={placeholder} required={verplicht} inputMode="decimal" className={`${veld} ${eenheid ? 'pr-9' : ''}`} />
        {eenheid && <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-gray-500">{eenheid}</span>}
      </div>
      <div className="ml-9 md:ml-0">
        {bronNaam ? (
          <input
            name={bronNaam}
            aria-label={`Bron van ${label.toLowerCase()}`}
            defaultValue={bron ?? ''}
            placeholder="Bron: marktgemiddelde, Ads Manager, Odoo"
            className={veld}
          />
        ) : (
          <span className="text-sm text-gray-600">{vasteBron}</span>
        )}
      </div>
    </li>
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

function SuggestieKnop({ action, campaignId, uitleg }: { action: Actie; campaignId: string; uitleg?: string }) {
  return (
    <ActionForm
      action={action}
      submitLabel="Doe suggestie"
      submitClassName={`${KNOP_RUSTIG} mt-2`}
      resetOnSuccess={false}
      meldGelukt={false}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="campaignId" value={campaignId} />
      {uitleg && <span className="order-last mt-2 text-xs text-gray-500">{uitleg}</span>}
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
