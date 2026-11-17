import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getMyMembership, canCreateRequests } from '@/lib/domain/memberships'
import { getSettings } from '@/lib/domain/settings'
import { PageTitle } from '@/components/ui'
import { NewRequestForm } from '@/components/NewRequestForm'

export default async function NewRequest() {
  const { actor } = await requireUser()
  if (!canCreateRequests(await getMyMembership(actor))) redirect('/app/membership')
  const s = await getSettings()
  return (
    <>
      <PageTitle eyebrow="Nieuw verzoek" title="Wat mogen we voor u regelen?">
        {s.serviceHours.enabled ? `${s.serviceHours.description} ${s.serviceHours.responseTime}` : 'U kunt altijd een verzoek indienen. Wij laten weten wanneer we het oppakken.'}
      </PageTitle>
      <div className="card max-w-3xl"><NewRequestForm /></div>
    </>
  )
}
