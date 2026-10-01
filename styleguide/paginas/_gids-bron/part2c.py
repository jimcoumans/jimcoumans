# -*- coding: utf-8 -*-
import json, os
from common import *
HERE = os.path.dirname(os.path.abspath(__file__))
PB = json.load(open(os.path.join(HERE, 'playbook_rows.json')))
WI = json.load(open(os.path.join(HERE, 'werkinstr.json')))
MID = json.load(open(os.path.join(HERE, 'middelen.json')))

DEEL2B = """
<section class="sec" style="background:var(--p2b);border-top:none" id="fase-2"><div class="wrap">
<span class="kick" style="color:var(--p2)">FASE 2 · STARTEN</span>
<h2>Van handtekening tot live, in maand 1</h2>
<p class="sub">Vanaf hier betaalt de klant. Het fundament wordt bij ondertekening gefactureerd, en binnen een uur ziet hij iets van ons. Maand 1 is set-up en content: vier weken vanaf het moment dat alle toegangen er zijn. Dat past alleen in één maand als de onboarding kort is.</p>
<div class="klok"><span style="flex:1" class="acc">TEKENEN</span><span style="flex:3">ONBOARDING · 3 WERKDAGEN</span><span style="flex:4">WEEK 1 · METEN, BOODSCHAP</span><span style="flex:4">WEEK 2 · DRAAIDAG, SYSTEMEN</span><span style="flex:4">WEEK 3 · CAMPAGNE</span><span style="flex:4">WEEK 4 · PREVIEW, LIVE</span></div>
</div></section>
"""

# ---------------------------------------------------------------- STAP 05
STAP05 = stap_kop('05', 'f2', 'FASE 2 · STARTEN', 'Tekenen en betalen',
 'De klant tekent de offerte online in Moneybird, met het voorstel, de algemene voorwaarden en de verwerkersovereenkomst als bijlage. Daarna lopen machtiging en facturen automatisch.',
 [('WANNEER', 'Dezelfde dag als het akkoord; offerte veertien dagen geldig'), ('WIE', 'Het portaal zet de offerte klaar; Moneybird doet de rest'), ('HOE LANG', 'Voor de klant een paar minuten'), ('KLAAR ALS', 'Getekend, machtiging gegeven, factuur fundament verstuurd, klantkaart op “klant”')],
 'stap-05') + klant('Eén mail met het voorstel als pdf en een link. Hij tekent online, vinkt voor het dashboard maand of jaar aan, en krijgt de getekende versie met bijlagen per mail terug. Binnen een uur daarna de kick-offmail (stap 06).') + """
<h3>De offerte, regel voor regel</h3>
<p>Alleen wat naar ons gaat, krijgt een bedrag. Wat rechtstreeks naar een leverancier gaat, staat erop als tekstregel zonder bedrag. Geen bedrag wordt met de hand getypt: het portaal zet de offerte klaar met de regels uit de tarieven. Het offertenummer staat op de omslag van het voorstel, het voorstel hangt als bijlage aan de offerte. Verandert er aan tafel iets, dan op de klantkaart, en het portaal maakt beide opnieuw.</p>
""" + tbl(['Regel', 'Bedrag excl. btw', 'Wanneer', 'Toelichting'], [
 ['Fundament: basis en eerste campagne', '€ 4.500', 'Eenmalig', 'Altijd. Omschrijving verwijst naar het voorstel, pagina 4.'],
 ['Retainer Starter, Playmaker, Captain of Champion', '€ 1.000 / 1.500 / 2.000 / 2.500', 'Per maand', 'Het pakket uit de rekensom. Vanaf maand 2, vooraf: factuur op de 1e, incasso op de 4e.'],
 ['Marketingdashboard', '€ 25 p/m of € 250 p/j', 'Keuze van de klant', 'Twee opties op de offerte; hij vinkt er één aan bij het tekenen.'],
 ['Afsprakenplanner opzetten', '€ 250', 'Eenmalig', 'Alleen als hij afspraken laat inplannen.'],
 ['Tekstregel, zonder bedrag', '—', '—', '“Rechtstreeks aan leveranciers, niet via ons: advertentiebudget (minimaal € [..] per maand), MailerLite, Cookiescript [, hosting, afsprakenplanner]. Herstelposten aan de website: eigen offerte van Webmix.”'],
]) + let('<p><b>Zet het advertentiebudget nooit als bedrag op de offerte.</b> Dan lijkt het of dat geld via ons loopt, en dat is precies wat we beloven niet te doen. Het staat op pagina 5 van het voorstel met een bedrag, en op de offerte als tekstregel.</p>') + """
<p><b>Instellingen in Moneybird.</b> “De ontvanger moet deze offerte online accepteren en ondertekenen” staat aan; Moneybird bewaart de handtekening met naam, e-mailadres en IP-adres. Veertien dagen geldig, gelijk met het voorstel. Bijlagen: het voorstel, de algemene voorwaarden, de verwerkersovereenkomst. Tekst op de offerte: startdatum en live-datum, het betaalschema, opzeggen tot en met de laatste dag van de maand, bedragen exclusief btw.</p>

<h3>Licenties: wij regelen het, hij betaalt het</h3>
""" + tbl(['Licentie', 'Bedrag', 'Wanneer', 'Aan wie, maand of jaar'], [
 ['Marketingdashboard', '€ 25 p/m of € 250 p/j', 'Altijd', 'James Robinson. Keuze op de offerte.'],
 ['MailerLite', 'vanaf € 9,90 p/m', 'Altijd', 'MailerLite. Maand of jaar, bij MailerLite.'],
 ['Cookiescript', '€ 150 p/j', 'Altijd', 'Webmix. Per jaar.'],
 ['ClickCease', 'vanaf $ 99 p/m', 'Optioneel, de klant beslist', 'ClickCease. Maand of jaar.'],
 ['Leadinfo', 'staffel', 'Optioneel, alleen B2B', 'Leadinfo, volgens hun staffel.'],
 ['Calendly', '€ 15 p/m per gebruiker', 'Optioneel', 'Calendly. Maand of jaar.'],
]) + grid(4, [
 kaart('Op zijn naam', 'Elk account staat op zijn naam en e-mailadres. Stopt hij, dan neemt hij alles mee zonder dat er iets overgezet hoeft te worden.'),
 kaart('Hij betaalt zelf', 'Zijn betaalgegevens vult hij zelf in, in de toegangensessie. Wij bewaren nooit een creditcard of IBAN van een ander.'),
 kaart('Wij richten in', 'Aanmaken, instellen, koppelen aan het dashboard. Dat zit in het fundament.'),
 kaart('Maand of jaar', 'Per licentie gevraagd in het voorstelgesprek, als de leverancier het aanbiedt. Het antwoord staat op de klantkaart.'),
]) + """
<h4 style="margin-top:26px">ClickCease: een optie, de klant beslist</h4>
<p>Een deel van de kliks komt van bots, klikfarms en concurrenten. Google filtert zelf ongeldige kliks en betaalt die terug; ClickCease blokkeert daarnaast herhaalde klikkers en bots voordat ze opnieuw geld kosten. De vraag is niet of het werkt, maar of het zich terugverdient: vanaf $ 99 per maand is bij € 1.000 advertentiebudget bijna een tiende, bij € 2.500 ongeveer een vijfentwintigste, en bij € 7.500 ruim een procent. Na de proefperiode leggen we in het dashboard naast elkaar wat ClickCease tegenhield (geblokkeerde kliks keer de klikprijs) en wat het kost. Is het eerste hoger, dan houdt hij het. Zo niet, dan zeggen wij dat hij kan opzeggen. We krijgen een vergoeding van ClickCease, en dat zeggen we erbij; het advies is hetzelfde als we er niets aan zouden verdienen.</p>

<h3>Na de handtekening</h3>
""" + tl([
 ('Direct', 'Getekend', 'Moneybird zet de offerte op “geaccepteerd” en mailt de getekende versie met bijlagen naar de klant en naar ons.'),
 ('Direct', 'Het portaal ziet het', 'Via de koppeling gaat de klantkaart van “voorstel” naar “klant”. Dat start stap 06: de kick-offmail gaat binnen een uur.'),
 ('Dezelfde dag', 'De machtiging', 'Een machtigingsverzoek via Moneybird: machtigen met € 0,15 via iDEAL, of met zijn IBAN.'),
 ('Bij het tekenen', 'De factuur voor het fundament', 'In één keer. Op de betaling wachten we niet: de onboarding begint dezelfde dag.'),
 ('Vanaf maand 2', 'Elke maand vooraf', 'Eén periodieke factuur voor retainer en dashboard, verstuurd op de 1e voor die maand. Moneybird incasseert drie dagen later: het geld staat op de 4e.'),
]) + grid(3, [
 kaart('Het fundament: bij ondertekening', 'Maand 1 is set-up en content, betaald bij het tekenen. Er is geen periode waarin we werken en niets gefactureerd is.', 'BESLOTEN · BETALING', 'g'),
 kaart('Vanaf maand 2: vooraf', 'Retainer en dashboard, factuur op de 1e, geld op de 4e.', 'BESLOTEN · RETAINER', 'g'),
 kaart('Tot en met de laatste dag', 'Zegt hij op de 31e op, dan krijgt hij de maand erna geen factuur meer, mits er geen budgetten meer openstaan. Voor allebei gelijk. Het fundament krijg je na de start niet terug.', 'BESLOTEN · OPZEGGEN', 'g'),
]) + raakt(ul([
 '<b>Het contract moet zeggen wat het gesprek zei:</b> cijfers leidend, maandelijks opzegbaar, geen resultaatbelofte. Belooft het papier meer dan het voorstelgesprek, dan prikt een klant daar doorheen op het moment dat het misgaat.',
 '<b>Startdatum en live-datum staan samen op de offerte.</b> Dan is uitloop aan de kant van de klant zichtbaar, en niet ons probleem.',
 '<b>Een verlopen offerte</b> (na veertien dagen): één keer bellen, daarna later. Een nieuwe offerte krijgt de tarieven van dat moment.',
], '')) + open_(ul([
 '<b>Verwerkersovereenkomst.</b> In het dashboard bewaren wij namen en contactgegevens van zijn aanvragers: dat moet op papier (AVG, artikel 28). Hangt als bijlage aan de offerte.',
 '<b>Algemene voorwaarden</b> die deze propositie dragen: geen resultaatbelofte, maandelijks opzegbaar, niets gratis erbij, wat de klant bij vertrek meeneemt. Juridisch laten toetsen. Bewust later opgepakt.',
 '<b>Btw:</b> “exclusief btw” op tarieven, voorstel en offerte.',
 '<b>Moneybird inrichten en koppelen:</b> geeft Moneybird het portaal een seintje bij een handtekening, en wordt een getekende offerte in één keer een periodieke factuur? Kan het niet, dan doet iemand die ene klik met de hand.',
 '<b>Vertrekregeling:</b> wat neemt een klant mee, ook van het dashboard en de landingspagina op onze omgeving?',
], '')) + stap_eind()

# ---------------------------------------------------------------- STAP 06
OBF = [
 ('grp', 'KLOPT DIT NOG? · VOORINGEVULD VANAF DE KLANTKAART'),
 ['1', 'Dit weten we al: wat de campagne moet opleveren, waar je klanten zitten, wie opvolgt en binnen hoeveel tijd (en de vervanger), wie beslist. Klopt het nog?', 'Wat we al weten, vragen we nooit opnieuw'],
 ('grp', 'JE KLANTEN, IN HUN EIGEN WOORDEN'),
 ['2', 'Welke woorden gebruiken je klanten voor wat je verkoopt? (optioneel)', 'De basis van het zoekwoordonderzoek'],
 ['3', 'Wat zeggen klanten die net klant zijn geworden? (optioneel)', 'De woorden die we in advertenties gebruiken'],
 ['4', 'Waarom stelt iemand de aankoop uit?', 'De bezwaren die we in advertenties wegnemen'],
 ['5', 'Upload je klantenbestand of omzetoverzicht: postcode, ordergrootte, branche (optioneel)', 'Hier toetsen we zijn beste klant aan'],
 ['6', 'Op wie zou je nooit willen lijken? (optioneel)', 'Zegt vaak meer over zijn positie dan de vorige vragen'],
 ['7', 'Zijn er partijen die we moeten uitsluiten: klanten, sollicitanten, concurrenten? (optioneel)', 'Voorkomt dat budget daaraan opgaat'],
 ('grp', 'JE MERK EN JE BEELD'),
 ['8', 'Upload je logo, liefst als vectorbestand', 'Gaat in al zijn advertenties'],
 ['9', 'Heb je een huisstijlhandboek of merkrichtlijnen? (optioneel)', 'Zodat advertenties eruitzien als zijn bedrijf'],
 ['10', 'Heb je eigen foto- of videomateriaal? (optioneel)', 'Bepaalt hoeveel we op de draaidag moeten maken'],
 ['11', 'Is er iets wat je absoluut niet wilt zien in je advertenties? (optioneel)', 'Voorkomt een correctieronde achteraf'],
 ('grp', 'JE E-MAILADRESSEN'),
 ['12', 'In welk programma staan je adressen nu?', 'Hiervandaan verhuizen we ze'],
 ['13', 'Upload een export van je adressenbestand (optioneel)', 'Zodat hij vanaf dag één kan mailen'],
 ['14', 'Weet je hoe die adressen zijn verzameld? Ja / deels / nee', 'Bepaalt of we de lijst direct kunnen gebruiken of eerst een bevestigingsmail sturen'],
 ['15', 'Zijn er groepen die je gescheiden wilt houden? (optioneel)', 'Zo richten we zijn groepen in'],
 ('grp', 'JE DASHBOARD'),
 ['16', 'Waar wil je een melding van een nieuwe aanvraag: e-mail, WhatsApp, allebei?', 'Zo stellen we de meldingen in'],
 ['17', 'Wie krijgt nog meer een login? (optioneel)', 'Naast de opvolger'],
 ('grp', 'DE DRAAIDAG'),
 ['18', 'Waar kunnen we filmen?', 'Bepaalt de planning van de dag'],
 ['19', 'Wie kunnen we voor de camera zetten?', 'Iemand die het werk doet, werkt beter dan de directeur'],
 ['20', 'Wat moet er in beeld: producten, machines, een project, het pand?', 'Wordt de shotlist'],
 ['21', 'Op welke dagdelen in week 3 en 4 kunnen we bij je filmen? Vink alles aan wat kan.', 'Daarmee zetten we de draaidag vast met de videograaf. Hoe meer opties, hoe sneller'],
 ('grp', 'PRAKTISCH'),
 ['22', 'Wie is onze vaste contactpersoon?', 'Eén aanspreekpunt scheelt ons allebei tijd'],
 ['23', 'Is er iets wat wij moeten weten en niet hebben gevraagd? (optioneel)', ''],
]

STAP06 = stap_kop('06', 'f2', 'FASE 2 · STARTEN', 'De onboarding',
 'Van de handtekening tot dag 1 van het fundament, in drie werkdagen. Het gevaarlijkste moment van de reis: hij heeft betaald en ziet nog niets. Dus ziet hij binnen een uur iets, en hoeft hij nergens naar te zoeken.',
 [('WANNEER', 'Dag 0 tot en met dag 3 na de handtekening'), ('WIE', 'Het vaste aanspreekpunt, met het portaal'), ('HOE LANG', 'Twintig minuten formulier, 45 minuten toegangensessie, tien minuten bellen'), ('KLAAR ALS', 'Formulier binnen, alle toegangen er, en de datums van het fundament zijn gemaild vanaf support@')],
 'stap-06') + klant('Binnen een uur een welkomstbericht van zijn vaste aanspreekpunt, met wat er de komende vier weken gebeurt en drie dingen die we nodig hebben, elk met een datum. De volgende dag een telefoontje. Toegangen regelen we samen, met hem aan het toetsenbord en ons ernaast.') + """
<p><b>Het principe: wij halen het op, hij hoeft niet te zoeken.</b> Toegangen zijn de belangrijkste oorzaak van uitloop, en een lijst per mail is de manier om die uitloop te organiseren. Daarom doen we het samen, in één sessie. Wat bij een derde ligt, halen wij zelf op.</p>
<h3>Drie werkdagen</h3>
""" + tl([
 ('Dag 0, binnen een uur', 'De kick-offmail', 'Automatisch vanuit het portaal zodra Moneybird de handtekening meldt, vanaf support@, ondertekend door het vaste aanspreekpunt. Tegelijk uit Moneybird: de factuur voor het fundament en het machtigingsverzoek.'),
 ('Dag 0', 'Intern klaarzetten', 'De klantkaart op “klant”. Het fundament als project in ClickUp, met datums vanaf de geplande dag 1. In Front de klant koppelen aan zijn marketingmanager, zodat elke mail van hem automatisch daar landt.'),
 ('Dag 1', 'Tien minuten bellen', 'Het aanspreekpunt belt. Geen inhoud, wel een stem: “Ik ben je aanspreekpunt, dit is de planning.” Staat de toegangensessie nog niet in de agenda, dan plannen we hem nu.'),
 ('Dag 1 – 3', 'Het onboardingformulier', 'Hij vult het zelf in: twintig minuten, tussentijds op te slaan. Uiterlijk de avond voor de toegangensessie, zodat wij het al gelezen hebben.'),
 ('Dag 2 – 3', 'De toegangensessie', '45 minuten online, met scherm delen. De toegangenlijst samen door; bij elke licentie vult hij zelf zijn betaalgegevens in. Wat niet meteen lukt, krijgt een eigenaar en een datum.'),
 ('Dag 3', 'Dag 1 van het fundament', 'Zodra alles binnen is, start de klok. Het portaal mailt de datums vanaf support@: de preview en de live-datum, en de draaidag zodra die met de videograaf is afgestemd.'),
]) + """
<h3>De kick-offmail</h3>
""" + mail('DAG 0 · AUTOMATISCH, BINNEN EEN UUR · DATUMS UIT HET PORTAAL', 'Welkom. Dit gebeurt er de komende vier weken', '<p>Hoi [voornaam],</p><p>Welkom bij James Robinson. Ik ben [naam], je vaste aanspreekpunt.</p><p>Mail ons altijd via support@jamesrobinson.nl. Dan leest iedereen mee die aan je campagne werkt, en krijg je binnen één werkdag antwoord. Is er iets dringends, bel dan naar kantoor: 045 792 0009.</p><p>Drie dingen hebben we van je nodig. Daar hangt de live-datum aan:</p><ol><li>Het onboardingformulier invullen, uiterlijk <span class="vv">[datum]</span>. Ongeveer twintig minuten; je kunt tussendoor opslaan. [link]</li><li>Het toegangendocument doorlopen. Per onderdeel staat hoe je ons toegang geeft. Heb je iets nog niet, vink het aan: dan regelen wij het. Wat blijft hangen, doen we samen in de toegangensessie, uiterlijk op <span class="vv">[datum]</span>. [link]</li><li>In het formulier: alle dagdelen in week 3 en 4 (<span class="vv">[datums]</span>) waarop we bij je kunnen filmen. Hoe meer je aanvinkt, hoe sneller we de draaidag met onze videograaf vastzetten.</li></ol><p>Daarna het fundament:</p><ul><li><b>Week 1:</b> we meten alles na en vertellen je wat we vonden, en we werken je doelgroep en boodschap uit.</li><li><b>Week 2:</b> we zetten de systemen neer: advertentieaccounts, e-mail, meting en je dashboard.</li><li><b>Week 3:</b> we bouwen de campagne en de landingspagina. In week 3 of 4 de draaidag bij jou, op een van de dagdelen die je opgaf.</li><li><b>Week 4:</b> je ziet alles voordat het live gaat, met één ronde feedback. Daarna gaat het aan, en kijken we de eerste week dagelijks mee.</li></ul><p>Vandaag krijg je van Moneybird de factuur voor het fundament, en een verzoek om een machtiging voor de maandelijkse incasso vanaf <span class="vv">[maand 2]</span>.</p><p>Tot morgen, dan bel ik je even.</p><p>Groet, [naam]</p>') + """
<h3>Het onboardingformulier: zeven blokken, 23 vragen</h3>
<p>Alleen wat we nodig hebben om te maken. Wat het advies en de prijs bepaalt, is vóór het voorstel gevraagd; wat we zelf kunnen opzoeken, vragen we niet; toegangen doen we samen. Het formulier leeft in het portaal, op de klantkaart, en de link staat in de kick-offmail. Het openingsscherm zegt: “Wat je doel is, wat je verkoopt en waarom klanten voor je kiezen, weten we al. Hier vragen we alleen nog wat we nodig hebben om te gaan maken: je beeld, de woorden van je klanten en je e-mailadressen. Weet je iets niet, vul dan in dat je het niet weet: dat is een bruikbaar antwoord. Loop je vast, bel dan even.”</p>
""" + tbl(['#', 'Vraag', 'Waarvoor we het gebruiken'], OBF) + """
<h3>Het toegangendocument</h3>
<p>Eén document met alles waar hij ons toegang toe moet geven. Per onderdeel: wat het is, waarom we het nodig hebben, en hoe hij het doet, met de klikroute stap voor stap. Bij elk onderdeel kan hij aanvinken: <b>“heb ik nog niet”</b>. Dan maken wij het aan, op zijn naam. Het document zit bij de kick-offmail; in de toegangensessie lopen we samen na wat nog openstaat. Alles staat op zijn naam; wij krijgen beheertoegang. De klikroute houden we in het document bij, want die verandert te vaak om in deze gids vast te leggen.</p>
""" + tbl(['Wat', 'Hoe', 'Wie', 'Let op'], [
 ['Google Ads', 'Account op zijn naam, of een uitnodiging in zijn bestaande account. Wij als beheerder.', 'Hij, in de sessie', 'Zijn eigen betaalmethode, nooit de onze'],
 ['Meta: Business Manager en advertentieaccount', 'Partnerverzoek vanuit ons Business Manager, dat hij goedkeurt', 'Hij, in de sessie', 'Idem'],
 ['Google Analytics en Tag Manager', 'Wij als beheerder, of een nieuw account op zijn naam', 'Hij, in de sessie', ''],
 ['Search Console en Bedrijfsprofiel', 'Wij als beheerder', 'Hij, in de sessie', ''],
 ['De website', 'Een beheerdersaccount, of de meetcode laten plaatsen door zijn webbouwer. De enige eis: een script in de head.', 'Hij of zijn webbouwer', 'Kan het alleen via de webbouwer, dan mailen wij die zelf, met hem in cc'],
 ['Het domein (DNS)', 'Records voor de landingspagina op zijn subdomein, e-mailauthenticatie en MailerLite. Wij leveren de records.', 'Webbouwer of hosting', 'Idem'],
 ['MailerLite', 'Een nieuw account op zijn naam en e-mailadres', 'Hij, in de sessie', 'Betaalgegevens vult hij zelf in'],
 ['Microsoft Ads, LinkedIn, TikTok', 'Alleen als het kanaal in het plan staat. Account op zijn naam, wij als beheerder.', 'Hij, in de sessie', 'Eigen betaalmethode'],
 ['ClickCease, Leadinfo, Calendly', 'Alleen als hij ervoor kiest. Account op zijn naam.', 'Hij, in de sessie', 'Idem'],
 ['Cookiescript', 'Via Webmix', 'Wij, met Webmix', ''],
 ['Het bestaande e-mailbestand', 'Een export als csv', 'Hij, vóór de sessie', 'Upload in het onboardingformulier'],
 ['Het marketingdashboard', 'Wij maken het aan. Hij krijgt een login, net als wie de aanvragen opvolgt.', 'Wij', ''],
]) + let('<p><b>Nooit op onze naam, ook niet “even”.</b> Een account op onze naam is sneller aangemaakt, maar dan zit hij bij vertrek aan ons vast. Dat is precies het bureau dat wij niet willen zijn. Staat er al een account op naam van zijn vorige bureau, dan helpen we het over te zetten.</p>') + """
<h3>Als het uitloopt</h3>
""" + tbl(['Situatie', 'Wat we doen'], [
 ['Dag 3, geen sessie geweest', 'Bellen, niet mailen, dezelfde dag.'],
 ['Iets hangt bij een derde', 'Webbouwer of hosting: wij mailen die zelf, met hem in cc. Hij hoeft niets te vertalen of door te sturen.'],
 ['Dag 1 schuift', 'Elke dag dat dag 1 later begint, schuift de live-datum een dag. Het portaal rekent de nieuwe datum uit en mailt hem vanaf support@. Geen verwijt, gewoon de planning.'],
 ['Het ligt aan ons', 'Dan zeggen we dat ook, op dezelfde plek, met de nieuwe datum.'],
]) + raakt(ul([
 '<b>Elke dag later is een dag later live.</b> Maand 1 is vier weken vanaf volledige toegang. Drie werkdagen onboarding plus 19 werkdagen fundament past net in een maand; tien werkdagen onboarding past niet.',
 '<b>Loopt maand 1 uit, dan betaalt de klant al retainer voordat hij live is.</b> De retainer start altijd in maand 2. Dat is een reden om de drie werkdagen streng te bewaken, niet om de factuur te verschuiven.',
 '<b>Het formulier voedt het fundament direct:</b> klanttaal wordt zoekwoorden en advertentietekst, het klantenbestand toetst de doelgroep, de e-maillijst gaat MailerLite in, de draaidagvragen worden de shotlist.',
], '')) + open_(ul([
 'Het toegangendocument maken, met de klikroute per platform, en de kick-offmail en het document in het portaal bouwen.',
 'Per vraag in het formulier vastleggen wanneer een antwoord bruikbaar is. Het oude document “antwoorden beoordelen” gaat nog uit van 41 vragen.',
], '')) + stap_eind()

# ---------------------------------------------------------------- STAP 07
BLOKKEN = [
 ('01', 'Doelgroep en boodschap', '7,5–8', 'Doel en plan liggen vast uit het voorstelgesprek. Hier werken we ze uit tot doelgroepen, boodschap en targeting, met wat de klant in het intakegesprek vertelde en in het onboardingformulier aanleverde. Wij doen het denkwerk, niet het invulwerk. De merkcheck legt vast waar elke uiting aan moet voldoen: vanaf hier is alles wat we maken on-brand.', [('Onboardingformulier verwerken', 4, '2'), ('Doelgroep uitwerken', 3, '1,5'), ('Propositie aanscherpen', 2, '1,5'), ('Concurrentieanalyse', 2, '1'), ('Conversiedefinitie', 1, '0,5'), ('Merkcheck', 3, '1–1,5')]),
 ('02', 'Techniek en meting', '7', 'Wij meten volgens de checklist, nu met toegang. Wat niet voldoet, gaat naar Webmix als apart voorstel: wij herstellen geen websites binnen het fundament.', [('De technische audit', 2, '2'), ('Bevindingen doorzetten', 2, '1'), ('Meetopzet volgens onze standaard', 5, '3,5'), ('De nulmeting', 1, '0,5')]),
 ('03', 'Onze systemen', '8,5', 'Wij koppelen niet aan de systemen van de klant; hij krijgt toegang tot die van ons. Dat is het verschil tussen een product en eindeloos maatwerk. Advertentieaccounts: standaard Google Ads en Meta, altijd allebei. Microsoft Ads, LinkedIn en TikTok zetten we op als doelgroep en cijfers erom vragen.', [('Advertentieaccounts', 3, '1,5'), ('MailerLite', 5, '2,5'), ('Leadinfo', 1, '0,5'), ('Je marketingdashboard', 7, '4')]),
 ('04', 'De campagne', '14', 'Eenmalig opzetwerk, en daarom onderdeel van het fundament. Wat daarna volgt, optimaliseren, nieuwe sets en de Performance Reviews, zit in de retainer.', [('Zoekwoordonderzoek', 4, '3'), ('Campagnestructuur', 3, '2'), ('Advertenties schrijven', 3, '2'), ('Doelgroepen en targeting', 2, '1'), ('Biedstrategie en retargeting', 2, '1'), ('Landingspagina', 4, '4'), ('Formulier en bedankpagina', 2, '1')]),
 ('05', 'De content', '11', 'De brandstof van de motor. Marketingcontent, geen bedrijfsvideo en geen branded content: foto, video, animatie en graphics die in advertenties werken, in de formaten van elk kanaal en in varianten om te testen. Eén draaidag levert het materiaal voor een kwartaal; de volgende draaidagen zitten in het pakket.', [('Voorbereiding', 2, '1'), ('De draaidag', 3, '5,5'), ('Montage', 4, '4,5')]),
 ('06', 'Live', '4,5', 'De laatste stap, en de week erna. Hier blijkt of alles echt werkt.', [('Kickoff met je team', 2, '1,5'), ('Testaanvraag door de keten', 2, '1'), ('De eerste week', 2, '2')]),
]
VERSCHOVEN = {'1': 'Gaat nu automatisch mee met de kick-offmail', '3': 'Gebeurt nu vóór het voorstel (stap 04)', '4': 'Gebeurt nu vóór het voorstel (stap 04)'}

def blok_tabel():
    out = []
    i = 0; w = 0
    wi = {x['titel']: x for x in WI}
    for nr, naam, uren, uitleg, onderdelen in BLOKKEN:
        rows = []
        mis = []
        for (ond, n, u) in onderdelen:
            rows.append(('grp', '%s · %s UUR' % (ond.upper(), u)))
            for k in range(n):
                r = PB[i]; i += 1
                taak = r[1]
                if taak.startswith(ond + ' '): taak = taak[len(ond) + 1:]
                if ond == 'Je marketingdashboard' and taak.startswith('Je marketingdashboard '): taak = taak[len('Je marketingdashboard '):]
                if ond == 'Kickoff met je team' and taak.startswith('Kickoff met je team '): taak = taak[len('Kickoff met je team '):]
                row = [r[0], taak, r[2], r[3], r[4], r[5].replace(' u', '&nbsp;u')]
                if r[0] in VERSCHOVEN:
                    row[1] += ' <span class="chip o">%s</span>' % VERSCHOVEN[r[0]].upper()
                    rows.append(('oud', row))
                else:
                    rows.append(row)
            x = wi.get(ond)
            if x and x['mis']:
                mis.append('<li><b>%s.</b> %s <span style="color:var(--tx3)">Klaar als: %s</span></li>' % (ond, x['mis'], x['klaar']))
        out.append('<h4 style="margin-top:34px;font-size:20px">Blok %s · %s <span class="chip b">%s UUR</span></h4><p>%s</p>' % (nr, naam, uren, uitleg))
        out.append(tbl(['#', 'Taak', 'Rol', 'Middel', 'Wat er dan af is', 'Uur'], rows, right=(5,)))
        out.append('<div class="vlak grijs" style="max-width:none"><span class="vk">WAAR HET MISGAAT, EN WANNEER HET AF IS</span><ul>%s</ul></div>' % ''.join(mis))
    assert i == 76, i
    return ''.join(out)

TITELS = {'T2':'Template campagnestructuur','T6':'Template shotlist en draaidag','C2':'Checklist accounts en toegang','T5':'Template e-mailopzet','A2':'AI-instructie propositie en tekst','T1':'Template meetopzet','A6':'AI-instructie zoekwoorden','C3':'Checklist doortesten','F1':'Het onboardingformulier','P1':'Het marketingdashboard','S1':'Standaardset conversies','T4':'Template advertentiesjablonen','T7':'Template dashboard','A3':'AI-instructie concurrentieanalyse','C1':'Checklist technische audit','F2':'Rekenblad doel en toolkosten','G2':'Gespreksleidraad kickoff','P2':'Merkchecklijst','S2':'Standaard uitsluitingslijst','S3':'Standaard targetingprofielen','T3':'Template landingspagina','A1':'AI-instructie doelgroep','A4':'AI-instructie bevindingenrapport','A5':'AI-instructie advertentieteksten','G1':'Gespreksleidraad bevindingen','G3':'Gespreksleidraad dashboard','W1':'Aanvraagformat Webmix'}
def middelen():
    rows = []
    for code, txt, n, stand in MID:
        t = TITELS[code]; d = txt[len(t):].strip() if txt.startswith(t) else txt
        ch = R('BESTAAT NOG NIET') if 'nog niet' in stand else O('VASTLEGGEN')
        rows.append(['<b>%s</b> · %s' % (code, t), d, n, ch])
    return tbl(['Middel', 'Wat het is', 'Stappen', 'Stand'], rows, right=(2,))

STAP07 = stap_kop('07', 'f2', 'FASE 2 · STARTEN', 'Het fundament',
 'Maand 1: stap 1 en 2 van ons plan, de set-up en de content. Vier weken vanaf volledige toegang, niet vanaf ondertekening. 27 onderdelen in zes blokken, opengewerkt in 76 taken, allemaal in halve uren. Wij werken uit, verrijken met AI en bouwen.',
 [('WANNEER', 'Dag 1 (alle toegangen binnen) tot dag 19 live; dag 26 eerste cijfers'), ('WIE', 'Vijf rollen: techniek, campagne, content, strategie, klantcontact'), ('HOE LANG', '52,5 tot 53 uur werk, verdeeld over vier weken'), ('KLAAR ALS', 'De campagne staat live, de testaanvraag is in het dashboard aangekomen, en de eerste week is dagelijks gecontroleerd')],
 'stap-07') + klant('Vier weken lang elke week iets wat hij kan zien: in week 1 wat we vonden, in week 3 de draaidag, in week 4 de complete campagne voordat hij live gaat. Daartussen twee keer een akkoord, en verder niets.') + """
<h3>Het tijdpad</h3>
<p>In werkdagen, vanaf dag 1. Elke dag die wij wachten op toegang of op een akkoord, schuift alles op.</p>
""" + tl([
 ('Vóór dag 1', 'Onboardingformulier en toegangen', 'Binnen drie werkdagen na het tekenen (stap 06).'),
 ('Dag 1', 'De klok start', 'Wij beginnen met de technische audit, nu met toegang.'),
 ('Dag 2 – 4', 'Doelgroep en boodschap', 'Doel en plan uit het voorstel uitwerken tot doelgroepen, boodschap en zoekwoorden. Geen extra sessie: dat gesprek is gevoerd.'),
 ('Dag 4', 'Bevindingen techniek', 'Wat niet deugt, met wat herstel kost. De klant beslist: nu, later of niet.'),
 ('Dag 5 – 10', 'Systemen en meting', 'Advertentieaccounts, MailerLite, het marketingdashboard en de meetopzet. Ons werk, af en toe een akkoord van hem.'),
 ('Dag 11 – 20', 'De draaidag', 'Eén dagdeel bij hem op locatie, in week 3 of 4, gekozen uit de dagdelen die hij opgaf en afgestemd met de videograaf. Liefst vroeg in week 3: dan is de montage klaar voor de preview.'),
 ('Dag 10 – 16', 'Campagne en landingspagina', 'Bouwen, schrijven, monteren. Alles staat klaar om getest te worden.'),
 ('Dag 17', 'Hij kijkt mee', 'De complete campagne voordat hij live gaat, na onze eigen check op merk en meting. Eén ronde feedback.'),
 ('Dag 19', 'Live', 'We zetten hem aan en kijken de eerste week dagelijks mee.'),
 ('Dag 26', 'Eerste cijfers', 'Nog geen conclusies, wel de eerste aanvragen en de richting.'),
]) + """
<h3>Wat wij van de klant nodig hebben</h3>
""" + grid(4, [
 kaart('Het onboardingformulier', 'Binnen drie werkdagen. Het meeste denkwerk dat we van hem vragen, en het scheelt ons de helft van de tijd.', 'DAG 1 – 3'),
 kaart('Beheerderstoegang', 'Binnen drie werkdagen, in de toegangensessie. Specifiek: zelf een script in de head van zijn site kunnen plaatsen. Kan dat alleen via zijn leverancier, dan nu, niet in week twee.', 'DAG 1 – 3'),
 kaart('Snel akkoord', 'Op de boodschap in week 1 en op de campagne in week 3, binnen twee werkdagen, door de persoon die beslist.', 'WEEK 1 EN 3'),
 kaart('Dagdelen voor de draaidag', 'Alle dagdelen in week 3 en 4 waarop we kunnen filmen, in het formulier. Wij stemmen af met de videograaf. Zonder eigen beeld beginnen we met stock, en dat werkt aantoonbaar slechter.', 'WEEK 3 OF 4'),
]) + """
<h3>Zes blokken, 76 taken</h3>
<p>Elk onderdeel is opengewerkt in de taken die erin zitten, met de uren per taak, de rol die hem doet, het middel waaruit hij gedaan wordt, en wat er dan af is: geen mening, maar iets wat je kunt zien. Een rol is een soort werk, geen functie: bij een kleine klant doet één persoon er drie. Techniek (27 taken) en content (16) dragen samen bijna twee derde; dat is goed voor de schaalbaarheid, want dat werk volgt een checklist. Strategie (11) zit vrijwel volledig in de eerste dagen. Klantcontact is het kleinst: zes momenten.</p>
""" + blok_tabel() + """
<p style="margin-top:20px"><b>Blok 01 opnieuw bekijken.</b> Drie taken zijn verschoven: het formulier gaat mee met de kick-offmail, en doel narekenen en toolkosten gebeuren vóór het voorstel. Die anderhalf uur horen in de herrekening van het fundament.</p>

<h3>Het marketingdashboard: wat we bouwen</h3>
<p>Eén plek waar de klant ziet wat zijn marketing doet, en waar hij met één klik zegt of een aanvraag iets waard was. Het staat náást zijn eigen systeem en vervangt het nooit. Zijn systeem kent de aanvraag; alleen wij weten waar hij vandaan kwam: via welke advertentie, welke zoekterm, welk apparaat, om kwart over acht ’s avonds. Dat verband bestaat alleen hier.</p>
""" + key('HET GETAL DAT DIT VERKOOPT', 'Je weet nu niet hoeveel van je aanvragen nergens over gaan.', '<p>Bij 21 aanvragen per maand tegen € 150 is elke aanvraag die nergens over gaat weggegooid geld. Zijn dat er acht, dan is dat € 1.200 per maand, € 14.400 per jaar. Niemand kent dat aantal, want niemand telt het. De eerste maand labelen geeft het antwoord al. <b>Wat je er niet over zegt:</b> “je oordeel maakt het algoritme slimmer” klopt pas bij tientallen conversies per week. Bij twintig per maand werkt iets anders: een mens die ze leest. Zes slechte aanvragen van dezelfde zoekterm zie je met het blote oog.</p>') + grid(2, [
 kaart('Wel', ul(['Elke aanvraag, met herkomst tot op zoekterm', 'Eén oordeel per aanvraag: goed of niet (met een reden uit zes), en later of hij klant werd', 'De keten met echte getallen: weergaven, bezoekers, aanvragen, klanten', 'Kosten per aanvraag én per goede aanvraag', 'De opvolgtijd'], ''), 'EEN DASHBOARD', 'g'),
 kaart('Nooit', ul(['Pijplijnstatussen en deals: dat staat in zijn systeem', 'Taken, herinneringen en agenda', 'Notities en gespreksgeschiedenis: één notitieveld is genoeg', 'E-mails naar aanvragers: dat is MailerLite', 'Gebruikersrollen en rechten in versie één'], ''), 'GEEN CRM', 'r'),
]) + """
<h4 style="margin-top:26px">Vijf schermen</h4>
""" + tbl(['Scherm', 'Wat erop staat', 'Waarom zo'], [
 ['Overzicht', 'De vier ketengetallen tegen het doel uit de rekensom, kosten per (goede) aanvraag, de trend over zes maanden, en één teller: “zes wachten op je oordeel”', 'Die ene teller is het hele ontwerp: de reden dat iemand terugkomt'],
 ['Aanvragen', 'Nieuwste boven, knoppen per regel (goed, niet goed, klant geworden), standaardfilter op “nog geen oordeel”', 'Hij ziet zijn werkvoorraad, niet zijn hele historie'],
 ['Eén aanvraag', 'Alles wat ze invulden, de volledige herkomst, het oordeel en wie het gaf', 'Dit kan zijn eigen systeem niet'],
 ['Marketing', 'De keten per kanaal en campagne, de zoektermen met de meeste slechte aanvragen, en wat wij deze maand bijstelden en waarom', 'Die laatste regel maakt de retainer zichtbaar op de dagen dat er weinig gebeurt'],
 ['Instellingen', 'Wie krijgt meldingen en de weekmail. Meer niet.', 'Klein houden'],
]) + """
<p style="margin-top:14px"><b>Drie ingangen voor één klik.</b> De meldingsmail direct bij binnenkomst, met twee knoppen en zonder inlog: hier komt verreweg het meeste vandaan. Op maandag de weekmail, alleen als er aanvragen op een oordeel wachten; vaker wordt ruis. En het portaal zelf, voor wie meer wil. Een aanvraag zonder oordeel blijft zichtbaar. <b>Klant geworden.</b> Of een aanvraag klant werd, weet de klant pas weken later. Daarom staat die derde knop niet in de meldingsmail maar in de weekmail en het portaal, bij aanvragen die al “goed” waren. Het is het getal waar de Performance Review mee eindigt: hoeveel klanten, wie, en wat een klant kostte.</p>
<p><b>Elke ochtend om 7.00 uur: de dagmail, voor ons.</b> Intern, niet voor de klant. Eén mail uit het dashboard met de performance van al onze campagnes van gisteren: per klant de uitgaven, de aanvragen en de kosten per aanvraag tegen de doelregel. Wat buiten een drempel uit stap 08 valt, staat bovenaan in rood. Zo begint de dag met wat aandacht nodig heeft, en hangt het niet af van wie er toevallig oplet.</p>
""" + tbl(['Reden “geen goede aanvraag”', 'Wat wij dan doen'], [
 ['Verkeerd gebied', 'Gebied uitsluiten of straal aanpassen; bij Google “aanwezig in” in plaats van “interesse in”'],
 ['Te klein of verkeerd budget', 'Prijsindicatie in advertentie of pagina, kwalificatievraag over budget in het formulier'],
 ['Zocht iets anders', 'Zoekterm uitsluiten, tekst en pagina aanscherpen op wat hij wél doet'],
 ['Onbereikbaar of nepgegevens', 'Telefoonveld verplicht, botfilter, iets meer wrijving: minder aanvragen, betere aanvragen'],
 ['Concurrent of leverancier', 'Registreren; bij B2B bedrijven uitsluiten via Leadinfo'],
 ['Was al klant', 'Klantenlijst uploaden als uitsluiting. Scheelt direct geld.'],
]) + """
<p style="margin-top:14px"><b>Wat we per aanvraag opslaan:</b> identiteit, wat ze invulden, herkomst (kanaal, campagne, advertentiegroep, advertentie, zoekterm, pagina, apparaat, gebied), technisch (click id, consent-status, sessie), het oordeel (label: goed, niet goed of klant geworden; reden, notitie, door wie, wanneer; bij klant geworden eventueel het bedrag) en de opvolging. <b>Sla de click id vanaf dag één op.</b> Het kost nu niets, en zonder dat getal kun je later nooit goede aanvragen terugmelden aan de advertentieplatformen.</p>
""" + tbl(['Versie', 'Wat', 'Wanneer'], [
 ['v0 · alleen de mail', 'De meldingsmail met twee knoppen, een pagina met de zes redenen, een tabel erachter. Wij lezen ze met de hand.', 'Eerst, binnen dagen. Beantwoordt de vraag waar alles aan hangt: labelen klanten überhaupt?'],
 ['v1 · het dashboard', 'De vijf schermen, formulieren en bronnen gekoppeld, doelen uit de rekensom, de weekmail, en de dagmail om 7.00 uur voor ons', 'Vóór de eerste klant op het nieuwe model. Dit beloof je aan tafel.'],
 ['v2 · terugkoppelen', 'Kosten per goede aanvraag per zoekterm, offline conversies terug naar de advertentieplatformen, export, rechten', 'Pas bij tientallen conversies per week'],
]) + """
<h3>Naast het fundament: Webmix en tooling</h3>
<p>Drie posten staan los van onze fee en gaan niet via ons, maar ze staan wél in het voorstel met een bedrag, zodat niemand halverwege verrast wordt.</p>
""" + tbl(['Hosting', 'Wanneer', 'Bedrag'], [
 ['Alles voldoet', 'Zijn hosting haalt de norm. Hij blijft waar hij zit.', '€ 0'],
 ['Het voldoet niet, en hij zet om', 'Migratie gratis. Met onderhoud, SSL, back-ups meermaals per dag, malwarescans, uptime-monitoring, CDN en e-mailadressen.', '€ 85 p/m'],
 ['Het voldoet niet, en hij laat het staan', 'Dan beginnen we gewoon. Maar bij elk rapport staat een kanttekening, want een deel van wat we uitgeven verdampt in laadtijd en uitval.', '€ 0'],
], right=(2,)) + """
<h4 style="margin-top:22px">En als hij het herstel niet doet</h4>
<p>Een trage site maakt elke aanvraag duurder, elke maand opnieuw. Geen dreigement maar een rekensom, bij € 100 per aanvraag en 120 aanvragen per jaar:</p>
""" + tbl(['Wat er mis is', 'Per aanvraag', 'Per jaar'], [
 ['Eén seconde trager dan zou moeten', '+ € 8', '€ 900'],
 ['Twee seconden trager', '+ € 16', '€ 1.950'],
 ['Conversiemeting niet op orde', '+ € 33', '€ 4.000'],
], right=(1, 2)) + """
<p style="margin-top:12px">€ 85 per maand is € 1.020 per jaar; één seconde sneller verdient dat vrijwel terug. Kiest een klant er toch tegen, dan is dat zijn goed recht. Wij zetten het één keer op papier en noemen het daarna bij elke rapportage, zonder verwijt. Zonder goede meting leert het algoritme niet, en zonder e-mailauthenticatie belandt zijn mail in de spam.</p>
""" + grid(3, [
 kaart('MailerLite', 'Vast onderdeel en vanaf dag één actief, want we verzamelen meteen adressen. Vanaf € 9,90 per maand bij jaarlijkse betaling; de prijs volgt de lijstgrootte. Import, segmentatie en koppeling zitten in het fundament.', 'ALTIJD'),
 kaart('Leadinfo', 'Zien welke bedrijven langskwamen zonder te converteren. Alleen zinvol bij B2B en als hij er zelf iets mee doet; wij volgen geen leads op. Set-up regelen wij kosteloos; de prijs volgt het aantal herkenningen.', 'OPTIONEEL'),
 kaart('Afsprakenplanner', 'Alleen als hij afspraken laat inplannen. Opzetten, koppelen aan zijn agenda en de landingspagina: € 250 eenmalig, daarna € 15 per gebruiker per maand.', 'OPTIONEEL'),
]) + """
<p style="margin-top:14px"><b>In het voorstel geen “vanaf”.</b> “Vanaf € 9,90” is waar voor een lijst van vijfhonderd adressen en onwaar voor een makelaar met achtduizend. Daarom vragen we het aantal adressen in de afspraakbevestiging, en de bezoekers en de afsprakenplanner aan tafel, zodat het bedrag vóór de handtekening vaststaat.</p>

<h3>Wat een klant in jaar 1 betaalt, en aan wie</h3>
""" + tbl(['', 'Starter', 'Playmaker', 'Captain', 'Champion'], [
 ['Fundament · eenmalig, aan ons', '€ 4.500', '€ 4.500', '€ 4.500', '€ 4.500'],
 ['Retainer · elf maanden, aan ons', '€ 11.000', '€ 16.500', '€ 22.000', '€ 27.500'],
 ['Dashboard · elf maanden, aan ons', '€ 275', '€ 275', '€ 275', '€ 275'],
 ['Advertentiebudget · minimum, elf maanden', '€ 11.000', '€ 27.500', '€ 55.000', '€ 82.500'],
 ['MailerLite en Cookiescript · aan de leveranciers', '€ 269', '€ 269', '€ 269', '€ 269'],
 ('tot', ['Jaar 1, alles samen', '± € 27.000', '± € 49.000', '± € 82.000', '± € 115.000']),
 ['Waarvan naar ons', '€ 15.775', '€ 21.275', '€ 26.775', '€ 32.275'],
 ['Ons aandeel', '58%', '43%', '33%', '28%'],
 ['Hosting, alleen als hij overzet', '€ 0 of € 1.020', '€ 0 of € 1.020', '€ 0 of € 1.020', '€ 0 of € 1.020'],
 ['Herstelwerk, alleen als de quickscan het vindt', '€ 0 – 1.500', '€ 0 – 1.500', '€ 0 – 1.500', '€ 0 – 1.500'],
], right=(1, 2, 3, 4)) + """
<p style="margin-top:12px">Jaar 1 is de set-upmaand plus elf maanden retainer. Gerekend met het laagste advertentiebudget en MailerLite op het laagste tarief. Bij Starter is ons aandeel het hoogst, en dat is logisch: het fundament is voor iedereen hetzelfde werk terwijl het budget verschilt. Sub staat er niet in: licht fundament € 1.500, elf maanden € 500 retainer en minimaal € 500 advertenties, samen ongeveer € 13.000 in jaar 1. Vanaf het tweede jaar valt het fundament weg. Het grootste deel gaat niet naar ons, en dat is precies het punt: wij verdienen aan het sturen.</p>

<h3>Wat er moet bestaan voordat dit werkt</h3>
<p>27 middelen, op volgorde van hoe vaak ze terugkomen. Een middel dat in zeven stappen terugkomt, levert zeven keer tijdwinst en zeven keer minder spreiding op. Zolang een middel niet bestaat, wordt de stap elke keer opnieuw bedacht, door wie toevallig beschikbaar is, in de tijd die het die keer kost.</p>
""" + middelen() + raakt(ul([
 '<b>Een draaidag in week 4 schuift de video.</b> Google gaat dan op dag 19 live met tekst en beeld uit de sjablonen, Meta met video zodra de montage klaar is, ongeveer een week later. De retainer start toch in maand 2. Daarom liefst vroeg in week 3, en daarom vragen we zoveel mogelijk dagdelen.',
 '<b>Altijd on-brand, ook onder tijdsdruk.</b> Elke uiting gaat door de merkcheck voordat hij live gaat: sjablonen, kleuren, typografie, toon. Een snelle variant die niet klopt met het merk, gaat niet live. Dat kost soms een dag, en dat is de prijs van een merk dat consistent wordt gepresenteerd.',
 '<b>De uren kloppen alleen met de middelen.</b> Zeven middelen bestaan nog niet (zes AI-instructies en het dashboard); daar hangen 16 van de 76 taken aan. De AI-stappen zijn samen ongeveer vijf uur in de begroting; zonder goede prompts eerder twaalf. Dat is het verschil tussen € 86 en € 60 per uur.',
 '<b>Het dashboard moet af zijn vóór de eerste klant.</b> Zonder dashboard geen “wij koppelen niet”, geen oordeel per aanvraag, en geen plek waar een aanvraag landt.',
 '<b>De nulmeting vóór de campagne.</b> Doe je hem later, dan meet je jezelf mee en is het ijkpunt waardeloos. Zonder ijkpunt is elk cijfer daarna een mening.',
 '<b>Intern: 52,5 uur voor € 4.500 is ongeveer € 86 per uur,</b> bij een kostprijs rond € 2.050. Er is geen bandbreedte meer: alles staat in halve uren, en alleen het halfuur kleur en typografie kan wegvallen.',
], '')) + open_(ul([
 '<b>De prijs van het fundament.</b> Voorlopig € 4.500. Jim Kikken en Stan rekenen het na tegen € 100–125 per uur, inclusief de verschoven taken van blok 01. Toets het ook aan de laatste drie onboardings: hoeveel uur zat erin en wat is er gefactureerd?',
 '<b>Extra kanalen in het fundament?</b> Het fundament rekent met Google Ads en Meta. Kost een derde kanaal (Microsoft Ads, LinkedIn, TikTok) bij de start extra uren, en zo ja, is dat een los bedrag? Het minimum per kanaal staat voorlopig op € 500 per campagne per maand, op LinkedIn € 1.000; toetsen aan onze eigen accounts.',
 'Het ClickUp-template met de 76 taken.',
 'De zes AI-instructies. Begin met A2, de propositie-instructie: die komt drie keer terug.',
 'Het marketingdashboard bouwen, te beginnen met v0. Open: bouwen of samenstellen (advies: samenstellen tot twintig klanten), en wie de eigenaar is, ook buiten kantooruren.',
 'De Webmix-bedragen vastzetten, en de MailerLite- en Leadinfo-staffels invullen.',
], '')) + stap_eind()

P2C = DEEL2B + STAP05 + STAP06 + STAP07
