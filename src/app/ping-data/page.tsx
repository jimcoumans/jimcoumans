import { AppShell } from '@/components/AppShell'
import type { SessionUser } from '@/lib/auth'

/**
 * Het ontbrekende vakje: een PAGINA die queries doet.
 *
 * Wat we al weten:
 *   /ping-shell    een pagina met navigatie, zonder queries  -> werkt
 *   /api/health    queries, maar geen pagina                 -> werkt
 *   een echte pagina, allebei                                -> valt om
 *
 * Deze pagina doet allebei, maar kan niet omvallen. Elke query krijgt een
 * eigen tijdslimiet en wordt apart opgeschreven. Loopt er eentje vast, dan
 * zie je dat in de tabel in plaats van dat de hele pagina een 502 wordt.
 *
 * Er wordt met opzet GEEN sessie opgehaald. getSessionUser() doet zelf ook
 * een query, en als die het probleem is wil je dat meten en niet erover
 * struikelen voordat de meting begint.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 26

const STAP_MS = 4000
/**
 * Hoe lang de hele meting mag duren.
 *
 * Elke stap een budget geven is niet genoeg: veertien stappen van vier
 * seconden is zesenvijftig seconden, en dan loopt de meetpagina alsnog over
 * maxDuration heen en geeft hij zelf een 502. Precies de fout die hij moest
 * verklaren.
 */
const TOTAAL_MS = 18000

let meetBegin = Date.now()

const NEP_GEBRUIKER = {
  id: 'ping',
  email: 'ping@jamesrobinson.nl',
  role: 'admin',
  organizationId: null,
  organization: null,
} as unknown as SessionUser

type Meting = { naam: string; ok: boolean; duurMs: number; fout?: string }

function metBudget<T>(belofte: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    belofte,
    new Promise<never>((_, weiger) =>
      setTimeout(() => weiger(new Error(`opgegeven na ${ms / 1000}s`)), ms),
    ),
  ])
}

/** De naam van de fout, niet de tekst: daar kan een hostnaam in staan. */
function korteFout(fout: unknown): string {
  if (fout instanceof Error && fout.message.startsWith('opgegeven na')) return fout.message
  const code =
    typeof fout === 'object' && fout !== null && 'code' in fout
      ? String((fout as { code: unknown }).code)
      : ''
  return code || (fout instanceof Error ? fout.name : 'onbekende fout')
}

async function meet(naam: string, doe: () => Promise<unknown>): Promise<Meting> {
  if (Date.now() - meetBegin > TOTAAL_MS) {
    return { naam, ok: false, duurMs: 0, fout: 'overgeslagen, meting was door zijn tijd heen' }
  }
  const begin = Date.now()
  try {
    await metBudget(doe(), STAP_MS)
    return { naam, ok: true, duurMs: Date.now() - begin }
  } catch (fout) {
    return { naam, ok: false, duurMs: Date.now() - begin, fout: korteFout(fout) }
  }
}

/**
 * Ruwe metingen, om onderscheid te maken tussen twee verklaringen.
 *
 * getCockpit en komendeVerjaardagen lopen allebei vast, en het zijn ook de
 * twee die de meeste queries tegelijk afvuren. Dat kan twee dingen betekenen:
 * er zit een trage query in, of meer dan een handvol queries tegelijk gaat
 * mis. Die twee vragen om een heel andere oplossing, dus ze moeten uit
 * elkaar gehaald worden in plaats van beredeneerd.
 *
 * Daarom: eerst een kale SELECT 1, dan dezelfde query twee, vijf en tien keer
 * tegelijk. Loopt de tijd op met het aantal, dan is het de verbindingspool.
 * Blijft hij gelijk en is een echte query traag, dan is het die query.
 */
async function ruweMetingen(): Promise<Meting[]> {
  const uit: Meting[] = []

  let db: typeof import('@/db').db
  let sql: typeof import('drizzle-orm').sql
  try {
    ;({ db } = await import('@/db'))
    ;({ sql } = await import('drizzle-orm'))
  } catch (fout) {
    return [{ naam: 'db laden', ok: false, duurMs: 0, fout: korteFout(fout) }]
  }

  const een = () => db.execute(sql`SELECT 1 AS x`)

  uit.push(await meet('1x SELECT 1', () => een()))
  uit.push(await meet('2x SELECT 1 tegelijk', () => Promise.all([een(), een()])))
  uit.push(
    await meet('5x SELECT 1 tegelijk', () => Promise.all(Array.from({ length: 5 }, een))),
  )
  uit.push(
    await meet('10x SELECT 1 tegelijk', () => Promise.all(Array.from({ length: 10 }, een))),
  )

  // De tellingen uit getCockpit, los. Kleine tabellen, dus als deze traag is
  // ligt het niet aan de hoeveelheid gegevens.
  uit.push(
    await meet('telling organisaties', () =>
      db.execute(sql`
        SELECT COUNT(*) AS totaal,
               COUNT(*) FILTER (WHERE status = 'client') AS klanten
        FROM organizations
      `),
    ),
  )

  // De join die ik aan komendeVerjaardagen heb toegevoegd.
  uit.push(
    await meet('verjaardagen van partners', () =>
      db.execute(sql`
        SELECT c.id FROM contacts c
        JOIN partners p ON p.id = c.partner_id
        WHERE c.birth_day IS NOT NULL AND c.birth_month IS NOT NULL
      `),
    ),
  )

  return uit
}

export default async function PingDataPagina() {
  meetBegin = Date.now()
  const metingen: Meting[] = []

  // Eerst het laden van de modules zelf. Als een van deze niet in de
  // functiebundel zit, valt een echte pagina daarop om nog voordat er een
  // query draait — en dan zoek je je scheel in de queries.
  const laadBegin = Date.now()
  let libs: Record<string, unknown> | null = null
  try {
    const [auth, reports, billing, quotes, admin, cockpit, verjaardagen] = await Promise.all([
      import('@/lib/auth'),
      import('@/lib/reports'),
      import('@/lib/billing'),
      import('@/lib/quotes'),
      import('@/lib/admin'),
      import('@/lib/cockpit'),
      import('@/lib/verjaardagen'),
    ])
    libs = { auth, reports, billing, quotes, admin, cockpit, verjaardagen }
    metingen.push({ naam: 'modules laden', ok: true, duurMs: Date.now() - laadBegin })
  } catch (fout) {
    metingen.push({
      naam: 'modules laden',
      ok: false,
      duurMs: Date.now() - laadBegin,
      fout: korteFout(fout),
    })
  }

  if (libs) {
    const auth = libs.auth as typeof import('@/lib/auth')
    const reports = libs.reports as typeof import('@/lib/reports')
    const billing = libs.billing as typeof import('@/lib/billing')
    const quotes = libs.quotes as typeof import('@/lib/quotes')
    const admin = libs.admin as typeof import('@/lib/admin')
    const cockpit = libs.cockpit as typeof import('@/lib/cockpit')
    const verjaardagen = libs.verjaardagen as typeof import('@/lib/verjaardagen')

    // getSessionUser eerst: dit is wat ELKE pagina als eerste doet.
    metingen.push(await meet('getSessionUser', () => auth.getSessionUser()))
    metingen.push(await meet('getOverallFigures', () => reports.getOverallFigures()))
    metingen.push(await meet('getMonthlyRecurringCents', () => billing.getMonthlyRecurringCents()))
    metingen.push(await meet('getQuoteFigures', () => quotes.getQuoteFigures()))
    metingen.push(await meet('listOrganizations', () => admin.listOrganizations()))
    metingen.push(await meet('getCockpit', () => cockpit.getCockpit()))
    metingen.push(await meet('komendeVerjaardagen', () => verjaardagen.komendeVerjaardagen(7)))
  }

  const ruw = await ruweMetingen()

  const traagste = metingen.filter((m) => m.ok).sort((a, b) => b.duurMs - a.duurMs)[0]
  const totaal = metingen.reduce((a, m) => a + m.duurMs, 0)

  return (
    <AppShell user={NEP_GEBRUIKER} actief="dashboard" breed>
      <h1 className="text-jr-blue mb-1 text-2xl">Meting: pagina met queries</h1>
      <p className="mb-5 text-sm text-gray-600">
        Elke stap heeft een eigen tijdslimiet van {STAP_MS / 1000} seconden, dus deze pagina
        kan niet omvallen. Samen {totaal} ms
        {traagste && ` · traagste: ${traagste.naam} (${traagste.duurMs} ms)`}.
      </p>

      <Tabel titel="Wat het dashboard doet" rijen={metingen} />

      <h2 className="mt-8 mb-1 text-base">Ruwe metingen</h2>
      <p className="mb-3 text-sm text-gray-600">
        Loopt de tijd op met het aantal queries tegelijk, dan is het de verbindingspool.
        Blijft die gelijk en is een losse query traag, dan is het die query.
      </p>
      <Tabel titel="Ruw" rijen={ruw} />
    </AppShell>
  )
}

function Tabel({ titel, rijen }: { titel: string; rijen: Meting[] }) {
  return (
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm" aria-label={titel}>
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-600">
              <th className="px-4 py-2.5 font-normal">Stap</th>
              <th className="px-4 py-2.5 font-normal">Duur</th>
              <th className="px-4 py-2.5 font-normal">Uitkomst</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rijen.map((m) => (
              <tr key={m.naam}>
                <td className="px-4 py-2.5">{m.naam}</td>
                <td className="tabular px-4 py-2.5">{m.duurMs} ms</td>
                <td className={`px-4 py-2.5 ${m.ok ? 'text-gray-600' : 'text-jr-red'}`}>
                  {m.ok ? 'goed' : (m.fout ?? 'fout')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  )
}
