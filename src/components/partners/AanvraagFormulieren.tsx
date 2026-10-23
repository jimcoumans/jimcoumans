import { Field, Select, TextArea } from '@/components/ActionForm'
import { partnerTypeLabels } from '@/lib/crm'
import { EENHEDEN, EENHEID_LABELS, SPECIALISMEN, indicatieVoor } from '@/lib/partneraanvragen'
import { formatEuro } from '@/lib/money'
import type { PartnerAanvraag, PartnerPakket, PartnerUitvraag } from '@/db/schema'

/* -------------------------------------------------------------------------
   Formulieren op het aanvraagscherm: een partner toevoegen, en de offerte
   van een partner vastleggen. Zo hoef je de aanvraag niet te verlaten.
   ------------------------------------------------------------------------- */

const vakje = 'accent-jr-blue h-[18px] w-[18px]'
const euro = (cents: number | null | undefined) => (cents ? (cents / 100).toFixed(2).replace('.', ',') : '')

export function NieuwePartnerVelden({ aanvraag }: { aanvraag: Pick<PartnerAanvraag, 'id' | 'specialisme'> }) {
  return (
    <>
      <input type="hidden" name="aanvraagId" value={aanvraag.id} />
      <Field label="Naam" name="naam" required placeholder="Studio Lens" />
      <Select
        label="Soort"
        name="type"
        defaultValue={aanvraag.specialisme === 'Fotografie' ? 'photographer' : aanvraag.specialisme === 'Animatie' ? 'animator' : 'videographer'}
        options={Object.entries(partnerTypeLabels).map(([value, label]) => ({ value, label }))}
      />
      <Field label="Contactpersoon" name="contactpersoon" placeholder="Tom Lens" />
      <Field label="E-mailadres" name="email" type="email" placeholder="tom@studiolens.nl" hint="Nodig om de partner een uitvraag te sturen." />
      <Field label="Telefoon" name="telefoon" />
      <fieldset>
        <legend className="text-jr-text mb-1.5 text-[13px] font-medium">Wat maakt deze partner</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {SPECIALISMEN.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="specialismen" value={s} defaultChecked={s === aanvraag.specialisme} className={vakje} />
              {s}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-3 text-[13px] font-medium">Eerste standaardproduct (als je de prijs al weet)</p>
        <div className="space-y-3">
          <Field label="Naam" name="productNaam" placeholder="Halve draaidag + montage in 3 formaten" />
          <Field label="Prijs, exclusief btw" name="productPrijs" placeholder="950,00" />
          <Select label="Eenheid" name="productEenheid" options={EENHEDEN.map((e) => ({ value: e, label: EENHEID_LABELS[e] }))} defaultValue="opdracht" />
          <TextArea label="Wat zit erin" name="productOmschrijving" rows={2} />
        </div>
      </div>
    </>
  )
}

/**
 * De offerte van een partner: zoals die per mail of telefoon binnenkwam.
 * Met een vaste partner (vanuit zijn rij) kies je uit zijn standaardproducten;
 * zonder kies je eerst de partner.
 */
export function OfferteVelden({
  aanvraag,
  partners,
  partnerId,
  pakketten = [],
  bestaand,
}: {
  aanvraag: PartnerAanvraag
  /** Keuzelijst als de partner nog niet vaststaat. */
  partners?: { id: string; name: string }[]
  partnerId?: string
  pakketten?: PartnerPakket[]
  bestaand?: Pick<PartnerUitvraag, 'antwoordPakketId' | 'antwoordPrijsCents' | 'prijsCents' | 'beschikbaar' | 'andereDatum' | 'antwoordOpmerking' | 'offerteNaam'> | null
}) {
  const vandaag = new Date().toISOString().slice(0, 10)
  return (
    <>
      <input type="hidden" name="aanvraagId" value={aanvraag.id} />
      {partnerId ? (
        <input type="hidden" name="partnerId" value={partnerId} />
      ) : (
        <Select label="Partner" name="partnerId" options={[{ value: '', label: 'Kies de partner' }, ...(partners ?? []).map((p) => ({ value: p.id, label: p.name }))]} defaultValue="" />
      )}
      {pakketten.length > 0 && (
        <Select
          label="Standaardproduct"
          name="pakketId"
          defaultValue={bestaand?.antwoordPakketId ?? (bestaand ? 'geen' : pakketten[0]!.id)}
          options={[
            ...pakketten.map((p) => ({ value: p.id, label: `${p.naam}: ${formatEuro(indicatieVoor(p, aanvraag, vandaag).cents)}` })),
            { value: 'geen', label: 'Geen standaardproduct: eigen prijs' },
          ]}
          hint="De prijs is uitgerekend met de omvang van deze aanvraag."
        />
      )}
      <Field
        label="Prijs van de partner, exclusief btw"
        name="prijs"
        defaultValue={euro(bestaand?.prijsCents ?? bestaand?.antwoordPrijsCents)}
        placeholder="975,00"
        hint={pakketten.length > 0 ? 'Leeg laten: de prijs van het gekozen standaardproduct.' : undefined}
      />
      <Select
        label="Kan de partner op de gevraagde datum?"
        name="beschikbaar"
        defaultValue={bestaand?.beschikbaar === false ? 'nee' : 'ja'}
        options={[
          { value: 'ja', label: 'Ja' },
          { value: 'nee', label: 'Nee' },
        ]}
      />
      <Field label="Andere datum" name="andereDatum" defaultValue={bestaand?.andereDatum ?? ''} placeholder="Dinsdag 18 november" />
      <TextArea label="Opmerking" name="opmerking" rows={2} defaultValue={bestaand?.antwoordOpmerking ?? ''} placeholder="Wat er in de offerte staat, reiskosten, voorwaarden." />
      <label className="block">
        <span className="text-jr-text mb-1.5 block text-[13px] font-medium">De offerte van de partner {bestaand?.offerteNaam ? `(nu: ${bestaand.offerteNaam})` : '(optioneel)'}</span>
        <input
          type="file"
          name="offerte"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border file:border-gray-300 file:bg-white file:px-4 file:py-1.5 file:text-sm hover:file:bg-gray-50"
        />
        <span className="mt-1 block text-xs text-gray-500">Pdf of afbeelding, tot 4,5 MB.</span>
      </label>
      <label className="flex items-start gap-2.5 text-[15px]">
        <input type="checkbox" name="bevestigen" defaultChecked className={`${vakje} mt-0.5`} />
        <span>
          Meteen bevestigen
          <span className="block text-xs text-gray-600">Dan kun je er direct de offerte voor de klant van maken.</span>
        </span>
      </label>
    </>
  )
}
