# -*- coding: utf-8 -*-
from common import *

HERO = """
<header class="hero"><div class="wrap">
<span class="eyebrow">James Robinson · Marketing &amp; Branding</span>
<h1>De James Robinson-gids</h1>
<p class="lead">Hoe we werken, van de eerste klik van een klant tot maand twaalf. Lees hem van boven naar beneden: eerst waar het om draait, dan de klantreis stap voor stap, en aan het eind hoe alles samenhangt en wat nog open ligt. Wat hier staat, geldt.</p>
<div class="meta"><span><b>Versie</b> 30 september 2026</span><span><b>Eigenaren</b> Jim Coumans en Jim Kikken</span><span><b>Status</b> werkdocument, ter review</span></div>
</div></header>
"""

ROUTE = """
<section class="sec" id="overzicht"><div class="wrap">
<span class="kick">DE HELE REIS IN ÉÉN BEELD</span>
<h2>Drie fases, acht stappen</h2>
<p class="sub">Een klant gaat in ongeveer twee weken van eerste klik naar handtekening, in vier weken van handtekening naar een campagne die draait, en blijft daarna zolang de cijfers kloppen. Elke stap hieronder heeft een eigen hoofdstuk.</p>
<div class="route">
 <div class="fase f1"><span class="fl">FASE 1 · VERKOPEN</span><h4>Van klik tot akkoord</h4><span class="ft">Ongeveer twee weken · de klant betaalt niets</span><ol>
  <li><a href="#stap-01"><span class="n">01</span><div><b>Van aanvraag tot afspraak</b><span>Automatisch: video, vragenlijst, uitkomst</span></div></a></li>
  <li><a href="#stap-02"><span class="n">02</span><div><b>De quickscan</b><span>Wij bekijken site en markt, een half uur</span></div></a></li>
  <li><a href="#stap-03"><span class="n">03</span><div><b>Het intakegesprek</b><span>Een uur aan tafel</span></div></a></li>
  <li><a href="#stap-04"><span class="n">04</span><div><b>Voorstel en voorstelgesprek</b><span>Drie werkdagen, dan 45 minuten</span></div></a></li>
 </ol></div>
 <div class="fase f2"><span class="fl">FASE 2 · STARTEN</span><h4>Van handtekening tot live</h4><span class="ft">Ongeveer vijf weken · maand 1</span><ol>
  <li><a href="#stap-05"><span class="n">05</span><div><b>Tekenen en betalen</b><span>Moneybird, dezelfde dag</span></div></a></li>
  <li><a href="#stap-06"><span class="n">06</span><div><b>De onboarding</b><span>Drie werkdagen</span></div></a></li>
  <li><a href="#stap-07"><span class="n">07</span><div><b>Het fundament</b><span>Set-up en content, vier weken</span></div></a></li>
 </ol></div>
 <div class="fase f3"><span class="fl">FASE 3 · SAMENWERKEN</span><h4>Van live tot maand twaalf</h4><span class="ft">Maandelijks opzegbaar, voor allebei</span><ol>
  <li><a href="#stap-08"><span class="n">08</span><div><b>Live en het maandritme</b><span>Eerste weken, maand 2 en 3, vanaf maand 4</span></div></a></li>
 </ol></div>
</div>
<div class="geld">
 <div><b>Fase 1</b>Niets. De quickscan, het intakegesprek en het voorstel zitten in ons tarief, niet op een factuur.</div>
 <div><b>Fase 2</b>Het fundament, € 4.500, bij ondertekening. Licenties op zijn naam vanaf de dag dat ze aangaan.</div>
 <div><b>Fase 3</b>Retainer en dashboard vooraf per maand, vanaf maand 2. Advertentiebudget rechtstreeks aan de advertentieplatformen.</div>
</div>
</div></section>
"""

DEEL1_OPEN = """
<section class="deel" id="deel-1"><div class="wrap">
<span class="kick">DEEL 1</span>
<h2>Waar het om draait</h2>
<p>Voordat de klantreis begint: wat we doen, waarom zo, wat het kost, welke regels altijd gelden en hoe we klinken. Alles in de stappen daarna volgt hieruit.</p>
</div></section>
"""

WIE = """
<section class="sec" id="wat-we-doen"><div class="wrap">
<span class="kick">1.1 · WAT WE DOEN</span>
<h2>Aanvragen via zoekmachines en social, die steeds goedkoper worden</h2>
<p class="sub">We zorgen dat er aanvragen binnenkomen via advertenties in zoekmachines en op social media, en dat die steeds goedkoper worden. De website van de klant is daarbij het middelpunt. Wat daar niet aan bijdraagt, doen we niet, of niet zelf.</p>
""" + grid(3, [
 kaart('Wie we zijn', 'Marketingbureau in Hulsberg, bedacht in 2017 en opgericht in 2018. Ongeveer tien mensen; zeven begonnen hier als stagiair. Eigenaren: Jim Coumans en Jim Kikken, via James Robinson Group BV.', 'JAMES ROBINSON'),
 kaart('Hoe we samenwerken', 'Als performancebureau met een vast product: een fundament en een retainer met een vaste maandprijs. Niet als collega of externe marketingafdeling. Radicaal transparant: de klant ziet in zijn dashboard wat wij zien.', 'HET MODEL'),
 kaart('Waar we naartoe willen', 'Het meest toonaangevende bureau van Limburg. Niet in omzet of grootte, maar in voorbeeld zijn: zelf de beste marketing hebben. Dat schrijven we nergens op; je moet het merken.', 'DE AMBITIE'),
]) + """
<h3>Wat voor bureau we zijn</h3>
<p>Een performancebureau dat ook aan de lange termijn denkt. We sturen op aanvragen en wat ze kosten, maar nooit ten koste van het merk. Drie dingen gelden bij alles wat we doen:</p>
""" + grid(3, [
 kaart('Performance eerst', 'We worden afgerekend op aanvragen en wat een aanvraag kost. Elke euro is meetbaar, en de klant ziet dezelfde cijfers als wij.', 'KORTE TERMIJN', 'b'),
 kaart('Altijd on-brand', 'Elke uiting die naar buiten gaat, klopt met het merk van de klant: kleur, typografie, toon, beeld. Een advertentie die vandaag klikt maar het merk beschadigt, is op termijn duurder dan hij oplevert. Consistent herkend worden is ook performance.', 'LANGE TERMIJN', 'l'),
 kaart('Data beats opinion', 'We monitoren continu en beslissen op wat de cijfers laten zien, niet op wat iemand mooi vindt, ook wij niet. Het merk bepaalt de grenzen; binnen die grenzen kiest de data.', 'ALTIJD', 'g'),
]) + """
<h3>Waarom deze opzet</h3>
<p>De propositie is zo gebouwd omdat de oude niet klopte. Elke keuze hieronder lost een probleem op dat we zelf hadden.</p>
""" + tbl(['Wat niet werkte', 'Wat we nu doen'], [
 ['Klanten vertrokken na een jaar, en het volgende bureau scoorde op ons fundament', 'Het fundament is een eigen, betaald product. De klant blijft omdat we meetbaar beter worden, niet omdat hij vastzit.'],
 ['Acht dingen tegelijk, nergens hard op sturen', 'Eén motor (adverteren) en versnellers pas als de cijfers er zijn'],
 ['Hoge retainers werden personeel', 'Drie retainers met een harde grens aan wat erin zit'],
 ['Elke onboarding werd opnieuw bedacht: 58 tot 96 uur', 'Een vast fundament van 52,5 uur, 27 onderdelen, 76 taken met standaarden'],
 ['De prijs ontstond na de diagnose, en was dus niet te controleren', 'De prijslijst ligt er vóór het gesprek. De quickscan wijst alleen aan welke regels gelden.'],
 ['Het bedrijf draaide niet zonder de twee eigenaren', 'Vaste stappen, templates en checklists. Tot aan de quickscan draait de verkoop zonder mens; daarna doen vaste medewerkers het meeste werk.'],
]) + """
</div></section>
"""

MODEL = """
<section class="sec alt" id="het-model"><div class="wrap">
<span class="kick">1.2 · HET MODEL</span>
<h2>Eén middelpunt, één motor, drie versnellers</h2>
<p class="sub">Elke laag heeft één taak. Zodra die door elkaar lopen, wordt marketing een verzameling activiteiten in plaats van een systeem dat ergens op uitkomt. Intern heet dit de ARENA-methode; naar buiten noemen we het gewoon onze werkwijze.</p>
<div class="stroom">
 <div class="s"><span class="sl">DE MOTOR</span><b>Adverteren in zoekmachines en op social</b><span>Het enige dat je vandaag aanzet en morgen meet. Duur, maar direct stuurbaar. Content is de brandstof.</span></div>
 <div class="pijl">→</div>
 <div class="s"><span class="sl">HET MIDDELPUNT</span><b>De website</b><span>Hier wordt iemand klant, of niet. Elke advertentie landt hier, elk cijfer komt hier vandaan.</span></div>
 <div class="pijl">→</div>
 <div class="s"><span class="sl">DE VERSNELLERS</span><b>CRO, e-mail en automation, SEO</b><span>Maken elke klant daarna goedkoper.</span></div>
</div>
""" + grid(3, [
 kaart('CRO', 'Meer van hetzelfde verkeer wordt klant: kortere formulieren, duidelijkere pagina’s, bezwaren wegnemen waar ze opkomen. <b>Zelfde budget, meer aanvragen.</b>', 'VERSNELLER'),
 kaart('E-mail en automation', 'Mensen die er al waren terughalen zonder opnieuw te betalen, en bestaande klanten meer laten opleveren. <b>Hogere klantwaarde, dus meer ruimte per aanvraag.</b>', 'VERSNELLER'),
 kaart('SEO', 'Verkeer dat je niet hoeft te kopen, op de woorden waarvan je inmiddels weet dat ze klanten opleveren. <b>Een deel van het verkeer wordt gratis.</b>', 'VERSNELLER'),
]) + """
<p style="margin-top:18px">De drie versnellers doen iets anders, maar komen uit op één getal: wat een klant kost. Daarom verkopen we ze niet los. Los verkocht heeft geen van de drie een ijkpunt.</p>

<h3>De kanalen: zoekmachines en social, alleen adverteren</h3>
<p>We adverteren waar de koper van de klant zit. Welke kanalen, bepalen de doelgroep en de cijfers, niet een vaste lijst. We vullen geen social feeds: op social media doen we alleen advertenties.</p>
""" + tbl(['Kanaal', 'Wat het doet', 'Wanneer'], [
 ['Google Ads', 'Vangt wie nu zoekt', 'Standaard, bij iedereen'],
 ['Meta: Facebook en Instagram', 'Zet vraag in gang bij mensen die lijken op wie er al koopt, en haalt bezoekers terug', 'Standaard, bij iedereen'],
 ['Microsoft Ads (Bing)', 'Dezelfde zoekvraag, vaak goedkopere kliks en een ouder, zakelijker publiek', 'Als de cijfers uit Google laten zien dat er meer te halen is'],
 ['LinkedIn', 'Bereikt op functie, branche en bedrijfsgrootte', 'Bij B2B met een duidelijke functie als koper; duurder per klik'],
 ['TikTok', 'Bereik bij een jonger publiek, met video', 'Als de doelgroep daar zit en er videomateriaal is'],
]) + """
<p style="margin-top:14px">In het fundament zetten we standaard Google Ads en Meta op, altijd allebei, ook als we met één kanaal starten. Microsoft Ads, LinkedIn en TikTok komen erbij als doelgroep en cijfers erom vragen.</p>

<h3>De brandstof: marketingcontent</h3>
<p>Een motor zonder brandstof doet niets. Advertenties draaien op beeld, en beeld slijt: dezelfde advertentie werkt na een paar weken minder. Daarom zit content in de motor, niet ernaast.</p>
""" + grid(3, [
 kaart('Wat we maken', 'Marketingcontent: foto, video, animatie en graphics die in advertenties werken. Gemaakt voor het formaat van het kanaal (9:16, 4:5, 1:1) en in varianten om tegen elkaar te testen. Altijd on-brand.', 'WEL', 'g'),
 kaart('Wat we niet maken', 'Geen bedrijfsvideo’s: een film over het bedrijf levert geen aanvragen op. Geen branded content, tenzij de advertenties erom vragen, bijvoorbeeld omdat de cijfers laten zien dat koude doelgroepen het merk nog niet vertrouwen.', 'NIET', 'r'),
 kaart('Hoe het binnenkomt', 'De draaidag bij de klant op locatie levert het beeld voor een kwartaal. Graphics en animatie maken we uit dat beeld en de advertentiesjablonen. Hoeveel draaidagen, hangt aan het pakket.', 'HOE', 'b'),
]) + """
<h3>Waarom niet alles tegelijk</h3>
""" + jk([
 ('Eerst het middelpunt meetbaar maken', 'Zonder betrouwbare meting weet je van niets of het werkt. Daarom bouwen we de landingspagina bij ons: dan zijn snelheid en meting van ons, niet van zijn webbouwer.'),
 ('Dan de motor, en alleen de motor', 'Advertenties leveren binnen weken wat andere kanalen pas na maanden geven: welke woorden, welke doelgroepen, welke boodschap. Die data heb je nodig om de versnellers ergens op te richten.'),
 ('Dan de versnellers, in de volgorde die de cijfers aanwijzen', 'CRO kan pas als er verkeer is, e-mail pas als er adressen zijn, SEO loont pas als je weet welke woorden converteren. Welke eerst komt, bepaalt de smalste schakel in de keten.'),
]) + """

<h3>De keten: vier schakels, drie percentages</h3>
<p>Tussen een advertentie en een klant zitten vier schakels. Elke schakel heeft een percentage, en elk percentage heeft zijn eigen knoppen. Dit voorbeeld hoort bij 21 aanvragen per maand tegen € 150 per aanvraag.</p>
<div class="stroom">
 <div class="s"><span class="sl">WEERGAVEN</span><b class="num">23.333</b><span>per maand</span></div><div class="pijl">3%</div>
 <div class="s"><span class="sl">BEZOEKERS</span><b class="num">700</b><span>doorklikratio 3%</span></div><div class="pijl">3%</div>
 <div class="s"><span class="sl">AANVRAGEN</span><b class="num">21</b><span>conversieratio 3%</span></div><div class="pijl">20%</div>
 <div class="s"><span class="sl">KLANTEN</span><b class="num">4</b><span>scoringsratio 20%</span></div>
</div>
""" + grid(2, [
 kaart('Drie schakels zijn van ons, één van de klant', 'Wij zorgen voor weergaven, kliks en aanvragen. Of een aanvraag klant wordt, bepaalt de klant: met hoe snel hij belt, zijn aanbod en zijn prijs. Dat is een taakverdeling, en die zeggen we vóór de start.', 'DE BELANGRIJKSTE REGEL', 'b'),
 kaart('Een procentpunt conversie is meer waard dan duizend euro budget', 'Van 3% naar 4% conversie levert zeven extra aanvragen op zonder één euro extra, en een aanvraag kost dan € 112 in plaats van € 150. Meer budget geeft meer aanvragen tegen dezelfde prijs; een beter percentage geeft ze tegen een lagere. We beginnen met de motor, maar verdienen ons geld met de versnellers.', 'DE HEFBOOM', 'l'),
]) + """

<h3>Waarom we geen social media beheer doen</h3>
<p>Social media beheer is voor veel ondernemers het gezicht van marketing. We doen het niet meer, en dat is geen smaakkwestie.</p>
""" + grid(2, [
 kaart('€ 1.000 aan social media beheer', 'Ongeveer tien uur maaktijd. Het hele bedrag gaat naar arbeid: berichten maken voor mensen die je al volgen. Er gaat geen cent naar bereik, want organisch bereik koop je niet. En tijd schaalt niet: elke maand opnieuw, bij elke klant apart.', 'ARBEID', 'r'),
 kaart('€ 1.000 aan adverteren', 'Nul uur maaktijd uit dit bedrag. Het hele bedrag gaat naar bereik bij mensen die je zelf kiest en die je nog niet kennen. Het sturen zit in de retainer, en dat werk is voor honderd klanten dezelfde handgreep.', 'BEREIK', 'g'),
]) + """
<p style="margin-top:18px"><b>De oefening die het gesprek laat kantelen.</b> Laat de klant zijn eerste vijftig volgers tellen: bestaande klanten, oud-medewerkers en sollicitanten, concurrenten en leveranciers, vrienden en familie, en mensen die klant kunnen worden. Wat in die laatste groep overblijft, is zijn markt op dat kanaal. Hij rekent het zelf uit, dus het is zijn conclusie en niet onze claim.</p>
<p><b>Drie krachten maken het erger:</b> de platformen verdienen aan advertenties en niet aan gratis bereik, het algoritme kiest voor de kijker en niet voor het bedrijf, en het werk schaalt niet. Viraal gaan kan, maar het is niet te herhalen en niet in te plannen, dus je kunt er geen omzetdoel op bouwen.</p>
""" + key('HET ONDERSCHEID DAT IEDEREEN BIJ ONS MOET KENNEN', 'Wij stoppen met posten, niet met social media.', '<p>Vraagt een klant of we “iets met social doen”, dan is het antwoord ja: we adverteren op Instagram en Facebook, bij mensen die hem nog niet volgen. Dat zit in elk pakket. Wat we niet meer doen, is zijn kanalen bijhouden. Wil hij zelf blijven posten, dan kunnen we social-mediatemplates of een contentsessie leveren als eigen project.</p>') + """
</div></section>
"""

PLAN = """
<section class="sec" id="ons-plan"><div class="wrap">
<span class="kick">1.3 · ONS PLAN</span>
<h2>Voor iedere klant hetzelfde plan</h2>
<p class="sub">Dit is onze werkwijze, en daar wijken we niet van af. Alleen de datums en het doel zijn van de klant. De variatie komt pas als de eerste resultaten er zijn.</p>
<div class="klok"><span style="flex:2" class="acc">SET-UP</span><span style="flex:1">CONTENT</span><span style="flex:1">LIVE</span><span style="flex:8">ADVERTEREN EN EERSTE RESULTATEN · MAAND 2 EN 3</span><span style="flex:9">OPTIMALISEREN · VANAF MAAND 4</span></div>
""" + jk([
 ('Set-up · maand 1, week 1 tot en met 3', 'Meting, advertentieaccounts, e-mail, het marketingdashboard, de campagne en de landingspagina. Alles op naam van de klant.'),
 ('Content shooten · maand 1, week 2', 'De draaidag bij de klant op locatie, daarna marketingcontent in alle formaten: foto, video, animatie en graphics. Geen bedrijfsvideo, geen branded content.'),
 ('Adverteren en eerste resultaten · live eind maand 1, dan maand 2 en 3', 'Alleen de motor draait. We leren welke zoekwoorden, doelgroepen en advertenties werken, en brengen de kosten per aanvraag tot rust. Hier voegen we bewust niets toe.'),
 ('Optimaliseren · vanaf maand 4', 'Advertenties verbeteren, CRO, landingspagina’s verbeteren of toevoegen, e-mail en automation, SEO. Wat eerst komt, bepalen de cijfers: bij de een SEO, bij de ander e-mail.'),
]) + """
<p style="margin-top:18px">Stap 1 en 2 samen zijn het fundament: maand 1, eenmalig betaald. Vanaf stap 3 loopt de retainer. Het doel van de klant geldt vanaf maand 4, niet vanaf maand 1, want de eerste weken leert het algoritme en zijn aanvragen duurder.</p>

<h3>Wat we doen, en wat niet</h3>
<p>De lijst waar het team naar wijst als een klant iets vraagt. Wat in de retainer zit, staat vast. Voor de middelste kolom kiezen we per vraag: zelf als project met een prijs vooraf, of een partner. Hoe beter de propositie loopt, hoe meer daarvan naar partners gaat. De klant mag elke marketingvraag bij ons neerleggen; soms is het antwoord “daarvoor moet je bij haar zijn”.</p>
""" + grid(3, [
 kaart('In de retainer', ul(['Adverteren in zoekmachines en op social', 'Marketingcontent: foto, video, animatie, graphics', 'Landingspagina’s bij ons, aanpassen en testen', 'CRO op alles waar ons verkeer landt', 'E-mail en automation', 'SEO op woorden die converteren', 'Draaidagen en advertentiesets naar pakketgrootte'], ''), 'ALTIJD', 'g'),
 kaart('Eigen project of partner', ul(['Webdevelopment', 'Design en branding', 'Social-mediatemplates en contentsessies', 'Content boven de afgesproken draaidagen', 'Koppelingen met systemen van de klant'], ''), 'PER VRAAG', 'o'),
 kaart('Doen we niet', ul(['Losse campagnes zonder samenwerking', 'E-commerce als propositie', 'Werving als propositie', 'Social feeds vullen en beheren', 'Bedrijfsvideo’s', 'Branded content, tenzij de advertenties erom vragen', 'Leads opvolgen', 'Uren verantwoorden', 'Marge op werk van een ander'], ''), 'NOOIT', 'r'),
]) + """
<p style="margin-top:18px"><b>Twee vaste keuzes in de uitvoering.</b> Landingspagina’s bouwen we op onze eigen omgeving, op een subdomein van de klant; in zijn website komen alleen de meetcode en de cookiebanner. En we koppelen niet met zijn CRM of andere systemen: aanvragen landen in het marketingdashboard, dat naast zijn eigen systeem staat.</p>
""" + raakt(ul([
 '<b>De landingspagina bij ons</b> maakt het werk voor iedereen gelijk (vier uur is vier uur, welk CMS hij ook heeft), maar je legt bij elke klant uit waarom zijn belangrijkste advertentiepagina op een subdomein staat. Die pagina bouwt geen autoriteit op voor zijn hoofddomein; voor een advertentiepagina maakt dat niet uit.',
 '<b>Geen koppelingen</b> houdt het een product in plaats van eindeloos maatwerk, maar dan moet het marketingdashboard er wel zijn vóór de eerste klant. Zonder dashboard kunnen we “wij koppelen niet” niet waarmaken.',
 '<b>Het doel vanaf maand 4</b> moet in het voorstel staan. Wie het jaardoel vanaf dag één belooft, staat in maand drie achter op een schema dat nooit klopte.',
], '')) + """
</div></section>
"""

GELD = """
<section class="sec alt" id="wat-het-kost"><div class="wrap">
<span class="kick">1.4 · WAT HET KOST</span>
<h2>Eén fundament, drie retainers, en de rest op naam van de klant</h2>
<p class="sub">De prijslijst is voor iedereen gelijk en de klant krijgt hem vóór het intakegesprek, dus voordat wij weten wat er bij hem mis is. De quickscan kan de prijs niet veranderen, alleen aanwijzen welke regels voor hem gelden. Alle bedragen zijn exclusief btw.</p>

<h3>Het fundament: € 4.500 eenmalig</h3>
""" + grid(2, [
 kaart('Deel 1 · De basis', ul(['Doelgroep, boodschap en concurrentiebeeld', 'Technische audit en meetopzet', 'Advertentieaccounts op zijn naam', 'MailerLite met zijn contacten', 'Zijn marketingdashboard', 'De nulmeting'], ''), 'ONGEVEER 23 UUR · 44%', 'b'),
 kaart('Deel 2 · Je eerste campagne', ul(['Zoekwoorden, campagnestructuur, advertenties', 'Een landingspagina met formulier en bedankpagina', 'Een volledige draaidag bij de klant', 'Montage in drie formaten, plus stills', 'Kick-off, testaanvraag, eerste week dagelijks'], ''), 'ONGEVEER 29,5 UUR · 56%', 'l'),
]) + """
<p style="margin-top:18px">Eén prijs, niet los verkrijgbaar. Deel 1 zonder deel 2 is een stopcontact zonder apparaat: meting en accounts leveren zelf nul aanvragen op. Deel 2 zonder deel 1 levert aanvragen op die je niet kunt meten, opvolgen of verbeteren. Naar buiten heet het nooit “set-up”: dat klinkt als accounts aanmaken en verstopt dat meer dan de helft in een echte campagne zit. Een dag filmen alleen kost extern al ongeveer € 1.500.</p>

<h3>Per maand en per jaar</h3>
<p>Alleen de retainer en het dashboard gaan naar ons. De rest staat op naam van de klant en wordt rechtstreeks door de leverancier gefactureerd. Wij richten het in; hij vult zelf zijn betaalgegevens in en kiest per licentie maand of jaar.</p>
""" + tbl(['Post', 'Aan wie', 'Wanneer', 'Bedrag'], [
 ['Retainer Enter', 'James Robinson', 'Per maand vooraf, vanaf maand 2', '€ 1.000'],
 ['Retainer Compete', 'James Robinson', 'Per maand vooraf, vanaf maand 2', '€ 1.500'],
 ['Retainer Own', 'James Robinson', 'Per maand vooraf, vanaf maand 2', '€ 2.000'],
 ['Marketingdashboard', 'James Robinson', 'Altijd. Blijft van hem als hij stopt', '€ 25 p/m of € 250 p/j <span class="chip o">VOORLOPIG</span>'],
 ['Advertentiebudget', 'De advertentieplatformen, rechtstreeks', 'Per maand, via zijn eigen accounts', 'minimaal € 1.000 / 2.500 / 7.500'],
 ['E-mailplatform (MailerLite)', 'MailerLite', 'Altijd, vanaf dag één', 'vanaf € 9,90 p/m, volgt de lijstgrootte'],
 ['Cookiescript', 'Webmix', 'Altijd: zonder toestemming mag je niet meten', '€ 150 p/j'],
 ['Klikfraudebescherming (ClickCease)', 'ClickCease', 'Aanbevolen als hij adverteert', 'vanaf $ 99 p/m'],
 ['Hosting en onderhoud', 'Webmix', 'Alleen als hij overzet; migratie is gratis', '€ 85 p/m'],
 ['Bezoekersherkenning (Leadinfo)', 'Leadinfo', 'Optioneel, alleen zinvol bij B2B', 'staffel'],
 ['Afsprakenplanner (Calendly)', 'Calendly', 'Optioneel, per gebruiker', '€ 15 p/m'],
], right=(3,)) + """

<h3>Eenmalig, alleen als de quickscan het vindt</h3>
""" + tbl(['Post', 'Wanneer', 'Aan wie', 'Bedrag'], [
 ['Snelheid in de site zelf', 'Laadtijd haalt de norm niet, en dat ligt niet aan de server', 'Webmix', '€ 750 <span class="chip o">SCHATTING</span>'],
 ['Redirects en dode links', 'Links lopen dood of verwijzen door naar een omleiding', 'Webmix', '€ 500 <span class="chip o">SCHATTING</span>'],
 ['E-mailauthenticatie', 'SPF, DKIM of DMARC ontbreekt', 'Webmix', '€ 250 <span class="chip o">SCHATTING</span>'],
 ['Afsprakenplanner opzetten', 'Alleen als hij afspraken laat inplannen', 'James Robinson', '€ 250'],
 ['Huisstijl ontwikkelen', 'Alleen als er geen bruikbaar merk ligt', 'James Robinson', 'apart traject'],
], right=(3,)) + """
<p style="margin-top:14px">Bij een gezonde site is dit alles nul. Meting, indexatie en het bedrijfsprofiel leiden nooit tot een extra rekening: dat werk zit aan onze kant, en dus in het fundament.</p>

<h3>Wat per pakket verschilt</h3>
<p>Iedereen krijgt toegang tot hetzelfde: adverteren, SEO, e-mail, automation, CRO en landingspagina’s. Wat verschilt, is hoeveel. Het pakket volgt uit de rekensom in stap 04, niet uit wat wij willen verkopen.</p>
""" + tbl(['', 'Enter', 'Compete', 'Own'], [
 ['Retainer per maand', '€ 1.000', '€ 1.500', '€ 2.000'],
 ['Advertentiebudget per maand', '€ 1.000 – 2.500', '€ 2.500 – 7.500', 'vanaf € 7.500'],
 ['Nieuwe advertentiesets', '1 per kwartaal', '1 per maand', '2 per maand'],
 ['Draaidagen voor nieuw beeld', '1 per jaar', '2 per jaar', '4 per jaar'],
 ['Performance Review', 'elk kwartaal', 'elke twee maanden', 'maandelijks'],
]) + """
<p style="margin-top:14px">De draaidag in het fundament is draaidag één van het jaar. Bij Enter betekent dat: dat jaar geen tweede. Dat zeggen we in het voorstelgesprek, niet in maand vier.</p>

<h3>Wat we na het tekenen vaak tegenkomen</h3>
<p>Met de toegangen zien we meer dan de quickscan van buitenaf. Wat buiten het fundament valt, doen we nooit “even erbij omdat het klein is”: dan betaalt een ander het. We bieden het los aan, met een prijs vooraf, en de klant beslist.</p>
""" + tbl(['Wat', 'Wanneer', 'Aan wie', 'Indicatie'], [
 ['WordPress en plugins bijwerken', 'Als updates lang zijn blijven liggen', 'Webmix', 'volgt'],
 ['Back-ups inrichten', 'Geen herstelbare back-up, en hij zet niet over', 'Webmix', 'volgt'],
 ['Een extra landingspagina', 'Voor een tweede dienst of doelgroep', 'James Robinson', 'volgt'],
 ['Een extra draaidag of contentsessie', 'Boven de draaidagen van zijn pakket', 'James Robinson', 'volgt'],
 ['Social-mediatemplates', 'Als hij zelf wil blijven posten', 'James Robinson', 'volgt'],
]) + """

<h3>Wat er niet op de lijst staat</h3>
""" + grid(3, [
 kaart('Geen uurtarief', 'We verkopen geen uren. De klant koopt een fundament en een maandelijkse samenwerking met een vaste inhoud. Hoeveel uur erin gaat, is ons probleem.'),
 kaart('Geen meerwerk', 'Wat niet op de lijst staat, doen we niet, of het wordt een apart voorstel met een prijs vooraf.'),
 kaart('Geen korting', 'De lijst is voor iedereen gelijk. Wie onderhandelt, onderhandelt met de vorige klant die de prijs wel betaalde.'),
]) + """
""" + raakt(ul([
 '<b>Alles wat vast is, gaat van het advertentiebudget af.</b> Fundament, retainer, licenties en herstelposten komen uit dezelfde marketingruimte als de advertenties (zie de rekensom in stap 04). Elke euro die het fundament duurder wordt, is een euro minder voor advertenties.',
 '<b>Als het fundament naar € 5.250 of € 6.563 gaat</b> (de herrekening tegen € 100 of € 125 per uur), stijgt de ondergrens voor Enter bij 30% marge van ongeveer € 90.000 naar € 92.600 of € 97.000 extra omzet. Minder klanten passen dan in het kleinste pakket.',
 '<b>De retainer start in maand 2.</b> Loopt het fundament uit, dan is de vraag of de eerste retainerfactuur meeschuift. Zie stap 06.',
], '')) + open_(ul([
 '<b>Fundament € 4.500 is voorlopig.</b> Jim Kikken en Stan rekenen het na tegen € 100–125 per uur. Het blijft één vaste prijs.',
 '<b>Dashboard € 25 / € 250 is voorlopig.</b> Het dashboard komt er zeker.',
 '<b>De drie Webmix-bedragen zijn schattingen.</b> Vastzetten met Webmix, anders staat er een bedrag in het voorstel dat we niet kunnen waarmaken.',
 '<b>MailerLite- en Leadinfo-staffel ontbreken.</b> Zonder staffel staat er “vanaf”, en dat beloven we juist niet te doen.',
 '<b>Indicaties voor “wat we vaak tegenkomen”</b> worden nog overlegd.',
 '<b>Btw:</b> “exclusief btw” moet op tarieven, voorstel en offerte staan.',
], '')) + """
</div></section>
"""

REGELS = """
<section class="sec" id="spelregels"><div class="wrap">
<span class="kick">1.5 · DE SPELREGELS</span>
<h2>Negen regels die altijd gelden</h2>
<p class="sub">Staat iets verderop in de gids ermee in strijd, dan geldt de regel. Per regel staat wat hij in de praktijk betekent.</p>
""" + tbl(['Regel', 'Wat het betekent', 'Wat eraan vastzit'], [
 ['<b>1 · Cijfers zijn leidend</b>', 'Geen resultaatbelofte. We beloven dat we het zelf zeggen als het niet werkt, en waarom. De cijfers staan voor allebei zichtbaar in het dashboard.', 'De meetlat moet er liggen vóór er iets te meten valt: nulmeting, doelregel, de vijf afspraken van de klant. Zonder meting geen start.'],
 ['<b>2 · Maandelijks opzegbaar, voor allebei</b>', 'Opzeggen kan tot en met de laatste dag van de maand; de maand erna komt er geen factuur meer. Het fundament krijg je na de start niet terug: dat werk is gedaan.', 'De klant blijft alleen omdat het werkt. Dus moet het maandritme (stap 08) zichtbaar waarde laten zien.'],
 ['<b>3 · Alles verdient zich terug</b>', 'Fundament, retainer, licenties, advertenties en gekozen extra’s samen verdienen zich terug binnen de terugverdientijd, standaard twaalf maanden. Lukt dat op papier niet, dan beginnen we niet.', 'Bepaalt het advertentiebudget en daarmee het pakket. Nooit goedkoper maken; wel een hoger doel, een langere termijn, of nee.'],
 ['<b>4 · De 50%-regel</b>', 'Onze retainer is nooit meer dan de helft van wat de klant per maand aan marketing uitgeeft: retainer plus advertentiebudget.', 'Met de minimumbudgetten per pakket klopt het altijd. Wie onder het minimum wil, betaalt ons om te sturen op een bedrag dat te klein is om mee te sturen. Dan niet.'],
 ['<b>5 · Nooit marge erbovenop</b>', 'De klant betaalt de specialist, niet ons bovenop de specialist. Een vergoeding van een leverancier voor doorverwijzen mag (Leadinfo, ClickCease, MailerLite, de afsprakenplanner), en die zeggen we erbij.', 'Zeg nooit “we verdienen er niets aan”; zeg “we zetten er nooit iets bovenop”. Het eerste is niet waar en komt een keer uit.'],
 ['<b>6 · Niets gratis erbij</b>', 'Nooit iets “even doen omdat het klein is”. Wat buiten fundament of retainer valt, bieden we los aan met een prijs vooraf.', 'Kleine gunsten worden de norm en eten de marge op, en dan betaalt een andere klant ervoor.'],
 ['<b>7 · Altijd on-brand</b>', 'Elke uiting die naar buiten gaat, klopt met het merk van de klant: kleur, typografie, toon en beeld. Ook een snelle variant, ook een test. Geen bruikbaar merk? Dan leggen we in het fundament kleur en typografie vast, en houden we ons daaraan.', 'Performance en merk zijn geen tegenstelling. Wat vandaag klikt maar het merk beschadigt, kost op termijn meer dan het oplevert. Elke uiting gaat daarom door de merkcheck voordat hij live gaat.'],
 ['<b>8 · Data beats opinion</b>', 'We monitoren continu en beslissen op cijfers, niet op smaak. Een discussie over wat mooier is, beslechten we met een test. Het merk bepaalt de grenzen; binnen die grenzen kiest de data.', 'Vraagt om betrouwbare meting vanaf dag één en om vaste drempels, anders is ook een cijfer een mening. De monitoring staat in stap 08.'],
 ['<b>9 · Alles op naam van de klant</b>', 'Advertentieaccounts, e-mail, licenties: op zijn naam, met zijn betaalgegevens, wij als beheerder. Nooit op onze naam, ook niet even.', 'Stopt hij, dan neemt hij alles mee. Dat is precies het bureau dat wij willen zijn, en het maakt vertrekken makkelijk. Dat moeten we willen.'],
]) + """
</div></section>
"""


COMM = """
<section class="sec" id="communicatie"><div class="wrap">
<span class="kick">1.6 · HOE WE COMMUNICEREN</span>
<h2>Eén adres: support@jamesrobinson.nl</h2>
<p class="sub">Alle communicatie met klanten loopt via één gedeelde mailbox. Vragen, materiaal aanleveren, akkoorden: alles naar support@. Geen WhatsApp-groepen meer, en geen gesprekken die in iemands persoonlijke inbox verdwijnen.</p>
""" + grid(3, [
 kaart('Mailen', 'Alles naar support@jamesrobinson.nl. In Front wordt elke mail van een klant automatisch toegewezen aan zijn marketingmanager. Iedereen die aan de klant werkt, leest mee.', 'VOOR ALLES', 'b'),
 kaart('Binnen één werkdag', 'Antwoord binnen één werkdag, op werkdagen. Van degene die erover gaat, met naam en eigen handtekening, vanaf support@. Voor ieder pakket hetzelfde.', 'DE BELOFTE', 'g'),
 kaart('Bellen naar kantoor', 'Alleen als het dringend is: de campagne of de website ligt eruit, of er gaat geld verloren. Dan bellen naar kantoor: 045 792 0009. Al het andere gaat per mail.', 'DRINGEND', 'r'),
]) + """
<h3>Waarom geen WhatsApp-groepen meer</h3>
""" + tbl(['Wat er misging', 'Wat support@ oplost'], [
 ['Always-on: appjes ’s avonds en in het weekend, en een geopend appje zakt weg en wordt vergeten', 'Een mail blijft openstaan tot iemand hem heeft afgehandeld. Niets zakt weg.'],
 ['Iedereen zit in de groep, maar het meeste is voor één persoon bedoeld. Je moet alles lezen om niets te missen.', 'Elke mail heeft één eigenaar: de marketingmanager, of wie hij doorzet.'],
 ['WhatsApp wekt de verwachting van direct antwoord. Soms kwam dat, soms duurde het dagen.', 'Eén belofte die we kunnen houden: binnen één werkdag. En we kunnen meten of we hem halen.'],
 ['Gesprekken met gino@ of jim@ verdwijnen als iemand vertrekt, en niemand anders ziet ze', 'De historie blijft van het bedrijf, en is voor iedereen terug te vinden.'],
 ['Geen zicht op de kwaliteit van een antwoord', 'Meelezen en bijsturen, zonder dat iemand ernaast hoeft te zitten.'],
]) + """
<p style="margin-top:16px"><b>Waarom support@.</b> In de nieuwe propositie zijn we niet de collega of de externe marketingafdeling van de klant. De klant koopt een product: een fundament en een retainer met een vaste inhoud. Bij een product hoort support: een plek waar je terechtkunt, met een vaste termijn. Dat is duidelijker dan een persoonlijk adres, en het past bij hoe we willen dat klanten naar ons kijken.</p>
""" + grid(2, [
 kaart('Wat automatisch blijft', ul(['Meldingen van nieuwe aanvragen, per mail of WhatsApp: dat is een melding van het dashboard, geen gesprek', 'Het startbericht en de datums, vanaf support@', 'De maandelijkse update in het dashboard'], ''), 'GEEN GESPREK', 'l'),
 kaart('De regel voor ons team', ul(['Nooit antwoorden vanaf een persoonlijk adres', 'Mail van een klant naar een persoonlijk adres gaat automatisch naar support@', 'Een verzoek dat werk vraagt, wordt een taak in ClickUp; de mail is niet de takenlijst', 'Persoonlijke mailadressen verdwijnen op termijn voor klantcontact'], ''), 'INTERN', 'o'),
]) + raakt(ul([
 '<b>Een mail heeft een hogere drempel dan een appje.</b> Klanten die elk detail in de groep gooiden, sturen minder, en wat ze sturen is beter te behandelen.',
 '<b>In Front zien we per klant hoeveel gesprekken er lopen en hoe snel we reageren.</b> Leg dat naast wat de retainer oplevert, en je ziet welke klant ons meer kost dan hij betaalt. Data beats opinion, ook intern.',
 '<b>Niets gratis erbij blijft gelden per mail.</b> Een verzoek buiten de retainer beantwoorden we met een voorstel en een prijs, niet met “doen we even”.',
 '<b>De Performance Review blijft</b>, en gaat over resultaat. Wat daar besproken wordt, bevestigen we per mail vanaf support@, zodat ook dat op één plek staat.',
], '')) + open_(ul([
 'De uren waarop kantoor (045 792 0009) bereikbaar is, voor in het startbericht en de handtekening.',
 'Front inrichten: automatisch toewijzen per klant, doorsturen vanaf persoonlijke adressen, meten van reactietijd, en de koppeling met ClickUp.',
 'De overstap bij bestaande klanten: per klant uitleggen in de eerstvolgende Performance Review, daarna het bericht in de groep, en de groep verwijderen.',
], '')) + """
</div></section>
"""

MERK = """
<section class="sec alt" id="het-merk"><div class="wrap">
<span class="kick">1.7 · HOE WE ERUITZIEN EN KLINKEN</span>
<h2>Het merk</h2>
<p class="sub">Alles wat de klant van ons ziet, van de video tot het voorstel, volgt het designsysteem v3.0 van september 2026: de rust van Apple, in het blauw van James Robinson. Naam en tagline: <b>James Robinson — Marketing &amp; Branding</b>. De tweede tagline, On top of your game, alleen als tagline, nooit in lopende tekst.</p>
<div class="stalen">
 <div class="staal"><i style="background:#007AFF"></i><div><b>JR Blue</b><span>#007AFF</span><p>Vorm: iconen, lijnen, vlakken</p></div></div>
 <div class="staal"><i style="background:#0066CC"></i><div><b>Tekstblauw</b><span>#0066CC</span><p>Links en blauwe tekst op wit</p></div></div>
 <div class="staal"><i style="background:#0857C3"></i><div><b>Knopblauw</b><span>#0857C3 · hover #003967</span><p>Knoppen</p></div></div>
 <div class="staal"><i style="background:#005CBF"></i><div><b>Deep blue</b><span>#005CBF</span><p>Diepte, secundair blauw</p></div></div>
 <div class="staal"><i style="background:#1C1C1E"></i><div><b>JR Black</b><span>#1C1C1E</span><p>Tekst, donkere secties</p></div></div>
 <div class="staal"><i style="background:#E2EBF3"></i><div><b>Lichtblauw</b><span>#E2EBF3</span><p>Zachte vlakken</p></div></div>
 <div class="staal"><i style="background:#F5F5F7"></i><div><b>Lichtgrijs</b><span>#F5F5F7</span><p>Alternerende secties</p></div></div>
 <div class="staal"><i style="background:#C4F000"></i><div><b>JR Lime</b><span>#C4F000</span><p>Het ene accent: een vlak met donkere tekst, nooit tekst op wit</p></div></div>
</div>
<p style="margin-top:14px">Elke kleur heeft acht vaste stappen, zodat niemand zelf tinten mengt. Eén accent per pagina, nooit twee.</p>
""" + grid(2, [
 kaart('Typografie en opbouw', ul(['Inter Tight voor koppen (700 en 600), Inter voor tekst (400). Body 17 px, regelafstand 1,55.', 'Altijd sentence case. Geen hoofdletters in labels, geen cursief, geen onderstreping behalve links in lopende tekst.', 'Secties lopen van rand tot rand, content nooit. Container maximaal 1024 px, lopende tekst maximaal 692 px.', 'Logo: witruimte van één keer de hoogte van het beeldmerk; minimaal 20 mm in print, 70 px op scherm. Nooit kantelen, geen schaduw, geen extra kleuren.'], ''), 'VORM'),
 kaart('Beeld en ruimte', ul(['De website is wit omdat een scherm licht uitzendt; het kantoor is donker omdat een ruimte licht weerkaatst.', 'Beide terughoudend, eerlijk in materiaal, obsessief in detail, met één accent.', 'Foto’s: donker en warm op een witte pagina. Echte mensen, geen stock.'], ''), 'BEELD'),
]) + """
<h3>Tone of voice</h3>
<p>We schrijven zoals we aan tafel praten: kort, concreet en zonder gebakken lucht. De zinsbouw van Apple, de nuchterheid van Limburg.</p>
""" + tbl(['Principe', 'Zo wel', 'Zo niet'], [
 ['Zeg het concreet of zeg het niet', 'Je ziet in ClickUp waar we mee bezig zijn, ook als het tegenvalt.', 'Korte lijnen en persoonlijke aandacht.'],
 ['Claim, bewijs, stop', 'Maandelijks opzegbaar. Een samenwerking die op een contract moet draaien, draait niet.', 'Een alinea die de claim drie keer herhaalt.'],
 ['Leg het feit neer, trek de conclusie niet', 'De eerste aanvragen zijn duur. Dat zeggen we vooraf.', 'Retorische vragen, probleem opkloppen, nadelen weglaten.'],
 ['Praat zoals aan tafel, niet zoals je verkoopt', 'Een zin die iets vaststelt.', 'Een zin die iets van de lezer wil.'],
]) + grid(2, [
 kaart('Vaste afspraken', ul(['Je en jouw voor de klant, we en ons voor onszelf. U alleen in juridische teksten.', 'Uitroeptekens: nul.', 'Sportbeeld: hooguit één per pagina, en alleen als het iets uitlegt.', 'Ritme: kort, kort, lang, waar een punt moet landen.', 'Een zin hooguit 25 woorden, een alinea hooguit drie zinnen, een kop hooguit acht woorden, een knop hooguit drie.'], ''), 'SCHRIJVEN'),
 kaart('Woorden die we nooit gebruiken', '<p>Ontzorgen, oplossingen op maat, partner in, innovatief, uniek, passie voor, resultaatgericht, korte lijnen, persoonlijke aandacht, al meer dan X jaar, de beste, vrijblijvend.</p><p style="margin-top:10px"><b>Diensten beschrijven:</b> het ding, twee constateringen, een feit erbij. <b>SEO:</b> de title-tag is zoekgericht, de H1 is de dienstnaam, de regel eronder is het merk.</p>', 'NOOIT', 'r'),
]) + vlak('grijs', 'Het volledige systeem', '<p>Dit is de korte versie. Het volledige designsysteem v3.0 staat in deel 4, aan het eind van deze gids: alle kleurtrappen, de typografie per element, ruimte, knoppen, componenten, beeld, tone of voice, diensten, SEO en merk, en de invulbladen voor Elementor. Het is leidend, ook boven het brandbook van 2024.</p>') + """
</div></section>
"""

P1 = HERO + ROUTE + DEEL1_OPEN + WIE + MODEL + PLAN + GELD + REGELS + COMM + MERK
