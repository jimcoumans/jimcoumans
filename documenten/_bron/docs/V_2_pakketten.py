# -*- coding: utf-8 -*-
from base import *

FASE = 'Verkoopondersteuning · Wat het kost'

def prijs(t): return '<span style="font-family:var(--fd);font-size:13pt;font-weight:700;white-space:nowrap">%s</span>' % t
def naam(t): return '<span style="font-family:var(--fd);font-size:11pt;font-weight:700;color:var(--tx)">%s</span>' % t

def body():
    o = []
    o.append(kader('<p>Adverteren in zoekmachines en op social, marketingcontent, landingspagina’s, CRO, e-mail en automation, en SEO. Dat krijgt iedereen. Wat per pakket verschilt, is hoeveel. Dat meten we in campagnes, niet in uren.</p>', 'In elk pakket', 'blauw'))
    o.append(h2('Vier pakketten naast elkaar'))
    o.append(tabel(['', naam('Starter'), naam('Playmaker'), naam('Captain'), naam('Champion')], [
        ['<b>Retainer per maand</b>', prijs('€ 1.000'), prijs('€ 1.500'), prijs('€ 2.000'), prijs('€ 2.500')],
        ['<b>Campagnes tegelijk</b>', '1', '2', '3', '4'],
        ['<b>Advertentiebudget per maand</b><br><span class="klein">Rechtstreeks aan de platformen</span>', '€ 1.000 – 2.500', '€ 2.500 – 5.000', '€ 5.000 – 7.500', 'vanaf € 7.500'],
        ['<b>Contentrondes</b>', 'elk kwartaal', 'elke twee maanden', 'maandelijks', 'twee per maand'],
        ['<b>Draaidagen voor nieuw beeld</b>', '1 per jaar', '2 per jaar', '3 per jaar', '4 per jaar'],
        ['<b>Performance Review</b><br><span class="klein">Een uur, op kantoor of online</span>', 'elk kwartaal', 'elke twee maanden', 'maandelijks', 'maandelijks'],
    ]))
    o.append(p('Alle bedragen exclusief btw. De retainer start altijd in maand 2, na het fundament. De draaidag in het fundament is draaidag één van het jaar: bij Starter is er dat jaar dus geen tweede.', 'klein'))

    o.append(twee(
        kader('<p>Eén aanbod, voor één doelgroep, met één doel en één landingspagina. Op alle kanalen die daarbij passen: dezelfde campagne op Google en Meta is één campagne.</p>', 'Wat is een campagne', 'blauw', 'Eén aanbod, één doel'),
        kader('<p>Een nieuwe set advertenties, beeld en tekst, in alle formaten van de campagne, om tegen de lopende te testen. Advertenties slijten; een contentronde houdt je campagne fris.</p>', 'Wat is een contentronde', 'lime', 'Nieuwe advertenties')))

    o.append(h2('De vier regels'))
    o.append(twee(
        kader('<p>Drie campagnes met € 3.000 budget is Captain. Eén campagne met € 6.000 budget is ook Captain. Meer campagnes is meer werk, meer budget is meer verantwoordelijkheid.</p>', 'Regel 1', 'grijs', 'Het hoogste van twee: campagnes of budget'),
        kader('<p>Het aantal gaat over campagnes die op hetzelfde moment draaien. Stoppen en een andere starten mag altijd. In het voorjaar het ene aanbod, in het najaar het andere.</p>', 'Regel 2', 'grijs', 'Tegelijk betekent tegelijk')))
    o.append(twee(
        kader('<p>Per kanaal minimaal € 500 per campagne per maand, op LinkedIn € 1.000. Daaronder leert het algoritme te weinig. Google, Meta en LinkedIn samen vraagt dus minstens € 2.000.</p>', 'Regel 3', 'grijs', 'Wij kiezen de kanalen'),
        kader('<p>Komt er een campagne bij of groeit het budget, dan gaat je pakket direct mee omhoog. Omlaag gaat per de 1e van de volgende maand. We bespreken het in de Performance Review.</p>', 'Regel 4', 'grijs', 'Omhoog per direct, omlaag per de 1e')))

    o.append(h2('Hoe we je pakket kiezen'))
    o.append(kader('<p>We beginnen bij je doel: hoeveel extra omzet je wilt, je marge en de tijd waarin alles zich moet terugverdienen, standaard twaalf maanden. Daar gaan het fundament, de retainer en de licenties af. Wat overblijft, is je advertentiebudget, en dat bepaalt het pakket.</p><p>Onze retainer is nooit meer dan de helft van wat je per maand aan marketing uitgeeft, retainer en advertentiebudget samen. Verdient het zich op papier niet terug, dan beginnen we niet.</p>', 'De rekensom', 'zwart', 'Je doel bepaalt het pakket'))
    o.append(h2('Sub: de invaller'))
    o.append(kader(twee(
        ul(['Eén campagne, voor bereik en kliks. Geen doel in aanvragen.', 'Advertentiebudget vanaf € 500 per maand', 'Een contentronde per halfjaar, geen draaidag', 'Eerste Performance Review na drie maanden, daarna elk halfjaar', 'Licht fundament € 1.500: accounts, meting, sjablonen en één campagne. Geen landingspagina, geen draaidag.']),
        '<p>Een invaller zit op de bank en wil het veld in. We bieden Sub niet aan. Vraag je er zelf om, omdat je vooral zichtbaar wilt zijn, dan leveren we het.</p><p>In de eerste Performance Review, na drie maanden, bespreken we de overstap naar Starter. Het lichte fundament telt mee: je betaalt het verschil, <span style="white-space:nowrap">€ 3.000</span>.</p>'),
        'Alleen op verzoek', 'oranje', '€ 500 per maand'))
    return ''.join(o)

DOCS = [dict(code='V.2', titel='De pakketten', fase=FASE, voor='Klant', wanneer='Intakegesprek en voorstel', wie='Accountmanager',
  lead='Starter, Playmaker, Captain en Champion. Iedereen krijgt hetzelfde werk; het pakket bepaalt hoeveel. Welk pakket bij je past, volgt uit de rekensom in je voorstel.', body=body())]
