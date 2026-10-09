import type { Stap } from '@/lib/aanname'
import { ActionForm } from '@/components/ActionForm'
import { stapDocument, handboekOntvangen } from '@/app/beheer/aanname-actions'
import { formatDateInput } from '@/lib/dates'

const KLEIN = 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 !px-3 !py-1 !text-xs !min-h-0'

/**
 * De vervolgstappen rond een nieuwe collega, als lijst met wat klaar is.
 *
 * Niets om zomaar af te vinken: elke stap is klaar als het portaal ziet dat
 * hij gedaan is, aan een geupload document of een vastgelegde datum. Zo kan
 * een lijst niet groen staan terwijl het contract nog in iemands tas zit.
 * Waar het kan, regel je het meteen in de lijst.
 */
export function Vervolgstappen({
  stappen,
  titel = 'Vervolgstappen',
  eigenaar,
}: {
  stappen: Stap[]
  titel?: string
  /** Bij wie geuploade documenten horen. Zonder: geen knoppen in de lijst. */
  eigenaar?: { kandidaatId: string } | { userId: string }
}) {
  const klaar = stappen.filter((s) => s.klaar).length
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base">{titel}</h2>
        <span className="tabular text-xs text-gray-600">
          {klaar} van {stappen.length} klaar
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-jr-green h-full rounded-full" style={{ width: `${Math.round((klaar / Math.max(1, stappen.length)) * 100)}%` }} />
      </div>
      <ol className="space-y-2.5">
        {stappen.map((s) => (
          <li key={s.sleutel} className="flex gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full text-[11px] font-bold ${
                s.klaar ? 'bg-jr-green text-white' : 'border-2 border-gray-300 text-transparent'
              }`}
            >
              ✓
            </span>
            <div className="min-w-0 text-sm">
              <p className={s.klaar ? 'text-gray-600' : 'font-medium'}>
                {s.href && !s.klaar ? (
                  <a href={s.href} className="hover:text-jr-blue">
                    {s.titel}
                  </a>
                ) : (
                  s.titel
                )}
                <span className="sr-only">{s.klaar ? ' (klaar)' : ' (nog te doen)'}</span>
              </p>
              {s.toelichting && <p className="text-xs text-gray-500">{s.toelichting}</p>}
              {!s.klaar && eigenaar && s.actie?.soort === 'document' && (
                <ActionForm action={stapDocument} submitLabel="Uploaden" submitClassName={KLEIN} className="mt-1.5 flex flex-wrap items-center gap-2" knopInRij>
                  {'kandidaatId' in eigenaar ? <input type="hidden" name="kandidaatId" value={eigenaar.kandidaatId} /> : <input type="hidden" name="userId" value={eigenaar.userId} />}
                  <input type="hidden" name="soort" value={s.actie.kind} />
                  <input type="file" name="bestand" accept="application/pdf,image/jpeg,image/png" required className="max-w-[16rem] text-xs" aria-label={`${s.titel} uploaden`} />
                </ActionForm>
              )}
              {!s.klaar && s.actie?.soort === 'handboek' && (
                <ActionForm action={handboekOntvangen} submitLabel="Vastleggen" submitClassName={KLEIN} className="mt-1.5 flex flex-wrap items-center gap-2" knopInRij>
                  <input type="hidden" name="contractId" value={s.actie.contractId} />
                  <input type="date" name="op" defaultValue={formatDateInput(new Date())} className="rounded-md border border-gray-300 px-2 py-0.5 text-xs" aria-label="Ontvangen op" />
                </ActionForm>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
