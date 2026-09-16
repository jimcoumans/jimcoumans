import { NextResponse } from 'next/server'

/**
 * Het kaalste antwoord dat dit systeem kan geven.
 *
 * Geen database, geen imports uit de app, geen React. Werkt dit niet, dan
 * draait de serverfunctie zelf niet en hoeven we nergens anders te kijken.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ ping: 'pong', tijd: new Date().toISOString() })
}
