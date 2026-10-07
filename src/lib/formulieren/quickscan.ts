/* -------------------------------------------------------------------------
   Stap 02 · De quickscan (02.1) en het scanrapport (02.2).

   De punten en normen staan hier één keer, zoals in het document 02.1. Nu
   doen we punt 1 tot en met 16 met de hand; 17 tot en met 24 komen erbij
   zodra het portaal ze met AI kan doen. Verandert er een norm, dan hier en in
   het document tegelijk.
   ------------------------------------------------------------------------- */

export type ScanKleur = 'groen' | 'oranje' | 'rood' | 'nvt'

export type Oplosser = 'fundament' | 'webmix' | 'klant' | 'info' | 'stop'

export type ScanPunt = {
  nr: number
  groep: 'techniek' | 'aanvraagpad' | 'markt'
  naam: string
  /** Hoe de klant het op het scanrapport leest. Leeg: niet op het rapport. */
  uitleg: string
  waarmee: string
  /** Zonder normen: ter informatie, geen kleur. */
  normen: { groen: string; oranje: string; rood: string } | null
  oplosser: Oplosser
  lostOp: string
  /** De Webmix-post met bedrag, voor het scanrapport. */
  webmix?: { post: string; bedrag: string }
}

export const GROEPEN = {
  techniek: 'Techniek · kan de klant meten, en is de site in orde',
  aanvraagpad: 'Het aanvraagpad · wordt een bezoeker een aanvraag',
  markt: 'De markt · wat ziet de koper',
} as const

export const PUNTEN: ScanPunt[] = [
  {
    nr: 1, groep: 'techniek', naam: 'Snelheid op mobiel', uitleg: 'Hoe snel je pagina’s laden op een telefoon',
    waarmee: 'PageSpeed Insights, drie keer, middelste telt',
    normen: { groen: 'LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1', oranje: 'Niets slecht, minstens één ertussen', rood: 'LCP > 4 s, INP > 500 ms of CLS > 0,25' },
    oplosser: 'webmix', lostOp: 'Webmix: snelheid', webmix: { post: 'Snelheid in de site zelf', bedrag: '€ 750' },
  },
  {
    nr: 2, groep: 'techniek', naam: 'Beveiliging', uitleg: 'Of je site overal veilig verbindt (https)',
    waarmee: 'SSL Labs, met en zonder www',
    normen: { groen: 'A+, A of A−; http stuurt door naar https', oranje: 'B of C', rood: 'D–F, T of M, verlopen, niet volledig https' },
    oplosser: 'webmix', lostOp: 'Via de hosting',
  },
  {
    nr: 3, groep: 'techniek', naam: 'Redirects en dode links', uitleg: 'Of elke link op je site ergens uitkomt',
    waarmee: 'Screaming Frog (gratis tot 500 pagina’s)',
    normen: { groen: 'Geen dode interne links; omleiding hooguit één stap', oranje: '1–3 dode links buiten het kernpad, of ketens van 2–4', rood: 'Meer, een dode link in menu of dienstpagina, keten ≥ 5 of een lus' },
    oplosser: 'webmix', lostOp: 'Webmix: redirects', webmix: { post: 'Redirects en dode links', bedrag: '€ 500' },
  },
  {
    nr: 4, groep: 'techniek', naam: 'E-mailauthenticatie', uitleg: 'Of mail van jouw domein als echt wordt herkend',
    waarmee: 'internet.nl en MXToolbox',
    normen: { groen: 'SPF (~all/-all), DMARC op quarantine of reject, DKIM aantoonbaar', oranje: 'SPF + DMARC op none, of DKIM niet vast te stellen', rood: 'Geen SPF én geen DKIM, SPF +all of ?all, of geen DMARC' },
    oplosser: 'webmix', lostOp: 'Webmix: e-mail', webmix: { post: 'E-mailauthenticatie', bedrag: '€ 250' },
  },
  {
    nr: 5, groep: 'techniek', naam: 'Hosting', uitleg: 'Hoe snel je server antwoordt',
    waarmee: 'Tijd tot de eerste byte',
    normen: { groen: '≤ 0,8 s: niets doen', oranje: '0,8–1,8 s: blijven, met kanttekening', rood: '> 1,8 s: verhuizen adviseren' },
    oplosser: 'webmix', lostOp: 'Webmix: hosting', webmix: { post: 'Hosting en onderhoud, alleen als de klant overzet; migratie is gratis', bedrag: '€ 85 p/m' },
  },
  {
    nr: 6, groep: 'techniek', naam: 'Meting', uitleg: 'Of bezoek op je site goed wordt geteld',
    waarmee: 'Tag Assistant, netwerkverkeer',
    normen: { groen: 'Eén GA4-code, één paginaweergave per pagina', oranje: 'Dubbel geladen, of op een pagina afwezig', rood: 'Geen GA4, of alleen Universal Analytics' },
    oplosser: 'fundament', lostOp: 'Fundament',
  },
  {
    nr: 7, groep: 'techniek', naam: 'Toestemming', uitleg: 'Of je cookiemelding doet wat de wet vraagt',
    waarmee: 'De browser, zonder iets te klikken',
    normen: { groen: 'Geen marketingtracking vóór toestemming of na weigeren; weigeren even makkelijk', oranje: 'Analytics vóór toestemming, niet vast te stellen of dat mag', rood: 'Tracking vóór toestemming of na weigeren; weigeren niet op de eerste laag' },
    oplosser: 'webmix', lostOp: 'Webmix: Cookiescript', webmix: { post: 'Cookiescript', bedrag: '€ 150 p/j' },
  },
  {
    nr: 8, groep: 'techniek', naam: 'Platform', uitleg: 'Of er een meetcode in je site kan',
    waarmee: 'Wappalyzer of de broncode',
    normen: { groen: 'Er kan een meetcode in', oranje: 'Alleen met duurder abonnement of via de beheerder', rood: 'Er kan geen code in: de stopknop' },
    oplosser: 'stop', lostOp: 'Bij rood gaat de afspraak niet door',
  },
  {
    nr: 9, groep: 'techniek', naam: 'Vindbaarheid', uitleg: 'Of Google je homepage en dienstpagina’s vindt',
    waarmee: 'Google site:, robots.txt',
    normen: { groen: 'Homepage en dienstpagina’s gevonden, niets geblokkeerd', oranje: 'Een dienstpagina niet gevonden, zonder blokkade', rood: 'Homepage niet gevonden, noindex, of robots.txt blokkeert' },
    oplosser: 'fundament', lostOp: 'Fundament',
  },
  {
    nr: 10, groep: 'aanvraagpad', naam: 'Aanvragen op mobiel', uitleg: 'Of iemand op een telefoon snel een aanvraag kan doen',
    waarmee: 'Eigen telefoon, 390 pixels breed',
    normen: { groen: 'In het eerste scherm, binnen twee tikken, knop ≥ 44 px', oranje: 'Pas na scrollen, tikvlak 24–44 px, 6–8 verplichte velden', rood: 'Binnen drie tikken niets, tikvlak < 24 px, formulier werkt niet' },
    oplosser: 'fundament', lostOp: 'Fundament: landingspagina',
  },
  {
    nr: 11, groep: 'aanvraagpad', naam: 'Bedankpagina', uitleg: 'Of een aanvraag te meten is',
    waarmee: 'De crawl en de tagconfiguratie. Nooit zelf een aanvraag doen',
    normen: { groen: 'Eigen bedankpagina of specifiek conversie-event', oranje: 'Alleen een melding op dezelfde pagina', rood: 'Geen meetcode, of het formulier geeft een fout' },
    oplosser: 'fundament', lostOp: 'Fundament',
  },
  {
    nr: 12, groep: 'aanvraagpad', naam: 'Wat verkoop je, meteen', uitleg: 'Of iemand direct ziet wat je doet, voor wie en waar',
    waarmee: 'Screenshot eerste scherm; twee mensen los van elkaar',
    normen: { groen: 'Wat, aan wie en waar: alle drie', oranje: 'Twee van de drie, of alleen uit een slogan', rood: 'Hooguit één' },
    oplosser: 'fundament', lostOp: 'Fundament: propositie',
  },
  {
    nr: 13, groep: 'markt', naam: 'Adverteert de klant al?', uitleg: '',
    waarmee: 'Ads Transparency Center, Meta Ad Library', normen: null,
    oplosser: 'info', lostOp: 'Bestaande accounts nemen we over',
  },
  {
    nr: 14, groep: 'markt', naam: 'Wie adverteert op de zoekwoorden?', uitleg: '',
    waarmee: 'Google Ads-voorbeeld, het gebied van de klant, mobiel', normen: null,
    oplosser: 'info', lostOp: 'Bepaalt de klikprijs, dus de rekensom',
  },
  {
    nr: 15, groep: 'markt', naam: 'Wat ziet wie de klant zoekt?', uitleg: 'Wat iemand ziet die op je bedrijfsnaam zoekt',
    waarmee: 'Zoeken op bedrijfsnaam',
    normen: { groen: 'Geen concurrent op de naam', oranje: 'Wel, maar de klant staat zelf bovenaan', rood: 'Wel, en de klant adverteert zelf niet op de eigen naam' },
    oplosser: 'fundament', lostOp: 'Fundament: merkcampagne',
  },
  {
    nr: 16, groep: 'markt', naam: 'Bedrijfsprofiel en reviews', uitleg: 'Je score, het aantal reviews en of je reageert',
    waarmee: 'Google Maps op een telefoon',
    normen: { groen: '≥ 4,5, ≥ 20 reviews, nieuwste ≤ 30 dagen, ≥ 80% beantwoord', oranje: '4,0–4,4, of 5–19 reviews, of nieuwste 31–90 dagen', rood: '< 4,0, < 5 reviews, nieuwste > 90 dagen, of geen reacties' },
    oplosser: 'klant', lostOp: 'De klant zelf',
  },
]

export type PuntInvulling = { kleur?: ScanKleur | null; gezien?: string; notitie?: string }
export type Bevinding = { punt: number | null; gezien: string; gevolg: string }
export type ScanInvulling = {
  zoektermen?: string
  gebied?: string
  punten: Record<string, PuntInvulling>
  bevindingen: Bevinding[]
}

export type ScanStand = {
  /** Alle kleurpunten een kleur (of n.v.t. met reden), 13 en 14 ingevuld. */
  compleet: boolean
  ontbreekt: string[]
  /** Punt 8 op rood: de afspraak gaat niet door. */
  stopknop: boolean
  telling: Record<'groen' | 'oranje' | 'rood', number>
  /** Oranje en rode punten per oplosser: de actielijst. */
  acties: { oplosser: Oplosser; punten: ScanPunt[] }[]
  /** De Webmix-posten met bedrag voor het scanrapport (oranje of rood). */
  webmix: { nr: number; post: string; bedrag: string }[]
}

export function standVanScan(s: ScanInvulling): ScanStand {
  const ontbreekt: string[] = []
  const telling = { groen: 0, oranje: 0, rood: 0 }
  const fout: ScanPunt[] = []
  for (const p of PUNTEN) {
    const inv = s.punten[String(p.nr)] ?? {}
    if (!p.normen) {
      if (!inv.gezien?.trim()) ontbreekt.push(`Punt ${p.nr} · ${p.naam}: noteer wat je zag`)
      continue
    }
    if (!inv.kleur) ontbreekt.push(`Punt ${p.nr} · ${p.naam}: geen kleur`)
    else if (inv.kleur === 'nvt' && !inv.notitie?.trim()) ontbreekt.push(`Punt ${p.nr} · ${p.naam}: n.v.t. zonder reden`)
    if (inv.kleur === 'groen' || inv.kleur === 'oranje' || inv.kleur === 'rood') telling[inv.kleur]++
    if (inv.kleur === 'oranje' || inv.kleur === 'rood') fout.push(p)
  }
  const gekozen = s.bevindingen.filter((b) => b.punt !== null && b.gezien.trim() && b.gevolg.trim())
  if (gekozen.length < 3) ontbreekt.push(`Drie bevindingen met het gevolg in de getallen van de klant (nu ${gekozen.length})`)
  const volgorde: Oplosser[] = ['stop', 'fundament', 'webmix', 'klant']
  return {
    compleet: ontbreekt.length === 0,
    ontbreekt,
    stopknop: s.punten['8']?.kleur === 'rood',
    telling,
    acties: volgorde.map((o) => ({ oplosser: o, punten: fout.filter((p) => p.oplosser === o) })).filter((g) => g.punten.length > 0),
    webmix: fout.flatMap((p) => (p.webmix ? [{ nr: p.nr, ...p.webmix }] : [])),
  }
}

export const OPLOSSER_LABEL: Record<Oplosser, string> = {
  stop: 'De stopknop',
  fundament: 'Fundament',
  webmix: 'Webmix',
  klant: 'Klant zelf',
  info: 'Ter informatie',
}
