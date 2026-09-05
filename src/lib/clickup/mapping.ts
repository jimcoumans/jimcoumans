import { eurosToCents } from '../money'
import {
  readNumber,
  readDropdown,
  readTimestamp,
  type ClickUpTask,
} from './client'

/* -------------------------------------------------------------------------
   Van een ClickUp-taak naar een boeking in de wallet.

   Deze module raakt geen netwerk en geen database, zodat de regels los te
   testen zijn. Dat is hier belangrijker dan elders: als deze omzetting
   fout is, staan er verkeerde bedragen in het overzicht van een klant.

   DE REGEL (aanpasbaar, zie README):
   Een taak wordt een afschrijving zodra het veld "Facturatie" op
   Factureerbaar, Naar Moneybird of Gefactureerd staat. Het bedrag komt uit
   "Verkoopfactuur"; is dat leeg, dan uit "Advies" (het door ClickUp
   berekende advies op basis van bestede tijd maal tarief).

   Taken met Facturatie = Open of Niet factureerbaar worden overgeslagen:
   bij Open is het bedrag nog niet vastgesteld, bij Niet factureerbaar valt
   het werk binnen het abonnement.
   ------------------------------------------------------------------------- */

/** Facturatie-statussen waarbij het bedrag vaststaat. */
export const AFBOEKBARE_STATUSSEN = [
  'Factureerbaar',
  'Naar Moneybird',
  'Gefactureerd',
] as const

export const VELD_FACTURATIE = 'Facturatie'
export const VELD_VERKOOPFACTUUR = 'Verkoopfactuur'
export const VELD_ADVIES = 'Advies'
export const VELD_PRODUCTGROEP = 'Productgroep'
export const VELD_BUDGET = 'Budget'

export type Afboeking = {
  /** Task-id, houdt de sync idempotent. */
  sourceRef: string
  amountCents: number
  description: string
  category: string | null
  bookedOn: Date
}

export type OverslagReden =
  | 'geen_facturatie_status'
  | 'nog_niet_factureerbaar'
  | 'niet_factureerbaar'
  | 'geen_bedrag'
  | 'bedrag_nul'
  | 'geen_naam'

export type MapResultaat =
  | { soort: 'boeken'; afboeking: Afboeking }
  | { soort: 'overslaan'; reden: OverslagReden; taakId: string; taakNaam: string }

/**
 * Bepaalt of een taak een afschrijving oplevert, en zo ja welke.
 * Geeft altijd een reden terug bij overslaan, zodat de sync kan uitleggen
 * waarom een taak niet is meegenomen.
 */
export function mapTaskNaarAfboeking(task: ClickUpTask): MapResultaat {
  const naam = task.name?.trim()
  if (!naam) {
    return { soort: 'overslaan', reden: 'geen_naam', taakId: task.id, taakNaam: '' }
  }

  const overslaan = (reden: OverslagReden): MapResultaat => ({
    soort: 'overslaan',
    reden,
    taakId: task.id,
    taakNaam: naam,
  })

  const facturatie = readDropdown(task, VELD_FACTURATIE)
  if (facturatie === null) return overslaan('geen_facturatie_status')
  if (facturatie === 'Niet factureerbaar') return overslaan('niet_factureerbaar')
  if (!AFBOEKBARE_STATUSSEN.includes(facturatie as (typeof AFBOEKBARE_STATUSSEN)[number])) {
    return overslaan('nog_niet_factureerbaar')
  }

  // Verkoopfactuur is wat er werkelijk in rekening gaat; Advies is de
  // berekening op basis van bestede tijd. Het echte bedrag gaat voor.
  const euros = readNumber(task, VELD_VERKOOPFACTUUR) ?? readNumber(task, VELD_ADVIES)
  if (euros === null) return overslaan('geen_bedrag')

  const amountCents = eurosToCents(euros)
  if (amountCents === 0) return overslaan('bedrag_nul')

  // Een negatief bedrag in ClickUp is geen afschrijving maar een fout in de
  // brongegevens. Die boeken we niet stil om naar een bijschrijving.
  if (amountCents < 0) return overslaan('bedrag_nul')

  // De datum waarop het werk klaar was is eerlijker dan vandaag: zo staat
  // de boeking in de maand waarin het werk is gedaan.
  const bookedOn =
    readTimestamp(task.date_done) ??
    readTimestamp(task.date_closed) ??
    readTimestamp(task.due_date) ??
    readTimestamp(task.date_created) ??
    new Date()

  return {
    soort: 'boeken',
    afboeking: {
      sourceRef: task.id,
      amountCents,
      description: naam,
      category: readDropdown(task, VELD_PRODUCTGROEP),
      bookedOn,
    },
  }
}

export const overslagLabels: Record<OverslagReden, string> = {
  geen_facturatie_status: 'geen Facturatie-veld gevuld',
  nog_niet_factureerbaar: 'Facturatie staat op Open',
  niet_factureerbaar: 'als Niet factureerbaar gemarkeerd',
  geen_bedrag: 'geen Verkoopfactuur of Advies ingevuld',
  bedrag_nul: 'bedrag is nul of negatief',
  geen_naam: 'taak heeft geen naam',
}

/** Leest het afgesproken budget van een abonnement, in centen. */
export function leesBudgetCents(task: ClickUpTask): number | null {
  const euros = readNumber(task, VELD_BUDGET)
  if (euros === null || euros <= 0) return null
  return eurosToCents(euros)
}
