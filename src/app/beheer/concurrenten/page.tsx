import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { concurrentenOverzicht } from '@/lib/crm'
import { AppShell } from '@/components/AppShell'

/**
 * Welke concurrenten we vaker tegenkomen.
 *
 * Als dezelfde partij bij vijf klanten in de weg zit, is dat geen toeval maar
 * een patroon. Dan weet je waar je je verhaal tegen moet afzetten.
 */
export default async function ConcurrentenPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const lijst = await concurrentenOverzicht()
  const vaker = lijst.filter((c) => c.aantal > 1)

  return (
    <AppShell user={user} actief="klanten" breed>
      <h1 className="text-jr-blue mb-1 text-2xl">Concurrenten</h1>
      <p className="mb-5 max-w-3xl text-sm text-gray-600">
        Verzameld vanuit de klantprofielen. Wie bovenaan staat kom je het vaakst tegen — dat
        is de partij waar je je verhaal tegen moet afzetten.
      </p>

      {lijst.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            Nog geen concurrenten vastgelegd. Dat doe je op de klantpagina.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <p className="text-xs text-gray-600">Verschillende partijen</p>
              <p className="tabular text-jr-blue text-xl font-bold leading-tight">
                {lijst.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Bij meer dan één klant</p>
              <p className="tabular text-xl font-bold leading-tight">{vaker.length}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
                  <th className="px-4 py-2.5 font-normal">Concurrent</th>
                  <th className="px-4 py-2.5 text-right font-normal">Bij hoeveel klanten</th>
                  <th className="px-4 py-2.5 font-normal">Welke klanten</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lijst.map((c) => (
                  <tr key={c.naam}>
                    <td className="px-4 py-2.5">{c.naam}</td>
                    <td className="tabular px-4 py-2.5 text-right">
                      <span className={c.aantal > 1 ? 'text-jr-orange font-bold' : ''}>
                        {c.aantal}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{c.klanten}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  )
}
