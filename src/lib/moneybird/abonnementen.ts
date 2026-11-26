import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { LedgerError } from '../ledger'
import { organizations, subscriptions } from '@/db/schema'
import { moneybirdClient, MoneybirdApiFout } from './client'
import { moneybirdPlanning } from './planning'
import { retainerReferentie } from './kenmerk'

/** Alleen klanten met een expliciet gekoppeld Moneybird-contact komen in aanmerking. */
export function moneybirdAbonnementenAan() {
  return process.env.MONEYBIRD_ABONNEMENTEN === 'true'
}

export function moneybirdBelastingId(btw: number) {
  const tarieven = JSON.parse(process.env.MONEYBIRD_BTW_IDS || '{}') as Record<string, unknown>
  const id = tarieven?.[btw]
  if (typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw new Error(`Stel het Moneybird-btw-tarief voor ${btw}% in.`)
  }
  return id
}

async function verwerk(id: string, signal: AbortSignal) {
  const client = moneybirdClient(signal)
  // De claim staat al in de database vóór de POST. Bij een timeout kan alleen
  // een bestaande reeks op referentie worden teruggevonden, zonder tweede POST.
  const [claim] = await db.update(subscriptions)
    .set({ moneybirdState: 'maken' })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.moneybirdState, 'wacht')))
    .returning({ id: subscriptions.id })

  let postBegonnen = false
  try {
    await db.transaction(async (tx) => {
      const [abo] = await tx.select().from(subscriptions)
        .where(eq(subscriptions.id, id)).for('update')
      if (!abo?.moneybirdContactId) return
      const contact = abo.moneybirdContactId
      const referentie = retainerReferentie(id)
      const oudeReferentie = `JR-WALLET-${id}`
      const zelfdeReferentie = (kenmerk: string | null) => kenmerk === referentie || kenmerk === oudeReferentie

      if (abo.moneybirdState === 'stoppen') {
        if (abo.moneybirdRecurringId) {
          const reeks = await client.reeks(abo.moneybirdRecurringId)
          if (reeks.contact_id !== contact) throw new Error('De reeks hoort bij een ander contact.')
          if (reeks.active !== false && (await client.stopReeks(reeks.id)).active !== false) {
            throw new Error('Moneybird heeft het stopzetten niet bevestigd.')
          }
        }
        await tx.update(subscriptions).set({
          moneybirdState: 'gestopt', moneybirdSyncFout: null,
        }).where(eq(subscriptions.id, id))
        return
      }

      if (abo.moneybirdState !== 'maken') return
      const [actieve, inactieve] = await Promise.all([
        client.reeksen(contact, true), client.reeksen(contact, false),
      ])
      const matches = [...actieve, ...inactieve]
        .filter((r) => r.contact_id === contact && zelfdeReferentie(r.reference))
      if (matches.length > 1) throw new Error('Moneybird kent meerdere reeksen met deze referentie.')
      let reeks = matches[0]
      let eersteDatum = abo.moneybirdEersteFactuur ?? reeks?.start_date ?? reeks?.invoice_date ?? null
      if (!reeks) {
        if (!claim) throw new Error('Aanmaak onbevestigd. Controleer de referentie in Moneybird.')
        const bekende = await tx.select({ id: subscriptions.moneybirdRecurringId }).from(subscriptions)
          .where(eq(subscriptions.moneybirdContactId, contact))
        const gekoppeld = new Set(bekende.map((r) => r.id))
        if (actieve.some((r) => r.contact_id === contact && !gekoppeld.has(r.id))) {
          await tx.update(subscriptions).set({
            moneybirdState: 'wacht',
            moneybirdSyncFout: 'Dit contact heeft al een actieve Moneybird-reeks zonder CRM-koppeling.',
            updatedAt: new Date(),
          }).where(eq(subscriptions.id, id))
          return
        }
        const planning = moneybirdPlanning(abo.startedOn, abo.endsOn, abo.billingDay, new Date())
        eersteDatum = planning.eersteDatum
        const taxRateId = moneybirdBelastingId(abo.vatRatePercent)
        const price = ((abo.amountExclVatCents - abo.discountCents) / 100).toFixed(2)
        postBegonnen = true
        reeks = await client.maakReeks({
          contact_id: contact,
          reference: referentie,
          invoice_date: eersteDatum,
          frequency: 1,
          frequency_type: 'month',
          auto_send: true,
          has_desired_count: planning.aantal !== null,
          ...(planning.aantal !== null ? { desired_count: planning.aantal } : {}),
          details_attributes: { '0': {
            amount: '1', description: abo.name, price, tax_rate_id: taxRateId,
          } },
        })
      }
      if (reeks.contact_id !== contact || !zelfdeReferentie(reeks.reference)) {
        throw new Error('Moneybird bevestigde een afwijkend contact of referentie.')
      }
      if (reeks.active !== true || reeks.auto_send !== true || !eersteDatum) {
        throw new Error('Controleer of de reeks actief is en automatisch verstuurt.')
      }
      await tx.update(subscriptions).set({
        moneybirdState: 'gekoppeld', moneybirdRecurringId: reeks.id,
        moneybirdEersteFactuur: eersteDatum, moneybirdSyncFout: null,
      }).where(eq(subscriptions.id, id))
    })
  } catch (error) {
    const geweigerd = error instanceof MoneybirdApiFout && [400, 401, 403, 404, 422, 429].includes(error.status)
    if (claim && (!postBegonnen || geweigerd)) {
      await db.update(subscriptions).set({
        moneybirdState: 'wacht',
        moneybirdSyncFout: error instanceof MoneybirdApiFout ? error.message : 'Controleer de Moneybird-instellingen en planning.',
        updatedAt: new Date(),
      }).where(and(eq(subscriptions.id, id), eq(subscriptions.moneybirdState, 'maken')))
    }
    throw error
  }
}

export async function syncMoneybirdAbonnementen() {
  if (!moneybirdAbonnementenAan()) return 0
  const signal = AbortSignal.timeout(20000)
  const wachtend = await db.select({ id: subscriptions.id }).from(subscriptions)
    .innerJoin(organizations, eq(organizations.id, subscriptions.organizationId))
    .where(and(
      inArray(subscriptions.moneybirdState, ['wacht', 'maken', 'stoppen']),
      eq(subscriptions.moneybirdContactId, organizations.moneybirdContactId),
    ))
    .orderBy(sql`case when ${subscriptions.moneybirdState} = 'stoppen' then 0 else 1 end`,
      asc(subscriptions.updatedAt))
    .limit(20)

  let fouten = 0
  for (const { id } of wachtend) {
    if (signal.aborted) break
    try {
      await verwerk(id, signal)
    } catch (error) {
      fouten++
      const melding = error instanceof MoneybirdApiFout ? error.message : 'De Moneybird-actie vraagt controle.'
      await db.update(subscriptions).set({
        moneybirdSyncFout: melding, updatedAt: new Date(),
      }).where(and(eq(subscriptions.id, id), inArray(subscriptions.moneybirdState, ['maken', 'stoppen'])))
      console.error('[moneybird] abonnement niet verwerkt', id, melding)
    }
  }
  return fouten
}

export async function stopMoneybirdAbonnement(id: string) {
  return db.transaction(async (tx) => {
    const [abo] = await tx.select().from(subscriptions).where(eq(subscriptions.id, id)).for('update')
    if (!abo?.moneybirdState) return false
    if (abo.moneybirdState === 'gestopt' || abo.moneybirdState === 'stoppen') return true
    if (!moneybirdAbonnementenAan() && abo.moneybirdRecurringId) {
      throw new LedgerError('De Moneybird-sync staat uit. Zet de reeks rechtstreeks in Moneybird stop.')
    }
    if (abo.moneybirdState === 'maken') {
      throw new LedgerError('Controleer eerst of Moneybird deze reeks heeft aangemaakt.')
    }
    await tx.update(subscriptions).set({
      status: 'ended',
      endsOn: abo.startedOn > new Date() ? abo.startedOn : new Date(),
      moneybirdState: abo.moneybirdRecurringId ? 'stoppen' : 'gestopt',
      moneybirdSyncFout: null,
      updatedAt: new Date(),
    }).where(eq(subscriptions.id, id))
    return true
  })
}

/** Bestaande lokale acties horen alleen bij abonnementen zonder Moneybird-koppeling. */
export const lokaalAbonnement = isNull(subscriptions.moneybirdState)
