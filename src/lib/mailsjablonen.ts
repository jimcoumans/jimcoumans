import { formatDateLong } from './dates'
import { vulIn, pasVoorwaardenToe } from './invullen'

/* -------------------------------------------------------------------------
   Mails aan een kandidaat of nieuwe collega, als sjabloon.

   Het portaal verstuurt deze mails niet zelf. Ze openen in je eigen
   mailprogramma, ingevuld, zodat ze uit je eigen postvak komen, in je eigen
   toon, en je de pdf van het contract als bijlage kunt meesturen. Wat tussen
   [haken] staat, vul je zelf in voordat je verstuurt.

   De teksten zijn te wijzigen bij Standaardteksten. Zonder eigen versie
   geldt de standaardtekst hieronder.
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
  /** Het contract in het kort, een regel per punt. */
  samenvatting?: string | null
}

export type MailSleutel = 'mail_contract' | 'mail_afschrift' | 'mail_gegevens' | 'mail_welkom'

export const MAIL_PLAATSHOUDERS: Record<string, string> = {
  roepnaam: 'Roepnaam van de ontvanger',
  functie: 'Functie',
  startdatum: 'Eerste werkdag, voluit',
  afzender: 'Jouw naam',
  merk: 'Naam van het bedrijf: James Robinson',
  gegevenslink: 'Persoonlijke link om gegevens aan te leveren',
  link_dagen: 'Hoeveel dagen die link geldig is',
  handboek_link: 'Link naar het personeelshandboek bij dit contract',
  werkadres: 'Adres van de hoofdvestiging',
  werk_email: 'Het nieuwe werkadres (e-mail)',
  inlog_url: 'Adres van de inlogpagina van het portaal',
  samenvatting: 'Het contract in het kort: functie, periode, uren, salaris en standplaats',
}

export const MAIL_VOORWAARDEN: Record<string, string> = {
  startdatum: 'De startdatum is bekend',
  gegevenslink: 'Er is een geldige invullink',
  handboek: 'Er hoort een personeelshandboek bij het contract',
  werkadres: 'Er is een hoofdvestiging',
  werk_email: 'Er is een werkadres (e-mail)',
  inlog_url: 'Het adres van het portaal is bekend',
  samenvatting: 'Er is een contract om samen te vatten',
}

const GEGEVENS_ALINEA = `{{#als gegevenslink}}Voor de salarisadministratie hebben we nog een paar gegevens nodig: je adres, je IBAN, een kopie van je ID en het loonheffingsformulier. Die vul je in via deze persoonlijke link, zonder inloggen:

{{gegevenslink}}

De link is {{link_dagen}} dagen geldig. Alles wordt versleuteld opgeslagen.

{{/als}}`

const GROET = `Met vriendelijke groet,
{{afzender}}
{{merk}}`

export const MAIL_SJABLONEN: Record<MailSleutel, { label: string; uitleg: string; onderwerp: string; tekst: string }> = {
  mail_contract: {
    label: 'Contract versturen',
    uitleg: 'De knop "Mail het contract" bij een kandidaat. De pdf van het contract en de AVG-verklaring voeg je zelf als bijlage toe.',
    onderwerp: 'Je contract bij {{merk}}',
    tekst: `Beste {{roepnaam}},

Zoals besproken: in de bijlage vind je je arbeidsovereenkomst als {{functie}}{{#als startdatum}}, met ingang van {{startdatum}}{{/als}}, en de AVG-verklaring die erbij hoort. Lees ze rustig door. Klopt alles, dan tekenen we samen; parafeer je elke pagina van het contract en vul je de AVG-verklaring in.

{{#als samenvatting}}In het kort:
{{samenvatting}}

{{/als}}
{{#als handboek}}Bij het contract hoort ons personeelshandboek. Lees het voordat je tekent:
{{handboek_link}}

{{/als}}${GEGEVENS_ALINEA}Is er iets niet duidelijk, bel of app me gerust. Liever nu een vraag dan later een misverstand.

${GROET}`,
  },
  mail_afschrift: {
    label: 'Afschrift na het tekenen',
    uitleg: 'Na de ondertekening: het getekende contract en de AVG-verklaring voeg je zelf als bijlage toe.',
    onderwerp: 'Je getekende contract bij {{merk}}',
    tekst: `Beste {{roepnaam}},

Fijn dat we getekend hebben. In de bijlage vind je je afschrift van de getekende arbeidsovereenkomst als {{functie}} en de getekende AVG-verklaring. Bewaar ze goed.

{{#als samenvatting}}In het kort:
{{samenvatting}}

{{/als}}{{#als handboek}}Het personeelshandboek lees je altijd terug via deze link:
{{handboek_link}}

{{/als}}Vragen? Bel of app me gerust.

${GROET}`,
  },
  mail_gegevens: {
    label: 'Gegevens opvragen',
    uitleg: 'Alleen de invullink, als het contract al onderweg is.',
    onderwerp: 'Je gegevens voor de salarisadministratie',
    tekst: `Beste {{roepnaam}},

${GEGEVENS_ALINEA}${GROET}`,
  },
  mail_welkom: {
    label: 'Welkom, voor de eerste werkdag',
    uitleg: 'Na de aanname, met het werkadres en hoe je inlogt.',
    onderwerp: 'Welkom bij {{merk}}',
    tekst: `Beste {{roepnaam}},

Welkom in de selectie. {{#als startdatum}}Op {{startdatum}}{{/als}}{{#alsniet startdatum}}Op je eerste werkdag{{/alsniet}} begin je bij ons als {{functie}}. We verwachten je om [tijd]{{#als werkadres}} op {{werkadres}}{{/als}}.

{{#als werk_email}}Je werkadres is {{werk_email}}. Daarmee log je in op ons portaal{{#als inlog_url}} via {{inlog_url}}{{/als}}: je vult je adres in en krijgt een inloglink per mail.

{{/als}}De eerste dag: [programma, wie je ontvangt, wat je meeneemt].

Tot dan.

${GROET}`,
  },
}

/** Eigen versies uit het portaal, per sleutel. */
export type MailTeksten = Map<string, { subject: string | null; body: string }>

function maak(sleutel: MailSleutel, c: MailContext, eigen?: MailTeksten): Mail {
  const standaard = MAIL_SJABLONEN[sleutel]
  const versie = eigen?.get(sleutel)
  const geldt = {
    startdatum: !!c.startdatum,
    gegevenslink: !!c.gegevenslink,
    handboek: !!c.handboekLink,
    werkadres: !!c.werkadres,
    werk_email: !!c.werkEmail,
    inlog_url: !!c.inlogUrl,
    samenvatting: !!c.samenvatting,
  }
  const waarden: Record<string, string> = {
    roepnaam: c.roepnaam,
    functie: c.functie,
    startdatum: c.startdatum ? formatDateLong(c.startdatum) : '',
    afzender: c.afzender,
    merk: c.merk ?? 'James Robinson',
    gegevenslink: c.gegevenslink ?? '',
    link_dagen: String(c.linkDagen ?? 14),
    handboek_link: c.handboekLink ?? '',
    werkadres: c.werkadres ?? '',
    werk_email: c.werkEmail ?? '',
    inlog_url: c.inlogUrl ?? '',
    samenvatting: c.samenvatting ?? '',
  }
  const vul = (bron: string) => vulIn(pasVoorwaardenToe(bron, geldt).tekst, waarden).tekst.replace(/\n{3,}/g, '\n\n').trim()
  return { aan: c.aan, onderwerp: vul(versie?.subject || standaard.onderwerp), tekst: vul(versie?.body || standaard.tekst) }
}

/** Het contract ter ondertekening, met de invullink erbij. */
export function contractMail(c: MailContext, eigen?: MailTeksten): Mail {
  return maak('mail_contract', c, eigen)
}

/** Na het tekenen: het afschrift van het getekende contract. */
export function afschriftMail(c: MailContext, eigen?: MailTeksten): Mail {
  return maak('mail_afschrift', c, eigen)
}

/** Alleen de invullink, als het contract al onderweg is. */
export function gegevensMail(c: MailContext, eigen?: MailTeksten): Mail {
  return maak('mail_gegevens', c, eigen)
}

/** Welkom, voor de eerste werkdag. */
export function welkomMail(c: MailContext, eigen?: MailTeksten): Mail {
  return maak('mail_welkom', c, eigen)
}

/** Een mailto-link die het mailprogramma opent met alles ingevuld. */
export function mailtoLink(m: Mail): string {
  return `mailto:${encodeURIComponent(m.aan)}?subject=${encodeURIComponent(m.onderwerp)}&body=${encodeURIComponent(m.tekst)}`
}
