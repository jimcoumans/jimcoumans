import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { listCampagnes, listKlantenVoorCampagne, STATUS_LABELS, STATUS_STIJL } from '@/lib/campagnes'
import { AppShell } from '@/components/AppShell'
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

  return (
    <AppShell user={user} actief="campagnes">
      <h1 className="mb-1 text-[28px] sm:text-[32px]">Campagnes</h1>
      <p className="mb-6 text-sm text-gray-600">
        Elke campagne begint met een briefing. Die gaat als voorstel naar de klant; na akkoord staat de
        tijdlijn als taken in ClickUp.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div className="space-y-8">
          {alle.length === 0 && (
            <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
              Nog geen campagnes. Begin er een met het formulier hiernaast.
            </p>
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

        <aside>
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base">Nieuwe campagne</h2>
            <ActionForm action={nieuweCampagne} submitLabel="Maak de briefing">
              <Select
                label="Klant"
                name="organizationId"
                defaultValue={klant ?? ''}
                options={[{ value: '', label: 'Kies de klant' }, ...klanten.map((k) => ({ value: k.id, label: k.name }))]}
              />
              <Field label="Campagnenaam" name="title" required placeholder="Kerst bij Thiessen" />
              <p className="text-xs text-gray-500">
                De marketingmanager en de vaste contactpersoon komen van de klantkaart.
              </p>
            </ActionForm>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
