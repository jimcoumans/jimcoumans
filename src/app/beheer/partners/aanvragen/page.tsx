import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listAanvragen, listSjablonen, type AanvraagRij } from '@/lib/partneraanvragen'
import { AanvraagVelden } from '@/components/partners/AanvraagVelden'
import { listKlantenVoorCampagne } from '@/lib/campagnes'
import { AppShell } from '@/components/AppShell'
import { PaginaKop, LeegVlak } from '@/components/PaginaKop'
import { Paneel } from '@/components/Paneel'
import { ActionForm, Check, Field, TextArea } from '@/components/ActionForm'
import { bewerkSjabloon, nieuweAanvraag, nieuwSjabloon } from '../../partneraanvraag-actions'
import { formatEuro } from '@/lib/money'
import { formatDate } from '@/lib/dates'

export const maxDuration = 26

function stand(a: AanvraagRij): { tekst: string; klasse: string } {
  if (a.status === 'geannuleerd') return { tekst: 'Geannuleerd', klasse: 'bg-gray-100 text-gray-600' }
  if (a.status === 'voorstel') return { tekst: `Voorstel ${a.quoteNummer ?? ''}`.trim(), klasse: 'bg-[#E6F7EB] text-[#1D7D3F]' }
  if (a.uitgevraagd === 0) return { tekst: 'Nog niet uitgevraagd', klasse: 'bg-jr-lightblue text-jr-link' }
  if (a.bevestigd > 0) return { tekst: 'Klaar voor voorstel', klasse: 'bg-[#E6F7EB] text-[#1D7D3F]' }
  if (a.beantwoord < a.uitgevraagd) return { tekst: `${a.beantwoord} van ${a.uitgevraagd} antwoorden`, klasse: 'bg-[#FFF3E0] text-[#94590A]' }
  return { tekst: 'Alles beantwoord', klasse: 'bg-[#FFF3E0] text-[#94590A]' }
}

export default async function AanvragenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const [aanvragen, klanten, sjablonen] = await Promise.all([listAanvragen(), listKlantenVoorCampagne(), listSjablonen()])
  const open = aanvragen.filter((a) => a.status === 'open')
  const beheerder = user.role === 'admin'

  const nieuw = (
    <Paneel knop="+ Nieuwe aanvraag" titel="Nieuwe partneraanvraag" uitleg="De vraag gaat letterlijk naar de partners die je uitvraagt. Schrijf hem dus zoals je hem aan een maker zou vertellen.">
      <ActionForm action={nieuweAanvraag} submitLabel="Vergelijk partners">
        <AanvraagVelden klanten={klanten} />
      </ActionForm>
    </Paneel>
  )

  return (
    <AppShell user={user} actief="partneraanvragen">
      <PaginaKop
        titel="Partneraanvragen"
        uitleg="Van vraag naar voorstel: welke partner past, wat kost het, wie kan er. Het werk van de partner gaat één-op-één door naar de klant; ons eigen werk zet je per aanvraag aan of uit."
        acties={
          <>
            <Paneel knop="Standaard werkzaamheden" stijl="rustig" titel="Ons werk bij een partneropdracht" uitleg="Elke nieuwe aanvraag krijgt deze regels. Wat standaard aan staat, staat aangevinkt; per aanvraag zet je het aan of uit." sluitNaOpslaan={false}>
              <ul className="divide-y divide-gray-100">
                {sjablonen.map((s) => (
                  <li key={s.id} className={`py-3 ${s.actief ? '' : 'opacity-50'}`}>
                    <p className="text-sm font-medium">
                      {s.naam}
                      {s.standaardAan && <span className="ml-2 rounded-full bg-jr-lightblue px-2 py-0.5 text-[11px] font-normal text-jr-link">standaard aan</span>}
                    </p>
                    <p className="text-xs text-gray-600">
                      {(s.urenHonderdsten / 100).toLocaleString('nl-NL')} uur × {formatEuro(s.uurtariefCents)} = {formatEuro(Math.round((s.urenHonderdsten * s.uurtariefCents) / 100))}
                    </p>
                    {beheerder && (
                      <details className="mt-1">
                        <summary className="text-jr-link cursor-pointer text-xs font-medium">Wijzig</summary>
                        <ActionForm action={bewerkSjabloon} submitLabel="Opslaan" resetOnSuccess={false} className="mt-2 space-y-3">
                          <input type="hidden" name="id" value={s.id} />
                          <Field label="Naam" name="naam" required defaultValue={s.naam} />
                          <TextArea label="Omschrijving voor de klant" name="omschrijving" rows={2} defaultValue={s.omschrijving ?? ''} />
                          <Field label="Uren" name="uren" required defaultValue={(s.urenHonderdsten / 100).toString().replace('.', ',')} />
                          <Field label="Uurtarief" name="tarief" required defaultValue={(s.uurtariefCents / 100).toFixed(2).replace('.', ',')} />
                          <Check label="Standaard aan" name="standaardAan" defaultChecked={s.standaardAan} />
                          <Check label="Actief" name="actief" defaultChecked={s.actief} />
                        </ActionForm>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
              {beheerder ? (
                <details className="mt-4">
                  <summary className="text-jr-link cursor-pointer text-sm font-medium">Werkzaamheid toevoegen</summary>
                  <ActionForm action={nieuwSjabloon} submitLabel="Toevoegen" className="mt-2 space-y-3">
                    <Field label="Naam" name="naam" required placeholder="Begeleiding op locatie" />
                    <TextArea label="Omschrijving voor de klant" name="omschrijving" rows={2} />
                    <Field label="Uren" name="uren" required placeholder="2" />
                    <Field label="Uurtarief" name="tarief" required placeholder="100,00" />
                    <Check label="Standaard aan" name="standaardAan" />
                  </ActionForm>
                </details>
              ) : (
                <p className="mt-4 text-xs text-gray-500">Alleen een beheerder wijzigt deze regels.</p>
              )}
            </Paneel>
            {nieuw}
          </>
        }
        cijfers={[
          { label: 'Open aanvragen', waarde: open.length },
          { label: 'Wacht op een partner', waarde: open.filter((a) => a.uitgevraagd > 0 && a.beantwoord < a.uitgevraagd).length },
          { label: 'Klaar voor voorstel', waarde: open.filter((a) => a.bevestigd > 0).length, toon: open.some((a) => a.bevestigd > 0) ? 'let-op' : 'normaal' },
        ]}
      />

      {aanvragen.length === 0 ? (
        <LeegVlak
          titel="Nog geen aanvragen"
          tekst="Vraagt een klant om een video, fotoshoot of animatie? Leg de vraag hier vast; het portaal zet de partners met hun prijs naast elkaar. Partners en hun standaardproducten voeg je toe in de aanvraag zelf, of bij Partners."
          actie={nieuw}
        />
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm">
          {aanvragen.map((a) => {
            const s = stand(a)
            return (
              <li key={a.id}>
                <a href={`/beheer/partners/aanvragen/${a.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-gray-100/60">
                  <span className="min-w-0">
                    <span className="block text-sm">{a.titel}</span>
                    <span className="block text-xs text-gray-600">
                      {[a.klant, a.specialisme, a.voorkeursdatum ? formatDate(new Date(`${a.voorkeursdatum}T12:00:00`)) : null, a.door].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${s.klasse}`}>{s.tekst}</span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </AppShell>
  )
}
