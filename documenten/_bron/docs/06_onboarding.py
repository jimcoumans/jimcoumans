# -*- coding: utf-8 -*-
# Stap 06 · De onboarding: 06.1 Kick-offmail (intern), 06.2 Onboardingformulier (klant), 06.3 Toegangendocument (klant).
from base import *

FASE = 'Fase 2 · Starten · Stap 06 · De onboarding'
VAK = '<span class="opt"></span>'


def lijn(mm=22):
    """Een korte invullijn in lopende tekst."""
    return '<span style="display:inline-block;width:%dmm;border-bottom:1px solid var(--ln);height:11pt;vertical-align:-2pt"></span>' % mm


def opties(items):
    return '<div class="opties">%s</div>' % ''.join('<span class="opt">%s</span>' % o for o in items)


def regels(n):
    return '<div class="regels">%s</div>' % ('<div class="regel"></div>' * n)


def vraag_met(nr, tekst, hulp='', extra='', n=0, opts=None):
    """Zoals vraag(), maar met eigen inhoud (vakken, raster) tussen de hulptekst en de lijnen."""
    body = '<div class="q">%s</div>' % tekst
    if hulp: body += '<div class="hulp">%s</div>' % hulp
    body += extra
    if opts: body += opties(opts)
    if n: body += regels(n)
    return '<div class="vraag"><div class="nr">%s</div><div>%s</div></div>' % (nr, body)


# ---------------------------------------------------------------- 06.1 Kick-offmail
MAILTEKST = (
    '<p>Hoi %(voornaam)s,</p>'
    '<p>Welkom bij James Robinson. Ik ben %(naam)s, je marketingmanager en je vaste aanspreekpunt.</p>'
    '<p>Mail ons altijd via support@jamesrobinson.nl. Dan leest iedereen mee die aan je campagne werkt, en krijg je binnen één werkdag antwoord. Is er iets dringends, bel dan naar kantoor: 045 792 0009.</p>'
    '<p>Drie dingen hebben we van je nodig. Daar hangt de live-datum aan:</p>'
    '<ol><li>Het onboardingformulier invullen, uiterlijk %(datum)s. Ongeveer twintig minuten; je kunt tussendoor opslaan. %(link)s</li>'
    '<li>Het toegangendocument doorlopen. Per onderdeel staat hoe je ons toegang geeft. Heb je iets nog niet, vink het aan: dan regelen wij het. Wat blijft hangen, doen we samen in de toegangensessie, uiterlijk op %(datum)s. %(link)s</li>'
    '<li>In het formulier: alle dagdelen in week 3 en 4 (%(datums)s) waarop we bij je kunnen filmen. Hoe meer je aanvinkt, hoe sneller we de draaidag met onze videograaf vastzetten.</li></ol>'
    '<p>Daarna het fundament:</p>'
    '<ul><li><b>Week 1:</b> we meten alles na en vertellen je wat we vonden, en we werken je doelgroep en boodschap uit.</li>'
    '<li><b>Week 2:</b> we zetten de systemen neer: advertentieaccounts, e-mail, meting en je dashboard.</li>'
    '<li><b>Week 3:</b> we bouwen de campagne en de landingspagina. In week 3 of 4 de draaidag bij jou, op een van de dagdelen die je opgaf.</li>'
    '<li><b>Week 4:</b> je ziet alles voordat het live gaat, met één ronde feedback. Daarna gaat het aan, en kijken we de eerste week dagelijks mee.</li></ul>'
    '<p>Vandaag krijg je van Moneybird de factuur voor het fundament, en een verzoek om een machtiging voor de maandelijkse incasso vanaf %(maand2)s.</p>'
    '<p>Tot morgen, dan bel ik je even.</p>'
    '<p style="margin-bottom:0">Groet, %(naam)s</p>'
) % dict(voornaam=vv('[voornaam]'), naam=vv('[naam]'), datum=vv('[datum]'), link=vv('[link]'), datums=vv('[datums]'), maand2=vv('[maand 2]'))


def kickoff():
    out = [velden(['Klant en bedrijf', 'Getekend op (dag 0)', 'Marketingmanager', 'Geplande dag 1 van het fundament'])]
    out.append(kader('<p><b>Wij halen het op, de klant hoeft niet te zoeken.</b> Het gevaarlijkste moment van de reis: de klant heeft betaald en ziet nog niets. Dus ziet de klant binnen een uur iets, en is er na drie werkdagen alles wat we nodig hebben. '
                     'Toegangen zijn de belangrijkste oorzaak van uitloop; daarom doen we ze samen, in één sessie. Wat bij een derde ligt, halen wij zelf op.</p>', 'Het principe', 'blauw'))

    out.append(h2('Drie werkdagen'))
    out.append(p('Van de handtekening tot dag 1 van het fundament. Vul de datum in en vink af wat gebeurd is.', 'klein'))
    out.append(tabel(['Wanneer', 'Wat', 'Hoe', 'Datum', 'Klaar'], [
        ['<b>Dag 0</b>, binnen een uur', '<b>De kick-offmail</b>', 'Automatisch vanuit het portaal, vanaf support@. Tegelijk de factuur voor het fundament en het machtigingsverzoek.', lijn(17), VAK],
        ['<b>Dag 0</b>', '<b>Intern klaarzetten</b>', 'De klantkaart op “klant”. Het fundament als project in ClickUp, met datums vanaf de geplande dag 1. In Front de klant koppelen aan de marketingmanager, zodat elke mail van de klant automatisch daar landt.', lijn(17), VAK],
        ['<b>Dag 1</b>', '<b>Tien minuten bellen</b>', 'De marketingmanager belt. Geen inhoud, wel een stem. Staat de toegangensessie nog niet in de agenda, dan plan je hem nu.', lijn(17), VAK],
        ['<b>Dag 1 – 3</b>', '<b>Het onboardingformulier</b>', 'De klant vult het zelf in: twintig minuten. Uiterlijk de avond voor de toegangensessie, zodat wij het al gelezen hebben.', lijn(17), VAK],
        ['<b>Dag 2 – 3</b>', '<b>De toegangensessie</b>', '45 minuten online, met scherm delen. Het toegangendocument samen door; bij elke licentie vult de klant zelf de betaalgegevens in. Wat niet meteen lukt, krijgt een eigenaar en een datum.', lijn(17), VAK],
        ['<b>Dag 3</b>', '<b>Dag 1 van het fundament</b>', 'Zodra alles binnen is, start de klok. Het portaal mailt de datums vanaf support@: de preview en de live-datum, en de draaidag zodra die met de videograaf is afgestemd.', lijn(17), VAK],
    ]))
    out.append(p('<b>Het telefoontje op dag 1, in één zin:</b>'))
    out.append(zin('“Ik ben je marketingmanager en je vaste aanspreekpunt, dit is de planning.”'))

    out.append(h2('Als het uitloopt'))
    out.append(tabel(['Situatie', 'Wat we doen'], [
        ['<b>Dag 3, geen sessie geweest</b>', 'Bellen, niet mailen, dezelfde dag.'],
        ['<b>Iets hangt bij een derde</b>', 'Webbouwer of hosting: wij mailen die zelf, met de klant in cc. De klant hoeft niets te vertalen of door te sturen.'],
        ['<b>Dag 1 schuift</b>', 'Elke dag dat dag 1 later begint, schuift de live-datum een dag. Het portaal rekent de nieuwe datum uit en mailt hem vanaf support@. Geen verwijt, gewoon de planning.'],
        ['<b>Het ligt aan ons</b>', 'Dan zeggen we dat ook, op dezelfde plek, met de nieuwe datum.'],
    ]))
    out.append(kader('<p><b>Elke dag later is een dag later live.</b> Maand 1 is vier weken vanaf volledige toegang. Drie werkdagen onboarding plus 19 werkdagen fundament past net in een maand; tien werkdagen onboarding past niet. '
                     'Loopt maand 1 uit, dan betaalt de klant al retainer voordat de campagne live is. Dat is een reden om de drie werkdagen streng te bewaken. De factuur schuift niet mee.</p>', 'Waarom het streng moet', 'rood'))
    out.append(NIEUWE_PAGINA)
    out.append(h2('De kick-offmail'))
    out.append(p('Gaat automatisch vanuit het portaal zodra Moneybird de handtekening meldt, vanaf support@, ondertekend door de marketingmanager. De gemarkeerde plekken vult het portaal in.', 'klein'))
    out.append(mail('Dag 0 · automatisch, binnen een uur · datums uit het portaal', 'Welkom. Dit gebeurt er de komende vier weken', MAILTEKST))
    out.append(h3('Voordat hij de deur uitgaat'))
    out.append(checklist([
        ('De datum voor het formulier en de uiterste datum voor de toegangensessie zijn ingevuld, en vallen binnen drie werkdagen.', 'datums'),
        ('De datums van week 3 en 4 kloppen met de geplande dag 1.', 'datums'),
        ('De maand van de eerste incasso is maand 2. De retainer start altijd in maand 2.', 'datums'),
        ('Beide links werken: het onboardingformulier (06.2) en het toegangendocument (06.3).', 'links'),
        ('Verstuurd vanaf support@, met naam en handtekening van de marketingmanager.', 'afzender'),
        ('Tegelijk uit Moneybird: de factuur voor het fundament en het machtigingsverzoek.', 'Moneybird'),
    ]))

    return ''.join(out)


# ---------------------------------------------------------------- 06.2 Onboardingformulier
DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']


def raster():
    """Vraag 21: dagdelen in week 3 en 4 om aan te kruisen."""
    kop = '<th style="width:24mm"></th>' + ''.join('<th>%s</th>' % d for d in DAGEN)
    rijen = []
    for wk in ('Week 3', 'Week 4'):
        rijen.append('<tr class="grp"><td colspan="6">%s&nbsp;&nbsp;<span style="font-weight:400">van %s tot en met %s</span></td></tr>' % (wk, lijn(24), lijn(24)))
        rijen.append('<tr><td class="klein">datum</td>%s</tr>' % ''.join('<td><span style="display:block;border-bottom:1px solid var(--ln);height:12pt"></span></td>' for _ in DAGEN))
        for dd in ('ochtend', 'middag'):
            rijen.append('<tr><td><b>%s</b></td>%s</tr>' % (dd, ''.join('<td><span class="opt"></span></td>' for _ in DAGEN)))
    return '<table style="margin-top:6pt"><thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (kop, ''.join(rijen))


UPLOAD = ['meegestuurd naar support@', 'volgt later', 'heb ik niet']


def onboardingformulier():
    out = [kader('<p>Wat je doel is, wat je verkoopt en waarom klanten voor je kiezen, weten we al. Hier vragen we alleen nog wat we nodig hebben om te gaan maken: je beeld, de woorden van je klanten en je e-mailadressen.</p>'
                 '<p>Weet je iets niet, vul dan in dat je het niet weet: dat is een bruikbaar antwoord. Vragen met “optioneel” mag je leeg laten. Loop je vast, mail dan naar support@jamesrobinson.nl.</p>'
                 '<p><b>Bestanden</b> (je logo, je klantenbestand, je adressen) stuur je naar support@jamesrobinson.nl. Kruis bij de vraag aan wat je hebt gestuurd.</p>',
                 'Zo vul je het in', 'blauw')]
    out.append(velden(['Bedrijf', 'Ingevuld door', 'Datum']))

    out.append(h3('Klopt dit nog?'))
    weten = vakken(['Wat de campagne moet opleveren', 'Waar je klanten zitten', 'Wie opvolgt, binnen hoeveel tijd, en wie het overneemt', 'Wie er beslist'], 2, 40)
    out.append(vraag_met(1, 'Dit weten we al. Klopt het nog?', 'Wij vullen de vakken in vanaf je klantkaart. Wat we al weten, vragen we nooit opnieuw.', weten, 2, ['klopt allemaal', 'dit is anders:']))

    out.append(h3('Je klanten, in hun eigen woorden'))
    out.append(vraag(2, 'Welke woorden gebruiken je klanten voor wat je verkoopt? <span class="sub">(optioneel)</span>', 'De basis van het zoekwoordonderzoek.', 3))
    out.append(vraag(3, 'Wat zeggen klanten die net klant zijn geworden? <span class="sub">(optioneel)</span>', 'De woorden die we in je advertenties gebruiken.', 3))
    out.append(vraag(4, 'Waarom stelt iemand de aankoop uit?', 'De bezwaren die we in je advertenties wegnemen.', 3))
    out.append(vraag(5, 'Stuur je klantenbestand of omzetoverzicht mee: postcode, ordergrootte, branche. <span class="sub">(optioneel)</span>', 'Hier toetsen we je beste klant aan.', 0, UPLOAD))
    out.append(vraag(6, 'Op wie zou je nooit willen lijken? <span class="sub">(optioneel)</span>', 'Zegt vaak meer over je positie dan de vorige vragen.', 2))
    out.append(vraag(7, 'Zijn er partijen die we moeten uitsluiten: klanten, sollicitanten, concurrenten? <span class="sub">(optioneel)</span>', 'Zo gaat er geen budget aan op.', 2))

    out.append(h3('Je merk en je beeld'))
    out.append(vraag(8, 'Stuur je logo mee, liefst als vectorbestand.', 'Gaat in al je advertenties. Een vectorbestand eindigt meestal op .svg, .eps, .ai of .pdf.', 0, UPLOAD))
    out.append(vraag(9, 'Heb je een huisstijlhandboek of merkrichtlijnen? <span class="sub">(optioneel)</span>', 'Zodat je advertenties eruitzien als je bedrijf.', 0, ['nee', 'ja, meegestuurd naar support@']))
    out.append(vraag(10, 'Heb je eigen foto- of videomateriaal? <span class="sub">(optioneel)</span>', 'Bepaalt hoeveel we op de draaidag moeten maken. Waar staat het, en wat is het?', 2, ['nee', 'ja:']))
    out.append(vraag(11, 'Is er iets wat je absoluut niet wilt zien in je advertenties? <span class="sub">(optioneel)</span>', 'Voorkomt een correctieronde achteraf.', 2))

    out.append(h3('Je e-mailadressen'))
    out.append(vraag(12, 'In welk programma staan je adressen nu?', 'Hiervandaan verhuizen we ze.', 1))
    out.append(vraag(13, 'Stuur een export van je adressenbestand mee. <span class="sub">(optioneel)</span>', 'Zodat je vanaf dag één kunt mailen. Een csv-bestand is het handigst.', 0, UPLOAD))
    out.append(vraag(14, 'Weet je hoe die adressen zijn verzameld?', 'Bepaalt of we de lijst direct kunnen gebruiken of eerst een bevestigingsmail sturen.', 1, ['ja', 'deels', 'nee']))
    out.append(vraag(15, 'Zijn er groepen die je gescheiden wilt houden? <span class="sub">(optioneel)</span>', 'Zo richten we je groepen in. Bijvoorbeeld particulier en zakelijk.', 2))

    out.append(h3('Je dashboard'))
    out.append(vraag(16, 'Waar wil je een melding van een nieuwe aanvraag?', 'Zo stellen we de meldingen in. Op welk adres of nummer?', 1, ['e-mail', 'WhatsApp', 'allebei']))
    out.append(vraag(17, 'Wie krijgt nog meer een login? <span class="sub">(optioneel)</span>', 'Naast wie de aanvragen opvolgt. Naam en e-mailadres.', 2))

    out.append(h3('De draaidag'))
    out.append(vraag(18, 'Waar kunnen we filmen?', 'Bepaalt de planning van de dag. Adres, en wat voor plek het is.', 2))
    out.append(vraag(19, 'Wie kunnen we voor de camera zetten?', 'Iemand die het werk doet, werkt beter dan de directeur.', 2))
    out.append(vraag(20, 'Wat moet er in beeld?', 'Wordt de shotlist. Kruis aan en vul aan.', 2, ['producten', 'machines', 'een project', 'het pand']))
    out.append(vraag_met(21, 'Op welke dagdelen in week 3 en 4 kunnen we bij je filmen? Vink alles aan wat kan.', 'Daarmee zetten we de draaidag vast met onze videograaf. Hoe meer opties, hoe sneller. De weken en datums vullen wij in.', raster()))

    out.append(h3('Praktisch'))
    out.append(vraag_met(22, 'Wie is onze vaste contactpersoon?', 'Eén aanspreekpunt scheelt ons allebei tijd.', velden(['Naam', 'Telefoon', 'E-mailadres'])))
    out.append(vraag(23, 'Is er iets wat wij moeten weten en niet hebben gevraagd? <span class="sub">(optioneel)</span>', '', 5))

    out.append(h3('Wat je meestuurt'))
    out.append(checklist([
        ('Dit formulier, ingevuld (een scan of foto is goed)', 'altijd'),
        ('Je logo, liefst als vectorbestand (vraag 8)', 'altijd'),
        ('Je klantenbestand of omzetoverzicht (vraag 5)', 'als je het hebt'),
        ('Je huisstijlhandboek of merkrichtlijnen (vraag 9)', 'als je het hebt'),
        ('Een export van je adressenbestand, als csv (vraag 13)', 'als je het hebt'),
    ]))
    out.append(kader('<p>Mail het ingevulde formulier (een scan of foto is goed) met je bestanden naar <b>support@jamesrobinson.nl</b>, uiterlijk de avond vóór de toegangensessie. Dan hebben wij het gelezen voordat we samen aan de slag gaan.</p>', 'Klaar?', 'lime'))
    return ''.join(out)


# ---------------------------------------------------------------- 06.3 Toegangendocument
NOG_NIET = 'heb ik nog niet, regel het voor mij'


def onderdeel(titel, wie, wat, waarom, hoe, opts):
    inhoud = (
        '<div class="twee" style="margin-bottom:5pt"><div><span class="klein"><b>Wat het is</b></span><br>%s</div><div><span class="klein"><b>Waarom we het nodig hebben</b></span><br>%s</div></div>' % (wat, waarom)
        + '<span class="klein"><b>Zo geef je ons toegang</b></span>' + hoe + opties(opts)
    )
    return blok(titel, wie, inhoud)


def route(stappen):
    return '<ol style="margin:2pt 0 4pt">%s</ol>' % ''.join('<li>%s</li>' % s for s in stappen)


ADRES = vv('[ons beheeradres]')


def toegangendocument():
    out = [kader('<p><b>Alles staat op jouw naam; wij krijgen beheertoegang.</b> Stop je ooit, dan neem je alles mee zonder dat er iets overgezet hoeft te worden. Je betaalgegevens vul je altijd zelf in; wij bewaren nooit een creditcard of IBAN van een ander.</p>'
                 '<p>Loop dit document door vóór de toegangensessie. Lukt iets, kruis dan <b>gedaan</b> aan. Heb je iets nog niet, kruis dan <b>heb ik nog niet</b> aan: dan maken wij het aan, op jouw naam. Wat blijft hangen, doen we samen in de sessie: 45 minuten online, jij aan het toetsenbord en wij ernaast.</p>'
                 '<p>Schermen veranderen af en toe. Ziet iets er anders uit dan hier staat, sla het dan over. Dan doen we het samen.</p>', 'Zo werkt het', 'blauw')]
    out.append(velden(['Bedrijf', 'Datum toegangensessie', 'Ons adres voor uitnodigingen', 'Je webbouwer (naam en e-mail)', 'Je hosting en domein (bij wie)']))
    out.append(p('Het adres voor uitnodigingen vullen wij in. Dat gebruik je bij elke stap waar “ons beheeradres” staat.', 'klein'))

    out.append(h2('Advertenties'))
    out.append(onderdeel('Google Ads', 'jij, in de sessie',
        'Je advertentieaccount bij Google.',
        'Hier draaien je advertenties in Google. Het account blijft van jou, met je eigen betaalmethode, nooit de onze.',
        route(['Log in op ads.google.com.', 'Ga naar <b>Beheerder</b> (het sleuteltje) en kies <b>Toegang en beveiliging</b>.', 'Klik op de blauwe plus, vul %s in en kies <b>Beheerder</b>.' % ADRES, 'Klik op <b>Uitnodiging verzenden</b>. Noteer je klant-ID (tien cijfers, rechtsboven): ' + lijn(36)]),
        ['gedaan', NOG_NIET]))
    out.append(onderdeel('Meta: Business Manager en advertentieaccount', 'jij, in de sessie',
        'De bedrijfsomgeving van Facebook en Instagram, met je advertentieaccount en je pagina’s.',
        'Hier draaien je advertenties op Facebook en Instagram. Ook hier je eigen betaalmethode.',
        route(['Wij sturen je een partnerverzoek vanuit ons Business Manager.', 'Log in op business.facebook.com en open de <b>bedrijfsinstellingen</b>.', 'Ga naar <b>Verzoeken</b> en keur het verzoek van James Robinson goed.', 'Staat je account nog op naam van een vorig bureau? Kruis dat aan; we helpen het over te zetten.']),
        ['gedaan', NOG_NIET, 'staat bij een vorig bureau']))
    out.append(onderdeel('Microsoft Ads, LinkedIn, TikTok', 'jij, in de sessie',
        'Advertentieaccounts op andere kanalen.',
        'Alleen als het kanaal in je plan staat. Op jouw naam, wij als beheerder, met je eigen betaalmethode.',
        '<p style="margin:2pt 0 4pt">Dit doen we samen in de sessie. Je hoeft vooraf niets te doen.</p>',
        ['staat niet in mijn plan', 'gedaan', NOG_NIET]))

    out.append(h2('Meten'))
    out.append(onderdeel('Google Analytics en Tag Manager', 'jij, in de sessie',
        'Analytics meet wat bezoekers op je site doen. Tag Manager is de plek waar de meetcode staat.',
        'Zonder meting weten we niet welke advertentie een aanvraag oplevert, en sturen we blind.',
        route(['<b>Analytics:</b> log in op analytics.google.com, klik linksonder op <b>Beheer</b> (het tandwiel) en kies <b>Toegangsbeheer voor property</b>.', 'Klik op de plus, kies <b>Gebruikers toevoegen</b>, vul %s in, kies de rol <b>Beheerder</b> en klik op <b>Toevoegen</b>.' % ADRES, '<b>Tag Manager:</b> log in op tagmanager.google.com, ga naar <b>Beheer</b> en dan <b>Gebruikersbeheer</b>.', 'Voeg %s toe als beheerder, en geef bij je container het recht <b>Publiceren</b>.' % ADRES]),
        ['gedaan', NOG_NIET]))
    out.append(onderdeel('Search Console en Bedrijfsprofiel', 'jij, in de sessie',
        'Search Console laat zien hoe Google je site ziet. Je Bedrijfsprofiel is je vermelding in Google Maps en de zoekresultaten.',
        'We verifiëren en koppelen ze, zodat we zien waarop je gevonden wordt.',
        route(['<b>Search Console:</b> open search.google.com/search-console, ga naar <b>Instellingen</b> en dan <b>Gebruikers en rechten</b>.', 'Klik op <b>Gebruiker toevoegen</b>, vul %s in en kies <b>Volledig</b>.' % ADRES, '<b>Bedrijfsprofiel:</b> zoek in Google op je bedrijfsnaam terwijl je ingelogd bent, open het menu van je profiel en kies <b>Bedrijfsprofielinstellingen</b>.', 'Kies <b>Personen en toegang</b>, klik op <b>Toevoegen</b>, vul %s in en kies <b>Beheerder</b>.' % ADRES]),
        ['gedaan', NOG_NIET]))

    out.append(h2('Je website en je domein'))
    out.append(onderdeel('De website', 'jij of je webbouwer',
        'Een beheerdersaccount op je site.',
        'We plaatsen de meetcode. De enige eis: we moeten zelf een script in de head van je site kunnen zetten.',
        route(['<b>WordPress:</b> log in, ga naar <b>Gebruikers</b> en dan <b>Nieuwe gebruiker</b>.', 'Vul %s in, kies de rol <b>Beheerder</b> en klik op <b>Nieuwe gebruiker toevoegen</b>.' % ADRES, '<b>Een ander systeem, of kan het alleen via je webbouwer?</b> Kruis het aan en vul bovenaan je webbouwer in. Wij mailen die zelf, met jou in cc.']),
        ['gedaan', 'loopt via mijn webbouwer', NOG_NIET]))
    out.append(onderdeel('Het domein (DNS)', 'je webbouwer of hosting',
        'De instellingen achter je domeinnaam.',
        'Voor e-mailauthenticatie zodat je mail niet in de spam belandt, en voor MailerLite.',
        route(['Wij leveren de records. Je hoeft alleen te weten wie je domein beheert.', 'Doe je het zelf: log in bij de partij waar je domein staat, open het <b>DNS-beheer</b> en voeg de records toe die wij sturen.', 'Doet je webbouwer of hosting het: vul ze bovenaan in. Wij mailen ze zelf, met jou in cc.']),
        ['ik beheer het zelf', 'loopt via mijn webbouwer of hosting', 'weet ik niet']))
    out.append(onderdeel('Cookiescript', 'wij, met Webmix',
        'De cookiemelding op je site.',
        'Zodat de meting werkt met en zonder toestemming van de bezoeker.',
        '<p style="margin:2pt 0 4pt">Dit regelen wij met Webmix. Je hoeft niets te doen.</p>',
        []))

    out.append(h2('E-mail en je dashboard'))
    out.append(onderdeel('MailerLite', 'jij, in de sessie',
        'Je e-mailprogramma.',
        'We verzamelen vanaf dag één adressen, dus dit kan niet wachten.',
        route(['In de sessie maken we samen een nieuw account aan, op jouw naam en jouw e-mailadres.', 'Je betaalgegevens vul je zelf in.']),
        ['gedaan in de sessie']))
    out.append(onderdeel('Je bestaande e-mailbestand', 'jij, vóór de sessie',
        'Een export van de adressen die je nu hebt.',
        'Zodat je vanaf dag één kunt mailen.',
        route(['Open het programma waar je adressen nu staan en zoek naar <b>exporteren</b>.', 'Kies een csv-bestand en stuur het naar support@jamesrobinson.nl. Het hoort bij vraag 13 van het onboardingformulier (06.2).']),
        ['meegestuurd', 'heb ik niet']))
    out.append(onderdeel('ClickCease, Leadinfo, Calendly', 'jij, in de sessie',
        'Extra programma’s: tegen klikfraude, bedrijfsherkenning en een afsprakenplanner.',
        'Alleen als je ervoor kiest. Op jouw naam, met je eigen betaalgegevens.',
        '<p style="margin:2pt 0 4pt">Dit doen we samen in de sessie.</p>',
        ['niet gekozen', 'ClickCease', 'Leadinfo', 'Calendly']))
    out.append(onderdeel('Het marketingdashboard', 'wij',
        'Eén plek waar je ziet wat je marketing doet.',
        'Hier komt elke aanvraag binnen, met waar hij vandaan kwam.',
        '<p style="margin:2pt 0 4pt">Wij maken het aan. Jij krijgt een login, net als wie de aanvragen opvolgt en wie je in vraag 17 van het onboardingformulier noemde.</p>',
        []))

    out.append(h2('Na de sessie: wat nog openstaat'))
    out.append(p('Wat niet meteen lukt, krijgt een eigenaar en een datum.', 'klein'))
    out.append(tabel(['Onderdeel', 'Wat er nog moet gebeuren', 'Wie', 'Uiterlijk'], [['&nbsp;<br>&nbsp;', '', '', '']] * 5))
    return ''.join(out)


DOCS = [
    dict(code='06.1', titel='Kick-offmail', fase=FASE, voor='Intern',
         wanneer='Dag 0, binnen een uur na de handtekening', wie='De marketingmanager, met het portaal',
         lead='De mail die de klant binnen een uur na de handtekening krijgt, en de drie werkdagen tot dag 1 van het fundament. De mail gaat automatisch; dit is de tekst, de controle en de planning.',
         body=kickoff()),
    dict(code='06.2', titel='Onboardingformulier', fase=FASE, voor='Klant',
         wanneer='Binnen drie werkdagen na het tekenen', wie='Jij, ongeveer twintig minuten',
         lead='23 vragen in zeven blokken. Alleen wat we nodig hebben om te gaan maken: je beeld, de woorden van je klanten, je e-mailadressen en de draaidag.',
         body=onboardingformulier()),
    dict(code='06.3', titel='Toegangendocument', fase=FASE, voor='Klant',
         wanneer='Bij de kick-offmail; samen afronden in de toegangensessie', wie='Jij, met ons ernaast',
         lead='Alles waar je ons toegang toe geeft, op één plek. Per onderdeel: wat het is, waarom we het nodig hebben en hoe je het doet. Heb je iets nog niet, kruis het aan: dan regelen wij het, op jouw naam.',
         concept=True, body=toegangendocument()),
]
