/* -------------------------------------------------------------------------
   Dossiers van de voorstelgenerator. De generator bewaart zijn hele staat
   als één document; hier staat hij in de database van de Wallet, zodat het
   hele team bij dezelfde dossiers kan.
   ------------------------------------------------------------------------- */

import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { proposalSettings, proposals } from '@/db/schema'

export const ID_FORMAAT = /^[a-z0-9][a-z0-9-]{0,80}$/

export type DossierBody = { naam?: unknown; bedrijfsnaam?: unknown; plaats?: unknown; bijgewerkt?: unknown; staat?: unknown }

export class VoorstelFout extends Error {}

const tekst = (v: unknown, max = 300): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t || null
}

/** De lijst voor de keuzelijst in de generator, nieuwste eerst. */
export async function lijstDossiers() {
  const rijen = await db
    .select({ id: proposals.id, naam: proposals.naam, plaats: proposals.plaats, bijgewerkt: proposals.updatedAt })
    .from(proposals)
    .orderBy(desc(proposals.updatedAt))
  return rijen.map((r) => ({ id: r.id, naam: r.naam, plaats: r.plaats, bijgewerkt: r.bijgewerkt.toISOString() }))
}

export async function leesDossier(id: string) {
  if (!ID_FORMAAT.test(id)) return null
  const [r] = await db.select().from(proposals).where(eq(proposals.id, id))
  if (!r) return null
  return { naam: r.naam, bedrijfsnaam: r.bedrijfsnaam ?? '', plaats: r.plaats ?? '', bijgewerkt: r.updatedAt.toISOString(), staat: r.staat }
}

/** Opslaan zoals de generator het aanlevert: naam, plaats en de staat. */
export async function bewaarDossier(id: string, body: DossierBody, userId: string | null): Promise<void> {
  if (!ID_FORMAAT.test(id)) throw new VoorstelFout('Ongeldige sleutel voor het dossier.')
  if (!body.staat || typeof body.staat !== 'object') throw new VoorstelFout('Het dossier is leeg.')
  const waarden = {
    naam: tekst(body.naam) ?? tekst(body.bedrijfsnaam) ?? id,
    bedrijfsnaam: tekst(body.bedrijfsnaam),
    plaats: tekst(body.plaats),
    staat: body.staat,
    updatedByUserId: userId,
    updatedAt: new Date(),
  }
  await db
    .insert(proposals)
    .values({ id, ...waarden })
    .onConflictDoUpdate({ target: proposals.id, set: waarden })
}

export async function verwijderDossier(id: string): Promise<void> {
  if (!ID_FORMAAT.test(id)) return
  await db.delete(proposals).where(eq(proposals.id, id))
}

const INSTELLINGEN = new Set(['subdoelen'])

export async function leesInstelling(key: string): Promise<unknown | null> {
  if (!INSTELLINGEN.has(key)) return null
  const [r] = await db.select().from(proposalSettings).where(eq(proposalSettings.key, key))
  return r ? r.data : null
}

export async function bewaarInstelling(key: string, data: unknown): Promise<void> {
  if (!INSTELLINGEN.has(key)) throw new VoorstelFout('Onbekende instelling.')
  if (!data || typeof data !== 'object') throw new VoorstelFout('Lege instelling.')
  await db
    .insert(proposalSettings)
    .values({ key, data })
    .onConflictDoUpdate({ target: proposalSettings.key, set: { data, updatedAt: new Date() } })
}
