'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { verwijderVerbinding, vergeetKeuzes } from '@/lib/performance/oauth'
import type { ActionResult } from './actions'

export async function verbindingLoskoppelen(formData: FormData): Promise<ActionResult> {
  const user = await requireStaff()
  if (user.role !== 'admin') return { ok: false, error: 'Alleen een beheerder kan een Google-account loskoppelen.' }
  await verwijderVerbinding(String(formData.get('id') ?? ''))
  revalidatePath('/beheer/koppelingen')
  revalidatePath('/beheer/performance')
  return { ok: true }
}

/** De lijst met properties opnieuw ophalen, bijvoorbeeld nadat een klant ons toegang gaf. */
export async function keuzesVerversen(): Promise<ActionResult> {
  await requireStaff()
  vergeetKeuzes()
  revalidatePath('/beheer/koppelingen')
  revalidatePath('/beheer/klanten', 'layout')
  return { ok: true }
}
