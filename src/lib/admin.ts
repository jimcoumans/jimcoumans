import { asc, eq, sql, desc } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, wallets, users, ledgerEntries, syncRuns } from '@/db/schema'
import { getWalletBalances } from './ledger'
import type { Organization } from '@/db/schema'

/** Klantenlijst met totaalsaldo, voor het overzicht van het team. */
export async function listOrganizations() {
  const orgs = await db.select().from(organizations).orderBy(asc(organizations.name))

  const walletRows = await db.select().from(wallets)
  const balances = await getWalletBalances(walletRows.map((w) => w.id))

  const userCounts = await db
    .select({ organizationId: users.organizationId, aantal: sql<string>`COUNT(*)` })
    .from(users)
    .where(eq(users.role, 'client'))
    .groupBy(users.organizationId)

  const perOrg = new Map(userCounts.map((r) => [r.organizationId, Number(r.aantal)]))

  return orgs.map((org) => {
    const eigen = walletRows.filter((w) => w.organizationId === org.id)
    const totaal = eigen.reduce(
      (acc, w) => acc + (balances.get(w.id)?.balanceCents ?? 0),
      0,
    )
    return {
      organization: org,
      walletCount: eigen.length,
      clientUserCount: perOrg.get(org.id) ?? 0,
      totalBalanceCents: totaal,
    }
  })
}

/** Klant op slug, met wallets, saldi en klantgebruikers. */
export async function getOrganizationBySlug(slug: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1)

  if (!org) return null

  const walletRows = await db
    .select()
    .from(wallets)
    .where(eq(wallets.organizationId, org.id))
    .orderBy(asc(wallets.createdAt))

  const balances = await getWalletBalances(walletRows.map((w) => w.id))

  const klantGebruikers = await db
    .select()
    .from(users)
    .where(eq(users.organizationId, org.id))
    .orderBy(asc(users.email))

  return {
    organization: org,
    wallets: walletRows.map((w) => ({ wallet: w, balance: balances.get(w.id)! })),
    users: klantGebruikers,
  }
}

/** Laatste sync-runs, om te zien of de koppeling nog loopt. */
export async function listSyncRuns(limit = 20) {
  return db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(limit)
}

/**
 * Maakt een URL-veilige slug van een klantnaam.
 * Bij een botsing wordt er een nummer achter gezet.
 */
export async function uniekeSlug(naam: string): Promise<string> {
  const basis =
    naam
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'klant'

  const bestaand = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(sql`${organizations.slug} = ${basis} OR ${organizations.slug} LIKE ${basis + '-%'}`)

  if (bestaand.length === 0) return basis

  const gebruikt = new Set(bestaand.map((r) => r.slug))
  if (!gebruikt.has(basis)) return basis

  for (let i = 2; i < 1000; i++) {
    const kandidaat = `${basis}-${i}`
    if (!gebruikt.has(kandidaat)) return kandidaat
  }

  return `${basis}-${Date.now()}`
}

export type OrganizationDetail = NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>
export type { Organization }
