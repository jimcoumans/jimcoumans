import { and, asc, eq, sql, desc, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { services, ledgerEntries } from '@/db/schema'
import type { Service } from '@/db/schema'

/* -------------------------------------------------------------------------
   De dienstencatalogus.

   Anders dan het grootboek MAG een dienst gewijzigd worden: een tarief
   verandert nu en dan. Dat is veilig omdat een boeking het tarief van dat
   moment kopieert, dus een prijswijziging raakt nooit een bestaand saldo.

   Een dienst die ooit geboekt is kan niet verwijderd worden (de database
   blokkeert dat). Wel op inactief zetten: dan verdwijnt hij uit de
   keuzelijst maar blijft de historie leesbaar.
   ------------------------------------------------------------------------- */

export type ServiceWithUsage = Service & {
  /** Hoe vaak deze dienst is geboekt. */
  timesBooked: number
  /** Totale omzet uit deze dienst, in centen. */
  revenueCents: number
}

/** Alle diensten, met hoe vaak ze zijn geboekt. */
export async function listServices(
  opts: { onlyActive?: boolean } = {},
): Promise<ServiceWithUsage[]> {
  const conditions = opts.onlyActive ? [eq(services.active, true)] : []

  const rows = await db
    .select({
      service: services,
      timesBooked: sql<string>`COUNT(${ledgerEntries.id})`,
      // Alleen echte afschrijvingen tellen als omzet; correcties draaien
      // die weer terug en horen er dus af.
      revenue: sql<string>`COALESCE(SUM(-${ledgerEntries.amountCents}), 0)`,
    })
    .from(services)
    .leftJoin(ledgerEntries, eq(ledgerEntries.serviceId, services.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(services.id)
    .orderBy(asc(services.name))

  return rows.map((r) => ({
    ...r.service,
    timesBooked: Number(r.timesBooked),
    revenueCents: Number(r.revenue),
  }))
}

/** Diensten voor een keuzelijst: alleen actieve, gesorteerd op naam. */
export async function listActiveServices(): Promise<Service[]> {
  return db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.category), asc(services.name))
}

export async function getService(id: string): Promise<Service | null> {
  const [row] = await db.select().from(services).where(eq(services.id, id)).limit(1)
  return row ?? null
}

/** Productgroepen en afdelingen zoals ze in ClickUp staan. */
export const PRODUCTGROEPEN = [
  'SEA',
  'SEO',
  'Social Ads',
  'Social Management',
  'Marketing Management',
  'eCommerce Management',
  'CRO',
  'E-mail Marketing',
  'Marketing Automation',
  'Fotografie',
  'Content Creatie',
  'Web',
] as const

export const AFDELINGEN = [
  'Marketing',
  'Web',
  'Managed Services',
  'Content Creatie',
] as const

/** Marge per eenheid in centen, of null als er geen kostprijs bekend is. */
export function marginPerUnitCents(service: Service): number | null {
  if (service.costPriceCents === null) return null
  return service.unitPriceCents - service.costPriceCents
}

/** Marge als percentage van het verkooptarief, afgerond op een heel getal. */
export function marginPercent(service: Service): number | null {
  const marge = marginPerUnitCents(service)
  if (marge === null || service.unitPriceCents === 0) return null
  return Math.round((marge / service.unitPriceCents) * 100)
}
