import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Field, Select, TextArea } from '@/components/ActionForm'
import {
  listSjablonen,
  getTekstOverrides,
  CONTRACT_PLAATSHOUDERS,
  INTRO_PLAATSHOUDERS,
  CONTRACT_VOORWAARDEN,
  ARTIKEL_VOORWAARDEN,
  SOORT_LABELS,
  BRUIKBARE_SOORTEN,
  type SjabloonMetArtikelen,
} from '@/lib/sjablonen'
import { getBedrijf, avgTekst, AVG_PLAATSHOUDERS } from '@/lib/bedrijf'
import { MAIL_SJABLONEN, MAIL_PLAATSHOUDERS, MAIL_VOORWAARDEN, type MailSleutel } from '@/lib/mailsjablonen'
import type { ContractTemplateArticle } from '@/db/schema'
import { introOpslaan, artikelOpslaan, artikelWissen, artikelVerschuiven, sjabloonMaken, avgOpslaan, mailOpslaan } from '../sjabloon-actions'

export const maxDuration = 26

const KLEIN = 'text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs !min-h-0'

/**
 * Standaardteksten: de contractsjablonen, de AVG-verklaring en de mails.
 *
 * Een opgesteld contract bewaart zijn eigen tekst. Wat je hier wijzigt, geldt
 * voor contracten die je daarna opstelt of wijzigt. Alleen voor beheerders.
 */
export default async function SjablonenPagina({ searchParams }: { searchParams: Promise<{ tekst?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/beheer')

  const [{ tekst: gekozen }, sjablonen, overrides, bedrijf] = await Promise.all([searchParams, listSjablonen(), getTekstOverrides(), getBedrijf()])
  const tabs: { sleutel: string; label: string }[] = [
    ...BRUIKBARE_SOORTEN.map((s) => ({ sleutel: s, label: SOORT_LABELS[s].replace('Arbeidsovereenkomst ', 'Contract ') })),
    { sleutel: 'avg', label: 'AVG-verklaring' },
    ...(Object.keys(MAIL_SJABLONEN) as MailSleutel[]).map((s) => ({ sleutel: s, label: `Mail: ${MAIL_SJABLONEN[s].label.toLowerCase()}` })),
  ]
  const actief = tabs.some((t) => t.sleutel === gekozen) ? gekozen! : 'bepaalde_tijd'
  const sjabloon = sjablonen.find((s) => s.template.kind === actief) ?? null
  const bron = sjablonen.find((s) => s.template.kind === 'bepaalde_tijd') ?? sjablonen[0] ?? null

  return (
    <AppShell user={user} actief="sjablonen" breed>
      <div className="mb-5">
        <h1 className="text-[28px] sm:text-[32px]">Standaardteksten</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          De teksten waar contracten, de AVG-verklaring en de mails uit worden opgebouwd. Een opgesteld contract houdt zijn eigen tekst: wat je hier wijzigt,
          geldt voor contracten die je daarna opstelt of wijzigt. Een tikfout in een plaatshouder wordt bij het opslaan gemeld.
        </p>
      </div>

      <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Teksten">
        {tabs.map((t) => (
          <a
            key={t.sleutel}
            href={`/beheer/sjablonen?tekst=${t.sleutel}`}
            aria-current={t.sleutel === actief ? 'page' : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm ${t.sleutel === actief ? 'bg-jr-blue text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'}`}
          >
            {t.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {(actief === 'bepaalde_tijd' || actief === 'onbepaalde_tijd') &&
            (sjabloon ? (
              <ContractSjabloon s={sjabloon} />
            ) : (
              <section className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-base">{SOORT_LABELS[actief]}</h2>
                <p className="mb-4 text-sm text-gray-600">
                  Er is nog geen sjabloon voor deze soort. Maak er een als kopie van het contract voor bepaalde tijd; het artikel over de duur wordt meteen
                  vervangen door een versie voor onbepaalde tijd. Lees hem daarna na.
                </p>
                {bron && (
                  <ActionForm action={sjabloonMaken} submitLabel="Sjabloon aanmaken">
                    <input type="hidden" name="soort" value={actief} />
                    <input type="hidden" name="vanTemplateId" value={bron.template.id} />
                  </ActionForm>
                )}
              </section>
            ))}

          {actief === 'avg' && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base">AVG-verklaring</h2>
                  <p className="text-xs text-gray-600">
                    De bijlage bij elk contract. {bedrijf?.werkgever.avgText ? 'Dit is jullie eigen tekst.' : 'Dit is de standaardtekst: een opzet, laat hem nakijken.'}
                  </p>
                </div>
                <a href="/api/bedrijf/avg-voorbeeld" target="_blank" rel="noopener" className="text-jr-link text-sm font-medium hover:underline">
                  Voorbeeld-pdf
                </a>
              </div>
              <ActionForm action={avgOpslaan} submitLabel="Tekst opslaan" resetOnSuccess={false}>
                <TextArea label="Tekst" name="tekst" rows={24} defaultValue={avgTekst(bedrijf?.werkgever ?? null)} hint={'"## " is een kop, een lege regel een nieuwe alinea, "- " een opsomming, "[ ] " een vakje om aan te kruisen.'} />
              </ActionForm>
              {bedrijf?.werkgever.avgText && (
                <div className="mt-3">
                  <ActionForm action={avgOpslaan} submitLabel="Standaardtekst terugzetten" submitClassName={KLEIN} bevestig meldGelukt={false}>
                    <input type="hidden" name="standaard" value="1" />
                  </ActionForm>
                </div>
              )}
            </section>
          )}

          {actief in MAIL_SJABLONEN && <MailTekst sleutel={actief as MailSleutel} eigen={overrides.get(actief) ?? null} />}
        </div>

        <aside className="space-y-4 text-sm">
          {(actief === 'bepaalde_tijd' || actief === 'onbepaalde_tijd') && (
            <>
              <Lijst titel="Plaatshouders" uitleg="Worden bij het opstellen ingevuld." items={CONTRACT_PLAATSHOUDERS} vorm={(n) => `{{${n}}}`} />
              <Lijst titel="Alleen in de begeleidende tekst" items={INTRO_PLAATSHOUDERS} vorm={(n) => `{{${n}}}`} />
              <Lijst
                titel="Voorwaarden"
                uitleg="{{#als naam}}...{{/als}} blijft alleen staan als de voorwaarde geldt; {{#alsniet naam}}...{{/alsniet}} juist als hij niet geldt. Valt alles van een artikel weg, dan verdwijnt het artikel."
                items={CONTRACT_VOORWAARDEN}
                vorm={(n) => n}
              />
            </>
          )}
          {actief === 'avg' && <Lijst titel="Plaatshouders" items={AVG_PLAATSHOUDERS} vorm={(n) => `{{${n}}}`} />}
          {actief in MAIL_SJABLONEN && (
            <>
              <Lijst titel="Plaatshouders" items={MAIL_PLAATSHOUDERS} vorm={(n) => `{{${n}}}`} />
              <Lijst titel="Voorwaarden" uitleg="Voor {{#als naam}}...{{/als}}." items={MAIL_VOORWAARDEN} vorm={(n) => n} />
            </>
          )}
        </aside>
      </div>
    </AppShell>
  )
}

function ContractSjabloon({ s }: { s: SjabloonMetArtikelen }) {
  const { template, artikelen } = s
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base">{template.name}</h2>
          <p className="text-xs text-gray-600">{artikelen.length} artikelen. De nummering volgt vanzelf; artikelen die niet gelden, vallen weg.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <a href={`/api/sjablonen/${template.kind}/voorbeeld`} target="_blank" rel="noopener" className="text-jr-link font-medium hover:underline">
            Voorbeeld-pdf
          </a>
          <a href={`/api/sjablonen/${template.kind}/voorbeeld?maatwerk=1`} target="_blank" rel="noopener" className="text-jr-link font-medium hover:underline">
            Voorbeeld met maatwerk
          </a>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base">Begeleidende tekst</h2>
        <p className="mb-3 text-xs text-gray-600">De tekst voor de mail bij het contract. Staat niet in het contract zelf.</p>
        <ActionForm action={introOpslaan} submitLabel="Opslaan" resetOnSuccess={false}>
          <input type="hidden" name="templateId" value={template.id} />
          <TextArea label="Tekst" name="intro" rows={14} defaultValue={template.intro ?? ''} />
        </ActionForm>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base">Artikelen</h2>
            <p className="text-xs text-gray-600">Een lege regel begint een nieuw lid. Zet geen nummers in de tekst: die komen er bij het opstellen bij.</p>
          </div>
          <Paneel knop="+ Artikel" titel="Nieuw artikel" breed>
            <ActionForm action={artikelOpslaan} submitLabel="Toevoegen">
              <input type="hidden" name="templateId" value={template.id} />
              <ArtikelVelden a={null} />
            </ActionForm>
          </Paneel>
        </div>
        <ol className="divide-y divide-gray-100">
          {artikelen.map((a, i) => (
            <li key={a.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="text-jr-blue tabular mr-2">{i + 1}</span>
                    {a.title}
                    {a.voorwaarde !== 'altijd' && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">{ARTIKEL_VOORWAARDEN[a.voorwaarde]}</span>}
                    {/\{\{#als/.test(a.body) && <span className="bg-jr-blue/10 text-jr-blue ml-2 rounded-full px-2 py-0.5 text-xs font-normal">maatwerk</span>}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{a.body}</p>
                </div>
                <div className="flex flex-none items-center gap-1">
                  {i > 0 && (
                    <ActionForm action={artikelVerschuiven} submitLabel="↑" submitClassName={KLEIN} meldGelukt={false} knopInRij>
                      <input type="hidden" name="artikelId" value={a.id} />
                      <input type="hidden" name="richting" value="op" />
                    </ActionForm>
                  )}
                  {i < artikelen.length - 1 && (
                    <ActionForm action={artikelVerschuiven} submitLabel="↓" submitClassName={KLEIN} meldGelukt={false} knopInRij>
                      <input type="hidden" name="artikelId" value={a.id} />
                      <input type="hidden" name="richting" value="neer" />
                    </ActionForm>
                  )}
                  <Paneel knop="Bewerken" stijl="klein" titel={`Artikel ${i + 1}: ${a.title}`} breed>
                    <ActionForm action={artikelOpslaan} submitLabel="Opslaan" resetOnSuccess={false}>
                      <input type="hidden" name="templateId" value={template.id} />
                      <input type="hidden" name="artikelId" value={a.id} />
                      <ArtikelVelden a={a} />
                    </ActionForm>
                  </Paneel>
                  <ActionForm action={artikelWissen} submitLabel="Weg" submitClassName={KLEIN} bevestig meldGelukt={false} knopInRij>
                    <input type="hidden" name="artikelId" value={a.id} />
                  </ActionForm>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function ArtikelVelden({ a }: { a: ContractTemplateArticle | null }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field label="Titel" name="titel" required defaultValue={a?.title ?? ''} placeholder="Thuiswerken" />
        <Select
          label="Staat erin"
          name="voorwaarde"
          defaultValue={a?.voorwaarde ?? 'altijd'}
          options={Object.entries(ARTIKEL_VOORWAARDEN).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <TextArea label="Tekst" name="tekst" rows={16} defaultValue={a?.body ?? ''} hint="Een lege regel is een nieuw lid. Plaatshouders en voorwaarden staan rechts op de pagina." />
    </>
  )
}

function MailTekst({ sleutel, eigen }: { sleutel: MailSleutel; eigen: { subject: string | null; body: string } | null }) {
  const standaard = MAIL_SJABLONEN[sleutel]
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base">Mail: {standaard.label.toLowerCase()}</h2>
      <p className="mb-3 text-xs text-gray-600">
        {standaard.uitleg} {eigen ? 'Dit is jullie eigen tekst.' : 'Dit is de standaardtekst.'} Wat tussen [haken] staat, vul je in je mailprogramma zelf in.
      </p>
      <ActionForm action={mailOpslaan} submitLabel="Opslaan" resetOnSuccess={false}>
        <input type="hidden" name="sleutel" value={sleutel} />
        <Field label="Onderwerp" name="onderwerp" required defaultValue={eigen?.subject ?? standaard.onderwerp} />
        <TextArea label="Tekst" name="tekst" rows={18} defaultValue={eigen?.body ?? standaard.tekst} />
      </ActionForm>
      {eigen && (
        <div className="mt-3">
          <ActionForm action={mailOpslaan} submitLabel="Standaardtekst terugzetten" submitClassName={KLEIN} bevestig meldGelukt={false}>
            <input type="hidden" name="sleutel" value={sleutel} />
            <input type="hidden" name="standaard" value="1" />
          </ActionForm>
        </div>
      )}
    </section>
  )
}

function Lijst({ titel, uitleg, items, vorm }: { titel: string; uitleg?: string; items: Record<string, string>; vorm: (n: string) => string }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">{titel}</h2>
      {uitleg && <p className="mt-0.5 text-xs text-gray-600">{uitleg}</p>}
      <dl className="mt-2 space-y-1.5">
        {Object.entries(items).map(([naam, betekenis]) => (
          <div key={naam}>
            <dt className="font-mono text-[11px] break-all text-gray-800">{vorm(naam)}</dt>
            <dd className="text-xs text-gray-500">{betekenis}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
