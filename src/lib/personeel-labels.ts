/* -------------------------------------------------------------------------
   Labels en rekenwerk voor het personeelsdossier, zonder database.

   Dit staat los van personeel.ts omdat schermcomponenten hier aan moeten
   kunnen. Zou een component uit personeel.ts importeren, dan sleept hij de
   databaselaag mee de browserbundel in — dat gaat door TypeScript heen en
   breekt pas bij het bouwen.
   ------------------------------------------------------------------------- */

import type { EmploymentContract, SalaryRecord, DossierEntry } from '@/db/schema'

export type DossierRegel = DossierEntry & { doorWie: string | null }

export const BELONING_LABELS = {
  loondienst: 'Loondienst',
  management_fee: 'Management fee',
} as const

export const CONTRACT_LABELS = {
  bepaalde_tijd: 'Bepaalde tijd',
  onbepaalde_tijd: 'Onbepaalde tijd',
  oproep: 'Oproepcontract',
  stage: 'Stage',
  zzp: 'Zzp / opdracht',
} as const

export const DOSSIER_LABELS = {
  gesprek: 'Gesprek',
  afspraak: 'Afspraak',
  opleiding: 'Opleiding',
  waarschuwing: 'Waarschuwing',
  mijlpaal: 'Mijlpaal',
  overig: 'Overig',
} as const

export const DOSSIER_STIJLEN = {
  gesprek: 'bg-jr-lightblue text-jr-deepblue',
  afspraak: 'bg-gray-100 text-gray-700',
  opleiding: 'bg-jr-green/10 text-jr-green',
  waarschuwing: 'bg-jr-red/10 text-jr-red',
  mijlpaal: 'bg-jr-purple/10 text-jr-purple',
  overig: 'bg-gray-100 text-gray-600',
} as const

export const ASSET_LABELS = {
  laptop: 'Laptop',
  telefoon: 'Telefoon',
  auto: 'Auto',
  sleutel: 'Sleutel',
  toegangspas: 'Toegangspas',
  overig: 'Overig',
} as const

export type Ketensignaal = {
  /** Aantal tijdelijke contracten in de lopende keten. */
  aantal: number
  /** Hoeveel maanden de keten beslaat, van eerste start tot laatste einde. */
  maanden: number
  /** Wanneer de keten volgens deze telling vol is. */
  stand: 'ruim' | 'laatste' | 'over'
  /** Het contract dat als laatste in de keten zit, als er een is. */
  laatsteEindigtOp: Date | null
}

/**
 * Telt de keten van tijdelijke contracten.
 *
 * De wet (WAB, sinds 2020): na drie tijdelijke contracten of na 36 maanden
 * ontstaat een vast dienstverband. Een onderbreking van meer dan zes maanden
 * begint een nieuwe keten.
 *
 * Dit is een SIGNAAL en geen juridisch oordeel. Stage- en zzp-overeenkomsten
 * worden hier niet meegeteld, cao-afwijkingen kent dit systeem niet, en de
 * telling kijkt naar wat er is ingevoerd. Laat het toetsen voordat je er een
 * besluit op baseert — het is bedoeld om je te laten kijken, niet om voor je
 * te beslissen.
 */
export function ketensignaal(
  contracten: EmploymentContract[],
  vandaag: Date = new Date(),
): Ketensignaal {
  const tijdelijk = contracten
    .filter((c) => c.type === 'bepaalde_tijd' || c.type === 'oproep')
    .sort((a, b) => a.startedOn.getTime() - b.startedOn.getTime())

  if (tijdelijk.length === 0) {
    return { aantal: 0, maanden: 0, stand: 'ruim', laatsteEindigtOp: null }
  }

  // Van achteren naar voren lopen tot een gat van meer dan zes maanden: dat
  // gat begint een nieuwe keten en alles daarvoor telt niet meer mee.
  const keten: EmploymentContract[] = []
  for (let i = tijdelijk.length - 1; i >= 0; i--) {
    const huidig = tijdelijk[i]!
    keten.unshift(huidig)

    const vorige = tijdelijk[i - 1]
    if (!vorige) break

    const eindeVorige = vorige.endsOn ?? vorige.startedOn
    const gatInMaanden = maandenTussen(eindeVorige, huidig.startedOn)
    if (gatInMaanden > 6) break
  }

  const eerste = keten[0]!
  const laatste = keten[keten.length - 1]!
  const einde = laatste.endsOn ?? vandaag
  const maanden = maandenTussen(eerste.startedOn, einde)

  const stand: Ketensignaal['stand'] =
    keten.length > 3 || maanden > 36
      ? 'over'
      : keten.length === 3 || maanden > 30
        ? 'laatste'
        : 'ruim'

  return {
    aantal: keten.length,
    maanden,
    stand,
    laatsteEindigtOp: laatste.endsOn,
  }
}

/** Hele maanden tussen twee datums, naar boven afgerond op een halve maand. */
function maandenTussen(van: Date, tot: Date): number {
  const dagen = Math.max(0, (tot.getTime() - van.getTime()) / 86_400_000)
  return Math.round((dagen / 30.44) * 10) / 10
}

/** Wat een salaris per jaar kost aan bruto loon plus vakantiegeld. */
export function jaarloonCents(regel: Pick<SalaryRecord, 'grossMonthlyCents' | 'holidayAllowancePercent'>): number {
  const jaar = regel.grossMonthlyCents * 12
  return jaar + Math.round((jaar * regel.holidayAllowancePercent) / 100)
}

