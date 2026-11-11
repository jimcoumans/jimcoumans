'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth'
import { EIGENAREN, STATUSSEN, vinkAan, vinkUit, zetStatus, type Status } from '@/lib/resultaten/acties'
import type { Eigenaar } from '@/lib/resultaten/analyse'

const tekst = (f: FormData, n: string) => String(f.get(n) ?? '').trim()

function ververs(slug: string) {
  revalidatePath(`/beheer/klanten/${slug}/resultaten`)
  revalidatePath('/resultaten')
}

/** Een knop uit de analyse aanvinken: vanaf dan ziet de klant hem onder "Waar we aan werken". */
export async function vinkActieAan(formData: FormData): Promise<void> {
  const user = await requireStaff()
  const eigenaar = tekst(formData, 'eigenaar') as Eigenaar
  const maand = tekst(formData, 'maand')
  if (!EIGENAREN.includes(eigenaar) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(maand)) return
  await vinkAan({
    organizationId: tekst(formData, 'organizationId'),
    maand,
    findingCode: tekst(formData, 'code'),
    findingTitle: tekst(formData, 'titel'),
    actie: tekst(formData, 'actie'),
    eigenaar,
    userId: user.id,
  })
  ververs(tekst(formData, 'slug'))
}

export async function vinkActieUit(formData: FormData): Promise<void> {
  await requireStaff()
  await vinkUit(tekst(formData, 'id'), tekst(formData, 'organizationId'))
  ververs(tekst(formData, 'slug'))
}

export async function zetActieStatus(formData: FormData): Promise<void> {
  await requireStaff()
  const status = tekst(formData, 'status') as Status
  if (!(STATUSSEN as readonly string[]).includes(status)) return
  await zetStatus(tekst(formData, 'id'), tekst(formData, 'organizationId'), status)
  ververs(tekst(formData, 'slug'))
}
