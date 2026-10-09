import type { SalaryHouse, SalaryScale } from '@/db/schema'

/* -------------------------------------------------------------------------
   Het rekenwerk van het salarishuis, zonder database.

   Los van salarishuis.ts zodat ook een scherm in de browser (de rekenhulp)
   met precies dezelfde formule rekent als het contract. Twee formules naast
   elkaar lopen vroeg of laat uit elkaar; zie de waarschuwingen in
   salarishuis.ts.
   ------------------------------------------------------------------------- */

export class SalarishuisError extends Error {}

/** Een huis met zijn schalen, op volgorde van onder naar boven. */
export type Huis = {
  huis: SalaryHouse
  schalen: SalaryScale[]
}

/**
 * Wat een schaal-trede oplevert, helemaal uitgerekend.
 *
 * Alles in centen. Bruto, want netto hangt af van de persoonlijke situatie
 * en dat hoort bij de salarisadministratie, niet hier.
 */
export type Beloning = {
  schaal: string
  trede: number
  /** Bruto per maand bij fulltime. */
  fulltimeCents: number
  /** Bruto per maand bij het afgesproken aantal uren. */
  maandCents: number
  /** De OP-toeslag over het maandbedrag, als er geen pensioenregeling is. */
  opToeslagCents: number
  /** Maandbedrag plus OP-toeslag. Dit is wat er maandelijks wordt overgemaakt. */
  maandMetToeslagCents: number
  /** Vakantietoeslag per maand opgebouwd. Niet over de OP-toeslag. */
  vakantietoeslagPerMaandCents: number
  /** Bruto per uur, waarmee je tegen het minimumloon toetst. */
  uurloonCents: number
  /** Vakantie-uren per kalenderjaar, naar rato van de uren. */
  vakantieUren: number
  /** Uren per week in kwartieren, zoals meegegeven. */
  urenPerWeekKwartier: number
  /**
   * Waar het uurloon onder het wettelijk minimum ligt.
   *
   * Null als er geen minimum in het huis staat. False betekent dus echt
   * gecontroleerd en in orde, en niet "we weten het niet".
   */
  onderMinimumloon: boolean | null
}

/* --- Rekenen -------------------------------------------------------------- */

/**
 * Het fulltimebedrag van een schaal-trede, in centen.
 *
 * De enige plek waar wordt afgerond. Losgetrokken van de rest zodat de
 * berekening zonder database te testen is.
 */
export function fulltimeCentsVoor(
  baseCents: number,
  stepIncreaseBp: number,
  schalenTotEnMet: { multiplierBp: number }[],
  trede: number,
): number {
  let bedrag = baseCents
  // Stapelen, in deze volgorde. Zie de waarschuwing bovenaan dit bestand.
  for (const s of schalenTotEnMet) bedrag = bedrag * (s.multiplierBp / 10_000)
  bedrag = bedrag * (1 + stepIncreaseBp / 10_000) ** (trede - 1)
  return Math.round(bedrag)
}

/** Deelt een percentage in basispunten toe en rondt af op centen. */
function deelBp(cents: number, bp: number): number {
  return Math.round((cents * bp) / 10_000)
}

/**
 * Wat iemand verdient op deze schaal en trede, bij dit aantal uren.
 *
 * Pure functie: geen database, geen datum, geen verrassingen. Het huis geef
 * je mee, zodat een oud contract met het oude huis doorgerekend kan worden.
 */
export function berekenBeloning(
  huis: Huis,
  schaalNaam: string,
  trede: number,
  urenPerWeekKwartier: number,
): Beloning {
  const geordend = [...huis.schalen].sort((a, b) => a.sortOrder - b.sortOrder)
  const index = geordend.findIndex((s) => s.name === schaalNaam)
  if (index === -1) {
    throw new SalarishuisError(
      `Schaal "${schaalNaam}" bestaat niet in dit salarishuis. Beschikbaar: ${geordend
        .map((s) => s.name)
        .join(', ')}.`,
    )
  }

  const schaal = geordend[index]!
  if (!Number.isInteger(trede) || trede < 1 || trede > schaal.steps) {
    throw new SalarishuisError(
      `Trede ${trede} bestaat niet in schaal ${schaal.name}; die loopt van 1 tot en met ${schaal.steps}.`,
    )
  }
  if (urenPerWeekKwartier <= 0) {
    throw new SalarishuisError('Het aantal uren per week moet groter dan nul zijn.')
  }

  const h = huis.huis
  const fulltimeCents = fulltimeCentsVoor(
    h.baseCents,
    h.stepIncreaseBp,
    geordend.slice(0, index + 1),
    trede,
  )

  const deel = urenPerWeekKwartier / h.fulltimeHoursWeekQuarters
  const maandCents = Math.round(fulltimeCents * deel)
  const opToeslagCents = deelBp(maandCents, h.pensionAllowanceBp)

  /* Uurloon: het maandbedrag maal twaalf, gedeeld door de uren in een jaar.
     Niet maandbedrag gedeeld door "uren in deze maand" - die verschilt per
     maand en dan zou het uurloon in februari hoger zijn dan in maart. */
  const urenPerWeek = urenPerWeekKwartier / 100
  const uurloonCents = Math.round((maandCents * 12) / (urenPerWeek * 52))

  return {
    schaal: schaal.name,
    trede,
    fulltimeCents,
    maandCents,
    opToeslagCents,
    maandMetToeslagCents: maandCents + opToeslagCents,
    // Vakantietoeslag gaat NIET over de OP-toeslag. Staat zo in het contract
    // en het scheelt op jaarbasis een paar honderd euro per persoon.
    vakantietoeslagPerMaandCents: deelBp(maandCents, h.holidayAllowanceBp),
    uurloonCents,
    vakantieUren: Math.round(h.holidayHoursFulltime * deel),
    urenPerWeekKwartier,
    onderMinimumloon:
      h.minimumHourlyCents === null ? null : uurloonCents < h.minimumHourlyCents,
  }
}

/**
 * Het hele huis als tabel, zoals de sheet hem laat zien.
 *
 * Voor het scherm, en voor de test die hem tegen de sheet legt.
 */
export function tabel(huis: Huis): {
  schaal: string
  sortOrder: number
  tredes: { trede: number; fulltimeCents: number; metToeslagCents: number }[]
}[] {
  const geordend = [...huis.schalen].sort((a, b) => a.sortOrder - b.sortOrder)

  return geordend.map((schaal, index) => ({
    schaal: schaal.name,
    sortOrder: schaal.sortOrder,
    tredes: Array.from({ length: schaal.steps }, (_, i) => {
      const trede = i + 1
      const fulltimeCents = fulltimeCentsVoor(
        huis.huis.baseCents,
        huis.huis.stepIncreaseBp,
        geordend.slice(0, index + 1),
        trede,
      )
      return {
        trede,
        fulltimeCents,
        metToeslagCents:
          fulltimeCents + deelBp(fulltimeCents, huis.huis.pensionAllowanceBp),
      }
    }),
  }))
}


/* --- Een huis invoeren ---------------------------------------------------- */

/** Wat je invult bij een nieuwe versie of een correctie van het salarishuis. */
export type HuisInvoer = {
  effectiveFrom: Date
  baseCents: number
  stepIncreaseBp: number
  pensionAllowanceBp: number
  holidayAllowanceBp: number
  fulltimeHoursWeekQuarters: number
  holidayHoursFulltime: number
  minimumHourlyCents: number | null
  note: string | null
  /** Van onder naar boven. De opslag is ten opzichte van de vorige schaal. */
  schalen: { name: string; multiplierBp: number; steps: number }[]
}

/**
 * Controleert een huis voordat het wordt opgeslagen.
 *
 * De database weigert onzin ook, maar met een melding waar niemand iets mee
 * kan. Hier staat in gewone taal wat er mis is, en een paar dingen die de
 * database niet weet: het wettelijk minimum aan vakantiegeld en
 * vakantie-uren, en of de onderste trede boven het minimumloon blijft.
 */
export function controleerHuis(i: HuisInvoer): void {
  const fout = (m: string) => {
    throw new SalarishuisError(m)
  }
  if (!(i.effectiveFrom instanceof Date) || Number.isNaN(i.effectiveFrom.getTime())) fout('Vul de datum in vanaf wanneer dit huis geldt.')
  if (!Number.isInteger(i.baseCents) || i.baseCents <= 0) fout('De grondslag moet een bedrag boven nul zijn.')
  if (!Number.isInteger(i.stepIncreaseBp) || i.stepIncreaseBp < 0 || i.stepIncreaseBp > 2000) fout('De verhoging per trede ligt tussen 0% en 20%.')
  if (!Number.isInteger(i.pensionAllowanceBp) || i.pensionAllowanceBp < 0 || i.pensionAllowanceBp > 5000) fout('De OP-toeslag ligt tussen 0% en 50%.')
  if (!Number.isInteger(i.holidayAllowanceBp) || i.holidayAllowanceBp < 800 || i.holidayAllowanceBp > 5000) {
    fout('De vakantietoeslag is wettelijk minimaal 8%.')
  }
  if (!Number.isInteger(i.fulltimeHoursWeekQuarters) || i.fulltimeHoursWeekQuarters < 100 || i.fulltimeHoursWeekQuarters > 6000) {
    fout('Fulltime ligt tussen 1 en 60 uur per week.')
  }
  // Wettelijk minimum: vier keer de wekelijkse arbeidsduur per jaar.
  const minimumVakantie = Math.ceil((4 * i.fulltimeHoursWeekQuarters) / 100)
  if (!Number.isInteger(i.holidayHoursFulltime) || i.holidayHoursFulltime < minimumVakantie || i.holidayHoursFulltime > 1000) {
    fout(`De vakantie-uren zijn wettelijk minimaal vier keer de werkweek: ${minimumVakantie} uur bij fulltime.`)
  }
  if (i.minimumHourlyCents !== null && (!Number.isInteger(i.minimumHourlyCents) || i.minimumHourlyCents <= 0)) {
    fout('Het minimumuurloon moet een bedrag boven nul zijn, of leeg.')
  }

  if (i.schalen.length === 0) fout('Een salarishuis heeft minstens één schaal.')
  const namen = new Set<string>()
  for (const [n, s] of i.schalen.entries()) {
    const naam = s.name.trim()
    if (naam === '') fout(`Schaal ${n + 1} heeft geen naam.`)
    if (namen.has(naam.toLowerCase())) fout(`De schaal "${naam}" staat er twee keer in.`)
    namen.add(naam.toLowerCase())
    if (!Number.isInteger(s.multiplierBp) || s.multiplierBp < 5000 || s.multiplierBp > 30000) {
      fout(`De opslag van ${naam} ligt tussen 50% en 300% van de schaal eronder.`)
    }
    if (!Number.isInteger(s.steps) || s.steps < 1 || s.steps > 100) fout(`${naam} heeft tussen 1 en 100 tredes.`)
  }

  // De onderste trede tegen het minimumloon. Dit is het getal dat
  // stilletjes fout gaat bij een indexatie die achterblijft.
  if (i.minimumHourlyCents !== null) {
    const huis = huisUit(i)
    const onderste = berekenBeloning(huis, i.schalen[0]!.name.trim(), 1, i.fulltimeHoursWeekQuarters)
    if (onderste.onderMinimumloon) {
      fout(
        `De onderste trede komt uit op ${(onderste.uurloonCents / 100).toFixed(2).replace('.', ',')} per uur, onder het minimumloon van ${(i.minimumHourlyCents / 100).toFixed(2).replace('.', ',')}. Verhoog de grondslag.`,
      )
    }
  }
}

/** Een huis zoals de rekenfuncties het willen, uit de invoer. Zonder id's. */
export function huisUit(i: HuisInvoer): Huis {
  return {
    huis: {
      id: 'nieuw',
      effectiveFrom: i.effectiveFrom,
      baseCents: i.baseCents,
      stepIncreaseBp: i.stepIncreaseBp,
      pensionAllowanceBp: i.pensionAllowanceBp,
      holidayAllowanceBp: i.holidayAllowanceBp,
      fulltimeHoursWeekQuarters: i.fulltimeHoursWeekQuarters,
      holidayHoursFulltime: i.holidayHoursFulltime,
      minimumHourlyCents: i.minimumHourlyCents,
      note: i.note,
      createdAt: new Date(0),
      createdByUserId: null,
    },
    schalen: i.schalen.map((s, n) => ({ id: `s${n}`, houseId: 'nieuw', name: s.name.trim(), sortOrder: n + 1, multiplierBp: s.multiplierBp, steps: s.steps })),
  }
}
