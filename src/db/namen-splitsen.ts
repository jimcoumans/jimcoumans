import type { Sql } from 'postgres'
import { splitsNaam } from '../lib/namen'

/* -------------------------------------------------------------------------
   Bestaande namen één keer in delen trekken.

   Contactpersonen, collega's en kandidaten van vóór de naamvelden hebben
   alleen een volledige naam. Daardoor sorteert het CRM ze niet op
   achternaam en is de aanhef in een mail een gok. Dit draait na de
   migraties en raakt alleen rijen waar voornaam en achternaam allebei leeg
   zijn; wie al iets heeft ingevuld, blijft van ons af. Draait het twee keer,
   dan gebeurt de tweede keer niets.
   ------------------------------------------------------------------------- */

const TABELLEN = ['contacts', 'users', 'candidates'] as const

export async function splitsBestaandeNamen(sql: Sql): Promise<number> {
  let totaal = 0
  for (const tabel of TABELLEN) {
    const rijen = await sql<{ id: string; name: string }[]>`
      SELECT id, name FROM ${sql(tabel)}
      WHERE first_name IS NULL AND last_name IS NULL AND COALESCE(TRIM(name), '') <> ''`
    for (const r of rijen) {
      const d = splitsNaam(r.name)
      await sql`
        UPDATE ${sql(tabel)}
        SET first_name = ${d.firstName}, infix = ${d.infix}, last_name = ${d.lastName}
        WHERE id = ${r.id} AND first_name IS NULL AND last_name IS NULL`
      totaal++
    }
  }
  return totaal
}
