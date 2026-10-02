import { NextResponse } from 'next/server'
import { wisVerlopenKandidaten } from '@/lib/werving'
import { safeCompare } from '@/lib/auth'

/**
 * De dagelijkse opruimtaak.
 *
 * Nu alleen sollicitatiegegevens waarvan de bewaartermijn om is. Die moeten
 * vier weken na afloop van de procedure weg, of een jaar als de kandidaat
 * daar toestemming voor gaf.
 *
 * Waarom dit een eigen endpoint is en niet bij de abonnementsrun hangt:
 * wissen en factureren zijn twee losse beloftes. Gaat het factureren stuk,
 * dan hoort het wissen gewoon door te gaan - anders bewaren we
 * persoonsgegevens te lang omdat een factuur niet lukte, en dat is geen
 * verdediging.
 *
 * Er wordt echt gewist, niet gearchiveerd. Een archief is bewaren met een
 * ander woord ervoor.
 *
 * Beveiliging: net als bij de abonnementsrun alleen met het juiste geheim.
 * Zonder die controle kan iedereen die de URL kent gegevens laten wissen.
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

  try {
    const rapport = await wisVerlopenKandidaten()

    /* De namen staan wel in het antwoord maar niet in het log. Het log is
       er om te zien DAT de taak draait; wie er gewist is hoort niet
       maandenlang in een logbestand te blijven staan - dat is precies wat
       we net hebben opgeruimd. */
    console.log(`[opruimen] ${rapport.gewist} verlopen kandidaten gewist.`)

    return NextResponse.json({
      ok: true,
      kandidaten: { gewist: rapport.gewist, namen: rapport.namen },
    })
  } catch (error) {
    console.error('[opruimen] run mislukt:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Onbekende fout' },
      { status: 500 },
    )
  }
}

/** Een geplande taak doet een GET. */
export async function GET(request: Request) {
  return handle(request)
}

/** POST voor handmatig aanroepen, bijvoorbeeld met curl. */
export async function POST(request: Request) {
  return handle(request)
}
