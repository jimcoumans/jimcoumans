/**
 * Een pagina zonder iets.
 *
 * Geen database, geen AppShell, geen clientcomponent. Alleen serverkant HTML.
 *
 * Waarom dit bestaat: /api/health werkt wel en pagina's niet. Het verschil
 * tussen die twee is niet de database — dat is bewezen — maar het renderen
 * van een pagina. Deze pagina sluit dat in: doet hij het, dan ligt het aan
 * iets wat een echte pagina extra doet. Doet hij het niet, dan is het de
 * paginarendering zelf en heeft zoeken in queries geen zin.
 */
export const dynamic = 'force-dynamic'

export default function PingPagina() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Ping</h1>
      <p>Deze pagina haalt niets op en gebruikt geen clientcomponent.</p>
      <p>Tijd op de server: {new Date().toISOString()}</p>
    </main>
  )
}
