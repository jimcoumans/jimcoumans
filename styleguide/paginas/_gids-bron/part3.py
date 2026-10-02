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
<p class="sub">Het doel van de klant wordt een marketingruimte, de vaste posten gaan eraf, wat overblijft is het advertentiebudget, en dat bepaalt het pakket. Daarna loopt dezelfde som door tot in elke Performance Review.</p>
<div class="stroom">
 <div class="s"><span class="sl">STAP 03</span><b>Doel × marge × termijn</b><span>€ 120.000 × 30% × 1 jaar</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">MARKETINGRUIMTE</span><b>€ 36.000</b><span>alles samen, jaar 1</span></div><div class="pijl">−</div>
 <div class="s"><span class="sl">VASTE POSTEN</span><b>€ 16.044</b><span>fundament, retainer, licenties, herstel</span></div><div class="pijl">=</div>
 <div class="s"><span class="sl">ADVERTENTIES</span><b>€ 1.814 p/m</b><span>bepaalt het pakket: Starter</span></div>
</div>
<div class="stroom">
 <div class="s"><span class="sl">STAP 04</span><b>€ 187 per aanvraag</b><span>budget ÷ aanvragen: het biedplafond</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">STAP 07</span><b>Doellijn in het dashboard</b><span>10 extra aanvragen per maand</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">STAP 08</span><b>Elke Performance Review</b><span>zitten we op de regel, en zo nee, waarom niet?</span></div><div class="pijl">→</div>
 <div class="s"><span class="sl">TOETS</span><b>50%-regel</b><span>retainer 36% van het maandbudget</span></div>
</div>

<h3>Als één schakel schuift</h3>
<p>Wat er gebeurt als iets anders loopt dan gepland. Links de oorzaak, in het midden het directe gevolg, rechts waar het uiteindelijk terechtkomt.</p>
""" + keten([
 ('Toegangen of formulier later dan drie werkdagen', 'Dag 1 van het fundament schuift', 'De live-datum schuift evenveel dagen; de retainer start toch in maand 2'),
 ('De draaidag valt pas in week 4', 'Video is pas na de montage klaar', 'Google gaat op dag 19 live, Meta met video ongeveer een week later; de retainer start toch in maand 2'),
 ('Een rood punt in de quickscan (Webmix)', 'Een herstelpost vóór het tekenen', 'Minder marketingruimte voor advertenties; bij een krappe som een kleiner pakket of nee'),
 ('Er kan geen meetcode in de site', 'De stopknop: afspraak gaat niet door', 'Geen intakegesprek; rode mail “niet meten”'),
 ('Het fundament wordt duurder na de herrekening', 'Hogere vaste posten in de rekensom', 'De ondergrens voor Starter stijgt, van ± € 90.000 naar € 92.600 of € 97.000 extra omzet bij 30% marge'),
 ('De klant belt aanvragen laat terug', 'Aanvragen worden geen klant', 'Oorzaak 08: doel niet gehaald terwijl onze cijfers kloppen'),
 ('De klant geeft geen oordeel per aanvraag', 'Wij sturen op aantal, niet op kwaliteit', 'Oorzaak 09: veel aanvragen, weinig klanten'),
 ('De meting klopt niet', 'Elke diagnose wordt een mening', 'Oorzaak 10: niet starten, of maanden sturen op cijfers die niet kloppen'),
 ('Het dashboard is niet af', 'Geen plek waar aanvragen landen met herkomst', '“Wij koppelen niet” valt weg, en dan wordt het maatwerk'),
 ('De AI-instructies ontbreken', 'De taken met AI kosten twee keer zo lang', 'Van € 86 naar ongeveer € 60 per uur op het fundament'),
 ('Starter: de enige draaidag zat in het fundament', 'Geen nieuw beeld dat jaar', 'Advertenties slijten; oorzaak 04 ligt op de loer, of een extra draaidag los'),
 ('Een uiting gaat live die niet klopt met het merk', 'Op korte termijn misschien een klik', 'Op lange termijn een merk dat inconsistent wordt gepresenteerd; daarom de merkcheck vóór elke livegang'),
 ('Geen dagelijkse check op meting en uitgaven', 'Een fout blijft een maand onopgemerkt', 'De klant betaalt voor lucht, en “cijfers leidend” is niet waargemaakt'),
 ('Maandritme zonder zichtbare update', 'De klant ziet niet waarvoor hij betaalt', 'Opzegging, want dat kan elke maand'),
]) + """
<h3>Wie waar aan zet is</h3>
""" + tbl(['Stap', 'Automatisch', 'Vaste medewerker', 'Accountmanager of eigenaar', 'Klant'], [
 ['01 · Aanvraag tot afspraak', 'Formulier, video, vragenlijst, uitkomst, mails', 'Het kwartier bij oranje', 'Regels nakijken, eerste drie maanden', 'Vragenlijst, zelf inplannen'],
 ['02 · Quickscan', 'Klantkaart, kleuren, concept-advies', 'Invullen, nakijken, vrijgeven', '—', '—'],
 ['03 · Intakegesprek', '—', '—', 'Het gesprek, de klantkaart, de mail', 'Doel, marge, capaciteit, opvolging'],
 ['04 · Voorstel', 'Rekensom, concept, offerte-concept', '—', 'Nakijken, vrijgeven, het gesprek', 'Beslissen; maand of jaar per licentie'],
 ['05 · Tekenen', 'Moneybird, machtiging, factuur', '—', '—', 'Tekenen, machtigen'],
 ['06 · Onboarding', 'Kick-offmail, datums', '—', 'Marketingmanager: bellen, toegangensessie', 'Formulier, toegangen, betaalgegevens'],
 ['07 · Fundament', '—', 'Vijf rollen, 76 taken', 'Klantcontact: akkoorden, draaidag, livegang', 'Akkoord week 1 en 4, dagdelen draaidag'],
 ['08 · Maandritme', 'Meldingen, weekmail, dagmail, dashboard', 'Marketingmanager: bijsturen, maandupdate, diagnose, Performance Review', 'Second opinion bij twijfel', 'Opvolgen, oordeel per aanvraag'],
]) + """
<h3>Wat we wanneer vragen</h3>
<p>Elke vraag één keer, op het eerste moment dat het antwoord iets verandert. Wat we eerder weten, staat op de klantkaart en komt later terug als “klopt dit nog?”.</p>
""" + tbl(['Moment', 'Wie, hoe lang', 'Wat hoort hier'], [
 ['Vragenlijst (01)', 'De klant, vijf minuten', 'Kwalificeren en de quickscan mogelijk maken: aan wie, hoe word je klant, wat, waar, budget, website, klantwaarde, aanvragen, conversie, doorlooptijd, obstakel, start'],
 ['Afspraakbevestiging (01)', 'De klant, opzoeken', 'Omzetdoel, marge, aantal e-mailadressen, wie de site beheert, wie meebeslist'],
 ['Quickscan (02)', 'Wij, van buitenaf', 'Alles wat we zelf kunnen opzoeken. Dat vragen we nooit.'],
 ['Intakegesprek (03)', 'Een uur', 'De 24 vragen van stap 03: wat het advies of de prijs verandert, zoals doel, marge, termijn, capaciteit, opvolging, seizoen, diensten, beste klant en waar die zit, waarom jij, concurrenten, beslissers, afsprakenplanner, Leadinfo'],
 ['Voorstelgesprek (04)', '45 minuten', 'Keuzes: pakket bevestigen, maand of jaar per licentie, ClickCease ja of nee, de vijf afspraken met een naam en een termijn'],
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
 ['Prijs van het fundament', 'Voorlopig € 4.500 voor 52,5 uur; bij € 100–125 per uur € 5.250–6.563. Blok 01 herrekenen.', 'Tarieven, rekensom, Starter-grens, drukwerk', 'Jim Kikken en Stan'],
 ['Tarief marketingdashboard', 'Voorlopig € 25 p/m of € 250 p/j', 'Licenties in de rekensom, offerte', 'Jim Coumans en Jim Kikken'],
 ['Marketingdashboard bouwen', 'Gespecificeerd; v0 eerst. Open: bouwen of samenstellen, eigenaar ook buiten kantooruren', 'Stap 07 en 08, “wij koppelen niet”, jouw kant', 'Nog toe te wijzen'],
 ['Webmix-bedragen', '€ 750 / 500 / 250 zijn schattingen', 'Tarieven, quickscan-A4, voorstel', 'Met Webmix'],
 ['Staffels MailerLite en Leadinfo', 'Ontbreken; nu staat er “vanaf”', 'Voorstel pagina 5, rekensom', 'Nog toe te wijzen'],
 ['Gegevens die nog ontbreken', 'De bereikbaarheid van kantoor (dagen en tijden), ons beheeradres voor uitnodigingen in advertentieaccounts, en ons Meta Business-ID', 'Kick-offmail, toegangendocument, zo bereik je ons', 'Jim Coumans'],
 ['Formuliertool, video, portaal', 'Formuliertool nog kiezen, video nog opnemen, klantkaart nog bouwen', 'Stap 01 en 02 draaien niet zonder', 'Nog toe te wijzen'],
 ['AI-instructies', 'Zes voor het fundament plus het quickscan-advies en het voorstelconcept', 'Uren fundament, tijd per quickscan', 'Backlog'],
]) + """
<h3>Voorstellen die op een besluit wachten</h3>
""" + tbl(['Punt', 'Voorstel', 'Raakt'], [
 ['Extra kanalen bij de start', 'Standaard Google Ads en Meta. Minimum per kanaal voorlopig € 500 per campagne per maand, LinkedIn € 1.000: toetsen aan eigen accounts. Uitzoeken of Microsoft Ads, LinkedIn of TikTok in het fundament extra uren kosten', 'Fundament, tarieven, rekensom'],
 ['Drempels voor de monitoring', 'Zoals in stap 08; ze bepalen wat rood staat in de dagmail van 7.00 uur', 'Stap 08, dashboard'],
 ['Legend', 'Later een pakket boven Champion, voor meer dan vier campagnes tegelijk of events. Uitwerken als de eerste Champion er is.', 'Tarieven, drukwerk, website'],
 ['Uren per pakket', 'Narekenen wat een campagne en een contentronde kosten, en of Captain en Champion daarmee uitkomen (Jim Kikken en Stan)', 'Tarieven, marge, drukwerk'],
 ['Communicatie via support@', 'Telefoonnummer en bereikbaarheid kantoor; Front inrichten; overstap per klant in de Performance Review', 'Kick-offmail, alle klantcontact'],
]) + """
<h3>Nog uit te werken</h3>
""" + grid(2, [
 kaart('Verkoop', ul(['De partnerlijst: wie we waarvoor introduceren', 'Sjablonen: antwoorden op één A4, scanrapport', 'Wie het intakegesprek voert naast Jim Coumans', 'De oranje drempels (€ 1.000, € 30, 1 op de 10) toetsen aan eigen accounts', 'Branchegemiddelden voor conversie', 'Prijs voor social-mediatemplates en contentsessie: zonder prijs is het een afwijzing met een vriendelijk randje', 'Toestemming voor de mailreeks juridisch laten nakijken'], ''), 'FASE 1'),
 kaart('Starten', ul(['Verwerkersovereenkomst, algemene voorwaarden, btw op alle documenten (bewust later)', 'Moneybird inrichten en koppelen aan het portaal', 'Handleiding klikroute per platform', 'ClickUp-template met de 76 taken', 'Indicaties voor “wat we vaak tegenkomen”', 'Per vraag in het onboardingformulier: wanneer is een antwoord bruikbaar'], ''), 'FASE 2'),
 kaart('Samenwerken', ul(['Een stappenlijst voor maand 2 tot en met 12, zoals de 76 taken van het fundament', 'Het live-bericht', 'Het diagnoseformulier als sjabloon', 'Klantprofiel en campagnebriefings in het portaal: per klant gebundeld, met historie, gekoppeld aan de cijfers uit het dashboard', 'Normen per branche voor doorklik en conversie', 'Drie maanden “alleen de motor” toetsen aan de laatste vijf campagnes'], ''), 'FASE 3'),
 kaart('Rondom', ul(['<b>Bestaande klanten.</b> Nieuwe klanten gaan direct op het nieuwe model, bestaande klanten per 1 januari 2027. Nog op te schrijven: wat vervalt en wat een project wordt. Per klant een migratieplan, met het gesprek vóór 1 december. Bestaande klanten met een retainer boven Champion mogen daarboven blijven. Voorstel: splits hun factuur in een performancedeel en een regel voor doorlopend projectwerk (zoals een magazine), zodat zichtbaar is wat welk deel kost.', '<b>Het drukwerk</b> gebruikt nog de vijf ARENA-letters (Attention, Retention, Experience, Numbers, Authority) als model, terwijl de methode nu middelpunt, motor en versnellers is. Ook ontbreken het dashboard en ClickCease.', '<b>De oude pakketpagina en de ARENA-methode</b> zeggen elk iets anders over het maandoverleg (30 of 45 minuten, of helemaal niet). De Performance Review in stap 08 is leidend.', '<b>De eigen website</b> (homepage, werkwijze, dienstpagina’s) wacht tot de propositie vastligt.'], ''), 'BUITEN DE REIS', 'o'),
]) + """
</div></section>
"""

BESLUITEN = """
<section class="sec" id="besluiten"><div class="wrap">
<span class="kick">3.3 · BESLUITEN</span>
<h2>Wat vastligt, en sinds wanneer</h2>
<p class="sub">Een besluit wijzigen gaat hier eerst: een nieuwe regel met datum, daarna de tekst op de plek waar het werkt. Wat de klant te zien krijgt (tarieven, drukwerk, voorstel) maken we vanuit deze gids, nooit andersom.</p>
""" + tbl(['Datum', 'Besluit'], [
 ['23 sep 2026', 'We verkopen geen uren. Vaste pakketten; het advertentiebudget bepaalt het pakket. (Toen: Enter, Compete, Own; zie 1 okt.)'],
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
 ['30 sep 2026', 'Altijd on-brand. We zijn een performancebureau dat ook aan de lange termijn denkt: elke uiting klopt met het merk van de klant.'],
 ['30 sep 2026', 'Data beats opinion: we monitoren continu en beslissen op cijfers, niet op smaak.'],
 ['30 sep 2026', 'We adverteren in zoekmachines en op social: Google, Microsoft Ads (Bing), Meta, LinkedIn en TikTok. Welke, bepalen doelgroep en cijfers. We vullen geen social feeds, alleen advertising.'],
 ['30 sep 2026', 'Content zit in de motor: marketingcontent (foto, video, animatie, graphics). Geen bedrijfsvideo’s, geen branded content tenzij de advertenties erom vragen.'],
 ['30 sep 2026', 'Het intakegesprek heeft een vaste vragenlijst van 24 vragen, waarvan vier verplicht voor het voorstel.'],
 ['30 sep 2026', 'Alle klantcommunicatie via support@jamesrobinson.nl, in Front toegewezen aan de marketingmanager. Antwoord binnen één werkdag. Dringend: bellen naar kantoor. De WhatsApp-groepen worden verwijderd; persoonlijke mailadressen verdwijnen op termijn voor klantcontact.'],
 ['30 sep 2026', 'We zijn geen collega of externe marketingafdeling, maar een performancebureau met een vast product.'],
 ['30 sep 2026', 'Het overleg met de klant heet de Performance Review en gaat over resultaat, op ons kantoor of online, met een vast stramien: impressies, bezoekers, aanvragen en klanten, elk met wat het kostte, dan diagnose en plan. Het vervangt het performanceblok. We gaan niet meer naar de klant.'],
 ['30 sep 2026', 'Jaar 1 is de set-upmaand plus elf keer de retainer. Zo rekent de rekensom.'],
 ['30 sep 2026', 'Het volledige designsysteem v3.0 is leidend, en staat in deze gids.'],
 ['1 okt 2026', 'Vier pakketten: Starter € 1.000, Playmaker € 1.500, Captain € 2.000, Champion € 2.500, met 1 tot 4 campagnes tegelijk. Het pakket is het hoogste van campagnes of budget. Vervangt Enter, Compete en Own.'],
 ['1 okt 2026', 'Een campagne is één aanbod, één doelgroep, één doel en één landingspagina, op alle kanalen samen. Nieuwe advertenties heten contentrondes.'],
 ['1 okt 2026', 'Per kanaal minimaal € 500 advertentiebudget per campagne per maand, op LinkedIn € 1.000. Wij kiezen de kanalen.'],
 ['1 okt 2026', 'De namen: Sub, Starter, Playmaker, Captain, Champion. Engels en uit de sport, van invaller tot kampioen. Later eventueel Legend erboven.'],
 ['1 okt 2026', 'Sub: € 500 per maand voor zichtbaarheid, alleen op verzoek, met een licht fundament van € 1.500. Een opstap, geen eindstation; de overstap bespreken we in de eerste Performance Review na drie maanden.'],
 ['1 okt 2026', 'We bedenken geen posts meer om de feed te vullen. Beeld uit lopende campagnes plaatsen we, zolang de campagne loopt, ook organisch op de kanalen van de klant.'],
 ['1 okt 2026', 'Nieuwe klanten direct op het nieuwe model; bestaande klanten per 1 januari 2027. Vervangt de regeling tot 31 december 2027 en de tussenmijlpaal van 1 juli 2027.'],
 ['1 okt 2026', 'Bestaande klanten mogen boven Champion blijven. De pakketten zijn wat we nieuwe klanten aanbieden.'],
 ['1 okt 2026', 'De draaidag ligt niet vast bij het tekenen. We filmen in week 3 of 4 van het fundament; de klant geeft in het onboardingformulier alle dagdelen op waarop het kan, en wij stemmen af met de videograaf.'],
 ['1 okt 2026', 'Toegangen en onboardingformulier binnen drie werkdagen. Eén toegangendocument met per onderdeel wat, waarom en hoe, en “heb ik nog niet”: dan regelen wij het.'],
 ['1 okt 2026', 'De retainer start altijd in maand 2, ook als het fundament uitloopt.'],
 ['1 okt 2026', 'Het eerste bericht na het tekenen heet de kick-off. De sessie met zijn team in week 4 heet de livegang.'],
 ['1 okt 2026', 'ClickCease is nergens standaard. We bieden het aan als optie; de klant beslist.'],
 ['1 okt 2026', 'De Performance Review duurt een uur.'],
 ['1 okt 2026', 'Elke ochtend om 7.00 uur een interne dagmail uit het dashboard met de performance van al onze campagnes.'],
 ['1 okt 2026', 'Animatie zit niet in het fundament maar in de contentrondes. Graphics in het fundament komen uit de sjablonen.'],
 ['1 okt 2026', 'Na ongeveer honderd dagen, aan het eind van maand 3, voor elk pakket de 100-dagenreview.'],
 ['1 okt 2026', 'Vanaf maand 4 geen vaste volgorde van versnellers: we optimaliseren op resultaat en kiezen met het diagnoseformulier (bottleneck, oorzaak door uitsluiting, plan).'],
 ['1 okt 2026', 'Elke maand een maandupdate in het dashboard: de vier ketengetallen automatisch, en drie korte antwoorden. Geen aparte escalatieregels: we hebben elke maand contact.'],
 ['1 okt 2026', 'In maand 11 het jaargesprek, gevoerd door de marketingmanager: nieuw doel en het pakket voor jaar 2.'],
 ['1 okt 2026', 'Pakket omhoog per direct, omlaag per de 1e van de volgende maand. De Performance Review is het moment.'],
 ['2 okt 2026', 'Landingspagina’s bouwen we op de website van de klant, niet op onze omgeving. Vervangt het besluit van 23 september.'],
 ['2 okt 2026', 'De marketingmanager is het vaste aanspreekpunt en leidt de Performance Review.'],
 ['2 okt 2026', 'Sub en het lichte fundament krijgen een eigen regel op de offerte.'],
 ['2 okt 2026', 'Kiest de klant het dashboard per jaar, dan krijgt de klant daarvoor één losse jaarfactuur.'],
 ['2 okt 2026', 'Tot de leveranciers ze bevestigen, rekenen we met onze eigen inschatting van de Webmix-bedragen en de staffels van MailerLite en Leadinfo.'],
 ['2 okt 2026', 'Elke klant krijgt een klantprofiel aan het eind van de onboarding, elke campagne een campagnebriefing met akkoord van de klant. Wat niet in de briefing staat, doen we niet.'],
 ['2 okt 2026', 'De campagnebriefing gaat eerst als voorstel naar de klant en pas na akkoord naar het team. De klant ziet dezelfde versie als wij. Klantgegevens komen uit het systeem; samenvatting en suggesties maakt het portaal.'],
 ['2 okt 2026', 'Geen aparte takenlijst in de briefing: de tijdlijn is de takenlijst. Bij akkoord komt hij als taak met subtaken in ClickUp. Een nieuwe landingspagina staat als middel in de briefing en in de tijdlijn.'],
 ['2 okt 2026', 'Elke campagnebriefing heeft een hypothese: het hele doel teruggerekend via advertenties naar conversies, bezoekers, impressies en het budget dat nodig is. Mailings en netwerk maken het goedkoper, niet mogelijk. Het budgetadvies volgt uit de hypothese. Na twee weken live leggen we hem naast de echte cijfers.'],
 ['2 okt 2026', 'In de hypothese zo min mogelijk eigen aannames: bij elke aanname de bron, en een plafond alleen als het onderbouwd is (rekensom of marge van de klant). Het budgetadvies staat ook als percentage van de omzet en is de bovengrens; andere kanalen maken het goedkoper.'],
]) + """
</div></section>
<footer class="voet"><div class="wrap">James Robinson — Marketing &amp; Branding · De James Robinson-gids · versie 30 september 2026</div></footer>
"""

P3 = DEEL3_OPEN + SAMEN + OPEN + BESLUITEN
