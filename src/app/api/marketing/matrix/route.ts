import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { matrixCsv } from '@/lib/marketing/content'
import { magMarketing, type OnderwerpType } from '@/lib/marketing/registers'

/** De contentmatrix als CSV: één rij per onderwerp, één kolom per branche. */
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user || !magMarketing(user.role, 'lezen')) return NextResponse.json({ ok: false, error: 'Geen toegang.' }, { status: 401 })
  const t = new URL(req.url).searchParams.get('type')
  const type: OnderwerpType = t === 'package' || t === 'objective' ? t : 'service'
  const csv = await matrixCsv(type)
  return new NextResponse('﻿' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="contentmatrix-${type}.csv"` } })
}
