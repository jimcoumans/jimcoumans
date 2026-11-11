/* -------------------------------------------------------------------------
   De analyse onder de rapportage. Een complete lezing van de cijfers, in
   gewone taal: niet alleen "onder de benchmark", maar ook of het daalt ten
   opzichte van de drie maanden ervoor, en of vorig jaar in dezelfde maand
   hetzelfde gebeurde (seizoen).

   De matrix:
                          stabiel of beter        duidelijk gedaald
     boven de benchmark   niets te melden         melden, niet alarmeren
     onder de benchmark   structureel probleem    hoogste prioriteit

   Puur rekenwerk: te testen, en in het portaal en het beheer hetzelfde.
   ------------------------------------------------------------------------- */

import { BRON_LABEL, type Bron } from '../performance/bronnen'
import { cijfers, type Kanaal, type Oordeel } from './bereken'

export type Eigenaar = 'wij' | 'jullie' | 'kost_geld'
export type Knop = { tekst: string; eigenaar: Eigenaar }
export type Ernst = 'urgent' | 'aandacht' | 'neutraal' | 'goed'

export type Bevinding = {
  /** Vaste sleutel, zodat een aangevinkte actie bij dezelfde bevinding blijft horen. */
  code: string
  titel: string
  waarom: string
  ernst: Ernst
  knoppen: Knop[]
}

export type Trend = 'daling' | 'stijging' | 'stabiel' | 'geen'

/** Wijkt een aantal echt af van wat je op basis van de verhouding verwacht? Twee keer de wortel en minstens 5%. */
export function trend(waargenomen: number | null, verwacht: number | null): Trend {
  if (waargenomen == null || verwacht == null || !Number.isFinite(verwacht) || verwacht <= 0) return 'geen'
  const verschil = waargenomen - verwacht
  if (Math.abs(verschil) <= 2 * Math.sqrt(verwacht) || Math.abs(verschil) / verwacht < 0.05) return 'stabiel'
  return verschil > 0 ? 'stijging' : 'daling'
}

type Maand = { kanalen: Kanaal[] }
type Teller = 'bezoekers' | 'conversies'
type Noemer = 'impressies' | 'bezoekers'

const som = (maanden: Maand[], kies: (ks: Kanaal[]) => Kanaal[], veld: 'impressies' | 'bezoekers' | 'conversies') => {
  let t = 0
  for (const m of maanden) {
    const v = cijfers(kies(m.kanalen))[veld]
    if (v == null) return null
    t += v
  }
  return t
}

/** De trend van een verhouding: deze maand tegen het gemiddelde van de drie maanden ervoor. */
function verhoudingTrend(nu: Maand, ervoor: Maand[], kies: (ks: Kanaal[]) => Kanaal[], teller: Teller, noemer: Noemer): Trend {
  if (ervoor.length < 3) return 'geen'
  const t3 = som(ervoor, kies, teller)
  const n3 = som(ervoor, kies, noemer)
  const c = cijfers(kies(nu.kanalen))
  if (t3 == null || n3 == null || !n3 || c[noemer] == null) return 'geen'
  return trend(c[teller], (c[noemer] as number) * (t3 / n3))
}

/** De trend van een aantal: deze maand tegen het gemiddelde van de drie maanden ervoor. */
function aantalTrend(nu: Maand, ervoor: Maand[], kies: (ks: Kanaal[]) => Kanaal[], veld: 'bezoekers'): Trend {
  if (ervoor.length < 3) return 'geen'
  const t3 = som(ervoor, kies, veld)
  if (t3 == null) return 'geen'
  return trend(cijfers(kies(nu.kanalen))[veld], t3 / 3)
}

const KNOPPEN = {
  doorklik: [
    { tekst: 'Nieuwe invalshoeken testen, niet alleen andere woorden', eigenaar: 'wij' },
    { tekst: 'Video in plaats van stilstaand beeld', eigenaar: 'wij' },
    { tekst: 'Het aanbod naar de eerste seconde halen', eigenaar: 'wij' },
    { tekst: 'Een contentshoot naar voren halen', eigenaar: 'kost_geld' },
  ],
  doorklikZoeken: [
    { tekst: 'Titels en omschrijvingen in Google herschrijven', eigenaar: 'wij' },
    { tekst: "Pagina's voor de best scorende zoekwoorden verbeteren", eigenaar: 'wij' },
  ],
  conversie: [
    { tekst: 'De pagina korter maken en de belofte naar boven halen', eigenaar: 'wij' },
    { tekst: 'Het formulier korter maken of in stappen knippen', eigenaar: 'wij' },
    { tekst: 'Bewijs toevoegen: reviews, cijfers, gezichten', eigenaar: 'wij' },
    { tekst: 'Een instapaanbod met een lagere drempel', eigenaar: 'jullie' },
  ],
  bezoekers: [
    { tekst: 'Budget verschuiven van het zwakste naar het sterkste kanaal', eigenaar: 'wij' },
    { tekst: 'Nieuwe doelgroepen of zoekwoorden testen', eigenaar: 'wij' },
    { tekst: 'Advertentiebudget verhogen', eigenaar: 'kost_geld' },
  ],
  meting: [
    { tekst: 'Google Analytics koppelen aan het portaal', eigenaar: 'wij' },
    { tekst: 'James Robinson toegang geven tot Google Analytics', eigenaar: 'jullie' },
  ],
  leerfase: [
    { tekst: 'Doelgroepen verbreden zodra een kanaal genoeg resultaten per week haalt', eigenaar: 'wij' },
    { tekst: 'Elke twee weken nieuwe advertentievarianten', eigenaar: 'wij' },
    { tekst: 'Beeld en verhalen aanleveren voor nieuwe varianten', eigenaar: 'jullie' },
  ],
  opKoers: [
    { tekst: 'Een nieuwe variant testen op het sterkste kanaal', eigenaar: 'wij' },
    { tekst: 'Budget verhogen op het sterkste kanaal', eigenaar: 'kost_geld' },
  ],
} satisfies Record<string, Knop[]>

/** De zin bij de matrix van benchmark en trend, of null als er niets te melden is. */
function lezing(o: Oordeel, t: Trend, seizoen: boolean, wat: string): { ernst: Ernst; tekst: string } | null {
  const sz = seizoen ? ' Vorig jaar zagen we in deze maand hetzelfde; mogelijk speelt het seizoen een rol.' : ''
  const onder = o === 'slecht'
  if (t === 'daling' && onder) return { ernst: 'urgent', tekst: `${wat} is gedaald ten opzichte van de drie maanden ervoor en ligt duidelijk onder de benchmark.${sz}` }
  if (t === 'daling' && (o === 'goed' || o === 'matig'))
    return { ernst: 'aandacht', tekst: `We zien een daling ten opzichte van de drie maanden ervoor, maar we zitten nog ${o === 'goed' ? 'boven' : 'rond'} de benchmark.${sz}` }
  if (t === 'daling') return { ernst: 'aandacht', tekst: `${wat} is gedaald ten opzichte van de drie maanden ervoor.${sz}` }
  if (onder) return { ernst: 'urgent', tekst: `${wat} ligt duidelijk onder de benchmark, en dat is niet nieuw: de drie maanden ervoor lag het niet hoger.` }
  return null
}

export type AnalyseInvoer = {
  nu: Maand
  /** De drie maanden voor deze maand, oudste eerst. */
  ervoor: Maand[]
  /** Dezelfde maand vorig jaar en de drie maanden daarvoor, voor de seizoenscheck. */
  vorigJaar: Maand | null
  vorigJaarErvoor: Maand[]
  /** Oordeel tegen de benchmark per selectie. */
  oordelen: Record<string, { ctr: Oordeel; cvr: Oordeel }>
  leerfase: boolean
  metGa4: boolean
}

/** Alle bevindingen, belangrijkste eerst. Altijd minstens één: anders "op koers". */
export function analyseer(a: AnalyseInvoer): Bevinding[] {
  const uit: Bevinding[] = []

  if (!a.metGa4) {
    uit.push({
      code: 'meting',
      titel: 'De meting is nog niet compleet',
      waarom: 'Google Analytics is nog niet gekoppeld. Zonder bezoekers en conversies kunnen we de rest niet goed beoordelen.',
      ernst: 'aandacht',
      knoppen: KNOPPEN.meting,
    })
    return uit
  }

  if (a.leerfase) {
    uit.push({
      code: 'leerfase',
      titel: 'De platformen leren nog',
      waarom: 'De eerste drie maanden na de livegang verzamelen de platformen data. We sturen bij, maar trekken nog geen harde conclusies.',
      ernst: 'neutraal',
      knoppen: KNOPPEN.leerfase,
    })
  }

  const seizoen = (kies: (ks: Kanaal[]) => Kanaal[], teller: Teller, noemer: Noemer) =>
    a.vorigJaar != null && verhoudingTrend(a.vorigJaar, a.vorigJaarErvoor, kies, teller, noemer) === 'daling'

  // Doorklikken, per kanaal met impressies: daar zit het verschil, niet in het totaal.
  for (const k of a.nu.kanalen) {
    if (!k.actief || k.impressies == null || !(k.impressies > 0)) continue
    const kies = (ks: Kanaal[]) => ks.filter((x) => x.bron === k.bron)
    const t = verhoudingTrend(a.nu, a.ervoor, kies, 'bezoekers', 'impressies')
    const o = a.leerfase ? 'leerfase' : a.oordelen[k.bron]?.ctr ?? 'geen'
    const l = lezing(o, t, t === 'daling' && seizoen(kies, 'bezoekers', 'impressies'), `Het deel dat doorklikt op ${BRON_LABEL[k.bron as Bron]}`)
    if (!l) continue
    uit.push({
      code: `doorklik:${k.bron}`,
      titel: `${t === 'daling' ? 'Minder' : 'Te weinig'} mensen klikken door op ${BRON_LABEL[k.bron as Bron]}`,
      waarom: l.tekst,
      ernst: a.leerfase ? 'neutraal' : l.ernst,
      knoppen: k.bron === 'organisch_zoeken' ? KNOPPEN.doorklikZoeken : KNOPPEN.doorklik,
    })
  }

  // Converteren, over alle kanalen.
  {
    const kies = (ks: Kanaal[]) => ks
    const t = verhoudingTrend(a.nu, a.ervoor, kies, 'conversies', 'bezoekers')
    const o = a.leerfase ? 'leerfase' : a.oordelen.alle?.cvr ?? 'geen'
    const l = lezing(o, t, t === 'daling' && seizoen(kies, 'conversies', 'bezoekers'), 'Het deel van de bezoekers dat converteert')
    if (l)
      uit.push({
        code: 'conversie:alle',
        titel: t === 'daling' ? 'Minder bezoekers worden klant' : 'Bezoekers worden te weinig klant',
        waarom: l.tekst,
        ernst: a.leerfase ? 'neutraal' : l.ernst,
        knoppen: KNOPPEN.conversie,
      })
  }

  // Aantal bezoekers: minder bereik zonder dat de verhoudingen veranderen.
  {
    const kies = (ks: Kanaal[]) => ks
    if (aantalTrend(a.nu, a.ervoor, kies, 'bezoekers') === 'daling') {
      const sz = a.vorigJaar != null && aantalTrend(a.vorigJaar, a.vorigJaarErvoor, kies, 'bezoekers') === 'daling'
      uit.push({
        code: 'bezoekers:alle',
        titel: 'Minder websitebezoekers',
        waarom: `Er kwamen duidelijk minder bezoekers dan gemiddeld in de drie maanden ervoor.${sz ? ' Vorig jaar zagen we in deze maand hetzelfde; mogelijk speelt het seizoen een rol.' : ''}`,
        ernst: a.leerfase ? 'neutraal' : 'aandacht',
        knoppen: KNOPPEN.bezoekers,
      })
    }
  }

  if (!uit.length || uit.every((b) => b.code === 'leerfase')) {
    if (!uit.length)
      uit.push({
        code: 'op_koers',
        titel: 'Op koers',
        waarom: 'Geen verhouding wijkt duidelijk af: niet van de benchmark, en niet van de drie maanden ervoor.',
        ernst: 'goed',
        knoppen: KNOPPEN.opKoers,
      })
  }

  const VOLGORDE: Record<Ernst, number> = { urgent: 0, aandacht: 1, neutraal: 2, goed: 3 }
  return uit.sort((x, y) => VOLGORDE[x.ernst] - VOLGORDE[y.ernst])
}
