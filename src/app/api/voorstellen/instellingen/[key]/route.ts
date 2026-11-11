import { NextResponse } from 'next/server'
import { bewaarInstelling, leesInstelling } from '@/lib/voorstellen'
import { foutAntwoord, teamOf401 } from '../../team'

type Ctx = { params: Promise<{ key: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { fout } = await teamOf401()
  if (fout) return fout
  const { key } = await params
  try {
    const data = await leesInstelling(key)
    return NextResponse.json({ ok: true, bestaat: data != null, data })
  } catch (e) {
    return foutAntwoord(e)
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { fout } = await teamOf401()
  if (fout) return fout
  const { key } = await params
  try {
    await bewaarInstelling(key, await req.json())
    return NextResponse.json({ ok: true })
  } catch (e) {
    return foutAntwoord(e)
  }
}
