/* -------------------------------------------------------------------------
   Het sein naar jamesrobinson.nl.

   De website bouwt zijn pagina's vooraf uit wat het portaal publiceert. Als
   er iets verandert (een vacature gaat open, een case wordt goedgekeurd), seint
   het portaal de website, en die bouwt alleen de geraakte pagina's opnieuw.

   Een sein mag nooit een handeling in het portaal laten mislukken: lukt het
   niet, dan staat de site hooguit even achter. Daarom geen throw, wel een log.
   ------------------------------------------------------------------------- */

/** Wat de website opnieuw opbouwt. Dezelfde namen gebruikt de website bij het ophalen. */
export type WebsiteTag = 'vacatures' | 'content'

export async function seinWebsite(tags: WebsiteTag[]): Promise<void> {
  const url = process.env.WEBSITE_REVALIDATE_URL
  const geheim = process.env.WEBSITE_REVALIDATE_SECRET
  if (!url || !geheim) return
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': geheim },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) console.warn(`[website] sein mislukt: HTTP ${res.status}`)
  } catch (e) {
    console.warn('[website] sein mislukt:', e instanceof Error ? e.name : 'onbekend')
  }
}
