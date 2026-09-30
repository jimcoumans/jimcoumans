# -*- coding: utf-8 -*-
from common import *

FASE1 = """
<section class="sec" style="background:var(--p1b);border-top:none" id="fase-1"><div class="wrap">
<span class="kick" style="color:var(--p1)">FASE 1 · VERKOPEN</span>
<h2>Van klik tot akkoord, in ongeveer twee weken</h2>
<p class="sub">De klant betaalt in deze fase niets. Tot aan de quickscan draait alles zonder mens. Daarna twee gesprekken met dezelfde persoon, en aan het eind een akkoord, een datum of een nee.</p>
<div class="klok"><span style="flex:1" class="acc">KLIK</span><span style="flex:2">VRAGENLIJST</span><span style="flex:3">≥ 3 WERKDAGEN · QUICKSCAN</span><span style="flex:2">INTAKEGESPREK</span><span style="flex:3">3 WERKDAGEN · VOORSTEL</span><span style="flex:2">VOORSTELGESPREK</span></div>
</div></section>
"""

DEEL3_OPEN = """
<section class="deel" id="deel-3"><div class="wrap">
<span class="kick">DEEL 3</span>
<h2>Hoe alles samenhangt</h2>
<p>Wat je hierboven stap voor stap las, in één overzicht: welke getallen elkaar bepalen, wat er gebeurt als één schakel schuift, en wie waar aan zet is.</p>
</div></section>
"""

SAMEN = """
<section class="sec" id="samenhang"><div class="wrap">
<span class="kick">3.1 · DE REKENKETEN</span>
<h2>Eén som bepaalt bijna alles</h2>
<p class="sub">Het doel van de klant wordt een marketingruimte, de vaste posten gaan eraf, wat overblijft is het advertentiebudget, en dat bepaalt het pakket. Daarna loopt dezelfde som door tot in elk performanceblok.</p>
<div class="stroom">
 <div class="s"><span class="sl">STAP 03</span><b>Doel × marge × termijn</b><span>€ 120.000 × 30% × 1 jaar</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">MARKETINGRUIMTE</span><b>€ 36.000</b><span>alles samen, jaar 1</span></div><div class="pijl">−</div>
 <div class="s"><span class="sl">VASTE POSTEN</span><b>€ 17.069</b><span>fundament, retainer, licenties, herstel</span></div><div class="pijl">=</div>
 <div class="s"><span class="sl">ADVERTENTIES</span><b>€ 1.578 p/m</b><span>bepaalt het pakket: Enter</span></div>
</div>
<div class="stroom">
 <div class="s"><span class="sl">STAP 04</span><b>€ 177 per aanvraag</b><span>budget ÷ aanvragen: het biedplafond</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">STAP 07</span><b>Doellijn in het dashboard</b><span>9 extra aanvragen per maand</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">STAP 08</span><b>Elk performanceblok</b><span>zitten we op de regel, en zo nee, waarom niet?</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">TOETS</span><b>50%-regel</b><span>retainer 39% van het maandbudget</span></div>
</div>

<h3>Als één schakel schuift</h3>
<p>Wat er gebeurt als iets anders loopt dan gepland. Links de oorzaak, in het midden het directe gevolg, rechts waar het uiteindelijk terechtkomt.</p>
""" + keten([
 ('Toegangen of formulier later dan drie werkdagen', 'Dag 1 van het fundament schuift', 'De live-datum schuift evenveel dagen; bij uitloop door de klant schuift de retainer niet mee (voorstel)'),
 ('De draaidag ligt niet vast bij het tekenen', 'Geen live-datum in het voorstel en het startbericht', 'We beloven een datum die we niet kunnen houden, of geen datum'),
 ('Een rood punt in de quickscan (Webmix)', 'Een herstelpost vóór het tekenen', 'Minder marketingruimte voor advertenties; bij een krappe som een kleiner pakket of nee'),
 ('Er kan geen meetcode in de site', 'De stopknop: afspraak gaat niet door', 'Geen intakegesprek; rode mail “niet meten”'),
 ('Het fundament wordt duurder na de herrekening', 'Hogere vaste posten in de rekensom', 'De ondergrens voor Enter stijgt, van ± € 97.000 naar € 99.400 of € 103.800 extra omzet bij 30% marge'),
 ('De klant belt aanvragen laat terug', 'Aanvragen worden geen klant', 'Oorzaak 08: doel niet gehaald terwijl onze cijfers kloppen'),
 ('De klant geeft geen oordeel per aanvraag', 'Wij sturen op aantal, niet op kwaliteit', 'Oorzaak 09: veel aanvragen, weinig klanten'),
 ('De meting klopt niet', 'Elke diagnose wordt een mening', 'Oorzaak 10: niet starten, of maanden sturen op cijfers die niet kloppen'),
 ('Het dashboard is niet af', 'Geen plek waar aanvragen landen met herkomst', '“Wij koppelen niet” valt weg, en dan wordt het maatwerk'),
 ('De AI-instructies ontbreken', 'De taken met AI kosten twee keer zo lang', 'Van € 86 naar ongeveer € 60 per uur op het fundament'),
 ('Enter: de enige draaidag zat in het fundament', 'Geen nieuw beeld dat jaar', 'Advertenties slijten; oorzaak 04 ligt op de loer, of een extra draaidag los'),
 ('Maandritme zonder zichtbare update', 'De klant ziet niet waarvoor hij betaalt', 'Opzegging, want dat kan elke maand'),
]) + """
<h3>Wie waar aan zet is</h3>
""" + tbl(['Stap', 'Automatisch', 'Vaste medewerker', 'Accountmanager of eigenaar', 'Klant'], [
 ['01 · Aanvraag tot afspraak', 'Formulier, video, vragenlijst, uitkomst, mails', 'Het kwartier bij oranje', 'Regels nakijken, eerste drie maanden', 'Vragenlijst, zelf inplannen'],
 ['02 · Quickscan', 'Klantkaart, kleuren, concept-advies', 'Invullen, nakijken, vrijgeven', '—', '—'],
 ['03 · Intakegesprek', '—', '—', 'Het gesprek, de klantkaart, de mail', 'Doel, marge, capaciteit, opvolging'],
 ['04 · Voorstel', 'Rekensom, concept, offerte-concept', '—', 'Nakijken, vrijgeven, het gesprek', 'Beslissen; maand of jaar per licentie'],
 ['05 · Tekenen', 'Moneybird, machtiging, factuur', '—', '—', 'Tekenen, machtigen'],
 ['06 · Onboarding', 'Startbericht, datums', '—', 'Vast aanspreekpunt: bellen, toegangensessie', 'Formulier, toegangen, betaalgegevens'],
 ['07 · Fundament', '—', 'Vijf rollen, 76 taken', 'Klantcontact: akkoorden, draaidag, kick-off', 'Akkoord week 1 en 3, draaidag'],
 ['08 · Maandritme', 'Meldingen, weekmail, dashboard', 'Wekelijks bijsturen, maandupdate', 'Performanceblok, ingrijpen', 'Opvolgen, oordeel per aanvraag'],
]) + """
<h3>Wat we wanneer vragen</h3>
<p>Elke vraag één keer, op het eerste moment dat het antwoord iets verandert. Wat we eerder weten, staat op de klantkaart en komt later terug als “klopt dit nog?”.</p>
""" + tbl(['Moment', 'Wie, hoe lang', 'Wat hoort hier'], [
 ['Vragenlijst (01)', 'De klant, vijf minuten', 'Kwalificeren en de quickscan mogelijk maken: aan wie, hoe word je klant, wat, waar, budget, website, klantwaarde, aanvragen, conversie, doorlooptijd, obstakel, start'],
 ['Afspraakbevestiging (01)', 'De klant, opzoeken', 'Omzetdoel, marge, aantal e-mailadressen, wie de site beheert, wie meebeslist'],
 ['Quickscan (02)', 'Wij, van buitenaf', 'Alles wat we zelf kunnen opzoeken. Dat vragen we nooit.'],
 ['Intakegesprek (03)', 'Een uur', 'Wat het advies of de prijs verandert: diensten, beste klant, waarom jij, concurrenten, marge, doel, termijn, capaciteit, opvolging, beslissers, afsprakenplanner, Leadinfo'],
 ['Voorstelgesprek (04)', '45 minuten', 'Keuzes: pakket bevestigen, maand of jaar per licentie, ClickCease, draaidag, de vijf afspraken met een naam en een termijn'],
 ['Onboardingformulier (06)', 'De klant, twintig minuten', 'Wat we pas nodig hebben om te maken: klanttaal, bestanden, beeld, e-maillijst, meldingen, draaidag'],
 ['Toegangensessie (06)', '45 minuten samen', 'Toegangen en betaalgegevens, op zijn naam'],
]) + """
</div></section>
"""

OPEN = """
<section class="sec alt" id="open"><div class="wrap">
<span class="kick">3.2 · WAT NOG OPEN LIGT</span>
<h2>Wat nog niet vastligt</h2>
<p class="sub">Alle open punten uit de stappen hierboven op één plek, gegroepeerd op hoe dringend ze zijn. Waar een voorstel staat, werken we ermee tot er een besluit is. Wie een punt afrondt, verplaatst het naar de besluiten.</p>
<h3>Blokkeert de eerste klant op het nieuwe model</h3>
""" + tbl(['Punt', 'Stand', 'Raakt', 'Wie'], [
 ['Prijs van het fundament', 'Voorlopig € 4.500 voor 52,5 uur; bij € 100–125 per uur € 5.250–6.563. Blok 01 herrekenen.', 'Tarieven, rekensom, Enter-grens, drukwerk', 'Jim Kikken en Stan'],
 ['Tarief marketingdashboard', 'Voorlopig € 25 p/m of € 250 p/j', 'Licenties in de rekensom, offerte', 'Jim Coumans en Jim Kikken'],
 ['Marketingdashboard bouwen', 'Gespecificeerd; v0 eerst. Open: bouwen of samenstellen, eigenaar ook buiten kantooruren', 'Stap 07 en 08, “wij koppelen niet”, jouw kant', 'Nog toe te wijzen'],
 ['Webmix-bedragen', '€ 750 / 500 / 250 zijn schattingen', 'Tarieven, quickscan-A4, voorstel', 'Met Webmix'],
 ['Staffels MailerLite en Leadinfo', 'Ontbreken; nu staat er “vanaf”', 'Voorstel pagina 5, rekensom', 'Nog toe te wijzen'],
 ['Formuliertool, video, portaal', 'Formuliertool nog kiezen, video nog opnemen, klantkaart nog bouwen', 'Stap 01 en 02 draaien niet zonder', 'Nog toe te wijzen'],
 ['AI-instructies', 'Zes voor het fundament plus het quickscan-advies en het voorstelconcept', 'Uren fundament, tijd per quickscan', 'Backlog'],
]) + """
<h3>Voorstellen die op een besluit wachten</h3>
""" + tbl(['Punt', 'Voorstel', 'Raakt'], [
 ['De draaidag', 'Plan A: vastleggen bij het tekenen, op dag 3 tot 5. Plan B (Google eerst, Meta na de montage) werkt niet bij vraagcreatie.', 'Live-datum in voorstel en startbericht'],
 ['Toegangen en formulier', 'Binnen drie werkdagen, niet tien', 'Past het fundament in maand 1'],
 ['Retainer bij uitloop maand 1', 'Door ons: eerste retainerfactuur schuift mee. Door de klant: niet.', 'Facturatie, verwachting'],
 ['Naam van het eerste bericht', '“Startbericht”; “kick-off” alleen voor de sessie in week 4', 'Teksten, portaal'],
 ['ClickCease per pakket', 'Standaard bij Compete en Own, proefperiode bij Enter; vergoeding erbij zeggen', 'Voorstelgesprek, licenties'],
 ['Wat een vertrekkende klant meeneemt', 'Volledige export, standaard en ongevraagd. Open: landingspagina en dashboard na stoppen.', 'Voorwaarden, opzeggen'],
 ['Jaar 1 in de rekensom', 'Twaalf maanden retainer (twaalf maanden live), al start de retainer in maand 2', 'Alle voorbeeldbedragen'],
 ['Merk: v3.0 of brandbook 2024', 'v3.0 (Inter Tight en Inter, JR Lime) is leidend', 'Alles wat de klant ziet'],
]) + """
<h3>Nog uit te werken</h3>
""" + grid(2, [
 kaart('Verkoop', ul(['De partnerlijst: wie we waarvoor introduceren', 'Sjablonen: antwoorden op één A4, scanrapport', 'Wie het intakegesprek voert naast Jim Coumans', 'De oranje drempels (€ 1.000, € 30, 1 op de 10) toetsen aan eigen accounts', 'Branchegemiddelden voor conversie', 'Prijs voor social-mediatemplates en contentsessie: zonder prijs is het een afwijzing met een vriendelijk randje', 'Toestemming voor de mailreeks juridisch laten nakijken'], ''), 'FASE 1'),
 kaart('Starten', ul(['Verwerkersovereenkomst, algemene voorwaarden, btw op alle documenten (bewust later)', 'Moneybird inrichten en koppelen aan het portaal', 'Handleiding klikroute per platform', 'ClickUp-template met de 76 taken', 'Indicaties voor “wat we vaak tegenkomen”', 'Per vraag in het onboardingformulier: wanneer is een antwoord bruikbaar'], ''), 'FASE 2'),
 kaart('Samenwerken', ul(['Een stappenlijst voor maand 2 tot en met 12, zoals de 76 taken van het fundament', 'Het live-bericht en de vorm van de maandupdate', 'Het performanceblok als vaste agenda', 'Wanneer we ingrijpen, en na welke termijn zonder beweging we het zelf melden', 'Normen per branche voor doorklik en conversie', 'Drie maanden “alleen de motor” toetsen aan de laatste vijf campagnes'], ''), 'FASE 3'),
 kaart('Rondom', ul(['<b>Bestaande klanten.</b> Het legacy- en scopebeleid is besloten maar niet opgeschreven: wat vervalt, wat een project wordt, de regeling tot 31 december 2027, met als tussenmijlpaal dat op 1 juli 2027 elke bestaande klant heeft getekend of een opzegdatum heeft. Daarna per klant een migratieplan.', '<b>Het drukwerk</b> gebruikt nog de vijf ARENA-letters (Attention, Retention, Experience, Numbers, Authority) als model, terwijl de methode nu middelpunt, motor en versnellers is. Ook ontbreken het dashboard en ClickCease.', '<b>De oude pakketpagina</b> noemt nog een maandoverleg; die geldt niet meer.', '<b>De eigen website</b> (homepage, werkwijze, dienstpagina’s) wacht tot de propositie vastligt.'], ''), 'BUITEN DE REIS', 'o'),
]) + """
</div></section>
"""

BESLUITEN = """
<section class="sec" id="besluiten"><div class="wrap">
<span class="kick">3.3 · BESLUITEN</span>
<h2>Wat vastligt, en sinds wanneer</h2>
<p class="sub">Een besluit wijzigen gaat hier eerst: een nieuwe regel met datum, daarna de tekst op de plek waar het werkt. Wat de klant te zien krijgt (tarieven, drukwerk, voorstel) maken we vanuit deze gids, nooit andersom.</p>
""" + tbl(['Datum', 'Besluit'], [
 ['23 sep 2026', 'We verkopen geen uren. Drie vaste pakketten (Enter, Compete, Own); het advertentiebudget bepaalt het pakket.'],
 ['23 sep 2026', 'Wij herstellen geen websites. Wat technisch niet deugt, gaat als voorstel naar Webmix; de klant beslist.'],
 ['23 sep 2026', 'Landingspagina’s staan op onze eigen omgeving, op een subdomein van de klant. In zijn site alleen meetcode en cookiebanner.'],
 ['23 sep 2026', 'Het fundament in halve uren, één prijs, twee delen die niet los te koop zijn.'],
 ['23 sep 2026', 'Nooit marge bovenop een partner of leverancier. Een doorverwijsvergoeding mag, en die zeggen we erbij.'],
 ['25 sep 2026', 'Social media beheer, e-commerce en werving horen niet bij de propositie.'],
 ['25 sep 2026', 'De methode: website als middelpunt, adverteren als motor, CRO, e-mail en SEO als versnellers.'],
 ['28 sep 2026', 'Het marketingdashboard is één product en geen CRM. We koppelen niet met systemen van de klant.'],
 ['29 sep 2026', 'Klantdossier, quickscan en verkooppijplijn staan in het portaal. ClickUp blijft voor de uitvoering.'],
 ['29 sep 2026', 'De vragenlijst heeft vijftien vragen; huidige omzet is geschrapt.'],
 ['29 sep 2026', 'Alles wat van buitenaf te meten is, meten we vóór het tekenen, zodat de prijs vaststaat.'],
 ['29 sep 2026', 'Het scanrapport komt tijdens het intakegesprek, en als bijlage bij de mail van dezelfde dag.'],
 ['29 sep 2026', 'Cijfers zijn leidend, geen resultaatbelofte, maandelijks opzegbaar voor allebei.'],
 ['29 sep 2026', 'Alles verdient zich terug binnen de terugverdientijd, standaard twaalf maanden. Vervangt de 25% van de marge.'],
 ['29 sep 2026', 'De 50%-regel: de retainer is nooit meer dan de helft van retainer plus advertentiebudget per maand.'],
 ['29 sep 2026', 'Niets gratis erbij. Wat we na het tekenen vinden, bieden we los aan met een prijs vooraf.'],
 ['29 sep 2026', 'Het marketingdashboard komt er, als eigen post aan ons: voorlopig € 25 p/m of € 250 p/j. Fundament voorlopig € 4.500.'],
 ['29 sep 2026', 'Een opgemaakt voorstel én een offerte die de klant in Moneybird tekent.'],
 ['30 sep 2026', 'Fundament bij ondertekening; retainer en dashboard vanaf maand 2 vooraf, factuur op de 1e, incasso op de 4e.'],
 ['30 sep 2026', 'Opzeggen tot en met de laatste dag van de maand; de maand erna geen factuur meer.'],
 ['30 sep 2026', 'Licenties op naam van de klant, rechtstreeks betaald, door ons geregeld; per licentie maand of jaar. ClickCease hoort erbij.'],
 ['30 sep 2026', 'Algemene voorwaarden en verwerkersovereenkomst passen we nu nog niet aan.'],
 ['30 sep 2026', 'We vragen wat we nodig hebben op het moment dat we het nodig hebben. Het intakegesprek duurt een uur.'],
 ['30 sep 2026', 'De namen: intakegesprek, voorstel maken, voorstelgesprek, onboarding, onboardingformulier, afronding. Niet meer: eerste helft, rust, tweede helft, intake deel 2.'],
 ['30 sep 2026', 'Ons plan is altijd hetzelfde: set-up, content, adverteren en eerste resultaten, optimaliseren. Doel en plan horen in het voorstelgesprek.'],
 ['30 sep 2026', 'Alles staat in deze ene gids, van boven naar beneden te lezen. De losse werkdocumenten zijn bron, niet leidend.'],
]) + """
</div></section>
<footer class="voet"><div class="wrap">James Robinson — Marketing &amp; Branding · De James Robinson-gids · versie 30 september 2026</div></footer>
"""

P3 = DEEL3_OPEN + SAMEN + OPEN + BESLUITEN
