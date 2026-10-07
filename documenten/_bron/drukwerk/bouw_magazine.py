# -*- coding: utf-8 -*-
# Bouwt het magazine (versie 3) uit losse pagina's. Nummering, linker/rechter pagina,
# folio's en verwijzingen naar paginanummers ({p:sleutel}) gaan vanzelf.
import re, os, sys
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import blokken_v2 as v2
from grafieken import lijnen, staven, groeicurve, jcurve, BLAUW, ORANJE, INKT, GRIJS

pg = v2.pg
VV = v2.VV
BEELD = v2.BEELD
O = v2.O
TITEL = 'James Robinson · The Performance Issue'

def onder(tekst, h=80, kant='r'):
    # Beeldplek tegen de onderkant, binnen de marges.
    l, r = ('23mm', '21mm') if kant == 'r' else ('21mm', '23mm')
    return BEELD(tekst, 'position:absolute;left:%s;right:%s;bottom:26mm;height:%smm;border-radius:4mm' % (l, r, h))

def met(pagina, extra):
    return pagina.replace('</section>', extra + '</section>')

# ================================================================ omslag en inhoud
COVER = pg('cover', '''
<div class="foto"></div>
<div class="ad"><b>Beeld: omslagfoto</b>Echte foto, geen stock. Bijvoorbeeld iemand van het team midden in een draaidag,<br>of een ondernemer in zijn zaak. Ruimte boven voor de titel, onder voor de quote.</div>
<div class="masthead"><div class="naam">JAMES ROBINSON</div>
  <div class="lint"><span>The Performance Issue</span><span>Editie 01</span><span>Najaar 2026</span></div></div>
<div class="zijlijn"><div class="groot">7×</div><p>zo vaak een serieus gesprek als je binnen het uur terugbelt. Lees waarom, p. {p:voordeur}</p></div>
<div class="slogan">Momentum first.<br><i>Mastery later.</i></div>
<div class="lijnen">
  <div><b>Tot aan de voordeur</b>Waarom een goede aanvraag nog geen klant is <span>{p:voordeur}</span></div>
  <div><b>Likes don’t pay the bills</b>Wat posten wel en niet doet <span>{p:likes}</span></div>
  <div><b>Science + Art</b>Waarom data en merk samen winnen <span>{p:science}</span></div>
  <div><b>Welkom in Hulsberg</b>Binnen bij het team <span>{p:kantoor}</span></div>
</div>''')

def tegel(sleutel, beeld, titel, sub, hoofd=False):
    return '<div class="tegel%s">%s<div class="pnr">{p:%s}</div><b>%s</b><span>%s</span></div>' % (
        ' hoofdtegel' if hoofd else '', BEELD(beeld), sleutel, titel, sub)

INHOUD_L = pg('', '''
<div class="kicker">In deze editie</div>
''' + tegel('voordeur', 'een ondernemer aan de telefoon, of een voordeur', 'Tot aan de voordeur', 'Het verhaal van Ruud: hoe de beste campagne toch geen klanten opleverde, en wat wij daarvan leerden.', True))

INHOUD_R = pg('', '''
<div class="tegels" style="margin-top:9mm">
''' + tegel('model', 'het systeem, als beeld', 'Zo werkt het systeem', 'Motor, brandstof en versnellers') +
    tegel('likes', 'een telefoon met een feed', 'Likes don’t pay the bills', 'Waarom we adverteren in plaats van hopen') +
    tegel('science', 'een draaidag, camera in beeld', 'Science + Art', 'Data en merk, hand in hand') +
    tegel('kantoor', 'het kantoor in Hulsberg', 'Welkom in Hulsberg', 'Waar je aan tafel zit') + '''
</div>
<ul class="kortlijst">
  <li><i>{p:verklaring}</i>Declaration of Performance</li>
  <li><i>{p:normaal}</i>Wat normaal is, en hoe wij het doen</li>
  <li><i>{p:ploeg}</i>De ploeg</li>
  <li><i>{p:numbers}</i>Numbers don’t lie</li>
  <li><i>{p:content}</i>Content: de brandstof</li>
  <li><i>{p:trechter}</i>Van impressie tot klant</li>
  <li><i>{p:portaal}</i>Je eigen portaal</li>
  <li><i>{p:cases}</i>Cases en klanten</li>
  <li><i>{p:investering}</i>Wat € 1 marketing oplevert</li>
  <li><i>{p:pakketten}</i>Fundament en pakketten</li>
  <li><i>{p:spelregels}</i>De spelregels</li>
  <li><i>{p:padel}</i>Tot op de baan</li>
</ul>''')

# ================================================================ verklaring
KRABBEL = '<svg width="52mm" height="14mm" viewBox="0 0 52 14"><path d="M2 10 C6 2, 9 2, 10 8 S14 12, 17 5 S22 2, 23 9 C24 12, 27 6, 30 6 S34 10, 37 7 S44 3, 50 5" fill="none" stroke="#1c1c1e" stroke-width=".6" stroke-linecap="round"/></svg>'

JIM = pg('zwart', BEELD('portret van Jim Coumans, rustig licht, kijkt in de camera', 'position:absolute;inset:0;align-items:flex-start;padding:20mm 23mm') + '''
<div style="position:absolute;left:21mm;bottom:28mm;z-index:2"><div class="kicker">Voorwoord</div><div class="d" style="font-size:22pt">Jim Coumans</div><div style="color:rgba(255,255,255,.75)">Oprichter, James Robinson</div></div>''')

VERKLARING = pg('verklaring', '''
<div class="rand"></div>
<div class="concept">Concept, Jim geeft nog feedback op de inhoud</div>
<div class="kop"><div class="klein">James Robinson · Hulsberg</div><h2>Declaration of Performance</h2><div class="klein" style="letter-spacing:.1em">Wat je van ons mag verwachten</div></div>
<div class="brief">
  <p>Beste ondernemer,</p>
  <p>Je hebt dit magazine in handen omdat je wilt groeien. Dat willen wij ook, voor jou. Op deze pagina staat waar je ons aan mag houden. Wat erachter zit, lees je in de rest van het magazine.</p>
  <ul class="punten">
    <li data-n="1">Resultaat staat bij ons op één. Niet onze mening, niet die van jou: de cijfers beslissen.</li>
    <li data-n="2">We bouwen een systeem dat klanten oplevert. Adverteren is de motor, content de brandstof, en SEO, e-mail en je website maken het steeds sterker.</li>
    <li data-n="3">We beginnen met onderzoek, niet met een offerte. Geloven we er niet in, dan zeggen we dat.</li>
    <li data-n="4">Je ziet wat wij zien. Realtime, in je eigen portaal.</li>
    <li data-n="5">Alles staat op jouw naam, en je kunt elke maand opzeggen. Je blijft omdat het werkt.</li>
    <li data-n="6">We brengen kwalitatieve aanvragen tot aan je voordeur. Wat daarna gebeurt, maakt het verschil, en daar denken we graag over mee.</li>
  </ul>
  <p>Marketing moet geld opleveren. Doet het dat niet, dan is het een hobby. Daar zijn we niet voor.</p>
</div>
<div class="handtekening">
  <div><div class="krabbel">''' + KRABBEL + '''</div><div class="naam"><b>Jim Coumans</b> · Oprichter James Robinson<br>Hulsberg, ''' + VV('datum') + '''</div></div>
  <div class="zegel"><div>James Robinson<b>2018</b>Performance</div></div>
</div>''')

QUOTE_CASINO = pg('blauw', '''
<div style="position:absolute;left:21mm;right:23mm;top:78mm"><div class="quote" style="font-size:46pt">Gokken doe je in het casino. Niet bij James Robinson.</div>
<div class="wie-zegt"><b>Jim Coumans</b>Oprichter</div></div>''')

# ================================================================ wie we zijn
WIE = pg('', '''
<div class="kicker">Wie we zijn</div>
<h2 style="font-size:40pt">Wij doen veel. Alles met één doel: meer klanten voor jou.</h2>
<p class="intro">Adverteren, content, landingspagina’s, e-mail, SEO. Elk bureau kan dat opsommen. Het verschil zit in hoe het samenwerkt: als één systeem, gestuurd op cijfers, met jouw omzet als maatstaf.</p>
<div style="position:absolute;left:23mm;right:21mm;bottom:28mm;display:grid;grid-template-columns:repeat(4,1fr);gap:5mm">
  <div class="cijfer"><div class="n" style="font-size:38pt">2018</div><div class="t">Opgericht in Hulsberg</div></div>
  <div class="cijfer"><div class="n" style="font-size:38pt">±10</div><div class="t">Specialisten, onder één dak</div></div>
  <div class="cijfer"><div class="n" style="font-size:38pt">''' + VV('00') + '''</div><div class="t">Ondernemers geholpen</div></div>
  <div class="cijfer"><div class="n" style="font-size:38pt">30 km</div><div class="t">Rond Hulsberg zitten onze klanten</div></div>
</div>''')

VERHAAL_L = pg('', '''
<div class="kicker">Ons verhaal</div>
<h2>Sinds 2018 helpen we ondernemers in Limburg groeien.</h2>
<p class="intro">Wat begon als een idee in 2017, is een team van specialisten met een eigen manier van werken. Gebouwd op wat we onderweg leerden.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:6mm">
  <div class="cijfer"><div class="n" style="font-size:36pt">''' + VV('€ 0,0 mln') + '''</div><div class="t">advertentiebudget dat we voor klanten aanstuurden</div></div>
  <div class="cijfer"><div class="n" style="font-size:36pt">''' + VV('000') + '''</div><div class="t">campagnes live gezet</div></div>
</div>
<h3 style="margin-top:10mm">Wat we onderweg leerden</h3>
<ol class="lijst">
  <li><b>Posten levert minder op dan het lijkt.</b> Je ziet het zelf, dus het voelt als marketing. Het bereikt vooral wie je al kent.</li>
  <li><b>Een goede aanvraag is nog geen klant.</b> Wat er na de voordeur gebeurt, beslist. Lees het verhaal van Ruud op p. {p:voordeur}.</li>
  <li><b>Smaak verliest van cijfers.</b> Ook onze eigen smaak.</li>
</ol>''')

VERHAAL_R = pg('', '''
<ul class="jaren" style="margin-top:22mm">
  <li><span class="j">2017</span><div><h3>Het idee</h3><p>''' + VV('hoe het begon, waar de naam vandaan komt') + '''</p></div></li>
  <li><span class="j">2018</span><div><h3>Opgericht in Hulsberg</h3><p>''' + VV('de eerste klanten') + '''</p></div></li>
  <li><span class="j">''' + VV('jaar') + '''</span><div><h3>''' + VV('mijlpaal voor klanten') + '''</h3><p>''' + VV('bijvoorbeeld de eerste grote campagne, een nieuwe dienst') + '''</p></div></li>
  <li><span class="j">2022</span><div><h3>Jim Kikken wordt mede-eigenaar</h3><p>Data en performance marketing worden de kern van alles wat we doen.</p></div></li>
  <li><span class="j">''' + VV('jaar') + '''</span><div><h3>Ons kantoor</h3><p>''' + VV('de plek waar we nu zitten') + '''</p></div></li>
  <li><span class="j">2026</span><div><h3>Je eigen portaal</h3><p>Elke klant ziet zijn cijfers realtime. Dezelfde cijfers als wij.</p></div></li>
</ul>
''' + BEELD('archieffoto uit de begintijd', 'height:60mm;border-radius:4mm;margin-top:8mm'))

def vs_rij(a, b):
    return '<div class="c">%s</div><div class="c wij">%s</div>' % (a, b)
NORMAAL = [
    ('Je betaalt voor uren', 'Je betaalt voor een vaste samenwerking. Hoeveel uur erin gaat, is ons probleem'),
    ('Een rapport aan het eind van de maand', 'Realtime in je eigen portaal. Dezelfde cijfers als wij'),
    ('Advertentieaccounts op naam van het bureau', 'Alles op jouw naam. Stop je, dan neem je alles mee'),
    ('Een contract van een jaar', 'Maandelijks opzegbaar. Je blijft omdat het werkt'),
    ('Een opslag op ingekochte media en diensten', 'Je advertentiebudget gaat rechtstreeks naar de platformen. Nooit marge erbovenop'),
    ('Posten om zichtbaar te zijn', 'Adverteren op resultaat, gericht op wie nog geen klant is'),
    ('Een offerte na de kennismaking', 'Eerst onderzoek en een onderbouwde hypothese. Of een eerlijk nee'),
    ('Smaak beslist', 'Cijfers beslissen, binnen de grenzen van je merk'),
    ('Kanalen los van elkaar', 'Eén systeem: adverteren, content, website, e-mail en SEO versterken elkaar'),
]
NORMAAL_L = pg('', '''
<div class="kicker">Het verschil</div>
<h2 style="font-size:40pt">Wat normaal is.</h2>
<p class="intro">Veel van wat in marketing normaal is, is vooral handig voor het bureau. We deden het jarenlang zelf ook zo. Tot we zagen wat het onze klanten kostte.</p>
''' + BEELD('het team in gesprek met een klant', 'height:110mm;border-radius:4mm;margin-top:6mm'))
NORMAAL_R = pg('', '''
<div class="vs2" style="margin-top:12mm"><div class="k">Wat normaal is</div><div class="k wij">Hoe wij het doen</div>''' + ''.join(vs_rij(a, b) for a, b in NORMAAL) + '''</div>''')

# ================================================================ kantoor en ploeg
KANTOOR_L = pg('zwart', BEELD('ons kantoor in Hulsberg, binnen, met licht en ruimte', 'position:absolute;inset:0;align-items:flex-start;padding:20mm 23mm') + '''
<div style="position:absolute;left:21mm;right:23mm;bottom:30mm;z-index:2"><div class="kicker">Ons kantoor</div><h2 style="font-size:50pt;color:#fff">Welkom in Hulsberg.</h2></div>''')
KANTOOR_R = pg('', '''
<div class="kicker">Ons kantoor</div>
<h2>Online is ons vak. Aan tafel ontstaan de beste ideeën.</h2>
<div class="kol2 verhaal" style="margin-top:4mm">
  <p>Wij houden van online en digitaal. Dat is ons vak. Maar meetings, brainstorms en overleg werken het best in een echte ruimte, met mensen aan tafel.</p>
  <p>Daarom werken we voor ondernemers binnen zo’n dertig kilometer rond Hulsberg. Vraagt de situatie erom, dan zitten we snel bij jou of bij ons aan tafel.</p>
  <p>Ons kantoor hebben we ingericht om te presteren. Plekken om in stilte te werken, en ruimte om je grootste ideeën te bespreken. ''' + VV('faciliteiten, wat het bijzonder maakt') + '''</p>
  <p>In onze ideale wereld voelt binnenkomen bij James Robinson als binnenkomen bij een meesterchef met een Michelinster. Alles klopt, tot in het detail, en je merkt het zonder dat iemand het hoeft uit te leggen.</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:6mm">''' + BEELD('stilteplek', 'height:52mm;border-radius:4mm') + BEELD('de ruimte voor grote ideeën', 'height:52mm;border-radius:4mm') + '''</div>
<p class="klein" style="margin-top:4mm">''' + VV('adres') + ''' · Hulsberg</p>''')

def lid(naam):
    return '<div>' + BEELD('portret', 'height:58mm;border-radius:3mm;padding:3mm') + '<div class="persoon"><b>%s</b></div></div>' % naam
NAMEN = [VV('naam'), VV('naam'), 'Jim Kikken', VV('naam'), VV('naam'), VV('naam'), 'Jim Coumans', VV('naam'), VV('naam'), VV('naam'), VV('naam'), VV('naam')]
PLOEG_L = pg('', '<div class="kicker">De ploeg</div><h2>Wie er voor je aan de slag gaat.</h2><div class="ploeg" style="grid-template-columns:repeat(3,1fr);margin-top:2mm">' + ''.join(lid(n) for n in NAMEN[:6]) + '</div>')
PLOEG_R = pg('', '<div class="ploeg" style="grid-template-columns:repeat(3,1fr);margin-top:22mm">' + ''.join(lid(n) for n in NAMEN[6:]) + '</div>')

# ================================================================ denken
SCIENCE_L = pg('blauw', '''
<div style="position:absolute;left:21mm;right:23mm;top:60mm">
  <div class="kicker">Hoe we denken</div>
  <div class="formule" style="font-size:64pt;flex-direction:column;align-items:flex-start;gap:0">Science<span style="color:rgba(255,255,255,.55)">+ Art</span><span style="font-size:30pt;margin-top:6mm">= High Performance</span></div>
</div>''')
SCIENCE_R = pg('', '''
<div class="kicker">Science + Art</div>
<h2>Data vindt de juiste persoon. Je merk zorgt dat die blijft kijken.</h2>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:4mm">
  <div class="kader"><h3>Science</h3><p style="margin:0">Adverteren, targeting, testen, meten. Wie ziet je advertentie, wanneer, en wat doet die persoon daarna? Dat is rekenwerk.</p></div>
  <div class="kader g"><h3>Art</h3><p style="margin:0">Je merk: beeld, kleur, toon, verhaal. Waarom iemand stopt met scrollen, en jou onthoudt. Dat is vakmanschap.</p></div>
</div>
<div class="verhaal" style="margin-top:7mm">
  <p>Los van elkaar werken ze half. De perfecte doelgroep met een advertentie die niemand opvalt, levert niets op. De mooiste advertentie bij de verkeerde mensen ook niet.</p>
  <p>Samen versterken ze elkaar. Groot onderzoek naar honderden campagnes, door het Britse vakinstituut voor reclame (IPA), laat hetzelfde zien: bedrijven die alleen op snelle verkoop sturen, groeien op termijn minder dan bedrijven die ook aan een herkenbaar merk bouwen.</p>
  <div class="tussenkop">Wat goede resultaten zijn? Dat vertellen de cijfers ons.</div>
</div>''')

NUMBERS_L = pg('zwart', '''
<div class="kicker">Hoe we beslissen</div>
<h2 style="font-size:56pt;margin-top:30mm">Numbers don’t lie.</h2>
<div class="cijfer" style="position:absolute;left:21mm;right:23mm;bottom:30mm"><div class="n" style="font-size:96pt">10–20%</div><div class="t" style="font-size:11pt">van de ideeën die Google test, levert echt een verbetering op.</div><div class="b">Kohavi &amp; Thomke, The Surprising Power of Online Experiments, Harvard Business Review 2017</div></div>''')
NUMBERS_R = pg('', '''
<div class="verhaal" style="margin-top:12mm">
  <p class="eerste">In Silicon Valley werken de slimste mensen ter wereld. Ze komen van de beste universiteiten en hebben één opdracht: technologie bouwen die precies inspeelt op hoe mensen denken en kiezen.</p>
  <p>Toch blijkt bij Google maar 10 tot 20 procent van de ideeën die ze testen het resultaat echt te verbeteren. De rest werkt niet, of zelfs averechts. En dat zijn de ideeën van mensen die hier hun leven aan wijden.</p>
  <div class="tussenkop">Als zij het in acht van de tien gevallen mis hebben, waarom zouden wij, of jij, het dan beter weten?</div>
  <p>Daarom doet onze mening er minder toe dan je zou denken. En de jouwe eerlijk gezegd ook. We praten er zeker over, en we doen nooit iets wat niet goed of niet bij je merk voelt. Maar resultaat staat op één.</p>
  <p>Het liefst luisteren we naar de klant van onze klant: de mensen die jouw product of dienst kopen. Met hen praten we niet. Wat ze doen, zien we wel: waar ze op klikken, waar ze afhaken, wat ze kopen. Daar sturen we op.</p>
</div>''')

TIJDGEEST_L = pg('', '''
<div class="kicker">De markt verandert</div>
<h2 style="font-size:46pt">You don’t know what you don’t know.</h2>
<div class="eeuw">
  <div><span class="j">1900+</span><b>De krant</b>Een advertentie in de krant of het tijdschrift was de heilige graal.</div>
  <div><span class="j">1960+</span><b>Radio en tv</b>Wie een commercial had, had bereik.</div>
  <div><span class="j">2000+</span><b>De website</b>Gevonden worden in Google werd het nieuwe etalageraam.</div>
  <div><span class="j">2010+</span><b>Posten op social</b>Gratis bereik, voor wie elke dag postte.</div>
  <div class="nu"><span class="j">Nu</span><b>Pay to play</b>Data, AI en adverteren op resultaat.</div>
</div>
''' + BEELD('oude krantenadvertentie naast een telefoon', 'height:80mm;border-radius:4mm;margin-top:10mm'))
TIJDGEEST_R = pg('', '''
<div class="verhaal" style="margin-top:12mm">
  <p class="eerste">Veel ondernemers zien posten op social media nog altijd als dé vorm van marketing. Logisch: het is bekend, het is laagdrempelig, en je ziet het zelf, dus het is er.</p>
  <p>Maar de wereld van marketing verandert sneller dan ooit. Wat gisteren nieuw was, is vandaag achterhaald. Tools, automatisering en AI zorgen voor een versnelling die zijn weerga niet kent.</p>
  <p>Daar komt bij dat de grote Amerikaanse platformen steeds meer pay to play zijn geworden. Google, Meta, LinkedIn en TikTok willen absoluut resultaat voor je opleveren. Resultaat is hun bestaansrecht. Maar anders dan tien, vijftien jaar geleden moet je er wel voor betalen.</p>
  <div class="tussenkop">De tijd dat een gewone post verder kwam dan je eigen volgers en die van je moeder, is voorbij.</div>
  <p>We geloven wel in een goede aanwezigheid op social. Voor je merk heeft het waarde, en het helpt mensen die je al kennen om iets bij je te kopen. Maar wie nieuwe klanten wil, moet verder kijken dan de eigen feed.</p>
</div>''')

LIKES_L = pg('blauw', '''
<div class="kicker">Social media</div>
<h2 style="font-size:60pt;margin-top:24mm">Likes don’t pay the bills.</h2>
<div class="cijfer" style="position:absolute;left:21mm;right:23mm;bottom:30mm"><div class="n">1–3%</div><div class="t">van je volgers ziet gemiddeld een bericht van je bedrijfspagina. Bij kleine pagina’s 4 tot 7 procent.</div><div class="b">Socialinsider, Social Media Benchmarks 2026 · 872.075 berichten</div></div>''')
LIKES_R = pg('', '''
<div class="kicker">Organisch tegenover adverteren</div>
<h2 style="font-size:24pt">Allebei kosten ze iets. Maar niet hetzelfde.</h2>
<table style="margin-top:3mm">
  <tr><th></th><th>Organisch posten</th><th style="color:var(--blue)">Adverteren</th></tr>
  <tr><td>Wat het kost</td><td>Vooral tijd: bedenken, maken, plaatsen. Elke week opnieuw</td><td>Tijd voor goede content, plus je advertentiebudget</td></tr>
  <tr><td>Wie het ziet</td><td>Een klein deel van je eigen volgers</td><td>Mensen die jij kiest, ook als ze je nog niet kennen</td></tr>
  <tr><td>Hoe ver het reikt</td><td>Zo ver als het algoritme wil</td><td>Zo ver als je budget, en op te schalen</td></tr>
  <tr><td>Sturen</td><td>Posten en hopen</td><td>Meten, bijsturen, opnieuw</td></tr>
  <tr><td>Kans op viraal</td><td>Klein, en niet te plannen</td><td>Niet nodig</td></tr>
</table>
<h3 style="margin-top:8mm">Wie je bereikt, een rekenvoorbeeld</h3>
<div style="margin-top:3mm">''' + staven([
    ('Een bericht', 30, GRIJS, 'aan 1.000 volgers, 3% bereik'),
    ('€ 50 aan advertenties', 7000, BLAUW, 'bij € 7 per 1.000 weergaven'),
], b=118, rij=12) + '''</div>
<p class="illu">Rekenvoorbeeld. Wat 1.000 weergaven kosten, verschilt per doelgroep, kanaal en moment.</p>''')

PLATFORMS_L = pg('', '''
<div class="kicker">Hoe de platformen werken</div>
<h2 style="font-size:44pt">Tijd + geld = data.</h2>
<p class="intro">Facebook, Instagram, LinkedIn, TikTok en Google kunnen niet lezen of schrijven. Ze kunnen alleen meten en analyseren: aan wie moeten we deze advertentie laten zien, zodat de kans op succes zo groot mogelijk is?</p>
<svg viewBox="0 0 160 120" width="150mm" height="112mm" style="margin-top:2mm" font-family="Inter, Arial, sans-serif">
  <circle cx="80" cy="60" r="42" fill="none" stroke="#e5e5e9" stroke-width="1"/>
  <path d="M80 18 A42 42 0 0 1 122 60" fill="none" stroke="#007aff" stroke-width="1.6" marker-end="url(#pijl)"/>
  <path d="M122 60 A42 42 0 0 1 80 102" fill="none" stroke="#007aff" stroke-width="1.6" marker-end="url(#pijl)"/>
  <path d="M80 102 A42 42 0 0 1 38 60" fill="none" stroke="#007aff" stroke-width="1.6" marker-end="url(#pijl)"/>
  <path d="M38 60 A42 42 0 0 1 80 18" fill="none" stroke="#007aff" stroke-width="1.6" marker-end="url(#pijl)"/>
  <defs><marker id="pijl" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L6 3 L0 6z" fill="#007aff"/></marker></defs>
  <g font-size="4.4" font-weight="700" fill="#1c1c1e" text-anchor="middle">
    <text x="80" y="11">Ballonnetjes oplaten</text><text x="146" y="58">Meten</text><text x="80" y="113">Meer budget naar</text><text x="80" y="118.5">wat werkt</text><text x="14" y="58">Stoppen met</text><text x="14" y="63.5">wat niet werkt</text>
  </g>
  <text x="80" y="58" font-size="7" font-weight="800" text-anchor="middle" fill="#007aff">Een systeem</text><text x="80" y="66" font-size="7" font-weight="800" text-anchor="middle" fill="#007aff">dat levert</text>
</svg>''')
PLATFORMS_R = pg('', '''
<div class="verhaal" style="margin-top:12mm">
  <p class="eerste">Daarvoor hebben de platformen data nodig. En data krijg je alleen met tijd en geld. Dus laten we in het begin bewust een hoop ballonnetjes op: verschillende doelgroepen, boodschappen en beelden.</p>
  <p>We meten wat werkt en wat niet. Wat werkt, krijgt meer budget. Met wat niet werkt, stoppen we. Zo bouwen we stap voor stap een systeem dat levert.</p>
  <div class="tussenkop">Elk advertentiekanaal is een veiling.</div>
  <p>Is de vraag naar een zoekwoord of een doelgroep hoog, dan is de prijs per klik of per weergave ook hoog. Een loodgieter in Maastricht betaalt in een koude winterweek meer voor “cv-ketel kapot” dan in juli.</p>
  <p>Aan ons de taak om de beste mix te vinden: de juiste kanalen, doelgroepen en momenten, zodat elke marketingeuro zoveel mogelijk omzet oplevert.</p>
</div>''')

# ================================================================ het systeem
def mblok(x, y, w, h, kleur, rol, titel, tekst, wit=False):
    return '<div class="m-blok" style="left:%smm;top:%smm;width:%smm;height:%smm;background:%s;%s"><div class="rol">%s</div><h3 style="%s">%s</h3><p>%s</p></div>' % (
        x, y, w, h, kleur, 'color:#fff' if wit else '', rol, 'color:#fff' if wit else '', titel, tekst)
def boost(x, y, w, titel, tekst):
    return '<div class="booster" style="left:%smm;top:%smm;width:%smm"><b>%s</b>%s</div>' % (x, y, w, titel, tekst)
PIJL = lambda x, y, w, rot=0: '<svg class="m-pijl" style="left:%smm;top:%smm;transform:rotate(%sdeg)" width="%smm" height="6mm" viewBox="0 0 %s 6"><path d="M0 3 H%s M%s 0 L%s 3 L%s 6" fill="none" stroke="#1c1c1e" stroke-width=".6"/></svg>' % (x, y, rot, w, w, w - .5, w - 3, w - .5, w - 3)

MODEL_L = pg('', '''
<div class="kicker">Het systeem</div>
<h2 style="font-size:40pt">Zo maken we van advertenties klanten.</h2>
<p class="intro">Adverteren is de motor. Content is de brandstof. Je website is waar het landt. En vier versnellers maken elke klant daarna goedkoper.</p>
<div class="machine">''' +
    mblok(0, 0, 50, 46, 'var(--bg)', 'De brandstof', 'Content', 'Foto, video, animatie en visuals. Gemaakt om te presteren, altijd on-brand.') +
    PIJL(51, 20, 11) +
    mblok(63, 0, 108, 46, 'var(--blue)', 'De motor', 'Paid advertising', 'Google, Meta, LinkedIn, TikTok. Bereikt de juiste mensen, nu, en is per euro te meten en bij te sturen.', True) +
    '<svg class="m-pijl" style="left:114mm;top:47mm" width="6mm" height="12mm" viewBox="0 0 6 12"><path d="M3 0 V11 M0 8 L3 11 L6 8" fill="none" stroke="#1c1c1e" stroke-width=".6"/></svg>' +
    mblok(63, 60, 108, 36, 'var(--black)', 'De landing', 'Je website en landingspagina', 'Hier wordt een bezoeker een aanvraag. Of niet.', True) +
    '<svg class="m-pijl" style="left:114mm;top:97mm" width="6mm" height="12mm" viewBox="0 0 6 12"><path d="M3 0 V11 M0 8 L3 11 L6 8" fill="none" stroke="#1c1c1e" stroke-width=".6"/></svg>' +
    mblok(63, 110, 108, 30, 'var(--tint)', 'Bij je voordeur', 'Een kwalitatieve aanvraag', 'Ready to buy. Vanaf hier is het jouw beurt.') +
    boost(0, 60, 54, 'CRO', 'Meer aanvragen uit hetzelfde verkeer') +
    boost(0, 80, 54, 'SEO', 'Extra verkeer dat je niet hoeft te kopen') +
    boost(0, 100, 54, 'E-mail en automation', 'Terughalen wie er al was, zonder opnieuw te betalen') +
    boost(0, 120, 54, 'Monitoring', 'Elke dag kijken waar het knelt, en waar kansen liggen') + '''
</div>''')
MODEL_R = pg('', '''
<div class="kicker">Waarom we met adverteren beginnen</div>
<h2 style="font-size:24pt">Adverteren levert het snelst iets op. Daarna bouwen we verder.</h2>
<p>SEO en organische social zijn waardevol, maar langzaam. Adverteren staat vandaag aan en laat morgen zien wat werkt. Die kennis gebruiken we daarna voor al het andere.</p>
<div style="margin-top:5mm">''' + lijnen([
    ('Adverteren', BLAUW, [(0, 0), (1, 6), (2, 22), (3, 38), (4, 50), (6, 62), (9, 70), (12, 75)], False, 0),
    ('SEO', ORANJE, [(0, 0), (2, 2), (4, 6), (6, 14), (8, 26), (10, 40), (12, 52)], False, 0),
    ('Organisch posten', GRIJS, [(0, 0), (2, 6), (4, 9), (6, 10), (9, 11), (12, 12)], True, 0),
], b=126, h=70, xmax=12, ymax=100, xlabels=[(0, 'start'), (3, 'maand 3'), (6, 'maand 6'), (9, 'maand 9'), (12, 'maand 12')], ylabel='Aanvragen per maand') + '''</div>
<p class="illu">Illustratief: zo verloopt het meestal. Hoe snel het echt gaat, verschilt per markt en per bedrijf.</p>
<div class="kader" style="margin-top:6mm"><h3>De versnellers zijn geen losse trucjes</h3><p style="margin:0">We zetten ze pas in als de motor draait, en in de volgorde die de cijfers aanwijzen. CRO kan pas als er verkeer is. E-mail pas als er adressen zijn. SEO loont pas als je weet welke woorden klanten opleveren.</p></div>''')

def fase(w, titel, tekst, aan):
    return '<div class="fase-b"><div class="w">%s</div><h3>%s</h3><p style="margin:0">%s</p><div class="aan">%s</div></div>' % (
        w, titel, tekst, ''.join('<span class="%s">%s</span>' % ('m' if a in ('Adverteren', 'Content') else '', a) for a in aan))
TIJD_L = pg('', '''
<div class="kicker">Het systeem in de tijd</div>
<h2>Eerst de motor. Dan de versnellers.</h2>
<div class="fasen">''' +
    fase('Maand 0', 'Opstart', 'Meting, accounts, campagne, landingspagina en de eerste content.', ['Content']) +
    fase('Maand 1 tot 3', 'De motor draait', 'Leren wat werkt. Ballonnetjes oplaten, meten, bijsturen.', ['Adverteren', 'Content']) +
    fase('Maand 4 tot 6', 'Eerste versnellers', 'Je landingspagina beter maken, en e-mail om terug te halen wie er al was.', ['Adverteren', 'Content', 'CRO', 'E-mail']) +
    fase('Vanaf maand 6', 'Alles samen', 'SEO op de woorden die bewezen klanten opleveren, en automation.', ['Adverteren', 'Content', 'CRO', 'E-mail', 'SEO']) + '''
</div>
<p class="klein" style="margin-top:3mm">Een voorbeeld. De volgorde van de versnellers bepalen jouw cijfers: bij de een eerst SEO, bij de ander eerst e-mail.</p>
<h3 style="margin-top:8mm">Aanvragen per maand</h3>
''' + lijnen([
    ('Aanvragen', BLAUW, [(0, 0), (1, 8), (2, 18), (3, 26), (4, 34), (5, 40), (6, 48), (8, 58), (10, 68), (12, 76)], False, 0),
], b=126, h=52, xmax=12, ymax=100, xlabels=[(0, '0'), (3, '3'), (6, '6'), (9, '9'), (12, '12')]) + '''
<p class="illu">Illustratief.</p>''')
TIJD_R = pg('', '''
<h3 style="margin-top:22mm">Wat een aanvraag kost</h3>
''' + lijnen([
    ('Kosten per aanvraag', ORANJE, [(1, 92), (2, 80), (3, 70), (4, 64), (5, 58), (6, 52), (8, 46), (10, 42), (12, 38)], False, 0),
], b=126, h=52, xmax=12, ymax=100, xlabels=[(0, '0'), (3, '3'), (6, '6'), (9, '9'), (12, '12')]) + '''
<p class="illu">Illustratief.</p>
<div class="verhaal" style="margin-top:6mm">
  <p>De motor brengt aanvragen. De versnellers maken ze goedkoper: een betere landingspagina haalt meer uit hetzelfde verkeer, e-mail haalt mensen terug zonder dat je opnieuw betaalt, en SEO levert verkeer op waar je niet per klik voor betaalt.</p>
  <div class="tussenkop">Meer aanvragen, tegen lagere kosten per aanvraag. Daar sturen we op.</div>
</div>''')

CONTENT_L = pg('zwart', BEELD('een draaidag: camera, licht, iemand van de klant in beeld', 'position:absolute;inset:0;align-items:flex-start;padding:20mm 21mm') + '''
<div style="position:absolute;left:23mm;right:21mm;bottom:30mm;z-index:2"><div class="kicker">Content</div><h2 style="font-size:50pt;color:#fff">De brandstof van de motor.</h2></div>''')
CONTENT_R = pg('', '''
<div class="kicker">Content</div>
<h2 style="font-size:26pt">Een advertentie is zo goed als het beeld erin.</h2>
<div class="verhaal">
  <p>Daarom plannen we de contentproductie meteen aan het begin van de samenwerking. Eerst een plan: wat moet het beeld vertellen, voor wie, in welke formaten. Dan de shoot, bij jou op locatie. Daar maken we het beeld voor je advertenties.</p>
  <p>We werken met de absolute experts in hun vak, afgestemd op wat jij nodig hebt.</p>
</div>
<div class="partners" style="grid-template-columns:repeat(3,1fr);margin-top:3mm">
  <div><b>Fotografie</b><span>Je mensen, je product, je zaak</span></div>
  <div><b>Videografie</b><span>Korte video voor social en YouTube</span></div>
  <div><b>Animatie</b><span>Uitleg en beweging die opvalt</span></div>
  <div><b>Statische visuals</b><span>Advertenties in elk formaat</span></div>
  <div><b>Copywriting</b><span>Woorden die tot actie aanzetten</span></div>
  <div><b>Formaten</b><span>9:16, 4:5 en 1:1, per kanaal</span></div>
</div>
<div class="kader" style="margin-top:6mm"><h3>Waarom we steeds nieuwe content maken</h3><p style="margin:0">Advertenties slijten. Zien dezelfde mensen een advertentie te vaak, dan lopen de kosten per resultaat op. Meta waarschuwt daar zelf voor. Met nieuwe contentrondes houden we je campagnes fris.</p></div>''')

def vb(titel, wat, wanneer, effect):
    return '<div class="kader g"><h3>%s</h3><p style="font-size:8.8pt">%s</p><p class="klein" style="margin:0"><b style="color:var(--black)">Wanneer</b> %s</p><p class="klein" style="margin:1mm 0 0"><b style="color:var(--black)">Wat het doet</b> %s</p></div>' % (titel, wat, wanneer, effect)
BOOST_L = pg('', '''
<div class="kicker">De versnellers</div>
<h2 style="font-size:38pt">Geen losse trucjes. Versnellers.</h2>
<p class="intro">Los ingezet heeft geen van deze vier een ijkpunt. Als versneller van de motor wel: ze komen allemaal uit op één getal, wat een klant je kost.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm">''' +
    vb('Landingspagina’s', 'Eén pagina per campagne. Eén boodschap, één actie. Snel, en met een meting die klopt.', 'Vanaf de start', 'Meer van je bezoekers worden een aanvraag') +
    vb('CRO', 'Testen en verbeteren waar bezoekers afhaken: kortere formulieren, duidelijkere pagina’s, bezwaren wegnemen.', 'Als er verkeer is', 'Meer aanvragen uit hetzelfde budget') + '''
</div>''')
BOOST_R = pg('', '''
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:22mm">''' +
    vb('E-mail en automation', 'Wie er al was terughalen, en bestaande klanten vaker laten kopen. Automatisch, op het juiste moment.', 'Als er adressen zijn', 'Een klant levert meer op, dus een aanvraag mag meer kosten') +
    vb('SEO', 'Gevonden worden op de woorden waarvan we via je advertenties al weten dat ze klanten opleveren.', 'Als de cijfers het aanwijzen', 'Een deel van je verkeer wordt gratis') + '''
</div>
<div class="cijfer" style="margin-top:12mm"><div class="n">21,6%</div><div class="t" style="max-width:130mm">Zoveel vaker kwamen bezoekers van de eerste stap van een formulier tot het verzenden, bij een mobiele site die een tiende seconde sneller was.</div><div class="b">Deloitte Digital voor Google, Milliseconds Make Millions, 2020 · leadgeneratie, 37 merken</div></div>''')

TRECHTER_L = pg('', '''
<div class="kicker">Van impressie tot klant</div>
<h2 style="font-size:36pt">Vier stappen. Drie knoppen ertussen.</h2>
<p class="intro">Elke stap kun je meten. En als je weet waar het knelt, weet je ook aan welke knop je moet draaien.</p>
<div class="trechter">
  <div class="tr"><div class="n">10.000</div><div class="bar" style="width:100%;height:52mm"></div><div class="w">Impressies</div></div>
  <div class="tr"><div class="n">200</div><div class="bar" style="width:80%;height:22mm"></div><div class="w">Bezoekers</div></div>
  <div class="tr"><div class="n">4</div><div class="bar" style="width:60%;height:7mm"></div><div class="w">Aanvragen</div></div>
  <div class="tr"><div class="n">2</div><div class="bar" style="width:40%;height:3.5mm;background:var(--black)"></div><div class="w">Klanten</div></div>
</div>
<div class="ratio2"><div><b>2%</b>klikt door</div><div><b>2%</b>vraagt aan</div><div><b>50%</b>wordt klant</div></div>
<p class="klein" style="margin-top:4mm">Een rekenvoorbeeld bij € 500 aan advertenties in een maand, tegen € 2,50 per klik.</p>
<h3 style="margin-top:7mm">Eén procentpunt maakt het verschil</h3>
''' + staven([
    ('Nu', 125, GRIJS, '4 aanvragen bij 2% conversie'),
    ('50% meer budget', 125, GRIJS, '6 aanvragen, € 250 extra per maand'),
    ('Betere landingspagina', 83, BLAUW, '6 aanvragen bij 3%, zelfde budget'),
], b=100, rij=12, max_=130, eenheid='') + '''
<p class="illu">Kosten per aanvraag in euro’s. Meer budget geeft meer aanvragen tegen dezelfde prijs. Een betere pagina geeft ze goedkoper.</p>''')
TRECHTER_R = pg('', '''
<div class="kicker">Waar zit de bottleneck?</div>
<h2 style="font-size:24pt">We kijken elke dag waar het knelt. En waar kansen liggen.</h2>
<table class="diagnose">
  <tr><th>Wat we zien</th><th>Wat we kunnen doen</th></tr>
  <tr><td>Weinig impressies<br><span class="wie">Wij</span></td><td>Budget verschuiven, doelgroep verbreden, ander kanaal of zoekwoord</td></tr>
  <tr><td>Wel gezien, weinig kliks<br><span class="wie">Wij</span></td><td>Nieuw beeld, andere boodschap, scherpere doelgroep</td></tr>
  <tr><td>Wel bezoekers, weinig aanvragen<br><span class="wie">Wij</span></td><td>Landingspagina sneller en duidelijker, korter formulier, sterker aanbod op de pagina</td></tr>
  <tr><td>Wel aanvragen, weinig klanten<br><span class="wie jij">Jij, met ons</span></td><td>Sneller opvolgen, aanbod en prijs scherper. Wij kijken mee naar de kwaliteit van de aanvragen</td></tr>
</table>
<div class="kader" style="margin-top:8mm"><h3>Proactief, op basis van data</h3><p style="margin:0">Elke ochtend zien wij wat buiten de lijntjes loopt, voor al onze klanten. Zo pakken we een probleem op voordat jij het merkt, en zien we kansen voordat een concurrent ze ziet.</p></div>''')

VOORDEUR_L = pg('', BEELD('een voordeur, of een telefoon die overgaat', 'position:absolute;left:0;right:0;top:0;height:140mm') + '''
<div style="margin-top:128mm">
  <div class="kicker">Tot aan de voordeur</div>
  <h2 style="font-size:40pt">Het verhaal van Ruud.</h2>
  <p class="intro" style="font-size:11pt">Ruud heet eigenlijk anders. Zijn bedrijf noemen we niet. Maar zijn verhaal vertellen we aan elke nieuwe klant.</p>
</div>''')
VOORDEUR_R = pg('', '''
<div class="verhaal kol2" style="margin-top:10mm">
  <p class="eerste">Ruud zat in een nichemarkt. Hij was een nieuwe speler, en een paar concurrenten hadden al een flink deel van de markt in handen. Toch zagen we kansen.</p>
  <p>We begonnen met Google Ads, en dat bleek een schot in de roos. Na een korte aanloop van uitproberen stroomden de aanvragen binnen. Meer dan verwacht zelfs. Wij blij, klant blij. Dachten we.</p>
  <p>Tot Ruud opzegde. Hij haalde er geen klanten uit.</p>
  <p>Alle alarmbellen gingen af. Kwamen de aanvragen niet binnen? Klopte onze rapportage niet? Was de kwaliteit slecht? In ons overleg hadden we er nooit iets over gehoord. We zochten het uit.</p>
  <p>Wat bleek: Ruud belde zijn aanvragen pas na zeven dagen. Hij wilde ze niet “stalken”. Ze hadden net een heel formulier ingevuld, dus ze waren er wel even klaar mee.</p>
  <p>Na een paar dagen stilte hadden ze bij een concurrent geboekt.</p>
</div>
<div class="tussenkop" style="margin-top:4mm">Ons werk houdt op bij de voordeur. Daar leveren we aanvragen af die klaar zijn om te kopen. Wat daarna gebeurt, maakt het verschil.</div>
<div style="display:grid;grid-template-columns:1fr 1.3fr;gap:6mm;margin-top:4mm;align-items:end">
  <div class="cijfer"><div class="n" style="font-size:60pt">7×</div><div class="t">zo vaak een serieus gesprek voor wie binnen een uur reageert, vergeleken met een uur later.</div><div class="b">Harvard Business Review, The Short Life of Online Sales Leads, 2011</div></div>
  <p style="font-size:9pt">We denken graag mee over wat er na de voordeur gebeurt. Maar het is goed dat we allebei weten waar onze rol ophoudt, en waar die van jou begint. Daarom spreken we vooraf af hoe snel aanvragen worden opgevolgd.</p>
</div>''')

PORTAAL_L = pg('grijs', '''
<div class="kicker">Je eigen portaal</div>
<h2 style="font-size:40pt">Je ziet wat wij zien. Realtime.</h2>
<p class="intro">Geen pdf aan het eind van de maand. Een eigen portaal met je cijfers, elk uur bijgewerkt. Van impressie tot aanvraag, per bron.</p>
<div class="scherm" style="margin-top:4mm"><img src="beeld/portal.png" alt=""></div>
<p class="illu" style="margin-top:2mm">Voorbeeldweergave met demogegevens.</p>''')
PORTAAL_R = pg('', '''
<ol class="lijst" style="margin-top:22mm">
  <li><h3>Volledige transparantie</h3><p style="margin:0">Dezelfde cijfers als wij. Niets weggelaten, niets mooier gemaakt.</p></li>
  <li><h3>Alle bronnen op één plek</h3><p style="margin:0">Google, Meta, LinkedIn, TikTok, je website en Search Console. Geen losse inlogs, geen losse rapporten.</p></li>
  <li><h3>Elke aanvraag erin</h3><p style="margin:0">Met één klik geef je aan of een aanvraag goed was, en later of het een klant werd. Zo sturen we op kwaliteit, niet alleen op aantal.</p></li>
  <li><h3>Je merk, je campagnes, je afspraken</h3><p style="margin:0">Je merkkluis, je lopende campagnes en je budget, allemaal op één plek.</p></li>
  <li><h3>Van jou</h3><p style="margin:0">Stop je met ons, dan blijft je dashboard van jou.</p></li>
</ol>''')

# ================================================================ deel 2
TUSSEN = pg('blauw', '''
<div style="position:absolute;left:21mm;right:23mm;top:90mm">
  <div class="kicker">Deel 2</div>
  <h2 style="font-size:58pt">Wat betekent dat voor jou?</h2>
  <p class="intro" style="max-width:140mm">Hoe we tot een voorstel komen, wat je mag verwachten, wat het kost, en wat we van elkaar afspreken.</p>
</div>''')

ONDERZOEK = pg('', '''
<div class="kicker">Eerst onderzoek</div>
<h2>We beginnen pas als we erin geloven.</h2>
<p class="intro">Daarom stellen we aan de voorkant veel vragen, en doen we grondig vooronderzoek. Daaruit komt een onderbouwde hypothese, en een advies.</p>
<ol class="lijst">
  <li><h3>1 · Jouw antwoorden</h3><p style="margin:0">Een vragenlijst over je bedrijf, je klanten en je doelen.</p></li>
  <li><h3>2 · Onze quickscan</h3><p style="margin:0">We bekijken je website, je meting en je markt. Wat werkt al, wat kost je nu klanten?</p></li>
  <li><h3>3 · Het intakegesprek</h3><p style="margin:0">Een uur aan tafel. Wat een formulier niet kan vragen, vragen we hier.</p></li>
  <li><h3>4 · Onze hypothese en ons voorstel</h3><p style="margin:0">Waar we in geloven, waarom, en hoe dat er voor jou uitziet. Of een eerlijk nee.</p></li>
</ol>
<div class="kader" style="margin-top:6mm"><h3>Waarom we soms nee zeggen</h3><p style="margin:0">Denken we op basis van de cijfers dat we te weinig voor je kunnen betekenen, dan zeggen we dat. We hebben er niets aan om over een paar maanden tegenover een ontevreden ondernemer te zitten.</p></div>''')

INVEST_L = pg('', '''
<div class="kicker">Jouw investering</div>
<h2 style="font-size:36pt">Wat levert € 1 marketing jou op?</h2>
<p class="intro">We beginnen bij jouw ambitie, en rekenen terug.</p>
<ol class="lijst">
  <li><h3>Hoeveel extra omzet wil je realiseren?</h3><p style="margin:0">Het startpunt van alles.</p></li>
  <li><h3>Hoeveel nieuwe klanten zijn daarvoor nodig?</h3><p style="margin:0">Uit wat een klant je gemiddeld oplevert.</p></li>
  <li><h3>Hoeveel aanvragen horen daarbij?</h3><p style="margin:0">Uit hoeveel van je aanvragen klant worden.</p></li>
  <li><h3>Wat mag dat kosten, en wat levert het op?</h3><p style="margin:0">Je advertentiebudget is de motor. Hoe groot die motor moet zijn, volgt uit je ambitie.</p></li>
</ol>
<div class="formule" style="font-size:30pt;margin-top:8mm"><div>€ 50.000<small>marketing per jaar</small></div><span class="op">× 4</span><div style="color:var(--blue)">€ 200.000<small>omzet, als de hypothese klopt</small></div></div>
<p class="klein">Een voorbeeld. Elke euro marketing levert er in deze hypothese vier op. Welke verhouding voor jou haalbaar is, onderbouwen we in je voorstel.</p>''')
INVEST_R = pg('', '''
<div class="kicker">Geen alles of niets</div>
<h3 style="font-size:16pt">De uitkomst ligt op een schaal. Niet op nul of alles.</h3>
<div class="spectrum">
  <div style="border-color:#d2d1d7"><b>Tegenvallend</b>We bouwen bij, of stoppen op tijd</div>
  <div style="border-color:#8ec1ff"><b>Terugverdiend</b>De investering komt terug</div>
  <div style="border-color:var(--blue)"><b>Hypothese</b>Wat we verwachten</div>
  <div style="border-color:var(--deep)"><b>Boven verwachting</b>Het kan ook beter uitpakken</div>
</div>
<p style="margin-top:4mm">Marketing is per definitie trial and error. We laten ons leiden door cijfers, en handelen op kennis en ervaring. Soms laten we ballonnetjes op die niet vliegen. Dat is niet erg: het is een les over wat niet werkt voor jouw bedrijf, jouw branche, jouw regio.</p>
<h3 style="margin-top:6mm">Eerst investeren, dan verdienen</h3>
''' + jcurve() + '''
<p class="illu">Illustratief. Het nadeel van marketing: de investering ligt aan de voorkant, de opbrengst komt aan de achterkant.</p>
<div class="tussenkop">Marketing moet geld opleveren. Doet het dat niet, dan is het een hobby.</div>''')

VERWACHT = pg('', '''
<div class="kicker">Wat je mag verwachten</div>
<h2>Geen storm aan de telefoon in maand één. Wel een motor die op toeren komt.</h2>
<p class="intro">Advertenties hebben tijd, geld en data nodig. In het begin loopt de lijn vlak. Als er eenmaal tractie is, versnelt het. Bij de een na een week, bij de ander na zes maanden.</p>
''' + groeicurve() + '''
<p class="illu">Illustratief. De band laat zien dat het omslagpunt per bedrijf verschilt.</p>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:6mm">
  <div class="cijfer"><div class="n" style="font-size:30pt">Tijd</div><div class="t">De platformen moeten leren wie jouw klant is.</div></div>
  <div class="cijfer"><div class="n" style="font-size:30pt">Geld</div><div class="t">Zonder budget geen weergaven, en zonder weergaven geen data.</div></div>
  <div class="cijfer"><div class="n" style="font-size:30pt">Data</div><div class="t">Rond maand drie trekken we de eerste voorzichtige conclusies.</div></div>
</div>''')

OPSTART = pg('', '''
<div class="kicker">Maand 0</div>
<h2>De opstart. Daarna je eerste jaar.</h2>
<p class="intro">In de opstartmaand zetten we alles neer. Vanaf dan rekenen we gewoon per maand en per jaar.</p>
<table class="som" style="font-size:9.5pt">
  <tr><td><b>Binnen 3 werkdagen</b><small>na het tekenen</small></td><td style="text-align:left;font-weight:400">Onboardingformulier en alle toegangen, in één sessie van 45 minuten</td></tr>
  <tr><td><b>Week 1</b></td><td style="text-align:left;font-weight:400">Technische check, doelgroep, boodschap en zoekwoorden</td></tr>
  <tr><td><b>Week 2</b></td><td style="text-align:left;font-weight:400">Advertentieaccounts, e-mail, je portaal en de meting</td></tr>
  <tr><td><b>Week 3</b></td><td style="text-align:left;font-weight:400">Campagne en landingspagina bouwen, en de shoot bij jou op locatie</td></tr>
  <tr class="tot"><td>Week 4</td><td style="text-align:left">Live</td></tr>
</table>
<div class="maanden" style="margin-top:9mm"><div class="f">0</div><div class="d">1</div><div class="d">2</div><div class="d">3</div><div class="d">4</div><div class="d">5</div><div class="d">6</div><div class="d">7</div><div class="d">8</div><div class="d">9</div><div class="d">10</div><div class="d">11</div><div class="d">12</div></div>
<div class="legenda"><span><i style="background:var(--black)"></i>Opstartmaand: het fundament</span><span><i style="background:var(--blue)"></i>Je eerste jaar: de maandelijkse samenwerking</span></div>''').replace('repeat(12,1fr)', 'repeat(13,1fr)')

# ================================================================ pagina's uit versie 2, bijgewerkt
FUNDAMENT = v2.FUNDAMENT.replace('eenmalig, bij ondertekening', 'eenmalig, in de opstartmaand')
PAKKETTEN = (v2.PAKKETTEN
    .replace('Iedereen krijgt hetzelfde werk. Het pakket bepaalt hoeveel.', 'Je pakket groeit mee met je ambitie.')
    .replace('Welk pakket bij je past, volgt uit je rekensom. De namen komen uit de sport.', 'Welk pakket bij je past, volgt uit je doel en je advertentiebudget. De namen komen uit de sport.')
    .replace('<b>Altijd vanaf maand 2.</b> De maandelijkse samenwerking start na het fundament.', '<b>Na de opstartmaand.</b> De maandelijkse samenwerking start als je campagne live is.'))
TOOLSET = (v2.OPTIES
    .replace('<div class="kicker">Licenties en opties</div>', '<div class="kicker">Je toolset</div>')
    .replace('<h2>Wat op jouw naam staat.</h2>', '<h2>De toolset voor succes.</h2>')
    .replace('Alleen de maandelijkse samenwerking en het dashboard gaan naar ons. De rest staat op jouw naam en factureert de leverancier rechtstreeks.',
             'De tools waarmee je motor draait. Ze staan op jouw naam en de leverancier factureert rechtstreeks. Alleen het portaal en de samenwerking gaan via ons.')
    .replace('<b>Marketingdashboard</b>', '<b>Je portaal</b>'))
REGELS1 = (O(20)
    .replace('We beloven geen resultaat. We beloven dat we het zelf zeggen als het niet werkt, en waarom. Je ziet in je dashboard wat wij zien.',
             'Resultaat staat op één. Werkt iets niet, dan zeggen we dat zelf, met de cijfers erbij. Je ziet in je portaal wat wij zien.')
    .replace('<h3>Alles verdient zich terug</h3><p>Binnen twaalf maanden, alles samen. Lukt dat op papier niet, dan beginnen we niet.</p>',
             '<h3>We beginnen alleen als we erin geloven</h3><p>Op basis van onderzoek en een onderbouwde hypothese. Anders zeggen we nee.</p>'))
def eind():
    e = v2.re.sub(r'<div class="bronnen".*?</div>\s*(?=<div class="folio")', '''<div class="kader" style="margin-top:7mm;display:flex;gap:6mm;align-items:center"><div class="qr"></div><div><h3>Akkoord?</h3><p style="margin:0">Je voorstel en de offerte krijg je binnen drie werkdagen na het intakegesprek. Tekenen en betalen doe je online, dezelfde dag.</p></div></div>
  ''', O(23), flags=re.S)
    return e.replace('<b>Jouw voorstel en de offerte</b>', '<b>Jouw voorstel en de offerte</b>')
BRONNEN = (v2.BRONNEN
    .replace('<b>Binet &amp; Field</b>, The Long and the Short of It, IPA 2013; The 5 Principles of Growth in B2B Marketing, B2B Institute.', '<b>Binet &amp; Field</b>, The Long and the Short of It, IPA 2013.')
    .replace('<b>Kohavi &amp; Thomke</b>, The Surprising Power of Online Experiments, Harvard Business Review, september 2017.', '<b>Kohavi &amp; Thomke</b>, The Surprising Power of Online Experiments, Harvard Business Review, september 2017. Het cijfer van 10 tot 20 procent geldt volgens de auteurs voor Google en Bing.')
    .replace('Gameplan</b> is het magazine', 'The Performance Issue</b> is het magazine'))

# ================================================================ volgorde

WIE = met(WIE, onder('het team aan het werk, breed beeld', 92, 'r'))
SCIENCE_R = met(SCIENCE_R, onder('een draaidag, met de cijfers op een scherm ernaast', 70, 'r'))
NUMBERS_R = met(NUMBERS_R, onder('een scherm met data, of de klant van onze klant in actie', 74, 'r'))
TIJDGEEST_R = met(TIJDGEEST_R, onder('iemand die scrolt op een telefoon', 70, 'r'))
PLATFORMS_R = met(PLATFORMS_R, onder('advertenties op verschillende schermen', 74, 'r'))
TIJD_R = met(TIJD_R, onder('een groeiende zaak: drukte, klanten, beweging', 78, 'r'))
PORTAAL_R = met(PORTAAL_R, onder('een ondernemer die op zijn telefoon het portaal bekijkt', 82, 'r'))
CTA = pg('zwart', '''
<div style="position:absolute;left:21mm;right:23mm;top:64mm">
  <div class="kicker">Klaar voor momentum?</div>
  <h2 style="font-size:52pt;color:#fff">Laten we kijken wat er voor jou in zit.</h2>
  <p class="intro" style="max-width:140mm">Vul de vragenlijst in, dan doen wij de quickscan. In het intakegesprek hoor je wat we zagen, en wat een klant jou mag kosten. Ook als we niet samen verder gaan.</p>
  <div style="display:flex;gap:8mm;align-items:center;margin-top:12mm"><div class="qr" style="outline:0"></div><div><div class="klein" style="color:rgba(255,255,255,.7)">Scan en start</div><div class="d" style="font-size:18pt">''' + VV('link naar de vragenlijst') + '''</div><div class="d" style="font-size:14pt;margin-top:3mm">045 792 0009</div></div></div>
</div>''')

PAGINAS = [
    ('cover', COVER), ('inhoud', INHOUD_L), ('', INHOUD_R),
    ('jim', JIM), ('verklaring', VERKLARING), ('casino', QUOTE_CASINO),
    ('wie', WIE), ('verhaal', VERHAAL_L), ('', VERHAAL_R),
    ('normaal', NORMAAL_L), ('', NORMAAL_R),
    ('kantoor', KANTOOR_L), ('', KANTOOR_R), ('ploeg', PLOEG_L), ('', PLOEG_R),
    ('science', SCIENCE_L), ('', SCIENCE_R), ('numbers', NUMBERS_L), ('', NUMBERS_R),
    ('tijdgeest', TIJDGEEST_L), ('', TIJDGEEST_R), ('likes', LIKES_L), ('', LIKES_R),
    ('platformen', PLATFORMS_L), ('', PLATFORMS_R),
    ('model', MODEL_L), ('', MODEL_R), ('tijd', TIJD_L), ('', TIJD_R),
    ('content', CONTENT_L), ('', CONTENT_R), ('boosters', BOOST_L), ('', BOOST_R),
    ('trechter', TRECHTER_L), ('', TRECHTER_R), ('voordeur', VOORDEUR_L), ('', VOORDEUR_R),
    ('portaal', PORTAAL_L), ('', PORTAAL_R), ('slim', v2.SLIM1), ('', v2.SLIM2),
    ('cases', v2.LOGOS), ('', v2.REVIEWS),
] + [('', p) for p in v2.case(1)] + [('', p) for p in v2.case(2)] + [
    ('tussen', TUSSEN), ('onderzoek', ONDERZOEK), ('investering', INVEST_L), ('', INVEST_R),
    ('verwacht', VERWACHT), ('opstart', OPSTART), ('fundament', FUNDAMENT), ('pakketten', PAKKETTEN),
    ('toolset', TOOLSET), ('doen', O(16)), ('partners', v2.PARTNERS), ('samen', v2.SAMEN),
    ('spelregels', REGELS1), ('', O(21)), ('jouwkant', O(22)), ('verder', eind()),
    ('padel', v2.PADEL_BEELD), ('', met(v2.PADEL, onder('de padelbaan, team en klanten na de wedstrijd', 96, 'r'))), ('bronnen', BRONNEN), ('cta', CTA), ('back', O(24)),
]

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

if len(PAGINAS) % 4:
    print('LET OP: %d pagina\'s, geen veelvoud van vier' % len(PAGINAS))
nummers = {k: i + 1 for i, (k, _) in enumerate(PAGINAS) if k}
body = '\n'.join(plaats(i + 1, p, len(PAGINAS)) for i, (_, p) in enumerate(PAGINAS))
body = re.sub(r'\{p:(\w+)\}', lambda m: '%02d' % nummers[m.group(1)], body)
css = ''.join(open(os.path.join(HIER, f)).read() for f in ('magazine.css', 'magazine-extra.css', 'magazine-v3.css'))
open(os.path.join(HIER, 'magazine.html'), 'w').write(
    '<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>%s</title><style>%s</style></head><body>\n%s\n</body></html>' % (TITEL, css, body))
print(len(PAGINAS), "pagina's")
