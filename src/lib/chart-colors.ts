/**
 * Kleuren voor overzichten en grafieken.
 *
 * Deze reeks is GEVALIDEERD op leesbaarheid, niet op gevoel gekozen:
 *   lichtheidsband  PASS  (alle 6 binnen OKLCH L 0,43-0,77)
 *   chroma-vloer    PASS  (geen kleur die als grijs leest)
 *   kleurenblindheid PASS (slechtste buur dE 16,7 protan / 6,3 tritan)
 *   normaal zicht   PASS  (slechtste buur dE 26,2)
 *   contrast        WARN  op teal (2,58:1) - opgevangen doordat elke
 *                         categorie een eigen tekstlabel met bedrag heeft,
 *                         dus identiteit hangt nooit alleen aan kleur
 *
 * De eerdere reeks (blauw, deepblue, paars, oranje, groen, geel, grijs) viel
 * hier hard door: de twee blauwen waren ook met normaal zicht nauwelijks te
 * onderscheiden, en groen naast oranje is voor rood-groenblinden hetzelfde.
 *
 * DE VOLGORDE IS ONDERDEEL VAN DE VALIDATIE. Buren zijn getest, dus kleuren
 * omwisselen of er een aan toevoegen betekent opnieuw valideren.
 *
 * Let ook op: rood, oranje en groen zitten er bewust NIET in. Die hebben in
 * deze app statusbetekenis (negatief saldo, budget raakt op, bijschrijving)
 * en mogen daarom geen categorie aanduiden.
 */
export const CATEGORY_COLORS = [
  '#007AFF', // JR blauw
  '#00B48F', // teal, uit de secundaire knopkleur
  '#9840CC', // JR paars, donkere variant
  '#8A6A00', // oker
  '#005CBF', // JR deep blue
  '#C2185B', // framboos
] as const

/** Grijs voor de restcategorie. Nooit voor een echte categorie. */
export const REST_COLOR = '#ADADB2'

/**
 * Kleur per positie in een lijst. Vanaf de zevende categorie is er geen
 * gevalideerde kleur meer; die krijgt de restkleur in plaats van een
 * verzonnen tint.
 */
export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index] ?? REST_COLOR
}

/** Statuskleuren. Gereserveerd, nooit voor een categorie. */
export const STATUS_COLORS = {
  good: '#25AD42',
  warning: '#F4971A',
  critical: '#EF302B',
  neutral: '#636466',
} as const
