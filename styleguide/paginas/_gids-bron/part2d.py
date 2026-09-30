# -*- coding: utf-8 -*-
from common import *

FASE3 = """
<section class="sec" style="background:var(--p3b);border-top:none" id="fase-3"><div class="wrap">
<span class="kick" style="color:var(--p3)">FASE 3 · SAMENWERKEN</span>
<h2>Van live tot maand twaalf, en verder</h2>
<p class="sub">Alles hiervoor ging over verkopen en bouwen. Dit gaat over waarmaken. De klant kan elke maand opzeggen, dus elke maand moet laten zien waarom hij blijft.</p>
<div class="klok"><span style="flex:1" class="acc">LIVE</span><span style="flex:2">EERSTE WEKEN</span><span style="flex:6">MAAND 2 EN 3 · ALLEEN DE MOTOR</span><span style="flex:18">VANAF MAAND 4 · OPTIMALISEREN, DE CIJFERS KIEZEN DE VOLGORDE</span></div>
</div></section>
"""

OORZAKEN = [
 ['01 · Het budget is te klein voor het doel', 'Bereik', 'Kosten per aanvraag op of onder doel, aantal eronder, budget elke dag op, platform meldt beperking door budget', 'Budget naar wat de rekensom zegt; of doel omlaag; of langere terugverdientijd; of herverdelen naar het beste kanaal', 'Klant (kost geld)', 'Het beste slechte nieuws: de machine werkt, hij draait te langzaam. Daarom zeggen we vooraf dat we kunnen adviseren het budget te verhogen.'],
 ['02 · De markt is te klein voor dit budget', 'Bereik', 'Frequentie loopt op, bereik vlakt af, kosten per duizend stijgen, kosten per aanvraag lopen langzaam op', 'Gebied of doelgroep verbreden, tweede kanaal, aangrenzend aanbod, of juist minder budget', 'Wij', 'Er is een plafond en we weten vooraf niet waar het ligt. Raken we het, dan zeggen we het, ook als dat minder uitgeven betekent.'],
 ['03 · Seizoen', 'Bereik', 'De dip valt samen met zijn jaarlijkse dip; doorklik en conversie normaal, alleen volume zakt', 'Budget over het jaar verdelen, in het dal merk en e-maillijst opbouwen, maandnormen', 'Wij', 'We spreken normen per maand af, geen jaargemiddelde. Daarom vragen we vooraf hoe zijn seizoen loopt.'],
 ['04 · De advertentie werkt niet', 'Weergaven → bezoekers', 'Kosten per duizend normaal, doorklikratio onder norm over meerdere varianten en doelgroepen', 'Nieuwe hoeken, ander beeld, video, het aanbod naar de eerste seconde, draaidag naar voren', 'Wij', 'De snelste en goedkoopste knop, en hij is van ons. Binnen twee weken zichtbaar, en het zit in de retainer.'],
 ['05 · De landingspagina werkt niet', 'Bezoekers → aanvragen', 'Doorklik op orde, paginaconversie laag bij één variant, hoge uitstap, formulieren half ingevuld', 'Korter, belofte naar boven, formulier korter, bewijs toevoegen, laadtijd, pagina per doelgroep', 'Wij', 'Hier zeggen we niets over vóór duizend kliks op de pagina. Daaronder is elk verschil ruis.'],
 ['06 · Het aanbod is niet scherp genoeg', 'Bezoekers → aanvragen', 'Advertentie werkt, pagina is snel, conversie blijft laag over alle varianten; concurrent heeft lagere drempel of prijs', 'Instapaanbod, prijs of voorwaarden, garantie, kleinere eerste stap, ander bewijs', 'Klant', 'Dit kunnen wij niet voor hem oplossen. Wel meten en melden; de beslissing over zijn aanbod is van hem.'],
 ['07 · Te weinig merk en autoriteit', 'Bezoekers → aanvragen', 'Warme doelgroepen converteren, koude niet; na de advertentie zoeken mensen zijn naam en vinden weinig', 'Reviews verzamelen, bewijs zichtbaar maken, bedrijfsprofiel, merkcampagne, langere aanloop', 'Klant', 'De traagste van de tien: geen knop werkt binnen een maand. Daarom kijken we in de quickscan naar reviews en profiel.'],
 ['08 · Aanvragen te laat of niet opgevolgd', 'Aanvragen → klanten', 'Aanvragen en kosten op doel, klanten blijven achter, opvolgtijd loopt op of is onbekend', 'Opvolgtermijn afspreken en meten, vervanger, automatische bevestiging, afsprakenplanner, belscript', 'Klant', 'De meest voorkomende oorzaak, en de goedkoopste om op te lossen. We meten de opvolgtijd vanaf dag één.'],
 ['09 · Aanvragen van slechte kwaliteit', 'Aanvragen → klanten', 'Veel en goedkoop, weinig klanten, aanvragen passen niet, geen terugkoppeling', 'Oordeel per aanvraag, kwalificatievragen, doelgroep aanscherpen, waardegericht bieden, prijs noemen om te filteren', 'Samen', 'Zonder oordeel per aanvraag kunnen we alleen op aantal sturen. Daarom de belangrijkste afspraak van jouw kant.'],
 ['10 · De meting klopt niet', 'Alles', 'Zijn telling en ons dashboard lopen uiteen, conversies verdwijnen na een wijziging, knik zonder oorzaak', 'Meetopzet herstellen, consent nalopen, server-side meten, offline conversies, hosting', 'Wij', 'Het ergste van de tien, want het maakt de andere negen onbetrouwbaar. Daarom blokkeren nulmeting en meetopzet de start.'],
]

STAP08 = stap_kop('08', 'f3', 'FASE 3 · SAMENWERKEN', 'Live en het maandritme',
 'De campagne gaat aan: stap 3 en 4 van ons plan. Eerst alleen de motor, vanaf maand 4 de versnellers, in de volgorde die de cijfers aanwijzen. Elke maand een korte update, en een telefoontje van ons als er iets is.',
 [('WANNEER', 'Vanaf dag 19 van het fundament, zolang de samenwerking loopt'), ('WIE', 'Het vaste aanspreekpunt en de campagnerol; eigenaar bij de Performance Review'), ('HOE LANG', 'Maandelijks opzegbaar; retainer vooraf vanaf maand 2'), ('KLAAR ALS', 'Nooit. Elke maand staat er een update in het dashboard, en elk kwartaal is duidelijk of we op de doelregel zitten')],
 'stap-08') + klant('Aanvragen die binnenkomen in zijn dashboard, met bij elke aanvraag twee knoppen. De eerste aanvraag belt hij niet alleen: wij bellen hem eerder dan het systeem meldt. Elke maand een korte schriftelijke update. Een Performance Review op ons kantoor of online, die over resultaat gaat en een vast stramien volgt. Vragen stelt hij via support@, en hij krijgt binnen één werkdag antwoord.') + """
<h3>Live: het moment en de twee weken erna</h3>
""" + tl([
 ('Week 4', 'De kick-off met zijn team', 'Met wie belt, niet alleen met de directeur. Op papier: wie belt, binnen hoeveel tijd, en wat er gebeurt als diegene er niet is. Daarna een testaanvraag door de hele keten: advertentie, pagina, formulier, dashboard, melding, bevestiging.'),
 ('Dag 19', 'Aanzetten', 'Het live-bericht: dit staat er nu, hier komen je aanvragen binnen, dit doen we de komende twee weken.'),
 ('Dag 19 – 26', 'De eerste week dagelijks', 'Uitgaven, afkeuringen, de eerste aanvragen. Kijken en noteren; alleen ingrijpen bij iets wat aantoonbaar fout staat, want elke wijziging zet de leerfase terug.'),
 ('De eerste aanvraag', 'Wij bellen, niet mailen', 'Als wij eerder bellen dan het systeem meldt, is dat het verschil tussen een leverancier en een partner. Het kost vijf minuten.'),
 ('Dag 26', 'Eerste cijfers', 'Nog geen conclusies, wel de richting.'),
 ('Na twee weken', 'De eerste bijstelling', 'En uitleggen wat we bijstelden en waarom.'),
]) + """
<p style="margin-top:14px">Wat we vooraf zeiden, geldt nu: in de eerste maand kost een aanvraag twee tot drie keer het doelbedrag. Dat is de leerfase. De curve moet omlaag lopen; het niveau van maand 1 zegt niets.</p>

<h3>Maand 2 en 3: alleen de motor</h3>
<p>We leren welke zoekwoorden, doelgroepen en advertenties werken, en brengen de kosten per aanvraag tot rust. Hier voegen we bewust niets toe: geen SEO, geen e-mailcampagnes, geen nieuwe kanalen. Er is nog niets om ze op te richten.</p>
""" + ul(['Adverteren in zoekmachines en op social: budgetten, biedingen, zoekwoorden, uitsluitingen.', 'Wekelijks bijsturen op kosten per aanvraag, niet op bereik en niet op kliks.', 'De advertenties uit de draaidag tegen elkaar testen.', 'Elke aanvraag volgen tot in het dashboard, waar de klant per aanvraag zegt of hij iets waard was.', 'Van de klant: opvolging binnen de afgesproken tijd, en een oordeel per aanvraag.']) + """
<p>Aan het eind ligt er een stabiele kostprijs per aanvraag en de eerste data over wat converteert. De doelregel uit het voorstel geldt vanaf nu.</p>

<h3>Vanaf maand 4: optimaliseren</h3>
<p>Advertenties verbeteren, CRO, landingspagina’s verbeteren of toevoegen, e-mail en automation, SEO. Welke eerst, bepaalt de smalste schakel in de keten, niet het pakket en niet een plan van vandaag.</p>
""" + tbl(['Wat de cijfers laten zien', 'Wat eerst komt', 'Waarom'], [
 ['Veel kliks, weinig aanvragen', 'CRO: pagina, formulier, bewijs', 'Zelfde budget, meer aanvragen. Een procentpunt conversie is meer waard dan duizend euro budget.'],
 ['Er is een lijst met adressen, en klanten kunnen terugkomen', 'E-mail en automation', 'Hogere klantwaarde, dus meer ruimte per aanvraag, zonder extra mediabudget'],
 ['Duidelijk welke zoekwoorden klanten opleveren, en tegen welke prijs', 'SEO op precies die woorden', 'Een deel van het verkeer hoeft niet meer gekocht te worden. Wie met SEO begint, investeert maanden in woorden waarvan niet bekend is of ze converteren.'],
 ['Weinig kliks op veel weergaven', 'Advertenties: nieuwe hoeken en nieuwe content', 'De snelste en goedkoopste knop'],
 ['De doelgroep zit ook op LinkedIn of TikTok, of Bing levert goedkopere kliks', 'Een kanaal erbij', 'Meer bereik bij dezelfde koper, of dezelfde koper goedkoper'],
 ['Kosten per aanvraag op doel, aantal niet', 'Budget opschalen', 'Meer budget bij dezelfde kosten per aanvraag is de makkelijkste groei die er is'],
]) + """
<p style="margin-top:14px"><b>Opschalen en het pakket.</b> Groeit het advertentiebudget, dan groeit het pakket mee: meer campagnes, meer doelgroepen, meer bijsturen. Eén keer per jaar een nieuw doel voor het volgende jaar, en de vraag of het pakket nog past: is het Compete geworden, of Own?</p>

<h3>Het ritme</h3>
<p>Voor ieder pakket hetzelfde. Het verschil zit in de hoeveelheid.</p>
""" + tbl(['Wanneer', 'Wat', 'Enter', 'Compete', 'Own'], [
 ['Dagelijks', 'Alleen de eerste week na livegang: uitgaven, afkeuringen, eerste aanvragen', '●', '●', '●'],
 ['Wekelijks', 'Bijsturen op kosten per aanvraag: budgetten, biedingen, uitsluitingen. Zonder overleg, tenzij er iets is.', '●', '●', '●'],
 ['Maandelijks', 'Korte schriftelijke update in het dashboard: staan we op de doelregel, en zo nee, waarom niet', '●', '●', '●'],
 ['Nieuwe advertentiesets', 'Varianten om tegen de bestaande te testen', '1× per kwartaal', '1× per maand', '2× per maand'],
 ['Draaidag', 'Nieuw beeld, want advertenties slijten', '1× per jaar', '2× per jaar', '4× per jaar'],
 ['Performance Review', 'Over resultaat, vast stramien, op kantoor of online; bevestigd per mail', 'elk kwartaal', 'elke twee maanden', 'maandelijks'],
 ['Vragen en verzoeken', 'Via support@, antwoord binnen één werkdag', '●', '●', '●'],
])  + """
<h3>De Performance Review: over resultaat, met ons aan het roer</h3>
<p>De Performance Review gaat over resultaat, niet over wat we allemaal gedaan hebben. Op ons kantoor in Hulsberg of online; we gaan niet meer naar de klant. Wij hebben de regie: we weten precies wat de cijfers zijn, wat ze betekenen, en aan welke knoppen we kunnen draaien en gaan draaien. Elk overleg volgt hetzelfde stramien.</p>
""" + jk([
 ('Impressies', 'Hoe vaak zijn zijn advertenties getoond, per kanaal, en wat kostte dat per duizend?'),
 ('Websitebezoekers, en dus de doorklikratio', 'Hoeveel mensen klikten door naar de website, welk percentage van de impressies is dat, en wat kostte een klik?'),
 ('Aanvragen, en dus de conversieratio', 'Hoeveel aanvragen leverde dat op, welk percentage van de bezoekers is dat, en wat kostte een aanvraag, naast de doelregel?'),
 ('Klanten: hoeveel, wie, en wat een klant kostte', 'Kwalitatief: welke aanvragen werden klant, en waren dat de klanten die hij wil? Dit is de enige schakel die van hem is. Hij levert het antwoord aan met de knop “klant geworden” in het dashboard.'),
 ('Onze diagnose', 'Waar zit de smalste schakel, en waarom? Met de oorzaak uit de tien hieronder.'),
 ('Ons plan voor de periode erna', 'Welk percentage of aantal moet omhoog, en hoe we dat gaan realiseren: welke knop, welke content, welk kanaal.'),
 ('Vragen en opmerkingen', 'Daarna, en kort. De focus blijft op resultaat.'),
]) + grid(3, [
 kaart('Vooraf', 'Wij zetten de cijfers klaar uit het dashboard en hebben de diagnose en het plan al gemaakt. De klant heeft in het dashboard aangegeven welke aanvragen klant werden. Zonder dat laatste is stap 4 een gok.', 'VOORBEREIDING', 'b'),
 kaart('Tijdens', 'Wij leiden het gesprek, in de vaste volgorde. Geen presentatie van wat we deden, geen losse wensenlijst. Elke vraag die geen resultaat raakt, gaat naar support@.', 'REGIE', 'g'),
 kaart('Na afloop', 'Dezelfde dag een korte mail vanaf support@: de vier cijfers, de diagnose, het plan en wat er besloten is. Zo staat ook de review op één plek.', 'BEVESTIGING', 'l'),
]) + """

<h3>Continu monitoren: data beats opinion</h3>
<p>Het ritme hierboven is wat de klant ziet. Daaronder kijken wij doorlopend mee, zodat we een probleem zien voordat hij het merkt. We beslissen op cijfers, niet op smaak: een discussie over welke advertentie mooier is, beslechten we met een test. Het merk bepaalt de grenzen, de data kiest binnen die grenzen.</p>
""" + tbl(['Wat we volgen', 'Hoe vaak', 'Wanneer we in actie komen', 'Wie'], [
 ['Uitgaven per campagne en kanaal', 'Dagelijks, automatisch', 'Budget op voor de middag, of een campagne besteedt niets', 'Campagne'],
 ['Afgekeurde advertenties en accountmeldingen', 'Dagelijks, automatisch', 'Elke afkeuring of melding', 'Campagne'],
 ['De meting: komen conversies en aanvragen binnen', 'Dagelijks, automatisch', 'Een dag met verkeer maar zonder conversies, of dashboard en platform lopen uiteen', 'Techniek'],
 ['Landingspagina: bereikbaarheid en snelheid', 'Doorlopend', 'Uitval, of trager dan de norm uit de quickscan', 'Techniek'],
 ['Kosten per aanvraag tegen de doelregel', 'Wekelijks', 'Twee weken op rij boven het plafond', 'Campagne'],
 ['Doorklik, conversie en frequentie per advertentie', 'Wekelijks', 'Onder de norm, of frequentie loopt op: de advertentie slijt', 'Campagne en content'],
 ['Opvolgtijd en oordelen per aanvraag', 'Wekelijks', 'Aanvragen zonder oordeel, of opvolging trager dan afgesproken', 'Aanspreekpunt'],
 ['Ongeldige kliks en klikfraude', 'Wekelijks', 'Opvallende pieken; na de proefperiode de afweging ClickCease', 'Campagne'],
 ['De doelregel', 'Maandelijks', 'Elke maand in de update; twee maanden eronder: we zeggen het, met de oorzaak en de opties', 'Aanspreekpunt'],
]) + """
<p style="margin-top:14px">Nieuwe advertentiesets, draaidagen en varianten gaan net als in het fundament eerst door de merkcheck. Snel mag, off-brand niet.</p>

<h3>Als het resultaat tegenvalt</h3>
<p>Een diagnose, geen discussie. Dat werkt alleen als de meetlat er lag vóór er iets te meten viel. Loop de keten van links naar rechts en kijk waar het getal voor het eerst afwijkt: bereik, bezoekers, aanvragen, klanten. Dat is de hele diagnose.</p>
<h4 style="margin-top:22px">Eerst: wanneer mag je iets zeggen?</h4>
<p>Bij <i style="font-style:normal">n</i> conversies is de onzekerheid op dat ene getal ongeveer 1 ÷ √n. Twee varianten uit elkaar houden is veel strenger: het kleinste aantoonbare verschil is ongeveer 2,8 × √(2 ÷ n).</p>
""" + tbl(['Conversies per variant', 'Onzekerheid op één getal', 'Kleinste verschil (95%)', 'Wat je ermee kunt'], [
 ['30', '± 18%', '72%', 'Je weet ongeveer hoeveel. Twee varianten uit elkaar houden lukt niet.'],
 ['100', '± 10%', '40%', 'Een groot verschil wordt zichtbaar.'],
 ['200', '± 7%', '28%', 'Genoeg voor stoppen of doorgaan met een variant.'],
 ['400', '± 5%', '20%', 'Een verschil van een vijfde. Zelden binnen een jaar.'],
 ['1.000', '± 3%', '13%', 'Kleine verschillen. Alleen bij hoge volumes.'],
], right=(1, 2)) + """
<p style="margin-top:12px">Bij 21 aanvragen per maand duurt één afgeronde test tien maanden voor 100 per variant. “Wij A/B-testen je landingspagina” is bij deze volumes een holle claim. We testen scherp waar volume zit, bij advertenties, koppen en beeld, en beoordelen de pagina op de trend en op wat we zien gebeuren. Dat is geen zwakkere methode, het is de enige die bij dit volume eerlijk is.</p>
<h4 style="margin-top:22px">Tien oorzaken, met het patroon dat ze verraadt</h4>
""" + tbl(['Oorzaak', 'Waar', 'Wat je ziet', 'Wat eraan te doen is', 'Van wie', 'Wat we vooraf zeggen'], OORZAKEN) + """
<p style="margin-top:14px">Samen 48 oplossingen: 29 voeren wij zelf door binnen de retainer, 15 vragen een beslissing of actie van de klant, 4 kosten extra geld. Bij zeven van de tien oorzaken ligt minstens één knop bij de klant. Dat moet vooraf gezegd worden, met de cijfers erbij die het zouden aantonen: dan is het een afspraak die beide kanten scherp houdt, en achteraf geen verwijt.</p>

<h3>Opzeggen en vertrekken</h3>
<p>Maandelijks, voor allebei. Tot en met de laatste dag van de maand; de maand erna komt er geen factuur meer, mits er geen budgetten meer openstaan. Alles staat op zijn naam, dus hij neemt zijn advertentieaccounts, zijn e-maillijst en zijn licenties mee zonder dat er iets overgezet hoeft te worden. Dat maakt vertrekken makkelijk, en dat moeten we willen: een klant blijft omdat het werkt.</p>
""" + raakt(ul([
 '<b>Het maandritme is het product.</b> Alles hiervoor is eenmalig; hier verdienen we ons geld en hier kan de klant elke maand weg. Een maand zonder zichtbare update is een maand waarin hij zich afvraagt waarvoor hij betaalt.',
 '<b>De doelregel uit stap 04</b> is de doellijn in het dashboard en de vraag waar elke Performance Review om draait.',
 '<b>De afspraken van jouw kant</b> worden hier cijfers: opvolgtijd (oorzaak 08) en oordelen per aanvraag (oorzaak 09) zijn zichtbaar voor allebei.',
 '<b>Continu monitoren is wat “cijfers leidend” waarmaakt.</b> Zonder dagelijkse check op meting en uitgaven ontdek je een fout pas in de maandupdate, en dan heeft de klant een maand betaald voor lucht.',
 '<b>Enter heeft maar één draaidag per jaar,</b> en die zat in het fundament. Advertenties slijten; bij Enter komt nieuw beeld pas het jaar erna, tenzij hij een extra draaidag los afneemt.',
], '')) + open_(ul([
 '<b>Dit is het grootste gat in de reis.</b> Het fundament is opengewerkt in 76 taken; de twaalf maanden daarna nog niet. Nodig: een stappenlijst voor maand 2 tot en met 12, het live-bericht, de vorm van de maandelijkse update, en het moment waarop wij ingrijpen bij achterstand.',
 '<b>De Performance Review: hoe vaak per pakket, en hoe lang.</b> Het stramien staat. Voorstel: bij Enter elk kwartaal, bij Compete elke twee maanden, bij Own maandelijks, telkens 45 minuten. Minder vaak dan maandelijks bij kleine volumes, omdat de cijfers van maand tot maand dan vooral toeval laten zien. Wordt vastgezet met de nieuwe indeling van de retainers.',
 '<b>De drempels voor de monitoring zijn een voorstel.</b> Vastzetten, en automatisch laten melden vanuit het dashboard en de platformen, zodat het niet van iemands oplettendheid afhangt.',
 '<b>Na welke termijn zonder beweging</b> melden wij het uit onszelf? “Een afgesproken termijn” is nog geen getal.',
 '<b>Drie maanden alleen de motor is een aanname.</b> Hoe snel de kosten tot rust komen, hangt af van het volume. Toetsen aan de laatste vijf campagnes en er een norm van maken.',
 '<b>Normen per branche</b> voor doorklik en conversie ontbreken. Zonder eigen normen is “onder de norm” een mening.',
 '<b>Wat een vertrekkende klant meeneemt.</b> Advies: een volledige export, standaard en ongevraagd. Open: de landingspagina op onze omgeving, en het dashboard na het stoppen (de tarieven zeggen dat hij het houdt).',
], '')) + stap_eind()

P2D = FASE3 + STAP08
