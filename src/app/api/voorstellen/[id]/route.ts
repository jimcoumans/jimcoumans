import { NextResponse } from 'next/server'
import { bewaarDossier, leesDossier, verwijderDossier } from '@/lib/voorstellen'
import { foutAntwoord, teamOf401 } from '../team'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { fout } = await teamOf401()
  if (fout) return fout
  const { id } = await params
  try {
    const d = await leesDossier(id)
    return NextResponse.json({ ok: true, bestaat: !!d, dossier: d })
  } catch (e) {
    return foutAntwoord(e)
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { user, fout } = await teamOf401()
  if (fout) return fout
  const { id } = await params
  try {
    await bewaarDossier(id, await req.json(), user!.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return foutAntwoord(e)
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { fout } = await teamOf401()
  if (fout) return fout
  const { id } = await params
  try {
    await verwijderDossier(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return foutAntwoord(e)
  }
}
