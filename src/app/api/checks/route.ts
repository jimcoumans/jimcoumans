import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { CheckError, maakCheck, markeerVastgelopen } from '@/lib/uitingen-check'

/**
 * Een uiting klaarzetten om te checken.
 *
 * Een route en geen server action: een poster als pdf of een carrousel van
 * tien slides is groter dan een server action aanneemt. Het checken zelf
 * gebeurt hierna in de achtergrondfunctie; deze route bewaart alleen.
 */
export const maxDuration = 26

const ofNull = (f: FormData, naam: string) => String(f.get(naam) ?? '').trim() || null

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, error: 'De uiting kwam niet goed aan. Probeer het opnieuw.' }, { status: 400 })
  }

  const organizationId = String(form.get('organizationId') ?? '')
  if (!organizationId) return NextResponse.json({ ok: false, error: 'Geen klant gekozen.' }, { status: 400 })

  try {
    await markeerVastgelopen(organizationId)
    const bestanden = await Promise.all(
      form
        .getAll('bestanden')
        .filter((b): b is File => b instanceof File && b.size > 0)
        .map(async (b) => ({ naam: b.name || 'uiting', data: Buffer.from(await b.arrayBuffer()) })),
    )
    const rij = await maakCheck({
      organizationId,
      titel: String(form.get('titel') ?? ''),
      soort: String(form.get('soort') ?? ''),
      kanaal: ofNull(form, 'kanaal'),
      merkId: ofNull(form, 'merkId'),
      kanaalMerkId: ofNull(form, 'kanaalMerkId'),
      doelgroepId: ofNull(form, 'doelgroepId'),
      campaignId: ofNull(form, 'campaignId'),
      doel: ofNull(form, 'doel'),
      tekst: ofNull(form, 'tekst'),
      uitingUrl: ofNull(form, 'uitingUrl'),
      lpUrl: ofNull(form, 'lpUrl'),
      toelichting: ofNull(form, 'toelichting'),
      bestanden,
      vorigeCheckId: ofNull(form, 'vorigeCheckId'),
      userId: user.id,
    })
    revalidatePath('/beheer/checks')
    return NextResponse.json({ ok: true, id: rij.id })
  } catch (error) {
    if (error instanceof CheckError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    const melding = describeDbError(error)
    if (melding) return NextResponse.json({ ok: false, error: melding }, { status: 400 })
    console.error('[uitingen-check] klaarzetten mislukt:', error)
    return NextResponse.json({ ok: false, error: 'Klaarzetten mislukt. Kijk in de serverlogs.' }, { status: 500 })
  }
}
