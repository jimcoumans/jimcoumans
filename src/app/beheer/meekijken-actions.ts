'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { organizations } from '@/db/schema'
import { requireStaff } from '@/lib/auth'
import { MEEKIJK_COOKIE } from '@/lib/meekijken'

/** Het portaal van een klant openen zoals de klant het ziet. */
export async function startMeekijken(formData: FormData): Promise<void> {
  await requireStaff()
  const id = String(formData.get('organizationId') ?? '')
  const naar = String(formData.get('naar') ?? '/')
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, id))
  if (!org) return
  const jar = await cookies()
  jar.set(MEEKIJK_COOKIE, org.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Een werkdag; daarna val je vanzelf terug in het beheer.
    maxAge: 8 * 60 * 60,
  })
  redirect(naar === '/resultaten' ? '/resultaten' : '/')
}

/** Terug naar het beheer, bij de klant waar je meekeek. */
export async function stopMeekijken(formData: FormData): Promise<void> {
  await requireStaff()
  const jar = await cookies()
  jar.delete(MEEKIJK_COOKIE)
  const slug = String(formData.get('slug') ?? '')
  redirect(/^[a-z0-9-]+$/.test(slug) ? `/beheer/klanten/${slug}` : '/beheer')
}
