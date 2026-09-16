import { AppShell } from '@/components/AppShell'
import type { SessionUser } from '@/lib/auth'

/**
 * Een pagina met de navigatiekolom, maar zonder database.
 *
 * AppShell is een clientcomponent. Valt deze pagina om terwijl /ping het wel
 * doet, dan zit het probleem in de clientcomponenten en niet in de data.
 */
export const dynamic = 'force-dynamic'

/**
 * Een verzonnen gebruiker, alleen om AppShell te kunnen tekenen.
 *
 * Met opzet geen echte sessie: deze pagina moet ook werken als de database
 * plat ligt, anders meet hij niet wat hij moet meten. De cast is hier
 * verdedigbaar omdat AppShell alleen de rol en het mailadres gebruikt; dit is
 * een meetpagina en geen onderdeel van het portaal.
 */
const NEP_GEBRUIKER = {
  id: 'ping',
  email: 'ping@jamesrobinson.nl',
  role: 'admin',
  organizationId: null,
  organization: null,
} as unknown as SessionUser

export default function PingShellPagina() {
  return (
    <AppShell user={NEP_GEBRUIKER} actief="dashboard">
      <h1 className="text-jr-blue text-2xl">Ping met navigatie</h1>
      <p className="text-sm text-gray-600">
        Deze pagina haalt niets op, maar gebruikt wel de clientcomponent.
      </p>
    </AppShell>
  )
}
