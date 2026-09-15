import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, organizationOwners, subscriptions, users } from '@/db/schema'

/* -------------------------------------------------------------------------
   Het portfoliobord.

   Eén kolom per marketing manager, met de klanten die hij draagt en wat die
   per maand waard zijn. Daarnaast een kolom met klanten die nog nergens bij
   horen — dat is de kolom die er niet hoort te zijn.

   Belangrijk: dit bord is GEEN eigen toewijzing. Het toont wie er eerste
   aanspreekpartner is in organization_owners. Een klant naar een andere
   kolom slepen verandert precies dat. Zou het bord een eigen tabel hebben,
   dan kun je op de klantkaart iets anders lezen dan op het bord, en dan
   gelooft niemand meer welke van de twee klopt.

   De waarde van een klant is de som van zijn LOPENDE abonnementen. Niet de
   omzet van vorige maand, niet wat er geboekt is: het bord gaat over
   structurele belasting, en dat is wat er elke maand terugkomt.
   ------------------------------------------------------------------------- */

export type PortfolioKlant = {
  organizationId: string
  naam: string
  slug: string
  status: string
  /** Wat deze klant per maand structureel waard is, in centen. */
  maandwaardeCents: number
  abonnementen: number
  /** De rol die deze manager bij deze klant heeft, als die is ingevuld. */
  rol: string | null
}

export type PortfolioKolom = {
  userId: string
  naam: string
  email: string
  /** Maanddoel in centen, of null als er geen doel is ingesteld. */
  targetCents: number | null
  klanten: PortfolioKlant[]
  /** Som van de maandwaarden in deze kolom. */
  totaalCents: number
  /** Hoeveel procent van het doel gevuld is, of null zonder doel. */
  bezettingPercentage: number | null
  /** Wat er nog bij kan voordat het doel gehaald is. Negatief = eroverheen. */
  ruimteCents: number | null
}

export type PortfolioBord = {
  kolommen: PortfolioKolom[]
  /** Klanten zonder eerste aanspreekpartner. Deze horen ergens thuis. */
  nietToegewezen: PortfolioKlant[]
  /** Alles bij elkaar, ook het niet-toegewezen deel. */
  totaalCents: number
  totaalTargetCents: number
  nietToegewezenCents: number
}

/** De maandwaarde per klant, uit de lopende abonnementen. */
async function maandwaardePerKlant(): Promise<Map<string, { cents: number; aantal: number }>> {
  const rijen = await db
    .select({
      organizationId: subscriptions.organizationId,
      // De waarde van een klant is wat hij ons oplevert, dus na korting.
        cents: sql<string>`SUM(${subscriptions.amountExclVatCents} - ${subscriptions.discountCents})`,
      aantal: sql<string>`COUNT(*)`,
    })
    .from(subscriptions)
    // Alleen wat er echt loopt. Een gepauzeerd abonnement kost nu geen tijd.
    .where(eq(subscriptions.status, 'active'))
    .groupBy(subscriptions.organizationId)

  return new Map(
    rijen.map((r) => [r.organizationId, { cents: Number(r.cents), aantal: Number(r.aantal) }]),
  )
}

export async function getPortfolioBord(): Promise<PortfolioBord> {
  const [managers, toewijzingen, klanten, waarden] = await Promise.all([
    db
      .select()
      .from(users)
      .where(and(eq(users.isMarketingManager, true), isNull(users.disabledAt)))
      .orderBy(asc(users.name), asc(users.email)),

    db
      .select({ owner: organizationOwners })
      .from(organizationOwners)
      .where(eq(organizationOwners.isPrimary, true)),

    db
      .select()
      .from(organizations)
      // Oud-klanten en leads dragen geen structurele belasting.
      .where(sql`${organizations.status} IN ('client', 'prospect')`)
      .orderBy(asc(organizations.name)),

    maandwaardePerKlant(),
  ])

  const beheerderVan = new Map(
    toewijzingen.map((t) => [t.owner.organizationId, t.owner]),
  )

  const alsKlant = (org: typeof klanten[number], rol: string | null): PortfolioKlant => {
    const waarde = waarden.get(org.id)
    return {
      organizationId: org.id,
      naam: org.name,
      slug: org.slug,
      status: org.status,
      maandwaardeCents: waarde?.cents ?? 0,
      abonnementen: waarde?.aantal ?? 0,
      rol,
    }
  }

  const perManager = new Map<string, PortfolioKlant[]>()
  const nietToegewezen: PortfolioKlant[] = []

  for (const org of klanten) {
    const owner = beheerderVan.get(org.id)
    if (!owner) {
      nietToegewezen.push(alsKlant(org, null))
      continue
    }
    const lijst = perManager.get(owner.userId) ?? []
    lijst.push(alsKlant(org, owner.role))
    perManager.set(owner.userId, lijst)
  }

  const kolommen: PortfolioKolom[] = managers.map((m) => {
    const eigen = (perManager.get(m.id) ?? []).sort(
      (a, b) => b.maandwaardeCents - a.maandwaardeCents,
    )
    const totaalCents = eigen.reduce((t, k) => t + k.maandwaardeCents, 0)

    return {
      userId: m.id,
      naam: m.name ?? m.email,
      email: m.email,
      targetCents: m.monthlyTargetCents,
      klanten: eigen,
      totaalCents,
      bezettingPercentage:
        m.monthlyTargetCents === null
          ? null
          : Math.round((totaalCents / m.monthlyTargetCents) * 100),
      ruimteCents: m.monthlyTargetCents === null ? null : m.monthlyTargetCents - totaalCents,
    }
  })

  // Klanten die bij iemand horen die géén marketing manager (meer) is, mogen
  // niet stilletjes uit beeld verdwijnen: dan lijkt het bord te kloppen
  // terwijl er werk nergens staat.
  const kolomIds = new Set(kolommen.map((k) => k.userId))
  for (const [userId, lijst] of perManager) {
    if (!kolomIds.has(userId)) nietToegewezen.push(...lijst)
  }

  return {
    kolommen,
    nietToegewezen: nietToegewezen.sort((a, b) => b.maandwaardeCents - a.maandwaardeCents),
    totaalCents:
      kolommen.reduce((t, k) => t + k.totaalCents, 0) +
      nietToegewezen.reduce((t, k) => t + k.maandwaardeCents, 0),
    totaalTargetCents: kolommen.reduce((t, k) => t + (k.targetCents ?? 0), 0),
    nietToegewezenCents: nietToegewezen.reduce((t, k) => t + k.maandwaardeCents, 0),
  }
}

/* ------------------------------ Instellen ------------------------------- */

export class PortfolioError extends Error {}

/**
 * Zet iemand aan of uit als marketing manager.
 *
 * Bij uitzetten blijven zijn klanten aan hem gekoppeld — die moet je bewust
 * overdragen. Ze verschijnen wel in de kolom "nog niet toegewezen", zodat
 * je ziet dat er iets te verdelen valt.
 */
export async function setMarketingManager(
  userId: string,
  isManager: boolean,
): Promise<void> {
  await db
    .update(users)
    .set({
      isMarketingManager: isManager,
      // Een doel zonder portfolio zegt niets; de database weigert dat ook.
      monthlyTargetCents: isManager ? undefined : null,
    })
    .where(eq(users.id, userId))
}

export async function setMonthlyTarget(
  userId: string,
  targetCents: number | null,
): Promise<void> {
  if (targetCents !== null && targetCents <= 0) {
    throw new PortfolioError('Een maanddoel moet boven nul liggen.')
  }

  const [gebruiker] = await db
    .select({ isManager: users.isMarketingManager })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!gebruiker) throw new PortfolioError('Collega niet gevonden.')
  if (targetCents !== null && !gebruiker.isManager) {
    throw new PortfolioError(
      'Zet deze collega eerst aan als marketing manager; een doel zonder portfolio zegt niets.',
    )
  }

  await db.update(users).set({ monthlyTargetCents: targetCents }).where(eq(users.id, userId))
}
