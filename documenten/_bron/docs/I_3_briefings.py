# -*- coding: utf-8 -*-
# Interne briefings: het klantprofiel (I.3), de campagnebriefing als leeg sjabloon (I.4), de specificatie
# voor het portaal (I.5), en ingevulde campagnebriefings per klant (code K...). Sjabloon en ingevulde
# versie delen één indeling, zodat elke briefing er hetzelfde uitziet; een leeg veld blijft staan.
from base import *

def voorstel(): return chip('voorstel', 'oranje')
def bron(t):
    kleur = {'systeem': 'blauw', 'suggestie': 'groen', 'keuze': 'oranje'}.get(t, 'blauw')
    return ' <span class="chip c-%s" style="font-weight:500">%s</span>' % (kleur, t)

LEEG_VELD = '<span style="color:var(--tx3)">-</span>'

def streep(rijen):
    """Lege cellen in ingevulde tabellen krijgen een streepje; totaalregels niet."""
    return [r if isinstance(r, tuple) else [c if str(c).strip() else LEEG_VELD for c in r] for r in rijen]

LIJNEN = '<div class="regels"><div class="regel"></div><div class="regel"></div></div>'
TH = 'style="width:30%;vertical-align:top;color:var(--tx);font-weight:600;font-size:8.8pt;padding:6pt 6pt"'

def velden_tabel(rijen, waarden=None, leeg_sjabloon=True):
    """rijen: (veld, hint, bron). Sjabloon: hint en schrijflijnen. Ingevuld: de waarde, of leeg."""
    if not rijen: return ''
    out = ['<table class="vt"><tbody>']
    for veld, hint, b in rijen:
        if waarden is None:
            inhoud = ('<div class="klein">%s</div>' % hint if hint else '') + LIJNEN
        else:
            inhoud = waarden.get(veld) or LEEG_VELD
        out.append('<tr><th %s>%s%s</th><td>%s</td></tr>' % (TH, veld, bron(b) if b and waarden is None else '', inhoud))
    out.append('</tbody></table>')
    return ''.join(out)

def opmerking(tekst=None):
    if tekst is None:
        return '<div class="vak" style="min-height:40pt;margin:2pt 0 10pt"><div class="klein" style="font-weight:500">Opmerkingen</div></div>'
    inhoud = (ul(tekst) if tekst else LEEG_VELD) if isinstance(tekst, list) else (tekst or LEEG_VELD)
    return '<div class="vak" style="margin:2pt 0 10pt"><div class="klein" style="font-weight:500">Opmerkingen</div>%s</div>' % inhoud

# ---------------------------------------------------------------- I.3 Klantprofiel
KP = [
 ('1 · De basis', [
   ('Klantnaam', '', 'systeem'), ('Website', '', 'systeem'), ('Branche en vestiging(en)', '', 'systeem'),
   ('Marketingmanager', 'Vast aanspreekpunt aan onze kant.', 'systeem'),
   ('Type', 'Retainer of project.', 'keuze'),
   ('Pakket en start', 'Pakket, campagnes tegelijk, startdatum, ritme van de Performance Review.', 'systeem'),
 ]),
 ('2 · Het bedrijf in het kort', [
   ('Wat ze verkopen', 'Hooguit drie diensten of producten, met de waarde per opdracht of klant.', ''),
   ('Waarom klanten voor hen kiezen', 'In hun woorden. Iets wat de concurrent niet had kunnen zeggen.', ''),
   ('Prijsniveau en concurrenten', 'Van wie verliezen ze, en waarop.', ''),
   ('Hoe het jaar loopt', 'Pieken, dalen, vaste momenten (feestdagen, seizoen, beurzen).', ''),
 ]),
 ('3 · De doelen', [
   ('De doelregel', 'Letterlijk uit het voorstel: aantal per maand, tegen maximaal wat, vanaf wanneer.', 'systeem'),
   ('Extra omzet, marge, terugverdientijd', 'Uit de rekensom (04.1).', 'systeem'),
   ('Wat ze aankunnen', 'Hoeveel extra werk per maand, en waar het vastloopt.', ''),
 ]),
 ('4 · De klant van de klant', [
   ('De beste klant', 'Waar ze het meest aan verdienen en het prettigst mee werken.', ''),
   ('Regio', '', ''),
   ('Wat ze niet willen', 'Werk, klanten of regio’s om uit te sluiten.', ''),
 ]),
 ('5 · Het merk', [
   ('Huisstijl', 'Kleuren, lettertypes, logo’s; waar de bestanden staan.', ''),
   ('Toon', 'Hoe ze praten: je of u, formeel of los, woorden die wel en niet kunnen.', ''),
   ('Beeld', 'Beeldenbank (Kive), draaidagen, wat niet in beeld mag.', ''),
 ]),
 ('6 · Accounts en systemen', [
   ('Advertentieaccounts', 'Per kanaal het account en het ID. Alles op naam van de klant.', 'systeem'),
   ('Website', 'Systeem, wie beheert hem, onze toegang.', ''),
   ('E-mail', 'MailerLite: lijsten en aantal adressen.', 'systeem'),
   ('Boeken, aanvragen, CRM', 'Waar aanvragen of reserveringen binnenkomen, en hoe wij de stand zien.', ''),
 ]),
 ('7 · Afspraken', [
   ('Jouw kant', 'De vijf afspraken (04.4): opvolging, oordeel per aanvraag, één beslisser, en de termijnen.', ''),
   ('Gevoeligheden', 'Wat eerder misging, waar de klant scherp op is.', ''),
 ]),
]

def klantprofiel():
    out = [kader('<p>Eén profiel per klant, gemaakt aan het eind van de onboarding uit wat er al ligt: de vragenlijst van het intakegesprek (03.2), het onboardingformulier (06.2) en het voorstel (04.2). Vraag niets opnieuw. Wie aan de klant werkt, leest dit eerst. In het portaal is dit de klantkaart; een nieuwe campagnebriefing haalt de basis, de contactpersonen en de vaste doelgroepen hier vandaan.</p>', 'Zo gebruik je dit profiel', 'blauw')]
    for titel, rijen in KP:
        out.append(h3(titel)); out.append(velden_tabel(rijen))
        if titel.startswith('1'):
            out.append(h3('Contactpersonen' + bron('systeem')))
            out.append(tabel(['Naam', 'Rol', 'Telefoon', 'E-mail', 'Waarvoor'], [['', '', '', '', ''] for _ in range(4)]))
        if titel.startswith('4'):
            out.append(h3('Vaste doelgroepen' + bron('keuze')))
            out.append(p('De doelgroepen die bij deze klant steeds terugkomen. In een campagnebriefing kies je hieruit.', 'klein'))
            out.append(tabel(['Doelgroep', 'Wie het zijn', 'Bron (klantenlijst, websitebezoekers, interesses)'], [['', '', ''] for _ in range(5)]))
    out.append(h3('8 · Campagnes'))
    out.append(tabel(['Campagne', 'Start', 'Einde', 'Status', 'Resultaat'], [['', '', '', '', ''] for _ in range(5)]))
    out.append(velden(['Laatst bijgewerkt op', 'Door']))
    return ''.join(out)

# ---------------------------------------------------------------- I.4 Campagnebriefing
VINK = '<span class="opt" style="margin-right:6pt">%s</span>'
def kanalen_tabel(regels):
    """Eén regel per kanaal, middel of stuk content: wat, aantal, toelichting, en of het er al is of nog gemaakt moet worden."""
    if not regels:
        rijen = [['', '', '', VINK % 'bestaat' + VINK % 'nog te maken'] for _ in range(6)]
        return tabel(['Kanaal, middel of content', 'Aantal', 'Toelichting', 'Status'], rijen) + p('Kies uit: Meta Ads targeting, Meta Ads retargeting, Google Ads, Microsoft Ads, LinkedIn, TikTok, mailing, landingspagina, content (beeldenbank, draaidag, materiaal van de klant, sjablonen). Wat nog gemaakt moet worden, komt in de tijdlijn.', 'klein')
    st = lambda x: chip('nog te maken', 'oranje') if x == 'maken' else chip('bestaat', 'groen')
    return tabel(['Kanaal, middel of content', 'Aantal', 'Toelichting', 'Status'], streep([[a, b, c, st(d)] for a, b, c, d in regels]))

CB = [
 ('1 · De basis', [
   ('Campagnenaam', '', ''),
   ('Klant', 'Uit het klantprofiel.', 'systeem'),
   ('Type', 'Retainer of project.', 'keuze'),
   ('Marketingmanager', 'Gekoppeld aan de klant.', 'systeem'),
   ('Contactpersonen', 'Een of meer, uit de contacten van de klant.', 'keuze'),
 ]),
 ('2 · Het doel', [
   ('Doel in één zin', 'Wat moet er aan het eind gebeurd zijn.', 'suggestie'),
   ('Wat telt als resultaat', 'De conversie: een aanvraag, een reservering, een aankoop.', ''),
   ('Advertentiebudget', 'Kies: berekend uit het doel (de hypothese onderaan rekent het advies uit), of een vast budget dat je zelf invult (de hypothese rekent dan uit wat je ermee kunt halen).', 'keuze'),
 ]),
 ('3 · Aanbod en boodschap', [
   ('Wat we verkopen', 'Product, prijs, wat erbij zit.', ''),
   ('Kernboodschap', 'De zin die in elke uiting terugkomt.', 'suggestie'),
   ('Waarom nu', 'De urgentie: datum, beperkt aantal, voordeel.', 'suggestie'),
   ('Wat we niet beloven', 'Beperkingen en voorwaarden die iemand moet weten voordat die boekt.', 'suggestie'),
 ]),
 ('4 · Doelgroep', [
   ('Doelgroepen', 'Kies uit de vaste doelgroepen van de klant, of voeg er een toe.', 'keuze'),
   ('Regio', '', ''),
   ('Uitsluiten', '', ''),
 ]),
 ('5 · Kanalen en content', [
 ]),
 ('6 · De planning', [
   ('Start', '', ''),
   ('Einde', '', ''),
 ]),
 ('7 · Afspraken met de klant', [
   ('Wat de klant zelf doet', 'Bijvoorbeeld: elke week de stand doorgeven.', ''),
 ]),
 ('8 · Achtergrondinformatie', [
   ('Wat we weten van vorige keer', '', ''),
   ('Risico’s', '', 'suggestie'),
 ]),
]

def campagnebriefing(w=None):
    """w: dict met de ingevulde waarden, of None voor het lege sjabloon."""
    leeg = w is None
    g = (lambda k: None) if leeg else (lambda k: w.get(k, ''))
    out = []
    if leeg:
        out.append(kader('<p>Eén briefing per campagne. De marketingmanager werkt hem uit in het portaal, stuurt hem als <b>voorstel</b> naar de klant, en deelt hem pas na <b>akkoord</b> met het team. De klant ziet dezelfde versie als wij. Velden met '
                         + bron('systeem') + ' komen uit het klantprofiel, ' + bron('keuze') + ' kies je uit een lijst, en bij ' + bron('suggestie') + ' kun je zelf typen of op “doe suggestie” klikken. Een veld dat niet van toepassing is, blijft leeg staan, zodat elke briefing dezelfde indeling heeft. Verandert er iets na het versturen, dan wordt het een nieuwe versie.</p>', 'Zo werkt de briefing', 'blauw'))
    for titel, rijen in CB:
        out.append(h3(titel))
        if 'Kanalen' in titel:
            out.append(kanalen_tabel(g('kanalen')))
        out.append(velden_tabel(rijen, w))
        if 'doel' in titel:
            out.append(h3('KPI’s'))
            out.append(tabel(['Product of onderdeel', 'Datum', 'Doel (aantal)', 'Prijs', 'Omzet'], streep(g('kpi')) if g('kpi') else [['', '', '', '', ''] for _ in range(4)] + [('tot', ['Totaal', '', '', '', ''])], rechts=(2, 3, 4)))
            out.append(opmerking(g('kpi_opmerking')))
        if 'planning' in titel:
            out.append(opmerking(g('planning_opmerking')))
            out.append(h3('Tijdlijn' + (bron('suggestie') if leeg else '')))
            out.append(tabel(['Deadline', 'Wat', 'Verantwoordelijke'], streep(g('tijdlijn')) if g('tijdlijn') else [['', '', ''] for _ in range(7)]))
            if leeg: out.append(p('Datums kies je in een kalender. Met “doe suggestie” maakt het portaal de tijdlijn uit de start- en einddatum en wat er opgeleverd moet worden; elke regel blijft aan te passen. Vaste omschrijvingen: briefing akkoord, landingspagina klaar, content klaar, merkcheck, live, contentronde, mailing, beslismoment, einde campagne, evaluatie. Na akkoord wordt de tijdlijn een taak met subtaken in ClickUp.', 'klein'))
        if 'Doelgroep' in titel:
            out.append(opmerking(g('doelgroep_opmerking')))
        if 'Afspraken' in titel:
            out.append(opmerking(g('afspraken_opmerking')))
    out.append(NIEUWE_PAGINA + h3('9 · Hypothese'))
    out.append(hypothese_blok(None if leeg else w.get('hyp')))
    return ''.join(out)

# ---------------------------------------------------------------- hypothese: berekend uit de briefing
def nl(x, dec=0):
    t = ('{:,.%df}' % dec).format(x).replace(',', 'X').replace('.', ',').replace('X', '.')
    return t

def bereken(doel, per_conversie, conversieratio, doorklik, cpm, omzet, bronnen, budget=None, buffer=0.2, scenario_cr=None, weken=None, kanalen_extra='', opmerkingen=None):
    """Twee standen. Zonder budget: van het doel terug naar het budget dat nodig is (alles via advertenties).
    Met een vast budget: van het budget vooruit naar wat we ermee verwachten te halen."""
    h = dict(doel=doel, per_conversie=per_conversie, cr=conversieratio, ctr=doorklik, cpm=cpm, omzet=omzet, bronnen=bronnen, buffer=buffer,
             weken=weken, kanalen_extra=kanalen_extra, opmerkingen=opmerkingen or [], vast=budget is not None)
    if budget is None:
        conv = round(doel / per_conversie); bez = conv / conversieratio; imp = bez / doorklik; nodig = imp / 1000 * cpm
        advies = round(nodig * (1 + buffer) / 100) * 100
        h.update(conv=conv, bez=bez, imp=imp, nodig=nodig, budget=advies, resultaat=doel, min_cr=conv / (advies / cpm * 1000 * doorklik))
    else:
        imp = budget / cpm * 1000; bez = imp * doorklik; conv = bez * conversieratio
        h.update(conv=conv, bez=bez, imp=imp, nodig=None, budget=budget, resultaat=conv * per_conversie, min_cr=round(doel / per_conversie) / (imp * doorklik))
    h.update(per_klik=cpm / 1000 / doorklik, per_conv=h['budget'] / h['conv'], per_eenheid=h['budget'] / h['resultaat'], pct_budget=h['budget'] / omzet)
    if scenario_cr:
        if budget is None:
            b2 = round(doel / per_conversie) / scenario_cr; n2 = b2 / doorklik / 1000 * cpm
            h['scen'] = dict(cr=scenario_cr, tekst='kost het doel € %s, %s%% van de omzet' % (nl(n2), pct(n2 / omzet)))
        else:
            r2 = imp * doorklik * scenario_cr * per_conversie
            h['scen'] = dict(cr=scenario_cr, tekst='halen we met dit budget ongeveer %s van de %s' % (nl(r2), nl(doel)))
    return h

def pct(x):
    v = x * 100
    return nl(v, 0) if abs(v - round(v)) < 1e-9 else nl(v, 1)

def meervoud(w):
    return {'reservering': 'reserveringen', 'aanvraag': 'aanvragen', 'aankoop': 'aankopen', 'conversie': 'conversies'}.get(w, w + 's')

def hypothese_blok(h):
    if h is None:
        return (p('Het portaal rekent de hypothese uit wat in de briefing staat: het doel en de omzet uit de KPI’s, het advertentiebudget, en de aannames hieronder. Is het budget “berekend uit het doel”, dan rekent de hypothese uit welk budget nodig is, alsof het hele doel via advertenties komt; dat advies is de bovengrens. Is het een vast budget, dan rekent de hypothese uit wat we met dat budget verwachten te halen.', 'klein')
                + h3('Aannames') + tabel(['Aanname', 'Waarde', 'Bron'], [
                    ['Eenheden per conversie', '', ''], ['Conversieratio landingspagina', '', ''], ['Doorklikratio', '', ''],
                    ['Kosten per 1.000 impressies', '', ''], ['Buffer', '20%', 'Vaste regel'], ['Omzet van het doel', '', 'Uit de KPI’s']])
                + opmerking()
                + vakken(['Impressies', 'Bezoekers', 'Conversies', 'Doel of verwacht resultaat'], 1, 26)
                + vakken(['Het budgetadvies, of het verwachte resultaat bij een vast budget'], 1, 44)
                + vakken(['De zwakste schakel'], 1, 40))
    b = h['bronnen']
    aann = [('Eenheden per conversie', nl(h['per_conversie']), b['per_conversie']), ('Conversieratio landingspagina', pct(h['cr']) + '%', b['cr']),
            ('Doorklikratio', pct(h['ctr']) + '%', b['ctr']), ('Per 1.000 impressies', '€ ' + nl(h['cpm'], 2), b['cpm']),
            ('Buffer', pct(h['buffer']) + '%' if not h['vast'] else 'n.v.t.', 'vaste regel'), ('Omzet van het doel', '€ ' + nl(h['omzet']), 'uit de KPI’s')]
    t = [h3('Aannames'), '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5pt;margin-bottom:4pt">%s</div>' % ''.join(
        '<div class="vak" style="padding:5pt 8pt"><div class="klein">%s</div><b style="font-family:var(--fd);font-size:11.5pt">%s</b><div class="klein" style="font-size:7.5pt">Bron: %s</div></div>' % a for a in aann)]
    t.append(opmerking(h['opmerkingen']))
    vast = h['vast']
    t.append(h3('Wat we verwachten met dit budget' if vast else 'Wat er nodig is, als alles via advertenties komt'))
    breedte = [100, 76, 54, 38]
    rijen = [('Impressies', nl(h['imp'])), ('Bezoekers landingspagina', nl(h['bez'])), ('Conversies', nl(h['conv'])),
             ('Verwacht resultaat (doel %s)' % nl(h['doel']) if vast else 'Doel', nl(h['resultaat']))]
    kleuren = [('#e0efff', '#0857c3'), ('#99c9ff', '#003967'), ('#007aff', '#ffffff'), ('#c4f000', '#1d1d1f')]
    stappen = ['%s%% klikt door' % pct(h['ctr']), '%s%% converteert' % pct(h['cr']), '× %s per conversie' % nl(h['per_conversie'])]
    t.append('<div style="margin:6pt 0 8pt">')
    for k2, (lab, waarde) in enumerate(rijen):
        bg, fg = kleuren[k2]
        t.append('<div style="width:%d%%;margin:0 auto;background:%s;color:%s;border-radius:6pt;padding:4pt 10pt;display:flex;justify-content:space-between;align-items:baseline;break-inside:avoid">'
                 '<span style="font-size:8.8pt;font-weight:500">%s</span><b style="font-family:var(--fd);font-size:12pt;color:%s">%s</b></div>' % (breedte[k2], bg, fg, lab, fg, waarde))
        if k2 < len(stappen):
            t.append('<div style="text-align:center;font-size:7.8pt;color:var(--tx2);padding:1pt 0">↓ %s</div>' % stappen[k2])
    t.append('</div>')
    tempo = (' Per week ongeveer %s impressies, %s bezoekers en %s conversies.' % (nl(h['imp'] / h['weken']), nl(h['bez'] / h['weken']), nl(h['conv'] / h['weken']))) if h.get('weken') else ''
    t.append(p('Wat het kost: € %s per 1.000 impressies, € %s per klik, € %s per conversie, € %s per eenheid van het doel.%s' % (
        nl(h['cpm'], 2), nl(h['per_klik'], 2), nl(h['per_conv'], 2), nl(h['per_eenheid'], 2), tempo), 'klein'))
    if not vast:
        cijfers = [('Nodig', '€ ' + nl(h['nodig']), ''), ('Advies, met %s%% buffer' % pct(h['buffer']), '€ ' + nl(h['budget']), 'color:var(--blue-link)'), ('Van de omzet', pct(h['pct_budget']) + '%', '')]
        tekst = ('<p><b>Dit is de bovengrens:</b> gerekend alsof het hele doel via advertenties komt. Onze hypothese is dat %s een deel daarvan invullen, zodat er minder advertentiebudget nodig is. Hoeveel, meten we per bron in het dashboard, en dat rapporteren we in de Performance Review. Met het advies is het doel haalbaar zolang de landingspagina minimaal <b>%s%%</b> van de bezoekers laat converteren.</p>'
                 % (h['kanalen_extra'] or 'andere kanalen', pct(h['min_cr'])))
        titel = 'Het budgetadvies'
    else:
        cijfers = [('Advertentiebudget', '€ ' + nl(h['budget']), ''), ('Verwacht resultaat', '%s van %s' % (nl(h['resultaat']), nl(h['doel'])), 'color:var(--blue-link)'), ('Van de omzet', pct(h['pct_budget']) + '%', '')]
        tekst = ('<p>Met dit budget verwachten we ongeveer %s%% van het doel uit advertenties. Wat %s erbij brengen, komt daar bovenop; dat meten we per bron. Het hele doel uit advertenties halen kan alleen als de landingspagina minimaal <b>%s%%</b> van de bezoekers laat converteren.</p>'
                 % (nl(h['resultaat'] / h['doel'] * 100), h['kanalen_extra'] or 'andere kanalen', pct(h['min_cr'])))
        titel = 'Het verwachte resultaat'
    t.append(kader('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8pt;margin-bottom:6pt">%s</div>%s' % (''.join(
        '<div><span class="klein">%s</span><div class="groot" style="%s">%s</div></div>' % (a, c, b2) for a, b2, c in cijfers), tekst), titel, 'grijs'))
    if h.get('scen'):
        t.append(kader('<p>De conversie op de landingspagina. Valt die van %s%% naar %s%%, dan %s. Daarom testen we de landingspagina vóór de start, en kijken we na twee weken of de conversie boven de %s%% ligt.</p>' % (
            pct(h['cr']), pct(h['scen']['cr']), h['scen']['tekst'], pct(h['min_cr'])), 'De zwakste schakel', 'rood'))
    return ''.join(t)

# ---------------------------------------------------------------- I.5 Specificatie portaal
def specificatie():
    out = [p('Hoe de campagnebriefing (I.4) en het klantprofiel (I.3) straks in het portaal werken. Dit is de opdracht voor wie het portaal bouwt.')]
    out.append(h2('De stappen'))
    out.append(tabel(['Stap', 'Wat er gebeurt', 'Wie'], [
        ['1 · Starten', 'Op de klantkaart: “nieuwe campagne”. Klant, marketingmanager, contactpersonen en vaste doelgroepen staan er meteen in, uit het klantprofiel.', 'Marketingmanager'],
        ['2 · Uitwerken', 'De velden invullen, te beginnen met het doel en de KPI’s. Het advertentiebudget vul je niet zelf in: dat volgt uit de hypothese. Bij velden met een suggestieknop kun je zelf typen of op “doe suggestie” klikken; het portaal vult het veld dan op basis van wat al is ingevuld, en je past het aan. Bij het budget en andere velden kan “voorstel” aangevinkt worden.', 'Marketingmanager'],
        ['3 · Tijdlijn', 'Datums kies je in een kalender. “Doe suggestie” maakt de tijdlijn uit de start- en einddatum en wat er opgeleverd moet worden (landingspagina, content, mailings, live, beslismomenten, einde, evaluatie). Elke regel blijft aan te passen: datum, omschrijving, verantwoordelijke.', 'Marketingmanager'],
        ['4 · Versturen als voorstel', 'Bij het versturen schrijft het portaal de samenvatting bovenaan; die is aan te passen. De briefing gaat als voorstel naar de contactpersonen, als digitale link en als pdf om te printen. Versie 1.0 met datum, rechtsboven. Geen interne codes of knoppen in wat de klant ziet. De klant ziet dezelfde versie als wij.', 'Marketingmanager'],
        ['5 · Akkoord', 'De klant geeft akkoord. Alles wat “voorstel” was, wordt “akkoord”.', 'Klant'],
        ['6 · Naar ClickUp', 'Bij akkoord maakt het portaal in ClickUp een taak met de campagnenaam, in de lijst van de klant, met een subtaak per regel uit de tijdlijn: omschrijving, verantwoordelijke en deadline. Pas dan begint het team.', 'Portaal'],
        ['7 · Wijzigen', 'Verandert er iets na het versturen, dan wordt het een nieuwe versie (1.1, 2.0) met datum. Oude versies blijven bewaard. Wijzigt de tijdlijn na akkoord, dan worden de subtaken in ClickUp bijgewerkt.', 'Marketingmanager'],
        ['8 · Afronden', 'Na het einde staat het resultaat naast het doel: de KPI’s uit de briefing naast de cijfers uit het marketingdashboard. De briefing blijft op de klantkaart, als historie.', 'Portaal, marketingmanager'],
    ]))
    out.append(h2('Per veld'))
    out.append(tabel(['Veld', 'Bron', 'Soort'], [
        ('grp', 'Kop'),
        ['Samenvatting bovenaan', 'Suggestie bij het versturen, aan te passen', 'Tekst, één of twee zinnen'],
        ['Klant, start, einde, status', 'Systeem en invoer', 'Status: voorstel of akkoord'],
        ['Versie', 'Systeem', 'Nummer en datum, rechtsboven'],
        ('grp', 'De basis'),
        ['Campagnenaam', 'Invoer', 'Tekst'],
        ['Klant', 'Systeem (klantprofiel)', 'Vast'],
        ['Type', 'Keuze', 'Retainer of project'],
        ['Marketingmanager', 'Systeem (gekoppeld aan de klant)', 'Vast'],
        ['Contactpersonen', 'Keuze uit de contacten van de klant', 'Een of meer'],
        ('grp', 'Het doel'),
        ['Doel in één zin', 'Invoer of suggestie', 'Tekst'],
        ['Wat telt als resultaat', 'Invoer', 'Tekst'],
        ['Advertentiebudget', 'Keuze', 'Berekend uit het doel (het advies uit de hypothese, met verdeling per maand over targeting en retargeting) of een vast budget dat je invult. Met vinkje “voorstel”'],
        ['KPI’s', 'Invoer', 'Regels: product of onderdeel, datum (kalender), doel (aantal), prijs, omzet (berekend), plus totaal'],
        ['Opmerkingen bij de KPI’s', 'Invoer', 'Opsomming'],
        ['Aannames van de hypothese', 'Normen per branche, per campagne aan te passen', 'Standaardvelden, alleen een getal: eenheden per conversie (meestal 1), conversieratio, doorklikratio, kosten per 1.000 impressies, buffer (vaste regel), omzet (uit de KPI’s). Per aanname de bron. Daaronder een opmerkingenveld voor duiding, bijvoorbeeld “3 couverts per reservering”'],
        ['Hypothese (onderaan)', 'Berekend door het portaal', 'Twee standen. Budget berekend uit het doel: van het doel terug naar impressies en het budget dat nodig is, alsof alles via advertenties komt; het advies (met buffer) is de bovengrens, als percentage van de omzet, met de minimale conversieratio. Vast budget: van het budget vooruit naar het verwachte resultaat, als deel van het doel. Tijdens de campagne staat de hypothese in het dashboard naast de echte cijfers.'],
        ['De zwakste schakel', 'Berekend', 'Welke schakel het eerst knelt als een aanname tegenvalt, met de getallen erbij'],
        ('grp', 'De planning'),
        ['Start, einde', 'Invoer', 'Datum (kalender)'],
        ['Opmerkingen bij de planning', 'Invoer', 'Opsomming, bijvoorbeeld een stopcriterium of beslismoment'],
        ['Tijdlijn', 'Invoer of suggestie', 'Regels: deadline (kalender), vaste omschrijving met toelichting, verantwoordelijke'],
        ('grp', 'Aanbod, doelgroep, kanalen'),
        ['Wat we verkopen', 'Invoer', 'Tekst'],
        ['Kernboodschap, waarom nu, wat we niet beloven', 'Invoer of suggestie', 'Tekst'],
        ['Doelgroepen', 'Keuze uit de vaste doelgroepen van de klant, of nieuw', 'Een of meer'],
        ['Regio, uitsluiten, opmerkingen', 'Invoer', 'Tekst en opsomming'],
        ['Kanalen, middelen en content', 'Keuze per regel', 'Per regel: wat (kanaal, landingspagina, mailing, content), aantal, toelichting, en een vinkje: bestaat al of nog te maken. Wat nog gemaakt moet worden, komt in de tijdlijn'],
        ('grp', 'Afspraken en achtergrond'),
        ['Wat de klant zelf doet, opmerkingen', 'Invoer', 'Tekst en opsomming'],
        ['Achtergrond', 'Invoer', 'Tekst, mag leeg'],
        ['Risico’s', 'Invoer of suggestie', 'Tekst, mag leeg'],
    ]))
    out.append(kader('<p>Meting staat niet in de briefing: die is bij elke campagne hetzelfde (conversie getest vóór livegang, UTM-tags op alle links) en hoort in de vaste checklist van de campagne in ClickUp. Een aparte takenlijst staat er ook niet in: de tijdlijn is de takenlijst. Betaal- en annuleringsvoorwaarden van de klant zelf horen er alleen in als opmerking.</p>', 'Bewust weggelaten', 'grijs'))
    return ''.join(out)

# ---------------------------------------------------------------- Kerst bij Thiessen
THI = {
 'Campagnenaam': '<b>Kerst bij Thiessen</b>',
 'Klant': 'Thiessen Wijnkoopers',
 'Type': vv('[retainer of project]'),
 'Marketingmanager': vv('[uit het systeem]'),
 'Contactpersonen': vv('[uit de contacten van Thiessen]'),
 'Doel in één zin': 'De kerstbrunch en beide kerstdiners vol: minimaal 180 gasten, goed voor € 12.750 omzet.',
 'Wat telt als resultaat': 'Een reservering via de eventpagina in Odoo, geteld in gasten.',
 'kpi': [
   ['Kerstbrunch', '25 december 2026', '60', '€ 47,50', '€ 2.850'],
   ['Kerstdiner', '25 december 2026', '60', '€ 82,50', '€ 4.950'],
   ['Kerstdiner', '26 december 2026', '60', '€ 82,50', '€ 4.950'],
   ('tot', ['Totaal', '', '180', '', '€ 12.750']),
 ],
 'kpi_opmerking': [
   'Minimaal 60 gasten per moment; meer is welkom.',
   'De omzet is gerekend met de basisprijs. Arrangementen komen erbovenop: all-in is het diner € 115 per persoon.',
   'Op 26 december zijn al 30 gasten geboekt; daar moeten er nog 30 bij.',
   'Op 25 november beslist Thiessen per moment of het doorgaat.',
   voorstel() + ' Doorgaan bij minimaal 30 gasten voor de brunch en 40 per diner.',
   'Tussenstand om op te sturen: op 1 november 15 gasten per moment, op 15 november 30.',
 ],
 'Start': '7 oktober 2026',
 'Einde': '17 december 2026',
 'planning_opmerking': [
   voorstel() + ' Adverteren in twee flights in plaats van elke dag: aankondigen van 7 oktober tot 1 november, en “nog X plaatsen” van 9 november tot 17 december. Retargeting loopt tussendoor door met een klein budget.',
   'Per moment stoppen zodra het vol is.',
   'Vervalt een moment op 25 november, dan passen wij dezelfde dag de advertenties en de landingspagina aan.',
 ],
 'tijdlijn': [
   ['5 oktober 2026', 'Briefing akkoord', 'Marketingmanager'],
   ['6 oktober 2026', 'Landingspagina klaar', 'Content en techniek'],
   ['6 oktober 2026', 'Content klaar, merkcheck', 'Content'],
   ['6 oktober 2026', 'Doelgroepen en meting klaar', 'Campagne en techniek'],
   ['7 oktober 2026', 'Live: flight 1, aankondigen', 'Campagne'],
   ['9 oktober 2026', 'Flyer klaar, met QR-code naar de landingspagina', 'Content'],
   ['elke maandag', 'Stand per moment, budget bijsturen', 'Campagne'],
   [vv('[datum]'), 'Mailing: oktobernieuwsbrief', 'Marketingmanager'],
   ['1 november 2026', 'Einde flight 1; retargeting loopt door', 'Campagne'],
   ['2 november 2026', 'Contentronde: nog X plaatsen per moment', 'Content'],
   [vv('[datum]'), 'Mailing: novembernieuwsbrief', 'Marketingmanager'],
   ['9 november 2026', 'Live: flight 2, nog X plaatsen', 'Campagne'],
   ['10 november 2026', 'Mailing: Kerst bij Thiessen', 'Marketingmanager'],
   ['25 november 2026', 'Beslismoment: doorgaan of annuleren, per moment', 'Thiessen'],
   ['17 december 2026', 'Einde campagne', 'Campagne'],
   ['januari 2027', 'Evaluatie in de Performance Review', 'Marketingmanager'],
 ],
 'Wat we verkopen': (
   '<p><b>Kerstbrunch, eerste kerstdag (25 december), € 47,50 per persoon.</b> Inloop van 11.00 tot 11.30 uur, brunch tot 14.00 uur. '
   'Voor kleine en grote groepen en voor gezinnen. Welkom met mousserende wijn, ook alcoholvrij, en een alternatief voor kinderen. '
   'Daarna een buffet met kerststol met amandelspijs, vleeswaren en kazen, huisgemaakte soep, warme quiche, petit pâté, ambachtelijke broodjes en croissants, en een zoete afsluiter. '
   'De ontvangstbubbel, koffie en thee zitten erbij; andere dranken worden achteraf afgerekend.</p>'
   '<p><b>Kerstdiner, eerste en tweede kerstdag (25 en 26 december), € 82,50 per persoon.</b> Inloop van 18.00 tot 18.30 uur. '
   'Ontvangst met een bubbel en twee amuses, daarna een viergangendiner met tafelwater en brood. '
   'Bob-arrangement € 27,50, wijnarrangement € 32,50. All-in € 115 per persoon.</p>'
   + ul(['Voorgerecht: knolselderij, gerookte paling, dressing van groene kruiden en karnemelk, limoen',
         'Tussengerecht: Iberico wang, schorseneren, tenkasu, pompoen',
         'Hoofdgerecht: hert, rode kool, stoofpeer, schuim van Cepes, Madeira-Port jus',
         'Nagerecht: kerstdessert van Thiessen'])
   + '<p>Op kerstavond is er geen aanbod.</p>'
   '<p>Reserveren via de eventpagina’s: '
   '<a href="https://www.thiessen.nl/event/kerstbrunch-745/register">kerstbrunch</a>, '
   '<a href="https://www.thiessen.nl/event/kerstdiner-581/register">kerstdiner eerste kerstdag</a>, '
   '<a href="https://www.thiessen.nl/event/kerstdiner-583/register">kerstdiner tweede kerstdag</a>.</p>'
 ),
 'Kernboodschap': voorstel() + ' “Vier de kerst bij Thiessen. Jij reserveert, wij zorgen voor de rest, tot en met de mooiste plek aan tafel.”',
 'Waarom nu': 'Beperkt aantal plaatsen per moment. Reserveren zonder aanbetaling: nu boeken, eind november betalen. Vanaf november noemen we per moment hoeveel plaatsen er nog zijn.',
 'Wat we niet beloven': 'Een plek in de kelder of de orangerie: dat bepaalt Thiessen. Dat staat op de landingspagina en in de bevestiging. Dat een moment kan vervallen bij te weinig reserveringen, staat in de voorwaarden en de bevestiging, met een plek bij een ander restaurant in Maastricht. Niet in de advertenties.',
 'Doelgroepen': ul(['Bestaande gasten (klantenlijst)', 'Nieuwsbriefabonnees', 'Websitebezoekers, laatste 180 dagen', 'Volgers en interacties op Instagram en Facebook', 'Nieuw: 30 tot 65 jaar, uit eten en wijn, plus een lookalike van de gasten']),
 'Regio': voorstel() + ' Maastricht en 25 kilometer eromheen.',
 'Uitsluiten': 'Wie al gereserveerd heeft, via de wekelijkse stand uit Odoo.',
 'doelgroep_opmerking': 'De brunch is er ook voor gezinnen met kinderen en voor grotere groepen; daar mogen beeld en tekst bij de brunch op inspelen.',
 'kanalen': [
   ['Meta Ads: targeting', '1 campagne, 2 flights', 'Nieuwe gasten in de regio. Flight 1 aankondigen, flight 2 nog X plaatsen.', 'maken'],
   ['Meta Ads: retargeting', '1 campagne', 'Websitebezoekers, volgers en nieuwsbriefabonnees, tot het einde van de campagne, ook tussen de flights.', 'maken'],
   ['Organische posts Instagram en Facebook', '6', 'Twee in oktober, drie in november, één in december: aankondigen, de brunch, het menu, nog X plaatsen. Met dezelfde beelden als de advertenties.', 'maken'],
   ['Mailing', '3', 'Oktobernieuwsbrief, novembernieuwsbrief en een aparte mailing Kerst bij Thiessen.', 'maken'],
   ['Landingspagina', '1', 'thiessen.nl/events/kerst-bij/thiessen: de drie momenten, het menu, wat erbij zit, de arrangementen, per moment hoeveel plaatsen er nog zijn, en per moment een knop naar de eventpagina om te reserveren.', 'maken'],
   ['Flyer in de winkel', '1 ontwerp', 'De drie momenten met een QR-code naar de landingspagina.', 'maken'],
   ['Content: beeldenbank (Kive)', '3–5 beelden per moment', 'Formaten 1:1, 4:5 en 9:16. Twee contentrondes: aankondigen (oktober) en nog X plaatsen (november).', 'bestaat'],
 ],
 'Wat de klant zelf doet': 'Elke maandag de stand per moment uit Odoo naar support@jamesrobinson.nl. Odoo en de eventpagina’s actueel houden. De flyer in de winkel neerleggen. Gasten informeren als een moment vervalt.',
 'afspraken_opmerking': [
   'Reserveren gaat zonder aanbetaling.',
   'Gasten krijgen vier weken voor kerst een betaallink en betalen uiterlijk een week voor kerst.',
 ],
 'Wat we weten van vorige keer': 'Vorig jaar kwamen er op één dag maar acht gasten. Het personeel moest met kerst werken en had niets te doen; dat gaf veel weerstand. Daarom de afspraak: is er een maand voor kerst te weinig verkocht voor een moment, dan vervalt dat moment.',
 'Risico’s': ul([
   'Zonder aanbetaling valt een deel van de reserveringen af als de betaallink komt.',
   'Drie momenten, één budget: we sturen per moment, en schuiven budget naar wat achterloopt.',
   'De brunch levert het minst op per gast: als het moet, stoppen we daar eerder met adverteren dan bij de diners.',
   'Tussen de flights zakt het bereik. Loopt een moment op 1 november achter, dan starten we flight 2 eerder.',
 ]),
}

THI['hyp'] = bereken(doel=180, per_conversie=3, conversieratio=0.025, doorklik=0.01, cpm=8, omzet=12750,
    bronnen=dict(per_conversie='inschatting; checken in Odoo', cr='marktgemiddelde; eigen norm volgt', ctr='marktgemiddelde Meta; eigen norm volgt', cpm='inschatting; checken in Ads Manager'),
    scenario_cr=0.015, weken=10, kanalen_extra='de organische posts, de drie mailings, de flyer, vaste gasten en direct',
    opmerkingen=['Eenheden per conversie: gemiddeld 3 gasten per reservering (groepsgrootte). Na de eerste tien reserveringen checken in Odoo.', 'Conversie: een reservering via de eventpagina in Odoo.'])
_h = THI['hyp']
_f1 = round(_h['budget'] * 2 / 5 / 100) * 100
THI['Advertentiebudget'] = voorstel() + ' Berekend uit het doel: advies € %s aan Meta (%s%% van de omzet), rechtstreeks van Thiessen; zie de hypothese onderaan. Dat is de bovengrens, als alles via advertenties komt. Flight 1 (oktober) € %s, flight 2 en de retargeting tussendoor (november en december) € %s, verdeeld over targeting en retargeting.' % (
    nl(_h['budget']), pct(_h['pct_budget']), nl(_f1), nl(_h['budget'] - _f1))

THI_SAMENVATTING = ('Thiessen Wijnkoopers wil drie kerstmomenten vullen: de kerstbrunch op eerste kerstdag en het kerstdiner op eerste en tweede kerstdag. '
                    'Het doel is minimaal 180 gasten (ongeveer %s reserveringen) en € 12.750 omzet, met Meta Ads in twee flights, organische posts, '
                    'een eigen landingspagina, drie mailings en een flyer in de winkel, van 7 oktober tot 17 december 2026.') % nl(THI['hyp']['conv'])

DOCS = [
 dict(code='I.3', titel='Klantprofiel', fase='Intern · Briefings', voor='Intern', wanneer='Aan het eind van de onboarding, daarna bijhouden', wie='Marketingmanager',
      lead='Alles wat iemand moet weten voordat die aan een klant werkt: wie de klant is, de contactpersonen, de doelen, de vaste doelgroepen, het merk, de systemen en de afspraken.', body=klantprofiel()),
 dict(code='I.4', titel='Campagnebriefing', fase='Intern · Briefings', voor='Intern en klant', wanneer='Vóór elke nieuwe campagne', wie='Marketingmanager, met akkoord van de klant',
      lead='Eén briefing per campagne: het doel in harde getallen, de planning met de tijdlijn, aanbod, doelgroep, kanalen en content, en de afspraken. Eerst als voorstel naar de klant, na akkoord naar het team en in ClickUp.', body=campagnebriefing()),
 dict(code='I.5', titel='Briefings in het portaal', fase='Intern · Briefings', voor='Intern', wanneer='Bij het bouwen van het portaal', wie='Jim Coumans, Jim Kikken, de bouwer van het portaal',
      lead='Welke velden uit het systeem komen, welke je kiest, waar je een suggestie kunt laten doen, hoe een briefing van voorstel naar akkoord gaat, en hoe de tijdlijn in ClickUp komt.', concept=True, body=specificatie()),
 dict(code='K.THI.1', titel='Kerst bij Thiessen', fase='Campagnebriefing', voor='Intern en klant', wanneer='7 oktober – 17 december 2026', wie='Marketingmanager',
      kop_rechts='Versie 2.0 · 6 oktober 2026', bestand='Campagnebriefing Kerst bij Thiessen', map_sub='Thiessen',
      meta=[('Klant', 'Thiessen Wijnkoopers'), ('Start', '7 oktober 2026'), ('Einde', '17 december 2026'), ('Status', voorstel())],
      lead=THI_SAMENVATTING, body=campagnebriefing(THI)),
]
