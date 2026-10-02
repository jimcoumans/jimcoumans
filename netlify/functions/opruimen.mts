/* -------------------------------------------------------------------------
   De dagelijkse opruimtaak op Netlify.

   Wist sollicitatiegegevens waarvan de bewaartermijn om is. Apart van de
   abonnementsrun, want wissen en factureren zijn twee losse beloftes: gaat
   het factureren stuk, dan moet het wissen gewoon doorgaan.

   Net als de abonnementsrun draait dit rechtstreeks op de database en niet
   via het publieke adres: dat zit achter de Netlify-login, waar een geplande
   functie niet doorheen komt.

   Draait om 5:00, een uur voor het factureren.
   ------------------------------------------------------------------------- */

import { wisVerlopenKandidaten } from '../../src/lib/werving'

export default async function handler(): Promise<Response> {
  try {
    const rapport = await wisVerlopenKandidaten()
    // Alleen het aantal in het log: wie er gewist is, hoort niet maandenlang
    // in een logbestand te blijven staan.
    console.log(`[opruimen] ${rapport.gewist} verlopen kandidaten gewist.`)
    return new Response(`${rapport.gewist} gewist`, { status: 200 })
  } catch (error) {
    console.error('[opruimen] run mislukt:', error)
    return new Response('Run mislukt', { status: 500 })
  }
}

export const config: { schedule: string } = {
  schedule: '0 5 * * *',
}
