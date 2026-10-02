# -*- coding: utf-8 -*-
# Interne briefings: het klantprofiel (I.3), de campagnebriefing als leeg sjabloon (I.4),
# en ingevulde campagnebriefings per klant (code K...). Sjabloon en ingevulde versie delen één indeling.
from base import *

def voorstel(): return chip('voorstel', 'oranje')
def open_(): return chip('open', 'rood')

LEEG = '<div class="regels"><div class="regel"></div><div class="regel"></div></div>'

def velden_tabel(rijen, waarden=None):
    """rijen: (veld, hint). waarden: dict veld -> html. Zonder waarden: hint plus schrijflijnen."""
    out = ['<table class="vt"><tbody>']
    for veld, hint in rijen:
        if waarden is None:
            inhoud = ('<div class="klein">%s</div>' % hint if hint else '') + LEEG
        else:
            inhoud = waarden.get(veld, vv('[…]'))
        out.append('<tr><th style="width:30%%;vertical-align:top;color:var(--tx);font-weight:600;font-size:8.8pt;border-bottom:1px solid var(--ln-soft);padding:6pt 6pt">%s</th><td>%s</td></tr>' % (veld, inhoud))
    out.append('</tbody></table>')
    return ''.join(out)

# ---------------------------------------------------------------- I.3 Klantprofiel
KP = [
 ('1 · De basis', [
   ('Bedrijf en website', ''), ('Branche en vestiging(en)', ''),
   ('Contactpersonen', 'Naam, rol, telefoon. Wie beslist, wie volgt aanvragen op, wie levert cijfers.'),
   ('Marketingmanager', 'Vast aanspreekpunt aan onze kant.'),
   ('Pakket en start', 'Pakket, campagnes tegelijk, startdatum, ritme van de Performance Review.'),
 ]),
 ('2 · Het bedrijf in het kort', [
   ('Wat ze verkopen', 'Hooguit drie diensten of producten, met de waarde per opdracht of klant.'),
   ('Waarom klanten voor hen kiezen', 'In hun woorden. Iets wat de concurrent niet had kunnen zeggen.'),
   ('Prijsniveau en concurrenten', 'Van wie verliezen ze, en waarop.'),
   ('Hoe het jaar loopt', 'Pieken, dalen, vaste momenten (feestdagen, seizoen, beurzen).'),
 ]),
 ('3 · De doelen', [
   ('De doelregel', 'Letterlijk uit het voorstel: aantal per maand, tegen maximaal wat, vanaf wanneer.'),
   ('Extra omzet, marge, terugverdientijd', 'Uit de rekensom (04.1).'),
   ('Wat ze aankunnen', 'Hoeveel extra werk per maand, en waar het vastloopt.'),
 ]),
 ('4 · De klant van de klant', [
   ('De beste klant', 'Waar ze het meest aan verdienen en het prettigst mee werken.'),
   ('Regio', ''),
   ('Waar die klant zit', 'Zoekt, scrolt, of zakelijk op LinkedIn.'),
   ('Wat ze niet willen', 'Werk, klanten of regio’s om uit te sluiten.'),
 ]),
 ('5 · Het merk', [
   ('Huisstijl', 'Kleuren, lettertypes, logo’s; waar de bestanden staan.'),
   ('Toon', 'Hoe ze praten: je of u, formeel of los, woorden die wel en niet kunnen.'),
   ('Beeld', 'Beeldenbank (Kive), draaidagen, wat niet in beeld mag.'),
 ]),
 ('6 · Accounts en systemen', [
   ('Advertentieaccounts', 'Per kanaal het account en het ID. Alles op naam van de klant.'),
   ('Website', 'Systeem, wie beheert hem, onze toegang.'),
   ('E-mail', 'MailerLite: lijsten en aantal adressen.'),
   ('Boeken, aanvragen, CRM', 'Waar aanvragen of reserveringen binnenkomen, en hoe wij de stand zien.'),
 ]),
 ('7 · Afspraken', [
   ('Jouw kant', 'De vijf afspraken (04.4): opvolging, oordeel per aanvraag, één beslisser, en de termijnen.'),
   ('Gevoeligheden', 'Wat eerder misging, waar de klant scherp op is.'),
 ]),
]

def klantprofiel():
    out = [kader('<p>Eén profiel per klant, gemaakt aan het eind van de onboarding uit wat er al ligt: de vragenlijst van het intakegesprek (03.2), het onboardingformulier (06.2) en het voorstel (04.2). Vraag niets opnieuw. Wie aan de klant werkt, leest dit eerst. Verandert er iets, dan pas de marketingmanager het aan, met datum.</p>', 'Zo gebruik je dit profiel', 'blauw')]
    for titel, rijen in KP:
        out.append(h3(titel)); out.append(velden_tabel(rijen))
    out.append(h3('8 · Campagnes'))
    out.append(tabel(['Campagne', 'Start', 'Einde', 'Status', 'Briefing'], [['', '', '', '', ''] for _ in range(5)]))
    out.append(velden(['Laatst bijgewerkt op', 'Door']))
    return ''.join(out)

# ---------------------------------------------------------------- I.4 Campagnebriefing
CB = [
 ('1 · De basis', [
   ('Campagnenaam', 'Kort en herkenbaar, zoals de klant hem noemt.'),
   ('Klant', ''),
   ('Marketingmanager', 'Eigenaar van de campagne.'),
   ('Contactpersoon bij de klant', 'Wie geeft akkoord, wie levert de stand van de verkoop.'),
   ('Plek in het pakket', 'Eén aanbod, één doelgroep, één doel, één landingspagina is één campagne.'),
 ]),
 ('2 · Het doel', [
   ('Doel in één zin', 'Wat moet er aan het eind gebeurd zijn.'),
   ('Wat telt als resultaat', 'De conversie die we meten (aanvraag, reservering, aankoop) en hoe we hem tellen.'),
   ('Plafond', 'Wat één resultaat maximaal mag kosten aan advertenties.'),
   ('Advertentiebudget', 'Totaal en per maand. Rechtstreeks van de klant aan het platform.'),
 ]),
 ('3 · De planning', [
   ('Start', ''),
   ('Einde of stopcriterium', 'Een datum, of zodra vol. Beide mag.'),
   ('Beslismomenten', 'Datums waarop iets besloten wordt: doorgaan of stoppen, budget omhoog of omlaag.'),
 ]),
 ('4 · Aanbod en boodschap', [
   ('Wat we verkopen', 'Product, prijs, wat erbij zit.'),
   ('Kernboodschap', 'De zin die in elke uiting terugkomt.'),
   ('Waarom nu', 'De urgentie: datum, beperkt aantal, voordeel.'),
   ('Wat we niet beloven', 'Beperkingen en voorwaarden die iemand moet weten voor hij boekt.'),
 ]),
 ('5 · Doelgroep', [
   ('Wie', 'Wie koopt of boekt, en voor wie.'),
   ('Regio', ''),
   ('Doelgroepen in de advertenties', 'Nieuw, warm, retargeting. Met wie we uitsluiten.'),
 ]),
 ('6 · Kanalen en content', [
   ('Kanalen', 'Per kanaal wat het doet. Minimaal € 500 per kanaal per maand, LinkedIn € 1.000.'),
   ('Mailings', 'Welke, wanneer, naar welke lijst.'),
   ('Content', 'Bron, formaten, aantal varianten, wie maakt het en wanneer klaar. Alles door de merkcheck (07.3).'),
 ]),
 ('7 · Landingspagina en meting', [
   ('Landingspagina', 'URL en wie hem beheert.'),
   ('Boeken of aanvragen', 'Het systeem, en wat de bezoeker doet.'),
   ('Meting', 'Welke gebeurtenis telt, getest voor livegang. UTM-tags op alle links.'),
 ]),
 ('8 · Afspraken met de klant', [
   ('Betaling en annulering', 'Hoe en wanneer de klant van de klant betaalt, en wat er gebeurt bij afzeggen.'),
   ('Stand van de verkoop', 'Wie levert hem, hoe vaak, waar.'),
   ('Wat de klant zelf doet', ''),
 ]),
 ('9 · Achtergrond en risico’s', [
   ('Wat we weten van vorige keer', ''),
   ('Risico’s', 'Wat kan misgaan, en wat we dan doen.'),
 ]),
]

def campagnebriefing(w=None, kpi=None, tijdlijn=None, taken=None, open_vragen=None):
    leeg = w is None
    out = []
    if leeg:
        out.append(kader('<p>Eén briefing per campagne, vóór er iets gebouwd wordt. De marketingmanager vult hem in met de klant en legt hem voor akkoord voor. Daarna is dit het blad waar iedereen op werkt: campagne, content, techniek. Wat niet in de briefing staat, doen we niet; verandert er iets, dan een nieuwe versie met datum.</p>', 'Zo gebruik je deze briefing', 'blauw'))
    for titel, rijen in CB:
        out.append(h3(titel))
        out.append(velden_tabel(rijen, w))
        if titel.startswith('2'):
            out.append(h3('De harde KPI’s'))
            if kpi: out.append(kpi)
            else: out.append(tabel(['Product of moment', 'Capaciteit', 'Al verkocht', 'Nog te verkopen', 'Prijs', 'Omzet nog te halen'], [['', '', '', '', '', ''] for _ in range(4)] + [('tot', ['Totaal', '', '', '', '', ''])]))
        if titel.startswith('3'):
            out.append(h3('Tijdlijn'))
            if tijdlijn: out.append(tijdlijn)
            else: out.append(tabel(['Wanneer', 'Wat', 'Wie'], [['', '', ''] for _ in range(7)]))
    out.append(h3('Taken'))
    if taken: out.append(checklist(taken))
    else: out.append(tabel(['Taak', 'Wie', 'Klaar op', 'Af'], [['', '', '', ''] for _ in range(8)]))
    if open_vragen:
        out.append(kader(ol(open_vragen), 'Open vragen aan de klant, vóór de start', 'rood'))
    out.append(h3('Akkoord'))
    out.append(handtekening('Klant: naam en datum', 'Marketingmanager: naam en datum'))
    return ''.join(out)

# ---------------------------------------------------------------- Kerst bij Thiessen
THI_KPI = tabel(['Moment', 'Datum', 'Capaciteit', 'Al verkocht', 'Nog te verkopen', 'Prijs p.p.', 'Omzet nog te halen', 'Grens 25 nov'], [
  ['Kerstbrunch', 'vr 25 dec, 1e kerstdag', '60', '0', '60', '€ 60', '€ 3.600', vv('30') ],
  ['Kerstdiner', 'vr 25 dec, 1e kerstdag', '80', '0', '80', '€ 110', '€ 8.800', vv('40')],
  ['Kerstdiner', 'za 26 dec, 2e kerstdag', '80', '30', '50', '€ 110', '€ 5.500', vv('40')],
  ('tot', ['Totaal', '', '220', '30', '190', '', '€ 17.900', '']),
], rechts=(2, 3, 4, 5, 6)) + p('Inclusief de 30 couverts die al verkocht zijn, is alles vol € 21.200 omzet. De grens op 25 november is ' + voorstel() + ': het minimum per moment om door te gaan. Thiessen moet hem bevestigen.', 'klein') + h3('Verkoopschema per moment ' + voorstel()) + tabel(['Couverts verkocht, uiterlijk op', 'Kerstbrunch 25 dec', 'Kerstdiner 25 dec', 'Kerstdiner 26 dec'], [
  ['zo 1 november', '15', '20', '40'],
  ['zo 15 november', '30', '40', '55'],
  ['wo 25 november: doorgaan of annuleren', 'minimaal 30', 'minimaal 40', 'minimaal 40'],
  ['do 17 december', '60 (vol)', '80 (vol)', '80 (vol)'],
], rechts=(1, 2, 3)) + p('Elke maandag leggen we de stand naast dit schema. Loopt een moment achter, dan gaat het budget daarheen.', 'klein')

THI_TIJD = tabel(['Wanneer', 'Wat', 'Wie'], [
  ['vr 2 – di 6 okt', '<b>Voorbereiden.</b> Beelden kiezen uit de beeldenbank, advertenties en doelgroepen bouwen, Meta-pixel op de bevestiging van Odoo, testreservering, merkcheck, akkoord van Thiessen.', 'Marketingmanager, campagne, content, techniek'],
  ['wo 7 okt', '<b>Live.</b>', 'Campagne'],
  ['7 – 31 okt', '<b>Aankondigen.</b> Bereik bij nieuwe gasten en bij wie Thiessen al kent. Oktobernieuwsbrief.', 'Campagne, Thiessen'],
  ['1 – 25 nov', '<b>Vullen.</b> “Nog X plaatsen” per moment, retargeting omhoog, novembernieuwsbrief, de aparte mailing Kerst bij Thiessen (' + voorstel() + ' di 10 nov).', 'Campagne, Thiessen'],
  ['wo 25 nov', '<b>Doorgaan of annuleren, per moment.</b> Vervalt een moment: dezelfde dag advertenties en landingspagina aanpassen. Thiessen informeert de gasten en regelt een plek bij een ander restaurant in Maastricht.', 'Thiessen beslist, marketingmanager past aan'],
  ['vr 27 nov', '<b>Betaallinks.</b> Vier weken voor kerst, met het verzoek uiterlijk vr 18 december te betalen.', 'Thiessen'],
  ['26 nov – 17 dec', '<b>Laatste plaatsen.</b> Alleen retargeting, alleen voor momenten met plek. Per moment stoppen zodra het vol is.', 'Campagne'],
  ['do 17 dec', '<b>Einde campagne.</b>', 'Campagne'],
  ['vr 18 dec', 'Uiterste betaaldatum. Stand van betaalde couverts per moment.', 'Thiessen'],
  ['januari', '<b>Evaluatie</b> in de Performance Review: couverts per moment, kosten per couvert, wat volgend jaar anders.', 'Marketingmanager'],
])

THI = {
 'Campagnenaam': '<b>Kerst bij Thiessen</b>',
 'Klant': 'Thiessen, Maastricht',
 'Marketingmanager': vv('[naam]'),
 'Contactpersoon bij de klant': vv('[naam, rol, telefoon]') + '. Geeft akkoord en levert elke maandag de stand uit Odoo.',
 'Plek in het pakket': 'Eén campagne: één aanbod (kerst bij Thiessen, drie momenten), één doel, één landingspagina. Telt als één campagne tegelijk.',
 'Doel in één zin': 'Alle drie de kerstmomenten vol: <b>190 couverts</b> erbij, goed voor <b>€ 17.900</b> omzet, met elk moment boven de grens op 25 november.',
 'Wat telt als resultaat': 'Een reservering in Odoo, geteld in couverts per moment. Gemeten als conversie op de bevestiging, met het aantal personen en het moment erbij. Echt verkocht is een couvert pas na betaling (uiterlijk 18 december); die stand houden we apart bij.',
 'Plafond': voorstel() + ' Gemiddeld maximaal € 8 aan advertenties per couvert, ongeveer 8% van de omzet. Voor de brunch maximaal € 5.',
 'Advertentiebudget': voorstel() + ' € 1.500 aan Meta: oktober € 500, 1 tot 25 november € 700, daarna tot € 300 alleen voor momenten met plek. Rechtstreeks van Thiessen aan Meta. Thiessen moet het bevestigen.',
 'Start': 'Woensdag 7 oktober 2026.',
 'Einde of stopcriterium': 'Per moment zodra het vol is, uiterlijk donderdag 17 december 2026.',
 'Beslismomenten': '<b>Wo 25 november</b>, een maand voor kerst: per moment doorgaan of annuleren. <b>Vr 27 november</b>: betaallinks. <b>Elke maandag</b>: stand per moment naast het verkoopschema.',
 'Wat we verkopen': 'Kerstdiner op 1e en 2e kerstdag, € 110 per persoon. Kerstbrunch op 1e kerstdag, € 60 per persoon. ' + vv('[wat zit erbij: gangen, wijn, kinderprijs]'),
 'Kernboodschap': voorstel() + ' “Kerst bij Thiessen. Jij reserveert, wij zorgen voor de rest, tot en met de mooiste plek aan tafel.”',
 'Waarom nu': 'Beperkt aantal plaatsen per moment. Reserveren zonder aanbetaling: nu boeken, eind november betalen. Vanaf november noemen we per moment hoeveel plaatsen er nog zijn.',
 'Wat we niet beloven': 'Een plek in de kelder of de orangerie: dat bepaalt Thiessen. Dat staat op de landingspagina en in de bevestiging. Dat een moment kan vervallen als er op 25 november te weinig reserveringen zijn, staat in de voorwaarden en de bevestiging, met de belofte van een plek bij een ander restaurant in Maastricht. Niet in de advertenties.',
 'Wie': 'Stellen, families en kleine gezelschappen die kerst buiten de deur vieren. Bestaande gasten en nieuwsbriefabonnees van Thiessen eerst.',
 'Regio': voorstel() + ' Maastricht en 25 kilometer eromheen. ' + vv('[ook België?]'),
 'Doelgroepen in de advertenties': '<b>Nieuw:</b> 30 tot 65 jaar in de regio, interesse in uit eten en wijn, plus een lookalike van de gastenlijst. <b>Warm:</b> websitebezoekers van de laatste 180 dagen, volgers en interacties op Instagram en Facebook van de laatste 365 dagen, nieuwsbriefabonnees. <b>Uitsluiten:</b> wie al gereserveerd heeft, via een wekelijkse export uit Odoo.',
 'Kanalen': 'Meta Ads (Facebook en Instagram): nieuwe gasten bereiken en retargeting. Eén kanaal, ruim boven het minimum van € 500 per maand.',
 'Mailings': 'Oktobernieuwsbrief: kerst aankondigen (' + vv('[datum]') + '). Novembernieuwsbrief: de stand per moment (' + vv('[datum]') + '). Aparte mailing Kerst bij Thiessen: ' + voorstel() + ' dinsdag 10 november, ruim voor 25 november. Wie al reserveerde, sluiten we uit waar dat kan. Alle links met UTM-tags.',
 'Content': 'Uit de beeldenbank (Kive), geen draaidag. Per moment drie tot vijf beelden: gedekte tafel, gerechten, kelder en orangerie in kerstsfeer. Formaten 1:1, 4:5 en 9:16. Twee contentrondes: aankondigen (oktober) en “nog X plaatsen” (november). Klaar op ma 5 oktober, merkcheck (07.3) op di 6 oktober. ' + open_() + ' Zijn er beelden in kerstaankleding?',
 'Landingspagina': 'thiessen.nl/events/kerst-bij/thiessen ' + open_() + ' URL checken: vermoedelijk /events/kerst-bij-thiessen. Staat op de website van Thiessen. Per moment de stand actueel; is een moment vol of vervallen, dan zegt de pagina dat.',
 'Boeken of aanvragen': 'Reserveren via Odoo, zonder aanbetaling en zonder direct afrekenen. De gast kiest het moment en het aantal personen, niet de ruimte.',
 'Meting': 'Meta-pixel met een conversie op de bevestiging van Odoo, met het aantal personen en het moment. Testreservering vóór 7 oktober. UTM-tags op alle links in mailings en advertenties. ' + open_() + ' Kan de pixel de bevestiging van Odoo zien?',
 'Betaling en annulering': 'Vier weken voor kerst (vr 27 november) krijgen gasten een betaallink, met het verzoek uiterlijk een week voor kerst (vr 18 december) te betalen. Wie na 27 november reserveert, krijgt de betaallink direct. Afzeggen door de gast: ' + vv('[voorwaarden]') + '.',
 'Stand van de verkoop': 'Thiessen mailt elke maandag vóór 10.00 uur de couverts per moment uit Odoo naar support@jamesrobinson.nl. Wij zetten hem naast het verkoopschema.',
 'Wat de klant zelf doet': 'Odoo en de betaallinks, de landingspagina actueel houden (tenzij wij dat doen: ' + vv('[afspreken]') + '), gasten informeren als een moment vervalt, en de personeelsplanning.',
 'Wat we weten van vorige keer': 'Vorig jaar kwamen er op één dag maar acht gasten. Het personeel moest met kerst werken en had niets te doen; dat gaf veel weerstand. Daarom de afspraak: is er een maand voor kerst te weinig verkocht voor een moment, dan vervalt dat moment.',
 'Risico’s': ol([
   '<b>“Te weinig” is nog geen getal.</b> Zonder grens kan niemand op 25 november beslissen. Voorstel: 30 voor de brunch, 40 per diner.',
   '<b>Reserveren zonder aanbetaling.</b> Een deel van de reserveringen valt af als de betaallink komt. Na 27 november sturen we op betaalde couverts, en houden we ruimte voor wie afvalt.',
   '<b>Krappe start.</b> Vijf werkdagen voor content, meting en akkoord. Lukt de meting niet op tijd, dan toch live, en de stand uit Odoo is leidend tot de meting klopt.',
   '<b>Drie momenten, één budget.</b> Het moment dat het best loopt, trekt het budget. Daarom per moment sturen op het verkoopschema, en schuiven naar wat achterloopt.',
   '<b>De brunch levert het minst op per couvert.</b> Lager plafond, en als het moet eerder stoppen met adverteren dan bij de diners.',
 ]),
}

THI_TAKEN = [
 ('Open vragen hieronder voorleggen aan Thiessen en de antwoorden invullen', 'marketingmanager · vr 2 okt'),
 ('Grens per moment en advertentiebudget laten bevestigen', 'marketingmanager · vr 2 okt'),
 ('Beelden kiezen uit de beeldenbank, per moment', 'content · ma 5 okt'),
 ('Advertenties in drie formaten, twee boodschappen', 'content · ma 5 okt'),
 ('Doelgroepen bouwen, gastenlijst en nieuwsbrieflijst uploaden', 'campagne · ma 5 okt'),
 ('Meta-pixel en conversie op de bevestiging van Odoo, testreservering', 'techniek · ma 5 okt'),
 ('UTM-tags voor advertenties en de drie mailings', 'campagne · ma 5 okt'),
 ('Merkcheck (07.3) en akkoord van Thiessen', 'marketingmanager · di 6 okt'),
 ('Live', 'campagne · wo 7 okt'),
 ('Elke maandag: stand naast het verkoopschema, budget per moment bijsturen', 'campagne · wekelijks'),
 ('Contentronde “nog X plaatsen”', 'content · ma 2 nov'),
 ('Aparte mailing Kerst bij Thiessen', 'campagne en Thiessen · di 10 nov'),
 ('Doorgaan of annuleren per moment; advertenties en landingspagina dezelfde dag aanpassen', 'marketingmanager · wo 25 nov'),
 ('Per moment stoppen zodra vol; einde campagne', 'campagne · uiterlijk do 17 dec'),
 ('Evaluatie in de Performance Review', 'marketingmanager · januari'),
]

THI_OPEN = [
 'Bij hoeveel couverts gaat een moment door op 25 november? Ons voorstel: 30 voor de brunch, 40 per diner.',
 'Akkoord op het advertentiebudget van € 1.500 aan Meta, en op het plafond van gemiddeld € 8 per couvert?',
 'Wat zit er in de prijs (gangen, wijn), en is er een kinderprijs?',
 'Op welke datum gaan de oktober- en de novembernieuwsbrief uit, en kan de aparte mailing op 10 november?',
 'Klopt de URL van de landingspagina, en wie houdt de stand per moment daarop actueel?',
 'Kan de Meta-pixel de bevestiging van een reservering in Odoo zien? Zo niet, wie bij Odoo kan dat regelen?',
 'Zijn er beelden in kerstaankleding in de beeldenbank?',
 'Willen jullie ook gasten uit België bereiken?',
 'Wat zijn de afzegvoorwaarden voor gasten?',
]

DOCS = [
 dict(code='I.3', titel='Klantprofiel', fase='Intern · Briefings', voor='Intern', wanneer='Aan het eind van de onboarding, daarna bijhouden', wie='Marketingmanager',
      lead='Alles wat iemand moet weten voordat die aan een klant werkt: wie de klant is, wat de doelen zijn, het merk, de systemen en de afspraken. Eén profiel per klant.', body=klantprofiel()),
 dict(code='I.4', titel='Campagnebriefing', fase='Intern · Briefings', voor='Intern', wanneer='Vóór elke nieuwe campagne', wie='Marketingmanager, met akkoord van de klant',
      lead='Eén blad per campagne waar iedereen op werkt: wat het doel is in harde getallen, wanneer, voor wie, met welke middelen, en wat er moet gebeuren.', body=campagnebriefing()),
 dict(code='K.THI.1', titel='Kerst bij Thiessen', fase='Campagnebriefing · Thiessen', voor='Intern', wanneer='Live 7 oktober tot uiterlijk 17 december 2026', wie='Marketingmanager, met akkoord van Thiessen',
      lead='Drie kerstmomenten vol: twee diners van 80 couverts en een brunch van 60, met een harde beslissing per moment op 25 november.', concept=True,
      body=campagnebriefing(THI, THI_KPI, THI_TIJD, THI_TAKEN, THI_OPEN)),
]
