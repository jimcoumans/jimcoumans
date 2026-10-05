import type { AnalyticsConnection } from '@/db/schema'
import { ActionForm, Field } from '@/components/ActionForm'
import { Paneel } from '@/components/Paneel'
import { Menu } from '@/components/Menu'
import { koppel, ontkoppel, nuBijwerken } from '@/app/beheer/performance-actions'
import { BRON_KOPPELING } from '@/lib/performance/lezen'
import { KAN_OPHALEN } from '@/lib/performance/sync'
import { formatDate } from '@/lib/dates'
import { score, type Keuze } from '@/lib/performance/oauth'
import { KeuzeLijst, type KeuzeOptie } from './KeuzeLijst'

/* De koppelingen van één klant: wat er gekoppeld is, of het werkt, en
   een paneel om te koppelen. Fouten staan erbij in gewone taal. */

const VOLGORDE: AnalyticsConnection['source'][] = ['ga4', 'search_console', 'google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads']

const tijd = (d: Date) =>
  `${formatDate(d)} ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' })}`

export function Koppelingen({
  organizationId,
  slug,
  koppelingen,
  serviceaccount,
  klant,
  keuzes,
  verbonden,
}: {
  organizationId: string
  slug: string
  koppelingen: AnalyticsConnection[]
  serviceaccount: string | null
  klant: { name: string; website: string | null }
  keuzes: Keuze[]
  /** De verbonden Google-adressen van James Robinson. */
  verbonden: string[]
}) {
  const per = new Map(koppelingen.map((k) => [k.source, k]))
  const meerdere = verbonden.length > 1
  const opties = (bron: AnalyticsConnection['source']): KeuzeOptie[] =>
    keuzes
      .filter((k) => k.source === bron)
      .map((k) => ({
        waarde: `${k.verbindingId}|${k.externalId}`,
        naam: k.naam,
        detail: [bron === 'ga4' ? `${k.groep} · ${k.externalId}` : k.groep, meerdere ? k.email : ''].filter(Boolean).join(' · '),
        voorgesteld: score(k, klant) >= 3,
      }))
  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="text-[17px]">Koppelingen</h2>
          <p className="text-xs text-gray-500">Elk uur bijgewerkt. Na het koppelen komen de cijfers van dertien maanden terug in een paar uur binnen.</p>
        </div>
        {koppelingen.length > 0 && (
          <ActionForm action={nuBijwerken} submitLabel="Nu bijwerken" submitClassName="border border-gray-300 bg-white text-jr-text hover:bg-gray-50 !rounded-full" resetOnSuccess={false} className="">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
          </ActionForm>
        )}
      </div>
      <ul className="divide-y divide-gray-150 border-t border-gray-150">
        {VOLGORDE.map((bron) => {
          const k = per.get(bron)
          const info = BRON_KOPPELING[bron]
          const kan = KAN_OPHALEN[bron]
          const google = bron === 'ga4' || bron === 'search_console'
          return (
            <li key={bron} className="flex items-center gap-4 py-3.5 pr-3 pl-6">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${!k ? 'bg-gray-300' : k.lastError ? 'bg-[#C02A22]' : !kan ? 'bg-[#FF9F0A]' : k.lastSyncedAt ? 'bg-[#34C759]' : 'bg-[#FF9F0A]'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">
                  {info.naam}
                  {k && <span className="ml-2 text-[13px] text-gray-500">{k.displayName ?? k.externalId}</span>}
                </p>
                <p className={`text-[13px] ${k?.lastError ? 'text-[#C02A22]' : 'text-gray-600'}`}>
                  {!k
                    ? kan
                      ? 'Niet gekoppeld'
                      : 'Niet gekoppeld · ophalen volgt zodra de toegang tot dit platform rond is'
                    : k.lastError
                      ? k.lastError
                      : !kan
                        ? 'Gekoppeld · cijfers volgen zodra de toegang tot dit platform rond is'
                        : k.lastSyncedAt
                          ? `Bijgewerkt ${tijd(k.lastSyncedAt)}${k.historyFrom ? ` · cijfers vanaf ${formatDate(new Date(`${k.historyFrom}T00:00:00Z`))}` : ''}`
                          : 'Gekoppeld · wacht op de eerste keer ophalen'}
                </p>
              </div>
              <Paneel
                knop={k ? 'Wijzig' : 'Koppelen'}
                stijl={k ? 'klein' : 'rustig'}
                titel={`${info.naam} koppelen`}
                uitleg={google && opties(bron).length > 0 ? 'Kies wat bij deze klant hoort. Voorgesteld betekent: past bij de naam of website van de klant.' : info.uitleg}
              >
                {google && opties(bron).length > 0 ? (
                  <ActionForm action={koppel} submitLabel={k ? 'Opslaan en ophalen' : 'Koppelen en ophalen'} resetOnSuccess={false}>
                    <input type="hidden" name="organizationId" value={organizationId} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="bron" value={bron} />
                    <KeuzeLijst opties={opties(bron)} gekozen={k?.googleConnectionId ? `${k.googleConnectionId}|${k.externalId}` : undefined} />
                    <p className="col-span-full text-xs text-gray-600">
                      Staat de klant er niet tussen? Laat de klant een van onze adressen ({verbonden.join(', ')}) als lezer toevoegen en ververs de lijst onder{' '}
                      <a href="/beheer/koppelingen" className="text-jr-link underline">
                        Koppelingen
                      </a>
                      .
                    </p>
                    {k && <p className="col-span-full text-xs text-gray-600">Een andere keuze betekent andere cijfers: de historie van deze bron wordt dan opnieuw opgehaald.</p>}
                  </ActionForm>
                ) : (
                  <>
                    {google && (
                      <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                        {verbonden.length === 0 ? (
                          <>
                            <p className="font-medium">Sneller: verbind eerst onze Google-accounts</p>
                            <p className="mt-1 text-gray-600">
                              Dan kies je hier gewoon uit een lijst, zonder ID's op te zoeken. Dat doet een beheerder één keer onder{' '}
                              <a href="/beheer/koppelingen" className="text-jr-link underline">
                                Koppelingen
                              </a>
                              .
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Nog niets te kiezen</p>
                            <p className="mt-1 text-gray-600">
                              Onze adressen ({verbonden.join(', ')}) zien nog geen {bron === 'ga4' ? 'GA4-property' : 'Search Console-site'}. Laat de klant er een als lezer toevoegen en ververs de lijst onder{' '}
                              <a href="/beheer/koppelingen" className="text-jr-link underline">
                                Koppelingen
                              </a>
                              .
                            </p>
                          </>
                        )}
                        {serviceaccount && (
                          <p className="mt-2 text-gray-600">
                            Of via het serviceaccount: voeg <span className="font-mono text-[13px] break-all select-all">{serviceaccount}</span> toe als lezer en vul hieronder het ID in.
                          </p>
                        )}
                      </div>
                    )}
                    <ActionForm action={koppel} submitLabel={k ? 'Opslaan en ophalen' : 'Koppelen en ophalen'} resetOnSuccess={false}>
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="bron" value={bron} />
                      <Field label={info.veld} name="externalId" required defaultValue={k?.externalId ?? ''} placeholder={info.voorbeeld} />
                      {k && <p className="text-xs text-gray-600">Een ander ID betekent andere cijfers: de opgehaalde historie van deze bron wordt dan opnieuw opgehaald.</p>}
                    </ActionForm>
                  </>
                )}
              </Paneel>
              {k && (
                <Menu>
                  <ActionForm
                    action={ontkoppel}
                    submitLabel="Ontkoppelen"
                    submitClassName="!min-h-0 w-full !rounded-lg !px-3 !py-2 text-left !font-normal text-[#C02A22] hover:bg-[#FDECEA]"
                    resetOnSuccess={false}
                    meldGelukt={false}
                    className=""
                  >
                    <input type="hidden" name="id" value={k.id} />
                    <input type="hidden" name="slug" value={slug} />
                  </ActionForm>
                </Menu>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Wat er aan de meting niet klopt, in gewone taal. Leeg als alles in orde lijkt. */
export function meetcheck(koppelingen: AnalyticsConnection[], c: { bezoeken: number; conversies: number; impressies: number }): string[] {
  const heeft = (s: AnalyticsConnection['source']) => koppelingen.some((k) => k.source === s && k.lastSyncedAt && !k.lastError)
  const uit: string[] = []
  if (!koppelingen.some((k) => k.source === 'ga4')) uit.push('Google Analytics is niet gekoppeld: zonder GA4 geen bezoeken en conversies.')
  else if (heeft('ga4') && c.bezoeken > 0 && c.conversies === 0)
    uit.push('Wel bezoeken, maar geen enkele conversie. Staan de key events in GA4 goed (formulier, reservering, telefoontje)?')
  if (!koppelingen.some((k) => k.source === 'search_console')) uit.push('Search Console is niet gekoppeld: de impressies in Google zelf ontbreken.')
  if (heeft('ga4') && c.bezoeken > 0 && c.bezoeken < 30) uit.push('Heel weinig bezoeken gemeten. Staat de GA4-tag op elke pagina, en de cookiebanner met consent mode goed?')
  return uit
}
