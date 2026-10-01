# -*- coding: utf-8 -*-
# Stap 02 · De quickscan: invulformulier (intern) en het scanrapport (klant).
from base import *

FASE = 'Fase 1 · Verkopen · Stap 02 · De quickscan'

# De 24 punten: (nr, naam, waarmee, groen, oranje, rood, wie lost het op). Normen exact uit de gids.
QS = [
 ('grp', 'Techniek · kan de klant meten, en is de site in orde'),
 (1, 'Snelheid op mobiel', 'PageSpeed Insights, drie keer, middelste telt', 'LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1', 'Niets slecht, minstens één ertussen', 'LCP > 4 s, INP > 500 ms of CLS > 0,25', 'Webmix: snelheid € 750'),
 (2, 'Beveiliging', 'SSL Labs, met en zonder www', 'A+, A of A−; http stuurt door naar https', 'B of C', 'D–F, T of M, verlopen, niet volledig https', 'Via de hosting'),
 (3, 'Redirects en dode links', 'Screaming Frog (gratis tot 500 pagina’s)', 'Geen dode interne links; omleiding hooguit één stap', '1–3 dode links buiten het kernpad, of ketens van 2–4', 'Meer, een dode link in menu of dienstpagina, keten ≥ 5 of een lus', 'Webmix: redirects € 500'),
 (4, 'E-mailauthenticatie', 'internet.nl en MXToolbox', 'SPF (~all/-all), DMARC op quarantine of reject, DKIM aantoonbaar', 'SPF + DMARC op none, of DKIM niet vast te stellen', 'Geen SPF én geen DKIM, SPF +all of ?all, of geen DMARC', 'Webmix: e-mail € 250'),
 (5, 'Hosting', 'Tijd tot de eerste byte', '≤ 0,8 s: niets doen', '0,8–1,8 s: blijven, met kanttekening', '> 1,8 s: verhuizen adviseren', 'Webmix: hosting € 85 p/m'),
 (6, 'Meting', 'Tag Assistant, netwerkverkeer', 'Eén GA4-code, één paginaweergave per pagina', 'Dubbel geladen, of op een pagina afwezig', 'Geen GA4, of alleen Universal Analytics', 'Fundament'),
 (7, 'Toestemming', 'De browser, zonder iets te klikken', 'Geen marketingtracking vóór toestemming of na weigeren; weigeren even makkelijk', 'Analytics vóór toestemming, niet vast te stellen of dat mag', 'Tracking vóór toestemming of na weigeren; weigeren niet op de eerste laag', 'Webmix: Cookiescript € 150 p/j'),
 (8, 'Platform', 'Wappalyzer of de broncode', 'Er kan een meetcode in', 'Alleen met duurder abonnement of via de beheerder', 'Er kan geen code in: <b>de stopknop</b>', 'Afspraak gaat niet door'),
 (9, 'Vindbaarheid', 'Google site:, robots.txt', 'Homepage en dienstpagina’s gevonden, niets geblokkeerd', 'Een dienstpagina niet gevonden, zonder blokkade', 'Homepage niet gevonden, noindex, of robots.txt blokkeert', 'Fundament'),
 ('grp', 'Het aanvraagpad · wordt een bezoeker een aanvraag'),
 (10, 'Aanvragen op mobiel', 'Eigen telefoon, 390 pixels breed', 'In het eerste scherm, binnen twee tikken, knop ≥ 44 px', 'Pas na scrollen, tikvlak 24–44 px, 6–8 verplichte velden', 'Binnen drie tikken niets, tikvlak < 24 px, formulier werkt niet', 'Fundament: landingspagina'),
 (11, 'Bedankpagina', 'De crawl en de tagconfiguratie. Nooit zelf een aanvraag doen', 'Eigen bedankpagina of specifiek conversie-event', 'Alleen een melding op dezelfde pagina', 'Geen meetcode, of het formulier geeft een fout', 'Fundament'),
 (12, 'Wat verkoop je, meteen', 'Screenshot eerste scherm; twee mensen los van elkaar', 'Wat, aan wie en waar: alle drie', 'Twee van de drie, of alleen uit een slogan', 'Hooguit één', 'Fundament: propositie'),
 ('grp', 'De markt · wat ziet de koper'),
 (13, 'Adverteert de klant al?', 'Ads Transparency Center, Meta Ad Library', 'Ter informatie', '', '', 'Bestaande accounts nemen we over'),
 (14, 'Wie adverteert op de zoekwoorden?', 'Google Ads-voorbeeld, het gebied van de klant, mobiel', 'Ter informatie', '', '', 'Bepaalt de klikprijs, dus de rekensom'),
 (15, 'Wat ziet wie de klant zoekt?', 'Zoeken op bedrijfsnaam', 'Geen concurrent op de naam', 'Wel, maar de klant staat zelf bovenaan', 'Wel, en de klant adverteert zelf niet op de eigen naam', 'Fundament: merkcampagne'),
 (16, 'Bedrijfsprofiel en reviews', 'Google Maps op een telefoon', '≥ 4,5, ≥ 20 reviews, nieuwste ≤ 30 dagen, ≥ 80% beantwoord', '4,0–4,4, of 5–19 reviews, of nieuwste 31–90 dagen', '< 4,0, < 5 reviews, nieuwste > 90 dagen, of geen reacties', 'De klant zelf'),
 ('grp', 'Met AI, de hele site · zodra het portaal het kan'),
 (17, 'Spelling en grammatica', 'Crawler, spellingcontrole, Claude', 'Geen zware fouten, < 0,3 per 1.000 woorden', '0,3–1,0 per 1.000 woorden', 'Een zware fout, of ≥ 1,0 per 1.000', 'Werklijst'),
 (18, 'Titels en beschrijvingen', 'Crawler', '≥ 95% titels, ≥ 90% beschrijvingen, uniek', 'Titels 80–94%, beschrijvingen 60–89%', 'Lager, of homepage zonder titel', 'Werklijst, later SEO'),
 (19, 'Koppen en alt-teksten', 'Crawler', '≥ 95% met H1, geen informatieve afbeelding zonder alt', 'H1 80–94%, 1–10% zonder alt', 'H1 < 80%, > 10% zonder alt', 'Werklijst'),
 (20, 'Interne links', 'Sitemap naast crawl', 'Geen wezen; dienst- en contactpagina’s gelinkt', 'Hooguit 10% wezen, geen dienstpagina', '> 10%, of een dienstpagina is een wees', 'Werklijst'),
 (21, 'Snelheid per soort pagina', 'PageSpeed-koppeling', 'Als punt 1, per soort de slechtste', '', '', 'Onderbouwt punt 1'),
 (22, 'Codes vóór toestemming', 'Geautomatiseerde browser', 'Als punt 7, op meer pagina’s', '', '', 'Onderbouwt punt 7'),
 (23, 'Aanvragen op elke dienstpagina', 'Claude', 'Elke dienstpagina een werkende aanvraagmogelijkheid', '75–99%, of alleen in menu of footer', '< 75%, nergens, of een kapotte link', 'Werklijst'),
 (24, 'De concurrententest', 'Claude, altijd gelabeld als oordeel', 'Twee of meer onderscheidende beweringen boven de vouw', 'Eén op de homepage', 'Geen: de tekst klopt ook met de naam van een concurrent', 'Fundament: propositie'),
]

KL = {'groen': ('Groen', 'var(--green-tx)'), 'oranje': ('Oranje', 'var(--orange-tx)'), 'rood': ('Rood', 'var(--red-tx)')}

def norm(kleur, tekst):
    naam, c = KL[kleur]
    return ('<div class="check" style="border-bottom:none;padding:2pt 0;font-size:8.2pt;line-height:1.35">'
            '<span><b style="color:%s">%s</b><br>%s</span><em></em></div>' % (c, naam, tekst))

def lijnveld(label, breed='22mm'):
    return ('<div style="display:grid;grid-template-columns:%s 1fr;gap:6pt;align-items:end;margin-top:3pt">'
            '<span class="klein">%s</span><i style="display:block;border-bottom:1px solid var(--ln);height:15pt"></i></div>') % (breed, label)

def punt(nr, naam, waarmee, g, o, r, wie):
    label = 'Gebruik:' if g == 'Ter informatie' or wie.startswith('Onderbouwt') else 'Bij rood:' if wie.startswith('Afspraak') else 'Lost op:'
    kop = ('<div style="display:flex;justify-content:space-between;gap:10pt;align-items:baseline">'
           '<div class="q">%s <span class="hulp" style="font-weight:400;margin-left:4pt">%s</span></div>'
           '<div class="klein" style="text-align:right;white-space:nowrap">%s <b style="color:var(--tx)">%s</b></div></div>') % (naam, waarmee, label, wie)
    tweelijn = ('<div style="display:grid;grid-template-columns:1fr 1fr;gap:14pt">%s%s</div>' % (lijnveld('Wat we zagen'), lijnveld('Notitie', '14mm')))
    if g == 'Ter informatie':
        inhoud = '<div class="hulp" style="margin-top:3pt"><b>Ter informatie</b>, zonder kleur. Noteer wat je zag.</div>' + lijnveld('Wat we zagen') + lijnveld('')
    elif not o and not r:
        inhoud = ('<div style="display:flex;gap:16pt;align-items:center;margin-top:4pt"><span class="klein">Norm: %s.</span>'
                  '<div class="opties" style="margin:0">%s</div></div>') % (g, ''.join('<span class="opt">%s</span>' % k for k in ['groen', 'oranje', 'rood', 'n.v.t.'])) + tweelijn
    else:
        inhoud = ('<div class="drie" style="margin-top:3pt;gap:10pt">%s%s%s</div>' % (norm('groen', g), norm('oranje', o), norm('rood', r))
                  + '<div style="display:grid;grid-template-columns:1fr auto;gap:12pt;align-items:end">%s<span class="opt klein">n.v.t. (reden in notitie)</span></div>' % tweelijn)
    return '<div class="vraag" style="padding:6pt 0 7pt"><div class="nr">%s</div><div>%s%s</div></div>' % (nr, kop, inhoud)


# =====================================================================
# 02.1 Quickscan invulformulier (intern)
# =====================================================================
def body_021():
    o = []
    rij = lambda *ls: '<div style="display:flex;gap:14pt">%s</div>' % ''.join('<div style="flex:1">%s</div>' % lijnveld(l, '26mm') for l in ls)
    o.append(rij('Klant en bedrijf', 'Website'))
    o.append(rij('Gebied (vraag 4)', 'Zoektermen'))
    o.append(rij('Datum scan', 'Gedaan door'))
    o.append(rij('Intakegesprek op', 'Tijd besteed'))
    o.append(kader(ul([
        'Nu doe je punt 1 tot en met 16 met de hand: veertien met een kleur, twee ter informatie (13 en 14). Punt 17 tot en met 24 komen erbij zodra het portaal ze met AI kan doen.',
        'Per punt: wat je zag (de meting, bijvoorbeeld “6,1 seconden”), de kleur, en een notitie. Wat tussen groen en rood valt, is oranje. Bestaat een punt uit meer metingen, dan telt de slechtste.',
        '“Niet van toepassing” mag, met een reden. Er is geen totaalcijfer: het advies kiest drie punten.',
        'Eerst alles invullen, dan pas de drie bevindingen. Een advies op een halve scan kiest de verkeerde drie.',
        'Wijkt de scan af van de vragenlijst (de klant schreef dat er op Google wordt geadverteerd en er is niets te vinden), dan is dat een vraag aan tafel. Geen betrapping.',
        '<b>Doe nooit zelf een aanvraag op de site.</b> Dat vervuilt de cijfers van de klant en voelt als een truc als het uitkomt.',
    ]), 'Zo vul je hem in', 'blauw'))
    o.append(kader('<p>Kan er geen meetcode in de site (punt 8), of mag er in de branche van de klant nauwelijks geadverteerd worden, dan gaat de afspraak niet door. Afzeggen met de rode mail “niet meten” (01.3), uiterlijk een werkdag van tevoren. Zonder meting sturen we blind, en dan beginnen we niet.</p>', 'De stopknop', 'rood'))

    kop = ''
    for q in QS:
        if q[0] == 'grp':
            kop = h3(q[1])
            if q[1].startswith('Met AI'):
                kop += p('Nog niet met de hand. Vul in wat het portaal teruggeeft, of laat leeg. Bij deze punten komt naast de kleur een lijst van alles wat fout is; die gaat naar de werklijst, niet op het scanrapport.', 'klein')
            continue
        if kop:
            o.append('<div style="break-inside:avoid">%s%s</div>' % (kop, punt(*q))); kop = ''
        else:
            o.append(punt(*q))

    o.append(p('<b>Waar een grens op rust.</b> Een deel van de normen is officieel (Google, W3C, de wet), een deel komt uit onderzoek of grote branchestudies, en een deel is onze eigen grens omdat er geen bron is: punt 3, 4, 6, 9 tot en met 12, 15 en 17 tot en met 20 deels, en 23 en 24 helemaal. Die eigen grenzen stellen we bij na de eerste twintig tot dertig scans.', 'klein'))

    # ---------- van bevinding naar geld ----------
    o.append(NIEUWE_PAGINA)
    o.append(h2('Van bevinding naar geld'))
    o.append(p('Een bevinding zonder gevolg is een constatering. Het gevolg reken je uit met de getallen uit de vragenlijst, nooit met een branchecijfer dat we niet kunnen onderbouwen. Eén aanvechtbaar cijfer maakt het hele rapport aanvechtbaar.'))
    o.append(tabel(['Bevinding', 'Zo zeg je het gevolg'], [
        ['Geen bedankpagina', '“Je krijgt ongeveer twintig aanvragen per maand, maar geen enkele is aan een bron te koppelen. Adverteer je straks € 1.500 per maand, dan weet je van al dat geld niet wat het opleverde, en kan Google niet leren welke klik een klant werd.”'],
        ['Een concurrent op de naam', '“Wie jou googelt, ziet eerst ' + vv('[concurrent]') + '. Dat zijn mensen die al voor jou kwamen.”'],
        ['Een trage mobiele site', '“Je belangrijkste pagina doet er zes seconden over, Google vindt 2,5 goed. Google rekent de pagina mee in wat je per klik betaalt, dus je betaalt meer voor dezelfde bezoeker.”'],
    ]))
    o.append(h3('Welke drie het worden'))
    o.append(ul([
        'Het raakt wat de klant bij “waar loop je tegenaan” invulde, of het doel van de klant.',
        'Het gevolg is uit te drukken in de eigen getallen van de klant.',
        'Het grootste probleem gaat altijd mee, ook als wij het niet oplossen. Slechte reviews zijn niet ons werk, maar als dat is wat de klant klanten kost, zeggen we het.',
    ]))
    o.append(h3('De getallen uit de vragenlijst'))
    rij2 = lambda *ls: '<div style="display:flex;gap:14pt">%s</div>' % ''.join('<div style="flex:1">%s</div>' % lijnveld(l, '34mm') for l in ls)
    o.append(rij2('Aanvragen per maand', 'Wordt klant (%)'))
    o.append(rij2('Gemiddelde opdracht', 'Maximaal per aanvraag'))
    o.append(rij2('Obstakel (vraag 14)', 'Beginnen (vraag 15)'))
    o.append(h3('De drie bevindingen'))
    o.append(p('Per bevinding: het punt, wat we zagen, en het gevolg in de getallen van de klant. Het grootste probleem zit erbij.', 'klein'))
    for n in (1, 2, 3):
        o.append(vraag(n, 'Punt ______', '', 3))

    o.append(h2('De actielijst: wie lost het op'))
    o.append(p('Alle oranje en rode punten, gegroepeerd op wie het oplost. Staat op de klantkaart zodra de scan compleet is.'))
    o.append(tabel(['Wie lost het op', 'Punten', 'Wat er met de actie gebeurt', 'Wanneer'], [
        [chip('Fundament', 'blauw'), '6, 8 tot en met 15', 'Geen nieuwe taak: het werk zit al in de 76 taken. De bevinding gaat als notitie bij die taak.', 'Na het tekenen'],
        [chip('Webmix', 'oranje'), '1 tot en met 5, en 7', 'De post uit de tarieven, met bedrag, op het scanrapport. Na het tekenen beslist de klant per post: nu, later of niet.', 'Bedrag vóór het tekenen, uitvoering erna'],
        [chip('Klant zelf', 'rood'), '16', 'Op het blad “jouw kant” in het voorstel, met een termijn. Wij lossen het niet op, maar we zeggen het.', 'Voorstelgesprek'],
        [chip('Werklijst', 'groen'), '17 tot en met 24', 'Naar de backlog van de retainer. Niet op het scanrapport.', 'Vanaf maand 4'],
    ]))
    o.append(tabel(['Webmix-post', 'Punt', 'Bedrag'], [
        ['Snelheid in de site zelf', '1', '€ 750 (schatting)'],
        ['Redirects en dode links', '3', '€ 500 (schatting)'],
        ['E-mailauthenticatie', '4', '€ 250 (schatting)'],
        ['Hosting en onderhoud, alleen als de klant overzet; migratie is gratis', '5', '€ 85 p/m'],
        ['Cookiescript', '7', '€ 150 p/j'],
    ], rechts=(2,)))
    o.append(p('Bedragen exclusief btw. Ze gaan in de rekensom van het voorstel van de marketingruimte af: een rode site kan betekenen dat er minder overblijft voor advertenties.', 'klein'))

    o.append(h3('Voorbeeld: een installatiebedrijf met twintig aanvragen per maand'))
    o.append(tabel(['Punt', 'Kleur', 'Wat we zagen', 'Actie'], [
        ('grp', 'Webmix · op het scanrapport met bedrag'),
        ['1 · Snelheid op mobiel', chip('Rood', 'rood'), '6,1 seconden op de dienstpagina', 'Post snelheid, € 750. Klant beslist na het tekenen.'],
        ['4 · E-mailauthenticatie', chip('Oranje', 'oranje'), 'SPF staat, DMARC ontbreekt', 'Post e-mailauthenticatie, € 250.'],
        ('grp', 'Fundament · notitie bij de bestaande taak'),
        ['11 · Bedankpagina', chip('Rood', 'rood'), 'Alleen een melding op dezelfde pagina', 'Bij “formulier en bedankpagina”: eerst dit, anders telt er niets.'],
        ['15 · Wat ziet wie de klant zoekt', chip('Oranje', 'oranje'), 'Een concurrent adverteert op de naam', 'Bij “campagnestructuur”: merkcampagne vanaf dag één.'],
        ('grp', 'Klant zelf · op het blad “jouw kant”'),
        ['16 · Reviews', chip('Rood', 'rood'), '7 reviews, gemiddeld 3,8, geen reacties', 'Na elke opdracht om een review vragen en op elke review reageren. Termijn: drie maanden.'],
    ]))
    o.append(p('De drie voor aan tafel: 11, 15 en 16. Niet 1, al is die rood: snelheid raakt deze klant minder dan dat niet te zien is welke aanvraag waar vandaan komt.'))

    o.append('<div style="break-inside:avoid">')
    o.append(h2('Compleet en vrijgegeven'))
    o.append(checklist([
        'Alle veertien kleurpunten hebben een kleur; 13 en 14 zijn ingevuld. “Niet van toepassing” alleen met een reden.',
        'De stopknop staat niet op rood. Staat hij wel op rood: geen advies, de afzegmail “niet meten” gaat weg.',
        'Drie bevindingen gekozen, elk met het gevolg in de getallen van de klant.',
        'Het scanrapport (02.2) ingevuld: veertien kleuren, drie bevindingen, de Webmix-posten met bedrag.',
        'Nagelezen en vrijgegeven, uiterlijk één werkdag vóór het intakegesprek. Pas dan gaat het scanrapport naar de klant.',
    ]))
    o.append(handtekening('Vrijgegeven door', 'Datum en tijd'))
    o.append('</div>')
    return ''.join(o)


# =====================================================================
# 02.2 Scanrapport (klant)
# =====================================================================
RAPPORT = [
 ('1', 'Snelheid op mobiel', 'Hoe snel je pagina’s laden op een telefoon'),
 ('2', 'Beveiliging', 'Of je site overal veilig verbindt (https)'),
 ('3', 'Redirects en dode links', 'Of elke link op je site ergens uitkomt'),
 ('4', 'E-mailauthenticatie', 'Of mail van jouw domein als echt wordt herkend'),
 ('5', 'Hosting', 'Hoe snel je server antwoordt'),
 ('6', 'Meting', 'Of bezoek op je site goed wordt geteld'),
 ('7', 'Toestemming', 'Of je cookiemelding doet wat de wet vraagt'),
 ('8', 'Platform', 'Of er een meetcode in je site kan'),
 ('9', 'Vindbaarheid', 'Of Google je homepage en dienstpagina’s vindt'),
 ('10', 'Aanvragen op mobiel', 'Of iemand op een telefoon snel een aanvraag kan doen'),
 ('11', 'Bedankpagina', 'Of een aanvraag te meten is'),
 ('12', 'Wat verkoop je, meteen', 'Of iemand direct ziet wat je doet, voor wie en waar'),
 ('15', 'Wat ziet wie je zoekt', 'Wat iemand ziet die op je bedrijfsnaam zoekt'),
 ('16', 'Bedrijfsprofiel en reviews', 'Je score, het aantal reviews en of je reageert'),
]

def H3(t): return '<h3 style="margin:7pt 0 3pt">%s</h3>' % t

def body_022():
    o = []

    o.append(H3('Drie dingen die opvielen'))
    vak = lambda n: ('<div style="border:1px solid var(--ln);border-radius:6pt;padding:5pt 8pt;height:100%%"><div>'
                     '<span style="font-family:var(--fd);font-weight:700;font-size:12pt;color:var(--blue);margin-right:6pt">%d</span><span class="klein">punt %s</span></div>'
                     '<p style="margin:1pt 0 3pt"><b>%s</b></p><p style="margin:0;font-size:8.6pt">%s</p></div>') % (
                         n, vv('[nr]'), vv('[Wat we zagen, in één zin]'), vv('[Wat het je kost, in jouw getallen]'))
    o.append(drie(vak(1), vak(2), vak(3)))

    o.append(H3('De veertien punten <span class="klein" style="font-family:var(--ft);font-weight:400;margin-left:6pt">Elke kleur volgt uit een vaste norm. Groen haalt de norm, rood niet, oranje zit ertussen.</span>'))
    box = '<span class="opt"></span>'
    rows = [['<b>%s · %s</b>' % (nr, naam), '<span class="sub">%s</span>' % uitleg, box, box, box, vv('[meting]')] for nr, naam, uitleg in RAPPORT]
    t = tabel(['Punt', 'Waar het om gaat', chip('G', 'groen'), chip('O', 'oranje'), chip('R', 'rood'), 'Meting'], rows)
    t = (t.replace('<table>', '<table style="font-size:8.2pt;margin-bottom:6pt"><colgroup><col style="width:29%"><col style="width:45%"><col style="width:4.5%"><col style="width:4.5%"><col style="width:4.5%"><col></colgroup>')
          .replace('<td>', '<td style="padding:2pt 5pt">').replace('<th>', '<th style="padding:2pt 5pt">'))
    o.append(t)

    o.append(twee(
        H3('Herstel vóór de start') + tabel(['Punt', 'Post', 'Bedrag'], [[vv('[nr]'), vv('[post uit de tarieven]'), vv('€ […]')]] * 3, rechts=(2,)).replace('<td>', '<td style="padding:3pt 5pt">')
        + p('Excl. btw. Webmix doet het na het tekenen; jij beslist per post.', 'klein'),
        H3('Wie op jouw zoekwoorden adverteert') + p(vv('[concurrenten uit de quickscan]'), '')
        + H3('Wat we niet konden zien') + p('We keken van buitenaf, zonder toegang. Back-ups, updates en of je conversies goed staan, zien we pas in het fundament. Groen is dus geen garantie.', 'klein')
        + p('Dit rapport is van jou, ook als je niet met ons verdergaat. Vragen? support@jamesrobinson.nl of 045&nbsp;792&nbsp;0009.', 'klein')))
    return ''.join(o)


DOCS = [
    dict(code='02.1', titel='Quickscan invulformulier', fase=FASE, voor='Intern', wanneer='Zodra de afspraak geboekt is; klaar één werkdag vóór het intakegesprek', wie='Vaste medewerker; een half uur, de eerste tien keer een uur',
         lead='De 24 punten met hun normen, om per punt de meting, de kleur en een notitie in te vullen. Daarna de drie bevindingen met hun gevolg in geld, en wie wat oplost.',
         body=body_021()),
    dict(code='02.2', titel='Scanrapport', fase=FASE, voor='Klant', wanneer='Bij het intakegesprek', wie='James Robinson',
         lead='Voor ' + vv('[bedrijfsnaam]') + '. Wat we op ' + vv('[datum]') + ' zagen op ' + vv('[website]') + ' en in je markt, vóór ons gesprek.',
         body=body_022(), concept=True),
]
