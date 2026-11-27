import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { vacancies } from '@/db/schema'
import type { Vacancy } from '@/db/schema'

/* -------------------------------------------------------------------------
   Open vacatures voor de website.

   Alleen wat een sollicitant mag zien. Bewust NIET: de reden van de vacature
   (intern), de eigenaar, en de salarisschaal (alleen admins zien die bedragen;
   of die op de site komen, is een keuze die nog gemaakt moet worden).
   ------------------------------------------------------------------------- */

export type PubliekeVacature = {
  id: string
  titel: string
  soort: 'dienstverband' | 'stage' | 'freelance'
  plaatsen: number
  urenPerWeek: number | null
  omschrijving: string | null
  geopendOp: string | null
}

export function naarPubliek(v: Vacancy): PubliekeVacature {
  return {
    id: v.id,
    titel: v.title,
    soort: v.kind,
    plaatsen: v.positions,
    urenPerWeek: v.hoursPerWeekQuarters === null ? null : v.hoursPerWeekQuarters / 4,
    omschrijving: v.description,
    geopendOp: v.openedOn ? v.openedOn.toISOString() : null,
  }
}

export async function openVacatures(): Promise<PubliekeVacature[]> {
  const rijen = await db.select().from(vacancies).where(eq(vacancies.status, 'open')).orderBy(asc(vacancies.title))
  return rijen.map(naarPubliek)
}
