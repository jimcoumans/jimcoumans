import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth'
import { describeDbError } from '@/lib/db-errors'
import { importeerBriefing, isBriefingBestand, maakVerwerking, markeerVastgelopen, VerwerkError } from '@/lib/campagne-verwerken'

/**
 * Feedback van de klant klaarzetten om te verwerken.
 *
 * Een route en geen server action: een server action neemt maar 1 MB aan,
 * en een pdf met feedback is al snel groter. Het verwerken zelf gebeurt
 * hierna in de achtergrondfunctie; deze route bewaart alleen.
 */
export const maxDuration = 26

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, error: 'De feedback kwam niet goed aan. Probeer het opnieuw.' }, { status: 400 })
  }

  const campaignId = String(form.get('campaignId') ?? '')
  const bestand = form.get('bestand')
  if (!campaignId) return NextResponse.json({ ok: false, error: 'Geen campagne gekozen.' }, { status: 400 })

  try {
    await markeerVastgelopen(campaignId)
    const data = bestand instanceof File && bestand.size > 0 ? { naam: bestand.name || 'feedback', data: Buffer.from(await bestand.arrayBuffer()) } : null

    // Een uitgewerkte briefing (.json) lezen we meteen in: geen AI, geen achtergrondfunctie.
    if (data && isBriefingBestand(data.naam, data.data)) {
      const uit = await importeerBriefing({ campaignId, naam: data.naam, data: data.data, userId: user.id })
      revalidatePath(`/beheer/campagnes/${campaignId}`)
      if (uit.status !== 'klaar') return NextResponse.json({ ok: false, error: uit.fout ?? 'De import is mislukt.' }, { status: 400 })
      return NextResponse.json({ ok: true, id: uit.id, klaar: true })
    }

    const rij = await maakVerwerking({ campaignId, invoer: String(form.get('invoer') ?? ''), bestand: data, userId: user.id })
    revalidatePath(`/beheer/campagnes/${campaignId}`)
    return NextResponse.json({ ok: true, id: rij.id })
  } catch (error) {
    if (error instanceof VerwerkError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    const melding = describeDbError(error)
    if (melding) return NextResponse.json({ ok: false, error: melding }, { status: 400 })
    console.error('[briefing verwerken] klaarzetten mislukt:', error)
    return NextResponse.json({ ok: false, error: 'Klaarzetten mislukt. Kijk in de serverlogs.' }, { status: 500 })
  }
}
