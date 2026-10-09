import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Check, Field, TextArea } from '@/components/ActionForm'
import { getBedrijf, listVestigingen, listHandboeken, handboekPad, adresRegel, merknaam, LOGO_MAX_BYTES } from '@/lib/bedrijf'
import { formatDate } from '@/lib/dates'
import type { CompanyLocation } from '@/db/schema'
import {
  bedrijfOpslaan,
  vestigingOpslaan,
  vestigingSluiten,
  logoUploaden,
  logoWissen,
  handboekUploaden,
  regelingenOpslaan,
} from '../bedrijf-actions'
import { REGELINGEN, verzekeringenZin } from '@/lib/sjablonen'

export const maxDuration = 26

/**
 * Bedrijfsgegevens: de enige plek voor wie we zijn en waar we zitten.
 *
 * De naam en het logo in de kop van elk document, de hoofdvestiging in elk
 * contract, de standplaatsen, het personeelshandboek en de AVG-verklaring.
 * Alleen voor beheerders: dit komt in elk contract terecht.
 */
export default async function BedrijfPagina() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/beheer')

  const [bedrijf, alleVestigingen, handboeken] = await Promise.all([getBedrijf(), listVestigingen({ inactief: true }), listHandboeken()])
  const w = bedrijf?.werkgever ?? null
  const huidig = handboeken[0] ?? null

  return (
    <AppShell user={user} actief="bedrijf">
      <div className="mb-6">
        <h1 className="text-[28px] sm:text-[32px]">Bedrijfsgegevens</h1>
        <p className="text-sm text-gray-600">
          Wat hier staat, komt in elk contract en elk document: de naam en het logo in de kop, het adres van de hoofdvestiging, de standplaatsen en het
          personeelshandboek. Een contract dat al is opgesteld, houdt de gegevens van dat moment.
        </p>
      </div>

      {/* ------------------------------ Het bedrijf ------------------------------ */}
      <section className="mb-5 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base">Het bedrijf</h2>
            <p className="text-xs text-gray-600">De naam in de kop van een document, en wie er namens het bedrijf tekent.</p>
          </div>
          <Paneel knop={w ? 'Bewerken' : '+ Invullen'} stijl="rustig" titel="Het bedrijf" uitleg="De naam en de ondertitel staan in de kop van elk document. De juridische naam staat in het contract bij de werkgever.">
            <ActionForm action={bedrijfOpslaan} submitLabel="Opslaan" resetOnSuccess={false}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Naam in de kop" name="naam" required defaultValue={w?.tradeName ?? 'James Robinson'} />
                <Field label="Ondertitel" name="ondertitel" defaultValue={w?.tagline ?? ''} placeholder="Performance Agency" />
              </div>
              <Field label="Juridische naam (zoals in de KvK)" name="juridischeNaam" required defaultValue={w?.legalName ?? ''} placeholder="James Robinson B.V." />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="KvK-nummer" name="kvk" defaultValue={w?.kvkNumber ?? ''} />
                <Field label="Btw-nummer" name="btw" defaultValue={w?.vatNumber ?? ''} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="E-mail" name="email" type="email" defaultValue={w?.email ?? ''} hint="Ook voor vragen over persoonsgegevens (AVG)." />
                <Field label="Telefoon" name="telefoon" defaultValue={w?.phone ?? ''} />
                <Field label="Website" name="website" defaultValue={w?.website ?? ''} />
              </div>
              <Field
                label="Wie standaard tekent"
                name="ondertekenaars"
                required
                defaultValue={w?.signatories ?? ''}
                hint="Alleen als er bij een contract niemand gekozen is. Bij het opstellen kies je per contract; eigenaren staan dan standaard aan."
              />
            </ActionForm>
          </Paneel>
        </div>
        {w ? (
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Regel label="Naam in de kop">{merknaam(w)}</Regel>
            <Regel label="Juridische naam">{w.legalName}</Regel>
            <Regel label="KvK">{w.kvkNumber ?? <Leeg />}</Regel>
            <Regel label="Btw">{w.vatNumber ?? <Leeg />}</Regel>
            <Regel label="Contact">{[w.email, w.phone, w.website].filter(Boolean).join(' · ') || <Leeg />}</Regel>
            <Regel label="Tekent standaard">{w.signatories}</Regel>
          </dl>
        ) : (
          <p className="text-sm text-gray-600">Nog niets ingevuld. Zonder bedrijfsgegevens kan er geen contract worden opgesteld.</p>
        )}
      </section>

      {/* ------------------------------ Bedrijfsbreed geregeld ------------------------------ */}
      <section className="mb-5 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base">Bedrijfsbreed geregeld</h2>
        <p className="mb-3 text-xs text-gray-600">
          Wat je hier aanvinkt, staat in elk nieuw contract. Zet je een verzekering uit, dan verdwijnt hij uit het artikel over verzekeringen; staat er niets aan,
          dan valt dat lid weg.
        </p>
        <ActionForm action={regelingenOpslaan} submitLabel="Opslaan" resetOnSuccess={false}>
          <div className="grid gap-2 sm:grid-cols-2">
            {REGELINGEN.map((r) => (
              <label key={r.sleutel} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="regeling" value={r.sleutel} defaultChecked={w?.regelingen.includes(r.sleutel) ?? false} />
                {r.label}
              </label>
            ))}
          </div>
          {w && verzekeringenZin(w.regelingen) && (
            <p className="text-xs text-gray-500">In het contract: &ldquo;De werkgever heeft {verzekeringenZin(w.regelingen)} afgesloten.&rdquo;</p>
          )}
        </ActionForm>
      </section>

      {/* ------------------------------ Logo ------------------------------ */}
      <section className="mb-5 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base">Logo</h2>
        <p className="mb-4 text-xs text-gray-600">
          Een png of jpg (een pdf kan geen svg tonen), liefst met een transparante achtergrond, maximaal {Math.round(LOGO_MAX_BYTES / 1024 / 1024)} MB. Een breed logo met
          de naam erin staat alleen in de kop; een vierkant beeldmerk krijgt de naam en de ondertitel ernaast.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="grid h-24 w-64 place-items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
            {w?.logoKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/bedrijf/logo?v=${encodeURIComponent(w.logoKey)}`} alt="Logo" className="max-h-[80px] max-w-[232px] object-contain" />
            ) : (
              <span className="text-xs text-gray-500">Nog geen logo</span>
            )}
          </div>
          <div className="space-y-3">
            <ActionForm action={logoUploaden} submitLabel={w?.logoKey ? 'Vervangen' : 'Uploaden'}>
              <input type="file" name="logo" accept="image/png,image/jpeg" className="block text-sm" />
            </ActionForm>
            {w?.logoKey && (
              <ActionForm action={logoWissen} submitLabel="Logo weghalen" submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs" bevestig meldGelukt={false}>
                <span />
              </ActionForm>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------ Vestigingen ------------------------------ */}
      <section className="mb-5 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base">Vestigingen</h2>
            <p className="text-xs text-gray-600">
              De hoofdvestiging staat bij de werkgever in elk contract. Elke actieve vestiging kun je bij een contract kiezen als standplaats.
            </p>
          </div>
          <Paneel knop="+ Vestiging" titel="Nieuwe vestiging">
            <ActionForm action={vestigingOpslaan} submitLabel="Toevoegen">
              <VestigingVelden v={null} eerste={alleVestigingen.length === 0} />
            </ActionForm>
          </Paneel>
        </div>
        {alleVestigingen.length === 0 ? (
          <p className="text-jr-orange text-sm">Er is nog geen vestiging. Zonder hoofdvestiging kan er geen contract worden opgesteld.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {alleVestigingen.map((v) => (
              <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className={v.active ? '' : 'text-gray-500'}>
                  <p className="font-medium">
                    {v.name}
                    {v.isMain && <span className="bg-jr-blue/10 text-jr-blue ml-2 rounded-full px-2 py-0.5 text-xs">Hoofdvestiging</span>}
                    {!v.active && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">Gesloten</span>}
                  </p>
                  <p className="text-gray-600">{adresRegel(v)}</p>
                  <p className="text-xs text-gray-500">
                    {[v.phone, v.email, v.officeHours ? `Kantoortijden ${v.officeHours}` : 'Geen kantoortijden ingevuld'].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Paneel knop="Bewerken" stijl="klein" titel={`Vestiging ${v.name}`}>
                    <ActionForm action={vestigingOpslaan} submitLabel="Opslaan" resetOnSuccess={false}>
                      <input type="hidden" name="vestigingId" value={v.id} />
                      <VestigingVelden v={v} eerste={false} />
                    </ActionForm>
                  </Paneel>
                  {v.active && !v.isMain && (
                    <ActionForm action={vestigingSluiten} submitLabel="Sluiten" submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs" bevestig meldGelukt={false} knopInRij>
                      <input type="hidden" name="vestigingId" value={v.id} />
                    </ActionForm>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------ Personeelshandboek ------------------------------ */}
      <section className="mb-5 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base">Personeelshandboek</h2>
            <p className="text-xs text-gray-600">
              Het contract zegt dat de werknemer het handboek voor de ondertekening ontvangt. De link staat in de begeleidende tekst van elk contract. Elke versie
              heeft een eigen link, zodat iemand altijd de versie leest die bij zijn contract hoort.
            </p>
          </div>
          <Paneel knop={huidig ? 'Nieuwe versie' : '+ Uploaden'} titel="Personeelshandboek uploaden" uitleg="Een pdf van maximaal 5 MB. Een nieuwe versie geldt voor contracten die je daarna opstelt of wijzigt.">
            <ActionForm action={handboekUploaden} submitLabel="Uploaden">
              <input type="file" name="handboek" accept="application/pdf" className="block text-sm" required />
              <Field label="Versie" name="notitie" placeholder="Versie oktober 2026" />
            </ActionForm>
          </Paneel>
        </div>
        {huidig ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {handboeken.map((h, i) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <a href={handboekPad(h)} target="_blank" rel="noopener" className="hover:text-jr-blue font-medium">
                    {h.note || h.filename}
                  </a>{' '}
                  <span className="text-gray-500">
                    · {formatDate(h.createdAt)} · {Math.round(h.bytes / 1024)} kB
                  </span>
                </span>
                {i === 0 ? <span className="bg-jr-green/15 rounded-full px-2.5 py-0.5 text-xs text-[#1d7a36]">Geldt nu</span> : <span className="text-xs text-gray-500">Oudere versie</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-jr-orange text-sm">Nog geen personeelshandboek. Een contract kan wel worden opgesteld, maar krijgt een waarschuwing.</p>
        )}
      </section>

      {/* ------------------------------ Teksten ------------------------------ */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="mb-1 text-base">Contractteksten, AVG-verklaring en mails</h2>
          <p className="text-xs text-gray-600">De teksten zelf beheer je bij Standaardteksten.</p>
        </div>
        <a href="/beheer/sjablonen" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Standaardteksten
        </a>
      </section>
    </AppShell>
  )
}

function Regel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Leeg() {
  return <span className="text-gray-400">niet ingevuld</span>
}

function VestigingVelden({ v, eerste }: { v: CompanyLocation | null; eerste: boolean }) {
  return (
    <>
      <Field label="Naam" name="naam" required defaultValue={v?.name ?? ''} placeholder="Hulsberg" hint="Hoe je hem noemt bij het kiezen van een standplaats." />
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1.5fr]">
        <Field label="Adres" name="adres" required defaultValue={v?.addressLine ?? ''} placeholder="Aalbekerweg 4" />
        <Field label="Postcode" name="postcode" required defaultValue={v?.postalCode ?? ''} />
        <Field label="Plaats" name="plaats" required defaultValue={v?.city ?? ''} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Telefoon" name="telefoon" defaultValue={v?.phone ?? ''} />
        <Field label="E-mail" name="email" type="email" defaultValue={v?.email ?? ''} />
      </div>
      <Field
        label="Kantoortijden"
        name="kantoortijden"
        defaultValue={v?.officeHours ?? ''}
        placeholder="09.00 tot 17.30 uur"
        hint="Komt in het contract als iemand op werkdagen bereikbaar moet zijn."
      />
      {!eerste && (
        <>
          <input type="hidden" name="hoofdKeuze" value="1" />
          <Check label="Hoofdvestiging" name="hoofd" defaultChecked={v?.isMain ?? false} hint="Staat bij de werkgever in elk nieuw contract. Er is er altijd precies een." />
        </>
      )}
    </>
  )
}
