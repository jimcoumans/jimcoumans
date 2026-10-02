# -*- coding: utf-8 -*-
# Interne briefings: het klantprofiel (I.3), de campagnebriefing als leeg sjabloon (I.4), de specificatie
# voor het portaal (I.5), en ingevulde campagnebriefings per klant (code K...). Sjabloon en ingevulde
# versie delen één indeling, zodat elke briefing er hetzelfde uitziet; een leeg veld blijft staan.
from base import *

def voorstel(): return chip('voorstel', 'oranje')
def bron(t):
    kleur = {'systeem': 'blauw', 'suggestie': 'groen', 'keuze': 'oranje'}.get(t, 'blauw')
    return ' <span class="chip c-%s" style="font-weight:500">%s</span>' % (kleur, t)

LIJNEN = '<div class="regels"><div class="regel"></div><div class="regel"></div></div>'
TH = 'style="width:30%;vertical-align:top;color:var(--tx);font-weight:600;font-size:8.8pt;padding:6pt 6pt"'

def velden_tabel(rijen, waarden=None, leeg_sjabloon=True):
    """rijen: (veld, hint, bron). Sjabloon: hint en schrijflijnen. Ingevuld: de waarde, of leeg."""
    out = ['<table class="vt"><tbody>']
    for veld, hint, b in rijen:
        if waarden is None:
            inhoud = ('<div class="klein">%s</div>' % hint if hint else '') + LIJNEN
        else:
            inhoud = waarden.get(veld, '')
        out.append('<tr><th %s>%s%s</th><td>%s</td></tr>' % (TH, veld, bron(b) if b and waarden is None else '', inhoud))
    out.append('</tbody></table>')
    return ''.join(out)

def opmerking(tekst=None):
    if tekst is None:
        return '<div class="vak" style="min-height:40pt;margin:2pt 0 10pt"><div class="klein" style="font-weight:500">Opmerkingen</div></div>'
    inhoud = ul(tekst) if isinstance(tekst, list) else (tekst or '')
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
   ('Plafond', 'Wat één resultaat maximaal mag kosten aan advertenties. Aanvinken als het een voorstel is.', ''),
   ('Advertentiebudget', 'Totaal en per maand, verdeeld over de hele looptijd en over targeting en retargeting. Aanvinken als het een voorstel is.', 'suggestie'),
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
   ('Landingspagina', 'De URL, en of hij al bestaat of nog gemaakt moet worden. Moet hij gemaakt worden, dan komt hij in de tijdlijn.', 'keuze'),
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
            out.append(tabel(['Kanaal of middel', 'Aantal', 'Toelichting'], g('kanalen') or [['', '', ''] for _ in range(4)]))
            out.append(tabel(['Content: bron', 'Wat er nodig is', 'Toelichting'], g('content') or [['', '', ''] for _ in range(2)]))
            if leeg: out.append(p('Kanalen en middelen: Meta Ads targeting, Meta Ads retargeting, Google Ads, Microsoft Ads, LinkedIn, TikTok, mailing, landingspagina. Content: beeldenbank (Kive), draaidag, materiaal van de klant, sjablonen. Kiezen, aantal invullen, toelichten.', 'klein'))
        out.append(velden_tabel(rijen, w))
        if 'doel' in titel:
            out.append(h3('KPI’s'))
            out.append(tabel(['Product of onderdeel', 'Datum', 'Doel (aantal)', 'Prijs', 'Omzet'], g('kpi') or [['', '', '', '', ''] for _ in range(4)] + [('tot', ['Totaal', '', '', '', ''])], rechts=(2, 3, 4)))
            out.append(opmerking(g('kpi_opmerking')))
        if 'planning' in titel:
            out.append(opmerking(g('planning_opmerking')))
            out.append(h3('Tijdlijn' + (bron('suggestie') if leeg else '')))
            out.append(tabel(['Deadline', 'Wat', 'Verantwoordelijke'], g('tijdlijn') or [['', '', ''] for _ in range(7)]))
            if leeg: out.append(p('Datums kies je in een kalender. Met “doe suggestie” maakt het portaal de tijdlijn uit de start- en einddatum en wat er opgeleverd moet worden; elke regel blijft aan te passen. Vaste omschrijvingen: briefing akkoord, landingspagina klaar, content klaar, merkcheck, live, contentronde, mailing, beslismoment, einde campagne, evaluatie. Na akkoord wordt de tijdlijn een taak met subtaken in ClickUp.', 'klein'))
        if 'Doelgroep' in titel:
            out.append(opmerking(g('doelgroep_opmerking')))
        if 'Afspraken' in titel:
            out.append(opmerking(g('afspraken_opmerking')))
    out.append(h3('9 · Hypothese'))
    out.append(hypothese_blok(None if leeg else w.get('hyp')))
    return ''.join(out)

# ---------------------------------------------------------------- hypothese: berekend uit de briefing
def nl(x, dec=0):
    t = ('{:,.%df}' % dec).format(x).replace(',', 'X').replace('.', ',').replace('X', '.')
    return t

def bereken(doel, eenheid, per_conversie, aandeel_ads, conversieratio, doorklik, budget, plafond, conv_naam='reserveringen', scenario_cr=None, weken=None):
    conv = round(doel / per_conversie)
    ads = round(conv * aandeel_ads)
    bez = ads / conversieratio
    imp = bez / doorklik
    h = dict(doel=doel, eenheid=eenheid, per_conversie=per_conversie, aandeel_ads=aandeel_ads, cr=conversieratio, ctr=doorklik, budget=budget, plafond=plafond, conv_naam=conv_naam,
             conv=conv, ads=ads, overig=conv - ads, bez=bez, imp=imp, per_klik=budget / bez, cpm=budget / imp * 1000, per_conv_ads=budget / ads, per_eenheid=budget / doel)
    h['weken'] = weken
    if scenario_cr:
        b2 = ads / scenario_cr
        h['scen'] = dict(cr=scenario_cr, bez=b2, imp=b2 / doorklik, per_klik=budget / b2, cpm=budget / (b2 / doorklik) * 1000)
    return h

def hypothese_blok(h):
    if h is None:
        return (p('Het portaal maakt de hypothese uit wat in de briefing staat: het doel, het advertentiebudget en het plafond, met de normen per branche voor het aantal per conversie, het aandeel uit advertenties, de conversieratio en de doorklikratio. De aannames zijn aan te passen; de rest rekent mee.', 'klein')
                + vakken(['Impressies', 'Bezoekers', 'Conversies uit advertenties', 'Conversies totaal', 'Doel'], 1, 26)
                + vakken(['Per 1.000 impressies', 'Per klik', 'Per conversie uit advertenties', 'Per eenheid van het doel'], 4, 34)
                + vakken(['De zwakste schakel'], 1, 40))
    breedte = [100, 80, 62, 48, 36]
    rijen = [
        ('Impressies', nl(h['imp']), '#e0efff', '#0857c3'),
        ('Bezoekers landingspagina', nl(h['bez']), '#cce4ff', '#0857c3'),
        ('%s uit advertenties' % h['conv_naam'].capitalize(), nl(h['ads']), '#99c9ff', '#003967'),
        ('%s totaal' % h['conv_naam'].capitalize(), nl(h['conv']), '#007aff', '#ffffff'),
        (h['eenheid'].capitalize(), nl(h['doel']), '#c4f000', '#1d1d1f'),
    ]
    stappen = ['%s%% klikt door' % nl(h['ctr'] * 100, 0 if h['ctr'] * 100 == int(h['ctr'] * 100) else 1),
               '%s%% %s' % (nl(h['cr'] * 100, 0 if h['cr'] * 100 == int(h['cr'] * 100) else 1), 'reserveert' if h['conv_naam'] == 'reserveringen' else 'converteert'),
               '+ %s via mailings, vaste gasten en direct (%s%%)' % (nl(h['overig']), nl((1 - h['aandeel_ads']) * 100)),
               '× %s %s per %s' % (nl(h['per_conversie']), 'personen' if h['eenheid'] == 'couverts' else h['eenheid'], h['conv_naam'][:-2] if h['conv_naam'].endswith('en') else h['conv_naam'])]
    t = ['<div style="margin:6pt 0 12pt">']
    for k, (lab, waarde, bg, fg) in enumerate(rijen):
        t.append('<div style="width:%d%%;margin:0 auto;background:%s;color:%s;border-radius:6pt;padding:6pt 10pt;display:flex;justify-content:space-between;align-items:baseline;break-inside:avoid">'
                 '<span style="font-size:8.8pt;font-weight:500">%s</span><b style="font-family:var(--fd);font-size:13pt;color:%s">%s</b></div>' % (breedte[k], bg, fg, lab, fg, waarde))
        if k < len(stappen):
            t.append('<div style="text-align:center;font-size:8pt;color:var(--tx2);padding:2pt 0">↓ %s</div>' % stappen[k])
    t.append('</div>')
    tempo = (' Per week is dat ongeveer %s impressies, %s bezoekers en %s %s uit advertenties.' % (nl(h['imp'] / h['weken']), nl(h['bez'] / h['weken']), nl(h['ads'] / h['weken'], 1), h['conv_naam'])) if h.get('weken') else ''
    t.append(p('De aannames komen uit onze normen per branche en zijn aan te passen. Na twee weken live leggen we ze naast de echte cijfers.' + tempo, 'klein'))
    tegel = lambda bedrag, wat, ok='': '<div class="vak" style="text-align:center;padding:8pt 6pt"><b style="display:block;font-family:var(--fd);font-size:14pt;color:var(--tx)">€ %s</b><div class="klein">%s</div>%s</div>' % (bedrag, wat, ok)
    binnen = h['per_eenheid'] <= h['plafond']
    ok = '<div style="font-size:8pt;font-weight:600;color:%s;margin-top:2pt">%s</div>' % (('var(--green-tx)', 'binnen het plafond van € %s' % nl(h['plafond'])) if binnen else ('var(--red-tx)', 'boven het plafond van € %s' % nl(h['plafond'])))
    t.append(h3('Wat het mag kosten, bij € %s advertentiebudget' % nl(h['budget'])))
    t.append('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6pt;margin-bottom:10pt">%s%s%s%s</div>' % (
        tegel(nl(h['cpm'], 2), 'per 1.000 impressies'), tegel(nl(h['per_klik'], 2), 'per klik'),
        tegel(nl(h['per_conv_ads']), 'per %s uit advertenties' % h['conv_naam'][:-2]), tegel(nl(h['per_eenheid'], 2), 'per %s, gemiddeld over alles' % h['eenheid'][:-1], ok)))
    if h.get('scen'):
        sc = h['scen']
        t.append(kader('<p>De conversie op de landingspagina. Valt die van %s%% naar %s%%, dan zijn er %s bezoekers en %s impressies nodig, en mag een klik nog maar € %s kosten (€ %s per 1.000 impressies). Daarom testen we de landingspagina en het reserveren vóór de start.</p>' % (
            nl(h['cr'] * 100), nl(sc['cr'] * 100), nl(sc['bez']), nl(sc['imp']), nl(sc['per_klik'], 2), nl(sc['cpm'], 2)), 'De zwakste schakel', 'rood'))
    return ''.join(t)

# ---------------------------------------------------------------- I.5 Specificatie portaal
def specificatie():
    out = [p('Hoe de campagnebriefing (I.4) en het klantprofiel (I.3) straks in het portaal werken. Dit is de opdracht voor wie het portaal bouwt.')]
    out.append(h2('De stappen'))
    out.append(tabel(['Stap', 'Wat er gebeurt', 'Wie'], [
        ['1 · Starten', 'Op de klantkaart: “nieuwe campagne”. Klant, marketingmanager, contactpersonen en vaste doelgroepen staan er meteen in, uit het klantprofiel.', 'Marketingmanager'],
        ['2 · Uitwerken', 'De velden invullen. Bij velden met een suggestieknop kun je zelf typen of op “doe suggestie” klikken; het portaal vult het veld dan op basis van wat al is ingevuld, en je past het aan. Bij plafond, budget en andere velden kan “voorstel” aangevinkt worden.', 'Marketingmanager'],
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
        ['Plafond, advertentiebudget', 'Invoer of suggestie', 'Tekst, met vinkje “voorstel”'],
        ['KPI’s', 'Invoer', 'Regels: product of onderdeel, datum (kalender), doel (aantal), prijs, omzet (berekend), plus totaal'],
        ['Opmerkingen bij de KPI’s', 'Invoer', 'Opsomming'],
        ['Hypothese (onderaan)', 'Berekend door het portaal uit de ingevulde cijfers; de aannames zijn aan te passen', 'Uit het doel, het budget en het plafond, met aannames per schakel (aantal per conversie, aandeel advertenties, conversieratio, doorklikratio) uit onze eigen normen per branche. Berekent bezoekers, impressies en wat een klik, 1.000 impressies en een conversie mogen kosten. Tijdens de campagne staat de hypothese in het dashboard naast de echte cijfers.'],
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
        ['Kanalen en middelen', 'Keuze, met aantal en toelichting', 'Regels; een nieuwe landingspagina is ook een middel'],
        ['Content', 'Keuze van de bron, met wat er nodig is en toelichting', 'Regels'],
        ['Landingspagina', 'Invoer en keuze', 'URL, en: bestaat al of nog te maken. Nog te maken: komt in de tijdlijn'],
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
 'Doel in één zin': 'Alle drie de kerstmomenten vol: 190 couverts verkopen, goed voor € 17.900 omzet.',
 'Wat telt als resultaat': 'Een reservering in Odoo, geteld in couverts.',
 'Plafond': voorstel() + ' Gemiddeld maximaal € 8 aan advertenties per verkocht couvert, gerekend over alle couverts.',
 'Advertentiebudget': voorstel() + ' € 1.500 aan Meta, rechtstreeks van Thiessen: oktober € 500, november € 700, december € 300. We verdelen het over de hele looptijd en over targeting en retargeting, zodat er tot de laatste week budget is voor wie al interesse toonde.',
 'kpi': [
   ['Kerstbrunch', '25 december 2026', '60', '€ 60', '€ 3.600'],
   ['Kerstdiner', '25 december 2026', '80', '€ 110', '€ 8.800'],
   ['Kerstdiner', '26 december 2026', '50', '€ 110', '€ 5.500'],
   ('tot', ['Totaal', '', '190', '', '€ 17.900']),
 ],
 'kpi_opmerking': [
   'Op 26 december zijn al 30 couverts verkocht; alles vol is € 21.200 omzet.',
   'Op 25 november beslist Thiessen per moment of het doorgaat.',
   voorstel() + ' Doorgaan bij minimaal 30 couverts voor de brunch en 40 per diner.',
   'Tussenstand om op te sturen: op 1 november 15, 20 en 40 couverts; op 15 november 30, 40 en 55.',
 ],
 'Start': '7 oktober 2026',
 'Einde': '17 december 2026',
 'planning_opmerking': [
   'Per moment stoppen zodra het vol is.',
   'Vervalt een moment op 25 november, dan passen wij dezelfde dag de advertenties en de landingspagina aan.',
 ],
 'tijdlijn': [
   ['5 oktober 2026', 'Briefing akkoord', 'Marketingmanager'],
   ['6 oktober 2026', 'Landingspagina klaar', 'Content en techniek'],
   ['6 oktober 2026', 'Content klaar, merkcheck', 'Content'],
   ['6 oktober 2026', 'Doelgroepen en meting klaar', 'Campagne en techniek'],
   ['7 oktober 2026', 'Live', 'Campagne'],
   ['elke maandag', 'Stand per moment, budget bijsturen', 'Campagne'],
   [vv('[datum]'), 'Mailing: oktobernieuwsbrief', 'Marketingmanager'],
   ['2 november 2026', 'Contentronde: nog X plaatsen per moment', 'Content'],
   [vv('[datum]'), 'Mailing: novembernieuwsbrief', 'Marketingmanager'],
   ['10 november 2026', 'Mailing: Kerst bij Thiessen', 'Marketingmanager'],
   ['25 november 2026', 'Beslismoment: doorgaan of annuleren, per moment', 'Thiessen'],
   ['17 december 2026', 'Einde campagne', 'Campagne'],
   ['januari 2027', 'Evaluatie in de Performance Review', 'Marketingmanager'],
 ],
 'Wat we verkopen': 'Kerstdiner op 25 en 26 december, € 110 per persoon. Kerstbrunch op 25 december, € 60 per persoon. ' + vv('[wat zit erbij: gangen, wijn, kinderprijs]'),
 'Kernboodschap': voorstel() + ' “Kerst bij Thiessen. Jij reserveert, wij zorgen voor de rest, tot en met de mooiste plek aan tafel.”',
 'Waarom nu': 'Beperkt aantal plaatsen per moment. Reserveren zonder aanbetaling: nu boeken, eind november betalen. Vanaf november noemen we per moment hoeveel plaatsen er nog zijn.',
 'Wat we niet beloven': 'Een plek in de kelder of de orangerie: dat bepaalt Thiessen. Dat staat op de landingspagina en in de bevestiging. Dat een moment kan vervallen bij te weinig reserveringen, staat in de voorwaarden en de bevestiging, met een plek bij een ander restaurant in Maastricht. Niet in de advertenties.',
 'Doelgroepen': ul(['Bestaande gasten (klantenlijst)', 'Nieuwsbriefabonnees', 'Websitebezoekers, laatste 180 dagen', 'Volgers en interacties op Instagram en Facebook', 'Nieuw: 30 tot 65 jaar, uit eten en wijn, plus een lookalike van de gasten']),
 'Regio': voorstel() + ' Maastricht en 25 kilometer eromheen.',
 'Uitsluiten': 'Wie al gereserveerd heeft, via de wekelijkse stand uit Odoo.',
 'doelgroep_opmerking': '',
 'kanalen': [
   ['Meta Ads: targeting', '1 campagne', 'Nieuwe gasten in de regio.'],
   ['Meta Ads: retargeting', 'doorlopend', 'Websitebezoekers, volgers en nieuwsbriefabonnees, tot het einde van de campagne.'],
   ['Mailing', '3', 'Oktobernieuwsbrief, novembernieuwsbrief en een aparte mailing Kerst bij Thiessen.'],
   ['Landingspagina', '1, nieuw', 'Kerst bij Thiessen op thiessen.nl: de drie momenten, wat erbij zit, reserveren via Odoo, en per moment hoeveel plaatsen er nog zijn.'],
 ],
 'content': [
   ['Beeldenbank (Kive)', 'Per moment drie tot vijf beelden, in 1:1, 4:5 en 9:16', 'Twee contentrondes: aankondigen (oktober) en nog X plaatsen (november).'],
 ],
 'Landingspagina': 'thiessen.nl/events/kerst-bij/thiessen · ' + chip('nog te maken', 'oranje'),
 'Wat de klant zelf doet': 'Elke maandag de stand per moment uit Odoo naar support@jamesrobinson.nl. Odoo actueel houden. Gasten informeren als een moment vervalt.',
 'afspraken_opmerking': [
   'Reserveren gaat zonder aanbetaling.',
   'Gasten krijgen vier weken voor kerst een betaallink en betalen uiterlijk een week voor kerst.',
 ],
 'Wat we weten van vorige keer': 'Vorig jaar kwamen er op één dag maar acht gasten. Het personeel moest met kerst werken en had niets te doen; dat gaf veel weerstand. Daarom de afspraak: is er een maand voor kerst te weinig verkocht voor een moment, dan vervalt dat moment.',
 'Risico’s': ul([
   'Zonder aanbetaling valt een deel van de reserveringen af als de betaallink komt.',
   'Drie momenten, één budget: we sturen per moment, en schuiven budget naar wat achterloopt.',
   'De brunch levert het minst op per couvert: als het moet, stoppen we daar eerder met adverteren dan bij de diners.',
 ]),
}

THI['hyp'] = bereken(doel=190, eenheid='couverts', per_conversie=3, aandeel_ads=0.6, conversieratio=0.04, doorklik=0.01, budget=1500, plafond=8, scenario_cr=0.02, weken=10)

THI_SAMENVATTING = ('Thiessen Wijnkoopers wil drie kerstmomenten vullen: twee kerstdiners en een kerstbrunch. Het doel is 190 couverts (ongeveer 63 reserveringen) en € 17.900 omzet, '
                    'met Meta Ads, een eigen landingspagina en drie mailings, van 7 oktober tot 17 december 2026.')

DOCS = [
 dict(code='I.3', titel='Klantprofiel', fase='Intern · Briefings', voor='Intern', wanneer='Aan het eind van de onboarding, daarna bijhouden', wie='Marketingmanager',
      lead='Alles wat iemand moet weten voordat die aan een klant werkt: wie de klant is, de contactpersonen, de doelen, de vaste doelgroepen, het merk, de systemen en de afspraken.', body=klantprofiel()),
 dict(code='I.4', titel='Campagnebriefing', fase='Intern · Briefings', voor='Intern en klant', wanneer='Vóór elke nieuwe campagne', wie='Marketingmanager, met akkoord van de klant',
      lead='Eén briefing per campagne: het doel in harde getallen, de planning met de tijdlijn, aanbod, doelgroep, kanalen en content, en de afspraken. Eerst als voorstel naar de klant, na akkoord naar het team en in ClickUp.', body=campagnebriefing()),
 dict(code='I.5', titel='Briefings in het portaal', fase='Intern · Briefings', voor='Intern', wanneer='Bij het bouwen van het portaal', wie='Jim Coumans, Jim Kikken, de bouwer van het portaal',
      lead='Welke velden uit het systeem komen, welke je kiest, waar je een suggestie kunt laten doen, hoe een briefing van voorstel naar akkoord gaat, en hoe de tijdlijn in ClickUp komt.', concept=True, body=specificatie()),
 dict(code='K.THI.1', titel='Kerst bij Thiessen', fase='Campagnebriefing', voor='Intern en klant', wanneer='7 oktober – 17 december 2026', wie='Marketingmanager',
      kop_rechts='Versie 1.0 · 2 oktober 2026', bestand='Campagnebriefing Kerst bij Thiessen', map_sub='Thiessen',
      meta=[('Klant', 'Thiessen Wijnkoopers'), ('Start', '7 oktober 2026'), ('Einde', '17 december 2026'), ('Status', voorstel())],
      lead=THI_SAMENVATTING, body=campagnebriefing(THI)),
]
