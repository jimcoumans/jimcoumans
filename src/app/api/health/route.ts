import { NextResponse } from 'next/server'

/* -------------------------------------------------------------------------
   Het meetpunt.

   Als het portaal een 502 geeft weet je niets. De serverfunctie is omgevallen
   en de bezoeker krijgt een kale foutpagina van de gateway; wat er misging
   staat hooguit in een log dat je moet opzoeken.

   Deze route beantwoordt in één klik de vraag "wat mankeert eraan". Het
   belangrijkste ontwerpdetail staat hieronder: er wordt NIETS uit @/db
   geïmporteerd bovenaan dit bestand. Dat is met opzet.

   Waarom dat uitmaakt: src/db/index.ts leest DATABASE_URL zodra de module
   wordt geladen, en vrijwel elke pagina importeert die module. Klopt die
   variabele niet in de draaiende omgeving, dan struikelt elke route nog
   voordat er een regel van jouw code draait — ook /login, die de database
   helemaal niet nodig heeft. Zou deze route @/db bovenaan importeren, dan
   zou hij precies dan omvallen waarop je hem nodig hebt.

   Wat hier NIET in staat: waarden van omgevingsvariabelen, de connection
   string, foutmeldingen die een hostnaam of gebruikersnaam kunnen bevatten.
   Alleen of iets er is en of het antwoord geeft. De namen zelf staan al in
   SETUP.md, dus daar zit geen geheim in.
   ------------------------------------------------------------------------- */

export const dynamic = 'force-dynamic'

/** Wat er moet staan wil het portaal überhaupt kunnen draaien. */
const VERPLICHT = ['DATABASE_URL', 'AUTH_SECRET'] as const

/** Wat optioneel is; het ontbreken hiervan zet een functie uit, meer niet. */
const OPTIONEEL = [
  { naam: 'RESEND_API_KEY', zonder: 'Er kunnen geen inloglinks worden gemaild.' },
  { naam: 'MAIL_FROM', zonder: 'Mail wordt verstuurd vanaf het standaardadres.' },
  { naam: 'APP_URL', zonder: 'Links in mails kunnen naar het verkeerde adres wijzen.' },
  { naam: 'CRON_SECRET', zonder: 'De dagelijkse abonnementsrun staat op slot.' },
  { naam: 'CLICKUP_API_TOKEN', zonder: 'De ClickUp-sync kan niet draaien.' },
] as const

/**
 * Van een databasefout naar iets waar je wat aan hebt.
 *
 * De ruwe melding wordt niet doorgegeven: daar kan een hostnaam of een
 * gebruikersnaam in staan, en dit is een open adres. De code zelf zegt
 * genoeg, en die is niet geheim.
 */
function verklaar(fout: unknown): { code: string; uitleg: string } {
  // Drizzle verpakt de fout van de driver in een eigen fout, dus de code die
  // je zoekt zit een of twee lagen dieper in `cause`. Zonder die keten uit te
  // lopen krijg je altijd "onbekend" en zeg je dus nooit iets nuttigs.
  let code = ''
  let laag: unknown = fout
  for (let i = 0; i < 5 && laag !== null && laag !== undefined; i += 1) {
    if (typeof laag === 'object' && 'code' in laag) {
      const gevonden = (laag as { code: unknown }).code
      if (typeof gevonden === 'string' && gevonden !== '') {
        code = gevonden
        break
      }
    }
    laag = typeof laag === 'object' && 'cause' in laag ? (laag as { cause: unknown }).cause : null
  }

  switch (code) {
    case 'ECONNREFUSED':
      return { code, uitleg: 'De database weigert de verbinding. Draait hij, en klopt de poort?' }
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return { code, uitleg: 'De hostnaam uit DATABASE_URL is niet te vinden. Controleer of hij compleet is overgenomen.' }
    case 'ETIMEDOUT':
    case 'CONNECT_TIMEOUT':
      return { code, uitleg: 'De database antwoordt niet op tijd. Vaak betekent dat: verkeerde poort, of de verbindingslimiet is vol.' }
    case '28P01':
      return { code, uitleg: 'Het wachtwoord in DATABASE_URL wordt niet geaccepteerd.' }
    case '3D000':
      return { code, uitleg: 'De database uit DATABASE_URL bestaat niet.' }
    case '53300':
      return { code, uitleg: 'Te veel verbindingen. De pooler zit vol.' }
    default:
      return {
        code: code || 'onbekend',
        uitleg: 'De database geeft een fout die hier niet apart wordt herkend. Kijk in het log van Netlify.',
      }
  }
}

export async function GET(request: Request) {
  const start = Date.now()
  // Met ?diep=1 worden ook de queries van het dashboard gedraaid. Dat is
  // trager, dus niet standaard; maar als een pagina omvalt terwijl de
  // database bereikbaar is, is dit precies wat je wilt weten.
  const diep = new URL(request.url).searchParams.get('diep') === '1'

  const ontbreekt = VERPLICHT.filter((naam) => {
    const waarde = process.env[naam]
    return waarde === undefined || waarde.trim() === ''
  })

  const optioneelUit = OPTIONEEL.filter(({ naam }) => {
    const waarde = process.env[naam]
    return waarde === undefined || waarde.trim() === ''
  }).map(({ naam, zonder }) => ({ naam, gevolg: zonder }))

  // Zonder DATABASE_URL heeft proberen geen zin, en importeren zou hier de
  // fout opleveren die we juist willen melden.
  if (ontbreekt.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        probleem: 'omgevingsvariabelen',
        ontbreekt,
        uitleg:
          'Deze variabelen staan niet in de draaiende omgeving. Zet ze in Netlify onder Site configuration, Environment variables, en let op dat ze ook voor Functions aan staan. Daarna opnieuw deployen: een omgevingsvariabele wordt bij de bouw meegegeven.',
        optioneelUit,
      },
      { status: 503 },
    )
  }

  // Pas hier laden. Gaat dit mis, dan is dat precies de informatie die we
  // zoeken, en niet een 502 waar niemand iets aan heeft.
  try {
    const { db } = await import('@/db')
    const { sql } = await import('drizzle-orm')

    const rijen = await db.execute(
      sql`SELECT COUNT(*)::int AS aantal FROM "drizzle"."__drizzle_migrations"`,
    )
    const eerste = (rijen as unknown as { aantal: number }[])[0]

    const antwoord: Record<string, unknown> = {
      ok: true,
      database: 'bereikbaar',
      migraties: eerste?.aantal ?? 0,
      duurMs: Date.now() - start,
      optioneelUit,
    }

    if (diep) {
      const stappen = await draaiDashboardQueries()
      antwoord.stappen = stappen
      antwoord.ok = stappen.every((s) => s.ok)
    }

    return NextResponse.json(antwoord, { status: antwoord.ok ? 200 : 503 })
  } catch (fout) {
    const { code, uitleg } = verklaar(fout)
    return NextResponse.json(
      {
        ok: false,
        probleem: 'database',
        code,
        uitleg,
        duurMs: Date.now() - start,
        optioneelUit,
      },
      { status: 503 },
    )
  }
}


/**
 * Draait wat het dashboard draait, maar stap voor stap.
 *
 * Het dashboard vuurt tien queries tegelijk af met Promise.all. Valt daar
 * eentje van om, dan valt de hele pagina om en zie je niet welke. Hier wordt
 * elke stap apart geprobeerd en apart gerapporteerd, plus een ronde waarin ze
 * wel naast elkaar lopen. Als het los goed gaat en samen niet, dan zit het in
 * het aantal verbindingen en niet in de query.
 */
async function draaiDashboardQueries(): Promise<
  { naam: string; ok: boolean; duurMs: number; code?: string; uitleg?: string }[]
> {
  const reports = await import('@/lib/reports')
  const billing = await import('@/lib/billing')
  const quotes = await import('@/lib/quotes')
  const admin = await import('@/lib/admin')
  const cockpit = await import('@/lib/cockpit')
  const verjaardagen = await import('@/lib/verjaardagen')

  const taken: { naam: string; doe: () => Promise<unknown> }[] = [
    { naam: 'getOverallFigures', doe: () => reports.getOverallFigures() },
    { naam: 'getMonthlyRecurringCents', doe: () => billing.getMonthlyRecurringCents() },
    { naam: 'getMonthlyBudgetCents', doe: () => billing.getMonthlyBudgetCents() },
    { naam: 'getQuoteFigures', doe: () => quotes.getQuoteFigures() },
    { naam: 'listQuotes', doe: () => quotes.listQuotes() },
    { naam: 'listSubscriptions', doe: () => billing.listSubscriptions() },
    { naam: 'getOutstandingInvoices', doe: () => reports.getOutstandingInvoices() },
    { naam: 'listOrganizations', doe: () => admin.listOrganizations() },
    { naam: 'getFiguresByOrganization', doe: () => reports.getFiguresByOrganization() },
    { naam: 'getCockpit', doe: () => cockpit.getCockpit() },
    { naam: 'komendeVerjaardagen', doe: () => verjaardagen.komendeVerjaardagen(7) },
  ]

  const uitkomst: {
    naam: string
    ok: boolean
    duurMs: number
    code?: string
    uitleg?: string
  }[] = []

  for (const taak of taken) {
    const begin = Date.now()
    try {
      await taak.doe()
      uitkomst.push({ naam: taak.naam, ok: true, duurMs: Date.now() - begin })
    } catch (fout) {
      const { code, uitleg } = verklaar(fout)
      uitkomst.push({ naam: taak.naam, ok: false, duurMs: Date.now() - begin, code, uitleg })
    }
  }

  // En nu allemaal tegelijk, zoals de pagina het doet.
  const begin = Date.now()
  try {
    await Promise.all(taken.map((t) => t.doe()))
    uitkomst.push({ naam: 'alles tegelijk', ok: true, duurMs: Date.now() - begin })
  } catch (fout) {
    const { code, uitleg } = verklaar(fout)
    uitkomst.push({
      naam: 'alles tegelijk',
      ok: false,
      duurMs: Date.now() - begin,
      code,
      uitleg,
    })
  }

  return uitkomst
}
