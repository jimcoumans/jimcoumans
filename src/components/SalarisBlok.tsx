import { ActionForm, Field, TextArea } from './ActionForm'
import { mailSalarisadministratie, dossierDoorgegeven } from '@/app/beheer/aanname-actions'
import { getPersoon, getSalarisContact, samenvattingVoorMail, type DossierVan } from '@/lib/salarisadministratie'
import { salarisPakket } from '@/lib/persoonsgegevens'
import { salarisMail } from '@/lib/mailsjablonen'
import { getTekstOverrides } from '@/lib/sjablonen'
import { getBedrijf } from '@/lib/bedrijf'
import { getSessionUser } from '@/lib/auth'
import { formatDateLong } from '@/lib/dates'

const KNOP_RUSTIG = 'inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
const KNOP_WEG = 'text-gray-500 hover:bg-gray-100 !px-2 !py-0.5 !text-xs !min-h-0'

/** De link naar de zip van een persoon. */
export function mapHref(van: DossierVan, voor: 'salaris' | 'eigen'): string {
  const wie = 'userId' in van ? `collega=${van.userId}` : `kandidaat=${van.kandidaatId}`
  return `/api/dossier/map?${wie}&voor=${voor}`
}

/**
 * Doorgeven aan de salarisadministratie, in drie stappen: de map downloaden,
 * in een Bitwarden Send zetten, en de link mailen vanuit het portaal. De mail
 * komt uit de standaardtekst "Naar de salarisadministratie"; je ziet hem
 * hier eerst.
 */
export async function SalarisBlok({ van, doorgegevenOp }: { van: DossierVan; doorgegevenOp: Date | null }) {
  const [persoon, contact, teksten, bedrijf, gebruiker] = await Promise.all([getPersoon(van), getSalarisContact(), getTekstOverrides(), getBedrijf(), getSessionUser()])
  if (!persoon) return null
  const pakket = salarisPakket(persoon.gegevens ?? null)
  const mist = pakket.filter((p) => !p.klaar)
  const compleet = mist.length === 0
  const verborgen = 'userId' in van ? <input type="hidden" name="userId" value={van.userId} /> : <input type="hidden" name="kandidaatId" value={van.kandidaatId} />

  const voorbeeld = contact
    ? salarisMail(
        {
          aan: contact.email ?? '',
          roepnaam: persoon.roepnaam,
          functie: persoon.contract?.jobTitle ?? '[functie]',
          startdatum: persoon.contract?.startedOn ?? null,
          afzender: gebruiker?.name ?? 'James Robinson',
          merk: bedrijf?.werkgever.tradeName ?? null,
          samenvatting: samenvattingVoorMail(persoon.contract),
          werknemerNaam: persoon.naam,
          ontvangerVoornaam: contact.voornaam,
          beveiligdeLink: '[de link die je hierboven plakt]',
        },
        teksten,
      )
    : null

  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Naar de salarisadministratie</h3>
        {doorgegevenOp && <span className="text-sm text-[#1d7a36]">✓ Doorgegeven op {formatDateLong(doorgegevenOp)}</span>}
      </div>

      <div className="mb-4 rounded-lg bg-gray-50 p-3">
        <p className="mb-2 text-xs font-medium text-gray-700">
          {compleet ? 'Het pakket is compleet' : `Het pakket is nog niet compleet: ${mist.length} van ${pakket.length} ontbreekt`}
        </p>
        <ul className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {pakket.map((p) => (
            <li key={p.sleutel} className={p.klaar ? 'text-gray-700' : 'text-jr-orange font-medium'}>
              <span aria-hidden="true">{p.klaar ? '✓ ' : '○ '}</span>
              {p.titel}
              <span className="sr-only">{p.klaar ? ' (in orde)' : ' (ontbreekt nog)'}</span>
            </li>
          ))}
        </ul>
        {!compleet && (
          <p className="mt-2 text-xs text-gray-600">
            Vul aan bij{' '}
            <a href="#dossier-gegevens" className="text-jr-link hover:underline">
              de gegevens
            </a>{' '}
            en{' '}
            <a href="#dossier-documenten" className="text-jr-link hover:underline">
              de documenten
            </a>
            . Daarna kun je mailen; zo hoeft de salarisadministratie niets na te vragen.
          </p>
        )}
      </div>

      <ol className="space-y-4 text-sm">
        <li>
          <p className="font-medium">1. Download de map</p>
          <p className="mb-2 text-xs text-gray-600">Gegevensoverzicht (met adres, privé e-mailadres, mobiel nummer en IBAN), getekend contract, loonheffingsformulier en kopie ID, in één zip. Zonder AVG-verklaring en noodcontact: die zijn van ons.</p>
          <a href={mapHref(van, 'salaris')} className={KNOP_RUSTIG}>
            Map voor de salarisadministratie (zip)
          </a>
        </li>
        <li>
          <p className="font-medium">2. Zet hem in een Bitwarden Send</p>
          <p className="text-xs text-gray-600">Nieuwe Send, bestand kiezen, een vervaldatum (bijvoorbeeld 7 dagen) en eventueel een wachtwoord. Kopieer de link.</p>
        </li>
        <li>
          <p className="font-medium">3. Mail de link</p>
          {!compleet ? (
            <p className="text-jr-orange text-xs">Kan zodra het pakket compleet is. Nog nodig: {mist.map((p) => (/^[A-Z]{2}/.test(p.titel) ? p.titel : p.titel[0]!.toLowerCase() + p.titel.slice(1))).join(', ')}.</p>
          ) : !contact?.email ? (
            <p className="text-jr-orange text-xs">
              Stel eerst bij{' '}
              <a href="/beheer/bedrijf" className="text-jr-link hover:underline">
                Bedrijfsgegevens
              </a>{' '}
              in wie bij de salarisadministratie de mail krijgt.
            </p>
          ) : (
            <ActionForm action={mailSalarisadministratie} submitLabel={`Mail naar ${contact.voornaam || contact.naam}`} submitClassName="bg-jr-btn hover:bg-jr-btnhover text-white" resetOnSuccess={false} className="mt-1 space-y-3">
              {verborgen}
              <p className="text-xs text-gray-600">
                Aan {contact.naam} ({contact.email}), vanaf work@jamesrobinson.nl. Jij krijgt een kopie en antwoorden komen bij jou.
              </p>
              <Field markeerOptioneel={false} label="Link naar de beveiligde map" name="link" required placeholder="https://send.bitwarden.com/#…" autoComplete="off" />
              <TextArea label="Iets erbij zetten" name="opmerking" rows={2} hint="Komt boven de groet in de mail." />
              {voorbeeld && (
                <details className="rounded-lg bg-gray-50 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-gray-700">Bekijk de mail</summary>
                  <p className="mt-2 text-xs text-gray-500">Onderwerp: {voorbeeld.onderwerp}</p>
                  <pre className="mt-2 font-sans text-xs whitespace-pre-wrap text-gray-800">{voorbeeld.tekst}</pre>
                  <p className="mt-2 text-xs text-gray-500">
                    De tekst pas je aan bij{' '}
                    <a href="/beheer/sjablonen" className="text-jr-link hover:underline">
                      Standaardteksten
                    </a>
                    , onder &ldquo;Naar de salarisadministratie&rdquo;.
                  </p>
                </details>
              )}
            </ActionForm>
          )}
        </li>
      </ol>

      <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-600">
        {doorgegevenOp ? (
          <ActionForm action={dossierDoorgegeven} submitLabel="Toch nog niet doorgegeven" submitClassName={KNOP_WEG} resetOnSuccess={false} meldGelukt={false} className="">
            {verborgen}
            <input type="hidden" name="terug" value="1" />
          </ActionForm>
        ) : (
          <ActionForm action={dossierDoorgegeven} submitLabel="Op een andere manier doorgegeven" submitClassName={KNOP_WEG} resetOnSuccess={false} className="">
            {verborgen}
          </ActionForm>
        )}
      </div>
    </div>
  )
}
