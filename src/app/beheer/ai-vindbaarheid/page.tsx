import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { PaginaKop } from '@/components/PaginaKop'
import { ActionForm } from '@/components/ActionForm'
import { lijstSets } from '@/lib/ai-vindbaarheid'
import { startJamesRobinson } from '../ai-actions'

/**
 * AI-vindbaarheid: wordt een bedrijf genoemd als iemand ChatGPT, Gemini,
 * Claude of Google om advies vraagt? Per bedrijf een vaste set vragen, elke
 * maand opnieuw gemeten. Eerst voor James Robinson zelf, daarna per klant.
 */
export default async function AiVindbaarheidPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const sets = await lijstSets()
  const heeftJr = sets.some((s) => s.set.organizationId === null)

  return (
    <AppShell user={user} actief="ai">
      <PaginaKop
        titel="AI-vindbaarheid"
        uitleg="Worden we genoemd als iemand een AI-assistent om advies vraagt? Per bedrijf een vaste set vragen, elke maand op dezelfde manier gemeten. Eén antwoord zegt weinig; de lijn over de maanden wel."
      />
      {!heeftJr && (
        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base">Begin bij James Robinson zelf</h2>
          <p className="mb-4 text-sm text-gray-600">
            Met de twaalf vragen uit de nulmeting: regionaal, per branche en over ons. Vragen toevoegen en concurrenten invullen kan daarna.
          </p>
          <ActionForm action={startJamesRobinson} submitLabel="Meetset voor James Robinson aanmaken" meldGelukt={false}>
            <span />
          </ActionForm>
        </section>
      )}
      {sets.length > 0 && (
        <ul className="space-y-2">
          {sets.map(({ set, organisatie }) => (
            <li key={set.id}>
              <Link href={`/beheer/ai-vindbaarheid/${set.id}`} className="hover:border-jr-blue block rounded-xl border border-transparent bg-white p-4 shadow-sm transition-colors">
                <span className="text-sm">{set.naam}</span>
                <p className="mt-1 text-xs text-gray-600">{organisatie ?? 'James Robinson zelf'}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
