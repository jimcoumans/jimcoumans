import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { connectionOptionsFor, readConnectionString } from './connection-options'

/* -------------------------------------------------------------------------
   De verbinding wordt pas opgebouwd bij de eerste query, niet bij het laden
   van deze module.

   Dat lijkt een detail maar het is het verschil tussen een leesbare fout en
   een dode site. Vrijwel elke pagina importeert deze module, ook /login, die
   de database niet eens nodig heeft om zijn formulier te tonen. Gooide dit
   bestand bij het laden een fout omdat DATABASE_URL ontbreekt of niet klopt,
   dan viel elke route om nog voordat er een regel paginacode draaide. De
   bezoeker kreeg dan een kale 502 van de gateway: geen melding, geen
   aanwijzing, niets.

   Nu blijft de fout staan waar hij hoort. Een pagina die de database nodig
   heeft krijgt hem te zien, met de uitleg uit readConnectionString erbij, en
   /api/health kan precies vertellen wat er mankeert.
   ------------------------------------------------------------------------- */

/**
 * Eén verbindingspool per proces, ook in productie.
 *
 * In development wordt deze module bij elke hot reload opnieuw geladen; zonder
 * cache loopt de pool dan vol. In productie speelt hetzelfde, maar erger. Elke
 * serverless functie die opstart laadt deze module opnieuw, en er draaien er
 * bij drukte tientallen tegelijk. Zonder cache opent elk van die instanties
 * zijn eigen verbindingen, en die tellen allemaal mee bij de database.
 */
const globalForDb = globalThis as unknown as {
  jrWalletClient?: ReturnType<typeof postgres>
}

/**
 * Eén verbinding. Niet twee, niet tien.
 *
 * Dit getal is gemeten en niet bedacht. Op de live omgeving:
 *
 *     1 query                  99 ms
 *     2 queries tegelijk      591 ms
 *     5 queries tegelijk      loopt vast
 *    10 queries tegelijk      loopt vast
 *
 * Het ging om SELECT 1 — het simpelste wat een database kan doen. Het is dus
 * niet de query en niet de hoeveelheid gegevens: deze database accepteert
 * simpelweg geen handvol gelijktijdige verbindingen. Een tweede verbindng
 * opzetten kost al een halve seconde, bij vijf blijft het hangen tot de
 * functie wordt afgekapt en de bezoeker een 502 krijgt.
 *
 * Met één verbinding staan alle queries netjes in de rij. Zestien queries van
 * honderd milliseconde is anderhalve seconde: trager dan parallel zou zijn
 * als parallel werkte, en oneindig veel sneller dan een pagina die omvalt.
 *
 * Dit is ook gewoon hoe het hoort bij serverless. Een functie-instantie
 * behandelt één verzoek tegelijk, dus meer dan één verbinding per instantie
 * levert niets op behalve druk op de database — vermenigvuldigd met het
 * aantal instanties dat tegelijk draait.
 *
 * Wil je hier ooit boven: dat kan alleen met een pooler ertussen die er wél
 * tegen kan (Supabase noemt dat de transaction pooler, poort 6543). Zet dat
 * getal niet omhoog zonder eerst opnieuw te meten.
 */
const MAX_VERBINDINGEN = 1

function maakClient(): ReturnType<typeof postgres> {
  const bestaand = globalForDb.jrWalletClient
  if (bestaand) return bestaand

  // Nakijken voordat postgres-js het doet: die gooit bij een kapotte string
  // een kale "Invalid URL" met de waarde gemaskeerd, en dan weet je nog niets.
  const connectionString = readConnectionString(process.env.DATABASE_URL)
  const opties = connectionOptionsFor(connectionString, {
    DATABASE_PREPARE: process.env.DATABASE_PREPARE,
  })

  const nieuw = postgres(connectionString, {
    max: MAX_VERBINDINGEN,
    // Serverless: verbindingen niet eeuwig openhouden.
    idle_timeout: 20,
    connect_timeout: 10,
    // Een verbinding die uren blijft hangen achter een pooler is een
    // verbinding die niemand meer opruimt. Na een uur opnieuw opbouwen.
    max_lifetime: 60 * 60,
    // Zie connection-options.ts: een pooler in transactiemodus (Supabase)
    // kan geen prepared statements aan.
    prepare: opties.prepare,
  })

  globalForDb.jrWalletClient = nieuw
  return nieuw
}

/**
 * De client en db worden doorgegeven als proxy.
 *
 * Zo blijft `import { db } from '@/db'` werken zoals het altijd deed, terwijl
 * de verbinding pas wordt opgebouwd op het moment dat er iets mee gebeurt.
 * Een proxy die bij elke aanraking maakClient() aanroept is goedkoop: na de
 * eerste keer komt hij uit globalForDb.
 */
function luiDoor<T extends object>(maak: () => T): T {
  return new Proxy({} as T, {
    get(_doel, sleutel, ontvanger) {
      const echt = maak() as T
      const waarde = Reflect.get(echt, sleutel, ontvanger)
      // Methodes moeten hun eigen object als `this` houden, niet de proxy.
      return typeof waarde === 'function' ? waarde.bind(echt) : waarde
    },
    has: (_doel, sleutel) => Reflect.has(maak() as object, sleutel),
    apply: (_doel, _dit, args) =>
      (maak() as unknown as (...a: unknown[]) => unknown)(...args),
  })
}

export const client = luiDoor(maakClient)
export const db = luiDoor(() => drizzle(maakClient(), { schema }))
export * from './schema'
