import { and, desc, eq, isNull, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { users, salaryRecords } from '@/db/schema'
import type { SalaryRecord } from '@/db/schema'

/* -------------------------------------------------------------------------
   Wat het team kost.

   Het belangrijkste dat dit bestand rechtzet: brutoloon is niet wat iemand
   kost. Daar komt vakantiegeld bij en daar komen werkgeverslasten overheen —
   sociale premies, pensioen, verzekeringen. Reken je met bruto, dan zie je
   ongeveer driekwart van je grootste kostenpost en denk je dat je ruimer
   zit dan je zit.

   Een management fee werkt anders: dat is een factuur van een eigen BV, dus
   geen vakantiegeld en geen werkgeverslasten. Het bedrag is meteen de last.
   Zou je een fee als salaris invoeren, dan reken je hem een derde te hoog.
   ------------------------------------------------------------------------- */

export type Maandlast = {
  /** Wat er bruto op de loonstrook of de factuur staat. */
  brutoCents: number
  /** Vakantiegeld omgeslagen per maand. Nul bij een management fee. */
  vakantiegeldCents: number
  /** Werkgeverslasten. Nul bij een management fee. */
  werkgeverslastenCents: number
  /** Alles bij elkaar: wat deze persoon per maand kost. */
  totaalCents: number
}

/**
 * Wat één beloningsregel per maand kost.
 *
 * De werkgeverslasten worden gerekend over het brutoloon INCLUSIEF
 * vakantiegeld, want dat is de grondslag waar premies over gaan. Dit is een
 * benadering die dicht genoeg zit om mee te sturen; de exacte cijfers komen
 * uit de salarisadministratie.
 */
export function maandlast(
  regel: Pick<
    SalaryRecord,
    'grossMonthlyCents' | 'holidayAllowancePercent' | 'employerCostPercent' | 'soort'
  >,
): Maandlast {
  const bruto = regel.grossMonthlyCents

  if (regel.soort === 'management_fee') {
    return {
      brutoCents: bruto,
      vakantiegeldCents: 0,
      werkgeverslastenCents: 0,
      totaalCents: bruto,
    }
  }

  const vakantiegeld = Math.round((bruto * regel.holidayAllowancePercent) / 100)
  const grondslag = bruto + vakantiegeld
  const lasten = Math.round((grondslag * regel.employerCostPercent) / 100)

  return {
    brutoCents: bruto,
    vakantiegeldCents: vakantiegeld,
    werkgeverslastenCents: lasten,
    totaalCents: grondslag + lasten,
  }
}

export type PersoonskostenRegel = {
  userId: string
  naam: string
  jobTitle: string | null
  department: string | null
  soort: SalaryRecord['soort']
  contractUrenQuarters: number | null
  last: Maandlast
}

export type Personeelskosten = {
  regels: PersoonskostenRegel[]
  /** Collega's in dienst zonder vastgelegde beloning: die tellen nergens mee. */
  zonderBeloning: { userId: string; naam: string }[]
  totaalCents: number
  loondienstCents: number
  managementFeeCents: number
  /** Per afdeling, op volgorde van grootte. */
  perAfdeling: { afdeling: string; cents: number; mensen: number }[]
}

/**
 * De maandlast van iedereen die in dienst is.
 *
 * Per persoon geldt de laatste beloningsregel die al is ingegaan — dezelfde
 * regel als op het profiel. Een verhoging die volgende maand ingaat telt hier
 * dus nog niet mee, en dat is de bedoeling: dit is wat het NU kost.
 */
export async function getPersoneelskosten(
  vandaag: Date = new Date(),
): Promise<Personeelskosten> {
  const team = await db
    .select()
    .from(users)
    .where(and(isNull(users.organizationId), isNull(users.endedOn)))

  const regels: PersoonskostenRegel[] = []
  const zonderBeloning: { userId: string; naam: string }[] = []

  for (const lid of team) {
    const [beloning] = await db
      .select()
      .from(salaryRecords)
      .where(
        and(eq(salaryRecords.userId, lid.id), lte(salaryRecords.effectiveFrom, vandaag)),
      )
      .orderBy(desc(salaryRecords.effectiveFrom))
      .limit(1)

    if (!beloning) {
      zonderBeloning.push({ userId: lid.id, naam: lid.name ?? lid.email })
      continue
    }

    regels.push({
      userId: lid.id,
      naam: lid.name ?? lid.email,
      jobTitle: lid.jobTitle,
      department: lid.department,
      soort: beloning.soort,
      contractUrenQuarters: lid.contractHoursPerWeekQuarters,
      last: maandlast(beloning),
    })
  }

  regels.sort((a, b) => b.last.totaalCents - a.last.totaalCents)

  const totaalCents = regels.reduce((t, r) => t + r.last.totaalCents, 0)
  const loondienstCents = regels
    .filter((r) => r.soort === 'loondienst')
    .reduce((t, r) => t + r.last.totaalCents, 0)

  const perAfdelingMap = new Map<string, { cents: number; mensen: number }>()
  for (const r of regels) {
    const sleutel = r.department ?? 'Zonder afdeling'
    const huidig = perAfdelingMap.get(sleutel) ?? { cents: 0, mensen: 0 }
    perAfdelingMap.set(sleutel, {
      cents: huidig.cents + r.last.totaalCents,
      mensen: huidig.mensen + 1,
    })
  }

  return {
    regels,
    zonderBeloning,
    totaalCents,
    loondienstCents,
    managementFeeCents: totaalCents - loondienstCents,
    perAfdeling: [...perAfdelingMap.entries()]
      .map(([afdeling, v]) => ({ afdeling, ...v }))
      .sort((a, b) => b.cents - a.cents),
  }
}

/**
 * Wat een uur van iemand kost, afgeleid uit zijn maandlast en contracturen.
 *
 * Gerekend met 4,33 weken per maand. Dit is de kostprijs van een uur
 * AANWEZIGHEID, niet van een declarabel uur: vakantie, ziekte, overleg en
 * acquisitie zitten erin. Reken je hiermee je tarief uit, dan kom je te laag
 * uit — deel door je declarabiliteit voordat je er een prijs op baseert.
 */
export function uurkostprijsCents(
  maandlastCents: number,
  contractUrenQuarters: number | null,
): number | null {
  if (contractUrenQuarters === null || contractUrenQuarters <= 0) return null
  const urenPerMaand = (contractUrenQuarters / 100) * 4.33
  return Math.round(maandlastCents / urenPerMaand)
}
