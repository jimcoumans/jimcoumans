import { NextResponse } from 'next/server'
import { safeCompare } from '@/lib/auth'
import { vergeet } from '@/lib/cache'
import {
  leesSollicitatie,
  ontvangSollicitatie,
  SollicitatieError,
} from '@/lib/sollicitatie'

/**
 * Sollicitaties vanaf jamesrobinson.nl.
 *
 * Dit is het enige punt in dit systeem waar iets van buiten naar binnen
 * schrijft zonder dat er iemand is ingelogd. Alles hieronder is daarop
 * gebouwd.
 *
 * Hoe het loopt: de bezoeker vult het Elementor-formulier in op de website,
 * WordPress ontvangt dat, en WordPress post het door naar dit adres. De
 * sleutel staat in de webhook-instelling van Elementor en komt dus nooit in
 * de HTML van de site terecht - de bezoeker ziet hem niet.
 *
 * Wat het NIET doet:
 *
 * - Geen GET met inhoud. Wie dit adres in een browser plakt krijgt niets
 *   nuttigs terug, ook niet met de juiste sleutel.
 * - Geen verschil in antwoord tussen "opgeslagen", "leek een bot" en
 *   "dubbele inzending". Alle drie krijgen hetzelfde. Een afzender die aan
 *   het antwoord kan zien of hij herkend is, past zich aan.
 * - Geen details in de foutmeldingen. Een fout is een fout; wat er precies
 *   misging staat in de serverlogs en niet in het antwoord.
 *
 * Instellen in Elementor: Acties na verzenden > Webhook, met als URL
 * https://<site>/api/sollicitatie?sleutel=<SOLLICITATIE_SECRET>.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 26

function magBinnen(request: Request, url: URL): boolean {
  const geheim = process.env.SOLLICITATIE_SECRET
  /* Zonder geheim gaat de deur op slot, niet open. Een endpoint dat zonder
     sleutel werkt "omdat hij nog niet is ingesteld" is een open deur die
     niemand meer dichtdoet. */
  if (!geheim || geheim.length < 16) return false

  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ') && safeCompare(header.slice(7), geheim)) return true

  const sleutel = url.searchParams.get('sleutel')
  return sleutel !== null && safeCompare(sleutel, geheim)
}

export async function POST(request: Request) {
  const url = new URL(request.url)

  if (!magBinnen(request, url)) {
    // Geen details over waarom het misging.
    return NextResponse.json({ error: 'Geen toegang' }, { status: 401 })
  }

  let data: FormData | URLSearchParams
  try {
    const type = (request.headers.get('content-type') ?? '').toLowerCase()
    if (type.includes('application/json')) {
      // Sommige webhook-instellingen sturen JSON. Platslaan naar dezelfde
      // vorm zodat er maar één manier van uitlezen is.
      const ruw: unknown = await request.json()
      const params = new URLSearchParams()
      if (ruw && typeof ruw === 'object') {
        for (const [sleutel, waarde] of Object.entries(ruw as Record<string, unknown>)) {
          if (typeof waarde === 'string' || typeof waarde === 'number') {
            params.set(sleutel, String(waarde))
          }
        }
      }
      data = params
    } else {
      data = await request.formData()
    }
  } catch {
    console.warn('[sollicitatie] onleesbare inzending geweigerd.')
    return NextResponse.json({ error: 'Onleesbare inzending' }, { status: 400 })
  }

  const sollicitatie = leesSollicitatie(data)

  try {
    const resultaat = await ontvangSollicitatie(sollicitatie, {
      bestandsHost: process.env.SOLLICITATIE_BESTAND_HOST,
    })

    if (resultaat.status === 'opgeslagen') {
      // De lijsten kloppen niet meer.
      vergeet()
      console.log(`[sollicitatie] nieuwe kandidaat opgeslagen, cv: ${resultaat.cv}.`)
    } else {
      console.log(`[sollicitatie] inzending genegeerd (${resultaat.reden}).`)
    }

    /* Altijd hetzelfde antwoord, of het nu is opgeslagen, een bot was of een
       dubbele inzending. Wie aan het antwoord kan zien wat er gebeurde, kan
       zich daarop aanpassen. */
    return NextResponse.json({ ok: true })
  } catch (fout) {
    if (fout instanceof SollicitatieError) {
      // Wel loggen wat er mis was - dit is meestal een formulier dat
      // verkeerd staat ingesteld, en dan wil je het kunnen zien.
      console.warn(`[sollicitatie] geweigerd: ${fout.message}`)
      return NextResponse.json({ error: 'Inzending geweigerd' }, { status: 422 })
    }
    console.error('[sollicitatie] onverwachte fout:', fout)
    return NextResponse.json({ error: 'Er ging iets mis' }, { status: 500 })
  }
}

/**
 * Een GET levert niets op, ook met de juiste sleutel.
 *
 * Zou dit iets teruggeven, dan staat er een adres met een sleutel erin dat
 * je in een browser kunt plakken - en dan staat die sleutel in de
 * geschiedenis, in de logs van elke tussenliggende partij, en in het
 * klembord van wie hem doorstuurt.
 */
export async function GET() {
  return NextResponse.json({ error: 'Gebruik POST' }, { status: 405 })
}
