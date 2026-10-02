/* -------------------------------------------------------------------------
   De dagelijkse abonnementsrun op Netlify.

   De run draait hier zelf, rechtstreeks op de database. Eerder riep deze
   functie /api/cron/billing aan via het publieke adres van de site, maar dat
   adres zit achter de Netlify-login: een mens komt erdoor, een geplande
   functie niet. De run kreeg dan elke ochtend een weigering en er werd niets
   gefactureerd, zonder dat iemand het merkte. Rechtstreeks heeft geen
   website, geen geheim en geen login nodig.

   Het endpoint /api/cron/billing blijft bestaan voor handmatig gebruik.

   De run is expres elke dag en niet alleen op de tweede: hij kijkt zelf
   welke periodes nog openstaan, dus een gemiste dag wordt ingehaald in
   plaats van dat een maand wordt overgeslagen.
   ------------------------------------------------------------------------- */

import { runBilling, vatSamenBilling } from '../../src/lib/billing'

export default async function handler(): Promise<Response> {
  try {
    const rapport = await runBilling({ apply: true })
    const samenvatting = vatSamenBilling(rapport)
    console.log(`[billing] ${samenvatting}`)
    for (const r of rapport.regels.filter((r) => r.soort === 'fout')) {
      console.error(`[billing] fout bij ${r.organizationName} (${r.period}): ${r.toelichting}`)
    }
    // Een mislukte run moet in het Netlify-log als mislukt te zien zijn,
    // anders staat er morgen nog steeds niets gefactureerd en weet niemand het.
    return new Response(samenvatting, { status: rapport.fouten === 0 ? 200 : 500 })
  } catch (error) {
    console.error('[billing] run mislukt:', error)
    return new Response('Run mislukt', { status: 500 })
  }
}

/**
 * Netlify leest dit object bij het uitrollen en zet de functie op dit
 * schema. Het type staat hier zelf zodat we geen pakket hoeven toe te
 * voegen voor één veld.
 */
export const config: { schedule: string } = {
  schedule: '0 6 * * *',
}
