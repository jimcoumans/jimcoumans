# -*- coding: utf-8 -*-
from base import *

FASE = 'Verkoopondersteuning · Wat het kost'

def voorlopig(): return chip('voorlopig', 'oranje')
def schatting(): return chip('schatting', 'oranje')
def nw(t): return '<span style="white-space:nowrap">%s</span>' % t

def body():
    o = []
    o.append(h2('Het fundament: € 4.500 eenmalig'))
    o.append(p('Maand 1, te betalen bij ondertekening. Eén prijs voor twee delen die je niet los koopt.'))
    o.append(twee(
        kader(ul(['Doelgroep, boodschap en concurrentiebeeld', 'Technische audit en meetopzet', 'Advertentieaccounts op jouw naam', 'MailerLite met je contacten', 'Je marketingdashboard', 'De nulmeting']), 'Deel 1 · De basis', 'blauw'),
        kader(ul(['Zoekwoorden, structuur en advertenties', 'Een landingspagina met formulier', 'Een volledige draaidag bij jou op locatie', 'Montage in drie formaten, plus stills', 'Livegang met je team, de eerste week dagelijks']), 'Deel 2 · Je eerste campagne', 'lime')))

    o.append(h2('Per maand'))
    o.append(p('De retainer start altijd in maand 2: factuur op de 1e, incasso op de 4e. Opzeggen kan elke maand. Welk pakket past, volgt uit de rekensom in je voorstel; wat erin zit, staat in De pakketten (V.2).'))
    o.append(tabel(['Per maand, exclusief btw', 'Starter', 'Playmaker', 'Captain', 'Champion'], [
        ['<b>Retainer</b><br><span class="klein">Aan James Robinson, vooraf</span>', nw('€ 1.000'), nw('€ 1.500'), nw('€ 2.000'), nw('€ 2.500')],
        ['<b>Advertentiebudget, minimaal</b><br><span class="klein">Rechtstreeks aan de platformen</span>', nw('€ 1.000'), nw('€ 2.500'), nw('€ 5.000'), nw('€ 7.500')],
    ], rechts=(1, 2, 3, 4)))
    o.append(h2('Wat er niet op de lijst staat'))
    o.append(drie(
        kader('<p>Je koopt een vaste inhoud. Hoeveel uur erin gaat, is ons probleem.</p>', 'Geen uurtarief', 'grijs'),
        kader('<p>Wat niet op de lijst staat, wordt een apart voorstel met een prijs vooraf.</p>', 'Geen meerwerk', 'grijs'),
        kader('<p>Wie onderhandelt, onderhandelt met de vorige klant die de prijs wel betaalde.</p>', 'Geen korting', 'grijs')))

    o.append(NIEUWE_PAGINA)
    o.append(h2('Licenties en diensten'))
    o.append(p('Alleen het dashboard betaal je aan ons. De rest staat op jouw naam en factureert de leverancier rechtstreeks. Jij kiest per licentie maand of jaar.'))
    o.append(tabel(['Post', 'Aan wie', 'Wanneer', 'Bedrag'], [
        ['<b>Marketingdashboard</b>', nw('James Robinson'), 'Altijd. Het blijft van jou als je stopt.', nw('€ 25 p/m of € 250 p/j')],
        ['<b>E-mailplatform</b>', 'MailerLite', 'Altijd. Volgt de grootte van je lijst.', nw('€ 9,90 – 73 p/m')],
        ['<b>Cookiescript</b>', 'Webmix', 'Altijd. Zonder toestemming mag je niet meten.', nw('€ 150 p/j')],
        ['<b>Klikfraudebescherming</b>', 'ClickCease', 'Optioneel. Jij beslist.', nw('vanaf $ 99 p/m')],
        ['<b>Hosting en onderhoud</b>', 'Webmix', 'Alleen als je overzet. De migratie is gratis.', nw('€ 85 p/m')],
        ['<b>Bezoekersherkenning</b>', 'Leadinfo', 'Optioneel. Alleen zinvol als je aan bedrijven verkoopt.', nw('€ 69 – 179 p/m')],
        ['<b>Afsprakenplanner</b>', 'Calendly', 'Optioneel, per gebruiker', nw('€ 15 p/m')],
    ], rechts=(3,)))
    o.append(p('We zetten nooit iets bovenop wat een leverancier rekent. Van MailerLite, ClickCease, Leadinfo en de afsprakenplanner krijgen we een vergoeding voor het doorverwijzen. Dat zeggen we erbij.', 'klein'))

    o.append(h2('Eenmalig, alleen als de quickscan het vindt'))
    o.append(p('Voordat we elkaar spreken, kijken we van buitenaf naar je website. Moet er iets hersteld worden, dan staat het met bedrag in je voorstel. Herstellen doet Webmix, en jij beslist.'))
    o.append(tabel(['Post', 'Wanneer', 'Aan wie', 'Bedrag'], [
        ['<b>Snelheid in de site zelf</b>', 'De laadtijd haalt de norm niet, en dat ligt niet aan de server', 'Webmix', nw('€ 750')],
        ['<b>Redirects en dode links</b>', 'Links lopen dood of verwijzen door naar een omleiding', 'Webmix', nw('€ 500')],
        ['<b>E-mailauthenticatie</b>', 'SPF, DKIM of DMARC ontbreekt', 'Webmix', nw('€ 250')],
        ['<b>Afsprakenplanner opzetten</b>', 'Alleen als je afspraken laat inplannen', nw('James Robinson'), '€ 250'],
        ['<b>Huisstijl ontwikkelen</b>', 'Alleen als er geen bruikbaar merk ligt', nw('James Robinson'), nw('apart traject')],
    ], rechts=(3,)))
    o.append(twee(
        kader('<p>Dan is dit alles nul. Meting, indexatie en je bedrijfsprofiel zitten altijd in het fundament.</p>', 'Gezonde site', 'groen'),
        kader('<p>Vinden we daarna nog iets buiten het fundament, dan krijg je een voorstel met een prijs vooraf.</p>', 'Na het tekenen', 'blauw')))
    o.append(p('<b>Alle bedragen zijn exclusief btw.</b> Sub, € 500 per maand, leveren we alleen op verzoek (zie V.2). Het fundament krijg je na de start niet terug: dat werk is gedaan.', 'klein'))
    return ''.join(o)

DOCS = [dict(code='V.1', titel='Tarieven', fase=FASE, voor='Klant', wanneer='Vóór het intakegesprek', wie='Accountmanager',
  lead='Eén fundament, vier pakketten, en de rest op jouw naam. De lijst is voor iedereen gelijk. Alle bedragen zijn exclusief btw.', body=body())]
