/**
 * Bepaalt welke maanden van een abonnement gefactureerd moeten worden.
 *
 * Deze module raakt geen database en geen netwerk, zodat de datumlogica los
 * te testen is. Dat is hier belangrijker dan elders: een fout betekent een
 * klant die te vaak of te weinig gefactureerd wordt.
 */

/** Hoeveel maanden een run maximaal inhaalt, om een typefout in de startdatum
 *  niet in twaalf facturen te laten eindigen. */
export const MAX_INHAAL_MAANDEN = 12

/** 'JJJJ-MM' van een datum. */
export function periodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Eerste dag van de maand van een periode. */
export function periodStart(period: string): Date {
  const [jaar, maand] = period.split('-').map(Number)
  return new Date(jaar!, maand! - 1, 1)
}

/** De datum waarop een periode gefactureerd wordt. */
export function billingDate(period: string, billingDay: number): Date {
  const start = periodStart(period)
  return new Date(start.getFullYear(), start.getMonth(), billingDay)
}

/** Leesbare maandnaam, bijv. "maart 2026". */
export function periodLabel(period: string): string {
  return periodStart(period).toLocaleDateString('nl-NL', {
    month: 'long',
    year: 'numeric',
  })
}

export type PeriodeAbonnement = {
  status: 'active' | 'paused' | 'ended'
  billingDay: number
  startedOn: Date
  endsOn: Date | null
  /**
   * Wanneer dit abonnement in dit systeem is aangemaakt.
   *
   * Hier wordt niet vóór gefactureerd, ook niet als de startdatum verder
   * terugligt. Reden: een abonnement dat je vandaag invoert kan onmogelijk
   * eerder via dit systeem gefactureerd zijn geweest; die facturen staan in
   * Moneybird. Zonder deze grens levert een startdatum van 1 januari bij
   * het aanmaken in september negen facturen en negen maanden budget op.
   *
   * De inhaalwerking blijft: een abonnement dat in januari is aangemaakt en
   * waarvan de run in maart pas draait, factureert januari en februari nog
   * gewoon alsnog.
   */
  createdAt: Date
}

export type PeriodesResultaat = {
  /** Periodes die gefactureerd horen te zijn, oudste eerst. */
  periods: string[]
  /**
   * Periodes die buiten de inhaalgrens vielen. Staan er hier, dan is er
   * iets grondig misgegaan of is de startdatum verkeerd ingevuld: dat wil
   * je zien in plaats van stil twaalf facturen sturen.
   */
  overgeslagenTeOud: string[]
  /**
   * Periodes die voor de aanmaakdatum van het abonnement liggen. Die zijn
   * bewust niet gefactureerd; wil je ze alsnog in de wallet, dan boek je
   * die met de hand bij.
   */
  overgeslagenVoorAanmaak: string[]
}

/**
 * Alle maanden waarvoor dit abonnement gefactureerd hoort te zijn op de
 * peildatum. Of er al een factuur bestaat weet deze functie niet; dat
 * controleert de database.
 *
 * Een periode is factureerbaar als:
 *   - het abonnement actief is
 *   - de maand op of na de startmaand ligt
 *   - de maand op of voor de eindmaand ligt (als er een einddatum is)
 *   - de facturatiedag van die maand is aangebroken
 */
export function billablePeriods(
  abonnement: PeriodeAbonnement,
  today: Date,
): PeriodesResultaat {
  if (abonnement.status !== 'active') {
    return { periods: [], overgeslagenTeOud: [], overgeslagenVoorAanmaak: [] }
  }

  const alles: string[] = []
  const voorAanmaak: string[] = []

  // De maand waarin het abonnement is aangemaakt; daarvoor factureren we niet.
  const aanmaakMaand = new Date(
    abonnement.createdAt.getFullYear(),
    abonnement.createdAt.getMonth(),
    1,
  )

  // Vanaf de startmaand tot en met de maand van vandaag.
  const loper = new Date(
    abonnement.startedOn.getFullYear(),
    abonnement.startedOn.getMonth(),
    1,
  )
  const laatsteMaand = new Date(today.getFullYear(), today.getMonth(), 1)

  // De grens van 600 maanden is er alleen om een oneindige lus te
  // voorkomen bij een absurde startdatum.
  for (let i = 0; loper <= laatsteMaand && i < 600; i++) {
    const period = periodKey(loper)

    // Voorbij de einddatum niet meer factureren. De vergelijking gaat op
    // maandniveau: een abonnement dat op 15 maart stopt, wordt voor maart
    // nog wel gefactureerd.
    if (abonnement.endsOn !== null) {
      const eindMaand = new Date(
        abonnement.endsOn.getFullYear(),
        abonnement.endsOn.getMonth(),
        1,
      )
      if (loper > eindMaand) break
    }

    // De facturatiedag moet aangebroken zijn. Op 1 maart factureer je de
    // maand maart nog niet als de facturatiedag de tweede is.
    if (billingDate(period, abonnement.billingDay) <= today) {
      if (loper < aanmaakMaand) {
        voorAanmaak.push(period)
      } else {
        alles.push(period)
      }
    }

    loper.setMonth(loper.getMonth() + 1)
  }

  // Bij een achterstand de oudste periodes buiten de grens apart melden.
  if (alles.length > MAX_INHAAL_MAANDEN) {
    return {
      periods: alles.slice(-MAX_INHAAL_MAANDEN),
      overgeslagenTeOud: alles.slice(0, alles.length - MAX_INHAAL_MAANDEN),
      overgeslagenVoorAanmaak: voorAanmaak,
    }
  }

  return { periods: alles, overgeslagenTeOud: [], overgeslagenVoorAanmaak: voorAanmaak }
}

/**
 * De eerstvolgende factuurdatum, of null als er niet meer gefactureerd
 * wordt. Voor het overzicht in het beheer.
 */
export function nextBillingDate(
  abonnement: PeriodeAbonnement,
  today: Date,
): Date | null {
  if (abonnement.status !== 'active') return null

  // Begin bij de huidige maand, of later als de start of de aanmaakdatum
  // verder ligt. Voor de aanmaakmaand wordt niet gefactureerd.
  const kandidaten = [
    new Date(today.getFullYear(), today.getMonth(), 1),
    new Date(abonnement.startedOn.getFullYear(), abonnement.startedOn.getMonth(), 1),
    new Date(abonnement.createdAt.getFullYear(), abonnement.createdAt.getMonth(), 1),
  ]
  const loper = new Date(Math.max(...kandidaten.map((d) => d.getTime())))

  for (let i = 0; i < 24; i++) {
    const datum = billingDate(periodKey(loper), abonnement.billingDay)

    if (abonnement.endsOn !== null) {
      const eindMaand = new Date(
        abonnement.endsOn.getFullYear(),
        abonnement.endsOn.getMonth(),
        1,
      )
      if (loper > eindMaand) return null
    }

    if (datum > today) return datum

    loper.setMonth(loper.getMonth() + 1)
  }

  return null
}

/** Btw-bedrag bij een bedrag exclusief btw en een percentage. */
export function vatCents(amountExclVatCents: number, ratePercent: number): number {
  return Math.round((amountExclVatCents * ratePercent) / 100)
}
