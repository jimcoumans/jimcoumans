import { Field, Select, TextArea } from '@/components/ActionForm'
import { BRANCHES } from '@/lib/crm'
import { SPECIALISMEN } from '@/lib/partneraanvragen'
import type { PartnerAanvraag } from '@/db/schema'

/** De velden van een partneraanvraag: nieuw (met klantkeuze) of wijzigen (met de huidige waarden). */
export function AanvraagVelden({ klanten, aanvraag }: { klanten?: { id: string; name: string }[]; aanvraag?: PartnerAanvraag }) {
  const a = aanvraag
  const branches = a?.branche && !(BRANCHES as readonly string[]).includes(a.branche) ? [...BRANCHES, a.branche] : BRANCHES
  return (
    <>
      {klanten && (
        <Select label="Klant" name="organizationId" options={[{ value: '', label: 'Kies de klant' }, ...klanten.map((k) => ({ value: k.id, label: k.name }))]} defaultValue="" />
      )}
      <Field label="Naam" name="titel" required defaultValue={a?.titel} placeholder="Woningvideo Hoofdstraat 12" />
      <Select label="Wat moet er gemaakt worden" name="specialisme" options={SPECIALISMEN.map((s) => ({ value: s, label: s }))} defaultValue={a?.specialisme ?? 'Video'} />
      <TextArea
        label="De vraag"
        name="vraag"
        required
        rows={4}
        defaultValue={a?.vraag}
        placeholder="Een video van 60 seconden van een vrijstaande woning, binnen en buiten, met drone. Voor Funda en Instagram (16:9 en 9:16)."
      />
      <Field label="Voorkeursdatum" name="voorkeursdatum" type="date" defaultValue={a?.voorkeursdatum ?? ''} />
      <Field label="Over de datum" name="datumToelichting" defaultValue={a?.datumToelichting ?? ''} placeholder="Liefst in de ochtend; uiterlijk 14 november" />
      <Field label="Locatie" name="locatie" defaultValue={a?.locatie ?? ''} placeholder="Valkenburg" />
      <Field label="Dagdelen" name="dagdelen" type="number" defaultValue={a?.dagdelen?.toString() ?? ''} hint="Voor pakketten per dagdeel, dag of uur." />
      <Field label="Aantal eindproducten" name="stuks" type="number" defaultValue={a?.stuks?.toString() ?? ''} hint="Voor pakketten per stuk." />
      <Select
        label="Branche"
        name="branche"
        options={[{ value: '', label: a ? 'Geen' : 'Zoals op de klantkaart' }, ...branches.map((b) => ({ value: b, label: b }))]}
        defaultValue={a?.branche ?? ''}
        hint="Telt mee in de match: wie werkt graag voor deze branche."
      />
      <TextArea label="Interne notities" name="notities" rows={2} defaultValue={a?.notities ?? ''} hint="Gaan niet naar de partner." />
    </>
  )
}
