import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  activities, contacts, users, quotes, quoteLines, invoices, ledgerEntries, wallets,
} from '@/db/schema'
import type { Activity } from '@/db/schema'
import { quoteStatusLabels } from './quote-labels'

/* -------------------------------------------------------------------------
   De tijdlijn van een klant.

   Twee soorten gebeurtenissen komen hier samen:

   1. Wat iemand met de hand vastlegt — een gesprek, een bezoek, een notitie.
      Dat staat in de tabel `activities`.
   2. Wat het systeem al weet — offertes, facturen, boekingen. Dat staat
      ergens anders en wordt hier alleen OPGEHAALD, niet overgeschreven.

   Dat tweede is een bewuste keuze. Een offerte ook nog eens als tijdlijnregel
   wegschrijven betekent twee waarheden die uit elkaar kunnen lopen: je past
   de offerte aan en de tijdlijn blijft het oude bedrag tonen. Liever één keer
   opslaan en bij het tonen samenvoegen.
   ------------------------------------------------------------------------- */

export type TijdlijnItem = {
  id: string
  /** Waar het vandaan komt; bepaalt het icoon en of je erop kunt klikken. */
  bron: 'activity' | 'quote' | 'invoice' | 'booking' | 'topup'
  kind: Activity['kind'] | null
  wanneer: Date
  titel: string
  toelichting: string | null
  /** Wie het deed of vastlegde. */
  wie: string | null
  /** Met welke contactpersoon, als dat bekend is. */
  metWie: string | null
  bedragCents: number | null
  href: string | null
}

/** Zorgt dat een datum uit de driver echt een Date is. */
function toDate(waarde: unknown): Date {
  return waarde instanceof Date ? waarde : new Date(String(waarde))
}

export async function getTijdlijn(
  organizationId: string,
  opts: { limiet?: number; vanaf?: Date } = {},
): Promise<TijdlijnItem[]> {
  const limiet = opts.limiet ?? 50

  const [handmatig, offertes, facturen, mutaties] = await Promise.all([
    db
      .select({ activity: activities, wie: users.name, wieMail: users.email, metWie: contacts.name })
      .from(activities)
      .leftJoin(users, eq(users.id, activities.userId))
      .leftJoin(contacts, eq(contacts.id, activities.contactId))
      .where(
        opts.vanaf
          ? and(eq(activities.organizationId, organizationId), gte(activities.occurredAt, opts.vanaf))
          : eq(activities.organizationId, organizationId),
      )
      .orderBy(desc(activities.occurredAt))
      .limit(limiet),

    /*
     * Het offertebedrag komt uit de regels, niet uit een opgeslagen totaal.
     * Dat is dezelfde afspraak als op de offerte zelf: het bedrag volgt uit
     * aantal maal tarief, zodat er nooit een totaal op het scherm staat dat
     * niet meer klopt met de regels eronder.
     *
     * Bewust een join met GROUP BY en geen subquery in de SELECT. Drizzle laat
     * de tabelnaam voor een kolom weg zolang een query maar één tabel heeft,
     * en dan wordt `WHERE quote_id = id` binnen de subquery vergeleken met de
     * id van de VERKEERDE tabel. Dat levert geen foutmelding op maar stil een
     * nul, en dat is het soort fout waar je later een uur naar zoekt.
     */
    db
      .select({
        quote: quotes,
        bedrag: sql<string>`COALESCE(SUM(ROUND(${quoteLines.quantityHundredths} * ${quoteLines.unitPriceCents} / 100.0)), 0)`,
      })
      .from(quotes)
      .leftJoin(quoteLines, eq(quoteLines.quoteId, quotes.id))
      .where(eq(quotes.organizationId, organizationId))
      .groupBy(quotes.id)
      .orderBy(desc(quotes.issuedOn))
      .limit(limiet),

    db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId))
      .orderBy(desc(invoices.issuedOn))
      .limit(limiet),

    db
      .select({ entry: ledgerEntries })
      .from(ledgerEntries)
      .innerJoin(wallets, eq(wallets.id, ledgerEntries.walletId))
      .where(eq(wallets.organizationId, organizationId))
      .orderBy(desc(ledgerEntries.bookedOn))
      .limit(limiet),
  ])

  const items: TijdlijnItem[] = []

  for (const r of handmatig) {
    items.push({
      id: `activity-${r.activity.id}`,
      bron: 'activity',
      kind: r.activity.kind,
      wanneer: toDate(r.activity.occurredAt),
      titel: r.activity.subject,
      toelichting: r.activity.body,
      wie: r.wie ?? r.wieMail ?? null,
      metWie: r.metWie ?? null,
      bedragCents: null,
      href: null,
    })
  }

  for (const rij of offertes) {
    const q = rij.quote
    const bedrag = Number(rij.bedrag)
    items.push({
      id: `quote-${q.id}`,
      bron: 'quote',
      kind: null,
      wanneer: toDate(q.issuedOn),
      titel: `Offerte ${q.number}: ${q.title}`,
      toelichting: quoteStatusLabels[q.status],
      wie: null,
      metWie: null,
      bedragCents: bedrag === 0 ? null : bedrag,
      href: `/beheer/offertes/${q.id}`,
    })
  }

  for (const f of facturen) {
    items.push({
      id: `invoice-${f.id}`,
      bron: 'invoice',
      kind: null,
      wanneer: toDate(f.issuedOn),
      titel: `Factuur ${f.number}`,
      toelichting: null,
      wie: null,
      metWie: null,
      bedragCents: f.amountExclVatCents + f.vatCents,
      href: null,
    })
  }

  for (const m of mutaties) {
    // Een bijschrijving hoort al bij de factuur hierboven; die twee keer
    // tonen maakt de tijdlijn dubbel zo lang en half zo bruikbaar.
    if (m.entry.kind === 'topup' && m.entry.invoiceId !== null) continue

    items.push({
      id: `entry-${m.entry.id}`,
      bron: m.entry.kind === 'topup' ? 'topup' : 'booking',
      kind: null,
      wanneer: toDate(m.entry.bookedOn),
      titel: m.entry.description,
      toelichting: null,
      wie: null,
      metWie: null,
      bedragCents: m.entry.amountCents,
      href: null,
    })
  }

  return items
    .sort((a, b) => b.wanneer.getTime() - a.wanneer.getTime())
    .slice(0, limiet)
}

/* ------------------------------ Vastleggen ------------------------------ */

export class ActivityError extends Error {}

export async function createActivity(input: {
  organizationId: string
  kind: Activity['kind']
  subject: string
  body?: string | null
  contactId?: string | null
  userId?: string | null
  occurredAt?: Date | null
}): Promise<Activity> {
  if (input.subject.trim().length < 2) {
    throw new ActivityError('Geef de notitie een korte titel, anders staat er een lege regel op de tijdlijn.')
  }

  const [activity] = await db
    .insert(activities)
    .values({
      organizationId: input.organizationId,
      kind: input.kind,
      subject: input.subject.trim(),
      body: input.body?.trim() || null,
      contactId: input.contactId ?? null,
      userId: input.userId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    })
    .returning()

  if (!activity) throw new ActivityError('Notitie kon niet worden opgeslagen.')
  return activity
}

export async function updateActivity(
  activityId: string,
  patch: { kind: Activity['kind']; subject: string; body?: string | null; occurredAt?: Date | null },
): Promise<void> {
  if (patch.subject.trim().length < 2) {
    throw new ActivityError('Geef de notitie een korte titel.')
  }

  await db
    .update(activities)
    .set({
      kind: patch.kind,
      subject: patch.subject.trim(),
      body: patch.body?.trim() || null,
      occurredAt: patch.occurredAt ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, activityId))
}

export async function deleteActivity(activityId: string): Promise<void> {
  await db.delete(activities).where(eq(activities.id, activityId))
}

/** Wanneer er voor het laatst contact was, voor "wie verdient aandacht". */
export async function laatsteContact(organizationId: string): Promise<Date | null> {
  const [rij] = await db
    .select({ wanneer: activities.occurredAt })
    .from(activities)
    .where(eq(activities.organizationId, organizationId))
    .orderBy(desc(activities.occurredAt))
    .limit(1)

  return rij ? toDate(rij.wanneer) : null
}
