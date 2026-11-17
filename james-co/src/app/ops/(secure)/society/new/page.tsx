import { requireStaff } from '@/lib/auth/session'
import { PageTitle } from '@/components/ui'
import { EventForm } from '@/components/EventForm'

export default async function NewEvent() {
  await requireStaff()
  return (<><PageTitle title="Nieuwe ervaring" /><div className="card max-w-3xl"><EventForm /></div></>)
}
