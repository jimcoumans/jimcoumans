/* -------------------------------------------------------------------------
   Een uiting checken met AI.

   Een achtergrondfunctie (de naam eindigt op -background): Netlify geeft
   meteen antwoord aan de browser en laat de functie tot 15 minuten draaien.
   Een gewone serverfunctie stopt na 26 seconden; een check met een
   landingspagina erbij duurt al snel een minuut of twee.

   De browser roept deze functie aan nadat het portaal de check heeft
   klaargezet. De functie pakt alleen een check op die wacht, en maar één
   keer. Wie hem zonder het portaal aanroept, kan dus niets doen wat het
   portaal niet al had klaargezet.
   ------------------------------------------------------------------------- */

import { voerCheckUit } from '../../src/lib/uitingen-check'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!UUID.test(id)) return new Response('Geen geldige check', { status: 400 })
  try {
    const uit = await voerCheckUit(id)
    if (!uit) console.log(`[uitingen-check] ${id} wachtte niet (meer); niets gedaan`)
    else console.log(`[uitingen-check] ${id}: ${uit.status}${uit.oordeel ? ` (${uit.oordeel})` : ''}${uit.fout ? ` (${uit.fout})` : ''}`)
    return new Response('Klaar', { status: 200 })
  } catch (error) {
    console.error('[uitingen-check] functie mislukt:', error)
    return new Response('Mislukt', { status: 500 })
  }
}
