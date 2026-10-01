# -*- coding: utf-8 -*-
# Stap 03 · Het intakegesprek: draaiboek (03.1), voorbereiding (03.3), mail na het gesprek (03.4).
# De vragenlijst (03.2) staat in 03b_vragenlijst_intake.py.
from base import *

FASE = 'Fase 1 · Verkopen · Stap 03 · Het intakegesprek'


def onderdeel(label, inhoud):
    """Een kleine tussenkop binnen een blok, met bestaande klassen."""
    return '<p class="klein" style="margin:7pt 0 2pt;font-weight:600;color:var(--tx2)">%s</p>%s' % (label, inhoud)


def ib(tijd, titel, minuten, doel, zinnen, tafel, ophalen, valkuil):
    """Eén blok van het uur: doel, wat je zegt, wat er ligt, wat je ophaalt, de valkuil."""
    links = '<p style="margin-bottom:4pt"><b>Doel.</b> %s</p>' % doel
    links += onderdeel('Wat je zegt', ''.join(zin(z) for z in zinnen))
    rechts = ''
    if tafel:
        rechts += onderdeel('Op tafel', ul(tafel))
    if ophalen:
        rechts += onderdeel('Wat je ophaalt', checklist(ophalen))
    rechts += '<div class="kader k-rood" style="margin:8pt 0 0;padding:6pt 9pt"><span class="kl">Valkuil</span><p class="klein" style="color:var(--tx)">%s</p></div>' % valkuil
    return blok(titel, '%s · %s' % (tijd, minuten), twee(links, rechts))


# ---------------------------------------------------------------- 03.1 Draaiboek intakegesprek
def draaiboek():
    o = []
    o.append(kader('<p>Een uur aan tafel, plus een kwartier voor de klantkaart. We beginnen niet bij nul: de video, de vragenlijst en de quickscan hebben het voorwerk gedaan. Aan tafel doe je alleen wat een formulier niet kan: doorvragen, laten zien wat we vonden, en de verwachting vastzetten. Zeg dat hardop aan het begin. Dan voelt het uur als bewijs dat we grondig zijn.</p>'
                    '<p>Wat er na het uur beantwoord moet zijn, staat in de vragenlijst (03.2); de nummers verwijzen daarnaar. Wat je vooraf klaarlegt, staat in de voorbereiding (03.3).</p>', 'Zo gebruik je dit draaiboek', 'blauw'))
    o.append(h2('Het uur in acht blokken'))
    o.append(p('De volgorde is met opzet: eerst over de klant, dan pas over ons. Wie eerst over de ander praat, verdient het recht om daarna over zichzelf te praten.'))
    o.append(tabel(['Minuut', 'Blok', 'Duur', 'Vragen uit 03.2'], [
        ['0 – 3', 'De aftrap', '3 min', '1'],
        ['3 – 15', 'Jouw situatie', '12 min', '2 tot en met 9, en 23'],
        ['15 – 27', 'Je aanbod en je klant', '12 min', '10 tot en met 15'],
        ['27 – 37', 'Wat wij zagen', '10 min', '16 en 17'],
        ['37 – 44', 'Wat wij doen, en wat niet', '7 min', '18'],
        ['44 – 52', 'Wat je kunt verwachten', '8 min', '5 en 19'],
        ['52 – 57', 'De retainers', '5 min', '20 tot en met 22, als ze nog open staan'],
        ['57 – 60', 'De afronding', '3 min', '24'],
    ], rechts=(2,)))

    o.append(kader('<p>Dat bewijs je met vragen. Eerst goed vragen, en dan iets over het bedrijf van de klant vertellen wat die nog niet wist. “Wat wij zagen” en “wat wij doen” zijn het verkoopverhaal. De retainers zijn alleen nog de prijs erbij.</p>', 'Waarom we de juiste partner zijn', 'zwart', 'Een slide over onszelf bewijst niets.'))

    o.append(NIEUWE_PAGINA)
    o.append(ib('0 – 3', 'De aftrap', '3 minuten',
        'Het kader zetten: wat dit gesprek is, en wat de klant er in elk geval aan heeft.',
        ['We hebben een uur. Dat is genoeg, want we beginnen niet bij nul: we hebben je antwoorden gelezen en naar je website en je markt gekeken.',
         'Aan het eind weet je waar je knelpunt zit en wat een aanvraag je mag kosten, ook als we niet samen verder gaan.',
         'Wat wil jij vandaag uit dit gesprek halen?'],
        [],
        [('Wat de klant uit het gesprek wil halen. Letterlijk noteren; op minuut 57 kom je erop terug.', '1')],
        'Beginnen met jezelf. Dat heeft de video al gedaan.'))

    o.append(ib('3 – 15', 'Jouw situatie', '12 minuten',
        'Het beeld uit de vragenlijst toetsen, en ophalen wat een formulier niet kan vragen.',
        ['Je schreef dat je vooral tegen ' + vv('[…]') + ' aanloopt. Vertel eens.',
         'Klopt dit beeld, of mis ik iets?'],
        ['De antwoorden uit de vragenlijst, op één A4 (03.3)'],
        [('Wat afwijkt van de vragenlijst', '2'),
         ('Hoeveel extra omzet de klant komend jaar wil halen', '3'),
         ('De brutomarge, ongeveer: voor de rekensom', '4'),
         ('Hoeveel aanvragen de klant er per maand bij aankan', '6'),
         ('Wie een aanvraag terugbelt, en binnen hoeveel tijd', '7'),
         ('Hoe het jaar loopt: pieken en dalen', '8'),
         ('Wie er meebeslist, als dat niet de persoon aan tafel is', '9'),
         ('Waar de klant ons van kent, tussen neus en lippen door', '23')],
        'Alle vragen uit het formulier opnieuw stellen. Dan heeft de klant het gevoel dat niemand het heeft gelezen.'))

    o.append(ib('15 – 27', 'Je aanbod en je klant', '12 minuten',
        'Wat we nodig hebben voor het juiste advies: wat de campagne moet opleveren, voor wie, en waarom iemand voor deze klant kiest. Hier hangt het voorstel aan.',
        ['Stel dat dit werkt: welke dienst of welk product moet het opleveren? En welk werk wil je juist niet meer?',
         'Wie is je beste klant? Ik bedoel degene waar je het meest aan verdient en het prettigst mee werkt, ook als dat een ander is dan de klant die je wilt.',
         'Waarom kiezen klanten voor jou en niet voor een ander? En waar ben je duurder, en waarom mag dat?'],
        [],
        [('Hooguit drie diensten of producten, met per dienst de opdrachtwaarde als die sterk afwijkt', '10'),
         ('Werk dat de klant liever niet meer doet', '11'),
         ('De beste klant, in de eigen woorden van de klant', '12'),
         ('Waar die beste klant zit: zoekt, scrolt, of zakelijk op LinkedIn', '13'),
         ('Drie redenen waarom klanten kiezen, en waar de klant duurder is', '14'),
         ('Of iemand laagdrempelig kan beginnen', '15')],
        'Genoegen nemen met “kwaliteit en service”. Vraag door tot het iets is wat de concurrent niet had kunnen zeggen. Anders heb je geen advies en straks geen advertentie.'))

    o.append(ib('27 – 37', 'Wat wij zagen', '10 minuten',
        'Het kantelmoment. Vanaf hier gaat het gesprek over wat de huidige situatie de klant kost. Wat wij kosten, is dan bijzaak.',
        ['We hebben naar je website gekeken. Drie dingen vielen op.',
         'Dit betekent in de praktijk: ' + vv('[het gevolg in aanvragen of in geld]') + '.',
         'Dit zijn de partijen die op jouw zoekwoorden adverteren. Herken je ze? Van wie verlies je het vaakst, en waarop?'],
        ['Het scanrapport: veertien punten met een kleur, de drie bevindingen met hun gevolg',
         'De concurrenten uit de quickscan'],
        [('Wist de klant dit?', ''),
         ('Wie de site heeft gebouwd, en of die er nog is', '16'),
         ('Welke concurrenten we missen, en van wie de klant het vaakst verliest', '17')],
        'In techniek praten. “Je meting staat niet goed” is een constatering. “Je telt vier op de tien aanvragen niet” is een argument.'))

    o.append(ib('37 – 44', 'Wat wij doen, en wat niet', '7 minuten',
        'Precies zeggen waar we goed in zijn, gekoppeld aan de knelpunten van de klant. Geen verhaal over onszelf.',
        ['Wij doen één ding, en dat doen we goed: we zorgen dat er aanvragen binnenkomen via advertenties in zoekmachines en op social media, en dat die steeds goedkoper worden. Je website is daarbij het middelpunt.',
         'Van wat je noemde, pakken wij ' + vv('[…]') + ' op. Voor ' + vv('[…]') + ' doen we soms zelf een project, en anders brengen we je in contact met een partner die er beter in is.',
         'We zetten er nooit iets bovenop. Je betaalt de specialist, en geen opslag van ons op de specialist.',
         'Je mag elke marketingvraag bij ons neerleggen. Soms is het antwoord “dat doen wij”, soms “daarvoor moet je bij haar zijn”.'],
        ['De grens: wat in de retainer zit, wat een eigen project of partner wordt, en wat we nooit doen'],
        [('Welke knelpunten van de klant buiten de retainer vallen', '18')],
        'Iets beloven wat in de retainer niet zit, omdat het gesprek goed loopt.'))

    o.append(ib('44 – 52', 'Wat je kunt verwachten', '8 minuten',
        'De verwachting vastzetten vóórdat er iets te verwachten valt, met de tegenvallers erbij.',
        ['Met jouw cijfers mag een aanvraag je maximaal ' + vv('[…]') + ' kosten.',
         'De eerste aanvragen zijn duur. Dat is de bedoeling: na een paar weken weten we meer dan na maanden plannen.',
         'Vier dingen kunnen wij niet oplossen: je merk, je aanbod en prijs, je opvolging en je capaciteit. We meten ze wel, en we zeggen het als het daar zit.',
         'Het kan zijn dat we over een paar maanden adviseren je budget te verhogen. Als de kosten per aanvraag dan op doel zitten, is dat de enige knop die er nog is.'],
        ['De keten met de getallen van de klant: weergaven, bezoekers, aanvragen, klanten',
         'De rekensom (04.1): wat een aanvraag mag kosten'],
        [('Als de eerste aanvragen drie keer zo duur zijn als het doel: hoelang geeft de klant dat?', '19'),
         ('Binnen hoeveel tijd alles zich moet terugverdienen. Geen antwoord: twaalf maanden.', '5')],
        'Dit overslaan omdat de tijd dringt. Dit is het deel dat je in maand zes redt.'))

    o.append(ib('52 – 57', 'De retainers', '5 minuten',
        'Alle vier laten zien, met wat voor iedereen gelijk is en wat verschilt. Nog niet kiezen.',
        ['Iedereen krijgt toegang tot hetzelfde: adverteren, SEO, e-mail, automation, CRO en landingspagina’s. Wat verschilt, is hoeveel.',
         'Op basis van je cijfers kom je waarschijnlijk uit bij ' + vv('[…]') + '. Het voorstel laat zien waarom, of waarom niet.'],
        ['De vier pakketten: Starter, Playmaker, Captain en Champion, met het fundament ernaast'],
        [('Afsprakenplanner ja of nee, en met hoeveel mensen', '20'),
         ('Verkoopt de klant aan bedrijven, en hoeveel bezoekers per maand', '21'),
         ('Hoeveel e-mailadressen de klant heeft', '22')],
        'De klant laten kiezen. De keuze volgt uit de rekensom, en die maken we in de drie werkdagen hierna.'))

    o.append(ib('57 – 60', 'De afronding', '3 minuten',
        'Op tijd stoppen, en het voorstelgesprek in de agenda zetten voordat de klant opstaat.',
        ['We zijn bijna aan het eind. Je wilde vandaag ' + vv('[wat de klant op minuut 1 zei]') + '. Is dat gelukt?',
         'Binnen drie werkdagen maken we het voorstel. Dan laten we je zien wat je doel is, hoe we het gaan halen, en wat het kost. Zullen we dat gesprek meteen plannen?'],
        ['Het scanrapport, om mee te nemen'],
        [('Een datum voor het voorstelgesprek, en wie er dan bij moet zijn', '24')],
        'Uitlopen. Wie meer wil bespreken, is al bezig met het voorstelgesprek.'))

    o.append(h2('Wat er op tafel ligt'))
    o.append(p('Leg het klaar voordat de klant binnen is. Vink af.'))
    o.append(checklist([
        ('<b>De antwoorden uit de vragenlijst op één A4.</b> Laten zien dat je ze hebt gelezen, en erop doorvragen.', '03.3'),
        ('<b>Het scanrapport.</b> Eén A4: veertien punten met een kleur, drie bevindingen, per rood punt de post en het bedrag. Het enige document dat over de klant gaat. De klant neemt het mee.', 'quickscan'),
        ('<b>De keten met de getallen van de klant.</b> Weergaven, bezoekers, aanvragen, klanten.', '03.3'),
        ('<b>De rekensom.</b> Wat een aanvraag alles bij elkaar mag kosten. Aan tafel gaan de echte marge en termijn erin.', '04.1'),
        ('<b>De pakketten (V.2).</b> De vier pakketten en het fundament op papier.', 'drukwerk'),
        ('<b>De partnerlijst.</b> Voor jezelf: wie je waarvoor introduceert, en waarom.', 'intern'),
        ('<b>De vragenlijst intakegesprek,</b> om met de hand in te vullen.', '03.2'),
    ]))

    o.append(h2('Het kwartier erna'))
    o.append(p('Direct na het gesprek, in het portaal op de klantkaart, voordat je iets anders doet. Wat je nu niet opschrijft, zit niet in het voorstel.'))
    o.append(checklist([
        ('De vragenlijst (03.2) overnemen op de klantkaart. Vraag 3, 6, 10 en 24 gevuld?', 'klantkaart'),
        ('Of de klant kreeg wat die uit het gesprek wilde halen', 'klantkaart'),
        ('Welk pakket de richting is, en waarom', 'klantkaart'),
        ('Welke kanalen naast Google en Meta voor de hand liggen', 'klantkaart'),
        ('Wat je opviel en nergens in de lijst past', 'klantkaart'),
        ('De mail van dezelfde dag weg, met het scanrapport als bijlage', '03.4'),
        ('Het voorstelgesprek in de agenda, met wie erbij moet zijn', 'agenda'),
    ]))
    o.append(kader('<ul><li><b>Wat hier niet wordt opgehaald, mist in het voorstel.</b> Marge en omzetdoel zijn de twee getallen waar de hele rekensom op draait; de capaciteit is de eerste toets erop.</li>'
                   '<li><b>De verwachting die je hier zet, redt je in maand zes.</b> Dure eerste aanvragen, vier dingen die wij niet oplossen, een mogelijk hoger budget: wie dat nu hoort, hoort het later niet als excuus.</li>'
                   '<li><b>Wie opvolgt en hoe snel</b> komt terug als afspraak in “jouw kant” van het voorstel, en als meetpunt in het dashboard.</li></ul>', 'Waarom dit uur zo zwaar weegt', 'lime'))
    o.append(h2('Nooit marge erbovenop, en wat je dan wel zegt'))
    o.append(p('Met leveranciers en partners hebben we afspraken over een vergoeding voor het doorverwijzen: Leadinfo, ClickCease, de afsprakenplanner, MailerLite en marketingprofessionals. Dat is legitiem, en het werkt de andere kant op net zo. Vraagt de klant ernaar, dan zeg je het gewoon.'))
    o.append(twee(
        kader(zin('Ja, soms krijgen we een vergoeding van de partner. Jij betaalt daardoor niets extra. We zetten er nooit iets bovenop.'), 'Wat je zegt', 'groen'),
        kader('<p>“Wij verdienen er niets aan.” Die zin is niet waar, en het is precies het soort zin dat een klant later ontdekt.</p>', 'Wat je nooit zegt', 'rood')))

    return ''.join(o)


# ---------------------------------------------------------------- 03.3 Voorbereiding intakegesprek
def lijn(w=30):
    return '<span style="display:inline-block;width:%dmm;border-bottom:1px solid var(--ln);height:11pt;vertical-align:-2pt"></span>' % w


def voorbereiding():
    o = []
    o.append(kader('<p>Uiterlijk één werkdag vóór het intakegesprek is de quickscan klaar en vrijgegeven. Daarna leg je dit klaar. Pagina 1 en 2 zijn voor jezelf: de checklist en de quickscan op een rij. Pagina 3 is het A4 dat op tafel ligt: de antwoorden uit de vragenlijst van de website. Die neem je over uit de klantkaart, zodat je aan tafel toetst in plaats van opnieuw vraagt.</p>', 'Zo gebruik je dit document', 'blauw'))
    o.append(twee(velden(['Klant en bedrijf']), velden(['Datum gesprek'])))
    o.append(h2('Vooraf klaarleggen'))
    o.append(checklist([
        ('Quickscan compleet en het advies vrijgegeven. De stopknop staat niet op rood.', 'quickscan'),
        ('Het scanrapport twee keer geprint: één voor op tafel, één om mee te geven', 'quickscan'),
        ('De antwoorden uit de vragenlijst op één A4: pagina 3 van dit document', 'klantkaart'),
        ('De rekensom (04.1), met omzet per klant en het percentage dat klant wordt al ingevuld', '04.1'),
        ('De pakketten (V.2), en de partnerlijst voor jezelf', 'drukwerk'),
        ('De vragenlijst intakegesprek (03.2) en het draaiboek (03.1)', '03.1 / 03.2'),
    ]))

    o.append(kader('<ul><li><b>Het gevolg altijd in de getallen van de klant,</b> nooit met een branchecijfer. Eén aanvechtbaar cijfer maakt het hele rapport aanvechtbaar.</li>'
                   '<li><b>Van buitenaf zie je niet alles.</b> Back-ups, updates en of de conversies goed staan, blijken pas uit de audit in het fundament. Zeg dat erbij, anders lijkt groen een garantie.</li>'
                   '<li><b>Wijkt de scan af van de vragenlijst,</b> bijvoorbeeld de klant schreef dat er op Google wordt geadverteerd en er is niets te vinden, dan is dat een vraag aan tafel. Geen betrapping.</li>'
                   '<li><b>Doe nooit zelf een aanvraag op de site van de klant.</b> Dat vervuilt de cijfers en voelt als een truc als het uitkomt.</li></ul>', 'Vier regels bij de quickscan', 'grijs'))

    o.append(NIEUWE_PAGINA)
    o.append(h2('Uit de quickscan'))
    o.append(p('De drie bevindingen die het advies koos. Die vertel je in het blok “wat wij zagen”, minuut 27 tot 37.'))
    for n in (1, 2, 3):
        o.append(h3('Bevinding %d' % n))
        o.append('<div style="display:grid;grid-template-columns:30mm 1fr 1fr;gap:6pt;margin-bottom:4pt">%s</div>' % ''.join(
            '<div class="vak" style="min-height:74pt"><span>%s</span></div>' % l for l in ['Punt en kleur', 'Wat we zagen (de meting)', 'Wat het de klant kost, in aanvragen of geld']))
        o.append(vakken(['Zo zeg je het aan tafel'], 1, 40))
    o.append(h3('De markt en de rest'))
    o.append(twee(
        vakken(['Wie adverteert op de zoekwoorden van de klant (punt 14)', 'Wat ziet wie de klant zoekt (punt 15)'], 1, 62),
        vakken(['Herstelposten voor Webmix, met bedrag. Gaan in de rekensom van de marketingruimte af.', 'Waar scan en vragenlijst elkaar tegenspreken: vragen aan tafel'], 1, 62)))

    o.append(NIEUWE_PAGINA)
    o.append('<div class="kop" style="margin-bottom:10pt"><div class="merk">De antwoorden uit je vragenlijst</div><div class="klein">' + vv('[bedrijf]') + ' · ' + vv('[datum]') + '</div></div>')
    o.append(p('Dit vulde je in op onze website. We vragen het niet opnieuw. Klopt iets niet meer, zeg het dan: dan rekenen we met het juiste getal.', 'klein'))

    def groep(titel, items, kol=2):
        return h3(titel) + '<div class="twee" style="gap:0 14pt">%s</div>' % ''.join('<div>%s</div>' % velden([i]) for i in items) if kol == 2 else h3(titel) + velden(items)

    o.append(groep('Je bedrijf', ['Aan wie verkoop je?', 'Hoe word je klant?', 'Wat je verkoopt, in één zin', 'Waar je klanten zitten', 'Je website', 'Je rol']))
    o.append(groep('Je marketing nu', ['Uitgave per maand, alles samen', 'Waaraan', 'Wanneer je wilt beginnen']))
    o.append(h3('Je cijfers'))
    o.append(tabel(['Wat', 'Jouw antwoord', 'Waarvoor'], [
        ['Een gemiddelde opdracht is waard', '€ ' + lijn(28), 'De rekensom'],
        ['Zo vaak koopt een klant per jaar', lijn(20) + ' keer', 'De rekensom'],
        ['Zo lang blijft een klant klant', lijn(34), 'Korter dan een jaar telt als een half jaar'],
        ['Omzet per klant per jaar', '€ ' + lijn(28), 'Opdracht × keer per jaar'],
        ['Aanvragen per maand, nu', lijn(20), 'Telefoon, mail en formulieren samen'],
        ['Zoveel procent wordt klant', lijn(16) + ' %', '“Weet ik niet” telt als 20%'],
        ['Van eerste contact tot opdracht', lijn(34), 'Wanneer de eerste klanten kunnen komen'],
    ]))
    o.append(h3('De keten, met jouw getallen'))
    o.append(vakken(['Weergaven per maand', 'Bezoekers per maand', 'Aanvragen per maand', 'Nieuwe klanten per maand'], 4, 48))
    o.append(vakken(['Waar je nu tegenaan loopt'], 1, 96))
    return ''.join(o)


# ---------------------------------------------------------------- 03.4 Mail na het intakegesprek
def mail_na():
    o = []
    o.append(mail('Dezelfde dag', 'Wat we vandaag zagen',
        '<p>Hoi ' + vv('[voornaam]') + ',</p>'
        '<p>Dank voor je tijd vandaag. Kort wat we bespraken:</p>'
        '<ul><li>' + vv('[het grootste knelpunt, in de woorden van de klant]') + '</li>'
        '<li>' + vv('[de belangrijkste bevinding uit de quickscan, en wat die kost]') + '</li>'
        '<li>' + vv('[wat een aanvraag je maximaal mag kosten]') + '</li></ul>'
        '<p>Het scanrapport zit als bijlage bij deze mail.</p>'
        '<p>We maken nu het voorstel. Op ' + vv('[dag datum]') + ' lopen we het samen door.</p>'
        '<p>Groet,<br>' + vv('[naam]') + '</p>',
        van='wie het intakegesprek voerde'))
    o.append(h3('Zo vul je de drie regels'))
    o.append(tabel(['Regel', 'Waar het vandaan komt', 'Let op'], [
        ['Het grootste knelpunt', 'Minuut 1 en “jouw situatie” (03.2, vraag 1 en 2)', 'In de woorden van de klant.'],
        ['De belangrijkste bevinding', 'De bevinding uit de quickscan die aan tafel het hardst aankwam', 'Met het gevolg in aanvragen of in geld.'],
        ['Wat een aanvraag mag kosten', 'Het bedrag uit “wat je kunt verwachten”, uit de rekensom (04.1)', 'Hetzelfde getal als aan tafel. Rekende je met een aanname, zeg dat erbij.'],
    ]))
    o.append(h3('Voor je op verzenden drukt'))
    o.append(twee(checklist([('Het scanrapport is vrijgegeven en zit als bijlage bij de mail', ''), ('De drie regels zijn ingevuld; geen haakjes meer in de tekst', '')]),
                  checklist([('De datum van het voorstelgesprek klopt met de agenda', ''), ('Wie meebeslist (vraag 9) staat in de agenda-uitnodiging', '')])))
    o.append(p('Het voorstel zelf gaat niet vooraf mee. Op dag 3 volgt alleen een korte vraag: “Morgen lopen we het voorstel door. Is ' + vv('[naam]') + ' erbij?”', 'klein'))
    return ''.join(o)


DOCS = [
    dict(code='03.1', titel='Draaiboek intakegesprek', fase=FASE, voor='Intern', wanneer='Tijdens het intakegesprek',
         wie='Accountmanager of eigenaar',
         lead='Het uur in acht blokken: wat je zegt, wat er op tafel ligt, wat je ophaalt en waar het misgaat. Plus het kwartier erna.',
         body=draaiboek()),
    dict(code='03.3', titel='Voorbereiding intakegesprek', fase=FASE, voor='Intern', wanneer='Uiterlijk de werkdag ervoor', concept=True,
         wie='Wie het gesprek voert',
         lead='Wat je vooraf uit de quickscan klaarlegt, en het A4 met de antwoorden uit de vragenlijst dat op tafel ligt.',
         body=voorbereiding()),
    dict(code='03.4', titel='Mail na het intakegesprek', fase=FASE, voor='Intern', wanneer='Dezelfde dag, binnen het kwartier erna',
         wie='Wie het gesprek voerde',
         lead='De mail van dezelfde dag, met het scanrapport als bijlage. Ook als de klant niet verdergaat. Drie regels vul je in, de rest staat vast.',
         body=mail_na()),
]
