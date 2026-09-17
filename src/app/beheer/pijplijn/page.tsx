import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select, Uitklap } from '@/components/ActionForm'
import { listTeam } from '@/lib/team'
import {
  getBord,
  getScorekaart,
  listDealEigenaren,
  listBedrijfsnamen,
  BRON_LABELS,
  type Bedragen,
  type DealKaart,
} from '@/lib/pijplijn'
import {
  nieuweDeal,
  dealNaarFase,
  dealVolgendeActie,
  dealGewonnen,
  dealVerloren,
} from '../pijplijn-actions'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'

/**
 * Netlify kapt een functie na tien seconden af.
 * Deze pagina doet zeven queries; dat is binnen de grens. Controleer dat met
 * npm run tel:queries voordat je hier iets bij zet.
 */
export const maxDuration = 26

/**
 * De salespijplijn.
 *
 * Wat deze pagina anders doet dan een gewoon kanbanbord: bovenaan staat niet
 * het totaal maar de ACHTERSTAND. Deals zonder afgesproken vervolgstap, en
 * deals waarvan de datum voorbij is. Dat is het enige wat een pijplijn laat
 * werken — een deal zonder volgende stap raakt niemand meer aan en blijkt
 * een half jaar later verloren.
 *
 * Geen slepen met kaarten. Dat voelt fijn maar het is een clientcomponent
 * met eigen toestand, en elke verplaatsing kost hier een netwerkronde naar
 * Frankfurt. Een keuzelijst op de kaart is minder sexy en doet het altijd.
 */
export default async function PijplijnPage({
  searchParams,
}: {
  searchParams: Promise<{ eigenaar?: string; status?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const q = await searchParams
  const filter = {
    eigenaar: (q.eigenaar ?? '').trim() || undefined,
    status: (q.status ?? 'open').trim(),
  }

  const bord = await getBord(filter)
  const scorekaart = await getScorekaart(filter)
  const eigenaren = await listDealEigenaren()
  const bedrijven = await listBedrijfsnamen()
  const team = await listTeam()

  const fases = bord.kolommen.map((k) => k.fase)

  return (
    <AppShell user={user} actief="pijplijn" breed>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-jr-blue text-2xl">Pijplijn</h1>
          <p className="text-sm text-gray-600">
            {bord.aantalOpen} open {bord.aantalOpen === 1 ? 'deal' : 'deals'}
            {scorekaart.scoringskansPercent !== null &&
              ` · ${scorekaart.scoringskansPercent}% van de gesloten deals gewonnen`}
          </p>
        </div>

        <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
          <Cijfer label="In de pijplijn" bedragen={bord.totaal} />
          <Cijfer
            label="Gewogen"
            bedragen={bord.gewogenTotaal}
            hint="bedrag maal de kans van de fase"
          />
          <Cijfer label="Gewonnen" bedragen={scorekaart.gewonnenBedragen} />
        </dl>
      </div>

      {/* Filters in de URL, zodat je een selectie kunt bewaren of doorsturen. */}
      <form method="get" className="mb-5 flex flex-wrap items-end gap-2">
        {eigenaren.length > 0 && (
          <select
            name="eigenaar"
            defaultValue={filter.eigenaar ?? ''}
            aria-label="Alle eigenaren"
            className="focus:border-jr-blue rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
          >
            <option value="">Alle eigenaren</option>
            {eigenaren.map((e) => (
              <option key={e.id} value={e.id}>
                {e.naam}
              </option>
            ))}
          </select>
        )}
        <select
          name="status"
          defaultValue={filter.status}
          aria-label="Status"
          className="focus:border-jr-blue rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        >
          <option value="open">Alleen open</option>
          <option value="won">Gewonnen</option>
          <option value="lost">Verloren</option>
          <option value="alles">Alles</option>
        </select>
        <button
          type="submit"
          className="bg-jr-btn hover:bg-jr-btnhover rounded-lg px-4 py-2 text-sm text-white"
        >
          Filteren
        </button>
      </form>

      {/* DE ACHTERSTAND. Bovenaan, niet in een filter dat je moet aanzetten. */}
      {bord.achterstand.length > 0 && (
        <section className="border-jr-orange bg-jr-orange/5 mb-6 rounded-xl border-l-4 p-4">
          <h2 className="mb-1 text-base">
            {bord.achterstand.length}{' '}
            {bord.achterstand.length === 1 ? 'deal wacht' : 'deals wachten'} op jou
          </h2>
          <p className="mb-3 text-xs text-gray-600">
            Geen vervolgstap afgesproken, of de datum is voorbij. Een deal zonder volgende
            stap raakt niemand meer aan.
          </p>
          <ul className="divide-y divide-gray-200">
            {bord.achterstand.map((k) => (
              <li key={k.deal.id} className="py-2 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="text-sm">
                      {k.deal.title}
                      <span className="text-gray-600"> &middot; {k.klantNaam}</span>
                    </p>
                    <p className="text-xs">
                      {k.deal.nextAction === null ? (
                        <span className="text-jr-orange">nog niets afgesproken</span>
                      ) : (
                        <span className="text-jr-orange">
                          {k.deal.nextAction} &middot;{' '}
                          {k.actieOverDagen === 0
                            ? 'vandaag'
                            : `${Math.abs(k.actieOverDagen ?? 0)} dagen te laat`}
                        </span>
                      )}
                      {k.eigenaarNaam && (
                        <span className="text-gray-500"> &middot; {k.eigenaarNaam}</span>
                      )}
                    </p>
                  </div>
                  <VolgendeActieForm dealId={k.deal.id} huidig={k.deal.nextAction} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Het bord. Horizontaal schuiven op een smal scherm; kolommen worden
          niet samengedrukt, want dan is een kaart niet meer te lezen. */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: `${bord.kolommen.length * 17}rem` }}>
          {bord.kolommen.map((kolom) => (
            <div key={kolom.fase.id} className="w-64 shrink-0">
              <div className="mb-2 px-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-bold">{kolom.fase.name}</h2>
                  <span className="text-xs text-gray-500">{kolom.kaarten.length}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {kolom.fase.probabilityPercent}% kans
                  {(kolom.bedragen.perMaandCents > 0 || kolom.bedragen.eenmaligCents > 0) && (
                    <>
                      {' '}
                      &middot; <BedragKort bedragen={kolom.bedragen} />
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                {kolom.kaarten.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-400">
                    leeg
                  </p>
                ) : (
                  kolom.kaarten.map((k) => (
                    <DealKaartje key={k.deal.id} kaart={k} fases={fases} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Waarom we deals verliezen. Dit is waar de scorekaart pas nuttig
            wordt: een percentage is een getal, een reden is iets om aan te
            werken. */}
        <div>
          {scorekaart.verliesredenen.length > 0 ? (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Waarom we verliezen</h2>
              <p className="mb-3 text-xs text-gray-500">
                {scorekaart.verloren} verloren tegenover {scorekaart.gewonnen} gewonnen. Een
                percentage zegt hoe je het doet; deze lijst zegt wat je eraan kunt doen.
              </p>
              <ul className="divide-y divide-gray-200">
                {scorekaart.verliesredenen.map((r) => (
                  <li
                    key={r.reden}
                    className="flex items-baseline justify-between gap-4 py-2 text-sm first:pt-0"
                  >
                    <span>{r.reden}</span>
                    <span className="tabular shrink-0 text-gray-600">
                      {r.aantal}&times;
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base">Waarom we verliezen</h2>
              <p className="text-sm text-gray-600">
                Nog geen verloren deals vastgelegd. Zodra je er een op verloren zet met een
                reden, komt hier het overzicht waarmee je kunt zien waar het telkens op
                afketst.
              </p>
            </section>
          )}
        </div>

        <aside className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base">Deal toevoegen</h2>
          <p className="mb-3 text-xs text-gray-500">
            Alleen het bedrijf en een naam zijn verplicht. Spreek meteen een vervolgstap af;
            dan hoeft hij nooit in de achterstand te staan.
          </p>
          <ActionForm action={nieuweDeal} submitLabel="Deal aanmaken">
            <Select
              label="Bedrijf"
              name="organizationId"
              options={bedrijven.map((b) => ({ value: b.id, label: b.naam }))}
              hint="Staat het bedrijf er nog niet bij? Maak het eerst aan als lead bij Klanten."
            />
            <Field label="Waar gaat het over" name="titel" required placeholder="Marketing partnership" />
            <Select
              label="Soort"
              name="soort"
              defaultValue="retainer"
              options={[
                { value: 'retainer', label: 'Retainer (bedrag per maand)' },
                { value: 'project', label: 'Project (bedrag eenmalig)' },
              ]}
            />
            <Field
              label="Bedrag"
              name="bedrag"
              placeholder="1600"
              hint="Bij een retainer per maand, bij een project het totaal. Leeg laten mag."
            />
            <Select
              label="Eigenaar"
              name="eigenaar"
              options={[
                { value: '', label: 'Nog niet toegewezen' },
                ...team.map((t) => ({ value: t.id, label: t.name ?? t.email })),
              ]}
            />
            <Select
              label="Waar komt het vandaan"
              name="bron"
              options={[
                { value: '', label: 'Onbekend' },
                ...Object.entries(BRON_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Field label="Verwacht rond" name="sluitdatum" type="date" />

            <div className="border-t border-gray-200 pt-3">
              <p className="mb-2 text-xs font-bold text-gray-600">Volgende stap</p>
              <Field label="Wat ga je doen" name="actie" placeholder="Bellen voor een afspraak" />
              <Field label="Wanneer" name="actiedatum" type="date" />
            </div>
          </ActionForm>
        </aside>
      </div>
    </AppShell>
  )
}

/* --------------------------------- Delen -------------------------------- */

/**
 * Twee bedragen naast elkaar, nooit opgeteld.
 *
 * Een retainer van 1.600 per maand en een project van 8.000 eenmalig zijn
 * niet samen te vatten in één getal zonder te liegen. Dus staan ze er als
 * twee.
 */
function Cijfer({
  label,
  bedragen,
  hint,
}: {
  label: string
  bedragen: Bedragen
  hint?: string
}) {
  const leeg = bedragen.perMaandCents === 0 && bedragen.eenmaligCents === 0

  return (
    <div>
      <dt className="text-xs text-gray-600">{label}</dt>
      <dd className="leading-tight">
        {leeg ? (
          <span className="text-xl text-gray-400">&mdash;</span>
        ) : (
          <>
            {bedragen.perMaandCents > 0 && (
              <span className="tabular text-jr-blue block text-xl font-bold">
                {formatCents(bedragen.perMaandCents)}
                <span className="text-xs font-normal text-gray-500"> /mnd</span>
              </span>
            )}
            {bedragen.eenmaligCents > 0 && (
              <span className="tabular block text-sm">
                {formatCents(bedragen.eenmaligCents)}
                <span className="text-xs text-gray-500"> eenmalig</span>
              </span>
            )}
          </>
        )}
      </dd>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function BedragKort({ bedragen }: { bedragen: Bedragen }) {
  const delen: string[] = []
  if (bedragen.perMaandCents > 0) delen.push(`${formatCents(bedragen.perMaandCents)}/mnd`)
  if (bedragen.eenmaligCents > 0) delen.push(`${formatCents(bedragen.eenmaligCents)}`)
  return <>{delen.join(' + ')}</>
}

/** Eén deal op het bord. */
function DealKaartje({
  kaart,
  fases,
}: {
  kaart: DealKaart
  fases: { id: string; name: string }[]
}) {
  const { deal } = kaart
  const dicht = deal.status !== 'open'

  return (
    <div
      className={`rounded-lg bg-white p-3 shadow-sm ${
        kaart.looptAchter ? 'border-jr-orange border-l-4' : ''
      }`}
    >
      <p className="text-sm leading-snug">{deal.title}</p>
      <a
        href={`/beheer/klanten/${kaart.klantSlug}`}
        className="hover:text-jr-blue block text-xs text-gray-600"
      >
        {kaart.klantNaam}
      </a>

      {deal.valueCents !== null && (
        <p className="tabular mt-1 text-sm">
          {formatCents(deal.valueCents)}
          <span className="text-xs text-gray-500">
            {deal.kind === 'retainer' ? ' /mnd' : ' eenmalig'}
          </span>
        </p>
      )}

      <p className="mt-1 text-xs">
        {dicht ? (
          <span className={deal.status === 'won' ? 'text-emerald-700' : 'text-gray-500'}>
            {deal.status === 'won' ? 'Gewonnen' : `Verloren — ${deal.lostReason}`}
          </span>
        ) : deal.nextAction === null ? (
          <span className="text-jr-orange">geen vervolgstap</span>
        ) : (
          <span className={kaart.looptAchter ? 'text-jr-orange' : 'text-gray-600'}>
            {deal.nextAction}
            {deal.nextActionOn && ` · ${formatDate(deal.nextActionOn)}`}
          </span>
        )}
      </p>

      {kaart.eigenaarNaam && (
        <p className="mt-0.5 text-xs text-gray-400">{kaart.eigenaarNaam}</p>
      )}

      {!dicht && (
        <Uitklap label="Bijwerken" className="mt-2">
          <div className="space-y-4">
            <ActionForm action={dealNaarFase} submitLabel="Verplaatsen">
              <input type="hidden" name="dealId" value={deal.id} />
              <Select
                label="Naar fase"
                name="stageId"
                defaultValue={deal.stageId}
                options={fases.map((f) => ({ value: f.id, label: f.name }))}
              />
            </ActionForm>

            <div className="border-t border-gray-200 pt-3">
              <VolgendeActieForm dealId={deal.id} huidig={deal.nextAction} />
            </div>

            <div className="border-t border-gray-200 pt-3">
              <ActionForm
                action={dealGewonnen}
                submitLabel="Gewonnen"
                submitClassName="bg-emerald-600 hover:bg-emerald-700 text-white !px-3 !py-1.5 !text-xs rounded-lg"
                resetOnSuccess={false}
              >
                <input type="hidden" name="dealId" value={deal.id} />
                <p className="text-xs text-gray-500">
                  Het bedrijf wordt hiermee klant. Een abonnement maak je daarna zelf aan;
                  geld dat elke maand beweegt hoort een bewuste handeling te zijn.
                </p>
              </ActionForm>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <ActionForm action={dealVerloren} submitLabel="Verloren">
                <input type="hidden" name="dealId" value={deal.id} />
                <Field
                  label="Waarom"
                  name="reden"
                  required
                  placeholder="Te duur gevonden"
                  hint="Verplicht. Zonder reden leer je er niets van."
                />
              </ActionForm>
            </div>
          </div>
        </Uitklap>
      )}
    </div>
  )
}

/** De vervolgstap vastleggen. Staat op twee plekken, dus apart. */
function VolgendeActieForm({
  dealId,
  huidig,
}: {
  dealId: string
  huidig: string | null
}) {
  return (
    <ActionForm action={dealVolgendeActie} submitLabel="Vastleggen">
      <input type="hidden" name="dealId" value={dealId} />
      <Field
        label="Volgende stap"
        name="actie"
        defaultValue={huidig ?? ''}
        placeholder="Terugbellen"
      />
      <Field label="Wanneer" name="actiedatum" type="date" />
    </ActionForm>
  )
}
