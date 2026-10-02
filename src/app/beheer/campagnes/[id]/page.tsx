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
import { ActionForm, Check, Field, Select, TextArea, Uitklap } from '@/components/ActionForm'
import { HypotheseWeergave, budgetTekst, euro, versieLabel, LEEG } from '@/components/CampagneBriefing'
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
  wisKpi,
  nieuwKanaal,
  wisselKanaal,
  wisKanaal,
  nieuweTijdlijn,
  wijzigTijdlijnRegel,
  wisTijdlijn,
  doeSuggestieTijdlijn,
  nieuweDoelgroep,
  verstuurVoorstel,
  klantAkkoord,
  naarClickUp,
  terugNaarConcept,
  rondAf,
  wisCampagne,
} from '../../campagne-actions'
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
  const [team, contacten, doelgroepen] = await Promise.all([listTeam(), listContacts(org.id), listDoelgroepen(org.id)])

  const gewijzigd = gewijzigdSindsVersie(v)
  const verborgen = <input type="hidden" name="campaignId" value={c.id} />
  const gekozenContacten = new Set(v.contactpersonen.map((p) => p.id))
  const gekozenDoelgroepen = new Set(v.doelgroepen.map((d) => d.id))
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
          <h1 className="text-jr-blue text-2xl">{c.title}</h1>
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

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div className="min-w-0 space-y-6">
          {/* ---------------------------- Samenvatting ---------------------------- */}
          <Kaart titel="Samenvatting" uitleg="Eén of twee zinnen bovenaan de briefing. Leeg bij het versturen? Dan schrijven we hem uit wat er is ingevuld.">
            <ActionForm key={c.summary ?? ''} action={wijzigSamenvatting} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <TextArea label="Samenvatting" name="summary" rows={3} defaultValue={c.summary ?? ''} />
            </ActionForm>
            <SuggestieKnop action={doeSuggestieSamenvatting} campaignId={c.id} />
          </Kaart>

          {/* ---------------------------- 1 De basis ---------------------------- */}
          <Kaart nummer={1} titel="De basis">
            <dl className="mb-4 grid gap-x-6 gap-y-2 rounded-lg bg-gray-100 p-3 text-sm sm:grid-cols-2">
              <Gegeven label="Klant" waarde={org.name} />
              <Gegeven label="Branche" waarde={org.industry} />
              <Gegeven label="Adres" waarde={[org.addressLine, [org.postalCode, org.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')} />
              <Gegeven label="Website" waarde={org.website} />
              <Gegeven label="Telefoon" waarde={org.phone} />
              <Gegeven label="E-mail" waarde={org.email} />
            </dl>
            <ActionForm action={wijzigBasis} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <Field label="Campagnenaam" name="title" required defaultValue={c.title} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Type"
                  name="kind"
                  defaultValue={c.kind ?? ''}
                  options={[
                    { value: '', label: LEEG },
                    { value: 'retainer', label: 'Retainer' },
                    { value: 'project', label: 'Project' },
                  ]}
                />
                <Select
                  label="Marketingmanager"
                  name="marketingManagerId"
                  defaultValue={c.marketingManagerId ?? ''}
                  hint="Komt van de klantkaart; hier aan te passen voor deze campagne."
                  options={[{ value: '', label: LEEG }, ...team.map((t) => ({ value: t.id, label: t.name ?? t.email }))]}
                />
              </div>
              <fieldset>
                <legend className="mb-1 text-xs text-gray-600">Contactpersonen</legend>
                {contacten.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Nog geen contactpersonen. Voeg ze toe op de{' '}
                    <a href={`/beheer/klanten/${org.slug}`} className="text-jr-blue hover:underline">
                      klantkaart
                    </a>
                    .
                  </p>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {contacten.map((p) => (
                      <label key={p.id} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="contactIds"
                          value={p.id}
                          defaultChecked={gekozenContacten.has(p.id)}
                          className="accent-jr-blue mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span>
                          {p.name}
                          {p.jobTitle && <span className="text-gray-500"> · {p.jobTitle}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            </ActionForm>
          </Kaart>

          {/* ---------------------------- 2 Het doel ---------------------------- */}
          <Kaart nummer={2} titel="Het doel" uitleg="De KPI’s zijn de basis van de hypothese: het doel is hun som, de omzet aantal maal prijs.">
            <h3 className="mb-1.5 text-sm">KPI’s</h3>
            {v.kpis.length === 0 ? (
              <p className="mb-3 text-sm text-gray-500">Nog geen KPI’s.</p>
            ) : (
              <div className="mb-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                      <th className="py-1.5 pr-3 font-normal">Wat</th>
                      <th className="py-1.5 pr-3 font-normal">Datum</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Doel</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Prijs</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Omzet</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {v.kpis.map((k) => (
                      <tr key={k.id} className="border-b border-gray-100">
                        <td className="py-1.5 pr-3">{k.label}</td>
                        <td className="py-1.5 pr-3 whitespace-nowrap">{k.on ? formatDate(k.on) : LEEG}</td>
                        <td className="py-1.5 pr-3 text-right">{formatAantal(k.targetQuantity)}</td>
                        <td className="py-1.5 pr-3 text-right whitespace-nowrap">{euro(k.priceCents)}</td>
                        <td className="py-1.5 pr-3 text-right whitespace-nowrap">{k.priceCents === null ? LEEG : euro(k.priceCents * k.targetQuantity)}</td>
                        <td className="py-1 text-right">
                          <KleineKnop action={wisKpi} campaignId={c.id} id={k.id} label="Weg" />
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-1.5 pr-3">Totaal</td>
                      <td />
                      <td className="py-1.5 pr-3 text-right">{formatAantal(v.doelEenheden)}</td>
                      <td />
                      <td className="py-1.5 pr-3 text-right">{v.omzetCents > 0 ? euro(v.omzetCents) : LEEG}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <Uitklap label="KPI toevoegen" className="mb-5">
              <ActionForm action={nieuweKpi} submitLabel="Toevoegen">
                {verborgen}
                <Field label="Wat" name="label" required placeholder="Kerstdiner" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Datum" name="on" type="date" />
                  <Field label="Doel (aantal)" name="targetQuantity" type="number" required placeholder="80" />
                  <Field label="Prijs per stuk" name="price" placeholder="110" />
                </div>
              </ActionForm>
            </Uitklap>

            <ActionForm action={wijzigDoel} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <Field label="Doel in één zin" name="goalSentence" defaultValue={c.goalSentence ?? ''} />
              <VoorstelVink naam="doel" v={v} />
              <Field label="Wat telt als resultaat" name="resultDefinition" defaultValue={c.resultDefinition ?? ''} placeholder="Een reservering in Odoo" />
              <TextArea label="Opmerkingen bij de KPI’s" name="kpiNotes" rows={3} defaultValue={c.kpiNotes ?? ''} hint="Eén punt per regel." />

              <fieldset className="rounded-lg border border-gray-200 p-3">
                <legend className="px-1 text-xs text-gray-600">Advertentiebudget</legend>
                <div className="space-y-2 text-sm">
                  <label className="flex items-start gap-2">
                    <input type="radio" name="budgetMode" value="berekend" defaultChecked={c.budgetMode === 'berekend'} className="accent-jr-blue mt-0.5" />
                    <span>
                      Berekend uit het doel
                      <span className="block text-xs text-gray-500">De hypothese geeft het advies: de bovengrens, als deel van de omzet.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input type="radio" name="budgetMode" value="vast" defaultChecked={c.budgetMode === 'vast'} className="accent-jr-blue mt-0.5" />
                    <span>
                      Vast budget
                      <span className="block text-xs text-gray-500">De hypothese rekent vooruit naar het verwachte resultaat.</span>
                    </span>
                  </label>
                  <Field label="Vast budget in euro’s" name="fixedBudget" defaultValue={bedragVeld(c.fixedBudgetCents)} placeholder="1500" />
                </div>
                <p className="mt-2 rounded bg-gray-100 p-2 text-xs text-gray-700">Nu: {budgetTekst(v)}</p>
              </fieldset>
              <TextArea label="Opmerkingen bij het budget" name="budgetNote" rows={2} defaultValue={c.budgetNote ?? ''} hint="Bijvoorbeeld wie de advertenties betaalt. Eén punt per regel." />
              <VoorstelVink naam="budget" v={v} />
            </ActionForm>
          </Kaart>

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
            <ActionForm action={wijzigDoelgroep} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <fieldset>
                <legend className="mb-1 text-xs text-gray-600">Vaste doelgroepen van {org.name}</legend>
                {doelgroepen.length === 0 ? (
                  <p className="text-xs text-gray-500">Nog geen vaste doelgroepen. Voeg ze hieronder toe.</p>
                ) : (
                  <div className="space-y-1.5">
                    {doelgroepen.map((d) => (
                      <label key={d.id} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="audienceIds"
                          value={d.id}
                          defaultChecked={gekozenDoelgroepen.has(d.id)}
                          className="accent-jr-blue mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span>
                          {d.name}
                          {d.description && <span className="block text-xs text-gray-500">{d.description}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
              <Field label="Regio" name="region" defaultValue={c.region ?? ''} placeholder="Maastricht en 25 kilometer eromheen" />
              <VoorstelVink naam="regio" v={v} />
              <Field label="Uitsluiten" name="exclusions" defaultValue={c.exclusions ?? ''} />
              <TextArea label="Opmerkingen" name="audienceNotes" rows={2} defaultValue={c.audienceNotes ?? ''} hint="Eén punt per regel." />
            </ActionForm>
            <Uitklap label="Nieuwe vaste doelgroep voor deze klant" className="mt-4">
              <ActionForm action={nieuweDoelgroep} submitLabel="Toevoegen">
                {verborgen}
                <input type="hidden" name="organizationId" value={org.id} />
                <input type="hidden" name="slug" value={org.slug} />
                <Field label="Naam" name="name" required placeholder="Nieuwsbriefabonnees" />
                <Field label="Omschrijving" name="description" />
              </ActionForm>
            </Uitklap>
          </Kaart>

          {/* ---------------------------- 5 Kanalen ---------------------------- */}
          <Kaart nummer={5} titel="Kanalen en content" uitleg="Per regel: bestaat het al, of moet het nog gemaakt worden? Wat nog gemaakt moet worden, komt in de tijdlijn.">
            {v.kanalen.length === 0 ? (
              <p className="mb-3 text-sm text-gray-500">Nog geen kanalen.</p>
            ) : (
              <ul className="mb-3 divide-y divide-gray-100">
                {v.kanalen.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5">
                    <div className="min-w-0 flex-1 text-sm">
                      {k.kind}
                      {k.quantity && <span className="text-gray-600"> · {k.quantity}</span>}
                      {k.note && <p className="text-xs text-gray-600">{k.note}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <ActionForm
                        action={wisselKanaal}
                        submitLabel={k.status === 'bestaat' ? 'Bestaat al' : 'Nog te maken'}
                        submitClassName={`!px-2.5 !py-0.5 !text-xs !rounded-full ${k.status === 'bestaat' ? 'bg-jr-green/15 text-[#1d7a36]' : 'bg-jr-lightblue text-jr-deepblue'}`}
                        resetOnSuccess={false}
                        meldGelukt={false}
                        className=""
                      >
                        {verborgen}
                        <input type="hidden" name="id" value={k.id} />
                      </ActionForm>
                      <KleineKnop action={wisKanaal} campaignId={c.id} id={k.id} label="Weg" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Uitklap label="Kanaal, middel of content toevoegen">
              <ActionForm action={nieuwKanaal} submitLabel="Toevoegen">
                {verborgen}
                <div>
                  <label htmlFor="kanaal-soort" className="mb-1 block text-xs text-gray-600">
                    Wat
                  </label>
                  <input
                    id="kanaal-soort"
                    name="kind"
                    list="kanaal-soorten"
                    required
                    placeholder="Kies of typ"
                    className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                  />
                  <datalist id="kanaal-soorten">
                    {KANAAL_SOORTEN.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Aantal" name="quantity" placeholder="3" />
                  <Select
                    label="Status"
                    name="status"
                    defaultValue="maken"
                    options={[
                      { value: 'maken', label: 'Nog te maken' },
                      { value: 'bestaat', label: 'Bestaat al' },
                    ]}
                  />
                </div>
                <Field label="Toelichting" name="note" />
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
              <TextArea label="Opmerkingen bij de planning" name="planningNotes" rows={2} defaultValue={c.planningNotes ?? ''} hint="Bijvoorbeeld een stopcriterium of beslismoment. Eén punt per regel." />
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
                  <li key={`${t.id}-${t.dueOn?.getTime() ?? 0}-${t.description}-${t.assigneeUserId ?? t.assigneeLabel ?? ''}`} className="py-2">
                    <ActionForm
                      action={wijzigTijdlijnRegel}
                      submitLabel="Bewaar"
                      submitClassName={KNOP_KLEIN}
                      resetOnSuccess={false}
                      meldGelukt={false}
                      className="grid items-end gap-2 sm:grid-cols-[150px_1fr_170px_auto]"
                    >
                      {verborgen}
                      <input type="hidden" name="id" value={t.id} />
                      <input
                        type="date"
                        name="dueOn"
                        aria-label="Deadline"
                        defaultValue={t.dueOn ? formatDateInput(t.dueOn) : ''}
                        className="focus:border-jr-blue rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none"
                      />
                      <input
                        name="description"
                        aria-label="Omschrijving"
                        list="tijdlijn-omschrijvingen"
                        defaultValue={t.description}
                        className="focus:border-jr-blue rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none"
                      />
                      <select
                        name="assignee"
                        aria-label="Wie"
                        defaultValue={t.assigneeUserId ? `user:${t.assigneeUserId}` : t.assigneeLabel ? `label:${t.assigneeLabel}` : ''}
                        className="focus:border-jr-blue rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none"
                      >
                        {wieOpties.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                        {t.assigneeLabel && !ROLLEN.includes(t.assigneeLabel) && <option value={`label:${t.assigneeLabel}`}>{t.assigneeLabel}</option>}
                      </select>
                    </ActionForm>
                    <div className="mt-1 flex justify-end">
                      <KleineKnop action={wisTijdlijn} campaignId={c.id} id={t.id} label="Verwijder regel" />
                    </div>
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
                  <label htmlFor="tijdlijn-nieuw" className="mb-1 block text-xs text-gray-600">
                    Omschrijving
                  </label>
                  <input
                    id="tijdlijn-nieuw"
                    name="description"
                    list="tijdlijn-omschrijvingen"
                    required
                    placeholder="Kies of typ"
                    className="focus:border-jr-blue w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                  />
                </div>
              </ActionForm>
            </Uitklap>
          </Kaart>

          {/* ---------------------------- 7 Afspraken ---------------------------- */}
          <Kaart nummer={7} titel="Afspraken met de klant">
            <ActionForm action={wijzigAfspraken} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <TextArea label="Wat de klant zelf doet" name="clientDoes" rows={2} defaultValue={c.clientDoes ?? ''} placeholder="Elke maandag de stand doorgeven" />
              <TextArea label="Opmerkingen" name="agreementNotes" rows={2} defaultValue={c.agreementNotes ?? ''} hint="Bijvoorbeeld betaal- of annuleringsvoorwaarden van de klant zelf. Eén punt per regel." />
            </ActionForm>
          </Kaart>

          {/* ---------------------------- 8 Achtergrond ---------------------------- */}
          <Kaart nummer={8} titel="Achtergrondinformatie">
            <ActionForm action={wijzigAchtergrond} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <TextArea label="Wat we weten van vorige keer" name="backgroundPrevious" rows={3} defaultValue={c.backgroundPrevious ?? ''} />
              <TextArea label="Risico’s" name="backgroundRisks" rows={3} defaultValue={c.backgroundRisks ?? ''} hint="Eén punt per regel." />
            </ActionForm>
          </Kaart>

          {/* ---------------------------- 9 Hypothese ---------------------------- */}
          <Kaart nummer={9} titel="Hypothese" uitleg="Alleen getallen, met per aanname de bron. Pas ze aan per campagne; de rest rekent het portaal.">
            <ActionForm action={wijzigAannames} submitLabel="Opslaan en herrekenen" resetOnSuccess={false}>
              {verborgen}
              <div className="grid gap-3 sm:grid-cols-2">
                <Aanname label="Eenheden per conversie" naam="units" waarde={formatHonderdsten(c.unitsPerConversionHundredths)} hint="Meestal 1" bronNaam="sourceUnits" bron={c.sourceUnits} />
                <Aanname label="Conversieratio (%)" naam="conversion" waarde={c.conversionRateBp ? formatBp(c.conversionRateBp) : ''} hint="Bijvoorbeeld 2,5" bronNaam="sourceConversion" bron={c.sourceConversion} />
                <Aanname label="Doorklikratio (%)" naam="ctr" waarde={c.clickThroughRateBp ? formatBp(c.clickThroughRateBp) : ''} hint="Bijvoorbeeld 1" bronNaam="sourceClickThrough" bron={c.sourceClickThrough} />
                <Aanname label="Kosten per 1.000 impressies (€)" naam="cpm" waarde={bedragVeld(c.cpmCents)} hint="Bijvoorbeeld 8" bronNaam="sourceCpm" bron={c.sourceCpm} />
                <Field label="Buffer (%)" name="buffer" defaultValue={formatBp(c.bufferBp)} hint="Vaste regel: 20" />
              </div>
              <TextArea label="Opmerkingen bij de aannames" name="assumptionNotes" rows={2} defaultValue={c.assumptionNotes ?? ''} hint="Bijvoorbeeld: gemiddeld 3 per reservering. Eén punt per regel." />
            </ActionForm>
            <div className="mt-5 border-t border-gray-100 pt-5">
              <HypotheseWeergave v={v} compact />
            </div>
          </Kaart>
        </div>

        {/* ---------------------------- Zijkolom ---------------------------- */}
        <aside className="space-y-6">
          <section className="rounded-xl bg-white p-5 shadow-sm">
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
              <p className="mb-3 text-xs text-gray-600">{c.proposalFields.length} {c.proposalFields.length === 1 ? 'veld staat' : 'velden staan'} als voorstel.</p>
            )}

            <div className="space-y-2">
              {(c.status === 'concept' || ((c.status === 'voorstel' || c.status === 'akkoord') && gewijzigd)) && (
                <StatusKnop action={verstuurVoorstel} campaignId={c.id} label={c.version === 0 ? 'Verstuur als voorstel' : 'Verstuur als nieuwe versie'} primair />
              )}
              {c.status === 'voorstel' && <StatusKnop action={klantAkkoord} campaignId={c.id} label="Klant is akkoord" primair={!gewijzigd} />}
              {c.status === 'akkoord' && <StatusKnop action={rondAf} campaignId={c.id} label="Rond af" />}
              {(c.status === 'voorstel' || c.status === 'afgerond') && <StatusKnop action={terugNaarConcept} campaignId={c.id} label="Terug naar concept" />}
            </div>

            {c.status === 'akkoord' && !c.clickupTaskId && (
              <div className="border-jr-orange bg-jr-orange/10 mt-3 rounded border-l-4 p-2.5 text-xs">
                <p className="mb-2">De tijdlijn staat nog niet in ClickUp.</p>
                <StatusKnop action={naarClickUp} campaignId={c.id} label="Zet in ClickUp" />
              </div>
            )}
            {c.clickupTaskId && (
              <p className="mt-3 text-xs">
                <a href={`https://app.clickup.com/t/${c.clickupTaskId}`} className="text-jr-blue hover:underline" rel="noreferrer noopener" target="_blank">
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

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base">In het kort</h2>
            <dl className="space-y-1.5 text-sm">
              <Gegeven label="Doel" waarde={v.doelEenheden > 0 ? formatAantal(v.doelEenheden) : null} />
              <Gegeven label="Omzet" waarde={v.omzetCents > 0 ? euro(v.omzetCents) : null} />
              <Gegeven
                label={c.budgetMode === 'vast' ? 'Vast budget' : 'Advies budget'}
                waarde={v.hypothese.ok ? euro(v.hypothese.hypothese.budgetCents) : null}
              />
              <Gegeven
                label="Deel van de omzet"
                waarde={v.hypothese.ok && v.hypothese.hypothese.budgetVanOmzetBp !== null ? `${formatBp(v.hypothese.hypothese.budgetVanOmzetBp)}%` : null}
              />
              <Gegeven label="Marketingmanager" waarde={v.marketingmanager?.name ?? null} />
            </dl>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
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

          {c.version === 0 && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <ActionForm
                action={wisCampagne}
                submitLabel="Verwijder deze campagne"
                submitClassName="text-jr-red hover:bg-jr-red/5 border border-gray-200 w-full"
                resetOnSuccess={false}
                meldGelukt={false}
                className="space-y-2"
              >
                {verborgen}
                <p className="text-xs text-gray-500">Kan zolang hij nog niet naar de klant is gestuurd.</p>
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </AppShell>
  )
}

/* ------------------------------ Bouwstenen ------------------------------- */

function Kaart({ nummer, titel, uitleg, children }: { nummer?: number; titel: string; uitleg?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-base">
        {nummer !== undefined && <span className="mr-2 font-normal text-gray-500">{nummer}</span>}
        {titel}
      </h2>
      {uitleg && <p className="mt-0.5 text-xs text-gray-600">{uitleg}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Gegeven({ label, waarde }: { label: string; waarde: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 sm:block">
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd>{waarde || <span className="text-gray-500">{LEEG}</span>}</dd>
    </div>
  )
}

function VoorstelVink({ naam, v }: { naam: 'doel' | 'budget' | 'kernboodschap' | 'regio'; v: CampagneVolledig }) {
  return (
    <Check
      label="Dit is een voorstel aan de klant"
      name={`voorstel_${naam}`}
      defaultChecked={v.campagne.proposalFields.includes(naam)}
    />
  )
}

function Aanname({ label, naam, waarde, hint, bronNaam, bron }: { label: string; naam: string; waarde: string; hint: string; bronNaam: string; bron: string | null }) {
  return (
    <div className="space-y-1.5 rounded-lg bg-gray-100 p-3">
      <Field label={label} name={naam} defaultValue={waarde} hint={hint} required={naam === 'units'} />
      <Field label="Bron" name={bronNaam} defaultValue={bron ?? ''} placeholder="Marktgemiddelde, Ads Manager, Odoo" />
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

function StatusKnop({ action, campaignId, label, primair = false }: { action: Actie; campaignId: string; label: string; primair?: boolean }) {
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
