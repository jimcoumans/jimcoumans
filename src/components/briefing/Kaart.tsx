/** Een genummerd onderdeel van de briefing, in het invulscherm. */
export function Kaart({
  nummer,
  titel,
  uitleg,
  children,
  rechts,
}: {
  nummer?: number
  titel: string
  uitleg?: string
  children: React.ReactNode
  /** Iets rechts naast de titel, zoals een knop. */
  rechts?: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-3 text-[19px]">
          {nummer !== undefined && (
            <span className="bg-jr-lightblue text-jr-link inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {nummer}
            </span>
          )}
          {titel}
        </h2>
        {rechts}
      </div>
      {uitleg && <p className="mt-1.5 max-w-2xl text-sm text-gray-600">{uitleg}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}
