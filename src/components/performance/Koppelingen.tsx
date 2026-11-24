import type { AnalyticsConnection } from '@/db/schema'
import { ActionForm, Field } from '@/components/ActionForm'
import { Paneel } from '@/components/Paneel'
import { Menu } from '@/components/Menu'
import { kiesCampagnes, koppel, ontkoppel, nuBijwerken } from '@/app/beheer/performance-actions'
import { BRON_KOPPELING } from '@/lib/performance/lezen'
import { KAN_OPHALEN } from '@/lib/performance/sync'
import { formatDate } from '@/lib/dates'
import { score, type Keuze } from '@/lib/performance/oauth'
import { googleAdsInstellingen } from '@/lib/performance/google-ads'
import { metaInstellingen, type MetaCampagne } from '@/lib/performance/meta'
import { linkedinInstellingen } from '@/lib/performance/linkedin'
import { ahrefsInstellingen, domeinUitWebsite } from '@/lib/performance/ahrefs'
import { KeuzeLijst, type KeuzeOptie } from './KeuzeLijst'
import { VinkLijst, type VinkOptie } from './VinkLijst'

/* De koppelingen van één klant: wat er gekoppeld is, of het werkt, en
   een paneel om te koppelen. Fouten staan erbij in gewone taal. */

const VOLGORDE: AnalyticsConnection['source'][] = ['ga4', 'search_console', 'google_business', 'ahrefs', 'google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads']

/** Bronnen waar je uit een lijst kiest in plaats van een ID over te typen. */
const MET_LIJST = new Set<AnalyticsConnection['source']>(['ga4', 'search_console', 'google_business', 'google_ads', 'meta_ads', 'linkedin_ads'])

/** Wat de klant moet doen voordat zijn account in onze lijst staat. */
const TOEGANG: Record<string, { wat: string; hoe: string }> = {
  ga4: { wat: 'GA4-property', hoe: 'Laat de klant in GA4 een van onze adressen als lezer toevoegen' },
  search_console: { wat: 'Search Console-site', hoe: 'Laat de klant in Search Console een van onze adressen als lezer toevoegen' },
  google_business: { wat: 'Bedrijfsprofiel', hoe: 'Laat de klant in zijn Google Bedrijfsprofiel een van onze adressen als beheerder uitnodigen (Instellingen → Gebruikers en toegang)' },
  google_ads: { wat: 'Google Ads-account', hoe: 'Koppel het account van de klant aan ons MCC (in Google Ads: Accounts → Koppelen)' },
  meta_ads: { wat: 'Meta-advertentieaccount', hoe: 'Laat de klant ons als partner toevoegen aan zijn advertentieaccount, en geef onze systeemgebruiker daar leesrecht op' },
  linkedin_ads: { wat: 'LinkedIn-advertentieaccount', hoe: 'Laat de klant ons verbonden LinkedIn-account in Campaign Manager een rol geven op zijn advertentieaccount (Viewer is genoeg)' },
}

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
  linkedinVerbonden,
  metaCampagnes,
}: {
  organizationId: string
  slug: string
  koppelingen: AnalyticsConnection[]
  serviceaccount: string | null
  klant: { name: string; website: string | null }
  keuzes: Keuze[]
  /** De verbonden Google-adressen van James Robinson. */
  verbonden: string[]
  /** De labels van de verbonden LinkedIn-accounts. */
  linkedinVerbonden?: string[]
  /** De campagnes van het gekoppelde Meta-account, om er een deel van aan te vinken; fout als Meta ze niet gaf. */
  metaCampagnes?: { lijst: MetaCampagne[]; fout: string | null } | null
}) {
  const per = new Map(koppelingen.map((k) => [k.source, k]))
  const meerdere = verbonden.length > 1
  const opties = (bron: AnalyticsConnection['source']): KeuzeOptie[] =>
    keuzes
      .filter((k) => k.source === bron)
      .map((k) => ({
        waarde: `${k.verbindingId}|${k.externalId}`,
        naam: k.naam,
        detail: [bron === 'ga4' ? `${k.groep} · ${k.externalId}` : k.groep, meerdere && k.email ? k.email : ''].filter(Boolean).join(' · '),
        voorgesteld: score(k, klant) >= 3,
      }))
  /* Wat er nu gekoppeld is, terugvinden in de lijst: ook als het ID destijds met de hand is ingevuld. */
  const gekozen = (bron: AnalyticsConnection['source'], k: AnalyticsConnection | undefined) =>
    k
      ? (opties(bron).find((o) => o.waarde === `${k.googleConnectionId ?? k.linkedinConnectionId ?? ''}|${k.externalId}`) ?? opties(bron).find((o) => o.waarde.endsWith(`|${k.externalId}`)))?.waarde
      : undefined
  const ads = googleAdsInstellingen()
  const meta = metaInstellingen()
  const linkedin = linkedinInstellingen()
  const ahrefs = ahrefsInstellingen()
  /* Campagnes om aan te vinken: wat Meta nu kent, plus wat eerder gekozen is maar niet meer bestaat. */
  const campagneOpties = (k: AnalyticsConnection): VinkOptie[] => {
    const lijst = metaCampagnes?.lijst ?? []
    const bekend = new Set(lijst.map((c) => c.id))
    return [
      ...lijst.map((c) => ({ waarde: c.id, naam: c.naam, detail: `${c.actief ? 'Actief' : c.status === 'PAUSED' ? 'Gepauzeerd' : c.status.toLowerCase().replace(/_/g, ' ')} · ${c.id}` })),
      ...(k.campaigns ?? []).filter((c) => !bekend.has(c.id)).map((c) => ({ waarde: c.id, naam: c.naam, detail: `Niet meer gevonden in dit account · ${c.id}`, weg: true })),
    ]
  }
  /* Waarom de lijst voor een bron leeg is, in gewone taal. */
  const leeg = (bron: AnalyticsConnection['source']): { kop: string; tekst: string; link?: false } | null => {
    const t = TOEGANG[bron]
    if (!t) return null
    if (bron === 'meta_ads') {
      return meta.klaar
        ? { kop: 'Nog niets te kiezen', tekst: `Onze Business Manager ziet nog geen ${t.wat}. ${t.hoe}, en ververs de lijst onder` }
        : { kop: 'Meta Ads is nog niet ingesteld', tekst: `Zet ${meta.ontbreekt.join(', ')} in Netlify; daarna kies je hier uit een lijst. Tot die tijd vul je het act_-nummer hieronder zelf in.`, link: false }
    }
    if (bron === 'linkedin_ads') {
      if (!linkedin.klaar) return { kop: 'LinkedIn Ads is nog niet ingesteld', tekst: `Zet ${linkedin.ontbreekt.join(', ')} in Netlify; daarna verbindt een beheerder ons LinkedIn-account en kies je hier uit een lijst. Tot die tijd vul je het account-ID hieronder zelf in.`, link: false }
      if (!linkedinVerbonden?.length) return { kop: 'Sneller: verbind eerst ons LinkedIn-account', tekst: "Dan kies je hier gewoon uit een lijst, zonder ID's op te zoeken. Dat doet een beheerder één keer onder" }
      return { kop: 'Nog niets te kiezen', tekst: `Ons LinkedIn-account ziet nog geen ${t.wat}. ${t.hoe}, en ververs de lijst onder` }
    }
    if (verbonden.length === 0) {
      return { kop: 'Sneller: verbind eerst onze Google-accounts', tekst: "Dan kies je hier gewoon uit een lijst, zonder ID's op te zoeken. Dat doet een beheerder één keer onder" }
    }
    if (bron === 'google_ads' && !ads.klaar) {
      return { kop: 'Google Ads is nog niet ingesteld', tekst: `Zet ${ads.ontbreekt.join(', ')} in Netlify; daarna kies je hier uit een lijst. Tot die tijd vul je het klant-ID hieronder zelf in.`, link: false }
    }
    return { kop: 'Nog niets te kiezen', tekst: `Onze adressen (${verbonden.join(', ')}) zien nog geen ${t.wat}. ${t.hoe}, en ververs de lijst onder` }
  }
  return (
    <section className="rounded-xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="text-[17px]">Koppelingen</h2>
          <p className="text-xs text-gray-500">Elke nacht bijgewerkt. Na het koppelen komen de cijfers van dertien maanden terug in een paar dagen binnen, of sneller met Nu bijwerken.</p>
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
          const google = bron === 'ga4' || bron === 'search_console' || bron === 'google_business'
          const lijst = MET_LIJST.has(bron) && opties(bron).length > 0
          const waarom = MET_LIJST.has(bron)
            ? leeg(bron)
            : bron === 'ahrefs' && !ahrefs.klaar
              ? { kop: 'Ahrefs is nog niet ingesteld', tekst: `Zet ${ahrefs.ontbreekt.join(', ')} in Netlify. Koppelen kan al; de cijfers komen zodra de sleutel er staat.`, link: false as const }
              : null
          // Bij Ahrefs is het "account" de website van de klant: die staat alvast ingevuld.
          const standaard = k?.externalId ?? (bron === 'ahrefs' ? domeinUitWebsite(klant.website) : '')
          return (
            <li key={bron} className="flex items-center gap-4 py-3.5 pr-3 pl-6">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${!k ? 'bg-gray-300' : k.lastError ? 'bg-[#C02A22]' : !kan ? 'bg-[#FF9F0A]' : k.lastSyncedAt ? 'bg-[#34C759]' : 'bg-[#FF9F0A]'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">
                  {info.naam}
                  {k && (
                    <span className="ml-2 text-[13px] text-gray-500">
                      {k.displayName ?? k.externalId}
                      {k.campaigns?.length ? ` · ${k.campaigns.length === 1 ? '1 campagne' : `${k.campaigns.length} campagnes`}` : ''}
                    </span>
                  )}
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
                uitleg={lijst ? 'Kies wat bij deze klant hoort. Voorgesteld betekent: past bij de naam of website van de klant.' : info.uitleg}
              >
                {lijst ? (
                  <ActionForm action={koppel} submitLabel={k ? 'Opslaan en ophalen' : 'Koppelen en ophalen'} resetOnSuccess={false}>
                    <input type="hidden" name="organizationId" value={organizationId} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="bron" value={bron} />
                    <KeuzeLijst opties={opties(bron)} gekozen={gekozen(bron, k)} />
                    <p className="col-span-full text-xs text-gray-600">
                      Staat de klant er niet tussen? {TOEGANG[bron]?.hoe}
                      {google ? ` (${verbonden.join(', ')})` : ''}, en ververs de lijst onder{' '}
                      <a href="/beheer/koppelingen" className="text-jr-link underline">
                        Koppelingen
                      </a>
                      .
                    </p>
                    {k && <p className="col-span-full text-xs text-gray-600">Een andere keuze betekent andere cijfers: de historie van deze bron wordt dan opnieuw opgehaald.</p>}
                  </ActionForm>
                ) : (
                  <>
                    {waarom && (
                      <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                        <p className="font-medium">{waarom.kop}</p>
                        <p className="mt-1 text-gray-600">
                          {waarom.tekst}
                          {waarom.link !== false && (
                            <>
                              {' '}
                              <a href="/beheer/koppelingen" className="text-jr-link underline">
                                Koppelingen
                              </a>
                              .
                            </>
                          )}
                        </p>
                        {google && bron !== 'google_business' && serviceaccount && (
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
                      <Field label={info.veld} name="externalId" required defaultValue={standaard} placeholder={info.voorbeeld} />
                      {k && <p className="text-xs text-gray-600">Een ander ID betekent andere cijfers: de opgehaalde historie van deze bron wordt dan opnieuw opgehaald.</p>}
                    </ActionForm>
                  </>
                )}
              </Paneel>
              {k && bron === 'meta_ads' && (
                <Paneel
                  knop="Campagnes"
                  stijl="klein"
                  titel="Welke campagnes horen bij deze klant?"
                  uitleg="Adverteert de klant vanuit het advertentieaccount van James Robinson, naast andere klanten? Vink dan alleen zijn campagnes aan. Niets aangevinkt: het hele account telt mee."
                >
                  {metaCampagnes?.fout && <p className="mb-4 rounded-lg bg-[#FDECEA] px-4 py-3 text-sm text-[#C02A22]">Meta gaf de campagnes niet: {metaCampagnes.fout}</p>}
                  <ActionForm action={kiesCampagnes} submitLabel="Opslaan en ophalen" resetOnSuccess={false}>
                    <input type="hidden" name="organizationId" value={organizationId} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="koppelingId" value={k.id} />
                    <input type="hidden" name="accountId" value={k.externalId} />
                    <VinkLijst opties={campagneOpties(k)} gekozen={(k.campaigns ?? []).map((c) => c.id)} naam="campagne" />
                    <p className="col-span-full text-xs text-gray-600">
                      Een andere keuze betekent andere cijfers: de historie van Meta Ads wordt dan opnieuw opgehaald. Nieuwe campagnes van de klant moet je hier ook aanvinken, anders tellen ze niet mee.
                    </p>
                  </ActionForm>
                </Paneel>
              )}
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
