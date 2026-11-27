'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, isNotNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { getSessionUser } from '@/lib/auth'
import { ClickUpClient } from '@/lib/clickup/client'
import { isConstraintViolation } from '@/lib/db-errors'
import { leesWalletStartmaand } from '@/lib/retainer-wallet/bereken'
import type { ActionResult } from './actions'

const formulier = z.object({
  organizationId: z.uuid(),
  vanaf: z.string().trim(),
  listId: z.string().trim(),
})

export async function haalClickUpWalletLijsten(): Promise<
  { ok: true; opties: { value: string; label: string }[] } | { ok: false }
> {
  const user = await getSessionUser()
  if (user?.role !== 'admin') return { ok: false }

  try {
    const clickup = new ClickUpClient(process.env.CLICKUP_API_TOKEN ?? '')
    const opties = await clickup.listKeuzes(AbortSignal.timeout(8000), process.env.CLICKUP_TEAM_ID)
    return { ok: true, opties }
  } catch (error) {
    console.error('[retainer-wallet] ClickUp-lijsten ophalen mislukt', error instanceof Error ? error.name : '')
    return { ok: false }
  }
}

export async function zetRetainerWallet(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser()
  if (user?.role !== 'admin') return { ok: false, error: 'Alleen een beheerder kan de walletbronnen wijzigen.' }

  const invoer = formulier.safeParse({
    organizationId: formData.get('organizationId'),
    vanaf: formData.get('vanaf'),
    listId: formData.get('listId'),
  })
  if (!invoer.success) return { ok: false, error: 'De walletinstellingen zijn ongeldig.' }

  const { organizationId, vanaf, listId } = invoer.data
  const uitschakelen = !vanaf && !listId
  const startmaand = leesWalletStartmaand(vanaf)
  if (!uitschakelen && !startmaand) {
    return { ok: false, error: 'Vul de startmaand in als MM/JJ, bijvoorbeeld 10/25.' }
  }
  if (!uitschakelen && !/^\d{1,30}$/.test(listId)) {
    return { ok: false, error: 'Kies een ClickUp-takenlijst.' }
  }

  if (!uitschakelen) {
    try {
      const clickup = new ClickUpClient(process.env.CLICKUP_API_TOKEN ?? '')
      const lijst = await clickup.getList(listId, AbortSignal.timeout(8000))
      if (String(lijst.id) !== listId) throw new Error('ClickUp gaf een ander lijst-ID terug.')
    } catch (error) {
      console.error('[retainer-wallet] ClickUp-lijst controleren mislukt', error instanceof Error ? error.name : '')
      return { ok: false, error: 'De ClickUp-lijst kon niet worden geopend. Controleer het lijst-ID en de koppeling.' }
    }
  }

  try {
    const [klant] = await db.update(organizations).set({
      walletFacturenVanaf: startmaand,
      walletClickupListId: listId || null,
    }).where(and(
      eq(organizations.id, organizationId),
      uitschakelen ? undefined : isNotNull(organizations.moneybirdContactId),
    )).returning({ slug: organizations.slug })
    if (!klant) return { ok: false, error: 'Koppel eerst het Moneybird-contact van deze klant.' }

    revalidatePath(`/beheer/klanten/${klant.slug}`)
    revalidatePath('/')
    revalidatePath('/activiteit')
    return { ok: true }
  } catch (error) {
    if (isConstraintViolation(error, 'organizations_wallet_clickup_list_idx')) {
      return { ok: false, error: 'Deze ClickUp-lijst is al gekoppeld aan de wallet van een andere klant.' }
    }
    console.error('[retainer-wallet] instellingen opslaan mislukt', error instanceof Error ? error.name : '')
    return { ok: false, error: 'De walletinstellingen konden niet worden opgeslagen.' }
  }
}
