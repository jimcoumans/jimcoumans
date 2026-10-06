# -*- coding: utf-8 -*-
# De volledige editie in magazinevorm: The Performance Issue, editie 01.
import re, os, sys
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import blokken_v2 as v2
import bouw_magazine as v3
import bouw_proefkatern as pk
from grafieken import lijnen, staven, BLAUW, ORANJE, GRIJS

pg, VV, BEELD = v2.pg, v2.VV, v2.BEELD
rubriek, fotoband = pk.rubriek, pk.fotoband
TITEL = 'James Robinson · The Performance Issue'

def opener(sectie, onderwerp, kop, intro, beeld, naam='Tekst James Robinson', grootte=66):
    return pg('over-beeld', BEELD(beeld, 'position:absolute;inset:0;align-items:flex-start;padding:20mm 21mm') + '<div class="verloop"></div>' +
              rubriek(sectie, onderwerp) + '''<div class="tekstblok"><div class="kop-artikel" style="font-size:%dpt">%s</div>
<div class="intro-artikel" style="max-width:150mm">%s</div><div class="naamregel">%s</div></div>''' % (grootte, kop, intro, naam))

# ================================================================ herken je dit?
HERKEN_1 = pg('blauw', rubriek('Thema', 'Waarom ondernemers aankloppen') + '''
<div style="position:absolute;left:21mm;right:23mm;top:70mm">
  <div class="kop-artikel" style="font-size:80pt;color:#fff">Herken je dit?</div>
  <div class="intro-artikel" style="max-width:150mm;color:rgba(255,255,255,.88)">Niemand belt een marketingbureau omdat het zo leuk is. Er is altijd een aanleiding. Een agenda die te leeg is, een website die niets oplevert, een concurrent die ineens overal opduikt. Dit zijn de vragen die we het vaakst horen aan tafel. En wat we er dan mee doen.</div>
</div>''')

SITUATIES = [
    ('Mijn agenda is te leeg. Of juist te vol met het verkeerde werk.', 'Pieken en dalen, en te weinig van het werk waar je het meest aan verdient.', 'We richten campagnes op de diensten met de beste marge, op het moment dat je ze nodig hebt.'),
    ('Ik draai op mond-tot-mond. Dat gaat goed, tot het stopt.', 'Je netwerk is goud waard, maar je hebt het niet in de hand.', 'We bouwen een tweede bron van aanvragen, naast je netwerk. Voorspelbaar en bij te sturen.'),
    ('Ik heb een mooie website. Alleen levert hij niets op.', 'Bezoekers komen, kijken rond en vertrekken weer.', 'We meten waar ze afhaken, en bouwen pagina’s die aanzetten tot een aanvraag.'),
    ('Ik post elke week, maar ik merk er niets van.', 'Veel moeite voor een handvol likes, vooral van mensen die je al kent.', 'We adverteren bij de mensen die je nog niet kent. Lees meer op pagina {p:krant}.'),
    ('We hadden een bureau, maar ik weet nog steeds niet wat het opleverde.', 'Rapporten vol vakjargon, en geen antwoord op de vraag die ertoe doet.', 'Je ziet alles realtime in je eigen portaal. En we sturen op één vraag: wat kost een klant je?'),
    ('Ik wil groeien, maar ik heb geen tijd voor marketing.', 'Je doet al zoveel zelf. Marketing schuift steeds naar morgen.', 'Wij doen het werk. Jij houdt de regie, met een vast ritme en één aanspreekpunt.'),
    ('Mijn concurrent staat overal. Hoe doet hij dat?', 'Op Google, op Instagram, in je eigen tijdlijn. En jij nergens.', 'In onze quickscan zien we waar je concurrenten adverteren, en waar ruimte voor jou ligt.'),
    ('Ik heb geen idee wat een nieuwe klant me mag kosten.', 'Dus voelt elke euro aan marketing als een gok.', 'We rekenen het samen uit, vanaf je omzetdoel. Dan weet je waar je op stuurt.'),
    ('Er komen wel aanvragen binnen. Alleen niet de goede.', 'Prijsvragers, mensen van buiten je regio, of vragen naar werk dat je niet doet.', 'We sturen op kwaliteit: per aanvraag geef je aan of hij goed was, en daar passen we de doelgroep op aan.'),
    ('Ik heb het zelf geprobeerd met Google Ads. Het kostte vooral geld.', 'Kliks genoeg, maar weinig aanvragen.', 'We brengen structuur en meting aan, en sturen op aanvragen in plaats van kliks.'),
    ('Ik heb een nieuwe dienst, of ik wil een nieuwe regio in.', 'Is er vraag naar? Dat wil je weten voordat je groot investeert.', 'Met een gerichte campagne zie je binnen weken of de markt reageert.'),
    ('Mijn merk ziet er overal anders uit.', 'Elke advertentie, elke post, elk drukwerk een beetje anders.', 'We leggen je merk één keer vast. Daarna klopt alles wat we maken, tot de kleinste advertentie.'),
]
def situatie(q, herk, doen):
    return '<div class="kort-item"><h3 style="font-size:11.5pt">“%s”</h3><p>%s</p><p style="margin-top:2mm;font-family:var(--ft);font-size:8.2pt;color:var(--deep)"><b>Wat we doen.</b> %s</p></div>' % (q, herk, doen)
HERKEN_2 = pg('', rubriek('Thema', 'Herken je dit?') + '<div class="kort" style="margin-top:14mm;gap:7mm 6mm">' + ''.join(situatie(*s) for s in SITUATIES[:6]) + '</div>')
HERKEN_3 = pg('', rubriek('Thema', 'Herken je dit?') + '<div class="kort" style="margin-top:14mm;gap:7mm 6mm">' + ''.join(situatie(*s) for s in SITUATIES[6:]) + '</div>')
HERKEN_4 = pg('', rubriek('Thema', 'Herken je dit?') + '''
<div class="kicker" style="margin-top:12mm">Eerlijk is eerlijk</div>
<h2 style="font-size:30pt">Wanneer we niet de juiste partij zijn.</h2>
<div class="tekst k2" style="margin-top:4mm">
  <p class="na-kop">We zijn goed in één ding: zorgen dat er voorspelbaar nieuwe aanvragen binnenkomen, en dat die steeds minder kosten. Daar hoort ook bij dat we eerlijk zeggen wanneer we niet de beste keuze zijn. Dat scheelt jou tijd en geld, en ons een samenwerking die niemand blij maakt.</p>
  <p>Zoek je iemand die vooral je social media bijhoudt, dan zijn er bureaus die dat met liefde doen. Wil je één losse campagne voor een evenement, of draait je bedrijf om een webshop, dan past onze aanpak minder goed. Hetzelfde geldt voor het werven van personeel: daar zijn specialisten voor, en we brengen je graag met ze in contact.</p>
  <p>En soms is het moment niet goed. Als je nu al geen extra klanten aankunt, heeft het weinig zin om er meer binnen te halen. Dan kijken we liever eerst samen waar de groei vastloopt.</p>
</div>
<div class="kaderblok blauw-k" style="margin-top:6mm">
  <div class="kl">Twijfel je?</div><h3>Vul de vragenlijst in. We zeggen het eerlijk.</h3>
  <p style="font-size:8.8pt;margin:0">Op basis van je antwoorden en onze quickscan hoor je of we denken dat we iets voor je kunnen betekenen. Is het antwoord nee, dan zeggen we dat, en waarom.</p>
</div>
''' + fotoband('een ondernemer en iemand van ons team aan tafel, in gesprek', 74, '<b>Aan tafel.</b> Eerst luisteren, dan pas een advies.', 'l'))

# ================================================================ wie we zijn
WIE_L = pg('', rubriek('Portret', 'James Robinson') + '''
<div class="kop-artikel" style="font-size:44pt;margin-top:12mm">Een performancebureau uit Hulsberg</div>
<div class="intro-artikel">Sinds 2018 helpen we ondernemers in Zuid-Limburg aan nieuwe klanten. Met een klein, scherp team, een eigen manier van werken en één maatstaf: wat het jou oplevert.</div>
<div class="tekst k2" style="margin-top:6mm">
  <p class="begin">James Robinson werd bedacht in 2017 en een jaar later opgericht in Hulsberg. Inmiddels werken er zo’n tien specialisten: in adverteren, data, content, websites en strategie. Zeven van hen begonnen hier als stagiair. We leiden mensen graag zelf op, in onze eigen manier van werken.</p>
  <p>Die manier van werken is simpel uit te leggen. We zien marketing als één systeem. Adverteren brengt de juiste mensen naar je toe, content zorgt dat ze blijven kijken, je website zet ze om in een aanvraag. Daaromheen bouwen we de onderdelen die elke volgende klant goedkoper maken: betere pagina’s, e-mail en vindbaarheid in Google.</p>
  <p>Alles wat we doen, meten we. Niet om er mooie rapporten van te maken, maar om te weten wat werkt en wat niet. Je ziet dezelfde cijfers als wij, op elk moment van de dag. En je merk is daarbij heilig: alles wat we maken, ziet eruit en klinkt als jij.</p>
</div>
<div style="position:absolute;left:21mm;right:23mm;bottom:26mm;display:grid;grid-template-columns:repeat(4,1fr);gap:5mm">
  <div class="cijfer"><div class="n" style="font-size:32pt">2018</div><div class="t">Opgericht in Hulsberg</div></div>
  <div class="cijfer"><div class="n" style="font-size:32pt">±10</div><div class="t">Specialisten onder één dak</div></div>
  <div class="cijfer"><div class="n" style="font-size:32pt">''' + VV('00') + '''</div><div class="t">Ondernemers geholpen</div></div>
  <div class="cijfer"><div class="n" style="font-size:32pt">30 km</div><div class="t">Onze focus rond Hulsberg</div></div>
</div>''')
WIE_R = pg('', rubriek('Portret', 'Wat normaal is') + '''
<div class="kicker" style="margin-top:12mm">Het verschil</div>
<h2 style="font-size:28pt">Wat normaal is, en hoe wij het doen.</h2>
<p style="font-family:var(--serif);font-size:9.6pt">Veel van wat in marketing normaal is, is vooral handig voor het bureau. Wij werkten jarenlang zelf ook zo. Tot we zagen wat het onze klanten kostte, en besloten het anders te doen.</p>
<div class="vs2" style="margin-top:4mm"><div class="k">Wat normaal is</div><div class="k wij">Hoe wij het doen</div>''' + ''.join(v3.vs_rij(a, b) for a, b in v3.NORMAAL) + '</div>')

# ================================================================ kantoor en ploeg
KANTOOR_L = opener('Achter de schermen', 'Ons kantoor', 'Welkom in Hulsberg',
    'Online is ons vak. Toch geloven we dat de beste ideeën aan tafel ontstaan. Een kijkje in de plek waar we werken, en waar je altijd welkom bent.',
    'ons kantoor in Hulsberg, binnen, met licht en ruimte', 'Tekst James Robinson · Beeld ' + VV('fotograaf'), 60)
KANTOOR_R = pg('', rubriek('Achter de schermen', 'Ons kantoor') + '''
<div class="tekst k3" style="margin-top:12mm">
  <p class="begin">Wie bij ons binnenstapt, komt niet in een vergaderzaal met een beamer en een schaal koekjes. Dat is bewust. We zijn een digitaal bureau: onze campagnes draaien online, onze cijfers staan in de cloud, en veel overleg kan prima via een scherm. Maar de momenten die er echt toe doen, het eerste gesprek, een brainstorm, een terugblik op het jaar, die werken het best met mensen samen aan één tafel.</p>
  <p>Daarom werken we voor ondernemers binnen zo’n dertig kilometer van Hulsberg. Dichtbij genoeg om snel bij jou of bij ons aan tafel te zitten als de situatie erom vraagt. Je Performance Review, het vaste overleg over je resultaten, kan hier op kantoor of online. Wat jij prettig vindt.</p>
  <h4>Gebouwd om te presteren</h4>
  <p class="na-kop">Ons kantoor hebben we ingericht met één vraag in het achterhoofd: waar doen mensen hun beste werk? Het antwoord is tweeledig. Soms heb je stilte nodig, om geconcentreerd een campagne te bouwen of door cijfers te gaan. En soms heb je ruimte nodig om groot te denken, met een whiteboard vol ideeën. We hebben plekken voor allebei. ''' + VV('wat het kantoor bijzonder maakt: de plek, het gebouw, faciliteiten') + '''</p>
  <div class="streamer">“Binnenkomen bij James Robinson moet voelen als binnenkomen bij een meesterchef.”</div>
  <p>Dat is de lat die we voor onszelf leggen. Bij een sterrenrestaurant klopt alles tot in het kleinste detail, zonder dat iemand het hoeft uit te leggen. Je voelt het gewoon. Zo willen we dat het voelt om bij ons binnen te lopen, en om met ons samen te werken.</p>
</div>''' + fotoband('de ruimte voor grote ideeën, met whiteboard', 82, '<b>Ruimte om te denken.</b> ' + VV('adres') + ', Hulsberg. Koffie staat klaar.', 'r'))

def lid(naam):
    return '<div>' + BEELD('portret', 'height:58mm;border-radius:3mm;padding:3mm') + '<div class="persoon"><b>%s</b></div></div>' % naam
NAMEN = v3.NAMEN
PLOEG_L = pg('', rubriek('Achter de schermen', 'De ploeg') + '''
<div class="kop-artikel" style="font-size:44pt;margin-top:12mm">De ploeg</div>
<div class="intro-artikel" style="font-size:12pt">Specialisten in adverteren, data, content en websites. Samen één team, met één doel: jouw campagnes laten presteren.</div>
<div class="ploeg" style="grid-template-columns:repeat(3,1fr);margin-top:6mm">''' + ''.join(lid(n) for n in NAMEN[:6]) + '</div>')
PLOEG_R = pg('', rubriek('Achter de schermen', 'De ploeg') + '<div class="ploeg" style="grid-template-columns:repeat(3,1fr);margin-top:14mm">' + ''.join(lid(n) for n in NAMEN[6:]) + '''</div>
<p class="bijschrift" style="margin-top:5mm"><b>Plus de beste specialisten in de regio.</b> Voor fotografie, video, animatie en techniek werken we met vaste partners, elk de beste in hun vak.</p>''')

# ================================================================ column science + art
SCIENCE_L = v3.SCIENCE_L
SCIENCE_R = pg('', rubriek('Column', 'Jim Coumans') + '''
<div class="concept">Concepttekst, door Jim te herschrijven</div>
<div class="kop-artikel" style="font-size:34pt;margin-top:12mm">Waarom ik niet kies tussen cijfers en gevoel</div>
<div class="naamregel">Column · Jim Coumans, oprichter</div>
<div class="tekst k2" style="margin-top:5mm">
  <p class="begin">In onze vakwereld bestaan twee kampen. Het ene kamp gelooft in data: targeting, testen, kosten per klik. Het andere kamp gelooft in creativiteit: een sterk merk, een mooi beeld, een verhaal dat blijft hangen. Ik word vaak gevraagd bij welk kamp ik hoor. Mijn antwoord: allebei.</p>
  <p>Data vindt de juiste persoon, op het juiste moment. Maar als je advertentie daar dan niet opvalt, scrollt die persoon gewoon door. Andersom geldt hetzelfde. De mooiste campagne levert niets op als hij bij de verkeerde mensen terechtkomt.</p>
  <p>Science en art zijn geen tegenpolen. Ze hebben elkaar nodig. Groot Brits onderzoek naar honderden campagnes, door het vakinstituut voor reclame IPA, laat dat ook zien: bedrijven die alleen sturen op snelle verkoop groeien op termijn minder hard dan bedrijven die ook bouwen aan een merk dat mensen herkennen.</p>
  <h4>Hoe dat er bij ons uitziet</h4>
  <p class="na-kop">Bij ons beslist de data over wie je advertentie ziet, wanneer, en hoeveel budget waarheen gaat. Je merk beslist over hoe die advertentie eruitziet en klinkt. Daar maken we geen uitzonderingen op. Ook een snelle test klopt met je kleuren, je letters en je toon.</p>
  <p>Wat goede resultaten zijn, vertellen de cijfers ons. Hoe we daar komen, met een merk waar je trots op bent, daar zorgen wij voor.</p>
  <p class="einde"><i>Jim Coumans richtte James Robinson op in 2018.</i></p>
</div>''')

NUMBERS_L = v3.NUMBERS_L
NUMBERS_R = pg('', rubriek('Essay', 'Numbers don’t lie') + '''
<div class="tekst k2" style="margin-top:12mm">
  <p class="begin">In Silicon Valley werken de slimste mensen ter wereld. Ze komen van de beste universiteiten, verdienen salarissen waar de meeste ondernemers alleen van kunnen dromen, en hebben één opdracht: producten bouwen die precies aansluiten op hoe mensen denken en kiezen.</p>
  <p>Je zou denken dat zij wel weten wat werkt. Toch testen ze bij Google vrijwel elk idee voordat het live gaat. En wat blijkt? Slechts tien tot twintig procent van die ideeën maakt het resultaat echt beter. De rest doet niets, of werkt zelfs averechts.</p>
  <div class="streamer">“Als de knapste koppen het in acht van de tien gevallen mis hebben, wie zijn wij dan om het zeker te weten?”</div>
  <h4>Onze mening doet er minder toe</h4>
  <p class="na-kop">Dat is een les in bescheidenheid. Voor ons, en eerlijk gezegd ook voor jou. Welke advertentie de mooiste is, welke kleur beter werkt, welke tekst overtuigt: daar kunnen we lang over praten, en dat doen we ook. Maar het laatste woord is aan de cijfers.</p>
  <p>Dat betekent niet dat alles mag. We maken nooit iets wat niet bij je merk past of wat niet goed voelt. Maar binnen die grenzen kiest de data, niet de smaak.</p>
  <h4>De klant van onze klant</h4>
  <p class="na-kop">Eigenlijk luisteren we het liefst naar één persoon: de klant van onze klant. De mensen die jouw product of dienst kopen. Met hen praten we niet rechtstreeks. Maar wat ze doen, zien we wel. Waar ze op klikken, waar ze twijfelen, waar ze afhaken, wat ze uiteindelijk kopen. Dat gedrag vertelt meer dan welke vergadering ook.</p>
  <p class="einde">Numbers don’t lie. Daarom sturen we erop.</p>
</div>''' + fotoband('de klant van onze klant: iemand die op een telefoon iets bestelt of aanvraagt', 70, '<b>Gedrag zegt meer dan meningen.</b> Bron van de cijfers: Kohavi en Thomke, Harvard Business Review, 2017.', 'r'))

# ================================================================ het systeem
SYSTEEM_1 = pg('', rubriek('Uitgelegd', 'Het systeem') + v3.MODEL_L.split('<div class="kicker">Het systeem</div>', 1)[1].replace('<h2 style="font-size:40pt">', '<h2 style="font-size:40pt;margin-top:8mm">'))
SYSTEEM_2 = pg('', rubriek('Uitgelegd', 'Het systeem') + '''
<div class="tekst k3" style="margin-top:12mm">
  <h4 style="margin-top:0">De motor: adverteren</h4>
  <p class="na-kop">Alles begint bij adverteren in zoekmachines en op social media. Het is het enige onderdeel van marketing dat je vandaag aanzet en morgen kunt meten. Op Google bereik je mensen die op dit moment zoeken naar wat jij aanbiedt. Op Meta, LinkedIn en TikTok bereik je mensen die lijken op je beste klanten, nog voordat ze zoeken.</p>
  <h4>De brandstof: content</h4>
  <p class="na-kop">Een motor zonder brandstof doet niets. Advertenties draaien op beeld en tekst, en goede content maakt het verschil tussen doorscrollen en stoppen. Daarom plannen we de contentproductie meteen aan het begin, en maken we steeds nieuwe varianten om te testen.</p>
  <h4>De landing: je website</h4>
  <p class="na-kop">Elke advertentie leidt naar een pagina. Daar besluit een bezoeker of hij een aanvraag doet of vertrekt. Daarom bouwen we per campagne een eigen landingspagina: snel, duidelijk en met één doel. En we meten precies wat er gebeurt.</p>
  <h4>De voordeur: een aanvraag</h4>
  <p class="na-kop">Het eindpunt van ons werk is een aanvraag van goede kwaliteit, bij jou op de mat. Wat daarna gebeurt, het gesprek, de offerte, de verkoop, is jouw terrein. Daar denken we graag over mee, maar daar ligt de regie bij jou.</p>
  <h4>De versnellers</h4>
  <p class="na-kop">Als de motor draait, bouwen we versnellers. CRO haalt meer aanvragen uit hetzelfde verkeer. E-mail en automation halen terug wie er al was. SEO zorgt voor verkeer waar je niet per klik voor betaalt. Allemaal met hetzelfde doel: elke volgende klant goedkoper maken.</p>
  <h4>Het dashboard: monitoring</h4>
  <p class="na-kop">Over alles heen ligt een laag die je niet ziet maar wel merkt. Elke dag kijken we wat er buiten de lijntjes loopt: een campagne die niets besteedt, een formulier dat niet werkt, kosten die oplopen. Zo grijpen we in voordat het geld kost.</p>
</div>''' + fotoband('het team aan een groot scherm met campagnecijfers', 78, '<b>Eén systeem.</b> Elk onderdeel versterkt het volgende, en alles is meetbaar.', 'r'))
SYSTEEM_3 = (
    pg('', rubriek('Uitgelegd', 'Waarom we met adverteren beginnen') + '''
<div class="kop-artikel" style="font-size:34pt;margin-top:12mm">Snel resultaat. Daarna bouwen we verder.</div>
<div class="tekst k2" style="margin-top:5mm">
  <p class="na-kop">Waarom niet meteen alles tegelijk? Omdat elk onderdeel van marketing een eigen tempo heeft. SEO is waardevol, maar het duurt vaak maanden voordat je hoger in Google staat. Organisch posten bouwt aan je merk, maar levert zelden voorspelbaar nieuwe klanten op.</p>
  <p>Adverteren is anders. Het staat vandaag aan en laat binnen weken zien welke woorden, doelgroepen en boodschappen werken. Die kennis is goud waard, ook voor de rest. We weten dan op welke zoekwoorden SEO zich gaat terugverdienen, welke boodschap op je website moet, en wat je in een e-mail zet.</p>
</div>
<div style="margin-top:5mm">''' + v3.lijnen([
    ('Adverteren', BLAUW, [(0, 0), (1, 6), (2, 22), (3, 38), (4, 50), (6, 62), (9, 70), (12, 75)], False, 0),
    ('SEO', ORANJE, [(0, 0), (2, 2), (4, 6), (6, 14), (8, 26), (10, 40), (12, 52)], False, 0),
    ('Organisch posten', GRIJS, [(0, 0), (2, 6), (4, 9), (6, 10), (9, 11), (12, 12)], True, 0),
], b=126, h=70, xmax=12, ymax=100, xlabels=[(0, 'start'), (3, 'maand 3'), (6, 'maand 6'), (9, 'maand 9'), (12, 'maand 12')], ylabel='Aanvragen per maand') + '''</div>
<p class="bijschrift"><b>Zo verloopt het meestal.</b> Illustratief: hoe snel het echt gaat, verschilt per markt en per bedrijf.</p>
<div class="kaderblok" style="margin-top:6mm"><div class="kl">Versnellers, geen trucjes</div><p style="margin:0;font-size:8.8pt">We zetten SEO, e-mail en CRO pas in als de motor draait, in de volgorde die de cijfers aanwijzen. Los ingezet hebben ze geen ijkpunt. Als versneller wel.</p></div>'''))
SYSTEEM_4 = pg('', rubriek('Uitgelegd', 'Het systeem in de tijd') + '''
<h2 style="margin-top:12mm">Eerst de motor. Dan de versnellers.</h2>
<div class="fasen">''' +
    v3.fase('Maand 0', 'Opstart', 'Meting, accounts, campagne, landingspagina en de eerste content.', ['Content']) +
    v3.fase('Maand 1 tot 3', 'De motor draait', 'Leren wat werkt. Ballonnetjes oplaten, meten, bijsturen.', ['Adverteren', 'Content']) +
    v3.fase('Maand 4 tot 6', 'Eerste versnellers', 'Je landingspagina beter maken, en e-mail om terug te halen wie er al was.', ['Adverteren', 'Content', 'CRO', 'E-mail']) +
    v3.fase('Vanaf maand 6', 'Alles samen', 'SEO op de woorden die bewezen klanten opleveren, en automation.', ['Adverteren', 'Content', 'CRO', 'E-mail', 'SEO']) + '''
</div>
<p class="bijschrift">Een voorbeeld. De volgorde van de versnellers bepalen jouw cijfers: bij de een eerst SEO, bij de ander eerst e-mail.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:8mm">
  <div><h3>Aanvragen per maand</h3>''' + v3.lijnen([
    ('Aanvragen', BLAUW, [(0, 0), (1, 8), (2, 18), (3, 26), (4, 34), (5, 40), (6, 48), (8, 58), (10, 68), (12, 76)], False, 0),
], b=56, h=44, xmax=12, ymax=100, xlabels=[(0, '0'), (6, '6'), (12, '12')]) + '''</div>
  <div><h3>Kosten per aanvraag</h3>''' + v3.lijnen([
    ('Kosten', ORANJE, [(1, 92), (2, 80), (3, 70), (4, 64), (5, 58), (6, 52), (8, 46), (10, 42), (12, 38)], False, 0),
], b=56, h=44, xmax=12, ymax=100, xlabels=[(0, '0'), (6, '6'), (12, '12')]) + '''</div>
</div>
<p class="bijschrift"><b>Meer aanvragen, tegen lagere kosten per aanvraag.</b> De motor brengt volume, de versnellers maken het goedkoper. Illustratief, per maand.</p>
<div class="tekst" style="margin-top:6mm"><p class="einde">Zo groeit het systeem mee. Eerst snel leren met adverteren, dan bouwen we de onderdelen die elke volgende klant goedkoper maken.</p></div>''')

# ================================================================ content en versnellers
CONTENT_L = opener('Uitgelegd', 'Content', 'De brandstof van de motor',
    'Een advertentie is zo goed als het beeld erin. Daarom plannen we de contentproductie meteen aan het begin, en werken we met de beste makers in hun vak.',
    'een draaidag: camera, licht, iemand van de klant in beeld', 'Tekst James Robinson · Beeld ' + VV('fotograaf'), 58)
CONTENT_R = pg('', rubriek('Uitgelegd', 'Content') + '''
<div class="tekst k2" style="margin-top:12mm">
  <p class="begin">Iemand scrolt door Instagram. In een fractie van een seconde besluit hij of hij stopt bij jouw advertentie, of doorgaat. Dat besluit wordt niet genomen door het algoritme, maar door het beeld. Een herkenbaar gezicht, je eigen zaak, je eigen product in actie. Stockfoto’s halen het daar zelden bij.</p>
  <p>Daarom beginnen we elke samenwerking met een contentplan. Wat moet het beeld vertellen? Voor wie? In welke formaten en voor welke kanalen? Daarna volgt de shoot, bij jou op locatie, op een moment dat jou uitkomt. Op die dag maken we het beeld waarmee je advertenties de komende maanden draaien.</p>
  <h4>De beste makers per vak</h4>
  <p class="na-kop">Voor elke vorm van content werken we met de absolute experts in hun vak, afgestemd op wat jij nodig hebt. Een fotograaf die mensen op hun gemak stelt. Een videograaf die in vijftien seconden een verhaal vertelt. Een animator, een copywriter. Zij maken het, wij zorgen dat het presteert.</p>
  <h4>Waarom het steeds nieuw moet</h4>
  <p class="na-kop">Advertenties slijten. Zien dezelfde mensen een advertentie te vaak, dan klikken ze minder en lopen de kosten per resultaat op. Meta waarschuwt daar in zijn eigen advertentiesysteem zelfs voor. Daarom maken we in vaste rondes nieuwe varianten, en testen we die tegen de lopende.</p>
</div>
<div class="partners" style="grid-template-columns:repeat(3,1fr);margin-top:4mm">
  <div><b>Fotografie</b><span>Je mensen, je product, je zaak</span></div>
  <div><b>Videografie</b><span>Korte video voor elk kanaal</span></div>
  <div><b>Animatie</b><span>Uitleg en beweging die opvalt</span></div>
  <div><b>Visuals</b><span>Advertenties in elk formaat</span></div>
  <div><b>Copywriting</b><span>Woorden die aanzetten tot actie</span></div>
  <div><b>Formaten</b><span>9:16, 4:5 en 1:1, per kanaal</span></div>
</div>''')

def vers(titel, wanneer, tekst, effect):
    return '<div><h4 style="margin-top:0">%s</h4><p class="na-kop">%s</p><p class="bijschrift" style="font-family:var(--ft)"><b>Wanneer.</b> %s · <b>Effect.</b> %s</p></div>' % (titel, tekst, wanneer, effect)
VERS_L = pg('', rubriek('Uitgelegd', 'De versnellers') + '''
<div class="kop-artikel" style="font-size:44pt;margin-top:12mm">Geen trucjes. Versnellers.</div>
<div class="intro-artikel" style="font-size:12.5pt">CRO, e-mail, automation, SEO. Elk bureau kan ze opsommen. Het verschil zit in wanneer je ze inzet, en waarvoor.</div>
<div class="tekst" style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:7mm">''' +
    vers('Landingspagina’s', 'vanaf de start', 'Elke campagne krijgt een eigen pagina, met één boodschap en één actie. Geen menu vol afleiding, geen tekst die over iets anders gaat. Wie op een advertentie over zonnepanelen klikt, landt op een pagina over zonnepanelen.', 'meer bezoekers worden een aanvraag') +
    vers('CRO', 'als er verkeer is', 'Conversion rate optimization: kijken waar bezoekers afhaken, en dat verbeteren. Een korter formulier, een duidelijkere knop, een antwoord op de twijfel die iedereen heeft. Elke verbetering levert meer aanvragen op uit hetzelfde budget.', 'meer aanvragen voor hetzelfde geld') + '''
</div>''' + fotoband('een landingspagina op een telefoon, iemand vult een formulier in', 70, '<b>Eén pagina, één doel.</b> Hoe minder afleiding, hoe meer aanvragen.', 'l'))
VERS_R = pg('', rubriek('Uitgelegd', 'De versnellers') + '''
<div class="tekst" style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:14mm">''' +
    vers('E-mail en automation', 'als er adressen zijn', 'Niet iedereen koopt bij het eerste bezoek. Met e-mail houd je contact met wie al interesse toonde, zonder opnieuw voor die aandacht te betalen. En met automation gaat dat vanzelf, op het juiste moment: een herinnering, een tip, een aanbod.', 'een klant levert meer op') +
    vers('SEO', 'als de cijfers het aanwijzen', 'Hoger in Google komen kost tijd. Daarom richten we ons op de zoekwoorden waarvan we via je advertenties al weten dat ze klanten opleveren. Zo wordt een deel van je verkeer gratis, op precies de woorden die ertoe doen.', 'verkeer zonder kosten per klik') + '''
</div>
<div class="kaderblok blauw-k" style="margin-top:8mm">
  <div class="kl">Uit onderzoek</div>
  <div class="cijfer" style="border-color:var(--deep)"><div class="n">21,6%</div><div class="t">Zoveel vaker kwamen bezoekers van de eerste stap van een formulier tot het verzenden, bij een mobiele site die een tiende seconde sneller was.</div><div class="b">Deloitte Digital voor Google, Milliseconds Make Millions, 2020 · leadgeneratie, 37 merken</div></div>
</div>
<div class="tekst" style="margin-top:6mm"><p class="einde">Elke versneller komt uit op hetzelfde getal: wat een nieuwe klant je kost. Daarom zetten we ze in als onderdeel van het systeem, en verkopen we ze niet los.</p></div>''')

# ================================================================ van impressie tot klant
TRECHTER_L = pg('', rubriek('Uitgelegd', 'Van impressie tot klant') + v3.TRECHTER_L.split('<div class="kicker">Van impressie tot klant</div>', 1)[1].replace('<h2 style="font-size:36pt">', '<h2 style="font-size:36pt;margin-top:8mm">'))
TRECHTER_R = pg('', rubriek('Uitgelegd', 'Waar zit de bottleneck?') + '''
<div class="tekst k2" style="margin-top:12mm">
  <p class="begin">Neem een installateur uit de Westelijke Mijnstreek. Zijn advertenties worden goed bekeken en er komen genoeg bezoekers op zijn website. Toch blijven de aanvragen achter. Waar zit het probleem?</p>
  <p>De cijfers geven het antwoord. Van de bezoekers doet maar één procent een aanvraag, waar twee tot drie procent normaal is. De advertentie doet dus haar werk, de pagina niet. We maken het formulier korter, zetten de reviews bovenaan en laten zien hoe snel hij langs kan komen. Twee weken later is de conversie verdubbeld, zonder een euro extra budget.</p>
  <p>Dit voorbeeld is verzonnen, het principe niet. Elke stap in de keten heeft een eigen knop, en de cijfers wijzen aan welke je moet draaien.</p>
</div>
<table class="diagnose" style="margin-top:4mm">
  <tr><th>Wat we zien</th><th>Wat we kunnen doen</th></tr>
  <tr><td>Weinig impressies<br><span class="wie">Wij</span></td><td>Budget verschuiven, doelgroep verbreden, ander kanaal of zoekwoord</td></tr>
  <tr><td>Wel gezien, weinig kliks<br><span class="wie">Wij</span></td><td>Nieuw beeld, andere boodschap, scherpere doelgroep</td></tr>
  <tr><td>Wel bezoekers, weinig aanvragen<br><span class="wie">Wij</span></td><td>Pagina sneller en duidelijker, korter formulier, sterker aanbod</td></tr>
  <tr><td>Wel aanvragen, weinig klanten<br><span class="wie jij">Jij, met ons</span></td><td>Sneller opvolgen, aanbod en prijs scherper. Wij kijken mee naar de kwaliteit</td></tr>
</table>''')

# ================================================================ portaal en slimmer werken
PORTAAL_L = v3.PORTAAL_L.replace('<div class="kicker">Je eigen portaal</div>', rubriek('Product in beeld', 'Je portaal') + '<div class="kicker" style="margin-top:8mm">Je eigen portaal</div>')
PORTAAL_R = pg('', rubriek('Product in beeld', 'Je portaal') + '''
<div class="tekst k2" style="margin-top:12mm">
  <p class="begin">Veel ondernemers die bij ons komen, hadden eerder een bureau. En bijna allemaal vertellen ze hetzelfde: aan het eind van de maand kwam er een rapport, vol grafieken en vaktermen, maar zonder antwoord op de vraag die ertoe deed. Wat heeft het me opgeleverd?</p>
  <p>Daarom bouwden we ons eigen portaal. Daarin zie je precies wat wij zien, op elk moment van de dag. Hoeveel mensen je advertenties zagen, hoeveel er doorklikten, hoeveel aanvragen er binnenkwamen en wat die kostten. Per kanaal, per campagne, per dag.</p>
  <h4>Op kwaliteit sturen</h4>
  <p class="na-kop">Elke aanvraag komt in het portaal binnen. Met één klik geef je aan of hij goed was, en later of het een klant werd. Daarmee leren wij welke campagnes de beste klanten opleveren, niet alleen de meeste aanvragen.</p>
  <h4>Alles op één plek</h4>
  <p class="na-kop">Ook je merk staat erin: je logo’s, kleuren en lettertypes, in je eigen merkkluis. En je lopende campagnes en budget. Stop je ooit met ons, dan blijft je dashboard gewoon van jou.</p>
</div>''' + fotoband('een ondernemer die op zijn telefoon het portaal bekijkt', 92, '<b>Altijd bij de hand.</b> Op je laptop, je tablet of je telefoon.', 'r'))
SLIM_L, SLIM_R = v2.SLIM1, v2.SLIM2

# ================================================================ klanten en cases
LOGOS = v2.LOGOS.replace('<div class="kicker">Voor wie we werken</div>', rubriek('Klanten', 'Voor wie we werken') + '<div class="kicker" style="margin-top:8mm">Voor wie we werken</div>')
REVIEWS = v2.REVIEWS.replace('<div class="kicker">Wat klanten zeggen</div>', rubriek('Klanten', 'Wat klanten zeggen') + '<div class="kicker" style="margin-top:8mm">Wat klanten zeggen</div>')

def case(n, kant_open):
    a = opener('Case %d' % n, VV('branche'), VV('klantnaam'),
        VV('het resultaat in één zin, bijvoorbeeld: hoe een installatiebedrijf in een jaar tijd zijn aanvragen verdubbelde'),
        'de klant in zijn zaak, of zijn product in actie', 'Case · ' + VV('branche') + ' · ' + VV('plaats'), 54)
    b = pg('', rubriek('Case %d' % n, VV('klantnaam')) + '''
<div class="tekst k3" style="margin-top:12mm">
  <h4 style="margin-top:0">De uitdaging</h4>
  <p class="na-kop">''' + VV('waar de klant stond: het bedrijf, de markt, het probleem of de ambitie, en wat dat kostte. Drie tot vijf zinnen.') + '''</p>
  <h4>Onze aanpak</h4>
  <p class="na-kop">''' + VV('wat we deden: welke campagnes, welke kanalen, welke content, wat we aan de website veranderden, en waarom. Vier tot zes zinnen.') + '''</p>
  <h4>Het resultaat</h4>
  <p class="na-kop">''' + VV('wat het opleverde, in aanvragen, kosten per aanvraag en omzet, over welke periode. Drie tot vijf zinnen.') + '''</p>
</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:7mm">
  <div class="cijfer"><div class="n" style="font-size:36pt">''' + VV('+00%') + '''</div><div class="t">aanvragen per maand</div></div>
  <div class="cijfer"><div class="n" style="font-size:36pt">''' + VV('€ 00') + '''</div><div class="t">per aanvraag</div></div>
  <div class="cijfer"><div class="n" style="font-size:36pt">''' + VV('0×') + '''</div><div class="t">omzet per euro marketing</div></div>
</div>
<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:6mm;margin-top:8mm">
  <div class="streamer" style="margin:0">“''' + VV('quote van de klant, met toestemming') + '''”<small>''' + VV('naam, functie') + '''</small></div>
  <div class="kaderblok"><div class="kl">Wat we leerden</div><p style="font-size:8.8pt;margin:0">''' + VV('het opvallendste inzicht uit deze case, bijvoorbeeld een doelgroep of boodschap die verraste') + '''</p></div>
</div>
<p class="bijschrift" style="position:absolute;left:21mm;right:23mm;bottom:24mm">Cijfers uit het portaal van de klant, met toestemming gedeeld.</p>''')
    return [a, b]

# ================================================================ deel 2
VRAGEN = [
    ('Waarom geen jaarcontract?', 'Omdat je bij ons moet blijven omdat het werkt, niet omdat je vastzit. Je kunt elke maand opzeggen, tot de laatste dag van de maand. Het fundament is eenmalig werk dat je bij de start betaalt; dat krijg je na de start niet terug, omdat het dan gedaan is.'),
    ('Moet ik stoppen met posten op social media?', 'Nee. Een verzorgd profiel is goed voor je merk en voor de mensen die je al kennen. Alleen is het geen manier om voorspelbaar nieuwe klanten te vinden. Daarvoor adverteren we. Het beeld uit je campagnes kun je ook op je eigen kanalen gebruiken.'),
    ('Hoe snel zie ik resultaat?', 'De eerste aanvragen komen vaak in de eerste weken binnen. De platformen hebben wel tijd, budget en data nodig om te leren. Rond maand drie trekken we de eerste voorzichtige conclusies. Bij de een gaat het sneller, bij de ander duurt het langer.'),
    ('Wat als het niet werkt?', 'Dan zie je dat in je portaal, en zeggen wij het zelf, met de cijfers en een verklaring erbij. We sturen bij: andere doelgroep, ander beeld, andere pagina. En lukt het echt niet, dan zeggen we dat ook. Je zit nergens aan vast.'),
    ('Waarom betaal ik het advertentiebudget zelf aan Google en Meta?', 'Zodat je precies ziet waar elke euro heen gaat. Er zit geen opslag van ons op, en de accounts staan op jouw naam. Wij beheren ze, jij bent eigenaar.'),
    ('Van wie zijn de accounts, het beeld en de cijfers?', 'Van jou. Advertentieaccounts, e-mail, licenties en het beeld uit je shoots staan op jouw naam. Stop je, dan neem je alles mee, ook je dashboard.'),
    ('Kan ik ook alleen een website of alleen SEO afnemen?', 'We werken als één systeem, omdat de onderdelen elkaar versterken. Heb je een losse vraag, zoals een nieuwe website of een huisstijl, dan doen we het als apart project met een prijs vooraf, of brengen we je in contact met een partner die er beter in is.'),
    ('Hoeveel tijd kost het mij?', 'In de opstart: een sessie van drie kwartier voor de toegangen, een formulier en een dagdeel voor de shoot. Daarna vooral: aanvragen snel opvolgen, per aanvraag aangeven of hij goed was, en de Performance Review. De rest doen wij.'),
    ('Werken jullie met AI?', 'Ja, waar het je iets oplevert. Bij monitoring, bij het maken van varianten en bij alles waar een machine minder fouten maakt dan een mens. Beslissingen over je budget, je doelgroep en je merk nemen mensen, samen met jou.'),
    ('Waarom werken jullie vooral in Zuid-Limburg?', 'Omdat de beste gesprekken aan tafel plaatsvinden. Met klanten binnen zo’n dertig kilometer zitten we snel bij elkaar als dat nodig is. Online kan veel, maar niet alles.'),
]
def vraag(q, a):
    return '<div style="break-inside:avoid;margin-bottom:5mm"><h4 style="margin:0 0 1.2mm">%s</h4><p class="na-kop" style="margin:0">%s</p></div>' % (q, a)
FAQ_L = pg('', rubriek('Service', 'Veelgestelde vragen') + '''
<div class="kop-artikel" style="font-size:44pt;margin-top:12mm">Wat je je misschien afvraagt</div>
<div class="tekst k2" style="margin-top:7mm">''' + ''.join(vraag(*v) for v in VRAGEN[:5]) + '</div>')
FAQ_R = pg('', rubriek('Service', 'Veelgestelde vragen') + '<div class="tekst k2" style="margin-top:14mm">' + ''.join(vraag(*v) for v in VRAGEN[5:]) + '''</div>
<div class="kaderblok blauw-k" style="margin-top:4mm"><div class="kl">Staat je vraag er niet bij?</div><p style="margin:0;font-size:8.8pt">Stel hem in het intakegesprek, of mail naar support@jamesrobinson.nl. Je krijgt binnen één werkdag antwoord.</p></div>''')

BEGRIPPEN = [
    ('Aanvraag', 'Iemand die contact opneemt via een formulier, telefoontje of afspraak. Ook wel lead genoemd.'),
    ('Advertentiebudget', 'Wat je rechtstreeks aan Google, Meta of LinkedIn betaalt voor je advertenties. De brandstof van de motor.'),
    ('Campagne', 'Eén aanbod, voor één doelgroep, met één doel en één landingspagina. Op Google en Meta samen is het nog steeds één campagne.'),
    ('Contentronde', 'Een nieuwe set advertenties, beeld en tekst, om tegen de lopende te testen.'),
    ('Conversieratio', 'Het deel van je bezoekers dat een aanvraag doet. 200 bezoekers en 4 aanvragen is 2 procent.'),
    ('CPC', 'Cost per click: wat je gemiddeld betaalt voor één klik op je advertentie.'),
    ('CPM', 'Wat 1.000 weergaven van je advertentie kosten.'),
    ('CRO', 'Conversion rate optimization: je website zo verbeteren dat meer bezoekers een aanvraag doen.'),
    ('CTR', 'Click-through rate: het deel van de mensen dat je advertentie ziet en erop klikt.'),
    ('Impressie', 'Eén keer dat je advertentie in beeld kwam.'),
    ('Landingspagina', 'De pagina waar iemand na een klik op je advertentie terechtkomt. Eén boodschap, één actie.'),
    ('Retargeting', 'Adverteren bij mensen die al eens op je website waren, maar nog geen aanvraag deden.'),
    ('ROAS', 'Return on ad spend: hoeveel omzet elke euro advertentiebudget oplevert. Een ROAS van 4 is vier euro omzet per euro.'),
    ('Scoringsratio', 'Het deel van je aanvragen dat klant wordt. Dat deel ligt bij jou.'),
    ('SEO', 'Search engine optimization: hoger in Google komen zonder per klik te betalen.'),
]
ABC = pg('', rubriek('Service', 'Marketing van A tot Z') + '''
<div class="kop-artikel" style="font-size:40pt;margin-top:12mm">Marketing van A tot Z</div>
<div class="intro-artikel" style="font-size:11.5pt">De woorden die je in je portaal en in onze gesprekken tegenkomt, in gewone taal.</div>
<div class="tekst k2" style="margin-top:6mm;font-size:8.8pt">''' + ''.join('<p style="text-indent:0;margin:0 0 2.4mm"><b style="font-family:var(--fd)">%s</b> %s</p>' % b for b in BEGRIPPEN) + '</div>')

ONDERZOEK = v3.ONDERZOEK.replace('<div class="kicker">Eerst onderzoek</div>', rubriek('Jouw traject', 'Eerst onderzoek') + '<div class="kicker" style="margin-top:8mm">Eerst onderzoek</div>')
DOEN = pg('', rubriek('Jouw traject', 'Wat we doen, en met wie') + v3.O(16).split('<div class="kicker">De grens</div>', 1)[1].split('<h3 style="margin-top:9mm">De kanalen</h3>')[0].replace('<h2>', '<h2 style="margin-top:8mm">') + '''
<h3 style="margin-top:8mm">We kunnen je altijd helpen</h3>
<p style="font-family:var(--serif);font-size:9.4pt">Zelf, of door je te koppelen aan de beste vakmensen in de regio. Jij houdt één aanspreekpunt, en je betaalt de specialist, nooit ons bovenop de specialist.</p>
<div class="partners">
  <div><b>Webmix</b><span>Websites, hosting en onderhoud</span></div>''' + ''.join('<div><b>' + VV('partner') + '</b><span>' + VV(v) + '</span></div>' for v in ['design en branding', 'fotografie en video', 'drukwerk', 'vacatures en werving']) + '''
  <div><b>En meer</b><span>Vraag het ons</span></div>
</div>''')

PAGINAS = [
    ('cover', pk.COVER), ('inhoud', pk.INHOUD_L), ('', pk.INHOUD_R),
    ('', v3.JIM), ('verklaring', v3.VERKLARING), ('kort', pk.KORT_L), ('', pk.KORT_R),
    ('herken', HERKEN_1), ('', HERKEN_2), ('', HERKEN_3), ('', HERKEN_4),
    ('wie', WIE_L), ('normaal', WIE_R),
    ('kantoor', KANTOOR_L), ('', KANTOOR_R), ('ploeg', PLOEG_L), ('', PLOEG_R),
    ('science', SCIENCE_L), ('', SCIENCE_R),
    ('krant', pk.KRANT_1), ('', pk.KRANT_2), ('', pk.KRANT_3), ('', pk.KRANT_4),
    ('numbers', NUMBERS_L), ('', NUMBERS_R),
    ('model', SYSTEEM_1), ('', SYSTEEM_2), ('', SYSTEEM_3), ('', SYSTEEM_4),
    ('content', CONTENT_L), ('', CONTENT_R), ('versnellers', VERS_L), ('', VERS_R),
    ('trechter', TRECHTER_L), ('', TRECHTER_R),
    ('voordeur', pk.DEUR_1), ('', pk.DEUR_2), ('', pk.DEUR_3), ('', pk.DEUR_4),
    ('portaal', PORTAAL_L), ('', PORTAAL_R), ('slim', SLIM_L), ('', SLIM_R),
    ('cases', LOGOS), ('', REVIEWS),
] + [('', p) for p in case(1, 'l')] + [('', p) for p in case(2, 'l')] + [
    ('tussen', v3.TUSSEN), ('onderzoek', ONDERZOEK), ('investering', v3.INVEST_L), ('', v3.INVEST_R),
    ('verwacht', v3.VERWACHT), ('opstart', v3.OPSTART), ('fundament', v3.FUNDAMENT), ('pakketten', v3.PAKKETTEN),
    ('toolset', v3.TOOLSET), ('doen', DOEN), ('samen', v2.SAMEN),
    ('vragen', FAQ_L), ('', FAQ_R), ('spelregels', v3.REGELS1), ('', v3.O(21)), ('jouwkant', v3.O(22)),
    ('abc', ABC), ('verder', v3.eind()), ('padel', v2.PADEL_BEELD), ('', v3.met(v2.PADEL, v3.onder('de padelbaan, team en klanten na de wedstrijd', 96, 'r'))),
    ('bronnen', v3.BRONNEN), ('cta', v3.CTA), ('back', v3.O(24)),
]

EXTRA = {
    id(HERKEN_2): ('een volle werkplaats of winkel, ondernemer aan het werk', 78, '<b>Herkenbaar.</b> Elke ondernemer loopt ergens tegenaan. De vraag is waar.'),
    id(HERKEN_3): ('een ondernemer die met een kop koffie naar zijn cijfers kijkt', 78, '<b>Eén vraag.</b> Wat kost een nieuwe klant je, en wat levert hij op?'),
    id(SCIENCE_R): ('Jim Coumans aan het werk, met een campagne op het scherm', 92, '<b>Jim Coumans</b> richtte James Robinson op in 2018.'),
    id(SYSTEEM_4): ('een groeiende zaak: drukte, klanten, beweging', 60, '<b>Groei.</b> Eerst de motor, dan de versnellers.'),
    id(CONTENT_R): ('een fotograaf en een videograaf op een draaidag, achter de schermen', 72, '<b>Draaidag.</b> Eén dag, beeld voor maanden.'),
    id(VERS_R): ('iemand die een e-mail opent op een telefoon', 64, '<b>Terughalen.</b> Wie er al was, hoef je niet opnieuw te betalen.'),
    id(TRECHTER_R): ('een installateur aan het werk bij een klant thuis', 70, '<b>Een voorbeeld.</b> Elke stap heeft een eigen knop.'),
    id(FAQ_R): ('het team aan tafel met een klant', 80, '<b>Aan tafel.</b> Elke vraag is welkom.'),
    id(ABC): ('een notitieblok met marketingtermen, of het portaal op een scherm', 96, '<b>Gewone taal.</b> Geen vakjargon in je portaal en in onze gesprekken.'),
}
for _i, (_k, _p) in enumerate(PAGINAS):
    if id(_p) in EXTRA:
        b_, h_, t_ = EXTRA[id(_p)]
        PAGINAS[_i] = (_k, _p.replace('</section>', fotoband(b_, h_, t_, 'r' if (_i + 1) % 2 else 'l') + '</section>'))
    elif 'Cijfers uit het portaal van de klant, met toestemming gedeeld.' in _p:
        PAGINAS[_i] = (_k, _p.replace('<p class="bijschrift" style="position:absolute;left:21mm;right:23mm;bottom:24mm">Cijfers uit het portaal van de klant, met toestemming gedeeld.</p>', fotoband('de klant met zijn team, of het resultaat in beeld', 70, '<b>Cijfers</b> uit het portaal van de klant, met toestemming gedeeld.', 'r' if (_i + 1) % 2 else 'l')))

if len(PAGINAS) % 4:
    print("LET OP: %d pagina's, geen veelvoud van vier" % len(PAGINAS))
nummers = {k: i + 1 for i, (k, _) in enumerate(PAGINAS) if k}
body = '\n'.join(v3.plaats(i + 1, p, len(PAGINAS)) for i, (_, p) in enumerate(PAGINAS))
body = re.sub(r'\{p:(\w+)\}', lambda m: '%02d' % nummers.get(m.group(1), 0), body)
css = ''.join(open(os.path.join(HIER, f)).read() for f in ('magazine.css', 'magazine-extra.css', 'magazine-v3.css', 'magazine-artikel.css'))
open(os.path.join(HIER, 'editie.html'), 'w').write(
    '<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>%s</title><style>%s</style></head><body>\n%s\n</body></html>' % (TITEL, css, body))
ontbreekt = sorted(set(re.findall(r'\{p:(\w+)\}', open(os.path.join(HIER, 'editie.html')).read())))
print(len(PAGINAS), "pagina's", 'onbekende verwijzingen:', [k for k in set(re.findall(r'\{p:(\w+)\}', ''.join(p for _, p in PAGINAS))) if k not in nummers])
