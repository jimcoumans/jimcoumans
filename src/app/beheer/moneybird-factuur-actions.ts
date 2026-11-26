'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { getSessionUser } from '@/lib/auth'
import { moneybirdClient, verstuurd } from '@/lib/moneybird/client'
import { isRetainerfactuur } from '@/lib/moneybird/kenmerk'
import type { ActionResult } from './actions'

const formulier = z.object({
  organizationId: z.uuid(),
  factuurId: z.string().regex(/^\d+$/),
  indeling: z.enum(['retainer', 'standaard']),
})

export async function zetMoneybirdRetainerIndeling(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser()
  if (user?.role !== 'admin') return { ok: false, error: 'Alleen een beheerder kan de factuurindeling wijzigen.' }

  const invoer = formulier.safeParse({
    organizationId: formData.get('organizationId'),
    factuurId: formData.get('factuurId'),
    indeling: formData.get('indeling'),
  })
  if (!invoer.success) return { ok: false, error: 'De gekozen factuur of indeling is ongeldig.' }
  const { organizationId, factuurId, indeling } = invoer.data

  try {
    const [klant] = await db.select({ slug: organizations.slug, contactId: organizations.moneybirdContactId })
      .from(organizations).where(eq(organizations.id, organizationId))
    if (!klant?.contactId) return { ok: false, error: 'Deze klant heeft geen Moneybird-koppeling.' }

    if (indeling === 'retainer') {
      const factuur = await moneybirdClient().factuur(factuurId)
      if (factuur.id !== factuurId || factuur.contact_id !== klant.contactId || !verstuurd(factuur)) {
        return { ok: false, error: 'Deze factuur staat niet bij het gekoppelde Moneybird-contact.' }
      }
      if (isRetainerfactuur(factuur.reference)) {
        revalidatePath(`/beheer/klanten/${klant.slug}`)
        return { ok: true }
      }
    }

    const ids = organizations.moneybirdRetainerFactuurIds
    const lijst = indeling === 'retainer'
      ? sql`array_append(array_remove(${ids}, ${factuurId}::text), ${factuurId}::text)`
      : sql`array_remove(${ids}, ${factuurId}::text)`
    const [bijgewerkt] = await db.update(organizations).set({ moneybirdRetainerFactuurIds: lijst })
      .where(and(eq(organizations.id, organizationId), eq(organizations.moneybirdContactId, klant.contactId)))
      .returning({ id: organizations.id })
    if (!bijgewerkt) return { ok: false, error: 'De klantkoppeling is intussen gewijzigd. Ververs de pagina.' }

    revalidatePath(`/beheer/klanten/${klant.slug}`)
    revalidatePath('/facturen')
    return { ok: true }
  } catch (error) {
    console.error('[moneybird] factuurindeling opslaan mislukt', error instanceof Error ? error.name : '')
    return { ok: false, error: 'De factuurindeling kon niet worden opgeslagen. Probeer het opnieuw.' }
  }
}
