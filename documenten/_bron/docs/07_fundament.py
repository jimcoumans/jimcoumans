# -*- coding: utf-8 -*-
# Stap 07 · Het fundament: 07.1 De 76 taken, 07.2 Draaidag, 07.3 Merkcheck (alle drie intern).
import os, json
from base import *

FASE = 'Fase 2 · Starten · Stap 07 · Het fundament'
VAK = '<span class="opt"></span>'
GIDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'styleguide', 'paginas', '_gids-bron')
PB = json.load(open(os.path.join(GIDS, 'playbook_rows.json')))
WI = {x['titel']: x for x in json.load(open(os.path.join(GIDS, 'werkinstr.json')))}


def lijn(mm=22):
    """Een korte invullijn in lopende tekst."""
    return '<span style="display:inline-block;width:%dmm;border-bottom:1px solid var(--ln);height:11pt;vertical-align:-2pt"></span>' % mm


def opties(items):
    return '<div class="opties">%s</div>' % ''.join('<span class="opt">%s</span>' % o for o in items)


# ---------------------------------------------------------------- 07.1 De 76 taken
# Gelijk aan BLOKKEN in part2c.py: (nr, naam, uren, uitleg, [(onderdeel, aantal taken, uren)]).
BLOKKEN = [
    ('01', 'Doelgroep en boodschap', '7,5–8', 'Doel en plan liggen vast uit het voorstelgesprek. Hier werken we ze uit tot doelgroepen, boodschap en targeting, met wat de klant in het intakegesprek vertelde en in het onboardingformulier aanleverde. Wij doen het denkwerk, niet het invulwerk. Vanaf de merkcheck is alles wat we maken on-brand.',
     [('Onboardingformulier verwerken', 4, '2'), ('Doelgroep uitwerken', 3, '1,5'), ('Propositie aanscherpen', 2, '1,5'), ('Concurrentieanalyse', 2, '1'), ('Conversiedefinitie', 1, '0,5'), ('Merkcheck', 3, '1–1,5')]),
    ('02', 'Techniek en meting', '7', 'Wij meten volgens de checklist, nu met toegang. Wat niet voldoet, gaat naar Webmix als apart voorstel: wij herstellen geen websites binnen het fundament.',
     [('De technische audit', 2, '2'), ('Bevindingen doorzetten', 2, '1'), ('Meetopzet volgens onze standaard', 5, '3,5'), ('De nulmeting', 1, '0,5')]),
    ('03', 'Onze systemen', '8,5', 'Wij koppelen niet aan de systemen van de klant; de klant krijgt toegang tot die van ons. Advertentieaccounts: standaard Google Ads en Meta, altijd allebei. Microsoft Ads, LinkedIn en TikTok zetten we op als doelgroep en cijfers erom vragen.',
     [('Advertentieaccounts', 3, '1,5'), ('MailerLite', 5, '2,5'), ('Leadinfo', 1, '0,5'), ('Je marketingdashboard', 7, '4')]),
    ('04', 'De campagne', '14', 'Eenmalig opzetwerk, en daarom onderdeel van het fundament. Wat daarna volgt, optimaliseren, nieuwe sets en de Performance Reviews, zit in de retainer.',
     [('Zoekwoordonderzoek', 4, '3'), ('Campagnestructuur', 3, '2'), ('Advertenties schrijven', 3, '2'), ('Doelgroepen en targeting', 2, '1'), ('Biedstrategie en retargeting', 2, '1'), ('Landingspagina', 4, '4'), ('Formulier en bedankpagina', 2, '1')]),
    ('05', 'De content', '11', 'Marketingcontent, geen bedrijfsvideo en geen branded content: foto, video, animatie en graphics die in advertenties werken, in de formaten van elk kanaal en in varianten om te testen. Eén draaidag levert het materiaal voor een kwartaal.',
     [('Voorbereiding', 2, '1'), ('De draaidag', 3, '5,5'), ('Montage', 4, '4,5')]),
    ('06', 'Live', '4,5', 'De laatste stap, en de week erna. Hier blijkt of alles echt werkt.',
     [('Kickoff met je team', 2, '1,5'), ('Testaanvraag door de keten', 2, '1'), ('De eerste week', 2, '2')]),
]
NAAM = {'Je marketingdashboard': 'Het marketingdashboard', 'Kickoff met je team': 'Kickoff met het team van de klant'}
VERSCHOVEN = {'1': 'gaat nu mee met de kick-offmail', '3': 'nu vóór het voorstel (stap 04)', '4': 'nu vóór het voorstel (stap 04)'}


def onderdeel_kop(naam, uren, klaar):
    return ('<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8pt;margin:9pt 0 1pt;break-after:avoid">'
            '<b style="font-family:var(--fd);font-size:10pt">%s</b><span class="chip c-blauw">%s uur</span></div>'
            '<p class="klein" style="margin:0 0 2pt;break-after:avoid">Klaar als: %s</p>') % (naam, uren, klaar)


def taken():
    out = []
    i = 0
    for nr, naam, uren, uitleg, onderdelen in BLOKKEN:
        kop = h2('Blok %s · %s <span class="chip c-blauw" style="vertical-align:3pt">%s uur</span>' % (nr, naam, uren)) + p(uitleg, 'klein')
        for j, (ond, n, u) in enumerate(onderdelen):
            klaar = WI[ond]['klaar'] if ond in WI else ''
            items = []
            for _ in range(n):
                r = PB[i]; i += 1
                taak = r[1]
                if taak.startswith(ond + ' '):
                    taak = taak[len(ond) + 1:]
                taak = taak.replace(' — ', ', ')
                t = '<b style="color:var(--blue)">%s</b>&nbsp; %s' % (r[0], taak)
                if r[0] in VERSCHOVEN:
                    t += ' ' + chip('verschoven: ' + VERSCHOVEN[r[0]], 'oranje')
                af = r[4].replace(' — ', ': ')
                t += '<br><span class="klein">Af: %s · %s</span>' % (af, r[3])
                items.append((t, '%s · %s' % (r[2].lower(), r[5].replace(' u', '&nbsp;u'))))
            out.append('<div style="break-inside:avoid">' + (kop if j == 0 else '') + onderdeel_kop(NAAM.get(ond, ond), u, klaar) + checklist(items) + '</div>')
    assert i == 76, i
    return ''.join(out)


def fundament():
    out = [velden(['Klant en bedrijf', 'Dag 1 (alle toegangen binnen)', 'Live-datum (dag 19)', 'Vaste aanspreekpunt'])]
    out.append(kader('<p>Vier weken, gerekend vanaf volledige toegang. Elke dag die wij wachten op toegang of op een akkoord, schuift alles op. '
                     'Een rol is een soort werk, geen functie: bij een kleine klant doet één persoon er drie. Techniek heeft 27 taken, campagne en content elk 16, strategie 11 en klantcontact 6.</p>',
                     'Zo werkt het', 'blauw'))
    out.append(h2('Het tijdpad'))
    out.append(p('In werkdagen, vanaf dag 1. Vul de datums in zodra dag 1 vastligt.', 'klein'))
    out.append(tabel(['Dag', 'Wat', 'Toelichting', 'Datum'], [
        ['<b>Vóór dag 1</b>', '<b>Onboardingformulier en toegangen</b>', 'Binnen drie werkdagen na het tekenen (stap 06).', lijn(18)],
        ['<b>Dag 1</b>', '<b>De klok start</b>', 'Wij beginnen met de technische audit, nu met toegang.', lijn(18)],
        ['<b>Dag 2 – 4</b>', '<b>Doelgroep en boodschap</b>', 'Doel en plan uit het voorstel uitwerken tot doelgroepen, boodschap en zoekwoorden. Geen extra sessie: dat gesprek is gevoerd.', lijn(18)],
        ['<b>Dag 4</b>', '<b>Bevindingen techniek</b>', 'Wat niet deugt, met wat herstel kost. De klant beslist: nu, later of niet.', lijn(18)],
        ['<b>Dag 5 – 10</b>', '<b>Systemen en meting</b>', 'Advertentieaccounts, MailerLite, het marketingdashboard en de meetopzet. Ons werk, af en toe een akkoord van de klant.', lijn(18)],
        ['<b>Dag 10 – 16</b>', '<b>Campagne en landingspagina</b>', 'Bouwen, schrijven, monteren. Alles staat klaar om getest te worden.', lijn(18)],
        ['<b>Dag 11 – 20</b>', '<b>De draaidag</b>', 'Eén dagdeel bij de klant op locatie, in week 3 of 4, gekozen uit de dagdelen die de klant opgaf en afgestemd met de videograaf. Liefst vroeg in week 3: dan is de montage klaar voor de preview (07.2).', lijn(18)],
        ['<b>Dag 17</b>', '<b>De klant kijkt mee</b>', 'De complete campagne voordat hij live gaat, na onze eigen check op merk en meting (07.3). Eén ronde feedback.', lijn(18)],
        ['<b>Dag 19</b>', '<b>Live</b>', 'We zetten de campagne aan en kijken de eerste week dagelijks mee.', lijn(18)],
        ['<b>Dag 26</b>', '<b>Eerste cijfers</b>', 'Nog geen conclusies, wel de eerste aanvragen en de richting.', lijn(18)],
    ]))
    out.append(kader('<p><b>Een draaidag in week 4 schuift de video.</b> Google gaat dan op dag 19 live met tekst en beeld uit de sjablonen, Meta met video zodra de montage klaar is, ongeveer een week later. De retainer start toch in maand 2. Daarom liefst vroeg in week 3.</p>', 'Let op', 'oranje'))

    out.append(h3('Wat we van de klant nodig hebben'))
    out.append(checklist([
        ('<b>Het onboardingformulier</b>, binnen drie werkdagen. Het meeste denkwerk dat we van de klant vragen, en het scheelt ons de helft van de tijd.', 'dag 1 – 3'),
        ('<b>Beheerderstoegang</b>, in de toegangensessie. Specifiek: zelf een script in de head van de site kunnen plaatsen. Kan dat alleen via de leverancier, dan nu, niet in week twee.', 'dag 1 – 3'),
        ('<b>Snel akkoord</b> op de boodschap in week 1 en op de campagne in week 4, binnen twee werkdagen, door de persoon die beslist.', 'week 1 en 4'),
        ('<b>Dagdelen voor de draaidag</b>: alle dagdelen in week 3 en 4 waarop we kunnen filmen, in het formulier. Zonder eigen beeld beginnen we met stock, en dat werkt aantoonbaar slechter.', 'week 3 of 4'),
    ]))

    out.append(NIEUWE_PAGINA)
    out.append(p('<b>Zes blokken, 76 taken.</b> Per taak de rol en de uren; de regel eronder zegt wat er dan af is en uit welk middel de taak gedaan wordt. Vink af wat af is.', 'klein'))
    out.append(taken())

    out.append(kader('<p><b>Blok 01 opnieuw bekijken.</b> Drie taken zijn verschoven: het formulier gaat mee met de kick-offmail (taak 1), en doel narekenen en toolkosten (taak 3 en 4) gebeuren vóór het voorstel. Die anderhalf uur horen in de herrekening van het fundament.</p>', 'Verschoven', 'oranje'))
    out.append(kader('<ul><li><b>De nulmeting vóór de campagne.</b> Doe je hem later, dan meet je jezelf mee en is het ijkpunt waardeloos.</li>'
                     '<li><b>Altijd on-brand, ook onder tijdsdruk.</b> Elke uiting gaat door de merkcheck (07.3) voordat hij live gaat. Een snelle variant die niet klopt met het merk, gaat niet live.</li>'
                     '<li><b>Nooit op onze naam, ook niet even.</b> Accounts op naam van de klant, met de betaalmethode van de klant, wij als beheerder.</li></ul>', 'Wat altijd geldt', 'grijs'))
    return ''.join(out)


# ---------------------------------------------------------------- 07.2 Draaidag
DAGEN = ['ma', 'di', 'wo', 'do', 'vr']


def planraster():
    """Per dagdeel: kan de klant (vraag 21) en kan de videograaf. Datums per dag in de kop."""
    kop = '<th style="width:26mm"></th>' + ''.join('<th>%s %s</th>' % (d, lijn(12)) for d in DAGEN)
    cel = '<td><span class="opt">klant</span><br><span class="opt">videograaf</span></td>'
    rijen = []
    for wk in ('Week 3 (dag 11 – 15)', 'Week 4 (dag 16 – 20)'):
        rijen.append('<tr class="grp"><td colspan="6">%s</td></tr>' % wk)
        for dd in ('ochtend', 'middag'):
            rijen.append('<tr><td><b>%s</b></td>%s</tr>' % (dd, cel * len(DAGEN)))
    return '<div style="break-inside:avoid"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (kop, ''.join(rijen))


def shottabel(rijen):
    """De shotlist met vaste kolombreedtes, zodat er ruimte is om te schrijven."""
    breed = ['7mm', '54mm', '36mm', '37mm', '24mm', '16mm']
    kop = ['#', 'Shot', 'Wie of wat, waar', 'Formaat', 'Voor', 'Gedraaid']
    cg = ''.join('<col style="width:%s">' % w for w in breed)
    th = ''.join('<th>%s</th>' % k for k in kop)
    tr = ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % c for c in r) for r in rijen)
    return '<table style="table-layout:fixed"><colgroup>%s</colgroup><thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (cg, th, tr)


SHOTS = [
    ('Openingsbeeld: het werk in actie, sterk genoeg voor de eerste seconde', 'advertentie'),
    ('Handen aan het werk, van dichtbij', 'advertentie'),
    ('Het product, de machine of het project: overzicht en detail', 'advertentie, pagina'),
    ('Het resultaat: het opgeleverde werk, het moment dat het af is', 'advertentie, pagina'),
    ('Iemand die het werk doet, naar de camera: wat doe je, voor wie, waarom bij ons', 'advertentie'),
    ('Het antwoord op het bezwaar waarom klanten uitstellen (formulier, vraag 4)', 'advertentie'),
    ('Het pand of de plek van buiten, met naam of logo herkenbaar', 'pagina'),
    ('Het team samen in beeld', 'pagina'),
    ('Stills: portret van de spreker, product, pand', 'pagina, statisch'),
]


def draaidag():
    out = [velden(['Klant en bedrijf', 'Locatie (formulier, vraag 18)', 'Contactpersoon op locatie', 'Videograaf'])]
    out.append(kader('<p>Eén dagdeel bij de klant op locatie levert het beeld voor een kwartaal: foto en video voor advertenties, in de formaten van elk kanaal en in varianten om te testen. Marketingcontent, geen bedrijfsvideo en geen branded content. '
                     'Alles op dit blad komt uit het onboardingformulier (vraag 18 tot en met 21) en wordt bevestigd door klantcontact.</p>', 'Waar het om gaat', 'blauw'))

    out.append(h2('De datum kiezen'))
    out.append(p('Neem de dagdelen over die de klant aankruiste (vraag 21), en zet die van de videograaf eronder. Waar beide kunnen, kies je. Liefst vroeg in week 3: dan is de montage klaar voor de preview op dag 17. Vul bovenaan per dag de datum in.', 'klein'))
    out.append(planraster())
    out.append(vakken(['Gekozen: datum en dagdeel', 'Bevestigd aan de klant op', 'Bevestigd door de videograaf op'], 3, 36))
    out.append(kader('<p><b>Valt de draaidag in week 4,</b> dan gaat Google op dag 19 live met tekst en beeld uit de sjablonen, en Meta met video zodra de montage klaar is, ongeveer een week later. Zeg dat de klant bij de bevestiging.</p>', 'Let op', 'oranje'))

    out.append(h2('Wie en wat in beeld'))
    out.append(p('Uit het onboardingformulier, vraag 19 en 20. Iemand die het werk doet, werkt beter dan de directeur.', 'klein'))
    out.append(tabel(['Wie voor de camera', 'Functie of rol', 'Bevestigd'], [['&nbsp;', '', VAK]] * 3))
    out.append(tabel(['Wat in beeld', 'Wat precies', 'Klaar gezet'], [
        ['<span class="opt">producten</span>', '', VAK],
        ['<span class="opt">machines</span>', '', VAK],
        ['<span class="opt">een project</span>', '', VAK],
        ['<span class="opt">het pand</span>', '', VAK],
        ['<span class="opt">anders</span>', '', VAK],
    ]))
    out.append(h3('Wat de klant klaarzet'))
    out.append(p('Bevestig dit bij de planning (taak 63). Wat er niet is, bestaat op de draaidag niet.', 'klein'))
    out.append(checklist([
        ('De mensen die in beeld komen, zijn er dat dagdeel en weten het.', 'mensen'),
        ('Wie herkenbaar in beeld komt, vindt het goed dat het beeld in advertenties gebruikt wordt.', 'mensen'),
        ('De producten, machines of het project staan klaar en zijn toegankelijk.', 'plek'),
        ('De werkplek is opgeruimd zoals de klant hem aan een klant zou laten zien.', 'plek'),
        ('Werkkleding of bedrijfskleding, als die er is.', 'mensen'),
        ('Iemand die ons ontvangt en vragen kan beantwoorden.', 'plek'),
    ]))

    out.append(NIEUWE_PAGINA)
    out.append(h2('De shotlist'))
    out.append(p('Vul hem in vóór de draaidag (taak 62), met de propositie en de antwoorden uit het onboardingformulier ernaast. De eerste regels zijn een vertrekpunt: schrap, pas aan en vul aan per klant. Kruis per shot de formaten aan die je nodig hebt.', 'klein'))
    fmt = '<span style="white-space:nowrap"><span class="opt" style="margin-right:5pt">9:16</span><span class="opt" style="margin-right:5pt">4:5</span><span class="opt">1:1</span></span>'
    rijen = [[str(k + 1), s, '', fmt, g, VAK] for k, (s, g) in enumerate(SHOTS)]
    rijen += [[str(k + 1), '&nbsp;<br>&nbsp;', '', fmt, '', VAK] for k in range(len(SHOTS), len(SHOTS) + 6)]
    out.append(shottabel(rijen))

    out.append('<div style="break-inside:avoid">' + h2('Het dagdeel') + tabel(['Wat', 'Klaar als', 'Uur', 'Klaar'], [
        ['<b>Reis en opbouw</b>', 'Klaar om te draaien.', '1', VAK],
        ['<b>Filmen</b>', 'De shotlist is afgewerkt, in 9:16 en in de bredere formaten.', '4', VAK],
        ['<b>Afbouw</b>', 'Het materiaal is veiliggesteld en geback-upt, vóór je vertrekt.', '0,5', VAK],
    ], rechts=(2,)) + '</div>')
    out.append(kader('<p><b>Draai niet alles in één beeldverhouding.</b> Wat je verticaal niet hebt gefilmd, bestaat niet, en bijfilmen kost een tweede dag. En kom nooit zonder shotlist: dan film je wat je toevallig tegenkomt, en merk je pas bij de montage dat het belangrijkste ontbreekt.</p>', 'Waar het misgaat', 'rood'))

    out.append(h2('Daarna: de montage'))
    out.append(checklist([
        ('Selectie en ruwe montage: een ruwe versie.', 'content · 1,5 u'),
        ('Varianten knippen: meerdere varianten om tegen elkaar te testen. Vijf goede varianten leveren meer op dan één mooie, want je weet vooraf niet welke werkt.', 'content · 2 u'),
        ('Exporteren in 9:16, 1:1 en 4:5.', 'content · 0,5 u'),
        ('Stills selecteren en bewerken, voor de landingspagina en de statische advertenties.', 'content · 0,5 u'),
        ('Alles door de merkcheck (07.3) voordat het in de campagne gaat.', 'content'),
    ]))
    return ''.join(out)


# ---------------------------------------------------------------- 07.3 Merkcheck
def merkcheck():
    out = [kader('<p>Elke uiting die naar buiten gaat, klopt met het merk van de klant: kleur, typografie, toon en beeld. Ook een snelle variant, ook een test. '
                 'Wat vandaag klikt maar het merk beschadigt, kost op termijn meer dan het oplevert. Het merk bepaalt de grenzen; binnen die grenzen kiest de data.</p>'
                 '<p><b>Snel mag, off-brand niet.</b> Een uiting die niet klopt, gaat niet live. Dat kost soms een dag.</p>',
                 'Spelregel 7 · altijd on-brand', 'zwart')]

    out.append(h2('Eén keer: het merk van de klant vastleggen'))
    out.append(p('In blok 01 van het fundament (taak 13 tot en met 15). Je stelt alleen vast of er genoeg ligt om mee te adverteren. Daarna is dit blad de meetlat voor elke uiting. '
                 '<b>Geen bruikbaar merk?</b> Dan leg je hier kleur en typografie vast, en houden we ons daaraan. Begin geen huisstijltraject: dat is een apart project met een eigen prijs.', 'klein'))
    out.append(vakken(['Klant en bedrijf', 'Vastgelegd door en op'], 2, 28))
    oordeel = '<span class="opt">bruikbaar</span> <span class="opt">deels</span> <span class="opt">niet</span> <span class="opt">ontbreekt</span>'
    out.append(tabel(['Asset', 'Wat er ligt, en in welk bestandsformaat', 'Oordeel'], [
        ['<b>Logo</b> (liefst vector)', '', oordeel],
        ['<b>Kleuren</b>', '', oordeel],
        ['<b>Lettertype</b>', '', oordeel],
        ['<b>Huisstijlhandboek</b>', '', oordeel],
        ['<b>Foto en video</b>', '', oordeel],
    ]))
    out.append(vakken(['Hoofdkleur (hex)', 'Tweede kleur (hex)', 'Accent (hex)', 'Lettertype koppen', 'Lettertype tekst', 'Logo op licht en op donker'], 3, 30))
    out.append(vakken(['Wat de klant absoluut niet wil zien (formulier, vraag 11)', 'Woorden die klanten zelf gebruiken (formulier, vraag 2 en 3)'], 2, 44))

    out.append(NIEUWE_PAGINA)
    out.append(h2('Per uiting, voordat hij live gaat <span class="sub" style="font-size:9pt;font-weight:400">· één blad per uiting of set, ook voor een snelle variant</span>'))
    out.append(vakken(['Klant', 'Uiting of set', 'Kanaal en formaat', 'Gemaakt door'], 4, 30))

    out.append(h3('Kleur'))
    out.append(checklist([
        ('Alleen kleuren uit het vastgelegde palet. Geen tinten zelf gemengd.', 'kleur'),
        ('Eén accent per uiting, nooit twee.', 'kleur'),
        ('Tekst is goed leesbaar op de achtergrond, ook op een telefoon in de zon.', 'kleur'),
    ]))
    out.append(h3('Typografie'))
    out.append(checklist([
        ('Koppen en tekst in de vastgelegde lettertypes. Geen derde lettertype.', 'type'),
        ('Tekst valt binnen het veilige vlak van het formaat, en is leesbaar op het kleinste scherm.', 'type'),
    ]))
    out.append(h3('Toon'))
    out.append(checklist([
        ('Zegt de afgetekende boodschap (taak 9), in dezelfde woorden als de landingspagina.', 'toon'),
        ('Had deze zin ook bij de concurrent kunnen staan? Dan is hij niet af.', 'toon'),
        ('In de woorden van de klanten van de klant, geen vakjargon en geen holle woorden.', 'toon'),
        ('Geen belofte die we niet kunnen waarmaken. Claim, bewijs, stop.', 'toon'),
        ('Niets uit “wat de klant absoluut niet wil zien”.', 'toon'),
    ]))
    out.append(h3('Beeld'))
    out.append(checklist([
        ('Eigen beeld van de draaidag of van de klant: echte mensen, echt werk. Stock alleen zolang er geen eigen beeld is.', 'beeld'),
        ('Het juiste formaat voor het kanaal (9:16, 4:5 of 1:1), niet uitgerekt en niet onherkenbaar bijgesneden.', 'beeld'),
        ('Gemaakt uit de advertentiesjablonen.', 'beeld'),
        ('Het logo in de eigen kleuren en onvervormd: niet gekanteld, geen schaduw, met ruimte eromheen.', 'beeld'),
    ]))
    out.append(h3('Meting'))
    out.append(checklist([
        ('De link gaat naar de juiste landingspagina, op het subdomein van de klant.', 'meting'),
        ('De herkomst gaat mee: kanaal, campagne, advertentie en de click id.', 'meting'),
        ('Een testaanvraag komt binnen in het dashboard, en de conversie vuurt op de bedankpagina.', 'meting'),
        ('De cookiemelding werkt; de meting werkt met en zonder toestemming.', 'meting'),
    ]))
    uitkomst = '<div class="q" style="font-weight:600;margin-top:8pt">Uitkomst</div>%s<div class="regels">%s</div>' % (opties(['akkoord, mag live', 'terug naar de maker:']), '<div class="regel"></div>' * 2)
    out.append('<div style="break-inside:avoid">' + twee(uitkomst, handtekening('Gecheckt door', 'Paraaf en datum').replace('margin-top:18pt', '')) + '</div>')

    out.append(NIEUWE_PAGINA)
    out.append(h2('Logboek'))
    out.append(p('Elke uiting die door de merkcheck ging, op één regel. Zo zie je terug wat er live ging en wie het tekende.', 'klein'))
    out.append(tabel(['Datum', 'Uiting of set', 'Kanaal', 'Gecheckt door', 'Uitkomst'],
                     [['&nbsp;', '', '', '', '<span class="opt">live</span> <span class="opt">terug</span>']] * 22))
    return ''.join(out)


DOCS = [
    dict(code='07.1', titel='Fundament: de 76 taken', fase=FASE, voor='Intern',
         wanneer='Dag 1 tot en met dag 19 live; dag 26 eerste cijfers', wie='Techniek, campagne, content, strategie, klantcontact',
         lead='Zes blokken, 27 onderdelen, 76 taken in halve uren: 52,5 tot 53 uur werk over vier weken. Per taak de rol en de uren, met het tijdpad in werkdagen erbij.',
         body=fundament()),
    dict(code='07.2', titel='Draaidag: planning en shotlist', fase=FASE, voor='Intern',
         wanneer='Week 3 of 4 van het fundament (dag 11 – 20)', wie='Content, met klantcontact en de videograaf',
         lead='De dagdelen van de klant naast die van de videograaf, wie en wat er in beeld moet, en de shotlist. Vul het in vóór de draaidag en neem het mee.',
         concept=True, body=draaidag()),
    dict(code='07.3', titel='Merkcheck', fase=FASE, voor='Intern',
         wanneer='In blok 01, en vóór elke uiting die live gaat', wie='Content',
         lead='Eén keer het merk van de klant vastleggen, en daarna elke uiting langs dezelfde lat: kleur, typografie, toon, beeld en meting. Wat niet klopt, gaat niet live.',
         concept=True, body=merkcheck()),
]
