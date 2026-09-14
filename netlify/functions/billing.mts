/* -------------------------------------------------------------------------
   De dagelijkse abonnementsrun op Netlify.

   Vercel heeft cron in vercel.json; Netlify doet het met een geplande
   functie. Allebei roepen ze hetzelfde endpoint aan, zodat er één plek is
   waar het factureren gebeurt en niet twee die uit elkaar kunnen lopen.

   De run is expres elke dag en niet alleen op de tweede: hij kijkt zelf
   welke periodes nog openstaan, dus een gemiste dag wordt ingehaald in
   plaats van dat een maand wordt overgeslagen.
   ------------------------------------------------------------------------- */

export default async function handler(): Promise<Response> {
  const geheim = process.env.CRON_SECRET
  const basis = process.env.URL ?? process.env.DEPLOY_PRIME_URL

  if (!geheim || geheim.length < 16) {
    // Zonder geheim gaat de deur op slot, niet open.
    console.error('[billing] CRON_SECRET ontbreekt of is te kort; run overgeslagen.')
    return new Response('CRON_SECRET ontbreekt', { status: 500 })
  }
  if (!basis) {
    console.error('[billing] geen site-URL bekend; run overgeslagen.')
    return new Response('Geen site-URL', { status: 500 })
  }

  const antwoord = await fetch(`${basis}/api/cron/billing`, {
    method: 'POST',
    headers: { authorization: `Bearer ${geheim}` },
  })

  const tekst = await antwoord.text()
  console.log(`[billing] ${antwoord.status}: ${tekst}`)

  // Een mislukte run moet in het Netlify-log als mislukt te zien zijn,
  // anders staat er morgen nog steeds niets gefactureerd en weet niemand het.
  return new Response(tekst, { status: antwoord.ok ? 200 : 500 })
}

/**
 * Netlify leest dit object bij het uitrollen en zet de functie op dit
 * schema. Het type staat hier zelf zodat we geen pakket hoeven toe te
 * voegen voor één veld.
 */
export const config: { schedule: string } = {
  schedule: '0 6 * * *',
}
