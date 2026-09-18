import React from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { listHuizen, tabel, berekenBeloning } from '@/lib/salarishuis'
import { formatCents } from '@/lib/money'
import { formatDate } from '@/lib/dates'

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

  return (
    <AppShell user={user} actief="salarishuis" breed>
      <div className="mb-5">
        <h1 className="text-jr-blue text-2xl">Salarishuis</h1>
        <p className="text-sm text-gray-600">
          Schalen en tredes, en wat daaruit volgt. Alle bedragen zijn bruto per maand bij
          een fulltime dienstverband.
        </p>
      </div>

      {huizen.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Er staat nog geen salarishuis in het systeem.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {huizen.map(({ huis, schalen }, index) => {
            const geldigNu = huis.effectiveFrom <= nu && index === 0
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
              <section key={huis.id} className="rounded-xl bg-white p-5 shadow-sm">
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
                    {huis.note && <p className="mt-0.5 text-xs text-gray-500">{huis.note}</p>}
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
                            <th className="px-3 py-1 text-right font-normal">Incl. OP</th>
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

function Kerncijfer({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div>
      <dt className="text-gray-600">{label}</dt>
      <dd className="tabular font-bold">{waarde}</dd>
    </div>
  )
}
