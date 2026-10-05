import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { ActionForm } from '@/components/ActionForm'
import { Menu } from '@/components/Menu'
import { alleKeuzes, gebruikPerVerbinding, listVerbindingen, oauthInstellingen, terugUrl } from '@/lib/performance/oauth'
import { serviceaccountAdres } from '@/lib/performance/google'
import { verbindingLoskoppelen, keuzesVerversen } from '../koppelingen-actions'
import { formatDate } from '@/lib/dates'

export const maxDuration = 26

const aantal = (n: number, een: string, meer: string) => `${n} ${n === 1 ? een : meer}`

/**
 * Waar het portaal mee verbonden is. Google-accounts van James Robinson
 * verbind je hier één keer; daarna kies je per klant uit wat die accounts
 * kunnen zien. Geen ID's opzoeken, geen technische stappen.
 */
export default async function KoppelingenPage({ searchParams }: { searchParams: Promise<{ verbonden?: string; fout?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')
  const admin = user.role === 'admin'

  const { verbonden, fout } = await searchParams
  const inst = oauthInstellingen()
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'}`
  const [verbindingen, gebruik, { keuzes, fouten }] = await Promise.all([listVerbindingen(), gebruikPerVerbinding(), alleKeuzes()])
  const serviceaccount = serviceaccountAdres()

  return (
    <AppShell user={user} actief="koppelingen">
      <PaginaKop
        titel="Koppelingen"
        uitleg="Verbind de Google-accounts van James Robinson één keer. Daarna kies je bij elke klant onder Performance gewoon uit de lijst welke Analytics en Search Console erbij horen."
        acties={
          admin && inst.klaar ? (
            <a href="/api/google/verbinden" className="bg-jr-btn hover:bg-jr-btnhover inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm font-medium text-white">
              Google-account verbinden
            </a>
          ) : undefined
        }
      />

      {verbonden && (
        <p role="status" className="mb-6 rounded-xl bg-[#E8F7EC] px-5 py-3 text-sm text-[#1D7D3F]">
          {verbonden} is verbonden. Alles waar dit adres bij kan, staat nu in de keuzelijst bij de klanten.
        </p>
      )}
      {fout && (
        <p role="alert" className="mb-6 rounded-xl bg-[#FDECEA] px-5 py-3 text-sm text-[#C02A22]">
          {fout}
        </p>
      )}

      {!inst.klaar && (
        <section className="mb-6 rounded-xl bg-[#FFF4E5] px-5 py-4 text-sm text-[#94590A]">
          <p className="font-medium">Eenmalig instellen nodig</p>
          <p className="mt-1">
            Nog niet ingesteld in Netlify: {inst.ontbreekt.join(', ')}. Zet deze onder Site configuration → Environment variables en deploy opnieuw.
          </p>
          <p className="mt-3">Bij de OAuth-client in Google Cloud hoort dit als toegestane omleidings-URI:</p>
          <p className="mt-1 font-mono text-[13px] break-all select-all text-jr-text">{terugUrl(origin)}</p>
        </section>
      )}

      <section className="mb-6 rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
          <div>
            <h2 className="text-[17px]">Google</h2>
            <p className="text-xs text-gray-500">
              {verbindingen.length === 0
                ? 'Nog geen account verbonden.'
                : `${aantal(keuzes.filter((k) => k.source === 'ga4').length, 'GA4-property', 'GA4-properties')} en ${aantal(keuzes.filter((k) => k.source === 'search_console').length, 'Search Console-site', 'Search Console-sites')} te kiezen.`}
            </p>
          </div>
          {verbindingen.length > 0 && (
            <ActionForm action={keuzesVerversen} submitLabel="Lijst verversen" submitClassName="border border-gray-300 bg-white text-jr-text hover:bg-gray-50 !rounded-full" resetOnSuccess={false} className="">
              <span hidden />
            </ActionForm>
          )}
        </div>

        {verbindingen.length === 0 ? (
          <div className="border-t border-gray-150 px-6 py-5 text-sm text-gray-600">
            {admin
              ? 'Klik rechtsboven op Google-account verbinden en log in met info@ of marketing@. Herhaal dat voor elk adres dat toegang heeft tot klantaccounts.'
              : 'Een beheerder verbindt hier de Google-accounts van James Robinson.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-150 border-t border-gray-150">
            {verbindingen.map((v) => {
              const ga4 = keuzes.filter((k) => k.verbindingId === v.id && k.source === 'ga4').length
              const sites = keuzes.filter((k) => k.verbindingId === v.id && k.source === 'search_console').length
              const n = gebruik.get(v.id) ?? 0
              return (
                <li key={v.id} className="flex items-center gap-4 py-3.5 pr-3 pl-6">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${v.lastError ? 'bg-[#C02A22]' : 'bg-[#34C759]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">{v.email}</p>
                    <p className={`text-[13px] ${v.lastError ? 'text-[#C02A22]' : 'text-gray-600'}`}>
                      {v.lastError
                        ? v.lastError
                        : `${aantal(ga4, 'GA4-property', 'GA4-properties')} · ${aantal(sites, 'site', 'sites')} · gebruikt bij ${aantal(n, 'koppeling', 'koppelingen')} · verbonden ${formatDate(v.createdAt)}`}
                    </p>
                  </div>
                  {admin && v.lastError && (
                    <a href="/api/google/verbinden" className="rounded-full border border-gray-300 px-3.5 py-1.5 text-[13px] hover:bg-gray-50">
                      Opnieuw verbinden
                    </a>
                  )}
                  {admin && (
                    <Menu>
                      <ActionForm
                        action={verbindingLoskoppelen}
                        submitLabel="Loskoppelen"
                        submitClassName="!min-h-0 w-full !rounded-lg !px-3 !py-2 text-left !font-normal text-[#C02A22] hover:bg-[#FDECEA]"
                        resetOnSuccess={false}
                        meldGelukt={false}
                        bevestig
                        className=""
                      >
                        <input type="hidden" name="id" value={v.id} />
                        {n > 0 && <p className="px-3 text-xs text-gray-600">{aantal(n, 'klantkoppeling stopt', 'klantkoppelingen stoppen')} tot je daar opnieuw kiest.</p>}
                      </ActionForm>
                    </Menu>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {fouten.length > 0 && (
          <div className="border-t border-gray-150 px-6 py-4 text-[13px] text-[#C02A22]">
            {fouten.map((f) => (
              <p key={f}>{f}</p>
            ))}
          </div>
        )}

        <div className="border-t border-gray-150 px-6 py-4 text-[13px] text-gray-600">
          <p>
            <strong className="font-medium text-jr-text">Nieuwe klant?</strong> Laat de klant in GA4 (Beheer → Toegangsbeheer voor account) en in Search Console (Instellingen → Gebruikers) een van onze verbonden adressen toevoegen als lezer. Klik daarna op Lijst verversen en kies hem bij de klant.
          </p>
          {serviceaccount && <p className="mt-2 text-gray-500">Oude koppelingen via het serviceaccount ({serviceaccount}) blijven gewoon werken.</p>}
        </div>
      </section>

      <section className="mb-6 rounded-xl bg-white shadow-sm">
        <div className="px-6 pt-5 pb-3">
          <h2 className="text-[17px]">Advertentieplatforms</h2>
          <p className="text-xs text-gray-500">Deze komen via de bedrijfsaccounts van James Robinson, zodra de platforms onze toegang hebben goedgekeurd.</p>
        </div>
        <ul className="divide-y divide-gray-150 border-t border-gray-150">
          {[
            ['Google Ads', 'Via ons MCC-account. Wacht op een developer token van Google.'],
            ['Meta (Facebook en Instagram)', 'Via onze Business Manager. Wacht op goedkeuring van de Meta-app.'],
            ['LinkedIn Ads', 'Via Campaign Manager. Wacht op toegang tot de Marketing API.'],
            ['TikTok Ads', 'Via Business Center. Wacht op goedkeuring van de TikTok-app.'],
          ].map(([naam, tekst]) => (
            <li key={naam} className="flex items-center gap-4 py-3.5 pr-6 pl-6">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px]">{naam}</p>
                <p className="text-[13px] text-gray-600">{tekst}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-white shadow-sm">
        <a href="/beheer/sync" className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 rounded-xl">
          <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${process.env.CLICKUP_API_TOKEN ? 'bg-[#34C759]' : 'bg-gray-300'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px]">ClickUp</p>
            <p className="text-[13px] text-gray-600">Factureerbare taken naar de wallet van de klant.</p>
          </div>
          <span aria-hidden="true" className="text-gray-400">›</span>
        </a>
      </section>
    </AppShell>
  )
}
