/* -------------------------------------------------------------------------
   Stap 03 · De vragenlijst van het intakegesprek (03.2).

   24 vragen die na het uur beantwoord moeten zijn, zoals in het document.
   Verplicht voor het voorstel: 3, 6, 10 en 24. Wat al uit de vragenlijst of
   de quickscan komt, vraag je niet opnieuw: je toetst het (vraag 2).
   ------------------------------------------------------------------------- */

export type IntakeVraag = { id: string; nr: number; groep: string; vraag: string; hulp: string; opties?: string[]; verplicht?: boolean }

export const INTAKE: IntakeVraag[] = [
  { id: 'i1', nr: 1, groep: 'De aftrap', vraag: 'Wat wil je vandaag uit dit gesprek halen?', hulp: 'Letterlijk noteren. Hier kom je op minuut 57 op terug, en in het voorstelgesprek.' },
  { id: 'i2', nr: 2, groep: 'Jouw situatie', vraag: 'Klopt het beeld uit je vragenlijst?', hulp: 'Klantwaarde, aanvragen per maand, hoeveel er klant worden, doorlooptijd. Noteer alleen wat afwijkt.' },
  { id: 'i3', nr: 3, groep: 'Jouw situatie', vraag: 'Hoeveel extra omzet wil je komend jaar halen?', hulp: 'Voor de rekensom. Zonder antwoord geen voorstel: nabellen.', verplicht: true },
  { id: 'i4', nr: 4, groep: 'Jouw situatie', vraag: 'Wat is je brutomarge, ongeveer?', hulp: 'Zonder antwoord rekenen we met 30%, en dat zeggen we erbij.', opties: ['20%', '30%', '40%', '50%'] },
  { id: 'i5', nr: 5, groep: 'Jouw situatie', vraag: 'Binnen hoeveel tijd moet alles wat je aan marketing uitgeeft zich terugverdienen?', hulp: 'Zonder antwoord: twaalf maanden.', opties: ['6 maanden', '12 maanden', '18 maanden', '24 maanden'] },
  { id: 'i6', nr: 6, groep: 'Jouw situatie', vraag: 'Hoeveel extra aanvragen per maand kun je aan? Waar loopt het vast als het verdubbelt?', hulp: 'Toets 1: is het doel te leveren? Zonder antwoord navragen vóór het voorstel.', verplicht: true },
  { id: 'i7', nr: 7, groep: 'Jouw situatie', vraag: 'Wie belt een aanvraag terug, binnen hoeveel tijd, en wie neemt het over bij vakantie of ziekte?', hulp: 'Afspraak 3 van jouw kant; de meldingen in het dashboard.' },
  { id: 'i8', nr: 8, groep: 'Jouw situatie', vraag: 'Hoe loopt je jaar: zijn er pieken en dalen?', hulp: 'Maandnormen in plaats van een jaargemiddelde, en het budget over het jaar verdelen.' },
  { id: 'i9', nr: 9, groep: 'Jouw situatie', vraag: 'Wie beslist er mee?', hulp: 'Die persoon moet bij het voorstelgesprek zijn.' },
  { id: 'i10', nr: 10, groep: 'Je aanbod en je klant', vraag: 'Welke dienst of welk product moet de campagne opleveren?', hulp: 'Hooguit drie, met de opdrachtwaarde per dienst als die sterk afwijkt. Zonder antwoord geen campagne: nabellen.', verplicht: true },
  { id: 'i11', nr: 11, groep: 'Je aanbod en je klant', vraag: 'Welk werk wil je juist niet meer?', hulp: 'Wordt de uitsluitingen in zoekwoorden en doelgroepen.' },
  { id: 'i12', nr: 12, groep: 'Je aanbod en je klant', vraag: 'Wie is je beste klant? Degene waar je het meest aan verdient en het prettigst mee werkt.', hulp: 'Voor het advies, later de doelgroepen.' },
  { id: 'i13', nr: 13, groep: 'Je aanbod en je klant', vraag: 'Waar zit die klant: zoekt hij, scrolt hij, of zit hij zakelijk op LinkedIn?', hulp: 'Welke kanalen naast Google en Meta.' },
  { id: 'i14', nr: 14, groep: 'Je aanbod en je klant', vraag: 'Waarom kiezen klanten voor jou? Waar ben je duurder, en waarom mag dat?', hulp: 'Doorvragen tot het iets is wat de concurrent niet had kunnen zeggen.' },
  { id: 'i15', nr: 15, groep: 'Je aanbod en je klant', vraag: 'Kan iemand laagdrempelig beginnen?', hulp: 'Een instapaanbod in de advertentie. Zonder antwoord: de eerste stap is de offerte.' },
  { id: 'i16', nr: 16, groep: 'Wat wij zagen', vraag: 'Wie heeft de site gebouwd, en is die er nog?', hulp: 'Wie de meetcode plaatst.' },
  { id: 'i17', nr: 17, groep: 'Wat wij zagen', vraag: 'Welke concurrenten missen we? Van wie verlies je het vaakst, en waarop?', hulp: 'Voor de boodschap en de concurrentieanalyse.' },
  { id: 'i18', nr: 18, groep: 'Wat wij doen, en wat niet', vraag: 'Welke van je knelpunten vallen buiten de retainer?', hulp: 'Project of partner, apart in het voorstel.' },
  { id: 'i19', nr: 19, groep: 'Wat je kunt verwachten', vraag: 'Als de eerste aanvragen drie keer zo duur zijn als het doel, hoelang geef je dat?', hulp: 'De verwachting vastzetten vóór de start. Anders komt dit gesprek in maand twee, als klacht.' },
  { id: 'i20', nr: 20, groep: 'Keuzes voor het voorstel', vraag: 'Laat je afspraken inplannen, en met hoeveel mensen?', hulp: 'Afsprakenplanner ja of nee, en hoeveel accounts.' },
  { id: 'i21', nr: 21, groep: 'Keuzes voor het voorstel', vraag: 'Verkoop je aan bedrijven, en hoeveel bezoekers heeft je site per maand?', hulp: 'Leadinfo ja of nee, en de staffel.' },
  { id: 'i22', nr: 22, groep: 'Keuzes voor het voorstel', vraag: 'Hoeveel e-mailadressen heb je?', hulp: 'Gevraagd in de afspraakbevestiging; hier checken. Voor de MailerLite-staffel.' },
  { id: 'i23', nr: 23, groep: 'Keuzes voor het voorstel', vraag: 'Waar ken je ons van?', hulp: 'Leeg laten mag.' },
  { id: 'i24', nr: 24, groep: 'De afronding', vraag: 'Wanneer lopen we het voorstel door?', hulp: 'Niet opstaan zonder datum.', verplicht: true },
]

/** Wat nog leeg is van de vier verplichte vragen. */
export function ontbrekendInIntake(a: Record<string, unknown>): IntakeVraag[] {
  return INTAKE.filter((v) => v.verplicht && !(typeof a[v.id] === 'string' && (a[v.id] as string).trim() !== ''))
}
