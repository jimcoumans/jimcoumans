import { listFormulieren, SOORT_LABEL, SOORT_CODE, type Soort } from '@/lib/formulieren'
import { KLEUR_LABEL, type Kleur } from '@/lib/formulieren/vragenlijst'
import { ActionForm } from '@/components/ActionForm'
import { nieuwFormulier } from '@/app/beheer/formulier-actions'
import { formatDateLong } from '@/lib/dates'
import { KLEUR_STIJL } from './stijl'

/* -------------------------------------------------------------------------
   Het dossier van een klant: alle formulieren uit de verkoopfase, in de
   volgorde van de klantreis. Afronden vinkt de klantreis af; zo zie je
   bovenaan de klantkaart in welke stap de klant zit.
   ------------------------------------------------------------------------- */

const STAPPEN: { soort: Soort; wanneer: string }[] = [
  { soort: 'vragenlijst', wanneer: 'Stap 01. De klant vult hem zelf in via een link, of je loopt hem aan de telefoon samen door.' },
  { soort: 'quickscan', wanneer: 'Stap 02. Zodra het intakegesprek geboekt is; klaar een werkdag ervoor. Daaruit komt het scanrapport.' },
  { soort: 'intake', wanneer: 'Stap 03. Tijdens het intakegesprek; daarna alles op de klantkaart.' },
]

const STATUS: Record<string, string> = { open: 'Open', ingevuld: 'Afgerond', vrijgegeven: 'Rapport vrijgegeven' }

export async function FormulierenTab({ organizationId }: { organizationId: string }) {
  const rijen = await listFormulieren(organizationId)
  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
        <h2 className="text-[22px]">Formulieren</h2>
        <p className="mt-1 mb-5 max-w-2xl text-sm text-gray-600">
          Alles wat we in de verkoopfase vragen en vastleggen, in het dossier van de klant. Een nieuw formulier hangt aan de open deal.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {STAPPEN.map((s) => (
            <div key={s.soort} className="flex flex-col justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-xs text-gray-500">{SOORT_CODE[s.soort]}</p>
                <p className="font-semibold">{SOORT_LABEL[s.soort]}</p>
                <p className="mt-1 text-sm text-gray-600">{s.wanneer}</p>
              </div>
              <ActionForm action={nieuwFormulier} submitLabel="Start" resetOnSuccess={false} meldGelukt={false} className="mt-3">
                <input type="hidden" name="organizationId" value={organizationId} />
                <input type="hidden" name="soort" value={s.soort} />
              </ActionForm>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm lg:p-8">
        <h2 className="mb-3 text-base">In het dossier</h2>
        {rijen.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen formulieren.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {rijen.map(({ formulier: f, dealTitel }) => (
              <li key={f.id}>
                <a href={`/beheer/formulieren/${f.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-gray-50">
                  <span>
                    <span className="font-medium">{SOORT_LABEL[f.soort]}</span>
                    <span className="block text-xs text-gray-600">
                      {SOORT_CODE[f.soort]} · {formatDateLong(f.ingevuldOp ?? f.createdAt)}
                      {f.ingevuldDoorKlant && ' · ingevuld door de klant'}
                      {dealTitel && ` · deal: ${dealTitel}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {f.uitkomst && <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${KLEUR_STIJL[f.uitkomst as Kleur]}`}>{KLEUR_LABEL[f.uitkomst as Kleur]}</span>}
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">{STATUS[f.status]}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
