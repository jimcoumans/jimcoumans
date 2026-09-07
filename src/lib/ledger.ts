import { and, desc, eq, sql, gte, lte, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { ledgerEntries, wallets, organizations, invoices, services, users } from '@/db/schema'
import type { LedgerEntry } from '@/db/schema'
import { lineTotalCents } from './quantity'

/* -------------------------------------------------------------------------
   Het grootboek is append-only. Deze module is de ENIGE manier waarop er
   geboekt wordt. Er is bewust geen updateEntry of deleteEntry: een fout
   corrigeer je met reverseEntry(), zodat de klant altijd kan zien wat er
   is gebeurd en waarom het saldo veranderde.

   Er is ook geen manier om een boeking voor de klant te verbergen. Het
   overzicht dat de klant ziet telt daardoor altijd exact op tot het saldo
   dat erboven staat.
   ------------------------------------------------------------------------- */

/**
 * Zet een datum uit een ruwe SQL-expressie om naar een Date.
 *
 * Let op: drizzle's sql<Date> is alleen een type-annotatie, geen conversie.
 * De driver levert bij een MAX(timestamp) een string, en TypeScript
 * vertrouwt de annotatie blind. Zonder deze functie krijg je pas in de
 * browser een "Invalid time value" te zien.
 */
function toDate(value: string | Date | null): Date | null {
  if (value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export type WalletBalance = {
  walletId: string
  /** Som van alle boekingen, in centen. Kan negatief zijn bij overschrijding. */
  balanceCents: number
  /** Alles wat is bijgeschreven, in centen (positief). */
  toppedUpCents: number
  /** Alles wat is afgeschreven, in centen (positief getal). */
  spentCents: number
  entryCount: number
  lastEntryOn: Date | null
}

/* -------------------------------------------------------------------------
   Correcties tellen mee bij de soort boeking die ze terugdraaien.

   Zonder dit onderscheid gaat het mis: een correctie op een besteding is
   een positief bedrag, en die zou dan als "bijgeschreven budget" worden
   geteld terwijl er niets is bijgeschreven. Het saldo bleef wel kloppen,
   maar de klant zag te hoge bedragen bij "bijgeschreven" en "besteed", en
   een teruggedraaide besteding bleef in de verdeling per productgroep
   staan alsof het geld wel was uitgegeven.

   Daarom kijken de totalen naar het EFFECTIEVE soort: voor een correctie
   is dat het soort van de boeking die hij terugdraait.
   ------------------------------------------------------------------------- */

/** SQL-fragment dat het effectieve soort van een boeking bepaalt. */
const effectiveKind = sql`COALESCE(orig.kind, ${ledgerEntries.kind})`

/** Saldo en totalen van één wallet. */
export async function getWalletBalance(walletId: string): Promise<WalletBalance> {
  const [row] = await db
    .select({
      balance: sql<string>`COALESCE(SUM(${ledgerEntries.amountCents}), 0)`,
      toppedUp: sql<string>`COALESCE(SUM(CASE WHEN ${effectiveKind} = 'topup' THEN ${ledgerEntries.amountCents} ELSE 0 END), 0)`,
      spent: sql<string>`COALESCE(SUM(CASE WHEN ${effectiveKind} = 'spend' THEN -${ledgerEntries.amountCents} ELSE 0 END), 0)`,
      count: sql<string>`COUNT(*)`,
      last: sql<string | null>`MAX(${ledgerEntries.bookedOn})`,
    })
    .from(ledgerEntries)
    .leftJoin(
      sql`${ledgerEntries} AS orig`,
      sql`orig.id = ${ledgerEntries.reversesEntryId}`,
    )
    .where(eq(ledgerEntries.walletId, walletId))

  return {
    walletId,
    balanceCents: Number(row?.balance ?? 0),
    toppedUpCents: Number(row?.toppedUp ?? 0),
    spentCents: Number(row?.spent ?? 0),
    entryCount: Number(row?.count ?? 0),
    lastEntryOn: toDate(row?.last ?? null),
  }
}

/** Saldi van meerdere wallets in één query, voor overzichtspagina's. */
export async function getWalletBalances(
  walletIds: string[],
): Promise<Map<string, WalletBalance>> {
  const result = new Map<string, WalletBalance>()
  if (walletIds.length === 0) return result

  const rows = await db
    .select({
      walletId: ledgerEntries.walletId,
      balance: sql<string>`COALESCE(SUM(${ledgerEntries.amountCents}), 0)`,
      toppedUp: sql<string>`COALESCE(SUM(CASE WHEN ${effectiveKind} = 'topup' THEN ${ledgerEntries.amountCents} ELSE 0 END), 0)`,
      spent: sql<string>`COALESCE(SUM(CASE WHEN ${effectiveKind} = 'spend' THEN -${ledgerEntries.amountCents} ELSE 0 END), 0)`,
      count: sql<string>`COUNT(*)`,
      last: sql<string | null>`MAX(${ledgerEntries.bookedOn})`,
    })
    .from(ledgerEntries)
    .leftJoin(
      sql`${ledgerEntries} AS orig`,
      sql`orig.id = ${ledgerEntries.reversesEntryId}`,
    )
    .where(inArray(ledgerEntries.walletId, walletIds))
    .groupBy(ledgerEntries.walletId)

  for (const id of walletIds) {
    result.set(id, {
      walletId: id,
      balanceCents: 0,
      toppedUpCents: 0,
      spentCents: 0,
      entryCount: 0,
      lastEntryOn: null,
    })
  }

  for (const row of rows) {
    result.set(row.walletId, {
      walletId: row.walletId,
      balanceCents: Number(row.balance),
      toppedUpCents: Number(row.toppedUp),
      spentCents: Number(row.spent),
      entryCount: Number(row.count),
      lastEntryOn: toDate(row.last),
    })
  }

  return result
}

export type EntryWithRunningBalance = LedgerEntry & {
  /** Saldo direct na deze boeking. Zoals op een bankafschrift. */
  runningBalanceCents: number
  invoiceNumber: string | null
  serviceName: string | null
  serviceUnit: 'piece' | 'hour' | 'month' | 'project' | null
  deliveredByName: string | null
}

/**
 * Boekingen van een wallet, nieuwste eerst, met het saldo na elke boeking.
 * Het lopende saldo wordt in de database berekend met een window function,
 * zodat het klopt ook als je maar een deel van de boekingen opvraagt.
 */
export async function getWalletEntries(
  walletId: string,
  opts: {
    limit?: number
    offset?: number
    from?: Date
    to?: Date
  } = {},
): Promise<EntryWithRunningBalance[]> {
  const { limit = 100, offset = 0, from, to } = opts

  const conditions = [eq(ledgerEntries.walletId, walletId)]
  if (from) conditions.push(gte(ledgerEntries.bookedOn, from))
  if (to) conditions.push(lte(ledgerEntries.bookedOn, to))

  // Het lopende saldo wordt over ALLE boekingen berekend, ook als je met
  // from/to een periode uitsnijdt. Zo klopt het saldo per regel met het
  // echte saldo, net als op een bankafschrift.
  const running = db.$with('running').as(
    db
      .select({
        id: ledgerEntries.id,
        runningBalance:
          sql<string>`SUM(${ledgerEntries.amountCents}) OVER (ORDER BY ${ledgerEntries.bookedOn}, ${ledgerEntries.createdAt}, ${ledgerEntries.id})`.as(
            'running_balance',
          ),
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.walletId, walletId)),
  )

  const rows = await db
    .with(running)
    .select({
      entry: ledgerEntries,
      runningBalance: running.runningBalance,
      invoiceNumber: invoices.number,
      serviceName: services.name,
      serviceUnit: services.unit,
      deliveredByName: users.name,
      deliveredByEmail: users.email,
    })
    .from(ledgerEntries)
    .innerJoin(running, eq(running.id, ledgerEntries.id))
    .leftJoin(invoices, eq(invoices.id, ledgerEntries.invoiceId))
    .leftJoin(services, eq(services.id, ledgerEntries.serviceId))
    .leftJoin(users, eq(users.id, ledgerEntries.deliveredByUserId))
    .where(and(...conditions))
    .orderBy(desc(ledgerEntries.bookedOn), desc(ledgerEntries.createdAt))
    .limit(limit)
    .offset(offset)

  return rows.map((r) => ({
    ...r.entry,
    runningBalanceCents: Number(r.runningBalance),
    invoiceNumber: r.invoiceNumber ?? null,
    serviceName: r.serviceName ?? null,
    serviceUnit: r.serviceUnit ?? null,
    // Zonder naam is het e-mailadres nog altijd beter dan niets.
    deliveredByName: r.deliveredByName ?? r.deliveredByEmail ?? null,
  }))
}

export class LedgerError extends Error {}

export type NewEntryInput = {
  walletId: string
  kind: 'topup' | 'spend'
  /** Altijd een positief bedrag in centen. Het teken volgt uit `kind`. */
  amountCents: number
  description: string
  detail?: string | null
  category?: string | null
  bookedOn?: Date
  source?: 'clickup' | 'manual' | 'invoice'
  sourceRef?: string | null
  invoiceId?: string | null
  createdByUserId?: string | null
  /* Alleen bij een boeking van een dienst uit de catalogus. */
  serviceId?: string | null
  quantityHundredths?: number | null
  unitPriceCents?: number | null
  unitCostCents?: number | null
  deliveredByUserId?: string | null
}

/**
 * Voegt een boeking toe. Het bedrag gaat er positief in; het teken wordt
 * hier bepaald op basis van het soort boeking, zodat een aanroeper zich
 * nooit kan vergissen in plus of min.
 */
export async function addEntry(input: NewEntryInput): Promise<LedgerEntry> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new LedgerError('Bedrag moet een positief aantal centen zijn.')
  }
  if (input.description.trim() === '') {
    throw new LedgerError('Een boeking heeft altijd een omschrijving nodig.')
  }

  const signed = input.kind === 'topup' ? input.amountCents : -input.amountCents

  const [entry] = await db
    .insert(ledgerEntries)
    .values({
      walletId: input.walletId,
      kind: input.kind,
      amountCents: signed,
      description: input.description.trim(),
      detail: input.detail ?? null,
      category: input.category ?? null,
      bookedOn: input.bookedOn ?? new Date(),
      source: input.source ?? 'manual',
      sourceRef: input.sourceRef ?? null,
      invoiceId: input.invoiceId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      serviceId: input.serviceId ?? null,
      quantityHundredths: input.quantityHundredths ?? null,
      unitPriceCents: input.unitPriceCents ?? null,
      unitCostCents: input.unitCostCents ?? null,
      deliveredByUserId: input.deliveredByUserId ?? null,
    })
    .returning()

  if (!entry) throw new LedgerError('Boeking kon niet worden opgeslagen.')
  return entry
}

export type ServiceEntryInput = {
  walletId: string
  serviceId: string
  /** Aantal in honderdsten: 300 is 3 stuks, 150 is 1,5 uur. */
  quantityHundredths: number
  /**
   * Afwijkend tarief in centen, bijvoorbeeld bij korting of een
   * maatwerkafspraak. Leeg laten neemt het tarief van de dienst.
   */
  unitPriceCentsOverride?: number | null
  /** Leeg laten neemt de naam van de dienst als omschrijving. */
  description?: string | null
  detail?: string | null
  bookedOn?: Date
  deliveredByUserId?: string | null
  createdByUserId?: string | null
}

/**
 * Boekt een geleverde dienst af van het budget.
 *
 * Het tarief wordt hier van de dienst GEKOPIEERD naar de boeking. Verandert
 * het tarief later, dan blijft deze boeking staan op het bedrag dat toen is
 * afgesproken. Het bedrag wordt op de server berekend uit aantal maal
 * tarief, nooit meegestuurd door de aanroeper: anders kan een verkeerd
 * bedrag het grootboek in.
 */
export async function addServiceEntry(input: ServiceEntryInput): Promise<LedgerEntry> {
  if (!Number.isInteger(input.quantityHundredths) || input.quantityHundredths <= 0) {
    throw new LedgerError('Vul een aantal groter dan nul in.')
  }

  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, input.serviceId))
    .limit(1)

  if (!service) throw new LedgerError('Deze dienst bestaat niet.')

  const unitPrice = input.unitPriceCentsOverride ?? service.unitPriceCents
  if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
    throw new LedgerError('Het tarief moet groter dan nul zijn.')
  }

  const amountCents = lineTotalCents(input.quantityHundredths, unitPrice)

  return addEntry({
    walletId: input.walletId,
    kind: 'spend',
    amountCents,
    description: input.description?.trim() || service.name,
    detail: input.detail ?? null,
    category: service.category,
    bookedOn: input.bookedOn ?? new Date(),
    source: 'manual',
    createdByUserId: input.createdByUserId ?? null,
    serviceId: service.id,
    quantityHundredths: input.quantityHundredths,
    unitPriceCents: unitPrice,
    // Ook de kostprijs vastleggen, zodat de marge van vandaag niet
    // verandert als je morgen een inkoopprijs bijwerkt.
    unitCostCents: service.costPriceCents,
    deliveredByUserId: input.deliveredByUserId ?? null,
  })
}

/**
 * Draait een boeking terug met een tegenboeking. De originele boeking
 * blijft staan: de klant ziet zowel de fout als de correctie, met reden.
 * Een boeking kan maar één keer worden teruggedraaid.
 */
export async function reverseEntry(
  entryId: string,
  opts: { reason: string; createdByUserId?: string | null },
): Promise<LedgerEntry> {
  if (opts.reason.trim() === '') {
    throw new LedgerError('Een correctie heeft altijd een reden nodig.')
  }

  return db.transaction(async (tx) => {
    const [original] = await tx
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.id, entryId))
      .for('update')

    if (!original) throw new LedgerError('Boeking niet gevonden.')
    if (original.kind === 'correction') {
      throw new LedgerError('Een correctie kun je niet zelf corrigeren.')
    }

    const [existing] = await tx
      .select({ id: ledgerEntries.id })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.reversesEntryId, entryId))
      .limit(1)

    if (existing) {
      throw new LedgerError('Deze boeking is al gecorrigeerd.')
    }

    const [correction] = await tx
      .insert(ledgerEntries)
      .values({
        walletId: original.walletId,
        kind: 'correction',
        amountCents: -original.amountCents,
        description: `Correctie: ${original.description}`,
        detail: opts.reason.trim(),
        category: original.category,
        bookedOn: new Date(),
        source: 'manual',
        reversesEntryId: original.id,
        createdByUserId: opts.createdByUserId ?? null,
        // De dienstgegevens gaan mee, zodat de tegenboeking volwaardig is.
        // Zonder dit blijven de kosten en dus de marge van het origineel in
        // de financiele overzichten staan, ook al is het werk teruggedraaid.
        // Het teken van het bedrag zorgt dat de correctie de omzet en de
        // kosten van het origineel precies opheft.
        serviceId: original.serviceId,
        quantityHundredths: original.quantityHundredths,
        unitPriceCents: original.unitPriceCents,
        unitCostCents: original.unitCostCents,
        deliveredByUserId: original.deliveredByUserId,
      })
      .returning()

    if (!correction) throw new LedgerError('Correctie kon niet worden opgeslagen.')
    return correction
  })
}

/** Ids van boekingen die al zijn teruggedraaid, zodat de UI ze kan doorstrepen. */
export async function getReversedEntryIds(walletId: string): Promise<Set<string>> {
  const rows = await db
    .select({ reverses: ledgerEntries.reversesEntryId })
    .from(ledgerEntries)
    .where(
      and(eq(ledgerEntries.walletId, walletId), eq(ledgerEntries.kind, 'correction')),
    )

  return new Set(rows.map((r) => r.reverses).filter((id): id is string => id !== null))
}

/** Wallets van een klant, met saldo. */
export async function getOrganizationWallets(organizationId: string) {
  const rows = await db
    .select()
    .from(wallets)
    .where(eq(wallets.organizationId, organizationId))
    .orderBy(wallets.createdAt)

  const balances = await getWalletBalances(rows.map((w) => w.id))

  return rows.map((wallet) => ({
    wallet,
    balance: balances.get(wallet.id)!,
  }))
}

/**
 * Netto verbruik per productgroep.
 *
 * Neemt bestedingen en de correcties daarop samen, zodat een teruggedraaide
 * besteding niet in de verdeling blijft staan. Categorieen die daardoor op
 * nul uitkomen vallen weg.
 */
export async function getSpendByCategory(
  walletId: string,
  opts: { from?: Date; to?: Date } = {},
): Promise<{ category: string; spentCents: number }[]> {
  const conditions = [
    eq(ledgerEntries.walletId, walletId),
    sql`${effectiveKind} = 'spend'`,
  ]
  if (opts.from) conditions.push(gte(ledgerEntries.bookedOn, opts.from))
  if (opts.to) conditions.push(lte(ledgerEntries.bookedOn, opts.to))

  const rows = await db
    .select({
      category: sql<string>`COALESCE(${ledgerEntries.category}, 'Overig')`,
      spent: sql<string>`SUM(-${ledgerEntries.amountCents})`,
    })
    .from(ledgerEntries)
    .leftJoin(
      sql`${ledgerEntries} AS orig`,
      sql`orig.id = ${ledgerEntries.reversesEntryId}`,
    )
    .where(and(...conditions))
    .groupBy(sql`COALESCE(${ledgerEntries.category}, 'Overig')`)
    .having(sql`SUM(-${ledgerEntries.amountCents}) > 0`)
    .orderBy(sql`SUM(-${ledgerEntries.amountCents}) DESC`)

  return rows.map((r) => ({ category: r.category, spentCents: Number(r.spent) }))
}
