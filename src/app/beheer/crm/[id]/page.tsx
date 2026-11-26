import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { extraBedrijvenVan, getContactKaart } from '@/lib/crm'
import { listBedrijfsnamen } from '@/lib/pijplijn'
import { AppShell } from '@/components/AppShell'
import { Avatar } from '@/components/Avatar'
import { ActionForm, Field, Select, TextArea } from '@/components/ActionForm'
import { MAANDNAMEN, formatDate } from '@/lib/dates'
import { nogOpenBij, vorigeWerkgevers } from '@/lib/vertrek'
import { VertrekFormulier } from '@/components/crm/Vertrek'
import { Paneel } from '@/components/Paneel'
import { wijzigContact, verwijderContact, koppelAanBedrijf, ontkoppelVanBedrijf } from '../../crm-actions'

const KNOP_RUSTIG = 'inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'

/**
 * De kaart van een persoon in het adresboek: wie het is, waar hij werkt en
 * hoe je hem bereikt, met alles meteen te wijzigen. Voor iedereen van het
 * team. Hangt hij aan een klant, dan staat daar de rest (DISC, verjaardag,
 * wat hij drinkt); een los contact kun je hier aan een klant koppelen.
 */
export default async function ContactKaartPagina({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const [kaart, bedrijven, extra, vorige, open] = await Promise.all([getContactKaart(id), listBedrijfsnamen(), extraBedrijvenVan(id), vorigeWerkgevers(id), nogOpenBij(id)])
  if (!kaart) notFound()
  const { contact: c, organisatie, partner } = kaart
  const werkt = organisatie?.naam ?? partner?.naam ?? c.companyName
  const telefoon = c.mobile ?? c.phone

  return (
    <AppShell user={user} actief="crm">
      <a href="/beheer/crm" className="hover:text-jr-blue mb-3 block text-xs text-gray-500">
        &larr; Contacten
      </a>

      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar naam={c.name} imageId={c.avatarImageId} maat={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] sm:text-[32px]">{c.name}</h1>
          <p className="text-sm text-gray-600">
            {c.jobTitle ? `${c.jobTitle}${werkt ? ' bij ' : ''}` : ''}
            {organisatie ? (
              <a href={`/beheer/klanten/${organisatie.slug}`} className="text-jr-link hover:underline">
                {organisatie.naam}
              </a>
            ) : partner ? (
              <a href={`/beheer/partners#${partner.id}`} className="text-jr-link hover:underline">
                {partner.naam}
              </a>
            ) : (
              (werkt ?? (c.jobTitle ? '' : 'Los contact, zonder bedrijf'))
            )}
            {extra.length > 0 && <span className="text-gray-500"> &middot; ook {extra.map((b) => b.naam).join(', ')}</span>}
            {c.birthDay !== null && c.birthMonth !== null && (
              <span className="text-gray-500">
                {' '}
                &middot; jarig {c.birthDay} {MAANDNAMEN[c.birthMonth - 1]}
              </span>
            )}
          </p>
        </div>
      </header>

      {/* Bereiken: één klik. */}
      <div className="mb-6 flex flex-wrap gap-2">
        {c.email && (
          <a href={`mailto:${c.email}`} className={KNOP_RUSTIG}>
            Mail {c.email}
          </a>
        )}
        {telefoon && (
          <a href={`tel:${telefoon.replace(/\s/g, '')}`} className={KNOP_RUSTIG}>
            Bel {telefoon}
          </a>
        )}
        {c.mobile && c.phone && (
          <a href={`tel:${c.phone.replace(/\s/g, '')}`} className={KNOP_RUSTIG}>
            Vast {c.phone}
          </a>
        )}
        {c.linkedinUrl && (
          <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className={KNOP_RUSTIG}>
            LinkedIn
          </a>
        )}
        {!c.email && !telefoon && <p className="text-sm text-[#94590A]">Nog geen mail of nummer. Vul ze hieronder in.</p>}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base">Gegevens</h2>
          <ActionForm action={wijzigContact} submitLabel="Opslaan" resetOnSuccess={false}>
            <input type="hidden" name="contactId" value={c.id} />
            <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_1.4fr]">
              <Field label="Voornaam" name="voornaam" defaultValue={c.firstName ?? ''} />
              <Field label="Tussenv." name="tussenvoegsel" defaultValue={c.infix ?? ''} />
              <Field label="Achternaam" name="achternaam" defaultValue={c.lastName ?? ''} />
            </div>
            <Field label="Functie" name="functie" defaultValue={c.jobTitle ?? ''} />
            {partner ? (
              <p className="text-sm text-gray-600">
                Contactpersoon van partner{' '}
                <a href={`/beheer/partners#${partner.id}`} className="text-jr-link hover:underline">
                  {partner.naam}
                </a>
                .
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Bij klant of prospect"
                  name="organizationId"
                  defaultValue={organisatie?.id ?? ''}
                  options={[{ value: '', label: 'Geen: los contact' }, ...bedrijven.map((b) => ({ value: b.id, label: b.naam }))]}
                />
                <Field label="Of: werkt bij" name="bedrijfsnaam" defaultValue={c.companyName ?? ''} hint="Alleen als je hiernaast geen klant kiest." />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="E-mail" name="email" type="email" defaultValue={c.email ?? ''} />
              <Field label="Mobiel" name="mobiel" defaultValue={c.mobile ?? ''} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefoon" name="telefoon" defaultValue={c.phone ?? ''} />
              <Field label="LinkedIn" name="linkedin" defaultValue={c.linkedinUrl ?? ''} />
            </div>
            <TextArea label="Notities" name="notities" rows={4} defaultValue={c.notes ?? ''} />
          </ActionForm>
        </section>

        <aside className="space-y-6">
          {(open.deals.length > 0 || open.campagnes.length > 0) && (
            <section className="rounded-xl border-l-4 border-jr-orange bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base">Staat nog als contact bij</h2>
              <p className="mb-3 text-sm text-gray-600">Bij een bedrijf waar {c.firstName ?? c.name} niet meer werkt. Zet deze op de opvolger.</p>
              <ul className="space-y-1 text-sm">
                {open.deals.map((d) => (<li key={d.id}><a href="/beheer/pijplijn" className="text-jr-link hover:underline">Deal: {d.titel}</a> <span className="text-gray-500">· {d.bedrijf}</span></li>))}
                {open.campagnes.map((k) => (<li key={k.id}><a href={`/beheer/campagnes/${k.id}`} className="text-jr-link hover:underline">Campagne: {k.titel}</a> <span className="text-gray-500">· {k.bedrijf}</span></li>))}
              </ul>
            </section>
          )}
          {(organisatie || extra.length > 0) && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base">Gaat weg?</h2>
              <p className="mb-3 text-sm text-gray-600">Werkt {c.firstName ?? c.name} niet meer bij {organisatie?.naam ?? extra[0]!.naam}? Leg het vertrek vast: de login gaat dicht en de geschiedenis blijft bewaard.</p>
              <Paneel knop="Vertrek vastleggen" titel={`${c.name} gaat weg`} stijl="rustig">
                <VertrekFormulier
                  contactId={c.id}
                  voornaam={c.firstName?.trim() || c.name}
                  bijBedrijven={[...(organisatie ? [{ id: organisatie.id, naam: organisatie.naam }] : []), ...extra.map((e) => ({ id: e.organizationId, naam: e.naam }))]}
                  alleBedrijven={bedrijven.map((b) => ({ id: b.id, naam: b.naam }))}
                />
              </Paneel>
            </section>
          )}
          {vorige.length > 0 && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-base">Werkte eerder bij</h2>
              <ul className="space-y-1 text-sm">
                {vorige.map((v) => (
                  <li key={v.organizationId}>
                    <a href={`/beheer/klanten/${v.slug}`} className="text-jr-link hover:underline">{v.naam}</a>
                    <span className="text-gray-500">{v.rol ? ` · ${v.rol}` : ''} · tot {formatDate(v.tot)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Ook bij andere bedrijven</h2>
            <p className="mb-3 text-sm text-gray-600">
              {organisatie ? `Naast ${organisatie.naam}.` : 'Naast waar hij werkt.'} Hij staat dan ook bij de contacten van dat bedrijf.
            </p>
            {extra.length > 0 && (
              <ul className="mb-4 space-y-2 text-sm">
                {extra.map((b) => (
                  <li key={b.organizationId} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <a href={`/beheer/klanten/${b.slug}`} className="text-jr-link hover:underline">{b.naam}</a>
                      {b.rol && <span className="text-gray-500"> · {b.rol}</span>}
                    </span>
                    <ActionForm action={ontkoppelVanBedrijf} submitLabel="Ontkoppelen" submitClassName="!min-h-0 !px-0 !py-0 !bg-transparent text-xs !text-gray-500 hover:!text-[#C02A22]" resetOnSuccess={false} meldGelukt={false} className="">
                      <input type="hidden" name="contactId" value={c.id} />
                      <input type="hidden" name="organizationId" value={b.organizationId} />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={koppelAanBedrijf} submitLabel="Koppelen" submitClassName={KNOP_RUSTIG} className="space-y-3">
              <input type="hidden" name="contactId" value={c.id} />
              <Select
                label="Bedrijf"
                name="organizationId"
                options={[
                  { value: '', label: 'Kies een bedrijf' },
                  ...bedrijven.filter((b) => b.id !== organisatie?.id && !extra.some((e) => e.organizationId === b.id)).map((b) => ({ value: b.id, label: b.naam })),
                ]}
              />
              <Field label="Rol" name="rol" placeholder="Eigenaar, bestuurslid, adviseur" />
            </ActionForm>
          </section>
          {organisatie && (
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-base">Meer over {c.firstName ?? c.name}</h2>
              <p className="mb-3 text-sm text-gray-600">Verjaardag, DISC, drankvoorkeur en of er facturen heen gaan: dat staat op de klantkaart.</p>
              <a href={`/beheer/klanten/${organisatie.slug}`} className={KNOP_RUSTIG}>
                Naar {organisatie.naam}
              </a>
            </section>
          )}
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base">Verwijderen</h2>
            <p className="mb-3 text-sm text-gray-600">Haalt {c.firstName ?? c.name} uit het adresboek{organisatie ? ` en bij ${organisatie.naam} weg` : ''}.</p>
            <ActionForm action={verwijderContact} submitLabel="Verwijderen" submitClassName={KNOP_RUSTIG} resetOnSuccess={false} meldGelukt={false} className="">
              <input type="hidden" name="contactId" value={c.id} />
            </ActionForm>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
