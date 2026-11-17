import { requireStaff } from '@/lib/auth/session'
import { listMembers } from '@/lib/domain/members'
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/domain/requests'
import { ActionForm } from '@/components/ActionForm'
import { PageTitle } from '@/components/ui'
import { createForMemberAction } from '@/app/actions/staff'

export default async function NewForMember({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { actor } = await requireStaff()
  const { member } = await searchParams
  const members = (await listMembers(actor)).filter((m) => m.status === 'active')
  return (
    <>
      <PageTitle title="Verzoek vastleggen namens een lid">Voor een verzoek dat binnenkwam via WhatsApp, telefoon of e-mail. Leg alleen de zakelijke samenvatting vast. Het lid ziet dit verzoek in het portaal.</PageTitle>
      <div className="card max-w-3xl">
        <ActionForm action={createForMemberAction} idempotent submitLabel="Verzoek aanmaken">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">Lid<select className="field mt-1" name="memberId" required defaultValue={member ?? ''}><option value="" disabled>Kies een actief lid…</option>{members.map((m) => <option key={m.userId} value={m.userId}>{m.fullName} ({m.email})</option>)}</select></label>
            <label className="text-sm">Binnengekomen via<select className="field mt-1" name="channel"><option value="whatsapp_manual">WhatsApp</option><option value="phone_note">Telefoon</option><option value="email">E-mail</option></select></label>
            <label className="text-sm sm:col-span-2">Samenvatting van de wens<textarea className="field mt-1 min-h-[120px]" name="brief" required /></label>
            <label className="text-sm">Categorie<select className="field mt-1" name="category"><option value="">—</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></label>
            <label className="text-sm">Plaats<input className="field mt-1" name="location" /></label>
            <label className="text-sm">Datum<input className="field mt-1" type="date" name="desiredDate" /></label>
            <label className="text-sm">Tijd<input className="field mt-1" name="desiredTime" /></label>
            <label className="text-sm">Personen<input className="field mt-1" type="number" min={1} name="partySize" /></label>
            <label className="text-sm">Budget €<input className="field mt-1" name="budget" inputMode="decimal" /></label>
            <label className="text-sm">Budget geldt<select className="field mt-1" name="budgetBasis"><option value="">—</option><option value="total">Totaal</option><option value="per_person">Per persoon</option></select></label>
          </div>
        </ActionForm>
      </div>
    </>
  )
}
