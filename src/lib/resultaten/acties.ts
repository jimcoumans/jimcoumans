/* -------------------------------------------------------------------------
   Acties bij de rapportage: wat de marketingmanager aanvinkt uit de knoppen
   van de analyse. Alleen dit ziet de klant onder "Waar we aan werken".
   ------------------------------------------------------------------------- */

import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { reportActions, type ReportAction } from '@/db/schema'
import type { Eigenaar } from './analyse'

export const STATUSSEN = ['gepland', 'bezig', 'klaar'] as const
export type Status = (typeof STATUSSEN)[number]
export const EIGENAREN: Eigenaar[] = ['wij', 'jullie', 'kost_geld']

export async function getActies(organizationId: string, maand: string): Promise<ReportAction[]> {
  return db
    .select()
    .from(reportActions)
    .where(and(eq(reportActions.organizationId, organizationId), eq(reportActions.month, maand)))
    .orderBy(asc(reportActions.createdAt))
}

/** Aanvinken. Twee keer dezelfde actie bij dezelfde bevinding in dezelfde maand is één actie. */
export async function vinkAan(input: {
  organizationId: string
  maand: string
  findingCode: string
  findingTitle: string
  actie: string
  eigenaar: Eigenaar
  userId: string | null
}): Promise<void> {
  await db
    .insert(reportActions)
    .values({
      organizationId: input.organizationId,
      month: input.maand,
      findingCode: input.findingCode,
      findingTitle: input.findingTitle,
      action: input.actie,
      owner: input.eigenaar,
      createdByUserId: input.userId,
    })
    .onConflictDoNothing()
}

export async function vinkUit(id: string, organizationId: string): Promise<void> {
  await db.delete(reportActions).where(and(eq(reportActions.id, id), eq(reportActions.organizationId, organizationId)))
}

export async function zetStatus(id: string, organizationId: string, status: Status): Promise<void> {
  await db
    .update(reportActions)
    .set({ status })
    .where(and(eq(reportActions.id, id), eq(reportActions.organizationId, organizationId)))
}
