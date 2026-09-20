import { redirect, notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { ActionForm, Field, Select, TextArea } from '@/components/ActionForm'
import {
  getVacature,
  VACATURE_SOORT_LABELS,
  VACATURE_STATUS_LABELS,
  KANDIDAAT_STATUS_LABELS,
  BRON_LABELS,
  LOPENDE_STATUSSEN,
  BEWAARDAGEN_STANDAARD,
  BEWAARDAGEN_MET_TOESTEMMING,
  type KandidaatKaart,
} from '@/lib/werving'
import { getHuis, berekenBeloning } from '@/lib/salarishuis'
import {
  vacatureStatus,
  kandidaatBeantwoord,
  kandidaatVervolgstap,
  kandidaatStatus,
  kandidaatBewaartoestemming,
  kandidaatWissen,
} from '../../werving-actions'
import { formatDate } from '@/lib/dates'
import { formatCents } from '@/lib/money'

export const maxDuration = 26

/**
 * Eén vacature met haar kandidaten.
 *
 * Geen bord met kolommen. Een kandidaat verplaatsen kost hier een
 * netwerkronde naar Frankfurt, en bij tien kandidaten is een lijst met een
 * keuzelijst per rij sneller te overzien dan vier halflege kolommen.
 *
 * Op elke kaart staat hoe lang iemand wacht en tot wanneer we zijn gegevens
 * mogen bewaren. Dat tweede staat er zichtbaar en niet weggestopt: wil je
 * iemand houden voor een volgende ronde, dan moet je dat weten voordat de
 * termijn om is.
 */
export default async function VacaturePagina({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const { id } = await params
  const detail = await getVacature(id)
  if (!detail) notFound()

  const { vacature, eigenaar, kandidaten } = detail
  const lopend = kandidaten.filter((k) =>
    (LOPENDE_STATUSSEN as readonly string[]).includes(k.kandidaat.status),
  )
  const afgerond = kandidaten.filter(
    (k) => !(LOPENDE_STATUSSEN as readonly string[]).includes(k.kandidaat.status),
  )

  /* Wat deze vacature betaalt, uit het salarishuis. Alleen voor beheerders:
     de rest van het team hoeft geen salarissen te zien. */
  let bereik: { van: string; tot: string } | null = null
  if (user.role === 'admin' && vacature.salaryScaleName) {
    const huis = await getHuis()
    if (huis) {
      const uren = vacature.hoursPerWeekQuarters ?? huis.huis.fulltimeHoursWeekQuarters
      try {
        const van = berekenBeloning(huis, vacature.salaryScaleName, vacature.salaryStepMin ?? 1, uren)
        const tot = berekenBeloning(
          huis,
          vacature.salaryScaleName,
          vacature.salaryStepMax ?? vacature.salaryStepMin ?? 1,
          uren,
        )
        bereik = {
          van: formatCents(van.maandCents),
          tot: formatCents(tot.maandCents),
        }
      } catch {
        // Schaal bestaat niet meer in het huidige huis. Dan geen bereik
        // tonen in plaats van de pagina laten omvallen.
        bereik = null
      }
    }
  }

  return (
    <AppShell user={user} actief="werving" breed>
      <a href="/beheer/werving" className="hover:text-jr-blue mb-3 block text-xs text-gray-500">
        &larr; Werving
      </a>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-jr-blue text-2xl">{vacature.title}</h1>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">
              {VACATURE_SOORT_LABELS[vacature.kind]}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                vacature.status === 'open'
                  ? 'bg-jr-lightblue text-jr-deepblue'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {VACATURE_STATUS_LABELS[vacature.status]}
            </span>
            <span className="text-xs">
              {vacature.positions} {vacature.positions === 1 ? 'plek' : 'plekken'}
              {eigenaar && ` · ${eigenaar}`}
              {vacature.hoursPerWeekQuarters &&
                ` · ${vacature.hoursPerWeekQuarters / 100} uur`}
              {vacature.openedOn && ` · open sinds ${formatDate(vacature.openedOn)}`}
            </span>
          </p>
        </div>

        <ActionForm action={vacatureStatus} submitLabel="Opslaan" className="flex items-end gap-2">
          <input type="hidden" name="vacatureId" value={vacature.id} />
          <Select
            label="Status"
            name="status"
            defaultValue={vacature.status}
            options={Object.entries(VACATURE_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </ActionForm>
      </div>

      {(vacature.reason || vacature.description || bereik || vacature.salaryScaleName) && (
        <section className="mb-5 rounded-xl bg-white p-5 shadow-sm">
          {vacature.salaryScaleName && (
            <p className="mb-2 text-sm">
              <span className="text-gray-600">Schaal </span>
              <strong>{vacature.salaryScaleName}</strong>
              {vacature.salaryStepMin && (
                <span className="text-gray-600">
                  , trede {vacature.salaryStepMin}
                  {vacature.salaryStepMax && vacature.salaryStepMax !== vacature.salaryStepMin
                    ? ` tot ${vacature.salaryStepMax}`
                    : ''}
                </span>
              )}
              {bereik && (
                <span className="text-gray-600">
                  {' '}
                  &mdash; {bereik.van}
                  {bereik.tot !== bereik.van && ` tot ${bereik.tot}`} bruto per maand
                </span>
              )}
            </p>
          )}
          {vacature.reason && (
            <p className="mb-2 text-sm">
              <span className="text-gray-600">Waarom: </span>
              {vacature.reason}
            </p>
          )}
          {vacature.description && (
            <p className="text-sm whitespace-pre-wrap text-gray-700">{vacature.description}</p>
          )}
        </section>
      )}

      <section className="mb-5">
        <h2 className="mb-3 text-base">
          In procedure ({lopend.length})
        </h2>
        {lopend.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
            Nog geen kandidaten in procedure. Voeg er een toe op het wervingsoverzicht.
          </div>
        ) : (
          <div className="space-y-3">
            {lopend.map((k) => (
              <Kaart key={k.kandidaat.id} kaart={k} vacatureId={vacature.id} />
            ))}
          </div>
        )}
      </section>

      {afgerond.length > 0 && (
        <section>
          <h2 className="mb-1 text-base">Afgerond ({afgerond.length})</h2>
          <p className="mb-3 text-xs text-gray-600">
            Deze gegevens worden {BEWAARDAGEN_STANDAARD} dagen na afloop automatisch gewist,
            of na {BEWAARDAGEN_MET_TOESTEMMING} dagen als de kandidaat daar toestemming voor
            gaf.
          </p>
          <div className="space-y-3">
            {afgerond.map((k) => (
              <Kaart key={k.kandidaat.id} kaart={k} vacatureId={vacature.id} />
            ))}
          </div>
        </section>
      )}
    </AppShell>
  )
}

function Kaart({ kaart, vacatureId }: { kaart: KandidaatKaart; vacatureId: string }) {
  const k = kaart.kandidaat
  const isLopend = (LOPENDE_STATUSSEN as readonly string[]).includes(k.status)

  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="font-medium">{k.name}</h3>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5">
              {KANDIDAAT_STATUS_LABELS[k.status]}
            </span>
            <span>{BRON_LABELS[k.source]}</span>
            {kaart.doorverwezenDoor && <span>via {kaart.doorverwezenDoor}</span>}
            <span>gesolliciteerd {formatDate(k.appliedOn)}</span>
            {k.school && <span>{k.school}</span>}
            {k.study && <span>{k.study}</span>}
          </p>
          {(k.email || k.phone || k.linkedinUrl) && (
            <p className="mt-1 flex flex-wrap gap-3 text-xs">
              {k.email && (
                <a href={`mailto:${k.email}`} className="hover:text-jr-blue text-gray-600">
                  {k.email}
                </a>
              )}
              {k.phone && (
                <a
                  href={`tel:${k.phone.replace(/\s/g, '')}`}
                  className="hover:text-jr-blue text-gray-600"
                >
                  {k.phone}
                </a>
              )}
              {k.linkedinUrl && (
                <a
                  href={k.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-jr-blue text-gray-600"
                >
                  LinkedIn
                </a>
              )}
            </p>
          )}
        </div>

        <div className="text-right text-xs">
          {kaart.wachtDagen !== null ? (
            <p className={kaart.wachtDagen >= 3 ? 'text-jr-orange font-bold' : 'text-gray-500'}>
              wacht {kaart.wachtDagen} {kaart.wachtDagen === 1 ? 'dag' : 'dagen'} op antwoord
            </p>
          ) : (
            k.respondedOn && (
              <p className="text-gray-500">gereageerd op {formatDate(k.respondedOn)}</p>
            )
          )}
          {kaart.bewaarTot && (
            <p
              className={
                (kaart.bewaarDagenResterend ?? 0) <= 7 ? 'text-jr-orange' : 'text-gray-500'
              }
            >
              wordt gewist op {formatDate(kaart.bewaarTot)}
            </p>
          )}
          {k.closedReason && <p className="text-gray-500">{k.closedReason}</p>}
        </div>
      </div>

      {k.notes && (
        <p className="mb-3 rounded-lg bg-gray-50 p-2.5 text-xs whitespace-pre-wrap text-gray-700">
          {k.notes}
        </p>
      )}

      {isLopend && (
        <p className="mb-3 text-xs text-gray-600">
          {k.nextActionOn ? (
            <>
              Volgende stap: <strong>{k.nextAction}</strong> op {formatDate(k.nextActionOn)}
              {kaart.looptAchter && (
                <span className="text-jr-orange"> &mdash; die datum is voorbij</span>
              )}
            </>
          ) : (
            <span className="text-jr-orange">Geen vervolgstap afgesproken.</span>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
        {k.respondedOn === null && isLopend && (
          <ActionForm
            action={kandidaatBeantwoord}
            submitLabel="Gereageerd"
            submitClassName="bg-jr-btn hover:bg-jr-btnhover text-white"
          >
            <input type="hidden" name="kandidaatId" value={k.id} />
            <input type="hidden" name="vacatureId" value={vacatureId} />
          </ActionForm>
        )}

        {isLopend && (
          <ActionForm
            action={kandidaatVervolgstap}
            submitLabel="Vastleggen"
            submitClassName="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="kandidaatId" value={k.id} />
            <input type="hidden" name="vacatureId" value={vacatureId} />
            <Field label="Volgende stap" name="actie" defaultValue={k.nextAction ?? ''} />
            <Field label="Wanneer" name="actiedatum" type="date" />
          </ActionForm>
        )}

        <ActionForm
          action={kandidaatStatus}
          submitLabel="Opslaan"
          submitClassName="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="kandidaatId" value={k.id} />
          <input type="hidden" name="vacatureId" value={vacatureId} />
          <Select
            label="Status"
            name="status"
            defaultValue={k.status}
            options={Object.entries(KANDIDAAT_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Field
            label="Reden"
            name="reden"
            defaultValue={k.closedReason ?? ''}
            hint="Verplicht bij afwijzen."
          />
        </ActionForm>

        {kaart.bewaarTot && (
          <ActionForm
            action={kandidaatBewaartoestemming}
            submitLabel={k.retentionConsentOn ? 'Toestemming intrekken' : 'Langer bewaren'}
            submitClassName="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <input type="hidden" name="kandidaatId" value={k.id} />
            <input type="hidden" name="vacatureId" value={vacatureId} />
            <input
              type="hidden"
              name="gegeven"
              value={k.retentionConsentOn ? 'nee' : 'ja'}
            />
          </ActionForm>
        )}

        <ActionForm
          action={kandidaatWissen}
          submitLabel="Nu wissen"
          submitClassName="bg-white border border-gray-300 text-gray-500 hover:bg-gray-50"
        >
          <input type="hidden" name="kandidaatId" value={k.id} />
          <input type="hidden" name="vacatureId" value={vacatureId} />
        </ActionForm>
      </div>
    </article>
  )
}
