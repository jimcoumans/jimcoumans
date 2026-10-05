/* -------------------------------------------------------------------------
   Elk uur de performancecijfers bijwerken.

   Rechtstreeks op de database en de bronnen, net als de abonnementsrun: de
   site zelf zit achter de Netlify-login. Een geplande functie mag 30
   seconden draaien; de sync stopt na 20 en gaat het volgende uur verder bij
   de koppeling die het langst niet is bijgewerkt.
   ------------------------------------------------------------------------- */

import { syncAlles } from '../../src/lib/performance/sync'

export default async function handler(): Promise<Response> {
  try {
    const uit = await syncAlles({ budgetMs: 20000 })
    const mis = uit.filter((u) => !u.ok)
    console.log(`[performance] ${uit.length} koppelingen bijgewerkt, ${mis.length} met een fout`)
    for (const m of mis) console.error(`[performance] ${m.klant} (${m.bron}): ${m.melding}`)
    // Een fout bij één klant (geen toegang) is geen reden om de functie als
    // mislukt te markeren; die staat bij de koppeling in het portaal.
    return new Response(`${uit.length} bijgewerkt`, { status: 200 })
  } catch (error) {
    console.error('[performance] run mislukt:', error)
    return new Response('Run mislukt', { status: 500 })
  }
}

export const config: { schedule: string } = {
  schedule: '17 * * * *',
}
