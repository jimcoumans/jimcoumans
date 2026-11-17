import { NextResponse } from 'next/server'
import { CrmKoppelFout, koppelAanCrm, type CrmInvoer } from '@/lib/voorstel-crm'
import { foutAntwoord, teamOf401 } from '../team'

/**
 * Koppelt een dossier uit de voorstelgenerator aan het CRM: het bedrijf en de
 * contactpersoon worden gevonden of aangemaakt, en lege velden aangevuld.
 */
export async function POST(req: Request) {
  const { user, fout } = await teamOf401()
  if (fout) return fout
  try {
    const body = (await req.json()) as CrmInvoer
    if (!body || typeof body !== 'object' || !body.bedrijf) {
      return NextResponse.json({ ok: false, error: 'Geen bedrijf meegegeven.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, ...(await koppelAanCrm({ ...body, userId: user.id })) })
  } catch (e) {
    if (e instanceof CrmKoppelFout) return NextResponse.json({ ok: false, error: e.message }, { status: 400 })
    return foutAntwoord(e)
  }
}
