import { ActionForm, Check, Field, Select, TextArea, Uitklap } from '@/components/ActionForm'
import { BRANCHES } from '@/lib/crm'
import { EENHEDEN, EENHEID_LABELS, SPECIALISMEN, isVerlopenVandaag } from '@/lib/partneraanvragen'
import { bewaarPartnerProfiel, bewerkPakket, nieuwPakket, wisPakket } from '@/app/beheer/partneraanvraag-actions'
import { formatEuro } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import type { Partner, PartnerPakket } from '@/db/schema'

/* -------------------------------------------------------------------------
   Het matchprofiel en de standaardproducten (vaste prijzen) van één partner. Hiermee komt een
   aanvraag bij de juiste partner, met de juiste prijs.
   ------------------------------------------------------------------------- */

const SPECIALISME_OPTIES = SPECIALISMEN.map((s) => ({ value: s, label: s }))
const EENHEID_OPTIES = EENHEDEN.map((e) => ({ value: e, label: EENHEID_LABELS[e] }))
const vakje = 'accent-jr-blue h-[18px] w-[18px]'

function PakketVelden({ partner, pakket }: { partner: Pick<Partner, 'id' | 'specialismen'>; pakket?: PartnerPakket }) {
  const opties = partner.specialismen.length > 0 ? SPECIALISME_OPTIES.filter((o) => partner.specialismen.includes(o.value) || o.value === pakket?.specialisme) : SPECIALISME_OPTIES
  return (
    <>
      <input type="hidden" name="partnerId" value={partner.id} />
      {pakket && <input type="hidden" name="id" value={pakket.id} />}
      <Select label="Specialisme" name="specialisme" options={opties} defaultValue={pakket?.specialisme ?? opties[0]?.value} />
      <Field label="Naam" name="naam" required defaultValue={pakket?.naam} placeholder="Halve draaidag + montage in 3 formaten" />
      <TextArea label="Wat zit erin" name="omschrijving" rows={3} defaultValue={pakket?.omschrijving ?? ''} placeholder="4 uur op locatie, 1 video van 30 sec in 9:16, 4:5 en 1:1, één correctieronde, reiskosten tot 30 km." />
      <Field label="Prijs, exclusief btw" name="prijs" required defaultValue={pakket ? (pakket.prijsCents / 100).toFixed(2).replace('.', ',') : ''} placeholder="950,00" />
      <Select label="Eenheid" name="eenheid" options={EENHEID_OPTIES} defaultValue={pakket?.eenheid ?? 'opdracht'} />
      <Field label="Geldig tot" name="geldigTot" type="date" defaultValue={pakket?.geldigTot ?? ''} hint="Leeg: geen einddatum. Het portaal waarschuwt als je met een verlopen prijs rekent." />
    </>
  )
}

export function PartnerProfiel({ partner, pakketten }: { partner: Partner; pakketten: PartnerPakket[] }) {
  const extraBranches = partner.branches.filter((b) => !(BRANCHES as readonly string[]).includes(b))
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 text-[15px] font-semibold">Matchprofiel</h3>
        <p className="mb-3 text-xs text-gray-600">Waarmee een aanvraag bij deze partner terechtkomt. Ervaring en beoordelingen komen er vanzelf bij, uit de opdrachten via het portaal.</p>
        <ActionForm action={bewaarPartnerProfiel} submitLabel="Opslaan" resetOnSuccess={false}>
          <input type="hidden" name="partnerId" value={partner.id} />
          <fieldset>
            <legend className="text-jr-text mb-1.5 text-[13px] font-medium">Wat maakt deze partner</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {SPECIALISMEN.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="specialismen" value={s} defaultChecked={partner.specialismen.includes(s)} className={vakje} />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-jr-text mb-1.5 text-[13px] font-medium">Werkt graag en goed voor</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {BRANCHES.map((b) => (
                <label key={b} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="branches" value={b} defaultChecked={partner.branches.includes(b)} className={vakje} />
                  {b}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Andere branches" name="brancheExtra" defaultValue={extraBranches.join(', ')} placeholder="Wijn, Evenementen" hint="Gescheiden door komma’s." />
          <Field label="Werkgebied en reiskosten" name="werkgebied" defaultValue={partner.werkgebied ?? ''} placeholder="Zuid-Limburg; daarbuiten € 0,23 per km" />
          <TextArea label="Waarom kies je deze partner" name="sterktes" rows={3} defaultValue={partner.sterktes ?? ''} placeholder="Rustige, cinematografische stijl. Eigen drone met certificaat. Snel met montage." />
        </ActionForm>
      </section>

      <section>
        <h3 className="mb-1 text-[15px] font-semibold">Standaardproducten en vaste prijzen</h3>
        <p className="mb-3 text-xs text-gray-600">Wat je bij deze partner afneemt, met de afgesproken prijs: een pakket of een los tarief. Een aanvraag rekent met het goedkoopste product dat nog geldig is; per aanvraag kun je een ander kiezen.</p>
        {pakketten.length === 0 ? (
          <p className="text-sm text-gray-500">Nog geen standaardproducten.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pakketten.map((p) => {
              const verlopen = isVerlopenVandaag(p)
              return (
                <li key={p.id} className={`py-3 ${p.actief ? '' : 'opacity-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">{p.naam}</p>
                      <p className="text-xs text-gray-500">
                        {p.specialisme}
                        {p.geldigTot && (
                          <span className={verlopen ? 'text-[#C02A22]' : ''}> · {verlopen ? 'verlopen sinds' : 'geldig tot'} {formatDate(new Date(`${p.geldigTot}T12:00:00`))}</span>
                        )}
                        {!p.actief && ' · uit'}
                      </p>
                      {p.omschrijving && <p className="mt-1 text-gray-700">{p.omschrijving}</p>}
                    </div>
                    <p className="tabular shrink-0 text-right text-sm">
                      {formatEuro(p.prijsCents)}
                      <span className="block text-xs text-gray-500">{EENHEID_LABELS[p.eenheid as keyof typeof EENHEID_LABELS] ?? ''}</span>
                    </p>
                  </div>
                  <Uitklap label="Wijzig" inline className="mt-1">
                    <ActionForm action={bewerkPakket} submitLabel="Opslaan" resetOnSuccess={false}>
                      <PakketVelden partner={partner} pakket={p} />
                      <Check label="Actief: telt mee in aanvragen" name="actief" defaultChecked={p.actief} />
                    </ActionForm>
                    <ActionForm action={wisPakket} submitLabel="Verwijder" submitClassName="text-gray-500 hover:bg-gray-100 !px-2 !py-1 !text-xs" resetOnSuccess={false} meldGelukt={false} className="mt-2">
                      <input type="hidden" name="id" value={p.id} />
                    </ActionForm>
                  </Uitklap>
                </li>
              )
            })}
          </ul>
        )}
        <Uitklap label="+ Standaardproduct toevoegen" inline className="mt-3">
          <ActionForm action={nieuwPakket} submitLabel="Toevoegen">
            <PakketVelden partner={partner} />
          </ActionForm>
        </Uitklap>
      </section>
    </div>
  )
}
