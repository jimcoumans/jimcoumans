# -*- coding: utf-8 -*-
from base import *

FASE = 'Verkoopondersteuning · Onze werkwijze'

def schakel(label, getal, sub, kleur='grijs'):
    return '<div class="kader k-%s" style="margin:0"><span class="kl">%s</span><div class="groot" style="margin-bottom:1pt">%s</div><span class="klein">%s</span></div>' % (kleur, label, getal, sub)

def keten():
    pijl = '<div style="align-self:center;text-align:center;font-family:var(--fd);font-weight:700;color:var(--blue)">→</div>'
    cellen = [schakel('Weergaven', '23.333', 'per maand'), pijl,
              schakel('Bezoekers', '700', 'doorklikratio 3%'), pijl,
              schakel('Aanvragen', '21', 'conversieratio 3%'), pijl,
              schakel('Klanten', '4', 'scoringsratio 20%', 'lime')]
    return '<div style="display:grid;grid-template-columns:1fr 14pt 1fr 14pt 1fr 14pt 1fr;gap:4pt;margin:6pt 0 10pt;break-inside:avoid">%s</div>' % ''.join(cellen)

def body():
    o = []
    o.append(h2('Wat voor bureau we zijn'))
    o.append(p('Een performancebureau met een vast product: een fundament en een retainer met een vaste maandprijs.'))
    o.append(drie(
        kader('<p>We worden afgerekend op aanvragen en wat een aanvraag kost. Je ziet in je dashboard dezelfde cijfers als wij.</p>', 'Performance eerst', 'blauw'),
        kader('<p>Elke uiting klopt met je merk: kleur, typografie, toon en beeld. Ook een snelle variant, ook een test.</p>', 'Altijd on-brand', 'lime'),
        kader('<p>We beslissen op cijfers, niet op smaak, ook niet op die van ons. Je merk bepaalt de grenzen; daarbinnen kiest de data.</p>', 'Data beats opinion', 'groen')))
    o.append(kader('<p>Onze winst is dat we je doelen keer op keer halen, dat je tevreden bent over de resultaten, en dat we over tien jaar nog steeds voor je werken. Daarom zetten we liever een deel van de retainer om in advertentiebudget dan dat we uren steken in werk dat weinig oplevert.</p>', '', 'zwart', 'Ons succes is jullie succes.'))

    o.append(h2('Ons plan, in vier stappen'))
    o.append(p('Voor iedere klant hetzelfde plan. Alleen de datums en het doel zijn van jou.'))
    o.append(tabel(['Stap', 'Wanneer', 'Wat er gebeurt'], [
        ['<b>1 · Set-up</b>', 'Maand 1, week 1–3', 'Meting, advertentieaccounts, e-mail, je marketingdashboard, de campagne en de landingspagina. Alles op jouw naam.'],
        ['<b>2 · Content shooten</b>', 'Maand 1, week 3 of 4', 'De draaidag bij jou op locatie, op een dagdeel dat jij opgeeft. Daarna foto, video en graphics voor je advertenties.'],
        ['<b>3 · Adverteren en eerste resultaten</b>', 'Live eind maand 1, dan maand 2 en 3', 'Alleen de motor draait. We leren welke zoekwoorden, doelgroepen en advertenties werken, en brengen de kosten per aanvraag tot rust.'],
        ['<b>4 · Optimaliseren</b>', 'Vanaf maand 4', 'Advertenties verbeteren, CRO, landingspagina’s, e-mail en automation, SEO. Wat eerst komt, bepalen jouw cijfers.'],
    ]))
    o.append(p('Stap 1 en 2 samen zijn het fundament. Vanaf stap 3 loopt de retainer, altijd vanaf maand 2. Je doel geldt vanaf maand 4: de eerste weken leert het algoritme, en dan zijn aanvragen duurder.', 'klein'))

    o.append(NIEUWE_PAGINA)
    o.append(h2('De keten: van advertentie tot klant'))
    o.append(p('Tussen een advertentie en een klant zitten vier schakels. Een voorbeeld bij 21 aanvragen per maand, tegen € 150 per aanvraag:'))
    o.append(keten())
    o.append(twee(
        kader('<p>Wij zorgen voor weergaven, bezoekers en aanvragen. Of een aanvraag klant wordt, bepaal jij: met hoe snel je belt, je aanbod en je prijs.</p>', 'Drie schakels van ons, één van jou', 'blauw'),
        kader('<p>Van 3% naar 4% conversie geeft zeven extra aanvragen, zonder één euro extra. Een aanvraag kost dan € 112 in plaats van € 150.</p>', 'Eén procentpunt telt', 'lime')))

    o.append(h2('Wat we doen, en wat niet'))
    o.append(drie(
        kader(ul(['Adverteren in zoekmachines en op social', 'Marketingcontent', 'Landingspagina’s en CRO', 'E-mail en automation', 'SEO', 'Draaidagen en contentrondes']), 'In je retainer', 'groen'),
        kader(ul(['Webdevelopment', 'Design en branding', 'Social-mediatemplates', 'Extra draaidagen', 'Koppelingen met je systemen']), 'Eigen project of partner', 'oranje'),
        kader(ul(['Losse campagnes', 'E-commerce en werving', 'Social feeds vullen', 'Bedrijfsvideo’s', 'Je aanvragen opvolgen', 'Uren verantwoorden', 'Marge op werk van een ander']), 'Doen we niet', 'rood')))
    o.append(h2('De kanalen'))
    o.append(p('We adverteren waar je koper zit. Per kanaal minimaal € 500 per campagne per maand, op LinkedIn € 1.000. Daarom kiezen wij de kanalen.'))
    o.append(tabel(['Kanaal', 'Wat het doet', 'Wanneer'], [
        ['<b>Google Ads</b>', 'Vangt wie nu zoekt', 'Standaard, bij iedereen'],
        ['<b>Meta</b> <span class="klein">Facebook, Instagram</span>', 'Bereikt mensen zoals je kopers, haalt bezoekers terug', 'Standaard, bij iedereen'],
        ['<b>Microsoft Ads (Bing)</b>', 'Dezelfde zoekvraag, vaak goedkopere kliks', 'Als Google meer laat zien'],
        ['<b>LinkedIn</b>', 'Bereikt op functie, branche en bedrijfsgrootte', 'Zakelijk; duurder per klik'],
        ['<b>TikTok</b>', 'Jonger publiek, met video', 'Als je doelgroep daar zit'],
    ]))
    return ''.join(o)

DOCS = [dict(code='V.3', titel='Zo werken we', fase=FASE, voor='Klant', wanneer='Intakegesprek en voorstel', wie='Accountmanager',
  lead='We zorgen dat er aanvragen binnenkomen via zoekmachines en social, en dat die steeds goedkoper worden. Je website is het middelpunt.', body=body())]
