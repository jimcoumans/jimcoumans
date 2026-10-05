import { ActionForm, Field, Select, TextArea } from './ActionForm'
import { Paneel } from './Paneel'
import { Menu } from './Menu'
import { nieuweNotitie, wisNotitie } from '@/app/beheer/tijdlijn-actions'
import { formatCents, formatSignedCents } from '@/lib/money'
import { formatDate, formatDateInput, formatRelative } from '@/lib/dates'
import type { TijdlijnItem } from '@/lib/tijdlijn'
import type { Contact } from '@/db/schema'

/* -------------------------------------------------------------------------
   De tijdlijn van een klant.

   Wat je met de hand vastlegt staat door elkaar met wat het systeem al weet:
   offertes, facturen, boekingen. Die worden bij het TONEN samengevoegd en
   niet als extra regel weggeschreven — anders heb je twee waarheden die uit
   elkaar kunnen lopen.

   Alleen wat met de hand is vastgelegd kun je weghalen. Een factuur haal je
   niet van de tijdlijn af; die bestaat.
   ------------------------------------------------------------------------- */

const SOORT_LABELS = {
  note: 'Notitie',
  call: 'Gebeld',
  meeting: 'Afspraak',
  email: 'Mail',
  task: 'Actie',
} as const

/* Een icoon per soort in plaats van een label als "Boeking" of "Factuur":
   je ziet in één oogopslag wat het is, en de titel zegt de rest. */
const ICOON: Record<string, { pad: string; kleur: string }> = {
  call: { pad: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z', kleur: 'bg-[#E3F2FD] text-jr-link' },
  meeting: { pad: 'M4 7h16v13H4zM4 11h16M8 4v4M16 4v4', kleur: 'bg-[#E3F2FD] text-jr-link' },
  email: { pad: 'M4 6h16v12H4zM4 7l8 6 8-6', kleur: 'bg-[#E3F2FD] text-jr-link' },
  note: { pad: 'M6 4h9l3 3v13H6zM9 10h6M9 14h6', kleur: 'bg-[#E3F2FD] text-jr-link' },
  task: { pad: 'M5 12l4 4 10-10', kleur: 'bg-[#E3F2FD] text-jr-link' },
  quote: { pad: 'M6 4h9l3 3v13H6zM9 12h6M9 16h4', kleur: 'bg-[#F3E8FA] text-[#7E2FB0]' },
  invoice: { pad: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6', kleur: 'bg-gray-100 text-gray-600' },
  booking: { pad: 'M6 12h12', kleur: 'bg-[#FFF4E0] text-[#94590A]' },
  topup: { pad: 'M12 6v12M6 12h12', kleur: 'bg-[#E6F7EB] text-[#1D7D3F]' },
}

function Icoon({ item }: { item: TijdlijnItem }) {
  const i = ICOON[item.bron === 'activity' ? (item.kind ?? 'note') : item.bron] ?? ICOON.note!
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${i.kleur}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={i.pad} />
      </svg>
    </span>
  )
}

export function Tijdlijn({
  organizationId,
  slug,
  items,
  contacten,
  laatsteContactOp,
  kort,
  meerHref,
}: {
  organizationId: string
  slug: string
  items: TijdlijnItem[]
  contacten: Contact[]
  laatsteContactOp: Date | null
  /** Hoeveel regels je ziet; de rest achter "Alles tonen". */
  kort?: number
  meerHref?: string
}) {
  const zichtbaar = kort ? items.slice(0, kort) : items
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-[22px]">Tijdlijn</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {laatsteContactOp ? `Laatste contact ${formatRelative(laatsteContactOp)}` : 'Nog geen contact vastgelegd'}
          </p>
        </div>
        <Paneel knop="+ Moment" stijl="rustig" titel="Moment vastleggen" uitleg="Een telefoontje, afspraak of mail, zodat iedereen ziet wat er met deze klant speelt.">
          <ActionForm action={nieuweNotitie} submitLabel="Vastleggen" className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="slug" value={slug} />
            <Select
              label="Wat was het"
              name="soort"
              defaultValue="call"
              options={Object.entries(SOORT_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Field label="Wanneer" name="datum" type="date" defaultValue={formatDateInput(new Date())} />
            <div className="sm:col-span-2">
              <Field label="Kort" name="titel" required placeholder="Gebeld over de campagne" />
            </div>
            <Select
              label="Met wie"
              name="contact"
              defaultValue=""
              options={[
                { value: '', label: 'Niet bij een persoon' },
                ...contacten.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <div className="sm:col-span-2">
              <TextArea label="Wat is er besproken" name="tekst" rows={3} />
            </div>
          </ActionForm>
        </Paneel>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Nog niets gebeurd. Zodra je factureert, een offerte stuurt of een moment
            vastlegt, staat het hier.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-150 rounded-xl bg-white shadow-sm">
          {zichtbaar.map((item) => {
            // Boekingen met teken, zodat afschrijven en bijschrijven niet
            // op elkaar lijken; een factuur of offerte is gewoon een bedrag.
            const geld = item.bron === 'booking' || item.bron === 'topup'
            return (
              <li key={`${item.bron}-${item.id}`} className="flex items-start gap-3 py-3.5 pr-3 pl-5">
                <Icoon item={item} />
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px]">
                    {item.href ? (
                      <a href={item.href} className="hover:text-jr-link">
                        {item.titel}
                      </a>
                    ) : (
                      item.titel
                    )}
                  </p>
                  <p className="mt-0.5 text-[13px] text-gray-600">
                    {[
                      item.bron === 'activity' && item.kind ? SOORT_LABELS[item.kind] : null,
                      formatDate(item.wanneer),
                      item.metWie ? `met ${item.metWie}` : null,
                      item.wie,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {item.toelichting && <p className="mt-1 text-sm whitespace-pre-line text-gray-700">{item.toelichting}</p>}
                </div>

                {item.bedragCents !== null && (
                  <span className={`tabular shrink-0 text-[15px] sm:pt-px ${geld && item.bedragCents > 0 ? 'text-[#1D7D3F]' : ''}`}>
                    {geld ? formatSignedCents(item.bedragCents) : formatCents(item.bedragCents)}
                  </span>
                )}
                </div>
                <div className="w-8 shrink-0">
                  {/* Alleen wat met de hand is vastgelegd kun je weghalen. */}
                  {item.bron === 'activity' && (
                    <Menu>
                      <ActionForm
                        action={wisNotitie}
                        submitLabel="Verwijderen"
                        submitClassName="!min-h-0 w-full !rounded-lg !px-3 !py-2 text-left !font-normal text-[#C02A22] hover:bg-[#FDECEA]"
                        resetOnSuccess={false}
                        meldGelukt={false}
                        className=""
                      >
                        <input type="hidden" name="activityId" value={item.id} />
                        <input type="hidden" name="slug" value={slug} />
                      </ActionForm>
                    </Menu>
                  )}
                </div>
              </li>
            )
          })}
          {meerHref && items.length > zichtbaar.length && (
            <li className="px-5 py-3">
              <a href={meerHref} className="text-jr-link text-sm hover:underline">
                Alles tonen
              </a>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
