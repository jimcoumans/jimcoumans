import type { KlantreisStand } from '@/lib/klantreis'
import { vinkMijlpaal, rondStapAf } from '@/app/beheer/klantreis-actions'
import { MijlpaalVink } from '@/components/MijlpaalVink'
import { ActionForm } from '@/components/ActionForm'
import { formatDate } from '@/lib/dates'

/* De klantreis op de klantkaart: een balk voor het overzicht en het hele
   verloop in een eigen tabblad. */

const FASE_KLEUR: Record<string, string> = {
  Verkopen: 'text-jr-link',
  Starten: 'text-[#7E2FB0]',
  Samenwerken: 'text-[#1D7D3F]',
}

/** Stap "03" heet voor mensen gewoon stap 3. */
export const stapNummer = (nr: string) => String(Number(nr))

/** Acht streepjes in drie fasen: klaar, nu of nog niet. Klik gaat naar het tabblad. */
export function KlantreisBalk({ stand, slug }: { stand: KlantreisStand; slug: string }) {
  const fasen = ['Verkopen', 'Starten', 'Samenwerken'] as const
  return (
    <a href={`/beheer/klanten/${slug}?tab=klantreis`} className="block rounded-xl bg-white p-6 shadow-sm hover:shadow-md">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[17px] font-medium">{stand.huidig.titel}</p>
        <p className="text-sm text-gray-600">
          Stap {stapNummer(stand.huidig.nr)} van {stand.stappen.length}
        </p>
      </div>
      <div className="flex gap-3">
        {fasen.map((fase) => {
          const stappen = stand.stappen.filter((s) => s.fase === fase)
          return (
            <div key={fase} style={{ flexGrow: stappen.length, flexBasis: 0 }} className="min-w-0">
              <ol className="flex gap-1">
                {stappen.map((s) => {
                  const nu = s.nr === stand.huidig.nr
                  return (
                    <li key={s.nr} title={s.titel} className="flex-1">
                      <div className={`h-1.5 rounded-full ${s.klaar ? 'bg-[#34C759]' : nu ? 'bg-jr-blue' : 'bg-gray-200'}`} />
                    </li>
                  )
                })}
              </ol>
              <p className={`mt-2 truncate text-xs ${stappen.some((s) => s.nr === stand.huidig.nr) ? 'text-jr-text font-medium' : 'text-gray-500'}`}>
                {fase}
              </p>
            </div>
          )
        })}
      </div>
    </a>
  )
}

/** Het hele verloop, per fase, met de mijlpalen om af te vinken. */
export function KlantreisDetail({
  stand,
  organizationId,
  slug,
}: {
  stand: KlantreisStand
  organizationId: string
  slug: string
}) {
  const fasen = ['Verkopen', 'Starten', 'Samenwerken'] as const
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          {stand.gedaan} van de {stand.totaal} mijlpalen af. De klant staat bij de eerste stap waar nog iets open is.
        </p>
        {stand.huidig.nr !== '08' && (
          <ActionForm
            action={rondStapAf}
            submitLabel="Bestaande klant? Vink stap 1 tot en met 7 af"
            submitClassName="border border-gray-300 text-gray-700 hover:bg-gray-50"
            resetOnSuccess={false}
            meldGelukt={false}
            className=""
          >
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="nr" value="07" />
          </ActionForm>
        )}
      </div>

      {fasen.map((fase) => (
        <section key={fase}>
          <h2 className={`mb-3 text-sm font-semibold tracking-wide uppercase ${FASE_KLEUR[fase]}`}>{fase}</h2>
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stand.stappen
              .filter((s) => s.fase === fase)
              .map((s) => {
                const nu = s.nr === stand.huidig.nr
                return (
                  <article
                    key={s.nr}
                    className={`rounded-xl bg-white p-5 shadow-sm ${nu ? 'ring-jr-blue ring-2' : ''}`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          s.klaar ? 'bg-[#E6F7EB] text-[#1D7D3F]' : nu ? 'bg-jr-blue text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.klaar ? '✓' : stapNummer(s.nr)}
                      </span>
                      <span className="text-xs text-gray-600">{s.klaar ? 'Klaar' : nu ? 'Nu' : ''}</span>
                    </div>
                    <h3 className="text-[17px]">{s.titel}</h3>
                    <p className="mt-1 mb-3 text-[13px] text-gray-600">{s.klaarAls}</p>
                    <div className="-mx-2 space-y-0.5">
                      {s.mijlpalen.map((m) => (
                        <MijlpaalVink
                          key={`${m.key}-${m.gedaanOp ? 1 : 0}`}
                          action={vinkMijlpaal}
                          organizationId={organizationId}
                          slug={slug}
                          sleutel={m.key}
                          gedaan={m.gedaanOp !== null}
                          label={m.label}
                          onder={m.gedaanOp ? `${formatDate(m.gedaanOp)}${m.door ? `, ${m.door}` : ''}` : ''}
                        />
                      ))}
                    </div>
                  </article>
                )
              })}
          </div>
        </section>
      ))}
    </div>
  )
}
