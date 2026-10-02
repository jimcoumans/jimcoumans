/**
 * De hypothese van een campagnebriefing.
 *
 * We rekenen vanuit de advertentiemotor: alsof het hele doel via advertenties
 * gehaald wordt. Mailings, vaste klanten en direct verkeer maken de campagne
 * daarna alleen goedkoper. Zo is een budgetadvies een bovengrens die klopt,
 * en geen gok die hoopt dat de rest het gat dicht.
 *
 * Twee standen:
 *  - berekend: van het doel terug naar het budget dat nodig is;
 *  - vast: van een vast budget vooruit naar wat we ermee verwachten te halen.
 *
 * Alles hier is pure rekenkunde zonder database, zodat de tests de getallen
 * van een echte briefing kunnen narekenen. Bedragen in centen, percentages in
 * basispunten (2,5% = 250), eenheden per conversie in honderdsten (3 = 300).
 */

export type HypotheseInvoer = {
  /** Het doel in eenheden: de som van de KPI's (couverts, aanvragen, producten). */
  doelEenheden: number
  /** De omzet van het doel in centen: aantal maal prijs, opgeteld. */
  omzetCents: number
  eenhedenPerConversieHonderdsten: number
  conversieBp: number | null
  doorklikBp: number | null
  cpmCents: number | null
  bufferBp: number
  stand: 'berekend' | 'vast'
  vastBudgetCents: number | null
  /** Welk deel van het doel we uit advertenties verwachten. Leeg: alles. */
  aandeelAdsBp?: number | null
  start: Date | null
  einde: Date | null
}

export type Hypothese = {
  stand: 'berekend' | 'vast'
  doelEenheden: number
  omzetCents: number
  conversies: number
  bezoekers: number
  impressies: number
  /** Alleen bij berekend: wat er minimaal nodig is, zonder buffer. */
  nodigCents: number | null
  /** Het advies (berekend, met buffer, afgerond op 100 euro) of het vaste budget. Bij berekend de bovengrens. */
  budgetCents: number
  /**
   * Alleen bij berekend en een ingevuld aandeel: de ondergrens van de
   * bandbreedte, als maar dat deel van het doel uit advertenties komt. Met
   * dezelfde buffer en afronding als de bovengrens.
   */
  ondergrensCents: number | null
  aandeelAdsBp: number | null
  /** Wat we verwachten te halen. Bij berekend is dat het doel. */
  resultaatEenheden: number
  perKlikCents: number
  perConversieCents: number
  perEenheidCents: number
  /** Het budget als deel van de omzet, in basispunten. */
  budgetVanOmzetBp: number | null
  /** De conversie die de landingspagina minimaal moet halen om het hele doel uit advertenties te halen. */
  minimaleConversieBp: number
  weken: number | null
  /** Wat er gebeurt als de conversie 40% lager uitvalt. */
  zwaksteSchakel: { conversieBp: number; nodigCents: number | null; resultaatEenheden: number | null }
}

export type HypotheseUitkomst =
  | { ok: true; hypothese: Hypothese }
  | { ok: false; ontbreekt: string[] }

/** Hoeveel lager de conversie in de zwakste schakel uitvalt. */
export const ZWAKSTE_SCHAKEL_FACTOR = 0.6

export function berekenHypothese(i: HypotheseInvoer): HypotheseUitkomst {
  const ontbreekt: string[] = []
  if (i.doelEenheden <= 0) ontbreekt.push('KPI’s met een doel')
  if (!i.conversieBp) ontbreekt.push('conversieratio')
  if (!i.doorklikBp) ontbreekt.push('doorklikratio')
  if (!i.cpmCents) ontbreekt.push('kosten per 1.000 impressies')
  if (i.stand === 'vast' && !i.vastBudgetCents) ontbreekt.push('vast advertentiebudget')
  if (ontbreekt.length > 0) return { ok: false, ontbreekt }

  const cr = i.conversieBp! / 10_000
  const ctr = i.doorklikBp! / 10_000
  const cpm = i.cpmCents!
  const perConversie = i.eenhedenPerConversieHonderdsten / 100
  const doelConversies = Math.round(i.doelEenheden / perConversie)

  let conversies: number
  let bezoekers: number
  let impressies: number
  let nodigCents: number | null
  let budgetCents: number
  let resultaat: number

  if (i.stand === 'berekend') {
    conversies = doelConversies
    bezoekers = conversies / cr
    impressies = bezoekers / ctr
    nodigCents = Math.round((impressies / 1000) * cpm)
    // Advies met buffer, afgerond op hele honderden euro's.
    budgetCents = Math.round((nodigCents * (1 + i.bufferBp / 10_000)) / 10_000) * 10_000
    resultaat = i.doelEenheden
  } else {
    budgetCents = i.vastBudgetCents!
    impressies = (budgetCents / cpm) * 1000
    bezoekers = impressies * ctr
    conversies = bezoekers * cr
    nodigCents = null
    resultaat = conversies * perConversie
  }

  const aandeel = i.aandeelAdsBp && i.aandeelAdsBp < 10_000 ? i.aandeelAdsBp : null
  const ondergrensCents =
    i.stand === 'berekend' && aandeel !== null && nodigCents !== null
      ? Math.max(10_000, Math.round((nodigCents * (aandeel / 10_000) * (1 + i.bufferBp / 10_000)) / 10_000) * 10_000)
      : null

  const bezoekersBijBudget = (budgetCents / cpm) * 1000 * ctr
  const minimaleConversie = bezoekersBijBudget > 0 ? doelConversies / bezoekersBijBudget : 0

  const zwakCr = cr * ZWAKSTE_SCHAKEL_FACTOR
  const zwakste =
    i.stand === 'berekend'
      ? { conversieBp: Math.round(zwakCr * 10_000), nodigCents: Math.round((doelConversies / zwakCr / ctr / 1000) * cpm), resultaatEenheden: null }
      : { conversieBp: Math.round(zwakCr * 10_000), nodigCents: null, resultaatEenheden: bezoekers * zwakCr * perConversie }

  return {
    ok: true,
    hypothese: {
      stand: i.stand,
      doelEenheden: i.doelEenheden,
      omzetCents: i.omzetCents,
      conversies,
      bezoekers,
      impressies,
      nodigCents,
      budgetCents,
      ondergrensCents,
      aandeelAdsBp: aandeel,
      resultaatEenheden: resultaat,
      perKlikCents: cpm / 1000 / ctr,
      perConversieCents: budgetCents / conversies,
      perEenheidCents: budgetCents / resultaat,
      budgetVanOmzetBp: i.omzetCents > 0 ? Math.round((budgetCents / i.omzetCents) * 10_000) : null,
      minimaleConversieBp: Math.round(minimaleConversie * 10_000),
      weken: weken(i.start, i.einde),
      zwaksteSchakel: zwakste,
    },
  }
}

function weken(start: Date | null, einde: Date | null): number | null {
  if (!start || !einde) return null
  const dagen = (einde.getTime() - start.getTime()) / 86_400_000 + 1
  return dagen > 0 ? dagen / 7 : null
}

/**
 * Verdeelt een budget over de kalendermaanden van de campagne, naar het
 * aantal dagen dat de campagne in elke maand loopt. Afgerond op hele
 * honderden euro's; het verschil gaat naar de laatste maand, zodat het
 * totaal altijd klopt.
 */
export function verdeelPerMaand(
  budgetCents: number,
  start: Date,
  einde: Date,
): { maand: Date; cents: number }[] {
  const maanden: { maand: Date; dagen: number }[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= einde) {
    const maandStart = new Date(cursor)
    const maandEinde = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const van = start > maandStart ? start : maandStart
    const tot = einde < maandEinde ? einde : maandEinde
    const dagen = Math.round((startVanDag(tot).getTime() - startVanDag(van).getTime()) / 86_400_000) + 1
    if (dagen > 0) maanden.push({ maand: maandStart, dagen })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  const totaal = maanden.reduce((a, m) => a + m.dagen, 0)
  if (totaal === 0) return []
  let rest = budgetCents
  return maanden.map((m, k) => {
    const cents = k === maanden.length - 1 ? rest : Math.round((budgetCents * m.dagen) / totaal / 10_000) * 10_000
    rest -= cents
    return { maand: m.maand, cents }
  })
}

function startVanDag(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/* ------------------------------ Invoer lezen ------------------------------ */

/**
 * Een percentage zoals iemand het typt ("2,5", "2.5%", "1") naar basispunten.
 * Leeg geeft null; onzin ook, zodat het formulier het kan weigeren.
 */
export function parsePercentageToBp(invoer: string): number | null {
  const schoon = invoer.trim().replace('%', '').replace(',', '.').trim()
  if (schoon === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(schoon)) return null
  const [heel, deel = ''] = schoon.split('.')
  return Number(heel) * 100 + Number((deel + '00').slice(0, 2))
}

/** "3", "2,5", "1" naar honderdsten. */
export function parseHonderdsten(invoer: string): number | null {
  const schoon = invoer.trim().replace(',', '.')
  if (schoon === '') return null
  if (!/^\d+(\.\d{1,2})?$/.test(schoon)) return null
  const [heel, deel = ''] = schoon.split('.')
  return Number(heel) * 100 + Number((deel + '00').slice(0, 2))
}

/** 250 naar "2,5". */
export function formatBp(bp: number): string {
  const waarde = bp / 100
  return Number.isInteger(waarde)
    ? String(waarde)
    : waarde.toFixed(2).replace(/0$/, '').replace('.', ',')
}

/** 300 naar "3", 250 naar "2,5". */
export function formatHonderdsten(h: number): string {
  return formatBp(h)
}

/** Een aantal zoals in de briefing: 252.000, of 3,8 als het klein is. */
export function formatAantal(n: number, decimalen = 0): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimalen,
    maximumFractionDigits: decimalen,
  }).format(n)
}
