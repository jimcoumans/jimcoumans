# -*- coding: utf-8 -*-
# Stap 04 · Voorstel maken en het voorstelgesprek: rekensom (04.1), voorstel (04.2),
# draaiboek voorstelgesprek (04.3), jouw kant (04.4).
from base import *

FASE = 'Fase 1 · Verkopen · Stap 04 · Voorstel en voorstelgesprek'


# ---------------------------------------------------------------- kleine helpers (bestaande klassen)
def lijn(w=24):
    """Een invullijn midden in een zin."""
    return '<span style="display:inline-block;width:%dmm;border-bottom:1px solid var(--tx3);height:12pt;vertical-align:-3pt;margin:0 2pt"></span>' % w


def som(nr, vraag_, regel, hulp):
    """Een som als invulbare regel: de vraag, de som met lijnen, en waar het getal vandaan komt."""
    return ('<div class="vraag" style="padding:6pt 0 7pt"><div class="nr">%s</div><div><div class="q">%s</div>'
            '<div style="margin:5pt 0 2pt;font-size:10pt;line-height:1.9">%s</div>'
            '<div class="hulp">%s</div></div></div>') % (nr, vraag_, regel, hulp)


def onderdeel(label, inhoud):
    return '<p class="klein" style="margin:7pt 0 2pt;font-weight:600;color:var(--tx2)">%s</p>%s' % (label, inhoud)


def gb(tijd, titel, minuten, doel, zinnen, tafel, ophalen, valkuil):
    """Eén blok van het gesprek: doel en zinnen links, tafel, ophalen en valkuil rechts."""
    links = '<p style="margin-bottom:4pt"><b>Doel.</b> %s</p>' % doel
    links += onderdeel('Wat je zegt', ''.join(zin(z) for z in zinnen))
    rechts = ''
    if tafel:
        rechts += onderdeel('Op tafel', ul(tafel))
    if ophalen:
        rechts += onderdeel('Wat je ophaalt', checklist(ophalen))
    rechts += '<div class="kader k-rood" style="margin:8pt 0 0;padding:6pt 9pt"><span class="kl">Valkuil</span><p class="klein" style="color:var(--tx)">%s</p></div>' % valkuil
    return blok(titel, '%s · %s' % (tijd, minuten), twee(links, rechts))


def vvz(t):
    """Invulplek op een zwart kader: donkere tekst op lime."""
    return '<span class="vv" style="color:var(--tx)">%s</span>' % t


def paginakop(nr, titel):
    """Kop boven elke pagina van het voorstel."""
    return ('<div class="kop" style="margin-bottom:12pt"><div class="merk">Voorstel voor %s</div>'
            '<div class="code">Pagina %s van 6</div></div><h2 style="margin-top:0;font-size:18pt">%s</h2>') % (vv('[bedrijf]'), nr, titel)


# ---------------------------------------------------------------- 04.1 Rekensom
def rekensom():
    o = []
    o.append(kader('<p>Alles wat je aan marketing uitgeeft, verdient zich terug binnen de terugverdientijd, standaard twaalf maanden: fundament, retainer, licenties, advertenties en gekozen extra’s samen. Wat na de vaste posten overblijft, is het advertentiebudget. Reken door met de precieze uitkomst en rond pas af bij wat je opschrijft. <b>Jaar 1 is de set-upmaand plus elf maanden live.</b> De retainer start in maand 2, dus die telt elf keer.</p>', 'Zo werkt de som', 'blauw'))
    o.append(twee(velden(['Klant en bedrijf']), velden(['Datum'])))
    o.append(h2('Zeven sommen'))
    o.append(som(1, 'Hoeveel nieuwe klanten heb je nodig?',
        '€ ' + lijn(22) + ' extra omzet  ÷  € ' + lijn(20) + ' per klant per jaar  =  ' + lijn(14) + ' klanten',
        'Extra omzet uit het intakegesprek. Per klant per jaar = gemiddelde opdracht × keer per jaar, uit de vragenlijst. Blijft een klant korter dan een jaar, dan telt alleen dat deel.'))
    o.append(som(2, 'Hoeveel aanvragen horen daarbij?',
        lijn(14) + ' klanten  ÷  ' + lijn(12) + ' % dat klant wordt  =  ' + lijn(14) + ' aanvragen in jaar 1',
        'Uit de vragenlijst. “Weet ik niet” telt als 20%.'))
    o.append(som(3, 'Hoeveel is dat per maand?',
        lijn(14) + ' aanvragen  ÷  11  =  ' + lijn(14) + ' extra aanvragen per maand',
        'Jaar 1 is de set-upmaand plus elf maanden live. Deze aanvragen komen bovenop wat er nu al binnenkomt.'))
    o.append(som(4, 'Wat mag alle marketing samen kosten?',
        '€ ' + lijn(22) + ' extra omzet  ×  ' + lijn(10) + ' % marge  ×  ' + lijn(10) + ' maanden  ÷  12  =  € ' + lijn(22),
        'Dit is de marketingruimte. Marge uit het intakegesprek; zonder antwoord 30%, en dat zeggen we erbij. Terugverdientijd standaard twaalf maanden.'))
    o.append(som(5, 'Wat gaat daar vast vanaf?',
        '€ 4.500 fundament  +  € ' + lijn(16) + ' herstel  +  11 × € ' + lijn(14) + ' retainer  +  € ' + lijn(14) + ' licenties<br>=  € ' + lijn(22) + ' vaste kosten in jaar 1',
        'Herstelposten uit de quickscan. Licenties in jaar 1: MailerLite 12 × ' + lijn(12) + ' (vanaf € 9,90), Cookiescript € 150, marketingdashboard 11 × € 25, plus wat de klant kiest: ClickCease, afsprakenplanner. Reken eerst met Starter; komt er bij som 6 genoeg uit voor een groter pakket, reken dan opnieuw met die retainer.'))
    o.append(som(6, 'Wat blijft er over voor advertenties?',
        '( € ' + lijn(22) + ' som 4  −  € ' + lijn(22) + ' som 5 )  ÷  11  =  € ' + lijn(20) + ' per maand',
        'Bepaalt het pakket: het grootste pakket waarvan het minimum gehaald wordt.'
        '<div class="opties" style="margin-top:5pt"><span class="opt">Starter, vanaf € 1.000</span><span class="opt">Playmaker, vanaf € 2.500</span><span class="opt">Captain, vanaf € 5.000</span><span class="opt">Champion, vanaf € 7.500</span></div>'))
    o.append(som(7, 'Wat mag een aanvraag aan advertenties kosten?',
        '€ ' + lijn(22) + ' (som 4 − som 5)  ÷  ' + lijn(14) + ' aanvragen (som 2)  =  € ' + lijn(16) + ' per aanvraag',
        'Het plafond waarop we bieden. Wat een aanvraag echt gaat kosten, blijkt pas uit de cijfers.'))

    o.append(kader('<div style="font-size:11pt;line-height:2.1">“' + lijn(14) + ' extra aanvragen per maand, tegen maximaal € ' + lijn(18) + ' per aanvraag aan advertenties, vanaf het tweede kwartaal.”</div>'
                   '<p style="margin-top:4pt">Eén zin die de klant kan onthouden en kan narekenen, omdat de getallen van de klant zelf komen. De zin komt terug in het voorstel, als doellijn in het dashboard, bij de budgetverdeling over de campagnes en in elke Performance Review. <b>Altijd erbij zeggen:</b> het doel geldt vanaf maand 4.</p>', 'De doelregel', 'zwart'))

    o.append(h2('Drie toetsen, in deze volgorde'))
    o.append(som('1', 'Is het te leveren?',
        lijn(14) + ' aanvragen per maand nu  +  ' + lijn(14) + ' extra (som 3)  =  ' + lijn(14) + ' per maand'
        '<div class="opties"><span class="opt">ja, dat kan de klant aan</span><span class="opt">nee: het doel gaat omlaag</span></div>',
        'Leg de extra aanvragen naast wat er nu binnenkomt, en naast het antwoord op “waar loopt het vast als het verdubbelt”. Van 12 naar 33 per maand is een verdrievoudiging van het werk. Kan de klant het niet aan, dan verlaag je het doel. Het budget blijft.'))
    o.append(som('2', 'Past het bij een pakket?',
        'Op budget: ' + lijn(22) + '   Op campagnes: ' + lijn(22) + '   Het hoogste: ' + lijn(22),
        'Minimaal € 1.000 advertentiebudget per maand is Starter, € 2.500 Playmaker, € 5.000 Captain, € 7.500 Champion. Op campagnes: één aanbod voor één doelgroep is één campagne; Starter heeft er 1, Playmaker 2, Captain 3, Champion 4. Het hoogste van de twee telt. Starter kost in jaar 1 alles bij elkaar ongeveer € 27.000. Bij 30% marge hoort daar ongeveer € 90.000 extra omzet bij, bij 50% marge ongeveer € 54.000.'))
    o.append(som('3', 'Houdt de 50%-regel?',
        '€ ' + lijn(16) + ' retainer  ÷  ( € ' + lijn(16) + ' retainer  +  € ' + lijn(16) + ' advertenties )  =  ' + lijn(12) + ' %',
        'Onder de 50%: het advertentiebudget is minstens zo hoog als de retainer. Met de minimumbudgetten klopt dat altijd. Eenmalige kosten en licenties tellen niet mee.'))
    o.append(kader('<p><b>Bij € 85.000 extra omzet en 30% marge</b> blijft er € 860 per maand over voor advertenties: onder het minimum van Starter. Dan zijn er drie uitwegen: een hoger doel, een langere terugverdientijd, of nee. Nooit het goedkoper maken.</p>'
                   '<p>Het getal uit som 7 is een plafond. Zit de verwachting erboven, dan is dat de reden om nee te zeggen.</p>', 'Als de som niet uitkomt', 'oranje'))

    o.append(h2('Het voorbeeld, doorgerekend'))
    o.append(p('Een klant met opdrachten van € 1.500, drie keer per jaar: € 4.500 omzet per klant per jaar. Een op de vier aanvragen wordt klant. Aan tafel noemde de klant € 120.000 extra omzet en 30% marge.'))
    o.append(tabel(['', 'Bedrag', 'Waar het vandaan komt'], [
        ['Extra omzet komend jaar', '<span style="white-space:nowrap">€ 120.000</span>', 'intakegesprek'],
        ['Brutomarge', '<span style="white-space:nowrap">× 30%</span>', 'intakegesprek'],
        ['Terugverdiend binnen twaalf maanden', '<span style="white-space:nowrap">× 1 jaar</span>', 'standaard, aan tafel bevestigd'],
        ('tot', ['Wat alle marketing in jaar 1 mag kosten', '<span style="white-space:nowrap">= € 36.000</span>', 'alles samen']),
        ['Het fundament', '<span style="white-space:nowrap">− € 4.500</span>', 'eenmalig'],
        ['Retainer Starter, elf maanden (vanaf maand 2)', '<span style="white-space:nowrap">− € 11.000</span>', ''],
        ['Licenties, jaar 1', '<span style="white-space:nowrap">− € 544</span>', 'MailerLite 12 × € 9,90, Cookiescript € 150, dashboard 11 × € 25'],
        ['Herstelposten uit de quickscan', '<span style="white-space:nowrap">− € 0</span>', 'in dit voorbeeld geen'],
        ('tot', ['Over voor advertenties', '<span style="white-space:nowrap">= € 19.956</span>', '€ 1.814 per maand, elf maanden live']),
    ], rechts=(1,)))
    kaart = lambda groot, tekst, label: kader('<p class="klein" style="color:var(--tx)">%s</p>' % tekst, label, 'grijs', groot)
    o.append('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8pt">%s</div>' % ''.join([
        kaart('27 klanten', '€ 120.000 ÷ € 4.500 per klant per jaar', 'Som 1'),
        kaart('107 aanvragen', '27 ÷ 25%, over elf maanden live: 10 extra per maand', 'Som 2 en 3'),
        kaart('€ 187', 'per aanvraag aan advertenties: € 19.956 ÷ 107', 'Som 7'),
        kaart('36%', 'retainer als deel van retainer plus advertenties: onder de 50%', 'Toets 3'),
    ]))
    o.append(p('€ 1.814 per maand is genoeg voor Starter (minimaal € 1.000) en te weinig voor Playmaker (minimaal € 2.500). Het is één aanbod voor één doelgroep, dus één campagne, op Google en Meta. Zo volgt het pakket uit de som.'))
    o.append(kader('<div class="groot">“10 extra aanvragen per maand, tegen maximaal € 187 per aanvraag aan advertenties, vanaf het tweede kwartaal.”</div>'
                   '<p>Het doel geldt vanaf maand 4. Reken je het jaardoel over twaalf maanden vanaf dag één, dan sta je in maand drie achter op een schema dat nooit klopte.</p>', 'De doelregel van het voorbeeld', 'zwart'))
    return ''.join(o)


# ---------------------------------------------------------------- 04.2 Voorstel (sjabloon, zes pagina's)
def voorstel():
    o = []
    # pagina 1 · omslag
    o.append(kader('<p class="klein" style="color:#a1a1a6;margin-bottom:6pt">Voorstel voor</p>'
                   '<div style="font-family:var(--fd);font-size:24pt;font-weight:700;line-height:1.1;margin-bottom:12pt">' + vvz('[bedrijf]') + '</div>'
                   '<p class="klein" style="color:#a1a1a6;margin-bottom:2pt">Jouw doel, in één zin</p>'
                   '<div class="groot" style="color:#fff">' + vvz('[het doel in één zin, uit de klantkaart]') + '</div>', '', 'zwart'))
    o.append(tabel(['', ''], [
        ['Datum', vv('[datum]')],
        ['Geldig tot', vv('[datum, veertien dagen na vandaag]')],
        ['Opgesteld door', vv('[naam], James Robinson')],
        ['Offertenummer', vv('[nummer uit Moneybird]')],
    ]))
    o.append(h3('Zo is dit voorstel opgebouwd'))
    o.append(tabel(['Pagina', 'Wat je leest'], [
        ('grp', 'Jouw doel'),
        ['2', 'Wat we begrepen en zagen'],
        ['3', 'Jouw doel in cijfers'],
        ('grp', 'Ons plan'),
        ['4', 'De vier stappen, met jouw datums, en wat je kunt verwachten'],
        ('grp', 'Het voorstel'),
        ['5', 'Het pakket en wat het kost'],
        ['6', 'Jouw kant en de afspraken'],
    ]))
    o.append(p('Alle bedragen zijn exclusief btw. Tekenen doe je in de offerte; onder dit voorstel staat geen handtekening.', 'klein'))

    # pagina 2
    o.append(NIEUWE_PAGINA)
    o.append(paginakop(2, 'Wat we begrepen en zagen'))
    o.append(h3('Jouw doel, in je eigen woorden'))
    o.append(kader('<div class="groot">“' + vv('[citaat uit het intakegesprek, letterlijk]') + '”</div>', '', 'grijs'))
    o.append(h3('Wat de campagne moet opleveren'))
    o.append(tabel(['Dienst of product', 'Opdrachtwaarde'], [
        [vv('[dienst 1]'), vv('[€ …]')],
        [vv('[dienst 2, als die er is]'), vv('[€ …, als die sterk afwijkt]')],
        [vv('[dienst 3, als die er is]'), vv('[€ …]')],
    ], rechts=(1,)))
    o.append(p('Wat je liever niet meer doet: ' + vv('[werk dat de klant niet meer wil]') + '. Daar adverteren we niet op.'))
    o.append(h3('Wat we zagen'))
    o.append(p('Voor het intakegesprek keken we van buitenaf naar je website en je markt. Drie dingen vielen op.'))
    for n in (1, 2, 3):
        o.append(blok(vv('[bevinding %d]' % n), 'Bevinding %d' % n,
                      p('<b>Wat we zagen.</b> ' + vv('[de meting, bijvoorbeeld “6,1 seconden op de dienstpagina”]')) +
                      p('<b>Wat het je kost.</b> ' + vv('[het gevolg in jouw getallen: aanvragen of geld]'))))
    o.append(p('Alle veertien punten staan in het scanrapport dat je na het intakegesprek kreeg.', 'klein'))

    # pagina 3
    o.append(NIEUWE_PAGINA)
    o.append(paginakop(3, 'Jouw doel in cijfers'))
    o.append(p('Alles wat je aan marketing uitgeeft, verdient zich terug binnen ' + vv('[twaalf]') + ' maanden: fundament, retainer, licenties en advertenties samen. Wat na de vaste posten overblijft, is je advertentiebudget. Alle getallen hieronder komen van jou.'))
    o.append(tabel(['', 'Jouw getal'], [
        ('grp', 'Wat je doel vraagt'),
        ['Extra omzet die je komend jaar wilt halen', vv('[€ …]')],
        ['Wat een klant je per jaar oplevert', vv('[€ …]')],
        ['Nieuwe klanten die daarvoor nodig zijn', vv('[…]')],
        ['Aanvragen die daarbij horen, als ' + vv('[…%]') + ' klant wordt', vv('[…]')],
        ['Extra aanvragen per maand, over elf maanden live', vv('[…]')],
        ('grp', 'Wat het mag kosten'),
        ['Je brutomarge', vv('[…%]')],
        ('tot', ['Wat alle marketing in jaar 1 mag kosten', vv('[€ …]')]),
        ['Het fundament, eenmalig', vv('[− € 4.500]')],
        ['Herstelposten uit de quickscan', vv('[− € …]')],
        ['Retainer ' + vv('[pakket]') + ', elf maanden (vanaf maand 2)', vv('[− € …]')],
        ['Licenties, jaar 1', vv('[− € …]')],
        ('tot', ['Over voor advertenties', vv('[€ …]') + ', ' + vv('[€ …]') + ' per maand']),
        ['Wat een aanvraag maximaal aan advertenties mag kosten', vv('[€ …]')],
    ], rechts=(1,)))
    o.append(kader('<p>Nu krijg je ' + vv('[…]') + ' aanvragen per maand. Met dit doel worden dat er ' + vv('[…]') + '. Je gaf aan dat je ' + vv('[wat de klant aankan, uit het intakegesprek]') + '. ' + vv('[Daarom past dit doel / Daarom stellen we het doel bij naar …]') + '.</p>', 'Kun je het aan?', 'blauw'))
    o.append(kader('<div class="groot">“' + vvz('[…]') + ' extra aanvragen per maand, tegen maximaal ' + vvz('[€ …]') + ' per aanvraag aan advertenties, vanaf het tweede kwartaal.”</div>'
                   '<p>Dit doel geldt vanaf maand 4. De eerste weken leert het algoritme en zijn aanvragen duurder. Het bedrag per aanvraag is een plafond: daarboven bieden we niet.</p>', 'Je doel', 'zwart'))

    # pagina 4
    o.append(NIEUWE_PAGINA)
    o.append(paginakop(4, 'Ons plan'))
    o.append(p('We werken voor iedere klant op dezelfde manier. Alleen de datums en het doel zijn van jou. Wat we na maand 3 als eerste oppakken, laten we de cijfers bepalen.'))
    o.append(tabel(['Stap', 'Wanneer', 'Wat er gebeurt'], [
        ['<b>1 · Set-up</b>', 'Maand 1, week 1 tot en met 3<br>' + vv('[datum – datum]'), 'Meting, advertentieaccounts, e-mail, je marketingdashboard, de campagne en de landingspagina. Alles op jouw naam.'],
        ['<b>2 · Content shooten</b>', 'Maand 1, week 3 of 4', 'De draaidag bij jou op locatie, op een dagdeel dat je zelf opgeeft in het onboardingformulier. Daarna foto, video en graphics voor je advertenties.'],
        ['<b>3 · Adverteren en eerste resultaten</b>', 'Live op ' + vv('[datum]') + '<br>maand 2 en 3', 'Alleen de motor draait. We leren welke zoekwoorden, doelgroepen en advertenties werken, en brengen de kosten per aanvraag omlaag.'],
        ['<b>4 · Optimaliseren</b>', 'Vanaf maand 4<br>' + vv('[datum]'), 'Advertenties en landingspagina’s verbeteren, e-mail en automation, SEO. Wat eerst komt, bepalen de cijfers.'],
    ]))
    o.append(p('Stap 1 en 2 samen zijn het fundament: maand 1, eenmalig betaald. Vanaf stap 3 loopt de retainer.', 'klein'))
    o.append(h3('Wat je vooraf van ons hoort'))
    o.append(twee(
        ol(['<b>De eerste aanvragen zijn duur.</b> In maand 1 twee tot drie keer het doelbedrag. De curve hoort omlaag te lopen.',
            '<b>We vergelijken pas bij genoeg conversies.</b> Tot die tijd laten we de tussenstappen zien: weergaven, kosten per duizend, doorklik, kosten per klik.',
            '<b>Het kan zijn dat we adviseren je budget te verhogen.</b> Zitten de kosten per aanvraag op doel en het aantal niet, dan is budget de enige knop.',
            '<b>Het kan zijn dat we adviseren je aanbod of prijs te veranderen.</b> Die beslissing is van jou.']),
        ol(['<b>We meten je opvolgtijd, en jij geeft per aanvraag een oordeel.</b> Allebei vanaf dag één.',
            '<b>Je landingspagina wordt niet A/B-getest.</b> Bij twintig aanvragen per maand duurt één afgeronde test langer dan een jaar.',
            '<b>Bewegen de cijfers niet, dan zeggen wij het zelf,</b> en leggen we de opties voor, waaronder stoppen.']).replace('<ol>', '<ol start="5">')))
    o.append(kader('<p>Je merk, je aanbod en prijs, je opvolging en je capaciteit. Advertenties versterken wat er is. We meten deze vier wel, en we zeggen het op het moment dat een ervan de oorzaak is. Liever verlagen we het doel dan dat je meer aanvragen krijgt dan je aankunt.</p>', 'Vier dingen die wij niet oplossen', 'oranje'))

    # pagina 5
    o.append(NIEUWE_PAGINA)
    o.append(paginakop(5, 'Het pakket en wat het kost'))
    o.append(h3('Ons advies: ' + vv('[pakket]')))
    o.append(p(vv('[Waarom dit pakket: het advertentiebudget uit pagina 3 en het aantal aanbiedingen of doelgroepen. En waarom niet de andere drie.]')))
    o.append(tabel(['', 'Starter', 'Playmaker', 'Captain', 'Champion'], [
        ['Retainer per maand', '€ 1.000', '€ 1.500', '€ 2.000', '€ 2.500'],
        ['Campagnes tegelijk', '1', '2', '3', '4'],
        ['Advertentiebudget per maand', '€ 1.000 – 2.500', '€ 2.500 – 5.000', '€ 5.000 – 7.500', 'vanaf € 7.500'],
        ['Contentrondes', 'elk kwartaal', 'elke twee maanden', 'maandelijks', 'twee per maand'],
        ['Draaidagen voor nieuw beeld', '1 per jaar', '2 per jaar', '3 per jaar', '4 per jaar'],
        ['Performance Review', 'elk kwartaal', 'elke twee maanden', 'maandelijks', 'maandelijks'],
    ]))
    o.append(p('De draaidag in het fundament is draaidag één van het jaar.', 'klein'))
    o.append(h3('Wat het kost, per ontvanger'))
    rij = lambda post, bedrag, wanneer: '<div style="padding:5pt 0;border-bottom:1px solid var(--ln-soft)"><div style="display:flex;justify-content:space-between;gap:6pt"><b style="font-weight:500">%s</b><b style="white-space:nowrap">%s</b></div><div class="klein">%s</div></div>' % (post, bedrag, wanneer)
    o.append(drie(
        kader(rij('Fundament', '€ 4.500', 'eenmalig, bij ondertekening') + rij('Retainer ' + vv('[pakket]'), vv('[€ …]'), 'per maand vooraf, vanaf maand 2') + rij('Marketingdashboard', '€ 25', 'per maand, of € 250 per jaar') + rij('Afsprakenplanner opzetten', '€ 250', 'eenmalig, alleen als je afspraken laat inplannen'), 'Aan James Robinson', 'blauw'),
        kader(rij('Advertentiebudget', vv('[€ …]'), 'per maand, uit de rekensom op pagina 3') + rij('MailerLite', 'vanaf € 9,90', 'per maand, volgt je lijst') + rij('Cookiescript', '€ 150', 'per jaar, via Webmix') + rij('ClickCease', 'vanaf $ 99', 'per maand; optioneel, jouw keuze') + rij(vv('[Leadinfo of planner]'), vv('[…]'), 'alleen als je ervoor kiest'), 'Rechtstreeks, op jouw naam', 'grijs'),
        kader(rij(vv('[herstelpost]'), vv('[€ …]'), 'uit de quickscan, eenmalig; jij beslist per post: nu, later of niet') + rij('Hosting en onderhoud', '€ 85', 'per maand, alleen als je overzet') + '<p class="klein" style="margin-top:6pt">Geen herstelposten? Dan staat hier € 0.</p>', 'Via Webmix, eigen offerte', 'oranje')))
    o.append(p('Er staat geen eindtotaal, want er is geen bedrag dat je in één keer aan één partij betaalt. Het totaal van alle marketing staat op pagina 3, als de ruimte die je zelf hebt gekozen. Licenties staan op jouw naam en betaal je zelf; wij richten ze in. Per licentie kies je maand of jaar. Er zit nergens een marge van ons op iets van een ander. Bij ClickCease en Leadinfo krijgen wij een vergoeding van de leverancier; jij betaalt daar niets extra voor. Alle bedragen zijn exclusief btw.'))

    # pagina 6
    o.append(NIEUWE_PAGINA)
    o.append(paginakop(6, 'Jouw kant en de afspraken'))
    o.append(p('De helft van de keten is van jou. Deze vijf afspraken zijn wat nodig is om de cijfers de waarheid te laten vertellen. Geen garantie van ons en geen straf voor jou.'))
    o.append(tabel(['Afspraak', 'Wat het inhoudt', 'Termijn'], [
        ['<b>De toegangen</b>', 'In één toegangensessie van 45 minuten met ons. Het fundament start pas als ze er zijn.', 'Binnen drie werkdagen na het tekenen'],
        ['<b>Eén beslisser</b>', vv('[naam]') + ' beslist over doelgroep, boodschap en budget.', 'Reageert binnen twee werkdagen'],
        ['<b>Opvolging</b>', 'Elke aanvraag opgevolgd door ' + vv('[naam]') + ', met ' + vv('[naam]') + ' als vervanger bij vakantie of ziekte.', 'Binnen ' + vv('[de tijd uit het intakegesprek]')],
        ['<b>Een oordeel per aanvraag</b>', 'In het dashboard, met één klik: goede aanvraag of niet, en waarom. En later: welke aanvraag klant werd.', 'Vanaf dag één'],
        ['<b>Beeld en inhoud</b>', 'Het onboardingformulier, met alle dagdelen in week 3 en 4 waarop we kunnen filmen, en iemand die het werk doet op beeld.', 'Binnen drie werkdagen na het tekenen'],
        [vv('[Uit de quickscan, als die er is]'), vv('[bijvoorbeeld: na elke opdracht om een review vragen en op elke review reageren]'), vv('[bijvoorbeeld: drie maanden]')],
    ]))
    o.append(h3('Wat we elkaar beloven'))
    o.append(ul(['<b>Maandelijks opzegbaar,</b> voor jou en voor ons. Opzeggen kan tot en met de laatste dag van de maand.',
                 '<b>De cijfers zijn leidend.</b> Je ziet in je dashboard wat wij zien. Werkt het niet, dan zeggen wij dat zelf, met de cijfers erbij.',
                 '<b>De 50%-regel.</b> Onze retainer is nooit meer dan de helft van wat je per maand aan retainer en advertenties samen uitgeeft.']))
    o.append(kader('<div class="groot" style="color:#fff">Tekenen doe je in de offerte.</div><p>' + vvz('[link naar de offerte in Moneybird]') + '</p><p>Dit voorstel en de offerte zijn geldig tot ' + vvz('[datum]') + '.</p>', '', 'zwart'))
    return ''.join(o)


# ---------------------------------------------------------------- 04.3 Draaiboek voorstelgesprek
def draaiboek():
    o = []
    o.append(kader('<p>45 minuten, plus vastleggen. Dezelfde persoon als in het intakegesprek. De klant ziet eerst het eigen doel en de eigen getallen, dan ons plan, en pas daarna de prijs. Het voorstel staat op het scherm; de offerte gaat het gesprek niet in.</p>', 'Zo gebruik je dit draaiboek', 'blauw'))
    o.append(h2('Voorstel maken, in drie werkdagen'))
    o.append(tabel(['Dag', 'Wat', 'Hoe'], [
        ['1', 'De aantekeningen staan', 'Wat aan tafel is gezegd staat op de klantkaart: doel, marge, capaciteit, wie opvolgt, wie meebeslist. Het advies uit de quickscan is vrijgegeven.'],
        ['1', 'De rekensom', 'Het portaal rekent (04.1). Van het doel naar klanten, naar aanvragen, en wat die samen mogen kosten. Daaruit volgt het advertentiebudget, en uit het budget het pakket.'],
        ['2', 'Het concept', 'Claude maakt in het portaal het voorstel (04.2) uit de klantkaart. Tegelijk staat de offerte als concept in Moneybird.'],
        ['2 – 3', 'Nakijken en vrijgeven', 'Wie het intakegesprek voerde, leest het na, maakt het af en geeft voorstel en offerte in één keer vrij.'],
        ['3', 'Een korte mail', 'Alleen de vraag: “Morgen lopen we het voorstel door. Is ' + vv('[naam]') + ' erbij?”'],
    ]))
    o.append(kader('<p><b>Het portaal rekent, de AI schrijft, een mens geeft vrij.</b> Geen bedrag dat niet uit de tarieven komt, geen getal dat niet uit de rekensom komt, geen citaat dat niet in de aantekeningen staat. Stuur het voorstel niet vooraf: zonder uitleg wordt het op één regel gelezen, de prijs.</p>', 'De regel', 'grijs'))
    o.append(h2('Het gesprek, 45 minuten in zeven blokken'))
    o.append(gb('0 – 3', 'De aftrap', '3 minuten',
        'Terugkoppelen naar het intakegesprek, en de opbouw zetten: jouw doel, ons plan, het voorstel.',
        ['Vorige keer wilde je ' + vv('[wat de klant op minuut 1 zei]') + '. Dit voorstel is ons antwoord daarop.',
         'Eerst je doel, dan hoe we dat gaan halen, dan wat het kost. Aan het eind wil ik weten of je akkoord bent.'],
        [], [('Is de beslisser erbij? Zo nee: wie beslist, en wanneer spreken we die?', '')],
        'Meteen naar de prijs bladeren. Wie de prijs ziet voor de som, leest de rest als verdediging.'))
    o.append(gb('3 – 10', 'Jouw doel: wat we begrepen en zagen', '7 minuten',
        'Controleren of het beeld nog klopt. Opnieuw uitleggen hoeft niet.',
        ['Dit is je doel, en dit moet de campagne opleveren. Zo hebben we het opgeschreven. Klopt dat nog?',
         'Dit zagen we in de quickscan. Is er sinds de vorige keer iets veranderd?'],
        ['Het voorstel, pagina 2'],
        [('Correcties op doel of getallen. Rekent het portaal mee, dan zie je direct wat het met het budget doet.', '')],
        'De quickscan opnieuw uitleggen. Dat was het intakegesprek.'))
    o.append(gb('10 – 17', 'Jouw doel: de rekensom', '7 minuten',
        'Wat het doel vraagt, en wat het mag kosten.',
        ['Om ' + vv('[doel]') + ' te halen heb je ongeveer ' + vv('[aantal]') + ' aanvragen per maand nodig.',
         'Alles bij elkaar mag je marketing in het eerste jaar ' + vv('[bedrag]') + ' kosten; dan verdien je het binnen twaalf maanden terug. Na het fundament, de retainer en de licenties blijft er ' + vv('[bedrag]') + ' per maand over voor advertenties.'],
        ['Het voorstel, pagina 3', 'De rekensom (04.1)'],
        [('Kan de klant ' + vv('[aantal]') + ' aanvragen per maand aan? Anders is het doel te hoog. Het budget blijft.', ''),
         ('Klopt twaalf maanden, of mag het langer?', '')],
        'De som overslaan omdat de klant al ja knikt. Hierop rust straks elk maandcijfer.'))
    o.append(gb('17 – 24', 'Ons plan', '7 minuten',
        'Vier stappen, voor iedereen dezelfde. Alleen de datums zijn van de klant.',
        ['We werken voor iedere klant op dezelfde manier: set-up, content shooten, adverteren en eerste resultaten, en daarna optimaliseren.',
         'Voor jou betekent dat: op ' + vv('[datum]') + ' staat je eerste advertentie live. De eerste aanvragen zijn duur; in maand 2 en 3 brengen we de kosten omlaag.',
         'Vanaf maand 4 optimaliseren we. Wat we dan als eerste oppakken, laten we de cijfers bepalen.'],
        ['Het voorstel, pagina 4'],
        [('Wie er op beeld kan. De dagdelen voor de draaidag volgen in het onboardingformulier.', '')],
        'Maatwerk beloven in het plan omdat het gesprek goed loopt. Het plan ligt vast; wat verschilt, laten de cijfers in stap 4 zien.'))
    o.append(gb('24 – 31', 'Het voorstel: pakket en wat het kost', '7 minuten',
        'De som maakt de keuze. De bedragen noemen en dan stil zijn.',
        ['Daarom adviseren we ' + vv('[pakket]') + '. Wil je minder uitgeven, dan wordt het doel lager. De prijs blijft.',
         'Eenmalig: het fundament, € 4.500. De herstelposten uit de quickscan gaan rechtstreeks via Webmix.',
         'Per maand: ' + vv('[pakket]') + ', ' + vv('[bedrag]') + '. Het advertentiebudget gaat rechtstreeks naar de advertentieplatformen.',
         'Er zit nergens een marge van ons op iets van een ander. Bij ClickCease en Leadinfo krijgen wij een vergoeding van de leverancier; jij betaalt daar niets extra voor.',
         'De licenties staan op jouw naam en betaal je zelf; wij richten ze in. Per licentie kies je maand of jaar. ClickCease is een optie, en het is jouw keuze. Kies je ervoor, dan laten we na de proefperiode zien of het zich terugverdient.'],
        ['Het voorstel, pagina 5', 'Het drieluik', 'De tarieven, voor wie alles wil nalezen'],
        [('De eerste reactie van de klant. Die zegt meer dan de vraag.', ''),
         ('Per licentie maand of jaar; ClickCease ja of nee; dashboard maand of jaar', '')],
        'Het pakket verdedigen in plaats van naar de som te wijzen, of na het bedrag doorpraten en korting aanbieden.'))
    o.append(gb('31 – 38', 'Het voorstel: jouw kant en de afspraken', '7 minuten',
        'Wat wij van de klant nodig hebben, en wat we elkaar beloven.',
        ['Vijf dingen hebben we van je nodig. Zonder die vijf vertellen de cijfers niet de waarheid.',
         'Je kunt elke maand opzeggen, en wij ook. Werkt het niet, dan zeggen wij dat zelf, met de cijfers erbij.'],
        ['Het voorstel, pagina 6', 'Jouw kant: vijf afspraken (04.4)'],
        [('Per afspraak: haalbaar, wie, en per wanneer?', '04.4')],
        'Hier snel overheen praten omdat het gesprek goed loopt. Dit is het deel dat je in maand drie nodig hebt.'))
    o.append(gb('38 – 45', 'Het besluit', '7 minuten',
        'Akkoord of niet. Nooit “we horen van elkaar”.',
        ['Wat heb je nog nodig om te beslissen?',
         'Akkoord: dan sturen we vandaag het voorstel en de offerte om te tekenen, en plannen we de start.',
         'Niet akkoord: wat zou er anders moeten? Het doel, de startdatum, welke dienst eerst: dat kan schuiven. De prijs niet.'],
        [], [('Akkoord of niet. Bij niet: waarom, in de woorden van de klant.', '')],
        'Een “misschien” accepteren zonder datum. Later zonder datum is een nee waar je alleen nog niet van weet.'))

    o.append('<div style="break-inside:avoid">' + h2('Wat je vastlegt') + p('Aan het eind van het gesprek, op de klantkaart. Verandert er iets aan doel of getallen, dan op de klantkaart; het portaal maakt voorstel en offerte opnieuw.') + twee(
        vraag('1', 'Pakket bevestigd', '', 0, ['Starter', 'Playmaker', 'Captain', 'Champion']) +
        vraag('2', 'Marketingdashboard', '', 0, ['€ 25 per maand', '€ 250 per jaar']) +
        vraag('3', 'Per licentie maand of jaar', 'MailerLite, en wat er verder gekozen is.', 2),
        vraag('4', 'ClickCease', 'Een optie, nooit standaard. Bij ja beslissen na de proefperiode de cijfers.', 0, ['ja', 'nee']) +
        vraag('5', 'De vijf afspraken, met een naam en een termijn', 'Op het blad jouw kant (04.4).', 0, ['ingevuld en meegegeven']) +
        vraag('6', 'De uitkomst', '', 1, ['akkoord', 'een datum: ________', 'niet akkoord, want:'])) + '</div>')

    o.append(h2('Vier bezwaren, vier antwoorden'))
    o.append(p('Benoem het bezwaar in plaats van het te weerleggen: vraag welk van de vier het is.'))
    o.append(tabel(['Bezwaar', 'Hoe het klinkt', 'Wat je doet'], [
        ['<b>Prijs</b>', '“Het is veel geld.”', 'Terug naar de som: wat levert een klant op, hoeveel heb je er nodig, wat mag dat kosten? Is het echt te veel, dan wordt het doel lager. Nooit de prijs.'],
        ['<b>Vertrouwen</b>', '“Hoe weet ik dat het werkt?”', 'Dat weet niemand vooraf, en dat zeggen we. Wel: je ziet het elke dag in het dashboard, je kunt elke maand opzeggen, en wij zeggen het zelf als het niet werkt.'],
        ['<b>Timing</b>', '“Niet nu.”', 'Vragen wat er dan anders is. Is het echt timing, dan een datum afspreken. Is het iets anders, dan is dat het echte bezwaar.'],
        ['<b>Besluitvorming</b>', '“Ik moet het nog voorleggen.”', 'Aan wie, en wanneer? Aanbieden om het samen te doen. Een voorstel dat zonder ons wordt voorgelegd, wordt op prijs beoordeeld.'],
    ]))
    o.append(drie(
        kader('<p>Dezelfde dag het voorstel en de offerte in Moneybird, met startdatum en live-datum. Na de handtekening de onboarding, daarna het fundament.</p>', 'Akkoord', 'groen'),
        kader('<p>Alleen als er echt nog iemand moet meebeslissen. Een concrete dag binnen de veertien dagen dat het voorstel geldig is. Op die dag bel je; je mailt niet.</p>', 'Een datum, als uitzondering', 'blauw'),
        kader('<p>Kijken wat kan schuiven. Past het niet, dan bedanken, de reden vastleggen in de woorden van de klant, en door. Een korte mail met de vraag of de klant de nieuwsbrief wil.</p>', 'Niet akkoord', 'rood')))
    o.append(twee(
        kader('<p>Het doel, en daarmee het budget en het pakket. De startdatum. Welke dienst we als eerste in de campagne zetten.</p>', 'Mag schuiven', 'groen'),
        kader('<p>De tarieven: geen korting, voor niemand. Het fundament: niet los, niet in delen, niet overslaan. Maandelijks opzegbaar: niet langer vastleggen voor een lagere prijs. <b>De gevaarlijkste toegeving is korting op het fundament:</b> dat bedrag is 52,5 uur werk die je toch maakt.</p>', 'Schuift nooit', 'rood')))

    o.append(h2('Na het gesprek'))
    o.append(mail('Dezelfde dag, na het gesprek', 'Het voorstel, zoals besproken',
        '<p>Hoi ' + vv('[voornaam]') + ',</p><p>Dank voor het gesprek. Hierbij het voorstel dat we samen hebben doorgelopen: ' + vv('[pdf]') + '.</p>'
        '<ul><li>' + vv('[het doel, in de woorden van de klant]') + '</li><li>' + vv('[het pakket, en waarom]') + '</li><li>' + vv('[de datum waarop de eerste advertentie live staat]') + '</li></ul>'
        '<p>' + vv('[Bij ja: tekenen doe je hier, in de offerte: link naar Moneybird.]') + ' ' + vv('[Bij een datum: ik bel je op dag datum.]') + '</p>'
        '<p>Het voorstel is geldig tot ' + vv('[datum, twee weken]') + '.</p><p>Groet,<br>' + vv('[naam]') + '</p>',
        van='wie het gesprek voerde'))
    o.append(p('<b>Opvolgen.</b> Op de afgesproken datum bellen, niet mailen. Geen reactie na twee weken: één keer bellen. Daarna wordt het later: één bericht over drie maanden. Een nieuwe offerte krijgt de tarieven van dat moment. Alles op de klantkaart: uitkomst, bezwaar, datum.'))
    return ''.join(o)


# ---------------------------------------------------------------- 04.4 Jouw kant: vijf afspraken
AFSPRAKEN = [
    ('De toegangen', 'Alle toegangen in één toegangensessie van 45 minuten met ons.', 'Het fundament start pas als ze er zijn. Elke dag later schuift de live-datum een dag.', 'Binnen drie werkdagen na het tekenen'),
    ('Eén beslisser', 'Eén persoon beslist over doelgroep, boodschap en budget, en reageert binnen twee werkdagen.', 'Akkoord in week 1 en 3 blijft liggen, en het tijdpad schuift.', 'Reageert binnen twee werkdagen'),
    ('Opvolging', 'Elke aanvraag wordt opgevolgd, met een vervanger bij vakantie of ziekte.', 'Aanvragen worden geen klant. Dit is de meest voorkomende oorzaak van tegenvallend resultaat, en we meten het vanaf dag één.', ''),
    ('Een oordeel per aanvraag', 'In het dashboard, met één klik: goede aanvraag of niet, en waarom. En later: welke aanvraag klant werd.', 'We kunnen dan alleen op aantal sturen, en niet op kwaliteit. Dat zeggen we erbij als de cijfers tegenvallen.', 'Vanaf dag één'),
    ('Beeld en inhoud', 'Het onboardingformulier en de toegangen, met alle dagdelen in week 3 en 4 waarop we kunnen filmen, en iemand die het werk doet op beeld.', 'Zonder eigen beeld beginnen we met stock, en dat werkt aantoonbaar slechter.', 'Binnen drie werkdagen na het tekenen'),
]


def jouw_kant():
    o = []
    o.append(p('De helft van de keten is van jou. Deze vijf afspraken zijn geen garantie van ons en geen straf voor jou. Het is wat nodig is om de cijfers de waarheid te laten vertellen. Later zijn ze ook de eerlijke verklaring als het tegenvalt.'))
    o.append(twee(velden(['Bedrijf']), velden(['Datum voorstelgesprek'])))
    vk = lambda l: '<div class="veld" style="grid-template-columns:24mm 1fr;padding:7pt 0 3pt"><span>%s</span><i></i></div>' % l
    for n, (naam, wat, anders, termijn) in enumerate(AFSPRAKEN, 1):
        links = vk('Wie volgt op' if naam == 'Opvolging' else 'Wie') + (vk('Vervanger') if naam == 'Opvolging' else '')
        rechts = '' if naam == 'Eén beslisser' else vk('Uiterlijk op' if termijn and termijn != 'Vanaf dag één' else 'Binnen' if not termijn else 'Vanaf')
        termtekst = ('<b>Termijn:</b> %s.' % termijn) if termijn else '<b>Termijn:</b> de tijd die we in het intakegesprek afspraken.'
        o.append('<div class="vraag"><div class="nr">%d</div><div><div class="q">%s</div><div class="hulp" style="color:var(--tx);font-size:8.8pt">%s</div>'
                 '<div class="hulp">%s Als het niet lukt: %s</div>'
                 '<div class="twee" style="gap:0 14pt">%s<div>%s</div></div></div></div>' % (n, naam, wat, termtekst, anders, '<div>%s</div>' % links, rechts))
    o.append('<div class="vraag"><div class="nr">+</div><div><div class="q">Uit de quickscan, als die er is</div>'
             '<div class="hulp">Wat we zagen en niet zelf oplossen, bijvoorbeeld na elke opdracht om een review vragen en op elke review reageren.</div>'
             '<div class="regels"><div class="regel"></div><div class="regel"></div></div><div class="twee" style="gap:0 14pt"><div>%s</div><div>%s</div></div></div></div>' % (vk('Wie'), vk('Uiterlijk op')))
    o.append(kader('<ul><li><b>Maandelijks opzegbaar,</b> voor jou en voor ons.</li><li><b>De cijfers zijn leidend.</b> Je ziet in je dashboard wat wij zien. Werkt het niet, dan zeggen wij dat zelf, met de cijfers erbij.</li><li><b>De 50%-regel.</b> Onze retainer is nooit meer dan de helft van wat je per maand aan retainer en advertenties samen uitgeeft.</li></ul>', 'Wat wij beloven', 'lime'))
    o.append(p('Dit blad is geen contract. De opdracht teken je in de offerte. Met je handtekening hieronder spreken we af dat dit is wat we van elkaar mogen verwachten.', 'klein'))
    o.append(handtekening('Namens ' + vv('[bedrijf]') + ': naam, datum en handtekening', 'Namens James Robinson: naam, datum en handtekening'))
    return ''.join(o)


DOCS = [
    dict(code='04.1', titel='Rekensom', fase=FASE, voor='Intern en klant', wanneer='Voorstel maken, dag 1; aan tafel in het voorstelgesprek',
         wie='Wie het intakegesprek voerde, met de klant',
         lead='Wat mag marketing kosten? Zeven sommen van het doel van de klant naar wat een aanvraag mag kosten, drie toetsen, en één doelregel.',
         body=rekensom()),
    dict(code='04.2', titel='Voorstel', fase=FASE, voor='Klant', concept=True, wanneer='Op het scherm in het voorstelgesprek; als pdf dezelfde dag',
         wie='Opgesteld door wie het intakegesprek voerde',
         lead='Het sjabloon van zes pagina’s: jouw doel, ons plan, en het voorstel dat daarbij hoort. Groen gemarkeerd is wat per klant wordt ingevuld.',
         body=voorstel()),
    dict(code='04.3', titel='Draaiboek voorstelgesprek', fase=FASE, voor='Intern', wanneer='Drie werkdagen na het intakegesprek',
         wie='Dezelfde persoon als in het intakegesprek',
         lead='Van voorstel maken tot besluit: 45 minuten in zeven blokken, wat je vastlegt, en vier bezwaren met vier antwoorden.',
         body=draaiboek()),
    dict(code='04.4', titel='Jouw kant, vijf afspraken', fase=FASE, voor='Klant', concept=True, wanneer='Invullen in het voorstelgesprek',
         wie='De klant en wie het gesprek voert',
         lead='Vijf dingen die wij van jou nodig hebben, met een naam en een termijn. Samen ingevuld aan tafel.',
         body=jouw_kant()),
]
