import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth'
import { voerVerwerkingUit } from '@/lib/campagne-verwerken'

/**
 * Een verwerking hier en nu uitvoeren, zonder achtergrondfunctie.
 *
 * Alleen voor lokaal ontwikkelen: `next dev` kent de achtergrondfuncties van
 * Netlify niet. Op Netlify zou dit na 26 seconden afbreken, terwijl de AI
 * vaak langer nodig heeft; daar weigeren we het.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 })
  }
  if (process.env.NETLIFY === 'true' || process.env.SITE_ID) {
    return NextResponse.json(
      { ok: false, error: 'De achtergrondfunctie voor het verwerken staat niet online. Controleer de laatste uitrol op Netlify.' },
      { status: 503 },
    )
  }
  const { id } = await params
  const uit = await voerVerwerkingUit(id)
  if (uit) revalidatePath(`/beheer/campagnes/${uit.campaignId}`)
  return NextResponse.json({ ok: uit?.status === 'klaar', error: uit?.fout ?? undefined })
}
