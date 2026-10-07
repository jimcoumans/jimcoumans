import { VRAGEN, CONTACT, NOG_GEEN_WEBSITE, type Antwoorden } from '@/lib/formulieren/vragenlijst'

/* -------------------------------------------------------------------------
   De vragen van 01.1, als velden. Dezelfde velden voor de klant (via de link)
   en voor ons (aan de telefoon samen invullen), zodat er één vragenlijst is.
   Zonder hooks: werkt in een server- en in een clientcomponent.
   ------------------------------------------------------------------------- */

const VELD = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] outline-none hover:border-gray-400 focus:border-jr-blue'
const OPTIE = 'flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[15px] hover:border-gray-400 has-[:checked]:border-jr-blue has-[:checked]:bg-jr-lightblue/40'

export function VragenlijstVelden({ a, metContact = true, voorKlant = false }: { a: Antwoorden; metContact?: boolean; voorKlant?: boolean }) {
  const lijst = (id: string) => (Array.isArray(a[id]) ? (a[id] as string[]) : [])
  const waarde = (id: string) => (a[id] === null || a[id] === undefined ? '' : String(a[id]))
  const geenSite = waarde('website') === NOG_GEEN_WEBSITE
  return (
    <div className="space-y-7">
      {VRAGEN.map((v) => (
        <fieldset key={v.id} className="min-w-0">
          <legend className="mb-1 flex gap-2.5 text-[15px] font-semibold">
            <span className="bg-jr-lightblue text-jr-link inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
              {v.nr}
            </span>
            <span>{v.vraag}</span>
          </legend>
          {v.hulp && <p className="mb-2.5 ml-8 text-sm text-gray-600">{v.hulp}</p>}
          <div className="ml-8">
            {v.soort === 'keuze' && (
              <div className="grid gap-2 sm:grid-cols-2">
                {v.opties.map((o) => (
                  <label key={o} className={OPTIE}>
                    <input type="radio" name={v.id} value={o} defaultChecked={waarde(v.id) === o} className="mt-1" />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            )}
            {v.soort === 'meer' && (
              <div className="grid gap-2 sm:grid-cols-2">
                {v.opties.map((o) => (
                  <label key={o} className={OPTIE}>
                    <input type="checkbox" name={v.id} value={o} defaultChecked={lijst(v.id).includes(o)} className="mt-1" />
                    <span>{o}</span>
                  </label>
                ))}
                {v.anders && (
                  <input name="knelpuntAnders" defaultValue={waarde('knelpuntAnders')} placeholder="Iets anders" aria-label="Iets anders" className={`${VELD} sm:col-span-2`} />
                )}
              </div>
            )}
            {v.soort === 'tekst' && <input name={v.id} defaultValue={waarde(v.id)} className={VELD} aria-label={v.vraag} />}
            {v.soort === 'url' && (
              <div className="space-y-2">
                <input name={v.id} defaultValue={geenSite ? '' : waarde(v.id)} placeholder="www.jouwbedrijf.nl" inputMode="url" className={VELD} aria-label={v.vraag} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="geenWebsite" value="1" defaultChecked={geenSite} />
                  {NOG_GEEN_WEBSITE}
                </label>
              </div>
            )}
            {v.soort === 'getal' && (
              <div className="flex items-center gap-2">
                {v.voor && <span className="text-gray-600">{v.voor}</span>}
                <input name={v.id} defaultValue={waarde(v.id)} inputMode="decimal" className={`${VELD} max-w-40`} aria-label={v.vraag} />
                {v.na && <span className="text-sm text-gray-600">{v.na}</span>}
              </div>
            )}
          </div>
        </fieldset>
      ))}

      {metContact && (
        <fieldset className="min-w-0">
          <legend className="mb-1 text-[15px] font-semibold">{voorKlant ? 'Tot slot: hoe we je bereiken' : 'Contactgegevens'}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {CONTACT.map((c) => (
              <label key={c.id} className="block">
                <span className="text-jr-text mb-1.5 block text-[13px] font-medium">{c.label}</span>
                <input name={c.id} defaultValue={waarde(c.id)} type={c.id === 'email' ? 'email' : c.id === 'telefoon' ? 'tel' : 'text'} className={VELD} />
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}
