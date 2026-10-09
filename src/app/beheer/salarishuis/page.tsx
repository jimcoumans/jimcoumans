import React from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { listHuizen, tabel, berekenBeloning, contractenOpHuis, type Huis } from '@/lib/salarishuis'
import { formatCents } from '@/lib/money'
import { formatDate, formatDateInput } from '@/lib/dates'
import { Paneel, PaneelKop } from '@/components/Paneel'
import { ActionForm, Field, TextArea } from '@/components/ActionForm'
import { SalarisRekenhulp } from '@/components/SalarisRekenhulp'
import { nieuweHuisVersie, huisCorrigeren, huisWissen } from '../salarishuis-actions'

/**
 * Netlify kapt een functie na tien seconden af. Deze pagina doet twee
 * queries en rekent verder alles zelf uit; ruim binnen de grens.
 */
export const maxDuration = 26

/**
 * Het salarishuis.
 *
 * Alleen voor beheerders: hier staan de bedragen waar elk contract uit
 * volgt. De pagina controleert dat zelf, los van het feit dat de link niet
 * in de navigatie staat voor anderen.
 *
 * Wat je hier ziet is de UITKOMST van een formule, niet een lijst die
 * iemand heeft ingetypt. Klopt een bedrag niet, dan klopt de grondslag of
 * een percentage niet; los het daar op en niet in een cel.
 */
export default async function SalarishuisPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/beheer')

  const huizen = await listHuizen()
  const nu = new Date()
  /* Welk huis nu geldt: het laatste met een ingangsdatum die al voorbij is.
     Een versie voor volgend jaar staat bovenaan, maar geldt nog niet. */
  const geldend = huizen.find((h) => h.huis.effectiveFrom <= nu) ?? null
  const gebruik = await Promise.all(huizen.map((h) => contractenOpHuis(h.huis.id)))
  const volgendJaar = new Date(Date.UTC(nu.getUTCFullYear() + 1, 0, 1))

  return (
    <AppShell user={user} actief="salarishuis" breed>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] sm:text-[32px]">Salarishuis</h1>
          <p className="text-sm text-gray-600">
            Schalen en tredes, en wat daaruit volgt. Alle bedragen zijn bruto per maand bij
            een fulltime dienstverband.
          </p>
        </div>
        <Paneel
          knop="+ Nieuwe versie"
          titel="Nieuwe versie van het salarishuis"
          breed
          uitleg="Voor een indexatie of een nieuwe schaal. Contracten van voor de ingangsdatum houden het oude huis; nieuwe contracten rekenen vanaf die datum met deze versie."
        >
          <ActionForm action={nieuweHuisVersie} submitLabel="Versie opslaan">
            <HuisVelden huis={huizen[0] ?? null} datum={formatDateInput(volgendJaar)} />
          </ActionForm>
        </Paneel>
      </div>

      {geldend && geldend.schalen.length > 0 && (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Rekenhulp</h2>
          <p className="mb-4 text-xs text-gray-600">
            Wat iemand verdient op een schaal en trede, bij zijn eigen uren. Rekent met het huis dat nu geldt, op dezelfde manier als het contract.
          </p>
          <SalarisRekenhulp huis={geldend} />
        </section>
      )}

      {huizen.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Er staat nog geen salarishuis in het systeem.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {huizen.map(({ huis, schalen }, index) => {
            const geldigNu = geldend?.huis.id === huis.id
            const inGebruik = gebruik[index] ?? 0
            const rijen = tabel({ huis, schalen })

            /* De onderste trede tegen het minimumloon. Dit is het getal dat
               stilletjes fout gaat: het wettelijk minimum stijgt elk halfjaar
               en de grondslag niet automatisch mee. */
            const onderste =
              schalen.length > 0
                ? berekenBeloning(
                    { huis, schalen },
                    [...schalen].sort((a, b) => a.sortOrder - b.sortOrder)[0]!.name,
                    1,
                    huis.fulltimeHoursWeekQuarters,
                  )
                : null

            return (
              <section key={huis.id} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <div>
                    <h2 className="text-base">
                      Geldig vanaf {formatDate(huis.effectiveFrom)}
                      {geldigNu && (
                        <span className="bg-jr-lightblue text-jr-deepblue ml-2 rounded-full px-2 py-0.5 text-xs">
                          Nu van kracht
                        </span>
                      )}
                    </h2>
                    {huis.effectiveFrom > nu && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Gaat nog in</span>
                    )}
                    {huis.note && <p className="mt-0.5 text-xs text-gray-500">{huis.note}</p>}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {inGebruik === 0
                        ? 'Nog geen contracten op opgesteld.'
                        : `${inGebruik} ${inGebruik === 1 ? 'contract' : 'contracten'} op opgesteld. Wijzigen gaat met een nieuwe versie.`}
                    </p>
                    {inGebruik === 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Paneel knop="Corrigeren" stijl="rustig" titel={`Salarishuis vanaf ${formatDate(huis.effectiveFrom)} corrigeren`} breed uitleg="Kan zolang er geen contract op dit huis is opgesteld.">
                          <ActionForm action={huisCorrigeren} submitLabel="Correctie opslaan" resetOnSuccess={false}>
                            <input type="hidden" name="huisId" value={huis.id} />
                            <HuisVelden huis={{ huis, schalen }} datum={formatDateInput(huis.effectiveFrom)} />
                          </ActionForm>
                        </Paneel>
                        {huizen.length > 1 && (
                          <ActionForm action={huisWissen} submitLabel="Wissen" submitClassName="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 !px-3 !py-1.5 !text-xs" resetOnSuccess={false} meldGelukt={false} bevestig className="">
                            <input type="hidden" name="huisId" value={huis.id} />
                          </ActionForm>
                        )}
                      </div>
                    )}
                  </div>

                  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    <Kerncijfer label="Grondslag" waarde={formatCents(huis.baseCents)} />
                    <Kerncijfer
                      label="Per trede"
                      waarde={`${(huis.stepIncreaseBp / 100).toFixed(2).replace('.', ',')}%`}
                    />
                    <Kerncijfer
                      label="OP-toeslag"
                      waarde={`${huis.pensionAllowanceBp / 100}%`}
                    />
                    <Kerncijfer
                      label="Vakantietoeslag"
                      waarde={`${huis.holidayAllowanceBp / 100}%`}
                    />
                    <Kerncijfer
                      label="Fulltime"
                      waarde={`${huis.fulltimeHoursWeekQuarters / 100} uur`}
                    />
                    <Kerncijfer
                      label="Vakantie-uren"
                      waarde={`${huis.holidayHoursFulltime} uur`}
                    />
                  </dl>
                </div>

                {onderste && (
                  <p
                    className={`mb-4 rounded-lg px-3 py-2 text-xs ${
                      onderste.onderMinimumloon === true
                        ? 'bg-jr-orange/10 text-jr-orange'
                        : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    De onderste trede komt uit op{' '}
                    <strong>{formatCents(onderste.uurloonCents)} per uur</strong>.{' '}
                    {huis.minimumHourlyCents === null ? (
                      <>
                        Er staat geen wettelijk minimumuurloon bij dit huis, dus er wordt
                        niets getoetst.
                      </>
                    ) : onderste.onderMinimumloon ? (
                      <>
                        Dat is <strong>onder</strong> het wettelijk minimum van{' '}
                        {formatCents(huis.minimumHourlyCents)}. Verhoog de grondslag.
                      </>
                    ) : (
                      <>
                        Het wettelijk minimum staat op{' '}
                        {formatCents(huis.minimumHourlyCents)}. Dat gaat elk halfjaar
                        omhoog en dit huis niet automatisch mee; controleer het in januari
                        en juli.
                      </>
                    )}
                  </p>
                )}

                <div className="overflow-x-auto">
                  <table className="text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                        <th className="px-3 py-2 font-normal">Trede</th>
                        {rijen.map((r) => (
                          <th key={r.schaal} className="px-3 py-2 text-right font-normal" colSpan={2}>
                            {r.schaal}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-200 text-left text-xs text-gray-400">
                        <th className="px-3 py-1 font-normal"></th>
                        {rijen.map((r) => (
                          <React.Fragment key={r.schaal}>
                            <th className="px-3 py-1 text-right font-normal">Per maand</th>
                            <th className="px-3 py-1 text-right font-normal">Incl. OP-toeslag</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Array.from(
                        { length: Math.max(...rijen.map((r) => r.tredes.length)) },
                        (_, i) => i + 1,
                      ).map((trede) => (
                        <tr key={trede}>
                          <td className="tabular px-3 py-1.5 text-gray-500">{trede}</td>
                          {rijen.map((r) => {
                            const cel = r.tredes[trede - 1]
                            return (
                              <React.Fragment key={r.schaal}>
                                <td className="tabular px-3 py-1.5 text-right">
                                  {cel ? formatCents(cel.fulltimeCents) : ''}
                                </td>
                                <td className="tabular px-3 py-1.5 text-right text-gray-500">
                                  {cel ? formatCents(cel.metToeslagCents) : ''}
                                </td>
                              </React.Fragment>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  De opslag per schaal stapelt: elke schaal is een percentage van de vorige,
                  niet van de grondslag.{' '}
                  {[...schalen]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((s, i) =>
                      i === 0
                        ? `${s.name} is de grondslag`
                        : `${s.name} is ${s.multiplierBp / 100}% van ${
                            [...schalen].sort((a, b) => a.sortOrder - b.sortOrder)[i - 1]!.name
                          }`,
                    )
                    .join(', ')}
                  .
                </p>
              </section>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}

const INVOER = 'min-h-11 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400'

/** De velden van een huis, voor een nieuwe versie en voor een correctie. */
function HuisVelden({ huis, datum }: { huis: Huis | null; datum: string }) {
  const h = huis?.huis
  const schalen = huis ? [...huis.schalen].sort((a, b) => a.sortOrder - b.sortOrder) : []
  const pct = (bp: number | undefined, standaard: string) => (bp === undefined ? standaard : String(bp / 100).replace('.', ','))
  const regels = Array.from({ length: 6 }, (_, n) => schalen[n] ?? null)
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Geldig vanaf" name="ingangsdatum" type="date" required defaultValue={datum} />
      <Field label="Grondslag (schaal 1, trede 1, fulltime)" name="grondslag" required defaultValue={h ? formatCents(h.baseCents).replace('€', '').trim() : ''} placeholder="2.578,00" />
      <Field label="Verhoging per trede (%)" name="perTrede" required defaultValue={pct(h?.stepIncreaseBp, '1,5')} />
      <Field label="OP-toeslag (%)" name="opToeslag" required defaultValue={pct(h?.pensionAllowanceBp, '10')} hint="Bij geen pensioenregeling. Gaat over het maandbedrag." />
      <Field label="Vakantietoeslag (%)" name="vakantietoeslag" required defaultValue={pct(h?.holidayAllowanceBp, '8')} hint="Wettelijk minimaal 8%." />
      <Field label="Fulltime (uur per week)" name="fulltime" required defaultValue={h ? String(h.fulltimeHoursWeekQuarters / 100).replace('.', ',') : '40'} />
      <Field label="Vakantie-uren per jaar bij fulltime" name="vakantieUren" required defaultValue={h ? String(h.holidayHoursFulltime) : '200'} hint="Wettelijk minimaal vier keer de werkweek." />
      <Field label="Wettelijk minimumuurloon" name="minimumloon" defaultValue={h?.minimumHourlyCents ? formatCents(h.minimumHourlyCents).replace('€', '').trim() : ''} hint="Gaat elk halfjaar omhoog. Het huis wordt ertegen getoetst." />
      <PaneelKop uitleg="Van onder naar boven. De opslag is ten opzichte van de schaal eronder: Senior 125% is 125% van Medior. Lege regels tellen niet mee.">Schalen</PaneelKop>
      <div className="space-y-2 sm:col-span-2">
        <div className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-2 text-[13px] font-medium">
          <span>Naam</span>
          <span>Opslag t.o.v. vorige (%)</span>
          <span>Tredes</span>
        </div>
        {regels.map((s, n) => (
          <div key={n} className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-2">
            <input aria-label={`Schaal ${n + 1}: naam`} name={`schaal${n}`} defaultValue={s?.name ?? ''} placeholder={n === 0 ? 'Junior' : ''} className={INVOER} />
            <input aria-label={`Schaal ${n + 1}: opslag`} name={`opslag${n}`} inputMode="decimal" defaultValue={s ? String(s.multiplierBp / 100).replace('.', ',') : ''} placeholder={n === 0 ? '100' : ''} className={INVOER} />
            <input aria-label={`Schaal ${n + 1}: tredes`} name={`tredes${n}`} inputMode="numeric" defaultValue={s ? String(s.steps) : ''} className={INVOER} />
          </div>
        ))}
      </div>
      <div className="sm:col-span-2">
        <TextArea label="Notitie" name="notitie" rows={2} defaultValue={h?.note ?? ''} placeholder="Indexatie 2027: +3%." />
      </div>
    </div>
  )
}

function Kerncijfer({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div>
      <dt className="text-gray-600">{label}</dt>
      <dd className="tabular font-bold">{waarde}</dd>
    </div>
  )
}
