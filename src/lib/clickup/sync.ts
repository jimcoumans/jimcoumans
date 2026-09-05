import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { organizations, wallets, ledgerEntries, syncRuns } from '@/db/schema'
import { addEntry } from '../ledger'
import { uniekeSlug } from '../admin'
import { PG_UNIQUE_VIOLATION, readPostgresError } from '../db-errors'
import { ClickUpClient, type ClickUpTask } from './client'
import { mapTaskNaarAfboeking, overslagLabels, leesBudgetCents } from './mapping'
import { formatCents } from '../money'

/* -------------------------------------------------------------------------
   De ClickUp-sync.

   Twee regels waar niet van afgeweken wordt:

   1. De sync VOEGT ALLEEN TOE. Hij wijzigt en verwijdert nooit een
      bestaande boeking. Verandert een taak in ClickUp nadat hij is
      afgeboekt, dan moet een mens dat met een correctie oplossen. Anders
      verandert het saldo van een klant vanzelf, en dan kan niemand meer
      uitleggen waarom.

   2. Standaard draait hij als PROEFRONDE. Pas met apply: true wordt er
      echt geboekt. Bij geld wil je eerst zien wat er zou gebeuren.

   Dubbel boeken is niet mogelijk: op (source, source_ref) staat een unieke
   index, dus dezelfde ClickUp-taak kan maar een keer op een wallet staan.
   ------------------------------------------------------------------------- */

export type SyncOpties = {
  /** Zonder dit blijft het een proefronde en verandert er niets. */
  apply?: boolean
  /** Lijst-ids uit ClickUp waaruit factureerbare taken worden gehaald. */
  taskListIds: string[]
  /** Lijst-id van de CRM-lijst met abonnementen. */
  subscriptionListId?: string
  /** Alleen deze klant syncen (organizations.id). */
  onlyOrganizationId?: string
}

export type SyncRegel = {
  soort: 'geboekt' | 'overgeslagen' | 'bestond_al' | 'geen_wallet' | 'fout'
  taakId: string
  taakNaam: string
  toelichting: string
  bedragCents?: number
}

export type SyncRapport = {
  apply: boolean
  gestartOp: Date
  organisatiesAangemaakt: number
  walletsAangemaakt: number
  geboekt: number
  overgeslagen: number
  bestondAl: number
  fouten: number
  bedragGeboektCents: number
  regels: SyncRegel[]
}

/**
 * Haalt abonnementen uit de CRM-lijst en zorgt dat er voor elk een klant
 * en een wallet bestaat. Bestaande klanten en wallets worden NIET
 * gewijzigd; alleen wat ontbreekt wordt aangemaakt.
 */
async function zorgVoorWallets(
  client: ClickUpClient,
  subscriptionListId: string,
  apply: boolean,
  rapport: SyncRapport,
): Promise<void> {
  const abonnementen = await client.listTasks(subscriptionListId)

  for (const abo of abonnementen) {
    const naam = abo.name?.trim()
    if (!naam) continue

    const [bestaandeWallet] = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(eq(wallets.clickupSubscriptionId, abo.id))
      .limit(1)

    if (bestaandeWallet) continue

    if (!apply) {
      rapport.organisatiesAangemaakt++
      rapport.walletsAangemaakt++
      rapport.regels.push({
        soort: 'geboekt',
        taakId: abo.id,
        taakNaam: naam,
        toelichting: 'zou een klant en wallet aanmaken',
      })
      continue
    }

    // De abonnementsnaam in ClickUp is de klantnaam. Bestaat die klant al,
    // dan hangen we de wallet daaronder in plaats van een dubbele klant
    // aan te maken.
    const [bestaandeOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.name, naam))
      .limit(1)

    let organizationId = bestaandeOrg?.id
    if (!organizationId) {
      const slug = await uniekeSlug(naam)
      const [org] = await db
        .insert(organizations)
        .values({ slug, name: naam })
        .returning()
      organizationId = org!.id
      rapport.organisatiesAangemaakt++
    }

    const budget = leesBudgetCents(abo)

    await db.insert(wallets).values({
      organizationId,
      name: 'Marketing abonnement',
      clickupSubscriptionId: abo.id,
      // Signaal bij tien procent van het afgesproken budget.
      lowBalanceThresholdCents: budget !== null ? Math.round(budget * 0.1) : null,
    })
    rapport.walletsAangemaakt++

    rapport.regels.push({
      soort: 'geboekt',
      taakId: abo.id,
      taakNaam: naam,
      toelichting: 'klant en wallet aangemaakt',
    })
  }
}

/** Zoekt de wallet waar een taak op geboekt moet worden. */
async function vindWalletVoorTaak(
  onlyOrganizationId?: string,
): Promise<{ id: string; organizationId: string } | null> {
  // Voor nu boeken we op de eerste actieve wallet van de klant. Welke klant
  // dat is, komt uit de lijst waarin de taak staat (zie syncClickUp).
  if (!onlyOrganizationId) return null

  const [wallet] = await db
    .select({ id: wallets.id, organizationId: wallets.organizationId })
    .from(wallets)
    .where(and(eq(wallets.organizationId, onlyOrganizationId), eq(wallets.status, 'active')))
    .limit(1)

  return wallet ?? null
}

/**
 * Voert een sync uit en legt het resultaat vast in sync_runs.
 *
 * De lijst-ids per klant komen uit taskListIds. Elke lijst hoort bij een
 * klantmap in ClickUp; de wallet wordt gevonden via de klant waar die lijst
 * onder hangt. Zolang die koppeling er niet is, moet je per klant syncen
 * met onlyOrganizationId.
 */
export async function syncClickUp(opties: SyncOpties): Promise<SyncRapport> {
  const apply = opties.apply === true
  const token = process.env.CLICKUP_API_TOKEN
  if (!token) throw new Error('CLICKUP_API_TOKEN ontbreekt. Zie .env.example.')

  const client = new ClickUpClient(token)

  const rapport: SyncRapport = {
    apply,
    gestartOp: new Date(),
    organisatiesAangemaakt: 0,
    walletsAangemaakt: 0,
    geboekt: 0,
    overgeslagen: 0,
    bestondAl: 0,
    fouten: 0,
    bedragGeboektCents: 0,
    regels: [],
  }

  // Een proefronde wordt niet als sync-run vastgelegd: er verandert niets.
  const [run] = apply
    ? await db.insert(syncRuns).values({ source: 'clickup', status: 'running' }).returning()
    : [null]

  try {
    if (opties.subscriptionListId) {
      await zorgVoorWallets(client, opties.subscriptionListId, apply, rapport)
    }

    const wallet = await vindWalletVoorTaak(opties.onlyOrganizationId)

    for (const listId of opties.taskListIds) {
      const taken = await client.listTasks(listId)

      for (const taak of taken) {
        const uitkomst = mapTaskNaarAfboeking(taak)

        if (uitkomst.soort === 'overslaan') {
          rapport.overgeslagen++
          rapport.regels.push({
            soort: 'overgeslagen',
            taakId: uitkomst.taakId,
            taakNaam: uitkomst.taakNaam,
            toelichting: overslagLabels[uitkomst.reden],
          })
          continue
        }

        const { afboeking } = uitkomst

        if (!wallet) {
          rapport.regels.push({
            soort: 'geen_wallet',
            taakId: afboeking.sourceRef,
            taakNaam: afboeking.description,
            toelichting: 'geen wallet gevonden om op te boeken',
            bedragCents: afboeking.amountCents,
          })
          rapport.fouten++
          continue
        }

        // Al geboekt? Dan overslaan, ook in de proefronde, zodat het
        // rapport laat zien wat er echt nieuw is.
        const [bestaand] = await db
          .select({ id: ledgerEntries.id })
          .from(ledgerEntries)
          .where(
            and(
              eq(ledgerEntries.source, 'clickup'),
              eq(ledgerEntries.sourceRef, afboeking.sourceRef),
            ),
          )
          .limit(1)

        if (bestaand) {
          rapport.bestondAl++
          continue
        }

        if (!apply) {
          rapport.geboekt++
          rapport.bedragGeboektCents += afboeking.amountCents
          rapport.regels.push({
            soort: 'geboekt',
            taakId: afboeking.sourceRef,
            taakNaam: afboeking.description,
            toelichting: `zou ${formatCents(afboeking.amountCents)} afboeken`,
            bedragCents: afboeking.amountCents,
          })
          continue
        }

        try {
          await addEntry({
            walletId: wallet.id,
            kind: 'spend',
            amountCents: afboeking.amountCents,
            description: afboeking.description,
            category: afboeking.category,
            bookedOn: afboeking.bookedOn,
            source: 'clickup',
            sourceRef: afboeking.sourceRef,
          })

          rapport.geboekt++
          rapport.bedragGeboektCents += afboeking.amountCents
          rapport.regels.push({
            soort: 'geboekt',
            taakId: afboeking.sourceRef,
            taakNaam: afboeking.description,
            toelichting: `${formatCents(afboeking.amountCents)} afgeboekt`,
            bedragCents: afboeking.amountCents,
          })
        } catch (error) {
          // Twee gelijktijdige syncs kunnen dezelfde taak pakken; de unieke
          // index vangt dat op en dat is geen fout maar een dubbele.
          if (readPostgresError(error)?.code === PG_UNIQUE_VIOLATION) {
            rapport.bestondAl++
            continue
          }

          rapport.fouten++
          rapport.regels.push({
            soort: 'fout',
            taakId: afboeking.sourceRef,
            taakNaam: afboeking.description,
            toelichting: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    if (run) {
      await db
        .update(syncRuns)
        .set({
          status: rapport.fouten > 0 ? 'failed' : 'success',
          finishedAt: new Date(),
          organizationsSeen: rapport.organisatiesAangemaakt,
          walletsSeen: rapport.walletsAangemaakt,
          entriesCreated: rapport.geboekt,
          entriesSkipped: rapport.overgeslagen + rapport.bestondAl,
          notes: vatSamen(rapport),
        })
        .where(eq(syncRuns.id, run.id))
    }

    return rapport
  } catch (error) {
    if (run) {
      await db
        .update(syncRuns)
        .set({
          status: 'failed',
          finishedAt: new Date(),
          notes: error instanceof Error ? error.message : String(error),
        })
        .where(eq(syncRuns.id, run.id))
    }
    throw error
  }
}

export function vatSamen(rapport: SyncRapport): string {
  const delen = [
    `${rapport.geboekt} geboekt (${formatCents(rapport.bedragGeboektCents)})`,
    `${rapport.bestondAl} al aanwezig`,
    `${rapport.overgeslagen} overgeslagen`,
  ]
  if (rapport.walletsAangemaakt > 0) {
    delen.push(`${rapport.walletsAangemaakt} wallets aangemaakt`)
  }
  if (rapport.fouten > 0) delen.push(`${rapport.fouten} fouten`)
  return delen.join(', ')
}
