/* -------------------------------------------------------------------------
   De dagelijkse opruimtaak op Netlify.

   Wist sollicitatiegegevens waarvan de bewaartermijn om is. Apart van de
   abonnementsrun, want wissen en factureren zijn twee losse beloftes: gaat
   het factureren stuk, dan moet het wissen gewoon doorgaan.

   Draait om 5:00, een uur voor het factureren. Zo is het opruimen klaar
   voordat de drukke run begint.
   ------------------------------------------------------------------------- */

export default async function handler(): Promise<Response> {
  const geheim = process.env.CRON_SECRET
  const basis = process.env.URL ?? process.env.DEPLOY_PRIME_URL

  if (!geheim || geheim.length < 16) {
    // Zonder geheim gaat de deur op slot, niet open.
    console.error('[opruimen] CRON_SECRET ontbreekt of is te kort; run overgeslagen.')
    return new Response('CRON_SECRET ontbreekt', { status: 500 })
  }
  if (!basis) {
    console.error('[opruimen] geen site-URL bekend; run overgeslagen.')
    return new Response('Geen site-URL', { status: 500 })
  }

  const antwoord = await fetch(`${basis}/api/cron/opruimen`, {
    method: 'POST',
    headers: { authorization: `Bearer ${geheim}` },
  })

  const tekst = await antwoord.text()
  console.log(`[opruimen] ${antwoord.status}: ${tekst}`)

  /* Een mislukte run moet in het log als mislukt te zien zijn. Dit is de
     taak die een wettelijke termijn bewaakt; stil falen betekent dat we
     gegevens te lang bewaren zonder dat iemand het merkt. */
  return new Response(tekst, { status: antwoord.ok ? 200 : 500 })
}

export const config: { schedule: string } = {
  schedule: '0 5 * * *',
}
