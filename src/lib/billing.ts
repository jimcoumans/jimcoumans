import { and, eq, inArray, asc, sql, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { subscriptions, invoices, organizations, wallets, ledgerEntries } from '@/db/schema'
import type { Subscription } from '@/db/schema'
import { LedgerError } from './ledger'
import { readPostgresError, PG_UNIQUE_VIOLATION } from './db-errors'
import { formatCents } from './money'
import {
  billablePeriods,
  periodLabel,
  billingDate,
  vatCents,
  invoiceCents,
  nextBillingDate,
} from './billing-periods'

/* -------------------------------------------------------------------------
   De maandelijkse abonnementsrun.

   Zolang een abonnement 'active' is, wordt op de facturatiedag van elke
   maand een factuur aangemaakt en het bedrag als budget bijgeschreven.

   Drie eigenschappen die er niet uit mogen:

   1. DUBBEL FACTUREREN IS ONMOGELIJK, niet onwaarschijnlijk. Op invoices
      staat een unieke index op (abonnement, periode). Draait de run twee
      keer, of tegelijk, dan weigert de database de tweede poging.

   2. DE RUN HAALT IN. Hij draait elke dag en kijkt welke periodes nog
      openstaan. Ligt de server er op de tweede uit, dan wordt de derde
      alsnog gefactureerd in plaats van dat een maand overgeslagen wordt.

   3. FACTUUR EN BUDGET GAAN SAMEN. Beide in een transactie, dus er kan geen
      factuur bestaan zonder budget en geen budget zonder factuur.

   Let op het factuurnummer: Moneybird maakt de echte factuur. Wat dit
   systeem aanmaakt is een intern nummer (ABO-JJJJ-MM), zodat het budget
   herleidbaar is. Het echte nummer kan later in moneybird_id.
   ------------------------------------------------------------------------- */

export type BillingRegel = {
  soort: 'gefactureerd' | 'bestond_al' | 'te_oud' | 'voor_aanmaak' | 'fout'
  subscriptionId: string
  organizationName: string
  subscriptionName: string
  period: string
  amountCents: number
  toelichting: string
}

export type BillingRapport = {
  apply: boolean
  peildatum: Date
  bekekenAbonnementen: number
  gefactureerd: number
  bestondAl: number
  fouten: number
  bedragCents: number
  regels: BillingRegel[]
}

export type BillingOpties = {
  /** Zonder dit blijft het een proefronde en verandert er niets. */
  apply?: boolean
  /** Peildatum. Standaard nu; bij tests kun je een datum meegeven. */
  today?: Date
  /** Alleen dit abonnement verwerken. */
  onlySubscriptionId?: string
}

/**
 * Maakt een intern factuurnummer dat nog vrij is bij deze klant.
 * Twee abonnementen bij dezelfde klant in dezelfde maand krijgen een
 * volgnummer, zodat ze niet op elkaar botsen.
 */
async function vrijFactuurnummer(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  organizationId: string,
  period: string,
): Promise<string> {
  const basis = `ABO-${period}`

  const bestaand = await tx
    .select({ number: invoices.number })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        sql`${invoices.number} = ${basis} OR ${invoices.number} LIKE ${basis + '-%'}`,
      ),
    )

  if (bestaand.length === 0) return basis

  const gebruikt = new Set(bestaand.map((r) => r.number))
  if (!gebruikt.has(basis)) return basis

  for (let i = 2; i < 100; i++) {
    const kandidaat = `${basis}-${i}`
    if (!gebruikt.has(kandidaat)) return kandidaat
  }

  throw new LedgerError(`Geen vrij factuurnummer meer voor ${basis}.`)
}

/**
 * Factureert een abonnement voor een periode: factuur plus bijschrijving,
 * in een transactie.
 */
async function factureerPeriode(
  abonnement: Subscription,
  period: string,
  createdByUserId: string | null,
): Promise<{ amountCents: number }> {
  return db.transaction(async (tx) => {
    const nummer = await vrijFactuurnummer(tx, abonnement.organizationId, period)
    const uitgifte = billingDate(period, abonnement.billingDay)

    // De factuur krijgt het bedrag na korting, de wallet het hele budget.
    // Dat verschil IS de korting: de klant krijgt waar hij recht op heeft en
    // betaalt minder.
    const teFactureren = invoiceCents(abonnement.amountExclVatCents, abonnement.discountCents)

    const [factuur] = await tx
      .insert(invoices)
      .values({
        organizationId: abonnement.organizationId,
        subscriptionId: abonnement.id,
        period,
        number: nummer,
        description:
          abonnement.discountCents > 0
            ? `${abonnement.name} ${periodLabel(period)} (na korting)`
            : `${abonnement.name} ${periodLabel(period)}`,
        amountExclVatCents: teFactureren,
        vatCents: vatCents(teFactureren, abonnement.vatRatePercent),
        status: 'open',
        issuedOn: uitgifte,
      })
      .returning()

    if (!factuur) throw new LedgerError('Factuur kon niet worden aangemaakt.')

    const [boeking] = await tx
      .insert(ledgerEntries)
      .values({
        walletId: abonnement.walletId,
        kind: 'topup',
        amountCents: abonnement.amountExclVatCents,
        description: `Budget ${periodLabel(period)}`,
        detail:
          abonnement.discountCents > 0
            ? `${abonnement.name} · factuur ${nummer} · ${formatCents(abonnement.discountCents)} korting`
            : `${abonnement.name} · factuur ${nummer}`,
        bookedOn: uitgifte,
        source: 'invoice',
        invoiceId: factuur.id,
        createdByUserId,
      })
      .returning()

    if (!boeking) throw new LedgerError('Bijschrijving kon niet worden opgeslagen.')

    return { amountCents: abonnement.amountExclVatCents }
  })
}

/**
 * Draait de abonnementsrun.
 *
 * Standaard een proefronde: pas met apply: true wordt er echt gefactureerd.
 */
export async function runBilling(opties: BillingOpties = {}): Promise<BillingRapport> {
  const apply = opties.apply === true
  const today = opties.today ?? new Date()

  const voorwaarden = [eq(subscriptions.status, 'active')]
  if (opties.onlySubscriptionId) {
    voorwaarden.push(eq(subscriptions.id, opties.onlySubscriptionId))
  }

  const rijen = await db
    .select({ subscription: subscriptions, organizationName: organizations.name })
    .from(subscriptions)
    .innerJoin(organizations, eq(organizations.id, subscriptions.organizationId))
    .where(and(...voorwaarden))
    .orderBy(asc(organizations.name), asc(subscriptions.name))

  const rapport: BillingRapport = {
    apply,
    peildatum: today,
    bekekenAbonnementen: rijen.length,
    gefactureerd: 0,
    bestondAl: 0,
    fouten: 0,
    bedragCents: 0,
    regels: [],
  }

  for (const { subscription: abonnement, organizationName } of rijen) {
    const { periods, overgeslagenTeOud, overgeslagenVoorAanmaak } = billablePeriods(
      {
        status: abonnement.status,
        billingDay: abonnement.billingDay,
        startedOn: abonnement.startedOn,
        endsOn: abonnement.endsOn,
        createdAt: abonnement.createdAt,
      },
      today,
    )

    for (const period of overgeslagenVoorAanmaak) {
      rapport.regels.push({
        soort: 'voor_aanmaak',
        subscriptionId: abonnement.id,
        organizationName,
        subscriptionName: abonnement.name,
        period,
        amountCents: abonnement.amountExclVatCents,
        toelichting:
          'ligt voor het aanmaken van dit abonnement; niet gefactureerd. Wil je dit budget alsnog, boek het dan met de hand bij.',
      })
    }

    for (const period of overgeslagenTeOud) {
      rapport.regels.push({
        soort: 'te_oud',
        subscriptionId: abonnement.id,
        organizationName,
        subscriptionName: abonnement.name,
        period,
        amountCents: abonnement.amountExclVatCents,
        toelichting:
          'buiten de inhaalgrens gelaten; controleer de startdatum van het abonnement',
      })
    }

    if (periods.length === 0) continue

    // In een keer opvragen welke periodes al een factuur hebben.
    const alGefactureerd = await db
      .select({ period: invoices.period })
      .from(invoices)
      .where(
        and(eq(invoices.subscriptionId, abonnement.id), inArray(invoices.period, periods)),
      )

    const gedaan = new Set(alGefactureerd.map((r) => r.period))

    for (const period of periods) {
      if (gedaan.has(period)) {
        rapport.bestondAl++
        continue
      }

      if (!apply) {
        rapport.gefactureerd++
        rapport.bedragCents += abonnement.amountExclVatCents
        rapport.regels.push({
          soort: 'gefactureerd',
          subscriptionId: abonnement.id,
          organizationName,
          subscriptionName: abonnement.name,
          period,
          amountCents: abonnement.amountExclVatCents,
          toelichting:
            abonnement.discountCents > 0
              ? `zou ${formatCents(abonnement.amountExclVatCents)} bijschrijven en ${formatCents(
                  invoiceCents(abonnement.amountExclVatCents, abonnement.discountCents),
                )} factureren`
              : `zou ${formatCents(abonnement.amountExclVatCents)} bijschrijven`,
        })
        continue
      }

      try {
        const { amountCents } = await factureerPeriode(abonnement, period, null)

        rapport.gefactureerd++
        rapport.bedragCents += amountCents
        rapport.regels.push({
          soort: 'gefactureerd',
          subscriptionId: abonnement.id,
          organizationName,
          subscriptionName: abonnement.name,
          period,
          amountCents,
          toelichting: `${formatCents(amountCents)} bijgeschreven`,
        })
      } catch (error) {
        // Twee runs tegelijk kunnen dezelfde periode pakken; de unieke index
        // vangt dat op en dat is geen fout maar een dubbele.
        if (readPostgresError(error)?.code === PG_UNIQUE_VIOLATION) {
          rapport.bestondAl++
          continue
        }

        rapport.fouten++
        rapport.regels.push({
          soort: 'fout',
          subscriptionId: abonnement.id,
          organizationName,
          subscriptionName: abonnement.name,
          period,
          amountCents: abonnement.amountExclVatCents,
          toelichting: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  return rapport
}

export function vatSamenBilling(rapport: BillingRapport): string {
  const delen = [
    `${rapport.bekekenAbonnementen} actieve abonnementen`,
    `${rapport.gefactureerd} gefactureerd (${formatCents(rapport.bedragCents)})`,
  ]
  if (rapport.bestondAl > 0) delen.push(`${rapport.bestondAl} al gedaan`)
  if (rapport.fouten > 0) delen.push(`${rapport.fouten} fouten`)
  return delen.join(', ')
}

/* ------------------------------ Overzichten ----------------------------- */

export type SubscriptionOverzicht = {
  subscription: Subscription
  organizationName: string
  organizationSlug: string
  walletName: string
  /** Eerstvolgende factuurdatum, of null als er niet meer gefactureerd wordt. */
  nextBillingOn: Date | null
  /** Aantal periodes dat al gefactureerd is. */
  billedPeriods: number
  /** Totaal bijgeschreven via dit abonnement, in centen. */
  billedCents: number
}

/** Alle abonnementen met hun status en eerstvolgende factuurdatum. */
export async function listSubscriptions(opts: { organizationId?: string } = {}) {
  const voorwaarden = opts.organizationId
    ? [eq(subscriptions.organizationId, opts.organizationId)]
    : []

  const rijen = await db
    .select({
      subscription: subscriptions,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      walletName: wallets.name,
    })
    .from(subscriptions)
    .innerJoin(organizations, eq(organizations.id, subscriptions.organizationId))
    .innerJoin(wallets, eq(wallets.id, subscriptions.walletId))
    .where(voorwaarden.length > 0 ? and(...voorwaarden) : undefined)
    .orderBy(asc(organizations.name), asc(subscriptions.name))

  const ids = rijen.map((r) => r.subscription.id)

  const gefactureerd =
    ids.length === 0
      ? []
      : await db
          .select({
            subscriptionId: invoices.subscriptionId,
            aantal: sql<string>`COUNT(*)`,
            totaal: sql<string>`COALESCE(SUM(${invoices.amountExclVatCents}), 0)`,
          })
          .from(invoices)
          .where(inArray(invoices.subscriptionId, ids))
          .groupBy(invoices.subscriptionId)

  const perAbo = new Map(
    gefactureerd.map((r) => [
      r.subscriptionId,
      { aantal: Number(r.aantal), totaal: Number(r.totaal) },
    ]),
  )

  const nu = new Date()

  return rijen.map((r): SubscriptionOverzicht => {
    const cijfers = perAbo.get(r.subscription.id)
    return {
      subscription: r.subscription,
      organizationName: r.organizationName,
      organizationSlug: r.organizationSlug,
      walletName: r.walletName,
      nextBillingOn: nextBillingDate(
        {
          status: r.subscription.status,
          billingDay: r.subscription.billingDay,
          startedOn: r.subscription.startedOn,
          endsOn: r.subscription.endsOn,
          createdAt: r.subscription.createdAt,
        },
        nu,
      ),
      billedPeriods: cijfers?.aantal ?? 0,
      billedCents: cijfers?.totaal ?? 0,
    }
  })
}

/** Maandelijks terugkerende omzet uit actieve abonnementen, in centen. */
export async function getMonthlyRecurringCents(): Promise<number> {
  const [row] = await db
    .select({
      // Omzet is wat er gefactureerd wordt, dus na korting. Het budget dat
      // eruit gaat staat los daarvan; dat is geen omzet maar een belofte.
      totaal: sql<string>`COALESCE(SUM(${subscriptions.amountExclVatCents} - ${subscriptions.discountCents}), 0)`,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))

  return Number(row?.totaal ?? 0)
}

/** Wat er per maand aan budget wordt bijgeschreven, en hoeveel korting daar in zit. */
export async function getMonthlyBudgetCents(): Promise<{
  budgetCents: number
  kortingCents: number
}> {
  const [row] = await db
    .select({
      budget: sql<string>`COALESCE(SUM(${subscriptions.amountExclVatCents}), 0)`,
      korting: sql<string>`COALESCE(SUM(${subscriptions.discountCents}), 0)`,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))

  return {
    budgetCents: Number(row?.budget ?? 0),
    kortingCents: Number(row?.korting ?? 0),
  }
}

export type KlantAandeel = {
  organizationSlug: string
  organizationName: string
  /** Wat deze klant per maand aan abonnementen betaalt, na korting. */
  omzetCents: number
  /** Het budget dat hij daarvoor krijgt. */
  budgetCents: number
  kortingCents: number
  /** Aandeel in de totale abonnementsomzet, in procenten met één decimaal. */
  aandeelProcent: number
  abonnementen: number
}

/**
 * Hoe de abonnementsomzet over de klanten verdeeld is.
 *
 * Dit is een risicocijfer, geen scorebord. Eén klant die een groot deel van
 * je vaste omzet is, is een klant die je niet kunt missen — en dat merk je
 * liever nu dan op de dag dat hij opzegt.
 *
 * Gepauzeerde en gestopte abonnementen tellen niet mee: die leveren niets op.
 */
export async function getKlantAandelen(): Promise<{
  klanten: KlantAandeel[]
  totaalOmzetCents: number
}> {
  const rijen = await db
    .select({
      slug: organizations.slug,
      naam: organizations.name,
      omzet: sql<string>`SUM(${subscriptions.amountExclVatCents} - ${subscriptions.discountCents})`,
      budget: sql<string>`SUM(${subscriptions.amountExclVatCents})`,
      korting: sql<string>`SUM(${subscriptions.discountCents})`,
      aantal: sql<string>`COUNT(*)`,
    })
    .from(subscriptions)
    .innerJoin(organizations, eq(organizations.id, subscriptions.organizationId))
    .where(eq(subscriptions.status, 'active'))
    .groupBy(organizations.slug, organizations.name)

  const klanten = rijen.map((r) => ({
    organizationSlug: r.slug,
    organizationName: r.naam,
    omzetCents: Number(r.omzet),
    budgetCents: Number(r.budget),
    kortingCents: Number(r.korting),
    abonnementen: Number(r.aantal),
    aandeelProcent: 0,
  }))

  const totaalOmzetCents = klanten.reduce((t, k) => t + k.omzetCents, 0)

  // Het percentage wordt hier berekend en niet in SQL, zodat het altijd bij
  // precies dit totaal hoort. Twee query's zouden een tel uit elkaar kunnen
  // lopen en dan telt de kolom niet op tot honderd.
  for (const klant of klanten) {
    klant.aandeelProcent =
      totaalOmzetCents === 0
        ? 0
        : Math.round((klant.omzetCents / totaalOmzetCents) * 1000) / 10
  }

  klanten.sort((a, b) => b.omzetCents - a.omzetCents)

  return { klanten, totaalOmzetCents }
}
