import { formatDateLong } from './dates'

/* -------------------------------------------------------------------------
   Mails aan een kandidaat of nieuwe collega, als sjabloon.

   Het portaal verstuurt deze mails niet zelf. Ze openen in je eigen
   mailprogramma, ingevuld, zodat ze uit je eigen postvak komen, in je eigen
   toon, en je de pdf van het contract als bijlage kunt meesturen. Wat tussen
   [haken] staat, vul je zelf in voordat je verstuurt.
   ------------------------------------------------------------------------- */

export type Mail = { aan: string; onderwerp: string; tekst: string }

export type MailContext = {
  aan: string
  roepnaam: string
  functie: string
  startdatum: Date | null
  afzender: string
  /** De persoonlijke link voor de persoonsgegevens, als die er is. */
  gegevenslink?: string | null
  linkDagen?: number
  werkadres?: string | null
  werkEmail?: string | null
  inlogUrl?: string | null
  /** De link naar de versie van het personeelshandboek die bij het contract hoort. */
  handboekLink?: string | null
  /** De naam van het bedrijf zoals we hem voeren. */
  merk?: string | null
}

function groet(c: MailContext): string {
  return `Met vriendelijke groet,\n${c.afzender}\n${c.merk ?? 'James Robinson'}`
}

function gegevensAlinea(c: MailContext): string {
  if (!c.gegevenslink) return ''
  return `Voor de salarisadministratie hebben we nog een paar gegevens nodig: je adres, je IBAN, een kopie van je ID en het loonheffingsformulier. Die vul je in via deze persoonlijke link, zonder inloggen:\n\n${c.gegevenslink}\n\nDe link is ${c.linkDagen ?? 14} dagen geldig. Alles wordt versleuteld opgeslagen.\n\n`
}

/** Het contract ter ondertekening, met de invullink erbij. */
export function contractMail(c: MailContext): Mail {
  return {
    aan: c.aan,
    onderwerp: `Je contract bij ${c.merk ?? 'James Robinson'}`,
    tekst:
      `Beste ${c.roepnaam},\n\n` +
      `Zoals besproken: in de bijlage vind je je arbeidsovereenkomst als ${c.functie}${c.startdatum ? `, met ingang van ${formatDateLong(c.startdatum)}` : ''}, en de AVG-verklaring die erbij hoort. Lees ze rustig door. Klopt alles, dan tekenen we samen; parafeer je elke pagina van het contract en vul je de AVG-verklaring in.\n\n` +
      (c.handboekLink ? `Bij het contract hoort ons personeelshandboek. Lees het voordat je tekent:\n${c.handboekLink}\n\n` : '') +
      gegevensAlinea(c) +
      `Is er iets niet duidelijk, bel of app me gerust. Liever nu een vraag dan later een misverstand.\n\n` +
      groet(c),
  }
}

/** Alleen de invullink, als het contract al onderweg is. */
export function gegevensMail(c: MailContext): Mail {
  return {
    aan: c.aan,
    onderwerp: 'Je gegevens voor de salarisadministratie',
    tekst: `Beste ${c.roepnaam},\n\n` + (gegevensAlinea(c) || 'De link volgt.\n\n') + groet(c),
  }
}

/** Welkom, voor de eerste werkdag. */
export function welkomMail(c: MailContext): Mail {
  return {
    aan: c.aan,
    onderwerp: 'Welkom bij James Robinson',
    tekst:
      `Beste ${c.roepnaam},\n\n` +
      `Welkom in de selectie. ${c.startdatum ? `Op ${formatDateLong(c.startdatum)}` : 'Op je eerste werkdag'} begin je bij ons als ${c.functie}. We verwachten je om [tijd]${c.werkadres ? ` op ${c.werkadres}` : ''}.\n\n` +
      (c.werkEmail
        ? `Je werkadres is ${c.werkEmail}. Daarmee log je in op ons portaal${c.inlogUrl ? ` via ${c.inlogUrl}` : ''}: je vult je adres in en krijgt een inloglink per mail.\n\n`
        : '') +
      `De eerste dag: [programma, wie je ontvangt, wat je meeneemt].\n\n` +
      `Tot dan.\n\n` +
      groet(c),
  }
}

/** Een mailto-link die het mailprogramma opent met alles ingevuld. */
export function mailtoLink(m: Mail): string {
  return `mailto:${encodeURIComponent(m.aan)}?subject=${encodeURIComponent(m.onderwerp)}&body=${encodeURIComponent(m.tekst)}`
}
