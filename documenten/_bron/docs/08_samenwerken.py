# -*- coding: utf-8 -*-
# Stap 08 · Live en het maandritme. Bron: gids part2d (stap 08), part1 (tarieven, ritme), part2b (rekensom), part2c (kick-offmail, dashboard).
from base import *

FASE = 'Fase 3 · Samenwerken · Stap 08 · Live en het maandritme'


# ---------- kleine helpers op bestaande klassen ----------
def leeg(h=20):
    return '<div style="height:%dpt"></div>' % h

def hok(t=''):
    return '<span class="opt">%s</span>' % t

def keuze(*opties):
    return '<span class="opties" style="margin-top:0">%s</span>' % ''.join(hok(o) for o in opties)

def grijs(t):
    return '<span class="klein">%s</span>' % t

def itabel(kop, rijen, breedtes=None, hoogte=20, rechts=()):
    """Invultabel: lege cellen ('') krijgen schrijfruimte. ('grp', tekst) voor een groepsregel."""
    n = len(kop)
    cg = ''
    if breedtes:
        cg = '<colgroup>%s</colgroup>' % ''.join('<col style="width:%s">' % b for b in breedtes)
    th = ''.join('<th%s>%s</th>' % (' class="r"' if i in rechts else '', k) for i, k in enumerate(kop))
    out = []
    for r in rijen:
        if isinstance(r, tuple) and r[0] == 'grp':
            out.append('<tr class="grp"><td colspan="%d">%s</td></tr>' % (n, r[1])); continue
        cellen = []
        for i, c in enumerate(r):
            inhoud = leeg(hoogte) if c == '' else c
            cellen.append('<td%s>%s</td>' % (' class="r"' if i in rechts else '', inhoud))
        out.append('<tr>%s</tr>' % ''.join(cellen))
    stijl = ' style="table-layout:fixed"' if breedtes else ''
    return '<table%s>%s<thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (stijl, cg, th, ''.join(out))

def lijnen(n):
    return '<div class="regels">%s</div>' % ('<div class="regel"></div>' * n)

def geheel(t):
    """Houdt een blok bij elkaar op één pagina."""
    return '<div style="break-inside:avoid">%s</div>' % t


# ---------- gedeelde inhoud uit de gids ----------
OORZAKEN = [
 # nr, naam, waar, wat je ziet, wat eraan te doen is, van wie, wat we vooraf zeggen
 ('01', 'Het budget is te klein voor het doel', 'Bereik', 'Kosten per aanvraag op of onder doel, aantal eronder, budget elke dag op, platform meldt beperking door budget', 'Budget naar wat de rekensom zegt; of doel omlaag; of langere terugverdientijd; of herverdelen naar het beste kanaal', 'Klant (kost geld)', 'Het beste slechte nieuws: de machine werkt, hij draait te langzaam. Daarom zeggen we vooraf dat we kunnen adviseren het budget te verhogen.'),
 ('02', 'De markt is te klein voor dit budget', 'Bereik', 'Frequentie loopt op, bereik vlakt af, kosten per duizend stijgen, kosten per aanvraag lopen langzaam op', 'Gebied of doelgroep verbreden, tweede kanaal, aangrenzend aanbod, of juist minder budget', 'Wij', 'Er is een plafond en we weten vooraf niet waar het ligt. Raken we het, dan zeggen we het, ook als dat minder uitgeven betekent.'),
 ('03', 'Seizoen', 'Bereik', 'De dip valt samen met de jaarlijkse dip van de klant; doorklik en conversie normaal, alleen volume zakt', 'Budget over het jaar verdelen, in het dal merk en e-maillijst opbouwen, maandnormen', 'Wij', 'We spreken normen per maand af, geen jaargemiddelde. Daarom vragen we vooraf hoe het seizoen van de klant loopt.'),
 ('04', 'De advertentie werkt niet', 'Weergaven → bezoekers', 'Kosten per duizend normaal, doorklikratio onder norm over meerdere varianten en doelgroepen', 'Nieuwe hoeken, ander beeld, video, het aanbod naar de eerste seconde, draaidag naar voren', 'Wij', 'De snelste en goedkoopste knop, en hij is van ons. Binnen twee weken zichtbaar, en het zit in de retainer.'),
 ('05', 'De landingspagina werkt niet', 'Bezoekers → aanvragen', 'Doorklik op orde, paginaconversie laag bij één variant, hoge uitstap, formulieren half ingevuld', 'Korter, belofte naar boven, formulier korter, bewijs toevoegen, laadtijd, pagina per doelgroep', 'Wij', 'Hier zeggen we niets over vóór duizend kliks op de pagina. Daaronder is elk verschil ruis.'),
 ('06', 'Het aanbod is niet scherp genoeg', 'Bezoekers → aanvragen', 'Advertentie werkt, pagina is snel, conversie blijft laag over alle varianten; concurrent heeft lagere drempel of prijs', 'Instapaanbod, prijs of voorwaarden, garantie, kleinere eerste stap, ander bewijs', 'Klant', 'Dit kunnen wij niet voor de klant oplossen. Wel meten en melden; de beslissing over het aanbod is van de klant.'),
 ('07', 'Te weinig merk en autoriteit', 'Bezoekers → aanvragen', 'Warme doelgroepen converteren, koude niet; na de advertentie zoeken mensen de naam van de klant en vinden weinig', 'Reviews verzamelen, bewijs zichtbaar maken, bedrijfsprofiel, merkcampagne, langere aanloop', 'Klant', 'De traagste van de tien: geen knop werkt binnen een maand. Daarom kijken we in de quickscan naar reviews en profiel.'),
 ('08', 'Aanvragen te laat of niet opgevolgd', 'Aanvragen → klanten', 'Aanvragen en kosten op doel, klanten blijven achter, opvolgtijd loopt op of is onbekend', 'Opvolgtermijn afspreken en meten, vervanger, automatische bevestiging, afsprakenplanner, belscript', 'Klant', 'De meest voorkomende oorzaak, en de goedkoopste om op te lossen. We meten de opvolgtijd vanaf dag één.'),
 ('09', 'Aanvragen van slechte kwaliteit', 'Aanvragen → klanten', 'Veel en goedkoop, weinig klanten, aanvragen passen niet, geen terugkoppeling', 'Oordeel per aanvraag, kwalificatievragen, doelgroep aanscherpen, waardegericht bieden, prijs noemen om te filteren', 'Samen', 'Zonder oordeel per aanvraag kunnen we alleen op aantal sturen. Daarom de belangrijkste afspraak van de kant van de klant.'),
 ('10', 'De meting klopt niet', 'Alles', 'De telling van de klant en ons dashboard lopen uiteen, conversies verdwijnen na een wijziging, knik zonder oorzaak', 'Meetopzet herstellen, consent nalopen, server-side meten, offline conversies, hosting', 'Wij', 'Het ergste van de tien, want het maakt de andere negen onbetrouwbaar. Daarom blokkeren nulmeting en meetopzet de start.'),
]
SCHAKELS = ['Bereik', 'Weergaven → bezoekers', 'Bezoekers → aanvragen', 'Aanvragen → klanten', 'Alles']

ZEGGEN = tabel(['Conversies per variant', 'Onzekerheid op één getal', 'Kleinste verschil (95%)', 'Wat je ermee kunt'], [
 ['30', '± 18%', '72%', 'Je weet ongeveer hoeveel. Twee varianten uit elkaar houden lukt niet.'],
 ['100', '± 10%', '40%', 'Een groot verschil wordt zichtbaar.'],
 ['200', '± 7%', '28%', 'Genoeg voor stoppen of doorgaan met een variant.'],
 ['400', '± 5%', '20%', 'Een verschil van een vijfde. Zelden binnen een jaar.'],
 ['1.000', '± 3%', '13%', 'Kleine verschillen. Alleen bij hoge volumes.'],
], rechts=(1, 2))

RITME = tabel(['Wanneer', 'Wat', 'Starter', 'Playmaker', 'Captain', 'Champion'], [
 ['Dagelijks', 'Alleen de eerste week na livegang: uitgaven, afkeuringen, eerste aanvragen', '●', '●', '●', '●'],
 ['Wekelijks', 'Bijsturen op kosten per aanvraag: budgetten, biedingen, uitsluitingen. Zonder overleg, tenzij er iets is.', '●', '●', '●', '●'],
 ['Maandelijks', 'De maandupdate in het dashboard, vóór de 5e werkdag', '●', '●', '●', '●'],
 ['Contentronde', 'Een nieuwe set advertenties om tegen de lopende te testen', '1× per kwartaal', '1× per twee maanden', '1× per maand', '2× per maand'],
 ['Draaidag', 'Nieuw beeld, want advertenties slijten', '1× per jaar', '2× per jaar', '3× per jaar', '4× per jaar'],
 ['Performance Review', 'Een uur over resultaat, vast stramien, op kantoor of online; bevestigd per mail', 'elk kwartaal', 'elke twee maanden', 'maandelijks', 'maandelijks'],
 ['Vragen en verzoeken', 'Via support@, antwoord binnen één werkdag', '●', '●', '●', '●'],
])

PR_FREQ = 'Starter elk kwartaal, Playmaker elke twee maanden, Captain en Champion maandelijks. Sub: de eerste na drie maanden, daarna elk halfjaar.'


# ======================================================================
# 08.1 Livegang
# ======================================================================
def livegang():
    o = []
    o.append(velden(['Klant en bedrijf', 'Datum livegang', 'Live-datum (dag 19)', 'Namens James Robinson']))
    o.append(kader('<p>Je doet hem met de directeur en niet met degene die belt. Dan is de afspraak gemaakt met iemand die hem niet uitvoert. Nodig de mensen uit die de aanvragen echt opvolgen, en hun vervanger.</p>', 'Waar het misgaat', 'rood'))

    o.append(h2('Vooraf'))
    o.append(checklist([
        ('Agenda en rolverdeling klaar: wie van ons leidt, wie doet de testaanvraag', 'klantcontact · 0,5 u'),
        ('Uitgenodigd: wie de aanvragen opvolgt, de vervanger, en de beslisser', 'klantcontact'),
        ('De afspraak uit het voorstel bij de hand: opvolging binnen welke tijd, door wie', 'klantcontact'),
        ('Iedereen die opvolgt heeft een login voor het marketingdashboard', 'techniek'),
        ('In het dashboard staat wie de meldingen en de weekmail krijgt', 'techniek'),
        ('De klant heeft de complete campagne gezien en de ene ronde feedback gegeven (dag 17)', 'klantcontact'),
    ]))

    o.append(h2('De agenda'))
    o.append(p('Een uur, met het team dat de aanvragen opvolgt. Na afloop staat op papier wie belt, binnen hoeveel tijd, en wat er gebeurt als diegene er niet is.'))
    o.append(tabel(['', 'Onderwerp', 'Wie'], [
        ['1', '<b>Wat er op dag 19 aangaat.</b> De campagne, de advertenties uit de draaidag en de landingspagina. Wat een bezoeker ziet en invult, van advertentie tot bedankpagina.', 'Wij'],
        ['2', '<b>Waar een aanvraag landt.</b> In het marketingdashboard. Bij elke nieuwe aanvraag gaat direct een melding uit, per mail of WhatsApp, met twee knoppen: goede aanvraag of niet. Eén klik, zonder inlog. Op maandag de weekmail als er aanvragen op een oordeel wachten; daar en in het dashboard staat ook de derde knop: klant geworden.', 'Wij'],
        ['3', '<b>Wie belt, en binnen hoeveel tijd.</b> De afspraak uit het voorstel, nu met de mensen die hem uitvoeren. Een aanvraag die twee dagen blijft liggen, is vaak al bij een ander. We meten de opvolgtijd vanaf dag één.', 'Samen'],
        ['4', '<b>Als diegene er niet is.</b> Wie neemt het over bij vakantie, ziekte of een volle dag, en hoe weet die persoon dat er een aanvraag ligt?', 'Samen'],
        ['5', '<b>Wat we van het team verwachten.</b> Per aanvraag een oordeel: goed of niet, en bij niet goed een reden uit zes. Later: welke aanvraag klant werd. Zonder oordeel kunnen we alleen op aantal sturen, niet op kwaliteit.', 'Wij'],
        ['6', '<b>De eerste weken.</b> De eerste week kijken we elke dag mee en grijpen we alleen in bij iets wat aantoonbaar fout staat. Komt de eerste aanvraag binnen, dan bellen wij. In de eerste maand kost een aanvraag twee tot drie keer het doelbedrag: dat is de leerfase. De curve moet omlaag lopen.', 'Wij'],
        ['7', '<b>De testaanvraag.</b> Samen een aanvraag doen en volgen door de hele keten, tot de melding op de telefoon van wie belt. De checklist staat verderop.', 'Samen'],
    ]))
    o.append(geheel(h2('Op papier: wie belt') + p('Invullen tijdens de livegang. Een kopie gaat naar de klant, het origineel op de klantkaart.') +
    itabel(['', 'Naam', 'Telefoon of mail', 'Opmerking'], [
        ['<b>Belt elke aanvraag terug</b>', '', '', ''],
        ['<b>Binnen hoeveel tijd</b>', '', '', ''],
        ['<b>Vervanger bij vakantie of ziekte</b>', '', '', ''],
        ['<b>Krijgt de meldingen</b> ' + grijs('mail of WhatsApp'), '', '', ''],
        ['<b>Geeft het oordeel per aanvraag</b>', '', '', ''],
        ['<b>Zet “klant geworden”</b>', '', '', ''],
        ['<b>Krijgt de weekmail</b> ' + grijs('op maandag'), '', '', ''],
    ], breedtes=['30%', '24%', '24%', '22%'], hoogte=22) +
    vraag('', 'Wat gebeurt er met een aanvraag buiten werktijd of in het weekend?', '', 2) +
    handtekening('Namens de klant: naam, datum en handtekening', 'Namens James Robinson: naam, datum en handtekening')))

    o.append(NIEUWE_PAGINA)
    o.append(h2('De testaanvraag door de hele keten'))
    o.append(p('De keten breekt meestal verderop dan het formulier: in de melding die niet aankomt, of de conversie die niet vuurt. Test daarom alle zes de punten. Wat niet groen is: oplossen en opnieuw testen. <b>Klaar als de tweede test groen is op alle zes de punten.</b>'))
    ok = hok('')
    o.append(itabel(['Punt', 'Wat je moet zien', 'Test 1 groen', 'Test 2 groen'], [
        ['<b>1 · Advertentie</b>', 'De advertentie staat er, en een klik komt op de juiste landingspagina', ok, ok],
        ['<b>2 · Pagina</b>', 'De landingspagina laadt, ook op een telefoon, met de cookiebanner', ok, ok],
        ['<b>3 · Formulier</b>', 'Verzenden lukt, de bedankpagina verschijnt en de conversie vuurt, in Google Ads en in Meta', ok, ok],
        ['<b>4 · Dashboard</b>', 'De aanvraag staat in het dashboard, met de herkomst erbij: kanaal, campagne, advertentie, pagina', ok, ok],
        ['<b>5 · Melding</b>', 'De meldingsmail met de twee knoppen komt aan bij wie belt, en het oordeel komt terug in het dashboard', ok, ok],
        ['<b>6 · Bevestiging</b>', 'Wie de aanvraag deed, krijgt de automatische bevestiging', ok, ok],
    ], breedtes=['18%', '58%', '12%', '12%'], hoogte=18))
    o.append(vraag('', 'Wat bij de eerste test niet goed ging, en wat we deden', 'Per punt: wat, wie lost het op, en wanneer de tweede test is.', 4))
    o.append(velden(['Tweede test groen op', 'Getest door']))

    o.append(kader(ul([
        '<b>Dag 19:</b> aanzetten, en dezelfde dag het live-bericht (08.2).',
        '<b>Dag 19 tot 26:</b> elke dag uitgaven, afkeuringen en de eerste aanvragen. Kijken en noteren; alleen ingrijpen bij iets wat aantoonbaar fout staat, want elke wijziging zet de leerfase terug (08.8).',
        '<b>De eerste aanvraag:</b> wij bellen de klant, niet mailen. Het kost vijf minuten, en het is het verschil tussen een leverancier en een partner.',
        '<b>Dag 26:</b> de eerste cijfers. Nog geen conclusies, wel de richting.',
        '<b>Na twee weken:</b> de eerste bijstelling, en uitleggen wat we bijstelden en waarom.',
    ]), 'Na de livegang', 'lime'))
    return ''.join(o)


# ======================================================================
# 08.2 Live-bericht
# ======================================================================
def live_bericht():
    o = []
    body = (
        '<p>Hoi %s,</p>' % vv('[voornaam]') +
        '<p>Vanaf vandaag staat je campagne aan.</p>'
        '<p><b>Dit staat er nu:</b></p>'
        '<ul><li>%s, op %s, met de advertenties uit de draaidag.</li><li>Je landingspagina: %s.</li></ul>' % (vv('[campagne: aanbod en doelgroep]'), vv('[Google en Meta]'), vv('[adres]')) +
        '<p><b>Hier komen je aanvragen binnen:</b> in je marketingdashboard, %s. Bij elke nieuwe aanvraag krijgt %s direct een melding met twee knoppen: goede aanvraag of niet. Eén klik is genoeg. Zo zien we allebei welke aanvragen iets waard zijn.</p>' % (vv('[link]'), vv('[naam]')) +
        '<p>Zoals we bij de livegang afspraken: %s belt elke aanvraag binnen %s terug, en %s neemt het over als %s er niet is.</p>' % (vv('[naam]'), vv('[tijd]'), vv('[naam vervanger]'), vv('[naam]')) +
        '<p><b>Dit doen we de komende twee weken:</b></p>'
        '<ul><li><b>Deze week</b> kijken we elke dag mee: wat er wordt uitgegeven, of er advertenties worden afgekeurd, en de eerste aanvragen. We grijpen alleen in als iets aantoonbaar fout staat. Elke wijziging zet de campagne weer terug in de leerfase.</li>'
        '<li><b>Je eerste aanvraag:</b> komt die binnen, dan bel ik je.</li>'
        '<li><b>Op %s</b> zie je de eerste cijfers. Nog geen conclusies, wel de richting.</li>' % vv('[datum dag 26]') +
        '<li><b>Rond %s</b> stellen we voor het eerst bij. Je hoort van ons wat we veranderden en waarom.</li></ul>' % vv('[datum, na twee weken]') +
        '<p>Eén ding vooraf, zoals in het voorstel: in de eerste maand kost een aanvraag twee tot drie keer het doelbedrag. Dat is de leerfase. De kosten moeten omlaag lopen; het niveau van deze maand zegt nog niets. Je doel geldt vanaf maand 4: %s.</p>' % vv('[doelregel]') +
        '<p>Vragen? Mail ons via support@jamesrobinson.nl, dan heb je binnen één werkdag antwoord. Is er iets dringends, bijvoorbeeld je pagina ligt eruit, bel dan naar kantoor: 045 792 0009.</p>'
        '<p>Groet, %s</p>' % vv('[naam]'))
    o.append(mail('Dag 19 · de dag van livegang · vanaf support@', 'Je campagne staat live', body))
    o.append(kader('<p>Op de dag dat de campagne aangaat, vanaf support@jamesrobinson.nl, ondertekend door de marketingmanager. Drie dingen, in deze volgorde: dit staat er nu, hier komen je aanvragen binnen, dit doen we de komende twee weken. Vul de groene plekken in met wat op de klantkaart en op het blad van de livegang (08.1) staat. Verder niets toevoegen: geen uitleg over de techniek, geen lijst van wat we deden.</p>', 'Zo gebruik je deze mail', 'blauw'))
    o.append(h2('Voordat je op verzenden drukt'))
    o.append(checklist([
        ('De campagne staat echt aan, op alle kanalen uit het plan', 'campagne'),
        ('De testaanvraag is bij de tweede test groen op alle zes de punten (08.1)', 'techniek'),
        ('Naam, tijd en vervanger komen letterlijk van het blad van de livegang', 'marketingmanager'),
        ('De doelregel komt letterlijk uit het voorstel', 'marketingmanager'),
        ('De datums van dag 26 en van de eerste bijstelling staan in ClickUp', 'marketingmanager'),
        ('Verzonden vanaf support@, niet vanaf een persoonlijk adres', 'marketingmanager'),
    ]))
    o.append(velden(['Klant', 'Verzonden op', 'Door']))
    return ''.join(o)


# ======================================================================
# 08.3 Maandupdate
# ======================================================================
def maandupdate():
    o = []
    o.append(kader('<p>Het vaste contact met elke klant, elke maand, ook in de maanden zonder Performance Review. Zo kaal mogelijk, maar zonder dat de klant iets hoeft te raden. Bovenaan zet het dashboard automatisch de getallen; daaronder schrijf jij drie korte antwoorden, elk een paar zinnen. Wijkt een getal af, vul dan eerst het diagnoseformulier (08.4) in.</p>', 'Zo gebruik je dit sjabloon', 'blauw'))
    o.append(velden(['Klant', 'Maand', 'Doelregel uit het voorstel', 'Geschreven door']))
    o.append(h2('De getallen'))
    o.append(p('De vier ketengetallen en de kosten per aanvraag, tegen de doelregel en tegen vorige maand.', 'klein'))
    o.append(itabel(['', 'Deze maand', 'Doelregel', 'Vorige maand', 'Verschil'], [
        ['<b>Weergaven</b>', '', '', '', ''],
        ['<b>Bezoekers</b><br>' + grijs('doorklikratio'), '', '', '', ''],
        ['<b>Aanvragen</b><br>' + grijs('conversieratio'), '', '', '', ''],
        ['<b>Klanten</b><br>' + grijs('scoringsratio'), '', '', '', ''],
        ['<b>Kosten per aanvraag</b>', '', '', '', ''],
    ], breedtes=['24%', '19%', '19%', '19%', '19%'], hoogte=26))
    o.append(kader('<p>De doelregel geldt vanaf maand 4. In maand 1 tot en met 3 schrijf je de richting: de kosten per aanvraag moeten omlaag lopen. In de eerste maand kost een aanvraag twee tot drie keer het doelbedrag.</p>', 'Maand 1 tot en met 3', 'grijs'))
    o.append(h2('Drie korte antwoorden'))
    o.append(vraag('1', 'Zitten we op de doelregel?', 'Ja of nee, met het getal.', 3, ['ja', 'nee']))
    o.append(vraag('2', 'Wat deden we?', 'De belangrijkste bijstellingen en waarom. Geen urenlijst.', 6))
    o.append(vraag('3', 'Wat doen we nu?', 'Het plan voor de komende maand, uit het diagnoseformulier (08.4).', 6))
    o.append(h3('Voordat hij in het dashboard staat'))
    o.append(checklist([
        ('Vóór de 5e werkdag van de maand', ''),
        ('Elk antwoord een paar zinnen, in de taal van de klant', ''),
        ('Bij een afwijking: diagnoseformulier ingevuld, en antwoord 3 komt daaruit', ''),
        ('In een maand met Performance Review: hetzelfde plan als in het verslag', ''),
    ]))
    return ''.join(o)


# ======================================================================
# 08.4 Diagnoseformulier
# ======================================================================
def diagnose():
    o = []
    o.append(kader('<p>Drie vragen, in deze volgorde. Ga pas door naar de volgende als de vorige beantwoord is. Wat eruit komt, is letterlijk het blok diagnose en plan in de Performance Review en antwoord 3 in de maandupdate. De marketingmanager stelt de diagnose zelf. <b>Twijfel je, vraag dan Jim Kikken of Jim Coumans om een second opinion.</b> De tien oorzaken en de tabel “wanneer mag je iets zeggen” staan achterin.</p>', 'Zo gebruik je dit formulier', 'blauw'))
    o.append(velden(['Klant', 'Periode', 'Ingevuld door en datum']))
    o.append('<div class="veld"><span>Aanleiding</span><div>%s</div></div>' % keuze('Performance Review', 'dagmail', 'maandupdate', 'anders: ________'))

    # vraag 1
    o.append(h2('1 · Waar zit de bottleneck?'))
    o.append(kader('<p>Altijd eerst: klopt de meting? Zo niet, dan stopt het formulier hier, want dan is elk ander antwoord een gok. Herstel de meting (oorzaak 10) en begin opnieuw.</p>' +
        itabel(['Wat je controleert', 'Klopt'], [
            ['De telling van de klant en ons dashboard lopen gelijk op', keuze('ja', 'nee')],
            ['Op elke dag met verkeer kwamen er conversies binnen', keuze('ja', 'nee')],
            ['Geen knik zonder oorzaak, ook niet na een wijziging aan site of campagne', keuze('ja', 'nee')],
            ['Dashboard en advertentieplatform tellen ongeveer hetzelfde aantal aanvragen', keuze('ja', 'nee')],
        ], breedtes=['72%', '28%']), 'Eerst de meting', 'oranje'))
    o.append(geheel(p('Zet de keten naast elkaar, elk tegen het doel en tegen de vorige periode. De bottleneck is de eerste schakel die afwijkt.') +
      itabel(['Schakel', 'Deze periode', 'Doel', 'Vorige periode', 'Wijkt af'], [
        ['<b>Weergaven</b><br>' + grijs('en kosten per duizend'), '', '', '', keuze('ja', 'nee')],
        ['<b>Bezoekers</b><br>' + grijs('doorklikratio'), '', '', '', keuze('ja', 'nee')],
        ['<b>Aanvragen</b><br>' + grijs('conversieratio'), '', '', '', keuze('ja', 'nee')],
        ['<b>Klanten</b><br>' + grijs('scoringsratio'), '', '', '', keuze('ja', 'nee')],
        ['<b>Kosten per aanvraag</b>', '', '', '', keuze('ja', 'nee')],
    ], breedtes=['22%', '18%', '18%', '18%', '24%'], hoogte=24) +
      '<div class="veld"><span><b>De bottleneck</b></span><div>%s</div></div>' % keuze('bereik', 'weergaven → bezoekers', 'bezoekers → aanvragen', 'aanvragen → klanten')))

    # vraag 2
    o.append(h2('2 · Wat is de oorzaak? Door uitsluiting'))
    o.append(p('Neem de oorzaken in de schakel van vraag 1. Schrijf per oorzaak op wat je ziet, en zet het naast wat je zou zien als dit het is. Streep weg wat niet klopt, tot er één overblijft, hooguit twee. Oorzaak 10 heb je bij vraag 1 al gehad.'))
    rijen = []
    for s in SCHAKELS[:4]:
        rijen.append(('grp', s))
        for nr, naam, waar, ziet, *_ in OORZAKEN:
            if waar == s:
                rijen.append(['<b>%s · %s</b>' % (nr, naam), '<span class="klein">%s</span>' % ziet, '', keuze('ja', 'nee')])
    o.append(itabel(['Oorzaak', 'Wat je zou zien als dit het is', 'Wat je ziet', 'Uitgesloten'], rijen, breedtes=['21%', '31%', '32%', '16%'], hoogte=40))
    o.append(geheel(h3('Wat overblijft') + velden(['Oorzaak 1', 'Oorzaak 2 (alleen als het er echt twee zijn)']) + vraag('', 'Zijn er genoeg aanvragen om iets te mogen zeggen?', 'Bij n conversies is de onzekerheid op één getal ongeveer 1 ÷ √n. Kijk achterin. Te weinig: dan is het een vermoeden, en zo noem je het ook.', 1, ['ja', 'nee, het is een vermoeden', 'aantal conversies: ____'])))

    # vraag 3
    o.append(h2('3 · Wat is ons plan?'))
    o.append(p('Eén ingreep, hooguit twee tegelijk, anders weet je niet wat werkte.'))
    def cel(opties=None, n=0):
        out = ''
        if opties: out += keuze(*opties)
        if n: out += lijnen(n)
        return out
    o.append(itabel(['', 'Ingreep 1', 'Ingreep 2 ' + grijs('alleen als het er echt twee zijn')], [
        ['<b>Wat we doen</b>', cel(n=3), cel(n=3)],
        ['<b>Van wie het is</b>', cel(['wij', 'de klant', 'samen']), cel(['wij', 'de klant', 'samen'])],
        ['<b>Wat het kost</b>', cel(['in de retainer', 'prijs vooraf: € _____']), cel(['in de retainer', 'prijs vooraf: € _____'])],
        ['<b>Wanneer we het effect meten</b>', cel(n=1), cel(n=1)],
        ['<b>Waaraan we zien dat het werkt</b><br>' + grijs('welk getal, van hoeveel naar hoeveel'), cel(n=2), cel(n=2)],
    ], breedtes=['24%', '38%', '38%']))
    o.append(h3('Voorbeelden van wat er uit kan komen'))
    o.append(p('Geen volgorde, wel een idee van de knoppen.', 'klein'))
    o.append(tabel(['Wat de cijfers laten zien', 'Wat eruit kan komen', 'Waarom'], [
        ['Veel kliks, weinig aanvragen', 'CRO: pagina, formulier, bewijs', 'Zelfde budget, meer aanvragen. Een procentpunt conversie is meer waard dan duizend euro budget.'],
        ['Er is een lijst met adressen, en klanten kunnen terugkomen', 'E-mail en automation', 'Hogere klantwaarde, dus meer ruimte per aanvraag, zonder extra mediabudget'],
        ['Duidelijk welke zoekwoorden klanten opleveren, en tegen welke prijs', 'SEO op precies die woorden', 'Een deel van het verkeer hoeft niet meer gekocht te worden'],
        ['Weinig kliks op veel weergaven', 'Advertenties: nieuwe hoeken en nieuwe content', 'De snelste en goedkoopste knop'],
        ['De doelgroep zit ook op LinkedIn of TikTok, of Bing levert goedkopere kliks', 'Een kanaal erbij', 'Meer bereik bij dezelfde koper, of dezelfde koper goedkoper'],
        ['Kosten per aanvraag op doel, aantal niet', 'Budget opschalen', 'Meer budget bij dezelfde kosten per aanvraag is de makkelijkste groei die er is'],
    ]))
    o.append(h3('Second opinion'))
    o.append(velden(['Gevraagd aan', 'Datum']))
    o.append(vraag('', 'Wat er na de second opinion veranderde', '', 2, ['Jim Kikken', 'Jim Coumans', 'niet nodig']))

    # naslag
    o.append(NIEUWE_PAGINA)
    o.append(h2('Naslag · Wanneer mag je iets zeggen?'))
    o.append(p('Bij <i style="font-style:normal">n</i> conversies is de onzekerheid op dat ene getal ongeveer 1 ÷ √n. Twee varianten uit elkaar houden is veel strenger: het kleinste aantoonbare verschil is ongeveer 2,8 × √(2 ÷ n).'))
    o.append(ZEGGEN)
    o.append(p('Bij 21 aanvragen per maand duurt één afgeronde test tien maanden voor 100 per variant. We testen scherp waar volume zit, bij advertenties, koppen en beeld, en beoordelen de pagina op de trend en op wat we zien gebeuren. Bij dit volume is dat de enige eerlijke methode.'))
    o.append(h2('Naslag · Tien oorzaken, met het patroon dat ze verraadt'))
    rijen = []
    for s in SCHAKELS:
        rijen.append(('grp', s))
        for nr, naam, waar, ziet, doen, wie, vooraf in OORZAKEN:
            if waar == s:
                rijen.append(['<b>%s · %s</b>' % (nr, naam), ziet, doen, wie, vooraf])
    o.append('<div style="font-size:8.3pt">%s</div>' % tabel(['Oorzaak', 'Wat je ziet', 'Wat eraan te doen is', 'Van wie', 'Wat we vooraf zeggen'], rijen))
    o.append(p('Samen 48 oplossingen: 29 voeren wij zelf door binnen de retainer, 15 vragen een beslissing of actie van de klant, 4 kosten extra geld. Bij zeven van de tien oorzaken ligt minstens één knop bij de klant. Dat moet vooraf gezegd worden, met de cijfers erbij die het zouden aantonen.'))
    return ''.join(o)


# ======================================================================
# 08.5 Performance Review
# ======================================================================
def keten_tabel(kolommen, hoogte=24):
    rijen = [
        ['<b>Impressies</b><br>' + grijs('kosten per duizend')],
        ['<b>Bezoekers</b><br>' + grijs('doorklikratio, kosten per klik')],
        ['<b>Aanvragen</b><br>' + grijs('conversieratio, kosten per aanvraag')],
        ['<b>Klanten</b><br>' + grijs('scoringsratio, kosten per klant')],
    ]
    rijen = [r + [''] * len(kolommen) for r in rijen]
    b = '%d%%' % ((100 - 28) // len(kolommen))
    return itabel([''] + kolommen, rijen, breedtes=['28%'] + [b] * len(kolommen), hoogte=hoogte)

def performance_review():
    o = []
    o.append(velden(['Klant', 'Datum en tijd', 'Periode', 'Aanwezig']))
    o.append('<div class="veld"><span>Waar</span><div>%s</div></div>' % keuze('op ons kantoor in Hulsberg', 'online'))
    o.append(drie(
        kader('<p>Wij zetten de cijfers klaar uit het dashboard en hebben de diagnose en het plan al gemaakt, met het diagnoseformulier (08.4). De klant heeft in het dashboard aangegeven welke aanvragen klant werden. Zonder dat laatste is blok 4 een gok.</p>', 'Vooraf', 'blauw'),
        kader('<p>De marketingmanager heeft de regie en leidt het gesprek, in de vaste volgorde hieronder. Geen presentatie van wat we deden, geen losse wensenlijst. Elke vraag die geen resultaat raakt, gaat naar support@.</p>', 'Tijdens', 'groen'),
        kader('<p>Dezelfde dag een korte mail vanaf support@: de vier cijfers, de diagnose, het plan en wat er besloten is. Zo staat ook de review op één plek.</p>', 'Na afloop', 'lime')))
    o.append(h3('Vooraf afgevinkt'))
    o.append(checklist([
        ('Cijfers over de periode uit het dashboard, naast de doelregel en de vorige periode', 'campagne'),
        ('Diagnoseformulier (08.4) ingevuld: diagnose en plan liggen klaar', 'marketingmanager'),
        ('De klant heeft “klant geworden” aangegeven bij de aanvragen van de periode', 'klant'),
        ('Past het pakket nog? Campagnes en budget naast het pakket gelegd', 'marketingmanager'),
    ]))

    o.append('<p class="klein" style="margin-top:8pt"><b>Hoe vaak.</b> %s</p>' % PR_FREQ)
    o.append(NIEUWE_PAGINA)
    o.append(h2('Agenda en verslag'))
    o.append(geheel(blok('1 · Impressies', 'Wij', '<p class="klein">Hoe vaak zijn de advertenties getoond, per kanaal, en wat kostte dat per duizend?</p>' +
        itabel(['Kanaal', 'Impressies', 'Kosten per duizend', 'Vorige periode'], [
            ['Google Ads', '', '', ''], ['Meta', '', '', ''], ['', '', '', ''], ['<b>Samen</b>', '', '', ''],
        ], breedtes=['28%', '24%', '24%', '24%'], hoogte=14))))
    o.append(geheel(blok('2 · Websitebezoekers, en dus de doorklikratio', 'Wij', '<p class="klein">Hoeveel mensen klikten door naar de website, welk percentage van de impressies is dat, en wat kostte een klik?</p>' +
        itabel(['Bezoekers', 'Doorklikratio', 'Kosten per klik', 'Vorige periode'], [['', '', '', '']], breedtes=['25%'] * 4, hoogte=16))))
    o.append(geheel(blok('3 · Aanvragen, en dus de conversieratio', 'Wij', '<p class="klein">Hoeveel aanvragen leverde dat op, welk percentage van de bezoekers is dat, en wat kostte een aanvraag, naast de doelregel?</p>' +
        itabel(['Aanvragen', 'Conversieratio', 'Kosten per aanvraag', 'Doelregel', 'Vorige periode'], [['', '', '', '', '']], breedtes=['20%'] * 5, hoogte=16))))
    o.append(geheel(blok('4 · Klanten: hoeveel, wie, en wat een klant kostte', 'De klant', '<p class="klein">De enige schakel die van de klant is. Welke aanvragen werden klant, en waren dat de klanten die de klant wil? Het antwoord komt uit de knop “klant geworden” in het dashboard.</p>' +
        itabel(['Klanten', 'Scoringsratio', 'Kosten per klant', 'Vorige periode'], [['', '', '', '']], breedtes=['25%'] * 4, hoogte=16) +
        vraag('', 'Wie werden klant, en waren dat de klanten die je wilt?', '', 3))))
    o.append(geheel(blok('5 · Onze diagnose', 'Wij', '<p class="klein">Waar zit de smalste schakel, en waarom? Met de oorzaak uit de tien, uit het diagnoseformulier.</p>' +
        '<div class="veld"><span>Smalste schakel</span><div>%s</div></div>' % keuze('bereik', 'weergaven → bezoekers', 'bezoekers → aanvragen', 'aanvragen → klanten') +
        vraag('', 'De oorzaak, en waaraan we dat zien', '', 3))))
    o.append(geheel(blok('6 · Ons plan voor de periode erna', 'Wij', '<p class="klein">Welk percentage of aantal moet omhoog, en hoe: welke knop, welke content, welk kanaal. Eén ingreep, hooguit twee.</p>' +
        vraag('', 'Wat omhoog moet, van hoeveel naar hoeveel', '', 1) +
        vraag('', 'Hoe we dat doen, en van wie het is', '', 3) +
        vraag('', 'Past het pakket nog?', 'Omhoog per direct, omlaag per de 1e van de volgende maand.', 0, ['ja', 'omhoog naar: ________', 'omlaag naar: ________']))))
    o.append(geheel(blok('7 · Vragen en opmerkingen', 'Samen', '<p class="klein">Daarna, en kort. De focus blijft op resultaat.</p>' + lijnen(2))))
    o.append(h3('Besloten'))
    o.append(itabel(['Wat', 'Wie', 'Wanneer'], [['', '', '']] * 3 + [['<b>De volgende Performance Review</b>', '', '']], breedtes=['60%', '20%', '20%'], hoogte=18))

    o.append(NIEUWE_PAGINA)
    o.append(h2('Na afloop: de bevestigingsmail'))
    o.append(p('Dezelfde dag, vanaf support@, door wie het gesprek leidde. Getallen en zinnen komen letterlijk uit het verslag hierboven.'))
    body = (
        '<p>Hoi %s,</p>' % vv('[voornaam]') +
        '<p>Dank voor het gesprek van vandaag. Hieronder de cijfers, wat we zien en wat we gaan doen.</p>'
        '<p><b>De cijfers over %s</b></p>' % vv('[periode]') +
        '<ul><li><b>Impressies:</b> %s, tegen %s per duizend.</li>' % (vv('[aantal]'), vv('[€]')) +
        '<li><b>Bezoekers:</b> %s, een doorklikratio van %s, tegen %s per klik.</li>' % (vv('[aantal]'), vv('[%]'), vv('[€]')) +
        '<li><b>Aanvragen:</b> %s, een conversieratio van %s, tegen %s per aanvraag. De doelregel is %s.</li>' % (vv('[aantal]'), vv('[%]'), vv('[€]'), vv('[doelregel]')) +
        '<li><b>Klanten:</b> %s, tegen %s per klant.</li></ul>' % (vv('[aantal]'), vv('[€]')) +
        '<p><b>Wat we zien.</b> %s</p>' % vv('[de smalste schakel en de oorzaak, in een of twee zinnen]') +
        '<p><b>Wat we gaan doen.</b> %s</p>' % vv('[de ingreep, hooguit twee: wat, van wie, en wanneer we het effect meten]') +
        '<p><b>Wat we besloten.</b> %s</p>' % vv('[besluiten, met wie wat doet en wanneer]') +
        '<p>De volgende Performance Review is op %s, %s. Tot die tijd staan de cijfers elke dag in je dashboard, en elke maand de maandupdate.</p>' % (vv('[datum]'), vv('[op ons kantoor / online]')) +
        '<p>Vragen? Mail ons via support@jamesrobinson.nl, dan heb je binnen één werkdag antwoord.</p>'
        '<p>Groet, %s</p>' % vv('[naam]'))
    o.append(mail('Dezelfde dag · vanaf support@', 'Je Performance Review van %s' % vv('[datum]'), body))
    o.append(checklist([
        ('Mail verzonden, dezelfde dag', ''),
        ('Het plan en de besluiten staan als taken in ClickUp, met een datum', ''),
        ('De volgende Performance Review staat in de agenda van allebei', ''),
        ('Pakket gewijzigd? Omhoog per direct, omlaag per de 1e van de volgende maand, en Moneybird aangepast', ''),
    ]))
    return ''.join(o)


# ======================================================================
# 08.6 100-dagenreview
# ======================================================================
def honderd_dagen():
    o = []
    o.append(velden(['Klant', 'Pakket', 'Datum tekenen', 'Datum review']))
    o.append('<div class="veld"><span>Waar</span><div>%s</div></div>' % keuze('op ons kantoor in Hulsberg', 'online'))
    o.append(kader('<p>Ongeveer honderd dagen na het tekenen, aan het eind van maand 3, voor elk pakket, ook als het ritme van het pakket anders is. Het is de eerste Performance Review: een uur, in het vaste stramien van de Performance Review (08.5). Daarbovenop drie vragen: zijn de kosten per aanvraag tot rust gekomen, klopt de doelregel die vanaf maand 4 geldt, en wat is het plan voor het kwartaal erna.</p>', 'De eerste Performance Review', 'blauw'))
    o.append(h3('Vooraf'))
    o.append(checklist([
        ('De cijfers van maand 1, 2 en 3 uit het dashboard, naast de doelregel', 'campagne'),
        ('Diagnoseformulier (08.4) ingevuld: de eerste diagnose en het plan liggen klaar', 'marketingmanager'),
        ('De klant heeft “klant geworden” aangegeven bij de aanvragen tot nu toe', 'klant'),
        ('De doelregel uit het voorstel letterlijk bij de hand', 'marketingmanager'),
    ]))

    o.append(kader('<p>Dezelfde dag de bevestigingsmail vanaf support@, zoals bij elke Performance Review (08.5): de vier cijfers, de diagnose, het plan en wat er besloten is. Is de doelregel bijgesteld, zet de nieuwe dan letterlijk in de mail en als doellijn in het dashboard.</p>', 'Na afloop', 'lime'))
    o.append(NIEUWE_PAGINA)
    o.append(h2('Agenda en verslag'))
    o.append(geheel(blok('1 · De cijfers, maand voor maand', 'Wij', '<p class="klein">Impressies, bezoekers, aanvragen en klanten, elk met wat het kostte. In maand 1 kost een aanvraag twee tot drie keer het doelbedrag. Het niveau van maand 1 zegt niets; de curve moet omlaag lopen.</p>' +
        keten_tabel(['Maand 1', 'Maand 2', 'Maand 3', 'Doelregel'], hoogte=26))))
    o.append(geheel(blok('2 · Zijn de kosten per aanvraag tot rust gekomen?', 'Wij', itabel(['', 'Maand 1', 'Maand 2', 'Maand 3'], [['<b>Kosten per aanvraag</b>', '', '', '']], breedtes=['28%', '24%', '24%', '24%'], hoogte=20) +
        vraag('', 'Tot rust gekomen?', '', 1, ['ja', 'nee', 'nog niet: verwacht in maand ____']))))
    o.append(geheel(blok('3 · Klopt de doelregel die vanaf maand 4 geldt?', 'Samen', '<p class="klein">Vanaf maand 4 is de doelregel de doellijn in het dashboard en de vraag in elke Performance Review. Klopt hij niet, dan stellen we hem nu bij, met de reden erbij.</p>' +
        velden(['Doelregel uit het voorstel', 'Doelregel vanaf maand 4']) +
        vraag('', 'Bijgesteld? Waarom', '', 2, ['blijft', 'bijgesteld']))))
    o.append(geheel(blok('4 · De eerste diagnose', 'Wij', '<div class="veld"><span>Smalste schakel</span><div>%s</div></div>' % keuze('bereik', 'weergaven → bezoekers', 'bezoekers → aanvragen', 'aanvragen → klanten') +
        vraag('', 'De oorzaak, en waaraan we dat zien', '', 2))))
    o.append(geheel(blok('5 · Het plan voor het kwartaal erna', 'Wij', '<p class="klein">Vanaf maand 4 optimaliseren we op wat de cijfers laten zien. Eén ingreep, hooguit twee tegelijk.</p>' +
        vraag('', 'Ingreep 1: wat, van wie, wanneer meten we het effect', '', 2) +
        vraag('', 'Ingreep 2 (als het er echt twee zijn)', '', 2))))
    o.append(geheel(blok('6 · Alleen bij Sub: de overstap naar Starter', 'Samen', '<p class="klein">Starter is € 1.000 per maand. Het lichte fundament van € 1.500 telt mee: de klant betaalt het verschil, € 3.000.</p>' +
        vraag('', 'Overstap naar Starter?', '', 0, ['ja, per: ________', 'nee', 'volgende review']))))
    o.append(geheel(blok('7 · Vragen en opmerkingen', 'Samen', lijnen(2))))
    o.append(h3('Besloten'))
    o.append(itabel(['Wat', 'Wie', 'Wanneer'], [['', '', '']] * 3 + [['<b>De volgende Performance Review</b>', '', '']], breedtes=['60%', '20%', '20%'], hoogte=18))
    return ''.join(o)


# ======================================================================
# 08.7 Jaargesprek
# ======================================================================
def jaargesprek():
    o = []
    o.append(velden(['Klant', 'Datum', 'Pakket nu', 'Doelregel jaar 1']))
    o.append(kader('<p>In maand 11, gevoerd door de marketingmanager. Zijn er campagnes bij gekomen, of is het budget gegroeid? Dan schuift het pakket mee, omhoog per direct en omlaag per de 1e van de volgende maand.</p>', 'Het jaargesprek', 'blauw'))
    o.append(h3('Vooraf'))
    o.append(checklist([
        ('Het voorstel erbij: de rekensom met de aannames van toen', 'marketingmanager'),
        ('De echte cijfers uit het dashboard: aanvragen, klanten, scoringsratio, kosten per aanvraag', 'campagne'),
        ('De omzet per klant per jaar navragen bij de klant, als die afwijkt van het voorstel', 'marketingmanager'),
        ('Lopende campagnes en advertentiebudget per maand naast het pakket gelegd', 'marketingmanager'),
    ]))

    o.append('<div style="break-inside:avoid;margin-top:12pt">' + (h2('1 · Het jaar in vier cijfers') + keten_tabel(['Aanname in het voorstel', 'Echt, per maand vanaf maand 4'], hoogte=16)) + '</div>')

    o.append(h2('2 · De rekensom opnieuw'))
    o.append(p('Dezelfde zeven sommen als in het voorstel, in deze volgorde. Reken door met de precieze uitkomst en rond pas af bij wat je opschrijft.'))
    o.append(itabel(['#', 'Som', 'Voorstel', 'Met echte cijfers', 'Jaar 2'], [
        ['', '<b>Extra omzet per jaar</b>', '', '', ''],
        ['', '<b>Omzet per klant per jaar</b>', '', '', ''],
        ['', '<b>Percentage dat klant wordt</b>', '', '', ''],
        ['', '<b>Brutomarge</b> ' + grijs('zonder antwoord 30%'), '', '', ''],
        ['', '<b>Terugverdientijd</b> ' + grijs('standaard twaalf maanden'), '', '', ''],
        ['1', 'Nieuwe klanten nodig<br>' + grijs('extra omzet ÷ omzet per klant per jaar'), '', '', ''],
        ['2', 'Aanvragen die daarbij horen<br>' + grijs('klanten ÷ percentage dat klant wordt'), '', '', ''],
        ['3', 'Aanvragen per maand<br>' + grijs('aanvragen ÷ maanden live'), '', '', ''],
        ['4', 'Wat alle marketing mag kosten<br>' + grijs('extra omzet × marge × terugverdientijd ÷ 12'), '', '', ''],
        ['5', 'Wat daar vast vanaf gaat<br>' + grijs('retainer, licenties, en in jaar 1 het fundament'), '', '', ''],
        ['6', 'Over voor advertenties, per maand<br>' + grijs('(marketingruimte − vaste kosten) ÷ maanden live'), '', '', ''],
        ['7', 'Wat een aanvraag mag kosten<br>' + grijs('advertentiebudget ÷ aanvragen'), '', '', ''],
    ], breedtes=['5%', '41%', '18%', '18%', '18%'], hoogte=13))
    o.append(kader('<p>In jaar 1 rekende de som met de set-upmaand plus elf maanden live, en met het fundament als vaste post. Jaar 2 heeft geen fundament en twaalf maanden live. Toets daarna zoals altijd: de retainer is nooit meer dan de helft van retainer plus advertentiebudget, en alles verdient zich terug binnen de terugverdientijd.</p>', 'Let op bij jaar 2', 'oranje'))

    o.append(geheel(h2('3 · Het doel voor jaar 2') + p('Eén zin die de klant kan onthouden en kan narekenen, omdat de getallen van de klant zelf komen.') +
    kader('<p style="font-size:11pt">“%s extra aanvragen per maand, tegen maximaal € %s per aanvraag aan advertenties.”</p>' % (vv('[ ____ ]'), vv('[ ____ ]')), 'De doelregel voor jaar 2', 'grijs')))
    o.append(vraag('', 'Wat is er anders dan in jaar 1, en waarom?', '', 2))

    o.append(h2('4 · Past het pakket nog?'))
    o.append(p('Het pakket is het hoogste van twee: campagnes tegelijk of advertentiebudget. Wij kiezen de kanalen: per kanaal minimaal € 500 per campagne per maand, op LinkedIn € 1.000.'))
    o.append(tabel(['', 'Starter', 'Playmaker', 'Captain', 'Champion'], [
        ['Retainer per maand', '€ 1.000', '€ 1.500', '€ 2.000', '€ 2.500'],
        ['Campagnes tegelijk', '1', '2', '3', '4'],
        ['Advertentiebudget per maand', '€ 1.000 – 2.500', '€ 2.500 – 5.000', '€ 5.000 – 7.500', 'vanaf € 7.500'],
    ]))
    o.append(itabel(['', 'Nu', 'Jaar 2'], [
        ['<b>Campagnes tegelijk</b>', '', ''],
        ['<b>Advertentiebudget per maand</b>', '', ''],
        ['<b>Pakket</b>', '', ''],
    ], breedtes=['40%', '30%', '30%'], hoogte=20))
    o.append(vraag('', 'Besluit over het pakket', 'Omhoog per direct, omlaag per de 1e van de volgende maand.', 0, ['blijft', 'omhoog per direct', 'omlaag per de 1e van: ________']))

    o.append(h2('5 · Vragen en opmerkingen'))
    o.append(lijnen(2))
    o.append(h3('Besloten'))
    o.append(itabel(['Wat', 'Wie', 'Wanneer'], [['', '', '']] * 3, breedtes=['60%', '20%', '20%'], hoogte=18))
    o.append(p('<b>Na afloop.</b> Dezelfde dag per mail vanaf support@: de nieuwe doelregel, het pakket voor jaar 2 en wat er besloten is. De doelregel wordt de nieuwe doellijn in het dashboard; een ander pakket gaat dezelfde dag in Moneybird.', 'klein'))
    return ''.join(o)


# ======================================================================
# 08.8 Monitoring en dagmail
# ======================================================================
def monitoring():
    o = []
    o.append(kader('<p>Het ritme is wat de klant ziet. Daaronder kijken wij doorlopend mee, zodat we een probleem zien voordat de klant het merkt. We beslissen op cijfers, niet op smaak: een discussie over welke advertentie mooier is, beslechten we met een test. Het merk bepaalt de grenzen, de data kiest binnen die grenzen.</p>', 'Data beats opinion', 'zwart'))
    o.append(h2('Wat we volgen'))
    o.append(tabel(['Wat we volgen', 'Hoe vaak', 'Wanneer we in actie komen', 'Wie'], [
        ['Alles hieronder, voor al onze klanten', 'Elke ochtend om 7.00 uur', 'De dagmail: wat buiten een drempel valt, staat bovenaan in rood', 'Jim Coumans'],
        ['Uitgaven per campagne en kanaal', 'Dagelijks, automatisch', 'Budget op voor de middag, of een campagne besteedt niets', 'Campagne'],
        ['Afgekeurde advertenties en accountmeldingen', 'Dagelijks, automatisch', 'Elke afkeuring of melding', 'Campagne'],
        ['De meting: komen conversies en aanvragen binnen', 'Dagelijks, automatisch', 'Een dag met verkeer maar zonder conversies, of dashboard en platform lopen uiteen', 'Techniek'],
        ['Landingspagina: bereikbaarheid en snelheid', 'Doorlopend', 'Uitval, of trager dan de norm uit de quickscan', 'Techniek'],
        ['Kosten per aanvraag tegen de doelregel', 'Wekelijks', 'Twee weken op rij boven het plafond', 'Campagne'],
        ['Doorklik, conversie en frequentie per advertentie', 'Wekelijks', 'Onder de norm, of frequentie loopt op: de advertentie slijt', 'Campagne en content'],
        ['Opvolgtijd en oordelen per aanvraag', 'Wekelijks', 'Aanvragen zonder oordeel, of opvolging trager dan afgesproken', 'Marketingmanager'],
        ['Ongeldige kliks en klikfraude', 'Wekelijks', 'Opvallende pieken; na de proefperiode de afweging ClickCease', 'Campagne'],
        ['De doelregel', 'Maandelijks', 'Elke maand in de maandupdate, met diagnose en plan', 'Marketingmanager'],
    ]))
    o.append(h2('De drempels'))
    o.append(p('De drempels zijn een voorstel. Ze bepalen wat er in de dagmail rood staat, en we zetten ze vast na de eerste maanden met echte cijfers. Normen per branche voor doorklik en conversie hebben we nog niet; tot die tijd is “onder de norm” een mening. Vul hier in wat geldt, met de datum.'))
    o.append(itabel(['Rood als', 'Drempel', 'Vastgesteld op', 'Door'], [
        ['Het dagbudget is op vóór', '12.00 uur', '', ''],
        ['Een campagne besteedt niets, gedurende', '', '', ''],
        ['Een advertentie wordt afgekeurd, of het account geeft een melding', 'elke', '', ''],
        ['Verkeer zonder conversies, gedurende', 'één dag', '', ''],
        ['Dashboard en platform lopen uiteen, met meer dan', '', '', ''],
        ['De landingspagina is trager dan', 'norm quickscan: ____', '', ''],
        ['Kosten per aanvraag boven het plafond, gedurende', 'twee weken op rij', '', ''],
        ['Doorklikratio per advertentie onder', '', '', ''],
        ['Conversieratio per advertentie onder', '', '', ''],
        ['Frequentie per advertentie boven', '', '', ''],
        ['Een aanvraag is zonder oordeel na', '', '', ''],
        ['Opvolging trager dan afgesproken, bij', 'elke aanvraag', '', ''],
    ], breedtes=['42%', '22%', '18%', '18%'], hoogte=16))

    o.append(h2('Het ritme, per pakket'))
    o.append(RITME)
    o.append(p('Sub draait op een eigen ritme: een contentronde per halfjaar, geen draaidag, de eerste Performance Review na drie maanden en daarna elk halfjaar.', 'klein'))
    o.append(h2('De dagmail van 7.00 uur'))
    o.append(p('Intern, niet voor de klant. Eén mail uit het dashboard met de performance van al onze campagnes van gisteren. Zo begint de dag met wat aandacht nodig heeft, en hangt het niet af van wie er toevallig oplet. Jim Coumans leest hem en zet elke rode regel door naar de rol die erover gaat.'))
    dm = ('<p><b>Bovenaan, in rood: wat buiten een drempel valt</b></p>' +
          '<p>%s %s · %s · %s</p>' % (chip('rood', 'rood'), vv('[klant]'), vv('[campagne]'), vv('[welke drempel, met het getal]')) +
          '<p>%s %s · %s · %s</p>' % (chip('rood', 'rood'), vv('[klant]'), vv('[campagne]'), vv('[welke drempel, met het getal]')) +
          '<p style="margin-top:8pt"><b>Daaronder: per klant, gisteren</b></p>' +
          tabel(['Klant', 'Uitgaven', 'Aanvragen', 'Kosten per aanvraag', 'Doelregel'], [
              [vv('[klant]'), vv('[€]'), vv('[aantal]'), vv('[€]'), vv('[€ plafond]')],
              [vv('[klant]'), vv('[€]'), vv('[aantal]'), vv('[€]'), vv('[€ plafond]')],
              [vv('[klant]'), vv('[€]'), vv('[aantal]'), vv('[€]'), vv('[€ plafond]')],
          ], rechts=(1, 2, 3, 4)))
    o.append(mail('Elke ochtend om 7.00 uur · automatisch uit het dashboard · intern', 'Dagmail %s' % vv('[datum]'), dm, van='het marketingdashboard'))
    o.append(kader(ul([
        'Per klant de uitgaven, de aanvragen en de kosten per aanvraag van gisteren, tegen de doelregel.',
        'Wat buiten een drempel valt, bovenaan in rood. Staat er niets in rood, dan is er niets wat vandaag aandacht vraagt.',
        'Alle klanten in één mail. De klant krijgt hem niet: de klant ziet de cijfers in het eigen dashboard en de maandupdate.',
    ]), 'Wat de dagmail laat zien', 'grijs'))

    o.append(kader('<p>Contentrondes, draaidagen en varianten gaan net als in het fundament eerst door de merkcheck. Snel mag, off-brand niet. Laat de dagmail of de maandupdate een afwijking zien, vul dan het diagnoseformulier (08.4) in.</p>', 'Wat je met een rode regel doet', 'blauw'))

    o.append(NIEUWE_PAGINA)
    o.append(h2('De eerste week na livegang'))
    o.append(p('Dag 19 tot en met 25 kijken we elke dag: uitgaven, afkeuringen, de eerste aanvragen. Kijken en noteren; alleen ingrijpen bij iets wat aantoonbaar fout staat, want elke wijziging zet de leerfase terug. Komt de eerste aanvraag binnen, dan bellen wij de klant.'))
    o.append(velden(['Klant', 'Bijgehouden door']))
    o.append(itabel(['Dag', 'Uitgaven', 'Afkeuringen', 'Aanvragen', 'Genoteerd, en wat we deden'], [
        ['<b>Dag %d</b>' % d, '', '', '', ''] for d in range(19, 26)
    ], breedtes=['10%', '14%', '14%', '14%', '48%'], hoogte=40))
    o.append(velden(['Eerste aanvraag binnen op', 'Klant gebeld door, op']))

    return ''.join(o)


# ======================================================================
# 08.9 Opzeggen en vertrekken
# ======================================================================
def opzeggen():
    o = []
    o.append(kader('<p>Maandelijks opzegbaar, voor allebei. Opzeggen kan tot en met de laatste dag van de maand; de maand erna komt er geen factuur meer, mits er geen budgetten meer openstaan. Het fundament krijgt de klant na de start niet terug: dat werk is gedaan. Alles staat op naam van de klant, dus advertentieaccounts, e-maillijst en licenties gaan mee zonder dat er iets overgezet hoeft te worden. Dat maakt vertrekken makkelijk, en dat moeten we willen: een klant blijft omdat het werkt.</p><p>Ook wij kunnen opzeggen. Bewegen de cijfers niet, dan zeggen wij het zelf, met de cijfers erbij, en leggen we de opties voor, waaronder stoppen. Ook dan geldt deze checklist.</p>', 'De regel', 'blauw'))
    o.append(velden(['Klant', 'Pakket', 'Datum opzegging', 'Laatste dag (einde van de maand)']))
    o.append('<div class="veld"><span>Opgezegd door</span><div>%s</div></div>' % keuze('de klant', 'James Robinson'))
    o.append(vraag('', 'Waarom, in de woorden van de klant', 'Letterlijk noteren, en op de klantkaart.', 2))

    o.append(h2('Checklist bij opzegging'))
    o.append(h3('Dezelfde dag'))
    o.append(checklist([
        ('Opzegging bevestigd per mail vanaf support@, met de laatste dag en wat de klant meeneemt', 'marketingmanager'),
        ('Klantkaart bijgewerkt: opgezegd per de laatste dag, met de reden', 'marketingmanager'),
        ('Gecontroleerd of er nog budgetten openstaan. Zo ja: afspraak gemaakt over hoe die worden afgerond', 'campagne'),
        ('Moneybird: na de laatste maand geen factuur en geen incasso meer', 'marketingmanager'),
        ('Gevraagd of de klant het marketingdashboard houdt, voor € 25 per maand', 'marketingmanager'),
    ]))
    o.append(vraag('', 'Wat er met de campagne gebeurt tot de laatste dag', 'Afgesproken met de klant, met de datum.', 1, ['loopt door tot de laatste dag', 'stopt op: ________']))
    o.append(h3('Wat de klant meeneemt'))
    o.append(p('Alles hieronder staat al op naam van de klant, met de betaalgegevens van de klant. Wij geven op de laatste dag onze beheertoegang op.', 'klein'))
    o.append(itabel(['Wat', 'Wat er gebeurt', 'Onze toegang eruit op', 'Gedaan'], [
        ['<b>Google Ads, Meta</b> en eventueel Microsoft Ads, LinkedIn, TikTok', 'Blijft van de klant, draait door of stopt naar keuze van de klant', '', keuze('')],
        ['<b>Google Analytics, Tag Manager, Search Console, Bedrijfsprofiel</b>', 'Blijft van de klant', '', keuze('')],
        ['<b>MailerLite</b> met de e-maillijst', 'Blijft van de klant, met de lijst', '', keuze('')],
        ['<b>Cookiescript, ClickCease, Leadinfo, Calendly</b>', 'Licenties op naam van de klant; de klant beslist of ze doorlopen', '', keuze('')],
        ['<b>Hosting bij Webmix</b>', 'Loopt rechtstreeks tussen de klant en Webmix', '—', keuze('')],
        ['<b>Marketingdashboard</b>', 'De klant houdt het voor € 25 per maand, of het stopt na de laatste dag', '', keuze('')],
    ], breedtes=['32%', '38%', '18%', '12%'], hoogte=18))
    o.append(h3('Intern afronden, na de laatste dag'))
    o.append(checklist([
        ('Alle beheertoegangen hierboven opgegeven, en afgevinkt', 'campagne en techniek'),
        ('Het project in ClickUp afgesloten; openstaande taken vervallen', 'marketingmanager'),
        ('In Front de klant losgekoppeld van de marketingmanager', 'marketingmanager'),
        ('Gesprek over de reden met Jim Coumans of Jim Kikken: wat leren we ervan?', 'marketingmanager'),
    ]))
    o.append(velden(['Afgerond door, op']))
    return ''.join(o)


DOCS = [
 dict(code='08.1', titel='Livegang', fase=FASE, voor='Intern en klant', wanneer='Week 4 van het fundament, vóór dag 19', wie='Marketingmanager en techniek, met wie bij de klant belt',
      lead='Een uur met het team van de klant, met wie belt en niet alleen met de directeur. Daarna staat op papier wie belt, binnen hoeveel tijd, en wat er gebeurt als diegene er niet is. En de testaanvraag gaat door de hele keten.',
      body=livegang()),
 dict(code='08.2', titel='Live-bericht', fase=FASE, voor='Intern', wanneer='Dag 19, zodra de campagne aanstaat', wie='De marketingmanager, vanaf support@',
      lead='De mail op de dag van livegang: dit staat er nu, hier komen je aanvragen binnen, dit doen we de komende twee weken.',
      body=live_bericht(), concept=True),
 dict(code='08.3', titel='Maandupdate', fase=FASE, voor='Intern', wanneer='Elke maand, vóór de 5e werkdag', wie='De marketingmanager',
      lead='Het sjabloon voor de maandupdate in het dashboard: bovenaan de getallen tegen de doelregel en vorige maand, daaronder drie korte antwoorden.',
      body=maandupdate()),
 dict(code='08.4', titel='Diagnoseformulier', fase=FASE, voor='Intern', wanneer='Vóór elke Performance Review en bij een afwijking', wie='De marketingmanager',
      lead='Drie vragen: waar zit de bottleneck, wat is de oorzaak, en wat is ons plan. Een diagnose, geen discussie. Achterin de tien oorzaken en wanneer je iets mag zeggen.',
      body=diagnose()),
 dict(code='08.5', titel='Performance Review', fase=FASE, voor='Intern en klant', wanneer='Per pakket, van elk kwartaal tot maandelijks', wie='De marketingmanager',
      lead='Een uur over resultaat, op ons kantoor in Hulsberg of online, in een vast stramien. Agenda en verslag in één: vul hem tijdens het gesprek in, en stuur dezelfde dag de bevestigingsmail.',
      body=performance_review(), concept=True),
 dict(code='08.6', titel='100-dagenreview', fase=FASE, voor='Intern en klant', wanneer='Ongeveer honderd dagen na het tekenen', wie='De marketingmanager',
      lead='De eerste Performance Review en het belangrijkste gesprek van het jaar: de leerfase is voorbij en de cijfers zeggen voor het eerst iets.',
      body=honderd_dagen()),
 dict(code='08.7', titel='Jaargesprek', fase=FASE, voor='Intern en klant', wanneer='Maand 11', wie='De marketingmanager',
      lead='De rekensom opnieuw, met echte cijfers in plaats van aannames. Daaruit het doel voor jaar 2, en de vraag of het pakket nog past.',
      body=jaargesprek(), concept=True),
 dict(code='08.8', titel='Monitoring en dagmail', fase=FASE, voor='Intern', wanneer='Elke dag, vanaf de livegang', wie='Jim Coumans, campagne, techniek, content, marketingmanager',
      lead='Wat we doorlopend volgen, hoe vaak, wanneer we in actie komen en wie. De drempels bepalen wat er in de dagmail van 7.00 uur bovenaan in rood staat.',
      body=monitoring()),
 dict(code='08.9', titel='Opzeggen en vertrekken', fase=FASE, voor='Intern', wanneer='Zodra de klant opzegt, of wij', wie='De marketingmanager',
      lead='De checklist bij een opzegging. Alles staat al op naam van de klant, dus vertrekken is makkelijk. Dat moeten we willen.',
      body=opzeggen(), concept=True),
]
