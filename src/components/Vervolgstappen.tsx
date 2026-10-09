import type { Stap } from '@/lib/aanname'

/**
 * De vervolgstappen rond een nieuwe collega, als lijst met wat klaar is.
 *
 * Niets om af te vinken: elke stap is klaar als het portaal ziet dat hij
 * gedaan is. Zo kan een lijst niet groen staan terwijl het contract nog in
 * iemands tas zit.
 */
export function Vervolgstappen({ stappen, titel = 'Vervolgstappen' }: { stappen: Stap[]; titel?: string }) {
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
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
