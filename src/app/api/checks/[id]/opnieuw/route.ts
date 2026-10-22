import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth'
import { CheckError, probeerOpnieuw } from '@/lib/uitingen-check'

/** Een mislukte check opnieuw klaarzetten. De browser start daarna de achtergrondfunctie. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 })
  }
  const { id } = await params
  try {
    await probeerOpnieuw(id)
    revalidatePath(`/beheer/checks/${id}`)
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    if (error instanceof CheckError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    console.error('[uitingen-check] opnieuw mislukt:', error)
    return NextResponse.json({ ok: false, error: 'Opnieuw starten mislukt.' }, { status: 500 })
  }
}
