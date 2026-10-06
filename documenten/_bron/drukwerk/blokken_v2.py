# -*- coding: utf-8 -*-
# Pagina's uit versie 2 die in versie 3 (nog) terugkomen.
import re, json, os
HIER = os.path.dirname(os.path.abspath(__file__))
OUD = json.load(open(os.path.join(HIER, 'oude-paginas.json')))
O = lambda n: OUD[n - 1]

def pg(cls, body):
    return '<section class="pg x %s">%s</section>' % (cls, body)

VV = lambda t: '<span class="vv">[%s]</span>' % t
BEELD = lambda t, st='': '<div class="beeld" style="%s"><span>Beeld: %s</span></div>' % (st, t)

# ---------------------------------------------------------------- nieuw
QUOTE = pg('blauw', '''
<div style="margin-top:50mm"><div class="quote">Wij beloven geen resultaat. Wij beloven dat we het zelf zeggen als het niet werkt.</div>
<div class="wie-zegt"><b>Spelregel 1</b>Cijfers zijn leidend</div></div>''')

VOORWOORD = pg('', '''
<div class="concept">Concepttekst, door Jim te herschrijven</div>
''' + BEELD('Jim Coumans of Jim Kikken, op kantoor in Hulsberg', 'position:absolute;left:0;right:0;top:0;height:122mm') + '''
<div style="margin-top:110mm">
  <div class="kicker">Voorwoord</div>
  <h2 style="font-size:30pt">Ons succes is jullie succes. Niet meer en niet minder.</h2>
  <div class="kol2">
    <p>Onze winst is niet een zo hoog mogelijke maandfactuur. Onze winst is dat we je doelen keer op keer halen, dat je blij bent met wat het oplevert, en dat we over tien jaar nog steeds voor je werken.</p>
    <p>Vraag je je over drie of zes maanden af wat marketing je bedrijf oplevert, dan hebben wij een groter probleem dan een lagere factuur. Daarom zetten we liever een deel van ons werk om in advertentiebudget dan dat we uren steken in iets wat weinig oplevert.</p>
    <p>In dit magazine staat hoe we werken. Ook wat we niet doen, wat het kost en wat we van jou nodig hebben. We hebben het zo opgeschreven dat je het kunt narekenen.</p>
    <p style="margin-top:5mm"><b>''' + VV('Jim Coumans of Jim Kikken') + '''</b><br><span class="klein">Eigenaar, James Robinson</span></p>
  </div>
</div>''')

HISTORIE = pg('', '''
<div class="kicker">Ons verhaal</div>
<h2>Van idee in 2017 tot een bureau met een vast product.</h2>
<ul class="jaren">
  <li><span class="j">2017</span><div><h3>Het idee</h3><p>James Robinson wordt bedacht. ''' + VV('hoe het begon, waar de naam vandaan komt') + '''</p></div></li>
  <li><span class="j">2018</span><div><h3>Opgericht in Hulsberg</h3><p>''' + VV('de eerste klanten, het eerste kantoor') + '''</p></div></li>
  <li><span class="j">''' + VV('jaar') + '''</span><div><h3>''' + VV('mijlpaal') + '''</h3><p>''' + VV('bijvoorbeeld de eerste medewerker, het eerste grote project') + '''</p></div></li>
  <li><span class="j">2022</span><div><h3>Jim Kikken wordt mede-eigenaar</h3><p>Met zijn specialisme, data-gedreven performance marketing, verschuift het zwaartepunt naar meetbaar resultaat.</p></div></li>
  <li><span class="j">''' + VV('jaar') + '''</span><div><h3>Ons kantoor</h3><p>''' + VV('de verhuizing naar het huidige kantoor') + '''</p></div></li>
  <li><span class="j">2026</span><div><h3>Een vast product</h3><p>We stoppen met alles tegelijk doen. Eén fundament, vaste pakketten, één adres voor alles, en een eigen portaal met je cijfers.</p></div></li>
</ul>''')

KANTOOR_BEELD = pg('zwart', BEELD('ons kantoor in Hulsberg, van buiten of de mooiste ruimte binnen', 'position:absolute;inset:0;align-items:flex-start;padding:20mm 23mm') + '''
<div style="position:absolute;left:21mm;right:23mm;bottom:30mm;z-index:2">
  <div class="kicker">Ons kantoor</div>
  <h2 style="font-size:44pt;color:#fff">Welkom in Hulsberg.</h2>
</div>''')

KANTOOR = pg('', '''
<div class="kicker">Ons kantoor</div>
<h2>Hier zit je aan tafel. Niet in een vergaderhok.</h2>
<p class="intro">''' + VV('wat het kantoor bijzonder maakt: de plek, het gebouw, wat er te doen is') + '''</p>
<div class="kol2">
  <p><b>Je Performance Review</b> houden we hier of online. Een uur, met de cijfers op tafel en een kop koffie erbij.</p>
  <p><b>De draaidag</b> is bij jou op locatie. Wat we daarna maken, maken we hier.</p>
  <p>''' + VV('faciliteiten: studio, ruimte voor sessies, parkeren, bereikbaarheid') + '''</p>
  <p>''' + VV('waarom het kantoor bij ons verhaal past') + '''</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:8mm">''' + BEELD('detail kantoor', 'height:60mm;border-radius:4mm') + BEELD('het team aan het werk', 'height:60mm;border-radius:4mm') + '''</div>
<p class="klein" style="margin-top:5mm">''' + VV('adres') + ''' · Hulsberg · kantoor 045 792 0009</p>''')

PLOEG_DUO = pg('', '''
<div class="kicker">De ploeg</div>
<h2>De eigenaren.</h2>
<div class="duo">
  <div>''' + BEELD('Jim Coumans') + '''<div class="persoon"><b>Jim Coumans</b><span>Oprichter en eigenaar</span><p>Marketing, merk en groei van James Robinson. ''' + VV('één zin in eigen woorden') + '''</p></div></div>
  <div>''' + BEELD('Jim Kikken') + '''<div class="persoon"><b>Jim Kikken</b><span>Eigenaar</span><p>Data-gedreven performance marketing. ''' + VV('één zin in eigen woorden') + '''</p></div></div>
</div>
<p class="intro" style="margin-top:9mm;font-size:11.5pt">Ongeveer tien mensen. Zeven van hen begonnen hier als stagiair. We leiden mensen zelf op, in onze eigen manier van werken.</p>''')

def lid(i):
    return '<div>' + BEELD('teamlid', 'height:44mm;border-radius:3mm;padding:3mm') + '<div class="persoon"><b>' + VV('naam') + '</b><span>' + VV('rol') + ' · ' + VV('specialisme') + '</span></div></div>'
PLOEG = pg('', '''
<div class="kicker">De ploeg</div>
<h2>Wie er aan je campagne werkt.</h2>
<div class="ploeg">''' + ''.join(lid(i) for i in range(9)) + '''</div>''')

SLIM1 = pg('zwart', '''
<div class="kicker">Slimmer werken</div>
<h2>Mensen beslissen. Machines doen het werk waar fouten in sluipen.</h2>
<p class="intro">We zetten AI en automatisering in waar het je iets oplevert: minder fouten, sneller bijsturen, en meer werk voor hetzelfde geld. Niet om mensen te vervangen, wel om ze vrij te maken voor wat telt.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:10mm">
  <div class="cijfer"><div class="n">7.00</div><div class="t">Elke ochtend een dagmail met alles wat buiten de lijntjes loopt, voor al onze klanten. Bovenaan in rood.</div></div>
  <div class="cijfer"><div class="n">24/7</div><div class="t">We volgen uitgaven, afgekeurde advertenties, de meting en je landingspagina doorlopend.</div></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:8mm">
  <div class="cijfer"><div class="n">1×</div><div class="t">Je merk één keer vastleggen: kleuren, letters, toon. Daarna klopt elke uiting ermee, ook de duizendste.</div></div>
  <div class="cijfer"><div class="n">0</div><div class="t">Getallen die we met de hand overtypen. Je dashboard haalt ze zelf op.</div></div>
</div>''')

SLIM2 = pg('', '''
<div class="kicker">Slimmer werken</div>
<h2>Wat het jou oplevert.</h2>
<ol class="lijst" style="margin-top:4mm">
  <li><h3>Je ziet wat wij zien</h3><p style="margin:0">Je eigen marketingdashboard, met de vier ketengetallen en de kosten per aanvraag. Elk uur bijgewerkt, zonder dat iemand iets hoeft over te typen.</p></li>
  <li><h3>We zien een probleem voordat jij het merkt</h3><p style="margin:0">Besteedt een campagne niets, wordt een advertentie afgekeurd of komen er geen aanvragen meer binnen, dan staat het de volgende ochtend bovenaan bij ons.</p></li>
  <li><h3>Meer varianten, altijd on-brand</h3><p style="margin:0">Met je merk vastgelegd in ons portaal maken we sneller nieuwe advertenties om te testen. Hoeveel varianten zinvol zijn, hangt af van je budget: testen vraagt verkeer.</p></li>
  <li><h3>Vaste stappen, minder vergeten</h3><p style="margin:0">Elke start volgt dezelfde 76 taken, met checklists. Wat een machine kan controleren, controleert een machine.</p></li>
</ol>
<div class="kader" style="margin-top:8mm"><h3>Wat AI bij ons niet doet</h3><p style="margin:0">Beslissen over je budget, je doelgroep of je merk. Dat doen mensen, met jou.</p></div>''')

def logo(i):
    return '<div><b>' + ('Thiessen Wijnkoopers' if i == 0 else '[logo]') + '</b>' + ('' if i == 0 else '<span>met toestemming</span>') + '</div>'
LOGOS = pg('', '''
<div class="kicker">Voor wie we werken</div>
<h2>Ondernemers in Limburg en daarbuiten.</h2>
<p class="intro">Van wijnhandel tot makelaar, van garage tot zorgpraktijk. Wat ze gemeen hebben: ze willen dat marketing zich terugverdient.</p>
<div class="logos">''' + ''.join(logo(i) for i in range(16)) + '''</div>
<div class="branches"><span>Horeca</span><span>Makelaardij</span><span>Automotive</span><span>Retail</span><span>Zakelijke dienstverlening</span><span>Zorg</span><span>Overheid</span><span>Sport en vrije tijd</span></div>''')

REVIEWS = pg('grijs', '''
<div class="kicker">Wat klanten zeggen</div>
<h2>In hun eigen woorden.</h2>
<div class="reviews">''' + ''.join('<div class="review" style="background:#fff"><div class="sterren">★★★★★</div><div class="q">' + VV('letterlijke quote, met toestemming') + '</div><div class="w">' + VV('naam') + ' · ' + VV('bedrijf, branche') + '</div></div>' for i in range(4)) + '''</div>
<div class="cijfer" style="margin-top:10mm"><div class="n">''' + VV('4,9') + '''</div><div class="t">gemiddeld op Google, uit ''' + VV('aantal') + ''' reviews.</div></div>''')

def case(n):
    a = pg('', BEELD('de klant, zijn zaak of zijn product', 'position:absolute;left:0;right:0;top:0;height:150mm') + '''
<div style="margin-top:138mm">
  <div class="case-kop"><span class="chip">Case ''' + str(n) + '''</span><span class="chip">''' + VV('branche') + '''</span></div>
  <h2 style="font-size:30pt">''' + VV('klantnaam') + ': ' + VV('het resultaat in één zin') + '''</h2>
  <div class="saa">
    <div><h3>De situatie</h3><p>''' + VV('waar de klant stond, en wat het probleem kostte') + '''</p></div>
    <div><h3>Wat we deden</h3><p>''' + VV('welke campagne, welke kanalen, wat we aan de landingspagina veranderden') + '''</p></div>
    <div><h3>Wat het opleverde</h3><p>''' + VV('aanvragen, kosten per aanvraag, omzet') + '''</p></div>
  </div>
</div>''')
    b = pg('', '''
<div class="kicker">Case ''' + str(n) + '''</div>
<div class="resultaten" style="grid-template-columns:1fr;gap:8mm;margin-top:8mm">
  <div class="cijfer"><div class="n">''' + VV('+00') + '''</div><div class="t">aanvragen per maand, van ''' + VV('x') + ''' naar ''' + VV('y') + '''</div></div>
  <div class="cijfer"><div class="n">''' + VV('€ 00') + '''</div><div class="t">per aanvraag, was ''' + VV('€ x') + '''</div></div>
  <div class="cijfer"><div class="n">''' + VV('00') + '''</div><div class="t">maanden tot het fundament zich terugverdiende</div></div>
</div>
<div class="kader" style="margin-top:10mm"><div class="quote" style="font-size:20pt">''' + VV('quote van de klant over het resultaat of de samenwerking') + '''</div><p class="klein" style="margin-top:4mm">''' + VV('naam, functie, bedrijf') + '''</p></div>
<p class="klein" style="margin-top:6mm">Cijfers uit het marketingdashboard van de klant, met diens toestemming gedeeld.</p>''')
    return [a, b]

TUSSEN = pg('blauw', '''
<div style="position:absolute;left:21mm;right:23mm;top:90mm">
  <div class="kicker">Deel 2</div>
  <h2 style="font-size:58pt">Wat betekent dat voor jou?</h2>
  <p class="intro" style="max-width:140mm">Je doel in cijfers, het plan, wat het kost, en wat we van elkaar afspreken.</p>
</div>''')

DOEL = pg('', '''
<div class="kicker">Jouw doel in cijfers</div>
<h2>We beginnen bij jouw doel. Niet bij ons pakket.</h2>
<p class="intro">Wat mag marketing jou kosten? Dat rekenen we samen uit, met jouw getallen. Het pakket volgt daaruit.</p>
<ol class="lijst">
  <li><h3>1 · Hoeveel nieuwe klanten heb je nodig?</h3><p style="margin:0">De extra omzet die je wilt, gedeeld door wat een klant je per jaar oplevert.</p></li>
  <li><h3>2 · Hoeveel aanvragen horen daarbij?</h3><p style="margin:0">Hoeveel van je aanvragen worden klant? Weet je het niet, dan rekenen we met een op de vijf.</p></li>
  <li><h3>3 · Wat mag alle marketing samen kosten?</h3><p style="margin:0">Extra omzet keer je marge. Standaard verdient alles zich binnen twaalf maanden terug.</p></li>
  <li><h3>4 · Wat blijft er over voor advertenties?</h3><p style="margin:0">Daar gaan het fundament, de maandelijkse samenwerking en de licenties af. De rest is je advertentiebudget, en dat bepaalt je pakket.</p></li>
  <li><h3>5 · Wat mag een aanvraag kosten?</h3><p style="margin:0">Het advertentiebudget gedeeld door het aantal aanvragen. Dat is het plafond waarop we bieden.</p></li>
</ol>
<div class="doelregel" style="background:var(--blue);color:#fff;border-radius:4mm;padding:6mm;margin-top:6mm">
  <p class="klein" style="color:rgba(255,255,255,.8);margin-bottom:2mm">Het eindigt in één zin die je kunt onthouden en narekenen. Uit het rekenvoorbeeld op de volgende pagina:</p>
  <p class="d" style="font-size:16pt;margin:0;line-height:1.4">“10 extra aanvragen per maand, tegen maximaal € 187 per aanvraag aan advertenties, vanaf maand 4.”</p>
</div>''')

VIER_WEKEN = pg('', '''
<div class="kicker">Het fundament, dag voor dag</div>
<h2>Van handtekening tot live in vier weken.</h2>
<p class="intro">De klok start zodra alle toegangen binnen zijn. Elke dag dat we op een toegang of akkoord wachten, schuift alles op.</p>
<table class="som" style="font-size:9.5pt">
  <tr><td><b>Binnen 3 werkdagen</b><small>na het tekenen</small></td><td style="text-align:left;font-weight:400">Onboardingformulier en alle toegangen, in één sessie van 45 minuten</td></tr>
  <tr><td><b>Dag 1</b></td><td style="text-align:left;font-weight:400">De klok start. Wij beginnen met de technische check</td></tr>
  <tr><td><b>Dag 2 tot 4</b></td><td style="text-align:left;font-weight:400">Doelgroep, boodschap en zoekwoorden</td></tr>
  <tr><td><b>Dag 4</b></td><td style="text-align:left;font-weight:400">Wat technisch niet deugt, met wat herstel kost. Jij beslist</td></tr>
  <tr><td><b>Dag 5 tot 10</b></td><td style="text-align:left;font-weight:400">Advertentieaccounts, e-mail, je dashboard en de meting</td></tr>
  <tr><td><b>Dag 10 tot 16</b></td><td style="text-align:left;font-weight:400">Campagne en landingspagina bouwen</td></tr>
  <tr><td><b>Week 3 of 4</b></td><td style="text-align:left;font-weight:400">De draaidag bij jou op locatie</td></tr>
  <tr class="tot"><td>Dag 19</td><td style="text-align:left">Live</td></tr>
  <tr><td><b>Dag 26</b></td><td style="text-align:left;font-weight:400">De eerste cijfers</td></tr>
</table>''')

FUNDAMENT = pg('', '''
<div class="kicker">Het fundament</div>
<h2>Eén keer goed neerzetten.</h2>
<div style="display:flex;align-items:baseline;gap:3mm;margin:2mm 0 6mm"><div class="prijs">€ 4.500</div><span class="klein">eenmalig, bij ondertekening</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm">
  <div class="deel"><div class="pct">Deel 1 · De basis</div><ul class="lijst"><li>Doelgroep, boodschap en concurrenten</li><li>Technische check en meting</li><li>Advertentieaccounts op jouw naam</li><li>E-mail met je contacten</li><li>Je marketingdashboard</li><li>De nulmeting</li></ul></div>
  <div class="deel b"><div class="pct">Deel 2 · Je eerste campagne</div><ul class="lijst"><li>Zoekwoorden, structuur, advertenties</li><li>Een landingspagina met formulier</li><li>Een dagdeel filmen bij jou</li><li>Montage in drie formaten, plus foto’s</li><li>Livegang, testaanvraag, eerste week dagelijks</li></ul></div>
</div>
<p style="margin-top:6mm"><b>Niet los verkrijgbaar.</b> De basis zonder campagne is een stopcontact zonder apparaat. Een campagne zonder basis levert aanvragen op die je niet kunt meten of verbeteren.</p>
<p class="klein">Een dag filmen kost bij een extern bureau al snel € 1.500. Het fundament krijg je na de start niet terug: dat werk is gedaan.</p>''')

def pk(naam, prijs, c, budget, cr, dd, pr, uit=False):
    return '<div class="pakket%s"><div class="naam">%s</div><div class="bedrag">%s</div><div class="pm">per maand</div><ul><li><b>Campagnes tegelijk</b>%s</li><li><b>Advertentiebudget</b>%s</li><li><b>Contentrondes</b>%s</li><li><b>Draaidagen</b>%s</li><li><b>Performance Review</b>%s</li></ul></div>' % (' uit' if uit else '', naam, prijs, c, budget, cr, dd, pr)
PAKKETTEN = pg('', '''
<div class="kicker">De pakketten</div>
<h2>Iedereen krijgt hetzelfde werk. Het pakket bepaalt hoeveel.</h2>
<p class="intro">Welk pakket bij je past, volgt uit je rekensom. De namen komen uit de sport.</p>
<div class="pakketten">''' + pk('Starter', '€ 1.000', '1', '€ 1.000 – 2.500', 'elk kwartaal', '1 per jaar', 'elk kwartaal') + pk('Playmaker', '€ 1.500', '2', '€ 2.500 – 5.000', 'elke 2 maanden', '2 per jaar', 'elke 2 maanden', True) + pk('Captain', '€ 2.000', '3', '€ 5.000 – 7.500', 'maandelijks', '3 per jaar', 'maandelijks') + pk('Champion', '€ 2.500', '4', 'vanaf € 7.500', '2 per maand', '4 per jaar', 'maandelijks') + '''</div>
<div class="kol2" style="margin-top:7mm">
  <p><b>Altijd vanaf maand 2.</b> De maandelijkse samenwerking start na het fundament. Het advertentiebudget betaal je rechtstreeks aan de platformen.</p>
  <p><b>Het hoogste van twee telt:</b> campagnes of budget. Omhoog gaat per direct, omlaag per de eerste van de maand.</p>
  <p><b>Eén campagne</b> is één aanbod, voor één doelgroep, met één landingspagina. Op Google en Meta samen is het nog steeds één campagne.</p>
  <p><b>Liever één kanaal goed dan drie half.</b> Per kanaal minimaal € 500 per campagne per maand, op LinkedIn € 1.000.</p>
</div>''')

OPTIES = pg('', '''
<div class="kicker">Licenties en opties</div>
<h2>Wat op jouw naam staat.</h2>
<p class="intro">Alleen de maandelijkse samenwerking en het dashboard gaan naar ons. De rest staat op jouw naam en factureert de leverancier rechtstreeks.</p>
<table>
  <tr><th>Wat</th><th>Wanneer</th><th style="text-align:right">Bedrag</th></tr>
  <tr><td style="color:var(--black)"><b>Marketingdashboard</b></td><td>Altijd. Blijft van jou als je stopt</td><td style="text-align:right">€ 25 p/m</td></tr>
  <tr><td style="color:var(--black)"><b>E-mail (MailerLite)</b></td><td>Altijd, naar lijstgrootte</td><td style="text-align:right">€ 9,90 – 73 p/m</td></tr>
  <tr><td style="color:var(--black)"><b>Cookiemelding</b></td><td>Altijd: zonder toestemming mag je niet meten</td><td style="text-align:right">€ 150 p/j</td></tr>
  <tr><td style="color:var(--black)"><b>Klikfraudebescherming</b></td><td>Optioneel, jij beslist</td><td style="text-align:right">vanaf $ 99 p/m</td></tr>
  <tr><td style="color:var(--black)"><b>Bezoekersherkenning (Leadinfo)</b></td><td>Optioneel, alleen zakelijk</td><td style="text-align:right">€ 69 – 179 p/m</td></tr>
  <tr><td style="color:var(--black)"><b>Afsprakenplanner</b></td><td>Optioneel, per gebruiker</td><td style="text-align:right">€ 15 p/m</td></tr>
  <tr><td style="color:var(--black)"><b>Hosting en onderhoud</b></td><td>Alleen als je overstapt; migratie is gratis</td><td style="text-align:right">€ 85 p/m</td></tr>
</table>
<h3 style="margin-top:8mm">Alleen als de quickscan het vindt</h3>
<table>
  <tr><td style="color:var(--black)">Snelheid van de site zelf</td><td style="text-align:right">€ 750</td></tr>
  <tr><td style="color:var(--black)">Redirects en dode links</td><td style="text-align:right">€ 500</td></tr>
  <tr><td style="color:var(--black)">E-mailauthenticatie</td><td style="text-align:right">€ 250</td></tr>
</table>
<p class="klein" style="margin-top:3mm">Bij een gezonde website is dit allemaal nul. Meting, indexatie en je bedrijfsprofiel kosten nooit extra: dat zit in het fundament.</p>''')

PARTNERS = pg('grijs', '''
<div class="kicker">Partners</div>
<h2>We kunnen je altijd helpen.</h2>
<p class="intro">Zelf, of door je te koppelen aan de beste vakmensen in de regio. Jij hebt één aanspreekpunt, en je betaalt de specialist, niet ons bovenop de specialist.</p>
<div class="partners">
  <div style="background:#fff"><b>Webmix</b><span>Websites, hosting en onderhoud</span></div>
  ''' + ''.join('<div style="background:#fff"><b>' + VV('partner') + '</b><span>' + VV(v) + '</span></div>' for v in ['design en branding', 'fotografie', 'drukwerk', 'juridisch', 'boekhouding', 'video', 'vacatures en werving']) + '''
  <div style="background:#fff"><b>En meer</b><span>Vraag het ons</span></div>
</div>
<div class="kader" style="margin-top:8mm;background:#fff"><h3>Nooit marge erbovenop</h3><p style="margin:0">Krijgen we van een partner een vergoeding voor het doorverwijzen, dan zeggen we dat erbij. Je betaalt nooit meer omdat het via ons loopt.</p></div>''')

SAMEN = pg('', '''
<div class="kicker">Hoe we samenwerken</div>
<h2>Radicaal transparant. Op een vaste plek.</h2>
<div class="contact3">
  <div><div class="klein">Voor alles</div><div class="groot">support@jamesrobinson.nl</div><p style="font-size:8.6pt;margin:0">Binnen één werkdag antwoord, van wie erover gaat. Iedereen die aan je werkt, leest mee.</p></div>
  <div><div class="klein">Dringend</div><div class="groot">045 792 0009</div><p style="font-size:8.6pt;margin:0">Als je campagne of website eruit ligt, of er geld verloren gaat.</p></div>
  <div><div class="klein">Altijd open</div><div class="groot">Je dashboard</div><p style="font-size:8.6pt;margin:0">Dezelfde cijfers als wij, elk uur bijgewerkt. Met elke aanvraag erin.</p></div>
</div>
<h3 style="margin-top:9mm">Het ritme</h3>
<table>
  <tr><td style="color:var(--black)"><b>Elke dag</b></td><td>Wij kijken mee. Wat afwijkt, pakken we op voordat jij het merkt</td></tr>
  <tr><td style="color:var(--black)"><b>Elke maand</b></td><td>Een update in je dashboard: zitten we op je doel, wat deden we, wat doen we nu</td></tr>
  <tr><td style="color:var(--black)"><b>Per pakket</b></td><td>De Performance Review: een uur, op ons kantoor of online, over resultaat</td></tr>
  <tr><td style="color:var(--black)"><b>Na 100 dagen</b></td><td>Een eerlijke terugblik: werkt het, en wat moet anders</td></tr>
  <tr><td style="color:var(--black)"><b>Elk jaar</b></td><td>Het jaargesprek: waar wil je volgend jaar staan</td></tr>
</table>
<p class="klein" style="margin-top:5mm">Waarom geen WhatsApp-groep? Een mail blijft openstaan tot iemand hem heeft afgehandeld. Een appje zakt weg.</p>''')

PADEL_BEELD = pg('zwart', BEELD('een padelwedstrijd met klanten en team', 'position:absolute;inset:0;align-items:flex-start;padding:20mm 21mm') + '''
<div style="position:absolute;left:21mm;right:23mm;bottom:30mm;z-index:2"><h2 style="font-size:52pt;color:#fff">Tot op de baan.</h2></div>''')

PADEL = pg('', '''
<div class="kicker">Padel</div>
<h2>Je bent uitgenodigd.</h2>
<p class="intro">Een paar keer per jaar spelen we padel met klanten en het team. Geen presentaties, geen verkooppraat. Gewoon een potje, en daarna een drankje.</p>
<p>Je hoeft nog geen klant te zijn. Wil je meedoen met de volgende wedstrijd, meld je dan aan. Ook als je nog nooit gespeeld hebt.</p>
<div style="display:flex;gap:8mm;align-items:center;margin-top:10mm">
  <div class="qr"></div>
  <div><div class="klein">Scan en meld je aan</div><div class="d" style="font-size:16pt">''' + VV('link of datum') + '''</div><p class="klein" style="margin-top:2mm">''' + VV('waar we spelen') + '''</p></div>
</div>''')

BRONNEN = pg('', '''
<div class="kicker">Colofon en bronnen</div>
<h2 style="font-size:24pt">Waar de cijfers vandaan komen.</h2>
<div class="bronnen" style="font-size:8pt;margin-top:4mm">
<p><b>Binet &amp; Field</b>, The Long and the Short of It, IPA 2013; The 5 Principles of Growth in B2B Marketing, B2B Institute.</p>
<p><b>Kohavi &amp; Thomke</b>, The Surprising Power of Online Experiments, Harvard Business Review, september 2017.</p>
<p><b>Deloitte Digital</b>, Milliseconds Make Millions, in opdracht van Google, 2020.</p>
<p><b>Oldroyd, McElheran &amp; Elkington</b>, The Short Life of Online Sales Leads, Harvard Business Review, maart 2011.</p>
<p><b>Socialinsider</b>, Social Media Benchmarks 2026.</p>
<p><b>Meta Business Help Center</b>, About the learning phase; Creative fatigue. <b>Google Ads Help</b>, Duration of the learning period.</p>
</div>
<div style="position:absolute;left:23mm;right:21mm;bottom:28mm" class="klein">
<p><b style="color:var(--black)">Gameplan</b> is het magazine van James Robinson, Marketing &amp; Branding, Hulsberg. Editie 01, najaar 2026.</p>
<p>Alle bedragen zijn exclusief btw. Prijzen gelden voor deze editie; de actuele prijzen staan in je voorstel.</p>
<p>Tekst en vormgeving: James Robinson. Fotografie: ''' + VV('fotograaf') + '''. Druk: ''' + VV('drukker') + '''.</p>
</div>''')

