import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getMerkkluis, contrast, MIN_BEELDEN, type Merkkluis } from '@/lib/merkkluis'
import type { BrandColor, BrandFile, BrandFont } from '@/db/schema'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select, TextArea, Uitklap } from '@/components/ActionForm'
import { MerkUpload } from '@/components/MerkUpload'
import { FocusKiezer } from '@/components/FocusKiezer'
import {
  bewerkBestand,
  wisBestand,
  nieuweKleur,
  bewerkKleur,
  wisKleur,
  nieuwFont,
  bewerkFont,
  wisFont,
  bewaarStem,
} from '../../merk-actions'
import { formatDateInput } from '@/lib/dates'

export const maxDuration = 26

/* -------------------------------------------------------------------------
   De merkkluis van één klant. Zes onderdelen, in de volgorde waarin je een
   uiting opbouwt: logo, kleur, letter, toon, beeld, elementen.
   ------------------------------------------------------------------------- */

const ONDERDELEN = [
  { id: 'logos', label: 'Logo’s' },
  { id: 'kleuren', label: 'Kleuren' },
  { id: 'typografie', label: 'Typografie' },
  { id: 'toon', label: 'Tone of voice' },
  { id: 'beelden', label: 'Beelden' },
  { id: 'elementen', label: 'Elementen' },
]

const LOGO_LABEL: Record<string, string> = { primair: 'Hoofdlogo', beeldmerk: 'Beeldmerk', woordmerk: 'Woordmerk', anders: 'Anders' }
const ACHTERGROND_LABEL: Record<string, string> = { licht: 'licht', donker: 'donker', beide: 'licht en donker' }
const ROL_LABEL: Record<BrandColor['role'], string> = {
  primair: 'Primair',
  secundair: 'Secundair',
  accent: 'Accent',
  achtergrond: 'Achtergrond',
  tekst: 'Tekst',
}
const LICENTIE: Record<BrandFont['licence'], { label: string; stijl: string; uitleg?: string }> = {
  open: { label: 'Open licentie', stijl: 'bg-[#E6F7EB] text-[#1D7D3F]' },
  web: { label: 'Weblicentie', stijl: 'bg-[#E6F7EB] text-[#1D7D3F]' },
  desktop: {
    label: 'Alleen desktop',
    stijl: 'bg-[#FEF2E0] text-[#94590A]',
    uitleg: 'Een desktoplicentie dekt automatisch genereren meestal niet. Vraag de klant naar een web- of app-licentie.',
  },
  onbekend: { label: 'Licentie onbekend', stijl: 'bg-gray-150 text-gray-700', uitleg: 'Zoek uit welke licentie de klant heeft voordat we het font in sjablonen gebruiken.' },
}

/** Verandert zodra er iets aan het bestand is opgeslagen, zodat het formulier de nieuwe waarden laat zien. */
const bewerkSleutel = (b: BrandFile) =>
  [b.id, b.title, b.tags.join(), b.focusX, b.focusY, b.usage.join(), b.peopleConsent, b.source, b.aiAltered, b.usableUntil?.getTime(), b.notes, b.logoVariant, b.logoBackground, b.logoColorway].join('|')

const bron = (b: BrandFile, klein = true) => `/api/merk/bestand/${b.id}${klein && b.hasThumbnail ? '?formaat=klein' : ''}`

export default async function MerkkluisPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ bewerk?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { slug } = await params
  const { bewerk } = await searchParams
  const m = await getMerkkluis(slug)
  if (!m) notFound()
  const org = m.organisatie
  const alleBestanden = [...m.logos, ...m.beelden, ...m.elementen, ...m.fontbestanden]
  const inBewerking = bewerk ? alleBestanden.find((b) => b.id === bewerk) : undefined
  const verborgen = (
    <>
      <input type="hidden" name="organizationId" value={org.id} />
      <input type="hidden" name="slug" value={slug} />
    </>
  )

  return (
    <AppShell user={user} actief="assets">
      <a href="/beheer/assets" className="text-jr-link text-sm hover:underline">
        &larr; Alle merkkluizen
      </a>
      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-xs text-gray-600">Merkkluis</p>
          <h1 className="text-[28px] sm:text-[32px]">{org.name}</h1>
          <a href={`/beheer/klanten/${slug}?tab=profiel`} className="text-jr-link text-sm hover:underline">
            Naar het klantprofiel
          </a>
        </div>
        <Volledigheid m={m} />
      </div>

      <nav aria-label="Onderdelen" className="bg-jr-lightgray/90 sticky top-0 z-10 -mx-4 mb-8 flex gap-1 overflow-x-auto px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8 xl:-mx-12 xl:px-12">
        {ONDERDELEN.map((o) => (
          <a key={o.id} href={`#${o.id}`} className="hover:text-jr-text rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-gray-600 hover:bg-white">
            {o.label}
          </a>
        ))}
      </nav>

      <div className="space-y-14">
        {/* ------------------------------ Logo's ------------------------------ */}
        <Onderdeel id="logos" titel="Logo’s" uitleg="Elke variant apart, met de achtergrond waarvoor hij bedoeld is. Een sjabloon kiest zelf de variant die past. SVG waar het kan, anders PNG met transparantie.">
          {inBewerking?.kind === 'logo' && <Bewerker key={bewerkSleutel(inBewerking)} b={inBewerking} slug={slug} />}
          {m.logos.length > 0 && (
            <ul className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {m.logos.map((l) => (
                <Tegel key={l.id} b={l} slug={slug}>
                  <div
                    className={`flex aspect-[4/3] items-center justify-center rounded-t-xl p-6 ${
                      l.logoBackground === 'donker' ? 'bg-jr-black' : l.logoBackground === 'beide' ? 'bg-[linear-gradient(90deg,#fff_50%,#1C1C1E_50%)]' : 'bg-white'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bron(l, false)} alt={l.title} className="max-h-full max-w-full object-contain" />
                  </div>
                  <p className="px-4 pt-2.5 text-xs text-gray-600">
                    {LOGO_LABEL[l.logoVariant ?? 'anders']} · {ACHTERGROND_LABEL[l.logoBackground ?? 'licht']} · {l.logoColorway}
                  </p>
                </Tegel>
              ))}
            </ul>
          )}
          <MerkUpload organizationId={org.id} slug={slug} kind="logo" accept="image/svg+xml,image/png,image/webp,image/jpeg" label="Logo toevoegen" metLogoKeuze />
        </Onderdeel>

        {/* ------------------------------ Kleuren ----------------------------- */}
        <Onderdeel id="kleuren" titel="Kleuren" uitleg="Met een rol, zodat een sjabloon weet welke kleur waar hoort. Het contrast staat erbij: tekst op een kleur moet minstens 4,5 halen, grote koppen 3.">
          {m.kleuren.length > 0 && (
            <ul className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {m.kleuren.map((k) => (
                <li key={k.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  <div className="flex h-24 items-end justify-between p-3" style={{ background: k.hex }}>
                    <span className="text-sm font-semibold text-white">Aa</span>
                    <span className="text-sm font-semibold text-black">Aa</span>
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-[15px] font-medium">{k.name}</p>
                    <p className="tabular text-xs text-gray-600">
                      {k.hex} · {ROL_LABEL[k.role]}
                    </p>
                    <p className="text-xs text-gray-600">
                      <ContrastLabel kleur={k.hex} tekst="#FFFFFF" naam="wit" /> · <ContrastLabel kleur={k.hex} tekst="#000000" naam="zwart" />
                    </p>
                    {k.notes && <p className="text-xs text-gray-600">{k.notes}</p>}
                    <Uitklap label="Wijzig" className="pt-1">
                      <ActionForm action={bewerkKleur} submitLabel="Opslaan" resetOnSuccess={false}>
                        {verborgen}
                        <input type="hidden" name="id" value={k.id} />
                        <KleurVelden k={k} />
                      </ActionForm>
                      <WisKnop action={wisKleur} id={k.id} slug={slug} label="Kleur verwijderen" />
                    </Uitklap>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Uitklap label="Kleur toevoegen" className="">
            <ActionForm action={nieuweKleur} submitLabel="Toevoegen">
              {verborgen}
              <KleurVelden />
            </ActionForm>
          </Uitklap>
        </Onderdeel>

        {/* ------------------------------ Typografie -------------------------- */}
        <Onderdeel id="typografie" titel="Typografie" uitleg="Per rol het lettertype, de gewichten, een reservefont en de licentie. Zet het fontbestand erbij als we het hebben.">
          {m.fonts.length > 0 && (
            <ul className="mb-5 divide-y divide-gray-200 rounded-xl bg-white shadow-sm">
              {m.fonts.map((f) => {
                const lic = LICENTIE[f.licence]
                const bestand = m.fontbestanden.find((b) => b.id === f.fileId)
                return (
                  <li key={f.id} className="px-6 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-600 capitalize">{f.role}</p>
                        <p className="text-xl font-medium" style={{ fontFamily: `"${f.name}", ${f.fallback ?? 'sans-serif'}` }}>
                          {f.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {[f.weights && `Gewichten: ${f.weights}`, f.fallback && `Reserve: ${f.fallback}`, bestand && `Bestand: ${bestand.title}`]
                            .filter(Boolean)
                            .join(' · ') || 'Nog geen gewichten of reservefont'}
                        </p>
                        {lic.uitleg && <p className="mt-1 text-xs text-[#94590A]">{lic.uitleg}</p>}
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs ${lic.stijl}`}>{lic.label}</span>
                    </div>
                    <Uitklap label="Wijzig" className="mt-2">
                      <ActionForm action={bewerkFont} submitLabel="Opslaan" resetOnSuccess={false}>
                        {verborgen}
                        <input type="hidden" name="id" value={f.id} />
                        <FontVelden f={f} bestanden={m.fontbestanden} />
                      </ActionForm>
                      <WisKnop action={wisFont} id={f.id} slug={slug} label="Lettertype verwijderen" />
                    </Uitklap>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-start gap-6">
            <Uitklap label="Lettertype toevoegen" className="">
              <ActionForm action={nieuwFont} submitLabel="Toevoegen">
                {verborgen}
                <FontVelden bestanden={m.fontbestanden} />
              </ActionForm>
            </Uitklap>
            <MerkUpload organizationId={org.id} slug={slug} kind="lettertype" accept=".woff2,.woff,.otf,.ttf" label="Fontbestand uploaden" />
          </div>
          {m.fontbestanden.length > 0 && (
            <p className="mt-3 text-xs text-gray-600">
              Fontbestanden:{' '}
              {m.fontbestanden.map((b, i) => (
                <span key={b.id}>
                  {i > 0 && ', '}
                  <a href={`/api/merk/bestand/${b.id}?download=1`} className="text-jr-link hover:underline">
                    {b.title}
                  </a>
                </span>
              ))}
            </p>
          )}
        </Onderdeel>

        {/* ------------------------------ Tone of voice ----------------------- */}
        <Onderdeel id="toon" titel="Tone of voice" uitleg="Voorbeeldzinnen sturen beter dan bijvoeglijke naamwoorden, voor een copywriter en voor AI. Drie goede en drie foute zijn genoeg.">
          <div className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
            <ActionForm action={bewaarStem} submitLabel="Opslaan" resetOnSuccess={false}>
              {verborgen}
              <div className="grid gap-4 lg:grid-cols-2">
                <Select
                  label="Aanspreekvorm"
                  name="address"
                  defaultValue={m.stem?.address ?? ''}
                  options={[
                    { value: '', label: 'Nog niet gekozen' },
                    { value: 'je', label: 'Je en jij' },
                    { value: 'u', label: 'U' },
                    { value: 'wisselend', label: 'Wisselend, zie toelichting' },
                  ]}
                />
                <TextArea label="Karakter" name="character" rows={2} defaultValue={m.stem?.character ?? ''} hint="In drie of vier woorden: bijvoorbeeld gastvrij, nuchter, met een knipoog." />
                <TextArea label="Woorden die wel passen" name="wordsYes" rows={3} defaultValue={m.stem?.wordsYes ?? ''} hint="Eén per regel of met komma’s." />
                <TextArea label="Woorden die niet passen" name="wordsNo" rows={3} defaultValue={m.stem?.wordsNo ?? ''} hint="Bijvoorbeeld: goedkoop, uniek, beleving." />
                <TextArea label="Zo klinken ze wel" name="goodExamples" rows={4} defaultValue={m.stem?.goodExamples ?? ''} hint="Drie zinnen die echt van hen zijn: van de website, een mail, een post." />
                <TextArea label="Zo klinken ze niet" name="badExamples" rows={4} defaultValue={m.stem?.badExamples ?? ''} hint="Drie zinnen die je nooit van hen wilt zien, en waarom." />
                <TextArea label="Vaste oproepen tot actie" name="ctas" rows={2} defaultValue={m.stem?.ctas ?? ''} hint="Bijvoorbeeld: Reserveer je tafel. Bekijk de woning." />
              </div>
            </ActionForm>
          </div>
        </Onderdeel>

        {/* ------------------------------ Beelden ----------------------------- */}
        <Onderdeel
          id="beelden"
          titel="Beelden"
          uitleg={`Foto’s die we voor deze klant mogen gebruiken, met waarvoor, tot wanneer, en of de mensen erop toestemming gaven. Het focuspunt zorgt dat een foto in elk formaat goed valt. Minstens ${MIN_BEELDEN} met rechten voor een volle kluis.`}
        >
          {inBewerking?.kind === 'beeld' && <Bewerker key={bewerkSleutel(inBewerking)} b={inBewerking} slug={slug} />}
          <div className="mb-5">
            <MerkUpload organizationId={org.id} slug={slug} kind="beeld" accept="image/jpeg,image/png,image/webp" label="Beelden toevoegen" meerdere />
            <p className="mt-2 text-xs text-gray-600">
              Meerdere tegelijk kan. Foto’s worden verkleind tot 3000 pixels aan de lange kant; het origineel blijft waar het stond.
            </p>
          </div>
          {m.beelden.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {m.beelden.map((b) => (
                <li key={b.id}>
                  <a href={`?bewerk=${b.id}#beelden`} className={`group block overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md ${b.id === bewerk ? 'ring-jr-blue ring-2' : ''}`}>
                    <div className="aspect-square overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bron(b)} alt={b.title} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: `${b.focusX}% ${b.focusY}%` }} />
                    </div>
                    <div className="space-y-1 p-2.5">
                      <p className="truncate text-xs">{b.title}</p>
                      <div className="flex flex-wrap gap-1">
                        {b.usage.length === 0 && <Chip stijl="bg-[#FEF2E0] text-[#94590A]">rechten?</Chip>}
                        {b.peopleConsent === 'onbekend' && <Chip stijl="bg-[#FEF2E0] text-[#94590A]">personen?</Chip>}
                        {b.aiAltered && <Chip stijl="bg-[#F5EAFB] text-[#7E2FB0]">AI</Chip>}
                        {b.usableUntil && b.usableUntil < new Date() && <Chip stijl="bg-[#FDECEA] text-[#C02A22]">verlopen</Chip>}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Onderdeel>

        {/* ------------------------------ Elementen --------------------------- */}
        <Onderdeel id="elementen" titel="Grafische elementen" uitleg="Iconen, patronen, vormen en stickers die bij het merk horen. Later de bouwstenen van de sjablonen, zoals de “nog x plaatsen”-sticker.">
          {inBewerking?.kind === 'element' && <Bewerker key={bewerkSleutel(inBewerking)} b={inBewerking} slug={slug} />}
          {m.elementen.length > 0 && (
            <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {m.elementen.map((e) => (
                <Tegel key={e.id} b={e} slug={slug}>
                  <div className="flex aspect-square items-center justify-center rounded-t-xl bg-[repeating-conic-gradient(#F5F5F7_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bron(e)} alt={e.title} className="max-h-full max-w-full object-contain" />
                  </div>
                </Tegel>
              ))}
            </ul>
          )}
          <MerkUpload organizationId={org.id} slug={slug} kind="element" accept="image/svg+xml,image/png,image/webp" label="Element toevoegen" meerdere />
        </Onderdeel>
      </div>
    </AppShell>
  )
}

/* ------------------------------ Bouwstenen ------------------------------- */

function Onderdeel({ id, titel, uitleg, children }: { id: string; titel: string; uitleg: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-[22px]">{titel}</h2>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-600">{uitleg}</p>
      {children}
    </section>
  )
}

function Volledigheid({ m }: { m: Merkkluis }) {
  const v = m.volledigheid
  return (
    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium">Volledigheid</p>
        <p className={`text-sm font-semibold ${v.klaar === v.totaal ? 'text-[#1D7D3F]' : ''}`}>
          {v.klaar} van {v.totaal}
        </p>
      </div>
      <ul className="space-y-1">
        {v.punten.map((p) => (
          <li key={p.label} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${p.klaar ? 'bg-[#34C759] text-white' : 'border border-gray-400'}`}>
              {p.klaar && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2.5 6.2 5 8.5l4.5-5" />
                </svg>
              )}
            </span>
            <span className={p.klaar ? 'text-gray-600' : ''}>{p.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Chip({ stijl, children }: { stijl: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${stijl}`}>{children}</span>
}

function ContrastLabel({ kleur, tekst, naam }: { kleur: string; tekst: string; naam: string }) {
  const c = contrast(kleur, tekst)
  const oordeel = c >= 4.5 ? 'goed' : c >= 3 ? 'alleen groot' : 'te laag'
  return (
    <span className={c >= 4.5 ? '' : c >= 3 ? 'text-[#94590A]' : 'text-[#C02A22]'}>
      {naam} {c.toFixed(1).replace('.', ',')} ({oordeel})
    </span>
  )
}

/** Een logo of element als tegel, met downloaden en wijzigen. */
function Tegel({ b, slug, children }: { b: BrandFile; slug: string; children: React.ReactNode }) {
  return (
    <li className="overflow-hidden rounded-xl bg-white shadow-sm">
      {children}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <p className="min-w-0 truncate text-sm">{b.title}</p>
        <div className="flex shrink-0 gap-3 text-xs font-medium">
          <a href={`/api/merk/bestand/${b.id}?download=1`} className="text-jr-link hover:underline">
            Download
          </a>
          <a href={`/beheer/assets/${slug}?bewerk=${b.id}#${b.kind === 'logo' ? 'logos' : 'elementen'}`} className="text-jr-link hover:underline">
            Wijzig
          </a>
        </div>
      </div>
    </li>
  )
}

function WisKnop({ action, id, slug, label }: { action: (f: FormData) => Promise<{ ok: true } | { ok: false; error: string }>; id: string; slug: string; label: string }) {
  return (
    <ActionForm action={action} submitLabel={label} submitClassName="mt-3 text-[#C02A22] hover:bg-[#FDECEA] !px-3 !text-xs" resetOnSuccess={false} meldGelukt={false} className="">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
    </ActionForm>
  )
}

/** Het wijzigpaneel voor één bestand: bovenaan het onderdeel, via ?bewerk=. */
function Bewerker({ b, slug }: { b: BrandFile; slug: string }) {
  const sectie = b.kind === 'logo' ? 'logos' : b.kind === 'beeld' ? 'beelden' : 'elementen'
  return (
    <div className="ring-jr-blue mb-6 rounded-xl bg-white p-6 shadow-md ring-2 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[17px]">{b.title} wijzigen</h3>
        <a href={`/beheer/assets/${slug}#${sectie}`} className="text-jr-link text-sm font-medium hover:underline">
          Sluiten
        </a>
      </div>
      <ActionForm action={bewerkBestand} submitLabel="Opslaan" resetOnSuccess={false}>
        <input type="hidden" name="id" value={b.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="kind" value={b.kind} />
        {b.kind === 'beeld' && <FocusKiezer src={`/api/merk/bestand/${b.id}`} x={b.focusX} y={b.focusY} />}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Naam" name="title" required defaultValue={b.title} />
          <Field label="Tags" name="tags" defaultValue={b.tags.join(', ')} hint="Met komma’s: kerst, diner, interieur, team." />
          {b.kind === 'logo' && (
            <>
              <Select label="Soort" name="logoVariant" defaultValue={b.logoVariant ?? 'primair'} options={Object.entries(LOGO_LABEL).map(([value, label]) => ({ value, label }))} />
              <Select
                label="Achtergrond"
                name="logoBackground"
                defaultValue={b.logoBackground ?? 'licht'}
                options={[
                  { value: 'licht', label: 'Voor lichte achtergrond' },
                  { value: 'donker', label: 'Voor donkere achtergrond' },
                  { value: 'beide', label: 'Voor beide' },
                ]}
              />
              <Select
                label="Kleur"
                name="logoColorway"
                defaultValue={b.logoColorway ?? 'kleur'}
                options={[
                  { value: 'kleur', label: 'In kleur' },
                  { value: 'zwart', label: 'Zwart' },
                  { value: 'wit', label: 'Wit' },
                ]}
              />
            </>
          )}
          {b.kind === 'beeld' && (
            <>
              <Select
                label="Bron"
                name="source"
                defaultValue={b.source ?? 'klant'}
                options={[
                  { value: 'eigen', label: 'Eigen shoot (draaidag)' },
                  { value: 'klant', label: 'Van de klant' },
                  { value: 'stock', label: 'Stock' },
                  { value: 'ai', label: 'Gemaakt met AI' },
                ]}
              />
              <fieldset>
                <legend className="text-jr-text mb-2 text-[13px] font-medium">Mag gebruikt worden voor</legend>
                <div className="flex flex-wrap gap-4">
                  {['organisch', 'advertenties', 'print'].map((u) => (
                    <label key={u} className="flex items-center gap-2 text-[15px]">
                      <input type="checkbox" name="usage" value={u} defaultChecked={b.usage.includes(u)} className="h-[18px] w-[18px]" />
                      {u}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Te gebruiken tot" name="usableUntil" type="date" defaultValue={b.usableUntil ? formatDateInput(b.usableUntil) : ''} hint="Leeg is zonder einddatum. Bij stock vaak wel een einddatum." />
              <Select
                label="Mensen op de foto"
                name="peopleConsent"
                defaultValue={b.peopleConsent ?? 'onbekend'}
                options={[
                  { value: 'geen', label: 'Er staan geen herkenbare mensen op' },
                  { value: 'toestemming', label: 'Ja, met toestemming' },
                  { value: 'onbekend', label: 'Weet ik niet' },
                ]}
                hint="Herkenbare mensen zonder toestemming: niet gebruiken in advertenties."
              />
              <label className="flex items-start gap-2.5 text-[15px] lg:col-span-2">
                <input type="checkbox" name="aiAltered" defaultChecked={b.aiAltered} className="mt-0.5 h-[18px] w-[18px]" />
                <span>
                  Gemaakt of wezenlijk bewerkt met AI
                  <span className="block text-xs text-gray-600">Dan moet het in een uiting als AI gelabeld worden (AI-verordening, artikel 50). Gewoon bijsnijden of kleur aanpassen telt niet.</span>
                </span>
              </label>
            </>
          )}
          <div className="lg:col-span-2">
            <TextArea label="Notities" name="notes" rows={2} defaultValue={b.notes ?? ''} />
          </div>
        </div>
        <p className="text-xs text-gray-600">
          {b.width && b.height ? `${b.width} × ${b.height} pixels · ` : ''}
          {(b.bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB · {b.contentType.split('/')[1]?.replace('svg+xml', 'svg')}
          {' · '}
          <a href={`/api/merk/bestand/${b.id}?download=1`} className="text-jr-link hover:underline">
            Download
          </a>
        </p>
      </ActionForm>
      <WisKnop action={wisBestand} id={b.id} slug={slug} label="Uit de kluis verwijderen" />
    </div>
  )
}

function KleurVelden({ k }: { k?: BrandColor }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Naam" name="name" required defaultValue={k?.name ?? ''} placeholder="Thiessen-rood" />
      <Field label="Kleurcode" name="hex" required defaultValue={k?.hex ?? ''} placeholder="#8B1E2D" />
      <Select label="Rol" name="role" defaultValue={k?.role ?? 'primair'} options={Object.entries(ROL_LABEL).map(([value, label]) => ({ value, label }))} />
      <Field label="Notitie" name="notes" defaultValue={k?.notes ?? ''} placeholder="Nooit als tekstkleur op foto’s" />
    </div>
  )
}

function FontVelden({ f, bestanden }: { f?: BrandFont; bestanden: BrandFile[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Naam" name="name" required defaultValue={f?.name ?? ''} placeholder="Playfair Display" />
      <Select
        label="Rol"
        name="role"
        defaultValue={f?.role ?? 'koppen'}
        options={[
          { value: 'koppen', label: 'Koppen' },
          { value: 'tekst', label: 'Tekst' },
          { value: 'accent', label: 'Accent' },
        ]}
      />
      <Field label="Gewichten" name="weights" defaultValue={f?.weights ?? ''} placeholder="400, 700" />
      <Field label="Reservefont" name="fallback" defaultValue={f?.fallback ?? ''} placeholder="Georgia, serif" />
      <Select
        label="Licentie"
        name="licence"
        defaultValue={f?.licence ?? 'onbekend'}
        options={[
          { value: 'open', label: 'Open (bijvoorbeeld Google Fonts)' },
          { value: 'web', label: 'Web- of app-licentie' },
          { value: 'desktop', label: 'Alleen desktop' },
          { value: 'onbekend', label: 'Onbekend' },
        ]}
      />
      <Select
        label="Fontbestand"
        name="fileId"
        defaultValue={f?.fileId ?? ''}
        options={[{ value: '', label: bestanden.length ? 'Geen' : 'Nog geen fontbestanden geüpload' }, ...bestanden.map((b) => ({ value: b.id, label: b.title }))]}
      />
      <div className="sm:col-span-2">
        <Field label="Notitie" name="notes" defaultValue={f?.notes ?? ''} />
      </div>
    </div>
  )
}
