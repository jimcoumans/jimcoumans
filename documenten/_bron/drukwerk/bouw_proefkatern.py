# -*- coding: utf-8 -*-
# Proefkatern van 16 pagina's: zo leest het magazine als magazine. Daarna de rest in dezelfde vorm.
import re, os, sys
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import blokken_v2 as v2
import bouw_magazine as v3
from grafieken import staven, BLAUW, GRIJS

pg, VV, BEELD = v2.pg, v2.VV, v2.BEELD
TITEL = 'James Robinson · The Performance Issue'

# Paginanummers in de volledige editie (het plan van 68 pagina's)
PLAN = dict(verklaring=4, kort=6, normaal=10, kantoor=12, ploeg=14, science=16, krant=18, numbers=22, model=24,
            trechter=30, voordeur=32, portaal=36, cases=40, investering=48, pakketten=52, vragen=58, abc=62, padel=64)

def fotoband(beeld, h, bijschrift, kant='l'):
    l, r = ('21mm', '23mm') if kant == 'l' else ('23mm', '21mm')
    return '<div style="position:absolute;left:%s;right:%s;bottom:24mm">%s<div class="bijschrift">%s</div></div>' % (
        l, r, BEELD(beeld, 'height:%smm;border-radius:3mm' % h), bijschrift)

def rubriek(sectie, onderwerp):
    return '<div class="rubriek"><b>%s</b> · %s</div>' % (sectie, onderwerp)

# ================================================================ omslag
COVER = re.sub(r'<div class="lijnen">.*?</div>\s*</section>', '''<div class="lijnen">
  <div><b>Tot aan de voordeur</b>Waarom een goede aanvraag nog geen klant is <span>{p:voordeur}</span></div>
  <div><b>Van krant tot algoritme</b>Waarom gratis bereik voorbij is <span>{p:krant}</span></div>
  <div><b>Science + Art</b>Waarom data en merk samen winnen <span>{p:science}</span></div>
  <div><b>Welkom in Hulsberg</b>Binnen bij het team <span>{p:kantoor}</span></div>
</div></section>''', v3.COVER, flags=re.S)
INHOUD_L = v3.INHOUD_L
INHOUD_R = (v3.INHOUD_R
    .replace("tegel('likes', 'een telefoon met een feed', 'Likes don’t pay the bills', 'Waarom we adverteren in plaats van hopen')", '')
    .replace('<li><i>{p:content}</i>Content: de brandstof</li>', '<li><i>{p:vragen}</i>Veelgestelde vragen</li>')
    .replace('<li><i>{p:numbers}</i>Numbers don’t lie</li>', '<li><i>{p:kort}</i>In het kort</li>')
    .replace('<li><i>{p:spelregels}</i>De spelregels</li>', '<li><i>{p:abc}</i>Marketing van A tot Z</li>'))
INHOUD_R = INHOUD_R.replace(v3.tegel('likes', 'een telefoon met een feed', 'Likes don’t pay the bills', 'Waarom we adverteren in plaats van hopen'), v3.tegel('krant', 'een krant naast een telefoon', 'Van krant tot algoritme', 'Waarom gratis bereik voorbij is'))

# ================================================================ in het kort
KORT_L = pg('', rubriek('In het kort', 'Nieuws uit Hulsberg') + '''
<div class="kop-artikel" style="font-size:48pt;margin-top:10mm">In het kort</div>
<div class="kort" style="grid-template-columns:1fr 1fr">
  <div class="kort-item">''' + BEELD('het portaal op een laptop, op kantoor') + '''<div class="kl">Nieuw</div><h3>Je cijfers, live</h3>
    <p>Geen pdf meer aan het eind van de maand. Elke klant van James Robinson krijgt een eigen portaal waarin de cijfers van Google, Meta, LinkedIn en de eigen website samenkomen. Elk uur bijgewerkt, en precies dezelfde cijfers die wij gebruiken om je campagnes bij te sturen.</p></div>
  <div class="kort-item"><div class="kl">Bereikbaarheid</div><h3>Eén adres voor alles</h3>
    <p>Vragen, materiaal, akkoorden: alles gaat naar één adres, support@jamesrobinson.nl. Iedereen die aan jouw campagnes werkt, leest mee. Je krijgt binnen één werkdag antwoord van degene die erover gaat. Brandt er echt iets, dan bel je gewoon naar kantoor.</p>
    <div class="kl" style="margin-top:6mm">Agenda</div><h3>Padel met klanten</h3>
    <p>Een paar keer per jaar staan we met klanten en het team op de padelbaan. Geen presentaties, wel een goed potje en een drankje achteraf. Ook als je nog geen klant bent, ben je welkom. Meer op pagina {p:padel}.</p></div>
</div>''' + fotoband('achter de schermen: een draaidag bij een klant', 70, '<b>Achter de schermen.</b> ' + VV('bij welke klant, en wat we maakten')))

KORT_R = pg('', rubriek('In het kort', 'Cijfers en feiten') + '''
<div class="kort" style="margin-top:22mm">
  <div class="kort-item"><div class="groot">23%</div><div class="kl">Onderzoek</div><h3>Van de bedrijven belt nooit terug</h3>
    <p>Onderzoekers stuurden ruim tweeduizend bedrijven een online aanvraag. Bijna een kwart reageerde nooit. Wie wel reageerde, deed er gemiddeld 42 uur over. Waarom dat ertoe doet, lees je op pagina {p:voordeur}.</p></div>
  <div class="kort-item"><div class="groot">1 op 3</div><div class="kl">Wist je dat</div><h3>Zelfs de grootste techbedrijven gokken vaak mis</h3>
    <p>Bij de grote techbedrijven blijkt hooguit een op de drie geteste ideeën het resultaat te verbeteren. De rest werkt niet, of zelfs averechts. Het bewijs dat meten belangrijker is dan mening.</p></div>
  <div class="kort-item"><div class="groot">30 km</div><div class="kl">Dichtbij</div><h3>Focus op Zuid-Limburg</h3>
    <p>We werken voor ondernemers binnen zo’n dertig kilometer van ons kantoor in Hulsberg. Dicht genoeg om snel aan tafel te zitten als dat nodig is.</p></div>
</div>
<div class="kort" style="grid-template-columns:2fr 1fr;margin-top:8mm">
  <div class="kort-item">''' + BEELD('nieuwe collega’s, samen op de foto', 'height:52mm;border-radius:2mm;margin-bottom:2.5mm') + '''<div class="kl">Team</div><h3>''' + VV('nieuwe collega’s of een mijlpaal van het team') + '''</h3>
    <p>''' + VV('twee of drie zinnen, met naam en wat ze komen doen') + '''</p></div>
  <div class="kort-item"><div class="kl">Veelgehoord</div><h3>“Moet ik dan stoppen met posten?”</h3>
    <p>Nee. Een verzorgd profiel op social media is goed voor je merk. Alleen is het geen manier om voorspelbaar nieuwe klanten te vinden. Daarover gaat het verhaal op pagina {p:krant}.</p></div>
</div>''')

# ================================================================ feature: van krant tot algoritme
KRANT_1 = pg('over-beeld', BEELD('een oude krantenpagina met advertenties, en een hand met een telefoon ervoor', 'position:absolute;inset:0;align-items:flex-start;padding:20mm 21mm') + '''<div class="verloop"></div>
''' + rubriek('Feature', 'De markt') + '''
<div class="tekstblok">
  <div class="kop-artikel" style="font-size:66pt">Van krant tot algoritme</div>
  <div class="intro-artikel" style="max-width:150mm">Elke generatie ondernemers had een vaste manier om klanten te vinden. Een advertentie in de krant, een spotje op de radio, een bericht op Facebook. Wat lang vanzelf werkte, werkt vandaag niet meer vanzelf. Wat er veranderde, en wat dat betekent voor wie nu wil groeien.</div>
  <div class="naamregel">Tekst James Robinson · Beeld ''' + VV('fotograaf') + '''</div>
</div>''')

KRANT_2 = pg('', rubriek('Feature', 'Van krant tot algoritme') + '''
<div class="tekst k3" style="margin-top:12mm">
  <p class="begin">Wie in de jaren zeventig een zaak opende, wist wat hem te doen stond. Een advertentie in de regionale krant, misschien een spotje op de lokale radio, een bord langs de doorgaande weg. Iedereen in de streek las dezelfde krant. Wie erin stond, bestond.</p>
  <p>Dertig jaar later verschoof dat naar internet. Eerst kwam de website, als digitaal visitekaartje. Daarna Google: wie bovenaan stond, kreeg de klanten. En toen kwam social media. Facebook, later Instagram en LinkedIn, beloofden iets wat nog nooit had bestaan: bereik zonder dat het iets kostte. Een goed bericht kon duizenden mensen bereiken, gewoon via de tijdlijn van je volgers.</p>
  <p>Die belofte is blijven hangen. Voor veel ondernemers is posten nog altijd het hart van hun marketing. Dat is begrijpelijk. Het is vertrouwd, je kunt het zelf, en je ziet het resultaat met eigen ogen op je telefoon. Alleen ziet bijna niemand anders het.</p>
  <h4>Het gratis bereik is op</h4>
  <p>In tien jaar zijn de grote platformen veranderd van een plek waar je gratis werd gezien in een marktplaats waar je betaalt voor aandacht. Dat is geen complot, het is hun verdienmodel. Google, Meta, LinkedIn en TikTok verdienen hun geld met advertenties. Hoe beter die advertenties werken, hoe meer bedrijven terugkomen.</p>
  <p>Ze hebben er dus alle belang bij dat jouw advertentie resultaat oplevert. Ze zijn er ook steeds beter in geworden: geen platform weet zo goed wie op het punt staat iets te kopen. Maar die kennis zetten ze alleen in als je ervoor betaalt.</p>
  <div class="streamer">“Een bericht bereikt vooral de mensen die je al kent. Groei zit bij de mensen die je nog niet kent.”</div>
  <p>Voor gewone berichten blijft weinig ruimte over. Een bedrijfspagina bereikt met een bericht gemiddeld één tot drie procent van de eigen volgers, blijkt uit recente cijfers van het onderzoeksbureau Socialinsider. Bij kleine pagina’s ligt dat wat hoger, maar zelden boven de zeven procent.</p>
  <p>En wie zijn die volgers eigenlijk? Kijk eens naar de eerste vijftig. Meestal zijn het bestaande klanten, oud-collega’s, familie, leveranciers en een paar concurrenten die je in de gaten houden. Allemaal mensen die je al kennen. De mensen die je nog niet kent, en die volgende maand je klant kunnen worden, zitten er nauwelijks tussen.</p>
  <h4>Posten heeft waarde. Maar een andere</h4>
  <p>Betekent dat dat je social media moet laten liggen? Nee. Een verzorgd profiel bouwt aan je merk. Het laat zien dat je bestaat, dat je zaak leeft, en het geeft mensen die je al kennen een reden om terug te komen. Wie op zoek is naar een nieuwe leverancier, kijkt vaak even op je Instagram of LinkedIn. Dan is het fijn als daar iets staat.</p>
</div>''' + fotoband('een ondernemer die op zijn telefoon door zijn eigen feed scrolt', 92, '<b>Vertrouwd.</b> Posten voelt als marketing: je ziet het zelf, dus het is er. Maar de meeste mensen die je nog niet kent, zien het niet.'))

KRANT_3 = pg('', rubriek('Feature', 'Van krant tot algoritme') + '''
<div class="tekst k3" style="margin-top:12mm">
  <p class="na-kop">Alleen is het geen manier om voorspelbaar nieuwe klanten te vinden. Viraal gaan kan, maar niemand kan het plannen, en op toeval bouw je geen omzet. Bovendien is posten minder gratis dan het lijkt. Iemand moet het bedenken, fotograferen, schrijven en plaatsen, elke week opnieuw. Die tijd is geld, en het bereik dat je ervoor terugkrijgt, is klein en niet te sturen.</p>
  <h4>Adverteren draait het om</h4>
  <p>Bij adverteren kies je zelf wie je ziet. Mensen in jouw regio. Met een bepaalde functie of in een bepaalde branche. Die net zochten op precies wat jij aanbiedt, of die vorige week op je website waren en nog twijfelen. Je ziet per euro wat het oplevert, en wat niet werkt, zet je uit.</p>
  <p>Dat vraagt ook iets: goede content, een budget, en geduld in de eerste maanden. Daar komen we later in dit magazine op terug. Maar het levert iets op wat posten niet kan: een voorspelbare stroom nieuwe aanvragen, die je kunt laten groeien als het werkt.</p>
</div>
<div class="kaderblok" style="margin-top:6mm">
  <div class="kl">Rekenvoorbeeld</div><h3>Wie je bereikt</h3>
  ''' + staven([
    ('Een bericht', 30, GRIJS, 'naar 1.000 volgers, 3% bereik'),
    ('€ 50 aan advertenties', 7000, BLAUW, 'bij € 7 per 1.000 weergaven'),
], b=112, rij=12) + '''
  <div class="bijschrift">Een rekenvoorbeeld, geen belofte. Wat 1.000 weergaven kosten, verschilt per doelgroep, kanaal en seizoen. Het bereik van een bericht: Socialinsider, Social Media Benchmarks 2026.</div>
</div>
<table style="margin-top:6mm;font-size:8.4pt">
  <tr><th style="width:24%"></th><th>Een bericht plaatsen</th><th style="color:var(--blue)">Adverteren</th></tr>
  <tr><td>Wat het kost</td><td>Vooral tijd, elke week opnieuw</td><td>Tijd voor goede content, plus budget</td></tr>
  <tr><td>Wie het ziet</td><td>Een klein deel van je volgers</td><td>Mensen die jij kiest, ook nieuwe</td></tr>
  <tr><td>Sturen</td><td>Plaatsen en afwachten</td><td>Meten, bijsturen, opschalen</td></tr>
  <tr><td>Goed voor</td><td>Je merk en je vaste klanten</td><td>Nieuwe klanten, voorspelbaar</td></tr>
</table>''')

KRANT_4 = pg('', rubriek('Feature', 'Van krant tot algoritme') + '''
<div class="tekst k3" style="margin-top:12mm">
  <h4 style="margin-top:0">Hoe de platformen leren</h4>
  <p class="na-kop">De algoritmes van Google en Meta kunnen niet lezen wat jij goed vindt aan je product. Ze kunnen wel meten. Wie klikt, wie haakt af, wie vult een formulier in. Met elke weergave leren ze beter wie jouw klant is. Daarvoor hebben ze data nodig, en data komt pas met tijd en budget.</p>
  <p>Daarom beginnen we breed. We testen verschillende doelgroepen, boodschappen en beelden naast elkaar. Na een paar weken zie je wat aanslaat. Wat werkt, krijgt meer budget. Wat niet werkt, stopt. Zo wordt elke maand een beetje slimmer dan de vorige.</p>
  <h4>Elk kanaal is een veiling</h4>
  <p class="na-kop">Elk advertentiekanaal werkt als een veiling. Willen veel bedrijven dezelfde doelgroep of hetzelfde zoekwoord bereiken, dan stijgt de prijs. Een installateur betaalt in een koude winterweek meer voor een klik op “cv-ketel storing” dan in juli. Een makelaar betaalt meer in een drukke markt dan in een rustige.</p>
  <p>Het vak zit in de mix: op het juiste moment, bij de juiste mensen, met de juiste boodschap, tegen een prijs die uit kan. Dat is geen eenmalige instelling. Het is werk dat elke week doorgaat.</p>
  <p class="einde">De vraag is dus niet of je zichtbaar bent. De vraag is of je zichtbaar bent bij de mensen die morgen je klant kunnen worden.</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1.25fr;gap:6mm;position:absolute;left:23mm;right:21mm;bottom:24mm">
  <div class="kaderblok donker">
    <div class="kl">Wat dit voor jou betekent</div>
    <ol>
      <li><b>Houd je profiel verzorgd.</b> Goed voor je merk en voor wie je al kent.</li>
      <li><b>Zoek groei niet in berichten.</b> Nieuwe klanten vind je gericht, met advertenties.</li>
      <li><b>Geef het tijd.</b> De eerste weken zijn leren. Daarna gaat het sneller.</li>
      <li><b>Stuur op cijfers.</b> Niet op likes, wel op aanvragen en wat ze kosten.</li>
    </ol>
  </div>
  <div>''' + BEELD('een campagne op verschillende schermen', 'height:74mm;border-radius:3mm') + '''
    <div class="bijschrift"><b>Gericht.</b> Eén campagne, zichtbaar op Google, Instagram en LinkedIn, steeds bij de mensen die het meest op je klant lijken.</div>
  </div>
</div>''')

# ================================================================ feature: tot aan de voordeur
DEUR_1 = pg('over-beeld', BEELD('een voordeur op een kier, warm licht, of een telefoon die op tafel overgaat', 'position:absolute;inset:0;align-items:flex-start;padding:20mm 23mm') + '''<div class="verloop"></div>
''' + rubriek('Verhaal', 'Een les uit de praktijk') + '''
<div class="tekstblok">
  <div class="kop-artikel" style="font-size:70pt">Tot aan de voordeur</div>
  <div class="intro-artikel" style="max-width:150mm">Een nieuwe speler in een kleine markt. Een campagne die beter liep dan iemand had verwacht. En toch zegde hij op. Het verhaal van Ruud vertellen we aan elke nieuwe klant.</div>
  <div class="naamregel">Tekst James Robinson · Ruud heet in werkelijkheid anders</div>
</div>''')

DEUR_2 = pg('', rubriek('Verhaal', 'Tot aan de voordeur') + '''
<div class="tekst k3" style="margin-top:12mm">
  <p class="begin">Een paar jaar geleden zat Ruud bij ons aan tafel. Een ondernemer met ambitie, net begonnen in een nichemarkt waar een handvol gevestigde namen de dienst uitmaakte. Hun websites stonden bovenaan in Google, hun namen kende iedereen in de branche. Ruud was de nieuwkomer, en dat wist hij.</p>
  <p>Toch zagen we ruimte. Zijn aanbod was scherp, zijn prijs eerlijk, en er werd genoeg gezocht op wat hij deed. We besloten te beginnen met Google Ads: adverteren bij mensen die op dat moment actief zochten naar precies zijn dienst.</p>
  <h4>Zoeken, bijsturen, en dan kantelt het</h4>
  <p>De eerste weken waren zoeken. Welke zoekwoorden leverden aanvragen op, en welke alleen kliks? Welke advertentietekst sprak aan? Op welke uren en in welke plaatsen zat de vraag? We stelden bij, schoven met budget en testten opnieuw.</p>
  <p>En toen kantelde het. De aanvragen kwamen binnen, eerst een paar per week, daarna bijna elke dag. Meer dan we vooraf hadden ingeschat. In de periodieke overleggen ging het over de cijfers, en die zagen er goed uit. Wij tevreden, Ruud tevreden. Dachten we.</p>
  <div class="streamer">“De campagne deed precies wat ze moest doen. Alleen deed niemand de deur open.”</div>
  <h4>Dan komt de opzegging</h4>
  <p>Op een dag kwam er een mail. Ruud zegde op. Zijn reden was kort: het leverde hem geen klanten op.</p>
  <p>Bij ons gingen alle alarmbellen af. Kwamen de aanvragen wel echt binnen? Klopte onze meting? Was de kwaliteit misschien slecht, en hadden we dat over het hoofd gezien? We doken erin en controleerden alles, aanvraag voor aanvraag.</p>
  <p>De aanvragen waren echt. Het waren mensen uit de juiste regio, met precies de vraag waarvoor Ruud zijn bedrijf was begonnen. Aan de campagne lag het niet.</p>
  <h4>Zeven dagen</h4>
  <p>Het antwoord kwam pas toen we Ruud vroegen hoe hij zijn aanvragen opvolgde. Hij belde ze na een dag of zeven. Bewust. Ze hadden net een heel formulier ingevuld, legde hij uit. Dan wilde hij ze niet meteen lastigvallen. Hij wilde niet opdringerig overkomen.</p>
</div>''' + fotoband('een telefoon met gemiste oproepen, of een agenda met een omcirkelde datum', 88, '<b>Zeven dagen.</b> Zo lang wachtte Ruud met terugbellen. Lang genoeg voor zijn klanten om ergens anders te boeken.', 'r'))

DEUR_3 = pg('', rubriek('Verhaal', 'Tot aan de voordeur') + '''
<div style="display:grid;grid-template-columns:2fr 1fr;gap:7mm;margin-top:12mm">
  <div class="tekst k2">
    <p class="na-kop">Vanuit Ruud gezien was dat beleefd. Vanuit zijn klant gezien was het stilte. Wie een aanvraag doet, heeft op dat moment een vraag of een probleem, en wil verder. Hoort hij een paar dagen niets, dan zoekt hij verder. De concurrent die wel binnen het uur belde, kreeg de opdracht.</p>
    <p>Zo leverde een campagne die alles deed wat ze moest doen, toch geen klanten op. Niet omdat er iets mis was met de advertenties, maar omdat er niemand opendeed.</p>
    <h4>Waar ons werk ophoudt</h4>
    <p class="na-kop">Ruud is bij ons een begrip geworden. Niet omdat hij iets doms deed, maar omdat zijn verhaal laat zien waar het in marketing vaak misgaat: precies op het moment dat het werk van het bureau ophoudt en dat van de ondernemer begint.</p>
    <p>Onze rol is helder. Wij zorgen dat de juiste mensen je vinden, dat ze een aanvraag doen, en dat die aanvraag van goede kwaliteit is. Mensen die klaar zijn om te kopen, afgeleverd tot aan je voordeur. Wat daarna gebeurt, bepaal jij: hoe snel je belt, hoe je het gesprek voert, wat je aanbiedt.</p>
    <p class="einde">We denken daar graag over mee. Maar we spreken het vooraf af, zodat we allebei weten wie waarvoor verantwoordelijk is. En we meten het, vanaf de eerste dag.</p>
    <div style="column-span:all;margin-top:6mm">''' + BEELD('het team bespreekt de aanvragen van een klant in het portaal', 'height:96mm;border-radius:3mm') + '''<div class="bijschrift"><b>Kwaliteit boven aantal.</b> In het portaal geeft de klant per aanvraag aan of die goed was. Zo sturen we op aanvragen die klant worden.</div></div>
  </div>
  <div class="kaderblok blauw-k">
    <div class="kl">De cijfers</div><h3>Snelheid wint</h3>
    <div class="cijfer" style="border-color:var(--deep);margin-top:3mm"><div class="n" style="font-size:42pt">7×</div><div class="t" style="font-size:8.6pt">zo vaak een serieus gesprek voor bedrijven die binnen een uur reageerden, vergeleken met een uur later.</div></div>
    <div class="cijfer" style="border-color:var(--deep);margin-top:4mm"><div class="n" style="font-size:32pt">42 uur</div><div class="t" style="font-size:8.6pt">was de gemiddelde reactietijd van bedrijven die wel reageerden.</div></div>
    <div class="cijfer" style="border-color:var(--deep);margin-top:4mm"><div class="n" style="font-size:32pt">23%</div><div class="t" style="font-size:8.6pt">reageerde nooit.</div></div>
    <div class="bijschrift" style="margin-top:4mm">Oldroyd, McElheran &amp; Elkington, The Short Life of Online Sales Leads, Harvard Business Review, 2011. Ruim 2.200 bedrijven en 1,25 miljoen aanvragen.</div>
  </div>
</div>''')

DEUR_4 = pg('', rubriek('Verhaal', 'Tot aan de voordeur') + '''
<div class="kicker" style="margin-top:12mm">Wie doet wat</div>
<h2 style="font-size:28pt">Tot de voordeur zijn wij. Daarna ben jij aan zet.</h2>
<div class="voordeur">
  <div class="st"><b>Gezien</b>De juiste mensen zien je advertentie</div>
  <div class="st"><b>Geklikt</b>Ze komen op je website</div>
  <div class="st"><b>Overtuigd</b>Je pagina neemt twijfel weg</div>
  <div class="st"><b>Aanvraag</b>Een kwalitatieve aanvraag</div>
  <div class="deur">Voordeur</div>
  <div class="st jij"><b>Klant</b>Jouw gesprek, jouw aanbod</div>
</div>
<div class="wie-rij"><div class="o">James Robinson</div><div></div><div class="j">Jij</div></div>
<div class="kaderblok" style="margin-top:9mm">
  <div class="kl">Praktisch</div><h3>Vijf gewoontes van ondernemers die meer aanvragen omzetten</h3>
  <ol style="columns:2;column-gap:7mm">
    <li><b>Bel binnen het uur.</b> Wie snel reageert, spreekt de klant terwijl de vraag nog speelt.</li>
    <li><b>Regel een vervanger.</b> Ook tijdens vakantie, ziekte of een drukke week.</li>
    <li><b>Probeer het vaker dan één keer.</b> Niet opgenomen? Bel later terug en stuur een kort bericht.</li>
    <li><b>Ken je eerste vragen.</b> Een vaste opening maakt elk gesprek beter en sneller.</li>
    <li><b>Geef elke aanvraag een oordeel.</b> In je portaal, met één klik: goed of niet, en later of het een klant werd. Zo sturen wij op kwaliteit, niet alleen op aantal.</li>
  </ol>
</div>
''' + BEELD('een ondernemer aan de telefoon in zijn zaak', 'height:62mm;border-radius:3mm;margin-top:7mm'))

BACK = v3.O(24)

PAGINAS = [('cover', COVER), ('', INHOUD_L), ('', INHOUD_R), ('', v3.JIM), ('', v3.VERKLARING),
           ('', KORT_L), ('', KORT_R), ('', KRANT_1), ('', KRANT_2), ('', KRANT_3), ('', KRANT_4),
           ('', DEUR_1), ('', DEUR_2), ('', DEUR_3), ('', DEUR_4), ('back', BACK)]

def plaats(nr, html, totaal):
    kant = 'r' if nr % 2 == 1 else 'l'
    html = re.sub(r'<div class="folio">.*?</div>\s*(?=</section>)', '', html, flags=re.S)
    def klassen(m):
        rest = [k for k in m.group(1).split() if k not in ('pg', 'l', 'r', 'x')]
        return '<section class="%s"' % ' '.join(['pg', kant] + rest)
    html = re.sub(r'<section class="([^"]*)"', klassen, html, count=1)
    if nr not in (1, totaal):
        f = '<b>%02d</b><span>%s</span>' % (nr, TITEL) if kant == 'l' else '<span>%s</span><b>%02d</b>' % (TITEL, nr)
        html = html.replace('</section>', '<div class="folio">%s</div></section>' % f)
    return html

body = '\n'.join(plaats(i + 1, p, len(PAGINAS)) for i, (_, p) in enumerate(PAGINAS))
body = re.sub(r'\{p:(\w+)\}', lambda m: '%02d' % PLAN.get(m.group(1), 0), body)
css = ''.join(open(os.path.join(HIER, f)).read() for f in ('magazine.css', 'magazine-extra.css', 'magazine-v3.css', 'magazine-artikel.css'))
open(os.path.join(HIER, 'proefkatern.html'), 'w').write(
    '<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>%s · proefkatern</title><style>%s</style></head><body>\n%s\n</body></html>' % (TITEL, css, body))
print(len(PAGINAS), "pagina's")
