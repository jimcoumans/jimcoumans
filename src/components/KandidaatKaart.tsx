import { ActionForm, Field, Select, TextArea } from '@/components/ActionForm'
import {
  KANDIDAAT_STATUS_LABELS,
  BRON_LABELS,
  LOPENDE_STATUSSEN,
  BEWAARDAGEN_STANDAARD,
  BEWAARDAGEN_MET_TOESTEMMING,
  type KandidaatKaart,
} from '@/lib/werving'
import {
  kandidaatBeantwoord,
  kandidaatVervolgstap,
  kandidaatStatus,
  kandidaatBewaartoestemming,
  kandidaatWissen,
} from '@/app/beheer/werving-actions'
import { formatDate } from '@/lib/dates'

/* De kaart van één kandidaat, met wat je ermee doet: antwoorden, een
   vervolgstap zetten, de status, bewaren of wissen. Op de vacaturepagina en
   in de lijst met alle kandidaten, zodat ook een open sollicitatie een plek
   heeft. */

export type Bestand = {
  id: string
  kind: string
  contentType: string
  bytes: number
  filename: string | null
}

export function KandidaatKaartWeergave({
  kaart,
  vacatureId,
  bestanden,
}: {
  kaart: KandidaatKaart
  /** Leeg bij een open sollicitatie. */
  vacatureId: string | null
  bestanden: Bestand[]
}) {
  const k = kaart.kandidaat
  const isLopend = (LOPENDE_STATUSSEN as readonly string[]).includes(k.status)

  return (
    <article className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="font-medium">
            <a href={`/beheer/werving/kandidaten/${k.id}`} className="hover:text-jr-blue">
              {k.name}
            </a>
          </h3>
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

      {(bestanden.length > 0 || k.cvSourceUrl) && (
        <p className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          {bestanden.map((b) => (
            <a
              key={b.id}
              href={`/api/kandidaten/${k.id}/bestand/${b.id}`}
              className="text-jr-blue hover:underline"
            >
              {b.filename ?? b.kind} ({Math.round(b.bytes / 1024)} kB)
            </a>
          ))}
          {bestanden.length === 0 && k.cvSourceUrl && (
            <span className="text-jr-orange">
              Het cv kon niet worden opgehaald; het staat nog op de website.
            </span>
          )}
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
            <input type="hidden" name="vacatureId" value={vacatureId ?? ''} />
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
            <input type="hidden" name="vacatureId" value={vacatureId ?? ''} />
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
          <input type="hidden" name="vacatureId" value={vacatureId ?? ''} />
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
            <input type="hidden" name="vacatureId" value={vacatureId ?? ''} />
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
          <input type="hidden" name="vacatureId" value={vacatureId ?? ''} />
        </ActionForm>
        <a
          href={`/beheer/werving/kandidaten/${k.id}`}
          className="text-jr-link ml-auto inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium hover:underline"
        >
          Profiel, notities en contract &rarr;
        </a>
      </div>
    </article>
  )
}
