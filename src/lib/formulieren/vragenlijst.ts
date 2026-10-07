/* -------------------------------------------------------------------------
   Stap 01 · De vragenlijst (01.1) en de beoordeling (01.2).

   De vragen staan hier één keer, in de volgorde en met de woorden van het
   document 01.1. Het portaal toont ze aan de klant, bewaart de antwoorden in
   het dossier, en past de regels van 01.2 toe: groen, oranje, later of rood,
   met de rekensom erbij. Verandert er een vraag of een regel, dan hier en in
   het document tegelijk.
   ------------------------------------------------------------------------- */

export type Vraag =
  | { id: string; nr: number; vraag: string; hulp?: string; soort: 'keuze'; opties: string[] }
  | { id: string; nr: number; vraag: string; hulp?: string; soort: 'meer'; opties: string[]; anders?: boolean }
  | { id: string; nr: number; vraag: string; hulp?: string; soort: 'tekst' | 'url' }
  | { id: string; nr: number; vraag: string; hulp?: string; soort: 'getal'; voor?: string; na?: string; min?: number; max?: number }

export const BUDGET_BANDEN = ['Minder dan € 1.000', '€ 1.000 – 2.500', '€ 2.500 – 5.000', 'Meer dan € 5.000'] as const

export const NOG_GEEN_WEBSITE = 'Ik heb nog geen website'
export const WEET_IK_NIET = 'Weet ik niet'

export const VRAGEN: Vraag[] = [
  { id: 'aanWie', nr: 1, vraag: 'Aan wie verkoop je?', soort: 'keuze', opties: ['Aan bedrijven', 'Aan particulieren', 'Aan allebei'] },
  {
    id: 'hoeKlant',
    nr: 2,
    vraag: 'Hoe word je klant bij jou?',
    soort: 'keuze',
    opties: ['Ze vragen een offerte, afspraak of reservering aan', 'Ze kopen direct online', 'Ze komen langs in de winkel of zaak', 'Een combinatie'],
  },
  { id: 'watVerkoop', nr: 3, vraag: 'Wat verkoop je, in één zin?', hulp: 'Geen slogan. Gewoon wat iemand bij je koopt.', soort: 'tekst' },
  { id: 'waar', nr: 4, vraag: 'Waar zitten je klanten?', soort: 'keuze', opties: ['In de regio rond mijn vestiging', 'In heel Nederland', 'In Nederland en daarbuiten'] },
  {
    id: 'budgetNu',
    nr: 5,
    vraag: 'Wat geef je nu per maand uit aan marketing, alles bij elkaar?',
    hulp: 'Advertenties, bureaus, freelancers, drukwerk. Waarom we dit vragen: om te zien of we bij je passen. Ons kleinste pakket kost, samen met het advertentiebudget, ongeveer € 2.000 per maand.',
    soort: 'keuze',
    opties: ['Nog niets', ...BUDGET_BANDEN],
  },
  {
    id: 'waaraan',
    nr: 6,
    vraag: 'Waar geef je het aan uit?',
    hulp: 'Kies alles wat van toepassing is. Koos je bij vraag 5 “nog niets”? Kruis dan aan waar je het aan wilt gaan uitgeven.',
    soort: 'meer',
    opties: [
      'Google of Bing',
      'Facebook of Instagram',
      'LinkedIn',
      'TikTok',
      'Vindbaar zonder advertenties',
      'E-mail',
      'Social zonder advertenties',
      'Drukwerk, radio of tv',
      'Een bureau of freelancer',
    ],
  },
  {
    id: 'budgetGepland',
    nr: 6,
    vraag: 'Wat wil je per maand gaan uitgeven?',
    hulp: 'Alleen als je bij vraag 5 “nog niets” koos.',
    soort: 'keuze',
    opties: [...BUDGET_BANDEN],
  },
  { id: 'website', nr: 7, vraag: 'Wat is het adres van je website?', soort: 'url' },
  {
    id: 'opdracht',
    nr: 8,
    vraag: 'Wat is een gemiddelde opdracht bij jou waard?',
    hulp: 'Wat een klant per keer betaalt. Waarom we dit vragen: hieruit rekenen we uit wat een aanvraag je maximaal mag kosten.',
    soort: 'getal',
    voor: '€',
    min: 0,
  },
  {
    id: 'duur',
    nr: 9,
    vraag: 'Hoe lang blijft een klant gemiddeld klant?',
    hulp: 'Sommige klanten blijven jaren, andere komen één keer. Een globaal gemiddelde is genoeg.',
    soort: 'keuze',
    opties: ['Eenmalige aankoop', 'Korter dan een jaar', 'Een tot twee jaar', 'Drie tot vijf jaar', 'Langer dan vijf jaar'],
  },
  {
    id: 'perJaar',
    nr: 10,
    vraag: 'Hoe vaak koopt een klant per jaar bij je?',
    hulp: 'Een getal van 1 tot 52. Sla deze vraag over als je bij vraag 9 “eenmalige aankoop” koos.',
    soort: 'getal',
    na: 'keer per jaar',
    min: 1,
    max: 52,
  },
  {
    id: 'aanvragen',
    nr: 11,
    vraag: 'Hoeveel aanvragen krijg je nu per maand?',
    hulp: 'Telefoon, mail en formulieren samen. Niet het aantal klanten. Waarom we dit vragen: dit is het vertrekpunt waar we straks alles mee vergelijken.',
    soort: 'getal',
    na: 'aanvragen per maand',
    min: 0,
  },
  { id: 'conversie', nr: 12, vraag: 'Hoeveel procent van die aanvragen wordt klant?', hulp: 'Weet je het niet? Laat het dan leeg.', soort: 'getal', na: '%', min: 0, max: 100 },
  {
    id: 'doorlooptijd',
    nr: 13,
    vraag: 'Hoe lang duurt het van eerste contact tot opdracht?',
    soort: 'keuze',
    opties: ['Direct', 'Een paar dagen', 'Een paar weken', 'Een paar maanden', 'Langer dan een half jaar'],
  },
  {
    id: 'knelpunt',
    nr: 14,
    vraag: 'Waar loop je nu tegenaan?',
    hulp: 'Kies alles wat van toepassing is.',
    soort: 'meer',
    anders: true,
    opties: [
      'Ik krijg te weinig aanvragen',
      'Ik krijg wel aanvragen, maar niet de goede',
      'Aanvragen worden te weinig klant',
      'Ik heb geen tijd of kennis om het zelf te doen',
      'Ik weet niet wat mijn marketing oplevert',
    ],
  },
  {
    id: 'beginnen',
    nr: 15,
    vraag: 'Wanneer wil je beginnen?',
    soort: 'keuze',
    opties: ['Zo snel mogelijk', 'Binnen een maand', 'Binnen drie maanden', 'Later dan drie maanden', 'Ik oriënteer me nog'],
  },
]

/** De contactgegevens: bij een telefonische of netwerkaanvraag vullen we die zelf al in. */
export const CONTACT = [
  { id: 'voornaam', label: 'Voornaam' },
  { id: 'achternaam', label: 'Achternaam' },
  { id: 'email', label: 'E-mailadres' },
  { id: 'telefoon', label: 'Telefoon' },
  { id: 'bedrijf', label: 'Bedrijfsnaam' },
  { id: 'rol', label: 'Je rol (eigenaar, marketing, anders)' },
] as const

export type Antwoorden = Record<string, string | string[] | number | null | undefined>

export type Kleur = 'groen' | 'oranje' | 'later' | 'rood'

export type Beoordeling = {
  kleur: Kleur
  /** Waarom, in één zin per punt. Bij oranje: het onderwerp van het kwartier. */
  redenen: string[]
  /** Wat een aanvraag alles bij elkaar maximaal mag kosten, in euro's. Null als het niet te rekenen is. */
  maxPerAanvraag: number | null
  /** De stappen van de rekensom, om te laten zien. */
  rekensom: { label: string; waarde: string }[]
}

const tekst = (a: Antwoorden, id: string) => {
  const w = a[id]
  return typeof w === 'string' ? w.trim() : ''
}
const getal = (a: Antwoorden, id: string): number | null => {
  const w = a[id]
  if (typeof w === 'number') return Number.isFinite(w) ? w : null
  if (typeof w !== 'string' || w.trim() === '') return null
  const n = Number(w.replace(/[€%\s.]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const euro = (n: number) => `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`

/** De rekensom uit 01.2: opdracht × keer per jaar × 30% marge × duur × conversie. */
export function rekensom(a: Antwoorden): Pick<Beoordeling, 'maxPerAanvraag' | 'rekensom'> {
  const opdracht = getal(a, 'opdracht')
  if (opdracht === null || opdracht <= 0) return { maxPerAanvraag: null, rekensom: [] }
  const duur = tekst(a, 'duur')
  const eenmalig = duur === 'Eenmalige aankoop'
  const keer = eenmalig ? 1 : Math.min(52, Math.max(1, getal(a, 'perJaar') ?? 1))
  const jaren = duur === 'Korter dan een jaar' ? 0.5 : 1
  const conv = getal(a, 'conversie')
  const conversie = conv === null ? 20 : Math.min(100, Math.max(0, conv))
  const omzet = opdracht * keer
  const max = Math.round(omzet * 0.3 * jaren * (conversie / 100) * 100) / 100
  return {
    maxPerAanvraag: max,
    rekensom: [
      { label: 'Gemiddelde opdracht (vraag 8)', waarde: euro(opdracht) },
      { label: eenmalig ? 'Eenmalige aankoop: één opdracht' : 'Keer per jaar (vraag 10)', waarde: `× ${keer}` },
      { label: 'Omzet per klant per jaar', waarde: euro(omzet) },
      { label: 'Standaardmarge', waarde: '× 30%' },
      { label: 'Terugverdiend binnen twaalf maanden (vraag 9)', waarde: jaren === 0.5 ? '× ½ jaar' : '× 1 jaar' },
      { label: `Deel van de aanvragen dat klant wordt (vraag 12)${conv === null ? ', “weet ik niet” telt als 20%' : ''}`, waarde: `× ${conversie}%` },
      { label: 'Alles bij elkaar per aanvraag', waarde: euro(max) },
    ],
  }
}

/**
 * De regels van 01.2. Rood gaat voor later, later voor oranje, oranje voor
 * groen. Meer punten op oranje blijft één telefoontje, dat begint met het budget.
 */
export function beoordeel(a: Antwoorden): Beoordeling {
  const som = rekensom(a)
  const rood: string[] = []
  if (tekst(a, 'hoeKlant') === 'Ze kopen direct online') rood.push('Ze kopen direct online: e-commerce is niet onze propositie.')
  const site = tekst(a, 'website')
  if (site === '' || site === NOG_GEEN_WEBSITE) rood.push('Nog geen website: eerst een websiteproject.')
  if (rood.length > 0) return { kleur: 'rood', redenen: rood, ...som }

  const beginnen = tekst(a, 'beginnen')
  if (beginnen === 'Later dan drie maanden' || beginnen === 'Ik oriënteer me nog') {
    return { kleur: 'later', redenen: [`Wil beginnen: ${beginnen.toLowerCase()}. Nu geen gesprek, één bericht rond dat moment.`], ...som }
  }

  const oranje: string[] = []
  const nu = tekst(a, 'budgetNu')
  const budgetLaag = nu === 'Minder dan € 1.000' || (nu === 'Nog niets' && tekst(a, 'budgetGepland') === 'Minder dan € 1.000')
  if (budgetLaag) oranje.push('Budget: minder dan € 1.000 per maand.')
  if (som.maxPerAanvraag !== null && som.maxPerAanvraag < 30) oranje.push(`Wat een aanvraag mag kosten: ${euro(som.maxPerAanvraag)}, onder de € 30.`)
  if (tekst(a, 'aanWie') === 'Aan bedrijven' && tekst(a, 'waar') === 'In de regio rond mijn vestiging' && tekst(a, 'doorlooptijd') === 'Langer dan een half jaar') {
    oranje.push('De markt: bedrijven in de eigen regio, en beslissen duurt langer dan een half jaar.')
  }
  if (oranje.length > 0) return { kleur: 'oranje', redenen: oranje, ...som }
  return { kleur: 'groen', redenen: ['Past: het intakegesprek inplannen, minstens drie werkdagen vooruit.'], ...som }
}

export const KLEUR_LABEL: Record<Kleur, string> = { groen: 'Groen', oranje: 'Oranje', later: 'Later', rood: 'Rood' }
