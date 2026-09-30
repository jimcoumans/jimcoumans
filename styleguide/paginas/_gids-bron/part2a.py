# -*- coding: utf-8 -*-
from common import *

DEEL2_OPEN = """
<section class="deel" id="deel-2"><div class="wrap">
<span class="kick">DEEL 2</span>
<h2>De klantreis</h2>
<p>Van de eerste klik tot maand twaalf, in de volgorde waarin het gebeurt. Per stap: wanneer, wie, hoe lang en wanneer het klaar is; wat de klant merkt; wat wij doen en zeggen; wat eraan vastzit; en wat nog open ligt.</p>
<p style="margin-top:14px"><b style="color:#fff">Eén regel loopt door alle stappen heen:</b> we vragen wat we nodig hebben op het moment dat we het nodig hebben, en elke vraag maar één keer. Wat we zelf kunnen opzoeken, vragen we niet. Wat het advies of de prijs verandert, vragen we vóór het voorstel. Wat we pas nodig hebben om te maken, vragen we na de handtekening.</p>
</div></section>
"""

# ---------------------------------------------------------------- STAP 01
SCHERMEN = [
 ('1', 'Aan wie verkoop je?', ['Aan bedrijven', 'Aan particulieren', 'Aan allebei'], 'Kwalificeren, samen met gebied en beslistraject.', 'Bedrijven + eigen regio + langer dan een half jaar beslissen: ' + O()),
 ('2', 'Hoe word je klant bij jou?', ['Ze vragen een offerte, afspraak of reservering aan', 'Ze kopen direct online', 'Ze komen langs in de winkel of zaak', 'Een combinatie'], 'Het relevante verschil is of iemand iets aanvraagt of direct koopt.', '“Direct online”: ' + R() + '. E-commerce is niet onze propositie.'),
 ('3', 'Wat verkoop je, in één zin?', ['Open veld: geen slogan, gewoon wat iemand bij je koopt'], 'Kwalificeren en de zoektermen voor de quickscan, in zijn eigen woorden.', 'Medische claims of financiële producten: zien we in de quickscan (strenge advertentieregels).'),
 ('4', 'Waar zitten je klanten?', ['In de regio rond mijn vestiging', 'In heel Nederland', 'In Nederland en daarbuiten'], 'Quickscan: in dit gebied kijken we wie op zijn zoektermen adverteert.', ''),
 ('5', 'Wat geef je nu per maand uit aan marketing, alles bij elkaar?', ['Nog niets', 'Minder dan € 1.000', '€ 1.000 – 2.500', '€ 2.500 – 5.000', 'Meer dan € 5.000'], 'Budgettoets. We noemen ons minimum erbij: “Ons kleinste pakket kost, samen met het advertentiebudget, ongeveer € 2.000 per maand.”', 'Minder dan € 1.000: ' + O() + '. “Nog niets”: het volgende scherm beslist.'),
 ('6', 'Waar geef je het aan uit? / Wat wil je gaan uitgeven?', ['Google of Bing', 'Facebook of Instagram', 'LinkedIn', 'TikTok', 'Vindbaar zonder advertenties', 'E-mail', 'Social zonder advertenties', 'Drukwerk, radio of tv', 'Een bureau of freelancer'], 'Bij een bedrag: waar het heen gaat (bestaande advertentieaccounts nemen we over, de historie is geld waard). Bij “nog niets”: wat hij wil gaan uitgeven, zodat de budgettoets blijft.', 'Gepland minder dan € 1.000: ' + O() + '. Alleen social zonder advertenties: gespreksonderwerp.'),
 ('7', 'Wat is het adres van je website?', ['Adres', 'Ik heb nog geen website'], 'De quickscan: snelheid, meting, formulieren, platform.', '“Nog geen website”: ' + R() + '. Eerst een websiteproject.'),
 ('8', 'Wat is een gemiddelde opdracht bij jou waard?', ['€ ……'], 'Rekensom, deel 1 van de klantwaarde. “Hieruit rekenen we uit wat een aanvraag je maximaal mag kosten.”', 'Meer dan drie keer hoger dan de website doet vermoeden: navragen aan tafel.'),
 ('9', 'Hoe lang blijft een klant gemiddeld klant?', ['Eenmalige aankoop', 'Korter dan een jaar', 'Een tot twee jaar', 'Drie tot vijf jaar', 'Langer dan vijf jaar'], 'Rekensom, deel 2. Korter dan een jaar telt als een half jaar; vanaf een jaar rekenen we met één jaar, want alles verdient zich binnen twaalf maanden terug.', '“Eenmalig” slaat het volgende scherm over.'),
 ('10', 'Hoe vaak koopt een klant per jaar bij je?', ['Schuifje 1 – 52'], 'Rekensom, deel 3. Een getal, geen bandbreedte.', ''),
 ('11', 'Hoeveel aanvragen krijg je nu per maand?', ['Schuifje 0 – 100+'], 'Het vertrekpunt waar we alles mee vergelijken. Telefoon, mail en formulieren samen.', 'Minder dan tien: aan tafel zeggen dat een uitspraak over conversie maanden duurt.'),
 ('12', 'Hoeveel procent van die aanvragen wordt klant?', ['Schuifje 0 – 100%', 'Weet ik niet'], 'Rekensom, en een eerste blik op de opvolging. “Weet ik niet” telt als 20%.', 'Onder 10%: eerst opvolging en aanbod bekijken. Boven 60%: telt waarschijnlijk offertes, navragen.'),
 ('13', 'Hoe lang duurt het van eerste contact tot opdracht?', ['Direct', 'Een paar dagen', 'Een paar weken', 'Een paar maanden', 'Langer dan een half jaar'], 'Kwalificeren, en wanneer de eerste klanten kunnen komen.', 'Aan tafel zeggen dat de eerste klanten pas na deze termijn komen.'),
 ('14', 'Waar loop je nu tegenaan?', ['Te weinig aanvragen', 'Wel aanvragen, niet de goede', 'Aanvragen worden te weinig klant', 'Geen tijd of kennis', 'Weet niet wat marketing oplevert', 'Iets anders'], 'Hiermee opent het intakegesprek. Elk antwoord slaat op een plek in de keten: bereik, kwaliteit, opvolging, capaciteit, meting.', '“Te weinig klant”: opvolging of aanbod in beeld; lezen in de quickscan.'),
 ('15', 'Wanneer wil je beginnen?', ['Zo snel mogelijk', 'Binnen een maand', 'Binnen drie maanden', 'Later dan drie maanden', 'Ik oriënteer me nog'], 'Planning en prioriteit.', '“Later dan drie maanden” of “oriënteer me nog”: ' + L() + '.'),
 ('16', 'Alleen bij groen of oranje: “Dit ziet er goed uit, [voornaam].”', ['Achternaam', 'Telefoon', 'Bedrijfsnaam', 'Je rol: eigenaar, marketing, anders'], 'Contact en of de beslisser aan tafel zit. Pas hier, omdat het niet nodig is om te kwalificeren, en omdat iemand het na “dit ziet er goed uit” het makkelijkst geeft.', 'Daarna: groen kiest een moment voor het intakegesprek, oranje voor een telefoontje van een kwartier.'),
]

def scherm(s):
    nr, q, opts, w, norm = s
    return ('<div class="scr"><span class="sn">SCHERM %s VAN 16</span><h4>%s</h4><div class="opt">%s</div>'
            '<p class="w"><b>Waarvoor:</b> %s%s</p></div>') % (nr, q, ''.join('<span>%s</span>' % o for o in opts), w, (' <b>Norm:</b> ' + norm) if norm else '')

STAP01 = stap_kop('01', 'f1', 'FASE 1 · VERKOPEN', 'Van aanvraag tot afspraak',
 'Van het moment dat iemand interesse toont tot het gesprek in de agenda staat. Vier onderdelen, vier uitkomsten, en bijna alles automatisch. Gebaseerd op het model van King Kong, aangepast aan hoe wij werken.',
 [('WANNEER', 'Vanaf de eerste klik op “Plan een gesprek”'), ('WIE', 'Niemand: automatisch. Een mens pas bij de quickscan of het kwartier'), ('HOE LANG', 'Vijf minuten voor de klant; de reeks loopt twaalf dagen'), ('KLAAR ALS', 'Groen heeft het intakegesprek geboekt, minstens drie werkdagen vooruit. Oranje, later en rood hebben hun eigen vervolg')],
 'stap-01') + klant('Hij vult twee velden in, kijkt een video van drie minuten, beantwoordt vijftien korte vragen en plant zelf een moment. Hij ziet de tarieven voordat hij ons spreekt. Past het niet, dan hoort hij dat direct, met de reden, in plaats van na drie maanden en een factuur.') + """
<h3>Het proces</h3>
<div class="stroom">
 <div class="s"><span class="sl">A · AUTOMATISCH</span><b>Het leadformulier</b><span>Naam en e-mailadres, in twee stappen</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">B · AUTOMATISCH</span><b>De landingspagina</b><span>Video van drie minuten, één knop</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">C · AUTOMATISCH</span><b>De vragenlijst</b><span>Vijftien vragen, één per scherm</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">UITKOMST</span><b>Groen, oranje, later of rood</b><span>Elk met een eigen vervolg</span></div>
</div>
<p style="margin-top:14px"><b>D · De reeks.</b> Wie na het leadformulier niet doorklikt, krijgt vijf mails in twaalf dagen. Elke mail linkt naar de vragenlijst. Zodra de vragenlijst binnen is, stopt de reeks.</p>
""" + grid(4, [
 kaart('Het gesprek', 'De klant plant zelf het intakegesprek in, minstens drie werkdagen vooruit zodat de quickscan past. De bevestiging gaat automatisch, met de tarieven.', 'GROEN', 'g'),
 kaart('Eerst een kwartier', 'Eén telefoontje over het ene punt dat oranje staat: budget, wat een aanvraag mag kosten, of de markt. Daarna groen, later of rood.', 'ORANJE', 'o'),
 kaart('Nog niet', 'Nu geen gesprek. Eén bericht rond het moment dat hij zelf noemde, over een, drie of zes maanden.', 'LATER', 'b'),
 kaart('Een eerlijk nee', 'De reden in één zin, en de keuze om de nieuwsbrief te ontvangen. Daarna niets, tot er iets verandert.', 'ROOD', 'r'),
]) + """
<h3>Waar een mens nodig is</h3>
<p>Pas bij de quickscan. Alles daarvoor gaat vanzelf. Dat raakt precies de grootste uitdaging: dit deel draait zonder Jim Coumans of Jim Kikken. Een mens komt pas in beeld als iemand zich al gekwalificeerd heeft, en dan alleen op vier plekken:</p>
""" + tbl(['Waar', 'Wat', 'Wie'], [
 ['De quickscan', 'Vóór elk groen gesprek website en markt bekijken (stap 02)', 'Vaste medewerker'],
 ['Het kwartier', 'Bij oranje: één telefoontje over één punt', 'Dezelfde vaste medewerker'],
 ['Het intakegesprek', 'Een uur, met een klant die al weet hoe we werken (stap 03)', 'Accountmanager of eigenaar'],
 ['De regels nakijken', 'De eerste drie maanden elke week de rode, oranje en latere uitkomsten', 'Eigenaar'],
]) + """

<h3>A · Het leadformulier</h3>
<p>Twee velden in twee stappen: eerst “Plan een gesprek · bekijk eerst in drie minuten hoe we werken”, dan de voornaam en het e-mailadres. Het enige doel is dat iemand de video ziet, en dat we hem niet kwijt zijn als hij daarna afhaakt. Het staat achter elke knop “Plan een gesprek” op jamesrobinson.nl en gaat direct naar MailerLite. Onder het formulier staat letterlijk wat er gebeurt: “We sturen je de video en een korte reeks van vijf mails over hoe we werken. Afmelden kan in elke mail.” De nieuwsbrief is een aparte, eigen keuze.</p>

<h3>B · De landingspagina: drie minuten video, één knop</h3>
<p>De video doet vooraf wat nu aan tafel een kwartier kost: uitleggen hoe we werken, wat we niet doen en wanneer we nee zeggen. Wie daarna doorklikt, heeft zichzelf al half gekwalificeerd. Eén keer opgenomen door Jim Coumans, op een eigen pagina zoals /aan-de-slag. De knop heet “Plan je gesprek in”.</p>
""" + tbl(['Tijd', 'Onderwerp', 'Wat erin zit'], [
 ['0:00', 'Voor wie dit is', 'Bedrijven die meer aanvragen willen, een website hebben en bereid zijn te adverteren. Ben je dat niet, dan kun je hier stoppen, en dat is prima.'],
 ['0:20', 'Wat we anders doen', 'We beginnen met adverteren, niet met een plan. Je website is het middelpunt. Social media beheren doen we niet. Momentum first, mastery later.'],
 ['1:00', 'Wat je krijgt voordat je betaalt', 'We kijken naar je website en je markt voordat we elkaar spreken. Het gesprek gaat over jouw cijfers. Je krijgt de tarieven vooraf, volledig.'],
 ['1:40', 'Wanneer we nee zeggen', 'De vijf redenen, kort. Het deel dat het meeste vertrouwen oplevert, juist omdat bijna niemand het zegt.'],
 ['2:20', 'Wat je nu doet', 'Vijftien korte vragen, één per scherm, zo’n vijf minuten. Daarna plan je zelf een moment. Geen verkoper die je terugbelt.'],
]) + """
<p style="margin-top:14px"><b>Waarom de knop niet “gratis strategiegesprek” heet.</b> Dat is het meest gebruikte lokmiddel in de branche, en iedereen weet wat er dan volgt. Wij zeggen wat je krijgt: iemand die vóór het gesprek naar je website en je markt heeft gekeken, en een gesprek over jouw cijfers.</p>

<h3>C · De vragenlijst</h3>
<p>Vijftien vragen, één per scherm, en pas daarna de contactgegevens, alleen voor wie groen of oranje is. De volgorde loopt van makkelijk naar gevoelig en weer terug. Naam en e-mail komen uit het leadformulier. De huidige omzet vragen we niet: het gaat om waar hij naartoe wil, en dat vragen we aan tafel.</p>
<div class="schermen">""" + ''.join(scherm(s) for s in SCHERMEN) + """</div>
<p style="margin-top:16px"><b>Over de schuifjes.</b> Een breed schuifje laat zien dat tien aanvragen niet veel is. Maar het verschuift ook het getal zelf: wie twijfelt tussen 8 en 12, schuift makkelijk naar 15. Daarom begint het schuifje op nul, staat het getal ernaast en is het in te typen, en vergelijken we bij de eerste twintig aanvragen het ingevulde getal met wat er aan tafel blijkt.</p>

<h3>De regels: wat de formuliertool met de antwoorden doet</h3>
<p>Rood gaat voor later, later gaat voor oranje, oranje gaat voor groen. Staan er meerdere punten op oranje, dan is het nog steeds één telefoontje.</p>
""" + tbl(['Als het antwoord is', 'Uitkomst', 'Wat de klant daarna ziet'], [
 ['“Ze kopen direct online”', R(), 'De reden: e-commerce is niet onze propositie, met een partner die het wel is.'],
 ['“Ik heb nog geen website”', R(), 'De reden: eerst een websiteproject.'],
 ['Beginnen later dan drie maanden, of “ik oriënteer me nog”', L(), 'Nu geen gesprek. Eén bericht rond het moment dat hij noemde.'],
 ['Marketinguitgaven nu of gepland minder dan € 1.000 per maand', O(), 'Een kwartier bellen over het budget.'],
 ['Wat een aanvraag mag kosten komt onder € 30 uit (zie hieronder)', O(), 'Een kwartier bellen over wat een aanvraag mag kosten.'],
 ['Bedrijven + eigen regio + beslistraject langer dan een half jaar', O(), 'Een kwartier bellen over zijn markt.'],
 ['Al het andere', G(), 'Het intakegesprek zelf inplannen.'],
]) + """
<p style="margin-top:14px">Drie dingen gaan niet automatisch: de beperkte categorie (medisch, financieel), een zwak aanbod, en of er op de website gemeten kan worden. Die zien we in de quickscan, aan “wat verkoop je”, “waar loop je tegenaan” en het platform. Allemaal vóór het gesprek.</p>

<h4 style="margin-top:26px">Wat we zelf uit de antwoorden rekenen</h4>
<p>De klant geeft vier makkelijke antwoorden; wij rekenen uit wat een aanvraag alles bij elkaar maximaal mag kosten: advertenties, retainer, fundament en licenties samen. Met 30% marge en twaalf maanden terugverdientijd. Aan tafel vervangen we die door zijn echte marge en zijn eigen termijn.</p>
""" + rk([
 ('Gemiddelde opdracht', '€ 1.500'), ('Drie keer per jaar', '× 3'), ('Omzet per klant per jaar', '= € 4.500'),
 ('Standaardmarge', '× 30%'), ('Terugverdiend binnen twaalf maanden', '× 1 jaar'), ('Een op de vier aanvragen wordt klant', '× 25%'),
 ('Alles bij elkaar per aanvraag', '= € 337,50', '', 'tot'),
]) + """
<p style="margin-top:14px">Komt dit onder € 30 uit, dan is de uitkomst oranje: dan is het de vraag of er met advertenties überhaupt een aanvraag te koop is voor dat bedrag.</p>

<h3>De vier bedankpagina’s</h3>
""" + grid(2, [
 kaart('Kies een moment voor ons gesprek.', 'Het gesprek duurt een uur. Dat is genoeg, omdat we minimaal drie werkdagen vooruit plannen en eerst naar je website en je markt kijken. Zo gaat het gesprek over jouw situatie en niet over ons. Afsprakenplanner, gesprek van een uur.', 'GROEN', 'g'),
 kaart('Kies een moment voor een telefoontje.', 'Het gaat over [je budget / wat een aanvraag mag kosten / je markt]. Dat bespreken we liever in een kwartier aan de telefoon dan dat we je een uur laten reserveren voor iets wat misschien niet past.', 'ORANJE', 'o'),
 kaart('Dank je, [voornaam]. Dan plannen we nu nog niets.', 'Je gaf aan dat je [binnen drie maanden / later] wilt beginnen. Rond die tijd sturen we je één bericht om te vragen of het zover is. Tot die tijd hoor je niets van ons. Plus: houd me op de hoogte via de nieuwsbrief.', 'LATER', 'b'),
 kaart('Dank je voor je antwoorden.', '[De reden in één zin.] We zeggen dat liever nu dan na drie maanden en een factuur. Plus: houd me op de hoogte via de nieuwsbrief.', 'ROOD', 'r'),
]) + """
<p style="margin-top:14px">Wie nu nee krijgt, kan over een jaar wel passen. Daarom vragen we bij rood en bij later of iemand de nieuwsbrief wil. Het is ook het beste moment: hij kreeg net een eerlijk antwoord in plaats van een verkooppraatje.</p>

<h3>D · De reeks: vijf mails in twaalf dagen</h3>
<p>Voor wie na het leadformulier niet doorklikt. Elke mail heeft iets bruikbaars en dezelfde knop naar de vragenlijst. Na de vijfde stopt het, tenzij iemand zich voor de nieuwsbrief aanmeldde.</p>
""" + grid(2, [
 mail('DIRECT · VOOR WIE DE PAGINA SLOOT', 'De video, en de volgende stap', '<p>Hoi [voornaam],</p><p>Hier is de video nog een keer, voor als je hem later wilt terugkijken: [link].</p><p>De volgende stap is een paar korte vragen, één per scherm. Het kost zo’n vijf minuten, en daarna kies je zelf een moment voor het gesprek. Voordat we elkaar spreken, kijken we naar je website en je markt. Dus het gesprek gaat over jouw cijfers, niet over ons.</p><p><span class="knop">Plan je gesprek in</span></p>'),
 mail('DAG 2 · WAT DE QUICKSCAN IS, ZONDER HEM WEG TE GEVEN', 'Drie dingen die we vaak tegenkomen', '<p>Hoi [voornaam],</p><p>Voor elk gesprek kijken we eerst naar de website. Drie dingen komen we vaak tegen:</p><ul><li><b>Aanvragen die niet worden gemeten.</b> Het formulier werkt, maar niemand telt het. Dan weet je niet welke advertentie iets oplevert.</li><li><b>Een trage mobiele site.</b> Elke seconde laadtijd kost bezoekers die je al hebt betaald.</li><li><b>Een formulier zonder bevestiging.</b> Iemand vraagt iets aan en hoort niets tot jij belt.</li></ul><p>Benieuwd hoe dat bij jou zit?</p><p><span class="knop">Plan je gesprek in</span></p>'),
 mail('DAG 5 · DE PROPOSITIE IN DRIE ALINEA’S', 'Waarom we eerst adverteren', '<p>Hoi [voornaam],</p><p>De meeste bureaus beginnen met een plan. Wij beginnen met adverteren. Niet omdat plannen onbelangrijk is, maar omdat je na drie weken adverteren meer weet dan na drie maanden plannen: welke boodschap werkt, welke klanten reageren, wat een aanvraag kost.</p><p>De eerste aanvragen zijn duur. Dat zeggen we vooraf. Daarna worden ze goedkoper, omdat we sturen op wat we zien.</p><p>Momentum first. Mastery later.</p><p><span class="knop">Plan je gesprek in</span></p>'),
 mail('DAG 8 · HET STERKSTE VERTROUWENSSTUK', 'Wanneer we nee zeggen', '<p>Hoi [voornaam],</p><p>We zeggen vaker nee dan je zou denken. Vijf redenen:</p><ol><li>Je markt is te klein om met advertenties te bereiken.</li><li>In je branche gelden zulke strenge advertentieregels dat we niet kunnen doen waar we goed in zijn.</li><li>Het beslistraject is zo lang dat we pas na een jaar kunnen laten zien of het werkt.</li><li>Het aanbod is niet sterk genoeg. Advertenties versterken wat er is, ook als dat zwak is.</li><li>We kunnen op je website niet meten. Dan sturen we blind, en dat doen we niet.</li></ol><p>Herken je je in geen van de vijf? Dan praten we graag.</p><p><span class="knop">Plan je gesprek in</span></p>'),
 mail('DAG 12 · PRIJS ALS LAATSTE, EN EEN BELOFTE OM TE STOPPEN', 'Wat het kost', '<p>Hoi [voornaam],</p><p>Laatste mail van deze reeks. Omdat prijs vaak de reden is om te twijfelen, hier zijn onze tarieven, volledig: [link].</p><p>Het fundament is € 4.500 eenmalig. De retainer begint bij € 1.000 per maand. Daarnaast je advertentiebudget, dat rechtstreeks naar de advertentieplatformen gaat en niet naar ons.</p><p>Past dat, dan zien we je graag. Past het nu niet, dan hoor je verder niets meer van ons, tenzij je je voor de nieuwsbrief hebt aangemeld.</p><p><span class="knop">Plan je gesprek in</span></p>'),
]) + """

<h3>Na de vragenlijst: drie mails</h3>
""" + mail('GROEN · AUTOMATISCH, ZODRA DE AFSPRAAK GEBOEKT IS', 'Onze afspraak op [dag] [datum]', '<p>Hoi [voornaam],</p><p>Dank voor je antwoorden. We zien je op [dag] [datum] om [tijd], [locatie]. Het gesprek duurt een uur, en daar houden we ons aan. Voor die tijd kijken we naar je website en je markt, zodat we niet bij nul beginnen.</p><p>Wil je deze vijf dingen bij de hand hebben? Het zijn de getallen waarmee we aan tafel gaan rekenen. Schatten mag, maar zoek ze liever even op.</p><ol><li>Hoeveel extra omzet je komend jaar wilt halen</li><li>Je brutomarge, ongeveer</li><li>Hoeveel e-mailadressen er in je bestand staan</li><li>Wie je website beheert: jijzelf, een webbouwer of je hostingpartij</li><li>Wie er meebeslist over marketing, als je dat niet alleen doet. Neem die dan mee.</li></ol><p>Alvast onze tarieven, zodat je weet waar je aan toe bent: [link].</p><p>Tot [dag],<br>[naam]</p>') + grid(2, [
 mail('ROOD · DIRECT', 'Je aanvraag bij James Robinson', '<p>Hoi [voornaam],</p><p>Dank voor je antwoorden. We hebben ze goed bekeken, en we denken dat we niet de juiste partij voor je zijn.</p><p><span class="vv">[De reden in één zin]</span></p><p>We zeggen dat liever nu dan na drie maanden en een factuur. Als er iets verandert, weet je ons te vinden.</p><p>Groet,<br>[naam]</p>'),
 mail('LATER · OP HET MOMENT DAT HIJ NOEMDE', 'Is het zover?', '<p>Hoi [voornaam],</p><p>Een tijdje terug gaf je aan dat je rond deze tijd met je marketing aan de slag wilde. Is dat nog zo? Dan kun je hier direct verder.</p><p>Is het nog niet zover, dan hoef je niets te doen. Dit was het enige bericht dat we je hadden beloofd.</p><p>Groet,<br>[naam]</p><p><span class="knop">Verder met de vragen</span></p>'),
]) + """
<h4 style="margin-top:26px">De zinnen voor de rode mail</h4>
""" + tbl(['Reden', 'De zin'], [
 ['Niet meten (na de quickscan)', 'Op je website kan geen meetcode worden geplaatst. Zonder die code kunnen we niet zien wat je advertenties opleveren, en dan sturen we blind. Dat doen we niet. Wissel je ooit van website, dan praten we graag verder.'],
 ['E-commerce', 'Je klanten kopen direct online. Daar zijn anderen beter in dan wij: wij zijn gebouwd voor bedrijven waar een klant eerst iets aanvraagt. We brengen je graag in contact met een partner die webwinkels laat groeien.'],
 ['Geen website', 'Je hebt nog geen website, en die is bij ons het middelpunt waar alles naartoe leidt. Dat is eerst een websiteproject. Daar denken we graag over mee, maar dan als los project en niet als retainer.'],
 ['Na het kwartier: markt', 'Je markt is zo klein en specifiek, en het beslistraject zo lang, dat advertenties vooral mensen bereiken die nooit klant worden. Daar werkt persoonlijk contact beter dan welk kanaal met bereik ook.'],
 ['Na het kwartier: wat een aanvraag mag kosten', 'Wat een nieuwe klant je oplevert, laat te weinig ruimte om een aanvraag via advertenties te kopen. Dan betaal je meer voor een klant dan hij je oplevert. Je netwerk en verwijzingen zijn dan betere kanalen.'],
 ['Na het kwartier: budget', 'Met het budget dat er nu is, kunnen we niet waarmaken wat we beloven. Verandert dat, dan horen we graag van je.'],
]) + """
<p style="margin-top:12px">De laatste drie gebruik je alleen na het kwartier, nooit op basis van het formulier alleen. Oranje heeft geen eigen mail nodig: de bevestiging van de afsprakenplanner is genoeg.</p>

<h3>Bij oranje: het kwartier</h3>
<p>Eén telefoontje over het punt dat oranje staat. Geen verkoopgesprek maar een check: past het, dan plannen we het intakegesprek; past het nog niet, dan spreken we een moment af; past het niet, dan zeggen we dat.</p>
""" + feit([('WIE', 'Dezelfde vaste medewerker die de quickscans doet. Niet Jim Coumans of Jim Kikken'), ('HOE LANG', 'Vijftien minuten bellen; een half uur in de planning'), ('VOORBEREIDING', 'Antwoorden lezen, rekensom narekenen, in Keyword Planner zoekvolume en klikprijs van twee zoektermen in zijn gebied'), ('MEER PUNTEN ORANJE', 'Nog steeds één telefoontje. Begin met het budget')]) + tl([
 ('0 – 2 min', 'De opening', '“Eén punt wilden we eerst even met je afstemmen, voordat je een uur voor ons vrijmaakt: [het punt]. Als dat past, plannen we het gesprek meteen in.” Zeg het punt meteen; wie eromheen draait, maakt er een verkoopgesprek van.'),
 ('2 – 10 min', 'Het punt', 'Stel de vragen hieronder, reken hardop mee met zijn eigen getallen, en laat hem de conclusie zelf trekken.'),
 ('10 – 13 min', 'De uitkomst uitspreken', 'Groen, later of rood, in het gesprek zelf. Nooit “we komen erop terug”. Rood: “Eerlijk gezegd denk ik dat wij je hier niet mee helpen, en ik zeg liever nu waarom dan na drie maanden.”'),
 ('13 – 15 min', 'Afronden en vastleggen', 'Direct op de klantkaart: uitkomst, reden, aangepaste getallen. Groen: intakegesprek ingepland. Later: datum in MailerLite. Rood: de rode mail met de reden.'),
]) + grid(3, [
 kaart('Het budget', '<p>Hij geeft minder dan € 1.000 per maand uit, of wil dat gaan doen. Ons kleinste pakket kost met advertenties ongeveer € 2.000 per maand, plus € 4.500 eenmalig.</p><ul><li>Is wat je uitgeeft wat je wílt uitgeven, of wat er toevallig uitgaat?</li><li>Reken hardop: zoveel extra klanten × de klantwaarde, tegenover ongeveer € 24.000 per jaar plus € 4.500.</li><li>Is daar ruimte voor? Zo niet nu, wanneer wel?</li></ul><p style="margin-top:8px">Groen: ruimte, nu of binnen drie maanden. Later: ruimte komt pas later. Rood: geen ruimte, geen uitzicht. Nooit een kleiner pakket bedenken.</p>', 'ORANJE 1', 'o'),
 kaart('Wat een aanvraag mag kosten', '<p>De som kwam onder € 30 uit. Vaak door een verkeerd getal: de prijs van één product in plaats van een bestelling, of “eenmalig” terwijl klanten terugkomen.</p><ul><li>Controleer waarde, frequentie en duur, en reken opnieuw.</li><li>Leg de klikprijs ernaast: bij € 3 per klik en € 25 per aanvraag moet 1 op de 8 bezoekers aanvragen. Vraag of hij dat realistisch vindt.</li></ul><p style="margin-top:8px">Groen: na correctie boven € 30 en hooguit 1 op de 10 hoeft aan te vragen. Rood: meer dan 1 op de 10 nodig.</p>', 'ORANJE 2', 'o'),
 kaart('De markt', '<p>Hij verkoopt aan bedrijven in zijn regio, en beslissen duurt langer dan een half jaar.</p><ul><li>Hoeveel bedrijven in je regio kunnen klant worden: tientallen, honderden, duizenden?</li><li>Zoeken ze actief, of komen klanten via je netwerk? Leg het zoekvolume ernaast.</li><li>Wat gebeurt er in dat halfjaar? Hoeveel klanten heb je per jaar nodig?</li></ul><p style="margin-top:8px">Groen: honderden, en er wordt gezocht. Later: markt is er, geen tijd om te wachten. Rood: tientallen, nauwelijks zoekvolume.</p>', 'ORANJE 3', 'o'),
]) + """
<p style="margin-top:16px"><b>Wat het kwartier niet is:</b> een verkort intakegesprek. Begint hij over de quickscan of de retainers: “Goede vraag, die bewaren we voor het gesprek.” En niet overhalen: een oranje punt dat met praten groen wordt, komt in maand drie terug. <b>Neemt hij niet op:</b> één mail met de vraag een nieuw moment te kiezen; na een week wordt het later. <b>Wil hij direct het gesprek:</b> eerst het punt, en is het groen, dan plan je het in hetzelfde telefoontje in. <b>Komt iemand via netwerk of telefoon:</b> dan slaat hij A en B over. Stuur de link naar de vragenlijst, of loop hem in vijf minuten samen door.</p>

<h3>Wat onzichtbaar meegaat</h3>
<p>Bij elke lead slaan we op waar hij vandaan kwam, zoals we dat onze klanten in hun marketingdashboard beloven: bron, medium en campagne; de zoekterm als het platform hem doorgeeft; de click id van het advertentieplatform; de pagina van het leadformulier; datum en tijd van leadformulier en vragenlijst (het verschil zegt hoe lang iemand twijfelde); en het contactnummer uit MailerLite, waarmee A, B en C bij dezelfde persoon horen.</p>
""" + let('<p><b>Eén harde regel.</b> In de link van stap naar stap gaat alleen het contactnummer mee. Nooit naam, e-mailadres, telefoonnummer of IP-adres: links belanden in statistieken, serverlogs, browsergeschiedenis en bij derde partijen. King Kong doet dit wel. Wij niet.</p>') + """
<h3>Wat we van King Kong leren, en wat niet</h3>
""" + grid(3, [
 kaart('Overnemen', ul(['Eén vraag per scherm', 'De naam gebruiken: “Dit ziet er goed uit, [voornaam].”', 'Bij elke vraag over geld zeggen waarom', '“Wanneer wil je beginnen?”', 'Schuifjes voor aantallen', 'Telefoon en bedrijfsnaam pas na de kwalificatie', 'De bron van elke lead opslaan'], ''), '7', 'g'),
 kaart('Aanpassen', ul(['Budget: wij noemen ons minimum erbij', 'Grootste obstakel: vijf antwoorden, elk een plek in de keten', 'Niet “product of dienst” maar “hoe word je klant”', 'Geen huidige omzet; klantwaarde in vier vragen', '“Waar ken je ons van” aan tafel, niet in het formulier', 'Naam en e-mail niet twee keer vragen', 'Dezelfde korte tussenzinnen, zonder uitroeptekens'], ''), '7', 'o'),
 kaart('Niet overnemen', ul(['De motivatieschaal van 1 tot 10: iedereen vult een acht in', 'De toezegging om te komen', 'Een “waarde” die niemand kan controleren', 'Persoonsgegevens in de link', 'Twee dingen verkopen (bureau en cursus)'], ''), '5', 'r'),
]) + raakt(ul([
 '<b>De video is alles.</b> Hij staat tussen iedereen en de vragenlijst. Een slechte video is erger dan geen video. Opnemen, laten bekijken door drie mensen van buiten, opnieuw opnemen.',
 '<b>Regels maken fouten.</b> Een onterechte groene kost een quickscan en een gesprek; een onterechte rode kost een klant. Daarom de eerste drie maanden wekelijks nakijken en bijstellen.',
 '<b>Vijftien vragen is veel.</b> King Kong heeft er zeventien. Elke nieuwe vraag moet zijn plek verdienen. Meet per scherm hoeveel mensen afhaken; verliest één scherm opvallend veel, dan ligt het aan die vraag.',
 '<b>Zuid-Limburg is klein.</b> We mailen mensen die we volgende week op een verjaardag tegenkomen. Vijf mails, elk met iets bruikbaars, en dan stoppen, zoals de laatste mail belooft.',
 '<b>De antwoorden voeden alles erna:</b> de quickscan (website, gebied, zoektermen), de opening van het intakegesprek (waar loop je tegenaan) en de rekensom in het voorstel (klantwaarde, conversie).',
], '')) + """
<h3>Wat we nodig hebben om het te bouwen</h3>
""" + tbl(['Middel', 'Waarvoor', 'Stand'], [
 ['MailerLite', 'De reeks, de nieuwsbrief, het geplande bericht voor later', G('HEBBEN WE')],
 ['De afsprakenplanner', 'Twee agenda’s: een uur en een kwartier', G('HEBBEN WE')],
 ['De website', 'Het leadformulier en de landingspagina, op onze eigen WordPress', G('HEBBEN WE')],
 ['Een formuliertool', 'Eén vraag per scherm, voorwaardelijke logica, verborgen velden, per uitkomst een andere pagina, per scherm zien waar mensen afhaken', R('NOG NIET')],
 ['De video', 'Drie minuten, door Jim Coumans', R('NOG NIET')],
 ['Het portaal', 'Elke vragenlijst maakt automatisch een klantkaart aan, met antwoorden, uitkomst en obstakel', R('NOG NIET')],
]) + open_(ul([
 'Een formuliertool kiezen.',
 'De video opnemen.',
 'De twee oranje drempels (marketinguitgaven onder € 1.000, maximaal per aanvraag onder € 30) en de grens van 1 op de 10 bezoekers toetsen aan onze eigen accounts. Er bestaat geen onderzoek dat zegt welk deel van de bezoekers aanvraagt.',
 'Toestemming laten nakijken door iemand die de regels kent: in Nederland mag je iemand niet zomaar marketingmail sturen omdat hij een video wilde zien.',
], '')) + stap_eind()

# ---------------------------------------------------------------- STAP 02
QS = [
 ('grp', 'TECHNIEK · KAN HIJ METEN, EN IS DE SITE IN ORDE'),
 ['1 · Snelheid op mobiel', 'PageSpeed Insights, drie keer, middelste telt', 'LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1', 'Niets slecht, minstens één ertussen', 'LCP > 4 s, INP > 500 ms of CLS > 0,25', 'Webmix: snelheid € 750'],
 ['2 · Beveiliging', 'SSL Labs, met en zonder www', 'A+, A of A−; http stuurt door naar https', 'B of C', 'D–F, T of M, verlopen, niet volledig https', 'Via de hosting'],
 ['3 · Redirects en dode links', 'Screaming Frog (gratis tot 500 pagina’s)', 'Geen dode interne links; omleiding hooguit één stap', '1–3 dode links buiten het kernpad, of ketens van 2–4', 'Meer, een dode link in menu of dienstpagina, keten ≥ 5 of een lus', 'Webmix: redirects € 500'],
 ['4 · E-mailauthenticatie', 'internet.nl en MXToolbox', 'SPF (~all/-all), DMARC op quarantine of reject, DKIM aantoonbaar', 'SPF + DMARC op none, of DKIM niet vast te stellen', 'Geen SPF én geen DKIM, SPF +all of ?all, of geen DMARC', 'Webmix: e-mail € 250'],
 ['5 · Hosting', 'Tijd tot de eerste byte', '≤ 0,8 s: niets doen', '0,8–1,8 s: blijven, met kanttekening', '> 1,8 s: verhuizen adviseren', 'Webmix: hosting € 85 p/m'],
 ['6 · Meting', 'Tag Assistant, netwerkverkeer', 'Eén GA4-code, één paginaweergave per pagina', 'Dubbel geladen, of op een pagina afwezig', 'Geen GA4, of alleen Universal Analytics', 'Fundament'],
 ['7 · Toestemming', 'De browser, zonder iets te klikken', 'Geen marketingtracking vóór toestemming of na weigeren; weigeren even makkelijk', 'Analytics vóór toestemming, niet vast te stellen of dat mag', 'Tracking vóór toestemming of na weigeren; weigeren niet op de eerste laag', 'Webmix: Cookiescript € 150 p/j'],
 ['8 · Platform', 'Wappalyzer of de broncode', 'Er kan een meetcode in', 'Alleen met duurder abonnement of via de beheerder', 'Er kan geen code in: <b>de stopknop</b>', 'Afspraak gaat niet door'],
 ['9 · Vindbaarheid', 'Google site:, robots.txt', 'Homepage en dienstpagina’s gevonden, niets geblokkeerd', 'Een dienstpagina niet gevonden, zonder blokkade', 'Homepage niet gevonden, noindex, of robots.txt blokkeert', 'Fundament'],
 ('grp', 'HET AANVRAAGPAD · WORDT EEN BEZOEKER EEN AANVRAAG'),
 ['10 · Aanvragen op mobiel', 'Eigen telefoon, 390 pixels breed', 'In het eerste scherm, binnen twee tikken, knop ≥ 44 px', 'Pas na scrollen, tikvlak 24–44 px, 6–8 verplichte velden', 'Binnen drie tikken niets, tikvlak < 24 px, formulier werkt niet', 'Fundament: landingspagina'],
 ['11 · Bedankpagina', 'De crawl en de tagconfiguratie. Nooit zelf een aanvraag doen', 'Eigen bedankpagina of specifiek conversie-event', 'Alleen een melding op dezelfde pagina', 'Geen meetcode, of het formulier geeft een fout', 'Fundament'],
 ['12 · Wat verkoop je, meteen', 'Screenshot eerste scherm; twee mensen los van elkaar', 'Wat, aan wie en waar: alle drie', 'Twee van de drie, of alleen uit een slogan', 'Hooguit één', 'Fundament: propositie'],
 ('grp', 'DE MARKT · WAT ZIET ZIJN KOPER'),
 ['13 · Adverteert hij al?', 'Ads Transparency Center, Meta Ad Library', 'Ter informatie', '', '', 'Bestaande accounts nemen we over'],
 ['14 · Wie adverteert op zijn zoekwoorden?', 'Google Ads-voorbeeld, zijn gebied, mobiel', 'Ter informatie', '', '', 'Bepaalt de klikprijs, dus de rekensom'],
 ['15 · Wat ziet wie hem zoekt?', 'Zoeken op bedrijfsnaam', 'Geen concurrent op zijn naam', 'Wel, maar hij staat zelf bovenaan', 'Wel, en hij adverteert zelf niet op zijn naam', 'Fundament: merkcampagne'],
 ['16 · Bedrijfsprofiel en reviews', 'Google Maps op een telefoon', '≥ 4,5, ≥ 20 reviews, nieuwste ≤ 30 dagen, ≥ 80% beantwoord', '4,0–4,4, of 5–19 reviews, of nieuwste 31–90 dagen', '< 4,0, < 5 reviews, nieuwste > 90 dagen, of geen reacties', 'De klant zelf'],
 ('grp', 'MET AI, DE HELE SITE · ZODRA HET PORTAAL HET KAN'),
 ['17 · Spelling en grammatica', 'Crawler, spellingcontrole, Claude', 'Geen zware fouten, < 0,3 per 1.000 woorden', '0,3–1,0 per 1.000 woorden', 'Een zware fout, of ≥ 1,0 per 1.000', 'Werklijst'],
 ['18 · Titels en beschrijvingen', 'Crawler', '≥ 95% titels, ≥ 90% beschrijvingen, uniek', 'Titels 80–94%, beschrijvingen 60–89%', 'Lager, of homepage zonder titel', 'Werklijst, later SEO'],
 ['19 · Koppen en alt-teksten', 'Crawler', '≥ 95% met H1, geen informatieve afbeelding zonder alt', 'H1 80–94%, 1–10% zonder alt', 'H1 < 80%, > 10% zonder alt', 'Werklijst'],
 ['20 · Interne links', 'Sitemap naast crawl', 'Geen wezen; dienst- en contactpagina’s gelinkt', 'Hooguit 10% wezen, geen dienstpagina', '> 10%, of een dienstpagina is een wees', 'Werklijst'],
 ['21 · Snelheid per soort pagina', 'PageSpeed-koppeling', 'Als punt 1, per soort de slechtste', '', '', 'Onderbouwt punt 1'],
 ['22 · Codes vóór toestemming', 'Geautomatiseerde browser', 'Als punt 7, op meer pagina’s', '', '', 'Onderbouwt punt 7'],
 ['23 · Aanvragen op elke dienstpagina', 'Claude', 'Elke dienstpagina een werkende aanvraagmogelijkheid', '75–99%, of alleen in menu of footer', '< 75%, nergens, of een kapotte link', 'Werklijst'],
 ['24 · De concurrententest', 'Claude, altijd gelabeld als oordeel', 'Twee of meer onderscheidende beweringen boven de vouw', 'Eén op de homepage', 'Geen: de tekst klopt ook met de naam van een concurrent', 'Fundament: propositie'],
]

STAP02 = stap_kop('02', 'f1', 'FASE 1 · VERKOPEN', 'De quickscan',
 'Een half uur kijken naar de website en de markt, van buitenaf, vóór het intakegesprek. We hebben nog geen toegang, dus we zien wat iedereen kan zien. Er komen drie dingen uit: drie bevindingen met een gevolg in geld, een scanrapport van één A4, en een actielijst voor na het tekenen.',
 [('WANNEER', 'Zodra de afspraak geboekt is; uiterlijk één werkdag vóór het intakegesprek klaar en vrijgegeven'), ('WIE', 'Een vaste medewerker. Niet de eigenaren: vaste gereedschappen en normen, dus iedereen kan het'), ('HOE LANG', 'Een half uur; de eerste tien keer een uur. Met AI: tien minuten nakijken'), ('KLAAR ALS', 'De scan is compleet, het advies vrijgegeven, en de stopknop staat niet op rood')],
 'stap-02') + klant('Niets, tot het intakegesprek. Daar hoort hij iets over zijn eigen bedrijf wat hij nog niet wist, uitgedrukt in zijn eigen getallen. Het scanrapport krijgt hij dezelfde dag mee, ook als hij niet met ons verdergaat.') + """
<h3>De 24 punten en hun normen</h3>
<p>Eén standaard, zodat twee medewerkers bij dezelfde site dezelfde kleur geven. Nu doen we punt 1 tot en met 16 met de hand: veertien met een kleur, twee ter informatie. Punt 17 tot en met 24 komen erbij zodra het portaal ze met AI kan doen. Wat tussen groen en rood valt, is oranje. Bestaat een punt uit meer metingen, dan telt de slechtste. Er is geen totaalcijfer: het advies kiest drie punten.</p>
""" + tbl(['Punt', 'Waarmee', G(), O(), R(), 'Wie lost het op'], QS) + """
<p style="margin-top:14px"><b>Waar een grens op rust.</b> Een deel van de normen is officieel (Google, W3C, de wet), een deel komt uit onderzoek of grote branchestudies, en een deel is onze eigen grens omdat er geen bron is: punt 3, 4, 6, 9 tot en met 12, 15 en 17 tot en met 20 deels, en 23 en 24 helemaal. Die eigen grenzen stellen we bij na de eerste twintig tot dertig scans. De andere niet: die komen van buiten.</p>
""" + let('<p><b>De stopknop.</b> Kan er geen meetcode in de site (punt 8), of mag er in zijn branche nauwelijks geadverteerd worden, dan gaat de afspraak niet door. Afzeggen met de rode mail “niet meten”, uiterlijk een werkdag van tevoren. Zonder meting sturen we blind, en dan beginnen we niet.</p>', 'DE STOPKNOP') + """
<h3>Van invullen naar advies</h3>
<p>Alles over een klant staat op de klantkaart in het portaal. Die ontstaat automatisch uit de vragenlijst, of met de hand als iemand via netwerk of telefoon komt; dan vul je de vragenlijst samen met hem in, want zonder die getallen kan het advies niets in geld uitdrukken. Eerst alles invullen, dan pas het advies: een advies op een halve scan kiest de verkeerde drie.</p>
""" + jk([
 ('Invullen', 'Per punt: wat we zagen (de meting, bijvoorbeeld “6,1 seconden”), de kleur (het portaal kiest die waar de norm een getal is) en een notitie. “Wie lost het op” ligt per punt vast.'),
 ('Compleet', 'Alle veertien kleurpunten hebben een kleur, de twee informatieve punten zijn ingevuld. “Niet van toepassing” mag, met een reden. Staat de stopknop op rood, dan komt er geen advies maar staat de afzegmail klaar.'),
 ('Advies door AI', 'Claude krijgt de vragenlijst en de uitkomsten en maakt een concept: drie bevindingen met hun gevolg, het A4, en de actielijst.'),
 ('Vrijgeven', 'Een mens leest het na, past aan en geeft vrij. Het portaal legt vast wie en wanneer. Pas dan kan het A4 naar de klant.'),
]) + vlak('grijs', 'WAT DE AI WEL EN NIET MAG', ul(['Geen kleur of meting veranderen: die komen uit de invoer. De AI kiest en schrijft.', 'Elke zin verwijst naar een punt of een antwoord. Wat nergens op terug te voeren is, staat er niet.', 'Het gevolg alleen in de getallen van de klant, nooit met een branchecijfer.', 'Over de scan, niet over het pakket: dat volgt pas in het voorstel.', 'AI-oordelen zijn niet elke keer gelijk. Daarom: vaste model- en promptversie, per bewering een letterlijk citaat, drie keer draaien, bij twee van drie twijfel, en altijd gelabeld als AI-oordeel.'], '')) + """
<h3>Van bevinding naar geld</h3>
<p>Een bevinding zonder gevolg is een constatering. Het gevolg rekenen we uit met de getallen uit de vragenlijst, nooit met een branchecijfer dat we niet kunnen onderbouwen. Eén aanvechtbaar cijfer maakt het hele rapport aanvechtbaar.</p>
""" + grid(3, [
 kaart('Geen bedankpagina', '“Je krijgt ongeveer twintig aanvragen per maand, maar geen enkele is aan een bron te koppelen. Adverteer je straks € 1.500 per maand, dan weet je van al dat geld niet wat het opleverde, en kan Google niet leren welke klik een klant werd.”'),
 kaart('Een concurrent op zijn naam', '“Wie jou googelt, ziet eerst [concurrent]. Dat zijn mensen die al voor jou kwamen.”'),
 kaart('Een trage mobiele site', '“Je belangrijkste pagina doet er zes seconden over, Google vindt 2,5 goed. Google rekent de pagina mee in wat je per klik betaalt, dus je betaalt meer voor dezelfde bezoeker.”'),
]) + """
<p style="margin-top:16px"><b>Welke drie het worden.</b> Het raakt wat de klant bij “waar loop je tegenaan” invulde, of zijn doel. Het gevolg is uit te drukken in zijn eigen getallen. En het grootste probleem gaat altijd mee, ook als wij het niet oplossen: slechte reviews zijn niet ons werk, maar als dat is wat hem klanten kost, zeggen we het.</p>

<h3>Wat eruit komt, en waar het heen gaat</h3>
""" + tbl(['Voor', 'Wat', 'Waar het heen gaat'], [
 ['De klant', 'Drie bevindingen met hun gevolg', 'Het intakegesprek, blok “Wat wij zagen”'],
 ['De klant', 'Het scanrapport: veertien punten met een kleur, de drie bevindingen, per rood punt de post en het bedrag', 'Mee met de mail van dezelfde dag, ook als hij niet verdergaat'],
 ['Ons', 'De actielijst: alle oranje en rode punten, gegroepeerd op wie het oplost', 'Staat vanzelf op de klantkaart zodra de scan compleet is'],
]) + tbl(['Wie lost het op', 'Punten', 'Wat er met de actie gebeurt', 'Wanneer'], [
 [chip('b', 'FUNDAMENT'), '6, 8 tot en met 15', 'Geen nieuwe taak: het werk zit al in de 76 taken. De bevinding gaat als notitie bij die taak.', 'Na het tekenen'],
 [chip('o', 'WEBMIX'), '1 tot en met 5, en 7', 'De post uit de tarieven, met bedrag, op het A4. Na het tekenen beslist de klant per post: nu, later of niet.', 'Bedrag vóór het tekenen, uitvoering erna'],
 [chip('r', 'KLANT ZELF'), '16', 'Op het blad “jouw kant” in het voorstel, met een termijn. Wij lossen het niet op, maar we zeggen het.', 'Voorstelgesprek'],
 [chip('n', 'WERKLIJST'), '17 tot en met 24', 'Naar de backlog van de retainer. Niet op het A4.', 'Vanaf maand 4'],
]) + """
<h4 style="margin-top:24px">Voorbeeld: een installatiebedrijf met twintig aanvragen per maand</h4>
""" + tbl(['Punt', 'Kleur', 'Wat we zagen', 'Actie'], [
 ('grp', 'WEBMIX · OP HET A4 MET BEDRAG'),
 ['1 · Snelheid op mobiel', R(), '6,1 seconden op de dienstpagina', 'Post snelheid, € 750. Klant beslist na het tekenen.'],
 ['4 · E-mailauthenticatie', O(), 'SPF staat, DMARC ontbreekt', 'Post e-mailauthenticatie, € 250.'],
 ('grp', 'FUNDAMENT · NOTITIE BIJ DE BESTAANDE TAAK'),
 ['11 · Bedankpagina', R(), 'Alleen een melding op dezelfde pagina', 'Bij “formulier en bedankpagina”: eerst dit, anders telt er niets.'],
 ['15 · Wat ziet wie hem zoekt', O(), 'Een concurrent adverteert op zijn naam', 'Bij “campagnestructuur”: merkcampagne vanaf dag één.'],
 ('grp', 'KLANT ZELF · OP HET BLAD “JOUW KANT”'),
 ['16 · Reviews', R(), '7 reviews, gemiddeld 3,8, geen reacties', 'Na elke opdracht om een review vragen en op elke review reageren. Termijn: drie maanden.'],
]) + """
<p style="margin-top:12px">De drie voor aan tafel: 11, 15 en 16. Niet 1, al is die rood: snelheid raakt hem minder dan dat hij niet kan zien welke aanvraag waar vandaan komt.</p>

<h3>Van hand naar AI</h3>
""" + grid(3, [
 kaart('Met de hand', 'Punt 1 tot en met 16, met een sjabloon voor het A4. Bij de eerste tien scans houden we bij hoe lang het duurt en welke bevindingen aan tafel echt landen.', 'FASE 1 · NU · EEN UUR, DAARNA EEN HALF UUR', 'b'),
 kaart('Meten gaat vanzelf', 'Alles wat een gereedschap meet, draait zodra de afspraak geboekt is. De medewerker doet het aanvraagpad, de markt, en kiest de drie.', 'FASE 2 · EEN KWARTIER', 'l'),
 kaart('AI in het portaal', 'De hele site, punt 17 tot en met 24. Claude schrijft een concept; een mens kijkt na, kiest de drie en tekent af.', 'FASE 3 · TIEN MINUTEN NAKIJKEN', 'g'),
]) + """
<p style="margin-top:14px">Wat met AI niet verandert: de klant krijgt nog steeds drie bevindingen en één A4. Een AI vindt er veertig. Die zijn voor ons, als werklijst. Een rapport van veertig punten voelt als een verkooppraatje voor meer werk, en verstopt het ene punt dat ertoe doet.</p>
""" + raakt(ul([
 '<b>De herstelposten staan vast vóór het tekenen.</b> Omdat we alles meten wat van buitenaf te meten is, weet de klant bij het voorstel al wat Webmix kost. Die bedragen gaan van zijn marketingruimte af in de rekensom (stap 04), dus een rode site kan betekenen dat er minder overblijft voor advertenties.',
 '<b>Van buitenaf zie je niet alles.</b> Back-ups, updates en of de conversies goed staan, blijken pas uit de audit in het fundament, met de toegangen. Zet dat op het A4, anders lijkt groen een garantie. Wat we dan nog vinden, bieden we los aan (spelregel 6).',
 '<b>Doe zelf nooit een aanvraag op zijn site.</b> Dat vervuilt zijn cijfers en voelt als een truc als het uitkomt.',
 '<b>Wijkt de scan af van de vragenlijst</b>, bijvoorbeeld hij schreef dat hij op Google adverteert en er is niets te vinden, dan is dat een vraag aan tafel, geen betrapping.',
], '')) + open_(ul([
 'Het portaal: klantkaart, invoer van de quickscan en het advies.',
 'Het sjabloon voor het A4.',
 'De gereedschappen inrichten voor fase 2, en de AI-instructie voor het advies.',
 'Normen met een eigen grens bijstellen na twintig tot dertig scans.',
], '')) + stap_eind()

P2A = DEEL2_OPEN + STAP01 + STAP02
