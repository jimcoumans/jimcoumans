import { ActionForm } from './ActionForm'
import { saveSupplierAction } from '@/app/actions/staff'
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/domain/requests'
import type { Supplier } from '@/lib/domain/suppliers'

export function SupplierForm({ s }: { s?: Supplier }) {
  const f = (k: keyof Supplier) => ((s?.[k] as string | null) ?? '')
  return (
    <ActionForm action={saveSupplierAction} submitLabel={s ? 'Opslaan' : 'Leverancier toevoegen'}>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-sm">Naam<input className="field mt-1" name="name" required defaultValue={f('name')} /></label>
        <label className="text-sm">Categorie<select className="field mt-1" name="category" defaultValue={f('category') || 'dining'}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></label>
        <label className="text-sm">Regio<input className="field mt-1" name="region" defaultValue={f('region')} /></label>
        <label className="text-sm">Contactpersoon<input className="field mt-1" name="contactName" defaultValue={f('contactName')} /></label>
        <label className="text-sm">E-mail<input className="field mt-1" name="email" defaultValue={f('email')} /></label>
        <label className="text-sm">Telefoon<input className="field mt-1" name="phone" defaultValue={f('phone')} /></label>
        <label className="text-sm">Website<input className="field mt-1" name="website" defaultValue={f('website')} /></label>
        <label className="text-sm">Bereikbaarheid<input className="field mt-1" name="reachability" defaultValue={f('reachability')} /></label>
        <label className="text-sm">Serviceniveau<input className="field mt-1" name="serviceLevel" defaultValue={f('serviceLevel')} /></label>
        <label className="text-sm">Boekingswijze<input className="field mt-1" name="bookingMethod" defaultValue={f('bookingMethod')} /></label>
        <label className="text-sm sm:col-span-2">Noodcontact tijdens geboekte diensten<input className="field mt-1" name="emergencyContact" defaultValue={f('emergencyContact')} /></label>
      </div>
    </ActionForm>
  )
}
