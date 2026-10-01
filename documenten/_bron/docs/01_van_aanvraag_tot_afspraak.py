# -*- coding: utf-8 -*-
# Stap 01 · Van aanvraag tot afspraak: vragenlijst (klant), beoordeling, mailteksten en belscript bij oranje.
import re
from base import *

FASE = 'Fase 1 · Verkopen · Stap 01 · Van aanvraag tot afspraak'

# ---------- kleine helpers, alleen met bestaande klassen ----------
def V(t):
    """Zet elke [invulplek] om in een gemarkeerde invulplek."""
    return re.sub(r'\[[^\]<>]+\]', lambda m: vv(m.group(0)), t)

def knop(t):
    return '<p style="margin:6pt 0 0"><span class="chip c-blauw" style="font-size:8.5pt;padding:3pt 11pt">%s</span></p>' % t

def lijn(voor='', na='', breed=45):
    return '<div style="margin-top:7pt">%s<span style="display:inline-block;width:%dmm;border-bottom:1px solid var(--ln);height:13pt;vertical-align:bottom;margin:0 4pt"></span>%s</div>' % (voor, breed, na)

def opties(items, label=''):
    lab = '<span class="klein" style="margin-right:2pt">%s</span>' % label if label else ''
    return '<div class="opties">%s%s</div>' % (lab, ''.join('<span class="opt">%s</span>' % o for o in items))

def vraag_vrij(nr, tekst, hulp='', inhoud=''):
    """Een vraag met eigen invulinhoud (meerdere rijen opties, een invullijn met eenheid)."""
    body = '<div class="q">%s</div>' % tekst
    if hulp: body += '<div class="hulp">%s</div>' % hulp
    return '<div class="vraag"><div class="nr">%s</div><div>%s%s</div></div>' % (nr, body, inhoud)

def leeg(h=15): return '<div style="height:%dpt"></div>' % h

KLEUR = {'groen': ('Groen', 'groen'), 'oranje': ('Oranje', 'oranje'), 'later': ('Later', 'blauw'), 'rood': ('Rood', 'rood')}
def ck(k): return chip(*KLEUR[k])


# =====================================================================
# 01.1 Vragenlijst website (klant)
# =====================================================================
BAND = ['Minder dan € 1.000', '€ 1.000 – 2.500', '€ 2.500 – 5.000', 'Meer dan € 5.000']

def body_011():
    o = []
    o.append(kader('<p>Dit is de vragenlijst die je anders online invult, nu op papier. Vijftien korte vragen, zo’n vijf minuten. Schatten mag: een globaal getal is genoeg. Bij elke vraag over geld zeggen we waarom we hem stellen.</p>'
                   '<p>Met je antwoorden kijken we naar je website en je markt voordat we elkaar spreken. Zo gaat het gesprek over jouw cijfers. Past het niet, dan hoor je dat direct, met de reden.</p>', 'Zo werkt het', 'blauw'))
    o.append(h3('Je naam en e-mailadres'))
    o.append(velden(['Voornaam', 'E-mailadres']))
    o.append(p('We sturen je de video en een korte reeks van vijf mails over hoe we werken. Afmelden kan in elke mail.', 'klein'))
    o.append(kader('<p>In drie minuten vertelt Jim Coumans voor wie we werken, wat we anders doen, wat je krijgt voordat je betaalt en wanneer we nee zeggen. Kijk hem voordat je de vragen invult: ' + vv('[adres van de videopagina]') + '.</p>', 'Eerst de video', 'grijs'))

    o.append(h2('De vragen'))
    o.append(vraag(1, 'Aan wie verkoop je?', '', 0, ['Aan bedrijven', 'Aan particulieren', 'Aan allebei']))
    o.append(vraag(2, 'Hoe word je klant bij jou?', '', 0, ['Ze vragen een offerte, afspraak of reservering aan', 'Ze kopen direct online', 'Ze komen langs in de winkel of zaak', 'Een combinatie']))
    o.append(vraag(3, 'Wat verkoop je, in één zin?', 'Geen slogan. Gewoon wat iemand bij je koopt.', 2))
    o.append(vraag(4, 'Waar zitten je klanten?', '', 0, ['In de regio rond mijn vestiging', 'In heel Nederland', 'In Nederland en daarbuiten']))
    o.append(vraag(5, 'Wat geef je nu per maand uit aan marketing, alles bij elkaar?',
                   'Advertenties, bureaus, freelancers, drukwerk. <b>Waarom we dit vragen:</b> om te zien of we bij je passen. Ons kleinste pakket kost, samen met het advertentiebudget, ongeveer € 2.000 per maand.', 0,
                   ['Nog niets'] + BAND))
    o.append(vraag_vrij(6, 'Waar geef je het aan uit?',
                        'Kies alles wat van toepassing is. Koos je bij vraag 5 “nog niets”? Kruis dan aan waar je het aan wilt gaan uitgeven, en hoeveel per maand.',
                        opties(['Google of Bing', 'Facebook of Instagram', 'LinkedIn', 'TikTok', 'Vindbaar zonder advertenties', 'E-mail', 'Social zonder advertenties', 'Drukwerk, radio of tv', 'Een bureau of freelancer'])
                        + '<div style="margin-top:8pt" class="klein">Alleen bij “nog niets”: wat wil je per maand gaan uitgeven?</div>' + opties(BAND)))
    o.append(vraag_vrij(7, 'Wat is het adres van je website?', '',
                        lijn('', '', 95) + opties(['Ik heb nog geen website'])))
    o.append(vraag_vrij(8, 'Wat is een gemiddelde opdracht bij jou waard?',
                        'Wat een klant per keer betaalt. <b>Waarom we dit vragen:</b> hieruit rekenen we uit wat een aanvraag je maximaal mag kosten.',
                        lijn('€', '')))
    o.append(vraag(9, 'Hoe lang blijft een klant gemiddeld klant?', 'Sommige klanten blijven jaren, andere komen één keer. Een globaal gemiddelde is genoeg.', 0,
                   ['Eenmalige aankoop', 'Korter dan een jaar', 'Een tot twee jaar', 'Drie tot vijf jaar', 'Langer dan vijf jaar']))
    o.append(vraag_vrij(10, 'Hoe vaak koopt een klant per jaar bij je?', 'Een getal van 1 tot 52. Sla deze vraag over als je bij vraag 9 “eenmalige aankoop” koos.',
                        lijn('', 'keer per jaar', 25)))
    o.append(vraag_vrij(11, 'Hoeveel aanvragen krijg je nu per maand?',
                        'Telefoon, mail en formulieren samen. Niet het aantal klanten. <b>Waarom we dit vragen:</b> dit is het vertrekpunt waar we straks alles mee vergelijken.',
                        lijn('', 'aanvragen per maand (van 0 tot 100 of meer)', 25)))
    o.append(vraag_vrij(12, 'Hoeveel procent van die aanvragen wordt klant?', '',
                        '<div style="display:flex;align-items:flex-end;gap:16pt">' + lijn('', '%', 25) + opties(['Weet ik niet']) + '</div>'))
    o.append(vraag(13, 'Hoe lang duurt het van eerste contact tot opdracht?', '', 0,
                   ['Direct', 'Een paar dagen', 'Een paar weken', 'Een paar maanden', 'Langer dan een half jaar']))
    o.append(vraag_vrij(14, 'Waar loop je nu tegenaan?', 'Kies alles wat van toepassing is.',
                        opties(['Ik krijg te weinig aanvragen', 'Ik krijg wel aanvragen, maar niet de goede', 'Aanvragen worden te weinig klant', 'Ik heb geen tijd of kennis om het zelf te doen', 'Ik weet niet wat mijn marketing oplevert'])
                        + lijn('<span class="opt">Iets anders:</span>', '', 120)))
    o.append(vraag(15, 'Wanneer wil je beginnen?', '', 0,
                   ['Zo snel mogelijk', 'Binnen een maand', 'Binnen drie maanden', 'Later dan drie maanden', 'Ik oriënteer me nog']))

    o.append(h2('Tot slot: hoe we je bereiken'))
    o.append(p('Online vragen we dit pas als blijkt dat het past. Op papier vul je het meteen in, dan kunnen we je bellen of mailen.', 'klein'))
    o.append(velden(['Achternaam', 'Telefoon', 'Bedrijfsnaam']))
    o.append('<div class="veld"><span>Je rol</span><div>%s</div></div>' % opties(['Eigenaar', 'Marketing', 'Anders: ____________']))

    o.append(h2('Wat er daarna gebeurt'))
    o.append(twee(
        kader('<p>Je kiest zelf een moment voor het intakegesprek. Het duurt een uur en we plannen minstens drie werkdagen vooruit, zodat we eerst naar je website en je markt kunnen kijken. Je krijgt een bevestiging met onze tarieven.</p>', 'Het past', 'groen')
        + kader('<p>Je kiest een moment voor een telefoontje van een kwartier, over je budget, over wat een aanvraag mag kosten of over je markt. Dat bespreken we liever eerst kort dan dat je een uur reserveert voor iets wat misschien niet past.</p>', 'Eerst een kwartier', 'oranje'),
        kader('<p>Wil je later dan over drie maanden beginnen, of oriënteer je je nog? Dan plannen we nu niets. Rond het moment dat je noemde, sturen we je één bericht.</p>', 'Nog niet', 'blauw')
        + kader('<p>Dan hoor je dat direct, met de reden in één zin. We zeggen dat liever nu dan na drie maanden en een factuur.</p>', 'Het past niet', 'rood')))
    o.append(p('Ingevuld? Geef het formulier terug aan wie het je gaf, of mail een foto naar support@jamesrobinson.nl. Bellen kan ook: 045&nbsp;792&nbsp;0009.', 'klein'))
    return ''.join(o)


# =====================================================================
# 01.2 Beoordeling vragenlijst (intern)
# =====================================================================
REGELS = [
    ['“Ze kopen direct online” (vraag 2)', ck('rood'), 'De reden: e-commerce is niet onze propositie, met een partner die het wel is.'],
    ['“Ik heb nog geen website” (vraag 7)', ck('rood'), 'De reden: eerst een websiteproject.'],
    ['Beginnen later dan drie maanden, of “ik oriënteer me nog” (vraag 15)', ck('later'), 'Nu geen gesprek. Eén bericht rond het moment dat de klant noemde.'],
    ['Marketinguitgaven nu of gepland minder dan € 1.000 per maand (vraag 5 en 6)', ck('oranje'), 'Een kwartier bellen over het budget.'],
    ['Wat een aanvraag mag kosten komt onder € 30 uit (de rekensom hieronder)', ck('oranje'), 'Een kwartier bellen over wat een aanvraag mag kosten.'],
    ['Bedrijven + eigen regio + beslistraject langer dan een half jaar (vraag 1, 4 en 13)', ck('oranje'), 'Een kwartier bellen over de markt.'],
    ['Al het andere', ck('groen'), 'Het intakegesprek zelf inplannen.'],
]

PER_SCHERM = [
    ['1', 'Aan wie verkoop je?', 'Kwalificeren, samen met gebied en beslistraject.', 'Bedrijven + eigen regio + langer dan een half jaar beslissen: oranje.'],
    ['2', 'Hoe word je klant bij jou?', 'Het verschil tussen iets aanvragen en direct kopen.', '“Direct online”: rood. E-commerce is niet onze propositie.'],
    ['3', 'Wat verkoop je, in één zin?', 'Kwalificeren, en de zoektermen voor de quickscan, in de woorden van de klant.', 'Medische claims of financiële producten: zien we in de quickscan (strenge advertentieregels).'],
    ['4', 'Waar zitten je klanten?', 'Quickscan: in dit gebied kijken we wie op de zoektermen adverteert.', ''],
    ['5', 'Wat geef je nu per maand uit aan marketing?', 'Budgettoets. Ons minimum staat erbij: ongeveer € 2.000 per maand met advertentiebudget.', 'Minder dan € 1.000: oranje. “Nog niets”: vraag 6 beslist.'],
    ['6', 'Waar geef je het aan uit? / Wat wil je gaan uitgeven?', 'Bij een bedrag: waar het heen gaat. Bestaande advertentieaccounts nemen we over, de historie is geld waard. Bij “nog niets”: het geplande bedrag, zodat de budgettoets blijft.', 'Gepland minder dan € 1.000: oranje. Alleen social zonder advertenties: gespreksonderwerp.'],
    ['7', 'Wat is het adres van je website?', 'De quickscan: snelheid, meting, formulieren, platform.', '“Nog geen website”: rood. Eerst een websiteproject.'],
    ['8', 'Wat is een gemiddelde opdracht waard?', 'Rekensom, deel 1 van de klantwaarde.', 'Meer dan drie keer hoger dan de website doet vermoeden: navragen aan tafel.'],
    ['9', 'Hoe lang blijft een klant klant?', 'Rekensom, deel 2.', '“Eenmalig” slaat vraag 10 over.'],
    ['10', 'Hoe vaak koopt een klant per jaar?', 'Rekensom, deel 3. Een getal van 1 tot 52, geen bandbreedte.', ''],
    ['11', 'Hoeveel aanvragen per maand?', 'Het vertrekpunt waar we alles mee vergelijken. Telefoon, mail en formulieren samen.', 'Minder dan tien: aan tafel zeggen dat een uitspraak over conversie maanden duurt.'],
    ['12', 'Hoeveel procent wordt klant?', 'Rekensom, en een eerste blik op de opvolging.', 'Onder 10%: eerst opvolging en aanbod bekijken. Boven 60%: telt waarschijnlijk offertes, navragen.'],
    ['13', 'Hoe lang van eerste contact tot opdracht?', 'Kwalificeren, en wanneer de eerste klanten kunnen komen.', 'Aan tafel zeggen dat de eerste klanten pas na deze termijn komen.'],
    ['14', 'Waar loop je nu tegenaan?', 'Hiermee opent het intakegesprek. Elk antwoord is een plek in de keten: bereik, kwaliteit, opvolging, capaciteit, meting.', '“Te weinig klant”: opvolging of aanbod in beeld; lezen in de quickscan.'],
    ['15', 'Wanneer wil je beginnen?', 'Planning en prioriteit.', '“Later dan drie maanden” of “oriënteer me nog”: later.'],
    ['16', 'Contactgegevens (alleen groen of oranje)', 'Achternaam, telefoon, bedrijfsnaam, rol. Ook: zit de beslisser aan tafel?', 'Daarna kiest groen een moment voor het intakegesprek, oranje voor het kwartier.'],
]

def body_012():
    o = []
    o.append(kader('<p>De formuliertool past deze regels vanzelf toe. Dit blad is voor wie de uitkomsten nakijkt (de eerste drie maanden elke week, door de eigenaar), voor wie een vragenlijst op papier of aan de telefoon samen met de klant doorloopt (01.1), en voor wie de quickscan doet.</p>', 'Zo gebruik je dit blad', 'blauw'))

    o.append(h2('De regels'))
    o.append(p('<b>Rood gaat voor later, later gaat voor oranje, oranje gaat voor groen.</b> Staan er meerdere punten op oranje, dan is het nog steeds één telefoontje, en dat begint met het budget.'))
    o.append(tabel(['Als het antwoord is', 'Uitkomst', 'Wat de klant daarna ziet'], REGELS))
    o.append(kader('<p>Drie dingen gaan niet automatisch: de beperkte categorie (medisch, financieel), een zwak aanbod, en of er op de website gemeten kan worden. Die zien we in de quickscan, aan “wat verkoop je”, “waar loop je tegenaan” en het platform. Allemaal vóór het gesprek.</p>', 'Wat de tool niet ziet', 'grijs'))

    o.append(h2('Wat we zelf uit de antwoorden rekenen'))
    o.append(p('De klant geeft vier makkelijke antwoorden (vraag 8, 9, 10 en 12). Wij rekenen uit wat een aanvraag alles bij elkaar maximaal mag kosten: advertenties, retainer, fundament en licenties samen. Met 30% marge en twaalf maanden terugverdientijd. Aan tafel vervangen we die door de echte marge en de eigen termijn van de klant.'))
    o.append(tabel(['Stap', 'Voorbeeld', 'Deze klant'], [
        ['Gemiddelde opdracht (vraag 8)', '€ 1.500', '€'],
        ['Keer per jaar (vraag 10)', '× 3', '×'],
        ['Omzet per klant per jaar', '= € 4.500', '= €'],
        ['Standaardmarge', '× 30%', '× 30%'],
        ['Terugverdiend binnen twaalf maanden (vraag 9)', '× 1 jaar', '×'],
        ['Deel van de aanvragen dat klant wordt (vraag 12)', '× 25%', '×'],
        ('tot', ['Alles bij elkaar per aanvraag', '= € 337,50', '= €']),
    ], rechts=(1, 2)))
    o.append(ul([
        '<b>Duur (vraag 9).</b> Korter dan een jaar telt als een half jaar. Vanaf een jaar rekenen we met één jaar, want alles verdient zich binnen twaalf maanden terug.',
        '<b>Eenmalige aankoop.</b> Vraag 10 valt weg: reken met één opdracht.',
        '<b>“Weet ik niet” bij vraag 12</b> telt als 20%.',
        '<b>Onder € 30</b> is de uitkomst oranje. Dan is het de vraag of er met advertenties überhaupt een aanvraag te koop is voor dat bedrag.',
    ]))

    o.append(h2('Per vraag: waarvoor, en waar we op letten'))
    o.append(tabel(['', 'Vraag', 'Waarvoor', 'Norm of signaal'], PER_SCHERM))

    o.append(h2('De vier bedankpagina’s'))
    o.append(p('Wat de klant na de laatste vraag ziet. Bij groen en oranje eerst het scherm met de contactgegevens (“Dit ziet er goed uit, ' + vv('[voornaam]') + '.”), dan de afsprakenplanner.'))
    o.append(twee(
        kader(V('<p>Het gesprek duurt een uur. Dat is genoeg, omdat we minimaal drie werkdagen vooruit plannen en eerst naar je website en je markt kijken. Zo gaat het gesprek over jouw situatie en niet over ons.</p><p class="klein">Afsprakenplanner, gesprek van een uur.</p>'), 'Groen', 'groen', 'Kies een moment voor ons gesprek.'),
        kader(V('<p>Het gaat over [je budget / wat een aanvraag mag kosten / je markt]. Dat bespreken we liever in een kwartier aan de telefoon dan dat we je een uur laten reserveren voor iets wat misschien niet past.</p><p class="klein">Afsprakenplanner, telefoontje van een kwartier.</p>'), 'Oranje', 'oranje', 'Kies een moment voor een telefoontje.')))
    o.append(twee(
        kader(V('<p>Je gaf aan dat je [binnen drie maanden / later] wilt beginnen. Rond die tijd sturen we je één bericht om te vragen of het zover is. Tot die tijd hoor je niets van ons.</p><p class="klein">Plus: houd me op de hoogte via de nieuwsbrief.</p>'), 'Later', 'blauw', V('Dank je, [voornaam]. Dan plannen we nu nog niets.')),
        kader(V('<p>[De reden in één zin.] We zeggen dat liever nu dan na drie maanden en een factuur.</p><p class="klein">Plus: houd me op de hoogte via de nieuwsbrief. De zinnen voor de reden staan in de mailteksten (01.3).</p>'), 'Rood', 'rood', 'Dank je voor je antwoorden.')))
    o.append(p('Wie nu nee krijgt, kan over een jaar wel passen. Daarom vragen we bij rood en bij later of iemand de nieuwsbrief wil. Het is ook het beste moment: de klant kreeg net een eerlijk antwoord in plaats van een verkooppraatje.'))

    o.append(kader('<p>Bij elke lead slaan we op waar die vandaan kwam: bron, medium en campagne; de zoekterm als het platform die doorgeeft; de click id van het advertentieplatform; de pagina van het leadformulier; datum en tijd van leadformulier en vragenlijst (het verschil zegt hoe lang iemand twijfelde); en het contactnummer uit MailerLite. <b>In de link van stap naar stap gaat alleen het contactnummer mee.</b> Nooit naam, e-mailadres, telefoonnummer of IP-adres.</p>', 'Wat onzichtbaar meegaat', 'grijs'))

    o.append('<div style="break-inside:avoid">')
    o.append(h2('Nakijken: de eerste drie maanden, elke week'))
    o.append(p('Regels maken fouten. Een onterechte groene kost een quickscan en een gesprek; een onterechte rode kost een klant. Kijk elke week de rode, oranje en latere uitkomsten na en noteer wat niet klopte. Gaat een regel steeds mis, dan stellen we hem bij.'))
    rij = [leeg(16)] * 5
    o.append(tabel(['Datum', 'Klant', 'Uitkomst van de tool', 'Klopt het?', 'Wat het had moeten zijn, en waarom'], [list(rij) for _ in range(8)]))
    o.append(vakken(['Wat we aan de regels veranderen, en vanaf wanneer', 'Afgesproken door, en datum'], 2, 60))
    o.append('</div>')
    return ''.join(o)


# =====================================================================
# 01.3 Mailteksten stap 01 (intern)
# =====================================================================
K = knop('Plan je gesprek in')

def body_013():
    o = []
    o.append(kader('<p>Alle mails gaan uit MailerLite, van support@jamesrobinson.nl. Wat tussen haken staat, vult de automation of de afzender in. De teksten zijn vast: pas ze alleen aan na een besluit, en dan hier en in MailerLite tegelijk.</p>', 'Zo gebruik je deze teksten', 'blauw'))

    o.append(h2('De reeks: vijf mails in twaalf dagen'))
    o.append(p('Voor wie na het leadformulier niet doorklikt naar de vragenlijst. Elke mail heeft iets bruikbaars en dezelfde knop naar de vragenlijst. Zodra de vragenlijst binnen is, stopt de reeks. Na de vijfde stopt het, tenzij iemand zich voor de nieuwsbrief aanmeldde.'))
    o.append(mail('Direct · voor wie de pagina sloot', 'De video, en de volgende stap', V(
        '<p>Hoi [voornaam],</p><p>Hier is de video nog een keer, voor als je hem later wilt terugkijken: [link].</p>'
        '<p>De volgende stap is een paar korte vragen, één per scherm. Het kost zo’n vijf minuten, en daarna kies je zelf een moment voor het gesprek. Voordat we elkaar spreken, kijken we naar je website en je markt. Dus het gesprek gaat over jouw cijfers, niet over ons.</p>') + K))
    m2 = (mail('Dag 2 · wat de quickscan is, zonder hem weg te geven', 'Drie dingen die we vaak tegenkomen', V(
        '<p>Hoi [voornaam],</p><p>Voor elk gesprek kijken we eerst naar de website. Drie dingen komen we vaak tegen:</p>'
        '<ul><li><b>Aanvragen die niet worden gemeten.</b> Het formulier werkt, maar niemand telt het. Dan weet je niet welke advertentie iets oplevert.</li>'
        '<li><b>Een trage mobiele site.</b> Elke seconde laadtijd kost bezoekers die je al hebt betaald.</li>'
        '<li><b>Een formulier zonder bevestiging.</b> Iemand vraagt iets aan en hoort niets tot jij belt.</li></ul>'
        '<p>Benieuwd hoe dat bij jou zit?</p>') + K))
    m3 = (mail('Dag 5 · de propositie in drie alinea’s', 'Waarom we eerst adverteren', V(
        '<p>Hoi [voornaam],</p><p>De meeste bureaus beginnen met een plan. Wij beginnen met adverteren. Niet omdat plannen onbelangrijk is, maar omdat je na drie weken adverteren meer weet dan na drie maanden plannen: welke boodschap werkt, welke klanten reageren, wat een aanvraag kost.</p>'
        '<p>De eerste aanvragen zijn duur. Dat zeggen we vooraf. Daarna worden ze goedkoper, omdat we sturen op wat we zien.</p><p>Momentum first. Mastery later.</p>') + K))
    o.append(twee(m2, m3))
    m4 = (mail('Dag 8 · het sterkste vertrouwensstuk', 'Wanneer we nee zeggen', V(
        '<p>Hoi [voornaam],</p><p>We zeggen vaker nee dan je zou denken. Vijf redenen:</p>'
        '<ol><li>Je markt is te klein om met advertenties te bereiken.</li><li>In je branche gelden zulke strenge advertentieregels dat we niet kunnen doen waar we goed in zijn.</li>'
        '<li>Het beslistraject is zo lang dat we pas na een jaar kunnen laten zien of het werkt.</li><li>Het aanbod is niet sterk genoeg. Advertenties versterken wat er is, ook als dat zwak is.</li>'
        '<li>We kunnen op je website niet meten. Dan sturen we blind, en dat doen we niet.</li></ol>'
        '<p>Herken je je in geen van de vijf? Dan praten we graag.</p>') + K))
    m5 = (mail('Dag 12 · prijs als laatste, en een belofte om te stoppen', 'Wat het kost', V(
        '<p>Hoi [voornaam],</p><p>Laatste mail van deze reeks. Omdat prijs vaak de reden is om te twijfelen, hier zijn onze tarieven, volledig: [link].</p>'
        '<p>Het fundament is € 4.500 eenmalig. De retainer begint bij € 1.000 per maand. Daarnaast je advertentiebudget, dat rechtstreeks naar de advertentieplatformen gaat en niet naar ons.</p>'
        '<p>Past dat, dan zien we je graag. Past het nu niet, dan hoor je verder niets meer van ons, tenzij je je voor de nieuwsbrief hebt aangemeld.</p>') + K))
    o.append(twee(m4, m5))

    o.append(NIEUWE_PAGINA)
    o.append(h2('Na de vragenlijst: drie mails'))
    o.append(p('Oranje heeft geen eigen mail nodig: de bevestiging van de afsprakenplanner is genoeg.'))
    o.append(mail('Groen · automatisch, zodra de afspraak geboekt is', V('Onze afspraak op [dag] [datum]'), V(
        '<p>Hoi [voornaam],</p><p>Dank voor je antwoorden. We zien je op [dag] [datum] om [tijd], [locatie]. Het gesprek duurt een uur, en daar houden we ons aan. Voor die tijd kijken we naar je website en je markt, zodat we niet bij nul beginnen.</p>'
        '<p>Wil je deze vijf dingen bij de hand hebben? Het zijn de getallen waarmee we aan tafel gaan rekenen. Schatten mag, maar zoek ze liever even op.</p>'
        '<ol><li>Hoeveel extra omzet je komend jaar wilt halen</li><li>Je brutomarge, ongeveer</li><li>Hoeveel e-mailadressen er in je bestand staan</li>'
        '<li>Wie je website beheert: jijzelf, een webbouwer of je hostingpartij</li><li>Wie er meebeslist over marketing, als je dat niet alleen doet. Neem die dan mee.</li></ol>'
        '<p>Alvast onze tarieven, zodat je weet waar je aan toe bent: [link].</p><p>Tot [dag],<br>[naam]</p>')))
    mr = (mail('Rood · direct', 'Je aanvraag bij James Robinson', V(
        '<p>Hoi [voornaam],</p><p>Dank voor je antwoorden. We hebben ze goed bekeken, en we denken dat we niet de juiste partij voor je zijn.</p>'
        '<p>[De reden in één zin, uit de tabel hieronder]</p>'
        '<p>We zeggen dat liever nu dan na drie maanden en een factuur. Als er iets verandert, weet je ons te vinden.</p><p>Groet,<br>[naam]</p>')))
    ml = (mail('Later · op het moment dat de klant noemde', 'Is het zover?', V(
        '<p>Hoi [voornaam],</p><p>Een tijdje terug gaf je aan dat je rond deze tijd met je marketing aan de slag wilde. Is dat nog zo? Dan kun je hier direct verder.</p>'
        '<p>Is het nog niet zover, dan hoef je niets te doen. Dit was het enige bericht dat we je hadden beloofd.</p><p>Groet,<br>[naam]</p>') + knop('Verder met de vragen')))
    o.append(twee(mr, ml))

    o.append(NIEUWE_PAGINA)
    o.append(h2('De zinnen voor de rode mail'))
    o.append(p('Eén zin per reden, op de plek van “de reden in één zin”. Dezelfde zin staat op de rode bedankpagina.'))
    o.append(tabel(['Reden', 'De zin'], [
        ['Niet meten<br><span class="klein">na de quickscan</span>', 'Op je website kan geen meetcode worden geplaatst. Zonder die code kunnen we niet zien wat je advertenties opleveren, en dan sturen we blind. Dat doen we niet. Wissel je ooit van website, dan praten we graag verder.'],
        ['E-commerce', 'Je klanten kopen direct online. Daar zijn anderen beter in dan wij: wij zijn gebouwd voor bedrijven waar een klant eerst iets aanvraagt. We brengen je graag in contact met een partner die webwinkels laat groeien.'],
        ['Geen website', 'Je hebt nog geen website, en die is bij ons het middelpunt waar alles naartoe leidt. Dat is eerst een websiteproject. Daar denken we graag over mee, maar dan als los project en niet als retainer.'],
        ('grp', 'Alleen na het kwartier, nooit op basis van het formulier alleen'),
        ['Markt', 'Je markt is zo klein en specifiek, en het beslistraject zo lang, dat advertenties vooral mensen bereiken die nooit klant worden. Daar werkt persoonlijk contact beter dan welk kanaal met bereik ook.'],
        ['Wat een aanvraag mag kosten', 'Wat een nieuwe klant je oplevert, laat te weinig ruimte om een aanvraag via advertenties te kopen. Dan betaal je meer voor een klant dan hij je oplevert. Je netwerk en verwijzingen zijn dan betere kanalen.'],
        ['Budget', 'Met het budget dat er nu is, kunnen we niet waarmaken wat we beloven. Verandert dat, dan horen we graag van je.'],
    ]))
    o.append(kader('<p>De stopknop van de quickscan (02.1) gebruikt de zin “niet meten”. Zeg dan af uiterlijk een werkdag vóór het intakegesprek.</p>', 'Afzeggen na de quickscan', 'rood'))
    return ''.join(o)


# =====================================================================
# 01.4 Belscript bij oranje (intern)
# =====================================================================
def uitkomst(g, l, r):
    rows = [[ck('groen'), g]]
    if l: rows.append([ck('later'), l])
    rows.append([ck('rood'), r])
    return '<table style="margin:6pt 0 0"><tbody>%s</tbody></table>' % ''.join('<tr><td style="width:46pt">%s</td><td>%s</td></tr>' % (a, b) for a, b in rows)

def body_014():
    o = []
    o.append(tabel(['Wie', 'Hoe lang', 'Meer punten op oranje'], [[
        'Dezelfde vaste medewerker die de quickscans doet. Niet Jim Coumans of Jim Kikken.',
        'Vijftien minuten bellen; een half uur in de planning, met voorbereiding en vastleggen.',
        'Nog steeds één telefoontje. Begin met het budget: staat dat op rood, dan doen de andere punten er niet meer toe.']]))
    o.append(h3('Voorbereiding, vijf minuten'))
    o.append(checklist([
        'De antwoorden op de klantkaart lezen. Welk punt staat op oranje?',
        'De rekensom narekenen (01.2): opdrachtwaarde, keer per jaar, duur, conversie.',
        'In Keyword Planner voor twee zoektermen uit “wat verkoop je” het zoekvolume en de klikprijs in het gebied van de klant opzoeken.',
        'De invulstrook (achteraan) klaarleggen.',
    ]))

    o.append(h2('Het gesprek'))
    o.append(blok('De opening', '0 – 2 min',
        zin(V('“Eén punt wilden we eerst even met je afstemmen, voordat je een uur voor ons vrijmaakt: [het punt]. Als dat past, plannen we het gesprek meteen in.”'))
        + p('Zeg het punt meteen. Wie eromheen draait, maakt er een verkoopgesprek van.', 'klein')))
    o.append(blok('Het punt', '2 – 10 min',
        p('Kies hieronder het punt dat oranje staat. Stel de vragen, reken hardop mee met de getallen van de klant, en laat de klant de conclusie zelf trekken.')))

    o.append(blok('Oranje 1 · Het budget', '2 – 10 min',
        p('De klant geeft minder dan € 1.000 per maand uit aan marketing, of wil dat gaan doen. Ons kleinste pakket kost met advertenties ongeveer € 2.000 per maand, plus € 4.500 eenmalig voor het fundament.', 'klein')
        + zin('“Is wat je nu uitgeeft wat je wílt uitgeven, of wat er toevallig uitgaat?”')
        + zin(V('“Een nieuwe klant levert je volgens je antwoorden ongeveer [klantwaarde] op. Hoeveel nieuwe klanten wil je er per jaar bij?”'))
        + zin(V('Reken hardop: “[aantal] klanten keer [klantwaarde] is [bedrag]. Daar staat ongeveer € 22.000 in het eerste jaar tegenover, plus € 4.500 eenmalig.”'))
        + zin('“Is daar ruimte voor? En zo niet nu, wanneer wel?”')
        + uitkomst('Er is ruimte, nu of binnen drie maanden.', 'De ruimte komt pas later. Datum afspreken.', 'Geen ruimte en geen uitzicht erop. Rode mail “budget”.')
        + p('Nooit een kleiner pakket of korting bedenken. De tarieven zijn voor iedereen gelijk.', 'klein')))

    o.append(blok('Oranje 2 · Wat een aanvraag mag kosten', '2 – 10 min',
        p('De rekensom kwam onder € 30 per aanvraag uit. Vaak door een verkeerd getal: de prijs van één product in plaats van een bestelling, of “eenmalig” terwijl klanten terugkomen. Eerst controleren, dan pas oordelen.', 'klein')
        + zin(V('“Je schreef: een opdracht is gemiddeld [bedrag], een klant koopt [zo vaak] per jaar en blijft [zo lang]. Klopt dat?”'))
        + zin('“Van de aanvragen die je krijgt, hoeveel worden er klant?”')
        + p('Reken opnieuw met de gecorrigeerde getallen. Leg dan de klikprijs ernaast: deel het maximum per aanvraag door de klikprijs. Bij € 3 per klik en € 25 per aanvraag moet 1 op de 8 bezoekers aanvragen.', 'klein')
        + zin(V('“Een klik op [zoekterm] kost in jouw gebied ongeveer [klikprijs]. Dan moet 1 op de [uitkomst] bezoekers een aanvraag doen. Vind je dat realistisch?”'))
        + uitkomst('Na correctie boven € 30, en hooguit 1 op de 10 bezoekers hoeft aan te vragen.', 'Zelden. Alleen als er een duurder aanbod aankomt.', 'Ook na correctie moet meer dan 1 op de 10 bezoekers aanvragen. Rode mail “wat een aanvraag mag kosten”.')))

    o.append(blok('Oranje 3 · De markt', '2 – 10 min',
        p('De klant verkoopt aan bedrijven in de eigen regio, en beslissen duurt langer dan een half jaar.', 'klein')
        + zin('“Hoeveel bedrijven in je regio kunnen klant worden: tientallen, honderden, duizenden?”')
        + zin('“Zoeken ze actief naar wat jij doet, of komen klanten via je netwerk?” Leg het zoekvolume ernaast.')
        + zin('“Wat gebeurt er in dat halfjaar? En hoeveel nieuwe klanten heb je per jaar nodig?”')
        + uitkomst('Honderden mogelijke klanten, en er wordt gezocht. Zeg er meteen bij dat de eerste klanten pas na die termijn komen.', 'De markt is er, maar de klant kan nu niet een half jaar wachten op resultaat. Datum afspreken.', 'Tientallen mogelijke klanten, en er wordt nauwelijks gezocht. Rode mail “markt”.')))

    o.append(blok('De uitkomst uitspreken', '10 – 13 min',
        p('Groen, later of rood, in het gesprek zelf. Nooit “we komen erop terug”.')
        + '<p style="margin:6pt 0 0">' + ck('groen') + '</p>' + zin('“Dan past het. Zullen we het gesprek nu meteen plannen? Het duurt een uur, en daarvoor kijken we naar je website.”')
        + '<p style="margin:6pt 0 0">' + ck('later') + '</p>' + zin(V('“Dan is het nu te vroeg. Zal ik je rond [datum] een bericht sturen?”'))
        + '<p style="margin:6pt 0 0">' + ck('rood') + '</p>' + zin(V('“Eerlijk gezegd denk ik dat wij je hier niet mee helpen, en ik zeg liever nu waarom dan na drie maanden.” [De reden.]'))))

    o.append(blok('Afronden en vastleggen', '13 – 15 min',
        checklist([
            'Direct op de klantkaart: uitkomst, reden, aangepaste getallen.',
            'Groen: intakegesprek ingepland in het gesprek zelf, minstens drie werkdagen vooruit zodat de quickscan past.',
            'Later: de datum in MailerLite voor de mail “Is het zover?” (01.3).',
            'Rood: de rode mail met de zin bij de reden (01.3).',
        ])))

    o.append(h2('Wat het kwartier niet is'))
    o.append(p('Een verkort intakegesprek. Begint de klant over de quickscan of de retainers: <i>“Goede vraag, die bewaren we voor het gesprek.”</i> En niet overhalen: een oranje punt dat met praten groen wordt, komt in maand drie terug.'))
    o.append(tabel(['Als', 'Dan'], [
        ['De klant neemt niet op', 'Eén mail met de vraag een nieuw moment te kiezen (hieronder). Komt er binnen een week niets, dan wordt het later.'],
        ['De klant wil direct het gesprek', 'Eerst het punt. Is het groen, dan plan je het intakegesprek in hetzelfde telefoontje in.'],
        ['De klant kwam via netwerk of telefoon', 'Dan zijn het leadformulier en de video overgeslagen. Stuur de link naar de vragenlijst, of loop de vragenlijst (01.1) in vijf minuten samen door.'],
    ]))
    o.append(mail('Bij oranje · als de klant niet opneemt', 'We misten je', V(
        '<p>Hoi [voornaam],</p><p>We hadden een telefoontje van een kwartier gepland, maar kregen je niet te pakken. Kies je hier een nieuw moment? [link naar de afsprakenplanner]</p>'
        '<p>Groet,<br>[naam]</p>')))
    o.append(p('Deze mail is een concept: de gids noemt de mail, de tekst ontbreekt nog.', 'klein'))

    # ---------- invulstrook ----------
    def rij(*labels):
        return '<div style="display:flex;gap:14pt;margin-bottom:2pt">%s</div>' % ''.join(
            '<div style="flex:1;display:flex;align-items:flex-end;gap:5pt"><span class="klein" style="white-space:nowrap">%s</span><i style="flex:1;border-bottom:1px solid var(--ln);height:15pt"></i></div>' % l for l in labels)
    strook = (rij('Klant en bedrijf', 'Datum', 'Gebeld door')
        + '<div style="margin:4pt 0 0">%s</div>' % opties(['Budget', 'Wat een aanvraag mag kosten', 'De markt'], 'Het punt:')
        + tabel(['Zoekterm', 'Zoekvolume per maand', 'Klikprijs in het gebied'], [[leeg(10), '', ''], [leeg(10), '', '']])
        + tabel(['', 'Opdrachtwaarde', 'Keer per jaar', 'Duur (½ of 1)', 'Wordt klant', 'Max. per aanvraag', '1 op de … bezoekers'],
                [['Vragenlijst', '', '', '', '', '', ''], ['Gecorrigeerd', '', '', '', '', '', '']])
        + '<div class="klein">Wat de klant zei, letterlijk waar het kan</div>' + '<div class="regels">%s</div>' % ('<div class="regel"></div>' * 3)
        + '<div style="display:flex;align-items:flex-end;gap:14pt;margin-top:6pt"><div style="flex:none">%s</div><div style="flex:1;display:flex;align-items:flex-end;gap:5pt"><span class="klein">Reden</span><i style="flex:1;border-bottom:1px solid var(--ln);height:15pt"></i></div></div>' % opties([ck('groen'), ck('later'), ck('rood')], 'Uitkomst:')
        + '<div style="margin-top:8pt">%s</div>' % opties(['Intakegesprek op ________', 'MailerLite-datum ________', 'Rode mail verstuurd', 'Niet opgenomen: mail op ________', 'Op de klantkaart'], 'Vervolg:'))
    o.append(blok('Invulstrook · kwartier bij oranje', 'Eén strook per gesprek', strook))
    return ''.join(o)


DOCS = [
    dict(code='01.1', titel='Vragenlijst website', fase=FASE, voor='Klant', wanneer='Vóór het intakegesprek', wie='Jij, zo’n vijf minuten',
         lead='De vragen die je anders online beantwoordt, om op papier in te vullen of samen met ons aan de telefoon door te lopen. Daarna weet je direct of het past.',
         body=body_011()),
    dict(code='01.2', titel='Beoordeling vragenlijst', fase=FASE, voor='Intern', wanneer='Bij elke ingevulde vragenlijst; wekelijks nakijken', wie='Vaste medewerker; nakijken door de eigenaar',
         lead='Hoe een vragenlijst groen, oranje, later of rood wordt, wat we zelf uit de antwoorden rekenen, en wat de klant daarna ziet.',
         body=body_012()),
    dict(code='01.3', titel='Mailteksten stap 01', fase=FASE, voor='Intern', wanneer='Vanaf het leadformulier tot de afspraak', wie='Automatisch, via MailerLite',
         lead='De vijf mails van de reeks, de drie mails na de vragenlijst en de zinnen voor de rode mail, zoals ze de deur uitgaan.',
         body=body_013()),
    dict(code='01.4', titel='Belscript bij oranje', fase=FASE, voor='Intern', wanneer='Bij oranje, in het kwartier dat de klant zelf plande', wie='Vaste medewerker van de quickscans',
         lead='Eén telefoontje van een kwartier over het ene punt dat oranje staat. Een check: past het, dan plannen we het intakegesprek; past het nog niet, dan spreken we een moment af; past het niet, dan zeggen we dat.',
         body=body_014(), concept=True),
]
