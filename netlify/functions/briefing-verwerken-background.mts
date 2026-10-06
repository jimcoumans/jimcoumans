/* -------------------------------------------------------------------------
   Feedback van de klant verwerken in een campagnebriefing.

   Een achtergrondfunctie (de naam eindigt op -background): Netlify geeft
   meteen antwoord aan de browser en laat de functie tot 15 minuten draaien.
   Een gewone serverfunctie stopt na 26 seconden, en de AI heeft voor een
   hele briefing vaak een minuut of twee nodig.

   De browser roept deze functie aan nadat het portaal de verwerking heeft
   klaargezet. De functie pakt alleen een verwerking op die wacht, en maar
   één keer. Wie hem zonder het portaal aanroept, kan dus niets doen wat het
   portaal niet al had klaargezet.
   ------------------------------------------------------------------------- */

import { voerVerwerkingUit } from '../../src/lib/campagne-verwerken'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!UUID.test(id)) return new Response('Geen geldige verwerking', { status: 400 })
  try {
    const uit = await voerVerwerkingUit(id)
    if (!uit) console.log(`[briefing verwerken] ${id} wachtte niet (meer); niets gedaan`)
    else console.log(`[briefing verwerken] ${id}: ${uit.status}${uit.fout ? ` (${uit.fout})` : ''}`)
    return new Response('Klaar', { status: 200 })
  } catch (error) {
    console.error('[briefing verwerken] functie mislukt:', error)
    return new Response('Mislukt', { status: 500 })
  }
}
