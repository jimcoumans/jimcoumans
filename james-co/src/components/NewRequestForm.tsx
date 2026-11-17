'use client'

import { ActionForm } from './ActionForm'
import { createRequestAction } from '@/app/actions/member'

const CATS: [string, string][] = [['', 'Kies (optioneel)'], ['dining', 'Dining'], ['stays', 'Stays'], ['travel', 'Travel'], ['transport', 'Transport'], ['experiences', 'Experiences'], ['gifts', 'Gifts'], ['occasions', 'Occasions'], ['other', 'Overig']]

export function NewRequestForm() {
  return (
    <ActionForm action={createRequestAction} idempotent draftKey="new-request" submitLabel="Verzoek versturen" pendingLabel="Versturen…">
      <label className="label" htmlFor="brief">Uw wens</label>
      <textarea className="field min-h-[160px] text-[16px]" id="brief" name="brief" required minLength={3} maxLength={5000}
        placeholder="Bijvoorbeeld: vrijdag een bijzonder diner voor twee, binnen een uur van Maastricht. Rond €350 samen." />
      <details className="mt-5 rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-[15px] font-medium">Details toevoegen (optioneel)</summary>
        <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
          <div className="mb-4"><label className="label" htmlFor="category">Categorie</label><select className="field" id="category" name="category">{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="mb-4"><label className="label" htmlFor="location">Plaats of regio</label><input className="field" id="location" name="location" maxLength={200} /></div>
          <div className="mb-4"><label className="label" htmlFor="desiredDate">Gewenste datum</label><input className="field" id="desiredDate" name="desiredDate" type="date" /></div>
          <div className="mb-4"><label className="label" htmlFor="desiredTime">Gewenst tijdstip</label><input className="field" id="desiredTime" name="desiredTime" maxLength={40} placeholder="bijv. rond 19:30" /></div>
          <div className="mb-4"><label className="label" htmlFor="partySize">Aantal personen</label><input className="field" id="partySize" name="partySize" type="number" min={1} max={500} /></div>
          <div className="mb-4"><label className="label" htmlFor="budget">Budget (€)</label><input className="field" id="budget" name="budget" inputMode="decimal" placeholder="350" maxLength={30} /></div>
          <fieldset className="mb-4 sm:col-span-2">
            <legend className="label">Budget geldt</legend>
            <div className="flex gap-5 text-[15px]">
              <label className="flex items-center gap-2"><input type="radio" name="budgetBasis" value="total" className="h-5 w-5 accent-forest" /> in totaal</label>
              <label className="flex items-center gap-2"><input type="radio" name="budgetBasis" value="per_person" className="h-5 w-5 accent-forest" /> per persoon</label>
            </div>
          </fieldset>
          <div className="mb-2 sm:col-span-2"><label className="label" htmlFor="flexibility">Flexibiliteit</label><input className="field" id="flexibility" name="flexibility" maxLength={500} placeholder="bijv. zaterdag kan ook" /></div>
        </div>
      </details>
      <p className="hint mt-4">Een verzoek is nog geen boeking en geen betaalopdracht. U ontvangt eerst een voorstel en geeft daarna akkoord.</p>
    </ActionForm>
  )
}
