'use client'

import { useState } from 'react'
import { ActionForm, Check, Field, Select } from '../ActionForm'
import { vertrekActie } from '@/app/beheer/crm-actions'

/**
 * Het formulier "Gaat weg bij": vertrekdatum, waar de persoon heen gaat, en wat er
 * automatisch gebeurt. Dat laatste staat erbij, zodat niemand verrast wordt
 * door een geblokkeerde login of een klant die ineens op oranje staat.
 */
export function VertrekFormulier({
  contactId,
  voornaam,
  bijBedrijven,
  alleBedrijven,
}: {
  contactId: string
  voornaam: string
  /** Waar de persoon nu werkt. Eén: vast; meer: kiezen. */
  bijBedrijven: { id: string; naam: string }[]
  alleBedrijven: { id: string; naam: string }[]
}) {
  const [naar, setNaar] = useState<'onbekend' | 'tekst' | 'crm'>('onbekend')
  const [bij, setBij] = useState(bijBedrijven[0]?.id ?? '')
  const vandaag = new Date().toISOString().slice(0, 10)

  return (
    <ActionForm action={vertrekActie} submitLabel="Vertrek vastleggen" resetOnSuccess={false} className="grid gap-4">
      <input type="hidden" name="contactId" value={contactId} />
      {bijBedrijven.length === 1 ? (
        <input type="hidden" name="organizationId" value={bijBedrijven[0]!.id} />
      ) : (
        <label className="text-sm">
          <span className="mb-1 block font-medium">Gaat weg bij</span>
          <select name="organizationId" value={bij} onChange={(e) => setBij(e.target.value)} className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-[15px]">
            {bijBedrijven.map((b) => (
              <option key={b.id} value={b.id}>{b.naam}</option>
            ))}
          </select>
        </label>
      )}
      <Field label="Laatste werkdag" name="datum" type="date" defaultValue={vandaag} markeerOptioneel={false} />

      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-1 font-medium">Waar gaat {voornaam} heen?</legend>
        {(
          [
            ['onbekend', 'Weet ik niet'],
            ['tekst', 'Naar een bedrijf dat (nog) niet in het CRM staat'],
            ['crm', 'Naar een bedrijf uit het CRM'],
          ] as const
        ).map(([waarde, label]) => (
          <label key={waarde} className="flex items-center gap-2">
            <input type="radio" name="naar" value={waarde} checked={naar === waarde} onChange={() => setNaar(waarde)} className="accent-jr-blue" />
            {label}
          </label>
        ))}
      </fieldset>
      {naar === 'tekst' && (
        <div className="grid gap-3 rounded-lg bg-gray-50 p-3">
          <Field label="Nieuwe werkgever" name="naarNaam" required placeholder="Naam van het bedrijf" />
          <Check
            label="Maak er een lead van in de pijplijn"
            name="alsLead"
            hint={`Het bedrijf komt als lead in het CRM, met ${voornaam} als contactpersoon en een deal met als volgende stap "kennismaken in de nieuwe rol".`}
          />
        </div>
      )}
      {naar === 'crm' && (
        <Select
          label="Nieuw bedrijf"
          name="naarOrganizationId"
          options={[{ value: '', label: 'Kies een bedrijf' }, ...alleBedrijven.filter((b) => b.id !== bij).map((b) => ({ value: b.id, label: b.naam }))]}
        />
      )}

      <div className="rounded-lg border-l-4 border-jr-orange bg-jr-orange/10 px-4 py-3 text-xs leading-relaxed text-gray-700">
        <p className="mb-1 font-medium text-gray-900">Wat er gebeurt</p>
        <ul className="list-disc space-y-0.5 pl-4">
          <li>{voornaam} blijft in het CRM, en komt op de bedrijfspagina bij de oud-contactpersonen.</li>
          <li>De toegang van {voornaam} tot het portaal voor dit bedrijf wordt meteen geblokkeerd.</li>
          <li>Was {voornaam} de vaste contactpersoon of de ontvanger van de facturen, dan gaat dat eraf. De relatie komt dan op &ldquo;Vraagt aandacht&rdquo;, met een actie om kennis te maken met de opvolger.</li>
          <li>Een zakelijk e-mailadres gaat uit het mailveld naar de notities. Een privéadres blijft staan.</li>
          <li>Het vertrek komt op de tijdlijn van het bedrijf.</li>
        </ul>
      </div>
    </ActionForm>
  )
}
