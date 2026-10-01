# -*- coding: utf-8 -*-
from base import *

V = [
 ('grp', 'De aftrap'),
 (1, 'Wat wil je vandaag uit dit gesprek halen?', 'Letterlijk noteren. Hier kom je op minuut 57 op terug, en in het voorstelgesprek.', 2, None, False),
 ('grp', 'Jouw situatie'),
 (2, 'Klopt het beeld uit je vragenlijst?', 'Klantwaarde, aanvragen per maand, hoeveel er klant worden, doorlooptijd. Noteer alleen wat afwijkt.', 3, None, False),
 (3, 'Hoeveel extra omzet wil je komend jaar halen?', 'Voor de rekensom. Zonder antwoord geen voorstel: nabellen.', 1, None, True),
 (4, 'Wat is je brutomarge, ongeveer?', 'Zonder antwoord rekenen we met 30%, en dat zeggen we erbij.', 1, ['20%', '30%', '40%', '50%', 'anders: ____'], False),
 (5, 'Binnen hoeveel tijd moet alles wat je aan marketing uitgeeft zich terugverdienen?', 'Zonder antwoord: twaalf maanden.', 0, ['6 maanden', '12 maanden', '18 maanden', '24 maanden'], False),
 (6, 'Hoeveel extra aanvragen per maand kun je aan? Waar loopt het vast als het verdubbelt?', 'Toets 1: is het doel te leveren? Zonder antwoord navragen vóór het voorstel.', 2, None, True),
 (7, 'Wie belt een aanvraag terug, binnen hoeveel tijd, en wie neemt het over bij vakantie of ziekte?', 'Afspraak 3 van jouw kant; de meldingen in het dashboard.', 2, None, False),
 (8, 'Hoe loopt je jaar: zijn er pieken en dalen?', 'Maandnormen in plaats van een jaargemiddelde, en het budget over het jaar verdelen.', 2, None, False),
 (9, 'Wie beslist er mee?', 'Die persoon moet bij het voorstelgesprek zijn.', 1, None, False),
 ('grp', 'Je aanbod en je klant'),
 (10, 'Welke dienst of welk product moet de campagne opleveren?', 'Hooguit drie, met de opdrachtwaarde per dienst als die sterk afwijkt. Zonder antwoord geen campagne: nabellen.', 3, None, True),
 (11, 'Welk werk wil je juist niet meer?', 'Wordt de uitsluitingen in zoekwoorden en doelgroepen.', 2, None, False),
 (12, 'Wie is je beste klant? Degene waar je het meest aan verdient en het prettigst mee werkt.', 'Voor het advies, later de doelgroepen.', 2, None, False),
 (13, 'Waar zit die klant: zoekt hij, scrolt hij, of zit hij zakelijk op LinkedIn?', 'Welke kanalen naast Google en Meta.', 0, ['zoekt (Google, Bing)', 'scrolt (Meta, TikTok)', 'zakelijk (LinkedIn)'], False),
 (14, 'Waarom kiezen klanten voor jou? Waar ben je duurder, en waarom mag dat?', 'Doorvragen tot het iets is wat de concurrent niet had kunnen zeggen.', 3, None, False),
 (15, 'Kan iemand laagdrempelig beginnen?', 'Een instapaanbod in de advertentie. Zonder antwoord: de eerste stap is de offerte.', 1, None, False),
 ('grp', 'Wat wij zagen'),
 (16, 'Wie heeft de site gebouwd, en is die er nog?', 'Wie de meetcode plaatst.', 1, None, False),
 (17, 'Welke concurrenten missen we? Van wie verlies je het vaakst, en waarop?', 'Voor de boodschap en de concurrentieanalyse.', 2, None, False),
 ('grp', 'Wat wij doen, en wat niet'),
 (18, 'Welke van je knelpunten vallen buiten de retainer?', 'Project of partner, apart in het voorstel.', 2, None, False),
 ('grp', 'Wat je kunt verwachten'),
 (19, 'Als de eerste aanvragen drie keer zo duur zijn als het doel, hoelang geef je dat?', 'De verwachting vastzetten vóór de start. Anders komt dit gesprek in maand twee, als klacht.', 1, None, False),
 ('grp', 'Keuzes voor het voorstel'),
 (20, 'Laat je afspraken inplannen, en met hoeveel mensen?', 'Afsprakenplanner ja of nee, en hoeveel accounts.', 1, ['nee', 'ja, aantal mensen: ____'], False),
 (21, 'Verkoop je aan bedrijven, en hoeveel bezoekers heeft je site per maand?', 'Leadinfo ja of nee, en de staffel.', 1, ['nee', 'ja'], False),
 (22, 'Hoeveel e-mailadressen heb je?', 'Gevraagd in de afspraakbevestiging; hier checken. Voor de MailerLite-staffel.', 1, None, False),
 (23, 'Waar ken je ons van?', 'Leeg laten mag.', 1, None, False),
 ('grp', 'De afronding'),
 (24, 'Wanneer lopen we het voorstel door?', 'Niet opstaan zonder datum.', 0, None, True),
]

def body():
    out = [kader('<p>Dit is wat er na het uur beantwoord moet zijn. De volgorde en de toon staan in het draaiboek (03.1). Wat al uit de vragenlijst van de website of de quickscan komt, vraag je niet opnieuw: je toetst het (vraag 2). Wat leeg blijft, zit niet in het voorstel, of we rekenen met een aanname en zeggen dat erbij.</p><p><b>Verplicht voor het voorstel: 3, 6, 10 en 24.</b> Zonder die vier geen rekensom, geen toets of het te leveren is, geen campagne en geen vervolgafspraak.</p>', 'Zo gebruik je dit formulier', 'blauw')]
    out.append(velden(['Klant en bedrijf', 'Datum gesprek', 'Gevoerd door']))
    for v in V:
        if v[0] == 'grp':
            out.append(h3(v[1])); continue
        nr, q, hulp, regels, opties, verplicht = v
        out.append(vraag(nr, q, hulp, regels, opties, verplicht))
    out.append(vakken(['Datum voorstelgesprek', 'Wie er dan bij moet zijn'], 2, 40))
    out.append(kader('<p>Binnen een kwartier na het gesprek: alles op de klantkaart, de mail van dezelfde dag weg met het scanrapport, en het voorstelgesprek in de agenda.</p>', 'Het kwartier erna', 'lime'))
    return ''.join(out)

DOCS = [dict(code='03.2', titel='Vragenlijst intakegesprek', fase='Fase 1 · Verkopen · Stap 03 · Het intakegesprek', voor='Intern', wanneer='Tijdens het intakegesprek', wie='Accountmanager of eigenaar',
  lead='24 vragen die na het uur beantwoord moeten zijn. Print hem, neem hem mee aan tafel en vul hem met de hand in. Daarna gaat alles op de klantkaart.', body=body())]
