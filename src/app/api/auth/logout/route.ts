import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

/** Uitloggen is een POST, zodat een link in een mail je niet kan uitloggen. */
export async function POST(request: Request) {
  await destroySession()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
