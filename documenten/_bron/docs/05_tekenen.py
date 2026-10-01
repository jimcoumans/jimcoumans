# -*- coding: utf-8 -*-
# Stap 05 · Tekenen en betalen: 05.1 Offerte (intern) en 05.2 Licenties (klant).
from base import *

VAK = '<span class="opt"></span>'
FASE = 'Fase 2 · Starten · Stap 05 · Tekenen en betalen'


# ---------------------------------------------------------------- 05.1
def offerte():
    out = [velden(['Klant en bedrijf', 'Offertenummer', 'Verstuurd op', 'Geldig tot (veertien dagen)'])]
    out.append(kader(
        '<p>Alleen wat naar ons gaat, krijgt een bedrag. Wat rechtstreeks naar een leverancier gaat, staat erop als tekstregel zonder bedrag. '
        'Geen bedrag wordt met de hand getypt: het portaal zet de offerte klaar met de regels uit de tarieven.</p>'
        '<p>Het offertenummer staat op de omslag van het voorstel, en het voorstel hangt als bijlage aan de offerte. '
        'Verandert er aan tafel iets, dan pas je het aan op de klantkaart en maakt het portaal beide opnieuw.</p>',
        'Zo werkt de offerte', 'blauw'))

    out.append(h2('De offerte, regel voor regel'))
    out.append(p('Loop elke regel na voordat de offerte de deur uitgaat. Vink af wat klopt.', 'klein'))
    out.append(tabel(['Regel', 'Bedrag excl. btw', 'Wanneer', 'Toelichting', 'Klopt'], [
        ['<b>Fundament: basis en eerste campagne</b>', '€ 4.500', 'Eenmalig', 'Altijd. De omschrijving verwijst naar het voorstel, pagina 4.', VAK],
        ['<b>Retainer</b> Starter, Playmaker, Captain of Champion', '€ 1.000 / 1.500 / 2.000 / 2.500', 'Per maand', 'Het pakket uit de rekensom. Vanaf maand 2, vooraf: factuur op de 1e, incasso op de 4e.', VAK],
        ['<b>Marketingdashboard</b>', '€ 25 p/m of € 250 p/j', 'Keuze van de klant', 'Twee opties op de offerte; de klant vinkt er één aan bij het tekenen.', VAK],
        ['<b>Afsprakenplanner opzetten</b>', '€ 250', 'Eenmalig', 'Alleen als de klant afspraken laat inplannen.', VAK],
        ['<b>Tekstregel, zonder bedrag</b>', 'geen', 'geen', '“Rechtstreeks aan leveranciers, niet via ons: advertentiebudget (minimaal € %s per maand), MailerLite, Cookiescript [, hosting, afsprakenplanner]. Herstelposten aan de website: eigen offerte van Webmix.”' % vv('[..]'), VAK],
    ]))
    out.append(kader('<p><b>Zet het advertentiebudget nooit als bedrag op de offerte.</b> Dan lijkt het of dat geld via ons loopt, en dat is precies wat we beloven niet te doen. '
                     'Het staat op pagina 5 van het voorstel met een bedrag, en op de offerte als tekstregel.</p>', 'Let op', 'rood'))

    out.append(h2('De instellingen in Moneybird'))
    out.append(checklist([
        ('“De ontvanger moet deze offerte online accepteren en ondertekenen” staat aan. Moneybird bewaart de handtekening met naam, e-mailadres en IP-adres.', 'instelling'),
        ('Geldig: veertien dagen, gelijk met het voorstel.', 'instelling'),
        ('Bijlage: het voorstel, met het offertenummer op de omslag.', 'bijlage'),
        ('Bijlage: de algemene voorwaarden.', 'bijlage'),
        ('Bijlage: de verwerkersovereenkomst. In het dashboard bewaren wij namen en contactgegevens van de aanvragers van de klant; dat moet op papier (AVG, artikel 28).', 'bijlage'),
        ('Tekst op de offerte: de startdatum en de live-datum, samen.', 'tekst'),
        ('Tekst op de offerte: het betaalschema. Fundament bij ondertekening, retainer en dashboard vanaf maand 2 vooraf.', 'tekst'),
        ('Tekst op de offerte: opzeggen kan tot en met de laatste dag van de maand.', 'tekst'),
        ('Tekst op de offerte: alle bedragen exclusief btw.', 'tekst'),
    ]))
    out.append(kader(
        '<p><b>Het contract zegt wat het gesprek zei:</b> cijfers leidend, maandelijks opzegbaar, geen resultaatbelofte. Belooft het papier meer dan het voorstelgesprek, dan prikt een klant daar doorheen op het moment dat het misgaat.</p>'
        '<p><b>Startdatum en live-datum staan samen op de offerte.</b> Dan is uitloop aan de kant van de klant zichtbaar, en niet ons probleem.</p>',
        'Waarom het zo moet', 'grijs'))

    out.append(h2('Na de handtekening'))
    out.append(p('Het meeste gaat vanzelf. Vink af wat je gezien hebt; doet iets het niet, dan doe je die ene klik met de hand.', 'klein'))
    out.append(checklist([
        ('<b>Getekend.</b> Moneybird zet de offerte op “geaccepteerd” en mailt de getekende versie met bijlagen naar de klant en naar ons.', 'direct'),
        ('<b>Klantkaart op “klant”.</b> Via de koppeling gaat de klantkaart van “voorstel” naar “klant”. Dat start stap 06.', 'direct'),
        ('<b>De kick-offmail</b> is binnen een uur verstuurd, vanaf support@ (06.1).', 'binnen een uur'),
        ('<b>De factuur voor het fundament</b> is verstuurd, in één keer. Op de betaling wachten we niet: de onboarding begint dezelfde dag.', 'bij het tekenen'),
        ('<b>Het machtigingsverzoek</b> via Moneybird is verstuurd: machtigen met € 0,15 via iDEAL, of met het IBAN van de klant.', 'dezelfde dag'),
        ('<b>De periodieke factuur</b> staat klaar: één factuur voor retainer en dashboard, verstuurd op de 1e voor die maand. Moneybird incasseert drie dagen later; het geld staat op de 4e.', 'vanaf maand 2'),
    ]))

    out.append(h3('Wat vastligt over betalen'))
    out.append(tabel(['Afspraak', 'Wat het betekent'], [
        ['<b>Het fundament: bij ondertekening</b>', 'Maand 1 is set-up en content, betaald bij het tekenen. Er is geen periode waarin we werken en niets gefactureerd is.'],
        ['<b>Vanaf maand 2: vooraf</b>', 'Retainer en dashboard, factuur op de 1e, geld op de 4e. De retainer start altijd in maand 2.'],
        ['<b>Opzeggen tot en met de laatste dag</b>', 'Zegt de klant op de 31e op, dan komt er de maand erna geen factuur meer, mits er geen budgetten meer openstaan. Voor allebei gelijk. Het fundament krijgt de klant na de start niet terug.'],
    ]))
    out.append(kader('<p><b>Na veertien dagen niet getekend?</b> Eén keer bellen, daarna later. Een nieuwe offerte krijgt de tarieven van dat moment.</p>', 'Een verlopen offerte', 'oranje'))
    out.append(handtekening('Nagelopen door', 'Datum'))
    return ''.join(out)


# ---------------------------------------------------------------- 05.2
MAJA = '<span class="opt">maand</span>&nbsp;&nbsp;<span class="opt">jaar</span>'


def lijn(mm=22):
    """Een korte invullijn in lopende tekst."""
    return '<span style="display:inline-block;width:%dmm;border-bottom:1px solid var(--ln);height:11pt;vertical-align:-2pt"></span>' % mm


def licenties():
    out = [drie(
        kader('<p>Elk account staat op jouw naam en jouw e-mailadres. Stop je, dan neem je alles mee zonder dat er iets overgezet hoeft te worden.</p>', 'Op jouw naam', 'blauw'),
        kader('<p>Je betaalgegevens vul je zelf in, in de toegangensessie. Wij bewaren nooit een creditcard of IBAN van een ander.</p>', 'Jij betaalt zelf', 'blauw'),
        kader('<p>Aanmaken, instellen en koppelen aan je dashboard doen wij. Dat zit in het fundament.</p>', 'Wij richten in', 'blauw'))]

    out.append(h2('Altijd'))
    out.append(p('Deze drie heb je altijd nodig. Bij elke licentie kies je per maand of per jaar, als de leverancier dat aanbiedt. Je keuze uit het voorstelgesprek staat op je klantkaart; kruis hem hier aan.', 'klein'))
    out.append(tabel(['Licentie', 'Wat het doet', 'Bedrag excl. btw', 'Je betaalt aan', 'Jouw keuze'], [
        ['<b>Marketingdashboard</b>', 'Eén plek waar je ziet wat je marketing doet, en waar je per aanvraag met één klik zegt of hij iets waard was.', '€ 25 p/m of € 250 p/j', 'James Robinson, via de offerte', MAJA],
        ['<b>MailerLite</b>', 'Je e-mailprogramma. Vanaf dag één actief, want we verzamelen meteen adressen.', 'vanaf € 9,90 p/m; de prijs volgt het aantal adressen.<br>Jouw bedrag: € %s' % lijn(16), 'MailerLite', MAJA],
        ['<b>Cookiescript</b>', 'De cookiemelding op je site, zodat de meting werkt met en zonder toestemming.', '€ 150 p/j', 'Webmix', '<span class="opt">jaar</span>'],
    ]))

    out.append(h2('Alleen als je ervoor kiest'))
    out.append(tabel(['Licentie', 'Wanneer zinvol', 'Bedrag excl. btw', 'Je betaalt aan', 'Jouw keuze'], [
        ['<b>ClickCease</b>', 'Blokkeert herhaalde klikkers en bots voordat ze opnieuw geld kosten. Een optie: jij beslist.', 'vanaf $ 99 p/m', 'ClickCease', '<span class="opt">nee</span><br>' + MAJA],
        ['<b>Leadinfo</b>', 'Alleen als je aan bedrijven verkoopt en er zelf iets mee doet. Je ziet welke bedrijven langskwamen zonder contact op te nemen. Wij volgen geen leads op. De set-up regelen wij kosteloos.', 'volgens hun staffel: aantal herkenningen.<br>Jouw bedrag: € %s' % lijn(16), 'Leadinfo', '<span class="opt">nee</span><br><span class="opt">ja</span>'],
        ['<b>Afsprakenplanner</b> (Calendly)', 'Alleen als je klanten zelf een afspraak laten inplannen. Opzetten en koppelen aan je agenda en de landingspagina: € 250 eenmalig, op de offerte.', '€ 15 p/m per gebruiker.<br>Gebruikers: %s' % lijn(10), 'Calendly', '<span class="opt">nee</span><br>' + MAJA],
    ]))

    out.append(h3('ClickCease: een optie, jij beslist'))
    out.append(p('Een deel van de kliks op je advertenties komt van bots, klikfarms en concurrenten. Google filtert zelf ongeldige kliks en betaalt die terug. ClickCease blokkeert daarnaast herhaalde klikkers en bots voordat ze opnieuw geld kosten.'))
    out.append(p('Dat het werkt, staat vast. De vraag is of het zich bij jou terugverdient. Vanaf $ 99 per maand is bij € 1.000 advertentiebudget bijna een tiende, bij € 2.500 ongeveer een vijfentwintigste, en bij € 7.500 ruim een procent.'))
    out.append(p('Na de proefperiode zetten we in je dashboard naast elkaar wat ClickCease tegenhield (geblokkeerde kliks keer de klikprijs) en wat het kost. Is het eerste hoger, dan houd je het. Zo niet, dan zeggen wij dat je kunt opzeggen.'))
    out.append(p('We krijgen een vergoeding van ClickCease, en dat zeggen we erbij. Ons advies is hetzelfde als we er niets aan zouden verdienen. We zetten er nooit iets bovenop.'))

    out.append(h2('Ook rechtstreeks, niet via ons'))
    out.append(p('Deze posten staan in je voorstel met een bedrag. Ze gaan rechtstreeks naar de partij die het werk doet. Vragen over een licentie of een factuur van een leverancier? Mail <b>support@jamesrobinson.nl</b>; je krijgt binnen één werkdag antwoord.', 'klein'))
    out.append(tabel(['Wat', 'Wanneer', 'Bedrag excl. btw', 'Je betaalt aan'], [
        ['<b>Advertentiebudget</b>', 'Altijd. Met je eigen betaalmethode in je eigen advertentieaccounts. Het bedrag staat in je voorstel, pagina 5.', '€ %s p/m' % lijn(14), 'Google, Meta en de andere kanalen'],
        ['<b>Hosting</b>', 'Alleen als je hosting de norm niet haalt en je overzet. Migratie gratis, met onderhoud, back-ups, beveiliging en e-mailadressen.', '€ 85 p/m', 'Webmix'],
        ['<b>Herstel aan je website</b>', 'Alleen als de meting iets vindt wat niet voldoet. Jij beslist: nu, later of niet.', 'eigen offerte van Webmix', 'Webmix'],
    ]))
    return ''.join(out)


DOCS = [
    dict(code='05.1', titel='Offerte: regels en instellingen', fase=FASE, voor='Intern',
         wanneer='Dezelfde dag als het akkoord', wie='Het portaal en Moneybird; jij loopt na',
         lead='De offerte regel voor regel, de instellingen in Moneybird, en wat er na de handtekening moet gebeuren. Loop dit na voordat de offerte de deur uitgaat, en nog een keer zodra hij getekend is.',
         body=offerte()),
    dict(code='05.2', titel='Licenties: wat je zelf betaalt', fase=FASE, voor='Klant',
         wanneer='Bij de offerte, en mee in de toegangensessie', wie='Jij betaalt, wij richten in',
         lead='Een paar programma’s draaien op jouw naam en jouw rekening. Hier staat welke, wat ze kosten, aan wie je betaalt en of dat per maand of per jaar is.',
         body=licenties()),
]
