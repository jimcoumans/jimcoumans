import { and, eq, sql, gte, lte, desc, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import {
  ledgerEntries,
  organizations,
  wallets,
  users,
  services,
  invoices,
} from '@/db/schema'

/* -------------------------------------------------------------------------
   Financiele overzichten: overall, per klant, per medewerker, per dienst.

   Twee dingen die overal gelden:

   1. Correcties tellen mee bij de soort boeking die ze terugdraaien. Een
      teruggedraaide besteding is geen omzet, en een teruggedraaide factuur
      is geen bijgeschreven budget. Zonder dat onderscheid staat er omzet in
      de cijfers die nooit gefactureerd is.

   2. De marge komt uit de kostprijs die OP DE BOEKING staat, niet uit de
      huidige kostprijs van de dienst. Anders verandert de marge van vorig
      kwartaal zodra iemand een inkoopprijs bijwerkt.
   ------------------------------------------------------------------------- */

/** Effectief soort: voor een correctie is dat het soort van het origineel. */
const effectiveKind = sql`COALESCE(orig.kind, ${ledgerEntries.kind})`

/** Join die het origineel van een correctie erbij haalt. */
const origJoin = sql`${ledgerEntries} AS orig`
const origOn = sql`orig.id = ${ledgerEntries.reversesEntryId}`

/**
 * Omzet van een boeking, positief. Een besteding van -100 levert 100 omzet,
 * de correctie daarop (+100) levert -100 en heft het dus op.
 */
const omzet = sql<string>`COALESCE(SUM(CASE WHEN ${effectiveKind} = 'spend' THEN -${ledgerEntries.amountCents} ELSE 0 END), 0)`

/**
 * Kosten van een boeking: aantal maal de vastgelegde kostprijs.
 * Alleen bekend bij diensten waar een kostprijs is ingevuld.
 */
const kosten = sql<string>`COALESCE(SUM(
  CASE WHEN ${effectiveKind} = 'spend' AND ${ledgerEntries.unitCostCents} IS NOT NULL
       THEN SIGN(-${ledgerEntries.amountCents}) * ROUND(${ledgerEntries.quantityHundredths} * ${ledgerEntries.unitCostCents} / 100.0)
       ELSE 0 END), 0)`

const bijgeschreven = sql<string>`COALESCE(SUM(CASE WHEN ${effectiveKind} = 'topup' THEN ${ledgerEntries.amountCents} ELSE 0 END), 0)`

export type Periode = { from?: Date; to?: Date }

function periodeCondities(periode: Periode) {
  const c = []
  if (periode.from) c.push(gte(ledgerEntries.bookedOn, periode.from))
  if (periode.to) c.push(lte(ledgerEntries.bookedOn, periode.to))
  return c
}

export type Kerncijfers = {
  /** Omzet uit geleverde diensten, in centen. */
  revenueCents: number
  /** Ingekochte of interne kosten van die diensten, in centen. */
  costCents: number
  /** Omzet minus kosten. Alleen zinvol waar kostprijzen zijn ingevuld. */
  marginCents: number
  /** Bijgeschreven budget uit facturen, in centen. */
  toppedUpCents: number
  /** Wat er nog aan budget bij klanten staat, in centen. */
  openBudgetCents: number
  /** Aantal boekingen van geleverde diensten. */
  bookingCount: number
}

/** Kerncijfers over alle klanten. */
export async function getOverallFigures(periode: Periode = {}): Promise<Kerncijfers> {
  const condities = periodeCondities(periode)

  const [row] = await db
    .select({
      revenue: omzet,
      cost: kosten,
      toppedUp: bijgeschreven,
      bookings: sql<string>`COUNT(CASE WHEN ${effectiveKind} = 'spend' AND ${ledgerEntries.kind} = 'spend' THEN 1 END)`,
    })
    .from(ledgerEntries)
    .leftJoin(origJoin, origOn)
    .where(condities.length > 0 ? and(...condities) : undefined)

  // Het openstaande budget is een stand van nu, niet iets over een periode:
  // een periodefilter zou hier een onzinnig getal geven.
  const [saldo] = await db
    .select({ total: sql<string>`COALESCE(SUM(${ledgerEntries.amountCents}), 0)` })
    .from(ledgerEntries)

  const revenueCents = Number(row?.revenue ?? 0)
  const costCents = Number(row?.cost ?? 0)

  return {
    revenueCents,
    costCents,
    marginCents: revenueCents - costCents,
    toppedUpCents: Number(row?.toppedUp ?? 0),
    openBudgetCents: Number(saldo?.total ?? 0),
    bookingCount: Number(row?.bookings ?? 0),
  }
}

export type KlantCijfers = {
  organizationId: string
  organizationName: string
  organizationSlug: string
  revenueCents: number
  costCents: number
  marginCents: number
  toppedUpCents: number
  balanceCents: number
  bookingCount: number
}

/** Omzet en marge per klant. */
export async function getFiguresByOrganization(
  periode: Periode = {},
): Promise<KlantCijfers[]> {
  const condities = periodeCondities(periode)

  const rows = await db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      revenue: omzet,
      cost: kosten,
      toppedUp: bijgeschreven,
      bookings: sql<string>`COUNT(CASE WHEN ${ledgerEntries.kind} = 'spend' THEN 1 END)`,
    })
    .from(organizations)
    .innerJoin(wallets, eq(wallets.organizationId, organizations.id))
    .innerJoin(ledgerEntries, eq(ledgerEntries.walletId, wallets.id))
    .leftJoin(origJoin, origOn)
    .where(condities.length > 0 ? and(...condities) : undefined)
    .groupBy(organizations.id, organizations.name, organizations.slug)
    .orderBy(desc(omzet))

  // Het saldo is een stand van nu en wordt daarom apart opgehaald, zonder
  // periodefilter.
  const saldi = await db
    .select({
      organizationId: wallets.organizationId,
      balance: sql<string>`COALESCE(SUM(${ledgerEntries.amountCents}), 0)`,
    })
    .from(wallets)
    .leftJoin(ledgerEntries, eq(ledgerEntries.walletId, wallets.id))
    .groupBy(wallets.organizationId)

  const saldoPerOrg = new Map(saldi.map((s) => [s.organizationId, Number(s.balance)]))

  return rows.map((r) => {
    const revenueCents = Number(r.revenue)
    const costCents = Number(r.cost)
    return {
      organizationId: r.organizationId,
      organizationName: r.organizationName,
      organizationSlug: r.organizationSlug,
      revenueCents,
      costCents,
      marginCents: revenueCents - costCents,
      toppedUpCents: Number(r.toppedUp),
      balanceCents: saldoPerOrg.get(r.organizationId) ?? 0,
      bookingCount: Number(r.bookings),
    }
  })
}

export type MedewerkerCijfers = {
  userId: string
  name: string
  email: string
  revenueCents: number
  costCents: number
  marginCents: number
  bookingCount: number
  /** Aantal klanten waarvoor deze medewerker heeft geleverd. */
  clientCount: number
}

/**
 * Omzet per medewerker, op basis van wie de dienst heeft GELEVERD
 * (delivered_by), niet wie de boeking heeft ingevoerd.
 */
export async function getFiguresByEmployee(
  periode: Periode = {},
): Promise<MedewerkerCijfers[]> {
  const condities = [isNotNull(ledgerEntries.deliveredByUserId), ...periodeCondities(periode)]

  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      revenue: omzet,
      cost: kosten,
      bookings: sql<string>`COUNT(CASE WHEN ${ledgerEntries.kind} = 'spend' THEN 1 END)`,
      clients: sql<string>`COUNT(DISTINCT ${wallets.organizationId})`,
    })
    .from(ledgerEntries)
    .innerJoin(users, eq(users.id, ledgerEntries.deliveredByUserId))
    .innerJoin(wallets, eq(wallets.id, ledgerEntries.walletId))
    .leftJoin(origJoin, origOn)
    .where(and(...condities))
    .groupBy(users.id, users.name, users.email)
    .orderBy(desc(omzet))

  return rows.map((r) => {
    const revenueCents = Number(r.revenue)
    const costCents = Number(r.cost)
    return {
      userId: r.userId,
      name: r.name ?? r.email,
      email: r.email,
      revenueCents,
      costCents,
      marginCents: revenueCents - costCents,
      bookingCount: Number(r.bookings),
      clientCount: Number(r.clients),
    }
  })
}

export type DienstCijfers = {
  serviceId: string
  name: string
  category: string | null
  revenueCents: number
  costCents: number
  marginCents: number
  quantityHundredths: number
  bookingCount: number
}

/** Omzet per dienst: welke producten leveren wat op. */
export async function getFiguresByService(
  periode: Periode = {},
): Promise<DienstCijfers[]> {
  const condities = [isNotNull(ledgerEntries.serviceId), ...periodeCondities(periode)]

  const rows = await db
    .select({
      serviceId: services.id,
      name: services.name,
      category: services.category,
      revenue: omzet,
      cost: kosten,
      quantity: sql<string>`COALESCE(SUM(CASE WHEN ${ledgerEntries.kind} = 'spend' THEN ${ledgerEntries.quantityHundredths} ELSE 0 END), 0)`,
      bookings: sql<string>`COUNT(CASE WHEN ${ledgerEntries.kind} = 'spend' THEN 1 END)`,
    })
    .from(ledgerEntries)
    .innerJoin(services, eq(services.id, ledgerEntries.serviceId))
    .leftJoin(origJoin, origOn)
    .where(and(...condities))
    .groupBy(services.id, services.name, services.category)
    .orderBy(desc(omzet))

  return rows.map((r) => {
    const revenueCents = Number(r.revenue)
    const costCents = Number(r.cost)
    return {
      serviceId: r.serviceId,
      name: r.name,
      category: r.category,
      revenueCents,
      costCents,
      marginCents: revenueCents - costCents,
      quantityHundredths: Number(r.quantity),
      bookingCount: Number(r.bookings),
    }
  })
}

export type MaandCijfers = {
  /** Eerste dag van de maand. */
  month: Date
  revenueCents: number
  toppedUpCents: number
}

/**
 * Omzet en bijgeschreven budget per maand, voor de trendgrafiek.
 *
 * Maanden zonder boekingen worden op nul gezet in plaats van weggelaten.
 * Zonder die opvulling staan maart en september naast elkaar en lijkt het
 * of er niets tussen zit, terwijl er vijf stille maanden zijn.
 */
export async function getFiguresByMonth(maanden = 12): Promise<MaandCijfers[]> {
  const rows = await db
    .select({
      month: sql<string>`DATE_TRUNC('month', ${ledgerEntries.bookedOn})`,
      revenue: omzet,
      toppedUp: bijgeschreven,
    })
    .from(ledgerEntries)
    .leftJoin(origJoin, origOn)
    .groupBy(sql`DATE_TRUNC('month', ${ledgerEntries.bookedOn})`)
    .orderBy(desc(sql`DATE_TRUNC('month', ${ledgerEntries.bookedOn})`))
    .limit(maanden)

  if (rows.length === 0) return []

  const gevonden = new Map(
    rows.map((r) => {
      const datum = new Date(r.month)
      return [
        maandSleutel(datum),
        {
          month: datum,
          revenueCents: Number(r.revenue),
          toppedUpCents: Number(r.toppedUp),
        },
      ]
    }),
  )

  const datums = [...gevonden.values()].map((v) => v.month.getTime())
  const eerste = new Date(Math.min(...datums))
  const laatste = new Date(Math.max(...datums))

  const reeks: MaandCijfers[] = []
  const loper = new Date(eerste.getFullYear(), eerste.getMonth(), 1)

  while (loper <= laatste && reeks.length < maanden * 2) {
    const sleutel = maandSleutel(loper)
    reeks.push(
      gevonden.get(sleutel) ?? {
        month: new Date(loper),
        revenueCents: 0,
        toppedUpCents: 0,
      },
    )
    loper.setMonth(loper.getMonth() + 1)
  }

  // Bij een lange stille periode zou de reeks te breed worden; alleen de
  // laatste maanden tonen.
  return reeks.slice(-maanden)
}

function maandSleutel(datum: Date): string {
  return `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}`
}

/** Openstaande facturen: gefactureerd maar niet betaald. */
export async function getOutstandingInvoices() {
  const rows = await db
    .select({
      invoice: invoices,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(invoices)
    .innerJoin(organizations, eq(organizations.id, invoices.organizationId))
    .where(sql`${invoices.status} IN ('open', 'overdue')`)
    .orderBy(invoices.dueOn)

  return rows
}
