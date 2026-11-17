import { ActionForm } from './ActionForm'
import { saveEventAction } from '@/app/actions/staff'
import type { SocietyEvent } from '@/lib/domain/society'

function parts(d: Date | undefined, tz: string) {
  if (!d) return { date: '', time: '' }
  const s = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
  const [date, time] = s.split(' ')
  return { date: date ?? '', time: time ?? '' }
}

export function EventForm({ e }: { e?: SocietyEvent }) {
  const p = parts(e?.startsAt, e?.timezone ?? 'Europe/Amsterdam')
  return (
    <ActionForm action={saveEventAction} submitLabel={e ? 'Opslaan' : 'Ervaring aanmaken'}>
      {e && <input type="hidden" name="id" value={e.id} />}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Titel<input className="field mt-1" name="title" required defaultValue={e?.title} /></label>
        <label className="text-sm sm:col-span-2">Korte omschrijving<input className="field mt-1" name="summary" required defaultValue={e?.summary} /></label>
        <label className="text-sm sm:col-span-2">Beschrijving<textarea className="field mt-1" name="description" defaultValue={e?.description ?? ''} /></label>
        <label className="text-sm">Locatie<input className="field mt-1" name="location" defaultValue={e?.location ?? ''} /></label>
        <label className="text-sm">Capaciteit (plaatsen)<input className="field mt-1" type="number" min={1} name="capacity" defaultValue={e?.capacity ?? ''} /></label>
        <label className="text-sm">Datum<input className="field mt-1" type="date" name="date" required defaultValue={p.date} /></label>
        <label className="text-sm">Tijd (Europe/Amsterdam)<input className="field mt-1" type="time" name="time" required defaultValue={p.time} /></label>
        <label className="text-sm">Bijdrage €<input className="field mt-1" name="price" defaultValue={e?.priceMinor != null ? (e.priceMinor / 100).toFixed(2).replace('.', ',') : ''} /></label>
        <label className="text-sm">Toelichting prijs<input className="field mt-1" name="priceNote" defaultValue={e?.priceNote ?? ''} /></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="publicTeaser" defaultChecked={e?.publicTeaser} className="h-4 w-4 accent-forest" /> Tonen als teaser op de publieke Society-pagina (zonder deelnemers)</label>
      </div>
    </ActionForm>
  )
}
