# -*- coding: utf-8 -*-
from common import *

def col(lab, rows):
    return '<div style="min-width:0"><span class="kick" style="margin:0 0 6px">%s</span>%s</div>' % (lab, rk(rows).replace('class="rk"', 'class="rk" style="margin-top:0"'))

# ---------------------------------------------------------------- STAP 03
STAP03 = stap_kop('03', 'f1', 'FASE 1 · VERKOPEN', 'Het intakegesprek',
 'Het eerste gesprek, met een klant die zich heeft gekwalificeerd. Een uur. We halen op wat we voor het advies nodig hebben en wat een formulier niet kan vragen, vertellen hem iets over zijn eigen bedrijf wat hij nog niet wist, en laten zien hoe we werken en wat het kost.',
 [('WANNEER', 'Minstens drie werkdagen na het boeken, zodat de quickscan past'), ('WIE', 'Accountmanager of eigenaar. Dezelfde persoon voert later het voorstelgesprek'), ('HOE LANG', 'Een uur aan tafel, plus een kwartier voor de klantkaart'), ('KLAAR ALS', 'De klantkaart is ingevuld, de mail van dezelfde dag is weg, en het voorstelgesprek staat in de agenda')],
 'stap-03') + klant('Iemand die zijn antwoorden heeft gelezen en al naar zijn website heeft gekeken. Het gesprek gaat over hem, niet over ons. Hij gaat naar huis met een scanrapport, met wat een aanvraag hem mag kosten, en met een datum voor het voorstelgesprek. Ook als hij niet verdergaat, heeft hij er iets aan.') + """
<h3>Waarom een uur genoeg is</h3>
<p>We beginnen niet bij nul. De video heeft uitgelegd hoe we werken, de vragenlijst heeft opgehaald waar hij staat, de quickscan heeft naar de website gekeken. Aan tafel doen we alleen wat een formulier en een video niet kunnen: doorvragen op wat hij verkoopt en waarom mensen voor hem kiezen, laten zien wat we vonden, en de verwachting vastzetten. Zeg dat hardop aan het begin: dan is het uur geen beperking, maar het bewijs dat we grondig zijn.</p>
<h3>De vragenlijst: wat je na het uur beantwoord moet hebben</h3>
<p>Dit is de lijst die je afvinkt. De blokken hieronder zijn de volgorde en de toon; deze lijst is wat er aan het eind op de klantkaart moet staan. Wat al uit de vragenlijst van stap 01 of de quickscan komt, vraag je niet opnieuw: je toetst het (vraag 2). Wat leeg blijft, zit niet in het voorstel, of we rekenen met een aanname en zeggen dat erbij.</p>
""" + tbl(['#', 'Vraag', 'Waarvoor', 'Zonder antwoord'], [
 ('grp', 'DE AFTRAP'),
 ['1', 'Wat wil je vandaag uit dit gesprek halen?', 'Terugkomen op minuut 57 en in het voorstelgesprek', 'Altijd vragen, ook als de tijd dringt'],
 ('grp', 'JOUW SITUATIE'),
 ['2', 'Klopt het beeld uit je vragenlijst? (klantwaarde, aanvragen per maand, hoeveel klant worden, doorlooptijd)', 'De rekensom: correcties gaan direct in het portaal', 'We rekenen met wat hij invulde'],
 ['3', 'Hoeveel extra omzet wil je komend jaar halen?', 'De rekensom, som 1 en 4', '<b>Geen voorstel mogelijk.</b> Nabellen'],
 ['4', 'Wat is je brutomarge, ongeveer?', 'De rekensom, som 4', 'We rekenen met 30% en zeggen dat erbij'],
 ['5', 'Binnen hoeveel tijd moet alles wat je aan marketing uitgeeft zich terugverdienen?', 'De rekensom, som 4', 'Twaalf maanden'],
 ['6', 'Hoeveel extra aanvragen per maand kun je aan? Waar loopt het vast als het verdubbelt?', 'Toets 1: is het te leveren', 'De toets kan niet: navragen vóór het voorstel'],
 ['7', 'Wie belt een aanvraag terug, binnen hoeveel tijd, en wie neemt het over bij vakantie of ziekte?', 'Jouw kant, afspraak 3; meldingen in het dashboard', 'Leeg op pagina 6 van het voorstel: in het voorstelgesprek invullen'],
 ['8', 'Hoe loopt je jaar: zijn er pieken en dalen?', 'Maandnormen in plaats van een jaargemiddelde; budget over het jaar verdelen', 'Jaargemiddelde, met het risico dat elke winter een probleem lijkt'],
 ['9', 'Wie beslist er mee?', 'Wie bij het voorstelgesprek moet zijn', 'Het risico dat het voorstel zonder ons wordt voorgelegd'],
 ('grp', 'JE AANBOD EN JE KLANT'),
 ['10', 'Welke dienst of welk product moet de campagne opleveren? Hooguit drie, met de opdrachtwaarde per dienst als die sterk afwijkt', 'Waar we op adverteren; de rekensom per dienst', '<b>Geen campagne te bouwen.</b> Nabellen'],
 ['11', 'Welk werk wil je juist niet meer?', 'Uitsluitingen in zoekwoorden en targeting', 'Geen uitsluitingen vooraf'],
 ['12', 'Wie is je beste klant? Degene waar je het meest aan verdient en het prettigst mee werkt', 'Het advies, later de targeting (getoetst aan zijn klantenbestand)', 'We werken met zijn beschrijving uit de vragenlijst'],
 ['13', 'Waar zit die klant: zoekt hij, scrolt hij, of zit hij zakelijk op LinkedIn?', 'Welke kanalen naast Google en Meta', 'Google en Meta, de rest bepalen de cijfers'],
 ['14', 'Waarom kiezen klanten voor jou? Waar ben je duurder, en waarom mag dat?', 'De boodschap en de advertentietekst', 'Doorvragen tot het iets is wat de concurrent niet had kunnen zeggen'],
 ['15', 'Kan iemand laagdrempelig beginnen?', 'Een instapaanbod in de advertentie', 'Geen instap: de eerste stap is de offerte'],
 ('grp', 'WAT WIJ ZAGEN'),
 ['16', 'Wie heeft de site gebouwd, en is die er nog?', 'Wie de meetcode plaatst; de toegangensessie', 'Navragen in de toegangensessie'],
 ['17', 'Welke concurrenten missen we? Van wie verlies je het vaakst, en waarop?', 'De boodschap, de concurrentieanalyse', 'Alleen de concurrenten uit de quickscan'],
 ('grp', 'WAT WIJ DOEN, EN WAT NIET'),
 ['18', 'Welke van je knelpunten vallen buiten de retainer?', 'Project of partner, apart in het voorstel', 'Het risico dat hij denkt dat het erin zit'],
 ('grp', 'WAT JE KUNT VERWACHTEN'),
 ['19', 'Als de eerste aanvragen drie keer zo duur zijn als het doel, hoelang geef je dat?', 'De verwachting vastzetten vóór de start', 'Het gesprek komt in maand twee, en dan als klacht'],
 ('grp', 'KEUZES VOOR HET VOORSTEL'),
 ['20', 'Laat je afspraken inplannen, en met hoeveel mensen?', 'Afsprakenplanner ja of nee, en hoeveel accounts', 'Niet in het voorstel'],
 ['21', 'Verkoop je aan bedrijven, en hoeveel bezoekers heeft je site per maand?', 'Leadinfo ja of nee, en de staffel', 'Niet in het voorstel'],
 ['22', 'Hoeveel e-mailadressen heb je? (gevraagd in de afspraakbevestiging, hier checken)', 'De MailerLite-staffel', '“Vanaf” in het voorstel, en dat willen we niet'],
 ['23', 'Waar ken je ons van?', 'Onze eigen herkomstcijfers', 'Leeg laten mag'],
 ('grp', 'DE AFRONDING'),
 ['24', 'Wanneer lopen we het voorstel door?', 'De datum van het voorstelgesprek', '<b>Niet opstaan zonder datum</b>'],
]) + """
<p style="margin-top:14px"><b>Verplicht voor het voorstel:</b> 3, 6, 10 en 24. Zonder die vier kun je geen rekensom maken, niet toetsen of het te leveren is, geen campagne bouwen of geen gesprek plannen. De rest heeft een aanname die we uitspreken. In het portaal is dit het formulier op de klantkaart; “voorstel maken” gaat pas aan als de vier verplichte velden gevuld zijn.</p>

<h3>Het uur, per blok</h3>
<div class="klok"><span style="flex:3">AFTRAP</span><span style="flex:12">JOUW SITUATIE</span><span style="flex:12">AANBOD EN KLANT</span><span style="flex:10" class="acc">WAT WIJ ZAGEN</span><span style="flex:7">WAT WIJ DOEN</span><span style="flex:8">VERWACHTING</span><span style="flex:5">RETAINERS</span><span style="flex:3">EIND</span></div>
<p style="margin-top:14px">Acht blokken. De volgorde is met opzet: eerst over de klant, dan pas over ons. Wie eerst over de ander praat, verdient het recht om daarna over zichzelf te praten.</p>
""" + blk('0 – 3', 'De aftrap', '3 MINUTEN', 'Het kader zetten: wat dit gesprek is, en wat hij er in elk geval aan heeft.',
 ['We hebben een uur. Dat is genoeg, want we beginnen niet bij nul: we hebben je antwoorden gelezen en naar je website en je markt gekeken.', 'Aan het eind weet je waar je knelpunt zit en wat een aanvraag je mag kosten, ook als we niet samen verder gaan.', 'Wat wil jij vandaag uit dit gesprek halen?'],
 [], ['Wat hij uit het gesprek wil halen. Letterlijk noteren, en er op minuut 57 op terugkomen.'], 'Beginnen met jezelf. Dat heeft de video al gedaan.') + blk('3 – 15', 'Jouw situatie', '12 MINUTEN', 'Het beeld uit de vragenlijst toetsen, en ophalen wat een formulier niet kan vragen.',
 ['Je schreef dat je vooral tegen […] aanloopt. Vertel eens.', 'Klopt dit beeld, of mis ik iets?'],
 ['De antwoorden uit de vragenlijst, op één A4'],
 ['Zijn brutomarge, ongeveer: voor de rekensom', 'Hoeveel extra omzet hij komend jaar wil halen', 'Wie een aanvraag terugbelt, en binnen hoeveel tijd', 'Hoeveel aanvragen hij er per maand bij aankan', 'Wie er meebeslist, als dat niet de persoon aan tafel is', 'Hoe zijn jaar loopt: pieken en dalen', 'Waar hij ons van kent, tussen neus en lippen door'],
 'Alle vragen uit het formulier opnieuw stellen. Dan heeft hij het gevoel dat niemand het heeft gelezen.') + blk('15 – 27', 'Je aanbod en je klant', '12 MINUTEN', 'Wat we nodig hebben voor het juiste advies: wat de campagne moet opleveren, voor wie, en waarom iemand voor hem kiest. Hier hangt het voorstel aan.',
 ['Stel dat dit werkt: welke dienst of welk product moet het opleveren? En welk werk wil je juist niet meer?', 'Wie is je beste klant? Niet de klant die je wilt, maar degene waar je het meest aan verdient en het prettigst mee werkt.', 'Waarom kiezen klanten voor jou en niet voor een ander? En waar ben je duurder, en waarom mag dat?'],
 [], ['Hooguit drie diensten of producten, met per dienst de opdrachtwaarde als die sterk afwijkt', 'Werk dat hij liever niet meer doet', 'Zijn beste klant, in zijn eigen woorden', 'Drie redenen waarom klanten voor hem kiezen, en waar hij duurder is', 'Waar zijn beste klant zit: zoekt hij, scrolt hij, of zit hij zakelijk op LinkedIn', 'Of iemand laagdrempelig kan beginnen'],
 'Genoegen nemen met “kwaliteit en service”. Vraag door tot het iets is wat zijn concurrent niet had kunnen zeggen. Anders heb je geen advies en straks geen advertentie.') + blk('27 – 37', 'Wat wij zagen', '10 MINUTEN', 'Het kantelmoment. Het gesprek gaat niet meer over wat wij kosten, maar over wat de huidige situatie kost.',
 ['We hebben naar je website gekeken. Drie dingen vielen op.', 'Dit betekent in de praktijk: [het gevolg in aanvragen of in geld].', 'Dit zijn de partijen die op jouw zoekwoorden adverteren. Herken je ze? Van wie verlies je het vaakst, en waarop?'],
 ['Het scanrapport: veertien punten met een kleur, de drie bevindingen met hun gevolg', 'De concurrenten uit de quickscan'],
 ['Wist hij dit?', 'Wie heeft de site gebouwd, en is die er nog?', 'Welke concurrenten we missen, en van wie hij het vaakst verliest'],
 'In techniek praten. “Je meting staat niet goed” is een constatering; “je telt vier op de tien aanvragen niet” is een argument.') + blk('37 – 44', 'Wat wij doen, en wat niet', '7 MINUTEN', 'Precies zeggen waar we goed in zijn, gekoppeld aan zijn knelpunten. Geen verhaal over onszelf.',
 ['Wij doen één ding, en dat doen we goed: we zorgen dat er aanvragen binnenkomen via advertenties in zoekmachines en op social media, en dat die steeds goedkoper worden. Je website is daarbij het middelpunt.', 'Van wat je noemde, pakken wij […] op. Voor […] doen we soms zelf een project, en anders brengen we je in contact met een partner die er beter in is.', 'We zetten er nooit iets bovenop. Je betaalt de specialist, niet ons bovenop de specialist.', 'Je mag elke marketingvraag bij ons neerleggen. Soms is het antwoord “dat doen wij”, soms “daarvoor moet je bij haar zijn”.'],
 ['De grens: retainer, project of partner (zie 1.3)'], ['Welke van zijn knelpunten buiten de retainer vallen'],
 'Iets beloven wat in de retainer niet zit, omdat het gesprek goed loopt.') + blk('44 – 52', 'Wat je kunt verwachten', '8 MINUTEN', 'De verwachting vastzetten vóórdat er iets te verwachten valt, met de tegenvallers erbij.',
 ['Met jouw cijfers mag een aanvraag je maximaal […] kosten.', 'De eerste aanvragen zijn duur. Dat is de bedoeling: na een paar weken weten we meer dan na maanden plannen.', 'Vier dingen kunnen wij niet oplossen: je merk, je aanbod en prijs, je opvolging en je capaciteit. We meten ze wel, en we zeggen het als het daar zit.', 'Het kan zijn dat we over een paar maanden adviseren je budget te verhogen. Als de kosten per aanvraag dan op doel zitten, is dat de enige knop die er nog is.'],
 ['De keten met zijn eigen getallen: weergaven, bezoekers, aanvragen, klanten', 'De rekensom: wat een aanvraag mag kosten'],
 ['Als de eerste aanvragen drie keer zo duur zijn als het doel: hoelang geeft hij dat?', 'Binnen hoeveel tijd moet alles zich terugverdienen? Geen antwoord: twaalf maanden.'],
 'Dit overslaan omdat de tijd dringt. Dit is het deel dat je in maand zes redt.') + blk('52 – 57', 'De retainers', '5 MINUTEN', 'Alle vier laten zien, met wat voor iedereen gelijk is en wat verschilt. Nog niet kiezen.',
 ['Iedereen krijgt toegang tot hetzelfde: adverteren, SEO, e-mail, automation, CRO en landingspagina’s. Wat verschilt, is hoeveel.', 'Op basis van je cijfers kom je waarschijnlijk uit bij […]. Het voorstel laat zien waarom, of waarom niet.'],
 ['De vier pakketten: Starter, Playmaker, Captain en Champion, met het fundament ernaast'], [],
 'De klant laten kiezen. De keuze volgt uit de rekensom, en die maken we in de drie werkdagen daarna.') + blk('57 – 60', 'De afronding', '3 MINUTEN', 'Op tijd stoppen, en het voorstelgesprek in de agenda zetten voordat hij opstaat.',
 ['We zijn bijna aan het eind. Je wilde vandaag [wat hij op minuut 1 zei]. Is dat gelukt?', 'Binnen drie werkdagen maken we het voorstel. Dan laten we je zien wat je doel is, hoe we het gaan halen, en wat het kost. Zullen we dat gesprek meteen plannen?'],
 ['Het scanrapport, om mee te nemen'], ['Een datum voor het voorstelgesprek'],
 'Uitlopen. Wie meer wil bespreken, is al bezig met het voorstelgesprek.') + key('WAAROM WE DE JUISTE PARTNER ZIJN', 'Dat bewijs je niet met een slide over jezelf.', '<p>Je bewijst het door eerst goed te vragen, en dan iets over zijn bedrijf te vertellen wat hij nog niet wist. “Wat wij zagen” en “wat wij doen” zijn het verkoopverhaal. De retainers zijn alleen nog de prijs erbij.</p>') + """
<h3>Nooit marge erbovenop, en wat je dan wel zegt</h3>
<p>Met leveranciers en partners, zoals Leadinfo, ClickCease, de afsprakenplanner, MailerLite en marketingprofessionals, hebben we afspraken over een vergoeding voor het doorverwijzen. Dat is legitiem, en het werkt de andere kant op net zo. Vraagt een klant ernaar, dan zeg je het gewoon: ja, soms krijgen we een vergoeding van de partner, en jij betaalt daardoor niets extra. Zeg nooit “wij verdienen er niets aan”: die zin is niet waar, en het is precies het soort zin dat een klant later ontdekt.</p>

<h3>Wat er op tafel ligt</h3>
""" + tbl(['Middel', 'Waarvoor', 'Stand'], [
 ['De antwoorden uit de vragenlijst op één A4', 'Laten zien dat je ze hebt gelezen, en erop doorvragen', R('NOG NIET')],
 ['Het scanrapport', 'Eén A4: veertien punten met een kleur, drie bevindingen, per rood punt de post en het bedrag. Het enige document dat over hem gaat.', R('NOG NIET')],
 ['De keten met zijn eigen getallen', 'Weergaven, bezoekers, aanvragen, klanten, uit de vragenlijst', O('FINETUNEN')],
 ['De rekensom', 'Wat een aanvraag alles bij elkaar mag kosten; aan tafel de echte marge en termijn erin', O('FINETUNEN')],
 ['De pakketten', 'De vier pakketten en het fundament op papier (V.2)', O('BIJWERKEN')],
 ['De partnerlijst', 'Voor jezelf: wie je waarvoor introduceert, en waarom', R('NOG NIET')],
]) + """
<h3>Het kwartier erna</h3>
<p>Direct na het gesprek, in het portaal op de klantkaart, voordat je iets anders doet: de vragenlijst hierboven aanvullen. Wat je nu niet opschrijft, zit niet in het voorstel. Daarnaast:</p>
""" + ul(['Of hij kreeg wat hij uit het gesprek wilde halen', 'Welk pakket de richting is, en waarom', 'Welke kanalen naast Google en Meta voor de hand liggen', 'Wat je opviel en nergens in de lijst past']) + mail('DEZELFDE DAG', 'Wat we vandaag zagen', '<p>Hoi [voornaam],</p><p>Dank voor je tijd vandaag. Kort wat we bespraken:</p><ul><li><span class="vv">[het grootste knelpunt, in zijn woorden]</span></li><li><span class="vv">[de belangrijkste bevinding uit de quickscan, en wat die kost]</span></li><li><span class="vv">[wat een aanvraag je maximaal mag kosten]</span></li></ul><p>Het scanrapport zit als bijlage bij deze mail.</p><p>We maken nu het voorstel. Op [dag datum] lopen we het samen door.</p><p>Groet,<br>[naam]</p>') + raakt(ul([
 '<b>Wat hier niet wordt opgehaald, mist in het voorstel.</b> Marge en omzetdoel zijn de twee getallen waar de hele rekensom op draait; de capaciteit is de eerste toets erop.',
 '<b>De verwachting die je hier zet, redt je in maand zes.</b> Dure eerste aanvragen, vier dingen die wij niet oplossen, een mogelijk hoger budget: wie dat nu hoort, hoort het later niet als excuus.',
 '<b>Wie opvolgt en hoe snel</b> komt terug als afspraak in “jouw kant” van het voorstel, en als meetpunt in het dashboard.',
], '')) + open_(ul(['De partnerlijst: namen, en waarom elke naam erop staat.', 'Het sjabloon voor het scanrapport (stap 02).', 'Wie het intakegesprek voert naast Jim Coumans. Het schema en de teksten maken het overdraagbaar.'], '')) + stap_eind()

# ---------------------------------------------------------------- STAP 04
STAP04 = stap_kop('04', 'f1', 'FASE 1 · VERKOPEN', 'Voorstel maken en het voorstelgesprek',
 'In drie werkdagen maken wij het voorstel uit wat er al ligt. In het voorstelgesprek, 45 minuten, lopen we het samen door: zijn doel, ons plan, en het voorstel dat daarbij hoort. Aan het eind is het akkoord of niet.',
 [('WANNEER', 'Drie werkdagen na het intakegesprek'), ('WIE', 'Dezelfde persoon als in het intakegesprek; het portaal rekent, Claude schrijft, een mens geeft vrij'), ('HOE LANG', 'Een uur voorstel maken, 45 minuten gesprek plus vastleggen'), ('KLAAR ALS', 'Akkoord en de offerte staat klaar om te tekenen, of een concrete datum, of een nee met de reden')],
 'stap-04') + klant('Drie dagen niets, dan een korte vraag of de beslisser erbij is. In het gesprek ziet hij eerst zijn eigen doel en getallen, dan ons plan, en pas daarna de prijs. Het voorstel en de offerte krijgt hij dezelfde dag, niet vooraf.') + """
<h3>Voorstel maken, in drie werkdagen</h3>
""" + tl([
 ('Dag 1', 'De aantekeningen staan', 'Wat aan tafel is gezegd staat op de klantkaart: doel, marge, capaciteit, wie opvolgt, wie meebeslist. Het advies uit de quickscan is vrijgegeven.'),
 ('Dag 1', 'De rekensom', 'Het portaal rekent, niet de AI en niet de medewerker. Van het doel naar klanten, naar aanvragen, en wat die samen mogen kosten. Daaruit volgt het advertentiebudget, en uit het budget het pakket.'),
 ('Dag 2', 'Het concept', 'Claude maakt in het portaal het voorstel uit alles op de klantkaart. Bedragen uit de tarieven, getallen uit de rekensom, citaten letterlijk uit de aantekeningen. Tegelijk staat de offerte als concept in Moneybird.'),
 ('Dag 2 – 3', 'Nakijken en vrijgeven', 'Wie het intakegesprek voerde, leest het na, maakt het af en geeft voorstel en offerte in één keer vrij. Het portaal legt vast wie en wanneer.'),
 ('Dag 3', 'Een korte mail', 'Niet het voorstel zelf, wel de vraag: “Morgen lopen we het voorstel door. Is [naam] erbij?”'),
]) + vlak('grijs', 'DE REGEL', '<p><b>Het portaal rekent, de AI schrijft, een mens geeft vrij.</b> Geen bedrag dat niet uit de tarieven komt, geen getal dat niet uit de rekensom komt, geen citaat dat niet in de aantekeningen staat. En niets gaat de deur uit zonder dat iemand het heeft nagekeken.</p>') + """
<h3>De rekensom: wat mag marketing kosten?</h3>
<p>Alles wat de klant aan marketing uitgeeft, verdient zich terug binnen de terugverdientijd, standaard twaalf maanden: fundament, retainer, licenties, advertenties en gekozen extra’s samen. Wat na de vaste posten overblijft, is het advertentiebudget. Zeven sommen, in deze volgorde. Reken door met de precieze uitkomst en rond pas af bij wat je opschrijft.</p>
""" + tbl(['#', 'Vraag', 'Som', 'Waar het getal vandaan komt'], [
 ['1', 'Hoeveel nieuwe klanten heb je nodig?', 'extra omzet ÷ omzet per klant per jaar', 'Intakegesprek en vragenlijst. Blijft een klant korter dan een jaar, dan telt alleen dat deel.'],
 ['2', 'Hoeveel aanvragen horen daarbij?', 'klanten ÷ percentage dat klant wordt', 'Vragenlijst (“weet ik niet” = 20%)'],
 ['3', 'Hoeveel is dat per maand?', 'aanvragen ÷ 11', 'Jaar 1 is de set-upmaand plus elf maanden live. Bovenop wat hij nu al krijgt.'],
 ['4', 'Wat mag alle marketing samen kosten?', 'extra omzet × marge × terugverdientijd ÷ 12', 'Marge aan tafel (zonder antwoord 30%); termijn standaard twaalf maanden'],
 ['5', 'Wat gaat daar vast vanaf?', 'fundament + herstel + 11 × retainer + licenties jaar 1', 'Tarieven (1.4) en de quickscan. Jaar 1 = set-upmaand plus elf keer de retainer.'],
 ['6', 'Wat blijft er over voor advertenties?', '(marketingruimte − vaste kosten) ÷ 11 per maand', 'Bepaalt het pakket: het grootste pakket waarvan het minimum gehaald wordt'],
 ['7', 'Wat mag een aanvraag aan advertenties kosten?', 'advertentiebudget ÷ aanvragen', 'Het plafond waarop we bieden, niet de verwachting'],
]) + """
<h4 style="margin-top:26px">Het voorbeeld, doorgerekend</h4>
<p>Dezelfde klant als in de vragenlijst: opdrachten van € 1.500, drie keer per jaar, een op de vier aanvragen wordt klant. Aan tafel noemde hij € 120.000 extra omzet en 30% marge.</p>
""" + rk([
 ('Extra omzet die hij komend jaar wil halen', '€ 120.000', 'intakegesprek'), ('Zijn brutomarge', '× 30%', 'intakegesprek'), ('Terugverdiend binnen twaalf maanden', '× 1 jaar', 'standaard, aan tafel bevestigd'),
 ('Wat alle marketing in jaar 1 mag kosten', '= € 36.000', 'alles samen', 'tot'),
 ('Het fundament', '− € 4.500', 'eenmalig'), ('Retainer Starter, elf maanden (vanaf maand 2)', '− € 11.000', ''), ('Licenties, jaar 1', '− € 544', 'MailerLite 12 × € 9,90, Cookiescript € 150, dashboard 11 × € 25'),
 ('Over voor advertenties', '= € 19.956', '€ 1.814 per maand, elf maanden live', 'tot'),
]) + grid(4, [
 kaart('27 klanten', '€ 120.000 ÷ € 4.500 per klant per jaar', 'SOM 1'),
 kaart('107 aanvragen', '27 ÷ 25%, over elf maanden live: 10 extra per maand', 'SOM 2 EN 3'),
 kaart('€ 187', 'per aanvraag aan advertenties: € 19.956 ÷ 107', 'SOM 7'),
 kaart('36%', 'retainer als deel van retainer plus advertenties: onder de 50%', 'TOETS'),
]) + """
<p style="margin-top:16px">€ 1.814 per maand is genoeg voor Starter (minimaal € 1.000) en te weinig voor Playmaker (€ 2.500). Het is één aanbod voor één doelgroep, dus één campagne, op Google en Meta. Zo volgt het pakket uit de som.</p>
""" + key('DE OPLEVERING', '“10 extra aanvragen per maand, tegen maximaal € 187 per aanvraag aan advertenties, vanaf het tweede kwartaal.”', '<p>Dat is de doelregel: één zin die de klant kan onthouden en kan narekenen, omdat hij de getallen zelf aanleverde. Hij komt terug in het voorstel, als doellijn in het dashboard, bij de budgetverdeling over de campagnes (het plafond per aanvraag bepaalt waar we stoppen met bieden) en in elke Performance Review. <b>Altijd erbij zeggen:</b> het doel geldt vanaf maand 4. Reken je het jaardoel over twaalf maanden vanaf dag één, dan sta je in maand drie achter op een schema dat nooit klopte.</p>') + """
<h4>Drie toetsen, in deze volgorde</h4>
""" + jk([
 ('Is het te leveren?', 'Leg de extra aanvragen naast wat hij nu krijgt. Van 12 naar 33 per maand is een verdrievoudiging van zijn werk. Kan hij het niet aan, dan verlaag je het doel, niet het budget.'),
 ('Past het bij een pakket?', 'Minimaal € 1.000 advertentiebudget per maand is Starter, € 2.500 Playmaker, € 5.000 Captain, € 7.500 Champion. Heeft hij meer aanbod of doelgroepen dan het pakket campagnes heeft, dan telt het hoogste van de twee. Starter kost in jaar 1 (set-upmaand plus elf maanden) alles bij elkaar ongeveer € 27.000. Bij 30% marge hoort daar ongeveer € 90.000 extra omzet bij, bij 50% marge ongeveer € 54.000.'),
 ('Houdt de 50%-regel?', 'Het advertentiebudget is minstens zo hoog als de retainer. Met de minimumbudgetten klopt dat altijd; eenmalige kosten en licenties tellen niet mee.'),
]) + let('<p><b>Als de som niet uitkomt.</b> Bij € 85.000 extra omzet blijft er € 860 per maand over voor advertenties: onder het minimum van Starter. Dan zijn er drie uitwegen: een hoger doel, een langere terugverdientijd, of nee. Nooit het goedkoper maken.</p><p style="margin-top:8px">Het getal uit som 7 is een plafond, geen verwachting. Wat een aanvraag echt gaat kosten, blijkt pas uit de cijfers. Zit de verwachting erboven, dan is dat geen tegenvaller maar de reden om nee te zeggen.</p>', 'ALS HET NIET UITKOMT') + """
<h3>Het voorstel: doel, plan, voorstel</h3>
<p>Het voorstel overtuigt; de offerte in Moneybird legt vast. Ze komen uit dezelfde klantkaart en spreken elkaar nooit tegen. Het voorstel zijn zes pagina’s A4 in de huisstijl, als pdf en als link op de klantkaart, geschreven voor de beslisser, ook als die er niet bij was. Er staat geen handtekening onder. Het begint bij zijn doel; de prijs komt pas op pagina 5.</p>
""" + tbl(['Pagina', 'Wat erop staat', 'Komt uit'], [
 ('grp', 'JOUW DOEL'),
 ['1 · Omslag', '“Voorstel voor [bedrijf]”, zijn doel in één zin, de datum, geldig tot, wie het voert, en het offertenummer', 'Klantkaart'],
 ['2 · Wat we begrepen en zagen', 'Zijn doel in zijn eigen woorden en wat de campagne moet opleveren. De drie bevindingen uit de quickscan, elk met het gevolg in zijn getallen.', 'Intakegesprek, quickscan'],
 ['3 · Jouw doel in cijfers', 'De rekensom: wat het doel vraagt, wat alle marketing samen mag kosten, wat er overblijft voor advertenties, en de toets aan zijn capaciteit', 'Portaal'],
 ('grp', 'ONS PLAN'),
 ['4 · Ons plan', 'De vier vaste stappen als tijdlijn met zijn datums: set-up, content shooten (de draaidag, in week 3 of 4), adverteren (de live-datum), optimaliseren vanaf maand 4', 'Werkwijze'],
 ('grp', 'HET VOORSTEL'),
 ['5 · Pakket en wat het kost', 'Waarom dit pakket en niet de andere drie. Daaronder drie blokken per ontvanger: aan James Robinson, rechtstreeks aan leveranciers, via Webmix. Geen eindtotaal.', 'Tarieven'],
 ['6 · Jouw kant en de afspraken', 'De vijf afspraken met een termijn. Maandelijks opzegbaar, cijfers leidend, de 50%-regel. Onderaan: “Tekenen doe je in de offerte”, met de link.', 'Dit hoofdstuk'],
]) + """
<h4 style="margin-top:26px">Pagina 5, zoals de klant hem leest</h4>
<div class="grid3">""" + col('AAN JAMES ROBINSON', [('Fundament', '€ 4.500', 'eenmalig, bij ondertekening'), ('Retainer Starter', '€ 1.000', 'per maand vooraf, vanaf maand 2'), ('Marketingdashboard', '€ 25', 'per maand, of € 250 per jaar')]) + col('RECHTSTREEKS, OP ZIJN NAAM', [('Advertentiebudget', '€ 1.814', 'per maand, uit de rekensom'), ('MailerLite', '€ 9,90', 'per maand, tot 500 adressen'), ('Cookiescript', '€ 150', 'per jaar, via Webmix'), ('ClickCease', 'vanaf $ 99', 'per maand; optioneel, jouw keuze')]) + col('VIA WEBMIX, EIGEN OFFERTE', [('Herstelposten uit de quickscan', '€ 0', 'in dit voorbeeld geen')]) + """</div>
<p style="margin-top:14px">Geen eindtotaal, want er is geen bedrag dat hij in één keer aan één partij betaalt. Het totaal van alle marketing staat op pagina 3, in de rekensom: als de ruimte die hij zelf heeft gekozen.</p>
""" + let('<p><b>Stuur het voorstel niet vooraf.</b> Een voorstel zonder uitleg wordt op één regel gelezen: de prijs. Dan begint het gesprek met een verdediging in plaats van met zijn doel. En de offerte gaat niet mee het gesprek in: wie aan tafel een offerte ziet, gaat regels tellen.</p>', 'DE VOLGORDE') + """
<h3>Het voorstelgesprek: 45 minuten</h3>
<div class="klok"><span style="flex:3">AFTRAP</span><span style="flex:7">DOEL</span><span style="flex:7">REKENSOM</span><span style="flex:7">PLAN</span><span style="flex:7" class="acc">PRIJS</span><span style="flex:7">JOUW KANT</span><span style="flex:7">BESLUIT</span></div>
""" + blk('0 – 3', 'De aftrap', '3 MINUTEN', 'Terugkoppelen naar het intakegesprek, en de opbouw zetten: jouw doel, ons plan, het voorstel.',
 ['Vorige keer wilde je [wat hij op minuut 1 zei]. Dit voorstel is ons antwoord daarop.', 'Eerst je doel, dan hoe we dat gaan halen, dan wat het kost. Aan het eind wil ik weten of je akkoord bent.'],
 [], ['Is de beslisser erbij? Zo niet: wie beslist, en wanneer spreken we die?'], 'Meteen naar de prijs bladeren. Wie de prijs ziet voor de som, leest de rest als verdediging.') + blk('3 – 10', 'Jouw doel: wat we begrepen en zagen', '7 MINUTEN', 'Pagina 2. Controleren of het beeld nog klopt, niet opnieuw uitleggen.',
 ['Dit is je doel, en dit moet de campagne opleveren. Zo hebben we het opgeschreven. Klopt dat nog?', 'Dit zagen we in de quickscan. Is er sinds de vorige keer iets veranderd?'],
 ['Het voorstel, pagina 2'], ['Correcties op doel of getallen. Rekent het portaal mee, dan zie je direct wat het met het budget doet.'], 'De quickscan opnieuw uitleggen. Dat was het intakegesprek.') + blk('10 – 17', 'Jouw doel: de rekensom', '7 MINUTEN', 'Pagina 3. Wat het doel vraagt, en wat het mag kosten.',
 ['Om [doel] te halen heb je ongeveer [aantal] aanvragen per maand nodig.', 'Alles bij elkaar mag je marketing in het eerste jaar [bedrag] kosten; dan verdien je het binnen twaalf maanden terug. Na het fundament, de retainer en de licenties blijft er [bedrag] per maand over voor advertenties.'],
 ['Het voorstel, pagina 3'], ['Kan hij [aantal] aanvragen per maand aan? Anders is het doel te hoog, niet het budget te laag.', 'Klopt twaalf maanden voor hem, of mag het langer?'], 'De som overslaan omdat hij al ja knikt. Hierop rust straks elk maandcijfer.') + blk('17 – 24', 'Ons plan', '7 MINUTEN', 'Pagina 4. Vier stappen, voor iedereen dezelfde. Alleen de datums zijn van hem.',
 ['We werken voor iedere klant op dezelfde manier: set-up, content shooten, adverteren en eerste resultaten, en daarna optimaliseren.', 'Voor jou betekent dat: op [datum] staat je eerste advertentie live. De eerste aanvragen zijn duur; in maand 2 en 3 brengen we de kosten omlaag.', 'Vanaf maand 4 optimaliseren we. Wat we dan als eerste oppakken, laten we de cijfers bepalen, niet een plan van vandaag.'],
 ['Het voorstel, pagina 4'], ['Wie er op beeld kan; de dagdelen voor de draaidag volgen in het onboardingformulier'], 'Maatwerk beloven in het plan omdat het gesprek goed loopt. Het plan is vast; wat verschilt, laten de cijfers in stap 4 zien.') + blk('24 – 31', 'Het voorstel: pakket en wat het kost', '7 MINUTEN', 'Pagina 5. De som maakt de keuze, niet wij. De bedragen noemen en dan stil zijn.',
 ['Daarom adviseren we [pakket]. Wil je minder uitgeven, dan wordt het doel lager. De prijs niet.', 'Eenmalig: het fundament, € 4.500. De herstelposten uit de quickscan gaan rechtstreeks via Webmix.', 'Per maand: [pakket], [bedrag]. Het advertentiebudget gaat rechtstreeks naar de advertentieplatformen, niet naar ons.', 'Er zit nergens een marge van ons op iets van een ander. Bij ClickCease en Leadinfo krijgen wij een vergoeding van de leverancier; jij betaalt daar niets extra voor.', 'De licenties staan op jouw naam en betaal je zelf; wij richten ze in. Per licentie kies je maand of jaar. ClickCease is een optie, en het is jouw keuze. Kies je ervoor, dan laten we na de proefperiode zien of het zich terugverdient.'],
 ['Het voorstel, pagina 5', 'De pakketten (V.2)', 'De tarieven (V.1), voor wie alles wil nalezen'], ['Zijn eerste reactie. Die zegt meer dan zijn vraag.', 'Per licentie maand of jaar; ClickCease ja of nee; dashboard maand of jaar'], 'Het pakket verdedigen in plaats van naar de som te wijzen, of na het bedrag doorpraten en korting aanbieden.') + blk('31 – 38', 'Het voorstel: jouw kant en de afspraken', '7 MINUTEN', 'Pagina 6. Wat wij van hem nodig hebben, en wat we elkaar beloven.',
 ['Vijf dingen hebben we van je nodig. Zonder die vijf vertellen de cijfers niet de waarheid.', 'Je kunt elke maand opzeggen, en wij ook. Werkt het niet, dan zeggen wij dat zelf, met de cijfers erbij.'],
 ['Het voorstel, pagina 6'], ['Per afspraak: haalbaar, en per wanneer?'], 'Hier snel overheen praten omdat het gesprek goed loopt. Dit is het deel dat je in maand drie nodig hebt.') + blk('38 – 45', 'Het besluit', '7 MINUTEN', 'Akkoord of niet. Nooit “we horen van elkaar”.',
 ['Wat heb je nog nodig om te beslissen?', 'Akkoord: dan sturen we vandaag het voorstel en de offerte om te tekenen, en plannen we de start.', 'Niet akkoord: wat zou er anders moeten? Het doel, de startdatum, welke dienst eerst: dat kan schuiven. De prijs niet.'],
 [], ['Akkoord of niet. Bij niet: waarom, in zijn woorden.'], 'Een “misschien” accepteren zonder datum. Later zonder datum is een nee waar je alleen nog niet van weet.') + """
<h3>Jouw kant: vijf afspraken</h3>
<p>De helft van de keten is van de klant. Deze vijf staan in het voorstel, met een termijn per afspraak. Geen garantie van ons en geen straf voor hem: het is wat nodig is om de cijfers de waarheid te laten vertellen.</p>
""" + tbl(['Afspraak', 'Wat het inhoudt', 'Wat er gebeurt als het niet lukt'], [
 ['De toegangen', 'Binnen drie werkdagen na het tekenen, in één toegangensessie van 45 minuten met ons', 'Het fundament start pas als ze er zijn. Elke dag later schuift de live-datum een dag.'],
 ['Eén beslisser', 'Eén persoon beslist over doelgroep, boodschap en budget, en reageert binnen twee werkdagen', 'Akkoord in week 1 en 3 blijft liggen, en het tijdpad schuift.'],
 ['Opvolging', 'Elke aanvraag binnen [de tijd uit het intakegesprek] opgevolgd door [naam], met een vervanger bij vakantie of ziekte', 'Aanvragen worden geen klant. Dit is de meest voorkomende oorzaak van tegenvallend resultaat, en we meten het vanaf dag één.'],
 ['Een oordeel per aanvraag', 'In het dashboard: goede aanvraag of niet, en waarom, met één klik. En later: welke aanvraag klant werd.', 'We kunnen alleen op aantal sturen, niet op kwaliteit. Dat zeggen we erbij als de cijfers tegenvallen.'],
 ['Beeld en inhoud', 'Het onboardingformulier en de toegangen binnen drie werkdagen, met alle dagdelen in week 3 en 4 waarop we kunnen filmen, en iemand die het werk doet op beeld', 'Zonder eigen beeld beginnen we met stock, en dat werkt aantoonbaar slechter.'],
]) + """
<h3>Wat vooraf vastligt, zodat het later geen excuus is</h3>
<p>Deze zinnen staan in het voorstel en worden aan tafel gezegd, niet als kleine lettertjes. Ze maken de belofte geloofwaardiger, niet zwakker.</p>
""" + grid(2, [
 kaart('Wat we vooraf zeggen', ol(['<b>De eerste aanvragen zijn duur.</b> In maand 1 twee tot drie keer het doelbedrag. De curve hoort omlaag te lopen.', '<b>We vergelijken pas bij genoeg conversies.</b> Tot die tijd laten we de tussenstappen zien: weergaven, kosten per duizend, doorklik, kosten per klik.', '<b>Het kan zijn dat we adviseren je budget te verhogen.</b> Zitten de kosten per aanvraag op doel en het aantal niet, dan is budget de enige knop.', '<b>Het kan zijn dat we adviseren je aanbod of prijs te veranderen.</b> Die beslissing is van jou.', '<b>We meten je opvolgtijd, en jij geeft per aanvraag een oordeel.</b> Allebei vanaf dag één.', '<b>Je landingspagina wordt niet A/B-getest, en dat is geen tekortkoming.</b> Bij twintig aanvragen per maand duurt één afgeronde test langer dan een jaar.', '<b>Bewegen de cijfers niet, dan zeggen wij het zelf,</b> en leggen we de opties voor, waaronder stoppen.'], ''), 'ZEVEN ZINNEN', 'b'),
 kaart('Vier dingen die wij niet oplossen', '<ul><li><b>Zijn merk en autoriteit.</b> Bij twee vergelijkbare aanbieders kiest iemand wie hij vertrouwt. Een eigen traject met een eigen prijs.</li><li><b>Zijn aanbod en prijs.</b> Advertenties versterken wat er is. Wij signaleren; wijzigen is zijn beslissing.</li><li><b>Zijn opvolging.</b> Een aanvraag die twee dagen blijft liggen, is vaak al bij een ander. De grootste onbenutte hefboom bij bijna elke klant.</li><li><b>Zijn capaciteit.</b> Meer aanvragen dan hij aankan, levert slechte reviews op. We verlagen het doel liever dan dat we hem vastdraaien.</li></ul><p style="margin-top:8px">We meten ze wel, en we melden ze op het moment dat ze de oorzaak zijn.</p>', 'DE GRENS', 'r'),
]) + """
<h3>Vier bezwaren, vier antwoorden</h3>
<p>Benoem het bezwaar in plaats van het te weerleggen: vraag welk van de vier het is.</p>
""" + tbl(['Bezwaar', 'Hoe het klinkt', 'Wat je doet'], [
 ['Prijs', '“Het is veel geld.”', 'Terug naar de som: wat levert een klant op, hoeveel heb je er nodig, wat mag dat kosten? Is het echt te veel, dan wordt het doel lager. Nooit de prijs.'],
 ['Vertrouwen', '“Hoe weet ik dat het werkt?”', 'Dat weet niemand vooraf, en dat zeggen we. Wel: je ziet het elke dag in het dashboard, je kunt elke maand opzeggen, en wij zeggen het zelf als het niet werkt.'],
 ['Timing', '“Niet nu.”', 'Vragen wat er dan anders is. Is het echt timing, dan een datum afspreken. Is het iets anders, dan is dat het echte bezwaar.'],
 ['Besluitvorming', '“Ik moet het nog voorleggen.”', 'Aan wie, en wanneer? Aanbieden om het samen te doen. Een voorstel dat zonder ons wordt voorgelegd, wordt op prijs beoordeeld.'],
]) + grid(3, [
 kaart('Akkoord', 'Dezelfde dag het voorstel en de offerte in Moneybird, met startdatum en live-datum. Na de handtekening de onboarding: gegevens ophalen. Daarna het fundament.', 'UITKOMST', 'g'),
 kaart('Een datum, als uitzondering', 'Alleen als er echt nog iemand moet meebeslissen. Een concrete dag binnen de twee weken dat het voorstel geldig is. Op die dag bel je; je mailt niet.', 'UITKOMST', 'b'),
 kaart('Niet akkoord', 'Kijken wat kan schuiven: het doel, de startdatum, welke dienst eerst. De prijs niet. Past het niet, dan bedanken, de reden vastleggen in zijn woorden, en door naar de volgende. Een korte mail met de vraag of hij de nieuwsbrief wil.', 'UITKOMST', 'r'),
]) + grid(2, [
 kaart('Mag schuiven', 'Het doel, en daarmee het budget en het pakket. De startdatum. Welke dienst we als eerste in de campagne zetten.', '', 'g'),
 kaart('Schuift nooit', 'De tarieven: geen korting, voor niemand. Het fundament: niet los, niet in delen, niet overslaan. Maandelijks opzegbaar: niet langer vastleggen voor een lagere prijs. <b>De gevaarlijkste toegeving is korting op het fundament:</b> dat bedrag is 52,5 uur werk die je toch maakt.', '', 'r'),
]) + mail('DEZELFDE DAG, NA HET GESPREK', 'Het voorstel, zoals besproken', '<p>Hoi [voornaam],</p><p>Dank voor het gesprek. Hierbij het voorstel dat we samen hebben doorgelopen: [pdf].</p><ul><li><span class="vv">[het doel, in zijn woorden]</span></li><li><span class="vv">[het pakket, en waarom]</span></li><li><span class="vv">[de datum waarop de eerste advertentie live staat]</span></li></ul><p><span class="vv">[Bij ja: tekenen doe je hier, in de offerte: link naar Moneybird.] [Bij een datum: ik bel je op dag datum.]</span></p><p>Het voorstel is geldig tot [datum, twee weken].</p><p>Groet,<br>[naam]</p>') + """
<p style="margin-top:16px"><b>Opvolgen.</b> Op de afgesproken datum bellen, niet mailen. Geen reactie na twee weken: één keer bellen. Daarna wordt het later: één bericht over drie maanden, zoals in stap 01. Een nieuwe offerte krijgt de tarieven van dat moment. Alles op de klantkaart: uitkomst, bezwaar, datum.</p>

<h3>Wat de verkoop ons kost</h3>
""" + tbl(['Onderdeel', 'Was', 'Wordt'], [
 ['Aanvraag beoordelen en inplannen', '0,5 u', 'Automatisch'],
 ['Quickscan', '0,5 u', '0,5 u'],
 ['Intakegesprek', '1,5 u', '1,25 u (een uur plus het kwartier erna)'],
 ['Voorstel maken', '1 u', '1 u, met het concept uit het portaal'],
 ['Voorstelgesprek', '1 u', '1 u (45 minuten plus vastleggen)'],
 ['Opvolgen en afronden', '0,5 u', '0,5 u'],
 ('tot', ['Per traject', '5 u', '4,25 u']),
]) + """
<p style="margin-top:14px">Bij één op drie scoren is dat bijna dertien uur per gewonnen klant, ongeveer € 497 kostprijs. Dat is 3% van wat een jaar Starter ons oplevert, en 1,2% bij twee jaar Playmaker. Die kosten zitten in het tarief, niet op de factuur: fase 1 is gratis voor de klant.</p>
""" + raakt(ul([
 '<b>De rekensom bepaalt alles wat erna komt:</b> het pakket, het advertentiebudget, de doelregel in het dashboard, het biedplafond in de campagnes, en de vraag in elke Performance Review.',
 '<b>Een rood punt in de quickscan wordt hier geld.</b> Herstelposten gaan van de marketingruimte af; bij een krappe som kan dat het verschil zijn tussen Starter en nee.',
 '<b>Hoe hoger de vaste posten, hoe hoger de drempel.</b> Een duurder fundament of dashboard betekent een hogere minimale omzetwens om in Starter te passen.',
 '<b>De live-datum hangt aan de draaidag.</b> In het voorstel staat de draaidag als week 3 of 4, niet als datum. Valt hij in week 4, dan gaat Google op dag 19 live en Meta met video een week later.',
 '<b>De vijf afspraken van jouw kant</b> zijn later de eerlijke verklaring als het tegenvalt. Wie ze hier overslaat, heeft in maand drie alleen nog een excuus.',
], '')) + open_(ul([
 'Het voorstel opmaken in de huisstijl, en voorstel en offerte laten genereren vanuit het portaal.',
 'Branchegemiddelden voor conversie, voor klanten die “weet ik niet” invullen. Die bestaan nog niet.',
], '')) + stap_eind()

P2B = STAP03 + STAP04
