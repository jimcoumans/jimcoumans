/* -------------------------------------------------------------------------
   Verbindingsinstellingen die per database verschillen.

   De app praat gewoon Postgres, dus hij draait op Neon, Supabase, een eigen
   server of Docker. Eén ding verschilt wel: een pooler in transactiemodus
   (Supabase draait die op poort 6543) kan geen prepared statements aan. Laat
   je die aanstaan, dan werkt alles tot de tweede keer dat dezelfde query
   langskomt en krijg je "prepared statement already exists" — een fout die
   pas onder druk opduikt en dan niet te plaatsen is.

   Daarom kijken we hier één keer naar de connection string en zetten we ze
   uit waar dat moet, in plaats van dat overal in de queries te regelen.
   ------------------------------------------------------------------------- */

export type ConnectionOptions = {
  prepare: boolean
  /** Waarom die keuze is gemaakt; komt in de opstartlog terecht. */
  reason: string
}

/**
 * Kijkt of deze connection string via een pooler in transactiemodus loopt.
 *
 * Supabase geeft je twee strings: de directe (poort 5432) en die van de
 * pooler (poort 6543, host `...pooler.supabase.com`). Voor een app die
 * serverless draait wil je de pooler, want die houdt de verbindingen bij
 * elkaar in plaats van dat elke functie er zelf een opent.
 */
export function usesTransactionPooler(connectionString: string): boolean {
  let url: URL
  try {
    url = new URL(connectionString)
  } catch {
    return false
  }

  if (url.port === '6543') return true
  if (url.hostname.includes('pooler.supabase.com')) return true
  // PgBouncer wordt soms met een vlag in de string aangekondigd.
  const flag = url.searchParams.get('pgbouncer')
  return flag === 'true' || flag === '1'
}

/**
 * De opties voor deze database.
 *
 * `DATABASE_PREPARE=false` zet prepared statements handmatig uit, voor een
 * pooler die we niet herkennen. Aanzetten kan niet: een pooler die ze niet
 * ondersteunt, ondersteunt ze ook niet als jij dat graag wilt.
 */
export function connectionOptionsFor(
  connectionString: string,
  env: { DATABASE_PREPARE?: string | undefined } = {},
): ConnectionOptions {
  if (env.DATABASE_PREPARE === 'false') {
    return { prepare: false, reason: 'uitgezet met DATABASE_PREPARE=false' }
  }
  if (usesTransactionPooler(connectionString)) {
    return { prepare: false, reason: 'pooler in transactiemodus herkend' }
  }
  return { prepare: true, reason: 'directe verbinding' }
}
