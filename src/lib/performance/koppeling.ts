import type { AnalyticsConnection } from '@/db/schema'

/* -------------------------------------------------------------------------
   Wat er bij één koppeling hoort, zonder database: de advertentieaccounts
   (één, of bij LinkedIn meer) en de campagnes die meetellen. Zo kunnen de
   schermen, de sync en de tests er hetzelfde naar kijken.
   ------------------------------------------------------------------------- */

/** Een advertentieaccount zoals we hem bij de koppeling bewaren, en via welke verbinding we erbij kunnen. */
export type Account = { id: string; naam: string; verbinding?: string | null }

/** Een campagne zoals we hem bij de koppeling bewaren: id en naam zoals het platform ze noemt, en bij LinkedIn het account. */
export type Campagne = { id: string; naam: string; account?: string }

type Koppeling = Pick<AnalyticsConnection, 'externalId' | 'displayName' | 'accounts' | 'googleConnectionId' | 'linkedinConnectionId'>

/** De accounts van een koppeling: de lijst als die er is, anders het ene account uit externalId. */
export function accountsVan(k: Koppeling): Account[] {
  if (k.accounts?.length) return k.accounts
  return [{ id: k.externalId, naam: k.displayName ?? k.externalId, verbinding: k.linkedinConnectionId ?? k.googleConnectionId ?? null }]
}

/** De naam van de koppeling in één regel: één account, of hoeveel en welke. */
export function koppelingNaam(k: Koppeling): string {
  const accounts = accountsVan(k)
  if (accounts.length === 1) return accounts[0]!.naam
  return `${accounts.length} accounts: ${accounts.map((a) => a.naam).join(', ')}`
}

/**
 * Na een andere keuze van accounts: welke campagnes blijven staan. Alleen
 * campagnes met een account dat er nog bij zit; campagnes zonder account
 * (Meta, één account) horen bij het oude account en gaan weg.
 */
export function campagnesNaKeuze(campagnes: Campagne[] | null | undefined, accountIds: string[]): Campagne[] | null {
  const over = (campagnes ?? []).filter((c) => c.account && accountIds.includes(c.account))
  return over.length ? over : null
}

/** De campagnes van één account van de koppeling; leeg betekent: het hele account telt mee. */
export function campagnesVan(k: Pick<AnalyticsConnection, 'campaigns'>, accountId: string, enkelAccount: boolean): string[] {
  return (k.campaigns ?? []).filter((c) => (c.account ? c.account === accountId : enkelAccount)).map((c) => c.id)
}
