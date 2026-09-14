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

/** Tekens die een connection string onparseerbaar maken, met hun vervanging. */
const STUKMAKERS: { teken: string; encoded: string }[] = [
  { teken: '#', encoded: '%23' },
  { teken: '/', encoded: '%2F' },
  { teken: '?', encoded: '%3F' },
]

/**
 * Zoekt in het wachtwoordgedeelte naar tekens die de parser laten struikelen.
 *
 * Het wachtwoord staat tussen de eerste dubbele punt na het schema en de
 * laatste apenstaart. Een apenstaart IN het wachtwoord mag namelijk wel;
 * daar struikelt de parser niet over.
 */
function kapotteTekensIn(connectionString: string): { teken: string; encoded: string }[] {
  const naSchema = connectionString.indexOf('://')
  const laatsteAt = connectionString.lastIndexOf('@')
  if (naSchema === -1 || laatsteAt === -1 || laatsteAt < naSchema) return []

  const inloggedeelte = connectionString.slice(naSchema + 3, laatsteAt)
  return STUKMAKERS.filter((s) => inloggedeelte.includes(s.teken))
}

/**
 * Leest DATABASE_URL na en geeft hem schoon terug.
 *
 * Waarom dit bestaat: postgres-js gooit bij een kapotte string een kale
 * `TypeError: Invalid URL` met de waarde gemaskeerd als `****`. Die fout komt
 * uit de diepte van de module, noemt DATABASE_URL niet eens en zegt al
 * helemaal niet welk teken het probleem is. Dan zoek je een uur naar iets
 * wat in tien seconden op te lossen is.
 *
 * Let op wat hier NIET gecontroleerd wordt: of de database bestaat of het
 * wachtwoord klopt. Dat blijkt pas bij de eerste query, en dat hoort ook:
 * een bouwstap die een database nodig heeft is een bouwstap die stukgaat als
 * de database even weg is.
 */
export function readConnectionString(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === '') {
    throw new Error(
      'DATABASE_URL ontbreekt. Zet de connection string van je database in de omgevingsvariabelen. Zie SETUP.md.',
    )
  }

  // Plakken uit een .env-veld laat vaak een spatie of regeleinde achter.
  const schoon = raw.trim()

  if (!/^postgres(ql)?:\/\//.test(schoon)) {
    throw new Error(
      'DATABASE_URL begint niet met postgresql:// — dit lijkt geen connection string van een Postgres-database.',
    )
  }

  // De plaatshouder van Supabase. Deze string is technisch geldig, dus de
  // parser klaagt niet; je krijgt dan een inlogfout die nergens op slaat.
  if (schoon.includes('[YOUR-PASSWORD]') || schoon.includes('[YOUR_PASSWORD]')) {
    throw new Error(
      'In DATABASE_URL staat nog [YOUR-PASSWORD]. Vervang dat, inclusief de blokhaken, door je echte databasewachtwoord.',
    )
  }

  try {
    new URL(schoon)
  } catch {
    const gevonden = kapotteTekensIn(schoon)

    if (gevonden.length > 0) {
      const lijst = gevonden.map((g) => `${g.teken} wordt ${g.encoded}`).join(', ')
      throw new Error(
        `In je databasewachtwoord staan tekens die in een connection string een eigen betekenis hebben: ${gevonden
          .map((g) => g.teken)
          .join(' en ')}. Schrijf ze om (${lijst}), of kies bij je database een wachtwoord met alleen letters en cijfers.`,
      )
    }

    throw new Error(
      'DATABASE_URL is geen geldige connection string. Controleer of hij compleet is overgenomen, van postgresql:// tot en met de databasenaam aan het eind.',
    )
  }

  return schoon
}

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
