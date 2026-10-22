/* -------------------------------------------------------------------------
   Een check starten vanuit de browser.

   De browser start de achtergrondfunctie en niet de server, omdat de site
   achter de Netlify-login zit: de browser komt erdoor, een serverfunctie
   niet. Lokaal (next dev) bestaat de achtergrondfunctie niet; dan voert een
   gewone route de check hier en nu uit. Daar wachten we niet op: de pagina
   van de check ververst zichzelf tot hij klaar is.
   ------------------------------------------------------------------------- */

export async function startCheck(id: string): Promise<string | null> {
  const start = await fetch('/.netlify/functions/uiting-check-background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (start.status === 404) {
    void fetch(`/api/checks/${id}/uitvoeren`, { method: 'POST' }).catch(() => {})
    return null
  }
  if (!start.ok) return `De check kon niet starten (fout ${start.status}). Probeer het opnieuw.`
  return null
}
