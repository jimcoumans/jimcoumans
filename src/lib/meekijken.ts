/* -------------------------------------------------------------------------
   Meekijken: een beheerder bekijkt het portaal van een klant precies zoals
   de klant het ziet. Alleen voor het team, alleen kijken.

   De keuze staat in een eigen cookie naast de sessie. Die cookie zegt niets
   zonder een ingelogde collega: een klant met dezelfde cookie blijft gewoon
   in zijn eigen portaal.
   ------------------------------------------------------------------------- */

import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { getSessionUser, type SessionUser } from './auth'

export const MEEKIJK_COOKIE = 'jr_meekijken'

export type Portaal = {
  user: SessionUser
  organizationId: string
  organisatieNaam: string
  /** Een collega kijkt mee; er wordt niets namens de klant gedaan. */
  meekijken: { naam: string; slug: string } | null
}

/**
 * Voor welke klant deze pagina van het portaal getoond wordt. Null betekent:
 * niemand ingelogd (dan naar /login) of een collega die niet meekijkt (dan
 * naar /beheer).
 */
export async function getPortaal(): Promise<{ status: 'geen_sessie' } | { status: 'team' } | ({ status: 'ok' } & Portaal)> {
  const user = await getSessionUser()
  if (!user) return { status: 'geen_sessie' }
  if (user.role === 'staff' || user.role === 'admin') {
    const id = (await cookies()).get(MEEKIJK_COOKIE)?.value
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { status: 'team' }
    const [org] = await db.select({ id: organizations.id, name: organizations.name, slug: organizations.slug }).from(organizations).where(eq(organizations.id, id))
    if (!org) return { status: 'team' }
    return { status: 'ok', user, organizationId: org.id, organisatieNaam: org.name, meekijken: { naam: org.name, slug: org.slug } }
  }
  if (!user.organizationId) return { status: 'geen_sessie' }
  return { status: 'ok', user, organizationId: user.organizationId, organisatieNaam: user.organization?.name ?? '', meekijken: null }
}
