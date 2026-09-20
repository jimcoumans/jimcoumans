/**
 * Hoeveel queries doet elk scherm, en wat kost dat live?
 *
 * Draaien met: npm run tel:queries
 *
 * Dit bestaat omdat het verschil tussen lokaal en live hier enorm is. Op een
 * database die op dezelfde machine staat kost een query bijna niets, dus een
 * pagina met negentig queries voelt lokaal snel aan. Vanaf de server is elke
 * query een netwerkronde van zo'n honderd milliseconde, en dan is diezelfde
 * pagina negen seconden bezig en wordt hij afgekapt met een 502.
 *
 * Precies dat is een keer gebeurd: het partneroverzicht deed twee queries per
 * partner, wat bij drieenveertig partners zesentachtig netwerkrondes opleverde.
 * Lokaal acht milliseconden, live onbruikbaar. Zonder tellen zie je dat niet
 * aankomen — je ziet het pas als de site eruit ligt.
 *
 * Vuistregel: onder de tien queries per scherm is prima, boven de dertig gaat
 * het pijn doen, boven de tachtig valt hij om.
 */
/** Telt hoeveel queries elke pagina doet. Lokaal draaien: npx tsx tel-queries.ts */
import { client, nulQueryTeller, queryTeller } from '../db'

const LATENTIE_MS = 99 // gemeten op de live omgeving

async function meet(naam: string, doe: () => Promise<unknown>) {
  nulQueryTeller()
  const begin = Date.now()
  try {
    await doe()
  } catch (f) {
    console.log(`${naam.padEnd(34)} FOUT: ${(f as Error).message.slice(0, 60)}`)
    return
  }
  const n = queryTeller()
  const voorspeld = (n * LATENTIE_MS) / 1000
  const vlag = voorspeld > 8 ? '  <-- OVER DE LIMIET' : voorspeld > 3 ? '  <-- riskant' : ''
  console.log(
    `${naam.padEnd(34)} ${String(n).padStart(3)} queries  ~${voorspeld.toFixed(1)}s live  (${Date.now() - begin}ms lokaal)${vlag}`,
  )
}

async function main() {
  const reports = await import('./reports')
  const billing = await import('./billing')
  const quotes = await import('./quotes')
  const admin = await import('./admin')
  const cockpit = await import('./cockpit')
  const verjaardagen = await import('./verjaardagen')
  const crmp = await import('./crm-personen')
  const crm = await import('./crm')
  const team = await import('./team')
  const portfolio = await import('./portfolio')


  console.log(`\nAantal queries per scherm, en wat dat live zou kosten bij ${LATENTIE_MS}ms per query:\n`)

  await meet('DASHBOARD (alles samen)', async () => {
    await reports.getOverallFigures()
    await billing.getMonthlyRecurringCents()
    await billing.getMonthlyBudgetCents()
    await quotes.getQuoteFigures()
    await quotes.listQuotes()
    await billing.listSubscriptions()
    await reports.getOutstandingInvoices()
    await admin.listOrganizations()
    await reports.getFiguresByOrganization()
    await cockpit.getCockpit()
    await verjaardagen.komendeVerjaardagen(7)
  })

  await meet('  - listOrganizations', () => admin.listOrganizations())
  await meet('  - getFiguresByOrganization', () => reports.getFiguresByOrganization())
  await meet('  - listSubscriptions', () => billing.listSubscriptions())
  await meet('  - listQuotes', () => quotes.listQuotes())
  await meet('  - komendeVerjaardagen', () => verjaardagen.komendeVerjaardagen(7))
  await meet('  - getCockpit', () => cockpit.getCockpit())

  console.log('')
  await meet('CRM', () => crmp.listCrmPersonen({}))
  await meet('KLANTENLIJST', async () => {
    const alle = await admin.listOrganizations()
    await crm.getFilterKeuzes()
    await crm.getCrmCounts(alle.map((k) => k.organization.id))
  })
  await meet('PARTNERS', async () => {
    await crm.listPartners()
    await quotes.getPartnerFigures()
    await crm.listOrganizationsPerPartner()
    await crmp.listContactenPerPartner()
  })
  await meet('PORTFOLIO', async () => {
    await portfolio.getPortfolioBord()
    await team.listTeam()
  })
  await meet('TEAM', async () => {
    await team.listTeam()
    await (await import('./kosten')).getPersoneelskosten()
  })

  await meet('OFFERTES', async () => {
    await quotes.listQuotes()
    await quotes.getQuoteFigures()
    await admin.listOrganizations()
    await crm.listPartners()
  })
  await meet('ABONNEMENTEN', async () => {
    await billing.listSubscriptions()
    await billing.getMonthlyRecurringCents()
    await billing.getMonthlyBudgetCents()
    await billing.getKlantAandelen()
  })
  await meet('FINANCIEEL', async () => {
    await reports.getOverallFigures()
    await reports.getFiguresByOrganization()
    await reports.getOutstandingInvoices()
  })
  await meet('KLANTPAGINA (een klant)', async () => {
    const alle = await admin.listOrganizations()
    const eerste = alle[0]
    if (!eerste) return
    const id = eerste.organization.id
    await crm.listContacts(id)
    await crm.listAccounts(id)
    await crm.listPartnersForOrganization(id)
    await (await import('./tijdlijn')).getTijdlijn(id, { limiet: 40 })
  })

  const pijplijn = await import('./pijplijn')
  await meet('PIJPLIJN', async () => {
    await pijplijn.getBord({ status: 'open' })
    await pijplijn.getScorekaart({})
    await pijplijn.listDealEigenaren()
    await pijplijn.listBedrijfsnamen()
    await team.listTeam()
  })

  const werving = await import('./werving')
  await meet('WERVING', async () => {
    await werving.getCijfers()
    await werving.listVacatures()
    await werving.getAchterstand()
    await werving.getAfvalredenen()
    await team.listTeam()
    await (await import('./salarishuis')).getHuis()
  })

  const salarishuis = await import('./salarishuis')
  await meet('SALARISHUIS', async () => {
    await salarishuis.listHuizen()
  })

  console.log('')
  await client.end()
}

main()
