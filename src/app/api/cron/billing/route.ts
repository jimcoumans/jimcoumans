import { NextResponse } from 'next/server'
import { runBilling, vatSamenBilling } from '@/lib/billing'
import { safeCompare } from '@/lib/auth'

/**
 * De dagelijkse abonnementsrun.
 *
 * Draait elke dag, niet alleen op de tweede. Hij kijkt zelf welke periodes
 * nog openstaan, dus als de run een dag mist wordt die de volgende dag
 * ingehaald in plaats van dat een maand overgeslagen wordt.
 *
 * Beveiliging: alleen met het juiste geheim. Zonder die controle zou
 * iedereen die de URL kent facturen kunnen laten aanmaken. Vercel Cron
 * stuurt CRON_SECRET mee als Bearer-token; een handmatige aanroep kan het
 * ook als ?secret= meegeven.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function magDraaien(request: Request): boolean {
  const geheim = process.env.CRON_SECRET
  // Zonder geheim gaat de deur op slot, niet open.
  if (!geheim || geheim.length < 16) return false

  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ') && safeCompare(header.slice(7), geheim)) {
    return true
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('secret')
  return query !== null && safeCompare(query, geheim)
}

async function handle(request: Request) {
  if (!magDraaien(request)) {
    // Geen details prijsgeven over waarom het misging.
    return NextResponse.json({ error: 'Geen toegang' }, { status: 401 })
  }

  const url = new URL(request.url)
  // Standaard echt factureren: dit endpoint is er om te factureren.
  // Met ?dryRun=1 kun je eerst kijken wat er zou gebeuren.
  const apply = url.searchParams.get('dryRun') !== '1'

  try {
    const rapport = await runBilling({ apply })

    // In de logs van Vercel is dit terug te vinden.
    console.log(
      `[billing] ${apply ? 'uitgevoerd' : 'proefronde'}: ${vatSamenBilling(rapport)}`,
    )

    return NextResponse.json({
      ok: rapport.fouten === 0,
      apply: rapport.apply,
      samenvatting: vatSamenBilling(rapport),
      abonnementen: rapport.bekekenAbonnementen,
      gefactureerd: rapport.gefactureerd,
      bestondAl: rapport.bestondAl,
      fouten: rapport.fouten,
      bedragCents: rapport.bedragCents,
      regels: rapport.regels,
    })
  } catch (error) {
    console.error('[billing] run mislukt:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Onbekende fout' },
      { status: 500 },
    )
  }
}

/** Vercel Cron doet een GET. */
export async function GET(request: Request) {
  return handle(request)
}

/** POST voor handmatig aanroepen, bijvoorbeeld met curl. */
export async function POST(request: Request) {
  return handle(request)
}
