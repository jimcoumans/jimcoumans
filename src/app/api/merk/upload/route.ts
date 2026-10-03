import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { voegBestandToe, MerkError, type Soort } from '@/lib/merkkluis'
import type { BrandFile } from '@/db/schema'

/**
 * Een bestand in de merkkluis zetten.
 *
 * Een route en geen server action: een server action neemt standaard
 * maar 1 MB aan, en een foto is groter. De browser verkleint foto's eerst,
 * zodat alles onder de 6 MB blijft die Netlify per verzoek toelaat.
 */
export const maxDuration = 26

const SOORTEN: Soort[] = ['logo', 'beeld', 'element', 'lettertype']

function uitLijst<T extends string>(waarde: FormDataEntryValue | null, lijst: readonly T[]): T | undefined {
  const s = String(waarde ?? '')
  return (lijst as readonly string[]).includes(s) ? (s as T) : undefined
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, error: 'Het bestand kwam niet goed aan. Probeer het opnieuw.' }, { status: 400 })
  }

  const bestand = form.get('bestand')
  const kind = uitLijst(form.get('kind'), SOORTEN)
  const organizationId = String(form.get('organizationId') ?? '')
  const slug = String(form.get('slug') ?? '')
  if (!(bestand instanceof File) || !kind || !organizationId) {
    return NextResponse.json({ ok: false, error: 'Kies een bestand.' }, { status: 400 })
  }

  try {
    const rij = await voegBestandToe({
      organizationId,
      kind,
      title: String(form.get('title') ?? ''),
      filename: bestand.name || null,
      data: Buffer.from(await bestand.arrayBuffer()),
      userId: user.id,
      logoVariant: uitLijst<NonNullable<BrandFile['logoVariant']>>(form.get('logoVariant'), ['primair', 'secundair', 'beeldmerk', 'woordmerk', 'anders']),
      logoBackground: uitLijst<NonNullable<BrandFile['logoBackground']>>(form.get('logoBackground'), ['licht', 'donker', 'beide']),
      logoColorway: uitLijst<NonNullable<BrandFile['logoColorway']>>(form.get('logoColorway'), ['kleur', 'zwart', 'wit']),
    })
    if (slug) revalidatePath(`/beheer/assets/${slug}`)
    revalidatePath('/beheer/assets')
    return NextResponse.json({ ok: true, id: rij.id })
  } catch (error) {
    if (error instanceof MerkError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    const melding = describeDbError(error)
    if (melding) return NextResponse.json({ ok: false, error: melding }, { status: 400 })
    console.error('[merkkluis] upload mislukt:', error)
    return NextResponse.json({ ok: false, error: 'Uploaden mislukt. Kijk in de serverlogs.' }, { status: 500 })
  }
}
