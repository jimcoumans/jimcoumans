import { ActionForm, Field, Select } from './ActionForm'
import { collegaDocument, collegaGegevensOpslaan, collegaDoorgegeven } from '@/app/beheer/aanname-actions'
import { DOCUMENT_LABELS, type Gegevens } from '@/lib/persoonsgegevens'
import { formatDate, formatDateInput, formatDateLong } from '@/lib/dates'

const KNOP_RUSTIG = 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
const KNOP_KLEIN = 'text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs'

/**
 * De persoonsgegevens van een collega: IBAN, kopie ID, loonheffingsformulier
 * en het getekende contract.
 *
 * Alleen voor beheerders; de pagina beslist dat, en elke actie controleert
 * het opnieuw. Komt iemand via werving binnen, dan staat hier wat hij als
 * kandidaat aanleverde.
 */
export function CollegaGegevens({
  userId,
  gegevens,
  iban,
  ibanFout,
  sleutel,
}: {
  userId: string
  gegevens: Gegevens | null
  iban: string | null
  ibanFout: boolean
  sleutel: boolean
}) {
  const r = gegevens?.record ?? null
  const verborgen = <input type="hidden" name="userId" value={userId} />
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base">Persoonsgegevens</h2>
        <p className="text-xs text-gray-500">Versleuteld. Wie een document opent, wordt vastgelegd.</p>
      </div>
      {!sleutel && (
        <p className="border-jr-orange bg-jr-orange/10 mb-3 rounded border-l-4 p-3 text-sm">
          De sleutel voor persoonsgegevens (GEGEVENS_SLEUTEL) staat nog niet in Netlify. Zonder die sleutel kan het portaal geen IBAN of documenten opslaan.
        </p>
      )}
      {ibanFout && <p className="mb-3 text-sm text-[#C02A22]">Het IBAN is niet te lezen met de huidige sleutel.</p>}

      <div className={`mb-4 rounded-lg p-3 text-sm ${gegevens && gegevens.ontbreekt.length === 0 ? 'bg-jr-green/10 text-[#1d7a36]' : 'bg-gray-50 text-gray-700'}`}>
        {!gegevens || gegevens.ontbreekt.length > 0 ? (
          <>Nog nodig: {(gegevens?.ontbreekt ?? ['voornamen zoals in het paspoort', 'geboortedatum', 'adres', 'IBAN', 'kopie ID', 'loonheffingsformulier']).join(', ')}.</>
        ) : r?.doorgegevenOp ? (
          <>Compleet, en doorgegeven aan de salarisadministratie op {formatDateLong(r.doorgegevenOp)}.</>
        ) : (
          <>Compleet. Klaar om door te geven aan de salarisadministratie.</>
        )}
      </div>

      {r && (
        <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-600">Naam volgens paspoort</dt>
            <dd>{[r.officialFirstNames, r.infix, r.lastName].filter(Boolean).join(' ') || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Geboren</dt>
            <dd>{r.birthDate ? `${formatDate(r.birthDate)}${r.birthPlace ? ` in ${r.birthPlace}` : ''}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">Adres</dt>
            <dd>{r.addressLine ? `${r.addressLine}, ${r.postalCode ?? ''} ${r.city ?? ''}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-600">IBAN</dt>
            <dd className="tabular">{iban ? `${iban}${r.accountHolder ? ` · t.n.v. ${r.accountHolder}` : ''}` : '—'}</dd>
          </div>
        </dl>
      )}

      <h3 className="mb-2 text-sm font-semibold">Documenten</h3>
      {gegevens && gegevens.documenten.length > 0 ? (
        <ul className="mb-3 divide-y divide-gray-100 text-sm">
          {gegevens.documenten.map((d) => (
            <li key={d.id} className="py-2">
              <a href={`/api/persoonsgegevens/${d.id}`} target="_blank" rel="noopener" className="text-jr-link font-medium hover:underline">
                {DOCUMENT_LABELS[d.kind]}
              </a>
              <span className="text-xs text-gray-500">
                {' '}
                · {d.filename ?? 'bestand'} · {Math.round(d.bytes / 1024)} kB · {formatDate(d.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-gray-600">Nog geen documenten.</p>
      )}
      <ActionForm action={collegaDocument} submitLabel="Uploaden" submitClassName={KNOP_RUSTIG} className="grid items-end gap-3 sm:grid-cols-[1fr_1.6fr_auto]" knopInRij>
        {verborgen}
        <Select label="Soort" name="soort" defaultValue="contract" options={Object.entries(DOCUMENT_LABELS).map(([value, label]) => ({ value, label }))} />
        <div>
          <label className="text-jr-text mb-1.5 block text-[13px] font-medium" htmlFor={`collega-bestand-${userId}`}>
            Bestand (pdf, jpg of png, max. 4 MB)
          </label>
          <input id={`collega-bestand-${userId}`} type="file" name="bestand" accept="application/pdf,image/jpeg,image/png" className="block w-full text-sm" />
        </div>
      </ActionForm>

      <details className="mt-4 rounded-lg border border-gray-200 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Gegevens {r ? 'corrigeren' : 'invullen'}</summary>
        <div className="mt-4">
          <ActionForm action={collegaGegevensOpslaan} submitLabel="Gegevens opslaan" resetOnSuccess={false}>
            {verborgen}
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
              <Field label="Voornamen (paspoort)" name="officieleVoornamen" defaultValue={r?.officialFirstNames ?? ''} />
              <Field label="Tussenvoegsel" name="tussenvoegsel" defaultValue={r?.infix ?? ''} />
              <Field label="Achternaam" name="achternaam" defaultValue={r?.lastName ?? ''} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Geboortedatum" name="geboortedatum" type="date" defaultValue={r?.birthDate ? formatDateInput(r.birthDate) : ''} />
              <Field label="Geboorteplaats" name="geboorteplaats" defaultValue={r?.birthPlace ?? ''} />
            </div>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
              <Field label="Adres" name="adres" defaultValue={r?.addressLine ?? ''} />
              <Field label="Postcode" name="postcode" defaultValue={r?.postalCode ?? ''} />
              <Field label="Woonplaats" name="woonplaats" defaultValue={r?.city ?? ''} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="IBAN" name="iban" placeholder={iban ? `Nu: ${iban}` : 'NL00 BANK 0123 4567 89'} hint={iban ? 'Leeg laten om het huidige te houden.' : 'Wordt versleuteld opgeslagen.'} />
              <Field label="Ten name van" name="tenaamstelling" defaultValue={r?.accountHolder ?? ''} />
            </div>
          </ActionForm>
        </div>
      </details>

      <div className="mt-4 border-t border-gray-100 pt-4">
        {r?.doorgegevenOp ? (
          <ActionForm action={collegaDoorgegeven} submitLabel="Toch nog niet doorgegeven" submitClassName={KNOP_KLEIN} resetOnSuccess={false} meldGelukt={false} className="">
            {verborgen}
            <input type="hidden" name="terug" value="1" />
          </ActionForm>
        ) : (
          <ActionForm action={collegaDoorgegeven} submitLabel="Doorgegeven aan de salarisadministratie" resetOnSuccess={false} className="space-y-2">
            {verborgen}
            <p className="text-xs text-gray-600">Klik als je de gegevens en het contract hebt doorgestuurd naar Euregio Habets Royen. Kan pas als alles compleet is.</p>
          </ActionForm>
        )}
      </div>
    </section>
  )
}
