import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listCampagnes, listKlantenVoorCampagne, STATUS_LABELS, STATUS_STIJL } from '@/lib/campagnes'
import { AppShell } from '@/components/AppShell'
import { Paneel } from '@/components/Paneel'
import { PaginaKop, LeegVlak } from '@/components/PaginaKop'
import { ActionForm, Field, Select } from '@/components/ActionForm'
import { nieuweCampagne } from '../campagne-actions'
import { formatDate } from '@/lib/dates'
import type { Campaign } from '@/db/schema'

export const maxDuration = 26

/* Eerst wat aandacht vraagt: wat bij de klant ligt, dan wat nog af moet. */
const GROEPEN: { status: Campaign['status']; uitleg: string }[] = [
  { status: 'voorstel', uitleg: 'Liggen bij de klant voor akkoord.' },
  { status: 'concept', uitleg: 'Nog in te vullen.' },
  { status: 'akkoord', uitleg: 'Akkoord: het team is aan de slag.' },
  { status: 'afgerond', uitleg: 'Klaar, als historie op de klantkaart.' },
]

export default async function CampagnesPage({ searchParams }: { searchParams: Promise<{ klant?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { klant } = await searchParams
  const [alle, klanten] = await Promise.all([listCampagnes(), listKlantenVoorCampagne()])

  const nieuw = (stijl: 'primair' | 'rustig', metStart = true) => (
    <Paneel
      knop="+ Nieuwe campagne"
      titel="Nieuwe campagne"
      uitleg="De marketingmanager, de vaste contactpersoon en de specialisten komen van de klantkaart."
      stijl={stijl}
      startOpen={metStart && !!klant}
    >
      <ActionForm action={nieuweCampagne} submitLabel="Maak de briefing" className="grid gap-4">
        <Select
          label="Klant"
          name="organizationId"
          defaultValue={klant ?? ''}
          options={[{ value: '', label: 'Kies de klant' }, ...klanten.map((k) => ({ value: k.id, label: k.name }))]}
        />
        <Field label="Campagnenaam" name="title" required placeholder="Kerst bij Thiessen" />
      </ActionForm>
    </Paneel>
  )

  return (
    <AppShell user={user} actief="campagnes">
      <PaginaKop
        titel="Campagnes"
        uitleg="Elke campagne begint met een briefing. Die gaat als voorstel naar de klant; na akkoord staat de tijdlijn als taken in ClickUp."
        acties={nieuw('primair')}
        cijfers={GROEPEN.map(({ status }) => ({
          label: STATUS_LABELS[status],
          waarde: alle.filter((r) => r.campagne.status === status).length,
          toon: status === 'voorstel' && alle.some((r) => r.campagne.status === 'voorstel') ? ('let-op' as const) : ('normaal' as const),
        }))}
      />

      <div>
        <div className="space-y-8">
          {alle.length === 0 && (
            <LeegVlak
              titel="Nog geen campagnes"
              tekst="Een campagne begint met een briefing: doel, aanbod, doelgroep, kanalen en een hypothese. Kies de klant en geef hem een naam."
              actie={nieuw('primair', false)}
            />
          )}
          {GROEPEN.map(({ status, uitleg }) => {
            const rijen = alle.filter((r) => r.campagne.status === status)
            if (rijen.length === 0) return null
            return (
              <section key={status}>
                <h2 className="mb-0.5 text-base">{STATUS_LABELS[status]}</h2>
                <p className="mb-2 text-xs text-gray-600">{uitleg}</p>
                <ul className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm">
                  {rijen.map(({ campagne: c, klant, marketingmanager }) => (
                    <li key={c.id}>
                      <a href={`/beheer/campagnes/${c.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-gray-100/60">
                        <span className="min-w-0">
                          <span className="block text-sm">{c.title}</span>
                          <span className="block text-xs text-gray-600">
                            {[klant, marketingmanager, c.startOn && c.endOn ? `${formatDate(c.startOn)} – ${formatDate(c.endOn)}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          {c.version > 0 && <span className="text-xs text-gray-500">versie {c.version}.0</span>}
                          <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_STIJL[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

      </div>
    </AppShell>
  )
}
